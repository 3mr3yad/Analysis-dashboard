import { useMemo } from "react";
import { employeeStats } from "../analytics/people";
import { isOpen, isOverdue } from "../analytics/requests";
import { resolveRange } from "../analytics/time";
import { HBarList } from "../charts/small";
import { DEPARTMENT, PRESENCE, REQUEST_STATUS, SERVICE } from "../domain/labels";
import { fmtDuration, fmtHours, fmtPct, fmtRelative } from "../lib/format";
import { useNow } from "../state/clock";
import { useDateRange } from "../state/dateRange";
import { useData } from "../state/indexes";
import { useDashboard } from "../state/store";
import { openPanel } from "../state/router";
import { OverdueTag, PresenceBadge, PriorityTag } from "../ui/badges";
import { Avatar, Stat } from "../ui/primitives";
import { Callout, NotFound, PanelHeader, PanelSection } from "./parts";
import Timeline from "./Timeline";

export default function EmployeePanel({ id }: { id: string }) {
  const { data, ix } = useData();
  const origin = useDashboard((s) => s.origin);
  const now = useNow();
  const range = useDateRange();
  const w = useMemo(() => resolveRange(range, now), [range, now]);
  const stats = useMemo(() => employeeStats(data, ix, w, now).find((s) => s.employee.id === id), [data, ix, w, now, id]);
  const e = ix.employee.get(id);
  if (!e || !stats) return <NotFound what="الموظف" />;

  const p = ix.presence.get(id);
  const open = (ix.requestsByAssignee.get(id) ?? []).filter(isOpen).sort((a, b) => a.dueAt - b.dueAt);
  const byStatus = new Map<string, number>();
  for (const r of open) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
  const customers = new Set(open.map((r) => r.customerId));
  const recent = (ix.activityByEmployee.get(id) ?? []).slice(-40);
  const current = p?.current;
  const currentReq = current ? ix.request.get(current.requestId) : undefined;
  const currentCustomer = current ? ix.customer.get(current.customerId) : undefined;

  return (
    <div>
      <PanelHeader
        eyebrow={DEPARTMENT[e.department].label}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={e.name} id={e.id} size={42} status={p ? PRESENCE[p.status].tone : undefined} />
            <span>
              {e.name}
              <span className="block text-[12.5px] font-normal text-ink-3">{e.title}</span>
            </span>
          </span>
        }
        meta={
          p && (
            <>
              <PresenceBadge status={p.status} simulated={origin === "mock"} />
              <span className="text-[11.5px] text-ink-3">آخر نشاط {fmtRelative(p.lastActivityAt, now)}</span>
            </>
          )
        }
      />

      {current && currentReq && (
        <PanelSection title="يعمل الآن على" icon="bolt">
          <button onClick={() => openPanel({ kind: "request", id: currentReq.id })} className="w-full rounded-xl border border-accent/20 bg-accent-soft p-4 text-right hover:border-accent/40">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-ink">{currentCustomer?.name}</span>
              <span className="num text-[11.5px] text-ink-3">{currentReq.code}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] text-ink-2">{current.action}</p>
            <div className="mt-3 flex items-center gap-4 text-[11.5px] text-ink-3">
              <span>منذ {fmtDuration(now - current.startedAt)}</span>
              <PriorityTag priority={currentReq.priority} />
              <span>{SERVICE[currentReq.type].label}</span>
            </div>
          </button>
          {origin === "mock" && <p className="mt-2 text-[11px] text-warning/80">هذا نشاط محاكاة لأغراض العرض وليس تتبعًا فعليًا.</p>}
        </PanelSection>
      )}

      <PanelSection title={`الأداء — ${w.label}`} icon="analytics">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="طلبات مكتملة" value={stats.completed} resetKey={id + w.label} />
          <Stat label="طلبات مفتوحة" value={stats.open} sub={`${customers.size} عميل`} resetKey={id + w.label} />
          <Stat label="متأخرة" value={stats.overdue} tone={stats.overdue ? "critical" : undefined} resetKey={id + w.label} />
          <Stat label="متوسط أول استجابة" value={fmtHours(stats.avgResponse)} resetKey={id + w.label} />
          <Stat label="متوسط الإنجاز" value={fmtHours(stats.avgResolution)} resetKey={id + w.label} />
          <Stat label="رضا العملاء" value={stats.csat === null ? "—" : fmtPct(stats.csat)} sub={stats.rated ? `${stats.rated} تقييم` : "لا تقييمات"} resetKey={id + w.label} />
        </div>
        {stats.loadIndex > 1.5 && (
          <div className="mt-4">
            <Callout tone="warning" icon="alert">
              عبء العمل أعلى من متوسط الفريق بنحو {Math.round((stats.loadIndex - 1) * 100)}٪ — قد يلزم إعادة توزيع بعض الطلبات.
            </Callout>
          </div>
        )}
      </PanelSection>

      <PanelSection title="توزيع العمل المفتوح" icon="layers">
        {open.length ? (
          <HBarList
            items={[...byStatus.entries()].map(([s, v]) => ({ key: s, label: REQUEST_STATUS[s as keyof typeof REQUEST_STATUS].label, value: v }))}
            color="var(--color-accent)"
          />
        ) : (
          <p className="text-[12.5px] text-ink-3">لا توجد طلبات مفتوحة.</p>
        )}
      </PanelSection>

      <PanelSection title={`الطلبات النشطة (${open.length})`} icon="requests">
        <ul className="-mx-2 space-y-0.5">
          {open.slice(0, 10).map((r) => (
            <li key={r.id}>
              <button onClick={() => openPanel({ kind: "request", id: r.id })} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-right hover:bg-white/[0.03]">
                <span className="num w-[78px] shrink-0 text-[11.5px] text-ink-3">{r.code}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{ix.customer.get(r.customerId)?.name}</span>
                <span className="hidden text-[11.5px] text-ink-3 sm:block">{REQUEST_STATUS[r.status].label}</span>
                {isOverdue(r, now) ? <OverdueTag /> : <PriorityTag priority={r.priority} />}
              </button>
            </li>
          ))}
        </ul>
      </PanelSection>

      <PanelSection title="آخر النشاطات المسجّلة" icon="clock">
        <Timeline events={recent} ix={ix} showSubject pageSize={8} />
      </PanelSection>
    </div>
  );
}
