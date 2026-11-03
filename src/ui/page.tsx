import { AnimateIcon } from "@animate-ui/react/icons";
import type { ReactNode } from "react";
import type { Kpi } from "../analytics/requests";
import { Sparkline } from "../charts/small";
import { fmtCompact, fmtDelta, fmtInt, fmtPct } from "../lib/format";
import Icon, { type IconName } from "./Icon";
import { cx } from "./tone";
import { useCountUp } from "./useCountUp";
import { changeClass, useChanged } from "./useChanged";

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-ink sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

function formatKpi(k: Pick<Kpi, "format">, v: number) {
  if (!Number.isFinite(v)) return "—";
  return k.format === "money" ? fmtCompact(v) : k.format === "pct" ? fmtPct(v) : fmtInt(v);
}

const KPI_ICON: Record<string, IconName> = {
  total: "layers",
  today: "sparkle",
  active: "bolt",
  completed: "checkCircle",
  pending: "pause",
  overdue: "clock",
  orders: "orders",
  revenue: "money",
  employees: "users",
  csat: "smile",
};

export function KpiCard({ kpi, href, compareLabel }: { kpi: Kpi; href: string; compareLabel: string }) {
  const animated = useCountUp(kpi.value);
  const d = kpi.delta;
  const up = d !== null && d > 0.05;
  const down = d !== null && d < -0.05;
  const good = kpi.polarity === "up-good" ? up : kpi.polarity === "up-bad" ? down : false;
  const bad = kpi.polarity === "up-good" ? down : kpi.polarity === "up-bad" ? up : false;
  const alarm = kpi.key === "overdue" && kpi.value > 0;
  const changed = useChanged(kpi.value, compareLabel);

  return (
    <AnimateIcon animateOnHover asChild>
      <a
        href={href}
        className={cx(
          "card group relative flex flex-col justify-between overflow-hidden p-4 transition-[border-color,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong",
          changeClass(changed),
        )}
        aria-label={`${kpi.label}: ${formatKpi(kpi, kpi.value)}`}
        title={kpi.hint}
      >
        {alarm && <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-critical/70 to-transparent" />}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[12px] text-ink-3">
            <span className={cx("flex size-6 items-center justify-center rounded-md border border-line bg-white/[0.02]", alarm ? "text-critical" : "text-ink-3 group-hover:text-accent")}>
              <Icon name={KPI_ICON[kpi.key] ?? "layers"} size={13} />
            </span>
            <span className="truncate">{kpi.label}</span>
          </span>
          <Icon name="arrowUp" size={13} className="text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className={cx("num text-[22px] leading-none font-semibold tracking-tight sm:text-[26px]", alarm ? "text-critical" : "text-ink")} style={{ textAlign: "right" }}>
              {formatKpi(kpi, kpi.format === "pct" ? animated : Math.round(animated))}
              {kpi.format === "money" && <span className="ml-1 text-[12px] font-normal text-ink-3">ر.س</span>}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px]" title={compareLabel}>
              {d === null ? (
                <span className="text-ink-3">لا توجد فترة مقارنة</span>
              ) : (
                <>
                  <span className={cx("num inline-flex items-center gap-0.5 font-medium", good ? "text-good" : bad ? "text-critical" : "text-ink-2")}>
                    {(up || down) && <Icon name={up ? "arrowUp" : "arrowDown"} size={11} strokeWidth={2} />}
                    {fmtDelta(d)}
                  </span>
                  <span className="hidden truncate text-ink-3 sm:inline">{kpi.compare ?? "عن الفترة السابقة"}</span>
                </>
              )}
            </p>
            {kpi.extra && (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-2">
                <span className="size-1.5 rounded-full bg-good" />
                {kpi.extra}
              </p>
            )}
          </div>
          <span className="hidden shrink-0 sm:block">
            <Sparkline values={kpi.trend} color={alarm ? "var(--color-critical)" : "var(--color-accent)"} width={72} height={28} />
          </span>
        </div>
      </a>
    </AnimateIcon>
  );
}
