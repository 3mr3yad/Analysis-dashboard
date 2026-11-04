import type { ReactNode } from "react";
import { fmtDateTime, fmtDuration, fmtInt, fmtRelative } from "../lib/format";
import { ApiError } from "../services/api/httpClient";
import { useNow } from "../state/clock";
import Icon, { type IconName } from "../ui/Icon";
import { Badge, Button, Dot, ErrorState } from "../ui/primitives";
import { cx } from "../ui/tone";
import { hrefTo } from "./router";
import { SERVICE, STATUS_KIND, isServiceKey, serviceLabel, statusKind } from "./services";
import type { PageMeta, Sla } from "./types";

/** A field this service never records — stated plainly, so a null never looks like a broken cell. */
export function NotTracked({ children = "غير متتبَّع", title }: { children?: ReactNode; title?: string }) {
  return (
    <span className="text-[13px] text-ink-3/70" title={title ?? "هذه الخدمة لا تسجّل هذا الحقل"}>
      {children}
    </span>
  );
}

export function ServiceTag({ service, label, className }: { service: string; label?: string | null; className?: string }) {
  const meta = isServiceKey(service) ? SERVICE[service] : null;
  return (
    <span className={cx("inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-white/[0.03] px-2 py-0.5 text-[13px] text-ink-2", className)}>
      <Icon name={meta?.icon ?? "layers"} size={12} className="shrink-0 text-ink-3" animateOnHover={false} />
      <span className="truncate">{serviceLabel(service, label)}</span>
    </span>
  );
}

/** Phone numbers stay left-to-right; a null phone is "not provided", not an error. */
export function Phone({ value, link = true }: { value: string | null; link?: boolean }) {
  if (!value) return <NotTracked title="لم يُسجَّل رقم جوال لهذا السجل">بدون رقم</NotTracked>;
  const text = (
    <span dir="ltr" className="num text-[13.5px]">
      {value}
    </span>
  );
  return link ? (
    <a href={hrefTo("customers", { phone: value })} className="text-ink-2 hover:text-accent" title="عرض سجل العميل">
      {text}
    </a>
  ) : (
    text
  );
}

export function When({ iso, className }: { iso: string | null | undefined; className?: string }) {
  const now = useNow();
  if (!iso) return <NotTracked />;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return <span className={className}>{iso}</span>;
  return (
    <time dateTime={iso} title={fmtDateTime(t)} className={cx("whitespace-nowrap", className)}>
      {fmtRelative(Math.min(t, now), now)}
    </time>
  );
}

export function AdminLink({ url, compact }: { url: string | null; compact?: boolean }) {
  if (!url) return <NotTracked title="لا توجد شاشة لهذه الخدمة في لوحة الإدارة">{compact ? "—" : "لا توجد شاشة إدارة"}</NotTracked>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-[13.5px] text-accent hover:bg-accent-soft"
      title="فتح السجل في لوحة الإدارة (نافذة جديدة)"
    >
      <Icon name="external" size={13} />
      {!compact && "لوحة الإدارة"}
    </a>
  );
}

export function Note({ children, icon = "alert", tone = "info" }: { children: ReactNode; icon?: IconName; tone?: "info" | "warning" }) {
  return (
    <div
      className={cx(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13.5px] leading-relaxed",
        tone === "warning" ? "border-warning/25 bg-warning/[0.06] text-ink-2" : "border-line bg-white/[0.02] text-ink-2",
      )}
    >
      <Icon name={icon} size={15} className={cx("mt-0.5 shrink-0", tone === "warning" ? "text-warning" : "text-ink-3")} animateOnHover={false} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Pager({ meta, onPage, busy }: { meta: PageMeta; onPage: (page: number) => void; busy?: boolean }) {
  const { current_page: page, last_page: last, per_page: per, total } = meta;
  const from = total ? (page - 1) * per + 1 : 0;
  const to = Math.min(total, page * per);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13.5px] text-ink-3">
      <span>
        <span className="num text-ink-2">
          {fmtInt(from)}–{fmtInt(to)}
        </span>{" "}
        من <span className="num text-ink-2">{fmtInt(total)}</span>
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" disabled={busy || page <= 1} onClick={() => onPage(page - 1)} title="الصفحة السابقة">
          <Icon name="chevron" size={14} className="rotate-180" /> السابق
        </Button>
        <span className="num px-2 text-ink-2">
          {page} / {Math.max(1, last)}
        </span>
        <Button variant="ghost" disabled={busy || page >= last} onClick={() => onPage(page + 1)} title="الصفحة التالية">
          التالي <Icon name="chevron" size={14} />
        </Button>
      </div>
    </div>
  );
}

