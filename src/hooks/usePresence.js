import { useEffect, useState } from 'react';

// Keeps an element mounted long enough to play its exit animation.
export function usePresence(open, ms = 200) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return; }
    if (!mounted) return;
    setClosing(true);
    const id = setTimeout(() => { setMounted(false); setClosing(false); }, ms);
    return () => clearTimeout(id);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return { mounted, closing };
}
