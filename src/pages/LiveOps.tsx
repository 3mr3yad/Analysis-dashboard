import { useCallback, useMemo, useState } from "react";
import { isOpen } from "../analytics/requests";
import { DEPARTMENT, PRESENCE } from "../domain/labels";
import type { ID, PresenceStatus } from "../domain/types";
import { fmtDuration, fmtRelative } from "../lib/format";
import { useNow } from "../state/clock";
import { useData } from "../state/indexes";
import { useDashboard } from "../state/store";
import { openPanel, setParams, useRoute } from "../state/router";
import TeamOrb, { type OrbNode } from "../three/TeamOrb";
import { supportsWebGL } from "../three/runtime";
import Icon from "../ui/Icon";
import { PresenceBadge, PriorityTag } from "../ui/badges";
import { PageHeader } from "../ui/page";
import { Avatar, Card, CardHeader, Dot, EmptyState, Segmented } from "../ui/primitives";
import { cx } from "../ui/tone";

type Filter = "all" | PresenceStatus;
const ORDER: Record<PresenceStatus, number> = { busy: 0, available: 1, away: 2, offline: 3 };

export default function LiveOps() {
  const { data, ix } = useData();
  const origin = useDashboard((s) => s.origin);
  const recent = useDashboard((s) => s.recent);
  const now = useNow();
  const { params } = useRoute();
  const filter = (params.get("presence") as Filter) || "all";
  const [hover, setHover] = useState<{ id: ID; x: number; y: number } | null>(null);
  const simulated = origin === "mock";

  const counts = useMemo(() => {
    const c: Record<PresenceStatus, number> = { busy: 0, available: 0, away: 0, offline: 0 };
    for (const p of data.presence) c[p.status]++;
    return c;
  }, [data.presence]);

  const openByEmp = useMemo(() => {
    const m = new Map<ID, number>();
    for (const [id, rs] of ix.requestsByAssignee) m.set(id, rs.filter(isOpen).length);
    return m;
  }, [ix]);
  const maxLoad = Math.max(1, ...openByEmp.values());

  const nodes = useMemo<OrbNode[]>(() => data.presence.map((p) => ({ id: p.employeeId, status: p.status })), [data.presence]);
  const onSelect = useCallback((id: ID) => openPanel({ kind: "employee", id }), []);
  const onHover = useCallback((id: ID | null, x: number, y: number) => setHover(id ? { id, x, y } : null), []);

  const people = data.presence
    .filter((p) => filter === "all" || p.status === filter)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.lastActivityAt - a.lastActivityAt);

  const feed = data.activity.slice(-14).reverse();
  const hovered = hover ? ix.employee.get(hover.id) : undefined;
  const hoveredP = hover ? ix.presence.get(hover.id) : undefined;
  const webgl = supportsWebGL();

  return (
    <div>
      <PageHeader
        title="العمليات المباشرة"
        subtitle="من متصل الآن، ومع أي عميل يعمل، وما الإجراء الجاري — لحظة بلحظة."
        actions={
          <Segmented<Filter>
            label="تصفية حسب الحالة"
            value={filter}
            onChange={(v) => setParams({ presence: v === "all" ? null : v })}
            options={[
              { value: "all", label: "الكل", count: data.presence.length },
              { value: "busy", label: PRESENCE.busy.label, count: counts.busy },
              { value: "available", label: PRESENCE.available.label, count: counts.available },
              { value: "away", label: PRESENCE.away.label, count: counts.away },
              { value: "offline", label: PRESENCE.offline.label, count: counts.offline },
            ]}
          />
        }
      />

      {simulated && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/[0.05] px-4 py-3 text-[14px] leading-relaxed text-ink-2">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-warning" />
          <p>
            <b className="font-semibold text-warning">حالات الحضور هنا محاكاة.</b> لا يوجد حاليًا تتبع فعلي لحضور الموظفين في الخادم؛ ما تراه أحداث مولّدة محليًا لعرض طريقة عمل الشاشة. عند ربط قناة Reverb ستُستبدل تلقائيًا بالحالة الفعلية.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="relative overflow-hidden xl:col-span-7">
          <CardHeader icon="users" title="خريطة الفريق" subtitle="كل نقطة موظف — اسحب للتدوير، واضغط لفتح نشاطه" />
          <div className="relative h-[340px] sm:h-[380px]">
            {webgl ? (
              <TeamOrb nodes={nodes} onSelect={onSelect} onHover={onHover} className="absolute inset-0" />
            ) : (
              <EmptyState icon="users" title="العرض ثلاثي الأبعاد غير مدعوم في هذا المتصفح" hint="القائمة أدناه تعرض نفس المعلومات." />
            )}
            {hover && hovered && hoveredP && (
              <div className="glass pointer-events-none absolute z-10 w-56 rounded-lg border border-line-strong px-3 py-2 shadow-xl" style={{ left: Math.min(hover.x + 14, 9999), top: hover.y + 14 }}>
                <p className="text-[14px] font-medium text-ink">{hovered.name}</p>
                <p className="text-[12.5px] text-ink-3">{hovered.title}</p>
                <div className="mt-1.5">
                  <PresenceBadge status={hoveredP.status} simulated={simulated} />
                </div>
                {hoveredP.current && <p className="mt-1 truncate text-[12.5px] text-ink-2">مع {ix.customer.get(hoveredP.current.customerId)?.name}</p>}
              </div>
            )}
            <ul className="absolute right-5 bottom-4 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
              {(Object.keys(PRESENCE) as PresenceStatus[]).map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <Dot tone={PRESENCE[s].tone} /> {PRESENCE[s].label} <span className="num text-ink-2">{counts[s]}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader icon="bolt" title="البث المباشر للأحداث" subtitle={simulated ? "أحداث محاكاة" : "من قناة Reverb"} />
          <ul className="max-h-[380px] overflow-y-auto px-2 pb-2">
            {feed.map((e) => {
              const who = e.actor.type === "employee" ? ix.employee.get(e.actor.id!)?.name : e.actor.type === "customer" ? ix.customer.get(e.customerId)?.name : "النظام";
              return (
                <li key={e.id} className={cx("rounded-lg", recent.has(e.subject.id) && "flash")}>
                  <button onClick={() => openPanel(e.subject)} className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-right hover:bg-white/[0.03]">
                    <span className={cx("mt-1.5 size-1.5 shrink-0 rounded-full", e.actor.type === "customer" ? "bg-warning" : "bg-accent")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-ink-2">{e.description}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">{who}</span>
                    </span>
                    <span className="num shrink-0 text-[12px] text-ink-3">{fmtRelative(e.at, now)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <h2 className="mt-8 mb-3 flex items-center gap-2 text-[15.5px] font-semibold text-ink">
        حالة الموظفين
        <span className="num text-[13.5px] font-normal text-ink-3">{people.length}</span>
      </h2>
      {people.length === 0 ? (
        <Card>
          <EmptyState icon="users" title="لا يوجد موظفون بهذه الحالة" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {people.map((p) => {
            const e = ix.employee.get(p.employeeId)!;
            const req = p.current ? ix.request.get(p.current.requestId) : undefined;
            const cust = p.current ? ix.customer.get(p.current.customerId) : undefined;
            const load = openByEmp.get(e.id) ?? 0;
            return (
              <button
                key={p.employeeId}
                onClick={() => openPanel({ kind: "employee", id: e.id })}
                className={cx(
                  "card group flex flex-col p-4 text-right transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong",
                  p.status === "offline" && "opacity-60",
                  recent.has(e.id) && "flash",
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={e.name} id={e.id} size={38} status={PRESENCE[p.status].tone} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-ink group-hover:text-accent">{e.name}</p>
                    <p className="truncate text-[13px] text-ink-3">
                      {e.title} · {DEPARTMENT[e.department].label}
                    </p>
                  </div>
                  <PresenceBadge status={p.status} />
                </div>

                <div className="mt-3.5 min-h-[62px] rounded-lg border border-line bg-white/[0.015] px-3 py-2.5">
                  {p.current && req ? (
                    <>
                      <div className="flex items-center justify-between gap-2 text-[13.5px]">
                        <span className="truncate text-ink">مع {cust?.name}</span>
                        <span className="num shrink-0 text-[12px] text-ink-3">{req.code}</span>
                      </div>
                      <p className="mt-1 truncate text-[13px] text-ink-2">{p.current.action}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[12.5px] text-ink-3">
                        <span className="flex items-center gap-1">
                          <Icon name="clock" size={11} /> {fmtDuration(now - p.current.startedAt)}
                        </span>
                        <PriorityTag priority={req.priority} />
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] text-ink-3">{p.status === "available" ? "متاح لاستلام طلبات جديدة" : p.status === "away" ? `بعيد منذ ${fmtDuration(now - p.since)}` : "غير متصل"}</p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-[12.5px] text-ink-3">
                  <span>آخر نشاط {fmtRelative(p.lastActivityAt, now)}</span>
                  <span className="flex items-center gap-2">
                    <span className="num text-ink-2">{load}</span> مفتوح
                    <span className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.05]">
                      <span className="block h-full rounded-full" style={{ width: `${(load / maxLoad) * 100}%`, background: load / maxLoad > 0.8 ? "var(--color-serious)" : "var(--color-series-1)" }} />
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
