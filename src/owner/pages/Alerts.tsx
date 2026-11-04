import { useState } from "react";
import Icon from "../../ui/Icon";
import { PageHeader } from "../../ui/page";
import { Badge, Button, Card, EmptyState, Segmented, Skeleton, Stat } from "../../ui/primitives";
import { cx, TONE_TEXT } from "../../ui/tone";
import { markRead, PRIORITY, useNotifications } from "../notifications";
import { Freshness, Note, QueryError, ServiceTag, When } from "../parts";
import TicketDrawer, { type TicketRef } from "../TicketDrawer";
import type { Priority } from "../types";
import { useSelection } from "../useSelection";

const ORDER: Priority[] = ["critical", "high", "medium", "low"];

export default function Alerts() {
  const q = useNotifications();
  const [show, setShow] = useState<"unread" | "all">("unread");
  const [busy, setBusy] = useState(false);
  const [open, setOpen, close] = useSelection<TicketRef>();

  const all = q.data?.data ?? [];
  const unread = all.filter((n) => !n.read);
  const list = (show === "unread" ? unread : all).slice().sort((a, b) => PRIORITY[a.priority].rank - PRIORITY[b.priority].rank || Date.parse(b.at) - Date.parse(a.at));

  const readAll = async () => {
    setBusy(true);
    try {
      await markRead(unread.map((n) => n.id));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="التنبيهات"
        subtitle="يحسبها الخادم لحظيًا من بيانات الخدمات. يختفي التنبيه وحده عندما تزول حالته."
        actions={<Freshness at={q.updatedAt} onRefresh={q.reload} loading={q.loading} />}
      />

      {q.error && !q.data ? (
        <Card>
          <QueryError error={q.error} onRetry={q.reload} what="التنبيهات" />
        </Card>
      ) : !q.data ? (
        <Skeleton className="h-[420px] rounded-[14px]" />
      ) : (
        <>
          <Card className="mb-4 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {ORDER.map((p) => (
                <Stat key={p} label={PRIORITY[p].label} value={unread.filter((n) => n.priority === p).length} tone={PRIORITY[p].tone} sub="غير مقروء" />
              ))}
            </div>
          </Card>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Segmented
              label="عرض"
              value={show}
              onChange={setShow}
              options={[
                { value: "unread", label: "غير المقروءة", count: unread.length },
                { value: "all", label: "الكل", count: all.length },
              ]}
            />
            {unread.length > 0 && (
              <Button variant="ghost" icon="check" onClick={() => void readAll()} disabled={busy}>
                {busy ? "جارٍ التعليم…" : "تعليم الكل كمقروء"}
              </Button>
            )}
          </div>

          <Card>
            {list.length === 0 ? (
              <EmptyState icon="checkCircle" title={show === "unread" ? "لا توجد تنبيهات غير مقروءة" : "لا توجد تنبيهات حاليًا"} hint="لا شيء يتجاوز الحدود المضبوطة الآن." />
            ) : (
              <ul className="divide-y divide-line">
                {list.map((n) => (
                  <li key={n.id} className={cx("flex items-start gap-3 px-4 py-3.5 sm:px-5", n.read && "opacity-60")}>
                    <span className={cx("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.02]", TONE_TEXT[PRIORITY[n.priority].tone])}>
                      <Icon name="alert" size={15} animateOnHover={false} />
                    </span>
                    <button onClick={() => n.target && setOpen(n.target)} disabled={!n.target} className="min-w-0 flex-1 text-right disabled:cursor-default">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-ink">{n.title}</span>
                        <Badge tone={PRIORITY[n.priority].tone}>{PRIORITY[n.priority].label}</Badge>
                        {n.target && <ServiceTag service={n.target.service} />}
                      </span>
                      <span className="mt-1 block text-[12px] leading-relaxed text-ink-2">{n.detail}</span>
                      <span className="mt-1 block text-[11px] text-ink-3">
                        <When iso={n.at} />
                      </span>
                    </button>
                    {!n.read && (
                      <button onClick={() => void markRead([n.id])} className="shrink-0 rounded-md px-2 py-1 text-[11.5px] text-ink-3 hover:bg-hover hover:text-ink" title="تعليم كمقروء">
                        <Icon name="check" size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="mt-4">
            <Note>
              القواعد الخمس (الحدود قابلة للتعديل من الخادم): تذكرة خدمة عملاء بلا موظف مسؤول · طلب مفتوح تجاوز مهلته (من سياسات المهلة في الإعدادات) · طلب استبدال متوقف عدة أيام · دفعة فاشلة · تذكرة بلا أي رد مسجّل.
              <span className="mt-1 block text-[11.5px] text-ink-3">
                «بلا رد مسجّل» تقدير تقريبي: النظام لا يحفظ المحادثة، فقط ملاحظة الإجراء المتخذ — لا يعرف إن كان العميل راسل بعد آخر رد.
              </span>
            </Note>
          </div>
        </>
      )}

      <TicketDrawer ticket={open} onClose={close} />
    </div>
  );
}
