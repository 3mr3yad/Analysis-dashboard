import { useEffect, useState, type FormEvent } from "react";
import { fmtDateTime, fmtInt, fmtMoney } from "../../lib/format";
import Icon from "../../ui/Icon";
import { PageHeader } from "../../ui/page";
import { Card, CardHeader, EmptyState, SearchInput, Skeleton } from "../../ui/primitives";
import { cx } from "../../ui/tone";
import { api } from "../api";
import { AdminLink, Freshness, NotTracked, Pager, QueryError, ServiceTag, StatusPill, When } from "../parts";
import { hrefTo, updateParams, useOwnerRoute } from "../router";
import { serviceLabel } from "../services";
import TicketDrawer from "../TicketDrawer";
import type { CustomerRow, Ticket } from "../types";
import { useQuery } from "../useQuery";
import { useSelection } from "../useSelection";

/** Accepts the formats the API documents (05…, +9665…, 9665…, 5…); strips spaces, dashes and Arabic digits. */
function normalizePhone(raw: string) {
  const western = raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const cleaned = western.replace(/[\s\-().]/g, "");
  return /^\+?\d{8,15}$/.test(cleaned) ? cleaned : null;
}

function Lookup({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const phone = normalizePhone(value);
    if (!phone) {
      setError("أدخل رقم جوال صحيح، مثل 05xxxxxxxx أو ‎+9665xxxxxxxx");
      return;
    }
    setError(null);
    updateParams({ phone }, true);
  };
  return (
    <form onSubmit={submit} className="card mb-5 p-4" role="search">
      <label htmlFor="phone" className="mb-2 block text-[14px] text-ink-2">
        رقم جوال العميل
      </label>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Icon name="phone" size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-3" />
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="05xxxxxxxx"
            className="w-full rounded-lg border border-line bg-white/[0.03] py-2.5 pr-9 pl-3 text-left text-[15.5px] text-ink placeholder:text-ink-3 focus:border-accent/50 focus:outline-none"
            aria-invalid={!!error}
            aria-describedby="phone-hint"
          />
        </div>
        <button type="submit" className="rounded-lg bg-accent px-5 py-2.5 text-[14.5px] font-semibold text-[#0b1020] hover:bg-accent-strong">
          بحث
        </button>
      </div>
      <p id="phone-hint" className={error ? "mt-2 text-[13.5px] text-critical" : "mt-2 text-[13px] text-ink-3"}>
        {error ?? "يقبل كل الصيغ المستخدمة في الموقع: 05… أو ‎+9665… أو 9665… أو 5…"}
      </p>
    </form>
  );
}

