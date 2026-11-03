// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA ONLY. Nothing in this folder represents real company activity.
// A seeded, deterministic simulation used while backend endpoints are missing.
// It is only reachable through mockDataSource / mockRealtime and is labelled
// as demo data everywhere in the UI.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  ActivityEvent,
  Customer,
  Department,
  Direction,
  Employee,
  EmployeePresence,
  Notification,
  Order,
  OrderStatus,
  Priority,
  RequestStatus,
  ServiceRequest,
  ServiceType,
  Snapshot,
} from "../../domain/types";
import { SERVICE } from "../../domain/labels";
import type { RealtimeEvent } from "../types";
import { DAY, HOUR, MINUTE } from "../../lib/format";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const pick = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
function weighted<T>(r: Rng, entries: readonly [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of entries) {
    x -= w;
    if (x <= 0) return v;
  }
  return entries[entries.length - 1][0];
}
const between = (r: Rng, a: number, b: number) => a + r() * (b - a);
/** Log-normal-ish positive sample around `median`. */
const skewed = (r: Rng, median: number, spread = 0.7) =>
  median * Math.exp((r() + r() + r() - 1.5) * spread * 1.4);

const EMPLOYEES: [string, string, Department][] = [
  ["أحمد محمد", "أخصائي رعاية عملاء أول", "customer_care"],
  ["سارة العتيبي", "مشرفة رعاية العملاء", "customer_care"],
  ["فهد القحطاني", "أخصائي رعاية عملاء", "customer_care"],
  ["نورة الشمري", "أخصائية رعاية عملاء", "customer_care"],
  ["خالد الدوسري", "مدير حسابات", "sales"],
  ["ريم الحربي", "مسؤولة مبيعات", "sales"],
  ["عبدالله الغامدي", "مسؤول مبيعات", "sales"],
  ["لمى الزهراني", "أخصائية ضمان واستبدال", "after_sales"],
  ["ماجد العنزي", "أخصائي ضمان", "after_sales"],
  ["هيا المطيري", "منسقة ما بعد البيع", "after_sales"],
  ["يوسف السبيعي", "أخصائي تسويق مؤثرين", "marketing"],
  ["جود البقمي", "منسقة صناع المحتوى", "marketing"],
  ["تركي الشهري", "مشرف العمليات", "operations"],
  ["منيرة القرني", "أخصائية عمليات", "operations"],
  ["سلطان الرشيدي", "أخصائي عمليات", "operations"],
  ["دانة الجهني", "أخصائية رعاية عملاء", "customer_care"],
];

const FIRST = ["محمد", "عبدالرحمن", "فيصل", "نواف", "سعود", "بندر", "مشاري", "عمر", "أسيل", "رهف", "شهد", "العنود", "غادة", "مها", "وعد", "ليان", "حصة", "زياد", "راكان", "إبراهيم", "علي", "حسن", "أمل", "نوف"];
const LAST = ["الحارثي", "العمري", "السهلي", "المالكي", "الخالدي", "الفيفي", "العسيري", "البلوي", "الثبيتي", "الجابري", "السلمي", "الشريف", "الكثيري", "الرويلي", "الصاعدي", "اليامي"];
const CITIES = ["الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة", "الخبر", "أبها", "تبوك", "بريدة", "الطائف"];

const TYPE_WEIGHTS: [ServiceType, number][] = [
  ["customer_service", 30],
  ["sales", 22],
  ["replacement", 12],
  ["warranty", 10],
  ["voucher_refund", 9],
  ["follower_gifts", 7],
  ["creator_requests", 6],
  ["over_stage", 4],
];

const TYPE_DEPT: Record<ServiceType, Department> = {
  customer_service: "customer_care",
  sales: "sales",
  replacement: "after_sales",
  warranty: "after_sales",
  voucher_refund: "operations",
  follower_gifts: "marketing",
  creator_requests: "marketing",
  over_stage: "operations",
};

const SLA: Record<Priority, number> = { critical: 8 * HOUR, high: 24 * HOUR, medium: 72 * HOUR, low: 120 * HOUR };

