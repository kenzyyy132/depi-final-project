import { newId, randomToken, sha256 } from './security.js';

const DAY = 24 * 60 * 60 * 1000;
const TOUCH_EVERY = 60 * 60 * 1000; // extend a sliding session at most once an hour

/**
 * Server-side sessions. The browser holds only a random token in an httpOnly cookie;
 * the database stores its SHA-256, so a leaked database cannot be replayed as cookies.
 */
export function createSessions({ prisma, config }) {
  const { cookieName, days, secure, sameSite } = config.session;
  const maxAge = days * DAY;
  const cookieOptions = { httpOnly: true, secure, sameSite, path: '/', maxAge };

  const setCookie = (res, token) => res.cookie(cookieName, token, cookieOptions);
  const clearCookie = (res) => res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });

  async function start(res, userId, req) {
    const token = randomToken();
    await prisma.session.create({
      data: {
        id: newId(), tokenHash: sha256(token), userId,
        expiresAt: new Date(Date.now() + maxAge), userAgent: String(req.get('user-agent') || '').slice(0, 255) || null,
      },
    });
    setCookie(res, token);
  }

  /** Middleware: attaches req.user / req.session when the cookie holds a live session. */
  async function load(req, res, next) {
    try {
      const token = req.cookies?.[cookieName];
      if (!token || typeof token !== 'string' || token.length > 100) return next();
      const s = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
      if (!s || s.expiresAt <= new Date()) {
        if (s) await prisma.session.delete({ where: { id: s.id } }).catch(() => {});
        clearCookie(res);
        req.sessionExpired = true;
        return next();
      }
      if (Date.now() - s.lastSeenAt.getTime() > TOUCH_EVERY) {
        await prisma.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + maxAge) } });
        setCookie(res, token);
      }
      req.user = s.user;
      req.session = s;
      next();
    } catch (e) {
      next(e);
    }
  }

  async function end(req, res) {
    if (req.session) await prisma.session.delete({ where: { id: req.session.id } }).catch(() => {});
    clearCookie(res);
  }

  const endAllFor = (userId, exceptId) =>
    prisma.session.deleteMany({ where: { userId, ...(exceptId ? { NOT: { id: exceptId } } : {}) } });

  const purgeExpired = () => prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });

  return { start, load, end, endAllFor, purgeExpired, cookieName };
}
