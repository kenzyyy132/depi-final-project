import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Crown, PlusCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { Avatar, EmptyState, StatusGlyph, cx } from '../components/ui';
import { StackBar } from '../components/charts/Charts';
import { PageHeader, SectionTitle } from '../components/domain/Common';
import Calendar from '../components/schedule/Calendar';
import { ConflictBanner } from '../components/schedule/ConflictBanner';
import { workload } from '../utils/analytics';
import { localDay } from '../utils/analytics';
import { addDays, today } from '../utils/scheduling';

function WorkCard({ row, active, onClick, i }) {
  const { t, num } = useI18n();
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      role={onClick ? 'radio' : undefined}
      aria-checked={onClick ? active : undefined}
      className={cx('spot panel anim-in relative w-full p-4 text-start transition-colors', active ? '!border-accent/70 shadow-[0_0_32px_-14px_rgb(var(--glow))]' : onClick && 'hover:border-line-strong')}
      style={{ '--i': i }}
    >
      {active && <span aria-hidden className="glow-line absolute inset-x-4 top-0 h-0.5" />}
      <div className="flex items-center gap-3">
        <Avatar id={row.person.id} name={row.person.name} size={38} ring={active} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{row.person.name}</p>
          <p className="truncate text-xs text-muted">{t('team.busyOf', { busy: row.busyDays, total: row.horizon })}</p>
        </div>
        {row.conflicts > 0 && <AlertTriangle size={16} className="shrink-0 text-warn" aria-label={t('conflicts.count', { count: row.conflicts })} />}
      </div>
      <StackBar className="mt-4" height={6} label={t('dash.stackAria', { opened: row.opened, progress: row.progress, done: row.done })}
        parts={[{ value: row.progress, className: 'bg-fg-2' }, { value: row.opened, className: 'bg-line-strong' }, { value: row.done, className: 'bg-ok/70' }]} />
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[['open', row.opened + row.progress], ['done', row.done], ['overdue', row.overdue]].map(([k, n]) => (
          <div key={k}><dt className="text-2xs text-muted">{t(`team.stat.${k}`)}</dt><dd className={cx('font-display text-base font-semibold tnum', k === 'overdue' && n ? 'text-accent-fg' : 'text-fg')}>{num(n)}</dd></div>
        ))}
      </dl>
    </Tag>
  );
}

