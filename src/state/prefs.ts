import { useSyncExternalStore } from "react";

export type MotionPref = "auto" | "on" | "off";
const KEY = "ceo.effects";

function read(): MotionPref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "on" || v === "off" || v === "auto") return v;
  } catch {
    /* storage unavailable */
  }
  return "auto";
}

let pref = read();
const listeners = new Set<() => void>();

export function setMotionPref(v: MotionPref) {
  pref = v;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export function useMotionPref(): MotionPref {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pref,
  );
}
