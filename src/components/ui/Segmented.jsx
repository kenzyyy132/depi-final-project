import { cx } from './cx';

/** Segmented control (radiogroup) with a sliding indicator. options: [{ value, label, icon, iconOnly }] */
export function Segmented({ value, onChange, options, label, size = 'md', className }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const onKey = (e) => {
    const rtl = document.documentElement.dir === 'rtl';
    const fwd = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key !== fwd && e.key !== back) return;
    e.preventDefault();
    const group = e.currentTarget;
    const next = options[(idx + (e.key === fwd ? 1 : -1) + options.length) % options.length];
    onChange(next.value);
    requestAnimationFrame(() => group.querySelector('[aria-checked="true"]')?.focus());
  };
  const n = options.length;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className={cx('relative inline-grid rounded-md border border-line bg-canvas/50 p-0.5', className)}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 rounded-[7px] bg-raised shadow-[0_0_0_1px_rgb(var(--line-strong))] transition-[inset-inline-start] duration-200 ease-out"
        style={{ width: `calc((100% - 4px) / ${n})`, insetInlineStart: `calc(2px + (100% - 4px) / ${n} * ${idx})` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.iconOnly ? o.label : undefined}
          title={o.iconOnly ? o.label : undefined}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={cx(
            'relative z-[1] inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] font-medium transition-colors',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
            o.value === value ? 'text-fg' : 'text-muted hover:text-fg-2'
          )}
        >
          {o.icon && <o.icon size={15} aria-hidden />}
          {!o.iconOnly && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  );
}
