import { useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar, cx } from '../ui';
import { addDays, daysBetween, daysFrom, today } from '../../utils/dates';
import { overlaps } from '../../utils/scheduling';

const FILL = {
  Opened: 'bg-raised text-fg-2 ring-1 ring-inset ring-line-strong',
  'In Progress': 'bg-fg/[.12] text-fg ring-1 ring-inset ring-fg/25',
  Completed: 'bg-ok/[.12] text-ok/90 ring-1 ring-inset ring-ok/30 line-through decoration-ok/50',
};
const EDGE = { High: 'before:bg-accent', Medium: 'before:bg-warn', Low: 'before:bg-faint' };

/** Greedy lane packing so overlapping bars in one row stack instead of hiding each other. */
function lanes(tasks) {
  const sorted = [...tasks].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.deadline.localeCompare(b.deadline));
  const ends = [];
  return sorted.map((t) => {
    let lane = ends.findIndex((e) => e < t.startDate);
    if (lane === -1) { lane = ends.length; ends.push(t.deadline); } else ends[lane] = t.deadline;
    return { t, lane };
  });
}

/**
 * rows: [{ id, label, sub, person }]; each row receives tasks where rowOf(task) === row.id.
 * onReschedule(task, deltaDays) enables drag + Shift+Arrow keyboard moves for tasks where canMove(task) is true.
 */
