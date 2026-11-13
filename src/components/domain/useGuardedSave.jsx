import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, Dialog } from '../ui';
import { findConflicts } from '../../utils/scheduling';

/**
 * Saves a task change (drag-to-reschedule, Kanban move) through the SAME rules as the task form:
 * saveTask's permission checks + findConflicts with "Cancel" / "Save anyway".
 */
export function useGuardedSave() {
  const { tasks, busy, saveTask, notify, projectName } = useApp();
  const { t, range } = useI18n();
  const [pending, setPending] = useState(null); // { next, conflicts, message }

  // saveTask reports server errors itself; success is announced only after the server accepted it.
  const commit = async (next, message) => {
    if (await saveTask(next)) notify(message || t('tasks.updated'));
  };
  const save = (next, message) => {
    // Busy blocks = the developer's open work in projects this manager can't see (dates only).
    const conflicts = findConflicts(next, [...tasks, ...busy]);
    if (conflicts.length) setPending({ next, conflicts, message });
    else commit(next, message);
  };

  const dialog = pending && (
    <Dialog
      role="alertdialog"
      size="sm"
      onClose={() => setPending(null)}
      title={t('conflicts.title')}
      eyebrow={t('conflicts.eyebrow')}
      footer={
        <>
          <Button variant="secondary" onClick={() => setPending(null)}>{t('common.cancel')}</Button>
          <Button onClick={() => { commit(pending.next, pending.message); setPending(null); }}>{t('conflicts.saveAnyway')}</Button>
        </>
      }
    >
      <div className="rounded-lg border border-warn/40 bg-warn/[.08] p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-warn"><AlertTriangle size={16} aria-hidden /> {t('conflicts.overlapIntro')}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {pending.conflicts.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3">
              <span className="truncate font-medium text-fg">{c.external ? t('conflicts.otherProject') : c.title}</span>
              <span className="shrink-0 text-xs text-muted">{c.external ? t('conflicts.otherProjectHint') : projectName(c.projectId)} · {range(c.startDate, c.deadline)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
  return { save, dialog };
}
