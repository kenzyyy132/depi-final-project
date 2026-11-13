import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { PREF_KEYS, usePref } from '../utils/prefs';
import en from './en';
import ar from './ar';
import { makeFormatters } from './format';

const DICTS = { en, ar };
const I18nCtx = createContext(null);
export const useI18n = () => useContext(I18nCtx);
export const useT = () => useContext(I18nCtx).t;

const lookup = (dict, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), dict);

// Original English messages (still returned verbatim by the API for these cases) mapped to keys.
const MESSAGE_KEYS = {
  'An account with this email already exists.': 'errors.emailTaken',
  'Invalid email or password.': 'errors.badLogin',
  'Please enter a join code.': 'errors.codeEmpty',
  'Invalid join code. Check it and try again.': 'errors.codeInvalid',
  'You have already joined this project.': 'errors.codeDuplicate',
  Unknown: 'common.unknown',
};

export function I18nProvider({ children }) {
  const [lang, setLang] = usePref(PREF_KEYS.lang, 'en');
  const code = lang === 'ar' ? 'ar' : 'en';
  const dir = code === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const d = document.documentElement;
    d.lang = code;
    d.dir = dir;
  }, [code, dir]);

  const fmt = useMemo(() => makeFormatters(code), [code]);
  const plural = useMemo(() => new Intl.PluralRules(code === 'ar' ? 'ar' : 'en'), [code]);

  const t = useCallback(
    (key, vars) => {
      let s = lookup(DICTS[code], key);
      if (s === undefined) s = lookup(en, key);
      if (s && typeof s === 'object' && vars && typeof vars.count === 'number') {
        const cat = vars.count === 0 && s.zero ? 'zero' : plural.select(vars.count);
        s = s[cat] ?? s.other;
      }
      if (typeof s !== 'string') {
        if (import.meta.env.DEV) console.warn(`[i18n] missing key "${key}" (${code})`);
        return key;
      }
      return vars
        ? s.replace(/\{(\w+)\}/g, (_, k) => {
            const v = vars[k];
            if (v === undefined) return '';
            return typeof v === 'number' ? fmt.num(v) : String(v);
          })
        : s;
    },
    [code, plural, fmt]
  );

  // Translate a message string coming from the data layer (falls back to the original text).
  const tm = useCallback((msg) => (msg && MESSAGE_KEYS[msg] ? t(MESSAGE_KEYS[msg]) : msg), [t]);
  // Translate an API error: a known error code wins, then a known original message, then a generic text.
  const te = useCallback(
    (err) => {
      if (!err) return '';
      const key = err.code && `api.${err.code}`;
      if (key && typeof lookup(en, key) === 'string') return t(key);
      if (err.message && MESSAGE_KEYS[err.message]) return t(MESSAGE_KEYS[err.message]);
      return t('api.unknown');
    },
    [t]
  );
  const tStatus = useCallback((s) => t(`status.${s}`), [t]);
  const tPriority = useCallback((p) => t(`priority.${p}`), [t]);

  const value = useMemo(
    () => ({ lang: code, dir, isRTL: dir === 'rtl', setLang, t, tm, te, tStatus, tPriority, ...fmt }),
    [code, dir, setLang, t, tm, te, tStatus, tPriority, fmt]
  );
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}
