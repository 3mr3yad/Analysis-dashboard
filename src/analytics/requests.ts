import type { Order, RequestStatus, ServiceRequest, Snapshot } from "../domain/types";
import { HOUR } from "../lib/format";
import { bucketEnd, bucketOf, inRange, pctChange, type TimeWindow } from "./time";

export const TERMINAL: ReadonlySet<RequestStatus> = new Set(["completed", "closed", "rejected", "cancelled"]);
/** Being worked on by the team. */
export const ACTIVE: ReadonlySet<RequestStatus> = new Set(["under_review", "assigned", "in_progress"]);
/** Waiting on something other than the assignee. */
export const PENDING: ReadonlySet<RequestStatus> = new Set(["new", "waiting_customer", "on_hold"]);

export const isOpen = (r: ServiceRequest) => !TERMINAL.has(r.status);
export const isOverdue = (r: ServiceRequest, now: number) => isOpen(r) && r.dueAt < now;
export const completedAt = (r: ServiceRequest) => r.history.find((h) => h.status === "completed")?.at;

/** Status of a request at time t, reconstructed from its recorded history. */
export function statusAt(r: ServiceRequest, t: number): RequestStatus | undefined {
  if (r.createdAt > t) return undefined;
  let s: RequestStatus | undefined;
  for (const h of r.history) {
    if (h.at > t) break;
    s = h.status;
  }
  return s;
}

export const isOrderDelayed = (o: Order, now: number) => o.status !== "completed" && o.status !== "cancelled" && o.expectedAt < now;

export interface PointCounts {
  active: number;
  pending: number;
  overdue: number;
}

export function countsAt(requests: ServiceRequest[], t: number): PointCounts {
  const c = { active: 0, pending: 0, overdue: 0 };
  for (const r of requests) {
    if (r.createdAt > t || (r.endedAt !== undefined && r.endedAt <= t)) continue;
    const s = statusAt(r, t);
    if (!s || TERMINAL.has(s)) continue;
    if (ACTIVE.has(s)) c.active++;
    else c.pending++;
    if (r.dueAt < t) c.overdue++;
  }
  return c;
}

export interface Kpi {
  key: string;
  label: string;
  value: number;
  prev: number | null;
  delta: number | null;
  /** Whether an increase is good, bad, or neither for this metric. */
  polarity: "up-good" | "up-bad" | "neutral";
  format: "int" | "money" | "pct";
  trend: number[];
  /** Suffix after the delta, e.g. "عن أمس". */
  compare?: string;
  /** Plain-language definition, shown on hover. */
  hint?: string;
  /** Extra live context shown under the value. */
  extra?: string;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : NaN);

function countSeries(w: TimeWindow, items: (number | undefined)[], weights?: number[]): number[] {
  const out = new Array(w.starts.length).fill(0);
  items.forEach((ts, i) => {
    if (ts === undefined) return;
    const b = bucketOf(ts, w);
    if (b >= 0) out[b] += weights ? weights[i] : 1;
  });
  return out;
}

const countIn = (xs: (number | undefined)[], a: number, b: number) => xs.reduce<number>((n, t) => n + (inRange(t, a, b) ? 1 : 0), 0);

function csat(requests: ServiceRequest[], a: number, b: number): number | null {
  const rated = requests.filter((r) => r.rating !== undefined && inRange(completedAt(r), a, b));
  if (!rated.length) return null;
  return (rated.filter((r) => r.rating! >= 4).length / rated.length) * 100;
}

