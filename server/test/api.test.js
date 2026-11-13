import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { agent, registered, setupApp } from './helpers.js';

const { app, prisma, mailer, reset } = setupApp();
beforeEach(() => reset());
afterAll(() => prisma.$disconnect());

const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const projectBody = (o = {}) => ({ name: 'Website revamp', description: 'New site', startDate: day(0), deadline: day(30), ...o });

async function team() {
  const m = await registered(app, { email: 'mona@example.com' });
  const d1 = await registered(app, { name: 'Dev One', email: 'one@example.com', role: 'developer' });
  const d2 = await registered(app, { name: 'Dev Two', email: 'two@example.com', role: 'developer' });
  const p = (await m.a.post('/api/projects').send(projectBody())).body.project;
  await d1.a.post('/api/projects/join').send({ code: p.joinCode });
  await d2.a.post('/api/projects/join').send({ code: p.joinCode });
  return { m, d1, d2, p };
}

describe('auth', () => {
  it('registers, keeps a secure httpOnly session cookie, and logs out', async () => {
    const a = agent(app);
    const res = await a.post('/api/auth/register').send({ name: ' Mona ', email: 'Mona@Example.com ', password: 'correct-horse', role: 'manager' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Mona', email: 'mona@example.com', role: 'manager', onboardedAt: null });
    expect(res.body.user.passwordHash).toBeUndefined();
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect((await a.get('/api/auth/me')).body.user.email).toBe('mona@example.com');
    const stored = await prisma.user.findUnique({ where: { email: 'mona@example.com' } });
    expect(stored.passwordHash).toMatch(/^scrypt\$/);
    expect(await prisma.session.count()).toBe(1);
    expect((await a.post('/api/auth/logout')).status).toBe(204);
    expect((await a.get('/api/auth/me')).body).toEqual({ user: null, expired: false });
    expect(await prisma.session.count()).toBe(0);
  });

  it('keeps the original error messages for duplicate email and bad credentials', async () => {
    await registered(app, { email: 'mona@example.com' });
    const dup = await agent(app).post('/api/auth/register').send({ name: 'X', email: 'MONA@example.com', password: 'whatever1', role: 'developer' });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toEqual({ code: 'emailTaken', message: 'An account with this email already exists.' });
    const bad = await agent(app).post('/api/auth/login').send({ email: 'mona@example.com', password: 'nope-nope' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.message).toBe('Invalid email or password.');
    const unknown = await agent(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'nope-nope' });
    expect(unknown.body.error.message).toBe('Invalid email or password.');
    expect((await agent(app).post('/api/auth/login').send({ email: 'mona@example.com', password: 'correct-horse' })).status).toBe(200);
  });

  it('validates registration fields on the server', async () => {
    const res = await agent(app).post('/api/auth/register').send({ name: '', email: 'not-an-email', password: 'short', role: 'boss' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields).toMatchObject({ name: 'nameRequired', email: 'emailInvalid', password: 'passwordShort' });
  });

  it('rejects state-changing requests without the client header or from foreign origins (CSRF)', async () => {
    const noHeader = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect(noHeader.status).toBe(403);
    expect(noHeader.body.error.code).toBe('csrf');
    const foreign = await request(app).post('/api/auth/login').set('X-Requested-With', 'NightOps').set('Origin', 'https://evil.example').send({});
    expect(foreign.body.error.code).toBe('badOrigin');
    const allowed = await request(app).post('/api/auth/login').set('X-Requested-With', 'NightOps').set('Origin', 'http://app.test').send({ email: 'a@b.co', password: 'x' });
    expect(allowed.status).toBe(401);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://app.test');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
  });

  it('reports an expired session distinctly so the UI can say so', async () => {
    const { a } = await registered(app, { email: 'mona@example.com' });
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await a.get('/api/state');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('sessionExpired');
    expect(await prisma.session.count()).toBe(0);
    await prisma.session.deleteMany();
    const { a: b } = await registered(app, { email: 'other@example.com' });
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await b.get('/api/auth/me')).body).toEqual({ user: null, expired: true });
  });

  it('runs the forgot/reset password flow with a single-use token and signs out other sessions', async () => {
    const { a: oldDevice } = await registered(app, { email: 'mona@example.com' });
    mailer.outbox.length = 0;
    const unknown = await agent(app).post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });
    expect(unknown.status).toBe(200);
    expect(mailer.outbox).toHaveLength(0);
    const res = await agent(app).post('/api/auth/forgot-password').send({ email: 'mona@example.com' });
    expect(res.body).toEqual({ ok: true, delivery: 'console' });
    const token = decodeURIComponent(mailer.outbox[0].text.match(/token=([^\s]+)/)[1]);
    expect(mailer.outbox[0].text).toContain('http://app.test/reset-password?token=');
    const stored = await prisma.passwordReset.findFirst();
    expect(stored.tokenHash).not.toBe(token);

    const fresh = agent(app);
    const done = await fresh.post('/api/auth/reset-password').send({ token, password: 'brand-new-pass' });
    expect(done.status).toBe(200);
    expect((await fresh.get('/api/auth/me')).body.user.email).toBe('mona@example.com');
    expect((await oldDevice.get('/api/auth/me')).body.user).toBeNull();
    const again = await agent(app).post('/api/auth/reset-password').send({ token, password: 'another-pass' });
    expect(again.body.error.code).toBe('resetInvalid');
    expect((await agent(app).post('/api/auth/login').send({ email: 'mona@example.com', password: 'brand-new-pass' })).status).toBe(200);
  });

  it('changes the password only with the current one and revokes other devices', async () => {
    const { a } = await registered(app, { email: 'mona@example.com' });
    const other = agent(app);
    await other.post('/api/auth/login').send({ email: 'mona@example.com', password: 'correct-horse' });
    const wrong = await a.post('/api/auth/change-password').send({ currentPassword: 'nope', newPassword: 'something-new' });
    expect(wrong.body.error.details.fields.currentPassword).toBe('currentPasswordWrong');
    expect((await a.post('/api/auth/change-password').send({ currentPassword: 'correct-horse', newPassword: 'something-new' })).status).toBe(200);
    expect((await a.get('/api/auth/me')).body.user).not.toBeNull();
    expect((await other.get('/api/auth/me')).body.user).toBeNull();
  });

  it('marks onboarding complete and edits the display name only', async () => {
    const { a } = await registered(app, { email: 'mona@example.com' });
    const res = await a.patch('/api/me').send({ name: 'Mona M.', onboarded: true, email: 'hijack@example.com', role: 'developer' });
    expect(res.body.user).toMatchObject({ name: 'Mona M.', email: 'mona@example.com', role: 'manager' });
    expect(res.body.user.onboardedAt).toBeTruthy();
    expect((await a.patch('/api/me').send({ name: '  ' })).body.error.details.fields.name).toBe('nameRequired');
  });
});

