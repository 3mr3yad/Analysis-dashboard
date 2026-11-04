import { HBarList } from "../../charts/small";
import { fmtDateTime, fmtInt, fmtMoney } from "../../lib/format";
import { useNow } from "../../state/clock";
import { Changed } from "../../ui/Changed";
import { CountUp } from "../../ui/CountUp";
import Icon from "../../ui/Icon";
import { PageHeader } from "../../ui/page";
import { Card, CardHeader, Skeleton } from "../../ui/primitives";
import { cx } from "../../ui/tone";
import { api } from "../api";
import { addDays, riyadhDate } from "../dates";
import { Freshness, Note, QueryError, ServiceTag, When } from "../parts";
import { hrefTo } from "../router";
import { INTERNAL_SERVICES, SERVICE, serviceLabel } from "../services";
import type { Summary } from "../types";
import { useQuery } from "../useQuery";

const REFRESH_MS = 60_000;

function Big({ label, value, hint, icon }: { label: string; value: number; hint?: string; icon: Parameters<typeof Icon>[0]["name"] }) {
  return (
    <Changed value={value}>
      {(cls) => (
        <div className={cx("card p-5", cls)}>
          <p className="flex items-center gap-2 text-[13.5px] text-ink-3">
            <span className="flex size-6 items-center justify-center rounded-md border border-line bg-white/[0.02]">
              <Icon name={icon} size={13} />
            </span>
            {label}
          </p>
          <p className="num holo-num mt-3 text-[33px] leading-none font-semibold tracking-tight" style={{ textAlign: "right" }}>
            <CountUp value={value} />
          </p>
          {hint && <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{hint}</p>}
        </div>
      )}
    </Changed>
  );
}

function ServiceCard({ k, s }: { k: keyof typeof SERVICE; s: Summary["services"][keyof Summary["services"]] }) {
  const meta = SERVICE[k];
  return (
    <Changed value={s ? `${s.total}|${s.today}` : null}>
      {(cls) => (
        <a href={hrefTo("tickets", { service: k })} className={cx("card group flex flex-col justify-between p-4 transition-colors hover:border-line-strong", cls)}>
          <div className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-[14px] text-ink-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line bg-white/[0.02] text-ink-3 group-hover:text-accent">
                <Icon name={meta.icon} size={14} />
              </span>
              <span className="line-clamp-2 leading-snug">{serviceLabel(k, s?.label)}</span>
            </span>
            <span
              className={cx("shrink-0 rounded px-1.5 py-0.5 text-[11.5px]", meta.trail ? "bg-good/10 text-good" : "bg-white/[0.04] text-ink-3")}
              title={meta.trail ? "تسجّل هذه الخدمة من قام بكل إجراء ومتى" : "هذه الخدمة تحفظ الحالة الحالية فقط، دون سجل لمن غيّرها"}
            >
              {meta.trail ? "سجل نشاط" : "بدون سجل"}
            </span>
          </div>
          {s ? (
            <div className="mt-4 flex items-end justify-between gap-2">
              <div>
                <p className="num holo-num text-[25px] leading-none font-semibold" style={{ textAlign: "right" }}>
                  <CountUp value={s.total} />
                </p>
                <p className="mt-1.5 text-[12.5px] text-ink-3">إجمالي</p>
              </div>
              <div className="text-left">
                <p className={cx("num text-[17.5px] leading-none font-semibold", s.today > 0 ? "text-accent" : "text-ink-3")}>{s.today > 0 ? `+${fmtInt(s.today)}` : "0"}</p>
                <p className="mt-1.5 text-[12.5px] text-ink-3">اليوم</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[13px] text-ink-3">غير موجودة في استجابة الخادم</p>
          )}
        </a>
      )}
    </Changed>
  );
}

/** Net settled store revenue over the last 30 Riyadh days. */
function Revenue30() {
  const to = riyadhDate(useNow());
  const range = { from: addDays(to, -29), to };
  const q = useQuery(`rev30:${to}`, (force) => api.revenue(range, force), REFRESH_MS * 5);
  if (!q.data) return null;
  const net = q.data.data.reduce((n, b) => n + b.net_sar, 0);
  return (
    <Changed value={net}>
      {(cls) => (
        <a href={hrefTo("analytics")} className={cx("mt-2 flex items-center justify-between rounded-xl border border-line px-4 py-3 hover:border-line-strong", cls)}>
          <span className="text-[13px] text-ink-3">صافي الإيرادات · آخر 30 يومًا</span>
          <CountUp value={net} format={fmtMoney} className="num text-[16.5px] font-semibold text-good" />
        </a>
      )}
    </Changed>
  );
}

