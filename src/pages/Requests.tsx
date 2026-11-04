import { useMemo } from "react";
import { ACTIVE, PENDING, TERMINAL, isOverdue } from "../analytics/requests";
import { inRange, resolveRange } from "../analytics/time";
import { DEPARTMENT, DIRECTION, PRIORITY, REQUEST_STATUS, SERVICE, SIDE_STATUSES, WORKFLOW } from "../domain/labels";
import type { Department, Direction, Priority, RequestStatus, ServiceRequest, ServiceType } from "../domain/types";
import { DAY, fmtDateTime, fmtRelative, startOfDay } from "../lib/format";
import { useNow } from "../state/clock";
import { useDateRange } from "../state/dateRange";
import { useData } from "../state/indexes";
import { useDashboard } from "../state/store";
import { openPanel, setParams, useRoute } from "../state/router";
import DataTable, { type Column } from "../ui/DataTable";
import DateRangeControl from "../ui/DateRangeControl";
import Icon from "../ui/Icon";
import { Changed } from "../ui/Changed";
import { OverdueTag, PriorityTag, RequestStatusBadge } from "../ui/badges";
import { PageHeader } from "../ui/page";
import { Avatar, Button, Card, SearchInput, Segmented, Select } from "../ui/primitives";
import { cx } from "../ui/tone";

type View = "open" | "active" | "pending" | "overdue" | "done" | "all";
const VIEWS: { value: View; label: string }[] = [
  { value: "open", label: "المفتوحة" },
  { value: "active", label: "قيد العمل" },
  { value: "pending", label: "معلّقة" },
  { value: "overdue", label: "متأخرة" },
  { value: "done", label: "منجزة" },
  { value: "all", label: "الكل" },
];

const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");

