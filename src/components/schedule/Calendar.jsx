import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, GanttChartSquare, ListTree, Pencil } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, ButtonLink, Dialog, IconButton, OverdueTag, PriorityTag, Segmented, StatusPill, cx } from '../ui';
import { Legend } from '../charts/Charts';
import { SectionTitle, TaskLine } from '../domain/Common';
import Timeline from './Timeline';
import TaskForm from '../TaskForm';
import { useGuardedSave } from '../domain/useGuardedSave';
import { addDays, covers, daysBetween, monthWeeks, parseISODate, today, weekOf, weekOrder } from '../../utils/dates';
import { isOverdue, isUpcoming } from '../../utils/scheduling';
import { useWeekStart } from '../../hooks/useWeekStart';
import { useIsMobile } from '../../hooks/useMediaQuery';

const CHIP = {
  High: 'bg-accent/[.16] text-fg ring-accent/40 before:bg-accent',
  Medium: 'bg-warn/[.14] text-fg ring-warn/35 before:bg-warn',
  Low: 'bg-raised text-fg-2 ring-line-strong before:bg-faint',
};

function Chip({ task, onOpen, compact }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(task); }}
      title={task.title}
      aria-label={`${task.title}, ${t(`priority.${task.priority}`)}, ${t(`status.${task.status}`)}`}
      className={cx(
        'relative block w-full truncate rounded-[5px] py-[3px] pe-1.5 ps-2.5 text-start text-[11px] font-medium leading-4 ring-1 ring-inset transition-transform hover:-translate-y-px',
        'before:absolute before:inset-y-[3px] before:start-[3px] before:w-[2px] before:rounded-full',
        CHIP[task.priority],
        task.status === 'Completed' && 'line-through opacity-55',
        task.status === 'In Progress' && 'shadow-[inset_0_-2px_0_rgb(var(--fg)/.55)]',
        compact && 'py-px'
      )}
    >
      {task.title}
    </button>
  );
}

/** Task details (the original calendar modal) — Edit for managers, Open for developers. */
export function TaskPeek({ task, onClose, onEdit }) {
  const { user, userName, projectName } = useApp();
  const { t, range } = useI18n();
  if (!task) return null;
  return (
    <Dialog onClose={onClose} title={task.title} eyebrow={projectName(task.projectId)} size="sm"
      footer={user.role === 'manager'
        ? <Button onClick={() => onEdit(task)}><Pencil size={14} aria-hidden /> {t('common.edit')}</Button>
        : <ButtonLink to={`/developer/tasks/${task.id}`}>{t('calendar.openTask')}</ButtonLink>}>
      <div className="space-y-4 text-sm">
        <p className="text-fg-2">{task.description || t('common.noDescription')}</p>
        <dl className="grid grid-cols-2 gap-3">
          <div><dt className="text-xs text-muted">{t('tasks.project')}</dt><dd className="font-medium">{projectName(task.projectId)}</dd></div>
          <div><dt className="text-xs text-muted">{t('tasks.assignedTo')}</dt><dd className="font-medium">{userName(task.assigneeId)}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-muted">{t('tasks.schedule')}</dt><dd className="font-medium">{range(task.startDate, task.deadline)}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2"><PriorityTag priority={task.priority} /><StatusPill status={task.status} />{isOverdue(task) && <OverdueTag deadline={task.deadline} />}</div>
      </div>
    </Dialog>
  );
}

