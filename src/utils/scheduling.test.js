import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDays, conflictPairs, findConflicts, hashPassword, isOverdue, isUpcoming, makeJoinCode, overlaps, percentDone, range, today,
} from './scheduling';

const T = (o) => ({ id: Math.random().toString(36), assigneeId: 'a', status: 'Opened', startDate: '2026-11-10', deadline: '2026-11-12', ...o });

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 13, 12)); });
afterEach(() => vi.useRealTimers());

describe('dates', () => {
  it('today is local YYYY-MM-DD', () => expect(today()).toBe('2026-11-13'));
  it('addDays', () => { expect(addDays('2026-11-13', 7)).toBe('2026-11-20'); expect(addDays('2026-12-31', 1)).toBe('2027-01-01'); });
  it('range collapses single-day tasks', () => {
    expect(range(T({ startDate: '2026-11-10', deadline: '2026-11-10' }))).toBe('2026-11-10');
    expect(range(T())).toBe('2026-11-10 to 2026-11-12');
  });
});

describe('overlaps', () => {
  it('is inclusive at the edges', () => expect(overlaps(T({ deadline: '2026-11-12' }), T({ startDate: '2026-11-12', deadline: '2026-11-14' }))).toBe(true));
  it('false for disjoint ranges', () => expect(overlaps(T(), T({ startDate: '2026-11-13', deadline: '2026-11-14' }))).toBe(false));
});

describe('findConflicts', () => {
  const a = T({ id: 'a1' });
  it('flags same assignee overlap', () => expect(findConflicts(a, [a, T({ id: 'b' })]).map((t) => t.id)).toEqual(['b']));
  it('ignores other assignees', () => expect(findConflicts(a, [T({ assigneeId: 'z' })])).toEqual([]));
  it('ignores completed tasks on either side', () => {
    expect(findConflicts(a, [T({ status: 'Completed' })])).toEqual([]);
    expect(findConflicts({ ...a, status: 'Completed' }, [T()])).toEqual([]);
  });
  it('excludes itself (editing)', () => expect(findConflicts(a, [a])).toEqual([]));
});

describe('conflictPairs', () => {
  it('returns each pair once and skips completed', () => {
    const list = [T({ id: '1' }), T({ id: '2' }), T({ id: '3', status: 'Completed' }), T({ id: '4', assigneeId: 'b' })];
    expect(conflictPairs(list).map(([x, y]) => x.id + y.id)).toEqual(['12']);
  });
});

describe('overdue / upcoming', () => {
  it('overdue only when deadline passed and not completed', () => {
    expect(isOverdue(T({ deadline: '2026-11-12' }))).toBe(true);
    expect(isOverdue(T({ deadline: '2026-11-13' }))).toBe(false);
    expect(isOverdue(T({ deadline: '2026-11-01', status: 'Completed' }))).toBe(false);
  });
  it('upcoming window is inclusive of today and today+days', () => {
    expect(isUpcoming(T({ deadline: '2026-11-13' }))).toBe(true);
    expect(isUpcoming(T({ deadline: '2026-11-27' }))).toBe(true);
    expect(isUpcoming(T({ deadline: '2026-11-28' }))).toBe(false);
    expect(isUpcoming(T({ deadline: '2026-11-20' }), 7)).toBe(true);
    expect(isUpcoming(T({ deadline: '2026-11-21' }), 7)).toBe(false);
    expect(isUpcoming(T({ deadline: '2026-11-14', status: 'Completed' }))).toBe(false);
  });
});

describe('percentDone', () => {
  it('handles empty and rounds', () => {
    expect(percentDone([])).toBe(0);
    expect(percentDone([T({ status: 'Completed' }), T(), T()])).toBe(33);
  });
});

describe('makeJoinCode', () => {
  it('6 chars from the unambiguous alphabet and unique', () => {
    for (let i = 0; i < 200; i++) expect(makeJoinCode([])).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/);
    const spy = vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5);
    expect(makeJoinCode(['AAAAAA'])).not.toBe('AAAAAA');
    spy.mockRestore();
  });
});

describe('hashPassword', () => {
  it('is deterministic per salt', async () => {
    vi.useRealTimers();
    expect(await hashPassword('pw', 's')).toBe(await hashPassword('pw', 's'));
    expect(await hashPassword('pw', 's')).not.toBe(await hashPassword('pw', 't'));
  });
});
