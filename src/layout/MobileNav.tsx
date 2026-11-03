import { AnimateIcon } from "@animate-ui/react/icons";
import { useState } from "react";
import { hrefFor, useRoute, type Page } from "../state/router";
import Icon from "../ui/Icon";
import { cx } from "../ui/tone";
import { NAV } from "./nav";

const PRIMARY: Page[] = ["overview", "live", "requests", "notifications"];

/** Bottom navigation for phones: the four things an owner checks on the go, plus "more". */
export default function MobileNav() {
  const { page } = useRoute();
  const [more, setMore] = useState(false);
  const items = NAV.filter((n) => PRIMARY.includes(n.page));
  const rest = NAV.filter((n) => !PRIMARY.includes(n.page));
  const inRest = rest.some((n) => n.page === page);

  return (
    <>
      {more && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMore(false)}>
          <div className="fade-in absolute inset-0 bg-black/50" />
          <div className="glass drawer-in absolute inset-x-3 bottom-20 rounded-2xl border border-line-strong p-2" onClick={(e) => e.stopPropagation()}>
            {rest.map((n) => (
              <a key={n.page} href={hrefFor(n.page)} onClick={() => setMore(false)} className={cx("flex items-center gap-3 rounded-xl px-4 py-3 text-[14px]", n.page === page ? "bg-white/[0.06] text-ink" : "text-ink-2")}>
                <Icon name={n.icon} size={18} className={n.page === page ? "text-accent" : "text-ink-3"} />
                {n.label}
              </a>
            ))}
          </div>
        </div>
      )}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="التنقل">
        <ul className="grid grid-cols-5">
          {items.map((n) => {
            const active = n.page === page;
            return (
              <li key={n.page}>
                <AnimateIcon animateOnTap asChild>
                  <a href={hrefFor(n.page)} aria-current={active ? "page" : undefined} className={cx("flex flex-col items-center gap-1 py-2.5 text-[10.5px]", active ? "text-ink" : "text-ink-3")}>
                    <Icon name={n.icon} size={19} className={active ? "text-accent" : undefined} />
                    {n.short}
                  </a>
                </AnimateIcon>
              </li>
            );
          })}
          <li>
            <button onClick={() => setMore((m) => !m)} aria-expanded={more} className={cx("flex w-full flex-col items-center gap-1 py-2.5 text-[10.5px]", inRest || more ? "text-ink" : "text-ink-3")}>
              <Icon name="menu" size={19} className={inRest ? "text-accent" : undefined} />
              المزيد
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
