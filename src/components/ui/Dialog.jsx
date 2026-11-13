import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from './cx';
import { Button, IconButton } from './Button';
import { usePresence } from '../../hooks/usePresence';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useT } from '../../i18n/I18nProvider';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const stack = [];

/** Focus trap + Escape + scroll lock + focus return, shared by Dialog and Drawer. */
function useModalBehaviour(open, panelRef, onClose, initialFocus) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const token = {};
    stack.push(token);
    const prev = document.activeElement;
    const root = document.getElementById('root');
    if (stack.length === 1) { document.body.style.overflow = 'hidden'; root?.setAttribute('aria-hidden', 'true'); }
    const focusFirst = () => {
      const p = panelRef.current;
      if (!p) return;
      const target = (initialFocus?.current) || p.querySelector('[data-autofocus]') || p.querySelector(FOCUSABLE) || p;
      target.focus({ preventScroll: true });
    };
    const raf = requestAnimationFrame(focusFirst);
    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current?.(); }
      if (e.key === 'Tab') {
        const els = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])].filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey, true);
      stack.splice(stack.indexOf(token), 1);
      if (!stack.length) { document.body.style.overflow = ''; root?.removeAttribute('aria-hidden'); }
      if (prev && prev.focus && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Centered dialog on ≥sm, bottom sheet on phones. */
export function Dialog({ open = true, onClose, title, description, children, footer, size = 'md', role = 'dialog', initialFocus, eyebrow }) {
  const t = useT();
  const { mounted, closing } = usePresence(open, 200);
  const ref = useRef(null);
  const tid = useId(), did = useId();
  const mobile = useIsMobile();
  useModalBehaviour(open, ref, onClose, initialFocus);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-60 flex items-end justify-center sm:items-center sm:p-6">
      <div className={cx('absolute inset-0 bg-canvas/70 backdrop-blur-sm', closing ? 'anim-fade-out' : 'anim-fade')} onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role={role}
        aria-modal="true"
        aria-labelledby={tid}
        aria-describedby={description ? did : undefined}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-line bg-surface shadow-3 outline-none',
          'rounded-t-xl sm:rounded-xl',
          size === 'lg' ? 'sm:max-w-2xl' : size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-xl',
          mobile ? (closing ? 'anim-sheet-out' : 'anim-sheet') : closing ? 'anim-pop-out' : 'anim-pop'
        )}
      >
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h2 id={tid} className="text-lg font-semibold text-fg">{title}</h2>
            {description && <p id={did} className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <IconButton label={t('common.close')} size="sm" onClick={onClose} className="-me-2 -mt-1"><X size={18} /></IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line bg-canvas/30 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

/** Side drawer from the inline-end edge (RTL aware). */
export function Drawer({ open, onClose, title, eyebrow, children, footer, width = 'max-w-md', side = 'end' }) {
  const t = useT();
  const { mounted, closing } = usePresence(open, 200);
  const ref = useRef(null);
  const tid = useId();
  useModalBehaviour(open, ref, onClose);
  if (!mounted) return null;
  const rtl = document.documentElement.dir === 'rtl';
  const fromEnd = side === 'end';
  const from = (fromEnd ? !rtl : rtl) ? '100%' : '-100%';
  return createPortal(
    <div className="fixed inset-0 z-60">
      <div className={cx('absolute inset-0 bg-canvas/60 backdrop-blur-[2px]', closing ? 'anim-fade-out' : 'anim-fade')} onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tid}
        tabIndex={-1}
        style={{ '--from': from }}
        className={cx(
          'absolute inset-y-0 flex w-full flex-col border-line bg-surface shadow-3 outline-none', width,
          fromEnd ? 'end-0 border-s' : 'start-0 border-e',
          closing ? 'anim-drawer-out' : 'anim-drawer'
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h2 id={tid} className="truncate text-lg font-semibold">{title}</h2>
          </div>
          <IconButton label={t('common.close')} size="sm" onClick={onClose} className="-me-2"><X size={18} /></IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

/** Destructive confirmation. Focus starts on Cancel (the safe choice). */
export function ConfirmDialog({ open = true, title, text, confirmLabel, onConfirm, onCancel, tone = 'danger' }) {
  const t = useT();
  const cancelRef = useRef(null);
  const [busy, setBusy] = useState(false);
  // onConfirm may return a promise: the button shows progress until the server answers.
  const confirm = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  return (
    <Dialog
      open={open}
      onClose={busy ? () => {} : onCancel}
      title={title || t('common.confirmTitle')}
      role="alertdialog"
      size="sm"
      initialFocus={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button variant={tone === 'danger' ? 'dangerSolid' : 'primary'} onClick={confirm} loading={busy}>{confirmLabel || t('common.delete')}</Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-fg-2">{text}</p>
    </Dialog>
  );
}
