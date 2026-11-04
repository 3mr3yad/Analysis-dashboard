import { ApiError, getJson, postJson, putJson } from "../services/api/httpClient";
import type {
  ActivityItem,
  Bucket,
  CustomerHistory,
  CustomerRow,
  Order,
  Iphone18Order,
  Iphone18Summary,
  OnlineStaff,
  OwnerNotification,
  Paginated,
  RangeMeta,
  RevenueBucket,
  ServiceKey,
  SlaPolicy,
  StaffMember,
  StaffStats,
  Summary,
  Ticket,
  TicketDetail,
  TicketQuery,
  TimeseriesBucket,
} from "./types";

// Owner Dashboard API (reads, plus marking alerts read and editing SLA policies). Responses are cached briefly and in-flight requests are shared,
// so moving between pages doesn't spend the 120 req/min budget. `force` bypasses the cache.

const TTL_MS = 20_000;
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

function cached<T>(path: string, force = false): Promise<T> {
  const hit = cache.get(path);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.value as Promise<T>;
  const value = getJson<T>(path).catch((e) => {
    cache.delete(path);
    throw e;
  });
  cache.set(path, { at: Date.now(), value });
  return value;
}

/** Drop everything cached (on sign-out), or only paths starting with `prefix`. */
export function clearApiCache(prefix?: string) {
  if (!prefix) return cache.clear();
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
}

function qs(params: object) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** The endpoint isn't deployed on this server yet (Laravel answers an unknown route with 404). */
export const isMissingRoute = (e: unknown) => e instanceof ApiError && e.status === 404;

type Range = { from: string; to: string; bucket?: Bucket };

export const api = {
  summary: (force?: boolean) => cached<Summary>("/dashboard/summary", force),
  tickets: (q: TicketQuery, force?: boolean) => cached<Paginated<Ticket>>(`/tickets${qs(q)}`, force),
  ticket: (service: ServiceKey, id: number, force?: boolean) => cached<TicketDetail>(`/tickets/${service}/${id}`, force),
  activity: (q: { page?: number; per_page?: number }, force?: boolean) => cached<Paginated<ActivityItem>>(`/activity-feed${qs(q)}`, force),
  staff: (force?: boolean) => cached<{ data: StaffMember[] }>("/staff", force),
  staffStats: (id: number, q: { from?: string; to?: string }, force?: boolean) => cached<StaffStats>(`/staff/${id}/stats${qs(q)}`, force),
  customer: (phone: string, force?: boolean) => cached<CustomerHistory>(`/customers/${encodeURIComponent(phone)}`, force),
  customers: (q: { search?: string; page?: number; per_page?: number }, force?: boolean) => cached<Paginated<CustomerRow>>(`/customers${qs(q)}`, force),
  timeseries: (q: Range & { service?: ServiceKey }, force?: boolean) => cached<{ data: TimeseriesBucket[]; meta: RangeMeta }>(`/dashboard/timeseries${qs(q)}`, force),
  revenue: (q: Range, force?: boolean) => cached<{ data: RevenueBucket[]; meta: RangeMeta }>(`/dashboard/revenue${qs(q)}`, force),
  orders: (q: { status?: string; page?: number; per_page?: number }, force?: boolean) => cached<Paginated<Order>>(`/orders${qs(q)}`, force),
  iphone18Summary: (force?: boolean) => cached<Iphone18Summary>("/iphone18/summary", force),
  iphone18Orders: (q: { status?: string; fulfillment_method?: string; search?: string; page?: number; per_page?: number }, force?: boolean) =>
    cached<Paginated<Iphone18Order>>(`/iphone18/orders${qs(q)}`, force),
  notifications: (force?: boolean) => cached<{ data: OwnerNotification[] }>("/notifications", force),
  staffOnline: (force?: boolean) => cached<{ data: OnlineStaff[]; meta: { online_threshold_seconds: number } }>("/staff/online", force),
  slaPolicies: (force?: boolean) => cached<{ data: SlaPolicy[] }>("/sla-policies", force),
  /** Upserts by (service, status). Every ticket's sla and the breach alerts change with it. */
  saveSlaPolicies: async (policies: { service: ServiceKey; status: string; hours: number; label?: string }[]) => {
    const r = await putJson<{ data: SlaPolicy[] }>("/sla-policies", { policies });
    clearApiCache("/sla-policies");
    clearApiCache("/tickets");
    clearApiCache("/notifications");
    return r;
  },
  /** Marks alerts read for this dashboard user. */
  markRead: async (ids: string[]) => {
    const r = await postJson<{ marked_read: number }>("/notifications/read", { ids });
    clearApiCache("/notifications");
    return r;
  },
};
