import type {
  AlertPriority,
  CustomerSegment,
  CustomerStatus,
  Department,
  Direction,
  OrderStatus,
  PresenceStatus,
  Priority,
  RequestStatus,
  ServiceType,
} from "./types";

/** Visual tone used by badges and dots. Status tones are reserved for state, never for series. */
export type Tone = "accent" | "good" | "warning" | "serious" | "critical" | "neutral" | "muted";

export const REQUEST_STATUS: Record<RequestStatus, { label: string; tone: Tone }> = {
  new: { label: "جديد", tone: "accent" },
  under_review: { label: "قيد المراجعة", tone: "accent" },
  assigned: { label: "تم الإسناد", tone: "accent" },
  in_progress: { label: "قيد التنفيذ", tone: "accent" },
  waiting_customer: { label: "بانتظار العميل", tone: "warning" },
  on_hold: { label: "معلّق", tone: "muted" },
  completed: { label: "مكتمل", tone: "good" },
  closed: { label: "مغلق", tone: "good" },
  rejected: { label: "مرفوض", tone: "muted" },
  cancelled: { label: "ملغي", tone: "muted" },
};

/** The main workflow, in order. Side statuses are shown separately. */
export const WORKFLOW: RequestStatus[] = [
  "new",
  "under_review",
  "assigned",
  "in_progress",
  "waiting_customer",
  "completed",
  "closed",
];
export const SIDE_STATUSES: RequestStatus[] = ["on_hold", "rejected", "cancelled"];

export const PRIORITY: Record<Priority, { label: string; tone: Tone; rank: number }> = {
  critical: { label: "حرجة", tone: "critical", rank: 0 },
  high: { label: "عالية", tone: "serious", rank: 1 },
  medium: { label: "متوسطة", tone: "neutral", rank: 2 },
  low: { label: "منخفضة", tone: "muted", rank: 3 },
};

export const ALERT_PRIORITY: Record<AlertPriority, { label: string; tone: Tone; rank: number }> = {
  critical: { label: "حرج", tone: "critical", rank: 0 },
  high: { label: "عالٍ", tone: "serious", rank: 1 },
  medium: { label: "متوسط", tone: "warning", rank: 2 },
  low: { label: "منخفض", tone: "muted", rank: 3 },
};

export const SERVICE: Record<ServiceType, { label: string }> = {
  replacement: { label: "خدمة الاستبدال" },
  voucher_refund: { label: "استرجاع القسيمة الشرائية" },
  warranty: { label: "خدمة الضمان" },
  customer_service: { label: "خدمة العملاء" },
  follower_gifts: { label: "هدايا المتابعين" },
  sales: { label: "المبيعات" },
  over_stage: { label: "Over Stage" },
  creator_requests: { label: "طلبات صناع المحتوى" },
};

export const DEPARTMENT: Record<Department, { label: string }> = {
  customer_care: { label: "رعاية العملاء" },
  sales: { label: "المبيعات" },
  after_sales: { label: "ما بعد البيع" },
  marketing: { label: "التسويق" },
  operations: { label: "العمليات" },
};

export const DIRECTION: Record<Direction, { label: string }> = {
  incoming: { label: "واردة" },
  outgoing: { label: "صادرة" },
};

export const PRESENCE: Record<PresenceStatus, { label: string; tone: Tone }> = {
  available: { label: "متاح", tone: "good" },
  busy: { label: "مشغول", tone: "accent" },
  away: { label: "بعيد", tone: "warning" },
  offline: { label: "غير متصل", tone: "muted" },
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  new: { label: "جديد", tone: "accent" },
  processing: { label: "قيد المعالجة", tone: "accent" },
  awaiting_approval: { label: "بانتظار الاعتماد", tone: "warning" },
  completed: { label: "مكتمل", tone: "good" },
  cancelled: { label: "ملغي", tone: "muted" },
};

export const SEGMENT: Record<CustomerSegment, { label: string }> = {
  vip: { label: "كبار العملاء" },
  regular: { label: "منتظم" },
  new: { label: "جديد" },
};

export const CUSTOMER_STATUS: Record<CustomerStatus, { label: string; tone: Tone }> = {
  active: { label: "نشط", tone: "good" },
  inactive: { label: "غير نشط", tone: "muted" },
  at_risk: { label: "معرّض للفقد", tone: "serious" },
};
