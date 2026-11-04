import { useState } from "react";
import { labelIndices, niceTicks, useWidth } from "./common";
import { SeriesTable } from "./LineChart";

interface Props {
  labels: string[];
  values: number[];
  format: (n: number) => string;
  color?: string;
  height?: number;
  label: string;
  seriesLabel: string;
}

const PAD = { top: 18, right: 8, bottom: 26, left: 40 };

/** Single-series columns: ≤24px, 4px rounded data-end, 2px gaps, per-bar hover. */
export default function ColumnChart({ labels, values, format, color = "var(--color-series-1)", height = 220, label, seriesLabel }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  const n = values.length;
  const ticks = niceTicks(Math.max(1, ...values));
  const top = ticks[ticks.length - 1];
  const iw = Math.max(10, width - PAD.left - PAD.right);
  const ih = height - PAD.top - PAD.bottom;
  const band = iw / Math.max(1, n);
  const bw = Math.max(2, Math.min(24, band - 2));
  const y = (v: number) => PAD.top + ih - (v / top) * ih;
  const maxIdx = values.indexOf(Math.max(...values));
  const shown = labelIndices(n, iw);

  return (
    <div>
      <div className="mb-2 flex justify-end px-1">
        <button onClick={() => setTable((t) => !t)} className="rounded-md px-2 py-0.5 text-[12.5px] text-ink-3 transition-colors hover:bg-hover hover:text-ink-2" aria-pressed={table}>
          {table ? "عرض الرسم" : "عرض كجدول"}
        </button>
      </div>
      {table ? (
        <SeriesTable labels={labels} series={[{ key: "v", label: seriesLabel, values }]} format={format} label={label} />
      ) : (
        <div ref={ref} className="relative" dir="ltr" style={{ height }}>
          {width > 0 && (
            <svg width={width} height={height} role="img" aria-label={label} className="block">
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--color-axis)" : "var(--color-grid)"} />
                  <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="num fill-ink-3 text-[12px]">
                    {format(t)}
                  </text>
                </g>
              ))}
              {values.map((v, i) => {
                const cx = PAD.left + band * i + band / 2;
                const h = Math.max(0, y(0) - y(v));
                const r = Math.min(4, h, bw / 2);
                const x0 = cx - bw / 2;
                const y0 = y(v);
                const d = h <= 0 ? "" : `M${x0},${y(0)}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bw - r}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r}V${y(0)}Z`;
                return (
                  <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                    <rect x={PAD.left + band * i} y={PAD.top} width={band} height={ih} fill="transparent" />
                    <path d={d} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} className="transition-opacity duration-150" />
                    {i === maxIdx && v > 0 && hover === null && (
                      <text x={cx} y={y0 - 5} textAnchor="middle" className="num fill-ink-2 text-[12px] font-medium">
                        {format(v)}
                      </text>
                    )}
                  </g>
                );
              })}
              {shown.map((i) => (
                <text key={i} x={PAD.left + band * i + band / 2} y={height - 6} textAnchor="middle" className="fill-ink-3 text-[12px]">
                  {labels[i]}
                </text>
              ))}
            </svg>
          )}
          {hover !== null && (
            <div
              className="glass pointer-events-none absolute top-0 z-10 rounded-lg border border-line-strong px-3 py-1.5 shadow-xl"
              style={{ left: Math.min(width - 130, Math.max(0, PAD.left + band * hover + band / 2 - 60)) }}
              dir="rtl"
            >
              <p className="text-[12.5px] text-ink-3">{labels[hover]}</p>
              <p className="num text-[14.5px] font-semibold text-ink" style={{ textAlign: "right" }}>
                {format(values[hover])}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
