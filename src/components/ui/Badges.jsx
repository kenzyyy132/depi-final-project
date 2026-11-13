import { Check, AlertTriangle, Clock } from 'lucide-react';
import { cx } from './cx';
import { useI18n } from '../../i18n/I18nProvider';

/** Status: Opened = hollow ring, In Progress = half-filled pulsing ring, Completed = filled check. Shape + label, never color alone. */
export function StatusGlyph({ status, size = 14 }) {
  if (status === 'Completed')
    return <span aria-hidden className="inline-grid shrink-0 place-items-center rounded-full bg-ok text-canvas" style={{ width: size, height: size }}><Check size={size - 4} strokeWidth={3} /></span>;
  if (status === 'In Progress')
    return (
      <span aria-hidden className="pulse-ring inline-block shrink-0 rounded-full border-2 border-fg" style={{ width: size, height: size, background: 'linear-gradient(90deg, rgb(var(--fg)) 50%, transparent 50%)' }} />
    );
  return <span aria-hidden className="inline-block shrink-0 rounded-full border-2 border-muted" style={{ width: size, height: size }} />;
}

export function StatusPill({ status, className }) {
  const { tStatus } = useI18n();
  return (
    <span className={cx(
      'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium',
      status === 'Completed' ? 'border-ok/30 bg-ok/10 text-ok' : status === 'In Progress' ? 'border-fg/20 bg-fg/[.06] text-fg' : 'border-line-strong bg-transparent text-fg-2',
      className
    )}>
      <StatusGlyph status={status} size={10} />
      {tStatus(status)}
    </span>
  );
}

export const PRIORITY_TONE = { High: 'bg-accent', Medium: 'bg-warn', Low: 'bg-faint' };
export const PRIORITY_TEXT = { High: 'text-accent-fg', Medium: 'text-warn', Low: 'text-muted' };

/** Priority: signal bars (3/2/1) + label. */
export function PriorityTag({ priority, compact, className }) {
  const { tPriority } = useI18n();
  const n = priority === 'High' ? 3 : priority === 'Medium' ? 2 : 1;
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium', PRIORITY_TEXT[priority], className)}>
      <span aria-hidden className="flex items-end gap-[2px]">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cx('w-[3px] rounded-sm', i <= n ? PRIORITY_TONE[priority] : 'bg-line-strong')} style={{ height: 4 + i * 3 }} />
        ))}
      </span>
      <span className={compact ? 'sr-only' : undefined}>{tPriority(priority)}</span>
    </span>
  );
}

export function OverdueTag({ deadline, className }) {
  const { t } = useI18n();
  const days = Math.max(1, Math.round((Date.now() - new Date(deadline + 'T23:59:59')) / 864e5));
  return (
    <span className={cx('inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full bg-accent/[.12] px-2 text-xs font-semibold text-accent-fg ring-1 ring-inset ring-accent/40', className)}>
      <Clock size={12} aria-hidden />
      {t('time.late', { count: days })}
    </span>
  );
}

export function ConflictTag({ count, className }) {
  const { t } = useI18n();
  return (
    <span className={cx('inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full bg-warn/[.12] px-2 text-xs font-semibold text-warn ring-1 ring-inset ring-warn/40', className)}>
      <AlertTriangle size={12} aria-hidden />
      {t('conflicts.count', { count })}
    </span>
  );
}

export const Chip = ({ children, onRemove, removeLabel, className }) => (
  <span className={cx('inline-flex h-7 items-center gap-1 rounded-full border border-line-strong bg-raised ps-3 pe-1 text-xs text-fg-2', !onRemove && 'pe-3', className)}>
    {children}
    {onRemove && (
      <button type="button" onClick={onRemove} aria-label={removeLabel} className="grid h-5 w-5 place-items-center rounded-full text-muted hover:bg-line hover:text-fg">×</button>
    )}
  </span>
);
