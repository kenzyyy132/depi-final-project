import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { HttpError } from './lib/errors.js';
import { createSessions } from './lib/sessions.js';
import { schemas as makeSchemas } from './lib/validate.js';
import { authRoutes } from './routes/auth.js';
import { dataRoutes, inviteLookup } from './routes/data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CLIENT_HEADER = 'x-requested-with';
export const CLIENT_HEADER_VALUE = 'NightOps';

/** Hashes of the inline <script> blocks in the built index.html, so CSP can allow exactly those. */
function inlineScriptHashes(html) {
  // Browsers hash the script text after the HTML parser normalises line endings to LF.
  const lf = (s) => s.replace(/\r\n?/g, '\n');
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => `'sha256-${createHash('sha256').update(lf(m[1])).digest('base64')}'`);
}

export function createApp({ config, prisma, mailer, log = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  const sessions = createSessions({ prisma, config });
  const schemas = makeSchemas(config);
  const limit = (max, windowMs = config.rateLimit.windowMs) =>
    rateLimit({
      windowMs, limit: config.isTest ? 10000 : max, standardHeaders: 'draft-7', legacyHeaders: false,
      handler: (_req, res) => res.status(429).json({ error: { code: 'rateLimited', message: 'Too many attempts. Please wait a few minutes and try again.' } }),
    });
  const limiters = { auth: limit(config.rateLimit.auth), join: limit(40), invite: limit(20), import: limit(10), api: limit(config.rateLimit.api) };

  // ---------- Static client (optional single-origin deployment) ----------
  const clientDir = config.clientDir ? path.resolve(here, '..', config.clientDir) : '';
  const indexFile = clientDir && path.join(clientDir, 'index.html');
  const hasClient = Boolean(indexFile && existsSync(indexFile));
  const indexHtml = hasClient ? readFileSync(indexFile, 'utf8') : '';

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", ...inlineScriptHashes(indexHtml)],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
          'img-src': ["'self'", 'data:', 'blob:'],
          'connect-src': ["'self'"],
          'object-src': ["'none'"],
          'frame-ancestors': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'upgrade-insecure-requests': config.session.secure ? [] : null, // only when served over HTTPS
        },
      },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: config.isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
    })
  );

  // ---------- API ----------
  const api = express.Router();
  const allowed = new Set([config.appUrl, ...config.corsOrigins].filter(Boolean));
  api.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || allowed.has(origin) ? origin || false : false),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
      maxAge: 600,
    })
  );
  api.use(express.json({ limit: '6mb' }));
  api.use(cookieParser());
  api.use((req, _res, next) => { req.log = log; next(); });

  // CSRF defence for cookie auth: state-changing requests must carry a custom header (which a
  // cross-site form cannot set and CORS won't allow from foreign origins) and, when the browser
  // sends an Origin, it must be this site or an allowed frontend origin.
  api.use((req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    const self = `${req.protocol}://${req.get('host')}`;
    if (origin && origin !== self && !allowed.has(origin)) return next(new HttpError(403, 'badOrigin', 'Request origin is not allowed.'));
    if (req.get(CLIENT_HEADER) !== CLIENT_HEADER_VALUE) return next(new HttpError(403, 'csrf', 'Missing client header.'));
    next();
  });
  api.use(limiters.api);
  api.use(sessions.load);
  api.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  api.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, db: 'up' });
    } catch {
      res.status(503).json({ ok: false, db: 'down' });
    }
  });
  // Public, non-secret capabilities the UI needs to describe flows honestly.
  api.get('/config', (_req, res) => res.json({ mail: mailer.mode, passwordMin: config.passwordMin }));
  api.use('/auth', authRoutes({ prisma, config, sessions, mailer, schemas, limiters }));
  api.use('/invites', inviteLookup({ prisma, limiters }));
  api.use(dataRoutes({ prisma, config, mailer, schemas, limiters }));
  api.use((_req, _res, next) => next(new HttpError(404, 'notFound', 'Not found.')));

  // Errors: known errors keep their code/message; anything else is logged and hidden from the client.
  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, _next) => {
    if (err?.type === 'entity.parse.failed') err = new HttpError(400, 'badJson', 'The request body is not valid JSON.');
    if (err?.type === 'entity.too.large') err = new HttpError(413, 'tooLarge', 'The request is too large.');
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
    }
    log.error?.(`[api] ${req.method} ${req.originalUrl} failed:`, err);
    res.status(500).json({ error: { code: 'server', message: 'Something went wrong on our side. Please try again.' } });
  });
  app.use('/api', api);

  if (hasClient) {
    app.use('/assets', express.static(path.join(clientDir, 'assets'), { immutable: true, maxAge: '1y', index: false }));
    app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
    // SPA fallback: every other GET renders the app shell, which handles routing (incl. its 404 page).
    app.get(/^(?!\/api\/).*/, (_req, res) => res.set('Cache-Control', 'no-cache').type('html').send(indexHtml));
  }
  app.locals.sessions = sessions;
  app.locals.hasClient = hasClient;
  return app;
}
