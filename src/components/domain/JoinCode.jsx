import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nProvider';
import { cx } from '../ui';

/** Join code display with copy-to-clipboard (same success/failure paths as the original). */
export function JoinCode({ code, size = 'md', className }) {
  const { notify } = useApp();
  const { t } = useI18n();
  const [ok, setOk] = useState(false);
  const copy = () => {
    if (!navigator.clipboard?.writeText) return notify(t('projects.copyUnavailable'), 'error');
    navigator.clipboard.writeText(code).then(
      () => { notify(t('projects.codeCopied')); setOk(true); setTimeout(() => setOk(false), 1500); },
      () => notify(t('projects.copyFailed'), 'error')
    );
  };
  const big = size === 'lg';
  return (
    <div className={cx('flex flex-wrap items-center gap-3', className)} dir="ltr">
      <code aria-label={t('projects.joinCodeAria', { code: code.split('').join(' ') })} className="flex gap-1">
        {code.split('').map((ch, i) => (
          <span key={i} className={cx('grid place-items-center rounded-md border border-line-strong bg-canvas/60 font-mono font-semibold text-fg', big ? 'h-12 w-10 text-xl' : 'h-8 w-7 text-sm')}>{ch}</span>
        ))}
      </code>
      <button
        type="button"
        onClick={copy}
        className={cx('inline-flex items-center gap-1.5 rounded-md border px-3 font-medium transition-colors', big ? 'h-12 text-sm' : 'h-8 text-xs',
          ok ? 'border-ok/50 bg-ok/10 text-ok' : 'border-line-strong text-fg-2 hover:border-accent/60 hover:text-fg')}
        aria-label={t('projects.copyCode')}
      >
        <span className="relative h-4 w-4">
          <Copy size={16} className={cx('absolute inset-0 transition-all duration-200', ok ? 'scale-50 opacity-0' : 'opacity-100')} aria-hidden />
          <Check size={16} className={cx('absolute inset-0 transition-all duration-200', ok ? 'opacity-100' : 'scale-50 opacity-0')} aria-hidden />
        </span>
        {ok ? t('projects.copied') : t('projects.copy')}
      </button>
    </div>
  );
}
