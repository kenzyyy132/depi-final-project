import { cx } from './cx';

const TONES = ['#3A3E48', '#4A4F5B', '#5A606C', '#2F333C', '#454A55', '#6B4046'];
const hash = (s = '') => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const initials = (name = '?') => name.trim().split(/\s+/).slice(0, 2).map((w) => [...w][0]).join('').toUpperCase() || '?';

export function Avatar({ name, id, size = 32, ring, className, title }) {
  return (
    <span
      title={title ?? name}
      aria-hidden={title === '' ? true : undefined}
      className={cx('inline-grid shrink-0 select-none place-items-center rounded-full font-semibold text-white', ring && 'ring-2 ring-accent ring-offset-2 ring-offset-surface', className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38), background: `linear-gradient(140deg, ${TONES[hash(id || name) % TONES.length]}, #17191F)` }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ people, max = 4, size = 26, label }) {
  const shown = people.slice(0, max);
  return (
    <span className="flex items-center" aria-label={label} role={label ? 'img' : undefined}>
      {shown.map((p, i) => (
        <Avatar key={p.id} id={p.id} name={p.name} size={size} className={cx('ring-2 ring-surface', i && '-ms-2')} />
      ))}
      {people.length > max && (
        <span className="-ms-2 inline-grid place-items-center rounded-full bg-raised text-2xs font-semibold text-fg-2 ring-2 ring-surface" style={{ width: size, height: size }}>
          +{people.length - max}
        </span>
      )}
    </span>
  );
}
