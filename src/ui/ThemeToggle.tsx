import { setTheme, useTheme } from "../state/theme";
import { cx } from "./tone";

/** Sun / moon switch for the top bar. The icon shows the mode you'd switch to. */
export default function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const label = next === "light" ? "الوضع الفاتح" : "الوضع الداكن";
  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={cx("group relative rounded-lg border border-transparent p-2 text-ink-3 transition-colors hover:bg-hover hover:text-ink", className)}
    >
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform duration-500 ease-out group-hover:rotate-[20deg]">
        {next === "light" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        ) : (
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        )}
      </svg>
    </button>
  );
}
