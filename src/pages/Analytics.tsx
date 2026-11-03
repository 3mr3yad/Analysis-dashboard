import { useMemo } from "react";
import { employeeStats } from "../analytics/people";
import { completedAt, completionRateSeries, countBy, flowSeries, timingSeries, windowStats } from "../analytics/requests";
import { bucketLabel, bucketOf, inRange, resolveRange } from "../analytics/time";
import ColumnChart from "../charts/ColumnChart";
import LineChart from "../charts/LineChart";
import { HBarList } from "../charts/small";
import { DEPARTMENT, PRIORITY, REQUEST_STATUS, SERVICE } from "../domain/labels";
import type { ServiceType } from "../domain/types";
import { HOUR, fmtCompact, fmtDateTime, fmtHours, fmtInt, fmtMoney, fmtPct, toInputDate } from "../lib/format";
import { useNow } from "../state/clock";
import { useDateRange } from "../state/dateRange";
import { useData } from "../state/indexes";
import { hrefFor, openPanel } from "../state/router";
import DateRangeControl from "../ui/DateRangeControl";
import { PageHeader } from "../ui/page";
import { Button, Card, CardHeader, Stat } from "../ui/primitives";

function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function Analytics() {
  const { data, ix } = useData();
  const now = useNow();
  const range = useDateRange();
  const w = useMemo(() => resolveRange(range, now), [range, now]);
  const labels = w.starts.map((s) => bucketLabel(s, w.bucket));

  const flow = useMemo(() => flowSeries(data.requests, w), [data.requests, w]);
  const timing = useMemo(() => timingSeries(data.requests, w), [data.requests, w]);
  const onTime = useMemo(() => completionRateSeries(data.requests, w), [data.requests, w]);
  const stats = useMemo(() => windowStats(data.requests, w), [data.requests, w]);
  const team = useMemo(() => employeeStats(data, ix, w, now), [data, ix, w, now]);

  const orders = useMemo(() => {
    const count = new Array(w.starts.length).fill(0);
    const revenue = new Array(w.starts.length).fill(0);
    for (const o of data.orders) {
      const b = bucketOf(o.createdAt, w);
      if (b >= 0) count[b]++;
      if (o.status === "completed" && o.completedAt) {
        const c = bucketOf(o.completedAt, w);
        if (c >= 0) revenue[c] += o.value;
      }
    }
    return { count, revenue };
  }, [data.orders, w]);

  const acquisition = useMemo(() => {
    const out = new Array(w.starts.length).fill(0);
    for (const c of data.customers) {
      const b = bucketOf(c.createdAt, w);
      if (b >= 0) out[b]++;
    }
    return out;
  }, [data.customers, w]);

  const inWindow = data.requests.filter((r) => inRange(r.createdAt, w.from, w.to));
  const byType = [...countBy(inWindow, (r) => r.type).entries()].sort((a, b) => b[1] - a[1]);
  const revenueTotal = orders.revenue.reduce((a, b) => a + b, 0);

  const exportCsv = () => {
    downloadCsv(`requests-${toInputDate(w.from)}_${toInputDate(w.to)}.csv`, [
      ["رقم الطلب", "العميل", "الخدمة", "الاتجاه", "القسم", "المسؤول", "الأولوية", "الحالة", "تاريخ الإنشاء", "أول استجابة (ساعة)", "تاريخ الإنجاز", "في الموعد", "التقييم"],
      ...inWindow.map((r) => {
        const done = completedAt(r);
        return [
          r.code,
          ix.customer.get(r.customerId)?.name ?? "",
          SERVICE[r.type].label,
          r.direction === "incoming" ? "واردة" : "صادرة",
          DEPARTMENT[r.department].label,
          r.assigneeId ? ix.employee.get(r.assigneeId)?.name ?? "" : "",
          PRIORITY[r.priority].label,
          REQUEST_STATUS[r.status].label,
          fmtDateTime(r.createdAt),
          r.firstResponseAt ? ((r.firstResponseAt - r.createdAt) / HOUR).toFixed(2) : "",
          done ? fmtDateTime(done) : "",
          done ? (done <= r.dueAt ? "نعم" : "لا") : "",
          r.rating ?? "",
        ];
      }),
    ]);
  };

  return (
    <div>
      <PageHeader
        title="التحليلات والتقارير"
        subtitle={`كل الرسوم أدناه تخص الفترة: ${w.label}. القيم محسوبة من السجلات المسجّلة لكل طلب.`}
        actions={
          <>
            <DateRangeControl label={w.label} />
            <Button variant="outline" icon="external" onClick={exportCsv} disabled={!inWindow.length}>
              تصدير CSV
            </Button>
          </>
        }
      />

      <Card className="mb-4 grid grid-cols-2 gap-5 p-5 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="طلبات جديدة" value={fmtInt(stats.created)} resetKey={w.label} />
        <Stat label="طلبات منجزة" value={fmtInt(stats.completed)} resetKey={w.label} />
        <Stat label="نسبة الإنجاز" value={Number.isFinite(stats.completionRate) ? fmtPct(stats.completionRate) : "—"} sub="من الطلبات المنشأة في الفترة" resetKey={w.label} />
        <Stat label="الإنجاز في الموعد" value={Number.isFinite(stats.onTimeRate) ? fmtPct(stats.onTimeRate) : "—"} resetKey={w.label} />
        <Stat label="متوسط أول استجابة" value={fmtHours(stats.avgResponse)} resetKey={w.label} />
        <Stat label="الإيرادات المحققة" value={fmtMoney(revenueTotal, true)} resetKey={w.label} />
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="الطلبات عبر الزمن" subtitle="المنشأة مقابل المنجزة" icon="analytics" />
          <div className="px-4 pb-4">
            <LineChart
              label="الطلبات المنشأة والمنجزة"
              labels={labels}
              format={fmtInt}
              series={[
                { key: "c", label: "منشأة", color: "var(--color-series-1)", values: flow.created },
                { key: "r", label: "منجزة", color: "var(--color-series-2)", values: flow.resolved },
              ]}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="الواردة مقابل الصادرة" subtitle="من العملاء مقابل مبادرات الفريق" icon="incoming" />
          <div className="px-4 pb-4">
            <LineChart
              label="الطلبات الواردة والصادرة"
              labels={labels}
              format={fmtInt}
              series={[
                { key: "in", label: "واردة", color: "var(--color-series-1)", values: flow.incoming },
                { key: "out", label: "صادرة", color: "var(--color-series-2)", values: flow.outgoing },
              ]}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="الطلبات الشرائية" subtitle="عدد الطلبات المنشأة" icon="orders" />
          <div className="px-4 pb-4">
            <ColumnChart label="عدد الطلبات الشرائية" seriesLabel="الطلبات" labels={labels} values={orders.count} format={fmtInt} />
          </div>
        </Card>
        <Card>
          <CardHeader title="الإيرادات المحققة" subtitle="قيمة الطلبات المكتملة (ر.س)" icon="money" />
          <div className="px-4 pb-4">
            <ColumnChart label="الإيرادات المحققة" seriesLabel="الإيرادات" labels={labels} values={orders.revenue} format={fmtCompact} color="var(--color-series-3)" />
          </div>
        </Card>
        <Card>
          <CardHeader title="متوسط زمن أول استجابة" subtitle="بالساعات، للطلبات المنشأة في كل فترة" icon="clock" />
          <div className="px-4 pb-4">
            <LineChart label="متوسط زمن أول استجابة" labels={labels} format={(v) => fmtHours(v * HOUR)} series={[{ key: "r", label: "أول استجابة", color: "var(--color-series-1)", values: timing.response.map((v) => v / HOUR) }]} />
          </div>
        </Card>
        <Card>
          <CardHeader title="متوسط زمن الإنجاز" subtitle="بالساعات، للطلبات المنجزة في كل فترة" icon="clock" />
          <div className="px-4 pb-4">
            <LineChart label="متوسط زمن الإنجاز" labels={labels} format={(v) => fmtHours(v * HOUR)} series={[{ key: "r", label: "زمن الإنجاز", color: "var(--color-series-2)", values: timing.resolution.map((v) => v / HOUR) }]} />
          </div>
        </Card>
        <Card>
          <CardHeader title="نسبة الإنجاز في الموعد" subtitle="من الطلبات المنجزة في كل فترة" icon="checkCircle" />
          <div className="px-4 pb-4">
            <LineChart label="نسبة الإنجاز في الموعد" labels={labels} format={(v) => fmtPct(v)} yMax={100} series={[{ key: "p", label: "في الموعد", color: "var(--color-series-3)", values: onTime }]} />
          </div>
        </Card>
        <Card>
          <CardHeader title="اكتساب العملاء" subtitle="عملاء جدد سُجّلوا في كل فترة" icon="customers" />
          <div className="px-4 pb-4">
            <ColumnChart label="العملاء الجدد" seriesLabel="عملاء جدد" labels={labels} values={acquisition} format={fmtInt} />
          </div>
        </Card>
        <Card>
          <CardHeader title="إنتاجية الموظفين" subtitle="الطلبات المنجزة في الفترة" icon="users" />
          <div className="px-5 pb-5">
            <HBarList
              items={[...team]
                .sort((a, b) => b.completed - a.completed)
                .slice(0, 10)
                .map((t) => ({ key: t.employee.id, label: t.employee.name, value: t.completed, onClick: () => openPanel({ kind: "employee", id: t.employee.id }) }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="الطلبات حسب الخدمة" subtitle="المنشأة في الفترة" icon="layers" />
          <div className="px-5 pb-5">
            <HBarList
              items={byType.map(([t, v]) => ({
                key: t,
                label: SERVICE[t as ServiceType].label,
                value: v,
                display: `${fmtInt(v)} · ${fmtPct((v / Math.max(1, inWindow.length)) * 100)}`,
                onClick: () => (window.location.hash = hrefFor("requests", { status: "all", type: t, created: "range" })),
              }))}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
