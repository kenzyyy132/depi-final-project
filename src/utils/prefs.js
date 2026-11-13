import { useCallback, useEffect, useState } from 'react';

// UI preferences live in their own keys and never touch the ss_users/ss_projects/ss_tasks/ss_session data keys.
export const PREF_KEYS = { theme: 'ss_theme', lang: 'ss_lang', ui: 'ss_ui', filters: 'ss_filters', seen: 'ss_notif_seen' };

export function readPref(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}
export function writePref(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep the in-memory value */
  }
}

export function usePref(key, fallback) {
  const [value, setValue] = useState(() => readPref(key, fallback));
  useEffect(() => writePref(key, value), [key, value]);
  return [value, setValue];
}

// Per-user slice of a shared preference object: { [userId]: value }.
export function useUserPref(key, userId, fallback) {
  const [all, setAll] = usePref(key, {});
  const value = (userId && all && all[userId]) ?? fallback;
  const set = useCallback(
    (next) => setAll((a) => ({ ...(a || {}), [userId]: typeof next === 'function' ? next((a && a[userId]) ?? fallback) : next })),
    [setAll, userId, fallback]
  );
  return [value, set];
}
