import { initials } from "../lib/format";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ALERT_PRIORITY } from "../domain/labels";
import { fmtRelative } from "../lib/format";
import { useNow } from "../state/clock";
import { markNotificationsRead, useDashboard } from "../state/store";
import { hrefFor, navigate, useRoute, type Page } from "../state/router";
import Icon from "../ui/Icon";
import { DemoTag, Dot } from "../ui/primitives";
import { logout, useSession } from "../state/auth";
import { Changed } from "../ui/Changed";
import { BRAND_NAME, LogoMark } from "../ui/Logo";
import { cx } from "../ui/tone";
import GlobalSearch from "./GlobalSearch";
import { pageLabel } from "./nav";

const PANEL_LABEL = { request: "تفاصيل الطلب", order: "تفاصيل الطلب الشرائي", customer: "ملف العميل", employee: "نشاط الموظف" } as const;
const PANEL_PAGE: Record<keyof typeof PANEL_LABEL, Page> = { request: "requests", order: "orders", customer: "customers", employee: "employees" };

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function Popover({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("glass fade-in absolute top-full left-0 z-50 mt-2 rounded-xl border border-line-strong shadow-2xl", className)}>{children}</div>;
}

function RealtimeIndicator() {
  const status = useDashboard((s) => s.realtime);
  const origin = useDashboard((s) => s.origin);
  const map = {
    connected: { tone: "good", label: origin === "mock" ? "بث محاكاة" : "متصل مباشرة" },
    connecting: { tone: "warning", label: "جارٍ الاتصال" },
    disconnected: { tone: "critical", label: "انقطع الاتصال" },
    unavailable: { tone: "muted", label: "البث المباشر غير مُعد" },
    idle: { tone: "muted", label: "—" },
  } as const;
  const m = map[status];
  return (
    <span
      className="hidden items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[13px] text-ink-2 md:inline-flex"
      title={origin === "mock" ? "أحداث مُولّدة محليًا لعرض السلوك المباشر — ليست نشاطًا فعليًا" : "قناة Reverb"}
    >
      <Dot tone={m.tone} pulse={status === "connected"} />
      {m.label}
    </span>
  );
}

function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const now = useNow();
  const notes = useDashboard((s) => s.data?.notifications ?? []);
  const unread = notes.filter((n) => !n.read);
  const ref = useOutside(open, () => setOpen(false));
  const list = [...unread].sort((a, b) => ALERT_PRIORITY[a.priority].rank - ALERT_PRIORITY[b.priority].rank || b.at - a.at).slice(0, 6);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`التنبيهات، ${unread.length} غير مقروءة`} className="relative flex size-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-hover hover:text-ink">
        <Icon name="bell" size={18} />
        {unread.length > 0 && (
          <Changed value={unread.length}>
            {(changeCls) => <span className={cx("num absolute top-1 right-1 min-w-4 rounded-full bg-critical px-1 text-[11px] leading-4 font-bold text-[#fff]", changeCls)}>{unread.length > 9 ? "9+" : unread.length}</span>}
          </Changed>
        )}
      </button>
      {open && (
        <Popover className="w-[min(92vw,380px)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[14.5px] font-semibold">التنبيهات</p>
            {unread.length > 0 && (
              <button onClick={() => markNotificationsRead(unread.map((n) => n.id))} className="text-[13px] text-accent hover:underline">
                تعليم الكل كمقروء
              </button>
            )}
          </div>
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-[14px] text-ink-3">لا توجد تنبيهات جديدة</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto p-1.5">
              {list.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      markNotificationsRead([n.id]);
                      setOpen(false);
                      navigate(PANEL_PAGE[n.target.kind], { panel: `${n.target.kind}:${n.target.id}` });
                    }}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-right hover:bg-white/[0.04]"
                  >
                    <Dot tone={ALERT_PRIORITY[n.priority].tone} className="mt-1.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">{n.title}</span>
                      <span className="block truncate text-[13px] text-ink-3">{n.body}</span>
                    </span>
                    <span className="shrink-0 text-[12px] text-ink-3">{fmtRelative(n.at, now)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <a href={hrefFor("notifications")} onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-[13.5px] text-ink-2 hover:text-ink">
            مركز التنبيهات
          </a>
        </Popover>
      )}
    </div>
  );
}

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const origin = useDashboard((s) => s.origin);
  const user = useSession()?.user;
  const [leaving, setLeaving] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 rounded-lg p-1 pl-2 transition-colors hover:bg-hover" aria-label="قائمة الحساب">
        <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#c8a77a] to-[#7d6141] text-[12.5px] font-bold text-[#1a1208]">{initials(user?.name ?? "م")}</span>
        <Icon name="chevronDown" size={14} className="hidden text-ink-3 sm:block" />
      </button>
      {open && (
        <Popover className="w-60 p-1.5">
          <div className="px-3 py-2.5">
            <p className="truncate text-[14.5px] font-semibold">{user?.name ?? "حساب المالك"}</p>
            {user && (
              <p className="truncate text-[13px] text-ink-3" dir="ltr" style={{ textAlign: "right" }}>
                {user.email}
              </p>
            )}
          </div>
          <div className="my-1 border-t border-line" />
          <a href={hrefFor("settings")} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-ink-2 hover:bg-white/[0.04] hover:text-ink">
            <Icon name="settings" size={15} /> الإعدادات ومصدر البيانات
          </a>
          <a href={hrefFor("notifications")} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-ink-2 hover:bg-white/[0.04] hover:text-ink">
            <Icon name="bell" size={15} /> تفضيلات التنبيهات
          </a>
          <div className="my-1 border-t border-line" />
          <p className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-ink-3">
            <Icon name="database" size={13} /> المصدر: {origin === "mock" ? "بيانات تجريبية" : "واجهة وافي البرمجية"}
          </p>
          <div className="my-1 border-t border-line" />
          <button
            onClick={() => {
              setLeaving(true);
              void logout();
            }}
            disabled={leaving}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-critical hover:bg-critical/10 disabled:opacity-60"
          >
            <Icon name="logout" size={15} /> {leaving ? "جارٍ تسجيل الخروج…" : "تسجيل الخروج"}
          </button>
        </Popover>
      )}
    </div>
  );
}

