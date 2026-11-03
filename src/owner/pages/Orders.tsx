import { fmtDateTime, fmtInt, fmtMoney } from "../../lib/format";
import { PageHeader } from "../../ui/page";
import { Card, EmptyState, Segmented, Skeleton } from "../../ui/primitives";
import { cx } from "../../ui/tone";
import { api } from "../api";
import { AdminLink, Freshness, Note, NotTracked, Pager, Phone, QueryError, StatusPill, When } from "../parts";
import { updateParams, useOwnerRoute } from "../router";
import TicketDrawer, { type TicketRef } from "../TicketDrawer";
import type { Order } from "../types";
import { useQuery } from "../useQuery";
import { useSelection } from "../useSelection";

const STATUSES = [
  { value: "all", label: "الكل" },
  { value: "verified", label: "تم التحقق" },
  { value: "not_verified", label: "لم يتم التحقق" },
] as const;

const value = (o: Order) => (o.value === null ? <NotTracked>بدون قيمة</NotTracked> : <span className="num font-medium text-ink">{fmtMoney(o.value)}</span>);
const status = (o: Order) => (
  <StatusPill status={o.status} label={o.status_label} />
);

export default function Orders() {
  const { params } = useOwnerRoute();
  const st = STATUSES.some((s) => s.value === params.get("status")) ? params.get("status")! : "all";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const query = { status: st === "all" ? undefined : st, page, per_page: 25 };
  const q = useQuery(`orders:${JSON.stringify(query)}`, (force) => api.orders(query, force), 120_000);
  const res = q.data ?? q.stale;
  const rows = res?.data ?? [];
  const pageValue = rows.reduce((n, o) => n + (o.value ?? 0), 0);
  const [open, setOpen, close] = useSelection<TicketRef>();

  return (
    <div>
      <PageHeader title="طلبات الشراء" subtitle="الطلبات ذات القيمة المالية من خدمة Over Stage." actions={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented label="حالة التحقق" value={st} onChange={(v) => updateParams({ status: v === "all" ? null : v, page: null })} options={[...STATUSES]} />
        {res && (
          <p className="text-[12px] text-ink-3">
            <span className="num text-ink-2">{fmtInt(res.meta.total)}</span> طلب · قيمة هذه الصفحة <span className="num text-ink-2">{fmtMoney(pageValue)}</span>
          </p>
        )}
      </div>

      <div className="mb-4">
        <Note>
          لا يوجد جدول باسم «طلبات شراء» في النظام؛ هذه الصفحة مبنية على <b className="text-ink">Over Stage</b> لأنه الوحيد الذي يحفظ قيمة مالية واسم شركة. حالته قرار تحقق واحد عند الإنشاء، وليست مراحل تنفيذ.
        </Note>
      </div>

      <Card>
        {q.error && !res ? (
          <QueryError error={q.error} onRetry={q.reload} what="طلبات الشراء" />
        ) : !res ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon="orders" title="لا توجد طلبات" hint={st !== "all" ? "لا توجد طلبات بهذه الحالة." : undefined} />
        ) : (
          <div className={cx("transition-opacity", q.loading && "opacity-50")} aria-busy={q.loading}>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-right text-[12.5px]">
                <caption className="sr-only">طلبات الشراء</caption>
                <thead>
                  <tr className="border-b border-line text-[11.5px] text-ink-3">
                    <th className="px-4 py-2.5 font-medium">الرقم</th>
                    <th className="px-3 py-2.5 font-medium">الشركة / العميل</th>
                    <th className="px-3 py-2.5 font-medium">القيمة</th>
                    <th className="px-3 py-2.5 font-medium">التحقق</th>
                    <th className="hidden px-3 py-2.5 font-medium lg:table-cell">أنشأه</th>
                    <th className="px-3 py-2.5 font-medium">الإنشاء</th>
                    <th className="px-4 py-2.5 font-medium">
                      <span className="sr-only">لوحة الإدارة</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} onClick={() => setOpen({ service: "over_stage", id: o.id })} className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.025]">
                      <td className="num px-4 py-3 text-ink-3">#{o.id}</td>
                      <td className="px-3 py-3">
                        <span className="block max-w-[220px] truncate text-ink">{o.customer.company_name ?? o.customer.name ?? <NotTracked>بدون اسم</NotTracked>}</span>
                        {o.customer.company_name && o.customer.name && <span className="block max-w-[220px] truncate text-[11.5px] text-ink-3">{o.customer.name}</span>}
                        <span onClick={(e) => e.stopPropagation()}>
                          <Phone value={o.customer.phone} />
                        </span>
                      </td>
                      <td className="px-3 py-3">{value(o)}</td>
                      <td className="px-3 py-3">{status(o)}</td>
                      <td className="hidden px-3 py-3 lg:table-cell">{o.created_by?.name ?? <NotTracked>غير مسجّل</NotTracked>}</td>
                      <td className="px-3 py-3 text-[12px] text-ink-3" title={fmtDateTime(Date.parse(o.created_at))}>
                        <When iso={o.created_at} />
                      </td>
                      <td className="px-4 py-3 text-left">
                        <AdminLink url={o.admin_url} compact />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {rows.map((o) => (
                <li key={o.id}>
                  <button onClick={() => setOpen({ service: "over_stage", id: o.id })} className="block w-full px-4 py-3 text-right">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] text-ink">{o.customer.company_name ?? o.customer.name ?? "بدون اسم"}</span>
                      {value(o)}
                    </span>
                    <span className="mt-1 flex items-center justify-between text-[11.5px] text-ink-3">
                      {status(o)}
                      <When iso={o.created_at} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Pager meta={res.meta} busy={q.loading} onPage={(p) => updateParams({ page: p === 1 ? null : p })} />
          </div>
        )}
      </Card>

      <TicketDrawer ticket={open} onClose={close} />
    </div>
  );
}
