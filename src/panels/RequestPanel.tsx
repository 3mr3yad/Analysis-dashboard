import { DEPARTMENT, DIRECTION, REQUEST_STATUS, SERVICE, WORKFLOW } from "../domain/labels";
import { completedAt, isOverdue } from "../analytics/requests";
import { fmtDateTime, fmtDuration, fmtRelative } from "../lib/format";
import { useNow } from "../state/clock";
import { useData } from "../state/indexes";
import { openPanel } from "../state/router";
import { OverdueTag, PriorityTag, RequestStatusBadge } from "../ui/badges";
import { Badge } from "../ui/primitives";
import { Callout, Facts, NotFound, PanelHeader, PanelSection, PersonLink, Stepper } from "./parts";
import Timeline from "./Timeline";

export default function RequestPanel({ id }: { id: string }) {
  const { ix } = useData();
  const now = useNow();
  const r = ix.request.get(id);
  if (!r) return <NotFound what="الطلب" />;

  const customer = ix.customer.get(r.customerId);
  const assignee = r.assigneeId ? ix.employee.get(r.assigneeId) : undefined;
  const events = [...(ix.activityBySubject.get(r.id) ?? []), ...(r.orderId ? ix.activityBySubject.get(r.orderId) ?? [] : [])];
  const lastCustomer = [...events].filter((e) => e.actor.type === "customer").sort((a, b) => b.at - a.at)[0];
  const overdue = isOverdue(r, now);
  const done = completedAt(r);
  const wfIndex = WORKFLOW.indexOf(r.status);
  // For side statuses, show progress up to the last workflow step reached.
  const reached = wfIndex >= 0 ? wfIndex : Math.max(...r.history.map((h) => WORKFLOW.indexOf(h.status)));
  const labels = Object.fromEntries(WORKFLOW.map((s) => [s, REQUEST_STATUS[s].label]));
  const order = r.orderId ? ix.order.get(r.orderId) : undefined;

  return (
    <div>
      <PanelHeader
        eyebrow={<span className="num">{r.code}</span>}
        title={SERVICE[r.type].label}
        meta={
          <>
            <RequestStatusBadge status={r.status} />
            <PriorityTag priority={r.priority} />
            {overdue && <OverdueTag />}
            <Badge dot={false}>{DIRECTION[r.direction].label}</Badge>
          </>
        }
      />

      <PanelSection title="مسار الطلب" icon="layers">
        <Stepper steps={WORKFLOW} currentIndex={wfIndex >= 0 ? wfIndex : reached} labels={labels} tone={wfIndex >= 0 ? "accent" : "muted"} />
        {wfIndex < 0 && <p className="mt-3 text-[13px] text-ink-3">الحالة الحالية خارج المسار الرئيسي: <span className="text-ink-2">{REQUEST_STATUS[r.status].label}</span></p>}
      </PanelSection>

      <PanelSection title="الوضع الحالي" icon="target">
        <div className="space-y-2.5">
          <Callout icon="bolt">
            <span className="text-ink-3">الإجراء الحالي: </span>
            {r.currentAction}
          </Callout>
          {r.nextAction && (
            <Callout tone={overdue ? "critical" : "accent"}>
              <span className="text-ink-3">المطلوب تاليًا: </span>
              {r.nextAction}
              {assignee && <span className="text-ink-3"> — مسؤولية {assignee.name}</span>}
            </Callout>
          )}
        </div>
      </PanelSection>

      <PanelSection title="الأطراف" icon="users">
        <div className="grid grid-cols-2 gap-4">
          {customer && <PersonLink kind="customer" id={customer.id} name={customer.name} sub={`العميل · ${customer.code}`} />}
          {assignee ? <PersonLink kind="employee" id={assignee.id} name={assignee.name} sub={`المسؤول · ${DEPARTMENT[assignee.department].label}`} /> : <span className="text-[13.5px] text-ink-3">لم يُسند بعد</span>}
        </div>
      </PanelSection>

      <PanelSection title="التفاصيل" icon="file">
        <Facts
          items={[
            ["تاريخ الإنشاء", <span className="num">{fmtDateTime(r.createdAt)}</span>],
            ["آخر تحديث", fmtRelative(r.updatedAt, now)],
            ["موعد الإنجاز المتوقع", <span className={overdue ? "text-critical" : undefined}>{fmtDateTime(r.dueAt)}</span>],
            ["القسم", DEPARTMENT[r.department].label],
            ["زمن أول استجابة", r.firstResponseAt ? fmtDuration(r.firstResponseAt - r.createdAt) : "لم يُستجب بعد"],
            ["زمن الإنجاز", done ? fmtDuration(done - r.createdAt) : overdue ? `متأخر ${fmtDuration(now - r.dueAt)}` : `متبقٍ ${fmtDuration(r.dueAt - now)}`],
            ["آخر تفاعل من العميل", lastCustomer ? fmtRelative(lastCustomer.at, now) : "—"],
            ["تقييم العميل", r.rating ? `${r.rating} / 5` : "—"],
          ]}
        />
        {order && (
          <button onClick={() => openPanel({ kind: "order", id: order.id })} className="mt-4 flex w-full items-center justify-between rounded-lg border border-line px-3 py-2.5 text-[14px] hover:border-accent/40">
            <span className="text-ink-3">الطلب الشرائي المرتبط</span>
            <span className="num text-ink">{order.code}</span>
          </button>
        )}
      </PanelSection>

      <PanelSection title="السجل الكامل" icon="clock">
        <Timeline events={events} ix={ix} showSubject={!!order} newestFirst={false} pageSize={30} />
      </PanelSection>
    </div>
  );
}
