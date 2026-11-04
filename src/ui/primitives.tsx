import { AnimateIcon } from "@animate-ui/react/icons";
import type { ReactNode } from "react";
import type { Tone } from "../domain/labels";
import { TONE_BG, TONE_TEXT, cx } from "./tone";
import { changeClass, useChanged } from "./useChanged";
import { initials } from "../lib/format";
import Icon, { type IconName } from "./Icon";
import { CountUp } from "./CountUp";

export function Card({ children, className, as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={cx("card", className)}>{children}</Tag>;
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: IconName }) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {icon && <Icon name={icon} size={15} className="text-ink-3" />}
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Dot({ tone, pulse, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return (
    <span className={cx("relative inline-block size-2 shrink-0 rounded-full", TONE_BG[tone], pulse && cx("live-ping", TONE_TEXT[tone]), className)} />
  );
}

export function Badge({ tone = "neutral", children, dot = true, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-white/[0.03] px-2 py-0.5 text-[13px] font-medium text-ink-2",
        className,
      )}
    >
      {dot && <span className={cx("size-1.5 rounded-full", TONE_BG[tone])} />}
      {children}
    </span>
  );
}

const AVATAR_HUES = [218, 196, 262, 168, 28, 330, 142, 46];
function hueFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

export function Avatar({ name, id, size = 32, status }: { name: string; id: string; size?: number; status?: Tone }) {
  const hue = hueFor(id);
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className="flex size-full items-center justify-center rounded-full text-[12.5px] font-semibold"
        style={{
          background: `linear-gradient(140deg, hsl(${hue} 45% 32%), hsl(${hue} 40% 20%))`,
          color: `hsl(${hue} 70% 88%)`,
          boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.08)",
          fontSize: size * 0.36,
        }}
      >
        {initials(name)}
      </span>
      {status && (
        <span className={cx("absolute -bottom-0.5 -left-0.5 size-[9px] rounded-full ring-2 ring-surface", TONE_BG[status])} />
      )}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  icon,
  className,
  type = "button",
  disabled,
  title,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "solid" | "outline";
  icon?: IconName;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <AnimateIcon animateOnHover asChild>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={!children ? title : undefined}
        className={cx(
          "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] font-medium transition-colors duration-150 disabled:opacity-40",
          variant === "solid" && "bg-accent text-[#0b1020] hover:bg-accent-strong",
          variant === "outline" && "border border-line-strong text-ink-2 hover:bg-hover hover:text-ink",
          variant === "ghost" && "text-ink-2 hover:bg-hover hover:text-ink",
          className,
        )}
      >
        {icon && <Icon name={icon} size={15} />}
        {children}
      </button>
    </AnimateIcon>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  size?: "sm" | "md";
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-white/[0.02] p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-150",
              size === "sm" ? "px-2.5 py-1 text-[13px]" : "px-3 py-1.5 text-[14px]",
              active ? "bg-raised text-ink shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className={cx("num text-[12px]", active ? "text-ink-2" : "text-ink-3")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function EmptyState({ icon = "inbox", title, hint, action }: { icon?: IconName; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full border border-line bg-white/[0.02] text-ink-3">
        <Icon name={icon} size={18} />
      </span>
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {hint && <p className="max-w-xs text-xs text-ink-3">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title, detail, onRetry }: { title: string; detail?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-critical/10 text-critical">
        <Icon name="alert" size={20} />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {detail && <p className="max-w-md text-xs leading-relaxed text-ink-3">{detail}</p>}
      {onRetry && (
        <Button variant="outline" icon="refresh" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

/** A number `value` counts up (formatted with `format`); any other node renders as given. */
export function Stat({ label, value, format, sub, tone, resetKey }: { label: string; value: ReactNode | number; format?: (n: number) => string; sub?: ReactNode; tone?: Tone; resetKey?: unknown }) {
  const changed = useChanged(value, resetKey);
  return (
    <div className={cx("-m-2 min-w-0 rounded-lg border border-transparent p-2", changeClass(changed))}>
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className={cx("num mt-1 text-lg font-semibold", tone ? TONE_TEXT[tone] : "text-ink")} style={{ textAlign: "right" }}>
        {typeof value === "number" ? <CountUp value={value} format={format} /> : value}
      </p>
      {sub && <p className="mt-0.5 text-[12.5px] text-ink-3">{sub}</p>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={cx("relative flex items-center", className)}>
      <Icon name="search" size={15} className="pointer-events-none absolute right-3 text-ink-3" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-white/[0.02] py-2 pr-9 pl-3 text-[14.5px] text-ink placeholder:text-ink-3 focus:border-accent/40 focus:bg-white/[0.04] focus:outline-none"
      />
    </label>
  );
}

export function Select<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="appearance-none rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 pr-3 pl-8 text-[14px] text-ink-2 hover:text-ink focus:border-accent/40 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={14} className="pointer-events-none absolute left-2.5 text-ink-3" />
    </label>
  );
}

/** Small tag that marks simulated data so it can never be mistaken for real activity. */
export function DemoTag({ children = "بيانات تجريبية" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-warning/25 bg-warning/[0.07] px-1.5 py-0.5 text-[12px] font-medium text-warning">
      <Icon name="database" size={11} />
      {children}
    </span>
  );
}
