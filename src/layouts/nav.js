import { BarChart3, CalendarDays, FolderKanban, LayoutDashboard, ListChecks, Settings, Users } from 'lucide-react';

// Sidebar order is fixed by the approved brief. Every path below maps to a route in App.jsx.
export const NAV = {
  manager: [
    { path: '', key: 'dashboard', icon: LayoutDashboard, hotkey: 'd' },
    { path: 'projects', key: 'projects', icon: FolderKanban, hotkey: 'p' },
    { path: 'tasks', key: 'tasks', icon: ListChecks, hotkey: 't' },
    { path: 'calendar', key: 'calendar', icon: CalendarDays, hotkey: 'c' },
    { path: 'schedule', key: 'team', icon: Users, hotkey: 'm' },
    { path: 'reports', key: 'reports', icon: BarChart3, hotkey: 'r' },
    { path: 'settings', key: 'settings', icon: Settings, hotkey: 's' },
  ],
  developer: [
    { path: '', key: 'dashboard', icon: LayoutDashboard, hotkey: 'd' },
    { path: 'projects', key: 'projects', icon: FolderKanban, hotkey: 'p' },
    { path: 'tasks', key: 'tasks', icon: ListChecks, hotkey: 't' },
    { path: 'calendar', key: 'calendar', icon: CalendarDays, hotkey: 'c' },
    { path: 'team', key: 'team', icon: Users, hotkey: 'm' },
    { path: 'reports', key: 'reports', icon: BarChart3, hotkey: 'r' },
    { path: 'settings', key: 'settings', icon: Settings, hotkey: 's' },
  ],
};
export const MOBILE_TABS = ['', 'projects', 'tasks', 'calendar'];

export const href = (role, path) => `/${role}${path ? `/${path}` : ''}`;

/** Resolve the nav key for the current pathname (for titles and the active indicator). */
export function routeKey(pathname, role) {
  const seg = pathname.split('/').filter(Boolean).slice(1);
  if (seg[0] === 'projects' && seg[1]) return 'projectDetails';
  if (seg[0] === 'tasks' && seg[1]) return 'taskDetails';
  if (seg[0] === 'join') return 'join';
  return NAV[role].find((n) => n.path === (seg[0] || ''))?.key || 'dashboard';
}
