import { useMemo } from "react";
import { needsAttention } from "../analytics/attention";
import { employeeStats } from "../analytics/people";
import { computeKpis, countBy, flowSeries, pipeline, windowStats } from "../analytics/requests";
import { bucketLabel, inRange, resolveRange } from "../analytics/time";
import LineChart from "../charts/LineChart";
import { HBarList, Ring } from "../charts/small";
import { ALERT_PRIORITY, PRESENCE, REQUEST_STATUS, SERVICE } from "../domain/labels";
import type { ServiceType } from "../domain/types";
import { fmtDuration, fmtHours, fmtInt, fmtLongDate, fmtPct, fmtRelative } from "../lib/format";
import { useNow } from "../state/clock";
import { useDateRange } from "../state/dateRange";
import { useData } from "../state/indexes";
import { useDashboard } from "../state/store";
import { hrefFor, openPanel } from "../state/router";
import DateRangeControl from "../ui/DateRangeControl";
import Icon from "../ui/Icon";
import { PriorityTag } from "../ui/badges";
import { KpiCard, PageHeader } from "../ui/page";
import { Avatar, Card, CardHeader, DemoTag, Dot, EmptyState } from "../ui/primitives";
import { TeamAvatars } from "../ui/TeamAvatars";
import { TONE_TEXT, cx } from "../ui/tone";

const KPI_LINK: Record<string, string> = {
  total: hrefFor("requests", { status: "all", created: "range" }),
  today: hrefFor("requests", { status: "all", created: "today" }),
  active: hrefFor("requests", { status: "active" }),
  completed: hrefFor("requests", { status: "done" }),
  pending: hrefFor("requests", { status: "pending" }),
  overdue: hrefFor("requests", { status: "overdue" }),
  orders: hrefFor("orders"),
  revenue: hrefFor("analytics"),
  employees: hrefFor("live"),
  csat: hrefFor("employees"),
};

function greeting(now: number) {
  const h = new Date(now).getHours();
  return h < 12 ? "صباح الخير" : "مساء الخير";
}

