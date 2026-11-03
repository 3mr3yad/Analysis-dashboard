import { loadDashboard } from "../state/store";
import EffectsCard from "../ui/EffectsCard";
import { PageHeader } from "../ui/page";
import { Button, Card, CardHeader, DemoTag } from "../ui/primitives";

export default function Settings() {
  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="مصدر البيانات وتفضيلات العرض." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader icon="database" title="مصدر البيانات" action={<DemoTag />} />
          <div className="space-y-4 px-5 pb-5 text-[12.5px] leading-relaxed text-ink-2">
            <p>
              هذه <b className="text-warning">نسخة العرض التجريبي</b>: كل الأرقام وحالات الحضور والأحداث المباشرة مولّدة محليًا ولا تمثل نشاط الشركة الفعلي.
            </p>
            <p className="text-[11.5px] text-ink-3">
              تعمل هذه النسخة فقط عند ضبط <code className="num text-ink-2">VITE_DATA_SOURCE=mock</code>. احذف هذا المتغير لتشغيل لوحة المالك المتصلة بواجهة وافي البرمجية.
            </p>
            <Button variant="outline" icon="refresh" onClick={() => loadDashboard()}>
              إعادة توليد البيانات
            </Button>
          </div>
        </Card>
        <EffectsCard />
      </div>
    </div>
  );
}
