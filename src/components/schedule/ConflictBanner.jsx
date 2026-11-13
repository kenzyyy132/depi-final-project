import { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nProvider';
import { cx } from '../ui';
import { conflictPairs } from '../../utils/scheduling';

/** Same conflict rule as the original calendar pages (conflictPairs). */
export function ConflictBanner({ tasks }) {
  const { userName } = useApp();
  const { t, range } = useI18n();
  const [open, setOpen] = useState(true);
  const pairs = conflictPairs(tasks);
  if (!pairs.length) return null;
  return (
    <section className="anim-in relative overflow-hidden rounded-lg border border-warn/45 bg-warn/[.07]" aria-labelledby="cf-title">
      <span aria-hidden className="hatch absolute inset-y-0 start-0 w-1.5 opacity-80" />
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-3.5 text-start">
        <AlertTriangle size={18} className="shrink-0 text-warn" aria-hidden />
        <span id="cf-title" className="flex-1 text-sm font-semibold text-fg">{t('conflicts.bannerTitle', { count: pairs.length })}</span>
        <ChevronDown size={16} className={cx('text-muted transition-transform duration-200', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ul className="space-y-1.5 px-5 pb-4 ps-12 text-sm">
          {pairs.map(([a, b]) => (
            <li key={a.id + b.id} className="text-fg-2">
              <span className="font-medium text-fg">{userName(a.assigneeId)}</span>: {t('conflicts.pair', { a: a.title, ar: range(a.startDate, a.deadline), b: b.title, br: range(b.startDate, b.deadline) })}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
