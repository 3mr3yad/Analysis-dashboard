import { useLayoutEffect, useRef } from "react";
import { fmtInt } from "../lib/format";
import { useMotionPref } from "../state/prefs";

const DURATION_MS = 1100;
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/**
 * A number that counts from its previous value to the new one (from 0 on first show).
 * Writes straight to the DOM each frame, so counting never re-renders the page. Jumps
 * instantly when effects are off or the system asks for reduced motion.
 */
export function CountUp({ value, format = fmtInt, className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const effects = useMotionPref();

  // Layout effect: starts the count before paint, so the final number never flashes first.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = shown.current;
    const still = effects === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || from === value || !Number.isFinite(value)) {
      shown.current = value;
      el.textContent = format(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = easeOutExpo((now - start) / DURATION_MS);
      shown.current = from + (value - from) * p;
      el.textContent = format(p >= 1 ? value : shown.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, format, effects]);

  // The text is owned by the effect above (set before first paint); React never renders it, so the two never fight.
  return <span ref={ref} className={className} />;
}
