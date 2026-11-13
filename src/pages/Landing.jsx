import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, BarChart3, Bell, CalendarRange, Code2, Command, KanbanSquare, KeyRound, Languages, Lock, Menu as MenuIcon,
  Moon, ShieldCheck, Sun, Users, X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeProvider';
import { Button, ButtonLink, IconButton, Segmented, cx } from '../components/ui';
import { ChronoRing, Wordmark } from '../components/brand/ChronoRing';

/** Top bar shared by the public pages (landing, invitation). */
export function PublicNav({ links = true }) {
  const { t, lang, setLang } = useI18n();
  const { resolved, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const items = [['#features', t('landing.navFeatures')], ['#how', t('landing.navHow')], ['#security', t('landing.navSecurity')]];
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={t('brand.full')}><Wordmark /></Link>
        {links && (
          <nav aria-label={t('landing.navLabel')} className="ms-6 hidden items-center gap-1 md:flex">
            {items.map(([href, label]) => (
              <a key={href} href={href} className="rounded-md px-3 py-2 text-sm text-fg-2 transition-colors hover:bg-raised hover:text-fg">{label}</a>
            ))}
          </nav>
        )}
        <div className="ms-auto flex items-center gap-1">
          <Button variant="quiet" size="sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} lang={lang === 'ar' ? 'en' : 'ar'} className="hidden sm:inline-flex">
            <Languages size={15} aria-hidden /> {lang === 'ar' ? 'English' : 'العربية'}
          </Button>
          <IconButton label={resolved === 'dark' ? t('theme.toLight') : t('theme.toDark')} onClick={toggle}>
            {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
          <ButtonLink to="/login" variant="quiet" size="sm" className="hidden sm:inline-flex">{t('auth.login')}</ButtonLink>
          <ButtonLink to="/register" size="sm">{t('landing.ctaShort')}</ButtonLink>
          {links && (
            <IconButton className="md:hidden" label={open ? t('common.close') : t('landing.openMenu')} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="public-menu">
              {open ? <X size={18} /> : <MenuIcon size={18} />}
            </IconButton>
          )}
        </div>
      </div>
      {links && open && (
        <nav id="public-menu" aria-label={t('landing.navLabel')} className="anim-fade border-t border-line px-4 py-3 md:hidden">
          {items.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2.5 text-sm text-fg-2 hover:bg-raised">{label}</a>
          ))}
          <div className="mt-2 flex gap-2 border-t border-line pt-3">
            <ButtonLink to="/login" variant="secondary" size="sm" className="flex-1">{t('auth.login')}</ButtonLink>
            <Button variant="quiet" size="sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} lang={lang === 'ar' ? 'en' : 'ar'}>
              <Languages size={15} aria-hidden /> {lang === 'ar' ? 'English' : 'العربية'}
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}

/** Product illustration for the hero: an example week on the timeline. Purely illustrative (aria-hidden). */
function HeroVisual() {
  const { t, weekday } = useI18n();
  const today = new Date().getDay();
  const lanes = [
    { who: 'A', bars: [[0, 3, 'solid'], [4, 2, 'muted']] },
    { who: 'B', bars: [[1, 3, 'muted'], [2, 3, 'conflict']] },
    { who: 'C', bars: [[3, 4, 'solid']] },
    { who: 'D', bars: [[0, 2, 'muted'], [5, 2, 'muted']] },
  ];
  const tone = { solid: 'bg-accent/85', muted: 'bg-line-strong', conflict: 'hatch bg-warn/25 ring-1 ring-inset ring-warn/70' };
  return (
    <div aria-hidden className="notch relative overflow-hidden p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="eyebrow">{t('landing.visualLabel')}</span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-warn/50 bg-warn/10 px-2.5 py-1 text-2xs font-medium text-warn">
          <AlertTriangle size={12} /> {t('landing.visualConflict')}
        </span>
      </div>
      <div className="flex gap-3">
        <div className="w-7 shrink-0 pt-6">
          {lanes.map((lane) => (
            <span key={lane.who} className="grid h-9 place-items-center"><span className="grid h-6 w-6 place-items-center rounded-full bg-raised text-2xs font-semibold text-fg-2">{lane.who}</span></span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="mb-2 grid h-4 grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className={cx('text-center text-2xs', i === today ? 'font-semibold text-accent-fg' : 'text-muted')}>{weekday(i, 'short')}</span>
            ))}
          </div>
          {lanes.map((lane, li) => (
            <div key={lane.who} className="relative h-9 border-t border-line/60">
              {lane.bars.map(([s, len, k], bi) => (
                <span key={bi} className={cx('anim-grow-x absolute h-5 rounded-md', tone[k])}
                  style={{ insetInlineStart: `calc(${(s / 7) * 100}% + 2px)`, width: `calc(${(len / 7) * 100}% - 4px)`, top: k === 'conflict' ? 14 : 8, '--i': li * 2 + bi + 3 }} />
              ))}
            </div>
          ))}
          <span className="glow-line absolute bottom-0 top-5 w-px" style={{ insetInlineStart: `${((today + 0.5) / 7) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, text, i }) {
  return (
    <div className="spot panel anim-in group p-5" style={{ '--i': i }}>
      <span className="mb-4 grid h-9 w-9 place-items-center rounded-md border border-line bg-canvas/60 text-accent-fg transition-colors group-hover:border-accent/50">
        <Icon size={18} aria-hidden />
      </span>
      <h3 className="font-display text-[15px] font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}

function Steps({ steps }) {
  return (
    <ol className="relative space-y-6 border-s border-line ps-6">
      {steps.map(([title, text], i) => (
        <li key={i} className="anim-in relative" style={{ '--i': i }}>
          <span className="absolute -start-[37px] top-0 grid h-6 w-6 place-items-center rounded-full border border-line-strong bg-surface font-mono text-2xs text-fg-2 tnum">{i + 1}</span>
          <h3 className="font-display text-base font-semibold text-fg">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
        </li>
      ))}
    </ol>
  );
}

export default function Landing() {
  const { user } = useApp();
  const { t } = useI18n();
  const [role, setRole] = useState('manager');
  if (user) return <Navigate to={`/${user.role}`} replace />;

  const features = [
    [AlertTriangle, 'conflicts'], [CalendarRange, 'timeline'], [KanbanSquare, 'kanban'],
    [KeyRound, 'join'], [BarChart3, 'reports'], [Bell, 'notifications'], [Command, 'command'], [Languages, 'languages'],
  ];
  const steps = {
    manager: [1, 2, 3, 4].map((n) => [t(`landing.m${n}Title`), t(`landing.m${n}Text`)]),
    developer: [1, 2, 3, 4].map((n) => [t(`landing.d${n}Title`), t(`landing.d${n}Text`)]),
  };

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent">{t('nav.skip')}</a>
      <PublicNav />
      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -end-40 -top-40 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgb(var(--glow)/.16),transparent_62%)]" />
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pb-28 lg:pt-24">
            <div className="anim-page">
              <p className="eyebrow mb-4 flex items-center gap-2 !text-accent-fg"><ChronoRing size={18} /> {t('landing.eyebrow')}</p>
              <h1 className="font-display text-4xl font-semibold leading-[1.08] text-fg sm:text-5xl lg:text-[56px]">{t('landing.title')}</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-fg-2 sm:text-lg">{t('landing.subtitle')}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to="/register" size="lg">{t('landing.cta')} <ArrowRight size={16} aria-hidden className="rtl:-scale-x-100" /></ButtonLink>
                <ButtonLink to="/login" size="lg" variant="secondary">{t('landing.haveAccount')}</ButtonLink>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                {['p1', 'p2', 'p3'].map((k) => (
                  <li key={k} className="flex items-center gap-2"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" /> {t(`landing.${k}`)}</li>
                ))}
              </ul>
            </div>
            <div className="anim-in" style={{ '--i': 2 }}><HeroVisual /></div>
          </div>
        </section>

        {/* Problem → answer */}
        <section className="border-y border-line bg-sidebar/60">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
            {['q1', 'q2', 'q3'].map((k, i) => (
              <div key={k} className="anim-in" style={{ '--i': i }}>
                <p className="font-mono text-xs text-accent-fg tnum">0{i + 1}</p>
                <h2 className="mt-2 font-display text-lg font-semibold text-fg">{t(`landing.${k}Title`)}</h2>
                <p className="mt-1.5 text-sm leading-6 text-muted">{t(`landing.${k}Text`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <p className="eyebrow mb-3">{t('landing.featuresEyebrow')}</p>
          <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight text-fg sm:text-4xl">{t('landing.featuresTitle')}</h2>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(([icon, k], i) => <Feature key={k} icon={icon} title={t(`landing.f.${k}.title`)} text={t(`landing.f.${k}.text`)} i={i} />)}
          </div>
        </section>

        {/* How it works, per role */}
        <section id="how" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <p className="eyebrow mb-3">{t('landing.howEyebrow')}</p>
              <h2 className="font-display text-3xl font-semibold leading-tight text-fg sm:text-4xl">{t('landing.howTitle')}</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted">{t('landing.howText')}</p>
              <Segmented className="mt-6" label={t('auth.role')} value={role} onChange={setRole} options={[
                { value: 'manager', label: t('roles.manager'), icon: Users }, { value: 'developer', label: t('roles.developer'), icon: Code2 },
              ]} />
            </div>
            <div className="panel p-6 sm:p-8" key={role}>
              <Steps steps={steps[role]} />
              <ButtonLink to={`/register?role=${role}`} className="mt-8" variant="secondary">
                {t(role === 'manager' ? 'landing.startManager' : 'landing.startDeveloper')} <ArrowRight size={15} aria-hidden className="rtl:-scale-x-100" />
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="scroll-mt-20 border-t border-line bg-sidebar/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <p className="eyebrow mb-3">{t('landing.securityEyebrow')}</p>
            <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight text-fg">{t('landing.securityTitle')}</h2>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[[Lock, 's1'], [ShieldCheck, 's2'], [Users, 's3']].map(([Icon, k]) => (
                <div key={k} className="flex gap-4">
                  <Icon size={20} className="mt-0.5 shrink-0 text-accent-fg" aria-hidden />
                  <div>
                    <h3 className="font-display text-[15px] font-semibold text-fg">{t(`landing.${k}Title`)}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{t(`landing.${k}Text`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="notch relative overflow-hidden p-8 text-center sm:p-14">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(var(--glow)/.2),transparent_65%)]" />
            <div className="relative mx-auto mb-6 w-fit"><ChronoRing size={64} animate /></div>
            <h2 className="relative font-display text-3xl font-semibold text-fg sm:text-4xl">{t('landing.finalTitle')}</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">{t('landing.finalText')}</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink to="/register?role=manager" size="lg">{t('landing.startManager')}</ButtonLink>
              <ButtonLink to="/register?role=developer" size="lg" variant="secondary">{t('landing.startDeveloper')}</ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Wordmark />
          <nav aria-label={t('landing.footerNav')} className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="#features" className="hover:text-fg">{t('landing.navFeatures')}</a>
            <a href="#how" className="hover:text-fg">{t('landing.navHow')}</a>
            <Link to="/login" className="hover:text-fg">{t('auth.login')}</Link>
            <Link to="/register" className="hover:text-fg">{t('auth.register')}</Link>
          </nav>
          <p className="tnum">© {new Date().getFullYear()} {t('brand.full')}</p>
        </div>
      </footer>
    </div>
  );
}