function History({ phone }: { phone: string }) {
  const q = useQuery(`customer:${phone}`, (force) => api.customer(phone, force));
  const [open, setOpen, close] = useSelection<Ticket>();

  if (q.error && !q.data) return <Card><QueryError error={q.error} onRetry={q.reload} what="سجل العميل" /></Card>;
  if (!q.data)
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );

  const tickets = [...q.data.tickets].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  if (!tickets.length)
    return (
      <Card>
        <EmptyState icon="customers" title="لا توجد طلبات لهذا الرقم" hint="لم يقدّم هذا الرقم أي طلب في أي خدمة. هذه نتيجة صحيحة وليست خطأ." />
      </Card>
    );

  const byService = new Map<string, { label: string; n: number }>();
  for (const t of tickets) byService.set(t.service, { label: serviceLabel(t.service, t.service_label), n: (byService.get(t.service)?.n ?? 0) + 1 });
  const name = tickets.find((t) => t.customer_name)?.customer_name;

  return (
    <>
      <Card className="mb-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[19.5px] font-semibold text-ink">{name ?? <NotTracked>بدون اسم مسجّل</NotTracked>}</p>
            <p dir="ltr" className="num mt-1 text-right text-[14.5px] text-ink-2">
              {q.data.phone}
            </p>
          </div>
          <div className="flex gap-8">
            <PaidTotal phone={phone} />
            <div className="text-left">
              <p className="num text-[27px] leading-none font-semibold text-ink">{fmtInt(q.data.total_tickets)}</p>
              <p className="mt-1 text-[13px] text-ink-3">طلب عبر كل الخدمات</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {[...byService.entries()].map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white/[0.02] px-2 py-1 text-[13px] text-ink-2">
              {v.label} <span className="num text-ink">{v.n}</span>
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader icon="clock" title="السجل الكامل" subtitle="الأحدث أولًا · اضغط أي طلب للتفاصيل" action={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />} />
        <ol className="relative px-5 pb-5">
          {tickets.map((t, i) => (
            <li key={`${t.service}-${t.id}`} className="relative flex gap-4 pb-4 last:pb-0">
              <span className="relative flex w-3 shrink-0 justify-center">
                <span className="mt-2 size-2.5 rounded-full border-2 border-accent/70 bg-surface" />
                {i < tickets.length - 1 && <span className="absolute top-5 bottom-[-8px] w-px bg-line" />}
              </span>
              <button onClick={() => setOpen(t)} className="min-w-0 flex-1 rounded-xl border border-line bg-white/[0.015] p-3 text-right transition-colors hover:border-line-strong">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <ServiceTag service={t.service} label={t.service_label} />
                    <span className="num text-[13px] text-ink-3">#{t.request_number ?? t.id}</span>
                  </span>
                  <span className="text-[13px] text-ink-3" title={fmtDateTime(Date.parse(t.created_at))}>
                    <When iso={t.created_at} />
                  </span>
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px]">
                  <StatusPill status={t.status} label={t.status_label} />
                  <span className="text-ink-3">
                    {t.assigned_to ? `مسند إلى ${t.assigned_to.name}` : t.created_by ? `أنشأه ${t.created_by.name}` : null}
                  </span>
                </span>
                {t.last_activity && (
                  <span dir="auto" className="mt-1.5 block truncate text-start text-[13px] text-ink-3">
                    {t.last_activity.description}
                  </span>
                )}
              </button>
              <span className="hidden shrink-0 self-center sm:block">
                <AdminLink url={t.admin_url} compact />
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <TicketDrawer ticket={open} onClose={close} />
    </>
  );
}

const last9 = (p: string) => p.replace(/\D/g, "").slice(-9);

/** Settled store payments attributed to this phone, from the customer directory. */
function PaidTotal({ phone }: { phone: string }) {
  const q = useQuery(`customer-row:${phone}`, (force) => api.customers({ search: phone, per_page: 5 }, force));
  if (!q.data) return null;
  const paid = q.data.data.find((c) => last9(c.phone) === last9(phone))?.paid_total_sar ?? null;
  return (
    <div className="text-left" title="مدفوعات المتجر المكتملة المنسوبة لهذا الرقم، بعد خصم المسترد">
      <p className="num text-[27px] leading-none font-semibold text-ink">{paid === null ? "—" : fmtMoney(paid)}</p>
      <p className="mt-1 text-[13px] text-ink-3">{paid === null ? "لا مدفوعات متجر منسوبة له" : "مدفوعات المتجر"}</p>
    </div>
  );
}

function Directory({ search, page }: { search: string; page: number }) {
  const query = { search: search || undefined, page, per_page: 25 };
  const q = useQuery(`customers:${JSON.stringify(query)}`, (force) => api.customers(query, force));
  const res = q.data ?? q.stale;
  const rows = res?.data ?? [];
  const open = (c: CustomerRow) => updateParams({ phone: c.phone, page: null }, true);

  return (
    <Card>
      <CardHeader
        icon="customers"
        title={res ? `العملاء (${fmtInt(res.meta.total)})` : "العملاء"}
        subtitle="كل رقم جوال مرة واحدة عبر الخدمات التسع · اضغط عميلًا لسجله الكامل"
        action={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />}
      />
      {q.error && !res ? (
        <QueryError error={q.error} onRetry={q.reload} what="قائمة العملاء" />
      ) : !res ? (
        <div className="space-y-2 px-4 pb-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon="search" title={search ? "لا يوجد عميل يطابق البحث" : "لا يوجد عملاء بعد"} hint={search ? "جرّب جزءًا من الاسم أو آخر أرقام الجوال." : undefined} />
      ) : (
        <div className={cx("transition-opacity", q.loading && "opacity-50")} aria-busy={q.loading}>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-right text-[14px]">
              <caption className="sr-only">قائمة العملاء</caption>
              <thead>
                <tr className="border-b border-line text-[13px] text-ink-3">
                  <th className="px-4 py-2.5 font-medium">العميل</th>
                  <th className="px-3 py-2.5 font-medium">الطلبات</th>
                  <th className="px-3 py-2.5 font-medium" title="من الخدمات التي لها حالة إغلاق فقط">
                    مفتوحة
                  </th>
                  <th className="hidden px-3 py-2.5 font-medium lg:table-cell">الخدمات</th>
                  <th className="px-3 py-2.5 font-medium">مدفوعات المتجر</th>
                  <th className="px-4 py-2.5 font-medium">آخر ظهور</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.phone} onClick={() => open(c)} className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.025]">
                    <td className="px-4 py-3">
                      <span className="block max-w-[200px] truncate text-ink">{c.name ?? <NotTracked>بدون اسم</NotTracked>}</span>
                      <span dir="ltr" className="num block text-right text-[13.5px] text-ink-3">
                        {c.phone}
                      </span>
                    </td>
                    <td className="num px-3 py-3 text-ink">{fmtInt(c.total_tickets)}</td>
                    <td className={cx("num px-3 py-3", c.open_tickets ? "text-warning" : "text-ink-3")}>{fmtInt(c.open_tickets)}</td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <span className="flex max-w-[280px] flex-wrap gap-1">
                        {c.services_used.map((s) => (
                          <span key={s} className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[12px] text-ink-2">
                            {serviceLabel(s)}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {c.paid_total_sar === null ? <NotTracked title="لا توجد دفعة متجر منسوبة لهذا الرقم">—</NotTracked> : <span className="num text-ink">{fmtMoney(c.paid_total_sar)}</span>}
                    </td>
                    <td className="px-4 py-3 text-[13.5px] text-ink-3">
                      <When iso={c.last_seen_at} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-line md:hidden">
            {rows.map((c) => (
              <li key={c.phone}>
                <button onClick={() => open(c)} className="block w-full px-4 py-3 text-right">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[14.5px] text-ink">{c.name ?? "بدون اسم"}</span>
                    <span className="num text-[13.5px] text-ink-2">{fmtInt(c.total_tickets)} طلب</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between text-[13px] text-ink-3">
                    <span dir="ltr" className="num">
                      {c.phone}
                    </span>
                    <When iso={c.last_seen_at} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pager meta={res.meta} busy={q.loading} onPage={(p) => updateParams({ page: p === 1 ? null : p })} />
        </div>
      )}
    </Card>
  );
}

/** Name/phone search; the query goes to the URL after a short pause so typing doesn't spend the rate limit. */
function DirectorySearch({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (value.trim() === initial) return;
    const id = setTimeout(() => updateParams({ q: value.trim() || null, page: null }), 450);
    return () => clearTimeout(id);
  }, [value, initial]);
  return <SearchInput value={value} onChange={setValue} placeholder="بحث بالاسم أو رقم الجوال…" className="mb-4 max-w-md" />;
}

export default function Customers() {
  const { params } = useOwnerRoute();
  const phone = params.get("phone") ?? "";
  const search = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  return (
    <div>
      <PageHeader title="العملاء" subtitle="كل عملاء وافي عبر الخدمات، أو ابحث برقم جوال لعرض سجل عميل كامل." />
      {phone ? (
        <>
          <a href={hrefTo("customers", { q: search })} className="mb-3 inline-flex items-center gap-1 text-[13.5px] text-ink-3 hover:text-accent">
            <Icon name="chevron" size={13} className="rotate-180" /> كل العملاء
          </a>
          <Lookup key={phone} initial={phone} />
          <History phone={phone} />
        </>
      ) : (
        <>
          <DirectorySearch initial={search} />
          <Directory search={search} page={page} />
        </>
      )}
      <p className="mt-4 text-[13px] text-ink-3">مدفوعات المتجر لا تُنسب لعميل إلا إذا مرّر المتجر رقم جواله مع الدفعة.</p>
    </div>
  );
}
