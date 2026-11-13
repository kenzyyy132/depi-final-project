import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, FolderPlus, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { Avatar, AvatarStack, ButtonLink, EmptyState, ProgressBar, Segmented, StatusGlyph, cx } from '../components/ui';
import { Columns, Legend, Ring, StackBar } from '../components/charts/Charts';
import { DeadlineRail, DueText, PageHeader, SectionTitle, StatTile, TaskLine } from '../components/domain/Common';
import { conflictPairs, isOverdue, percentDone, STATUSES, today } from '../utils/scheduling';
import { dailyLoad, onTimeRate, statusCounts, workload } from '../utils/analytics';
import { covers, daysBetween, weekOf } from '../utils/dates';
import { useWeekStart } from '../hooks/useWeekStart';
import { projectHref } from '../layouts/links';

export const STATUS_COLOR = { Opened: 'rgb(var(--line-strong))', 'In Progress': 'rgb(var(--fg-2))', Completed: 'rgb(var(--ok))' };
export const STATUS_CLASS = { Opened: 'bg-line-strong', 'In Progress': 'bg-fg-2', Completed: 'bg-ok' };

function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? 'dash.morning' : h < 18 ? 'dash.afternoon' : 'dash.evening';
}

function LoadPanel({ tasks, className }) {
  const { t, date, weekday, dayNum } = useI18n();
  const nav = useNavigate();
  const { user } = useApp();
  const days = useMemo(() => dailyLoad(tasks, today(), 14), [tasks]);
  const data = days.map((d, i) => ({
    key: d.key,
    value: d.count,
    overlay: d.conflicts,
    highlight: i === 0,
    label: i === 0 ? t('time.today') : dayNum(d.key),
    title: `${weekday(new Date(d.key + 'T00:00').getDay(), 'long')} ${date(d.key)}`,
    sub: [t('dash.activeTasks', { count: d.count }), d.due && t('dash.dueThatDay', { count: d.due }), d.conflicts && t('dash.doubleBooked', { count: d.conflicts })].filter(Boolean).join(' · '),
  }));
  const peak = days.reduce((m, d) => (d.count > m.count ? d : m), days[0]);
  return (
    <section className={cx('notch anim-in p-5 sm:p-6', className)} style={{ '--i': 1 }} aria-labelledby="load-title">
      <SectionTitle id="load-title" title={t('dash.loadTitle')} meta={peak.count ? t('dash.loadMeta', { date: date(peak.key), count: peak.count }) : t('dash.loadEmpty')} />
      <Columns
        data={data}
        height={180}
        marker={0}
        label={t('dash.loadTitle')}
        valueLabel={t('dash.activeUnit')}
        onSelect={(d) => nav(`/${user.role}/calendar?date=${d.key}`)}
      />
      <Legend className="mt-4" items={[
        { label: t('dash.legendToday'), className: 'bg-accent' },
        { label: t('dash.legendActive'), className: 'bg-fg-2/50' },
        { label: t('dash.legendConflict'), className: 'hatch bg-transparent ring-1 ring-warn/50' },
      ]} />
    </section>
  );
}

