import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimateIcon } from "@animate-ui/react/icons";
import { installPlatform, promptInstall, useInstallState, type InstallPlatform } from "../pwa";
import Icon from "./Icon";
import { cx } from "./tone";

// "Install as an app" — one prominent button in the top bar. Where the browser offers its own
// install dialog (Chrome, Edge, Android) the button opens it directly; elsewhere (iPhone, Safari,
// Firefox) it opens step-by-step instructions for that device.

const STEPS: Record<InstallPlatform, { title: string; steps: ReactNode[] }> = {
  ios: {
    title: "على الآيفون والآيباد",
    steps: [
      <>
        افتح اللوحة في <b className="text-ink">Safari</b>.
      </>,
      <>
        اضغط زر <b className="text-ink">المشاركة</b> (مربع وسهم لأعلى) أسفل الشاشة.
      </>,
      <>
        اختر <b className="text-ink">«إضافة إلى الشاشة الرئيسية»</b> ثم <b className="text-ink">«إضافة»</b>.
      </>,
    ],
  },
  android: {
    title: "على أندرويد",
    steps: [
      <>
        افتح اللوحة في <b className="text-ink">Chrome</b>.
      </>,
      <>
        اضغط القائمة <b className="text-ink">⋮</b> أعلى الشاشة.
      </>,
      <>
        اختر <b className="text-ink">«تثبيت التطبيق»</b> أو <b className="text-ink">«إضافة إلى الشاشة الرئيسية»</b>.
      </>,
    ],
  },
  desktop: {
    title: "على الكمبيوتر (Chrome أو Edge)",
    steps: [
      <>
        اضغط أيقونة <b className="text-ink">التثبيت</b> في نهاية شريط العنوان، أو افتح قائمة المتصفح <b className="text-ink">⋮</b>.
      </>,
      <>
        في Chrome: <b className="text-ink">«حفظ ومشاركة» ← «تثبيت الصفحة كتطبيق»</b>. في Edge: <b className="text-ink">«التطبيقات» ← «تثبيت هذا الموقع كتطبيق»</b>.
      </>,
      <>تظهر أيقونة وافي على سطح المكتب وفي قائمة البرامج.</>,
    ],
  },
  "safari-mac": {
    title: "على Mac (Safari)",
    steps: [
      <>
        من قائمة <b className="text-ink">«ملف»</b> اختر <b className="text-ink">«إضافة إلى Dock»</b>.
      </>,
      <>
        اضغط <b className="text-ink">«إضافة»</b> — تظهر أيقونة وافي في الـ Dock.
      </>,
    ],
  },
  "firefox-desktop": {
    title: "على الكمبيوتر (Firefox)",
    steps: [
      <>
        Firefox على الكمبيوتر لا يدعم تثبيت التطبيقات. افتح اللوحة في <b className="text-ink">Chrome</b> أو <b className="text-ink">Edge</b> واضغط زر التثبيت.
      </>,
    ],
  },
};

function Steps({ platform }: { platform: InstallPlatform }) {
  const s = STEPS[platform];
  return (
    <div>
      <p className="mb-2 text-[14px] font-semibold text-ink">{s.title}</p>
      <ol className="space-y-2">
        {s.steps.map((step, i) => (
          <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-2">
            <span className="num mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[12.5px] font-semibold text-accent">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Instructions for this device first, then every other device under a fold. */
export function InstallGuide() {
  const mine = installPlatform();
  const others = (Object.keys(STEPS) as InstallPlatform[]).filter((p) => p !== mine && p !== "firefox-desktop");
  return (
    <div className="space-y-4">
      <Steps platform={mine} />
      <details className="group rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5">
        <summary className="cursor-pointer list-none text-[13.5px] text-ink-3 select-none hover:text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="chevronDown" size={13} className="transition-transform group-open:rotate-180" animateOnHover={false} />
            على أجهزة أخرى
          </span>
        </summary>
        <div className="mt-3 space-y-4">
          {others.map((p) => (
            <Steps key={p} platform={p} />
          ))}
        </div>
      </details>
    </div>
  );
}

function GuideDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Portalled: the top bar's backdrop-filter would otherwise trap this fixed overlay inside it.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="تثبيت التطبيق">
      <div className="fade-in absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={onClose} />
      <div className="glass-pop drawer-in relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 p-5 sm:p-6">
        <button onClick={onClose} aria-label="إغلاق" className="absolute top-3 left-3 flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-hover hover:text-ink">
          <Icon name="close" size={16} />
        </button>
        <div className="mb-5 flex items-center gap-3 pl-8">
          <img src="/icons/icon-192.png" alt="" className="size-12 rounded-xl shadow-[0_0_24px_-6px_rgb(1_185_245/0.6)]" />
          <div>
            <h2 className="text-[17.5px] font-semibold text-ink">ثبّت وافي كتطبيق</h2>
            <p className="mt-0.5 text-[13.5px] text-ink-3">نافذة مستقلة وأيقونة على جهازك، بدون شريط المتصفح.</p>
          </div>
        </div>
        <InstallGuide />
        <p className="mt-4 text-[13px] text-ink-3">البيانات تبقى حيّة من الخادم دائمًا؛ التطبيق لا يحفظ بيانات العملاء على الجهاز.</p>
      </div>
    </div>,
    document.body,
  );
}

/** Prominent top-bar button; hidden once the app is installed (or opened as the installed app). */
export default function InstallButton({ className }: { className?: string }) {
  const state = useInstallState();
  const [guide, setGuide] = useState(false);
  if (state === "installed") return null;
  return (
    <>
      <AnimateIcon animateOnHover asChild>
        <button
          onClick={() => {
            if (state !== "available") return setGuide(true);
            void promptInstall().then((r) => r === "failed" && setGuide(true));
          }}
          className={cx("install-btn relative inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[14px] font-medium text-ink", className)}
          title="تثبيت لوحة وافي كتطبيق على جهازك"
        >
          <Icon name="download" size={15} className="text-accent" />
          <span className="sm:hidden">تثبيت</span>
          <span className="hidden sm:inline">تثبيت التطبيق</span>
        </button>
      </AnimateIcon>
      {guide && <GuideDialog onClose={() => setGuide(false)} />}
    </>
  );
}
