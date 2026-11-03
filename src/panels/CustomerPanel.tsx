import { isOpen, isOverdue } from "../analytics/requests";
import { CUSTOMER_STATUS, SEGMENT, SERVICE } from "../domain/labels";
import { fmtDate, fmtMoney, fmtRelative } from "../lib/format";
import { useNow } from "../state/clock";
import { useData } from "../state/indexes";
import { openPanel } from "../state/router";
import { OrderStatusBadge, OverdueTag, RequestStatusBadge } from "../ui/badges";
import { Avatar, Badge, Stat } from "../ui/primitives";
import { Facts, NotFound, PanelHeader, PanelSection, PersonLink } from "./parts";
import { TeamAvatars } from "../ui/TeamAvatars";
import Timeline from "./Timeline";

export default function CustomerPanel({ id }: { id: string }) {
  const { ix } = useData();
  const now = useNow();
  const c = ix.customer.get(id);
  if (!c) return <NotFound what="العميل" />;

  const reqs = [...(ix.requestsByCustomer.get(id) ?? [])].sort((a, b) => b.createdAt - a.createdAt);
  // Employees who handled this customer, most involved first.
  const handled = new Map<string, number>();
  for (const r of reqs) if (r.assigneeId) handled.set(r.assigneeId, (handled.get(r.assigneeId) ?? 0) + 1);
  const team = [...handled.entries()].sort((a, b) => b[1] - a[1]).flatMap(([eid]) => ix.employee.get(eid) ?? []);
  const orders = [...(ix.ordersByCustomer.get(id) ?? [])].sort((a, b) => b.createdAt - a.createdAt);
  const active = reqs.filter(isOpen);
  const ltv = orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.value, 0);
  const events = ix.activityByCustomer.get(id) ?? [];
  const last = events[events.length - 1];
  const manager = ix.employee.get(c.accountManagerId);
  const st = CUSTOMER_STATUS[c.status];

  return (
    <div>
      <PanelHeader
        eyebrow={<span className="num">{c.code}</span>}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={c.name} id={c.id} size={42} />
            {c.name}
          </span>
        }
        meta={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            <Badge dot={false}>{SEGMENT[c.segment].label}</Badge>
            <span className="text-[11.5px] text-ink-3">آخر تفاعل {last ? fmtRelative(last.at, now) : "—"}</span>
          </>
        }
      />

      <PanelSection title="العلاقة مع العميل" icon="customers">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="إجمالي الطلبات" value={reqs.length} resetKey={id} />
          <Stat label="طلبات نشطة" value={active.length} tone={active.some((r) => isOverdue(r, now)) ? "critical" : undefined} resetKey={id} />
          <Stat label="الطلبات الشرائية" value={orders.length} resetKey={id} />
          <Stat label="القيمة الدائمة" value={fmtMoney(ltv, true)} sub="من الطلبات المكتملة" resetKey={id} />
        </div>
        {team.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
            <span className="text-[11.5px] text-ink-3">الفريق الذي خدم العميل ({team.length})</span>
            <TeamAvatars people={team} presence={ix.presence} size={26} />
          </div>
        )}
      </PanelSection>

      <PanelSection title="البيانات" icon="file">
        <Facts
          items={[
            ["الجوال", <span className="num">{c.phone}</span>],
            ["المدينة", c.city],
            ["عميل منذ", fmtDate(c.createdAt)],
            ["مدير الحساب", manager ? <PersonLink kind="employee" id={manager.id} name={manager.name} size={20} /> : "—"],
          ]}
        />
      </PanelSection>

      {active.length > 0 && (
        <PanelSection title="الطلبات النشطة" icon="requests">
          <ul className="-mx-2 space-y-0.5">
            {active.map((r) => (
              <li key={r.id}>
                <button onClick={() => openPanel({ kind: "request", id: r.id })} className="w-full rounded-lg px-2 py-2.5 text-right hover:bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <span className="num text-[11.5px] text-ink-3">{r.code}</span>
                    <span className="flex-1 truncate text-[12.5px] text-ink">{SERVICE[r.type].label}</span>
                    {isOverdue(r, now) && <OverdueTag />}
                    <RequestStatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-3">
                    {r.currentAction} · {r.assigneeId ? ix.employee.get(r.assigneeId)?.name : "غير مسند"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      {orders.length > 0 && (
        <PanelSection title="الطلبات الشرائية" icon="orders">
          <ul className="-mx-2 space-y-0.5">
            {orders.slice(0, 6).map((o) => (
              <li key={o.id}>
                <button onClick={() => openPanel({ kind: "order", id: o.id })} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-right hover:bg-white/[0.03]">
                  <span className="num text-[11.5px] text-ink-3">{o.code}</span>
                  <span className="num flex-1 text-[12.5px] text-ink">{fmtMoney(o.value)}</span>
                  <span className="text-[11px] text-ink-3">{fmtDate(o.createdAt)}</span>
                  <OrderStatusBadge status={o.status} />
                </button>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      <PanelSection title="رحلة العميل" icon="clock">
        <Timeline events={events} ix={ix} showSubject pageSize={14} />
      </PanelSection>
    </div>
  );
}
