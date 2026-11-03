import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "../ui/tone";
import { labelIndices, niceTicks, useWidth } from "./common";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface Props {
  labels: string[];
  series: LineSeries[];
  format: (n: number) => string;
  height?: number;
  area?: boolean;
  label: string;
  /** Upper bound for the y-axis (e.g. 100 for percentages). */
  yMax?: number;
}

const PAD = { top: 12, right: 44, bottom: 26, left: 40 };

/** Multi-series line chart with crosshair tooltip, legend, direct end labels and a table view. */
export default function LineChart({ labels, series, format, height = 240, area = true, label, yMax }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const gid = useId().replace(/:/g, "");

  const n = labels.length;
  const finite = series.flatMap((s) => s.values.filter(Number.isFinite));
  const ticks = niceTicks(yMax ?? Math.max(1, ...finite));
  const top = yMax ?? ticks[ticks.length - 1];
  const iw = Math.max(10, width - PAD.left - PAD.right);
  const ih = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / top) * ih;

  const paths = series.map((s) => {
    let d = "";
    let a = "";
    let segStart = -1;
    s.values.forEach((v, i) => {
      if (!Number.isFinite(v)) {
        if (segStart >= 0) a += `L${x(i - 1)},${y(0)}L${x(segStart)},${y(0)}Z`;
        segStart = -1;
        return;
      }
      if (segStart < 0) {
        segStart = i;
        d += `M${x(i)},${y(v)}`;
        a += `M${x(i)},${y(v)}`;
      } else {
        d += `L${x(i)},${y(v)}`;
        a += `L${x(i)},${y(v)}`;
      }
    });
    if (segStart >= 0) a += `L${x(n - 1)},${y(0)}L${x(segStart)},${y(0)}Z`;
    return { d, a };
  });

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round((px / rect.width) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === "Escape") setHover(null);
  };

  const shown = labelIndices(n, iw);
  const tipLeft = hover !== null ? x(hover) : 0;
  const tipFlip = tipLeft > width * 0.6;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        {series.length > 1 ? (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-2">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="h-[2px] w-3.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <button onClick={() => setTable((t) => !t)} className="rounded-md px-2 py-0.5 text-[11px] text-ink-3 transition-colors hover:bg-hover hover:text-ink-2" aria-pressed={table}>
          {table ? "عرض الرسم" : "عرض كجدول"}
        </button>
      </div>

      {table ? (
        <SeriesTable labels={labels} series={series} format={format} label={label} />
      ) : (
        <div ref={ref} className="relative" dir="ltr" style={{ height }}>
          {width > 0 && (
            <svg width={width} height={height} role="img" aria-label={label} tabIndex={0} onKeyDown={onKey} onBlur={() => setHover(null)} className="block focus:outline-none">
              <defs>
                {series.map((s) => (
                  <linearGradient key={s.key} id={`${gid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.16} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--color-axis)" : "var(--color-grid)"} strokeWidth={1} />
                  <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="num fill-ink-3 text-[10.5px]">
                    {format(t)}
                  </text>
                </g>
              ))}
              {shown.map((i) => (
                <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-ink-3 text-[10.5px]">
                  {labels[i]}
                </text>
              ))}
              {area &&
                paths.map((p, si) => (
                  <path key={`a-${series[si].key}`} d={p.a} fill={`url(#${gid}-${series[si].key})`} className="transition-[d] duration-500" />
                ))}
              {paths.map((p, si) => (
                <path key={series[si].key} d={p.d} fill="none" stroke={series[si].color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {/* Direct end labels (selective: last point only) */}
              {hover === null &&
                series.length <= 4 &&
                series.map((s) => {
                  const last = s.values.length - 1;
                  const v = s.values[last];
                  if (!Number.isFinite(v)) return null;
                  return (
                    <g key={`e-${s.key}`}>
                      <circle cx={x(last)} cy={y(v)} r={4} fill={s.color} stroke="var(--color-surface)" strokeWidth={2} />
                      <text x={x(last) + 8} y={y(v)} dy="0.32em" className="num fill-ink-2 text-[10.5px] font-medium">
                        {format(v)}
                      </text>
                    </g>
                  );
                })}
              {hover !== null && (
                <g pointerEvents="none">
                  <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--color-line-strong)" strokeWidth={1} />
                  {series.map((s) =>
                    Number.isFinite(s.values[hover]) ? <circle key={s.key} cx={x(hover)} cy={y(s.values[hover])} r={4} fill={s.color} stroke="var(--color-surface)" strokeWidth={2} /> : null,
                  )}
                </g>
              )}
              <rect x={PAD.left} y={PAD.top} width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
            </svg>
          )}
          {hover !== null && (
            <div
              className="glass pointer-events-none absolute top-1 z-10 min-w-36 rounded-lg border border-line-strong px-3 py-2 shadow-xl"
              style={tipFlip ? { right: width - tipLeft + 12 } : { left: tipLeft + 12 }}
              dir="rtl"
            >
              <p className="mb-1 text-[11px] text-ink-3">{labels[hover]}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-4 text-[12px]">
                  <span className="flex items-center gap-1.5 text-ink-3">
                    <span className="h-[2px] w-3 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="num font-semibold text-ink">{Number.isFinite(s.values[hover]) ? format(s.values[hover]) : "—"}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SeriesTable({ labels, series, format, label }: { labels: string[]; series: { key: string; label: string; values: number[] }[]; format: (n: number) => string; label: string }) {
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-line">
      <table className="w-full text-[12px]" aria-label={label}>
        <thead className="sticky top-0 bg-surface-2">
          <tr>
            <th className="px-3 py-2 text-right font-medium text-ink-3">الفترة</th>
            {series.map((s) => (
              <th key={s.key} className="px-3 py-2 text-right font-medium text-ink-3">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={i} className={cx("border-t border-line/60")}>
              <td className="px-3 py-1.5 text-ink-2">{l}</td>
              {series.map((s) => (
                <td key={s.key} className="num px-3 py-1.5 text-right text-ink">
                  {Number.isFinite(s.values[i]) ? format(s.values[i]) : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