function RecentActivity() {
  const q = useQuery("activity-preview", (force) => api.activity({ per_page: 6, page: 1 }, force), REFRESH_MS);
  const items = q.data?.data ?? [];
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon="live"
        title="آخر الإجراءات المسجّلة"
        subtitle="من قام بماذا ومتى — من الخدمات التي تسجّل ذلك فقط"
        action={
          <a href={hrefTo("activity")} className="text-[13px] text-ink-3 hover:text-accent">
            السجل الكامل
          </a>
        }
      />
      <div className="flex-1 px-5 pb-5">
        {q.error && !q.data ? (
          <QueryError error={q.error} onRetry={q.reload} what="سجل النشاط" />
        ) : q.loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-ink-3">لا توجد إجراءات مسجّلة بعد.</p>
        ) : (
          <ul className="space-y-3.5">
            {items.map((a, i) => (
              <li key={`${a.service}-${a.subject_id}-${a.at}-${i}`} className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent/70" />
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="text-start text-[14px] leading-relaxed text-ink">{a.description}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
                    <ServiceTag service={a.service} />
                    <When iso={a.at} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export default function Overview() {
  const q = useQuery("summary", (force) => api.summary(force), REFRESH_MS);
  const s = q.data;

  const internal = INTERNAL_SERVICES.map((m) => ({ meta: m, data: s?.services[m.key] }));
  const internalTotal = internal.reduce((n, x) => n + (x.data?.total ?? 0), 0);
  const internalToday = internal.reduce((n, x) => n + (x.data?.today ?? 0), 0);
  const payments = s?.services.payments;

  return (
    <div>
      <PageHeader
        title="النظرة العامة"
        subtitle={s ? `أرقام الشركة كما يعيدها الخادم · ${fmtDateTime(Date.parse(s.generated_at))}` : "أرقام الشركة عبر كل الخدمات"}
        actions={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />}
      />

      {q.error && !s ? (
        <Card>
          <QueryError error={q.error} onRetry={q.reload} what="ملخص الشركة" />
        </Card>
      ) : !s ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[132px] rounded-[14px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Big icon="customers" label="العملاء (بدون تكرار)" value={s.distinct_customers} hint="تقريبي: تُوحَّد أرقام الجوال بآخر 9 أرقام قبل العدّ." />
            <Big icon="requests" label="إجمالي طلبات الخدمات الداخلية" value={internalTotal} hint="مجموع الخدمات الثماني على موقع وافي، دون مدفوعات المتجر." />
            <Big icon="sparkle" label="طلبات اليوم" value={internalToday} hint="الطلبات المنشأة اليوم في الخدمات الثماني." />
          </div>

          <h2 className="mt-8 mb-3 flex items-center gap-2 text-[15.5px] font-semibold text-ink">
            الخدمات الداخلية <span className="text-[13.5px] font-normal text-ink-3">· طلبات العملاء على موقع وافي</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {internal.map(({ meta, data }) => (
              <ServiceCard key={meta.key} k={meta.key} s={data} />
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-4">
              <CardHeader icon="money" title="مدفوعات المتجر الإلكتروني" subtitle="المتجر المنفصل · عبر Moyasar" />
              <div className="px-5 pb-5">
                {payments ? (
                  <Changed value={`${payments.total}|${payments.today}`}>
                    {(cls) => (
                      <a href={hrefTo("tickets", { service: "payments" })} className={cx("block rounded-xl border border-line bg-white/[0.015] p-4 hover:border-line-strong", cls)}>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="num holo-num text-[29px] leading-none font-semibold">
                            <CountUp value={payments.total} />
                          </p>
                            <p className="mt-1.5 text-[12.5px] text-ink-3">عملية دفع مسجّلة</p>
                          </div>
                          <div className="text-left">
                            <p className={cx("num text-[17.5px] font-semibold", payments.today ? "text-accent" : "text-ink-3")}>{payments.today ? `+${fmtInt(payments.today)}` : "0"}</p>
                            <p className="mt-1 text-[12.5px] text-ink-3">اليوم</p>
                          </div>
                        </div>
                      </a>
                    )}
                  </Changed>
                ) : (
                  <p className="rounded-xl border border-dashed border-line p-4 text-[13.5px] text-ink-3">لا تظهر المدفوعات في استجابة الخادم الحالية.</p>
                )}
                <Revenue30 />
                <ul className="mt-4 space-y-2 text-[13px] leading-relaxed text-ink-3">
                  <li>• سجل مدفوعات المتجر المنفصل، وليس طلبات خدمة على موقع وافي.</li>
                  <li>• لا شاشة إدارة ولا موظف مسؤول؛ تغييرات الحالة تُسجَّل تلقائيًا من Moyasar.</li>
                  <li>• الدفعة لا تُنسب لعميل إلا إذا مرّر المتجر اسمه ورقمه.</li>
                </ul>
              </div>
            </Card>

            <Card className="xl:col-span-4">
              <CardHeader icon="analytics" title="حجم كل خدمة" subtitle="إجمالي الطلبات · الخدمات الداخلية" />
              <div className="px-5 pb-5">
                <HBarList
                  items={[...internal]
                    .filter((x) => x.data)
                    .sort((a, b) => b.data!.total - a.data!.total)
                    .map((x) => ({
                      key: x.meta.key,
                      label: serviceLabel(x.meta.key, x.data!.label),
                      value: x.data!.total,
                      display: fmtInt(x.data!.total),
                      sub: x.data!.today ? `${fmtInt(x.data!.today)} اليوم` : undefined,
                      onClick: () => (window.location.hash = hrefTo("tickets", { service: x.meta.key })),
                    }))}
                />
              </div>
            </Card>

            <div className="xl:col-span-4">
              <RecentActivity />
            </div>
          </div>

          <div className="mt-4">
            <Note icon="alert">
              كل الخدمات تسجّل <b className="text-ink">من قام بالإجراء ومتى</b> عدا الضمان، لكن السجل يبدأ من تاريخ تفعيل التسجيل لكل خدمة — الطلبات الأقدم بلا سجل. ما لا تسجّله الخدمة يظهر «غير متتبَّع» بدل تخمينه.
            </Note>
          </div>
        </>
      )}
    </div>
  );
}
