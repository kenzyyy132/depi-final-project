import { addDays, today } from './scheduling';
import { daysBetween, parseISODate, toKey } from '../i18n/format';

export { addDays, today, daysBetween, parseISODate, toKey };

/** Weeks (arrays of 7 day keys) covering a month; weekStart 0=Sun … 6=Sat. */
export function monthWeeks(y, m, weekStart = 0) {
  const first = new Date(y, m, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const start = new Date(y, m, 1 - lead);
  const total = new Date(y, m + 1, 0).getDate();
  const n = Math.ceil((lead + total) / 7);
  return Array.from({ length: n }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      return { key: toKey(dt), day: dt.getDate(), inMonth: dt.getMonth() === m, dow: dt.getDay() };
    })
  );
}

/** 7 consecutive day keys for the week that contains `key`. */
export function weekOf(key, weekStart = 0) {
  const d = parseISODate(key);
  const lead = (d.getDay() - weekStart + 7) % 7;
  return Array.from({ length: 7 }, (_, i) => toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - lead + i)));
}

export const daysFrom = (key, n) => Array.from({ length: n }, (_, i) => addDays(key, i));
export const covers = (t, key) => t.startDate <= key && key <= t.deadline;
export const weekOrder = (weekStart) => Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);

/** Relative due description key + count, consumed by t('time.*'). */
export function dueInfo(t) {
  const n = daysBetween(today(), t.deadline);
  if (t.status === 'Completed') return { key: 'time.done', n: 0 };
  if (n < 0) return { key: 'time.late', n: -n };
  if (n === 0) return { key: 'time.dueToday', n: 0 };
  if (n === 1) return { key: 'time.dueTomorrow', n: 1 };
  return { key: 'time.dueIn', n };
}
