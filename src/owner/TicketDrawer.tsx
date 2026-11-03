import type { ReactNode } from "react";
import { fmtDateTime } from "../lib/format";
import Drawer from "../ui/Drawer";
import Icon from "../ui/Icon";
import { Skeleton } from "../ui/primitives";
import { api } from "./api";
import { AdminLink, NotTracked, Phone, QueryError, ServiceTag, SlaBadge, StatusPill, When } from "./parts";
import { hrefTo } from "./router";
import { SERVICE, isServiceKey } from "./services";
import type { HistoryEntry, ServiceKey, Ticket } from "./types";
import { useQuery } from "./useQuery";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2.5 text-[12.5px]">
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}

function ExtraValue({ v }: { v: unknown }) {
  if (v === null || v === undefined || v === "") return <NotTracked>—</NotTracked>;
  if (typeof v === "boolean") return <>{v ? "نعم" : "لا"}</>;
  if (typeof v === "number" || typeof v === "string") return <span className="break-words">{String(v)}</span>;
  return (
    <code dir="ltr" className="block overflow-x-auto rounded bg-white/[0.03] p-2 text-[11px] text-ink-2">
      {JSON.stringify(v, null, 1)}
    </code>
  );
}

/** A full row from a list, or just the service + id (from an alert or the activity feed). */
export type TicketRef = Ticket | { service: ServiceKey; id: number };
const isFull = (r: TicketRef): r is Ticket => "created_at" in r;