describe('projects and joining', () => {
  it('lets only managers create projects, validates dates, and hides join codes from developers', async () => {
    const { m, d1, p } = await team();
    expect(p.joinCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    expect((await d1.a.post('/api/projects').send(projectBody())).status).toBe(403);
    const bad = await m.a.post('/api/projects').send(projectBody({ startDate: day(5), deadline: day(1) }));
    expect(bad.body.error.details.fields.deadline).toBe('deadlineBeforeStart');
    const devState = (await d1.a.get('/api/state')).body;
    expect(devState.projects[0].joinCode).toBeUndefined();
    expect(devState.projects[0].memberIds).toHaveLength(2);
  });

  it('joins with lowercase / dashed codes and keeps the original messages', async () => {
    const m = await registered(app, { email: 'mona@example.com' });
    const d = await registered(app, { name: 'Dev', email: 'dev@example.com', role: 'developer' });
    const p = (await m.a.post('/api/projects').send(projectBody())).body.project;
    const messy = `${p.joinCode.slice(0, 3).toLowerCase()}-${p.joinCode.slice(3)}`;
    expect((await d.a.post('/api/projects/join').send({ code: messy })).status).toBe(201);
    expect((await d.a.post('/api/projects/join').send({ code: p.joinCode })).body.error.message).toBe('You have already joined this project.');
    expect((await d.a.post('/api/projects/join').send({ code: 'ZZZZZZ' })).body.error.message).toBe('Invalid join code. Check it and try again.');
    expect((await d.a.post('/api/projects/join').send({ code: '  ' })).body.error.message).toBe('Please enter a join code.');
    expect((await m.a.post('/api/projects/join').send({ code: p.joinCode })).status).toBe(403);
    const invite = await request(app).get(`/api/invites/${p.joinCode.toLowerCase()}`);
    expect(invite.body.invite).toMatchObject({ projectName: 'Website revamp', managerName: 'Mona Manager' });
  });

  it("prevents a manager from touching another manager's project", async () => {
    const { p } = await team();
    const other = await registered(app, { name: 'Other', email: 'other@example.com' });
    expect((await other.a.put(`/api/projects/${p.id}`).send(projectBody({ name: 'Mine now' }))).status).toBe(404);
    expect((await other.a.delete(`/api/projects/${p.id}`)).status).toBe(404);
    expect((await other.a.get('/api/state')).body.projects).toHaveLength(0);
  });

  it('deletes a project with its tasks', async () => {
    const { m, d1, p } = await team();
    await m.a.post('/api/tasks').send({ title: 'T', projectId: p.id, assigneeId: d1.user.id, startDate: day(0), deadline: day(1), priority: 'High' });
    expect((await m.a.delete(`/api/projects/${p.id}`)).status).toBe(204);
    expect(await prisma.task.count()).toBe(0);
  });

  it('sends invitations through the mailer (console mode in development)', async () => {
    const { m, p } = await team();
    mailer.outbox.length = 0;
    const res = await m.a.post(`/api/projects/${p.id}/invite`).send({ email: 'newdev@example.com' });
    expect(res.body).toMatchObject({ ok: true, delivery: 'console', delivered: false });
    expect(mailer.outbox[0].text).toContain(`http://app.test/join/${p.joinCode}`);
  });
});

describe('tasks', () => {
  it('enforces the assignee-is-member rule and stamps/clears completedAt', async () => {
    const { m, d1, d2, p } = await team();
    const stranger = await registered(app, { name: 'Stranger', email: 's@example.com', role: 'developer' });
    const body = { title: 'Design API', projectId: p.id, assigneeId: d1.user.id, startDate: day(0), deadline: day(3), priority: 'High' };
    expect((await m.a.post('/api/tasks').send({ ...body, assigneeId: stranger.user.id })).body.error.details.fields.assigneeId).toBe('assigneeNotMember');
    expect((await d1.a.post('/api/tasks').send(body)).status).toBe(403);
    const task = (await m.a.post('/api/tasks').send(body)).body.task;
    expect(task).toMatchObject({ status: 'Opened', priority: 'High', description: '' });
    expect(task.completedAt).toBeUndefined();

    expect((await d2.a.patch(`/api/tasks/${task.id}/status`).send({ status: 'Completed' })).status).toBe(403);
    expect((await m.a.patch(`/api/tasks/${task.id}/status`).send({ status: 'Completed' })).status).toBe(403);
    const done = (await d1.a.patch(`/api/tasks/${task.id}/status`).send({ status: 'Completed' })).body.task;
    expect(done.completedAt).toBeTruthy();
    const again = (await d1.a.patch(`/api/tasks/${task.id}/status`).send({ status: 'Completed' })).body.task;
    expect(again.completedAt).toBe(done.completedAt);
    const reopened = (await d1.a.patch(`/api/tasks/${task.id}/status`).send({ status: 'In Progress' })).body.task;
    expect(reopened.status).toBe('In Progress');
    expect(reopened.completedAt).toBeUndefined();

    const edited = await m.a.put(`/api/tasks/${task.id}`).send({ ...body, title: 'Design API v2', status: 'In Progress' });
    expect(edited.body.task.title).toBe('Design API v2');
    expect((await d1.a.delete(`/api/tasks/${task.id}`)).status).toBe(403);
    expect((await m.a.delete(`/api/tasks/${task.id}`)).status).toBe(204);
  });

  it('shares project data with members, without leaking emails to developers', async () => {
    const { m, d1, d2, p } = await team();
    await m.a.post('/api/tasks').send({ title: 'For two', projectId: p.id, assigneeId: d2.user.id, startDate: day(0), deadline: day(2), priority: 'Low' });
    const s = (await d1.a.get('/api/state')).body;
    expect(s.tasks.map((t) => t.title)).toEqual(['For two']);
    const others = s.users.filter((u) => u.id !== d1.user.id);
    expect(others.map((u) => u.name).sort()).toEqual(['Dev Two', 'Mona Manager']);
    expect(others.every((u) => u.email === undefined)).toBe(true);
    const ms = (await m.a.get('/api/state')).body;
    expect(ms.users.find((u) => u.id === d1.user.id).email).toBe('one@example.com');
  });

  it("gives a manager anonymous busy blocks for their developers' work in other projects", async () => {
    const { m, d1 } = await team();
    const m2 = await registered(app, { name: 'Second', email: 'second@example.com' });
    const p2 = (await m2.a.post('/api/projects').send(projectBody({ name: 'Secret project' }))).body.project;
    await d1.a.post('/api/projects/join').send({ code: p2.joinCode });
    await m2.a.post('/api/tasks').send({ title: 'Secret work', projectId: p2.id, assigneeId: d1.user.id, startDate: day(1), deadline: day(4), priority: 'High' });
    const s = (await m.a.get('/api/state')).body;
    expect(s.busy).toHaveLength(1);
    expect(s.busy[0]).toEqual({ id: expect.any(String), assigneeId: d1.user.id, startDate: day(1), deadline: day(4), status: 'Opened', external: true });
    expect(JSON.stringify(s)).not.toContain('Secret');
  });
});

describe('export / import', () => {
  it('exports visible data and imports a legacy LocalStorage backup without creating accounts', async () => {
    const m = await registered(app, { email: 'mona@example.com' });
    const dev = await registered(app, { name: 'Dev', email: 'dev@example.com', role: 'developer' });
    const legacy = {
      app: 'scheduling-system', version: 1,
      data: {
        users: [
          { id: 'u-m', name: 'Mona', email: 'mona@example.com', role: 'manager', salt: 's', passwordHash: 'a'.repeat(64) },
          { id: 'u-d', name: 'Dev', email: 'dev@example.com', role: 'developer', salt: 's', passwordHash: 'b'.repeat(64) },
          { id: 'u-x', name: 'Nobody', email: 'nobody@example.com', role: 'developer', salt: 's', passwordHash: 'c'.repeat(64) },
          { id: 'u-o', name: 'Other mgr', email: 'other@example.com', role: 'manager', salt: 's', passwordHash: 'd'.repeat(64) },
        ],
        projects: [
          { id: 'p-1', name: 'Legacy', description: '', startDate: day(0), deadline: day(20), managerId: 'u-m', memberIds: ['u-d', 'u-x'], joinCode: 'ABCDEF', createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 'p-2', name: 'Not mine', description: '', startDate: day(0), deadline: day(20), managerId: 'u-o', memberIds: [], joinCode: 'GHJKMN' },
        ],
        tasks: [
          { id: 't-1', title: 'Done before', projectId: 'p-1', assigneeId: 'u-d', startDate: day(0), deadline: day(1), priority: 'Low', status: 'Completed' },
          { id: 't-2', title: 'For nobody', projectId: 'p-1', assigneeId: 'u-x', startDate: day(0), deadline: day(1), priority: 'Low', status: 'Opened' },
        ],
      },
    };
    const first = (await m.a.post('/api/import').send(legacy)).body.report;
    expect(first.projects).toEqual({ added: 1, existing: 0, skipped: 1 });
    expect(first.tasks).toEqual({ added: 0, existing: 0, waiting: 2, skipped: 0 });
    expect(await prisma.user.count()).toBe(2); // no accounts were created from the file

    expect((await dev.a.post('/api/projects/join').send({ code: 'ABCDEF' })).status).toBe(201); // code preserved
    const second = (await m.a.post('/api/import').send(legacy)).body.report;
    expect(second.projects).toEqual({ added: 0, existing: 1, skipped: 1 });
    expect(second.tasks).toEqual({ added: 1, existing: 0, waiting: 1, skipped: 0 });
    const t1 = await prisma.task.findUnique({ where: { id: 't-1' } });
    expect(t1.completedAt).toBeNull(); // history is never invented

    expect((await dev.a.post('/api/import').send(legacy)).status).toBe(403);
    const exp = (await m.a.get('/api/export')).body;
    expect(exp).toMatchObject({ app: 'scheduling-system', version: 1 });
    expect(exp.data.projects[0].joinCode).toBe('ABCDEF');
    expect(JSON.stringify(exp)).not.toMatch(/passwordHash|scrypt/);
  });
});

describe('platform', () => {
  it('reports health and public config, and hides internal errors', async () => {
    expect((await request(app).get('/api/health')).body).toEqual({ ok: true, db: 'up' });
    expect((await request(app).get('/api/config')).body).toEqual({ mail: 'console', passwordMin: 8 });
    expect((await request(app).get('/api/nope')).status).toBe(401);
    const { a } = await registered(app, { email: 'mona@example.com' });
    expect((await a.get('/api/nope')).status).toBe(404);
    const badJson = await request(app).post('/api/auth/login').set('X-Requested-With', 'NightOps').set('Content-Type', 'application/json').send('{bad');
    expect(badJson.body.error.code).toBe('badJson');
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('serving the web app', () => {
  it('allows exactly the inline scripts of index.html in the CSP, even with CRLF line endings', async () => {
    const { mkdtempSync, writeFileSync, mkdirSync } = await import('node:fs');
    const { createHash } = await import('node:crypto');
    const os = await import('node:os');
    const path = await import('node:path');
    const dir = mkdtempSync(path.join(os.tmpdir(), 'nos-dist-'));
    mkdirSync(path.join(dir, 'assets'));
    const script = '\r\n  document.documentElement.dataset.x = "1";\r\n';
    writeFileSync(path.join(dir, 'index.html'), `<!doctype html><html><head><script>${script}</script></head><body><div id="root"></div></body></html>`);
    const served = setupApp({ CLIENT_DIR: dir });
    const res = await request(served.app).get('/manager/tasks');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root">');
    const hash = createHash('sha256').update(script.replace(/\r\n?/g, '\n')).digest('base64');
    expect(res.headers['content-security-policy']).toContain(`'sha256-${hash}'`);
    expect((await request(served.app).get('/api/health')).body.ok).toBe(true);
    await served.prisma.$disconnect();
  });
});
