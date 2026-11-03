import { isOrderDelayed } from "../analytics/requests";
import { ORDER_STATUS } from "../domain/labels";
import type { OrderStatus } from "../domain/types";
import { fmtDateTime, fmtDuration, fmtMoney, fmtRelative } from "../lib/format";
import { useNow } from "../state/clock";
import { useData } from "../state/indexes";
import { openPanel } from "../state/router";
import { OrderStatusBadge } from "../ui/badges";
import { Callout, Facts, NotFound, PanelHeader, PanelSection, PersonLink, Stepper } from "./parts";
import Timeline from "./Timeline";

const FLOW: OrderStatus[] = ["new", "processing", "awaiting_approval", "completed"];

export default function OrderPanel({ id }: { id: string }) {
  const { data, ix } = useData();
  const now = useNow();
  const o = ix.order.get(id);
  if (!o) return <NotFound what="الطلب الشرائي" />;

  const customer = ix.customer.get(o.customerId);
  const assignee = ix.employee.get(o.assigneeId);
  const delayed = isOrderDelayed(o, now);
  const events = ix.activityBySubject.get(o.id) ?? [];
  const related = data.requests.find((r) => r.orderId === o.id);
  const labels = Object.fromEntries(FLOW.map((s) => [s, ORDER_STATUS[s].label]));
  const idx = o.status === "cancelled" ? FLOW.indexOf(events.some((e) => e.kind === "approval") ? "awaiting_approval" : "processing") : FLOW.indexOf(o.status);

  return (
    <div>
      <PanelHeader
        eyebrow={<span className="num">{o.code}</span>}
        title={<span className="num">{fmtMoney(o.value)}</span>}
        meta={
          <>
            <OrderStatusBadge status={o.status} />
            {delayed && <span className="text-[11.5px] font-medium text-critical">متأخر {fmtDuration(now - o.expectedAt)}</span>}
            <span className="text-[11.5px] text-ink-3">{o.items} صنف</span>
          </>
        }
      />
      <PanelSection title="دورة حياة الطلب" icon="layers">
        <Stepper steps={FLOW} currentIndex={idx} labels={labels} tone={o.status === "cancelled" ? "muted" : "accent"} />
        {o.status === "cancelled" && <p className="mt-3 text-[11.5px] text-ink-3">أُلغي الطلب.</p>}
        {o.status === "awaiting_approval" && (
          <div className="mt-4">
            <Callout tone="warning" icon="checkCircle">
              هذا الطلب ينتظر اعتمادك منذ {fmtRelative(o.updatedAt, now).replace("قبل ", "")}.
            </Callout>
          </div>
        )}
      </PanelSection>
      <PanelSection title="الأطراف" icon="users">
        <div className="grid grid-cols-2 gap-4">
          {customer && <PersonLink kind="customer" id={customer.id} name={customer.name} sub="العميل" />}
          {assignee && <PersonLink kind="employee" id={assignee.id} name={assignee.name} sub="المسؤول" />}
        </div>
      </PanelSection>
      <PanelSection title="التفاصيل" icon="file">
        <Facts
          items={[
            ["تاريخ الإنشاء", <span className="num">{fmtDateTime(o.createdAt)}</span>],
            ["آخر تحديث", fmtRelative(o.updatedAt, now)],
            ["التسليم المتوقع", <span className={delayed ? "text-critical" : undefined}>{fmtDateTime(o.expectedAt)}</span>],
            ["تاريخ الإكمال", o.completedAt ? fmtDateTime(o.completedAt) : "—"],
          ]}
        />
        {related && (
          <button onClick={() => openPanel({ kind: "request", id: related.id })} className="mt-4 flex w-full items-center justify-between rounded-lg border border-line px-3 py-2.5 text-[12.5px] hover:border-accent/40">
            <span className="text-ink-3">طلب الخدمة المرتبط</span>
            <span className="num text-ink">{related.code}</span>
          </button>
        )}
      </PanelSection>
      <PanelSection title="سجل النشاط" icon="clock">
        <Timeline events={events} ix={ix} newestFirst={false} pageSize={20} />
      </PanelSection>
    </div>
  );
}
