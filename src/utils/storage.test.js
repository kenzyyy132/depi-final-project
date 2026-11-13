import { describe, expect, it } from 'vitest';
import { load, save } from './storage';

describe('storage', () => {
  it('uses the ss_ keys', () => { save('tasks', [1]); expect(localStorage.getItem('ss_tasks')).toBe('[1]'); });
  it('falls back on corrupted JSON', () => { localStorage.setItem('ss_users', '{bad'); expect(load('users', [])).toEqual([]); });
  it('falls back when an array is expected', () => { localStorage.setItem('ss_projects', '{"a":1}'); expect(load('projects', [])).toEqual([]); });
  it('falls back on missing value', () => expect(load('session', null)).toBe(null));
});
