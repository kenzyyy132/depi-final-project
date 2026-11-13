import { useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { Button, Dialog, Field, cx } from './ui';
import { PRIORITIES, STATUSES, findConflicts, today } from '../utils/scheduling';
import { daysBetween } from '../utils/dates';

/** Visual overlap of the task being saved against the conflicting tasks. */
function OverlapBars({ draft, conflicts }) {
  const { t, date } = useI18n();
  const all = [draft, ...conflicts];
  const from = all.reduce((m, x) => (x.startDate < m ? x.startDate : m), draft.startDate);
  const to = all.reduce((m, x) => (x.deadline > m ? x.deadline : m), draft.deadline);
  const span = daysBetween(from, to) + 1;
  const bar = (x) => ({ insetInlineStart: `${(daysBetween(from, x.startDate) / span) * 100}%`, width: `${((daysBetween(x.startDate, x.deadline) + 1) / span) * 100}%` });
  return (
    <div className="mt-3 space-y-1.5" aria-hidden>
      {all.map((x, i) => (
        <div key={x.id || 'draft'} className="relative h-6 rounded bg-canvas/50">
          <span className={cx('absolute inset-y-0 flex items-center truncate rounded px-2 text-2xs font-medium', i === 0 ? 'bg-accent text-on-accent' : 'hatch bg-warn/20 text-fg ring-1 ring-inset ring-warn/60')} style={bar(x)}>
            {i === 0 ? x.title || t('tasks.thisTask') : x.title}
          </span>
        </div>
      ))}
      <div className="flex justify-between text-2xs text-muted tnum"><span>{date(from)}</span><span>{date(to)}</span></div>
    </div>
  );
}

export default function TaskForm({ task, projectId, onClose }) {
  const { myProjects, users, tasks, busy: busyBlocks, saveTask, notify, projectName } = useApp();
  const { t, tStatus, tPriority, range } = useI18n();
  const [f, setF] = useState(
    task || { title: '', description: '', projectId: projectId || myProjects[0]?.id || '', assigneeId: '', startDate: today(), deadline: today(), priority: 'Medium', status: 'Opened' }
  );
  const [errs, setErrs] = useState({});
  const [conflicts, setConflicts] = useState([]);
  const formRef = useRef(null);
  const panelRef = useRef(null);
  const members = useMemo(() => users.filter((u) => myProjects.find((p) => p.id === f.projectId)?.memberIds.includes(u.id)), [users, myProjects, f.projectId]);

  const set = (k) => (e) => {
    setF({ ...f, [k]: e.target.value, ...(k === 'projectId' ? { assigneeId: '' } : {}) });
    setConflicts([]);
  };
  const [saving, setSaving] = useState(false);
  // The dialog closes only after the server saved the task; on failure the input is kept.
  const commit = async () => {
    setSaving(true);
    const ok = await saveTask(f);
    setSaving(false);
    if (ok) {
      notify(task ? t('tasks.updated') : t('tasks.created'));
      onClose();
    }
  };
  const submit = (e) => {
    e?.preventDefault();
    const er = {};
    if (!f.title.trim()) er.title = t('errors.titleRequired');
    if (!f.projectId) er.projectId = t('errors.projectRequired');
    if (!f.assigneeId) er.assigneeId = t('errors.assigneeRequired');
    if (!f.startDate) er.startDate = t('errors.startRequired');
    if (!f.deadline) er.deadline = t('errors.deadlineRequired');
    else if (f.startDate > f.deadline) er.deadline = t('errors.deadlineBeforeStart');
    setErrs(er);
    if (Object.keys(er).length) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    const found = findConflicts(f, [...tasks, ...busyBlocks]);
    if (found.length) {
      setConflicts(found);
      requestAnimationFrame(() => panelRef.current?.focus());
    } else commit();
  };

  return (
    <Dialog
      onClose={onClose}
      size="lg"
      eyebrow={task ? projectName(task.projectId) : t('nav.tasks')}
      title={task ? t('tasks.edit') : t('tasks.new')}
      footer={
        conflicts.length > 0 ? (
          <>
            <Button variant="secondary" onClick={() => setConflicts([])}>{t('common.cancel')}</Button>
            <Button onClick={commit} loading={saving}>{t('conflicts.saveAnyway')}</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={submit} loading={saving}>{task ? t('common.saveChanges') : t('tasks.create')}</Button>
          </>
        )
      }
    >
      <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('tasks.title')} value={f.title} onChange={set('title')} error={errs.title} data-autofocus />
        <Field as="textarea" rows={2} label={t('common.description')} value={f.description} onChange={set('description')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field as="select" label={t('tasks.project')} value={f.projectId} onChange={set('projectId')} error={errs.projectId}>
            {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Field>
          <Field as="select" label={t('tasks.assignTo')} value={f.assigneeId} onChange={set('assigneeId')} error={errs.assigneeId}
            hint={!members.length ? t('tasks.noMembersHint') : undefined}>
            <option value="">{members.length ? t('tasks.selectDev') : t('tasks.noMembers')}</option>
            {members.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Field>
          <Field type="date" label={t('common.startDate')} value={f.startDate} onChange={set('startDate')} error={errs.startDate} />
          <Field type="date" label={t('common.deadline')} value={f.deadline} onChange={set('deadline')} error={errs.deadline} />
          <Field as="select" label={t('tasks.priority')} value={f.priority} onChange={set('priority')}>
            {PRIORITIES.map((x) => <option key={x} value={x}>{tPriority(x)}</option>)}
          </Field>
          <Field as="select" label={t('tasks.status')} value={f.status} onChange={set('status')}>
            {STATUSES.map((x) => <option key={x} value={x}>{tStatus(x)}</option>)}
          </Field>
        </div>
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>{t('common.save')}</button>
        <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out', conflicts.length ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
          <div className="overflow-hidden">
            {conflicts.length > 0 && (
              <div ref={panelRef} tabIndex={-1} role="alert" className="anim-fade rounded-lg border border-warn/50 bg-warn/[.08] p-4 outline-none">
                <p className="flex items-center gap-2 font-medium text-warn"><AlertTriangle size={16} aria-hidden /> {t('conflicts.title')}</p>
                <p className="mt-1 text-sm text-fg-2">{t('conflicts.overlapIntro')}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {conflicts.map((c) => <li key={c.id} className="text-fg">• {c.external ? t('conflicts.otherProject') : c.title} <span className="text-muted">({c.external ? t('conflicts.otherProjectHint') : projectName(c.projectId)}, {range(c.startDate, c.deadline)})</span></li>)}
                </ul>
                <OverlapBars draft={f} conflicts={conflicts} />
              </div>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
