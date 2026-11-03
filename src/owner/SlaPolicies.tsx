import { useState } from "react";
import { fmtInt } from "../lib/format";
import { Button, Card, CardHeader, Select, Skeleton } from "../ui/primitives";
import { cx } from "../ui/tone";
import { api, isMissingRoute } from "./api";
import { NotDeployed, Note, QueryError } from "./parts";
import { SERVICE, SERVICES, STATUS_NAME } from "./services";
import type { ServiceKey, SlaPolicy } from "./types";
import { useQuery } from "./useQuery";

// Owner-editable SLA thresholds (PUT /sla-policies upserts by service + status). These drive the
// `sla` on every ticket and the "SLA breach" alert, so a save invalidates both caches.

type Draft = { service: ServiceKey; status: string; hours: string; label: string };
const keyOf = (p: { service: string; status: string }) => `${p.service}|${p.status}`;
const validHours = (h: string) => /^\d+$/.test(h) && +h >= 1 && +h <= 8760;
const statusName = (s: string) => (s === "" ? "أي حالة (افتراضي الخدمة)" : (STATUS_NAME[s] ?? s));

const inputCls = "rounded-lg border border-line bg-white/[0.02] px-2.5 py-1.5 text-[12.5px] text-ink focus:border-accent/40 focus:outline-none";

