import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { Avatar, EmptyState, StatusGlyph, cx } from '../components/ui';
import { Columns, Heatmap, Legend, Ring, StackBar } from '../components/charts/Charts';
import { PageHeader, SectionTitle, StatTile } from '../components/domain/Common';
import { conflictPairs, isOverdue, percentDone, PRIORITIES, today } from '../utils/scheduling';
import { completionsByWeek, deadlineHeat, deadlinesByWeek, onTimeRate, priorityCounts, statusCounts, workload } from '../utils/analytics';
import { STATUS_COLOR, STATUS_CLASS } from './Dashboard';
import { weekOf } from '../utils/dates';
import { useWeekStart } from '../hooks/useWeekStart';

const PRIO_CLASS = { High: 'bg-accent', Medium: 'bg-warn', Low: 'bg-faint' };

/** Reports use only recorded data. Where history is missing (completedAt), the page says so instead of estimating. */
export default function Reports() {
  const { user, myTasks, myProjects, users } = useApp();
  const { t, num, pct, date, range } = useI18n();
  const ws = useWeekStart();
  const isM = user.role === 'manager';
  const done = percentDone(myTasks);
  const onTime = onTimeRate(myTasks);
  const pairs = conflictPairs(myTasks);
  const status = statusCounts(myTasks);
  const prio = priorityCounts(myTasks);
  const ahead = deadlinesByWeek(myTasks, 8);
  const hist = completionsByWeek(myTasks, 8);
  const heatStart = weekOf(today(), ws)[0];
  const heat = deadlineHeat(myTasks, heatStart, 56);
  const devs = users.filter((u) => u.role === 'developer' && myProjects.some((p) => p.memberIds.includes(u.id)));
  const wl = useMemo(() => (isM ? workload(myTasks, devs) : []), [myTasks, devs.length, isM]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!myTasks.length)
    return (
      <>
        <PageHeader eyebrow={t('reports.eyebrow')} title={t('nav.reports')} />
        <EmptyState art="chart" title={t('reports.emptyTitle')} text={isM ? t('reports.emptyManager') : t('reports.emptyDeveloper')} />
      </>
    );

  return (
    <>
      <PageHeader eyebrow={t('reports.eyebrow')} title={t('nav.reports')} summary={isM ? t('reports.summaryManager') : t('reports.summaryDeveloper')} />
      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <div className="col-span-12 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          <StatTile i={0} label={t('reports.totalTasks')} value={myTasks.length} hint={t('reports.acrossProjects', { count: myProjects.length })} />
          <StatTile i={1} label={t('reports.completion')} value={done} format={pct} tone="text-fg" hint={t('reports.completedN', { count: status[2].count })}>
            <StackBar height={6} label={t('dash.statusMix')} parts={status.map((c) => ({ value: c.count, className: STATUS_CLASS[c.value] }))} />
          </StatTile>
          <StatTile i={2} label={t('dash.overdue')} value={myTasks.filter(isOverdue).length} tone={myTasks.some(isOverdue) ? 'text-accent-fg' : undefined} hint={t('reports.openTasks', { count: myTasks.length - status[2].count })} />
          <StatTile i={3} label={t('dash.conflicts')} value={pairs.length} tone={pairs.length ? 'text-warn' : undefined}
            hint={onTime === null ? t('reports.onTimeNA') : t('reports.onTimeRate', { pct: pct(onTime) })} />
        </div>

        <section className="panel anim-in col-span-12 p-5 sm:p-6 md:col-span-6 lg:col-span-4" style={{ '--i': 4 }} aria-labelledby="r-status">
          <SectionTitle id="r-status" title={t('reports.statusMix')} />
          <div className="flex flex-col items-center gap-5">
            <Ring size={160} stroke={14} segments={status.map((c) => ({ value: c.count, color: STATUS_COLOR[c.value] }))} label={status.map((c) => `${t(`status.${c.value}`)} ${c.count}`).join(', ')}>
              <div><p className="font-display text-3xl font-semibold tnum">{num(myTasks.length)}</p><p className="text-2xs text-muted">{t('reports.tasks')}</p></div>
            </Ring>
            <ul className="w-full space-y-2 text-sm">
              {status.map((c) => (
                <li key={c.value} className="flex items-center gap-2.5">
                  <StatusGlyph status={c.value} size={12} /><span className="flex-1 text-fg-2">{t(`status.${c.value}`)}</span>
                  <span className="tnum text-muted">{pct(myTasks.length ? Math.round((c.count / myTasks.length) * 100) : 0)}</span>
                  <span className="tnum w-8 text-end font-semibold">{num(c.count)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel anim-in col-span-12 p-5 sm:p-6 md:col-span-6 lg:col-span-3" style={{ '--i': 5 }} aria-labelledby="r-prio">
          <SectionTitle id="r-prio" title={t('reports.priorityMix')} />
          <ul className="space-y-5">
            {prio.map((c, i) => {
              const open = myTasks.filter((x) => x.priority === c.value && x.status !== 'Completed').length;
              return (
                <li key={c.value}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-fg">{t(`priority.${c.value}`)}</span>
                    <span className="tnum text-xs text-muted">{t('reports.openOf', { open, total: c.count })}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-line">
                    <div className={cx('anim-grow-x h-full rounded-full', PRIO_CLASS[c.value])} style={{ width: `${(c.count / Math.max(1, ...prio.map((p) => p.count))) * 100}%`, '--i': i }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 text-xs text-muted">{t('reports.priorityNote', { count: myTasks.filter((x) => x.priority === PRIORITIES[2] && isOverdue(x)).length })}</p>
        </section>

        <section className="notch anim-in col-span-12 p-5 sm:p-6 lg:col-span-5" style={{ '--i': 6 }} aria-labelledby="r-ahead">
          <SectionTitle id="r-ahead" title={t('reports.ahead')} meta={t('reports.aheadMeta')} />
          <Columns height={170} marker={0} label={t('reports.ahead')} valueLabel={t('reports.deadlinesUnit')}
            data={ahead.map((w, i) => ({ key: w.start, value: w.open + w.done, overlay: 0, highlight: i === 0, label: date(w.start, { day: 'numeric', month: 'numeric' }),
              title: range(w.start, w.end), sub: t('reports.weekSplit', { open: w.open, done: w.done }) }))} />
        </section>

        <section className="panel anim-in col-span-12 p-5 sm:p-6 lg:col-span-7" style={{ '--i': 7 }} aria-labelledby="r-hist">
          <SectionTitle id="r-hist" title={t('reports.history')} meta={t('reports.historyMeta')} />
          {hist.tracked === 0 ? (
            <div className="flex items-start gap-3 rounded-md border border-dashed border-line-strong p-4 text-sm text-muted">
              <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
              <p>{t('reports.historyEmpty')}</p>
            </div>
          ) : (
            <Columns height={150} marker={hist.buckets.length - 1} label={t('reports.history')} valueLabel={t('reports.completionsUnit')}
              data={hist.buckets.map((b, i) => ({ key: b.start, value: b.count, highlight: i === hist.buckets.length - 1, label: date(b.start, { day: 'numeric', month: 'numeric' }), title: range(b.start, b.end), sub: t('reports.completedN', { count: b.count }) }))} />
          )}
          {hist.untracked > 0 && <p className="mt-3 flex items-center gap-2 text-xs text-muted"><Info size={13} aria-hidden /> {t('reports.untracked', { count: hist.untracked })}</p>}
        </section>

        <section className="panel anim-in col-span-12 p-5 sm:p-6 lg:col-span-5" style={{ '--i': 8 }} aria-labelledby="r-heat">
          <SectionTitle id="r-heat" title={t('reports.heat')} meta={t('reports.heatMeta', { from: date(heat[0].key), to: date(heat[55].key) })} />
          <Heatmap cells={heat.map((c) => ({ ...c, title: `${date(c.key)} · ${t('reports.deadlinesN', { count: c.count })}` }))} cols={7} markerKey={today()} label={t('reports.heat')} className="max-w-[360px]" />
          <Legend className="mt-4" items={[{ label: t('reports.fewer'), color: 'rgb(var(--accent) / .25)' }, { label: t('reports.more'), color: 'rgb(var(--accent))' }, { label: t('time.today'), className: 'ring-1 ring-accent' }]} />
        </section>

        <section className="panel anim-in col-span-12 p-5 sm:p-6 lg:col-span-7" style={{ '--i': 9 }} aria-labelledby="r-split">
          <SectionTitle id="r-split" title={isM ? t('reports.byDeveloper') : t('reports.byProject')} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pe-3 text-start font-medium">{isM ? t('tasks.developer') : t('tasks.project')}</th>
                  <th scope="col" className="w-[40%] px-3 py-2 text-start font-medium">{t('reports.mix')}</th>
                  <th scope="col" className="px-3 py-2 text-end font-medium">{t('reports.tasks')}</th>
                  <th scope="col" className="px-3 py-2 text-end font-medium">{t('dash.overdue')}</th>
                  <th scope="col" className="ps-3 py-2 text-end font-medium">{t('dash.complete')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(isM ? wl.map((r) => ({ id: r.person.id, label: r.person.name, person: r.person, tasks: myTasks.filter((x) => x.assigneeId === r.person.id) }))
                  : myProjects.map((p) => ({ id: p.id, label: p.name, tasks: myTasks.filter((x) => x.projectId === p.id) }))).map((r) => {
                  const st = statusCounts(r.tasks);
                  return (
                    <tr key={r.id}>
                      <td className="py-3 pe-3"><span className="flex items-center gap-2.5">{r.person && <Avatar id={r.person.id} name={r.person.name} size={24} />}<span className="truncate font-medium">{r.label}</span></span></td>
                      <td className="px-3 py-3"><StackBar height={6} label={t('dash.statusMix')} parts={st.map((c) => ({ value: c.count, className: STATUS_CLASS[c.value] }))} /></td>
                      <td className="px-3 py-3 text-end tnum">{num(r.tasks.length)}</td>
                      <td className={cx('px-3 py-3 text-end tnum', r.tasks.some(isOverdue) && 'font-semibold text-accent-fg')}>{num(r.tasks.filter(isOverdue).length)}</td>
                      <td className="ps-3 py-3 text-end tnum">{pct(percentDone(r.tasks))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
