import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarRange, Check, FolderPlus, KanbanSquare, KeyRound, ListChecks, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { Button, cx } from '../components/ui';
import { ChronoRing, Wordmark } from '../components/brand/ChronoRing';
import ProjectForm from '../components/domain/ProjectForm';
import { JoinCode } from '../components/domain/JoinCode';
import { InvitePanel } from '../components/domain/InvitePanel';

function Stepper({ steps, current }) {
  const { t, num } = useI18n();
  return (
    <ol className="flex items-center gap-2" aria-label={t('onboard.progress', { current: current + 1, total: steps.length })}>
      {steps.map((label, i) => (
        <li key={label} className="flex min-w-0 items-center gap-2" aria-current={i === current ? 'step' : undefined}>
          <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border text-2xs font-semibold tnum transition-colors',
            i < current ? 'border-ok/60 bg-ok/15 text-ok' : i === current ? 'border-accent bg-accent text-on-accent' : 'border-line-strong text-muted')}>
            {i < current ? <Check size={12} aria-hidden /> : num(i + 1)}
          </span>
          <span className={cx('hidden truncate text-xs sm:block', i === current ? 'font-medium text-fg' : 'text-muted')}>{label}</span>
          {i < steps.length - 1 && <span aria-hidden className={cx('h-px w-6 sm:w-10', i < current ? 'bg-ok/50' : 'bg-line')} />}
        </li>
      ))}
    </ol>
  );
}

function Shell({ steps, current, onSkip, children }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Wordmark />
        <Button variant="quiet" size="sm" onClick={onSkip}>{t('onboard.skip')}</Button>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:px-6">
        <div className="w-full max-w-2xl">
          <div className="mb-8 flex justify-center"><Stepper steps={steps} current={current} /></div>
          <div key={current} className="anim-page">{children}</div>
        </div>
      </main>
    </div>
  );
}