export default function SlaPolicies() {
  const q = useQuery("sla-policies", (force) => api.slaPolicies(force));
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<Draft[]>([]);
  const [draft, setDraft] = useState<Draft>({ service: "customer_support", status: "", hours: "", label: "" });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const policies = q.data?.data ?? [];
  const existing = new Set(policies.map(keyOf));
  const changed = policies.filter((p) => edits[keyOf(p)] !== undefined && edits[keyOf(p)] !== String(p.hours));
  const invalid = [...changed.map((p) => edits[keyOf(p)]), ...added.map((a) => a.hours)].some((h) => !validHours(h));
  const dirty = changed.length + added.length > 0;

  const grouped = SERVICES.map((s) => ({ meta: s, rows: policies.filter((p) => p.service === s.key).sort((a, b) => (a.status === "" ? -1 : b.status === "" ? 1 : 0)) })).filter((g) => g.rows.length);
  const draftStatuses = SERVICE[draft.service].statuses;
  const draftTaken = existing.has(keyOf(draft)) || added.some((a) => keyOf(a) === keyOf(draft));

  async function save() {
    setSaving(true);
    setResult(null);
    try {
      await api.saveSlaPolicies([
        ...changed.map((p) => ({ service: p.service, status: p.status, hours: +edits[keyOf(p)] })),
        ...added.map((a) => ({ service: a.service, status: a.status, hours: +a.hours, ...(a.label.trim() ? { label: a.label.trim() } : {}) })),
      ]);
      setEdits({});
      setAdded([]);
      setResult({ ok: true, text: "تم الحفظ — المهل والتنبيهات تُحسب بالقيم الجديدة الآن." });
      q.reload();
    } catch (e) {
      setResult({ ok: false, text: `تعذّر الحفظ: ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  }

  const row = (p: SlaPolicy) => {
    const k = keyOf(p);
    const v = edits[k] ?? String(p.hours);
    return (
      <li key={k} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <span className="min-w-0">
          <span className="block text-[12.5px] text-ink">{statusName(p.status)}</span>
          {p.label && <span className="block text-[11px] text-ink-3">{p.label}</span>}
        </span>
        <label className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <input
            type="number"
            min={1}
            max={8760}
            dir="ltr"
            value={v}
            onChange={(e) => setEdits((m) => ({ ...m, [k]: e.target.value }))}
            aria-label={`عدد الساعات · ${statusName(p.status)}`}
            className={cx(inputCls, "num w-20 text-center", !validHours(v) && "border-critical/60", v !== String(p.hours) && "border-accent/50")}
          />
          ساعة
        </label>
      </li>
    );
  };

  return (
    <Card className="xl:col-span-2">
      <CardHeader icon="clock" title="مهلة الطلبات (SLA)" subtitle="كم ساعة يُسمح للطلب أن يبقى في حالته قبل اعتباره متأخرًا" />
      <div className="space-y-4 px-5 pb-5">
        {q.error && !q.data && isMissingRoute(q.error) ? (
          <NotDeployed what="تعديل المهل" endpoint="GET /sla-policies" />
        ) : q.error && !q.data ? (
          <QueryError error={q.error} onRetry={q.reload} what="سياسات المهلة" />
        ) : !q.data ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {grouped.map(({ meta, rows }) => (
                <div key={meta.key}>
                  <p className="mb-1.5 text-[11.5px] font-medium text-ink-3">{meta.label}</p>
                  <ul className="divide-y divide-line rounded-lg border border-line">{rows.map(row)}</ul>
                </div>
              ))}
            </div>

            {added.length > 0 && (
              <ul className="divide-y divide-line rounded-lg border border-dashed border-accent/40">
                {added.map((a, i) => (
                  <li key={keyOf(a)} className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px]">
                    <span>
                      <span className="text-ink">{SERVICE[a.service].label}</span> · <span className="text-ink-2">{statusName(a.status)}</span>
                      {a.label && <span className="text-ink-3"> · {a.label}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="num text-ink">{fmtInt(+a.hours)} ساعة</span>
                      <button onClick={() => setAdded((xs) => xs.filter((_, j) => j !== i))} className="text-[11.5px] text-ink-3 hover:text-critical">
                        إزالة
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-lg border border-line p-3">
              <p className="mb-2 text-[11.5px] font-medium text-ink-3">إضافة مهلة</p>
              <div className="flex flex-wrap items-end gap-2">
                <Select label="الخدمة" value={draft.service} onChange={(v) => setDraft({ ...draft, service: v, status: "" })} options={SERVICES.filter((s) => s.statuses !== null).map((s) => ({ value: s.key, label: s.label }))} />
                {Array.isArray(draftStatuses) ? (
                  <Select label="الحالة" value={draft.status || "*"} onChange={(v) => setDraft({ ...draft, status: v === "*" ? "" : v })} options={[{ value: "*", label: statusName("") }, ...draftStatuses.map((s) => ({ value: s, label: statusName(s) }))]} />
                ) : (
                  <input value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value.trim() })} placeholder="رمز الحالة (فارغ = أي حالة)" dir="ltr" aria-label="رمز الحالة" className={cx(inputCls, "w-48")} />
                )}
                <input type="number" min={1} max={8760} dir="ltr" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} placeholder="ساعات" aria-label="عدد الساعات" className={cx(inputCls, "num w-24 text-center")} />
                <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="وصف (اختياري)" aria-label="وصف المهلة" className={cx(inputCls, "w-52")} />
                <Button
                  variant="outline"
                  disabled={!validHours(draft.hours) || draftTaken}
                  onClick={() => {
                    setAdded((xs) => [...xs, draft]);
                    setDraft({ ...draft, hours: "", label: "" });
                  }}
                >
                  إضافة
                </Button>
              </div>
              {draftTaken && draft.hours && <p className="mt-2 text-[11.5px] text-ink-3">توجد مهلة لهذه الخدمة والحالة — عدّل ساعاتها من القائمة أعلاه.</p>}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="solid" disabled={!dirty || invalid || saving} onClick={() => void save()}>
                {saving ? "جارٍ الحفظ…" : dirty ? `حفظ ${fmtInt(changed.length + added.length)} تغيير` : "لا تغييرات"}
              </Button>
              {dirty && !saving && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEdits({});
                    setAdded([]);
                  }}
                >
                  تراجع
                </Button>
              )}
              {invalid && <span className="text-[11.5px] text-critical">الساعات بين 1 و 8760.</span>}
              {result && <span className={cx("text-[12px]", result.ok ? "text-good" : "text-critical")}>{result.text}</span>}
            </div>

            <Note>
              «أي حالة» هي المهلة الافتراضية للخدمة، وتُستخدم حين لا توجد مهلة لحالة الطلب بعينها. يُحسب الوقت من <b className="text-ink">آخر إجراء مسجّل</b> على الطلب (أو إنشائه)، وهو تقدير قريب لوقت الدخول في الحالة وليس دقيقًا تمامًا. الضمان بلا حالة فلا يمكن تحديد مهلة له.
            </Note>
          </>
        )}
      </div>
    </Card>
  );
}
