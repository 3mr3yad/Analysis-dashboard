import { DAY, HOUR, fmtDate, fmtTime, startOfDay } from "../lib/format";
import type { DateRangeValue } from "../state/dateRange";

export type Bucket = "hour" | "day" | "week";

export interface TimeWindow {
  from: number;
  to: number;
  prevFrom: number;
  prevTo: number;
  bucket: Bucket;
  /** Bucket start times, oldest first. */
  starts: number[];
  label: string;
  compareLabel: string;
}

const SIZE: Record<Bucket, number> = { hour: HOUR, day: DAY, week: 7 * DAY };

function makeStarts(from: number, to: number, bucket: Bucket) {
  const out: number[] = [];
  for (let t = from; t <= to; t += SIZE[bucket]) out.push(t);
  return out;
}

export function resolveRange(v: DateRangeValue, now: number): TimeWindow {
  const today = startOfDay(now);
  let from: number;
  let to = now;
  let bucket: Bucket;
  let label: string;
  let compareLabel = "مقارنة بالفترة السابقة";
  switch (v.preset) {
    case "today":
      from = today;
      bucket = "hour";
      label = "اليوم";
      compareLabel = "مقارنة بأمس حتى الساعة نفسها";
      return { from, to, prevFrom: from - DAY, prevTo: now - DAY, bucket, starts: makeStarts(from, to, bucket), label, compareLabel };
    case "7d":
      from = today - 6 * DAY;
      bucket = "day";
      label = "آخر 7 أيام";
      break;
    case "90d":
      from = today - 90 * DAY;
      bucket = "week";
      label = "آخر 90 يومًا";
      break;
    case "custom": {
      from = startOfDay(v.from ?? today - 29 * DAY);
      to = Math.min(now, startOfDay(v.to ?? today) + DAY - 1);
      const days = Math.ceil((to - from) / DAY);
      bucket = days > 60 ? "week" : days <= 1 ? "hour" : "day";
      label = `${fmtDate(from)} – ${fmtDate(to)}`;
      break;
    }
    default:
      from = today - 29 * DAY;
      bucket = "day";
      label = "آخر 30 يومًا";
  }
  const len = to - from;
  return { from, to, prevFrom: from - len, prevTo: from, bucket, starts: makeStarts(from, to, bucket), label, compareLabel };
}

export function bucketOf(ts: number, w: TimeWindow): number {
  if (ts < w.from || ts > w.to) return -1;
  return Math.min(w.starts.length - 1, Math.floor((ts - w.from) / SIZE[w.bucket]));
}

export function bucketEnd(i: number, w: TimeWindow): number {
  return Math.min(w.starts[i] + SIZE[w.bucket], w.to);
}

export function bucketLabel(start: number, bucket: Bucket): string {
  return bucket === "hour" ? fmtTime(start) : fmtDate(start);
}

export const inRange = (ts: number | undefined, a: number, b: number) => ts !== undefined && ts >= a && ts <= b;

/** Percent change; null when there is no baseline to compare against. */
export function pctChange(curr: number, prev: number): number | null {
  if (!prev) return curr ? null : 0;
  return ((curr - prev) / prev) * 100;
}