export default function Topbar() {
  const { page, panel } = useRoute();
  const origin = useDashboard((s) => s.origin);
  const ready = useDashboard((s) => s.status === "ready");
  const [search, setSearch] = useState(false);
  const closeSearch = useCallback(() => setSearch(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="glass sticky top-0 z-30 border-b border-line">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a href={hrefFor("overview")} className="shrink-0 lg:hidden">
          <LogoMark size={30} />
        </a>
        <nav aria-label="مسار التنقل" className="min-w-0 flex-1">
          <ol className="flex items-center gap-1.5 text-[14px] text-ink-3">
            <li className="hidden sm:block">
              <a href={hrefFor("overview")} className="hover:text-ink-2">
                {BRAND_NAME}
              </a>
            </li>
            <li className="hidden sm:block" aria-hidden>
              <Icon name="chevron" size={13} />
            </li>
            <li className={cx("truncate", panel ? "text-ink-2" : "font-medium text-ink")}>{pageLabel(page)}</li>
            {panel && (
              <>
                <li aria-hidden>
                  <Icon name="chevron" size={13} />
                </li>
                <li className="truncate font-medium text-ink">{PANEL_LABEL[panel.kind]}</li>
              </>
            )}
          </ol>
        </nav>

        {origin === "mock" && (
          <span className="hidden sm:block" title="لا تمثل هذه البيانات نشاط الشركة الفعلي. فعّل مصدر الواجهة البرمجية من الإعدادات.">
            <DemoTag />
          </span>
        )}
        <RealtimeIndicator />
        {ready && (
          <button onClick={() => setSearch(true)} className="flex items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-2.5 py-1.5 text-[13.5px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 sm:min-w-52" aria-label="بحث شامل">
            <Icon name="search" size={15} />
            <span className="hidden flex-1 text-right sm:block">بحث شامل…</span>
            <kbd className="hidden rounded border border-line px-1 text-[11.5px] sm:block">Ctrl K</kbd>
          </button>
        )}
        {ready && <NotificationsMenu />}
        <ProfileMenu />
      </div>
      {ready && search && <GlobalSearch onClose={closeSearch} />}
    </header>
  );
}
