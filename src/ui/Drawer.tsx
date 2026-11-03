import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

/** Side panel anchored to the inline-end edge (left in RTL). Esc and backdrop close it. */
export default function Drawer({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  // Portalled to <body> so a transformed or backdrop-filtered ancestor (page transition, glass header) can't become its containing block.
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
      <div className="fade-in absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className="drawer-in glass-pop absolute inset-y-0 left-0 flex w-full max-w-[560px] flex-col border-r border-line-strong shadow-[24px_0_80px_-20px_rgb(0_0_0/0.8)] focus:outline-none"
      >
        <button
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute top-4 left-4 z-10 flex size-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-hover hover:text-ink"
        >
          <Icon name="close" size={16} />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