export function computeKpis(d: Snapshot, w: TimeWindow, now: number, onlineNow: number): Kpi[] {
  const { requests, orders } = d;
  const created = requests.map((r) => r.createdAt);
  const done = requests.map(completedAt);
  const point = (t: number) => countsAt(requests, t);
  const nowCounts = point(now);
  const prevCounts = point(w.prevTo);
  const pointTrend = w.starts.map((_, i) => point(bucketEnd(i, w)));

  // New today vs yesterday-to-same-time, with a 14-day daily sparkline.
  const day0 = new Date(now);
  day0.setHours(0, 0, 0, 0);
  const todayStart = day0.getTime();
  const newToday = countIn(created, todayStart, now);
  const newYesterday = countIn(created, todayStart - 24 * HOUR, now - 24 * HOUR);
  const newTrend = Array.from({ length: 14 }, (_, i) => {
    const a = todayStart - (13 - i) * 24 * HOUR;
    return countIn(created, a, a + 24 * HOUR - 1);
  });

  const completedOrders = orders.filter((o) => o.status === "completed");
  const revenue = (a: number, b: number) => sum(completedOrders.filter((o) => inRange(o.completedAt, a, b)).map((o) => o.value));

  const actorsIn = (a: number, b: number) => {
    const s = new Set<string>();
    for (let i = d.activity.length - 1; i >= 0; i--) {
      const e = d.activity[i];
      if (e.at < a) break;
      if (e.at <= b && e.actor.type === "employee" && e.actor.id) s.add(e.actor.id);
    }
    return s.size;
  };

  const csatNow = csat(requests, w.from, w.to);
  const csatPrev = csat(requests, w.prevFrom, w.prevTo);
  const csatTrend = w.starts.map((s, i) => csat(requests, s, bucketEnd(i, w)) ?? NaN);

  const mk = (k: Omit<Kpi, "delta">): Kpi => ({ ...k, delta: k.prev === null ? null : pctChange(k.value, k.prev) });

  return [
    mk({ key: "total", label: "إجمالي الطلبات", value: countIn(created, w.from, w.to), prev: countIn(created, w.prevFrom, w.prevTo), polarity: "neutral", format: "int", trend: countSeries(w, created) }),
    mk({ key: "today", label: "طلبات جديدة اليوم", value: newToday, prev: newYesterday, polarity: "neutral", format: "int", trend: newTrend, compare: "عن أمس" }),
    mk({ key: "active", label: "طلبات قيد العمل", value: nowCounts.active, prev: prevCounts.active, polarity: "neutral", format: "int", trend: pointTrend.map((c) => c.active), compare: "عن بداية الفترة", hint: "قيد المراجعة أو مسندة أو قيد التنفيذ الآن" }),
    mk({ key: "completed", label: "طلبات مكتملة", value: countIn(done, w.from, w.to), prev: countIn(done, w.prevFrom, w.prevTo), polarity: "up-good", format: "int", trend: countSeries(w, done) }),
    mk({ key: "pending", label: "طلبات معلّقة", value: nowCounts.pending, prev: prevCounts.pending, polarity: "up-bad", format: "int", trend: pointTrend.map((c) => c.pending), compare: "عن بداية الفترة", hint: "جديدة لم تُفرز، بانتظار العميل، أو معلّقة" }),
    mk({ key: "overdue", label: "طلبات متأخرة", value: nowCounts.overdue, prev: prevCounts.overdue, polarity: "up-bad", format: "int", trend: pointTrend.map((c) => c.overdue), compare: "عن بداية الفترة", hint: "طلبات مفتوحة تجاوزت موعد الإنجاز المتوقع" }),
    mk({ key: "orders", label: "إجمالي الطلبات الشرائية", value: countIn(orders.map((o) => o.createdAt), w.from, w.to), prev: countIn(orders.map((o) => o.createdAt), w.prevFrom, w.prevTo), polarity: "up-good", format: "int", trend: countSeries(w, orders.map((o) => o.createdAt)) }),
    mk({ key: "revenue", label: "الإيرادات المحققة", value: revenue(w.from, w.to), prev: revenue(w.prevFrom, w.prevTo), polarity: "up-good", format: "money", trend: countSeries(w, completedOrders.map((o) => o.completedAt), completedOrders.map((o) => o.value)), hint: "مجموع قيم الطلبات الشرائية المكتملة خلال الفترة" }),
    mk({ key: "employees", label: "موظفون نشطون", value: actorsIn(w.from, w.to), prev: actorsIn(w.prevFrom, w.prevTo), polarity: "neutral", format: "int", trend: w.starts.map((s, i) => actorsIn(s, bucketEnd(i, w))), hint: "موظفون سجّلوا نشاطًا خلال الفترة", extra: `${onlineNow} متصل الآن` }),
    mk({ key: "csat", label: "رضا العملاء", value: csatNow ?? NaN, prev: csatPrev, polarity: "up-good", format: "pct", trend: csatTrend, hint: "نسبة تقييمات 4 و5 من 5 للطلبات المكتملة" }),
  ];
}

