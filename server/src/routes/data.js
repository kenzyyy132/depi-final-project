import { Router } from 'express';
import { HttpError, MESSAGES, badRequest, conflict, forbidden, notFound, route } from '../lib/errors.js';
import { makeJoinCode, newId, normalizeJoinCode } from '../lib/security.js';
import * as S from '../lib/serialize.js';
import { isDay, parse } from '../lib/validate.js';
import { inviteEmail } from '../lib/mail.js';
import { requireUser } from './auth.js';

const withMembers = { members: { select: { userId: true } } };

/** Same rule as the original withCompletion: stamp on transition into Completed, clear on reopen. */
const completion = (prevStatus, nextStatus, prevCompletedAt) => {
  if (nextStatus === 'Completed') return prevStatus === 'Completed' ? prevCompletedAt ?? null : new Date();
  return null;
};

export function dataRoutes({ prisma, config, mailer, schemas, limiters }) {
  const r = Router();
  r.use(requireUser);

  const requireManager = (req) => { if (req.user.role !== 'manager') throw forbidden('Only managers can do that.'); };
  const ownProject = async (req, id) => {
    const p = await prisma.project.findUnique({ where: { id: String(id) }, include: withMembers });
    if (!p || p.managerId !== req.user.id) throw notFound('Project not found.');
    return p;
  };
  const uniqueJoinCode = async () => {
    for (let i = 0; i < 20; i++) {
      const code = makeJoinCode();
      if (!(await prisma.project.findUnique({ where: { joinCode: code } }))) return code;
    }
    throw new Error('Could not allocate a join code');
  };

  // ---------- Snapshot of everything the signed-in user may see ----------
  r.get('/state', route(async (req, res) => {
    const me = req.user;
    const projects = await prisma.project.findMany({
      where: me.role === 'manager' ? { managerId: me.id } : { members: { some: { userId: me.id } } },
      include: withMembers,
      orderBy: { createdAt: 'asc' },
    });
    const projectIds = projects.map((p) => p.id);
    const tasks = await prisma.task.findMany({ where: { projectId: { in: projectIds } }, orderBy: { createdAt: 'asc' } });
    const userIds = new Set([me.id]);
    projects.forEach((p) => { userIds.add(p.managerId); p.members.forEach((m) => userIds.add(m.userId)); });
    const users = await prisma.user.findMany({ where: { id: { in: [...userIds] } }, orderBy: { createdAt: 'asc' } });

    // The conflict rule spans every project a developer works on. A manager gets the open work
    // their developers have in OTHER managers' projects as anonymous busy blocks (dates only).
    let busy = [];
    if (me.role === 'manager') {
      const memberIds = [...new Set(projects.flatMap((p) => p.members.map((m) => m.userId)))];
      if (memberIds.length) {
        busy = (await prisma.task.findMany({
          where: { assigneeId: { in: memberIds }, projectId: { notIn: projectIds }, status: { not: 'Completed' } },
          select: { id: true, assigneeId: true, startDate: true, deadline: true, status: true },
        })).map(S.busy);
      }
    }
    res.json({
      user: S.selfUser(me),
      users: users.map((u) => (u.id === me.id ? S.selfUser(u) : S.otherUser(u, me))),
      projects: projects.map((p) => S.project(p, me)),
      tasks: tasks.map(S.task),
      busy,
      serverTime: new Date().toISOString(),
    });
  }));

  // ---------- Profile ----------
  r.patch('/me', route(async (req, res) => {
    const body = parse(schemas.profile, req.body);
    const data = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.onboarded) data.onboardedAt = req.user.onboardedAt ?? new Date();
    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ user: S.selfUser(user) });
  }));

  // ---------- Projects (manager) ----------
  r.post('/projects', route(async (req, res) => {
    requireManager(req);
    const body = parse(schemas.project, req.body);
    const p = await prisma.project.create({
      data: { id: newId(), ...body, managerId: req.user.id, joinCode: await uniqueJoinCode() },
      include: withMembers,
    });
    res.status(201).json({ project: S.project(p, req.user) });
  }));

  r.put('/projects/:id', route(async (req, res) => {
    requireManager(req);
    await ownProject(req, req.params.id);
    const body = parse(schemas.project, req.body);
    const p = await prisma.project.update({ where: { id: req.params.id }, data: body, include: withMembers });
    res.json({ project: S.project(p, req.user) });
  }));

  r.delete('/projects/:id', route(async (req, res) => {
    requireManager(req);
    await ownProject(req, req.params.id);
    await prisma.project.delete({ where: { id: req.params.id } }); // tasks + memberships cascade
    res.status(204).end();
  }));

  // ---------- Joining (developer) ----------
  r.post('/projects/join', limiters.join, route(async (req, res) => {
    if (req.user.role !== 'developer') throw forbidden('Only developers join projects with a code.');
    const code = normalizeJoinCode(parse(schemas.join, req.body).code);
    if (!code) throw badRequest('joinCodeRequired', MESSAGES.joinCodeRequired);
    const p = await prisma.project.findUnique({ where: { joinCode: code }, include: withMembers });
    if (!p) throw new HttpError(404, 'joinCodeInvalid', MESSAGES.joinCodeInvalid);
    if (p.members.some((m) => m.userId === req.user.id)) throw conflict('alreadyJoined', MESSAGES.alreadyJoined);
    await prisma.projectMember.create({ data: { projectId: p.id, userId: req.user.id } }).catch((e) => {
      if (e.code === 'P2002') throw conflict('alreadyJoined', MESSAGES.alreadyJoined);
      throw e;
    });
    const fresh = await prisma.project.findUnique({ where: { id: p.id }, include: withMembers });
    res.status(201).json({ project: S.project(fresh, req.user) });
  }));

  // Email an invitation link (manager). Reports honestly when email delivery isn't configured.
  r.post('/projects/:id/invite', limiters.invite, route(async (req, res) => {
    requireManager(req);
    const p = await ownProject(req, req.params.id);
    const { email } = parse(schemas.invite, req.body);
    if (mailer.mode === 'off') throw new HttpError(503, 'mailDisabled', 'Email delivery is not configured on this server. Share the join code or link instead.');
    const link = `${config.appUrl}/join/${p.joinCode}`;
    try {
      const result = await mailer.send({ to: email, ...inviteEmail({ managerName: req.user.name, projectName: p.name, code: p.joinCode, link }) });
      res.json({ ok: true, delivery: mailer.mode, delivered: result.delivered });
    } catch (e) {
      req.log?.error?.('Invite email failed', e);
      throw new HttpError(502, 'mailFailed', 'We could not send the email right now. Try again in a few minutes.');
    }
  }));

  // ---------- Tasks ----------
  const checkTaskTarget = async (req, body) => {
    const p = await prisma.project.findUnique({ where: { id: body.projectId }, include: withMembers });
    if (!p || p.managerId !== req.user.id) throw notFound('Project not found.');
    if (!p.members.some((m) => m.userId === body.assigneeId))
      throw badRequest('validation', 'The assignee must be a member of the project.', { fields: { assigneeId: 'assigneeNotMember' } });
  };

  r.post('/tasks', route(async (req, res) => {
    requireManager(req);
    const body = parse(schemas.task, req.body);
    await checkTaskTarget(req, body);
    const t = await prisma.task.create({
      data: { id: newId(), ...body, status: S.statusIn(body.status), completedAt: completion(null, body.status) },
    });
    res.status(201).json({ task: S.task(t) });
  }));

  r.put('/tasks/:id', route(async (req, res) => {
    requireManager(req);
    const existing = await prisma.task.findUnique({ where: { id: req.params.id }, include: { project: true } });
    if (!existing || existing.project.managerId !== req.user.id) throw notFound('Task not found.');
    const body = parse(schemas.task, req.body);
    await checkTaskTarget(req, body);
    const t = await prisma.task.update({
      where: { id: existing.id },
      data: { ...body, status: S.statusIn(body.status), completedAt: completion(S.statusOut(existing.status), body.status, existing.completedAt) },
    });
    res.json({ task: S.task(t) });
  }));

  r.delete('/tasks/:id', route(async (req, res) => {
    requireManager(req);
    const existing = await prisma.task.findUnique({ where: { id: req.params.id }, include: { project: true } });
    if (!existing || existing.project.managerId !== req.user.id) throw notFound('Task not found.');
    await prisma.task.delete({ where: { id: existing.id } });
    res.status(204).end();
  }));

  // Only the assigned developer can change a task's status (original rule).
  r.patch('/tasks/:id/status', route(async (req, res) => {
    const { status } = parse(schemas.status, req.body);
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Task not found.');
    if (existing.assigneeId !== req.user.id) throw forbidden('Only the assigned developer can change the status.');
    const t = await prisma.task.update({
      where: { id: existing.id },
      data: { status: S.statusIn(status), completedAt: completion(S.statusOut(existing.status), status, existing.completedAt) },
    });
    res.json({ task: S.task(t) });
  }));

  // ---------- Export / import ----------
  r.get('/export', route(async (req, res) => {
    const me = req.user;
    const projects = await prisma.project.findMany({
      where: me.role === 'manager' ? { managerId: me.id } : { members: { some: { userId: me.id } } }, include: withMembers,
    });
    const tasks = await prisma.task.findMany({ where: { projectId: { in: projects.map((p) => p.id) } } });
    const ids = new Set([me.id, ...projects.flatMap((p) => [p.managerId, ...p.members.map((m) => m.userId)])]);
    const users = await prisma.user.findMany({ where: { id: { in: [...ids] } } });
    res.set('Cache-Control', 'no-store').json({
      app: 'scheduling-system', version: 1, exportedAt: new Date().toISOString(),
      data: {
        users: users.map((u) => ({ ...S.otherUser(u, me), createdAt: u.createdAt.toISOString() })),
        projects: projects.map((p) => ({ ...S.project(p, me), joinCode: me.role === 'manager' ? p.joinCode : undefined })),
        tasks: tasks.map(S.task),
      },
    });
  }));

  /**
   * Import a backup (e.g. from the LocalStorage version). Existing records always win.
   * - Only projects whose manager in the file has YOUR email are imported, and you become their manager.
   * - Accounts are never created from a file (no one gets an account they didn't register).
   * - Developers are never added to projects by import: they join with the project's code.
   *   Their tasks are imported once they are members — importing the same file again picks them up.
   */
  r.post('/import', limiters.import, route(async (req, res) => {
    requireManager(req);
    const { data } = parse(schemas.import, req.body);
    const fileUsers = new Map(data.users.map((u) => [u.id, u]));
    const mine = data.projects.filter((p) => fileUsers.get(p.managerId)?.email?.toLowerCase?.() === req.user.email);
    const report = { projects: { added: 0, existing: 0, skipped: data.projects.length - mine.length }, tasks: { added: 0, existing: 0, waiting: 0, skipped: 0 } };
    const importable = new Map(); // file project id -> db project (owned by me)

    for (const p of mine) {
      if (typeof p.id !== 'string' || typeof p.name !== 'string' || !p.name.trim() || !isDay(p.startDate) || !isDay(p.deadline) || p.startDate > p.deadline) { report.projects.skipped++; continue; }
      const found = await prisma.project.findUnique({ where: { id: p.id }, include: withMembers });
      if (found) {
        if (found.managerId === req.user.id) { report.projects.existing++; importable.set(p.id, found); } else report.projects.skipped++;
        continue;
      }
      const code = typeof p.joinCode === 'string' && /^[A-Z0-9]{6}$/.test(p.joinCode) && !(await prisma.project.findUnique({ where: { joinCode: p.joinCode } })) ? p.joinCode : await uniqueJoinCode();
      const created = await prisma.project.create({
        data: {
          id: p.id, name: p.name.trim().slice(0, 120), description: typeof p.description === 'string' ? p.description.slice(0, 4000) : '',
          startDate: p.startDate, deadline: p.deadline, managerId: req.user.id, joinCode: code,
          createdAt: p.createdAt && !Number.isNaN(Date.parse(p.createdAt)) ? new Date(p.createdAt) : undefined,
        },
        include: withMembers,
      });
      report.projects.added++;
      importable.set(p.id, created);
    }

    const emails = [...new Set(data.users.map((u) => String(u.email || '').toLowerCase()).filter(Boolean))];
    const accounts = new Map((await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } })).map((u) => [u.email, u.id]));
    for (const t of data.tasks) {
      const p = importable.get(t.projectId);
      if (!p) continue;
      const valid = typeof t.id === 'string' && typeof t.title === 'string' && t.title.trim() && isDay(t.startDate) && isDay(t.deadline) &&
        t.startDate <= t.deadline && ['Low', 'Medium', 'High'].includes(t.priority) && ['Opened', 'In Progress', 'Completed'].includes(t.status);
      if (!valid) { report.tasks.skipped++; continue; }
      if (await prisma.task.findUnique({ where: { id: t.id }, select: { id: true } })) { report.tasks.existing++; continue; }
      const assigneeId = accounts.get(String(fileUsers.get(t.assigneeId)?.email || '').toLowerCase());
      if (!assigneeId || !p.members.some((m) => m.userId === assigneeId)) { report.tasks.waiting++; continue; }
      await prisma.task.create({
        data: {
          id: t.id, title: t.title.trim().slice(0, 200), description: typeof t.description === 'string' ? t.description.slice(0, 8000) : '',
          projectId: p.id, assigneeId, startDate: t.startDate, deadline: t.deadline, priority: t.priority, status: S.statusIn(t.status),
          createdAt: t.createdAt && !Number.isNaN(Date.parse(t.createdAt)) ? new Date(t.createdAt) : undefined,
          // Keep a completion date only if the file really has one — never invent history.
          completedAt: t.status === 'Completed' && t.completedAt && !Number.isNaN(Date.parse(t.completedAt)) ? new Date(t.completedAt) : null,
        },
      });
      report.tasks.added++;
    }
    res.json({ report });
  }));

  return r;
}

/** Public lookup used by the /join/:code invitation page (shows what you're about to join). */
export function inviteLookup({ prisma, limiters }) {
  const r = Router();
  r.get('/:code', limiters.auth, route(async (req, res) => {
    const p = await prisma.project.findUnique({ where: { joinCode: normalizeJoinCode(req.params.code) }, include: { manager: { select: { name: true } } } });
    if (!p) throw new HttpError(404, 'joinCodeInvalid', MESSAGES.joinCodeInvalid);
    res.set('Cache-Control', 'no-store').json({ invite: { code: p.joinCode, projectId: p.id, projectName: p.name, managerName: p.manager.name, startDate: p.startDate, deadline: p.deadline } });
  }));
  return r;
}
