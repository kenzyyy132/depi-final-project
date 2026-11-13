import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { Field } from '../components/ui';
import Calendar from '../components/schedule/Calendar';
import { ConflictBanner } from '../components/schedule/ConflictBanner';
import { PageHeader } from '../components/domain/Common';

export function TeamCalendar() {
  const { myProjects, myTasks, users } = useApp();
  const { t } = useI18n();
  const [pid, setPid] = useState('');
  const tasks = myTasks.filter((x) => !pid || x.projectId === pid);
  const scope = myProjects.filter((p) => !pid || p.id === pid);
  const devs = users.filter((u) => scope.some((p) => p.memberIds.includes(u.id)));
  return (
    <>
      <PageHeader eyebrow={t('calendar.teamEyebrow')} title={t('nav.teamCalendar')} summary={t('calendar.teamSummary')}
        actions={
          <Field as="select" label={t('tasks.project')} value={pid} onChange={(e) => setPid(e.target.value)} className="w-full sm:w-56">
            <option value="">{t('calendar.allProjects')}</option>
            {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Field>
        } />
      <div className="space-y-4 lg:space-y-5">
        <ConflictBanner tasks={tasks} />
        <Calendar
          tasks={tasks}
          allowReschedule
          timelineRows={devs.map((u) => ({ id: u.id, label: u.name, person: u, sub: t('tasks.countShort', { count: tasks.filter((x) => x.assigneeId === u.id).length }) }))}
          timelineRowOf={(x) => x.assigneeId}
        />
      </div>
    </>
  );
}

export function MyCalendar() {
  const { myTasks, myProjects } = useApp();
  const { t } = useI18n();
  return (
    <>
      <PageHeader eyebrow={t('calendar.myEyebrow')} title={t('nav.myCalendar')} summary={t('calendar.mySummary')} />
      <Calendar
        tasks={myTasks}
        timelineRows={myProjects.map((p) => ({ id: p.id, label: p.name }))}
        timelineRowOf={(x) => x.projectId}
      />
    </>
  );
}
