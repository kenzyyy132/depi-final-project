import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar, PriorityTag, StatusGlyph, cx } from '../ui';
import { STATUSES, isOverdue } from '../../utils/scheduling';
import { DueText } from './Common';
import { useGuardedSave } from './useGuardedSave';

/**
 * Kanban by status. Developers move their own tasks via setStatus (original rule);
 * managers move tasks via saveTask with the standard conflict check.
 */
export default function KanbanBoard({ tasks, onOpen }) {
  const { user, setStatus, notify, userName, projectName } = useApp();
  const { t, num } = useI18n();
  const { save, dialog } = useGuardedSave();
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const isM = user.role === 'manager';

  const move = (task, status) => {
    if (!task || task.status === status) return;
    const msg = t('tasks.statusUpdatedTo', { status: t(`status.${status}`) });
    if (isM) save({ ...task, status }, msg);
    else if (task.assigneeId === user.id) setStatus(task.id, status).then((ok) => ok && notify(msg));
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STATUSES.map((s, ci) => {
          const col = tasks.filter((x) => x.status === s);
          return (
            <section
              key={s}
              aria-labelledby={`col-${ci}`}
              onDragOver={(e) => { if (dragId) { e.preventDefault(); setOver(s); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }}
              onDrop={(e) => { e.preventDefault(); move(tasks.find((x) => x.id === dragId), s); setDragId(null); setOver(null); }}
              className={cx('anim-in flex min-h-[220px] flex-col rounded-lg border bg-surface/50 transition-colors', over === s ? 'border-accent/60 bg-accent/[.04]' : 'border-line')}
              style={{ '--i': ci }}
            >
              <header className="flex items-center gap-2 border-b border-line px-4 py-3">
                <StatusGlyph status={s} size={12} />
                <h2 id={`col-${ci}`} className="flex-1 text-sm font-semibold">{t(`status.${s}`)}</h2>
                <span className="tnum rounded-full bg-raised px-2 text-xs font-medium text-fg-2">{num(col.length)}</span>
              </header>
              <ul className="flex-1 space-y-2 p-2.5">
                {col.length === 0 && <li className="grid h-24 place-items-center rounded-md border border-dashed border-line text-xs text-faint">{t('board.dropHere')}</li>}
                {col.map((x) => (
                  <li
                    key={x.id}
                    draggable
                    onDragStart={(e) => { setDragId(x.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', x.id); }}
                    onDragEnd={() => { setDragId(null); setOver(null); }}
                    className={cx('spot group relative cursor-grab rounded-md border border-line bg-surface p-3 shadow-1 transition-[border-color,opacity,transform] duration-150 hover:border-line-strong active:cursor-grabbing',
                      dragId === x.id && 'rotate-[1deg] opacity-50')}
                  >
                    {isOverdue(x) && <span aria-hidden className="glow-line absolute inset-y-3 start-0 w-0.5 rounded-full" />}
                    <div className="flex items-start justify-between gap-2">
                      {isM ? (
                        <button type="button" onClick={() => onOpen(x)} className="text-start text-sm font-medium text-fg hover:text-accent-fg">{x.title}</button>
                      ) : (
                        <Link to={`/developer/tasks/${x.id}`} className="text-sm font-medium text-fg hover:text-accent-fg">{x.title}</Link>
                      )}
                      <PriorityTag priority={x.priority} compact />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">{projectName(x.projectId)}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {isM ? <span className="flex min-w-0 items-center gap-1.5 text-xs text-fg-2"><Avatar id={x.assigneeId} name={userName(x.assigneeId)} size={20} /> <span className="truncate">{userName(x.assigneeId)}</span></span> : <span />}
                      <DueText task={x} />
                    </div>
                    {/* Keyboard / touch alternative to drag and drop */}
                    <label className="mt-3 flex items-center gap-2 border-t border-line pt-2 text-2xs text-muted">
                      <span className="shrink-0">{t('board.moveTo')}</span>
                      <select
                        value={x.status}
                        onChange={(e) => move(x, e.target.value)}
                        aria-label={t('board.moveNamed', { name: x.title })}
                        className="min-w-0 flex-1 cursor-pointer rounded border border-line bg-field px-1.5 py-1 text-xs text-fg-2 focus:border-accent/70 focus:outline-none"
                      >
                        {STATUSES.map((o) => <option key={o} value={o}>{t(`status.${o}`)}</option>)}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {dialog}
    </>
  );
}
