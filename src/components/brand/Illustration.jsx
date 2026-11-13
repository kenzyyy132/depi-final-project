import { cx } from '../ui/cx';

// Line illustrations: graphite strokes with a single red signal element. Each one depicts what will fill the empty area.
const S = { stroke: 'rgb(var(--line-strong))', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
const RED = { stroke: 'rgb(var(--accent))', fill: 'none', strokeWidth: 1.75, strokeLinecap: 'round' };

const ART = {
  calendar: (
    <>
      <rect x="20" y="14" width="80" height="62" rx="8" {...S} />
      <path d="M20 30h80M38 8v12M82 8v12" {...S} />
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => <rect key={`${r}${c}`} x={28 + c * 14.5} y={36 + r * 9.5} width="9" height="5" rx="1.5" fill="rgb(var(--line))" />))}
      <path d="M71 32v42" {...RED} style={{ filter: 'drop-shadow(0 0 3px rgb(var(--glow)/.7))' }} />
    </>
  ),
  tasks: (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(0 ${i * 20})`}>
          <rect x="22" y="14" width="76" height="14" rx="4" {...S} />
          <circle cx="31" cy="21" r="3.5" {...(i === 0 ? RED : S)} />
          <path d={`M40 21h${i === 1 ? 30 : 44}`} {...S} />
        </g>
      ))}
    </>
  ),
  projects: (
    <>
      <path d="M18 26a6 6 0 0 1 6-6h20l6 7h46a6 6 0 0 1 6 6v36a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" {...S} />
      <path d="M30 48h40M30 58h26" {...S} />
      <circle cx="88" cy="56" r="9" {...S} />
      <path d="M88 47a9 9 0 0 1 8.5 6" {...RED} />
    </>
  ),
  team: (
    <>
      <circle cx="40" cy="34" r="10" {...S} /><path d="M22 70a18 18 0 0 1 36 0" {...S} />
      <circle cx="80" cy="34" r="10" {...S} /><path d="M62 70a18 18 0 0 1 36 0" {...S} />
      <path d="M52 34h16" {...RED} strokeDasharray="2 4" />
    </>
  ),
  search: (
    <>
      <circle cx="52" cy="40" r="20" {...S} /><path d="M67 55l18 18" {...S} strokeWidth="3" />
      <path d="M42 40h20" {...RED} />
    </>
  ),
  bell: (
    <>
      <path d="M44 62V42a16 16 0 0 1 32 0v20l6 6H38z" {...S} />
      <path d="M54 74a6 6 0 0 0 12 0" {...S} />
      <path d="M86 26l6-6M92 38h8M28 38h-8M34 26l-6-6" {...RED} />
    </>
  ),
  key: (
    <>
      <circle cx="44" cy="44" r="14" {...S} />
      <path d="M58 44h40M86 44v10M96 44v8" {...S} />
      <circle cx="44" cy="44" r="4" {...RED} />
    </>
  ),
  chart: (
    <>
      <path d="M20 76h80" {...S} />
      {[14, 28, 20, 40, 32].map((h, i) => <rect key={i} x={26 + i * 15} y={72 - h} width="9" height={h} rx="2" fill="rgb(var(--line))" />)}
      <path d="M24 52l18-12 15 8 15-20 18 10" {...RED} />
    </>
  ),
  lost: (
    <>
      <circle cx="60" cy="44" r="28" {...S} strokeDasharray="12 4" />
      <path d="M60 28v16l10 8" {...RED} />
      <path d="M20 84h80" {...S} />
    </>
  ),
};

export function Illustration({ kind = 'calendar', className }) {
  return (
    <svg viewBox="0 0 120 90" className={cx('w-auto', className)} aria-hidden>
      {ART[kind] || ART.calendar}
    </svg>
  );
}
