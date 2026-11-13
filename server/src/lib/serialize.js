// Converts database rows to the exact record shapes the React app has always used.
// Secrets (password hashes, session tokens) are never serialized.

const STATUS_OUT = { Opened: 'Opened', InProgress: 'In Progress', Completed: 'Completed' };
const STATUS_IN = { Opened: 'Opened', 'In Progress': 'InProgress', Completed: 'Completed' };
export const statusIn = (s) => STATUS_IN[s];
export const statusOut = (s) => STATUS_OUT[s];

const iso = (d) => (d ? new Date(d).toISOString() : undefined);

/** The signed-in user's own record. */
export const selfUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, createdAt: iso(u.createdAt), onboardedAt: iso(u.onboardedAt) ?? null,
});

/** Another user, as seen by `viewer`. Developers never receive other people's email addresses. */
export const otherUser = (u, viewer) => {
  const out = { id: u.id, name: u.name, role: u.role };
  if (viewer.role === 'manager' || u.id === viewer.id) out.email = u.email;
  return out;
};

export const project = (p, viewer) => {
  const out = {
    id: p.id, name: p.name, description: p.description, startDate: p.startDate, deadline: p.deadline,
    managerId: p.managerId, memberIds: (p.members || []).map((m) => m.userId), createdAt: iso(p.createdAt),
  };
  // The join code is the project's invitation secret: only its manager sees it.
  if (viewer.role === 'manager' && p.managerId === viewer.id) out.joinCode = p.joinCode;
  return out;
};

export const task = (t) => {
  const out = {
    id: t.id, title: t.title, description: t.description, projectId: t.projectId, assigneeId: t.assigneeId,
    startDate: t.startDate, deadline: t.deadline, priority: t.priority, status: statusOut(t.status), createdAt: iso(t.createdAt),
  };
  if (t.completedAt) out.completedAt = iso(t.completedAt);
  return out;
};

/** A developer's work in a project the viewer cannot see: only what the conflict rule needs. */
export const busy = (t) => ({ id: t.id, assigneeId: t.assigneeId, startDate: t.startDate, deadline: t.deadline, status: statusOut(t.status), external: true });
