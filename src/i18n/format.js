// Locale-aware formatting. Stored dates stay ISO `YYYY-MM-DD`; we only format at render time.
export const parseISODate = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const toKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const daysBetween = (a, b) => Math.round((parseISODate(b) - parseISODate(a)) / 864e5);

export function makeFormatters(lang) {
  const locale = lang === 'ar' ? 'ar-EG-u-nu-arab' : 'en-US';
  const cache = new Map();
  const df = (opts) => {
    const k = JSON.stringify(opts);
    if (!cache.has(k)) cache.set(k, new Intl.DateTimeFormat(locale, opts));
    return cache.get(k);
  };
  const nf = new Intl.NumberFormat(locale);
  const pf = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const toDate = (v) => (v instanceof Date ? v : String(v).length <= 10 ? parseISODate(v) : new Date(v));

  return {
    locale,
    num: (n) => nf.format(n),
    pct: (n) => pf.format(n / 100),
    /** Short date: "Nov 13" / "١٣ نوفمبر" */
    date: (v, opts = { month: 'short', day: 'numeric' }) => df(opts).format(toDate(v)),
    dateLong: (v) => df({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(toDate(v)),
    dateTime: (v) => df({ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(toDate(v)),
    monthYear: (y, m) => df({ month: 'long', year: 'numeric' }).format(new Date(y, m, 1)),
    weekday: (dayIndex, style = 'short') => df({ weekday: style }).format(new Date(2026, 1, 1 + dayIndex)), // Feb 1 2026 is a Sunday
    dayNum: (v) => df({ day: 'numeric' }).format(toDate(v)),
    /** "Nov 10 – 12" style range; single day collapses. */
    range: (a, b) => {
      if (!b || a === b) return df({ month: 'short', day: 'numeric' }).format(toDate(a));
      try {
        return df({ month: 'short', day: 'numeric' }).formatRange(toDate(a), toDate(b));
      } catch {
        return `${df({ month: 'short', day: 'numeric' }).format(toDate(a))} – ${df({ month: 'short', day: 'numeric' }).format(toDate(b))}`;
      }
    },
  };
}
