import { useEffect, useState } from "react";
import { fmtInt, fmtMoney } from "../../lib/format";
import { PageHeader } from "../../ui/page";
import { Card, EmptyState, SearchInput, Segmented, Skeleton, Stat } from "../../ui/primitives";
import { cx } from "../../ui/tone";
import { api } from "../api";
import { Freshness, NotTracked, Pager, Phone, QueryError, StatusPill, When } from "../parts";
import { updateParams, useOwnerRoute } from "../router";
import type { Iphone18Order } from "../types";
import { useQuery } from "../useQuery";

// Standalone module for the iPhone 18 storefront (iphone18.wafi.sa) — kept separate from the
// cross-service directory the rest of the dashboard uses, since this storefront isn't one of
// the nine internal services it aggregates. One list, divided by: the status filter (customer
// data arrives as "بانتظار الدفع"; payment operations resolve it to "تم الدفع"/"ملغي") and the
// table's own column groups (customer/product/fulfillment vs. the dedicated payment column).

const STATUSES = [
  { value: "all", label: "الكل" },
  { value: "pending_payment", label: "بانتظار الدفع" },
  { value: "paid", label: "تم الدفع" },
  { value: "cancelled", label: "ملغي" },
] as const;

const FULFILLMENT = [
  { value: "all", label: "الكل" },
  { value: "pickup", label: "استلام" },
  { value: "shipping", label: "شحن" },
] as const;

function Summary() {
  const q = useQuery("iphone18:summary", (force) => api.iphone18Summary(force), 60_000);
  const s = q.data ?? q.stale;
  if (q.error && !s) return <QueryError error={q.error} onRetry={q.reload} what="ملخص iPhone 18" />;
  if (!s) return <Skeleton className="mb-4 h-[92px] rounded-[14px]" />;
  return (
    <Card className="mb-4 grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 xl:grid-cols-5">
      <Stat label="إجمالي الطلبات" value={fmtInt(s.total_orders)} sub={`${fmtInt(s.today_orders)} اليوم`} />
      <Stat label="بانتظار الدفع" value={fmtInt(s.pending_payment)} tone={s.pending_payment ? "warning" : undefined} />
      <Stat label="تم الدفع" value={fmtInt(s.paid)} tone="good" />
      <Stat label="ملغي" value={fmtInt(s.cancelled)} tone={s.cancelled ? "critical" : undefined} />
      <Stat label="إجمالي المدفوع" value={fmtMoney(s.paid_amount_sar)} />
    </Card>
  );
}

function fulfillmentCell(o: Iphone18Order) {
  if (o.fulfillment_method === "pickup") {
    return (
      <div className="text-[13.5px]">
        <span className="block text-ink-2">{o.branch?.name_ar ?? <NotTracked>بدون فرع</NotTracked>}</span>
        <span className="block text-ink-3">
          {o.pickup_date ?? "—"}
          {o.pickup_time ? ` · ${o.pickup_time}` : ""}
        </span>
      </div>
    );
  }
  const addr = [o.shipping_address?.city, o.shipping_address?.district].filter(Boolean).join(" - ");
  return (
    <div className="text-[13.5px]">
      <span className="block text-ink-2">شحن</span>
      <span className="block max-w-[180px] truncate text-ink-3">{addr || <NotTracked>بدون عنوان</NotTracked>}</span>
    </div>
  );
}

function paymentCell(o: Iphone18Order) {
  if (!o.payment) return <NotTracked title="لا توجد محاولة دفع مسجّلة لهذا الطلب بعد">لا توجد محاولة</NotTracked>;
  return (
    <div className="text-[13.5px]">
      <StatusPill status={o.payment.status} label={null} />
      <span dir="ltr" className="num mt-1 block text-[12.5px] text-ink-3">
        {o.payment.moyasar_id}
      </span>
    </div>
  );
}

/** Name/phone/email/order-number search; debounced into the URL so typing doesn't spend the rate limit. */
function Search({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (value.trim() === initial) return;
    const id = setTimeout(() => updateParams({ search: value.trim() || null, page: null }), 450);
    return () => clearTimeout(id);
  }, [value, initial]);
  return <SearchInput value={value} onChange={setValue} placeholder="بحث بالاسم أو الجوال أو البريد أو رقم الطلب…" className="max-w-md" />;
}

