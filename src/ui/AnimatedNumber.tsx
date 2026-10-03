import { useEffect, useRef, useState } from 'react';

/** Rolls smoothly toward `value`; formatting supplied by caller. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);
  const target = useRef(value);

  useEffect(() => {
    target.current = value;
    if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = value;
      setDisplay(value);
      return;
    }
    let raf: number;
    const tick = () => {
      const c = current.current;
      const t = target.current;
      const next = Math.abs(t - c) < Math.max(1e-9, Math.abs(t) * 1e-4) ? t : c + (t - c) * 0.16;
      current.current = next;
      setDisplay(next);
      if (next !== t) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); current.current = value; setDisplay(value); } };
    document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', visibility); };
  }, [value]);

  return <span className="num">{format(display)}</span>;
}
