import { useEffect, useRef, useState } from "react";
import { DAY, fromInputDate, startOfDay, toInputDate } from "../lib/format";
import { useNow } from "../state/clock";
import { setDateRange, useDateRange, type RangePreset } from "../state/dateRange";
import Icon from "./Icon";
import { cx } from "./tone";

const PRESETS: { value: Exclude<RangePreset, "custom">; label: string; short: string }[] = [
  { value: "today", label: "اليوم", short: "اليوم" },
  { value: "7d", label: "آخر 7 أيام", short: "7 أيام" },
  { value: "30d", label: "آخر 30 يومًا", short: "30 يومًا" },
  { value: "90d", label: "آخر 90 يومًا", short: "90 يومًا" },
];

/** Global period filter. It scopes every KPI, chart and table that is period-based. */
export default function DateRangeControl({ label }: { label?: string }) {
  const range = useDateRange();
  const [open, setOpen] = useState(false);
  const today = startOfDay(useNow());
  const [from, setFrom] = useState(toInputDate(range.from ?? today - 29 * DAY));
  const [to, setTo] = useState(toInputDate(range.to ?? today));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const f = fromInputDate(from);
  const t = fromInputDate(to);
  const valid = f !== null && t !== null && f <= t && t <= today;

  return (
    <div ref={ref} className="relative inline-flex items-center gap-2">
      <div role="tablist" aria-label="الفترة الزمنية" className="inline-flex rounded-lg border border-line bg-white/[0.02] p-0.5">
        {PRESETS.map((p) => {
          const active = range.preset === p.value;
          return (
            <button
              key={p.value}
              role="tab"
              aria-selected={active}
              onClick={() => setDateRange({ preset: p.value })}
              className={cx(
                "rounded-md px-2.5 py-1 text-[13.5px] font-medium whitespace-nowrap transition-colors duration-150",
                active ? "bg-raised text-ink shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]" : "text-ink-3 hover:text-ink-2",
              )}
            >
              <span className="hidden sm:inline">{p.label}</span>
              <span className="sm:hidden">{p.short}</span>
            </button>
          );
        })}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cx(
            "flex items-center gap-1 rounded-md px-2.5 py-1 text-[13.5px] font-medium whitespace-nowrap transition-colors duration-150",
            range.preset === "custom" ? "bg-raised text-ink shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]" : "text-ink-3 hover:text-ink-2",
          )}
        >
          <Icon name="calendar" size={13} />
          <span className="hidden sm:inline">{range.preset === "custom" ? label ?? "مخصص" : "مخصص"}</span>
        </button>
      </div>

      {open && (
        <div role="dialog" aria-label="فترة مخصصة" className="glass fade-in absolute top-full left-0 z-40 mt-2 w-72 rounded-xl border border-line-strong p-4 shadow-2xl">
          <p className="mb-3 text-[14px] font-semibold text-ink">فترة مخصصة</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[12.5px] text-ink-3">
              من
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="num mt-1 w-full rounded-md border border-line bg-surface-2 px-2 py-1.5 text-[13.5px] text-ink [color-scheme:dark]" />
            </label>
            <label className="text-[12.5px] text-ink-3">
              إلى
              <input type="date" value={to} min={from} max={toInputDate(today)} onChange={(e) => setTo(e.target.value)} className="num mt-1 w-full rounded-md border border-line bg-surface-2 px-2 py-1.5 text-[13.5px] text-ink [color-scheme:dark]" />
            </label>
          </div>
          {!valid && <p className="mt-2 text-[12.5px] text-serious">تحقق من التواريخ: البداية قبل النهاية ولا تتجاوز اليوم.</p>}
          <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
            <button onClick={() => setOpen(false)} className="rounded-md px-3 py-1.5 text-[13.5px] text-ink-3 hover:text-ink">
              إلغاء
            </button>
            <button
              disabled={!valid}
              onClick={() => {
                setDateRange({ preset: "custom", from: f!, to: t! });
                setOpen(false);
              }}
              className="rounded-md bg-accent px-3 py-1.5 text-[13.5px] font-semibold text-[#0b1020] disabled:opacity-40"
            >
              تطبيق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