function MonthGrid({ cur, tasks, selected, onSelect, onOpen, dir }) {
  const { t, weekday, date } = useI18n();
  const ws = useWeekStart();
  const mobile = useIsMobile();
  const weeks = useMemo(() => monthWeeks(cur.y, cur.m, ws), [cur, ws]);
  const grid = useRef(null);
  const now = today();
  const focusKey = (k) => requestAnimationFrame(() => grid.current?.querySelector(`[data-key="${k}"]`)?.focus());
  const onKey = (e, k) => {
    const rtl = document.documentElement.dir === 'rtl';
    const map = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 7, ArrowUp: -7 };
    if (map[e.key]) { e.preventDefault(); const n = addDays(k, map[e.key]); onSelect(n); focusKey(n); }
    if (e.key === 'Home') { e.preventDefault(); const n = addDays(k, -((parseISODate(k).getDay() - ws + 7) % 7)); onSelect(n); focusKey(n); }
    if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); const d = parseISODate(k); d.setMonth(d.getMonth() + (e.key === 'PageDown' ? 1 : -1)); const n = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; onSelect(n); focusKey(n); }
  };
  return (
    <div ref={grid} role="grid" aria-label={t('calendar.monthGrid')} key={`${cur.y}-${cur.m}`} className="anim-slide" style={{ '--dx': `${dir * 14}px` }}>
      <div role="row" className="grid grid-cols-7 border-b border-line">
        {weekOrder(ws).map((d) => (
          <div role="columnheader" key={d} className="py-2 text-center text-2xs font-medium uppercase tracking-wider text-muted rtl:normal-case rtl:tracking-normal">
            <span aria-hidden>{weekday(d, mobile ? 'narrow' : 'short')}</span><span className="sr-only">{weekday(d, 'long')}</span>
          </div>
        ))}
      </div>
      {weeks.map((w, wi) => (
        <div role="row" key={wi} className="grid grid-cols-7">
          {w.map((d) => {
            const items = tasks.filter((x) => covers(x, d.key));
            const isToday = d.key === now, isSel = d.key === selected;
            const late = items.filter(isOverdue).length;
            return (
              <div
                key={d.key}
                role="gridcell"
                data-key={d.key}
                tabIndex={isSel ? 0 : -1}
                aria-selected={isSel}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${date(d.key, { weekday: 'long', day: 'numeric', month: 'long' })}, ${t('calendar.tasksN', { count: items.length })}${late ? `, ${t('dash.overdueN', { count: late })}` : ''}`}
                onClick={() => onSelect(d.key)}
                onKeyDown={(e) => onKey(e, d.key)}
                className={cx(
                  'relative cursor-pointer border-b border-e border-line/70 p-1 outline-none transition-colors [&:nth-child(7n)]:border-e-0',
                  mobile ? 'min-h-[54px]' : 'min-h-[112px]',
                  !d.inMonth && 'bg-canvas/40',
                  isSel ? 'bg-accent/[.06]' : 'hover:bg-raised/40',
                  'focus-visible:shadow-[inset_0_0_0_2px_rgb(var(--accent))]'
                )}
              >
                {isToday && <span aria-hidden className="glow-line absolute inset-x-0 top-0 h-0.5" />}
                <div className="mb-1 flex items-center justify-between px-0.5">
                  <span className={cx('grid h-6 min-w-6 place-items-center rounded-full px-1 font-display text-xs font-semibold tnum',
                    isToday ? 'bg-accent text-on-accent' : d.inMonth ? 'text-fg-2' : 'text-faint')}>{date(d.key, { day: 'numeric' })}</span>
                  {late > 0 && !mobile && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgb(var(--glow))]" />}
                </div>
                {mobile ? (
                  <div aria-hidden className="flex flex-wrap justify-center gap-0.5 px-0.5">
                    {items.slice(0, 4).map((x) => <span key={x.id} className={cx('h-1.5 w-1.5 rounded-full', x.priority === 'High' ? 'bg-accent' : x.priority === 'Medium' ? 'bg-warn' : 'bg-faint', x.status === 'Completed' && 'opacity-40')} />)}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map((x) => <Chip key={x.id} task={x} onOpen={onOpen} />)}
                    {items.length > 3 && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(d.key); }} className="w-full rounded px-1 text-start text-2xs font-medium text-muted hover:text-fg">
                        {t('calendar.more', { count: items.length - 3 })}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function WeekView({ anchor, tasks, onOpen, onSelect }) {
  const { t, weekday, date } = useI18n();
  const ws = useWeekStart();
  const days = weekOf(anchor, ws);
  const now = today();
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(id); }, []);
  const d = new Date();
  const frac = (d.getHours() * 60 + d.getMinutes()) / 1440;
  return (
    <div className="anim-slide grid grid-cols-1 sm:grid-cols-7" key={days[0]}>
      {days.map((k) => {
        const items = tasks.filter((x) => covers(x, k));
        const on = k === now;
        return (
          <section key={k} aria-label={date(k, { weekday: 'long', day: 'numeric', month: 'long' })}
            className={cx('relative min-h-[96px] border-b border-line/70 p-2 sm:min-h-[360px] sm:border-b-0 sm:border-e sm:last:border-e-0', on && 'bg-accent/[.05]')}>
            {on && (
              <span aria-hidden className="glow-line absolute inset-y-0 hidden w-px sm:block" style={{ insetInlineStart: `${frac * 100}%` }} title={t('calendar.now')}>
                <span className="absolute -top-0.5 start-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-accent rtl:translate-x-1/2" />
              </span>
            )}
            <button type="button" onClick={() => onSelect(k)} className="mb-2 flex w-full items-baseline gap-2 text-start sm:flex-col sm:items-start sm:gap-0">
              <span className={cx('text-2xs uppercase tracking-wider rtl:normal-case rtl:tracking-normal', on ? 'font-semibold text-accent-fg' : 'text-muted')}>{weekday(parseISODate(k).getDay(), 'short')}</span>
              <span className={cx('font-display text-xl font-semibold tnum', on ? 'text-accent-fg' : 'text-fg')}>{date(k, { day: 'numeric' })}</span>
            </button>
            <div className="relative space-y-1">
              {items.map((x) => <Chip key={x.id} task={x} onOpen={onOpen} />)}
              {!items.length && <p className="hidden text-2xs text-faint sm:block">—</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Agenda({ tasks, from, onOpen }) {
  const { t, date } = useI18n();
  const until = addDays(from, 59);
  const list = tasks.filter((x) => x.deadline >= from && x.startDate <= until).sort((a, b) => a.deadline.localeCompare(b.deadline));
  const groups = list.reduce((m, x) => { (m[x.deadline] ||= []).push(x); return m; }, {});
  const keys = Object.keys(groups);
  if (!keys.length) return <p className="px-5 py-12 text-center text-sm text-muted">{t('calendar.agendaEmpty')}</p>;
  return (
    <ol className="divide-y divide-line">
      {keys.map((k) => (
        <li key={k} className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:px-5">
          <div className="flex items-baseline gap-2 sm:block">
            <p className={cx('font-display text-lg font-semibold tnum', k === today() ? 'text-accent-fg' : 'text-fg')}>{date(k, { day: 'numeric', month: 'short' })}</p>
            <p className="text-xs text-muted">{k === today() ? t('time.today') : date(k, { weekday: 'long' })}</p>
          </div>
          <ul className="space-y-1">
            {groups[k].map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => onOpen(x)} className="w-full text-start"><TaskLine task={x} showAssignee className="pointer-events-none" /></button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/**
 * Full calendar: Month / Week / Timeline / Agenda. `timelineRows` decides how the timeline groups tasks.
 * Managers can drag bars on the timeline (same conflict rule); developers see read-only bars.
 */
export default function Calendar({ tasks, timelineRows, timelineRowOf, allowReschedule }) {
  const { t, monthYear, date, range } = useI18n();
  const ws = useWeekStart();
  const [params, setParams] = useSearchParams();
  const initial = params.get('date') || today();
  const [selected, setSelected] = useState(initial);
  const [cur, setCur] = useState(() => { const d = parseISODate(initial); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [dir, setDir] = useState(0);
  const view = params.get('view') || 'month';
  const setView = (v) => { const n = new URLSearchParams(params); n.set('view', v); n.delete('date'); setParams(n, { replace: true }); };
  const [peek, setPeek] = useState(null);
  const [edit, setEdit] = useState(null);
  const { save, dialog } = useGuardedSave();
  const [tlFrom, setTlFrom] = useState(() => addDays(initial, -3));

  const select = (k) => {
    setSelected(k);
    const d = parseISODate(k);
    if (d.getFullYear() !== cur.y || d.getMonth() !== cur.m) { setDir(k > `${cur.y}-${String(cur.m + 1).padStart(2, '0')}` ? 1 : -1); setCur({ y: d.getFullYear(), m: d.getMonth() }); }
  };
  const step = (n) => {
    if (view === 'month') { const d = new Date(cur.y, cur.m + n, 1); setDir(n); setCur({ y: d.getFullYear(), m: d.getMonth() }); }
    else if (view === 'week') select(addDays(selected, 7 * n));
    else if (view === 'timeline') setTlFrom(addDays(tlFrom, 14 * n));
  };
  const goToday = () => { const k = today(); setDir(0); select(k); setTlFrom(addDays(k, -3)); };
  useEffect(() => { const k = params.get('date'); if (k) select(k); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const heading = view === 'month' ? monthYear(cur.y, cur.m)
    : view === 'week' ? range(weekOf(selected, ws)[0], weekOf(selected, ws)[6])
    : view === 'timeline' ? range(tlFrom, addDays(tlFrom, 27))
    : t('calendar.next60');
  const dayItems = tasks.filter((x) => covers(x, selected));
  const upcoming = tasks.filter((x) => isUpcoming(x, 60)).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 6);

  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {view !== 'agenda' && (
            <>
              <IconButton label={t('calendar.previous')} onClick={() => step(-1)} className="border border-line"><ChevronLeft size={18} className="rtl:-scale-x-100" /></IconButton>
              <IconButton label={t('calendar.next')} onClick={() => step(1)} className="border border-line"><ChevronRight size={18} className="rtl:-scale-x-100" /></IconButton>
              <Button variant="secondary" size="sm" onClick={goToday} className="h-10">{t('time.today')}</Button>
            </>
          )}
          <h2 className="ms-2 font-display text-lg font-semibold sm:text-xl" aria-live="polite">{heading}</h2>
        </div>
        <Segmented label={t('calendar.view')} value={view} onChange={setView} className="w-full sm:w-auto"
          options={[
            { value: 'month', label: t('calendar.month'), icon: CalendarDays },
            { value: 'week', label: t('calendar.week'), icon: CalendarRange },
            { value: 'timeline', label: t('calendar.timeline'), icon: GanttChartSquare },
            { value: 'agenda', label: t('calendar.agenda'), icon: ListTree },
          ]} />
      </div>

      {view === 'timeline' ? (
        <Timeline
          label={t('calendar.timeline')}
          tasks={tasks}
          rows={timelineRows}
          rowOf={timelineRowOf}
          from={tlFrom}
          days={28}
          onOpen={setPeek}
          emptyRow={t('calendar.rowEmpty')}
          onReschedule={allowReschedule ? (x, d) => save({ ...x, startDate: addDays(x.startDate, d), deadline: addDays(x.deadline, d) }, t('timeline.moved', { title: x.title })) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
          <div className="panel overflow-hidden">
            {view === 'month' && <MonthGrid cur={cur} tasks={tasks} selected={selected} onSelect={select} onOpen={setPeek} dir={dir} />}
            {view === 'week' && <WeekView anchor={selected} tasks={tasks} onOpen={setPeek} onSelect={(k) => { select(k); }} />}
            {view === 'agenda' && <Agenda tasks={tasks} from={today()} onOpen={setPeek} />}
          </div>
          <aside className="space-y-4">
            {view !== 'agenda' && (
              <section className="notch p-5" aria-labelledby="day-title">
                <SectionTitle id="day-title" title={date(selected, { weekday: 'long', day: 'numeric', month: 'long' })}
                  meta={t('calendar.tasksN', { count: dayItems.length })} />
                {dayItems.length ? <div className="-mx-3 space-y-0.5">{dayItems.map((x) => <button key={x.id} type="button" className="block w-full text-start" onClick={() => setPeek(x)}><TaskLine task={x} showAssignee className="pointer-events-none" /></button>)}</div>
                  : <p className="text-sm text-muted">{t('calendar.dayEmpty')}</p>}
                {daysBetween(today(), selected) !== 0 && <p className="mt-3 text-2xs text-muted">{t('calendar.relDay', { count: daysBetween(today(), selected) })}</p>}
              </section>
            )}
            <section className="panel p-5" aria-labelledby="up-title">
              <SectionTitle id="up-title" title={t('calendar.upcoming')} meta={t('calendar.upcomingMeta')} />
              {upcoming.length === 0 ? <p className="text-sm text-muted">{t('calendar.noUpcoming')}</p> : (
                <ul className="divide-y divide-line">
                  {upcoming.map((x) => (
                    <li key={x.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <button type="button" className="min-w-0 truncate text-start text-fg hover:text-accent-fg" onClick={() => setPeek(x)}>{x.title}</button>
                      <span className="shrink-0 text-xs text-muted tnum">{t('calendar.dueShort', { date: date(x.deadline) })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}

      <Legend items={[
        { label: t('priority.High'), className: 'bg-accent' },
        { label: t('priority.Medium'), className: 'bg-warn' },
        { label: t('priority.Low'), className: 'bg-faint' },
        { label: t('calendar.legendProgress'), className: 'bg-transparent shadow-[inset_0_-2px_0_rgb(var(--fg)/.7)] ring-1 ring-line-strong' },
        { label: t('calendar.legendDone'), className: 'bg-ok/50' },
        { label: t('calendar.legendConflict'), className: 'hatch ring-1 ring-warn/50' },
        { label: t('calendar.legendNow'), className: 'glow-line !w-0.5' },
      ]} />

      <TaskPeek task={peek} onClose={() => setPeek(null)} onEdit={(x) => { setPeek(null); setEdit(x); }} />
      {edit && <TaskForm task={edit} onClose={() => setEdit(null)} />}
      {dialog}
    </div>
  );
}
