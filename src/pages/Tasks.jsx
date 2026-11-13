import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bookmark, BookmarkPlus, Columns3, Pencil, Plus, Search, SlidersHorizontal, Table2, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import {
  Avatar, Button, Chip, ConfirmDialog, Dialog, Drawer, EmptyState, Field, IconButton, Menu, PriorityTag, Segmented, StatusGlyph, StatusPill, controlClass, cx,
} from '../components/ui';
import { DueText, PageHeader } from '../components/domain/Common';
import TaskForm from '../components/TaskForm';
import TaskDrawer from '../components/domain/TaskDrawer';
import KanbanBoard from '../components/domain/KanbanBoard';
import { STATUSES, PRIORITIES, isOverdue, isUpcoming } from '../utils/scheduling';
import { uid } from '../utils/storage';
import { PREF_KEYS, usePref, useUserPref } from '../utils/prefs';
import { useIsMobile } from '../hooks/useMediaQuery';

const EMPTY = { project: '', dev: '', status: '', priority: '', due: '', q: '' };
const FILTER_KEYS = ['project', 'dev', 'status', 'priority', 'due'];

function Filters({ flt, set, isM, projects, devs }) {
  const { t, tStatus, tPriority } = useI18n();
  const sel = (k, label, opts) => (
    <Field as="select" label={label} value={flt[k]} onChange={(e) => set(k, e.target.value)}>
      <option value="">{t('common.all')}</option>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </Field>
  );
  return (
    <>
      {sel('project', t('tasks.project'), projects.map((p) => [p.id, p.name]))}
      {isM && sel('dev', t('tasks.developer'), devs.map((u) => [u.id, u.name]))}
      {sel('status', t('tasks.status'), STATUSES.map((s) => [s, tStatus(s)]))}
      {sel('priority', t('tasks.priority'), PRIORITIES.map((s) => [s, tPriority(s)]))}
      {sel('due', t('common.deadline'), [['overdue', t('tasks.filterOverdue')], ['week', t('tasks.filterWeek')]])}
    </>
  );
}

