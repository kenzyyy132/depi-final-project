import { cloneElement, useEffect, useId, useRef, useState } from 'react';
import { cx } from './cx';

/** Lightweight popover anchored to its trigger. Closes on outside click / Escape. */
export function Popover({ trigger, children, align = 'end', className, open: controlled, onOpenChange, label }) {
  const [inner, setInner] = useState(false);
  const open = controlled ?? inner;
  const setOpen = (v) => { setInner(v); onOpenChange?.(v); };
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('[aria-haspopup]')?.focus(); }
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={ref} className="relative">
      {cloneElement(trigger, { 'aria-haspopup': 'true', 'aria-expanded': open, 'aria-controls': open ? id : undefined, onClick: () => setOpen(!open) })}
      {open && (
        <div
          id={id}
          role="region"
          aria-label={label}
          className={cx('anim-pop absolute top-full z-50 mt-2 rounded-lg border border-line bg-surface shadow-2', align === 'end' ? 'end-0' : 'start-0', className)}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

/** Menu with roving focus (arrow keys). items: [{ label, icon, onSelect, danger, hidden } | { divider: true }] */
export function Menu({ trigger, items, align = 'end', label }) {
  const [open, setOpen] = useState(false);
  const list = useRef(null);
  useEffect(() => {
    if (open) requestAnimationFrame(() => list.current?.querySelector('[role=menuitem]')?.focus());
  }, [open]);
  const onKey = (e) => {
    const els = [...list.current.querySelectorAll('[role=menuitem]')];
    const i = els.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus(); }
    if (e.key === 'Tab') setOpen(false);
  };
  return (
    <Popover trigger={trigger} align={align} open={open} onOpenChange={setOpen} className="min-w-[200px] p-1.5" label={label}>
      <div ref={list} role="menu" aria-label={label} onKeyDown={onKey}>
        {items.filter((x) => !x.hidden).map((it, i) =>
          it.divider ? (
            <div key={`d${i}`} className="my-1 h-px bg-line" role="separator" />
          ) : (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => { setOpen(false); it.onSelect(); }}
              className={cx(
                'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-sm outline-none transition-colors hover:bg-raised focus:bg-raised',
                it.danger ? 'text-accent-fg' : 'text-fg-2 hover:text-fg focus:text-fg'
              )}
            >
              {it.icon && <it.icon size={16} aria-hidden />}
              {it.label}
            </button>
          )
        )}
      </div>
    </Popover>
  );
}
