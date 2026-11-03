import { useMemo } from "react";
import { isOpen, isOverdue } from "../analytics/requests";
import { CUSTOMER_STATUS, SEGMENT } from "../domain/labels";
import type { Customer, CustomerSegment, CustomerStatus } from "../domain/types";
import { fmtInt, fmtMoney, fmtRelative } from "../lib/format";
import { useNow } from "../state/clock";
import { useData } from "../state/indexes";
import { openPanel, setParams, useRoute } from "../state/router";
import DataTable, { type Column } from "../ui/DataTable";
import { PageHeader } from "../ui/page";
import { Avatar, Badge, Card, SearchInput, Segmented, Select } from "../ui/primitives";

interface Row {
  c: Customer;
  requests: number;
  active: number;
  overdue: number;
  orders: number;
  ltv: number;
  last: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");

export default function Customers() {
  const { data, ix } = useData();
  const now = useNow();
  const { params } = useRoute();
  const q = params.get("q") ?? "";
  const status = (params.get("cstatus") ?? "all") as CustomerStatus | "all";
  const segment = (params.get("segment") ?? "all") as CustomerSegment | "all";

  const all = useMemo<Row[]>(
    () =>
      data.customers.map((c) => {
        const reqs = ix.requestsByCustomer.get(c.id) ?? [];
        const orders = ix.ordersByCustomer.get(c.id) ?? [];
        const open = reqs.filter(isOpen);
        const acts = ix.activityByCustomer.get(c.id);
        return {
          c,
          requests: reqs.length,
          active: open.length,
          overdue: open.filter((r) => isOverdue(r, now)).length,
          orders: orders.length,
          ltv: orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.value, 0),
          last: acts?.[acts.length - 1]?.at ?? c.createdAt,
        };
      }),
    [data.customers, ix, now],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: all.length };
    for (const r of all) m[r.c.status] = (m[r.c.status] ?? 0) + 1;
    return m;
  }, [all]);

  const rows = useMemo(() => {
    const term = norm(q.trim());
    return all.filter((r) => {
      if (status !== "all" && r.c.status !== status) return false;
      if (segment !== "all" && r.c.segment !== segment) return false;
      if (term && !norm(`${r.c.name} ${r.c.code} ${r.c.phone} ${r.c.city}`).includes(term)) return false;
      return true;
    });
  }, [all, q, status, segment]);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "العميل",
      render: (r) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={r.c.name} id={r.c.id} size={28} />
          <span>
            <span className="block text-ink">{r.c.name}</span>
            <span className="num text-[11px] text-ink-3">{r.c.code}</span>
          </span>
        </span>
      ),
      sortValue: (r) => r.c.name,
    },
    { key: "city", header: "المدينة", render: (r) => <span className="text-ink-2">{r.c.city}</span>, sortValue: (r) => r.c.city, hideBelow: "xl" },
    { key: "segment", header: "الفئة", render: (r) => <Badge dot={false}>{SEGMENT[r.c.segment].label}</Badge>, sortValue: (r) => r.c.segment, hideBelow: "lg" },
    { key: "status", header: "الحالة", render: (r) => <Badge tone={CUSTOMER_STATUS[r.c.status].tone}>{CUSTOMER_STATUS[r.c.status].label}</Badge>, sortValue: (r) => r.c.status },
    { key: "requests", header: "الطلبات", render: (r) => <span className="num text-ink-2">{r.requests}</span>, sortValue: (r) => r.requests },
    {
      key: "active",
      header: "النشطة",
      render: (r) => (
        <span className="num text-ink-2">
          {r.active}
          {r.overdue > 0 && <span className="mr-1.5 text-[11px] text-critical">({r.overdue} متأخر)</span>}
        </span>
      ),
      sortValue: (r) => r.active * 100 + r.overdue,
    },
    { key: "orders", header: "المشتريات", render: (r) => <span className="num text-ink-2">{r.orders}</span>, sortValue: (r) => r.orders, hideBelow: "lg" },
    { key: "ltv", header: "القيمة الدائمة", render: (r) => <span className="num text-ink">{fmtMoney(r.ltv)}</span>, sortValue: (r) => r.ltv },
    { key: "manager", header: "مدير الحساب", render: (r) => <span className="text-[12px] text-ink-3">{ix.employee.get(r.c.accountManagerId)?.name}</span>, hideBelow: "xl" },
    { key: "last", header: "آخر تفاعل", render: (r) => <span className="text-[12px] text-ink-3">{fmtRelative(r.last, now)}</span>, sortValue: (r) => r.last },
  ];

  return (
    <div>
      <PageHeader title="العملاء" subtitle="ابحث عن أي عميل لترى علاقته بالشركة كاملة: طلباته، مشترياته، ومن يتابعه، ورحلته خطوة بخطوة." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<CustomerStatus | "all">
              label="حالة العميل"
              value={status}
              onChange={(v) => setParams({ cstatus: v === "all" ? null : v })}
              options={[
                { value: "all", label: "الكل", count: counts.all },
                { value: "active", label: CUSTOMER_STATUS.active.label, count: counts.active ?? 0 },
                { value: "at_risk", label: CUSTOMER_STATUS.at_risk.label, count: counts.at_risk ?? 0 },
                { value: "inactive", label: CUSTOMER_STATUS.inactive.label, count: counts.inactive ?? 0 },
              ]}
            />
            <Select
              label="الفئة"
              value={segment}
              onChange={(v) => setParams({ segment: v === "all" ? null : v })}
              options={[{ value: "all", label: "كل الفئات" }, ...(Object.keys(SEGMENT) as CustomerSegment[]).map((k) => ({ value: k, label: SEGMENT[k].label }))]}
            />
          </div>
          <SearchInput value={q} onChange={(v) => setParams({ q: v || null })} placeholder="الاسم، رقم العميل، الجوال، المدينة…" className="w-full lg:w-80" />
        </div>
        <DataTable
          label="قائمة العملاء"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.c.id}
          onRowClick={(r) => openPanel({ kind: "customer", id: r.c.id })}
          initialSort={{ key: "last", dir: "desc" }}
          emptyTitle="لا يوجد عملاء مطابقون"
          renderMobile={(r) => (
            <div className="flex items-center gap-3">
              <Avatar name={r.c.name} id={r.c.id} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-ink">{r.c.name}</span>
                  <Badge tone={CUSTOMER_STATUS[r.c.status].tone}>{CUSTOMER_STATUS[r.c.status].label}</Badge>
                </div>
                <p className="mt-1 text-[11.5px] text-ink-3">
                  {fmtInt(r.requests)} طلب · {r.active} نشط · {fmtMoney(r.ltv, true)}
                </p>
              </div>
            </div>
          )}
        />
      </Card>
    </div>
  );
}
