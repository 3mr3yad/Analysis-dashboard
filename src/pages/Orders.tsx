import { useMemo } from "react";
import { isOrderDelayed } from "../analytics/requests";
import { inRange, resolveRange } from "../analytics/time";
import type { Order, OrderStatus } from "../domain/types";
import { fmtDateTime, fmtDuration, fmtInt, fmtMoney, fmtRelative } from "../lib/format";
import { useNow } from "../state/clock";
import { useDateRange } from "../state/dateRange";
import { useData } from "../state/indexes";
import { useDashboard } from "../state/store";
import { openPanel, setParams, useRoute } from "../state/router";
import DataTable, { type Column } from "../ui/DataTable";
import DateRangeControl from "../ui/DateRangeControl";
import Icon, { type IconName } from "../ui/Icon";
import { Changed } from "../ui/Changed";
import { OrderStatusBadge } from "../ui/badges";
import { PageHeader } from "../ui/page";
import { Avatar, Card, SearchInput } from "../ui/primitives";
import { cx } from "../ui/tone";

type View = "all" | OrderStatus | "delayed";
const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");

export default function Orders() {
  const { data, ix } = useData();
  const now = useNow();
  const recent = useDashboard((s) => s.recent);
  const range = useDateRange();
  const w = useMemo(() => resolveRange(range, now), [range, now]);
  const { params } = useRoute();
  const view = (params.get("status") ?? "all") as View;
  const q = params.get("q") ?? "";

  // Orders created in the period, plus any still open regardless of age.
  const scoped = useMemo(() => data.orders.filter((o) => inRange(o.createdAt, w.from, w.to) || (o.status !== "completed" && o.status !== "cancelled")), [data.orders, w]);
  const count = (v: View) => scoped.filter((o) => (v === "all" ? true : v === "delayed" ? isOrderDelayed(o, now) : o.status === v)).length;

  const tiles: { v: View; label: string; icon: IconName; tone?: string }[] = [
    { v: "all", label: "إجمالي الطلبات", icon: "orders" },
    { v: "new", label: "جديدة", icon: "sparkle" },
    { v: "processing", label: "قيد المعالجة", icon: "refresh" },
    { v: "awaiting_approval", label: "بانتظار الاعتماد", icon: "checkCircle", tone: "text-warning" },
    { v: "completed", label: "مكتملة", icon: "check", tone: "text-good" },
    { v: "cancelled", label: "ملغاة", icon: "close" },
    { v: "delayed", label: "متأخرة", icon: "clock", tone: "text-critical" },
  ];

  const rows = useMemo(() => {
    const term = norm(q.trim());
    return scoped.filter((o) => {
      if (view === "delayed" ? !isOrderDelayed(o, now) : view !== "all" && o.status !== view) return false;
      if (term) {
        const hay = norm(`${o.code} ${ix.customer.get(o.customerId)?.name ?? ""} ${ix.employee.get(o.assigneeId)?.name ?? ""}`);
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [scoped, view, q, ix, now]);

  const total = rows.reduce((s, o) => s + o.value, 0);

  const columns: Column<Order>[] = [
    { key: "code", header: "رقم الطلب", render: (o) => <span className="num text-[13.5px] text-ink-2">{o.code}</span>, sortValue: (o) => o.code },
    {
      key: "customer",
      header: "العميل",
      render: (o) => {
        const c = ix.customer.get(o.customerId);
        return (
          <span className="flex items-center gap-2.5">
            <Avatar name={c?.name ?? "?"} id={o.customerId} size={26} />
            <span className="max-w-[160px] truncate text-ink">{c?.name}</span>
          </span>
        );
      },
      sortValue: (o) => ix.customer.get(o.customerId)?.name ?? "",
    },
    { key: "value", header: "القيمة", render: (o) => <span className="num font-medium text-ink">{fmtMoney(o.value)}</span>, sortValue: (o) => o.value },
    { key: "assignee", header: "المسؤول", render: (o) => <span className="text-ink-2">{ix.employee.get(o.assigneeId)?.name}</span>, sortValue: (o) => ix.employee.get(o.assigneeId)?.name ?? "", hideBelow: "lg" },
    {
      key: "status",
      header: "الحالة",
      render: (o) => (
        <span className="flex items-center gap-1.5">
          <OrderStatusBadge status={o.status} />
          {isOrderDelayed(o, now) && <span className="text-[12.5px] text-critical">متأخر</span>}
        </span>
      ),
      sortValue: (o) => o.status,
    },
    { key: "created", header: "الإنشاء", render: (o) => <span className="num text-[13.5px] text-ink-3">{fmtDateTime(o.createdAt)}</span>, sortValue: (o) => o.createdAt, hideBelow: "xl" },
    {
      key: "expected",
      header: "التسليم المتوقع",
      render: (o) => (
        <span className={cx("text-[13.5px]", isOrderDelayed(o, now) ? "text-critical" : "text-ink-3")}>
          {o.status === "completed" ? `سُلّم ${fmtRelative(o.completedAt!, now)}` : o.status === "cancelled" ? "—" : isOrderDelayed(o, now) ? `متأخر ${fmtDuration(now - o.expectedAt)}` : fmtRelative(o.expectedAt, now)}
        </span>
      ),
      sortValue: (o) => o.expectedAt,
    },
    { key: "updated", header: "آخر تحديث", render: (o) => <span className="text-[13.5px] text-ink-3">{fmtRelative(o.updatedAt, now)}</span>, sortValue: (o) => o.updatedAt, hideBelow: "lg" },
  ];

  return (
    <div>
      <PageHeader title="الطلبات الشرائية" subtitle="الطلبات المنشأة خلال الفترة، إضافة إلى كل طلب ما زال مفتوحًا مهما كان عمره." actions={<DateRangeControl label={w.label} />} />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {tiles.map((t) => {
          const active = view === t.v;
          return (
            <Changed key={t.v} value={count(t.v)} resetKey={w.label}>
              {(changeCls) => (
            <button
              onClick={() => setParams({ status: t.v === "all" ? null : t.v })}
              aria-pressed={active}
              className={cx("card p-3.5 text-right transition-colors", active ? "border-accent/40 bg-accent-soft" : "hover:border-line-strong", changeCls)}
            >
              <span className="flex items-center gap-1.5 text-[13px] text-ink-3">
                <Icon name={t.icon} size={13} className={t.tone} /> {t.label}
              </span>
              <span className="num mt-1.5 block text-[23px] font-semibold text-ink" style={{ textAlign: "right" }}>
                {fmtInt(count(t.v))}
              </span>
            </button>
              )}
            </Changed>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <p className="text-[14px] text-ink-3">
            <span className="num text-ink">{fmtInt(rows.length)}</span> طلب · إجمالي القيمة <span className="num text-ink">{fmtMoney(total)}</span>
          </p>
          <SearchInput value={q} onChange={(v) => setParams({ q: v || null })} placeholder="رقم الطلب، العميل، الموظف…" className="w-full sm:w-72" />
        </div>
        <DataTable
          label="قائمة الطلبات الشرائية"
          columns={columns}
          rows={rows}
          rowKey={(o) => o.id}
          onRowClick={(o) => openPanel({ kind: "order", id: o.id })}
          initialSort={{ key: "updated", dir: "desc" }}
          highlight={recent}
          emptyTitle="لا توجد طلبات شرائية مطابقة"
          renderMobile={(o) => (
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[14.5px] font-medium text-ink">{ix.customer.get(o.customerId)?.name}</span>
                <span className="num text-[14.5px] font-semibold text-ink">{fmtMoney(o.value)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[12.5px] text-ink-3">
                <span className="num">{o.code}</span>
                <OrderStatusBadge status={o.status} />
                {isOrderDelayed(o, now) && <span className="text-critical">متأخر</span>}
              </div>
            </div>
          )}
        />
      </Card>
    </div>
  );
}
