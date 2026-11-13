// Environment configuration. Every value comes from process.env; nothing is hardcoded for production.
// In production the server refuses to start when a required value is missing, instead of guessing.

const bool = (v, fallback) => (v === undefined || v === '' ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));
const int = (v, fallback) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v));
const list = (v) => (v ? String(v).split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean) : []);

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';
  const sameSite = (env.COOKIE_SAMESITE || 'lax').toLowerCase();

  const config = {
    env: nodeEnv,
    isProd,
    isTest: nodeEnv === 'test',
    port: int(env.PORT, 4000),
    databaseUrl: env.DATABASE_URL || '',
    // Public URL of the web app. Used to build password-reset and invitation links.
    appUrl: (env.APP_URL || (isProd ? '' : 'http://localhost:5173')).replace(/\/$/, ''),
    // Extra browser origins allowed to call the API with credentials (only needed when the
    // frontend is hosted on a different origin than the API).
    corsOrigins: list(env.CORS_ORIGINS),
    trustProxy: int(env.TRUST_PROXY, isProd ? 1 : 0),
    session: {
      cookieName: env.SESSION_COOKIE_NAME || (isProd ? '__Host-nos_session' : 'nos_session'),
      days: int(env.SESSION_DAYS, 30),
      secure: bool(env.COOKIE_SECURE, isProd),
      sameSite: ['lax', 'strict', 'none'].includes(sameSite) ? sameSite : 'lax',
    },
    resetTokenMinutes: int(env.RESET_TOKEN_MINUTES, 60),
    passwordMin: 8,
    mail: {
      host: env.SMTP_HOST || '',
      port: int(env.SMTP_PORT, 587),
      secure: bool(env.SMTP_SECURE, false),
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
      from: env.MAIL_FROM || 'Night Ops Scheduler <no-reply@localhost>',
    },
    // Serve the built React app from this server (single-origin deployment). Path to the dist folder.
    clientDir: env.SERVE_CLIENT === 'false' ? '' : env.CLIENT_DIR || (bool(env.SERVE_CLIENT, false) ? '../dist' : ''),
    rateLimit: { windowMs: 15 * 60 * 1000, auth: int(env.RATE_LIMIT_AUTH, 30), api: int(env.RATE_LIMIT_API, 5000) }, // per IP; generous because offices share one IP
  };
  config.mail.enabled = Boolean(config.mail.host);

  const problems = [];
  if (!config.databaseUrl && !config.isTest) problems.push('DATABASE_URL is required.');
  if (isProd && !config.appUrl) problems.push('APP_URL is required in production (public URL of the web app).');
  if (isProd && config.session.sameSite === 'none' && !config.session.secure) problems.push('COOKIE_SAMESITE=none requires COOKIE_SECURE=true.');
  if (config.session.cookieName.startsWith('__Host-') && !config.session.secure) config.session.cookieName = config.session.cookieName.slice(7);
  if (problems.length) {
    const err = new Error(`Invalid configuration:\n- ${problems.join('\n- ')}`);
    err.problems = problems;
    throw err;
  }
  return config;
}
