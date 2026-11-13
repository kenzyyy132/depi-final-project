import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar, Button, Drawer, OverdueTag, PriorityTag, StatusPill } from '../ui';
import { findConflicts, isOverdue } from '../../utils/scheduling';
import { daysBetween } from '../../utils/dates';
import { DueText } from './Common';

/** Read-only task details for managers, with Edit / Delete. */
export default function TaskDrawer({ task, onClose, onEdit, onDelete }) {
  const { userName, projectName, tasks, busy } = useApp();
  const { t, range, dateTime } = useI18n();
  const conflicts = task ? findConflicts(task, [...tasks, ...busy]) : [];
  return (
    <Drawer
      open={!!task}
      onClose={onClose}
      eyebrow={task ? projectName(task.projectId) : ''}
      title={task?.title || ''}
      footer={task && (
        <>
          <Button variant="danger" onClick={() => onDelete(task)}><Trash2 size={15} aria-hidden /> {t('common.delete')}</Button>
          <Button onClick={() => onEdit(task)}><Pencil size={15} aria-hidden /> {t('common.edit')}</Button>
        </>
      )}
    >
      {task && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={task.status} />
            <PriorityTag priority={task.priority} />
            {isOverdue(task) && <OverdueTag deadline={task.deadline} />}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-fg-2">{task.description || t('common.noDescription')}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
            <div className="col-span-2">
              <dt className="mb-1.5 text-xs text-muted">{t('tasks.assignedTo')}</dt>
              <dd className="flex items-center gap-2.5"><Avatar id={task.assigneeId} name={userName(task.assigneeId)} size={28} /><span className="font-medium">{userName(task.assigneeId)}</span></dd>
            </div>
            <div><dt className="mb-1 text-xs text-muted">{t('tasks.schedule')}</dt><dd className="font-medium">{range(task.startDate, task.deadline)}</dd></div>
            <div><dt className="mb-1 text-xs text-muted">{t('tasks.duration')}</dt><dd className="font-medium">{t('time.days', { count: daysBetween(task.startDate, task.deadline) + 1 })}</dd></div>
            <div><dt className="mb-1 text-xs text-muted">{t('common.deadline')}</dt><dd><DueText task={task} className="!text-sm" /></dd></div>
            {task.completedAt && <div><dt className="mb-1 text-xs text-muted">{t('tasks.completedAt')}</dt><dd className="font-medium text-ok">{dateTime(task.completedAt)}</dd></div>}
          </dl>
          {conflicts.length > 0 && (
            <div className="rounded-lg border border-warn/40 bg-warn/[.08] p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-warn"><AlertTriangle size={15} aria-hidden /> {t('conflicts.count', { count: conflicts.length })}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {conflicts.map((c) => <li key={c.id} className="text-fg-2">{c.external ? t('conflicts.otherProject') : c.title} <span className="text-muted">· {range(c.startDate, c.deadline)}</span></li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
