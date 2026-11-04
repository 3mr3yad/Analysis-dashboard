// Shapes returned by the Wafi Owner Dashboard API (DASHBOARD_API.md). Nullable fields are
// "not tracked for this service" — the UI shows that explicitly and never fills them in.

export type ServiceKey =
  | "resale"
  | "refund"
  | "warranty"
  | "customer_support"
  | "follower_gifts"
  | "sales"
  | "over_stage"
  | "creator_applications"
  | "payments";

export interface Person {
  id: number;
  name: string;
}

export interface LastActivity {
  description: string;
  by: string | null;
  at: string;
}

export interface Ticket {
  service: ServiceKey;
  service_label: string;
  id: number;
  request_number: number | string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: string | null;
  status_label: string | null;
  /** Service-specific; shape differs per service. */
  extra: Record<string, unknown> | null;
  assigned_to: Person | null;
  created_by: Person | null;
  has_activity_trail: boolean;
  last_activity: LastActivity | null;
  /** null when closed or no policy covers this (service, status). */
  sla?: Sla | null;
  admin_url: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PageMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  note?: string;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface Summary {
  distinct_customers: number;
  services: Partial<Record<ServiceKey, { label: string; total: number; today: number }>>;
  generated_at: string;
}

export interface ActivityItem {
  service: ServiceKey;
  subject_id: number;
  action: string;
  description: string;
  by: string | null;
  at: string;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string | null;
  roles: string[];
  customer_support: { assigned_open: number; created_total: number } | null;
  sales_created_total: number | null;
  over_stage_created_total: number | null;
}

export interface CustomerHistory {
  phone: string;
  total_tickets: number;
  tickets: Ticket[];
}

export interface TicketQuery {
  service?: ServiceKey;
  status?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

/** One entry of a record's history. For ActivityLog-backed services `status` is the action key and `status_label` a full sentence. */
export interface HistoryEntry {
  status: string | null;
  status_label: string | null;
  by: string | null;
  at: string;
}

export interface TicketDetail extends Ticket {
  history: HistoryEntry[];
}

export type Bucket = "day" | "week" | "month";

export interface RangeMeta {
  bucket: Bucket;
  timezone: string;
  from: string;
  to: string;
  currency?: string;
}

/** `closed` is null where the service has no open→closed lifecycle at all — not "zero closed". */
export interface TimeseriesBucket {
  bucket: string;
  services: Partial<Record<ServiceKey, { created: number; closed: number | null }>>;
}

export interface RevenueBucket {
  bucket: string;
  amount_sar: number;
  refunded_sar: number;
  net_sar: number;
  count: number;
}

export interface CustomerRow {
  phone: string;
  name: string | null;
  total_tickets: number;
  services_used: ServiceKey[];
  open_tickets: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
  /** null = no payment attributed to this phone (not "paid nothing"). */
  paid_total_sar: number | null;
}

export interface Order {
  id: number;
  status: string | null;
  status_label: string | null;
  value: number | null;
  customer: { name: string | null; phone: string | null; company_name: string | null };
  created_by: Person | null;
  admin_url: string | null;
  created_at: string;
  updated_at: string | null;
}

export type Priority = "critical" | "high" | "medium" | "low";

export interface OwnerNotification {
  id: string;
  priority: Priority;
  title: string;
  detail: string;
  at: string;
  target: { service: ServiceKey; id: number } | null;
  read: boolean;
}

export interface StaffStats {
  user_id: number;
  period: { from: string | null; to: string | null };
  customer_support: {
    completed_count: number | null;
    currently_open_assigned: number | null;
    avg_resolution_seconds: number | null;
    avg_first_response_seconds: number | null;
  } | null;
  resale: { completed_count: number | null; currently_open_assigned: number | null } | null;
  created_totals: Partial<Record<ServiceKey, number>>;
}

/** `since` is the last recorded touch (or created_at), a close proxy for "entered this status". */
export interface Sla {
  policy_hours: number;
  policy_label: string | null;
  since: string;
  deadline_at: string;
  is_breached: boolean;
  /** Negative = overdue by that much. */
  remaining_seconds: number;
}

/** `status: ""` is the service-wide catchall. */
export interface SlaPolicy {
  id: number;
  service: ServiceKey;
  status: string;
  hours: number;
  label: string | null;
}

/** A row from the iPhone 18 Purchases module — customer order data plus its linked Moyasar payment, if any. */
export interface Iphone18Order {
  id: number;
  order_number: string;
  status: "pending_payment" | "paid" | "cancelled" | string;
  status_label: string;
  amount_sar: number;
  customer: { name: string; phone: string; email: string };
  variant: { color_label_ar: string; storage_label: string } | null;
  fulfillment_method: "pickup" | "shipping";
  branch: { name_ar: string; city: string | null } | null;
  pickup_date: string | null;
  pickup_time: string | null;
  shipping_address: { city: string; district: string; national_address: string } | null;
  payment: {
    status: string;
    moyasar_id: string;
    amount_sar: number;
    fee_sar: number | null;
    source_type: string | null;
    paid_at: string | null;
  } | null;
  created_at: string;
}

export interface Iphone18Summary {
  total_orders: number;
  pending_payment: number;
  paid: number;
  cancelled: number;
  paid_amount_sar: number;
  today_orders: number;
  generated_at: string;
}

export interface OnlineStaff {
  user: Person;
  route_name: string | null;
  last_seen_at: string;
  /** null when the admin page open isn't a single-ticket screen. */
  viewing: Ticket | null;
}
