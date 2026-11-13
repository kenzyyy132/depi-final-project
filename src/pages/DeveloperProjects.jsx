import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { AvatarStack, Button, ButtonLink, Drawer, EmptyState, cx } from '../components/ui';
import { Ring } from '../components/charts/Charts';
import { PageHeader, SectionTitle, TaskLine } from '../components/domain/Common';
import { ChronoRing } from '../components/brand/ChronoRing';
import { percentDone } from '../utils/scheduling';
import { SpanBar } from './Projects';

export function MyProjects() {
  const { myProjects, myTasks, userName, users } = useApp();
  const { t, pct } = useI18n();
  const [params, setParams] = useSearchParams();
  const openId = params.get('project');
  const open = myProjects.find((p) => p.id === openId);

  return (
    <>
      <PageHeader
        eyebrow={t('projects.eyebrow', { count: myProjects.length })}
        title={t('nav.myProjects')}
        summary={myProjects.length ? t('devProjects.summary') : undefined}
        actions={<ButtonLink to="/developer/join" variant="secondary"><KeyRound size={15} aria-hidden /> {t('nav.join')}</ButtonLink>}
      />
      {!myProjects.length ? (
        <EmptyState art="key" title={t('devProjects.emptyTitle')} text={t('devProjects.emptyText')}>
          <ButtonLink to="/developer/join">{t('devProjects.joinCta')}</ButtonLink>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 lg:gap-5">
          {myProjects.map((p, i) => {
            const pt = myTasks.filter((x) => x.projectId === p.id);
            const v = percentDone(pt);
            const team = users.filter((u) => p.memberIds.includes(u.id));
            return (
              <article key={p.id} className="spot panel anim-in flex min-w-0 flex-col p-5 transition-colors hover:border-line-strong" style={{ '--i': i }}>
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => setParams({ project: p.id })}
                      className="block max-w-full truncate text-start font-display text-lg font-semibold text-fg after:absolute after:inset-0 after:content-[''] hover:text-accent-fg">
                      {p.name}
                    </button>
                    <p className="mt-0.5 text-xs text-muted">{t('devProjects.manager', { name: userName(p.managerId) })}</p>
                  </div>
                  <Ring value={v} size={58} stroke={5} label={t('dash.progressAria', { name: p.name, pct: v })}>
                    <span className="tnum text-xs font-semibold">{pct(v)}</span>
                  </Ring>
                </div>
                <p className="mt-3 line-clamp-2 min-h-[40px] text-sm text-muted">{p.description || t('common.noDescription')}</p>
                <SpanBar start={p.startDate} end={p.deadline} className="mt-4" />
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
                  <span>{t('devProjects.yourTasks', { count: pt.length, pct: v })}</span>
                  <AvatarStack people={team} size={24} max={4} label={team.map((u) => u.name).join(', ')} />
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Drawer open={!!open} onClose={() => setParams({}, { replace: true })} eyebrow={t('projects.detailsEyebrow')} title={open?.name || ''}>
        {open && (() => {
          const pt = myTasks.filter((x) => x.projectId === open.id);
          return (
            <div className="space-y-6">
              <p className="text-sm text-fg-2">{open.description || t('common.noDescription')}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted">{t('devProjects.managerLabel')}</dt><dd className="font-medium">{userName(open.managerId)}</dd></div>
                <div><dt className="text-xs text-muted">{t('devProjects.teammates')}</dt><dd className="font-medium tnum">{t('projects.devsN', { count: open.memberIds.length })}</dd></div>
              </dl>
              <SpanBar start={open.startDate} end={open.deadline} />
              <div>
                <SectionTitle title={t('devProjects.yourTasksTitle')} meta={t('devProjects.yourTasks', { count: pt.length, pct: percentDone(pt) })} />
                {pt.length ? <div className="-mx-3 space-y-0.5">{pt.map((x) => <TaskLine key={x.id} task={x} showProject={false} />)}</div> : <p className="text-sm text-muted">{t('devProjects.noTasks')}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <ButtonLink to={`/developer/tasks?project=${open.id}`} variant="secondary" size="sm">{t('devProjects.viewTasks')}</ButtonLink>
                <ButtonLink to="/developer/team" variant="quiet" size="sm">{t('nav.team')}</ButtonLink>
              </div>
            </div>
          );
        })()}
      </Drawer>
    </>
  );
}

export function JoinProject() {
  const { joinProject, notify } = useApp();
  const { t, tm } = useI18n();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [focused, setFocused] = useState(false);
  const [joined, setJoined] = useState(null);
  const input = useRef(null);
  const chars = code.toUpperCase().replace(/[\s-]/g, '').slice(0, 6).split('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const res = await joinProject(code);
    setBusy(false);
    if (res.error) { setErr(tm(res.error)); input.current?.focus(); return; }
    setErr('');
    setCode('');
    setJoined(res.project);
    notify(t('join.joined', { name: res.project.name }));
  };

  if (joined)
    return (
      <div className="mx-auto max-w-lg pt-6 text-center">
        <div className="notch anim-pop p-8 sm:p-10">
          <div className="relative mx-auto mb-6 grid h-24 w-24 place-items-center">
            <span aria-hidden className="absolute inset-0 rounded-full bg-ok/10" />
            <ChronoRing size={72} animate />
            <CheckCircle2 size={26} className="absolute -bottom-1 end-0 rounded-full bg-surface text-ok" aria-hidden />
          </div>
          <p className="eyebrow mb-2 !text-ok">{t('join.successEyebrow')}</p>
          <h1 className="font-display text-2xl font-semibold">{t('join.successTitle', { name: joined.name })}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{t('join.successText')}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <ButtonLink to={`/developer/projects?project=${joined.id}`}>{t('join.openProject')} <ArrowRight size={15} className="rtl:-scale-x-100" aria-hidden /></ButtonLink>
            <Button variant="secondary" onClick={() => setJoined(null)}>{t('join.another')}</Button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-xl pt-2">
      <PageHeader eyebrow={t('nav.projects')} title={t('nav.join')} summary={t('join.intro')} />
      <form onSubmit={submit} noValidate className="notch anim-in p-6 sm:p-8">
        <label htmlFor="join-code" className="mb-3 block text-sm font-medium text-fg-2">{t('join.label')}</label>
        <div className="relative" dir="ltr" onClick={() => input.current?.focus()}>
          <div aria-hidden className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }, (_, i) => {
              const active = focused && i === Math.min(chars.length, 5);
              return (
                <span key={i} className={cx('grid h-14 place-items-center rounded-md border bg-canvas/50 font-mono text-2xl font-semibold transition-all duration-150 sm:h-16',
                  err ? 'border-accent/60' : active ? 'border-accent shadow-[0_0_0_3px_rgb(var(--accent)/.18)]' : chars[i] ? 'border-line-strong text-fg' : 'border-line text-faint')}>
                  {chars[i] || (active ? <span className="h-7 w-px animate-pulse bg-accent" /> : '·')}
                </span>
              );
            })}
          </div>
          <input
            id="join-code"
            ref={input}
            value={code}
            onChange={(e) => { setCode(e.target.value); setErr(''); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label={t('join.label')}
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? 'join-err' : 'join-hint'}
            className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
            autoFocus
          />
        </div>
        {err ? <p id="join-err" role="alert" className="anim-fade mt-3 text-sm font-medium text-accent-fg">{err}</p>
          : <p id="join-hint" className="mt-3 text-xs text-muted">{t('join.hint')}</p>}
        <Button type="submit" size="lg" className="mt-6 w-full" loading={busy}>{t('nav.join')}</Button>
      </form>
    </div>
  );
}
