import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, FolderKanban, KeyRound, Languages, Moon, Plus, Search, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeProvider';
import { Kbd, StatusGlyph, cx } from '../components/ui';
import { Illustration } from '../components/brand/Illustration';
import { usePresence } from '../hooks/usePresence';
import { NAV, href } from './nav';
import { projectHref, taskHref } from './links';

const norm = (s) => (s || '').toLocaleLowerCase();

export default function CommandPalette({ open, onClose }) {
  const { user, myProjects, myTasks, projectName } = useApp();
  const { t, lang, setLang, date } = useI18n();
  const { resolved, toggle } = useTheme();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const listId = useId();
  const { mounted, closing } = usePresence(open, 150);

  useEffect(() => {
    if (!open) return;
    setQ(''); setActive(0);
    const prev = document.activeElement;
    requestAnimationFrame(() => input.current?.focus());
    return () => prev?.focus?.();
  }, [open]);

  const groups = useMemo(() => {
    const s = norm(q.trim());
    const match = (...fields) => !s || fields.some((f) => norm(f).includes(s));
    const isM = user.role === 'manager';
    const pages = NAV[user.role].map((n) => ({ id: `nav:${n.key}`, icon: n.icon, label: t(`nav.${n.key}`), hint: t('cmd.goTo'), run: () => nav(href(user.role, n.path)) })).filter((x) => match(x.label));
    const actions = [
      isM && { id: 'a:task', icon: Plus, label: t('tasks.new'), run: () => nav('/manager/tasks?new=1') },
      isM && { id: 'a:project', icon: Plus, label: t('projects.new'), run: () => nav('/manager/projects?new=1') },
      !isM && { id: 'a:join', icon: KeyRound, label: t('nav.join'), run: () => nav('/developer/join') },
      { id: 'a:theme', icon: resolved === 'dark' ? Sun : Moon, label: resolved === 'dark' ? t('theme.toLight') : t('theme.toDark'), run: toggle },
      { id: 'a:lang', icon: Languages, label: lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية', run: () => setLang(lang === 'ar' ? 'en' : 'ar') },
    ].filter(Boolean).filter((x) => match(x.label));
    const projects = s ? myProjects.filter((p) => match(p.name, p.description, isM && p.joinCode)).slice(0, 6).map((p) => ({
      id: `p:${p.id}`, icon: FolderKanban, label: p.name, hint: `${date(p.startDate)} – ${date(p.deadline)}`, run: () => nav(projectHref(user.role, p.id)),
    })) : [];
    const tasks = s ? myTasks.filter((x) => match(x.title, x.description, projectName(x.projectId))).slice(0, 8).map((x) => ({
      id: `t:${x.id}`, glyph: x.status, label: x.title, hint: `${projectName(x.projectId)} · ${date(x.deadline)}`, run: () => nav(taskHref(user.role, x.id)),
    })) : [];
    return [
      { key: 'tasks', label: t('cmd.tasks'), items: tasks },
      { key: 'projects', label: t('cmd.projects'), items: projects },
      { key: 'pages', label: t('cmd.pages'), items: pages },
      { key: 'actions', label: t('cmd.actions'), items: actions },
    ].filter((g) => g.items.length);
  }, [q, user, myProjects, myTasks, t, lang, resolved]); // eslint-disable-line react-hooks/exhaustive-deps

  const flat = groups.flatMap((g) => g.items);
  const run = (item) => { onClose(); item.run(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); run(flat[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'Tab') e.preventDefault();
  };
  useEffect(() => { document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active, listId]);

  if (!mounted) return null;
  let i = -1;
  return createPortal(
    <div className="fixed inset-0 z-60 flex items-start justify-center px-3 pt-[12vh]">
      <div className={cx('absolute inset-0 bg-canvas/70 backdrop-blur-sm', closing ? 'anim-fade-out' : 'anim-fade')} onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={t('cmd.title')} className={cx('relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-3', closing ? 'anim-pop-out' : 'anim-pop')}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="shrink-0 text-muted" aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKey}
            placeholder={t('cmd.placeholder')}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={flat.length ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            aria-label={t('cmd.placeholder')}
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-fg placeholder:text-faint focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div id={listId} role="listbox" aria-label={t('cmd.results')} className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Illustration kind="search" className="mx-auto mb-3 h-14" />
              <p className="text-sm text-fg-2">{t('cmd.noResults', { q })}</p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key} role="group" aria-label={g.label} className="mb-1">
                <p className="eyebrow px-3 pb-1 pt-2">{g.label}</p>
                {g.items.map((item) => {
                  i += 1;
                  const idx = i;
                  const on = idx === active;
                  return (
                    <div
                      key={item.id}
                      id={`${listId}-${idx}`}
                      role="option"
                      aria-selected={on}
                      onMouseMove={() => setActive(idx)}
                      onClick={() => run(item)}
                      className={cx('relative flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm', on ? 'bg-raised text-fg' : 'text-fg-2')}
                    >
                      {on && <span aria-hidden className="glow-line absolute inset-y-2 start-0 w-0.5 rounded-full" />}
                      {item.glyph ? <StatusGlyph status={item.glyph} size={14} /> : <item.icon size={16} aria-hidden className={on ? 'text-accent-fg' : 'text-muted'} />}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.hint && <span className="hidden max-w-[45%] truncate text-xs text-muted sm:block">{item.hint}</span>}
                      {on && <CornerDownLeft size={14} className="shrink-0 text-muted rtl:-scale-x-100" aria-hidden />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="hidden items-center gap-4 border-t border-line px-4 py-2 text-2xs text-muted sm:flex">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> {t('cmd.navigate')}</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> {t('cmd.open')}</span>
          <span className="ms-auto flex items-center gap-1"><Kbd>G</Kbd> + <Kbd>D</Kbd>/<Kbd>P</Kbd>/<Kbd>T</Kbd>/<Kbd>C</Kbd> {t('cmd.jump')}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
