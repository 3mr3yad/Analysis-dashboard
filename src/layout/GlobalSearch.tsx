import { useEffect, useMemo, useRef, useState } from "react";
import { SERVICE } from "../domain/labels";
import type { EntityRef } from "../domain/types";
import { useData } from "../state/indexes";
import { navigate, type Page } from "../state/router";
import Icon, { type IconName } from "../ui/Icon";
import { cx } from "../ui/tone";
import { NAV } from "./nav";

interface Hit {
  key: string;
  icon: IconName;
  title: string;
  sub: string;
  group: string;
  go: () => void;
}

const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");

/** Command palette (Ctrl/⌘ K): customers, requests, orders, employees and pages. */
export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { data, ix } = useData();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const term = norm(q.trim());
    const go = (page: Page, ref: EntityRef) => () => {
      navigate(page, { panel: `${ref.kind}:${ref.id}` });
      onClose();
    };
    const pages: Hit[] = NAV.filter((n) => !term || norm(n.label).includes(term)).map((n) => ({
      key: `p-${n.page}`,
      icon: n.icon,
      title: n.label,
      sub: "انتقال",
      group: "الأقسام",
      go: () => {
        navigate(n.page);
        onClose();
      },
    }));
    if (!term) return pages;
    const out: Hit[] = [];
    for (const c of data.customers) {
      if (out.length >= 6) break;
      if (norm(c.name).includes(term) || c.code.toLowerCase().includes(term) || c.phone.includes(term))
        out.push({ key: c.id, icon: "customers", title: c.name, sub: `${c.code} · ${c.city}`, group: "العملاء", go: go("customers", { kind: "customer", id: c.id }) });
    }
    let n = 0;
    for (let i = data.requests.length - 1; i >= 0 && n < 6; i--) {
      const r = data.requests[i];
      if (r.code.toLowerCase().includes(term) || norm(ix.customer.get(r.customerId)?.name ?? "").includes(term)) {
        out.push({ key: r.id, icon: "requests", title: r.code, sub: `${SERVICE[r.type].label} · ${ix.customer.get(r.customerId)?.name}`, group: "طلبات العملاء", go: go("requests", { kind: "request", id: r.id }) });
        n++;
      }
    }
    n = 0;
    for (let i = data.orders.length - 1; i >= 0 && n < 4; i--) {
      const o = data.orders[i];
      if (o.code.toLowerCase().includes(term)) {
        out.push({ key: o.id, icon: "orders", title: o.code, sub: ix.customer.get(o.customerId)?.name ?? "", group: "الطلبات الشرائية", go: go("orders", { kind: "order", id: o.id }) });
        n++;
      }
    }
    for (const e of data.employees) {
      if (norm(e.name).includes(term)) out.push({ key: e.id, icon: "employees", title: e.name, sub: e.title, group: "الموظفون", go: go("employees", { kind: "employee", id: e.id }) });
    }
    return [...out, ...pages.slice(0, 3)];
  }, [q, data, ix, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(hits.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter") hits[active]?.go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hits, active, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="بحث شامل">
      <div className="fade-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass drawer-in relative w-full max-w-xl overflow-hidden rounded-2xl border border-line-strong shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" size={17} className="text-ink-3" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="ابحث عن عميل، رقم طلب، طلب شرائي، أو موظف…"
            className="h-14 flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-3 focus:outline-none"
            aria-label="البحث"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-3">Esc</kbd>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
          {hits.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-ink-3">لا توجد نتائج مطابقة لـ «{q}»</li>}
          {hits.map((h, i) => {
            const header = i === 0 || hits[i - 1].group !== h.group ? h.group : null;
            return (
              <li key={h.key} role="option" aria-selected={i === active}>
                {header && <p className="px-3 pt-3 pb-1 text-[10.5px] font-medium text-ink-3">{header}</p>}
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={h.go}
                  className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right", i === active ? "bg-white/[0.06]" : "")}
                >
                  <Icon name={h.icon} size={16} className="text-ink-3" />
                  <span className="flex-1 truncate text-[13px] text-ink">{h.title}</span>
                  <span className="truncate text-[11.5px] text-ink-3">{h.sub}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

