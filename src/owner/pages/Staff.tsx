import { useEffect, useState, type ReactNode } from "react";
import { HBarList } from "../../charts/small";
import { fmtDuration, fmtInt } from "../../lib/format";
import DataTable, { type Column } from "../../ui/DataTable";
import Drawer from "../../ui/Drawer";
import { serviceLabel } from "../services";
import { useSelection } from "../useSelection";
import { PageHeader } from "../../ui/page";
import { Avatar, Card, CardHeader, SearchInput, Skeleton } from "../../ui/primitives";
import { api, isMissingRoute } from "../api";
import { Freshness, Note, NotDeployed, NotTracked, QueryError, ServiceTag, SlaBadge, When } from "../parts";
import { subscribePresenceUpdated } from "../realtime";
import TicketDrawer, { type TicketRef } from "../TicketDrawer";
import type { OnlineStaff, StaffMember } from "../types";
import { useQuery } from "../useQuery";

const num = (v: number | null | undefined) => (v === null || v === undefined ? <NotTracked>—</NotTracked> : <span className="num text-ink">{fmtInt(v)}</span>);
const sortNum = (v: number | null | undefined) => v ?? -1;

const columns: Column<StaffMember>[] = [
  {
    key: "name",
    header: "الموظف",
    sortValue: (s) => s.name,
    render: (s) => (
      <span className="flex items-center gap-2.5">
        <Avatar name={s.name} id={String(s.id)} size={28} />
        <span className="min-w-0">
          <span className="block truncate text-ink">{s.name}</span>
          {s.email && (
            <span dir="ltr" className="block truncate text-right text-[11px] text-ink-3">
              {s.email}
            </span>
          )}
        </span>
      </span>
    ),
  },
  {
    key: "roles",
    header: "الأدوار",
    hideBelow: "lg",
    render: (s) =>
      s.roles.length ? (
        <span className="flex flex-wrap gap-1">
          {s.roles.map((r) => (
            <span key={r} dir="ltr" className="num rounded bg-white/[0.04] px-1.5 py-0.5 text-[10.5px] text-ink-2">
              {r}
            </span>
          ))}
        </span>
      ) : (
        <NotTracked>—</NotTracked>
      ),
  },
  { key: "cs_open", header: "خدمة العملاء · مفتوحة لديه", sortValue: (s) => sortNum(s.customer_support?.assigned_open), render: (s) => num(s.customer_support?.assigned_open) },
  { key: "cs_created", header: "خدمة العملاء · أنشأها", sortValue: (s) => sortNum(s.customer_support?.created_total), render: (s) => num(s.customer_support?.created_total) },
  { key: "sales", header: "المبيعات · أنشأها", sortValue: (s) => sortNum(s.sales_created_total), render: (s) => num(s.sales_created_total) },
  { key: "over", header: "Over Stage · أنشأها", sortValue: (s) => sortNum(s.over_stage_created_total), render: (s) => num(s.over_stage_created_total) },
];

const secs = (s: number | null | undefined) => (s === null || s === undefined ? null : fmtDuration(s * 1000));

function Metric({ label, value, why }: { label: string; value: ReactNode | null; why: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.015] p-3">
      <p className="text-[11.5px] text-ink-3">{label}</p>
      <p className="num mt-1.5 text-[18px] leading-none font-semibold text-ink" style={{ textAlign: "right" }}>
        {value ?? <NotTracked title={why}>غير متتبَّع</NotTracked>}
      </p>
    </div>
  );
}

