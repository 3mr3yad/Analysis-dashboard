// Domain models shared by every layer (UI, analytics, services).
// These are the shapes the dashboard consumes; API responses are mapped into them
// inside the service layer so the UI never depends on backend DTOs.

export type ID = string;

export type Priority = "critical" | "high" | "medium" | "low";

export type RequestStatus =
  | "new"
  | "under_review"
  | "assigned"
  | "in_progress"
  | "waiting_customer"
  | "completed"
  | "closed"
  | "rejected"
  | "cancelled"
  | "on_hold";

/** Wafi's service lines (mirrors the services exposed by the backend). */
export type ServiceType =
  | "replacement"
  | "voucher_refund"
  | "warranty"
  | "customer_service"
  | "follower_gifts"
  | "sales"
  | "over_stage"
  | "creator_requests";

export type Department = "customer_care" | "sales" | "after_sales" | "marketing" | "operations";

/** incoming = customer → company, outgoing = company → customer (follow-ups, outreach). */
export type Direction = "incoming" | "outgoing";

export type PresenceStatus = "available" | "busy" | "away" | "offline";

export type OrderStatus = "new" | "processing" | "awaiting_approval" | "completed" | "cancelled";

export type CustomerSegment = "vip" | "regular" | "new";
export type CustomerStatus = "active" | "inactive" | "at_risk";

export type EntityKind = "request" | "order" | "customer" | "employee";
export interface EntityRef {
  kind: EntityKind;
  id: ID;
}

export interface Employee {
  id: ID;
  name: string;
  title: string;
  department: Department;
  joinedAt: number;
}

export interface CurrentWork {
  requestId: ID;
  customerId: ID;
  action: string;
  startedAt: number;
}

export interface EmployeePresence {
  employeeId: ID;
  status: PresenceStatus;
  since: number;
  lastActivityAt: number;
  current?: CurrentWork;
}

export interface Customer {
  id: ID;
  code: string;
  name: string;
  phone: string;
  city: string;
  segment: CustomerSegment;
  status: CustomerStatus;
  accountManagerId: ID;
  createdAt: number;
}

export interface StatusChange {
  at: number;
  status: RequestStatus;
}

export interface ServiceRequest {
  id: ID;
  code: string;
  customerId: ID;
  type: ServiceType;
  direction: Direction;
  assigneeId?: ID;
  department: Department;
  priority: Priority;
  status: RequestStatus;
  /** Ordered status transitions; lets analytics reconstruct the state at any point in time. */
  history: StatusChange[];
  createdAt: number;
  updatedAt: number;
  dueAt: number;
  firstResponseAt?: number;
  /** Set when the request reaches a terminal status. */
  endedAt?: number;
  currentAction: string;
  nextAction?: string;
  /** 1–5 customer rating, when the customer left one. */
  rating?: number;
  orderId?: ID;
}

export interface Order {
  id: ID;
  code: string;
  customerId: ID;
  assigneeId: ID;
  value: number;
  items: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  expectedAt: number;
  completedAt?: number;
}

export type ActivityKind =
  | "created"
  | "assigned"
  | "status_change"
  | "note"
  | "customer_message"
  | "employee_message"
  | "document"
  | "approval"
  | "order";

export interface ActivityEvent {
  id: ID;
  at: number;
  kind: ActivityKind;
  actor: { type: "employee" | "customer" | "system"; id?: ID };
  subject: EntityRef;
  customerId: ID;
  description: string;
  result?: string;
  nextAction?: string;
}

export type AlertPriority = "critical" | "high" | "medium" | "low";

export interface Notification {
  id: ID;
  at: number;
  priority: AlertPriority;
  title: string;
  body: string;
  target: EntityRef;
  read: boolean;
}

/** Everything the dashboard needs at once. Analytics are computed client-side from it. */
export interface Snapshot {
  generatedAt: number;
  employees: Employee[];
  presence: EmployeePresence[];
  customers: Customer[];
  requests: ServiceRequest[];
  orders: Order[];
  activity: ActivityEvent[];
  notifications: Notification[];
}

/** Where the data on screen came from. The UI labels anything that is not `api`. */
export type DataOrigin = "mock" | "api";