const ACTIONS: Partial<Record<RequestStatus, string[]>> = {
  new: ["بانتظار الفرز الأولي"],
  under_review: ["مراجعة تفاصيل الطلب", "التحقق من بيانات العميل", "مراجعة مستندات الشراء"],
  assigned: ["تم الإسناد — بانتظار البدء"],
  in_progress: ["التواصل مع العميل هاتفيًا", "مراجعة مستندات العميل", "تجهيز بديل المنتج", "إعداد عرض السعر", "تنسيق الشحن", "فحص المنتج المرتجع", "إصدار القسيمة"],
  waiting_customer: ["بانتظار رفع الفاتورة من العميل", "بانتظار تأكيد العنوان", "بانتظار رد العميل على العرض"],
  on_hold: ["معلّق بانتظار توفر المخزون", "معلّق بانتظار اعتماد الإدارة"],
  completed: ["تم التنفيذ"],
  closed: ["تم الإغلاق"],
  rejected: ["رُفض — خارج شروط الضمان", "رُفض — لم تكتمل المتطلبات"],
  cancelled: ["أُلغي بطلب من العميل"],
};

const NEXT: Partial<Record<RequestStatus, string>> = {
  new: "فرز الطلب وإسناده",
  under_review: "إسناد الطلب لموظف مختص",
  assigned: "بدء التنفيذ والتواصل مع العميل",
  in_progress: "إنهاء التنفيذ وتأكيد الحل مع العميل",
  waiting_customer: "متابعة العميل لاستكمال المتطلبات",
  on_hold: "قرار الإدارة بشأن الطلب",
  completed: "إغلاق الطلب بعد تأكيد رضا العميل",
};

const ORDER_TEXT: Record<OrderStatus, string> = {
  new: "تم إنشاء الطلب",
  processing: "بدأت معالجة الطلب",
  awaiting_approval: "الطلب بانتظار اعتماد الإدارة",
  completed: "تم تسليم الطلب",
  cancelled: "أُلغي الطلب",
};

const TERMINAL = new Set<RequestStatus>(["completed", "closed", "rejected", "cancelled"]);

export interface MockWorld {
  snapshot(): Snapshot;
  /** Advance the simulation by one random step (used by the mock realtime channel). */
  tick(now: number): RealtimeEvent[];
}

