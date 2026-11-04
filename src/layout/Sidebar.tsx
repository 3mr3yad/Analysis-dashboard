import { AnimateIcon } from "@animate-ui/react/icons";
import { useState } from "react";
import { useDashboard } from "../state/store";
import { hrefFor, useRoute } from "../state/router";
import Icon from "../ui/Icon";
import { Changed } from "../ui/Changed";
import { Logo, LogoMark } from "../ui/Logo";
import { cx } from "../ui/tone";
import { NAV } from "./nav";

const KEY = "ceo.sidebar.collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

const GROUPS = { main: "القيادة", manage: "الإدارة", system: "النظام" } as const;

export default function Sidebar() {
  const { page } = useRoute();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const unread = useDashboard((s) => s.data?.notifications.filter((n) => !n.read).length ?? 0);
  const overdue = useDashboard((s) => {
    const now = Date.now();
    return s.data?.requests.filter((r) => r.dueAt < now && !["completed", "closed", "rejected", "cancelled"].includes(r.status)).length ?? 0;
  });

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  const badges: Partial<Record<string, number>> = { notifications: unread, requests: overdue };

  return (
    <aside
      className={cx(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-l border-line bg-surface/70 backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
      aria-label="التنقل الرئيسي"
    >
      <div className={cx("flex h-16 items-center gap-3 px-5", collapsed && "justify-center px-0")}>
        {collapsed ? (
          <LogoMark size={34} />
        ) : (
          <div className="flex flex-col items-start gap-1">
            <Logo height={24} className="text-ink" />
            <p className="text-[12px] tracking-wide text-ink-3">مركز القيادة التنفيذي</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-2">
        {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((g) => (
          <div key={g} className="mb-4">
            {!collapsed && <p className="mb-1.5 px-3 text-[12px] font-medium tracking-wider text-ink-3/80">{GROUPS[g]}</p>}
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = n.page === page;
                const badge = badges[n.page];
                return (
                  <li key={n.page}>
                    <AnimateIcon animateOnHover asChild>
                      <a
                        href={hrefFor(n.page)}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? n.label : undefined}
                        className={cx(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[14.5px] transition-colors duration-150",
                          collapsed && "justify-center px-0",
                          active ? "bg-white/[0.06] text-ink" : "text-ink-3 hover:bg-white/[0.03] hover:text-ink-2",
                        )}
                      >
                        {active && <span className="absolute top-1.5 bottom-1.5 right-0 w-[2px] rounded-full bg-accent shadow-[0_0_12px_rgb(143_179_255/0.8)]" />}
                        <Icon name={n.icon} size={17} className={cx(active ? "text-accent" : "text-ink-3 group-hover:text-ink-2")} />
                        {!collapsed && <span className="flex-1 truncate">{n.label}</span>}
                        {!!badge && (
                          <Changed value={badge}>
                            {(changeCls) => (
                          <span
                            className={cx(
                              "num rounded-full px-1.5 text-[11.5px] leading-[18px] font-semibold",
                              changeCls,
                              n.page === "requests" ? "bg-critical/15 text-critical" : "bg-accent/15 text-accent",
                              collapsed && "absolute top-0.5 left-2 min-w-[18px] text-center",
                            )}
                          >
                            {badge > 99 ? "99+" : badge}
                          </span>
                            )}
                          </Changed>
                        )}
                      </a>
                    </AnimateIcon>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <button
          onClick={toggle}
          className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-ink-3 transition-colors hover:bg-white/[0.03] hover:text-ink-2", collapsed && "justify-center px-0")}
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          <Icon name="collapse" size={17} className={cx("transition-transform duration-300", collapsed && "rotate-180")} />
          {!collapsed && "طي القائمة"}
        </button>
      </div>
    </aside>
  );
}
