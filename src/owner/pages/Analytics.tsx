import { HBarList } from "../../charts/small";
import ColumnChart from "../../charts/ColumnChart";
import LineChart from "../../charts/LineChart";
import { fmtCompact, fmtDate, fmtInt, fmtMoney } from "../../lib/format";
import { useNow } from "../../state/clock";
import { PageHeader } from "../../ui/page";
import { Card, CardHeader, Segmented, Select, Skeleton, Stat } from "../../ui/primitives";
import { cx } from "../../ui/tone";
import { api } from "../api";
import { addDays, riyadhDate } from "../dates";
import { Freshness, Note, QueryError } from "../parts";
import { hrefTo, updateParams, useOwnerRoute } from "../router";
import { SERVICES, isServiceKey, serviceLabel } from "../services";
import type { Bucket, RevenueBucket, ServiceKey, TimeseriesBucket } from "../types";
import { useQuery } from "../useQuery";

// Range lives in the URL (from, to, bucket, service). Dates are business dates in Asia/Riyadh —
// the same timezone the API buckets by.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PRESETS = [7, 30, 90, 365] as const;
const BUCKETS: { value: Bucket; label: string }[] = [
  { value: "day", label: "يومي" },
  { value: "week", label: "أسبوعي" },
  { value: "month", label: "شهري" },
];
const monthFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { month: "short", year: "numeric" });


function bucketLabel(b: string) {
  if (DATE_RE.test(b)) {
    const [y, m, d] = b.split("-").map(Number);
    return fmtDate(new Date(y, m - 1, d).getTime());
  }
  if (/^\d{4}-\d{2}$/.test(b)) {
    const [y, m] = b.split("-").map(Number);
    return monthFmt.format(new Date(y, m - 1, 1));
  }
  return b;
}

function sumCreated(b: TimeseriesBucket) {
  return Object.values(b.services).reduce((n, s) => n + (s?.created ?? 0), 0);
}

/** Closed is summed only over services where "closed" means something; null if none of them do. */
function sumClosed(b: TimeseriesBucket) {
  const known = Object.values(b.services).filter((s) => s && s.closed !== null);
  return known.length ? known.reduce((n, s) => n + (s!.closed ?? 0), 0) : null;
}

function Requests({ from, to, bucket, service }: { from: string; to: string; bucket: Bucket; service?: ServiceKey }) {
  const query = { from, to, bucket, service };
  const rk = JSON.stringify(query);
  const q = useQuery(`ts:${rk}`, (force) => api.timeseries(query, force));
  const res = q.data ?? q.stale;

  if (q.error && !res) return <Card><QueryError error={q.error} onRetry={q.reload} what="بيانات الطلبات" /></Card>;
  if (!res) return <Skeleton className="h-[380px] rounded-[14px]" />;

  const labels = res.data.map((b) => bucketLabel(b.bucket));
  const created = res.data.map(sumCreated);
  const closedRaw = res.data.map(sumClosed);
  const hasClosed = closedRaw.some((v) => v !== null);
  const totalCreated = created.reduce((a, b) => a + b, 0);
  const totalClosed = closedRaw.reduce<number>((a, b) => a + (b ?? 0), 0);

  const perService = new Map<ServiceKey, { created: number; closed: number | null }>();
  for (const b of res.data)
    for (const [k, v] of Object.entries(b.services)) {
      if (!v || !isServiceKey(k)) continue;
      const cur = perService.get(k) ?? { created: 0, closed: v.closed === null ? null : 0 };
      perService.set(k, { created: cur.created + v.created, closed: cur.closed === null || v.closed === null ? cur.closed : cur.closed + v.closed });
    }
  const rows = [...perService.entries()].sort((a, b) => b[1].created - a[1].created);
  const noClosedFor = rows.filter(([, v]) => v.closed === null).map(([k]) => serviceLabel(k));

  return (
    <div className={cx("space-y-4 transition-opacity", q.loading && "opacity-60")} aria-busy={q.loading}>
      <Card className="p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="طلبات أُنشئت في الفترة" value={fmtInt(totalCreated)} resetKey={rk} />
          <Stat label="منها مغلقة الآن" value={hasClosed ? fmtInt(totalClosed) : "—"} sub={hasClosed ? "من الخدمات التي لها حالة إغلاق" : "لا توجد حالة إغلاق لهذه الخدمة"} resetKey={rk} />
          <Stat label="متوسط لكل فترة" value={fmtInt(totalCreated / Math.max(1, created.length))} sub={BUCKETS.find((b) => b.value === bucket)?.label} resetKey={rk} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader icon="analytics" title="الطلبات عبر الزمن" subtitle={service ? serviceLabel(service) : "كل الخدمات معًا"} action={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />} />
          <div className="px-5 pb-5">
            <LineChart
              label="الطلبات المنشأة والمغلقة"
              labels={labels}
              format={fmtInt}
              series={[
                { key: "created", label: "أُنشئت", color: "var(--color-series-1)", values: created },
                ...(hasClosed ? [{ key: "closed", label: "منها مغلقة الآن", color: "var(--color-series-3)", values: closedRaw.map((v) => v ?? NaN) }] : []),
              ]}
            />
          </div>
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader icon="layers" title="حسب الخدمة" subtitle="الطلبات المنشأة في الفترة" />
          <div className="px-5 pb-5">
            <HBarList
              items={rows.map(([k, v]) => ({
                key: k,
                label: serviceLabel(k),
                value: v.created,
                display: fmtInt(v.created),
                sub: v.closed === null ? "لا يوجد مفهوم إغلاق" : `${fmtInt(v.closed)} مغلقة الآن`,
                onClick: () => (window.location.hash = hrefTo("tickets", { service: k, from, to })),
              }))}
            />
          </div>
        </Card>
      </div>

      <Note>
        «مغلقة الآن» تعني أن حالة الطلب <b className="text-ink">اليوم</b> نهائية، وليست حالته في تلك الفترة — الطلب الذي أُغلق أمس يُحسب ضمن فترة إنشائه.
        {noClosedFor.length > 0 && <> لا يوجد مفهوم إغلاق في: {noClosedFor.join("، ")}، لذلك لا تدخل في رقم «مغلقة».</>}
      </Note>
    </div>
  );
}

