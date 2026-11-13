import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { ButtonLink, EmptyState, OverdueTag, PriorityTag, cx } from '../components/ui';
import { DueText, PageHeader, SectionTitle } from '../components/domain/Common';
import { STATUSES, findConflicts, isOverdue, today } from '../utils/scheduling';
import { daysBetween } from '../utils/dates';

/** Status stepper: Opened → In Progress → Completed (radiogroup). Only the assigned developer reaches this page. */
function StatusStepper({ task }) {
  const { setStatus, notify } = useApp();
  const { t, num } = useI18n();
  const cur = STATUSES.indexOf(task.status);
  const choose = async (s) => { if (s !== task.status && (await setStatus(task.id, s))) notify(t('tasks.statusUpdatedTo', { status: t(`status.${s}`) })); };
  const onKey = (e) => {
    const rtl = document.documentElement.dir === 'rtl';
    const n = e.key === (rtl ? 'ArrowLeft' : 'ArrowRight') ? 1 : e.key === (rtl ? 'ArrowRight' : 'ArrowLeft') ? -1 : 0;
    if (!n) return;
    e.preventDefault();
    const next = STATUSES[Math.min(2, Math.max(0, cur + n))];
    choose(next);
    requestAnimationFrame(() => e.currentTarget?.querySelector?.('[aria-checked="true"]')?.focus());
  };
  return (
    <div role="radiogroup" aria-label={t('tasks.status')} onKeyDown={onKey} className="relative grid grid-cols-3 gap-2">
      <span aria-hidden className="absolute inset-x-[16%] top-5 h-0.5 bg-line" />
      <span aria-hidden className="absolute start-[16%] top-5 h-0.5 bg-accent transition-[width] duration-500 ease-out" style={{ width: `${cur * 34}%`, boxShadow: '0 0 8px rgb(var(--glow)/.6)' }} />
      {STATUSES.map((s, i) => {
        const on = i === cur, past = i < cur;
        return (
          <button key={s} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => choose(s)}
            className="group relative z-[1] flex flex-col items-center gap-2 rounded-md py-1 outline-none">
            <span className={cx('grid h-10 w-10 place-items-center rounded-full border-2 font-display text-sm font-semibold transition-all duration-300',
              on ? 'border-accent bg-accent text-on-accent shadow-glow' : past ? 'border-accent bg-surface text-accent-fg' : 'border-line-strong bg-surface text-muted group-hover:border-fg-2')}>
              {past || (on && s === 'Completed') ? <Check size={17} strokeWidth={3} aria-hidden /> : num(i + 1)}
            </span>
            <span className={cx('text-xs font-medium', on ? 'text-fg' : 'text-muted')}>{t(`status.${s}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function TaskDetails() {
  const { id } = useParams();
  const { myTasks, tasks, projectName } = useApp();
  const { t, range, date, dateTime } = useI18n();
  const x = myTasks.find((v) => v.id === id); // myTasks only holds this developer's own tasks
  if (!x)
    return (
      <EmptyState art="lost" title={t('taskDetails.notFound')}>
        <ButtonLink to="/developer/tasks" variant="secondary">{t('taskDetails.back')}</ButtonLink>
      </EmptyState>
    );
  const span = daysBetween(x.startDate, x.deadline) + 1;
  const pos = Math.min(100, Math.max(0, ((daysBetween(x.startDate, today()) + 0.5) / span) * 100));
  const conflicts = findConflicts(x, tasks.filter((v) => v.assigneeId === x.assigneeId));
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/developer/tasks" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={15} className="rtl:-scale-x-100" aria-hidden /> {t('taskDetails.back')}</Link>
      <PageHeader eyebrow={projectName(x.projectId)} title={x.title}
        actions={<div className="flex items-center gap-2"><PriorityTag priority={x.priority} />{isOverdue(x) && <OverdueTag deadline={x.deadline} />}</div>} />
      <div className="space-y-4 lg:space-y-5">
        <section className="notch anim-in p-5 sm:p-7" aria-labelledby="st-title">
          <SectionTitle id="st-title" title={t('tasks.status')} meta={t('taskDetails.statusHint')} />
          <StatusStepper task={x} />
          {x.completedAt && <p className="mt-5 text-center text-xs text-ok">{t('taskDetails.completedOn', { date: dateTime(x.completedAt) })}</p>}
        </section>
        <section className="panel anim-in p-5 sm:p-6" style={{ '--i': 1 }} aria-labelledby="sch-title">
          <SectionTitle id="sch-title" title={t('tasks.schedule')} meta={range(x.startDate, x.deadline)} action={<DueText task={x} className="!text-sm" />} />
          <div className="relative mt-2">
            <div className="h-3 overflow-hidden rounded-full bg-line">
              <div className="anim-grow-x h-full rounded-full bg-gradient-to-r from-line-strong to-fg-2/70 rtl:bg-gradient-to-l" style={{ width: `${pos}%` }} />
            </div>
            {x.startDate <= today() && today() <= x.deadline && <span aria-hidden className="glow-line absolute -top-1.5 h-6 w-px" style={{ insetInlineStart: `${pos}%` }} />}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted tnum"><span>{date(x.startDate)}</span><span>{t('time.days', { count: span })}</span><span>{date(x.deadline)}</span></div>
          {conflicts.length > 0 && <p className="mt-4 rounded-md border border-warn/40 bg-warn/[.08] px-3 py-2 text-sm text-warn">{t('taskDetails.overlaps', { count: conflicts.length })}</p>}
        </section>
        <section className="panel anim-in p-5 sm:p-6" style={{ '--i': 2 }} aria-labelledby="desc-title">
          <SectionTitle id="desc-title" title={t('common.description')} />
          <p className="whitespace-pre-wrap text-sm leading-7 text-fg-2">{x.description || t('common.noDescription')}</p>
        </section>
      </div>
    </div>
  );
}
