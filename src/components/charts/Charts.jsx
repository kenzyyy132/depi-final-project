import { useId, useState } from 'react';
import { cx } from '../ui/cx';
import { useI18n } from '../../i18n/I18nProvider';
import { useCountUp } from '../../hooks/useCountUp';

// Hand-built SVG charts. Every chart has a text alternative (aria-label or sr-only table) and uses only real values.

export function AnimatedNumber({ value, className, format }) {
  const { num } = useI18n();
  const v = useCountUp(value);
  return <span className={cx('tnum', className)}>{format ? format(v) : num(v)}</span>;
}

/** Ring with optional segments [{ value, color, label }]. */
export function Ring({ value = 0, segments, size = 132, stroke = 10, label, children, className }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const total = segments ? segments.reduce((s, x) => s + x.value, 0) : 100;
  let acc = 0;
  const arcs = segments
    ? segments.filter((s) => s.value > 0).map((s) => {
        const len = total ? (s.value / total) * C : 0;
        const a = { ...s, len, offset: acc };
        acc += len;
        return a;
      })
    : [{ color: 'rgb(var(--accent))', len: (value / 100) * C, offset: 0, glow: true }];
  return (
    <div className={cx('relative inline-grid place-items-center', className)} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 rtl:scale-y-[-1]" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={stroke}
            strokeLinecap={segments ? 'butt' : 'round'}
            strokeDasharray={`${Math.max(0, a.len - (segments && arcs.length > 1 ? 2 : 0))} ${C}`}
            strokeDashoffset={-a.offset}
            style={{ transition: 'stroke-dasharray 800ms var(--ease-out)', animation: `fade-in 600ms ${i * 80}ms both`, filter: a.glow ? 'drop-shadow(0 0 4px rgb(var(--glow) / .6))' : undefined }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Horizontal stacked bar: parts [{ value, className, label }] */
export function StackBar({ parts, className, height = 8, label }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className={cx('flex w-full gap-0.5 overflow-hidden rounded-full bg-line', className)} style={{ height }} role="img" aria-label={label}>
      {total > 0 &&
        parts.filter((p) => p.value > 0).map((p, i) => (
          <span key={i} className={cx('anim-grow-x h-full first:rounded-s-full last:rounded-e-full', p.className)} style={{ width: `${(p.value / total) * 100}%`, '--i': i }} />
        ))}
    </div>
  );
}

/**
 * Column chart. data: [{ key, value, label, sub, highlight, overlay, title }]
 * `marker` = index that gets the red "now" line.
 */
export function Columns({ data, height = 160, marker, onSelect, label, valueLabel, className, renderOverlay }) {
  const { num } = useI18n();
  const max = Math.max(1, ...data.map((d) => d.value));
  const [hover, setHover] = useState(null);
  const id = useId();
  return (
    <figure className={cx('relative', className)} aria-labelledby={`${id}-cap`}>
      <figcaption id={`${id}-cap`} className="sr-only">{label}</figcaption>
      <div className="relative flex items-end gap-[3px] sm:gap-1.5" style={{ height }}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <span key={g} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line/70" style={{ bottom: `${g * 100}%` }} />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * 100;
          const Tag = onSelect ? 'button' : 'div';
          return (
            <Tag
              key={d.key}
              type={onSelect ? 'button' : undefined}
              onClick={onSelect ? () => onSelect(d, i) : undefined}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={d.title}
              className={cx('group relative flex h-full min-w-0 flex-1 flex-col justify-end rounded-t-[4px] outline-none', onSelect && 'cursor-pointer')}
            >
              {i === marker && <span aria-hidden className="glow-line absolute -top-2 bottom-0 start-1/2 z-10 w-px" />}
              <span
                className={cx(
                  'anim-grow-y relative w-full overflow-hidden rounded-t-[4px] transition-colors duration-150',
                  d.highlight ? 'bg-gradient-to-t from-accent-strong to-accent' : 'bg-gradient-to-t from-line-strong to-fg-2/50',
                  hover === i && !d.highlight && 'to-fg-2/80'
                )}
                style={{ height: `${Math.max(d.value ? 3 : 0, h)}%`, '--i': i }}
              >
                {d.overlay > 0 && <span className="hatch absolute inset-x-0 top-0" style={{ height: `${Math.min(100, (d.overlay / Math.max(1, d.value)) * 100)}%` }} />}
              </span>
              {renderOverlay?.(d, i)}
              {hover === i && (
                <span role="tooltip" className="anim-fade pointer-events-none absolute bottom-full start-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2.5 py-1.5 text-start text-xs shadow-2 rtl:translate-x-1/2">
                  <span className="block font-medium text-fg">{d.title}</span>
                  {d.sub && <span className="block text-muted">{d.sub}</span>}
                </span>
              )}
            </Tag>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[3px] sm:gap-1.5" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className={cx('min-w-0 flex-1 truncate text-center text-2xs tnum', i === marker ? 'font-semibold text-accent-fg' : 'text-muted')}>{d.label}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>{data.map((d) => <tr key={d.key}><th scope="row">{d.title}</th><td>{num(d.value)} {valueLabel}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** Tiny sparkline from a list of numbers. */
export function Sparkline({ values, width = 96, height = 28, className }) {
  if (!values.length) return null;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cx('overflow-visible rtl:-scale-x-100', className)} aria-hidden>
      <polyline points={`0,${height} ${pts} ${width},${height}`} fill="rgb(var(--accent) / .10)" stroke="none" />
      <polyline points={pts} fill="none" stroke="rgb(var(--accent))" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" pathLength="1" strokeDasharray="1" style={{ animation: 'draw 900ms var(--ease-out) both' }} />
    </svg>
  );
}

/** Heat strip: cells [{ key, count, title }] in rows of `cols`. */
export function Heatmap({ cells, cols = 7, label, className, onSelect, markerKey }) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  return (
    <div className={cx('grid gap-1', className)} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="img" aria-label={label}>
      {cells.map((c, i) => {
        const a = c.count ? 0.18 + (c.count / max) * 0.82 : 0;
        const Tag = onSelect ? 'button' : 'span';
        return (
          <Tag
            key={c.key}
            type={onSelect ? 'button' : undefined}
            onClick={onSelect ? () => onSelect(c) : undefined}
            title={c.title}
            aria-label={onSelect ? c.title : undefined}
            className={cx('anim-fade aspect-square rounded-[4px] ring-inset transition-transform hover:scale-110', c.key === markerKey && 'ring-1 ring-accent')}
            style={{ background: c.count ? `rgb(var(--accent) / ${a.toFixed(2)})` : 'rgb(var(--line) / .7)', animationDelay: `${i * 6}ms` }}
          />
        );
      })}
    </div>
  );
}

export function Legend({ items, className }) {
  return (
    <ul className={cx('flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted', className)}>
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span aria-hidden className={cx('h-2.5 w-2.5 rounded-sm', it.className)} style={it.color ? { background: it.color } : undefined} />
          {it.label}
          {it.value !== undefined && <span className="tnum font-medium text-fg-2">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}