function History({ entries, hasTrail, system }: { entries: HistoryEntry[] | undefined; hasTrail: boolean | undefined; system: boolean }) {
  if (!entries)
    return (
      <div className="space-y-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  if (!entries.length) return <NotTracked>{hasTrail === false ? "لا تسجّل هذه الخدمة سجلًا للتغييرات — تُحفظ الحالة الحالية فقط." : "لا تغييرات مسجّلة بعد."}</NotTracked>;
  return (
    <ol className="space-y-0">
      {entries.map((h, i) => (
        <li key={`${h.at}-${i}`} className="relative flex gap-3 pb-3.5 last:pb-0">
          <span className="relative flex w-3 shrink-0 justify-center">
            <span className="mt-1.5 size-2 rounded-full bg-accent/70" />
            {i < entries.length - 1 && <span className="absolute top-4 bottom-[-6px] w-px bg-line" />}
          </span>
          <div className="min-w-0 flex-1">
            <p dir="auto" className="text-start text-[12.5px] leading-relaxed text-ink">
              {h.status_label ?? h.status ?? "—"}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-3">
              {h.by ?? (system ? "Moyasar (تلقائي)" : <NotTracked>غير مسجّل</NotTracked>)} · <When iso={h.at} />
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Every field the API returned for one ticket, plus its recorded history. Nothing is inferred. Polls while open. */
export default function TicketDrawer({ ticket, onClose }: { ticket: TicketRef | null; onClose: () => void }) {
  const detail = useQuery(ticket ? `ticket:${ticket.service}:${ticket.id}` : null, (force) => api.ticket(ticket!.service, ticket!.id, force), 30_000);
  const t: Ticket | null = detail.data ?? (ticket && isFull(ticket) ? ticket : null);
  const meta = t && isServiceKey(t.service) ? SERVICE[t.service] : null;
  const extra = t?.extra && typeof t.extra === "object" ? Object.entries(t.extra) : [];
  return (
    <Drawer open={!!ticket} onClose={onClose} label="تفاصيل الطلب">
      {ticket && !t && (
        <div className="p-6">
          {detail.error ? (
            <QueryError error={detail.error} onRetry={detail.reload} what="الطلب" />
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-64" />
            </div>
          )}
        </div>
      )}
      {t && (
        <div className="p-5 sm:p-6">
          <div className="min-w-0 pl-10">
            <ServiceTag service={t.service} label={t.service_label} />
            <h2 className="mt-3 text-[18px] font-semibold text-ink">
              طلب <span className="num">#{t.request_number ?? t.id}</span>
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-2">{t.customer_name ?? <NotTracked>بدون اسم عميل</NotTracked>}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <AdminLink url={t.admin_url} />
            {t.customer_phone && (
              <a href={hrefTo("customers", { phone: t.customer_phone })} onClick={onClose} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-ink-2 hover:bg-hover hover:text-ink">
                <Icon name="customers" size={13} /> كل طلبات هذا العميل
              </a>
            )}
          </div>

          <dl className="mt-5 divide-y divide-line border-y border-line">
            <Row label="الحالة">
              <StatusPill status={t.status} label={t.status_label} empty="لا توجد حالة لهذه الخدمة" />
            </Row>
            {"sla" in t && (
              <Row label="المهلة">
                {t.sla ? (
                  <div>
                    <SlaBadge sla={t.sla} />
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">
                      {t.sla.policy_label ?? "المهلة"} · <span className="num">{t.sla.policy_hours}</span> ساعة من آخر إجراء مسجّل (<When iso={t.sla.since} />)
                    </p>
                  </div>
                ) : (
                  <SlaBadge sla={t.sla} />
                )}
              </Row>
            )}
            <Row label="جوال العميل">
              <Phone value={t.customer_phone} link={false} />
            </Row>
            <Row label="مسند إلى">
              {t.assigned_to?.name ?? <NotTracked>{meta && !meta.tracksAssignee ? "لا تتتبّع هذه الخدمة الإسناد" : t.service === "resale" ? "لم يبدأ أي موظف العمل عليه بعد" : "غير مسند"}</NotTracked>}
            </Row>
            <Row label="أنشأه">{t.created_by?.name ?? <NotTracked>{meta && !meta.tracksCreator ? "لا تتتبّع هذه الخدمة المنشئ" : "غير مسجّل"}</NotTracked>}</Row>
            <Row label="آخر إجراء">
              {t.last_activity ? (
                <div>
                  <p dir="auto" className="text-start leading-relaxed">
                    {t.last_activity.description}
                  </p>
                  <p className="mt-1 text-[11.5px] text-ink-3">
                    {t.last_activity.by ?? "—"} · <When iso={t.last_activity.at} />
                  </p>
                </div>
              ) : (
                <NotTracked>{t.has_activity_trail ? "لا إجراءات مسجّلة بعد" : "لا تسجّل هذه الخدمة الإجراءات"}</NotTracked>
              )}
            </Row>
            <Row label="تاريخ الإنشاء">{fmtDateTime(Date.parse(t.created_at))}</Row>
            <Row label="آخر تعديل">{t.updated_at ? fmtDateTime(Date.parse(t.updated_at)) : <NotTracked />}</Row>
            <Row label="المعرّف">
              <span className="num text-ink-2">
                {t.service}/{t.id}
              </span>
            </Row>
          </dl>

          <section className="mt-6">
            <h3 className="mb-3 text-[12.5px] font-semibold text-ink">سجل التغييرات</h3>
            {detail.error && !detail.data ? (
              <p className="text-[12px] text-ink-3">
                تعذّر تحميل السجل.{" "}
                <button onClick={detail.reload} className="text-accent hover:underline">
                  إعادة المحاولة
                </button>
              </p>
            ) : (
              <>
                <History entries={detail.data?.history} hasTrail={detail.data?.has_activity_trail ?? t.has_activity_trail} system={t.service === "payments"} />
                {detail.data?.has_activity_trail && <p className="mt-3 text-[11px] text-ink-3/80">السجل يبدأ من تاريخ تفعيل التسجيل لهذه الخدمة؛ ما قبله لم يُسجَّل.</p>}
              </>
            )}
          </section>

          {extra.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-2 text-[12.5px] font-semibold text-ink">تفاصيل خاصة بالخدمة</h3>
              <dl className="divide-y divide-line rounded-xl border border-line px-3">
                {extra.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[120px_1fr] gap-3 py-2 text-[12px]">
                    <dt dir="ltr" className="num truncate text-right text-ink-3" title={k}>
                      {k}
                    </dt>
                    <dd className="min-w-0 text-ink-2">
                      <ExtraValue v={v} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
