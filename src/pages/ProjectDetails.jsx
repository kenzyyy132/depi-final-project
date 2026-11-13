import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { Avatar, Button, ButtonLink, ConfirmDialog, EmptyState, IconButton, OverdueTag, PriorityTag, StatusPill } from '../components/ui';
import { Ring, StackBar } from '../components/charts/Charts';
import { PageHeader, SectionTitle } from '../components/domain/Common';
import { JoinCode } from '../components/domain/JoinCode';
import { InvitePanel } from '../components/domain/InvitePanel';
import ProjectForm from '../components/domain/ProjectForm';
import { useGuardedSave } from '../components/domain/useGuardedSave';
import TaskForm from '../components/TaskForm';
import Timeline from '../components/schedule/Timeline';
import { isOverdue, percentDone, addDays, today } from '../utils/scheduling';
import { daysBetween } from '../utils/dates';
import { SpanBar } from './Projects';

export default function ProjectDetails() {
  const { id } = useParams();
  const { myProjects, myTasks, users, userName, deleteTask, notify } = useApp();
  const { t, pct, num, range } = useI18n();
  const [taskForm, setTaskForm] = useState(null); // null | {} new | task edit
  const [editProject, setEditProject] = useState(false);
  const [del, setDel] = useState(null);
  const { save, dialog } = useGuardedSave();
  const p = myProjects.find((x) => x.id === id);
  if (!p) return <Navigate to="/manager/projects" replace />;
  const tasks = myTasks.filter((x) => x.projectId === p.id).sort((a, b) => a.deadline.localeCompare(b.deadline));
  const members = users.filter((u) => p.memberIds.includes(u.id));
  const v = percentDone(tasks);
  const tlFrom = addDays(p.startDate > today() ? p.startDate : today(), -3);
  const tlDays = Math.min(42, Math.max(14, daysBetween(tlFrom, p.deadline) + 4));

  return (
    <>
      <PageHeader
        eyebrow={t('projects.detailsEyebrow')}
        title={p.name}
        summary={p.description || t('common.noDescription')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditProject(true)}><Pencil size={15} aria-hidden /> {t('projects.edit')}</Button>
            <Button onClick={() => setTaskForm({})}><Plus size={16} aria-hidden /> {t('tasks.add')}</Button>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <section className="panel anim-in col-span-12 flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6 lg:col-span-7" aria-label={t('projects.timeline')}>
          <Ring value={v} size={120} stroke={10} label={t('dash.progressAria', { name: p.name, pct: v })}>
            <div><p className="font-display text-2xl font-semibold tnum">{pct(v)}</p><p className="text-2xs text-muted">{t('dash.complete')}</p></div>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-3">{range(p.startDate, p.deadline)}</p>
            <SpanBar start={p.startDate} end={p.deadline} />
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[['tasks', tasks.length], ['members', members.length], ['overdue', tasks.filter(isOverdue).length]].map(([k, n]) => (
                <div key={k} className="rounded-md border border-line bg-canvas/30 py-2.5">
                  <p className={`font-display text-xl font-semibold tnum ${k === 'overdue' && n ? 'text-accent-fg' : 'text-fg'}`}>{num(n)}</p>
                  <p className="text-2xs text-muted">{t(`projects.stat.${k}`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="notch anim-in col-span-12 p-5 sm:p-6 lg:col-span-5" style={{ '--i': 1 }} aria-labelledby="code-title">
          <p className="eyebrow mb-2 !text-accent-fg">{t('projects.joinCode')}</p>
          <h2 id="code-title" className="font-display text-lg font-semibold">{t('projects.shareTitle')}</h2>
          <p className="mb-5 mt-1 text-sm text-muted">{t('projects.shareText')}</p>
          <JoinCode code={p.joinCode} size="lg" />
          <div className="mt-5 border-t border-line pt-5"><InvitePanel project={p} /></div>
        </section>

        <section className="panel anim-in col-span-12 p-5 sm:p-6 lg:col-span-4" style={{ '--i': 2 }} aria-labelledby="members-title">
          <SectionTitle id="members-title" title={t('projects.developersN', { count: members.length })} />
          {members.length === 0 ? (
            <EmptyState compact art="team" title={t('projects.noMembers')} text={t('projects.noMembersText')} />
          ) : (
            <ul className="space-y-1">
              {members.map((u) => {
                const mt = tasks.filter((x) => x.assigneeId === u.id);
                return (
                  <li key={u.id} className="flex items-center gap-3 rounded-md px-2 py-2.5">
                    <Avatar id={u.id} name={u.name} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="truncate text-xs text-muted" dir="ltr">{u.email}</p>
                      <StackBar className="mt-1.5" height={4} label={t('projects.memberTasks', { count: mt.length })}
                        parts={[{ value: mt.filter((x) => x.status === 'In Progress').length, className: 'bg-fg-2' }, { value: mt.filter((x) => x.status === 'Opened').length, className: 'bg-line-strong' }, { value: mt.filter((x) => x.status === 'Completed').length, className: 'bg-ok/70' }]} />
                    </div>
                    <span className="tnum text-xs text-fg-2">{t('projects.tasksN', { count: mt.length })}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel anim-in col-span-12 p-5 sm:p-6 lg:col-span-8" style={{ '--i': 3 }} aria-labelledby="ptasks-title">
          <SectionTitle id="ptasks-title" title={t('projects.tasksTitle', { count: tasks.length })}
            action={<ButtonLink to="/manager/calendar" variant="quiet" size="sm"><CalendarDays size={14} aria-hidden /> {t('projects.openCalendar')}</ButtonLink>} />
          {tasks.length === 0 ? (
            <EmptyState compact art="tasks" title={t('tasks.emptyTitle')} text={t('projects.noTasksText')}>
              <Button size="sm" onClick={() => setTaskForm({})}><Plus size={14} aria-hidden /> {t('tasks.add')}</Button>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {tasks.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-sm font-medium text-fg">{x.title}</p>
                    <p className="truncate text-xs text-muted">{userName(x.assigneeId)} · {range(x.startDate, x.deadline)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityTag priority={x.priority} />
                    <StatusPill status={x.status} />
                    {isOverdue(x) && <OverdueTag deadline={x.deadline} />}
                  </div>
                  <div className="flex">
                    <IconButton size="sm" label={t('tasks.editNamed', { name: x.title })} onClick={() => setTaskForm(x)}><Pencil size={14} /></IconButton>
                    <IconButton size="sm" label={t('tasks.deleteNamed', { name: x.title })} onClick={() => setDel(x)}><Trash2 size={14} /></IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {tasks.length > 0 && (
          <div className="anim-in col-span-12" style={{ '--i': 4 }}>
            <SectionTitle title={t('projects.timeline')} meta={t('timeline.dragHint')} />
            <Timeline
              label={t('projects.timeline')}
              tasks={tasks}
              rows={members.filter((u) => tasks.some((x) => x.assigneeId === u.id)).map((u) => ({ id: u.id, label: u.name, person: u }))}
              rowOf={(x) => x.assigneeId}
              from={tlFrom}
              days={tlDays}
              onOpen={setTaskForm}
              onReschedule={(x, d) => save({ ...x, startDate: addDays(x.startDate, d), deadline: addDays(x.deadline, d) }, t('timeline.moved', { title: x.title }))}
            />
          </div>
        )}
      </div>

      {editProject && <ProjectForm project={p} onClose={() => setEditProject(false)} />}
      {taskForm && <TaskForm task={taskForm.id ? taskForm : null} projectId={p.id} onClose={() => setTaskForm(null)} />}
      {del && (
        <ConfirmDialog
          title={t('tasks.deleteTitle')}
          text={t('tasks.deleteText', { name: del.title })}
          onCancel={() => setDel(null)}
          onConfirm={async () => { if (await deleteTask(del.id)) notify(t('tasks.deleted')); setDel(null); }}
        />
      )}
      {dialog}
    </>
  );
}
