import { useMemo } from "react";
import { departmentStats, employeeStats, type EmployeeStats } from "../analytics/people";
import { resolveRange } from "../analytics/time";
import { HBarList } from "../charts/small";
import { DEPARTMENT, PRESENCE } from "../domain/labels";
import { fmtHours, fmtInt, fmtPct } from "../lib/format";
import { useNow } from "../state/clock";
import { useDateRange } from "../state/dateRange";
import { useData } from "../state/indexes";
import { openPanel } from "../state/router";
import DataTable, { type Column } from "../ui/DataTable";
import DateRangeControl from "../ui/DateRangeControl";
import Icon from "../ui/Icon";
import { PageHeader } from "../ui/page";
import { Avatar, Card, CardHeader, Stat } from "../ui/primitives";
import { TeamAvatars } from "../ui/TeamAvatars";
import { cx } from "../ui/tone";

const avg = (xs: number[]) => {
  const f = xs.filter(Number.isFinite);
  return f.length ? f.reduce((a, b) => a + b, 0) / f.length : NaN;
};

export default function Employees() {
  const { data, ix } = useData();
  const now = useNow();
  const range = useDateRange();
  const w = useMemo(() => resolveRange(range, now), [range, now]);
  const rows = useMemo(() => employeeStats(data, ix, w, now), [data, ix, w, now]);
  const depts = useMemo(() => departmentStats(rows), [rows]);

  const completed = rows.reduce((s, r) => s + r.completed, 0);
  const overdue = rows.reduce((s, r) => s + r.overdue, 0);
  const open = rows.reduce((s, r) => s + r.open, 0);
  const rated = rows.reduce((s, r) => s + r.rated, 0);
  const csat = rated ? rows.reduce((s, r) => s + (r.csat ?? 0) * r.rated, 0) / rated : NaN;
  const ranked = [...rows].sort((a, b) => b.completed - a.completed);

  const columns: Column<EmployeeStats>[] = [
    { key: "rank", header: "#", render: (r) => <span className="num text-[11.5px] text-ink-3">{ranked.indexOf(r) + 1}</span>, sortValue: (r) => -ranked.indexOf(r), className: "w-10" },
    {
      key: "name",
      header: "الموظف",
      render: (r) => {
        const p = ix.presence.get(r.employee.id);
        return (
          <span className="flex items-center gap-2.5">
            <Avatar name={r.employee.name} id={r.employee.id} size={28} status={p ? PRESENCE[p.status].tone : undefined} />
            <span>
              <span className="block text-ink">{r.employee.name}</span>
              <span className="text-[11px] text-ink-3">{DEPARTMENT[r.employee.department].label}</span>
            </span>
          </span>
        );
      },
      sortValue: (r) => r.employee.name,
    },
    { key: "completed", header: "مكتملة", render: (r) => <span className="num font-medium text-ink">{r.completed}</span>, sortValue: (r) => r.completed },
    { key: "open", header: "مفتوحة", render: (r) => <span className="num text-ink-2">{r.open}</span>, sortValue: (r) => r.open },
    { key: "overdue", header: "متأخرة", render: (r) => <span className={cx("num", r.overdue ? "text-critical" : "text-ink-3")}>{r.overdue}</span>, sortValue: (r) => r.overdue },
    { key: "resp", header: "أول استجابة", render: (r) => <span className="num text-ink-2">{fmtHours(r.avgResponse)}</span>, sortValue: (r) => (Number.isFinite(r.avgResponse) ? r.avgResponse : 1e15), hideBelow: "lg" },
    { key: "reso", header: "زمن الإنجاز", render: (r) => <span className="num text-ink-2">{fmtHours(r.avgResolution)}</span>, sortValue: (r) => (Number.isFinite(r.avgResolution) ? r.avgResolution : 1e15), hideBelow: "lg" },
    { key: "csat", header: "الرضا", render: (r) => <span className="num text-ink-2">{r.csat === null ? "—" : fmtPct(r.csat)}</span>, sortValue: (r) => r.csat ?? -1 },
    {
      key: "load",
      header: "عبء العمل",
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.05]">
            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (r.loadIndex / 2) * 100)}%`, background: r.loadIndex > 1.5 ? "var(--color-serious)" : "var(--color-series-1)" }} />
          </span>
          {r.loadIndex > 1.5 && <Icon name="alert" size={12} className="text-serious" />}
        </span>
      ),
      sortValue: (r) => r.loadIndex,
      hideBelow: "xl",
    },
  ];

  return (
    <div>
      <PageHeader
        title="الموظفون والفرق"
        subtitle="توزيع العمل وجودة الخدمة عبر الفريق — لكشف الاختناقات وموازنة العبء، وليس للمراقبة الفردية. كل رقم مستخرج من نشاط مسجّل."
        actions={<DateRangeControl label={w.label} />}
      />

      <Card className="mb-4 grid grid-cols-2 gap-5 p-5 md:grid-cols-5">
        <Stat label="طلبات مكتملة" value={fmtInt(completed)} sub={w.label} resetKey={w.label} />
        <Stat label="مفتوحة لدى الفريق" value={fmtInt(open)} resetKey={w.label} />
        <Stat label="متأخرة" value={fmtInt(overdue)} tone={overdue ? "critical" : undefined} resetKey={w.label} />
        <Stat label="متوسط زمن الإنجاز" value={fmtHours(avg(rows.map((r) => r.avgResolution)))} resetKey={w.label} />
        <Stat label="رضا العملاء" value={Number.isFinite(csat) ? fmtPct(csat) : "—"} sub={`${rated} تقييم`} resetKey={w.label} />
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader icon="layers" title="أداء الأقسام" subtitle={w.label} />
          <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2">
            {depts.map((d) => (
              <div key={d.department} className="rounded-xl border border-line bg-white/[0.015] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-ink">{DEPARTMENT[d.department].label}</p>
                  <TeamAvatars people={rows.filter((r) => r.employee.department === d.department).map((r) => r.employee)} presence={ix.presence} max={5} size={26} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Stat label="مكتملة" value={d.completed} resetKey={w.label} />
                  <Stat label="مفتوحة" value={d.open} sub={d.overdue ? <span className="text-critical">{d.overdue} متأخر</span> : undefined} resetKey={w.label} />
                  <Stat label="الرضا" value={d.csat === null ? "—" : fmtPct(d.csat)} resetKey={w.label} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="xl:col-span-5">
          <CardHeader icon="users" title="مقارنة عبء العمل" subtitle="الطلبات المفتوحة لكل موظف الآن" />
          <div className="px-5 pb-5">
            <HBarList
              items={[...rows]
                .sort((a, b) => b.open - a.open)
                .map((r) => ({
                  key: r.employee.id,
                  label: r.employee.name,
                  value: r.open,
                  tone: r.loadIndex > 1.5 ? "var(--color-serious)" : undefined,
                  display: r.loadIndex > 1.5 ? `${r.open} · مرتفع` : String(r.open),
                  onClick: () => openPanel({ kind: "employee", id: r.employee.id }),
                }))}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader icon="analytics" title="ترتيب الأداء" subtitle="حسب الطلبات المكتملة — اضغط أي عمود للترتيب" />
        <DataTable
          label="ترتيب أداء الموظفين"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.employee.id}
          onRowClick={(r) => openPanel({ kind: "employee", id: r.employee.id })}
          initialSort={{ key: "completed", dir: "desc" }}
          pageSize={20}
          renderMobile={(r) => (
            <div className="flex items-center gap-3">
              <Avatar name={r.employee.name} id={r.employee.id} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{r.employee.name}</p>
                <p className="text-[11.5px] text-ink-3">
                  {r.completed} مكتملة · {r.open} مفتوحة {r.overdue ? `· ${r.overdue} متأخرة` : ""}
                </p>
              </div>
              <span className="num text-[12px] text-ink-2">{r.csat === null ? "—" : fmtPct(r.csat)}</span>
            </div>
          )}
        />
      </Card>
    </div>
  );
}
