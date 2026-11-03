import { useSyncExternalStore } from "react";

// One shared clock so every "time since" on screen ticks together.
let now = Date.now();
const listeners = new Set<() => void>();
window.setInterval(() => {
  now = Date.now();
  listeners.forEach((l) => l());
}, 15_000);

export function useNow(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => now,
  );
}
