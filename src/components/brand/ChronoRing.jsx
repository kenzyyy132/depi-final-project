import { cx } from '../ui/cx';
import { useT } from '../../i18n/I18nProvider';

const R = 24;
const C = 2 * Math.PI * R;
const SEG = C / 7;

/** Brand mark: seven segments for the seven days of the week; today's segment is red. */
export function ChronoRing({ size = 32, animate = false, className, day = new Date().getDay(), title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cx('shrink-0', className)} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {Array.from({ length: 7 }, (_, i) => (
        <circle
          key={i}
          cx="32"
          cy="32"
          r={R}
          fill="none"
          strokeWidth="5.5"
          strokeLinecap="round"
          stroke={i === day ? 'rgb(var(--accent))' : 'rgb(var(--line-strong))'}
          strokeDasharray={`${SEG - 4.5} ${C - SEG + 4.5}`}
          transform={`rotate(${i * (360 / 7) - 90 + 6} 32 32)`}
          style={
            animate
              ? { opacity: 0, animation: `appear 400ms ${i * 60}ms var(--ease-out) forwards` }
              : i === day
              ? { filter: 'drop-shadow(0 0 3px rgb(var(--glow) / .7))' }
              : undefined
          }
        />
      ))}
      <circle cx="32" cy="32" r="4.5" fill="rgb(var(--accent))" />
    </svg>
  );
}

export function Wordmark({ collapsed, className }) {
  const t = useT();
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      <ChronoRing size={30} />
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-display text-[15px] font-semibold text-fg">{t('brand.name1')}</span>
          <span className="eyebrow block truncate !text-accent-fg">{t('brand.name2')}</span>
        </span>
      )}
    </span>
  );
}