// ── Series for charts ───────────────────────────────────────────────────────

export function flowSeries(requests: ServiceRequest[], w: TimeWindow) {
  return {
    incoming: countSeries(w, requests.map((r) => (r.direction === "incoming" ? r.createdAt : undefined))),
    outgoing: countSeries(w, requests.map((r) => (r.direction === "outgoing" ? r.createdAt : undefined))),
    created: countSeries(w, requests.map((r) => r.createdAt)),
    resolved: countSeries(w, requests.map(completedAt)),
  };
}

export function timingSeries(requests: ServiceRequest[], w: TimeWindow) {
  const resp: number[][] = w.starts.map(() => []);
  const reso: number[][] = w.starts.map(() => []);
  for (const r of requests) {
    if (r.firstResponseAt) {
      const b = bucketOf(r.createdAt, w);
      if (b >= 0) resp[b].push(r.firstResponseAt - r.createdAt);
    }
    const c = completedAt(r);
    if (c) {
      const b = bucketOf(c, w);
      if (b >= 0) reso[b].push(c - r.createdAt);
    }
  }
  return { response: resp.map(avg), resolution: reso.map(avg) };
}

export function windowStats(requests: ServiceRequest[], w: TimeWindow) {
  const created = requests.filter((r) => inRange(r.createdAt, w.from, w.to));
  const completed = requests.filter((r) => inRange(completedAt(r), w.from, w.to));
  const onTime = completed.filter((r) => completedAt(r)! <= r.dueAt);
  const createdDone = created.filter((r) => completedAt(r) !== undefined);
  return {
    created: created.length,
    completed: completed.length,
    completionRate: created.length ? (createdDone.length / created.length) * 100 : NaN,
    onTimeRate: completed.length ? (onTime.length / completed.length) * 100 : NaN,
    avgResponse: avg(created.filter((r) => r.firstResponseAt).map((r) => r.firstResponseAt! - r.createdAt)),
    avgResolution: avg(completed.map((r) => completedAt(r)! - r.createdAt)),
  };
}

export function completionRateSeries(requests: ServiceRequest[], w: TimeWindow) {
  const tot = new Array(w.starts.length).fill(0);
  const ok = new Array(w.starts.length).fill(0);
  for (const r of requests) {
    const c = completedAt(r);
    if (!c) continue;
    const b = bucketOf(c, w);
    if (b < 0) continue;
    tot[b]++;
    if (c <= r.dueAt) ok[b]++;
  }
  return tot.map((t, i) => (t ? (ok[i] / t) * 100 : NaN));
}

export function countBy<T, K extends string>(items: T[], key: (t: T) => K): Map<K, number> {
  const m = new Map<K, number>();
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + 1);
  return m;
}

// ── Workflow pipeline & bottleneck detection ────────────────────────────────

export interface Stage {
  status: RequestStatus;
  count: number;
  avgDwell: number;
  oldest: number;
  overdue: number;
  bottleneck: boolean;
}

export function pipeline(requests: ServiceRequest[], now: number): Stage[] {
  const STAGES: RequestStatus[] = ["new", "under_review", "assigned", "in_progress", "waiting_customer", "on_hold"];
  const stages = STAGES.map((status) => {
    const rs = requests.filter((r) => r.status === status);
    const dwell = rs.map((r) => now - r.updatedAt);
    return {
      status,
      count: rs.length,
      avgDwell: avg(dwell),
      oldest: dwell.length ? Math.max(...dwell) : 0,
      overdue: rs.filter((r) => r.dueAt < now).length,
      bottleneck: false,
    };
  });
  // A stage is a bottleneck when work piles up there AND sits much longer than elsewhere.
  const scored = stages.filter((s) => s.count > 0).map((s) => ({ s, score: s.count * s.avgDwell }));
  const dwells = scored.map((x) => x.s.avgDwell).sort((a, b) => a - b);
  const median = dwells[Math.floor(dwells.length / 2)] ?? 0;
  const top = scored.sort((a, b) => b.score - a.score)[0];
  if (top && top.s.avgDwell > median * 1.3 && top.s.count >= 3) top.s.bottleneck = true;
  return stages;
}
