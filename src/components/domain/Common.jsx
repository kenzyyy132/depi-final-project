import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nProvider';
import { cx, PriorityTag, StatusGlyph } from '../ui';
import { AnimatedNumber } from '../charts/Charts';
import { dueInfo } from '../../utils/dates';
import { isOverdue } from '../../utils/scheduling';
import { taskHref } from '../../layouts/links';

export function PageHeader({ eyebrow, title, summary, actions, className }) {
  return (
    <header className={cx('mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-[clamp(26px,3.2vw,36px)] font-semibold leading-tight text-fg">{title}</h1>
        {summary && <p className="mt-2 max-w-2xl text-sm text-muted">{summary}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ title, meta, action, className, id }) {
  return (
    <div className={cx('mb-4 flex items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 id={id} className="truncate font-display text-[15px] font-semibold text-fg">{title}</h2>
        {meta && <p className="truncate text-xs text-muted">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

/** KPI tile with a small inline visual (children). */
export function StatTile({ label, value, tone, to, children, i = 0, hint, format }) {
  const Tag = to ? Link : 'div';
  return (
    <Tag
      to={to}
      className={cx('spot panel anim-in group flex min-h-[132px] flex-col justify-between p-4 transition-colors sm:p-5', to && 'hover:border-line-strong')}
      style={{ '--i': i }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {to && <ArrowUpRight size={15} aria-hidden className="text-faint transition-colors group-hover:text-accent-fg rtl:-scale-x-100" />}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <AnimatedNumber value={value} format={format} className={cx('font-display text-[34px] font-semibold leading-none', tone || 'text-fg')} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {hint && <p className="mt-2 truncate text-xs text-muted">{hint}</p>}
    </Tag>
  );
}

export function DueText({ task, className }) {
  const { t } = useI18n();
  const d = dueInfo(task);
  return (
    <span className={cx('tnum whitespace-nowrap text-xs', d.key === 'time.late' ? 'font-semibold text-accent-fg' : d.key === 'time.dueToday' ? 'font-medium text-warn' : 'text-muted', className)}>
      {t(d.key, { count: d.n })}
    </span>
  );
}

/** Compact task row used in dashboards, rails and lists. */
export function TaskLine({ task, showAssignee, showProject = true, className }) {
  const { user, userName, projectName } = useApp();
  return (
    <Link
      to={taskHref(user.role, task.id)}
      className={cx('group relative flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-raised/70', className)}
    >
      {isOverdue(task) && <span aria-hidden className="glow-line absolute inset-y-2.5 start-0 w-0.5 rounded-full" />}
      <StatusGlyph status={task.status} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg group-hover:text-fg">{task.title}</span>
        <span className="block truncate text-xs text-muted">
          {[showProject && projectName(task.projectId), showAssignee && userName(task.assigneeId)].filter(Boolean).join(' · ')}
        </span>
      </span>
      <PriorityTag priority={task.priority} compact />
      <DueText task={task} className="w-[88px] text-end" />
    </Link>
  );
}

/** Deadlines grouped by urgency: Overdue → Today → This week → Later. */
export function DeadlineRail({ tasks, showAssignee, limit = 8, emptyText }) {
  const { t } = useI18n();
  const open = tasks.filter((x) => x.status !== 'Completed').sort((a, b) => a.deadline.localeCompare(b.deadline));
  const groups = [
    ['overdue', open.filter((x) => dueInfo(x).key === 'time.late')],
    ['today', open.filter((x) => dueInfo(x).key === 'time.dueToday')],
    ['week', open.filter((x) => ['time.dueTomorrow', 'time.dueIn'].includes(dueInfo(x).key) && dueInfo(x).n <= 7)],
    ['later', open.filter((x) => dueInfo(x).key === 'time.dueIn' && dueInfo(x).n > 7)],
  ].filter(([, l]) => l.length);
  if (!groups.length) return <p className="px-3 py-6 text-center text-sm text-muted">{emptyText}</p>;
  let left = limit;
  return (
    <div className="space-y-4">
      {groups.map(([k, list]) => {
        if (left <= 0) return null;
        const shown = list.slice(0, left);
        left -= shown.length;
        return (
          <section key={k} aria-label={t(`rail.${k}`)}>
            <p className={cx('eyebrow mb-1 flex items-center gap-2 px-3', k === 'overdue' && '!text-accent-fg')}>
              {t(`rail.${k}`)} <span className="tnum rounded bg-raised px-1.5 text-fg-2">{list.length}</span>
            </p>
            <div className="space-y-0.5">{shown.map((x) => <TaskLine key={x.id} task={x} showAssignee={showAssignee} />)}</div>
          </section>
        );
      })}
    </div>
  );
}
