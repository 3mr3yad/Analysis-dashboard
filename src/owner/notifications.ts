import { useEffect } from "react";
import { api } from "./api";
import type { Priority } from "./types";
import { useQuery } from "./useQuery";
import type { Tone } from "../domain/labels";

// Alerts are computed by the server on every call; only "read" is stored. The bell and the alerts
// page share one cache entry, and marking read refreshes every mounted subscriber.

const subscribers = new Set<() => void>();

export function useNotifications() {
  const q = useQuery("notifications", (force) => api.notifications(force), 60_000);
  const { reload } = q;
  useEffect(() => {
    subscribers.add(reload);
    return () => {
      subscribers.delete(reload);
    };
  }, [reload]);
  return q;
}

export async function markRead(ids: string[]) {
  if (!ids.length) return;
  await api.markRead(ids);
  subscribers.forEach((r) => r());
}

export const PRIORITY: Record<Priority, { label: string; tone: Tone; rank: number }> = {
  critical: { label: "حرج", tone: "critical", rank: 0 },
  high: { label: "مرتفع", tone: "serious", rank: 1 },
  medium: { label: "متوسط", tone: "warning", rank: 2 },
  low: { label: "منخفض", tone: "muted", rank: 3 },
};
