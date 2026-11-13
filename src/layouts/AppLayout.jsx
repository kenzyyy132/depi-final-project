import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Languages, LogOut, Moon, MoreHorizontal, Search, Settings, Sun, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar, Drawer, IconButton, Kbd, Menu, cx } from '../components/ui';
import { Wordmark } from '../components/brand/ChronoRing';
import { useHotkeys } from '../hooks/useHotkeys';
import { useMediaQuery } from '../hooks/useMediaQuery';
import Sidebar, { NavList } from './Sidebar';
import NotificationsButton from './Notifications';
import CommandPalette from './CommandPalette';
import { NAV, MOBILE_TABS, href, routeKey } from './nav';
import { RouteLoader } from './RouteLoader';

function ThemeToggle({ className }) {
  const { resolved, toggle } = useTheme();
  const { t } = useI18n();
  const dark = resolved === 'dark';
  return (
    <IconButton label={dark ? t('theme.toLight') : t('theme.toDark')} onClick={toggle} className={className}>
      <span className="relative block h-[19px] w-[19px]">
        <Sun size={19} strokeWidth={1.75} className={cx('absolute inset-0 transition-all duration-300', dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0')} />
        <Moon size={19} strokeWidth={1.75} className={cx('absolute inset-0 transition-all duration-300', dark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
      </span>
    </IconButton>
  );
}

function LangToggle({ className }) {
  const { lang, setLang } = useI18n();
  const toAr = lang !== 'ar';
  return (
    <button
      type="button"
      onClick={() => setLang(toAr ? 'ar' : 'en')}
      aria-label={toAr ? 'التبديل إلى العربية' : 'Switch to English'}
      title={toAr ? 'العربية' : 'English'}
      lang={toAr ? 'ar' : 'en'}
      className={cx('inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-fg-2 transition-colors hover:bg-raised hover:text-fg', className)}
    >
      <Languages size={17} strokeWidth={1.75} aria-hidden />
      <span className={toAr ? 'text-base leading-none' : 'font-mono text-xs'} style={toAr ? { fontFamily: "'Noto Kufi Arabic', sans-serif" } : undefined}>{toAr ? 'ع' : 'EN'}</span>
    </button>
  );
}

export default function AppLayout() {
  const { user, logout } = useApp();
  const { t, lang, setLang } = useI18n();
  const { ui, setUi, resolved, toggle } = useTheme();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const isLg = useMediaQuery('(min-width: 1024px)');
  const collapsed = ui.sidebarCollapsed ?? !isLg;
  const [palette, setPalette] = useState(false);
  const [more, setMore] = useState(false);
  const key = routeKey(pathname, user.role);
  const title = t(`nav.${key}`);

  useEffect(() => { document.title = `${title} · ${t('brand.full')}`; }, [title, t]);
  useEffect(() => { setMore(false); window.scrollTo?.(0, 0); }, [pathname]);

  const go = (k) => () => { const n = NAV[user.role].find((x) => x.key === k); if (n) nav(href(user.role, n.path)); };
  useHotkeys({
    'mod+k': () => setPalette(true),
    '/': () => setPalette(true),
    'g d': go('dashboard'), 'g p': go('projects'), 'g t': go('tasks'), 'g c': go('calendar'),
    'g m': go('team'), 'g r': go('reports'), 'g s': go('settings'),
    n: () => user.role === 'manager' && nav('/manager/tasks?new=1'),
  }, !palette);

  const profileItems = [
    { label: t('nav.settings'), icon: Settings, onSelect: () => nav(href(user.role, 'settings')) },
    { label: t('settings.editProfile'), icon: UserRound, onSelect: () => nav(`${href(user.role, 'settings')}#profile`) },
    { divider: true },
    { label: resolved === 'dark' ? t('theme.toLight') : t('theme.toDark'), icon: resolved === 'dark' ? Sun : Moon, onSelect: toggle },
    { label: lang === 'ar' ? 'English' : 'العربية', icon: Languages, onSelect: () => setLang(lang === 'ar' ? 'en' : 'ar') },
    { divider: true },
    { label: t('nav.logout'), icon: LogOut, onSelect: logout, danger: true },
  ];

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only z-70 rounded-md bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:start-4 focus:top-4">{t('nav.skip')}</a>
      <Sidebar collapsed={collapsed} onToggle={() => setUi({ sidebarCollapsed: !collapsed })} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/75 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-3 sm:px-5 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="md:hidden"><Wordmark collapsed /></span>
              <div className="min-w-0">
                <p className="eyebrow hidden truncate sm:block">{t(`roles.${user.role}`)}</p>
                <p className="truncate font-display text-[15px] font-semibold text-fg">{title}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPalette(true)}
              className="spot relative hidden h-10 w-[min(360px,32vw)] items-center gap-2.5 rounded-md border border-line bg-surface/60 px-3 text-sm text-faint transition-colors hover:border-line-strong hover:text-muted md:flex"
            >
              <Search size={16} aria-hidden />
              <span className="flex-1 truncate text-start">{t('cmd.placeholderShort')}</span>
              <Kbd>Ctrl</Kbd><Kbd>K</Kbd>
            </button>

            <div className="flex items-center gap-0.5 sm:gap-1">
              <IconButton label={t('cmd.title')} onClick={() => setPalette(true)} className="md:hidden"><Search size={19} strokeWidth={1.75} /></IconButton>
              <NotificationsButton />
              <LangToggle className="hidden sm:inline-flex" />
              <ThemeToggle className="hidden sm:inline-grid" />
              <Menu
                label={t('nav.profile')}
                items={profileItems}
                trigger={
                  <button type="button" aria-label={t('nav.profileOf', { name: user.name })} className="ms-1 flex items-center gap-2 rounded-full p-0.5 pe-0.5 transition-colors hover:bg-raised lg:pe-3">
                    <Avatar id={user.id} name={user.name} size={34} title="" />
                    <span className="hidden text-start leading-tight lg:block">
                      <span className="block max-w-[140px] truncate text-sm font-medium text-fg">{user.name}</span>
                      <span className="block text-2xs text-muted">{t(`roles.${user.role}`)}</span>
                    </span>
                  </button>
                }
              />
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-3 pb-28 pt-5 outline-none sm:px-5 md:pb-12 lg:px-8 lg:pt-8">
          <Suspense fallback={<RouteLoader />}>
            <div key={pathname} className="anim-page">
              <Outlet context={{ openPalette: () => setPalette(true) }} />
            </div>
          </Suspense>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label={t('nav.mobile')} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sidebar/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <ul className="grid grid-cols-5">
          {NAV[user.role].filter((n) => MOBILE_TABS.includes(n.path)).map((n) => (
            <li key={n.key}>
              <NavLink to={href(user.role, n.path)} end={!n.path}
                className={({ isActive }) => cx('relative flex h-16 flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors', isActive ? 'text-fg' : 'text-muted')}>
                {({ isActive }) => (
                  <>
                    {isActive && <span aria-hidden className="glow-line absolute top-0 h-0.5 w-8 rounded-full" />}
                    <n.icon size={20} strokeWidth={1.75} aria-hidden className={isActive ? 'text-accent-fg' : undefined} />
                    <span className="max-w-full truncate px-1">{t(`nav.${n.key}`)}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setMore(true)} aria-expanded={more} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-2xs font-medium text-muted">
              <MoreHorizontal size={20} aria-hidden /> <span>{t('nav.more')}</span>
            </button>
          </li>
        </ul>
      </nav>

      <Drawer open={more} onClose={() => setMore(false)} title={t('nav.menu')} side="start" width="max-w-[300px]">
        <NavList onNavigate={() => setMore(false)} />
        {user.role === 'developer' && (
          <NavLink to="/developer/join" className="mt-5 flex h-11 items-center gap-3 rounded-md border border-dashed border-line-strong px-3 text-sm font-medium text-fg-2">
            <KeyRound size={18} className="text-accent-fg" aria-hidden /> {t('nav.join')}
          </NavLink>
        )}
        <div className="mt-6 flex items-center gap-2 border-t border-line pt-4">
          <LangToggle />
          <ThemeToggle />
        </div>
      </Drawer>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