function Card({ eyebrow, title, text, children, footer }) {
  return (
    <section className="notch p-6 sm:p-10">
      {eyebrow && <p className="eyebrow mb-3 !text-accent-fg">{eyebrow}</p>}
      <h1 className="font-display text-2xl font-semibold leading-snug text-fg sm:text-3xl">{title}</h1>
      {text && <p className="mt-2 max-w-lg text-sm leading-6 text-muted">{text}</p>}
      {children && <div className="mt-7">{children}</div>}
      {footer && <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">{footer}</div>}
    </section>
  );
}

function ManagerFlow({ finish }) {
  const { user, myProjects } = useApp();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const project = myProjects.find((p) => p.id === projectId) || myProjects[myProjects.length - 1];
  const steps = [t('onboard.mWelcome'), t('onboard.mProject'), t('onboard.mTeam')];

  return (
    <Shell steps={steps} current={step} onSkip={() => finish('/manager')}>
      {step === 0 && (
        <Card eyebrow={t('onboard.hello', { name: user.name.split(' ')[0] })} title={t('onboard.mTitle')} text={t('onboard.mText')}
          footer={<><span /><Button onClick={() => setStep(1)}>{t('onboard.start')} <ArrowRight size={15} aria-hidden className="rtl:-scale-x-100" /></Button></>}>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[[FolderPlus, 'mS1'], [Users, 'mS2'], [CalendarRange, 'mS3']].map(([Icon, k]) => (
              <li key={k} className="rounded-lg border border-line bg-canvas/40 p-4">
                <Icon size={18} className="text-accent-fg" aria-hidden />
                <p className="mt-3 text-sm font-medium text-fg">{t(`onboard.${k}`)}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{t(`onboard.${k}Text`)}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {step === 1 && (
        <Card eyebrow={t('onboard.progress', { current: 2, total: 3 })} title={t('onboard.projectTitle')} text={t('onboard.projectText')}
          footer={<>
            <Button variant="quiet" onClick={() => setStep(0)}><ArrowLeft size={15} aria-hidden className="rtl:-scale-x-100" /> {t('onboard.back')}</Button>
            <Button onClick={() => setStep(2)} disabled={!project}>{t('onboard.next')} <ArrowRight size={15} aria-hidden className="rtl:-scale-x-100" /></Button>
          </>}>
          {project ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ok/40 bg-ok/[.06] p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Check size={18} className="shrink-0 text-ok" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{project.name}</p>
                  <p className="text-xs text-muted">{t('onboard.projectReady')}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>{t('onboard.anotherProject')}</Button>
            </div>
          ) : (
            <Button size="lg" onClick={() => setCreating(true)}><FolderPlus size={16} aria-hidden /> {t('projects.new')}</Button>
          )}
          {creating && <ProjectForm onClose={() => setCreating(false)} onSaved={(p) => setProjectId(p.id)} />}
        </Card>
      )}
      {step === 2 && project && (
        <Card eyebrow={t('onboard.progress', { current: 3, total: 3 })} title={t('onboard.teamTitle')} text={t('onboard.teamText', { name: project.name })}
          footer={<>
            <Button variant="quiet" onClick={() => setStep(1)}><ArrowLeft size={15} aria-hidden className="rtl:-scale-x-100" /> {t('onboard.back')}</Button>
            <Button onClick={() => finish(`/manager/projects/${project.id}`)}>{t('onboard.openProject')} <ArrowRight size={15} aria-hidden className="rtl:-scale-x-100" /></Button>
          </>}>
          <p className="mb-2 text-xs font-medium text-fg-2">{t('projects.joinCode')}</p>
          <JoinCode code={project.joinCode} size="lg" />
          <div className="mt-6 border-t border-line pt-6"><InvitePanel project={project} /></div>
          <p className="mt-6 text-xs leading-5 text-muted">{t('onboard.teamNote')}</p>
        </Card>
      )}
    </Shell>
  );
}

function DeveloperFlow({ finish, invite }) {
  const { user, myProjects, joinProject, notify } = useApp();
  const { t, tm } = useI18n();
  const [step, setStep] = useState(0);
  const [code, setCode] = useState(invite.toUpperCase());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(null);
  const input = useRef(null);
  const steps = [t('onboard.dWelcome'), t('onboard.dJoin'), t('onboard.dReady')];

  const join = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await joinProject(code);
    setBusy(false);
    if (res.error) { setErr(tm(res.error)); input.current?.focus(); return; }
    setErr('');
    setJoined(res.project);
    notify(t('join.joined', { name: res.project.name }));
    setStep(2);
  };

  return (
    <Shell steps={steps} current={step} onSkip={() => finish('/developer')}>
      {step === 0 && (
        <Card eyebrow={t('onboard.hello', { name: user.name.split(' ')[0] })} title={t('onboard.dTitle')} text={t('onboard.dText')}
          footer={<><span /><Button onClick={() => setStep(1)}>{t('onboard.start')} <ArrowRight size={15} aria-hidden className="rtl:-scale-x-100" /></Button></>}>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[[KeyRound, 'dS1'], [ListChecks, 'dS2'], [KanbanSquare, 'dS3']].map(([Icon, k]) => (
              <li key={k} className="rounded-lg border border-line bg-canvas/40 p-4">
                <Icon size={18} className="text-accent-fg" aria-hidden />
                <p className="mt-3 text-sm font-medium text-fg">{t(`onboard.${k}`)}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{t(`onboard.${k}Text`)}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {step === 1 && (
        <Card eyebrow={t('onboard.progress', { current: 2, total: 3 })} title={t('onboard.joinTitle')} text={t('onboard.joinText')}
          footer={<>
            <Button variant="quiet" onClick={() => setStep(0)}><ArrowLeft size={15} aria-hidden className="rtl:-scale-x-100" /> {t('onboard.back')}</Button>
            <Button variant="secondary" onClick={() => setStep(2)}>{myProjects.length ? t('onboard.next') : t('onboard.noCode')}</Button>
          </>}>
          <form onSubmit={join} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
            <div className="min-w-0 flex-1">
              <label htmlFor="ob-code" className="mb-1.5 block text-xs font-medium text-fg-2">{t('join.label')}</label>
              <input id="ob-code" ref={input} value={code} onChange={(e) => setCode(e.target.value)} maxLength={9} autoComplete="off" autoCapitalize="characters" spellCheck={false} dir="ltr"
                aria-invalid={!!err} aria-describedby={err ? 'ob-code-err' : undefined}
                className={cx('h-12 w-full rounded-md border bg-field px-4 font-mono text-lg uppercase tracking-[.4em] text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30',
                  err ? 'border-accent' : 'border-line-strong')} placeholder="ABC123" />
              {err && <p id="ob-code-err" role="alert" className="mt-1.5 text-xs text-accent-fg">{err}</p>}
            </div>
            <Button type="submit" size="lg" className="sm:mt-6" loading={busy}>{t('nav.join')}</Button>
          </form>
        </Card>
      )}
      {step === 2 && (
        <Card eyebrow={joined ? t('join.successEyebrow') : t('onboard.dReady')} title={joined ? t('join.successTitle', { name: joined.name }) : t('onboard.readyTitle')}
          text={joined ? t('join.successText') : t('onboard.readyText')}
          footer={<>
            <Button variant="quiet" onClick={() => setStep(1)}><ArrowLeft size={15} aria-hidden className="rtl:-scale-x-100" /> {t('onboard.back')}</Button>
            <Button onClick={() => finish(joined ? `/developer/projects?project=${joined.id}` : '/developer')}>{t('onboard.toDashboard')} <ArrowRight size={15} aria-hidden className="rtl:-scale-x-100" /></Button>
          </>}>
          <div className="relative mx-auto grid h-24 w-24 place-items-center"><ChronoRing size={80} animate /></div>
        </Card>
      )}
    </Shell>
  );
}

/** First-run setup after registration. Every step is optional; finishing or skipping marks onboarding done. */
export default function Onboarding() {
  const { user, completeOnboarding } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const invite = useMemo(() => params.get('invite') || '', [params]);
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboardedAt && !invite) return <Navigate to={`/${user.role}`} replace />;
  const finish = async (to) => {
    await completeOnboarding();
    navigate(to, { replace: true });
  };
  return user.role === 'manager' ? <ManagerFlow finish={finish} /> : <DeveloperFlow finish={finish} invite={invite} />;
}
