import { fmtDateTime } from "../../lib/format";
import { PageHeader } from "../../ui/page";
import { Button, Card, EmptyState, Select, Skeleton } from "../../ui/primitives";
import { cx } from "../../ui/tone";
import { api } from "../api";
import { AdminLink, Freshness, Note, NotTracked, Pager, Phone, QueryError, ServiceTag, SlaBadge, StatusLegend, StatusPill, When } from "../parts";
import { updateParams, useOwnerRoute } from "../router";
import { SERVICE, SERVICES, STATUS_NAME, isServiceKey } from "../services";
import TicketDrawer from "../TicketDrawer";
import type { Ticket, TicketQuery } from "../types";
import { useQuery } from "../useQuery";
import { useSelection } from "../useSelection";

const PER_PAGE = ["25", "50", "100"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Admin-configurable statuses (customer_support, sales) have no fixed list in the API, so the
// filter offers the ones seen in responses so far this session.
const seenStatuses = new Map<string, Map<string, string>>();
function remember(rows: Ticket[]) {
  for (const r of rows) {
    if (!r.status) continue;
    const m = seenStatuses.get(r.service) ?? new Map<string, string>();
    m.set(r.status, r.status_label ?? r.status);
    seenStatuses.set(r.service, m);
  }
}

function Owner({ t }: { t: Ticket }) {
  const meta = isServiceKey(t.service) ? SERVICE[t.service] : null;
  if (t.assigned_to) return <span className="text-ink">{t.assigned_to.name}</span>;
  if (t.created_by)
    return (
      <span className="text-ink-2">
        <span className="text-[12.5px] text-ink-3">أنشأه </span>
        {t.created_by.name}
      </span>
    );
  if (meta && !meta.tracksAssignee && !meta.tracksCreator) return <NotTracked title="هذه الخدمة لا تسجّل المسؤول عن الطلب">غير متتبَّع</NotTracked>;
  return <NotTracked title="لم يُسند الطلب لأحد بعد">غير مسند</NotTracked>;
}

function Activity({ t }: { t: Ticket }) {
  if (!t.last_activity) return <NotTracked title={t.has_activity_trail ? "لا إجراءات مسجّلة على هذا الطلب بعد" : "هذه الخدمة لا تسجّل من قام بالإجراءات"}>{t.has_activity_trail ? "لا إجراءات بعد" : "بدون سجل"}</NotTracked>;
  return (
    <span className="block min-w-0">
      <span dir="auto" className="block max-w-[200px] truncate text-start text-[13.5px] text-ink-2" title={t.last_activity.description}>
        {t.last_activity.description}
      </span>
      <span className="text-[12.5px] text-ink-3">
        {t.last_activity.by ? `${t.last_activity.by} · ` : ""}
        <When iso={t.last_activity.at} />
      </span>
    </span>
  );
}

function Status({ t }: { t: Ticket }) {
  return <StatusPill status={t.status} label={t.status_label} />;
}

export default function Tickets() {
  const { params } = useOwnerRoute();
  const service = isServiceKey(params.get("service")) ? (params.get("service") as TicketQuery["service"]) : undefined;
  const status = service ? (params.get("status") ?? "") : "";
  const from = DATE_RE.test(params.get("from") ?? "") ? params.get("from")! : "";
  const to = DATE_RE.test(params.get("to") ?? "") ? params.get("to")! : "";
  const per = Number(PER_PAGE.includes(params.get("per") as (typeof PER_PAGE)[number]) ? params.get("per") : 25);
  const page = Math.max(1, Number(params.get("page")) || 1);

  const query: TicketQuery = { service, status: status || undefined, date_from: from || undefined, date_to: to || undefined, per_page: per, page };
  const key = JSON.stringify(query);
  const q = useQuery(key, async (force) => {
    const res = await api.tickets(query, force);
    remember(res.data);
    return res;
  });
  const res = q.data ?? q.stale;
  const rows = res?.data ?? [];

  const [open, setOpen, close] = useSelection<Ticket>();
  // Older deployments don't send `sla` at all; hide the column rather than fill it with dashes.
  const hasSla = rows.some((r) => "sla" in r);

  const meta = service ? SERVICE[service] : null;
  const knownOptions: { value: string; label: string }[] = !meta
    ? []
    : meta.statuses === "dynamic"
      ? [...(seenStatuses.get(meta.key) ?? new Map<string, string>()).entries()].map(([value, label]) => ({ value, label }))
      : (meta.statuses ?? []).map((value) => ({ value, label: STATUS_NAME[value] ?? value }));
  // A status from a shared link that isn't in the list yet still shows as selected.
  const statusOptions = status && !knownOptions.some((o) => o.value === status) ? [...knownOptions, { value: status, label: status }] : knownOptions;

  const set = (patch: Record<string, string | number | null>) => updateParams({ page: null, ...patch });
  const badRange = from && to && from > to;
  const filtered = !!(service || from || to);

  return (
    <div>
      <PageHeader
        title="سجل الطلبات"
        subtitle="كل الطلبات عبر الخدمات بشكل موحّد. اضغط أي صف لكل التفاصيل."
        actions={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />}
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <Select
            label="الخدمة"
            value={service ?? "all"}
            onChange={(v) => set({ service: v === "all" ? null : v, status: null })}
            options={[{ value: "all", label: "كل الخدمات" }, ...SERVICES.map((s) => ({ value: s.key, label: s.label }))]}
          />
          {meta && meta.statuses === null ? (
            <span className="rounded-lg border border-dashed border-line px-3 py-2 text-[13.5px] text-ink-3">لا توجد حالة لهذه الخدمة</span>
          ) : (
            <Select
              label="الحالة"
              value={status || "all"}
              onChange={(v) => set({ status: v === "all" ? null : v })}
              options={[{ value: "all", label: service ? "كل الحالات" : "الحالة (اختر خدمة أولًا)" }, ...statusOptions]}
            />
          )}
          <label className="flex items-center gap-1.5 text-[13.5px] text-ink-3">
            من
            <input type="date" dir="ltr" value={from} max={to || undefined} onChange={(e) => set({ from: e.target.value || null })} className="rounded-lg border border-line bg-white/[0.02] px-2.5 py-1.5 text-[14px] text-ink focus:border-accent/40 focus:outline-none" />
          </label>
          <label className="flex items-center gap-1.5 text-[13.5px] text-ink-3">
            إلى
            <input type="date" dir="ltr" value={to} min={from || undefined} onChange={(e) => set({ to: e.target.value || null })} className="rounded-lg border border-line bg-white/[0.02] px-2.5 py-1.5 text-[14px] text-ink focus:border-accent/40 focus:outline-none" />
          </label>
          <Select label="عدد الصفوف" value={String(per)} onChange={(v) => set({ per: v === "25" ? null : v })} options={PER_PAGE.map((v) => ({ value: v, label: `${v} صفًا` }))} />
          {filtered && (
            <Button variant="ghost" icon="close" onClick={() => updateParams({ service: null, status: null, from: null, to: null, page: null })}>
              مسح الفلاتر
            </Button>
          )}
        </div>
        <div className="mt-3 border-t border-line pt-2.5">
          <StatusLegend />
        </div>
        {meta?.statuses === "dynamic" && statusOptions.length === 0 && <p className="mt-2 text-[13px] text-ink-3">حالات هذه الخدمة يحددها مسؤول النظام؛ ستظهر هنا بعد تحميل أول صفحة من نتائجها.</p>}
      </Card>

      <div className="mb-4 space-y-2">
        {badRange && <Note tone="warning">تاريخ البداية بعد تاريخ النهاية — لن تظهر نتائج.</Note>}
        {!service && (
          <Note>
            بدون اختيار خدمة، تعرض القائمة <b className="text-ink">أحدث 50 طلبًا من كل خدمة</b> مدموجة ومرتبة — وليست كل السجل التاريخي. للرجوع لأشهر سابقة اختر خدمة محددة.
            {res?.meta.note && <span className="mt-1 block text-[13px] text-ink-3">ملاحظة الخادم: <span dir="auto">{res.meta.note}</span></span>}
          </Note>
        )}
        {service === "payments" && <Note>مدفوعات المتجر الإلكتروني المنفصل (Moyasar): لا شاشة إدارة ولا موظف مسؤول، وتغييرات حالتها تُسجَّل تلقائيًا. الدفعة لا تُنسب لعميل إلا إذا مرّر المتجر بياناته.</Note>}
      </div>

      <Card>
        {q.error && !res ? (
          <QueryError error={q.error} onRetry={q.reload} what="الطلبات" />
        ) : !res ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon="filter" title="لا توجد طلبات تطابق هذه الفلاتر" hint={filtered ? "جرّب توسيع نطاق التاريخ أو اختيار خدمة أخرى." : undefined} />
        ) : (
          <div className={cx("transition-opacity", q.loading && "opacity-50")} aria-busy={q.loading}>
            {q.error && <p className="border-b border-line px-4 py-2 text-[13.5px] text-critical">تعذّر التحديث: {q.error.message}</p>}
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-right text-[14px]">
                <caption className="sr-only">سجل الطلبات</caption>
                <thead>
                  <tr className="border-b border-line text-[13px] text-ink-3">
                    <th className="px-4 py-2.5 font-medium">الخدمة / الرقم</th>
                    <th className="px-3 py-2.5 font-medium">العميل</th>
                    <th className="px-3 py-2.5 font-medium">الحالة</th>
                    <th className="px-3 py-2.5 font-medium">المسؤول</th>
                    {hasSla && <th className="px-3 py-2.5 font-medium">المهلة</th>}
                    <th className="hidden px-3 py-2.5 font-medium lg:table-cell">آخر إجراء</th>
                    <th className="px-3 py-2.5 font-medium">الإنشاء</th>
                    <th className="px-4 py-2.5 font-medium">
                      <span className="sr-only">لوحة الإدارة</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={`${t.service}-${t.id}`} onClick={() => setOpen(t)} className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.025]">
                      <td className="px-4 py-3">
                        <ServiceTag service={t.service} label={t.service_label} />
                        <span className="num mt-1 block text-[12.5px] text-ink-3">#{t.request_number ?? t.id}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block max-w-[180px] truncate text-ink">{t.customer_name ?? <NotTracked>بدون اسم</NotTracked>}</span>
                        <span onClick={(e) => e.stopPropagation()}>
                          <Phone value={t.customer_phone} />
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Status t={t} />
                      </td>
                      <td className="px-3 py-3">
                        <Owner t={t} />
                      </td>
                      {hasSla && (
                        <td className="px-3 py-3">
                          <SlaBadge sla={t.sla} />
                        </td>
                      )}
                      <td className="hidden px-3 py-3 lg:table-cell">
                        <Activity t={t} />
                      </td>
                      <td className="px-3 py-3 text-[13.5px] text-ink-3" title={fmtDateTime(Date.parse(t.created_at))}>
                        <When iso={t.created_at} />
                      </td>
                      <td className="px-4 py-3 text-left">
                        <AdminLink url={t.admin_url} compact />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((t) => (
                <li key={`${t.service}-${t.id}`}>
                  <button onClick={() => setOpen(t)} className="block w-full px-4 py-3 text-right">
                    <span className="flex items-center justify-between gap-2">
                      <ServiceTag service={t.service} label={t.service_label} />
                      <Status t={t} />
                    </span>
                    <span className="mt-2 block truncate text-[14.5px] text-ink">{t.customer_name ?? "بدون اسم"}</span>
                    <span className="mt-0.5 flex items-center justify-between text-[13px] text-ink-3">
                      <span className="num">#{t.request_number ?? t.id}</span>
                      {t.sla ? <SlaBadge sla={t.sla} /> : <When iso={t.created_at} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Pager meta={res.meta} busy={q.loading} onPage={(p) => updateParams({ page: p === 1 ? null : p })} />
          </div>
        )}
      </Card>

      <TicketDrawer ticket={open} onClose={close} />
    </div>
  );
}