export default function Overview() {
  const { data, ix } = useData();
  const origin = useDashboard((s) => s.origin);
  const now = useNow();
  const range = useDateRange();
  const w = useMemo(() => resolveRange(range, now), [range, now]);

  const online = data.presence.filter((p) => p.status !== "offline");
  const kpis = useMemo(() => computeKpis(data, w, now, online.length), [data, w, now, online.length]);
  const flow = useMemo(() => flowSeries(data.requests, w), [data.requests, w]);
  const attention = useMemo(() => needsAttention(data, ix, now), [data, ix, now]);
  const stages = useMemo(() => pipeline(data.requests, now), [data.requests, now]);
  const stats = useMemo(() => windowStats(data.requests, w), [data.requests, w]);
  const team = useMemo(() => employeeStats(data, ix, w, now), [data, ix, w, now]);

  const byKey = Object.fromEntries(kpis.map((k) => [k.key, k]));
  const busy = data.presence.filter((p) => p.status === "busy" && p.current).sort((a, b) => a.current!.startedAt - b.current!.startedAt);
  const bottleneck = stages.find((s) => s.bottleneck);
  const critical = attention.filter((a) => a.severity === "critical").length;

  const types = useMemo(() => {
    const m = countBy(data.requests.filter((r) => inRange(r.createdAt, w.from, w.to)), (r) => r.type);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.requests, w]);

  const top = [...team].sort((a, b) => b.completed - a.completed).slice(0, 5);
  const overloaded = team.filter((t) => t.loadIndex > 1.6);

  const labels = w.starts.map((s) => bucketLabel(s, w.bucket));

  return (
    <div>
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2 text-[12px] text-ink-3">
            <span>{fmtLongDate(now)}</span>
            {origin === "mock" && <DemoTag />}
          </div>
        }
        title={`${greeting(now)}، هذا وضع الشركة الآن`}
        subtitle={
          <>
            اليوم: <b className="num font-semibold text-ink">{byKey.today?.value ?? 0}</b> طلب جديد،{" "}
            <b className="num font-semibold text-ink">{byKey.active?.value ?? 0}</b> قيد العمل،{" "}
            <b className={cx("num font-semibold", (byKey.overdue?.value ?? 0) > 0 ? "text-critical" : "text-ink")}>{byKey.overdue?.value ?? 0}</b> متأخر.{" "}
            <b className="num font-semibold text-ink">{online.length}</b> من {data.employees.length} موظفين متصلون
            {bottleneck && (
              <>
                ، والاختناق الأكبر في مرحلة <b className="font-semibold text-warning">«{REQUEST_STATUS[bottleneck.status].label}»</b>
              </>
            )}
            .
          </>
        }
        actions={<DateRangeControl label={w.label} />}
      />

      {/* Q1–Q3: performance, active, delayed */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <KpiCard key={k.key} kpi={k} href={KPI_LINK[k.key]} compareLabel={w.compareLabel} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Q8: what needs my attention */}
        <Card className="order-first xl:order-none xl:col-span-4">
          <CardHeader
            icon="alert"
            title="يحتاج انتباهك الآن"
            subtitle={attention.length ? `${attention.length} عنصر · ${critical} حرج` : "مستخرج من السجلات الحالية"}
            action={
              <a href={hrefFor("requests", { status: "overdue" })} className="text-[11.5px] text-ink-3 hover:text-accent">
                كل المتأخرات
              </a>
            }
          />
          {attention.length === 0 ? (
            <EmptyState icon="checkCircle" title="لا شيء يتطلب تدخلك" hint="لا توجد طلبات متأخرة أو اعتمادات معلّقة." />
          ) : (
            <ul className="max-h-[372px] overflow-y-auto px-2 pb-2">
              {attention.slice(0, 12).map((a) => (
                <li key={a.id}>
                  <button onClick={() => openPanel(a.target)} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-right transition-colors hover:bg-white/[0.03]">
                    <span className={cx("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md", a.severity === "critical" ? "bg-critical/12 text-critical" : a.severity === "high" ? "bg-serious/12 text-serious" : "bg-warning/10 text-warning")}>
                      <Icon name={a.target.kind === "order" ? "checkCircle" : "clock"} size={12} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-ink">{a.title}</span>
                      <span className="block truncate text-[11.5px] text-ink-3">{a.detail}</span>
                    </span>
                    <span className={cx("shrink-0 text-[10.5px] font-medium", TONE_TEXT[ALERT_PRIORITY[a.severity].tone])}>{ALERT_PRIORITY[a.severity].label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-8">
          <CardHeader icon="analytics" title="حركة الطلبات" subtitle={`الواردة من العملاء مقابل الصادرة من الفريق — ${w.label}`} />
          <div className="px-4 pb-4">
            <LineChart
              label="الطلبات الواردة والصادرة عبر الزمن"
              labels={labels}
              format={fmtInt}
              height={300}
              series={[
                { key: "in", label: "واردة", color: "var(--color-series-1)", values: flow.incoming },
                { key: "out", label: "صادرة", color: "var(--color-series-2)", values: flow.outgoing },
              ]}
            />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Q4–Q6: who is online, who works with whom, what is being done */}
        <Card className="xl:col-span-7">
          <CardHeader
            icon="live"
            title="من يعمل مع من الآن"
            subtitle={
              <span className="flex items-center gap-2">
                {busy.length} موظف منشغل مع عملاء · {online.length} متصل
                {origin === "mock" && <span className="text-warning/80">(حضور محاكاة)</span>}
              </span>
            }
            action={
              <a href={hrefFor("live")} className="text-[11.5px] text-ink-3 hover:text-accent">
                العمليات المباشرة
              </a>
            }
          />
          {online.length > 0 && (
            <div className="mx-5 mb-2 flex items-center justify-between gap-3 rounded-lg border border-line bg-white/[0.015] px-3 py-2">
              <span className="text-[11.5px] text-ink-3">المتصلون الآن</span>
              <TeamAvatars people={online.flatMap((p) => ix.employee.get(p.employeeId) ?? [])} presence={ix.presence} max={8} size={26} />
            </div>
          )}
          {busy.length === 0 ? (
            <EmptyState icon="users" title="لا يوجد موظف يعمل على طلب حاليًا" />
          ) : (
            <ul className="divide-y divide-line px-2 pb-2">
              {busy.slice(0, 7).map((p) => {
                const e = ix.employee.get(p.employeeId)!;
                const c = ix.customer.get(p.current!.customerId);
                const r = ix.request.get(p.current!.requestId);
                return (
                  <li key={p.employeeId} className="flex items-center gap-3 px-3 py-2.5">
                    <button onClick={() => openPanel({ kind: "employee", id: e.id })} className="flex w-[34%] min-w-0 shrink-0 items-center gap-2.5 text-right">
                      <Avatar name={e.name} id={e.id} size={30} status={PRESENCE[p.status].tone} />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] text-ink hover:text-accent">{e.name}</span>
                        <span className="block truncate text-[11px] text-ink-3">{e.title}</span>
                      </span>
                    </button>
                    <Icon name="chevron" size={13} className="shrink-0 text-ink-3" />
                    <button onClick={() => r && openPanel({ kind: "request", id: r.id })} className="min-w-0 flex-1 text-right">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[12.5px] text-ink">{c?.name}</span>
                        <span className="num text-[10.5px] text-ink-3">{r?.code}</span>
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-3">{p.current!.action}</span>
                    </button>
                    <span className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
                      <span className="num text-[11.5px] text-ink-2">{fmtDuration(now - p.current!.startedAt)}</span>
                      {r && <PriorityTag priority={r.priority} />}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Q7: bottlenecks */}
        <Card className="xl:col-span-5">
          <CardHeader icon="layers" title="مسار العمل والاختناقات" subtitle="الطلبات المفتوحة حسب المرحلة ومتوسط بقائها فيها" />
          <ul className="space-y-1 px-3 pb-4">
            {stages.map((s) => {
              const max = Math.max(...stages.map((x) => x.count), 1);
              return (
                <li key={s.status}>
                  <a
                    href={hrefFor("requests", { status: s.status })}
                    className={cx("block rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.03]", s.bottleneck && "bg-warning/[0.05] ring-1 ring-warning/25")}
                  >
                    <div className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="flex items-center gap-2 text-ink-2">
                        {REQUEST_STATUS[s.status].label}
                        {s.bottleneck && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-warning">
                            <Icon name="alert" size={11} /> اختناق
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-[11px] text-ink-3">{s.count ? `≈ ${fmtDuration(s.avgDwell)}` : "—"}</span>
                        <span className="num w-8 text-left font-semibold text-ink">{s.count}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(s.count / max) * 100}%`, background: s.bottleneck ? "var(--color-warning)" : "var(--color-series-1)" }} />
                    </div>
                    {s.overdue > 0 && <p className="mt-1 text-[10.5px] text-critical">{s.overdue} متأخر في هذه المرحلة</p>}
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader icon="layers" title="الطلبات حسب الخدمة" subtitle={w.label} />
          <div className="px-5 pb-5">
            {types.length ? (
              <HBarList
                items={types.map(([t, v]) => ({
                  key: t,
                  label: SERVICE[t as ServiceType].label,
                  value: v,
                  display: fmtInt(v),
                  onClick: () => (window.location.hash = hrefFor("requests", { status: "all", type: t, created: "range" })),
                }))}
              />
            ) : (
              <EmptyState title="لا توجد طلبات في هذه الفترة" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader icon="clock" title="سرعة الخدمة" subtitle={w.label} />
          <div className="flex items-center gap-5 px-5 pb-5">
            <Ring value={stats.onTimeRate} color="var(--color-good)">
              <span className="num text-[18px] font-semibold">{Number.isFinite(stats.onTimeRate) ? fmtPct(stats.onTimeRate) : "—"}</span>
              <span className="text-[10px] text-ink-3">في الموعد</span>
            </Ring>
            <dl className="grid flex-1 grid-cols-1 gap-3 text-[12px]">
              <div className="flex items-baseline justify-between">
                <dt className="text-ink-3">متوسط أول استجابة</dt>
                <dd className="num font-semibold text-ink">{fmtHours(stats.avgResponse)}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-ink-3">متوسط زمن الإنجاز</dt>
                <dd className="num font-semibold text-ink">{fmtHours(stats.avgResolution)}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-ink-3">نسبة الإنجاز</dt>
                <dd className="num font-semibold text-ink">{Number.isFinite(stats.completionRate) ? fmtPct(stats.completionRate) : "—"}</dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card>
          <CardHeader
            icon="users"
            title="الأعلى إنجازًا"
            subtitle={overloaded.length ? `${overloaded.length} موظف بعبء عمل مرتفع` : w.label}
            action={
              <a href={hrefFor("employees")} className="text-[11.5px] text-ink-3 hover:text-accent">
                أداء الفريق
              </a>
            }
          />
          <ul className="space-y-0.5 px-2 pb-3">
            {top.map((t, i) => {
              const p = ix.presence.get(t.employee.id);
              return (
                <li key={t.employee.id}>
                  <button onClick={() => openPanel({ kind: "employee", id: t.employee.id })} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-right hover:bg-white/[0.03]">
                    <span className="num w-4 text-[11px] text-ink-3">{i + 1}</span>
                    <Avatar name={t.employee.name} id={t.employee.id} size={26} status={p ? PRESENCE[p.status].tone : undefined} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{t.employee.name}</span>
                    <span className="num text-[12.5px] font-semibold text-ink">{t.completed}</span>
                    {t.overdue > 0 && (
                      <span className="flex items-center gap-1 text-[10.5px] text-critical">
                        <Dot tone="critical" /> {t.overdue}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <RecentFeed />
    </div>
  );
}

function RecentFeed() {
  const { data, ix } = useData();
  const now = useNow();
  const recent = useDashboard((s) => s.recent);
  const events = data.activity.slice(-8).reverse();
  return (
    <Card className="mt-4">
      <CardHeader icon="bolt" title="آخر ما حدث" subtitle="يتحدّث تلقائيًا مع كل حدث جديد" />
      <ul className="grid grid-cols-1 gap-x-6 px-5 pb-4 md:grid-cols-2">
        {events.map((e) => {
          const who = e.actor.type === "employee" ? ix.employee.get(e.actor.id!)?.name : e.actor.type === "customer" ? ix.customer.get(e.customerId)?.name : "النظام";
          return (
            <li key={e.id} className={cx("flex items-center gap-3 border-b border-line/60 py-2.5", recent.has(e.subject.id) && "flash")}>
              <span className="num w-14 shrink-0 text-[11px] text-ink-3">{fmtRelative(e.at, now)}</span>
              <button onClick={() => openPanel(e.subject)} className="min-w-0 flex-1 truncate text-right text-[12.5px] text-ink-2 hover:text-ink">
                {e.description}
              </button>
              <span className="hidden shrink-0 text-[11px] text-ink-3 sm:block">{who}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

