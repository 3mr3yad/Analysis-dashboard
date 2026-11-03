import type { ActivityEvent, Customer, Employee, EmployeePresence, ID, Order, ServiceRequest, Snapshot } from "../domain/types";
import { useDashboard } from "./store";

export interface Indexes {
  employee: Map<ID, Employee>;
  presence: Map<ID, EmployeePresence>;
  customer: Map<ID, Customer>;
  request: Map<ID, ServiceRequest>;
  order: Map<ID, Order>;
  activityBySubject: Map<ID, ActivityEvent[]>;
  activityByCustomer: Map<ID, ActivityEvent[]>;
  activityByEmployee: Map<ID, ActivityEvent[]>;
  requestsByCustomer: Map<ID, ServiceRequest[]>;
  requestsByAssignee: Map<ID, ServiceRequest[]>;
  ordersByCustomer: Map<ID, Order[]>;
}

function group<T>(items: T[], key: (t: T) => ID | undefined): Map<ID, T[]> {
  const m = new Map<ID, T[]>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

export function buildIndexes(d: Snapshot): Indexes {
  return {
    employee: new Map(d.employees.map((x) => [x.id, x])),
    presence: new Map(d.presence.map((x) => [x.employeeId, x])),
    customer: new Map(d.customers.map((x) => [x.id, x])),
    request: new Map(d.requests.map((x) => [x.id, x])),
    order: new Map(d.orders.map((x) => [x.id, x])),
    activityBySubject: group(d.activity, (a) => a.subject.id),
    activityByCustomer: group(d.activity, (a) => a.customerId),
    activityByEmployee: group(d.activity, (a) => (a.actor.type === "employee" ? a.actor.id : undefined)),
    requestsByCustomer: group(d.requests, (r) => r.customerId),
    requestsByAssignee: group(d.requests, (r) => r.assigneeId),
    ordersByCustomer: group(d.orders, (o) => o.customerId),
  };
}

const cache = new WeakMap<Snapshot, Indexes>();

export function indexesFor(d: Snapshot): Indexes {
  let ix = cache.get(d);
  if (!ix) cache.set(d, (ix = buildIndexes(d)));
  return ix;
}

/** Snapshot + lookup maps, built once per snapshot and shared by every component. */
export function useData(): { data: Snapshot; ix: Indexes } {
  const data = useDashboard((s) => s.data);
  if (!data) throw new Error("useData called before the snapshot loaded");
  return { data, ix: indexesFor(data) };
}
