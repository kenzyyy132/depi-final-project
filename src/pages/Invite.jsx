import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CalendarRange, KeyRound, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { Button, ButtonLink } from '../components/ui';
import { Illustration } from '../components/brand/Illustration';
import { ChronoRing } from '../components/brand/ChronoRing';
import { PublicNav } from './Landing';

/** /join/:code — the page an invitation link opens. Works signed in or out. */
export default function Invite() {
  const { code = '' } = useParams();
  const { user, lookupInvite, joinProject, myProjects, notify } = useApp();
  const { t, te, tm, range } = useI18n();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading' }); // loading | ok | error
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;
    lookupInvite(code)
      .then(({ invite }) => live && setState({ status: 'ok', invite }))
      .catch((e) => live && setState({ status: 'error', message: te(e) }));
    return () => { live = false; };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const inv = state.invite;
  const member = inv && user?.role === 'developer' && myProjects.find((p) => p.id === inv.projectId);
  const join = async () => {
    setBusy(true);
    const res = await joinProject(inv.code);
    setBusy(false);
    if (res.error) return setErr(tm(res.error));
    notify(t('join.joined', { name: res.project.name }));
    navigate(`/developer/projects?project=${res.project.id}`, { replace: true });
  };

  let body;
  if (state.status === 'loading') {
    body = <div className="grid place-items-center py-16" role="status"><Loader2 size={22} className="animate-spin text-muted" aria-hidden /><span className="sr-only">{t('common.loading')}</span></div>;
  } else if (state.status === 'error') {
    body = (
      <div className="text-center">
        <Illustration kind="key" className="mx-auto h-28 w-28" />
        <h1 className="mt-4 font-display text-2xl font-semibold">{t('invite.invalidTitle')}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{state.message}</p>
        <ButtonLink to={user ? `/${user.role}` : '/'} variant="secondary" className="mt-6">{user ? t('notFound.back') : t('invite.home')}</ButtonLink>
      </div>
    );
  } else {
    body = (
      <>
        <p className="eyebrow mb-3 flex items-center gap-2 !text-accent-fg"><KeyRound size={14} aria-hidden /> {t('invite.eyebrow')}</p>
        <h1 className="font-display text-2xl font-semibold leading-snug sm:text-3xl">{t('invite.title', { name: inv.projectName })}</h1>
        <p className="mt-2 text-sm text-muted">{t('invite.from', { name: inv.managerName })}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-line bg-canvas/40 p-4 text-sm">
          <span className="flex items-center gap-2 text-fg-2"><CalendarRange size={16} aria-hidden className="text-muted" /> <span className="tnum">{range(inv.startDate, inv.deadline)}</span></span>
          <span className="font-mono tracking-[.3em] text-fg" dir="ltr">{inv.code}</span>
        </div>
        {err && <p role="alert" className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent-fg">{err}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          {!user && (
            <>
              <ButtonLink to={`/register?invite=${inv.code}`} size="lg">{t('invite.createAccount')} <ArrowRight size={16} aria-hidden className="rtl:-scale-x-100" /></ButtonLink>
              <ButtonLink to={`/login?invite=${inv.code}&next=${encodeURIComponent(`/join/${inv.code}`)}`} size="lg" variant="secondary">{t('invite.haveAccount')}</ButtonLink>
            </>
          )}
          {user?.role === 'developer' && (member ? (
            <ButtonLink to={`/developer/projects?project=${member.id}`} size="lg">{t('invite.alreadyMember')} <ArrowRight size={16} aria-hidden className="rtl:-scale-x-100" /></ButtonLink>
          ) : (
            <Button size="lg" onClick={join} loading={busy}>{t('invite.join')} <ArrowRight size={16} aria-hidden className="rtl:-scale-x-100" /></Button>
          ))}
          {user?.role === 'manager' && (
            <div className="space-y-3">
              <p className="text-sm text-muted">{t('invite.managerNote')}</p>
              <ButtonLink to="/manager" variant="secondary">{t('notFound.back')}</ButtonLink>
            </div>
          )}
        </div>
        {user && <p className="mt-6 text-xs text-muted">{t('invite.signedInAs', { name: user.name, role: t(`roles.${user.role}`) })}</p>}
      </>
    );
  }

  return (
    <div className="min-h-dvh">
      <PublicNav links={false} />
      <main className="mx-auto flex max-w-xl items-center px-4 py-16 sm:px-6">
        <section className="notch anim-page relative w-full overflow-hidden p-6 sm:p-10">
          <div aria-hidden className="pointer-events-none absolute -end-20 -top-20 opacity-60"><ChronoRing size={160} /></div>
          <div className="relative">{body}</div>
        </section>
      </main>
    </div>
  );
}
