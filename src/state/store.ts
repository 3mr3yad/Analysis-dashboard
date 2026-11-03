import { useSyncExternalStore } from "react";
import type { DataOrigin, ID, Snapshot } from "../domain/types";
import { dataSource, realtimeSource, type RealtimeEvent, type RealtimeStatus } from "../services";
import { ambient } from "../three/ambientBus";

export interface DashboardState {
  status: "loading" | "ready" | "error";
  error?: string;
  data: Snapshot | null;
  origin: DataOrigin;
  realtime: RealtimeStatus;
  /** Ids of records touched by the latest realtime events (for subtle highlight). */
  recent: Set<ID>;
  lastEventAt?: number;
}

let state: DashboardState = {
  status: "loading",
  data: null,
  origin: dataSource.origin,
  realtime: "idle",
  recent: new Set(),
};
const listeners = new Set<() => void>();

function set(patch: Partial<DashboardState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDashboard<T>(selector: (s: DashboardState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

let disconnect: (() => void) | null = null;
let controller: AbortController | null = null;

export async function loadDashboard() {
  controller?.abort();
  controller = new AbortController();
  set({ status: "loading", error: undefined });
  try {
    const data = await dataSource.loadSnapshot(controller.signal);
    set({ status: "ready", data });
    connectRealtime();
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    set({ status: "error", error: (err as Error).message || "تعذّر تحميل البيانات" });
  }
}

function connectRealtime() {
  disconnect?.();
  disconnect = realtimeSource.connect(applyEvent, (realtime) => set({ realtime }));
}

function upsert<T extends { id: ID }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

let recentTimer: number | undefined;

export function applyEvent(e: RealtimeEvent) {
  const data = state.data;
  if (!data) return;
  let next: Snapshot = data;
  let touched: ID | undefined;
  switch (e.type) {
    case "request.upserted":
      next = { ...data, requests: upsert(data.requests, e.request), activity: e.activity ? [...data.activity, e.activity] : data.activity };
      touched = e.request.id;
      break;
    case "order.upserted":
      next = { ...data, orders: upsert(data.orders, e.order), activity: e.activity ? [...data.activity, e.activity] : data.activity };
      touched = e.order.id;
      break;
    case "presence.updated": {
      const presence = data.presence.map((p) => (p.employeeId === e.presence.employeeId ? e.presence : p));
      next = { ...data, presence };
      touched = e.presence.employeeId;
      break;
    }
    case "notification.created":
      next = { ...data, notifications: [e.notification, ...data.notifications] };
      touched = e.notification.id;
      break;
  }
  const recent = new Set(state.recent);
  if (touched) recent.add(touched);
  set({ data: next, recent, lastEventAt: Date.now() });
  ambient.pulse(e.type === "notification.created" ? 1 : 0.5);
  window.clearTimeout(recentTimer);
  recentTimer = window.setTimeout(() => set({ recent: new Set() }), 3500);
}

export function markNotificationsRead(ids: ID[]) {
  const data = state.data;
  if (!data || !ids.length) return;
  const set_ = new Set(ids);
  set({ data: { ...data, notifications: data.notifications.map((n) => (set_.has(n.id) ? { ...n, read: true } : n)) } });
  dataSource.markNotificationsRead(ids).catch(() => {
    /* keep optimistic state; a failed sync will be corrected on next load */
  });
}