export default function Iphone18() {
  const { params } = useOwnerRoute();
  const status = STATUSES.some((s) => s.value === params.get("status")) ? params.get("status")! : "all";
  const fulfillment = FULFILLMENT.some((f) => f.value === params.get("fulfillment")) ? params.get("fulfillment")! : "all";
  const search = params.get("search") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const query = {
    status: status === "all" ? undefined : status,
    fulfillment_method: fulfillment === "all" ? undefined : fulfillment,
    search: search || undefined,
    page,
    per_page: 25,
  };
  const q = useQuery(`iphone18:orders:${JSON.stringify(query)}`, (force) => api.iphone18Orders(query, force), 60_000);
  const res = q.data ?? q.stale;
  const rows = res?.data ?? [];

  return (
    <div>
      <PageHeader
        title="iPhone 18 Purchases"
        subtitle="بيانات العملاء وعمليات الدفع لمتجر iPhone 18 (iphone18.wafi.sa) — وحدة مستقلة عن بقية خدمات وافي."
        actions={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />}
      />

      <Summary />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="حالة الطلب" value={status} onChange={(v) => updateParams({ status: v === "all" ? null : v, page: null })} options={[...STATUSES]} />
          <Segmented label="طريقة التسليم" value={fulfillment} onChange={(v) => updateParams({ fulfillment: v === "all" ? null : v, page: null })} options={[...FULFILLMENT]} size="sm" />
        </div>
        <Search initial={search} />
      </div>

      <Card>
        {q.error && !res ? (
          <QueryError error={q.error} onRetry={q.reload} what="طلبات iPhone 18" />
        ) : !res ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon="orders" title="لا توجد طلبات" hint={status !== "all" || fulfillment !== "all" || search ? "لا توجد طلبات مطابقة لهذا الفلتر." : undefined} />
        ) : (
          <div className={cx("transition-opacity", q.loading && "opacity-50")} aria-busy={q.loading}>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-right text-[14px]">
                <caption className="sr-only">طلبات iPhone 18</caption>
                <thead>
                  <tr className="border-b border-line text-[13px] text-ink-3">
                    <th className="px-4 py-2.5 font-medium">الطلب</th>
                    <th className="px-3 py-2.5 font-medium">العميل</th>
                    <th className="hidden px-3 py-2.5 font-medium lg:table-cell">المنتج</th>
                    <th className="px-3 py-2.5 font-medium">التسليم</th>
                    <th className="px-3 py-2.5 font-medium">المبلغ</th>
                    <th className="px-3 py-2.5 font-medium">حالة الطلب</th>
                    <th className="px-4 py-2.5 font-medium">الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3">
                        <span className="num block text-ink">{o.order_number}</span>
                        <span className="block text-[12.5px] text-ink-3">
                          <When iso={o.created_at} />
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block max-w-[180px] truncate text-ink">{o.customer.name}</span>
                        <Phone value={o.customer.phone} link={false} />
                        <span dir="ltr" className="block max-w-[180px] truncate text-[12.5px] text-ink-3">
                          {o.customer.email}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 lg:table-cell">
                        {o.variant ? (
                          <span className="text-ink-2">
                            {o.variant.color_label_ar} · {o.variant.storage_label}
                          </span>
                        ) : (
                          <NotTracked>بدون منتج</NotTracked>
                        )}
                      </td>
                      <td className="px-3 py-3">{fulfillmentCell(o)}</td>
                      <td className="num px-3 py-3 text-ink">{fmtMoney(o.amount_sar)}</td>
                      <td className="px-3 py-3">
                        <StatusPill status={o.status} label={o.status_label} />
                      </td>
                      <td className="px-4 py-3">{paymentCell(o)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {rows.map((o) => (
                <li key={o.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="num text-[14.5px] text-ink">{o.order_number}</span>
                    <StatusPill status={o.status} label={o.status_label} />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[14px] text-ink-2">{o.customer.name}</span>
                    <span className="num text-[14px] text-ink">{fmtMoney(o.amount_sar)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[13px] text-ink-3">
                    {fulfillmentCell(o)}
                    <When iso={o.created_at} />
                  </div>
                </li>
              ))}
            </ul>
            <Pager meta={res.meta} busy={q.loading} onPage={(p) => updateParams({ page: p === 1 ? null : p })} />
          </div>
        )}
      </Card>
    </div>
  );
}
