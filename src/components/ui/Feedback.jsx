import { createPortal } from 'react-dom';
import { CheckCircle2, AlertOctagon, X } from 'lucide-react';
import { cx } from './cx';
import { useT } from '../../i18n/I18nProvider';
import { Illustration } from '../brand/Illustration';

export function EmptyState({ title, text, children, art = 'calendar', className, compact }) {
  return (
    <div
      className={cx(
        'relative flex flex-col items-center overflow-hidden rounded-lg border border-dashed border-line-strong/70 bg-surface/40 text-center',
        compact ? 'px-6 py-8' : 'px-6 py-14',
        className
      )}
    >
      <Illustration kind={art} className={compact ? 'mb-3 h-16' : 'mb-5 h-24'} />
      <p className="font-display text-base font-semibold text-fg">{title}</p>
      {text && <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/** Always mounted so screen readers announce new toasts. Portaled outside #root so it stays audible while dialogs are open. */
export function ToastRegion({ toasts, onDismiss }) {
  const t = useT();
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-70 flex flex-col items-center gap-2 md:inset-x-auto md:bottom-auto md:end-5 md:top-5 md:items-end"
    >
      {toasts.map((x) => (
        <div
          key={x.id}
          className="anim-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-line bg-surface/95 py-2.5 pe-2 ps-3 text-sm shadow-2 backdrop-blur md:w-auto md:min-w-[280px]"
        >
          <span className={cx('h-8 w-0.5 shrink-0 rounded-full', x.type === 'error' ? 'glow-line' : 'bg-ok')} aria-hidden />
          {x.type === 'error' ? (
            <AlertOctagon size={18} className="shrink-0 text-accent-fg" aria-hidden />
          ) : (
            <CheckCircle2 size={18} className="shrink-0 text-ok" aria-hidden />
          )}
          <span className="min-w-0 flex-1 text-fg">{x.text}</span>
          <button
            type="button"
            onClick={() => onDismiss(x.id)}
            aria-label={t('common.dismiss')}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}

export function ProgressBar({ value, className, tone = 'accent', label }) {
  return (
    <div
      className={cx('h-1.5 overflow-hidden rounded-full bg-line', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cx('anim-grow-x h-full rounded-full', tone === 'ok' ? 'bg-ok' : 'bg-gradient-to-r from-accent-strong to-accent rtl:bg-gradient-to-l')}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
