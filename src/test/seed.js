import { cookieJar, db } from './env';

export const PASSWORD = 'secret12';
export const users = [
  { id: 'm1', name: 'Mona Manager', email: 'mona@x.io', role: 'manager', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'd1', name: 'Dev One', email: 'dev1@x.io', role: 'developer', createdAt: '2026-01-02T00:00:00.000Z' },
  { id: 'd2', name: 'Dev Two', email: 'dev2@x.io', role: 'developer', createdAt: '2026-01-03T00:00:00.000Z' },
  { id: 'd3', name: 'Dev Three', email: 'dev3@x.io', role: 'developer', createdAt: '2026-01-04T00:00:00.000Z' },
];
export const projects = [
  { id: 'p1', name: 'Apollo', description: 'Launch', startDate: '2026-11-01', deadline: '2026-12-31', managerId: 'm1', memberIds: ['d1', 'd2'], joinCode: 'APL234', createdAt: '2026-11-01T00:00:00.000Z' },
  { id: 'p2', name: 'Borealis', description: '', startDate: '2026-11-01', deadline: '2026-12-31', managerId: 'm1', memberIds: [], joinCode: 'BRL567', createdAt: '2026-11-02T00:00:00.000Z' },
];
export const tasks = [
  { id: 't1', title: 'Design API', description: 'REST', projectId: 'p1', assigneeId: 'd1', startDate: '2026-11-10', deadline: '2026-11-20', priority: 'High', status: 'In Progress', createdAt: '2026-11-03T00:00:00.000Z' },
  { id: 't2', title: 'Write docs', description: '', projectId: 'p1', assigneeId: 'd2', startDate: '2026-11-01', deadline: '2026-11-05', priority: 'Low', status: 'Opened', createdAt: '2026-11-04T00:00:00.000Z' },
];

/** Writes realistic records into the real database. `session` signs that user in (sets the session cookie). */
export async function seed({ session = null } = {}) {
  await db.seed({ users, projects, tasks, password: PASSWORD });
  if (session) cookieJar.set('nos_session', await db.sessionFor(session));
  return { users, projects, tasks };
}
export const storedTasks = () => db.tasksOf();
