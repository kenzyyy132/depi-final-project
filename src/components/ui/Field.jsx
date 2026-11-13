import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from './cx';

export const controlClass = (error) =>
  cx(
    'w-full rounded-md border bg-field px-3 text-sm text-fg placeholder:text-faint transition-[border-color,box-shadow] duration-150',
    'hover:border-line-strong focus:outline-none focus:border-accent/70 focus:shadow-[0_0_0_3px_rgb(var(--accent)/.18)]',
    error ? 'border-accent/70' : 'border-line'
  );

/** Labelled control. `as` = 'input' | 'select' | 'textarea'. Label, hint and error are wired with ids for screen readers. */
export const Field = forwardRef(function Field({ label, error, hint, as = 'input', className, children, id, trailing, ...p }, ref) {
  const auto = useId();
  const cid = id || auto;
  const describedBy = [hint && `${cid}-hint`, error && `${cid}-err`].filter(Boolean).join(' ') || undefined;
  const common = { id: cid, ref, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, ...p };
  return (
    <div className={cx('block', className)}>
      {label && <label htmlFor={cid} className="mb-1.5 block text-xs font-medium text-fg-2">{label}</label>}
      <div className="relative">
        {as === 'select' ? (
          <>
            <select {...common} className={cx(controlClass(error), 'h-10 cursor-pointer appearance-none pe-9')}>{children}</select>
            <ChevronDown size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          </>
        ) : as === 'textarea' ? (
          <textarea {...common} className={cx(controlClass(error), 'min-h-[84px] resize-y py-2.5 leading-6')} />
        ) : (
          <input {...common} className={cx(controlClass(error), 'h-10', trailing && 'pe-11')} />
        )}
        {trailing && <div className="absolute end-1 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {hint && !error && <p id={`${cid}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p id={`${cid}-err`} className="anim-fade mt-1.5 text-xs font-medium text-accent-fg">{error}</p>}
    </div>
  );
});