function CompletionPanel({ tasks, className }) {
  const { t, num, pct } = useI18n();
  const counts = statusCounts(tasks);
  const done = percentDone(tasks);
  const onTime = onTimeRate(tasks);
  return (
    <section className={cx('panel anim-in flex flex-col p-5 sm:p-6', className)} style={{ '--i': 2 }} aria-labelledby="done-title">
      <SectionTitle id="done-title" title={t('dash.completion')} meta={t('dash.totalTasks', { count: tasks.length })} />
      <div className="flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
        <Ring size={148} stroke={12} segments={counts.map((c) => ({ value: c.count, color: STATUS_COLOR[c.value] }))} label={t('dash.completionAria', { pct: done })}>
          <div>
            <p className="font-display text-3xl font-semibold tnum text-fg">{pct(done)}</p>
            <p className="text-2xs text-muted">{t('dash.complete')}</p>
          </div>
        </Ring>
        <ul className="w-full max-w-[200px] space-y-2.5 text-sm">
          {counts.map((c) => (
            <li key={c.value} className="flex items-center gap-2.5">
              <StatusGlyph status={c.value} size={12} />
              <span className="flex-1 text-fg-2">{t(`status.${c.value}`)}</span>
              <span className="tnum font-semibold text-fg">{num(c.count)}</span>
            </li>
          ))}
          {onTime !== null && (
            <li className="flex items-center gap-2.5 border-t border-line pt-2.5 text-xs">
              <span className="flex-1 text-muted">{t('dash.onTime')}</span>
              <span className="tnum font-semibold text-ok">{pct(onTime)}</span>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function WorkloadPanel({ tasks, people, className }) {
  const { t, num } = useI18n();
  const rows = workload(tasks, people);
  return (
    <section className={cx('panel anim-in p-5 sm:p-6', className)} style={{ '--i': 7 }} aria-labelledby="wl-title">
      <SectionTitle id="wl-title" title={t('dash.workload')} meta={t('dash.workloadMeta')}
        action={<Link to="/manager/schedule" className="inline-flex items-center gap-1 text-xs font-medium text-fg-2 hover:text-accent-fg">{t('nav.team')} <ArrowUpRight size={13} className="rtl:-scale-x-100" /></Link>} />
      {rows.length === 0 ? (
        <EmptyState compact art="team" title={t('team.emptyTitle')} text={t('team.emptyText')} />
      ) : (
        <ul className="space-y-1">
          {rows.slice(0, 6).map((r) => (
            <li key={r.person.id}>
              <Link to={`/manager/schedule?dev=${r.person.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-raised/70">
                <Avatar id={r.person.id} name={r.person.name} size={32} />
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-fg">{r.person.name}</span>
                    {r.conflicts > 0 && <AlertTriangle size={13} className="shrink-0 text-warn" aria-label={t('conflicts.count', { count: r.conflicts })} />}
                  </div>
                  <StackBar height={6} label={t('dash.stackAria', { opened: r.opened, progress: r.progress, done: r.done })}
                    parts={[{ value: r.progress, className: 'bg-fg-2' }, { value: r.opened, className: 'bg-line-strong' }, { value: r.done, className: 'bg-ok/70' }]} />
                </div>
                <div className="text-end">
                  <p className="tnum text-sm font-semibold text-fg">{num(r.busyDays)}<span className="text-xs font-normal text-muted">/{num(r.horizon)}</span></p>
                  <p className={cx('text-2xs', r.overdue ? 'font-semibold text-accent-fg' : 'text-muted')}>{r.overdue ? t('dash.overdueN', { count: r.overdue }) : t('dash.busyDays')}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProjectsPanel({ projects, tasks, className, i = 8 }) {
  const { t, pct, date } = useI18n();
  const { user } = useApp();
  return (
    <section className={cx('panel anim-in p-5 sm:p-6', className)} style={{ '--i': i }} aria-labelledby="pp-title">
      <SectionTitle id="pp-title" title={t('dash.projectProgress')} meta={t('dash.projectsN', { count: projects.length })} />
      <ul className="space-y-4">
        {projects.slice(0, 5).map((p) => {
          const pt = tasks.filter((x) => x.projectId === p.id);
          const v = percentDone(pt);
          const span = Math.max(1, daysBetween(p.startDate, p.deadline));
          const elapsed = Math.min(100, Math.max(0, (daysBetween(p.startDate, today()) / span) * 100));
          return (
            <li key={p.id}>
              <Link to={projectHref(user.role, p.id)} className="group block">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-fg group-hover:text-accent-fg">{p.name}</span>
                  <span className="tnum shrink-0 text-xs text-muted">{pct(v)} · {date(p.deadline)}</span>
                </div>
                <div className="relative">
                  <ProgressBar value={v} label={t('dash.progressAria', { name: p.name, pct: v })} />
                  <span aria-hidden title={t('dash.timeElapsed')} className="absolute -top-1 h-3.5 w-px bg-fg-2/70" style={{ insetInlineStart: `${elapsed}%` }} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex items-center gap-2 text-2xs text-muted"><span className="h-3 w-px bg-fg-2/70" aria-hidden /> {t('dash.timeElapsed')}</p>
    </section>
  );
}

function ManagerDashboard() {
  const { user, myProjects, myTasks, users } = useApp();
  const { t, dateLong } = useI18n();
  const devs = users.filter((u) => u.role === 'developer' && myProjects.some((p) => p.memberIds.includes(u.id)));
  const overdue = myTasks.filter(isOverdue);
  const pairs = conflictPairs(myTasks);
  const week = myTasks.filter((x) => x.status !== 'Completed' && x.deadline >= today() && daysBetween(today(), x.deadline) <= 7).length;
  const counts = statusCounts(myTasks);
  const recent = [...myTasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const overdueDevs = users.filter((u) => overdue.some((x) => x.assigneeId === u.id));

  return (
    <>
      <PageHeader
        eyebrow={dateLong(today())}
        title={t(greetingKey(), { name: user.name.split(' ')[0] })}
        summary={myTasks.length ? t('dash.summaryManager', { overdue: overdue.length, conflicts: pairs.length, week }) : t('dash.summaryEmpty')}
        actions={
          <>
            <ButtonLink to="/manager/projects?new=1" variant="secondary"><FolderPlus size={16} aria-hidden /> {t('projects.new')}</ButtonLink>
            {myProjects.length > 0 && <ButtonLink to="/manager/tasks?new=1"><Plus size={16} aria-hidden /> {t('tasks.new')}</ButtonLink>}
          </>
        }
      />
      {myProjects.length === 0 ? (
        <EmptyState art="projects" title={t('projects.emptyTitle')} text={t('projects.emptyText')}>
          <ButtonLink to="/manager/projects?new=1"><Plus size={16} aria-hidden /> {t('projects.create')}</ButtonLink>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-12 gap-4 lg:gap-5">
          <LoadPanel tasks={myTasks} className="col-span-12 lg:col-span-8" />
          <CompletionPanel tasks={myTasks} className="col-span-12 lg:col-span-4" />
          <div className="col-span-12 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
            <StatTile i={3} label={t('dash.totalProjects')} value={myProjects.length} to="/manager/projects"
              hint={t('dash.devsN', { count: devs.length })} />
            <StatTile i={4} label={t('dash.totalTasks')} value={myTasks.length} to="/manager/tasks">
              <StackBar height={6} label={t('dash.statusMix')} parts={counts.map((c) => ({ value: c.count, className: STATUS_CLASS[c.value] }))} />
            </StatTile>
            <StatTile i={5} label={t('dash.overdue')} value={overdue.length} tone={overdue.length ? 'text-accent-fg' : undefined} to="/manager/tasks?due=overdue">
              {overdueDevs.length > 0 && <div className="flex justify-end"><AvatarStack people={overdueDevs} size={24} max={3} label={overdueDevs.map((u) => u.name).join(', ')} /></div>}
            </StatTile>
            <StatTile i={6} label={t('dash.conflicts')} value={pairs.length} tone={pairs.length ? 'text-warn' : undefined} to="/manager/calendar?view=timeline"
              hint={pairs.length ? t('dash.conflictHint') : t('dash.noConflicts')} />
          </div>
          <WorkloadPanel tasks={myTasks} people={devs} className="col-span-12 lg:col-span-7" />
          <section className="panel anim-in col-span-12 p-5 sm:p-6 lg:col-span-5" style={{ '--i': 7 }} aria-labelledby="rail-title">
            <SectionTitle id="rail-title" title={t('dash.deadlines')} meta={t('dash.deadlinesMeta')} />
            <DeadlineRail tasks={myTasks} showAssignee emptyText={t('dash.nothingDue')} />
          </section>
          <ProjectsPanel projects={myProjects} tasks={myTasks} className="col-span-12 lg:col-span-6" />
          <section className="panel anim-in col-span-12 p-5 sm:p-6 lg:col-span-6" style={{ '--i': 9 }} aria-labelledby="recent-title">
            <SectionTitle id="recent-title" title={t('dash.recent')} meta={t('dash.recentMeta')} />
            {recent.length ? <div className="space-y-0.5">{recent.map((x) => <TaskLine key={x.id} task={x} showAssignee />)}</div>
              : <p className="py-6 text-center text-sm text-muted">{t('dash.noRecent')}</p>}
          </section>
        </div>
      )}
    </>
  );
}

function NextUp({ task }) {
  const { setStatus, notify, projectName } = useApp();
  const { t, date, range } = useI18n();
  const span = Math.max(1, daysBetween(task.startDate, task.deadline) + 1);
  const elapsed = Math.min(100, Math.max(0, ((daysBetween(task.startDate, today()) + 0.5) / span) * 100));
  return (
    <section className="notch anim-in relative overflow-hidden p-5 sm:p-7" style={{ '--i': 1 }} aria-labelledby="next-title">
      <div aria-hidden className="pointer-events-none absolute -end-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgb(var(--glow)/.16),transparent_65%)]" />
      <p className="eyebrow mb-3 !text-accent-fg">{t('dash.nextUp')}</p>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Link to={`/developer/tasks/${task.id}`} id="next-title" className="block font-display text-2xl font-semibold leading-snug text-fg hover:text-accent-fg sm:text-[28px]">{task.title}</Link>
          <p className="mt-1.5 text-sm text-muted">{projectName(task.projectId)} · {range(task.startDate, task.deadline)}</p>
        </div>
        <div className="shrink-0 text-start md:text-end"><DueText task={task} className="!text-base" /></div>
      </div>
      <div className="relative mt-6">
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div className="anim-grow-x h-full rounded-full bg-gradient-to-r from-line-strong to-fg-2/70 rtl:bg-gradient-to-l" style={{ width: `${elapsed}%` }} />
        </div>
        <span aria-hidden className="glow-line absolute -top-1.5 h-5 w-px" style={{ insetInlineStart: `${elapsed}%` }} />
        <div className="mt-2 flex justify-between text-2xs text-muted tnum"><span>{date(task.startDate)}</span><span>{date(task.deadline)}</span></div>
      </div>
      <div className="mt-5">
        <Segmented
          label={t('tasks.status')}
          value={task.status}
          onChange={async (s) => { if (await setStatus(task.id, s)) notify(t('tasks.statusUpdatedTo', { status: t(`status.${s}`) })); }}
          options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
          className="w-full sm:w-auto"
        />
      </div>
    </section>
  );
}

function WeekStrip({ tasks }) {
  const { t, weekday, dayNum } = useI18n();
  const ws = useWeekStart();
  const days = weekOf(today(), ws);
  const open = tasks.filter((x) => x.status !== 'Completed' && x.startDate <= days[6] && x.deadline >= days[0]);
  return (
    <section className="panel anim-in p-5 sm:p-6" style={{ '--i': 3 }} aria-labelledby="week-title">
      <SectionTitle id="week-title" title={t('dash.thisWeek')} meta={t('dash.activeTasks', { count: open.length })}
        action={<Link to="/developer/calendar" className="inline-flex items-center gap-1 text-xs font-medium text-fg-2 hover:text-accent-fg">{t('nav.calendar')} <ArrowUpRight size={13} className="rtl:-scale-x-100" /></Link>} />
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((k) => {
          const on = k === today();
          const n = open.filter((x) => covers(x, k)).length;
          return (
            <div key={k} className={cx('rounded-md border px-1 py-2 text-center', on ? 'border-accent/60 bg-accent/[.07]' : 'border-line')}>
              <p className={cx('text-2xs', on ? 'font-semibold text-accent-fg' : 'text-muted')}>{weekday(new Date(k + 'T00:00').getDay(), 'short')}</p>
              <p className="font-display text-lg font-semibold tnum text-fg">{dayNum(k)}</p>
              <div className="mx-auto mt-1 flex h-1.5 max-w-[28px] justify-center gap-0.5" aria-label={t('dash.activeTasks', { count: n })}>
                {Array.from({ length: Math.min(n, 4) }, (_, i) => <span key={i} className={cx('h-1.5 flex-1 rounded-full', on ? 'bg-accent' : 'bg-fg-2/60')} />)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 space-y-1.5">
        {open.slice(0, 5).map((x) => {
          const s = x.startDate < days[0] ? 0 : days.indexOf(x.startDate);
          const e = x.deadline > days[6] ? 6 : days.indexOf(x.deadline);
          return (
            <Link key={x.id} to={`/developer/tasks/${x.id}`} className="grid grid-cols-7 gap-1.5" title={x.title}>
              <span className={cx('anim-grow-x truncate rounded px-2 py-1 text-2xs font-medium', x.priority === 'High' ? 'bg-accent/20 text-accent-fg ring-1 ring-inset ring-accent/40' : 'bg-raised text-fg-2 ring-1 ring-inset ring-line-strong')}
                style={{ gridColumn: `${s + 1} / ${e + 2}` }}>{x.title}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DeveloperDashboard() {
  const { user, myProjects, myTasks } = useApp();
  const { t, dateLong } = useI18n();
  const overdue = myTasks.filter(isOverdue);
  const open = myTasks.filter((x) => x.status !== 'Completed');
  const next = [...open].sort((a, b) => (isOverdue(b) - isOverdue(a)) || a.deadline.localeCompare(b.deadline) || (b.status === 'In Progress') - (a.status === 'In Progress'))[0];
  const counts = statusCounts(myTasks);
  const pairs = conflictPairs(myTasks);
  return (
    <>
      <PageHeader
        eyebrow={dateLong(today())}
        title={t(greetingKey(), { name: user.name.split(' ')[0] })}
        summary={myTasks.length ? t('dash.summaryDev', { open: open.length, overdue: overdue.length }) : t('dash.summaryDevEmpty')}
        actions={!myProjects.length && <ButtonLink to="/developer/join">{t('nav.join')}</ButtonLink>}
      />
      {!myProjects.length ? (
        <EmptyState art="key" title={t('devProjects.emptyTitle')} text={t('devProjects.emptyText')}>
          <ButtonLink to="/developer/join">{t('devProjects.joinCta')}</ButtonLink>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-12 gap-4 lg:gap-5">
          <div className="col-span-12 space-y-4 lg:col-span-8 lg:space-y-5">
            {next ? <NextUp task={next} /> : (
              <section className="notch anim-in p-6"><EmptyState compact art="tasks" title={t('dash.allClear')} text={t('dash.allClearText')} className="border-0 bg-transparent" /></section>
            )}
            <WeekStrip tasks={myTasks} />
          </div>
          <div className="col-span-12 grid grid-cols-2 gap-4 lg:col-span-4 lg:grid-cols-1 lg:gap-5">
            <StatTile i={2} label={t('dash.joinedProjects')} value={myProjects.length} to="/developer/projects" />
            <StatTile i={3} label={t('dash.assignedTasks')} value={myTasks.length} to="/developer/tasks">
              <StackBar height={6} label={t('dash.statusMix')} parts={counts.map((c) => ({ value: c.count, className: STATUS_CLASS[c.value] }))} />
            </StatTile>
            <StatTile i={4} label={t('dash.overdue')} value={overdue.length} tone={overdue.length ? 'text-accent-fg' : undefined} to="/developer/tasks?due=overdue"
              hint={pairs.length ? t('dash.yourConflicts', { count: pairs.length }) : undefined} />
            <CompletionPanel tasks={myTasks} className="col-span-2 lg:col-span-1" />
          </div>
          <section className="panel anim-in col-span-12 p-5 sm:p-6 lg:col-span-7" style={{ '--i': 6 }} aria-labelledby="rail-title">
            <SectionTitle id="rail-title" title={t('dash.deadlines')} meta={t('dash.deadlinesMeta')} />
            <DeadlineRail tasks={myTasks} emptyText={t('dash.nothingDue')} />
          </section>
          <ProjectsPanel projects={myProjects} tasks={myTasks} className="col-span-12 lg:col-span-5" i={7} />
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  const { user } = useApp();
  return user.role === 'manager' ? <ManagerDashboard /> : <DeveloperDashboard />;
}
