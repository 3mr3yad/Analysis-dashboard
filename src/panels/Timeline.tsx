import { useState } from "react";
import type { ActivityEvent, ActivityKind } from "../domain/types";
import { fmtDate, fmtTime } from "../lib/format";
import type { Indexes } from "../state/indexes";
import { openPanel } from "../state/router";
import Icon, { type IconName } from "../ui/Icon";
import { cx } from "../ui/tone";

const KIND_ICON: Record<ActivityKind, IconName> = {
  created: "sparkle",
  assigned: "users",
  status_change: "refresh",
  note: "file",
  customer_message: "message",
  employee_message: "message",
  document: "file",
  approval: "checkCircle",
  order: "orders",
};

interface Props {
  events: ActivityEvent[];
  ix: Indexes;
  /** Show links to the related request/order (useful in customer & employee timelines). */
  showSubject?: boolean;
  pageSize?: number;
  /** Highlight what happens next under the newest event. */
  newestFirst?: boolean;
}

/** Vertical activity timeline: what happened, who did it, when, result, and what's next. */
export default function Timeline({ events, ix, showSubject, pageSize = 12, newestFirst = true }: Props) {
  const [limit, setLimit] = useState(pageSize);
  const ordered = newestFirst ? [...events].sort((a, b) => b.at - a.at) : [...events].sort((a, b) => a.at - b.at);
  const shown = ordered.slice(0, limit);

  if (!events.length) return <p className="py-6 text-center text-[14px] text-ink-3">لا يوجد نشاط مسجّل</p>;

  return (
    <div>
      <ol className="relative">
        {shown.map((e, i) => {
          const actor =
            e.actor.type === "employee" ? ix.employee.get(e.actor.id ?? "")?.name : e.actor.type === "customer" ? ix.customer.get(e.customerId)?.name : "النظام";
          const day = fmtDate(e.at);
          const showDay = i === 0 || fmtDate(shown[i - 1].at) !== day;
          const subjectCode = e.subject.kind === "request" ? ix.request.get(e.subject.id)?.code : e.subject.kind === "order" ? ix.order.get(e.subject.id)?.code : undefined;
          const isLast = i === shown.length - 1;
          return (
            <li key={e.id}>
              {showDay && <p className="num mb-2 pr-9 text-[12px] font-medium tracking-wide text-ink-3">{day}</p>}
              <div className="relative flex gap-3 pb-4">
                {!isLast && <span className="absolute top-7 right-[13px] bottom-0 w-px bg-line-strong" aria-hidden />}
                <span
                  className={cx(
                    "relative z-[1] flex size-[27px] shrink-0 items-center justify-center rounded-full border",
                    e.actor.type === "customer" ? "border-series-4/30 bg-series-4/10 text-warning" : e.actor.type === "system" ? "border-line-strong bg-surface-2 text-ink-3" : "border-accent/25 bg-accent-soft text-accent",
                  )}
                >
                  <Icon name={KIND_ICON[e.kind]} size={13} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[14px] leading-relaxed text-ink">{e.description}</p>
                    <time className="num shrink-0 text-[12.5px] text-ink-3">{fmtTime(e.at)}</time>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
                    <span>
                      {e.actor.type === "customer" ? "العميل" : e.actor.type === "system" ? "آلي" : "الموظف"}: <span className="text-ink-2">{actor ?? "—"}</span>
                    </span>
                    {showSubject && subjectCode && (
                      <button onClick={() => openPanel(e.subject)} className="num rounded border border-line px-1.5 text-[12px] text-ink-2 hover:border-accent/40 hover:text-accent">
                        {subjectCode}
                      </button>
                    )}
                    {e.result && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="check" size={11} /> {e.result}
                      </span>
                    )}
                  </div>
                  {e.nextAction && i === 0 && newestFirst && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent-soft px-2 py-1 text-[13px] text-accent">
                      <Icon name="target" size={12} /> التالي: {e.nextAction}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {ordered.length > limit && (
        <button onClick={() => setLimit((l) => l + pageSize * 2)} className="mt-1 w-full rounded-lg border border-line py-2 text-[13.5px] text-ink-2 hover:bg-hover">
          عرض المزيد ({ordered.length - limit})
        </button>
      )}
    </div>
  );
}
