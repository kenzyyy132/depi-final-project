import { useEffect, useState } from 'react';

export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [query]);
  return matches;
}
export const useIsMobile = () => !useMediaQuery('(min-width: 768px)');
export const useReducedMotion = () => {
  const sys = useMediaQuery('(prefers-reduced-motion: reduce)');
  const attr = typeof document !== 'undefined' ? document.documentElement.dataset.motion : undefined;
  return attr === 'reduce' || (sys && attr !== 'full');
};
