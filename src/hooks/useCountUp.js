import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useMediaQuery';

export function useCountUp(target, ms = 650) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? target : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce || typeof requestAnimationFrame === 'undefined') { setV(target); return; }
    const start = performance.now(), a = from.current;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(a + (target - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduce]);
  return v;
}