function StaffDrawer({ member, onClose }: { member: StaffMember | null; onClose: () => void }) {
  const q = useQuery(member ? `staff-stats:${member.id}` : null, (force) => api.staffStats(member!.id, {}, force));
  const s = q.data;
  const cs = s?.customer_support;
  const created = Object.entries(s?.created_totals ?? {}).filter(([, n]) => n !== undefined);
  return (
    <Drawer open={!!member} onClose={onClose} label="أداء الموظف">
      {member && (
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3 pl-10">
            <Avatar name={member.name} id={String(member.id)} size={44} />
            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-semibold text-ink">{member.name}</h2>
              {member.email && (
                <p dir="ltr" className="truncate text-right text-[12px] text-ink-3">
                  {member.email}
                </p>
              )}
            </div>
          </div>

          {q.error && !s ? (
            <div className="mt-6">
              <QueryError error={q.error} onRetry={q.reload} what="أداء الموظف" />
            </div>
          ) : !s ? (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : (
            <>
              <h3 className="mt-6 mb-2 text-[12.5px] font-semibold text-ink">خدمة العملاء</h3>
              {cs ? (
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="تذاكر حلّها" value={cs.completed_count === null ? null : fmtInt(cs.completed_count)} why="غير مسجّل" />
                  <Metric label="مفتوحة لديه الآن" value={cs.currently_open_assigned === null ? null : fmtInt(cs.currently_open_assigned)} why="غير مسجّل" />
                  <Metric label="متوسط وقت الحل" value={secs(cs.avg_resolution_seconds)} why="لا توجد تذاكر محلولة له" />
                  <Metric label="متوسط وقت أول رد" value={secs(cs.avg_first_response_seconds)} why="لا تسجّل أي خدمة وقت أول رد" />
                </div>
              ) : (
                <NotTracked>لا يعمل على خدمة العملاء</NotTracked>
              )}

              <h3 className="mt-6 mb-2 text-[12.5px] font-semibold text-ink">خدمة الاستبدال</h3>
              {s.resale ? (
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="تسويات حسابات نفّذها" value={s.resale.completed_count === null ? null : fmtInt(s.resale.completed_count)} why="غير مسجّل" />
                  <Metric label="طلبات استلمها ولم تُغلق" value={s.resale.currently_open_assigned === null ? null : fmtInt(s.resale.currently_open_assigned)} why="غير مسجّل" />
                </div>
              ) : (
                <NotTracked>لا بيانات</NotTracked>
              )}

              <h3 className="mt-6 mb-2 text-[12.5px] font-semibold text-ink">ما أنشأه منذ البداية</h3>
              {created.length ? (
                <ul className="divide-y divide-line rounded-xl border border-line px-3">
                  {created.map(([k, n]) => (
                    <li key={k} className="flex items-center justify-between py-2 text-[12.5px]">
                      <span className="text-ink-2">{serviceLabel(k)}</span>
                      <span className="num text-ink">{fmtInt(n!)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <NotTracked>لا شيء</NotTracked>
              )}

              <p className="mt-6 text-[11.5px] leading-relaxed text-ink-3">
                أرقام مسجّلة فعليًا فقط، منفصلة لكل خدمة لأن كل خدمة تتتبّع أشياء مختلفة. في الاستبدال يُنسب الطلب لأول موظف يتخذ إجراءً عليه، و«تسويات الحسابات» إجراءات نفّذها بنفسه.
              </p>
            </>
          )}
        </div>
      )}
    </Drawer>
  );
}

/** Inferred from the admin panel's ~30s heartbeat — not a live socket, so it lags by up to the threshold. */
function OnlineNow() {
  // Stop polling once the server says the route doesn't exist.
  const [missing, setMissing] = useState(false);
  const q = useQuery(
    "staff-online",
    (force) =>
      api.staffOnline(force).catch((e: unknown) => {
        if (isMissingRoute(e)) setMissing(true);
        throw e;
      }),
    missing ? undefined : 20_000,
  );
  const [ticket, setTicket, closeTicket] = useSelection<TicketRef>();
  if (missing) return <NotDeployed what="عرض المتصلين الآن" endpoint="GET /staff/online" />;
  const rows = q.data?.data ?? [];
  const threshold = q.data?.meta.online_threshold_seconds;
  return (
    <Card>
      <CardHeader
        icon="live"
        title={q.data ? `متصلون الآن (${fmtInt(rows.length)})` : "متصلون الآن"}
        subtitle={`من فتح لوحة الإدارة${threshold ? ` خلال آخر ${fmtInt(threshold)} ثانية` : ""} · يتحدّث كل 20 ثانية`}
        action={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />}
      />
      <div className="px-5 pb-5">
        {q.error && !q.data ? (
          <QueryError error={q.error} onRetry={q.reload} what="المتصلين" />
        ) : !q.data ? (
          <Skeleton className="h-16" />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-3">لا أحد يفتح لوحة الإدارة الآن.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
            {rows.map((o) => (
              <li key={o.user.id} className="flex items-start gap-3 rounded-xl border border-line bg-white/[0.015] p-3">
                <Avatar name={o.user.name} id={String(o.user.id)} size={34} status="good" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-ink">{o.user.name}</span>
                    <When iso={o.last_seen_at} className="text-[11px] text-ink-3" />
                  </p>
                  {o.viewing ? (
                    <button onClick={() => setTicket(o.viewing!)} className="mt-1.5 flex w-full flex-wrap items-center gap-1.5 rounded-md text-right text-[11.5px] text-ink-2 hover:text-accent">
                      <span className="text-ink-3">يعمل على</span>
                      <ServiceTag service={o.viewing.service} label={o.viewing.service_label} />
                      <span className="num">#{o.viewing.request_number ?? o.viewing.id}</span>
                      {o.viewing.sla && <SlaBadge sla={o.viewing.sla} />}
                    </button>
                  ) : (
                    <p className="mt-1.5 text-[11.5px] text-ink-3" title={o.route_name ?? undefined}>
                      في صفحة عامة (ليست طلبًا محددًا)
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <TicketDrawer ticket={ticket} onClose={closeTicket} />
    </Card>
  );
}

export default function Staff() {
  const q = useQuery("staff", (force) => api.staff(force), 120_000);
  const [search, setSearch] = useState("");
  const [selected, select, unselect] = useSelection<StaffMember>();
  const all = q.data?.data ?? [];
  const needle = search.trim().toLowerCase();
  const rows = needle ? all.filter((s) => s.name.toLowerCase().includes(needle) || s.email?.toLowerCase().includes(needle) || s.roles.some((r) => r.toLowerCase().includes(needle))) : all;
  const open = all.filter((s) => (s.customer_support?.assigned_open ?? 0) > 0).sort((a, b) => b.customer_support!.assigned_open - a.customer_support!.assigned_open);

  return (
    <div>
      <PageHeader
        title="عبء عمل الموظفين"
        subtitle="الموظفون بأدوار خدمة العملاء والمبيعات وOver Stage والإدارة، مع ما تستطيع كل خدمة الإبلاغ عنه."
        actions={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />}
      />
      <div className="mb-4">
        <Note>
          «مفتوحة لديه» هي طلبات خدمة العملاء المسندة له ولم تُغلق بعد. بقية الأرقام <b className="text-ink">إجمالي ما أنشأه منذ البداية</b>. أرقام الاستبدال لكل موظف تظهر عند الضغط عليه.
        </Note>
      </div>

      {q.error && !q.data ? (
        <Card>
          <QueryError error={q.error} onRetry={q.reload} what="بيانات الموظفين" />
        </Card>
      ) : !q.data ? (
        <Skeleton className="h-[420px] rounded-[14px]" />
      ) : (
        <div className="space-y-4">
          <OnlineNow />
          <Card>
            <CardHeader
              icon="employees"
              title={`الموظفون (${fmtInt(all.length)})`}
              subtitle="اضغط موظفًا لأدائه · أو عنوان عمود للترتيب"
              action={<SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الدور…" className="w-48" />}
            />
            <DataTable
              label="عبء عمل الموظفين"
              columns={columns}
              rows={rows}
              rowKey={(s) => String(s.id)}
              onRowClick={select}
              initialSort={{ key: "cs_open", dir: "desc" }}
              pageSize={20}
              emptyTitle={needle ? "لا يوجد موظف يطابق البحث" : "لا يوجد موظفون"}
              renderMobile={(s) => (
                <div className="flex items-center gap-3">
                  <Avatar name={s.name} id={String(s.id)} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{s.name}</p>
                    <p className="text-[11.5px] text-ink-3">
                      مفتوحة: {s.customer_support ? fmtInt(s.customer_support.assigned_open) : "—"} · مبيعات: {s.sales_created_total ?? "—"} · Over Stage: {s.over_stage_created_total ?? "—"}
                    </p>
                  </div>
                </div>
              )}
            />
          </Card>
          <Card className="xl:max-w-xl">
            <CardHeader icon="users" title="الطلبات المفتوحة الآن" subtitle="خدمة العملاء · لكل موظف" />
            <div className="px-5 pb-5">
              {open.length ? (
                <HBarList items={open.map((s) => ({ key: String(s.id), label: s.name, value: s.customer_support!.assigned_open, display: fmtInt(s.customer_support!.assigned_open) }))} />
              ) : (
                <p className="py-6 text-center text-[12.5px] text-ink-3">لا توجد طلبات خدمة عملاء مفتوحة مسندة حاليًا.</p>
              )}
            </div>
          </Card>
        </div>
      )}
      <StaffDrawer member={selected} onClose={unselect} />
    </div>
  );
}
