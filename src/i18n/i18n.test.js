import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import en from './en';
import ar from './ar';

const flat = (o, pre = '') =>
  Object.entries(o).flatMap(([k, v]) => {
    const key = pre ? `${pre}.${k}` : k;
    const isPlural = v && typeof v === 'object' && 'other' in v;
    return v && typeof v === 'object' && !isPlural ? flat(v, key) : [key];
  });
const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.(jsx?)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
});
const get = (d, k) => k.split('.').reduce((o, x) => o?.[x], d);

describe('i18n dictionaries', () => {
  it('English and Arabic have exactly the same keys', () => {
    expect(flat(ar).sort()).toEqual(flat(en).sort());
  });
  it('every static t() key used in the source exists', () => {
    const src = files(join(__dirname, '..')).map((f) => readFileSync(f, 'utf8')).join('\n');
    const keys = [...new Set([...src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)].map((m) => m[1]))];
    const missing = keys.filter((k) => get(en, k) === undefined || get(ar, k) === undefined);
    expect(missing).toEqual([]);
  });
  it('dynamic key families are complete', () => {
    const fam = {
      status: ['Opened', 'In Progress', 'Completed'], priority: ['High', 'Medium', 'Low'],
      'nav': ['dashboard', 'projects', 'tasks', 'calendar', 'team', 'reports', 'settings', 'projectDetails', 'taskDetails', 'join'],
      'notif': ['overdue', 'dueSoon', 'conflict', 'assigned', 'completed'], rail: ['overdue', 'today', 'week', 'later'],
      'time': ['late', 'dueToday', 'dueTomorrow', 'dueIn', 'done'], 'backup.err': ['notJson', 'notBackup', 'newerVersion'],
      'devTeam': ['completed', 'created'], 'roles': ['manager', 'developer'],
    };
    const missing = Object.entries(fam).flatMap(([pre, ks]) => ks.map((k) => `${pre}.${k}`)).filter((k) => get(en, k) === undefined || get(ar, k) === undefined);
    expect(missing).toEqual([]);
  });
});
