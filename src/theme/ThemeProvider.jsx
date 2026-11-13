import { createContext, useContext, useEffect, useMemo } from 'react';
import { PREF_KEYS, usePref } from '../utils/prefs';
import { useMediaQuery } from '../hooks/useMediaQuery';

const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = usePref(PREF_KEYS.theme, 'dark'); // 'dark' | 'light' | 'system'
  const [ui, setUi] = usePref(PREF_KEYS.ui, {});
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)');
  const resolved = theme === 'system' ? (prefersLight ? 'light' : 'dark') : theme === 'light' ? 'light' : 'dark';

  useEffect(() => {
    const d = document.documentElement;
    if (d.dataset.theme === resolved) return;
    d.classList.add('theme-switching');
    d.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#F3F4F6' : '#090A0D');
    const id = setTimeout(() => d.classList.remove('theme-switching'), 320);
    return () => clearTimeout(id);
  }, [resolved]);

  const motion = ui?.motion || 'system'; // 'system' | 'reduce' | 'full'
  useEffect(() => {
    const d = document.documentElement;
    if (motion === 'system') d.removeAttribute('data-motion');
    else d.dataset.motion = motion;
  }, [motion]);

  const value = useMemo(
    () => ({
      theme, resolved, setTheme,
      toggle: () => setTheme(resolved === 'dark' ? 'light' : 'dark'),
      ui: ui || {},
      setUi: (patch) => setUi((u) => ({ ...(u || {}), ...patch })),
    }),
    [theme, resolved, setTheme, ui, setUi]
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
