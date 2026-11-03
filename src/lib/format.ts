// Formatting helpers. Western digits are used for numbers (standard in Saudi business
// reporting); dates use Arabic month/day names on the Gregorian calendar.

const LOCALE = "ar-SA-u-nu-latn-ca-gregory";

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function fmtInt(n: number): string {
  return intFmt.format(Math.round(n));
}

export function fmtCompact(n: number): string {
  return Math.abs(n) >= 10_000 ? compactFmt.format(n) : intFmt.format(Math.round(n));
}

export function fmtMoney(n: number, compact = false): string {
  return `${compact ? fmtCompact(n) : fmtInt(n)} ر.س`;
}

export function fmtPct(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}

export function fmtDelta(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`;
}

/** Duration in ms → "3س 12د" / "18 دقيقة" / "2 يوم". */
export function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const m = Math.round(ms / MINUTE);
  if (m < 1) return "أقل من دقيقة";
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) {
    const rm = m % 60;
    return rm ? `${h}س ${rm}د` : `${h} ساعة`;
  }
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}ي ${rh}س` : `${d} يوم`;
}

/** Short hours figure for KPI-style display, e.g. "4.2 س". */
export function fmtHours(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  const h = ms / HOUR;
  if (h < 1) return `${Math.round(ms / MINUTE)} د`;
  return `${h < 10 ? h.toFixed(1) : Math.round(h)} س`;
}

export function fmtRelative(ts: number, now: number): string {
  const diff = now - ts;
  if (diff < 0) {
    const ahead = -diff;
    if (ahead < HOUR) return `خلال ${Math.max(1, Math.round(ahead / MINUTE))} د`;
    if (ahead < DAY) return `خلال ${Math.round(ahead / HOUR)} س`;
    return `خلال ${Math.round(ahead / DAY)} يوم`;
  }
  if (diff < MINUTE) return "الآن";
  if (diff < HOUR) return `قبل ${Math.round(diff / MINUTE)} د`;
  if (diff < DAY) return `قبل ${Math.round(diff / HOUR)} س`;
  if (diff < 7 * DAY) return `قبل ${Math.round(diff / DAY)} يوم`;
  return fmtDate(ts);
}

const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short" });
const dateYearFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", hour12: false });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const longDateFmt = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const fmtDate = (ts: number) => dateFmt.format(ts);
export const fmtDateYear = (ts: number) => dateYearFmt.format(ts);
export const fmtTime = (ts: number) => timeFmt.format(ts);
export const fmtDateTime = (ts: number) => dateTimeFmt.format(ts);
export const fmtLongDate = (ts: number) => longDateFmt.format(ts);

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function toInputDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromInputDate(s: string): number | null {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
