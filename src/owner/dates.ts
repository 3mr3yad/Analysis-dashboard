// Business dates are Asia/Riyadh calendar days, the timezone the API buckets by.

const riyadh = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" });

/** YYYY-MM-DD in Riyadh for a timestamp. */
export const riyadhDate = (ts: number) => riyadh.format(ts);

export function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