export default function Timeline({ tasks, rows, rowOf, from, days = 21, onOpen, onReschedule, canMove = () => true, dayWidth, label, emptyRow }) {
  const { t, date, weekday, dayNum, isRTL, monthYear } = useI18n();
  const keys = useMemo(() => daysFrom(from, days), [from, days]);
  const end = keys[keys.length - 1];
  const W = dayWidth || (days <= 14 ? 56 : days <= 21 ? 44 : 32);
  const ROW_LANE = 34;
  const now = today();
  const nowIdx = daysBetween(from, now);
  const scroller = useRef(null);
  const [drag, setDrag] = useState(null); // { id, startX, dx }

  useEffect(() => {
    const el = scroller.current;
    if (!el || nowIdx < 0 || nowIdx >= days) return;
    const x = Math.max(0, nowIdx * W - el.clientWidth * 0.3);
    el.scrollLeft = isRTL ? -x : x;
  }, [from, days, W, isRTL]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = tasks.filter((x) => x.startDate <= end && x.deadline >= from);
  const conflictIds = useMemo(() => {
    const s = new Set();
    const open = visible.filter((x) => x.status !== 'Completed');
    open.forEach((a, i) => open.slice(i + 1).forEach((b) => { if (a.assigneeId === b.assigneeId && overlaps(a, b)) { s.add(a.id); s.add(b.id); } }));
    return s;
  }, [visible]);

  const onPointerDown = (e, task) => {
    if (!onReschedule || !canMove(task) || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id: task.id, startX: e.clientX, dx: 0, moved: false });
  };
  const onPointerMove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    setDrag((d) => ({ ...d, dx, moved: d.moved || Math.abs(dx) > 4 }));
  };
  const deltaOf = (dx) => Math.round((isRTL ? -dx : dx) / W);
  const onPointerUp = (task) => {
    if (!drag) return;
    const delta = deltaOf(drag.dx);
    const moved = drag.moved;
    setDrag(null);
    if (moved && delta) onReschedule(task, delta);
    else if (!moved) onOpen?.(task);
  };
  const onKeyDown = (e, task) => {
    if (!onReschedule || !canMove(task) || !e.shiftKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    onReschedule(task, isRTL ? -dir : dir);
  };

  const months = keys.reduce((acc, k, i) => {
    const m = k.slice(0, 7);
    if (!acc.length || acc[acc.length - 1].m !== m) acc.push({ m, i, n: 1 });
    else acc[acc.length - 1].n++;
    return acc;
  }, []);

  return (
    <div className="panel overflow-hidden" role="region" aria-label={label}>
      <div ref={scroller} className="overflow-x-auto overscroll-x-contain">
        <div className="relative" style={{ width: `calc(var(--tl-label) + ${days * W}px)`, '--tl-label': 'clamp(112px, 22vw, 200px)' }}>
          {/* Header */}
          <div className="sticky top-0 z-20 flex border-b border-line bg-surface/95 backdrop-blur">
            <div className="sticky start-0 z-10 shrink-0 border-e border-line bg-surface" style={{ width: 'var(--tl-label)' }} />
            <div className="relative">
              <div className="flex h-6 border-b border-line/60">
                {months.map((m) => (
                  <span key={m.m} className="truncate border-e border-line/60 px-2 text-2xs font-medium leading-6 text-muted" style={{ width: m.n * W }}>
                    {monthYear(+m.m.slice(0, 4), +m.m.slice(5, 7) - 1)}
                  </span>
                ))}
              </div>
              <div className="flex">
                {keys.map((k, i) => {
                  const dow = new Date(k + 'T00:00').getDay();
                  return (
                    <div key={k} className={cx('flex h-11 flex-col items-center justify-center border-e border-line/40', (dow === 5 || dow === 6) && 'bg-canvas/40', i === nowIdx && 'bg-accent/[.08]')} style={{ width: W }}>
                      <span className={cx('text-[10px] leading-none', i === nowIdx ? 'font-semibold text-accent-fg' : 'text-muted')}>{weekday(dow, 'narrow')}</span>
                      <span className={cx('mt-1 font-display text-[13px] font-semibold leading-none tnum', i === nowIdx ? 'text-accent-fg' : 'text-fg-2')}>{dayNum(k)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row) => {
            const mine = visible.filter((x) => rowOf(x) === row.id);
            const packed = lanes(mine);
            const nLanes = Math.max(1, ...packed.map((p) => p.lane + 1));
            const h = nLanes * ROW_LANE + 14;
            return (
              <div key={row.id} className="group/row flex border-b border-line/60 last:border-b-0">
                <div className="sticky start-0 z-10 flex shrink-0 items-center gap-2.5 border-e border-line bg-surface px-3" style={{ width: 'var(--tl-label)', minHeight: h }}>
                  {row.person && <Avatar id={row.person.id} name={row.person.name} size={26} className="hidden sm:inline-grid" />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{row.label}</p>
                    {row.sub && <p className="truncate text-2xs text-muted">{row.sub}</p>}
                  </div>
                </div>
                <div className="relative" style={{ width: days * W, height: h }}>
                  {/* weekend shading + grid */}
                  <div aria-hidden className="absolute inset-0 flex">
                    {keys.map((k) => { const dow = new Date(k + 'T00:00').getDay(); return <span key={k} className={cx('h-full border-e border-line/30', (dow === 5 || dow === 6) && 'bg-canvas/30')} style={{ width: W }} />; })}
                  </div>
                  {mine.length === 0 && emptyRow && <span className="absolute inset-0 flex items-center px-3 text-xs text-faint">{emptyRow}</span>}
                  {packed.map(({ t: task, lane }) => {
                    const s = Math.max(0, daysBetween(from, task.startDate));
                    const e = Math.min(days - 1, daysBetween(from, task.deadline));
                    const clipStart = task.startDate < from, clipEnd = task.deadline > end;
                    const isDrag = drag?.id === task.id;
                    const delta = isDrag ? deltaOf(drag.dx) : 0;
                    const movable = onReschedule && canMove(task);
                    const conflict = conflictIds.has(task.id);
                    const dueLabel = task.startDate === task.deadline ? date(task.deadline) : `${date(task.startDate)} – ${date(task.deadline)}`;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onPointerDown={(ev) => onPointerDown(ev, task)}
                        onPointerMove={onPointerMove}
                        onPointerUp={() => onPointerUp(task)}
                        onPointerCancel={() => setDrag(null)}
                        onClick={(ev) => { if (!movable || ev.detail === 0) onOpen?.(task); }}
                        onKeyDown={(ev) => onKeyDown(ev, task)}
                        aria-label={`${task.title}, ${dueLabel}, ${t(`status.${task.status}`)}, ${t(`priority.${task.priority}`)}${conflict ? `, ${t('conflicts.single')}` : ''}${movable ? `. ${t('timeline.moveHint')}` : ''}`}
                        title={`${task.title} · ${dueLabel}`}
                        className={cx(
                          'absolute flex h-7 items-center gap-1 overflow-hidden rounded-md pe-2 ps-3 text-start text-xs font-medium',
                          'before:absolute before:inset-y-1 before:start-1 before:w-[3px] before:rounded-full',
                          FILL[task.status], EDGE[task.priority],
                          clipStart && 'rounded-s-none', clipEnd && 'rounded-e-none',
                          conflict && '!ring-warn/70',
                          movable ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-pointer',
                          isDrag ? 'z-30 shadow-glow' : 'transition-[box-shadow,transform] duration-150 hover:z-20 hover:shadow-2'
                        )}
                        style={{
                          insetInlineStart: s * W + 2,
                          width: Math.max(W - 4, (e - s + 1) * W - 4),
                          top: 7 + lane * ROW_LANE,
                          transform: isDrag ? `translateX(${drag.dx}px)` : undefined,
                        }}
                      >
                        {conflict && <span aria-hidden className="hatch pointer-events-none absolute inset-0 opacity-50" />}
                        {movable && <GripVertical size={12} aria-hidden className="relative shrink-0 opacity-40" />}
                        <span className="relative truncate">{task.title}</span>
                        {isDrag && delta !== 0 && (
                          <span className="relative ms-auto shrink-0 rounded bg-accent px-1 text-[10px] font-bold text-on-accent tnum">
                            {date(addDays(task.startDate, delta))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Now line */}
          {nowIdx >= 0 && nowIdx < days && (
            <span aria-hidden className="glow-line pointer-events-none absolute bottom-0 top-6 z-[25] w-px" style={{ insetInlineStart: `calc(var(--tl-label) + ${nowIdx * W + W / 2}px)` }}>
              <span className="absolute -top-1 start-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-accent rtl:translate-x-1/2" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
