import type {
  ActivityEvent,
  DataOrigin,
  EmployeePresence,
  ID,
  Notification,
  Order,
  ServiceRequest,
  Snapshot,
} from "../domain/types";

/** Contract every data backend implements (mock today, Laravel API when endpoints exist). */
export interface DashboardDataSource {
  readonly origin: DataOrigin;
  loadSnapshot(signal?: AbortSignal): Promise<Snapshot>;
  markNotificationsRead(ids: ID[]): Promise<void>;
}

/** Events pushed by the realtime channel. Payloads are already mapped to domain models. */
export type RealtimeEvent =
  | { type: "request.upserted"; request: ServiceRequest; activity?: ActivityEvent }
  | { type: "order.upserted"; order: Order; activity?: ActivityEvent }
  | { type: "presence.updated"; presence: EmployeePresence }
  | { type: "notification.created"; notification: Notification };

export type RealtimeStatus = "idle" | "connecting" | "connected" | "disconnected" | "unavailable";

export interface RealtimeSource {
  readonly origin: DataOrigin;
  connect(onEvent: (e: RealtimeEvent) => void, onStatus: (s: RealtimeStatus) => void): () => void;
}
