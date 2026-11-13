import { conflictPairs, isOverdue, today, addDays, STATUSES, PRIORITIES } from './scheduling';
import { covers, daysFrom } from './dates';

// Every number here is derived from real records. Nothing is estimated or back-filled.
const open = (t) => t.status !== 'Completed';

export const countBy = (tasks, field, values) => values.map((v) => ({ value: v, count: tasks.filter((t) => t[field] === v).length }));
export const statusCounts = (tasks) => countBy(tasks, 'status', STATUSES);
export const priorityCounts = (tasks) => countBy(tasks, 'priority', PRIORITIES);

/** Per-day open-task load and number of developers double-booked that day. */
export function dailyLoad(tasks, from = today(), n = 14) {
  return daysFrom(from, n).map((key) => {
    const active = tasks.filter((t) => open(t) && covers(t, key));
    const per = {};
    active.forEach((t) => (per[t.assigneeId] = (per[t.assigneeId] || 0) + 1));
    return { key, count: active.length, conflicts: Object.values(per).filter((c) => c > 1).length, due: tasks.filter((t) => open(t) && t.deadline === key).length };
  });
}

/** Workload summary for each person. */
export function workload(tasks, people, from = today(), horizon = 14) {
  const end = addDays(from, horizon - 1);
  const pairs = conflictPairs(tasks);
  return people
    .map((p) => {
      const mine = tasks.filter((t) => t.assigneeId === p.id);
      const busy = daysFrom(from, horizon).filter((k) => mine.some((t) => open(t) && covers(t, k))).length;
      return {
        person: p,
        total: mine.length,
        opened: mine.filter((t) => t.status === 'Opened').length,
        progress: mine.filter((t) => t.status === 'In Progress').length,
        done: mine.filter((t) => t.status === 'Completed').length,
        overdue: mine.filter(isOverdue).length,
        conflicts: pairs.filter(([a]) => a.assigneeId === p.id).length,
        busyDays: busy,
        horizon,
        upcoming: mine.filter((t) => open(t) && t.deadline >= from && t.deadline <= end).length,
      };
    })
    .sort((a, b) => b.opened + b.progress - (a.opened + a.progress));
}

/** Open tasks whose deadline falls in each of the next `weeks` weeks (starting today). */
export function deadlinesByWeek(tasks, weeks = 8, from = today()) {
  return Array.from({ length: weeks }, (_, i) => {
    const s = addDays(from, i * 7), e = addDays(from, i * 7 + 6);
    const inWeek = tasks.filter((t) => t.deadline >= s && t.deadline <= e);
    return { start: s, end: e, open: inWeek.filter(open).length, done: inWeek.filter((t) => !open(t)).length };
  });
}

/** Completions per week from recorded completedAt only; tasks completed before tracking began are counted separately. */
export function completionsByWeek(tasks, weeks = 8, to = today()) {
  const start = addDays(to, -(weeks * 7 - 1));
  const tracked = tasks.filter((t) => t.status === 'Completed' && t.completedAt);
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const s = addDays(start, i * 7), e = addDays(start, i * 7 + 6);
    return { start: s, end: e, count: tracked.filter((t) => { const d = localDay(t.completedAt); return d >= s && d <= e; }).length };
  });
  const untracked = tasks.filter((t) => t.status === 'Completed' && !t.completedAt).length;
  return { buckets, untracked, tracked: tracked.length };
}

/** Deadline heat over `n` days: count of task deadlines per day. */
export const deadlineHeat = (tasks, from, n) => daysFrom(from, n).map((key) => ({ key, count: tasks.filter((t) => t.deadline === key).length }));

/** On-time rate among tracked completions (completedAt day ≤ deadline). */
export function onTimeRate(tasks) {
  const tracked = tasks.filter((t) => t.status === 'Completed' && t.completedAt);
  if (!tracked.length) return null;
  return Math.round((tracked.filter((t) => localDay(t.completedAt) <= t.deadline).length / tracked.length) * 100);
}

export function localDay(isoDateTime) {
  const d = new Date(isoDateTime);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