export default function Tasks() {
  const { user, myProjects, myTasks, users, projectName, userName, deleteTask, setStatus, notify } = useApp();
  const { t, tStatus, tPriority, range } = useI18n();
  const isM = user.role === 'manager';
  const mobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const [flt, setFlt] = useState(() => ({ ...EMPTY, project: params.get('project') || '', due: params.get('due') || '' }));
  const [view, setView] = usePref(PREF_KEYS.ui + '_tasks_view', 'table');
  const [form, setForm] = useState(() => (isM && params.get('new') ? {} : null));
  const [del, setDel] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [naming, setNaming] = useState(null);
  const [saved, setSaved] = useUserPref(PREF_KEYS.filters, user.id, []);
  const set = (k, v) => setFlt((f) => ({ ...f, [k]: v }));

  const drawerTask = isM ? myTasks.find((x) => x.id === params.get('task')) : null;
  const clearParam = (k) => { const n = new URLSearchParams(params); n.delete(k); setParams(n, { replace: true }); };
  useEffect(() => { if (params.get('due')) set('due', params.get('due')); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const devs = users.filter((u) => myProjects.some((p) => p.memberIds.includes(u.id)) && u.role === 'developer');
  const rows = useMemo(() => {
    const q = flt.q.trim().toLocaleLowerCase();
    return myTasks
      .filter((x) =>
        (!flt.project || x.projectId === flt.project) && (!flt.dev || x.assigneeId === flt.dev) &&
        (!flt.status || x.status === flt.status) && (!flt.priority || x.priority === flt.priority) &&
        (!flt.due || (flt.due === 'overdue' ? isOverdue(x) : isUpcoming(x, 7))) &&
        (!q || x.title.toLocaleLowerCase().includes(q) || (x.description || '').toLocaleLowerCase().includes(q))
      )
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [myTasks, flt]);

  const active = FILTER_KEYS.filter((k) => flt[k]);
  const chipLabel = (k) => ({
    project: projectName(flt.project), dev: userName(flt.dev), status: tStatus(flt.status), priority: tPriority(flt.priority),
    due: flt.due === 'overdue' ? t('tasks.filterOverdue') : t('tasks.filterWeek'),
  })[k];
  const statusSelect = (x) => (
    <select aria-label={t('tasks.taskStatus')} value={x.status}
      onChange={async (e) => { if (await setStatus(x.id, e.target.value)) notify(t('tasks.statusUpdated')); }}
      className={cx(controlClass(), 'h-8 w-auto cursor-pointer py-0 pe-7 text-xs')}>
      {STATUSES.map((s) => <option key={s} value={s}>{tStatus(s)}</option>)}
    </select>
  );
  const titleCell = (x) =>
    isM ? <button type="button" onClick={() => setParams({ task: x.id })} className="text-start font-medium text-fg hover:text-accent-fg">{x.title}</button>
      : <Link className="font-medium text-fg hover:text-accent-fg" to={`/developer/tasks/${x.id}`}>{x.title}</Link>;
  const actions = (x) => isM && (
    <div className="flex justify-end">
      <IconButton size="sm" label={t('tasks.editNamed', { name: x.title })} onClick={() => setForm(x)}><Pencil size={14} /></IconButton>
      <IconButton size="sm" label={t('tasks.deleteNamed', { name: x.title })} onClick={() => setDel(x)}><Trash2 size={14} /></IconButton>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow={t('tasks.eyebrow', { count: myTasks.length })}
        title={isM ? t('nav.tasks') : t('nav.myTasks')}
        summary={t('tasks.summary', { shown: rows.length, total: myTasks.length })}
        actions={
          <>
            <Segmented size="sm" label={t('common.view')} value={view} onChange={setView}
              options={[{ value: 'table', label: t('tasks.viewTable'), icon: Table2 }, { value: 'board', label: t('tasks.viewBoard'), icon: Columns3 }]} />
            {isM && <Button disabled={!myProjects.length} onClick={() => setForm({})}><Plus size={16} aria-hidden /> {t('tasks.new')}</Button>}
          </>
        }
      />

      {/* Toolbar: search + filters + saved views */}
      <div className="panel mb-4 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search size={16} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={flt.q} onChange={(e) => set('q', e.target.value)} placeholder={t('tasks.searchPlaceholder')} aria-label={t('tasks.search')}
              className={cx(controlClass(), 'h-10 ps-9')} type="search" />
          </div>
          {mobile && (
            <Button variant="secondary" onClick={() => setSheet(true)}><SlidersHorizontal size={15} aria-hidden /> {t('tasks.filters')}{active.length ? ` (${active.length})` : ''}</Button>
          )}
          <Menu
            label={t('tasks.savedViews')}
            items={[
              ...saved.map((s) => ({ label: s.name, icon: Bookmark, onSelect: () => setFlt({ ...EMPTY, ...s.filters }) })),
              ...(saved.length ? [{ divider: true }] : []),
              { label: t('tasks.saveView'), icon: BookmarkPlus, onSelect: () => setNaming('') },
              ...saved.map((s) => ({ label: t('tasks.deleteView', { name: s.name }), icon: X, danger: true, onSelect: () => { setSaved(saved.filter((x) => x.id !== s.id)); notify(t('tasks.viewDeleted')); } })),
            ]}
            trigger={<Button variant="secondary"><Bookmark size={15} aria-hidden /> <span className="hidden sm:inline">{t('tasks.savedViews')}</span>{saved.length ? <span className="tnum text-muted">{saved.length}</span> : null}</Button>}
          />
        </div>
        {!mobile && (
          <div className={cx('mt-3 grid grid-cols-2 gap-3', isM ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
            <Filters flt={flt} set={set} isM={isM} projects={myProjects} devs={devs} />
          </div>
        )}
        {(active.length > 0 || flt.q) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {active.map((k) => <Chip key={k} onRemove={() => set(k, '')} removeLabel={t('tasks.removeFilter', { name: chipLabel(k) })}>{chipLabel(k)}</Chip>)}
            <button type="button" onClick={() => setFlt(EMPTY)} className="text-xs font-medium text-muted underline-offset-4 hover:text-fg hover:underline">{t('tasks.clearAll')}</button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState art="tasks"
          title={myTasks.length ? t('tasks.noMatchTitle') : t('tasks.emptyTitle')}
          text={isM ? (myProjects.length ? t('tasks.emptyManager') : t('tasks.emptyNoProjects')) : myTasks.length ? t('tasks.noMatchText') : t('tasks.emptyDeveloper')}>
          {myTasks.length > 0 && <Button variant="secondary" onClick={() => setFlt(EMPTY)}>{t('tasks.clearAll')}</Button>}
        </EmptyState>
      ) : view === 'board' ? (
        <KanbanBoard tasks={rows} onOpen={(x) => setParams({ task: x.id })} />
      ) : mobile ? (
        <ul className="space-y-2.5">
          {rows.map((x, i) => (
            <li key={x.id} className="panel anim-in relative p-4" style={{ '--i': Math.min(i, 8) }}>
              {isOverdue(x) && <span aria-hidden className="glow-line absolute inset-y-4 start-0 w-0.5 rounded-full" />}
              <div className="flex items-start gap-3">
                <StatusGlyph status={x.status} />
                <div className="min-w-0 flex-1">
                  {titleCell(x)}
                  <p className="mt-0.5 truncate text-xs text-muted">{projectName(x.projectId)}{isM && ` · ${userName(x.assigneeId)}`}</p>
                </div>
                {actions(x)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <PriorityTag priority={x.priority} />
                <span className="text-xs text-muted">{range(x.startDate, x.deadline)}</span>
                <DueText task={x} className="ms-auto" />
              </div>
              {!isM && <div className="mt-3">{statusSelect(x)}</div>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full table-fixed text-start text-sm">
            <thead className="border-b border-line bg-canvas/40 text-xs text-muted">
              <tr>
                <th scope="col" className="w-[30%] px-4 py-3 text-start font-medium">{t('tasks.task')}</th>
                <th scope="col" className="px-3 py-3 text-start font-medium">{t('tasks.project')}</th>
                {isM && <th scope="col" className="px-3 py-3 text-start font-medium">{t('tasks.developer')}</th>}
                <th scope="col" className="px-3 py-3 text-start font-medium">{t('tasks.schedule')}</th>
                <th scope="col" className="w-[100px] px-3 py-3 text-start font-medium">{t('tasks.priority')}</th>
                <th scope="col" className="w-[150px] px-3 py-3 text-start font-medium">{t('tasks.status')}</th>
                {isM && <th scope="col" className="w-[88px] px-3 py-3"><span className="sr-only">{t('common.actions')}</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((x) => (
                <tr key={x.id} className="group relative transition-colors hover:bg-raised/50">
                  <td className="relative px-4 py-3">
                    {isOverdue(x) && <span aria-hidden className="glow-line absolute inset-y-3 start-0 w-0.5 rounded-full" />}
                    <div className="flex items-center gap-2.5"><StatusGlyph status={x.status} /><span className="min-w-0 truncate">{titleCell(x)}</span></div>
                  </td>
                  <td className="truncate px-3 py-3 text-fg-2">{projectName(x.projectId)}</td>
                  {isM && <td className="px-3 py-3"><span className="flex min-w-0 items-center gap-2 text-fg-2"><Avatar id={x.assigneeId} name={userName(x.assigneeId)} size={22} /><span className="truncate">{userName(x.assigneeId)}</span></span></td>}
                  <td className="px-3 py-3"><p className="truncate text-fg-2">{range(x.startDate, x.deadline)}</p><DueText task={x} /></td>
                  <td className="px-3 py-3"><PriorityTag priority={x.priority} /></td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isM ? <StatusPill status={x.status} /> : statusSelect(x)}
                    </div>
                  </td>
                  {isM && <td className="px-3 py-3">{actions(x)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={sheet} onClose={() => setSheet(false)} title={t('tasks.filters')}
        footer={<><Button variant="secondary" onClick={() => setFlt({ ...EMPTY, q: flt.q })}>{t('tasks.clearAll')}</Button><Button onClick={() => setSheet(false)}>{t('tasks.showN', { count: rows.length })}</Button></>}>
        <div className="space-y-4"><Filters flt={flt} set={set} isM={isM} projects={myProjects} devs={devs} /></div>
      </Drawer>

      {naming !== null && (
        <Dialog size="sm" onClose={() => setNaming(null)} title={t('tasks.saveView')} description={t('tasks.saveViewText')}
          footer={<><Button variant="secondary" onClick={() => setNaming(null)}>{t('common.cancel')}</Button>
            <Button disabled={!naming.trim()} onClick={() => {
              const { q, ...filters } = flt; // eslint-disable-line no-unused-vars
              setSaved([...saved, { id: uid(), name: naming.trim(), filters: { ...filters, q } }]);
              notify(t('tasks.viewSaved', { name: naming.trim() }));
              setNaming(null);
            }}>{t('common.save')}</Button></>}>
          <Field label={t('tasks.viewName')} value={naming} onChange={(e) => setNaming(e.target.value)} data-autofocus
            hint={active.length || flt.q ? [...active.map(chipLabel), flt.q && `“${flt.q}”`].filter(Boolean).join(' · ') : t('tasks.noFiltersYet')} />
        </Dialog>
      )}

      <TaskDrawer task={drawerTask} onClose={() => clearParam('task')} onEdit={(x) => { clearParam('task'); setForm(x); }} onDelete={(x) => setDel(x)} />
      {form && <TaskForm task={form.id ? form : null} onClose={() => { setForm(null); if (params.get('new')) clearParam('new'); }} />}
      {del && (
        <ConfirmDialog title={t('tasks.deleteTitle')} text={t('tasks.deleteText', { name: del.title })}
          onCancel={() => setDel(null)}
          onConfirm={async () => { if (await deleteTask(del.id)) { notify(t('tasks.deleted')); if (params.get('task')) clearParam('task'); } setDel(null); }} />
      )}
    </>
  );
}
