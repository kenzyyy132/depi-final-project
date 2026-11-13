import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { AvatarStack, Button, ConfirmDialog, EmptyState, IconButton, Segmented, cx } from '../components/ui';
import { Ring } from '../components/charts/Charts';
import { PageHeader } from '../components/domain/Common';
import ProjectForm from '../components/domain/ProjectForm';
import { JoinCode } from '../components/domain/JoinCode';
import { conflictPairs, isOverdue, percentDone, today } from '../utils/scheduling';
import { daysBetween } from '../utils/dates';
import { usePref, PREF_KEYS } from '../utils/prefs';

/** Project time span with a "now" marker. */
export function SpanBar({ start, end, className }) {
  const { t, date } = useI18n();
  const span = Math.max(1, daysBetween(start, end));
  const pos = (daysBetween(start, today()) / span) * 100;
  const left = daysBetween(today(), end);
  return (
    <div className={className}>
      <div className="relative h-1.5 rounded-full bg-line">
        <div className="anim-grow-x absolute inset-y-0 start-0 rounded-full bg-fg-2/40" style={{ width: `${Math.min(100, Math.max(0, pos))}%` }} />
        {pos >= 0 && pos <= 100 && <span aria-hidden className="glow-line absolute -top-1 h-3.5 w-px" style={{ insetInlineStart: `${pos}%` }} />}
      </div>
      <div className="mt-1.5 flex justify-between gap-2 text-2xs text-muted tnum">
        <span>{date(start)}</span>
        <span className={cx(left < 0 && 'font-semibold text-accent-fg')}>
          {left < 0 ? t('projects.pastDeadline') : pos < 0 ? t('projects.startsIn', { count: -daysBetween(start, today()) }) : t('projects.daysLeft', { count: left })}
        </span>
        <span>{date(end)}</span>
      </div>
    </div>
  );
}

function ProjectCard({ p, i, onEdit, onDelete }) {
  const { myTasks, users } = useApp();
  const { t, pct, num } = useI18n();
  const pt = myTasks.filter((x) => x.projectId === p.id);
  const v = percentDone(pt);
  const members = users.filter((u) => p.memberIds.includes(u.id));
  const overdue = pt.filter(isOverdue).length;
  const conflicts = conflictPairs(pt).length;
  return (
    <article className="spot panel anim-in group flex min-w-0 flex-col p-5 transition-colors hover:border-line-strong" style={{ '--i': i }}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <Link to={`/manager/projects/${p.id}`} className="block truncate font-display text-lg font-semibold text-fg after:absolute after:inset-0 after:content-[''] hover:text-accent-fg">
            {p.name}
          </Link>
          <p className="mt-1 line-clamp-2 min-h-[40px] text-sm text-muted">{p.description || t('common.noDescription')}</p>
        </div>
        <Ring value={v} size={58} stroke={5} label={t('dash.progressAria', { name: p.name, pct: v })}>
          <span className="tnum text-xs font-semibold text-fg">{pct(v)}</span>
        </Ring>
      </div>
      <SpanBar start={p.startDate} end={p.deadline} className="mt-5" />
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {members.length ? <AvatarStack people={members} size={26} label={members.map((m) => m.name).join(', ')} /> : <span className="text-xs text-muted">{t('projects.noMembers')}</span>}
          <span className="text-xs text-muted">{t('projects.tasksN', { count: pt.length })}</span>
        </div>
        <div className="flex gap-1.5 text-2xs font-semibold">
          {overdue > 0 && <span className="rounded bg-accent/[.12] px-1.5 py-0.5 text-accent-fg">{t('dash.overdueN', { count: overdue })}</span>}
          {conflicts > 0 && <span className="rounded bg-warn/[.12] px-1.5 py-0.5 text-warn">{num(conflicts)} ⚠</span>}
        </div>
      </div>
      <div className="relative z-[1] mt-5 flex items-center justify-between gap-2 border-t border-line pt-4">
        <JoinCode code={p.joinCode} />
        <div className="flex">
          <IconButton size="sm" label={t('projects.editNamed', { name: p.name })} onClick={onEdit}><Pencil size={15} /></IconButton>
          <IconButton size="sm" label={t('projects.deleteNamed', { name: p.name })} onClick={onDelete} className="hover:!text-accent-fg"><Trash2 size={15} /></IconButton>
        </div>
      </div>
    </article>
  );
}