/** Manager "Team" (route: /manager/schedule — the original Developer Schedule, upgraded). */
export function DeveloperSchedule() {
  const { myProjects, myTasks, users } = useApp();
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const devs = users.filter((u) => myProjects.some((p) => p.memberIds.includes(u.id)));
  const rows = useMemo(() => workload(myTasks, devs), [myTasks, devs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const dev = params.get('dev') && devs.some((u) => u.id === params.get('dev')) ? params.get('dev') : rows[0]?.person.id || '';
  if (!devs.length)
    return (
      <>
        <PageHeader eyebrow={t('team.eyebrow')} title={t('nav.team')} />
        <EmptyState art="team" title={t('team.emptyTitle')} text={t('team.emptyText')} />
      </>
    );
  const person = devs.find((u) => u.id === dev);
  const tasks = myTasks.filter((x) => x.assigneeId === dev);
  return (
    <>
      <PageHeader eyebrow={t('team.eyebrow')} title={t('nav.team')} summary={t('team.summary', { count: devs.length })} />
      <div role="radiogroup" aria-label={t('team.pickDeveloper')} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((r, i) => <WorkCard key={r.person.id} row={r} i={i} active={r.person.id === dev} onClick={() => setParams({ dev: r.person.id }, { replace: true })} />)}
      </div>
      <SectionTitle title={t('team.scheduleOf', { name: person?.name })} meta={t('tasks.countShort', { count: tasks.length })} />
      <div className="space-y-4 lg:space-y-5">
        <ConflictBanner tasks={tasks} />
        <Calendar key={dev} tasks={tasks} allowReschedule
          timelineRows={myProjects.filter((p) => p.memberIds.includes(dev)).map((p) => ({ id: p.id, label: p.name }))}
          timelineRowOf={(x) => x.projectId} />
      </div>
    </>
  );
}

/** Developer "Team" — teammates in shared projects. Shows names, roles, tasks and workload; never emails. */
export function DeveloperTeam() {
  const { user, myProjects, users, tasks, projectName } = useApp();
  const { t, date, dateTime } = useI18n();
  const shared = myProjects;
  const sharedIds = new Set(shared.map((p) => p.id));
  const teamTasks = tasks.filter((x) => sharedIds.has(x.projectId));
  const mates = users.filter((u) => u.id !== user.id && shared.some((p) => p.memberIds.includes(u.id)));
  const managers = users.filter((u) => shared.some((p) => p.managerId === u.id));
  const rows = workload(teamTasks, [user, ...mates]);
  const weekAgo = addDays(today(), -7);
  const activity = [
    ...teamTasks.filter((x) => x.completedAt && localDay(x.completedAt) >= weekAgo).map((x) => ({ id: `c${x.id}`, at: x.completedAt, kind: 'completed', x })),
    ...teamTasks.filter((x) => x.createdAt && localDay(x.createdAt) >= weekAgo).map((x) => ({ id: `n${x.id}`, at: x.createdAt, kind: 'created', x })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
  const name = (id) => users.find((u) => u.id === id)?.name ?? t('common.unknown');

  if (!shared.length)
    return (
      <>
        <PageHeader eyebrow={t('team.eyebrow')} title={t('nav.team')} />
        <EmptyState art="team" title={t('devTeam.emptyTitle')} text={t('devTeam.emptyText')} />
      </>
    );

  return (
    <>
      <PageHeader eyebrow={t('team.eyebrow')} title={t('nav.team')} summary={t('devTeam.summary', { count: mates.length, projects: shared.length })} />
      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <div className="col-span-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-8 xl:grid-cols-3">
          {rows.map((r, i) => (
            <div key={r.person.id} className="relative">
              <WorkCard row={r} i={i} active={r.person.id === user.id} />
              {r.person.id === user.id && <span className="absolute end-3 top-3 rounded bg-accent/15 px-1.5 text-2xs font-semibold text-accent-fg">{t('devTeam.you')}</span>}
            </div>
          ))}
        </div>
        <section className="panel anim-in col-span-12 p-5 lg:col-span-4" aria-labelledby="act-title">
          <SectionTitle id="act-title" title={t('devTeam.activity')} meta={t('devTeam.activityMeta')} />
          {activity.length === 0 ? <p className="text-sm text-muted">{t('devTeam.noActivity')}</p> : (
            <ol className="relative space-y-4 border-s border-line ps-5">
              {activity.map((a) => (
                <li key={a.id} className="relative">
                  <span className={cx('absolute -start-[27px] top-0.5 grid h-5 w-5 place-items-center rounded-full bg-surface', a.kind === 'completed' ? 'text-ok' : 'text-fg-2')}>
                    {a.kind === 'completed' ? <CheckCircle2 size={15} aria-hidden /> : <PlusCircle size={15} aria-hidden />}
                  </span>
                  <p className="text-sm text-fg">{t(`devTeam.${a.kind}`, { name: name(a.x.assigneeId), title: a.x.title })}</p>
                  <p className="text-xs text-muted">{projectName(a.x.projectId)} · {dateTime(a.at)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
        {shared.map((p, pi) => {
          const members = users.filter((u) => p.memberIds.includes(u.id));
          return (
            <section key={p.id} className="panel anim-in col-span-12 p-5 sm:p-6" style={{ '--i': pi + 2 }} aria-labelledby={`team-${p.id}`}>
              <SectionTitle id={`team-${p.id}`} title={p.name} meta={`${date(p.startDate)} – ${date(p.deadline)}`} />
              <ul className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                <li className="flex items-center gap-3 md:col-span-2">
                  <Avatar id={p.managerId} name={name(p.managerId)} size={30} />
                  <span className="text-sm font-medium">{name(p.managerId)}</span>
                  <span className="inline-flex items-center gap-1 rounded bg-raised px-1.5 py-0.5 text-2xs text-fg-2"><Crown size={11} aria-hidden /> {t('roles.manager')}</span>
                </li>
                {members.map((u) => {
                  const mt = teamTasks.filter((x) => x.projectId === p.id && x.assigneeId === u.id).sort((a, b) => a.deadline.localeCompare(b.deadline));
                  return (
                    <li key={u.id} className="rounded-md border border-line p-3">
                      <div className="mb-2 flex items-center gap-2.5">
                        <Avatar id={u.id} name={u.name} size={26} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{u.name}{u.id === user.id && <span className="text-muted"> · {t('devTeam.you')}</span>}</span>
                        <span className="text-xs text-muted tnum">{t('tasks.countShort', { count: mt.length })}</span>
                      </div>
                      {mt.length === 0 ? <p className="text-xs text-faint">{t('devTeam.noTasks')}</p> : (
                        <ul className="space-y-1">
                          {mt.slice(0, 5).map((x) => (
                            <li key={x.id} className="flex items-center gap-2 text-xs">
                              <StatusGlyph status={x.status} size={11} />
                              <span className={cx('min-w-0 flex-1 truncate', x.status === 'Completed' ? 'text-muted line-through' : 'text-fg-2')}>{x.title}</span>
                              <span className="shrink-0 text-muted tnum">{date(x.deadline)}</span>
                            </li>
                          ))}
                          {mt.length > 5 && <li className="text-2xs text-muted">{t('calendar.more', { count: mt.length - 5 })}</li>}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <p className="col-span-12 text-xs text-muted">{t('devTeam.privacy', { count: managers.length })}</p>
      </div>
    </>
  );
}