function Revenue({ from, to, bucket }: { from: string; to: string; bucket: Bucket }) {
  const query = { from, to, bucket };
  const rk = JSON.stringify(query);
  const q = useQuery(`rev:${rk}`, (force) => api.revenue(query, force));
  const res = q.data ?? q.stale;

  if (q.error && !res) return <Card><QueryError error={q.error} onRetry={q.reload} what="الإيرادات" /></Card>;
  if (!res) return <Skeleton className="h-[360px] rounded-[14px]" />;
  const data = res.data;
  const sum = (f: (b: RevenueBucket) => number) => data.reduce((n, b) => n + f(b), 0);
  const net = sum((b) => b.net_sar);
  const count = sum((b) => b.count);

  return (
    <Card className={cx("transition-opacity", q.loading && "opacity-60")}>
      <CardHeader icon="money" title="إيرادات المتجر الإلكتروني" subtitle="مدفوعات Moyasar المكتملة فقط · بتاريخ اكتمال الدفع" action={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />} />
      <div className="grid grid-cols-2 gap-4 px-5 pb-4 sm:grid-cols-4">
        <Stat label="المدفوع" value={fmtMoney(sum((b) => b.amount_sar))} resetKey={rk} />
        <Stat label="المسترد" value={fmtMoney(sum((b) => b.refunded_sar))} sub="كما أبلغ عنه Moyasar" resetKey={rk} />
        <Stat label="الصافي" value={fmtMoney(net)} tone="good" resetKey={rk} />
        <Stat label="عمليات الدفع" value={fmtInt(count)} sub={count ? `متوسط ${fmtMoney(net / count)}` : undefined} resetKey={rk} />
      </div>
      <div className="px-5 pb-5">
        <ColumnChart label="صافي الإيرادات (ر.س)" seriesLabel="الصافي (ر.س)" labels={res.data.map((b) => bucketLabel(b.bucket))} values={res.data.map((b) => b.net_sar)} format={fmtCompact} color="var(--color-series-3)" />
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">من سجل Moyasar فقط — لا يدخل فيه أي من الخدمات الثماني. تُحسب الدفعة في يوم اكتمالها، لا يوم بدء محاولة الدفع.</p>
      </div>
    </Card>
  );
}

export default function Analytics() {
  const { params } = useOwnerRoute();
  const today = riyadhDate(useNow());
  const to = DATE_RE.test(params.get("to") ?? "") ? params.get("to")! : today;
  const from = DATE_RE.test(params.get("from") ?? "") ? params.get("from")! : addDays(to, -29);
  const bucket = (BUCKETS.some((b) => b.value === params.get("bucket")) ? params.get("bucket") : "day") as Bucket;
  const service = isServiceKey(params.get("service")) ? (params.get("service") as ServiceKey) : undefined;
  const preset = to === today ? PRESETS.find((n) => addDays(today, -(n - 1)) === from) : undefined;
  const badRange = from > to;

  const choosePreset = (n: number) => updateParams({ from: addDays(today, -(n - 1)), to: null, bucket: n >= 365 ? "month" : n >= 90 ? "week" : bucket === "month" ? null : bucket });

  return (
    <div>
      <PageHeader title="التحليلات والإيرادات" subtitle="حجم الطلبات عبر الزمن، وإيرادات المتجر — بتوقيت الرياض." />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="الفترة"
            value={preset ? String(preset) : "custom"}
            onChange={(v) => v !== "custom" && choosePreset(Number(v))}
            options={[
              ...PRESETS.map((n) => ({ value: String(n), label: n === 365 ? "سنة" : `${n} يومًا` })),
              ...(preset ? [] : [{ value: "custom", label: "مخصص" }]),
            ]}
          />
          <label className="flex items-center gap-1.5 text-[12px] text-ink-3">
            من
            <input type="date" dir="ltr" value={from} max={to} onChange={(e) => e.target.value && updateParams({ from: e.target.value })} className="rounded-lg border border-line bg-white/[0.02] px-2.5 py-1.5 text-[12.5px] text-ink [color-scheme:dark] focus:border-accent/40 focus:outline-none" />
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-ink-3">
            إلى
            <input type="date" dir="ltr" value={to} min={from} max={today} onChange={(e) => updateParams({ to: e.target.value === today ? null : e.target.value || null })} className="rounded-lg border border-line bg-white/[0.02] px-2.5 py-1.5 text-[12.5px] text-ink [color-scheme:dark] focus:border-accent/40 focus:outline-none" />
          </label>
          <Segmented size="sm" label="التجميع" value={bucket} onChange={(v) => updateParams({ bucket: v === "day" ? null : v })} options={BUCKETS} />
          <Select label="الخدمة" value={service ?? "all"} onChange={(v) => updateParams({ service: v === "all" ? null : v })} options={[{ value: "all", label: "كل الخدمات" }, ...SERVICES.map((s) => ({ value: s.key, label: s.label }))]} />
        </div>
      </Card>

      {badRange ? (
        <Note tone="warning">تاريخ البداية بعد تاريخ النهاية — عدّل الفترة.</Note>
      ) : (
        <div className="space-y-6">
          <Requests from={from} to={to} bucket={bucket} service={service} />
          <Revenue from={from} to={to} bucket={bucket} />
        </div>
      )}
    </div>
  );
}
