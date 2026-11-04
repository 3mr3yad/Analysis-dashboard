import { useEffect, useSyncExternalStore } from "react";

// Light / dark theme. The choice is saved per browser; index.html applies it before first paint
// (same key) so a light-mode user never sees a dark flash. Dark stays the default.

export type Theme = "dark" | "light";
const KEY = "ceo.theme";
const COLORS: Record<Theme, string> = { dark: "#07090d", light: "#eef2f8" };

function read(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

let theme = read();
const listeners = new Set<() => void>();

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLORS[t]);
}

export function setTheme(t: Theme) {
  theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* storage unavailable — applies for this visit only */
  }
  apply(t);
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => theme,
  );
}

/** Keeps the page dark while mounted (the login screen is designed dark-only), then restores the choice. */
export function useForcedDark() {
  useEffect(() => {
    apply("dark");
    return () => apply(theme);
  }, []);
}
