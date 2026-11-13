import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Clock, Inbox, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { IconButton, Popover, cx } from '../components/ui';
import { Illustration } from '../components/brand/Illustration';
import { buildNotifications } from '../utils/notifications';
import { PREF_KEYS, useUserPref } from '../utils/prefs';
import { taskHref } from './links';

const ICON = { overdue: Clock, dueSoon: Clock, conflict: AlertTriangle, assigned: UserPlus, completed: CheckCircle2 };
const TONE = { overdue: 'text-accent-fg bg-accent/10', dueSoon: 'text-fg-2 bg-raised', conflict: 'text-warn bg-warn/10', assigned: 'text-fg bg-raised', completed: 'text-ok bg-ok/10' };

export function useNotifications() {
  const { user, myTasks } = useApp();
  const list = useMemo(() => buildNotifications({ user, myTasks }), [user, myTasks]);
  const [seen, setSeen] = useUserPref(PREF_KEYS.seen, user?.id, []);
  const seenSet = useMemo(() => new Set(seen), [seen]);
  // Prune read-state of notifications that no longer exist so storage never grows unbounded.
  useEffect(() => {
    const live = new Set(list.map((n) => n.id));
    if (seen.some((id) => !live.has(id))) setSeen(seen.filter((id) => live.has(id)));
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps
  const unread = list.filter((n) => !seenSet.has(n.id));
  return {
    list, unread, isRead: (id) => seenSet.has(id),
    markRead: (id) => !seenSet.has(id) && setSeen([...seen, id]),
    markAll: () => setSeen(list.map((n) => n.id)),
  };
}

export default function NotificationsButton() {
  const { user, projectName, userName } = useApp();
  const { t, date } = useI18n();
  const nav = useNavigate();
  const { list, unread, isRead, markRead, markAll } = useNotifications();
  const label = unread.length ? t('notif.labelUnread', { count: unread.length }) : t('notif.label');
  return (
    <Popover
      label={t('notif.title')}
      className="w-[min(380px,calc(100vw-24px))] overflow-hidden"
      trigger={
        <IconButton label={label}>
          <Bell size={19} strokeWidth={1.75} />
          {unread.length > 0 && (
            <span className="absolute end-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-on-accent shadow-[0_0_10px_rgb(var(--glow)/.8)]">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </IconButton>
      }
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold">{t('notif.title')}</p>
              <p className="text-xs text-muted">{unread.length ? t('notif.unread', { count: unread.length }) : t('notif.allRead')}</p>
            </div>
            {unread.length > 0 && (
              <button type="button" onClick={markAll} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-fg-2 hover:bg-raised hover:text-fg">
                <CheckCheck size={14} aria-hidden /> {t('notif.markAll')}
              </button>
            )}
          </div>
          {list.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Illustration kind="bell" className="mx-auto mb-3 h-14" />
              <p className="text-sm font-medium">{t('notif.emptyTitle')}</p>
              <p className="mt-1 text-xs text-muted">{t('notif.emptyText')}</p>
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {list.map((n) => {
                const Icon = ICON[n.kind] || Inbox;
                const read = isRead(n.id);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => { markRead(n.id); close(); nav(taskHref(user.role, n.task.id)); }}
                      className="flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-raised/70"
                    >
                      <span className={cx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md', TONE[n.kind])}><Icon size={16} aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-sm', read ? 'text-fg-2' : 'font-medium text-fg')}>
                          {t(`notif.${n.kind}`, { title: n.task.title, other: n.other?.title, name: userName(n.task.assigneeId) })}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {projectName(n.task.projectId)} · {t('tasks.dueOn', { date: date(n.task.deadline) })}
                        </span>
                      </span>
                      {!read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--glow)/.9)]" aria-label={t('notif.new')} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Popover>
  );
}
