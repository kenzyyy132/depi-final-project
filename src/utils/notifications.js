import { conflictPairs, isOverdue, today, addDays } from './scheduling';
import { localDay } from './analytics';

/**
 * Notifications are derived from the real records on every render, never stored.
 * Only their read state is persisted (ss_notif_seen, per user).
 */
export function buildNotifications({ user, myTasks }) {
  if (!user) return [];
  const isM = user.role === 'manager';
  const now = today();
  const soon = addDays(now, 2);
  const weekAgo = addDays(now, -7);
  const out = [];

  myTasks.filter(isOverdue).forEach((t) =>
    out.push({ id: `overdue:${t.id}:${t.deadline}`, kind: 'overdue', task: t, sort: `2-${t.deadline}` })
  );
  myTasks
    .filter((t) => t.status !== 'Completed' && t.deadline >= now && t.deadline <= soon)
    .forEach((t) => out.push({ id: `due:${t.id}:${t.deadline}`, kind: 'dueSoon', task: t, sort: `1-${t.deadline}` }));
  conflictPairs(myTasks).forEach(([a, b]) =>
    out.push({ id: `conflict:${[a.id, b.id].sort().join(':')}:${a.startDate}${a.deadline}${b.startDate}${b.deadline}`, kind: 'conflict', task: a, other: b, sort: `3-${a.startDate}` })
  );
  if (!isM)
    myTasks
      .filter((t) => t.createdAt && localDay(t.createdAt) >= weekAgo)
      .forEach((t) => out.push({ id: `assigned:${t.id}`, kind: 'assigned', task: t, sort: `0-${t.createdAt}` }));
  if (isM)
    myTasks
      .filter((t) => t.status === 'Completed' && t.completedAt && localDay(t.completedAt) >= weekAgo)
      .forEach((t) => out.push({ id: `completed:${t.id}:${t.completedAt}`, kind: 'completed', task: t, sort: `0-${t.completedAt}` }));

  const rank = { conflict: 0, overdue: 1, dueSoon: 2, assigned: 3, completed: 4 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || a.sort.localeCompare(b.sort));
}
