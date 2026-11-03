import type { AlertPriority, EntityRef, Snapshot } from "../domain/types";
import { PRIORITY, SERVICE } from "../domain/labels";
import { HOUR, MINUTE, fmtDuration } from "../lib/format";
import type { Indexes } from "../state/indexes";
import { isOpen } from "./requests";

export interface AttentionItem {
  id: string;
  severity: AlertPriority;
  title: string;
  detail: string;
  at: number;
  target: EntityRef;
}

const RANK: Record<AlertPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** What needs the owner right now — derived from records, not from notifications. */
export function needsAttention(d: Snapshot, ix: Indexes, now: number): AttentionItem[] {
  const items: AttentionItem[] = [];
  const open = d.requests.filter(isOpen);

  for (const r of open) {
    const who = r.assigneeId ? ix.employee.get(r.assigneeId)?.name : undefined;
    if (r.dueAt < now) {
      items.push({
        id: `od-${r.id}`,
        severity: r.priority === "critical" || r.priority === "high" ? "critical" : "high",
        title: `${r.code} متأخر ${fmtDuration(now - r.dueAt)}`,
        detail: `${SERVICE[r.type].label} · أولوية ${PRIORITY[r.priority].label}${who ? ` · ${who}` : ""}`,
        at: r.dueAt,
        target: { kind: "request", id: r.id },
      });
    } else if (r.status === "new" && now - r.createdAt > 30 * MINUTE) {
      items.push({
        id: `un-${r.id}`,
        severity: "high",
        title: `${r.code} دون فرز منذ ${fmtDuration(now - r.createdAt)}`,
        detail: SERVICE[r.type].label,
        at: r.createdAt,
        target: { kind: "request", id: r.id },
      });
    } else if (r.status === "waiting_customer" && now - r.updatedAt > 24 * HOUR) {
      items.push({
        id: `wc-${r.id}`,
        severity: "medium",
        title: `${r.code} بانتظار العميل منذ ${fmtDuration(now - r.updatedAt)}`,
        detail: `بحاجة إلى متابعة${who ? ` من ${who}` : ""}`,
        at: r.updatedAt,
        target: { kind: "request", id: r.id },
      });
    }
    if (r.priority === "critical" && r.assigneeId) {
      const p = ix.presence.get(r.assigneeId);
      if (p && (p.status === "offline" || p.status === "away")) {
        items.push({
          id: `ab-${r.id}`,
          severity: "high",
          title: `طلب حرج لدى موظف غير متاح`,
          detail: `${r.code} · ${who}`,
          at: p.since,
          target: { kind: "request", id: r.id },
        });
      }
    }
  }

  for (const o of d.orders) {
    if (o.status === "awaiting_approval") {
      items.push({
        id: `ap-${o.id}`,
        severity: "high",
        title: `${o.code} بانتظار اعتمادك`,
        detail: `${o.value.toLocaleString("en-US")} ر.س · ${ix.customer.get(o.customerId)?.name ?? ""}`,
        at: o.updatedAt,
        target: { kind: "order", id: o.id },
      });
    }
  }

  return items.sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.at - b.at);
}
