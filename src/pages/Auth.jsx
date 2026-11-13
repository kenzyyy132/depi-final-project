import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Code2, Eye, EyeOff, KeyRound, Languages, MailCheck, Moon, Sun, Terminal, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeProvider';
import { Button, ButtonLink, Field, IconButton, cx } from '../components/ui';
import { API } from '../api/client';
import { ChronoRing, Wordmark } from '../components/brand/ChronoRing';

function Scene() {
  const { t, weekday } = useI18n();
  const today = new Date().getDay();
  const rows = [
    [0, 3, 'a'], [1, 4, 'b'], [2, 2, 'c'], [3, 3, 'b'], [4, 2, 'a'],
  ];
  return (
    <div className="relative hidden overflow-hidden border-e border-line bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div aria-hidden className="pointer-events-none absolute -end-40 -top-40 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgb(var(--glow)/.18),transparent_60%)]" />
      <Link to="/" className="w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={t('brand.full')}><Wordmark /></Link>
      <div className="relative">
        <div className="relative mb-10 grid h-56 w-56 place-items-center">
          <span aria-hidden className="absolute inset-0 rounded-full border border-line/80" />
          <span aria-hidden className="absolute inset-6 rounded-full border border-dashed border-line" />
          <ChronoRing size={150} animate />
        </div>
        <h1 className="max-w-md font-display text-4xl font-semibold leading-[1.15] text-fg">{t('auth.heroTitle')}</h1>
        <p className="mt-4 max-w-md text-[15px] leading-7 text-muted">{t('auth.heroText')}</p>
      </div>
      <div aria-hidden className="relative rounded-lg border border-line bg-surface/50 p-4">
        <div className="mb-3 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className={cx('text-center text-2xs', i === today ? 'font-semibold text-accent-fg' : 'text-muted')}>{weekday(i, 'narrow')}</span>
          ))}
        </div>
        <div className="relative space-y-2">
          <span className="glow-line absolute -bottom-1 -top-1 z-10 w-px" style={{ insetInlineStart: `${((today + 0.5) / 7) * 100}%` }} />
          {rows.map(([s, len, tone], i) => (
            <div key={i} className="grid grid-cols-7 gap-1">
              <span
                className={cx('anim-grow-x h-2.5 rounded-full', tone === 'a' ? 'bg-accent/80' : tone === 'b' ? 'bg-line-strong' : 'bg-fg-2/40')}
                style={{ gridColumn: `${s + 1} / span ${len}`, '--i': i + 4 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuthShell({ title, subtitle, children, foot, eyebrow }) {
  const { t, lang, setLang } = useI18n();
  const { resolved, toggle } = useTheme();
  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <Scene />
      <div className="relative flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link to="/" className="rounded-md lg:invisible" aria-label={t('brand.full')}><Wordmark /></Link>
          <div className="flex items-center gap-1">
            <Button variant="quiet" size="sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} lang={lang === 'ar' ? 'en' : 'ar'}>
              <Languages size={15} aria-hidden /> {lang === 'ar' ? 'English' : 'العربية'}
            </Button>
            <IconButton label={resolved === 'dark' ? t('theme.toLight') : t('theme.toDark')} onClick={toggle}>
              {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </IconButton>
          </div>
        </div>
        <main className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
          <div className="anim-page w-full max-w-[420px]">
            <p className="eyebrow mb-3">{eyebrow || t('auth.eyebrow')}</p>
            <h2 className="font-display text-3xl font-semibold text-fg">{title}</h2>
            <p className="mb-8 mt-2 text-sm text-muted">{subtitle}</p>
            {children}
            <p className="mt-8 text-sm text-muted">{foot}</p>
          </div>
        </main>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, error, autoComplete, hint, autoFocus }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <Field
      type={show ? 'text' : 'password'}
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      hint={hint}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      trailing={
        <IconButton size="sm" label={show ? t('auth.hidePassword') : t('auth.showPassword')} onClick={() => setShow(!show)} aria-pressed={show}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </IconButton>
      }
    />
  );
}

/** Where to go after signing in: a safe in-app path for this role, else the dashboard. */
export const afterLogin = (user, next) => {
  if (!user.onboardedAt) return '/welcome';
  const safe = next && !next.startsWith('//') && (next.startsWith(`/${user.role}`) || next.startsWith('/join/'));
  return safe ? next : `/${user.role}`;
};

export function Login() {
  const { user, login, sessionNotice } = useApp();
  const { t, tm } = useI18n();
  const [params] = useSearchParams();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={afterLogin(user, params.get('next'))} replace />;
  const submit = async (e) => {
    e.preventDefault();
    if (!f.email.trim() || !f.password) return setErr(t('auth.enterBoth'));
    setBusy(true);
    const msg = await login(f.email, f.password);
    setBusy(false);
    setErr(msg ? tm(msg) : '');
  };
  const reason = sessionNotice === 'expired' ? t('auth.sessionExpired') : params.get('reset') === '1' ? t('auth.resetDone') : '';
  return (
    <AuthShell title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}
      foot={<>{t('auth.noAccount')} <Link className="font-medium text-accent-fg underline-offset-4 hover:underline" to={`/register${params.get('invite') ? `?invite=${encodeURIComponent(params.get('invite'))}` : ''}`}>{t('auth.register')}</Link></>}>
      {reason && (
        <p role="status" className="anim-fade mb-5 flex items-start gap-2 rounded-md border border-line-strong bg-raised px-3 py-2.5 text-sm text-fg-2">
          <Clock size={16} className="mt-0.5 shrink-0 text-accent-fg" aria-hidden /> {reason}
        </p>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field type="email" label={t('auth.email')} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" autoFocus />
        <div>
          <PasswordField label={t('auth.password')} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" />
          <div className="mt-2 text-end">
            <Link to="/forgot-password" className="text-xs font-medium text-fg-2 underline-offset-4 hover:text-accent-fg hover:underline">{t('auth.forgot')}</Link>
          </div>
        </div>
        {err && <p role="alert" className="anim-fade rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent-fg">{err}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>{t('auth.login')} <ArrowRight size={16} aria-hidden className="rtl:-scale-x-100" /></Button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { user, register, serverConfig } = useApp();
  const { t, tm } = useI18n();
  const [params] = useSearchParams();
  const invite = params.get('invite') || '';
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', role: invite ? 'developer' : params.get('role') === 'manager' ? 'manager' : 'developer' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const min = serverConfig.passwordMin || 8;
  if (user) return <Navigate to={`/welcome${invite && user.role === 'developer' ? `?invite=${encodeURIComponent(invite)}` : ''}`} replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = t('errors.nameRequired');
    if (!f.email.trim()) er.email = t('errors.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) er.email = t('errors.emailInvalid');
    if (f.password.length < min) er.password = t('errors.passwordShort', { min });
    if (f.confirm !== f.password) er.confirm = t('errors.passwordMismatch');
    if (!Object.keys(er).length) {
      setBusy(true);
      const msg = await register(f);
      setBusy(false);
      if (msg) er.email = tm(msg);
    }
    setErrs(er);
    if (Object.keys(er).length) requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
  };
  const roles = [
    { value: 'developer', icon: Code2, label: t('roles.developer'), text: t('auth.roleDevText') },
    { value: 'manager', icon: Users, label: t('roles.manager'), text: t('auth.roleManagerText') },
  ];
  return (
    <AuthShell title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}
      foot={<>{t('auth.haveAccount')} <Link className="font-medium text-accent-fg underline-offset-4 hover:underline" to={invite ? `/login?invite=${encodeURIComponent(invite)}&next=${encodeURIComponent(`/join/${invite}`)}` : '/login'}>{t('auth.login')}</Link></>}>
      {invite && (
        <p role="status" className="mb-5 flex items-start gap-2 rounded-md border border-accent/40 bg-accent/[.07] px-3 py-2.5 text-sm text-fg-2">
          <KeyRound size={16} className="mt-0.5 shrink-0 text-accent-fg" aria-hidden /> {t('auth.inviteNotice', { code: invite.toUpperCase() })}
        </p>
      )}
      <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-fg-2">{t('auth.role')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((r) => (
              <label key={r.value}
                className={cx('spot relative cursor-pointer rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent',
                  f.role === r.value ? 'border-accent/70 bg-accent/[.07] shadow-[0_0_24px_-12px_rgb(var(--glow))]' : 'border-line bg-surface hover:border-line-strong')}>
                <input type="radio" name="role" value={r.value} checked={f.role === r.value} onChange={set('role')} className="sr-only" />
                <r.icon size={18} aria-hidden className={f.role === r.value ? 'text-accent-fg' : 'text-muted'} />
                <span className="mt-2 block text-sm font-semibold text-fg">{r.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">{r.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={t('auth.fullName')} value={f.name} onChange={set('name')} error={errs.name} autoComplete="name" />
        <Field type="email" label={t('auth.email')} value={f.email} onChange={set('email')} error={errs.email} autoComplete="email" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PasswordField label={t('auth.password')} value={f.password} onChange={set('password')} error={errs.password} autoComplete="new-password" hint={t('auth.passwordHint', { min })} />
          <PasswordField label={t('auth.confirmPassword')} value={f.confirm} onChange={set('confirm')} error={errs.confirm} autoComplete="new-password" />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>{t('auth.createAccount')} <ArrowRight size={16} aria-hidden className="rtl:-scale-x-100" /></Button>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const { serverConfig } = useApp();
  const { t, te } = useI18n();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null); // delivery mode reported by the server
  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setErr(t('errors.emailRequired'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr(t('errors.emailInvalid'));
    setBusy(true);
    try {
      const res = await API.forgot(email.trim());
      setErr('');
      setSent(res.delivery);
    } catch (e2) {
      setErr(te(e2));
    } finally {
      setBusy(false);
    }
  };
  const back = <Link className="inline-flex items-center gap-1.5 font-medium text-accent-fg underline-offset-4 hover:underline" to="/login"><ArrowLeft size={14} aria-hidden className="rtl:-scale-x-100" /> {t('auth.backToLogin')}</Link>;

  if (serverConfig.mail === 'off')
    return (
      <AuthShell eyebrow={t('auth.recovery')} title={t('auth.forgotTitle')} subtitle={t('auth.mailOff')} foot={back}>
        <p className="rounded-md border border-line-strong bg-raised px-3 py-3 text-sm leading-6 text-fg-2">{t('auth.mailOffHelp')}</p>
      </AuthShell>
    );
  if (sent)
    return (
      <AuthShell eyebrow={t('auth.recovery')} title={t('auth.checkEmail')} subtitle={t('auth.checkEmailText', { email: email.trim() })} foot={back}>
        <div className="anim-pop flex items-start gap-3 rounded-lg border border-line bg-surface p-4 text-sm leading-6 text-fg-2" role="status">
          {sent === 'console' ? <Terminal size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden /> : <MailCheck size={18} className="mt-0.5 shrink-0 text-ok" aria-hidden />}
          <span>{sent === 'console' ? t('auth.devMail') : t('auth.linkExpires')}</span>
        </div>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => setSent(null)}>{t('auth.tryOtherEmail')}</Button>
      </AuthShell>
    );
  return (
    <AuthShell eyebrow={t('auth.recovery')} title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')} foot={back}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field type="email" label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} error={err} autoComplete="email" autoFocus />
        <Button type="submit" size="lg" className="w-full" loading={busy}>{t('auth.sendLink')} <ArrowRight size={16} aria-hidden className="rtl:-scale-x-100" /></Button>
      </form>
    </AuthShell>
  );
}

export function ResetPassword() {
  const { user, resetPassword, serverConfig } = useApp();
  const { t, te } = useI18n();
  const [params, setParams] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const [f, setF] = useState({ password: '', confirm: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const min = serverConfig.passwordMin || 8;
  // Remove the token from the address bar (and from history) as soon as we've read it.
  useEffect(() => { if (params.get('token')) setParams({}, { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const back = <Link className="inline-flex items-center gap-1.5 font-medium text-accent-fg underline-offset-4 hover:underline" to="/login"><ArrowLeft size={14} aria-hidden className="rtl:-scale-x-100" /> {t('auth.backToLogin')}</Link>;
  if (done && user)
    return (
      <AuthShell eyebrow={t('auth.recovery')} title={t('auth.resetDoneTitle')} subtitle={t('auth.resetDoneText')}>
        <div className="anim-pop mb-6 flex items-center gap-3 text-ok"><CheckCircle2 size={22} aria-hidden /> <span className="text-sm text-fg-2">{t('auth.signedInAs', { name: user.name })}</span></div>
        <ButtonLink to={afterLogin(user)} size="lg" className="w-full">{t('auth.continue')} <ArrowRight size={16} aria-hidden className="rtl:-scale-x-100" /></ButtonLink>
      </AuthShell>
    );
  if (!token)
    return (
      <AuthShell eyebrow={t('auth.recovery')} title={t('auth.resetInvalidTitle')} subtitle={t('api.resetInvalid')} foot={back}>
        <ButtonLink to="/forgot-password" variant="secondary" className="w-full">{t('auth.requestNew')}</ButtonLink>
      </AuthShell>
    );
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.password.length < min) er.password = t('errors.passwordShort', { min });
    if (f.confirm !== f.password) er.confirm = t('errors.passwordMismatch');
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await resetPassword(token, f.password);
      setDone(true);
    } catch (e2) {
      setErrs({ form: te(e2), expired: e2.code === 'resetInvalid' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell eyebrow={t('auth.recovery')} title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')} foot={back}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <PasswordField label={t('settings.newPassword')} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={errs.password} autoComplete="new-password" hint={t('auth.passwordHint', { min })} autoFocus />
        <PasswordField label={t('auth.confirmPassword')} value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} error={errs.confirm} autoComplete="new-password" />
        {errs.form && (
          <div role="alert" className="anim-fade rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent-fg">
            {errs.form} {errs.expired && <Link to="/forgot-password" className="font-medium underline underline-offset-4">{t('auth.requestNew')}</Link>}
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>{t('auth.setPassword')}</Button>
      </form>
    </AuthShell>
  );
}
