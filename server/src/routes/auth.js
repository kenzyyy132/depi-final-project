import { Router } from 'express';
import { HttpError, MESSAGES, badRequest, conflict, route, unauthorized } from '../lib/errors.js';
import { dummyHash, hashPassword, newId, randomToken, sha256, verifyPassword } from '../lib/security.js';
import { selfUser } from '../lib/serialize.js';
import { parse } from '../lib/validate.js';
import { resetEmail } from '../lib/mail.js';

export function requireUser(req, _res, next) {
  if (req.user) return next();
  next(req.sessionExpired ? unauthorized('sessionExpired', 'Your session has expired. Please sign in again.') : unauthorized());
}

export function authRoutes({ prisma, config, sessions, mailer, schemas, limiters }) {
  const r = Router();

  r.post('/register', limiters.auth, route(async (req, res) => {
    const body = parse(schemas.register, req.body);
    if (await prisma.user.findUnique({ where: { email: body.email } })) throw conflict('emailTaken', MESSAGES.emailTaken);
    const user = await prisma.user.create({
      data: { id: newId(), name: body.name, email: body.email, role: body.role, passwordHash: await hashPassword(body.password) },
    }).catch((e) => {
      if (e.code === 'P2002') throw conflict('emailTaken', MESSAGES.emailTaken);
      throw e;
    });
    await sessions.start(res, user.id, req);
    res.status(201).json({ user: selfUser(user) });
  }));

  r.post('/login', limiters.auth, route(async (req, res) => {
    const body = parse(schemas.login, req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    const ok = user ? await verifyPassword(body.password, user.passwordHash) : (await verifyPassword(body.password, await dummyHash()), false);
    if (!ok) throw new HttpError(401, 'invalidCredentials', MESSAGES.invalidCredentials);
    await sessions.start(res, user.id, req);
    res.json({ user: selfUser(user) });
  }));

  r.post('/logout', route(async (req, res) => {
    await sessions.end(req, res);
    res.status(204).end();
  }));

  // Session probe used at app start. Answers 200 either way so signed-out visitors see no error;
  // `expired` tells the UI that a session cookie existed but is no longer valid.
  r.get('/me', (req, res) => res.json({ user: req.user ? selfUser(req.user) : null, expired: Boolean(req.sessionExpired) }));

  // Always answers the same way, so it can't be used to discover which emails have accounts.
  r.post('/forgot-password', limiters.auth, route(async (req, res) => {
    const { email } = parse(schemas.forgot, req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && mailer.mode !== 'off') {
      const token = randomToken();
      await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });
      await prisma.passwordReset.create({
        data: { id: newId(), tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + config.resetTokenMinutes * 60000) },
      });
      const link = `${config.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
      try {
        await mailer.send({ to: user.email, ...resetEmail({ name: user.name, link, minutes: config.resetTokenMinutes }) });
      } catch (e) {
        req.log?.error?.('Password reset email failed', e);
        throw new HttpError(502, 'mailFailed', 'We could not send the email right now. Try again in a few minutes.');
      }
    }
    res.json({ ok: true, delivery: mailer.mode });
  }));

  r.post('/reset-password', limiters.auth, route(async (req, res) => {
    const body = parse(schemas.reset, req.body);
    const rec = await prisma.passwordReset.findUnique({ where: { tokenHash: sha256(body.token) }, include: { user: true } });
    if (!rec || rec.usedAt || rec.expiresAt <= new Date()) throw badRequest('resetInvalid', 'This reset link is invalid or has expired. Request a new one.');
    const passwordHash = await hashPassword(body.password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: rec.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: rec.userId } }), // sign out everywhere
    ]);
    await sessions.start(res, rec.userId, req);
    res.json({ user: selfUser(rec.user) });
  }));

  r.post('/change-password', requireUser, limiters.auth, route(async (req, res) => {
    const body = parse(schemas.changePassword, req.body);
    if (!(await verifyPassword(body.currentPassword, req.user.passwordHash)))
      throw badRequest('validation', 'Your current password is incorrect.', { fields: { currentPassword: 'currentPasswordWrong' } });
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await hashPassword(body.newPassword) } });
    await sessions.endAllFor(req.user.id, req.session.id); // other devices must sign in again
    res.json({ ok: true });
  }));

  return r;
}
