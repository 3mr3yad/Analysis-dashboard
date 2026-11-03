import type { ReactNode } from "react";
import { cx } from "../ui/tone";

/** Tiny trend line for KPI tiles. Gaps (NaN) are skipped. */
export function Sparkline({ values, color = "var(--color-accent)", width = 96, height = 30 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const pts = values.map((v, i) => [i, v] as const).filter(([, v]) => Number.isFinite(v));
  if (pts.length < 2) return <svg width={width} height={height} aria-hidden />;
  const min = Math.min(...pts.map(([, v]) => v));
  const max = Math.max(...pts.map(([, v]) => v));
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * (width - 6) + 1;
  const y = (v: number) => height - 4 - ((v - min) / span) * (height - 8);
  const d = pts.map(([i, v], k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const [li, lv] = pts[pts.length - 1];
  const area = `${d}L${x(li)},${height}L${x(pts[0][0])},${height}Z`;
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible" style={{ direction: "ltr" }}>
      <path d={area} fill={color} opacity={0.08} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(li)} cy={y(lv)} r={2.5} fill={color} stroke="var(--color-surface)" strokeWidth={1.5} />
    </svg>
  );
}

export interface HBarItem {
  key: string;
  label: ReactNode;
  value: number;
  display?: string;
  sub?: ReactNode;
  onClick?: () => void;
  tone?: string;
}

/** Ranked horizontal bars as HTML rows (labels never clip). */
export function HBarList({ items, color = "var(--color-series-1)", max }: { items: HBarItem[]; color?: string; max?: number }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((it) => {
        const Row = it.onClick ? "button" : "div";
        return (
          <li key={it.key}>
            <Row onClick={it.onClick} className={cx("group block w-full text-right", it.onClick && "cursor-pointer")}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
                <span className={cx("truncate text-ink-2", it.onClick && "group-hover:text-ink")}>{it.label}</span>
                <span className="num shrink-0 font-medium text-ink">{it.display ?? it.value}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(it.value / top) * 100}%`, background: it.tone ?? color }} />
              </div>
              {it.sub && <div className="mt-1 text-[11px] text-ink-3">{it.sub}</div>}
            </Row>
          </li>
        );
      })}
    </ul>
  );
}

/** Single-value ring (0–100). */
export function Ring({ value, size = 92, stroke = 7, color = "var(--color-accent)", children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} className="transition-[stroke-dasharray] duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
