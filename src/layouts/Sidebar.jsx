import { NavLink, useLocation } from 'react-router-dom';
import { ChevronsLeft, KeyRound, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { Wordmark } from '../components/brand/ChronoRing';
import { Avatar, cx } from '../components/ui';
import { NAV, href } from './nav';

export function NavList({ collapsed, onNavigate }) {
  const { user } = useApp();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const items = NAV[user.role];
  const activeIdx = items.findIndex((n) => (n.path ? pathname.startsWith(href(user.role, n.path)) : pathname === href(user.role, '')));
  return (
    <nav aria-label={t('nav.main')} className="relative">
      {activeIdx >= 0 && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-10 rounded-md bg-gradient-to-r from-accent/[.14] via-accent/[.05] to-transparent transition-transform duration-300 ease-out rtl:bg-gradient-to-l"
          style={{ transform: `translateY(${activeIdx * 44}px)` }}
        >
          <span className="glow-line absolute inset-y-2 start-0 w-0.5 rounded-full" />
        </span>
      )}
      <ul className="relative space-y-1">
        {items.map((n) => (
          <li key={n.key}>
            <NavLink
              to={href(user.role, n.path)}
              end={!n.path}
              onClick={onNavigate}
              title={collapsed ? t(`nav.${n.key}`) : undefined}
              className={({ isActive }) =>
                cx(
                  'group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors duration-150',
                  isActive ? 'text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg',
                  collapsed && 'justify-center px-0'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <n.icon size={19} strokeWidth={1.75} aria-hidden className={cx('shrink-0 transition-colors', isActive ? 'text-accent-fg' : 'group-hover:text-fg-2')} />
                  <span className={cx('truncate', collapsed && 'sr-only')}>{t(`nav.${n.key}`)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useApp();
  const { t } = useI18n();
  return (
    <aside
      className={cx(
        'sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-e border-line bg-sidebar/85 backdrop-blur-xl transition-[width] duration-300 ease-out md:flex',
        collapsed ? 'w-[76px]' : 'w-[264px]'
      )}
    >
      <div className={cx('flex h-16 items-center border-b border-line/70', collapsed ? 'justify-center px-2' : 'px-5')}>
        <Wordmark collapsed={collapsed} />
      </div>
      <div className={cx('flex-1 overflow-y-auto py-5', collapsed ? 'px-3' : 'px-4')}>
        {!collapsed && <p className="eyebrow mb-3 px-3">{t(`roles.${user.role}`)}</p>}
        <NavList collapsed={collapsed} />
        {user.role === 'developer' && (
          <NavLink
            to="/developer/join"
            title={collapsed ? t('nav.join') : undefined}
            className={({ isActive }) =>
              cx(
                'spot relative mt-6 flex h-11 items-center gap-3 overflow-hidden rounded-md border border-dashed px-3 text-sm font-medium transition-colors',
                isActive ? 'border-accent/70 text-fg' : 'border-line-strong text-fg-2 hover:border-accent/60 hover:text-fg',
                collapsed && 'justify-center px-0'
              )
            }
          >
            <KeyRound size={18} className="shrink-0 text-accent-fg" aria-hidden />
            <span className={cx(collapsed && 'sr-only')}>{t('nav.join')}</span>
          </NavLink>
        )}
      </div>
      <div className={cx('border-t border-line/70 p-3', collapsed && 'flex flex-col items-center gap-2')}>
        {!collapsed && (
          <div className="mb-2 flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar id={user.id} name={user.name} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{user.name}</p>
              <p className="truncate text-xs text-muted">{t(`roles.${user.role}`)}</p>
            </div>
            <button type="button" onClick={logout} aria-label={t('nav.logout')} title={t('nav.logout')} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-raised hover:text-accent-fg">
              <LogOut size={16} className="rtl:-scale-x-100" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          aria-expanded={!collapsed}
          className={cx('flex h-9 items-center gap-2 rounded-md px-3 text-xs text-muted transition-colors hover:bg-raised hover:text-fg', collapsed ? 'w-10 justify-center px-0' : 'w-full')}
        >
          <ChevronsLeft size={16} aria-hidden className={cx('transition-transform duration-300', collapsed && 'rotate-180', 'rtl:-scale-x-100')} />
          {!collapsed && t('nav.collapse')}
        </button>
      </div>
    </aside>
  );
}