export function createMockWorld(seed = 20261102, now = Date.now()): MockWorld {
  const r = mulberry32(seed);
  let evSeq = 0;
  const evId = () => `ev_${++evSeq}`;

  const employees: Employee[] = EMPLOYEES.map(([name, title, department], i) => ({
    id: `emp_${i + 1}`,
    name,
    title,
    department,
    joinedAt: now - between(r, 120, 1400) * DAY,
  }));
  const byDept = (d: Department) => employees.filter((e) => e.department === d);
  // Per-employee capacity bias so workload is realistically uneven.
  const capacity = new Map(employees.map((e) => [e.id, between(r, 0.6, 1.6)]));

  const customers: Customer[] = [];
  const addCustomer = (createdAt: number): Customer => {
    const i = customers.length;
    const c: Customer = {
      id: `cus_${i + 1}`,
      code: `C-${1000 + i}`,
      name: `${pick(r, FIRST)} ${pick(r, LAST)}`,
      phone: `05${Math.floor(between(r, 10000000, 99999999))}`,
      city: pick(r, CITIES),
      segment: weighted(r, [["vip", 8], ["regular", 62], ["new", 30]]),
      status: "active",
      accountManagerId: pick(r, [...byDept("sales"), ...byDept("customer_care")]).id,
      createdAt,
    };
    customers.push(c);
    return c;
  };
  for (let i = 0; i < 180; i++) addCustomer(now - between(r, 190, 720) * DAY);

  const requests: ServiceRequest[] = [];
  const orders: Order[] = [];
  const activity: ActivityEvent[] = [];
  let reqSeq = 10000;
  let ordSeq = 5000;

  const emp = (id?: string) => employees.find((e) => e.id === id);

  function pickAssignee(dept: Department): Employee {
    const pool = byDept(dept);
    return weighted(r, pool.map((e) => [e, capacity.get(e.id)!] as [Employee, number]));
  }

  function log(e: Omit<ActivityEvent, "id">) {
    const full = { ...e, id: evId() };
    activity.push(full);
    return full;
  }

  function statusEvent(req: ServiceRequest, status: RequestStatus, at: number): ActivityEvent {
    const who = emp(req.assigneeId);
    const name = who?.name ?? "النظام";
    const map: Partial<Record<RequestStatus, [string, string?]>> = {
      under_review: [`${name} بدأ مراجعة الطلب`, "تم التحقق من البيانات الأساسية"],
      assigned: [`أُسند الطلب إلى ${name}`],
      in_progress: [`${name} بدأ تنفيذ الطلب`],
      waiting_customer: [`${name} طلب مستندات إضافية من العميل`, "بانتظار رد العميل"],
      on_hold: ["تم تعليق الطلب", "بانتظار قرار"],
      completed: [`${name} أنهى تنفيذ الطلب`, "تم الحل"],
      closed: ["أُغلق الطلب بعد تأكيد العميل", "مغلق"],
      rejected: [`${name} رفض الطلب`, "مرفوض"],
      cancelled: ["ألغى العميل الطلب", "ملغي"],
    };
    const [description, result] = map[status] ?? [`تغيّرت الحالة`];
    return log({
      at,
      kind: status === "assigned" ? "assigned" : "status_change",
      actor: status === "cancelled" ? { type: "customer", id: req.customerId } : who ? { type: "employee", id: who.id } : { type: "system" },
      subject: { kind: "request", id: req.id },
      customerId: req.customerId,
      description,
      result,
      nextAction: NEXT[status],
    });
  }

  /** Build a full simulated lifecycle; transitions after `now` are discarded. */
  function createRequest(createdAt: number, customer: Customer, forcedType?: ServiceType): ServiceRequest {
    const type = forcedType ?? weighted(r, TYPE_WEIGHTS);
    const direction: Direction =
      type === "follower_gifts" || type === "creator_requests" ? (r() < 0.8 ? "outgoing" : "incoming") : r() < 0.12 ? "outgoing" : "incoming";
    const priority = weighted<Priority>(r, [["critical", 5], ["high", 20], ["medium", 50], ["low", 25]]);
    const department = TYPE_DEPT[type];
    const assignee = pickAssignee(department);
    const sla = SLA[priority];
    const req: ServiceRequest = {
      id: `req_${reqSeq}`,
      code: `REQ-${reqSeq++}`,
      customerId: customer.id,
      type,
      direction,
      department,
      priority,
      status: "new",
      history: [{ at: createdAt, status: "new" }],
      createdAt,
      updatedAt: createdAt,
      dueAt: createdAt + sla,
      currentAction: ACTIONS.new![0],
      nextAction: NEXT.new,
    };
    log({
      at: createdAt,
      kind: "created",
      actor: direction === "incoming" ? { type: "customer", id: customer.id } : { type: "employee", id: assignee.id },
      subject: { kind: "request", id: req.id },
      customerId: customer.id,
      description: direction === "incoming" ? `قدّم العميل طلب ${SERVICE[type].label}` : `بادر الفريق بطلب ${SERVICE[type].label} للعميل`,
      nextAction: NEXT.new,
    });

    // Plan the lifecycle.
    const speed = capacity.get(assignee.id)!;
    const late = r() < 0.13;
    const target = late ? sla * between(r, 1.1, 2.4) : skewed(r, sla * 0.42, 0.6) / speed;
    const plan: [RequestStatus, number][] = [];
    let t = createdAt + skewed(r, priority === "critical" ? 8 * MINUTE : 35 * MINUTE, 0.8);
    plan.push(["under_review", t]);
    t += skewed(r, 20 * MINUTE);
    plan.push(["assigned", t]);
    t += skewed(r, 40 * MINUTE);
    plan.push(["in_progress", t]);
    const outcome = weighted<RequestStatus>(r, [["completed", 86], ["rejected", 5], ["cancelled", 4], ["on_hold", 5]]);
    if (outcome !== "cancelled" && r() < 0.4) {
      t += (target - (t - createdAt)) * between(r, 0.2, 0.4);
      plan.push(["waiting_customer", t]);
      t += skewed(r, 6 * HOUR, 0.9);
      plan.push(["in_progress", t]);
    }
    t = Math.max(t + 10 * MINUTE, createdAt + target);
    if (outcome === "on_hold") {
      // Held requests pause for a while, then resume and finish.
      plan.push(["on_hold", t]);
      t += skewed(r, 2 * DAY, 0.8);
      plan.push(["in_progress", t]);
      t += skewed(r, 8 * HOUR);
      plan.push(["completed", t]);
    } else plan.push([outcome, t]);
    if ((outcome === "completed" || outcome === "on_hold") && r() < 0.65) plan.push(["closed", t + skewed(r, 20 * HOUR)]);

    req.assigneeId = assignee.id;
    for (const [status, at] of plan) {
      if (at > now) break;
      applyStatus(req, status, at);
    }
    requests.push(req);
    return req;
  }

  function applyStatus(req: ServiceRequest, status: RequestStatus, at: number): ActivityEvent {
    req.status = status;
    req.history.push({ at, status });
    req.updatedAt = at;
    if (status === "under_review" && !req.firstResponseAt) req.firstResponseAt = at;
    if ((status === "completed" || status === "rejected" || status === "cancelled") && !req.endedAt) req.endedAt = at;
    req.currentAction = pick(r, ACTIONS[status] ?? ["—"]);
    req.nextAction = NEXT[status];
    const ev = statusEvent(req, status, at);
    if (status === "waiting_customer" && at + 2 * HOUR < now && r() < 0.6) {
      log({
        at: at + skewed(r, 90 * MINUTE),
        kind: "document",
        actor: { type: "customer", id: req.customerId },
        subject: { kind: "request", id: req.id },
        customerId: req.customerId,
        description: "رفع العميل المستندات المطلوبة",
        result: "تم الاستلام",
      });
    }
    if (status === "completed") {
      const overdue = at > req.dueAt;
      if (r() < 0.62) req.rating = overdue ? weighted(r, [[2, 3], [3, 4], [4, 3], [5, 1]]) : weighted(r, [[3, 1], [4, 4], [5, 7], [2, 0.4]]);
    }
    return ev;
  }

  // Requests: last 200 days, gentle growth, weekend (Fri/Sat) dip, intraday curve.
  for (let d = 200; d >= 0; d--) {
    const dayStart = new Date(now - d * DAY);
    dayStart.setHours(0, 0, 0, 0);
    const dow = dayStart.getDay();
    const growth = 1 + (200 - d) / 200 * 0.35;
    const base = (dow === 5 ? 5 : dow === 6 ? 7 : 11) * growth;
    const count = Math.round(base + between(r, -3, 3));
    for (let k = 0; k < count; k++) {
      const hour = weighted(r, [[9, 6], [10, 9], [11, 10], [12, 8], [13, 7], [14, 8], [15, 7], [16, 6], [17, 5], [18, 4], [19, 3], [20, 3], [21, 2], [8, 3]]);
      const at = dayStart.getTime() + hour * HOUR + r() * HOUR;
      if (at > now) continue;
      // New customers arrive alongside requests; returning customers dominate.
      const customer = r() < 0.16 ? addCustomer(at - between(r, 0, 2) * HOUR) : pick(r, customers.filter((c) => c.createdAt < at));
      const req = createRequest(at, customer);
      if ((req.type === "sales" && r() < 0.75) || (req.type === "replacement" && r() < 0.3)) createOrder(req);
    }
  }

  function createOrder(req: ServiceRequest) {
    const createdAt = req.firstResponseAt ?? req.createdAt + 30 * MINUTE;
    if (createdAt > now) return;
    const value = Math.round(skewed(r, req.type === "sales" ? 1400 : 650, 0.8) / 5) * 5;
    const expectedAt = createdAt + between(r, 1, 6) * DAY;
    const order: Order = {
      id: `ord_${ordSeq}`,
      code: `ORD-${ordSeq++}`,
      customerId: req.customerId,
      assigneeId: req.assigneeId!,
      value,
      items: 1 + Math.floor(skewed(r, 1.5)),
      status: "new",
      createdAt,
      updatedAt: createdAt,
      expectedAt,
    };
    req.orderId = order.id;
    const plan: [OrderStatus, number][] = [];
    let t = createdAt + skewed(r, 2 * HOUR);
    plan.push(["processing", t]);
    if (value > 3000 || r() < 0.15) {
      t += skewed(r, 5 * HOUR);
      plan.push(["awaiting_approval", t]);
      t += skewed(r, 7 * HOUR, 1);
      plan.push(["processing", t]);
    }
    const finalStatus = weighted<OrderStatus>(r, [["completed", 92], ["cancelled", 8]]);
    t = r() < 0.12 ? expectedAt + between(r, 0.3, 3) * DAY : createdAt + (expectedAt - createdAt) * between(r, 0.4, 0.95);
    plan.push([finalStatus, t]);
    log({
      at: createdAt,
      kind: "order",
      actor: { type: "employee", id: order.assigneeId },
      subject: { kind: "order", id: order.id },
      customerId: order.customerId,
      description: `أنشأ ${emp(order.assigneeId)?.name} الطلب الشرائي ${order.code}`,
      result: `${order.items} صنف`,
      nextAction: "بدء معالجة الطلب",
    });
    for (const [status, at] of plan) {
      if (at > now) break;
      setOrderStatus(order, status, at);
    }
    orders.push(order);
  }

  function setOrderStatus(order: Order, status: OrderStatus, at: number) {
    order.status = status;
    order.updatedAt = at;
    if (status === "completed") order.completedAt = at;
    return log({
      at,
      kind: status === "awaiting_approval" ? "approval" : "order",
      actor: status === "awaiting_approval" ? { type: "system" } : { type: "employee", id: order.assigneeId },
      subject: { kind: "order", id: order.id },
      customerId: order.customerId,
      description: `${ORDER_TEXT[status]} — ${order.code}`,
      nextAction: status === "awaiting_approval" ? "اعتماد المالك أو المدير" : status === "processing" ? "تجهيز وتسليم الطلب" : undefined,
    });
  }

  // Customer status derived from their recorded activity.
  const lastSeen = new Map<string, number>();
  for (const q of requests) lastSeen.set(q.customerId, Math.max(lastSeen.get(q.customerId) ?? 0, q.updatedAt));
  for (const c of customers) {
    const seen = lastSeen.get(c.id) ?? c.createdAt;
    const lowRated = requests.some((q) => q.customerId === c.id && q.rating !== undefined && q.rating <= 2 && now - q.updatedAt < 45 * DAY);
    c.status = lowRated ? "at_risk" : now - seen > 75 * DAY ? "inactive" : "active";
  }

  // Simulated presence: who is working on what right now.
  const presence: EmployeePresence[] = employees.map((e, i) => {
    const open = requests.filter((q) => q.assigneeId === e.id && !TERMINAL.has(q.status) && q.status !== "on_hold");
    const status = i === 4 || i === 13 || i === 9 ? "offline" : i === 7 || i === 11 ? "away" : open.length && r() < 0.8 ? "busy" : "available";
    const active = open.sort((a, b) => b.updatedAt - a.updatedAt).find((q) => q.status !== "waiting_customer");
    const since = now - between(r, 5, 180) * MINUTE;
    return {
      employeeId: e.id,
      status,
      since,
      lastActivityAt: status === "offline" ? now - between(r, 2, 20) * HOUR : now - between(r, 0.2, 14) * MINUTE,
      current:
        status === "busy" && active
          ? { requestId: active.id, customerId: active.customerId, action: active.currentAction, startedAt: now - between(r, 3, 55) * MINUTE }
          : undefined,
    };
  });

  // Notifications derived from the simulated data.
  const notifications: Notification[] = [];
  let ntSeq = 0;
  const notify = (n: Omit<Notification, "id" | "read">, read = false) => notifications.push({ ...n, id: `nt_${++ntSeq}`, read });
  const openReqs = requests.filter((q) => !TERMINAL.has(q.status));
  for (const q of openReqs.filter((q) => q.dueAt < now).sort((a, b) => a.dueAt - b.dueAt).slice(0, 8)) {
    notify({
      at: q.dueAt,
      priority: q.priority === "critical" || q.priority === "high" ? "critical" : "high",
      title: `تأخر الطلب ${q.code}`,
      body: `تجاوز ${SERVICE[q.type].label} موعد الإنجاز المتوقع`,
      target: { kind: "request", id: q.id },
    });
  }
  for (const q of openReqs.filter((q) => q.status === "waiting_customer" && now - q.updatedAt > 24 * HOUR).slice(0, 4)) {
    notify({ at: q.updatedAt + 24 * HOUR, priority: "medium", title: `طلب خامل منذ أكثر من يوم`, body: `${q.code} بانتظار العميل دون متابعة`, target: { kind: "request", id: q.id } });
  }
  for (const q of requests.filter((q) => q.priority === "critical" && now - q.createdAt < 2 * DAY)) {
    notify({ at: q.createdAt, priority: "high", title: "طلب بأولوية حرجة", body: `${q.code} — ${SERVICE[q.type].label}`, target: { kind: "request", id: q.id } });
  }
  for (const o of orders.filter((o) => o.status === "awaiting_approval")) {
    notify({ at: o.updatedAt, priority: "high", title: "طلب شرائي يحتاج اعتمادك", body: `${o.code} بقيمة ${o.value.toLocaleString("en-US")} ر.س`, target: { kind: "order", id: o.id } });
  }
  for (const o of orders.filter((o) => o.status === "completed" && now - (o.completedAt ?? 0) < DAY).slice(0, 4)) {
    notify({ at: o.completedAt!, priority: "low", title: "اكتمل طلب شرائي", body: o.code, target: { kind: "order", id: o.id } }, true);
  }
  for (const p of presence.filter((p) => p.status === "away")) {
    notify({ at: p.since, priority: "medium", title: "موظف غير متاح", body: `${emp(p.employeeId)?.name} في وضع «بعيد»`, target: { kind: "employee", id: p.employeeId } });
  }

  activity.sort((a, b) => a.at - b.at);

  // ── Live simulation ──────────────────────────────────────────────────────
  const ADVANCE: Partial<Record<RequestStatus, RequestStatus[]>> = {
    new: ["under_review"],
    under_review: ["assigned"],
    assigned: ["in_progress"],
    in_progress: ["completed", "completed", "waiting_customer"],
    waiting_customer: ["in_progress"],
    completed: ["closed"],
  };

  function tick(at: number): RealtimeEvent[] {
    const out: RealtimeEvent[] = [];
    const roll = r();
    if (roll < 0.22) {
      const customer = r() < 0.2 ? addCustomer(at) : pick(r, customers);
      const req = createRequest(at, customer);
      out.push({ type: "request.upserted", request: structuredClone(req), activity: activity[activity.length - 1] });
      if (req.priority === "critical") {
        const n: Notification = { id: `nt_${++ntSeq}`, at, read: false, priority: "high", title: "طلب بأولوية حرجة", body: `${req.code} — ${SERVICE[req.type].label}`, target: { kind: "request", id: req.id } };
        notifications.push(n);
        out.push({ type: "notification.created", notification: n });
      }
      return out;
    }
    if (roll < 0.75) {
      const candidates = requests.filter((q) => ADVANCE[q.status] && at - q.updatedAt > 2 * MINUTE).slice(-120);
      if (!candidates.length) return out;
      const req = pick(r, candidates);
      const next = pick(r, ADVANCE[req.status]!);
      const ev = applyStatus(req, next, at);
      out.push({ type: "request.upserted", request: structuredClone(req), activity: ev });
      const p = presence.find((x) => x.employeeId === req.assigneeId);
      if (p && p.status !== "offline" && (next === "in_progress" || next === "under_review")) {
        p.status = "busy";
        p.lastActivityAt = at;
        p.current = { requestId: req.id, customerId: req.customerId, action: req.currentAction, startedAt: at };
        out.push({ type: "presence.updated", presence: structuredClone(p) });
      }
      return out;
    }
    const p = pick(r, presence.filter((x) => x.status !== "offline"));
    const nextStatus = weighted(r, [["available", 4], ["busy", 4], ["away", 1]] as const);
    p.status = nextStatus;
    p.since = at;
    p.lastActivityAt = at;
    p.current = undefined;
    if (nextStatus === "busy") {
      const open = requests.filter((q) => q.assigneeId === p.employeeId && (q.status === "in_progress" || q.status === "under_review"));
      const q = open[open.length - 1];
      if (q) p.current = { requestId: q.id, customerId: q.customerId, action: q.currentAction, startedAt: at };
      else p.status = "available";
    }
    out.push({ type: "presence.updated", presence: structuredClone(p) });
    return out;
  }

  return {
    snapshot: () => ({
      generatedAt: now,
      employees: structuredClone(employees),
      presence: structuredClone(presence),
      customers: structuredClone(customers),
      requests: structuredClone(requests),
      orders: structuredClone(orders),
      activity: structuredClone(activity),
      notifications: structuredClone(notifications).sort((a, b) => b.at - a.at),
    }),
    tick,
  };
}