export default function Requests() {
  const { data, ix } = useData();
  const now = useNow();
  const recent = useDashboard((s) => s.recent);
  const range = useDateRange();
  const w = useMemo(() => resolveRange(range, now), [range, now]);
  const { params } = useRoute();

  const statusParam = params.get("status") ?? "open";
  const exactStatus = (WORKFLOW as string[]).includes(statusParam) || (SIDE_STATUSES as string[]).includes(statusParam) ? (statusParam as RequestStatus) : null;
  const view: View = exactStatus ? "all" : (statusParam as View);
  const q = params.get("q") ?? "";
  const type = (params.get("type") ?? "all") as ServiceType | "all";
  const priority = (params.get("priority") ?? "all") as Priority | "all";
  const dept = (params.get("dept") ?? "all") as Department | "all";
  const dir = (params.get("dir") ?? "all") as Direction | "all";
  const created = params.get("created"); // "today" | "range" | null
  // Counts re-baseline (no change highlight) when the user changes the scope.
  const scopeKey = [q, type, priority, dept, dir, created, w.label].join("|");

  const matchesView = (r: ServiceRequest, v: View) =>
    v === "all" ||
    (v === "open" && !TERMINAL.has(r.status)) ||
    (v === "active" && ACTIVE.has(r.status)) ||
    (v === "pending" && PENDING.has(r.status)) ||
    (v === "overdue" && isOverdue(r, now)) ||
    (v === "done" && (r.status === "completed" || r.status === "closed"));

  const base = useMemo(() => {
    const term = norm(q.trim());
    const today = startOfDay(now);
    return data.requests.filter((r) => {
      if (type !== "all" && r.type !== type) return false;
      if (priority !== "all" && r.priority !== priority) return false;
      if (dept !== "all" && r.department !== dept) return false;
      if (dir !== "all" && r.direction !== dir) return false;
      if (created === "today" && !inRange(r.createdAt, today, today + DAY)) return false;
      if (created === "range" && !inRange(r.createdAt, w.from, w.to)) return false;
      if (term) {
        const c = ix.customer.get(r.customerId);
        const e = r.assigneeId ? ix.employee.get(r.assigneeId) : undefined;
        const hay = norm(`${r.code} ${c?.name ?? ""} ${c?.code ?? ""} ${e?.name ?? ""} ${r.currentAction}`);
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [data.requests, ix, q, type, priority, dept, dir, created, now, w]);

  const rows = exactStatus ? base.filter((r) => r.status === exactStatus) : base.filter((r) => matchesView(r, view));
  const viewCounts = Object.fromEntries(VIEWS.map((v) => [v.value, base.filter((r) => matchesView(r, v.value)).length]));
  const stageCounts = Object.fromEntries([...WORKFLOW, ...SIDE_STATUSES].map((s) => [s, base.filter((r) => r.status === s).length]));
  const filtersOn = type !== "all" || priority !== "all" || dept !== "all" || dir !== "all" || !!created || !!q;

  const columns: Column<ServiceRequest>[] = [
    { key: "code", header: "رقم الطلب", render: (r) => <span className="num text-[13.5px] text-ink-2">{r.code}</span>, sortValue: (r) => r.code },
    {
      key: "customer",
      header: "العميل",
      render: (r) => {
        const c = ix.customer.get(r.customerId);
        return (
          <span className="flex items-center gap-2.5">
            <Avatar name={c?.name ?? "?"} id={r.customerId} size={26} />
            <span className="min-w-0">
              <span className="block max-w-[160px] truncate text-ink">{c?.name}</span>
              <span className="flex items-center gap-1 text-[12.5px] text-ink-3">
                <Icon name={r.direction === "incoming" ? "incoming" : "outgoing"} size={11} /> {DIRECTION[r.direction].label}
              </span>
            </span>
          </span>
        );
      },
      sortValue: (r) => ix.customer.get(r.customerId)?.name ?? "",
    },
    { key: "type", header: "نوع الطلب", render: (r) => <span className="text-ink-2">{SERVICE[r.type].label}</span>, sortValue: (r) => SERVICE[r.type].label, hideBelow: "lg" },
    {
      key: "assignee",
      header: "المسؤول",
      render: (r) => {
        const e = r.assigneeId ? ix.employee.get(r.assigneeId) : undefined;
        return e ? (
          <span>
            <span className="block text-ink-2">{e.name}</span>
            <span className="text-[12.5px] text-ink-3">{DEPARTMENT[r.department].label}</span>
          </span>
        ) : (
          <span className="text-ink-3">غير مسند</span>
        );
      },
      sortValue: (r) => (r.assigneeId ? ix.employee.get(r.assigneeId)?.name ?? "" : ""),
    },
    { key: "priority", header: "الأولوية", render: (r) => <PriorityTag priority={r.priority} />, sortValue: (r) => -PRIORITY[r.priority].rank },
    {
      key: "status",
      header: "الحالة",
      render: (r) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <RequestStatusBadge status={r.status} />
          {isOverdue(r, now) && <OverdueTag />}
        </span>
      ),
      sortValue: (r) => [...WORKFLOW, ...SIDE_STATUSES].indexOf(r.status),
    },
    { key: "action", header: "الإجراء الحالي", render: (r) => <span className="block max-w-[220px] truncate text-[13.5px] text-ink-3">{r.currentAction}</span>, hideBelow: "xl" },
    { key: "created", header: "الإنشاء", render: (r) => <span className="num text-[13.5px] text-ink-3">{fmtDateTime(r.createdAt)}</span>, sortValue: (r) => r.createdAt, hideBelow: "xl" },
    { key: "updated", header: "آخر تحديث", render: (r) => <span className="text-[13.5px] text-ink-3">{fmtRelative(r.updatedAt, now)}</span>, sortValue: (r) => r.updatedAt },
    {
      key: "due",
      header: "الإنجاز المتوقع",
      render: (r) => <span className={cx("text-[13.5px]", isOverdue(r, now) ? "text-critical" : "text-ink-3")}>{TERMINAL.has(r.status) ? "—" : fmtRelative(r.dueAt, now)}</span>,
      sortValue: (r) => r.dueAt,
      hideBelow: "lg",
    },
  ];

  return (
    <div>
      <PageHeader
        title="طلبات العملاء"
        subtitle="كل طلب يدخل الشركة أو يخرج منها: من المسؤول عنه، أين وصل، وما المطلوب تاليًا."
        actions={created === "range" ? <DateRangeControl label={w.label} /> : undefined}
      />

      {/* Workflow strip */}
      <Card className="mb-4 p-2">
        <ol className="flex items-stretch gap-1 overflow-x-auto">
          {WORKFLOW.map((s, i) => (
            <li key={s} className="flex min-w-[118px] flex-1 items-center">
              <Changed value={stageCounts[s]} resetKey={scopeKey}>
                {(changeCls) => (
              <button
                onClick={() => setParams({ status: exactStatus === s ? null : s })}
                className={cx("flex-1 rounded-lg border border-transparent px-3 py-2.5 text-right transition-colors", exactStatus === s ? "bg-accent-soft ring-1 ring-accent/30" : "hover:bg-white/[0.03]", changeCls)}
              >
                <span className="block text-[12.5px] text-ink-3">{REQUEST_STATUS[s].label}</span>
                <span className="num block text-[19.5px] font-semibold text-ink" style={{ textAlign: "right" }}>
                  {stageCounts[s]}
                </span>
              </button>
                )}
              </Changed>
              {i < WORKFLOW.length - 1 && <Icon name="chevron" size={14} className="mx-0.5 shrink-0 text-ink-3/60" />}
            </li>
          ))}
          <li className="mx-1 w-px shrink-0 bg-line" aria-hidden />
          {SIDE_STATUSES.map((s) => (
            <li key={s} className="min-w-[92px]">
              <Changed value={stageCounts[s]} resetKey={scopeKey}>
                {(changeCls) => (
              <button
                onClick={() => setParams({ status: exactStatus === s ? null : s })}
                className={cx("h-full w-full rounded-lg border border-transparent px-3 py-2.5 text-right transition-colors", exactStatus === s ? "bg-white/[0.06] ring-1 ring-line-strong" : "hover:bg-white/[0.03]", changeCls)}
              >
                <span className="block text-[12.5px] text-ink-3">{REQUEST_STATUS[s].label}</span>
                <span className="num block text-[16.5px] font-medium text-ink-2" style={{ textAlign: "right" }}>
                  {stageCounts[s]}
                </span>
              </button>
                )}
              </Changed>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented<View>
              label="عرض الطلبات"
              value={exactStatus ? ("" as View) : view}
              onChange={(v) => setParams({ status: v })}
              options={VIEWS.map((v) => ({ ...v, count: viewCounts[v.value] }))}
            />
            <SearchInput value={q} onChange={(v) => setParams({ q: v || null })} placeholder="رقم الطلب، العميل، الموظف…" className="w-full sm:w-72" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Icon name="filter" size={14} className="text-ink-3" />
            <Select label="نوع الطلب" value={type} onChange={(v) => setParams({ type: v === "all" ? null : v })} options={[{ value: "all", label: "كل الخدمات" }, ...(Object.keys(SERVICE) as ServiceType[]).map((k) => ({ value: k, label: SERVICE[k].label }))]} />
            <Select label="الأولوية" value={priority} onChange={(v) => setParams({ priority: v === "all" ? null : v })} options={[{ value: "all", label: "كل الأولويات" }, ...(Object.keys(PRIORITY) as Priority[]).map((k) => ({ value: k, label: PRIORITY[k].label }))]} />
            <Select label="القسم" value={dept} onChange={(v) => setParams({ dept: v === "all" ? null : v })} options={[{ value: "all", label: "كل الأقسام" }, ...(Object.keys(DEPARTMENT) as Department[]).map((k) => ({ value: k, label: DEPARTMENT[k].label }))]} />
            <Select label="الاتجاه" value={dir} onChange={(v) => setParams({ dir: v === "all" ? null : v })} options={[{ value: "all", label: "واردة وصادرة" }, { value: "incoming", label: "واردة" }, { value: "outgoing", label: "صادرة" }]} />
            {created && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent-soft px-2.5 py-1.5 text-[13.5px] text-accent">
                {created === "today" ? "أُنشئت اليوم" : `أُنشئت خلال: ${w.label}`}
                <button onClick={() => setParams({ created: null })} aria-label="إزالة فلتر التاريخ">
                  <Icon name="close" size={12} />
                </button>
              </span>
            )}
            {filtersOn && (
              <Button onClick={() => setParams({ type: null, priority: null, dept: null, dir: null, created: null, q: null })} className="text-[13.5px]">
                مسح الفلاتر
              </Button>
            )}
          </div>
        </div>
        <DataTable
          label="قائمة طلبات العملاء"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => openPanel({ kind: "request", id: r.id })}
          initialSort={{ key: view === "overdue" ? "due" : "updated", dir: view === "overdue" ? "asc" : "desc" }}
          highlight={recent}
          emptyTitle="لا توجد طلبات مطابقة"
          emptyHint="جرّب تغيير الفلاتر أو البحث."
          renderMobile={(r) => {
            const c = ix.customer.get(r.customerId);
            const e = r.assigneeId ? ix.employee.get(r.assigneeId) : undefined;
            return (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[14.5px] font-medium text-ink">{c?.name}</span>
                  <RequestStatusBadge status={r.status} />
                </div>
                <p className="mt-1 truncate text-[13.5px] text-ink-3">{r.currentAction}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[12.5px] text-ink-3">
                  <span className="num">{r.code}</span>
                  <span>{e?.name ?? "غير مسند"}</span>
                  <PriorityTag priority={r.priority} />
                  {isOverdue(r, now) && <OverdueTag />}
                </div>
              </div>
            );
          }}
        />
      </Card>
    </div>
  );
}