function ProjectRows({ projects, onEdit, onDelete }) {
  const { myTasks } = useApp();
  const { t, pct, date, num } = useI18n();
  return (
    <div className="panel overflow-hidden">
      <ul className="divide-y divide-line">
        {projects.map((p, i) => {
          const pt = myTasks.filter((x) => x.projectId === p.id);
          const v = percentDone(pt);
          return (
            <li key={p.id} className="anim-in grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto_auto] sm:px-5" style={{ '--i': i }}>
              <div className="min-w-0">
                <Link to={`/manager/projects/${p.id}`} className="block truncate font-medium text-fg hover:text-accent-fg">{p.name}</Link>
                <p className="truncate text-xs text-muted">{date(p.startDate)} – {date(p.deadline)} · {t('projects.devsN', { count: p.memberIds.length })} · {t('projects.tasksN', { count: pt.length })}</p>
              </div>
              <div className="hidden items-center gap-3 sm:flex">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="anim-grow-x h-full rounded-full bg-gradient-to-r from-accent-strong to-accent rtl:bg-gradient-to-l" style={{ width: `${v}%` }} /></div>
                <span className="tnum w-10 text-end text-xs text-fg-2">{pct(v)}</span>
              </div>
              <span className="hidden font-mono text-xs tracking-widest text-fg-2 sm:block" dir="ltr">{p.joinCode}</span>
              <div className="flex">
                <IconButton size="sm" label={t('projects.editNamed', { name: p.name })} onClick={() => onEdit(p)}><Pencil size={15} /></IconButton>
                <IconButton size="sm" label={t('projects.deleteNamed', { name: p.name })} onClick={() => onDelete(p)}><Trash2 size={15} /></IconButton>
              </div>
              <span className="sr-only">{num(v)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Projects() {
  const { myProjects, myTasks, deleteProject, notify } = useApp();
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(() => (params.get('new') ? {} : null)); // null = closed, {} = new, project = edit
  const [del, setDel] = useState(null);
  const [view, setView] = usePref(PREF_KEYS.ui + '_projects_view', 'grid');
  const closeForm = () => { setForm(null); if (params.get('new')) setParams({}, { replace: true }); };
  const active = myProjects.filter((p) => p.deadline >= today()).length;
  const delTasks = del ? myTasks.filter((x) => x.projectId === del.id).length : 0;

  return (
    <>
      <PageHeader
        eyebrow={t('projects.eyebrow', { count: myProjects.length })}
        title={t('nav.projects')}
        summary={myProjects.length ? t('projects.summary', { active, total: myProjects.length }) : t('projects.summaryEmpty')}
        actions={
          <>
            {myProjects.length > 0 && (
              <Segmented size="sm" label={t('common.view')} value={view} onChange={setView}
                options={[{ value: 'grid', label: t('common.grid'), icon: LayoutGrid, iconOnly: true }, { value: 'list', label: t('common.list'), icon: List, iconOnly: true }]} />
            )}
            <Button onClick={() => setForm({})}><Plus size={16} aria-hidden /> {t('projects.new')}</Button>
          </>
        }
      />
      {myProjects.length === 0 ? (
        <EmptyState art="projects" title={t('projects.emptyTitle')} text={t('projects.emptyText')}>
          <Button onClick={() => setForm({})}>{t('projects.create')}</Button>
        </EmptyState>
      ) : view === 'list' ? (
        <ProjectRows projects={myProjects} onEdit={setForm} onDelete={setDel} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 lg:gap-5">
          {myProjects.map((p, i) => <ProjectCard key={p.id} p={p} i={i} onEdit={() => setForm(p)} onDelete={() => setDel(p)} />)}
        </div>
      )}
      {form && <ProjectForm project={form.id ? form : null} onClose={closeForm} />}
      {del && (
        <ConfirmDialog
          title={t('projects.deleteTitle')}
          text={t('projects.deleteText', { name: del.name, count: delTasks })}
          confirmLabel={t('common.delete')}
          onCancel={() => setDel(null)}
          onConfirm={async () => { if (await deleteProject(del.id)) notify(t('projects.deleted')); setDel(null); }}
        />
      )}
    </>
  );
}
