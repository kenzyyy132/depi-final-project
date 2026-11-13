import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBackup, mergeData, parseBackup } from './backup';
import { completionsByWeek, dailyLoad, onTimeRate, workload } from './analytics';
import { monthWeeks, weekOf, dueInfo } from './dates';
import { buildNotifications } from './notifications';

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 13, 12)); });
afterEach(() => vi.useRealTimers());

const H = 'a'.repeat(64);
const U = (id, email, role = 'developer') => ({ id, name: id, email, role, salt: 's', passwordHash: H, createdAt: '2026-01-01' });
const P = (id, code, managerId = 'm', memberIds = ['d']) => ({ id, name: id, description: '', startDate: '2026-11-01', deadline: '2026-12-01', managerId, memberIds, joinCode: code, createdAt: 'x' });
const T = (id, o = {}) => ({ id, title: id, description: '', projectId: 'p', assigneeId: 'd', startDate: '2026-11-10', deadline: '2026-11-20', priority: 'Low', status: 'Opened', createdAt: '2026-11-01T00:00:00Z', ...o });

describe('backup', () => {
  const data = { users: [U('m', 'm@x', 'manager'), U('d', 'd@x')], projects: [P('p', 'AAA222')], tasks: [T('t')] };
  it('round-trips a backup', () => {
    const r = parseBackup(JSON.stringify(makeBackup(data)));
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(data);
    expect(r.rejected).toBe(0);
  });
  it('rejects non-JSON, foreign files and newer versions', () => {
    expect(parseBackup('{oops').error).toBe('notJson');
    expect(parseBackup('{"a":1}').error).toBe('notBackup');
    expect(parseBackup(JSON.stringify({ ...makeBackup(data), version: 99 })).error).toBe('newerVersion');
  });
  it('drops invalid records and dangling references', () => {
    const bad = makeBackup({ ...data, tasks: [T('t'), T('x', { priority: 'Urgent' }), T('y', { projectId: 'nope' })], projects: [P('p', 'AAA222'), P('q', 'bad')] });
    const r = parseBackup(JSON.stringify(bad));
    expect(r.data.tasks.map((t) => t.id)).toEqual(['t']);
    expect(r.data.projects.map((p) => p.id)).toEqual(['p']);
    expect(r.rejected).toBe(3);
  });
  it('merge never overwrites existing records', () => {
    const incoming = {
      users: [{ ...U('m', 'm@x', 'manager'), name: 'HACK' }, U('z', 'd@x'), U('n', 'n@x')],
      projects: [{ ...P('p', 'AAA222'), name: 'HACK' }, P('q', 'AAA222'), P('r', 'BBB333', 'n', ['n'])],
      tasks: [{ ...T('t'), title: 'HACK' }, T('u', { projectId: 'r', assigneeId: 'n' })],
    };
    const { data: out, added, skipped } = mergeData(data, incoming);
    expect(out.users.find((u) => u.id === 'm').name).toBe('m');
    expect(out.projects.find((p) => p.id === 'p').name).toBe('p');
    expect(out.tasks.find((t) => t.id === 't').title).toBe('t');
    expect(added).toEqual({ users: 1, projects: 1, tasks: 1 });
    expect(skipped).toEqual({ users: 2, projects: 2, tasks: 1 });
  });
});

describe('analytics (real data only)', () => {
  it('daily load counts open tasks and double-booked developers', () => {
    const tasks = [T('a', { startDate: '2026-11-13', deadline: '2026-11-14' }), T('b', { startDate: '2026-11-14', deadline: '2026-11-14' }), T('c', { status: 'Completed', startDate: '2026-11-13', deadline: '2026-11-14' })];
    const d = dailyLoad(tasks, '2026-11-13', 3);
    expect(d.map((x) => x.count)).toEqual([1, 2, 0]);
    expect(d.map((x) => x.conflicts)).toEqual([0, 1, 0]);
  });
  it('completion history only uses recorded timestamps', () => {
    const tasks = [T('a', { status: 'Completed', completedAt: '2026-11-12T10:00:00' }), T('b', { status: 'Completed' })];
    const r = completionsByWeek(tasks, 2);
    expect(r.tracked).toBe(1);
    expect(r.untracked).toBe(1);
    expect(r.buckets.reduce((s, b) => s + b.count, 0)).toBe(1);
    expect(onTimeRate(tasks)).toBe(100);
    expect(onTimeRate([T('x')])).toBe(null);
  });
  it('workload summarises per person', () => {
    const [w] = workload([T('a', { status: 'In Progress' }), T('b'), T('c', { deadline: '2026-11-01', startDate: '2026-11-01' })], [{ id: 'd', name: 'D' }]);
    expect(w).toMatchObject({ total: 3, progress: 1, opened: 2, overdue: 1, conflicts: 1 });
  });
});

describe('dates', () => {
  it('month weeks honour the week start', () => {
    const sun = monthWeeks(2026, 10, 0);
    expect(sun[0][0].key).toBe('2026-11-01');
    const sat = monthWeeks(2026, 10, 6);
    expect(sat[0][0].key).toBe('2026-10-31');
    expect(sat.flat().filter((d) => d.inMonth)).toHaveLength(30);
  });
  it('weekOf and dueInfo', () => {
    expect(weekOf('2026-11-13', 0)[0]).toBe('2026-11-08');
    expect(dueInfo(T('a', { deadline: '2026-11-12' }))).toEqual({ key: 'time.late', n: 1 });
    expect(dueInfo(T('a', { deadline: '2026-11-13' })).key).toBe('time.dueToday');
    expect(dueInfo(T('a', { deadline: '2026-11-16' }))).toEqual({ key: 'time.dueIn', n: 3 });
  });
});

describe('notifications', () => {
  it('derives overdue, due soon, conflicts and assignments', () => {
    const myTasks = [T('a', { deadline: '2026-11-12', startDate: '2026-11-10' }), T('b', { deadline: '2026-11-14', startDate: '2026-11-11', createdAt: '2026-11-12T00:00:00Z' })];
    const kinds = buildNotifications({ user: { id: 'd', role: 'developer' }, myTasks }).map((n) => n.kind);
    expect(kinds).toEqual(['conflict', 'overdue', 'dueSoon', 'assigned']);
  });
});
