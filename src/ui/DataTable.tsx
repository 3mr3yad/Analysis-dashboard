import { useMemo, useState, type ReactNode } from "react";
import Icon from "./Icon";
import { EmptyState } from "./primitives";
import { cx } from "./tone";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => number | string;
  className?: string;
  /** Hide below this breakpoint to keep tables readable on laptops. */
  hideBelow?: "lg" | "xl";
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  renderMobile: (row: T) => ReactNode;
  pageSize?: number;
  initialSort?: { key: string; dir: "asc" | "desc" };
  highlight?: Set<string>;
  emptyTitle?: string;
  emptyHint?: string;
  label: string;
}

const HIDE = { lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" };

export default function DataTable<T>({ columns, rows, rowKey, onRowClick, renderMobile, pageSize = 12, initialSort, highlight, emptyTitle = "لا توجد نتائج", emptyHint, label }: Props<T>) {
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!col?.sortValue || !sort) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    const sv = col.sortValue;
    return [...rows].sort((a, b) => {
      const x = sv(a);
      const y = sv(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }, [rows, columns, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggle = (key: string) => {
    setPage(0);
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  };

  if (!rows.length) return <EmptyState title={emptyTitle} hint={emptyHint} icon="filter" />;

  return (
    <div>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-[14.5px]" aria-label={label}>
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} scope="col" className={cx("px-4 py-2.5 text-right text-[13px] font-medium whitespace-nowrap text-ink-3", c.hideBelow && HIDE[c.hideBelow], c.className)} aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.sortValue ? (
                      <button onClick={() => toggle(c.key)} className={cx("inline-flex items-center gap-1 transition-colors hover:text-ink-2", active && "text-ink-2")}>
                        {c.header}
                        <Icon name={active ? "chevronDown" : "sort"} size={12} className={cx(active && sort!.dir === "asc" && "rotate-180", !active && "opacity-40")} />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const k = rowKey(row);
              return (
                <tr
                  key={k}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRowClick(row)) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cx("border-b border-line/60 transition-colors duration-150 last:border-0", onRowClick && "cursor-pointer hover:bg-white/[0.025] focus-visible:bg-white/[0.04]", highlight?.has(k) && "flash")}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cx("px-4 py-3 align-middle", c.hideBelow && HIDE[c.hideBelow], c.className)}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <ul className="divide-y divide-line md:hidden">
        {visible.map((row) => {
          const k = rowKey(row);
          return (
            <li key={k} className={cx(highlight?.has(k) && "flash")}>
              <button className="w-full px-4 py-3 text-right active:bg-white/[0.03]" onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {renderMobile(row)}
              </button>
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[13.5px] text-ink-3" aria-label="ترقيم الصفحات">
          <span className="num">
            {safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} من {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="flex size-7 items-center justify-center rounded-md hover:bg-hover disabled:opacity-30" aria-label="السابق">
              <Icon name="chevron" size={14} className="rotate-180" />
            </button>
            <span className="num px-2 text-ink-2">
              {safePage + 1} / {pages}
            </span>
            <button disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} className="flex size-7 items-center justify-center rounded-md hover:bg-hover disabled:opacity-30" aria-label="التالي">
              <Icon name="chevron" size={14} />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
