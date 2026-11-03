import { useSyncExternalStore } from "react";
import type { EntityRef } from "../domain/types";

export type Page =
  | "overview"
  | "live"
  | "requests"
  | "orders"
  | "customers"
  | "employees"
  | "analytics"
  | "notifications"
  | "settings";

const PAGES: Page[] = ["overview", "live", "requests", "orders", "customers", "employees", "analytics", "notifications", "settings"];

export interface Route {
  page: Page;
  params: URLSearchParams;
  panel: EntityRef | null;
}

function parse(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const page = (PAGES as string[]).includes(path) ? (path as Page) : "overview";
  const params = new URLSearchParams(query);
  const raw = params.get("panel");
  let panel: EntityRef | null = null;
  if (raw) {
    const [kind, id] = raw.split(":");
    if (kind && id && ["request", "order", "customer", "employee"].includes(kind)) panel = { kind: kind as EntityRef["kind"], id };
  }
  return { page, params, panel };
}

let current = parse(window.location.hash);
const listeners = new Set<() => void>();
window.addEventListener("hashchange", () => {
  current = parse(window.location.hash);
  listeners.forEach((l) => l());
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

type ParamPatch = Record<string, string | null | undefined>;

function build(page: Page, params: URLSearchParams) {
  const q = params.toString();
  return `#/${page}${q ? `?${q}` : ""}`;
}

export function hrefFor(page: Page, params: ParamPatch = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  return build(page, p);
}

export function navigate(page: Page, params: ParamPatch = {}) {
  window.location.hash = hrefFor(page, params);
}

/** Merge params into the current route (null/empty removes a key). */
export function setParams(patch: ParamPatch, replace = true) {
  const p = new URLSearchParams(current.params);
  for (const [k, v] of Object.entries(patch)) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  const url = build(current.page, p);
  if (replace) {
    history.replaceState(null, "", url);
    current = parse(url);
    listeners.forEach((l) => l());
  } else window.location.hash = url;
}

export function openPanel(ref: EntityRef) {
  setParams({ panel: `${ref.kind}:${ref.id}` }, false);
}

export function closePanel() {
  setParams({ panel: null }, false);
}
