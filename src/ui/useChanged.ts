import { useEffect, useState } from "react";

/**
 * True for `ms` after `value` changes — used to outline a number that just moved.
 * A change of `resetKey` (date range, filters) re-baselines silently, so only data changes highlight.
 */
export function useChanged(value: unknown, resetKey: unknown = null, ms = 2800) {
  const [prev, setPrev] = useState({ value, resetKey });
  const [stamp, setStamp] = useState(0);
  const [settled, setSettled] = useState(0);

  if (!Object.is(prev.value, value) || !Object.is(prev.resetKey, resetKey)) {
    setPrev({ value, resetKey });
    if (Object.is(prev.resetKey, resetKey)) setStamp(stamp + 1);
    else setSettled(stamp);
  }

  useEffect(() => {
    if (!stamp) return;
    const t = setTimeout(() => setSettled(stamp), ms);
    return () => clearTimeout(t);
  }, [stamp, ms]);

  return stamp !== settled;
}

/** Class for an element that carries a changing number: outlined while changed, fading back otherwise. */
export function changeClass(changed: boolean) {
  return changed ? "changed" : "change-fade";
}
