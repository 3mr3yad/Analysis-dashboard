import { ORDER_STATUS, PRESENCE, PRIORITY, REQUEST_STATUS } from "../domain/labels";
import type { OrderStatus, PresenceStatus, Priority, RequestStatus } from "../domain/types";
import Icon from "./Icon";
import { Badge, Dot } from "./primitives";
import { TONE_TEXT, cx } from "./tone";

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const m = REQUEST_STATUS[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = ORDER_STATUS[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/** Only critical/high get colour + icon; medium/low stay quiet. */
export function PriorityTag({ priority }: { priority: Priority }) {
  const m = PRIORITY[priority];
  const loud = priority === "critical" || priority === "high";
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] font-medium", loud ? TONE_TEXT[m.tone] : "text-ink-3")}>
      {loud ? <Icon name="flag" size={12} /> : <span className="inline-block w-3 text-center">·</span>}
      {m.label}
    </span>
  );
}

export function OverdueTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-critical/10 px-1.5 py-0.5 text-[11px] font-medium text-critical">
      <Icon name="clock" size={11} />
      متأخر
    </span>
  );
}

export function PresenceBadge({ status, simulated }: { status: PresenceStatus; simulated?: boolean }) {
  const m = PRESENCE[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-2" title={simulated ? "حالة محاكاة — ليست حضورًا فعليًا" : undefined}>
      <Dot tone={m.tone} pulse={status === "busy" || status === "available"} />
      {m.label}
      {simulated && <span className="text-[10px] text-warning/80">(محاكاة)</span>}
    </span>
  );
}
