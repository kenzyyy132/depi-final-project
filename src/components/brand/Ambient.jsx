import { useEffect } from 'react';

/** Fixed background layer (grid + slow red glow) and the delegated pointer listener that powers `.spot` cursor spotlights. */
export function Ambient() {
  useEffect(() => {
    let raf = 0, last;
    const onMove = (e) => {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = last.target instanceof Element ? last.target.closest('.spot') : null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${last.clientX - r.left}px`);
        el.style.setProperty('--my', `${last.clientY - r.top}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, []);
  return <div className="ambient" aria-hidden />;
}
