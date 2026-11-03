import { useSyncExternalStore } from "react";

export type RangePreset = "today" | "7d" | "30d" | "90d" | "custom";

export interface DateRangeValue {
  preset: RangePreset;
  /** Only for custom: inclusive start/end days as epoch ms (local midnight). */
  from?: number;
  to?: number;
}

const KEY = "ceo.range";

function read(): DateRangeValue {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DateRangeValue;
  } catch {
    /* storage unavailable */
  }
  return { preset: "30d" };
}

let value = read();
const listeners = new Set<() => void>();

export function setDateRange(v: DateRangeValue) {
  value = v;
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export function useDateRange(): DateRangeValue {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => value,
  );
}
