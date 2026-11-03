import { fmtInt, fmtLongDate, fmtTime } from "../../lib/format";
import { PageHeader } from "../../ui/page";
import { Card, EmptyState, Skeleton } from "../../ui/primitives";
import { cx } from "../../ui/tone";
import { api } from "../api";
import { Freshness, Note, Pager, QueryError, ServiceTag } from "../parts";
import { updateParams, useOwnerRoute } from "../router";
import TicketDrawer, { type TicketRef } from "../TicketDrawer";
import { useQuery } from "../useQuery";
import { useSelection } from "../useSelection";

const PER_PAGE = 30;
const SPARSE = 30;

export default function Activity() {
  const { params } = useOwnerRoute();
  const page = Math.max(1, Number(params.get("page")) || 1);
  // Only the first page auto-refreshes; older pages stay put while being read.
  const q = useQuery(`activity:${page}`, (force) => api.activity({ page, per_page: PER_PAGE }, force), page === 1 ? 60_000 : undefined);
  const res = q.data ?? q.stale;
  const [open, setOpen, close] = useSelection<TicketRef>();
  const items = res?.data ?? [];
  const sparse = res && res.meta.total < SPARSE;

  return (
    <div>
      <PageHeader
        title="سجل النشاط"
        subtitle="من قام بماذا، على أي طلب، ومتى — الإجراءات المسجّلة فعليًا، الأحدث أولًا."
        actions={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />}
      />

      <div className="mb-4">
        <Note tone={sparse ? "warning" : "info"}>
          كل الخدمات تسجّل الإجراءات الآن <b className="text-ink">عدا الضمان</b> (لا يُعدَّل من لوحة الإدارة أصلًا). السجل يبدأ من تاريخ تفعيل التسجيل لكل خدمة، وتغييرات مدفوعات المتجر مصدرها Moyasar تلقائيًا لا موظف.
          {sparse && <span className="mt-1 block">قلّة الإجراءات هنا تعكس التغطية الحالية للبيانات، وليست خطأ في اللوحة.</span>}
          {res?.meta.note && <span className="mt-1 block text-[11.5px] text-ink-3">ملاحظة الخادم: <span dir="auto">{res.meta.note}</span></span>}
        </Note>
      </div>

      <Card>
        {q.error && !res ? (
          <QueryError error={q.error} onRetry={q.reload} what="سجل النشاط" />
        ) : !res ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon="live" title="لا توجد إجراءات مسجّلة" hint="ستظهر هنا أول ما يغيّر موظف حالة أو قسم أو إسناد طلب ." />
        ) : (
          <div className={cx("transition-opacity", q.loading && "opacity-50")}>
            <ol className="px-5 py-4">
              {items.map((a, i) => {
                const t = Date.parse(a.at);
                const day = fmtLongDate(t);
                const newDay = i === 0 || fmtLongDate(Date.parse(items[i - 1].at)) !== day;
                return (
                  <li key={`${a.service}-${a.subject_id}-${a.at}-${i}`}>
                    {newDay && <p className={cx("mb-2 text-[11.5px] font-medium text-ink-3", i > 0 && "mt-5")}>{day}</p>}
                    <button onClick={() => setOpen({ service: a.service, id: a.subject_id })} className="flex w-full gap-3 rounded-lg px-2 py-2.5 text-right hover:bg-white/[0.03]" title="عرض الطلب وسجله">
                      <span className="num w-12 shrink-0 pt-0.5 text-[11.5px] text-ink-3">{fmtTime(t)}</span>
                      <span className="block min-w-0 flex-1">
                        <span dir="auto" className="block text-start text-[13px] leading-relaxed text-ink">{a.description}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-3">
                          <ServiceTag service={a.service} />
                          <span>
                            طلب <span className="num">#{a.subject_id}</span>
                          </span>
                          {a.by && <span>· بواسطة {a.by}</span>}
                          <span dir="ltr" className="num rounded bg-white/[0.03] px-1.5 text-[10.5px]">
                            {a.action}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <Pager meta={res.meta} busy={q.loading} onPage={(p) => updateParams({ page: p === 1 ? null : p })} />
          </div>
        )}
      </Card>
      <TicketDrawer ticket={open} onClose={close} />
      {res && <p className="mt-3 text-[11.5px] text-ink-3">إجمالي الإجراءات المسجّلة: {fmtInt(res.meta.total)}</p>}
    </div>
  );
}