/** A feature the API document describes but this server doesn't serve yet — said once, quietly. */
export function NotDeployed({ what, endpoint }: { what: string; endpoint: string }) {
  return (
    <Note>
      {what} غير مفعّل على الخادم بعد (<span dir="ltr" className="num">{endpoint}</span> غير موجود). سيظهر هنا تلقائيًا بعد نشره.
    </Note>
  );
}

export function QueryError({ error, onRetry, what }: { error: Error; onRetry: () => void; what: string }) {
  const detail = error instanceof ApiError && error.status === 0 ? error.message : error instanceof ApiError ? `${error.message} (HTTP ${error.status})` : error.message;
  return <ErrorState title={`تعذّر تحميل ${what}`} detail={detail} onRetry={onRetry} />;
}

/** "Updated 2 min ago · refresh" — so the owner knows how fresh a number is. */
export function Freshness({ at, onRefresh, loading }: { at?: number; onRefresh: () => void; loading?: boolean }) {
  const now = useNow();
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-ink-3">
      {at ? <>آخر تحديث {fmtRelative(Math.min(at, now), now)}</> : "جارٍ التحميل…"}
      <button onClick={onRefresh} disabled={loading} className="rounded-md p-1 text-ink-3 hover:bg-hover hover:text-ink disabled:opacity-40" title="تحديث الآن" aria-label="تحديث الآن">
        <Icon name="refresh" size={13} className={loading ? "animate-spin" : undefined} />
      </button>
    </span>
  );
}

/** Time left on the ticket's SLA, ticking from deadline_at. null = closed or no policy for this status. */
export function SlaBadge({ sla }: { sla: Sla | null | undefined }) {
  const now = useNow();
  if (sla === undefined) return <NotTracked title="الخادم لم يُرسل حقل المهلة">—</NotTracked>;
  if (sla === null) return <NotTracked title="الطلب مغلق، أو لا توجد مهلة محددة لهذه الحالة">بلا مهلة</NotTracked>;
  const left = Date.parse(sla.deadline_at) - now;
  const over = sla.is_breached || left <= 0;
  const tight = !over && left < sla.policy_hours * 3600_000 * 0.25;
  return (
    <span title={`${sla.policy_label ?? "المهلة"}: ${fmtInt(sla.policy_hours)} ساعة · الموعد ${fmtDateTime(Date.parse(sla.deadline_at))}`}>
      <Badge tone={over ? "critical" : tight ? "warning" : "good"} className="whitespace-nowrap">
        {over ? `متأخر ${fmtDuration(-left)}` : `متبقٍّ ${fmtDuration(left)}`}
      </Badge>
    </span>
  );
}

const PILL: Record<string, string> = {
  good: "border-good/30 bg-good/[0.09]",
  accent: "border-accent/30 bg-accent/[0.09]",
  warning: "border-warning/30 bg-warning/[0.08]",
  serious: "border-serious/35 bg-serious/[0.09]",
  critical: "border-critical/35 bg-critical/[0.1]",
  muted: "border-white/10 bg-white/[0.03]",
  neutral: "border-white/10 bg-white/[0.04]",
};

/** A status in its meaning's colour. The label text carries the meaning; the colour only groups it. */
export function StatusPill({ status, label, empty = "بدون حالة" }: { status: string | null; label: string | null; empty?: string }) {
  if (!status && !label) return <NotTracked title="هذه الخدمة لا تحتوي على حالة">{empty}</NotTracked>;
  const kind = STATUS_KIND[statusKind(status, label)];
  return (
    <span title={kind.label} className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[13px] text-ink", PILL[kind.tone])}>
      <Dot tone={kind.tone} />
      {label ?? status}
    </span>
  );
}

/** Key for the status colours, shown once near lists that use them. */
export function StatusLegend() {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
      {Object.entries(STATUS_KIND)
        .filter(([k]) => k !== "unknown")
        .map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <Dot tone={v.tone} />
            {v.label}
          </span>
        ))}
    </span>
  );
}
