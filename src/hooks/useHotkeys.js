import { useEffect, useRef } from 'react';

const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** map: { 'mod+k': fn, '/': fn, 'g d': fn } — sequences separated by a space. */
export function useHotkeys(map, enabled = true) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    if (!enabled) return;
    let pending = null, timer;
    const onKey = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const combo = `${e.ctrlKey || e.metaKey ? 'mod+' : ''}${e.altKey ? 'alt+' : ''}${k}`;
      const m = ref.current;
      if (m[combo] && (combo.startsWith('mod+') || !typing(e.target))) { e.preventDefault(); m[combo](e); pending = null; return; }
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (pending && m[`${pending} ${k}`]) { e.preventDefault(); m[`${pending} ${k}`](e); pending = null; return; }
      if (Object.keys(m).some((x) => x.startsWith(`${k} `))) { pending = k; clearTimeout(timer); timer = setTimeout(() => (pending = null), 900); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(timer); };
  }, [enabled]);
}
