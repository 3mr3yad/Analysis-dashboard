import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { initials } from "../lib/format";
import { logout, useSession } from "../state/auth";
import Icon from "../ui/Icon";
import { Logo, LogoMark } from "../ui/Logo";
import { cx } from "../ui/tone";
import { OWNER_NAV } from "./nav";
import { markRead, PRIORITY, useNotifications } from "./notifications";
import { When } from "./parts";
import TicketDrawer, { type TicketRef } from "./TicketDrawer";
import { useSelection } from "./useSelection";
import { Changed } from "../ui/Changed";
import InstallButton from "../ui/InstallButton";
import { Dot } from "../ui/primitives";
import { hrefTo, useOwnerRoute } from "./router";


function Sidebar() {
  const { page } = useOwnerRoute();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col glass border-l border-white/[0.07] lg:flex" aria-label="التنقل الرئيسي">
      <a href={hrefTo("overview")} className="flex h-16 flex-col items-start justify-center gap-1 px-5">
        <Logo height={24} className="text-ink" />
        <span className="text-[10.5px] tracking-wide text-ink-3">لوحة المالك</span>
      </a>
      <nav className="flex-1 px-3 pt-3">
        <ul className="space-y-0.5">
          {OWNER_NAV.map((n) => {
            const active = n.page === page;
            return (
              <li key={n.page}>
                <AnimateIcon animateOnHover asChild>
                  <a
                    href={hrefTo(n.page)}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors duration-150",
                      active ? "bg-white/[0.06] text-ink" : "text-ink-3 hover:bg-white/[0.03] hover:text-ink-2",
                    )}
                  >
                    {active && <span className="absolute top-1.5 right-0 bottom-1.5 w-[2px] rounded-full bg-accent shadow-[0_0_12px_rgb(143_179_255/0.8)]" />}
                    <Icon name={n.icon} size={17} className={active ? "text-accent" : "text-ink-3 group-hover:text-ink-2"} />
                    <span className="truncate">{n.label}</span>
                  </a>
                </AnimateIcon>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="px-5 pb-5 text-[10.5px] leading-relaxed text-ink-3">بيانات حيّة من واجهة وافي البرمجية</p>
    </aside>
  );
}

/** Popover state that closes on outside click and Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function Bell() {
  const { open, setOpen, ref } = usePopover();
  const q = useNotifications();
  const [ticket, setTicket, closeTicket] = useSelection<TicketRef>();
  const unread = (q.data?.data ?? []).filter((n) => !n.read).sort((a, b) => PRIORITY[a.priority].rank - PRIORITY[b.priority].rank || Date.parse(b.at) - Date.parse(a.at));
  const count = unread.length;

  return (
    <div ref={ref} className="relative">
      <Changed value={count}>
        {(cls) => (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={count ? `التنبيهات، ${count} غير مقروء` : "التنبيهات"}
            className={cx("relative rounded-lg border border-transparent p-2 text-ink-3 transition-colors hover:bg-hover hover:text-ink", cls)}
          >
            <Icon name="bell" size={18} />
            {count > 0 && (
              <span className="num absolute -top-0.5 -left-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        )}
      </Changed>
      {open && (
        <div className="fade-in absolute top-full left-0 z-50 mt-2 w-[min(360px,calc(100vw-32px))] glass-pop rounded-xl border border-white/10">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">التنبيهات</p>
            {count > 0 && (
              <button onClick={() => void markRead(unread.map((n) => n.id))} className="text-[11.5px] text-ink-3 hover:text-accent">
                تعليم الكل كمقروء
              </button>
            )}
          </div>
          <ul className="max-h-[360px] overflow-y-auto p-1.5">
            {q.error && !q.data ? (
              <li className="px-3 py-6 text-center text-[12px] text-ink-3">تعذّر تحميل التنبيهات.</li>
            ) : !q.data ? (
              <li className="px-3 py-6 text-center text-[12px] text-ink-3">جارٍ التحميل…</li>
            ) : count === 0 ? (
              <li className="px-3 py-6 text-center text-[12px] text-ink-3">لا توجد تنبيهات غير مقروءة.</li>
            ) : (
              unread.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      void markRead([n.id]);
                      if (n.target) {
                        setTicket(n.target);
                        setOpen(false);
                      }
                    }}
                    className="flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-right hover:bg-white/[0.04]"
                  >
                    <Dot tone={PRIORITY[n.priority].tone} className="mt-1.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium text-ink">{n.title}</span>
                      <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{n.detail}</span>
                      <span className="mt-1 block text-[11px] text-ink-3">
                        {PRIORITY[n.priority].label} · <When iso={n.at} />
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <a href={hrefTo("alerts")} onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-[12px] text-ink-2 hover:text-accent">
            كل التنبيهات
          </a>
        </div>
      )}
      <TicketDrawer ticket={ticket} onClose={closeTicket} />
    </div>
  );
}

function AccountMenu() {
  const user = useSession()?.user;
  const { open, setOpen, ref } = usePopover();
  const [leaving, setLeaving] = useState(false);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="قائمة الحساب" className="flex items-center gap-2 rounded-lg p-1 pl-2 transition-colors hover:bg-hover">
        <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#c8a77a] to-[#7d6141] text-[11px] font-bold text-[#1a1208]">{initials(user?.name ?? "؟")}</span>
        <span className="hidden max-w-[140px] truncate text-[12.5px] text-ink-2 sm:block">{user?.name}</span>
        <Icon name="chevronDown" size={14} className="hidden text-ink-3 sm:block" />
      </button>
      {open && (
        <div className="glass-pop fade-in absolute top-full left-0 z-50 mt-2 w-64 rounded-xl border border-white/10 p-1.5">
          <div className="px-3 py-2.5">
            <p className="truncate text-[13px] font-semibold">{user?.name}</p>
            <p className="truncate text-[11.5px] text-ink-3" dir="ltr" style={{ textAlign: "right" }}>
              {user?.email}
            </p>
          </div>
          <div className="my-1 border-t border-line" />
          <a href={hrefTo("settings")} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-ink-2 hover:bg-white/[0.04] hover:text-ink">
            <Icon name="settings" size={15} /> الإعدادات
          </a>
          <button
            onClick={() => {
              setLeaving(true);
              void logout();
            }}
            disabled={leaving}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-critical hover:bg-critical/10 disabled:opacity-60"
          >
            <Icon name="logout" size={15} /> {leaving ? "جارٍ تسجيل الخروج…" : "تسجيل الخروج"}
          </button>
        </div>
      )}
    </div>
  );
}

function Topbar() {
  const { page } = useOwnerRoute();
  const label = OWNER_NAV.find((n) => n.page === page)?.label;
  return (
    <header className="glass sticky top-0 z-30 border-b border-line">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a href={hrefTo("overview")} className="shrink-0 lg:hidden" aria-label="النظرة العامة">
          <LogoMark size={30} />
        </a>
        <nav aria-label="مسار التنقل" className="min-w-0 flex-1">
          <ol className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
            <li className="hidden sm:block">لوحة المالك</li>
            <li className="hidden sm:block" aria-hidden>
              <Icon name="chevron" size={13} />
            </li>
            <li className="truncate font-medium text-ink">{label}</li>
          </ol>
        </nav>
        <InstallButton />
        <Bell />
        <AccountMenu />
      </div>
    </header>
  );
}

function MobileNav() {
  const { page } = useOwnerRoute();
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="التنقل">
      <ul className="grid grid-cols-5">
        {OWNER_NAV.filter((n) => n.mobile).map((n) => {
          const active = n.page === page;
          return (
            <li key={n.page}>
              <AnimateIcon animateOnTap asChild>
                <a href={hrefTo(n.page)} aria-current={active ? "page" : undefined} className={cx("flex flex-col items-center gap-1 py-2.5 text-[10.5px]", active ? "text-ink" : "text-ink-3")}>
                  <Icon name={n.icon} size={19} className={active ? "text-accent" : undefined} />
                  {n.short}
                </a>
              </AnimateIcon>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
