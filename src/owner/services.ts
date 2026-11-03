import type { IconName } from "../ui/Icon";
import type { Tone } from "../domain/labels";
import type { ServiceKey } from "./types";

// What each service can actually report (DASHBOARD_API.md → Services, Status values, Limitations).
// Labels are fallbacks: the API's own `label` / `service_label` wins whenever it is present.

export interface ServiceMeta {
  key: ServiceKey;
  label: string;
  icon: IconName;
  /** Has an audit trail. For payments the actor is Moyasar, never a staff member. */
  trail: boolean;
  /** Fixed status slugs, "dynamic" (admin-configurable), or null (no status column). */
  statuses: readonly string[] | "dynamic" | null;
  tracksAssignee: boolean;
  tracksCreator: boolean;
  /** Has a screen in the internal admin panel (admin_url). */
  admin: boolean;
}

export const SERVICES: ServiceMeta[] = [
  { key: "resale", label: "خدمة الاستبدال", icon: "refresh", trail: true, statuses: ["new_request", "inspection", "initial_price", "shipping", "final_price", "customer_approval", "accounts", "closed"], tracksAssignee: true, tracksCreator: false, admin: true },
  { key: "refund", label: "استرجاع القسيمة الشرائية", icon: "money", trail: true, statuses: ["pending", "approved", "rejected"], tracksAssignee: false, tracksCreator: false, admin: true },
  { key: "warranty", label: "خدمة الضمان", icon: "checkCircle", trail: false, statuses: null, tracksAssignee: false, tracksCreator: false, admin: true },
  { key: "customer_support", label: "خدمة العملاء", icon: "message", trail: true, statuses: "dynamic", tracksAssignee: true, tracksCreator: true, admin: true },
  { key: "follower_gifts", label: "هدايا المتابعين", icon: "sparkle", trail: true, statuses: null, tracksAssignee: false, tracksCreator: false, admin: true },
  { key: "sales", label: "المبيعات", icon: "orders", trail: true, statuses: "dynamic", tracksAssignee: false, tracksCreator: true, admin: true },
  { key: "over_stage", label: "Over Stage", icon: "layers", trail: true, statuses: ["verified", "not_verified"], tracksAssignee: false, tracksCreator: true, admin: true },
  { key: "creator_applications", label: "طلبات صناع المحتوى", icon: "users", trail: true, statuses: ["pending", "approved", "rejected"], tracksAssignee: false, tracksCreator: false, admin: true },
  { key: "payments", label: "مدفوعات المتجر الإلكتروني", icon: "money", trail: true, statuses: ["initiated", "paid", "failed", "authorized", "captured", "refunded", "voided", "verified"], tracksAssignee: false, tracksCreator: false, admin: false },
];

export const SERVICE: Record<ServiceKey, ServiceMeta> = Object.fromEntries(SERVICES.map((s) => [s.key, s])) as Record<ServiceKey, ServiceMeta>;

/** The eight internal services (requests handled on the Wafi site), as opposed to storefront payments. */
export const INTERNAL_SERVICES = SERVICES.filter((s) => s.key !== "payments");

export function isServiceKey(v: string | null | undefined): v is ServiceKey {
  return !!v && v in SERVICE;
}

export function serviceLabel(key: ServiceKey | string, apiLabel?: string | null) {
  return apiLabel || (isServiceKey(key) ? SERVICE[key].label : key);
}

/** Display names for the fixed status slugs (filter dropdown only — rows use the API's status_label). */
export const STATUS_NAME: Record<string, string> = {
  new_request: "طلب جديد",
  inspection: "الفحص",
  initial_price: "السعر المبدئي",
  shipping: "الشحن",
  final_price: "السعر النهائي",
  customer_approval: "موافقة العميل",
  accounts: "الحسابات",
  closed: "مغلق",
  pending: "قيد الانتظار",
  approved: "مقبول",
  rejected: "مرفوض",
  verified: "موثّق",
  not_verified: "غير موثّق",
  initiated: "بدأت",
  paid: "مدفوع",
  failed: "فشل",
  authorized: "مُصرّح",
  captured: "مُحصّل",
  refunded: "مُسترد",
  voided: "ملغى",
};

/** What a status means for the owner, independent of service — each maps to one reserved status colour. */
export type StatusKind = "done" | "active" | "waiting" | "attention" | "failed" | "void" | "unknown";

export const STATUS_KIND: Record<StatusKind, { label: string; tone: Tone }> = {
  done: { label: "مكتمل", tone: "good" },
  active: { label: "قيد التنفيذ", tone: "accent" },
  waiting: { label: "بانتظار قرار", tone: "warning" },
  attention: { label: "يحتاج متابعة", tone: "serious" },
  failed: { label: "مرفوض / فشل", tone: "critical" },
  void: { label: "ملغى / مسترد", tone: "muted" },
  unknown: { label: "حالة أخرى", tone: "neutral" },
};

const FIXED_KIND: Record<string, StatusKind> = {
  // resale pipeline
  new_request: "active",
  inspection: "active",
  shipping: "active",
  accounts: "active",
  initial_price: "waiting",
  final_price: "waiting",
  customer_approval: "waiting",
  closed: "done",
  // refund / creator applications
  pending: "waiting",
  approved: "done",
  rejected: "failed",
  // over stage
  verified: "done",
  not_verified: "attention",
  // payments (Moyasar)
  paid: "done",
  captured: "done",
  initiated: "waiting",
  authorized: "active",
  failed: "failed",
  refunded: "void",
  voided: "void",
  // common admin-configured customer_support slugs
  resolved: "done",
  in_progress: "active",
  under_review: "waiting",
  escalated: "attention",
};

// customer_support and sales statuses are admin-configurable, so unknown slugs fall back to keywords
// in the slug or the Arabic label. Anything unmatched stays neutral rather than guessed.
const KEYWORDS: [RegExp, StatusKind][] = [
  [/reject|fail|cancel|lost|مرفوض|رفض|فشل|خاسر/i, "failed"],
  [/void|refund|ملغ|إلغاء|مسترد/i, "void"],
  [/escalat|urgent|مصعّد|تصعيد|عاجل/i, "attention"],
  [/resolv|close|done|complete|won|success|تم|مغلق|مكتمل|منجز|ناجح/i, "done"],
  [/pending|review|wait|hold|انتظار|مراجعة|معلّق/i, "waiting"],
  [/progress|open|new|process|جار|جديد|قيد التنفيذ|مفتوح/i, "active"],
];

export function statusKind(status: string | null | undefined, label?: string | null): StatusKind {
  if (status && FIXED_KIND[status]) return FIXED_KIND[status];
  const text = `${status ?? ""} ${label ?? ""}`;
  return KEYWORDS.find(([re]) => re.test(text))?.[1] ?? "unknown";
}
