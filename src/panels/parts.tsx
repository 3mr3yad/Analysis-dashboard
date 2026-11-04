import type { ReactNode } from "react";
import type { EntityRef } from "../domain/types";
import { openPanel } from "../state/router";
import Icon, { type IconName } from "../ui/Icon";
import { Avatar } from "../ui/primitives";
import { cx } from "../ui/tone";

export function PanelHeader({ eyebrow, title, meta, children }: { eyebrow: ReactNode; title: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="border-b border-line px-6 pt-6 pb-5">
      <p className="mb-1.5 text-[13px] text-ink-3">{eyebrow}</p>
      <h2 className="pl-10 text-[21px] leading-tight font-semibold text-ink">{title}</h2>
      {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      {children}
    </div>
  );
}

export function PanelSection({ title, children, icon, action }: { title: string; children: ReactNode; icon?: IconName; action?: ReactNode }) {
  return (
    <section className="border-b border-line px-6 py-5 last:border-0">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink-2">
          {icon && <Icon name={icon} size={14} className="text-ink-3" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[12.5px] text-ink-3">{k}</dt>
          <dd className="mt-0.5 truncate text-[14px] text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PersonLink({ name, id, kind, sub, size = 28 }: { name: string; id: string; kind: EntityRef["kind"]; sub?: ReactNode; size?: number }) {
  return (
    <button onClick={() => openPanel({ kind, id })} className="group flex min-w-0 items-center gap-2.5 text-right">
      <Avatar name={name} id={id} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-[14px] text-ink group-hover:text-accent">{name}</span>
        {sub && <span className="block truncate text-[12.5px] text-ink-3">{sub}</span>}
      </span>
    </button>
  );
}

export function Callout({ icon = "target", children, tone = "accent" }: { icon?: IconName; children: ReactNode; tone?: "accent" | "critical" | "warning" }) {
  return (
    <div
      className={cx(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[14px] leading-relaxed",
        tone === "accent" && "border-accent/20 bg-accent-soft text-ink",
        tone === "critical" && "border-critical/25 bg-critical/[0.07] text-ink",
        tone === "warning" && "border-warning/25 bg-warning/[0.06] text-ink",
      )}
    >
      <Icon name={icon} size={15} className={cx("mt-0.5 shrink-0", tone === "accent" ? "text-accent" : tone === "critical" ? "text-critical" : "text-warning")} />
      <div>{children}</div>
    </div>
  );
}

/** Horizontal stepper for a workflow. `current` may be a side status shown as a note. */
export function Stepper({ steps, currentIndex, labels, tone = "accent" }: { steps: string[]; currentIndex: number; labels: Record<string, string>; tone?: "accent" | "muted" }) {
  return (
    <ol className="flex items-start gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <li key={s} className="flex min-w-[64px] flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <span className={cx("h-px flex-1", i === 0 ? "opacity-0" : done || current ? "bg-accent/60" : "bg-line-strong")} />
              <span
                className={cx(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[11.5px]",
                  done && "border-accent/50 bg-accent/20 text-accent",
                  current && (tone === "accent" ? "border-accent bg-accent text-[#0b1020] shadow-[0_0_0_4px_rgb(143_179_255/0.15)]" : "border-ink-3 bg-ink-3 text-surface"),
                  !done && !current && "border-line-strong text-ink-3",
                )}
              >
                {done ? <Icon name="check" size={11} strokeWidth={2.4} /> : <span className="num">{i + 1}</span>}
              </span>
              <span className={cx("h-px flex-1", i === steps.length - 1 ? "opacity-0" : done ? "bg-accent/60" : "bg-line-strong")} />
            </div>
            <span className={cx("text-[12px] leading-tight", current ? "font-semibold text-ink" : done ? "text-ink-2" : "text-ink-3")}>{labels[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function NotFound({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-24 text-center">
      <Icon name="search" size={22} className="text-ink-3" />
      <p className="text-sm text-ink-2">لم يتم العثور على {what}</p>
      <p className="text-xs text-ink-3">ربما حُذف السجل أو أن الرابط غير صحيح.</p>
    </div>
  );
}
