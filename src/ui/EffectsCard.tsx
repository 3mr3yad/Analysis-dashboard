import { setMotionPref, useMotionPref } from "../state/prefs";
import { Card, CardHeader } from "./primitives";
import { cx } from "./tone";

/** Visual-effects preference (Three.js background, animated icons), shared by both settings pages. */
export default function EffectsCard() {
  const effects = useMotionPref();
  return (
    <Card>
      <CardHeader icon="sparkle" title="التأثيرات البصرية" subtitle="الخلفية ثلاثية الأبعاد وحركة الأيقونات" />
      <div className="px-5 pb-5">
        <div role="radiogroup" aria-label="التأثيرات البصرية" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              ["auto", "تلقائي", "يتبع إعداد «تقليل الحركة» في نظامك"],
              ["on", "مفعّلة", "خلفية حيّة خفيفة"],
              ["off", "متوقفة", "أداء أقصى وبطارية أطول"],
            ] as const
          ).map(([v, label, hint]) => (
            <button
              key={v}
              role="radio"
              aria-checked={effects === v}
              onClick={() => setMotionPref(v)}
              className={cx("rounded-xl border p-3 text-right transition-colors", effects === v ? "border-accent/40 bg-accent-soft" : "border-line hover:border-line-strong")}
            >
              <span className="block text-[14px] font-medium text-ink">{label}</span>
              <span className="mt-0.5 block text-[12.5px] text-ink-3">{hint}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
