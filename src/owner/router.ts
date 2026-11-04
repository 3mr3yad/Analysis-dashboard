import { useSyncExternalStore } from "react";

// Hash router for the owner dashboard: #/<page>?<filters>. Filters live in the URL so every view
// (a filtered ticket list, a customer lookup) can be bookmarked or shared.

export type OwnerPage = "overview" | "tickets" | "analytics" | "orders" | "customers" | "iphone18" | "alerts" | "activity" | "staff" | "settings";
const PAGES: OwnerPage[] = ["overview", "tickets", "analytics", "orders", "customers", "iphone18", "alerts", "activity", "staff", "settings"];

export interface OwnerRoute {
  page: OwnerPage;
  params: URLSearchParams;
}

function parse(hash: string): OwnerRoute {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  return { page: (PAGES as string[]).includes(path) ? (path as OwnerPage) : "overview", params: new URLSearchParams(query) };
}

let current = parse(window.location.hash);
const listeners = new Set<() => void>();
window.addEventListener("hashchange", () => {
  current = parse(window.location.hash);
  listeners.forEach((l) => l());
});

export function useOwnerRoute(): OwnerRoute {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

type Patch = Record<string, string | number | null | undefined>;

export function hrefTo(page: OwnerPage, params: Patch = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
  const q = p.toString();
  return `#/${page}${q ? `?${q}` : ""}`;
}

/** Merge into the current page's params (empty removes). Filter changes replace history; pass push for navigation-like changes. */
export function updateParams(patch: Patch, push = false) {
  const p = new URLSearchParams(current.params);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") p.delete(k);
    else p.set(k, String(v));
  }
  const q = p.toString();
  const url = `#/${current.page}${q ? `?${q}` : ""}`;
  if (push) window.location.hash = url;
  else {
    history.replaceState(null, "", url);
    current = parse(url);
    listeners.forEach((l) => l());
  }
}
