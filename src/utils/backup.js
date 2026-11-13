import { PRIORITIES, STATUSES } from './scheduling';

// Backup files (exported from the server, or from the earlier LocalStorage version). Record shapes are the app's own.
export const BACKUP_APP = 'scheduling-system';
export const BACKUP_VERSION = 1;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const str = (v) => typeof v === 'string' && v.length > 0;
const optStr = (v) => v === undefined || typeof v === 'string';

// Users: files from the LocalStorage version carry salt/passwordHash; server exports never do.
// Credentials are never imported either way, so they are optional here.
const validUser = (u) =>
  u && str(u.id) && str(u.name) && optStr(u.email) && ['manager', 'developer'].includes(u.role) && optStr(u.createdAt);
const validProject = (p) =>
  p && str(p.id) && str(p.name) && ISO_DAY.test(p.startDate) && ISO_DAY.test(p.deadline) && str(p.managerId) &&
  (p.memberIds === undefined || (Array.isArray(p.memberIds) && p.memberIds.every(str))) && (p.joinCode === undefined || /^[A-Z0-9]{6}$/.test(p.joinCode)) && optStr(p.description) && optStr(p.createdAt);
const validTask = (t) =>
  t && str(t.id) && str(t.title) && str(t.projectId) && str(t.assigneeId) && ISO_DAY.test(t.startDate) && ISO_DAY.test(t.deadline) &&
  PRIORITIES.includes(t.priority) && STATUSES.includes(t.status) && optStr(t.description) && optStr(t.createdAt) && optStr(t.completedAt);

export function makeBackup({ users, projects, tasks }) {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: { users, projects, tasks } };
}

export function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Parse + validate a backup file's text. Returns { ok, error?, data, rejected }. */
export function parseBackup(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notJson' };
  }
  if (!json || json.app !== BACKUP_APP || typeof json.data !== 'object' || json.data === null) return { ok: false, error: 'notBackup' };
  if (json.version > BACKUP_VERSION) return { ok: false, error: 'newerVersion' };
  const { users = [], projects = [], tasks = [] } = json.data;
  if (![users, projects, tasks].every(Array.isArray)) return { ok: false, error: 'notBackup' };
  const vu = users.filter(validUser), vp = projects.filter(validProject), vt = tasks.filter(validTask);
  const data = integrity({ users: vu, projects: vp, tasks: vt });
  const rejected = users.length - data.users.length + projects.length - data.projects.length + tasks.length - data.tasks.length;
  return { ok: true, data, rejected, exportedAt: json.exportedAt };
}

/** Keep references consistent: projects need a manager, tasks need a project, members must exist. */
export function integrity({ users, projects, tasks }) {
  const uid = new Set(users.map((u) => u.id));
  const ps = projects
    .filter((p) => uid.has(p.managerId))
    .map((p) => ({ ...p, description: p.description ?? '', memberIds: [...new Set((p.memberIds || []).filter((m) => uid.has(m)))] }));
  const pid = new Set(ps.map((p) => p.id));
  const ts = tasks.filter((t) => pid.has(t.projectId) && uid.has(t.assigneeId)).map((t) => ({ ...t, description: t.description ?? '' }));
  return { users, projects: ps, tasks: ts };
}

/** Merge: existing records always win. Incoming records are added only when they don't collide by id, email or join code. */
export function mergeData(current, incoming) {
  const added = { users: 0, projects: 0, tasks: 0 };
  const users = [...current.users];
  const ids = new Set(users.map((u) => u.id)), emails = new Set(users.map((u) => u.email));
  for (const u of incoming.users) if (!ids.has(u.id) && !emails.has(u.email)) { users.push(u); ids.add(u.id); emails.add(u.email); added.users++; }

  const projects = [...current.projects];
  const pids = new Set(projects.map((p) => p.id)), codes = new Set(projects.map((p) => p.joinCode));
  for (const p of incoming.projects) if (!pids.has(p.id) && !codes.has(p.joinCode)) { projects.push(p); pids.add(p.id); codes.add(p.joinCode); added.projects++; }

  const tasks = [...current.tasks];
  const tids = new Set(tasks.map((t) => t.id));
  for (const t of incoming.tasks) if (!tids.has(t.id)) { tasks.push(t); tids.add(t.id); added.tasks++; }

  const data = integrity({ users, projects, tasks });
  added.tasks -= tasks.length - data.tasks.length;
  added.projects -= projects.length - data.projects.length;
  const skipped = {
    users: incoming.users.length - added.users,
    projects: incoming.projects.length - added.projects,
    tasks: incoming.tasks.length - added.tasks,
  };
  return { data, added, skipped };
}
