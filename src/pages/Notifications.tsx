import { ALERT_PRIORITY } from "../domain/labels";
import type { AlertPriority, Notification } from "../domain/types";
import { fmtDate, fmtRelative, fmtTime } from "../lib/format";
import { useNow } from "../state/clock";
import { useData } from "../state/indexes";
import { markNotificationsRead } from "../state/store";
import { navigate, setParams, useRoute, type Page } from "../state/router";
import Icon from "../ui/Icon";
import { PageHeader } from "../ui/page";
import { Button, Card, EmptyState, Segmented } from "../ui/primitives";
import { TONE_BG, TONE_TEXT, cx } from "../ui/tone";

type Filter = "all" | AlertPriority;
const PAGE: Record<Notification["target"]["kind"], Page> = { request: "requests", order: "orders", customer: "customers", employee: "employees" };
const TARGET_LABEL: Record<Notification["target"]["kind"], string> = { request: "فتح الطلب", order: "فتح الطلب الشرائي", customer: "فتح ملف العميل", employee: "فتح نشاط الموظف" };

export default function Notifications() {
  const { data } = useData();
  const now = useNow();
  const { params } = useRoute();
  const filter = (params.get("level") ?? "all") as Filter;
  const unreadOnly = params.get("unread") === "1";

  const list = data.notifications.filter((n) => (filter === "all" || n.priority === filter) && (!unreadOnly || !n.read)).sort((a, b) => b.at - a.at);
  const count = (f: Filter) => data.notifications.filter((n) => (f === "all" || n.priority === f) && !n.read).length;
  const unread = list.filter((n) => !n.read);

  return (
    <div>
      <PageHeader
        title="مركز التنبيهات"
        subtitle="الأحداث المهمة مرتبة بالأولوية. اضغط أي تنبيه للانتقال إلى السجل المرتبط به."
        actions={
          unread.length > 0 && (
            <Button variant="outline" icon="check" onClick={() => markNotificationsRead(unread.map((n) => n.id))}>
              تعليم الظاهر كمقروء
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <Segmented<Filter>
            label="مستوى الأولوية"
            value={filter}
            onChange={(v) => setParams({ level: v === "all" ? null : v })}
            options={[
              { value: "all", label: "الكل", count: count("all") },
              ...(Object.keys(ALERT_PRIORITY) as AlertPriority[]).map((p) => ({ value: p, label: ALERT_PRIORITY[p].label, count: count(p) })),
            ]}
          />
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setParams({ unread: e.target.checked ? "1" : null })} className="size-4 accent-[var(--color-accent)]" />
            غير المقروءة فقط
          </label>
        </div>
        {list.length === 0 ? (
          <EmptyState icon="bell" title="لا توجد تنبيهات" hint="ستظهر هنا التنبيهات الجديدة فور وصولها." />
        ) : (
          <ul className="p-2">
            {list.map((n, i) => {
              const day = fmtDate(n.at);
              const header = i === 0 || fmtDate(list[i - 1].at) !== day ? day : null;
              const m = ALERT_PRIORITY[n.priority];
              return (
                <li key={n.id}>
                  {header && <p className="px-4 pt-4 pb-1.5 text-[11px] font-medium text-ink-3">{header}</p>}
                  <button
                    onClick={() => {
                      markNotificationsRead([n.id]);
                      navigate(PAGE[n.target.kind], { panel: `${n.target.kind}:${n.target.id}` });
                    }}
                    className={cx("group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-right transition-colors hover:bg-white/[0.03]", !n.read && "bg-white/[0.015]")}
                  >
                    <span className={cx("h-9 w-1 shrink-0 rounded-full", TONE_BG[m.tone], n.read && "opacity-30")} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={cx("text-[13px]", n.read ? "text-ink-2" : "font-medium text-ink")}>{n.title}</span>
                        <span className={cx("text-[10.5px] font-medium", TONE_TEXT[m.tone])}>{m.label}</span>
                        {!n.read && <span className="size-1.5 rounded-full bg-accent" aria-label="غير مقروء" />}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-ink-3">{n.body}</span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-1 text-[11.5px] text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                      {TARGET_LABEL[n.target.kind]} <Icon name="chevron" size={12} />
                    </span>
                    <span className="num w-20 shrink-0 text-left text-[11px] text-ink-3" title={fmtTime(n.at)}>
                      {fmtRelative(n.at, now)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
