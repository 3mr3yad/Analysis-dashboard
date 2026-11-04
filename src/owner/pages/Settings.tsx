import { useState } from "react";
import { logout, useSession } from "../../state/auth";
import EffectsCard from "../../ui/EffectsCard";
import InstallCard from "../../ui/InstallCard";
import { PageHeader } from "../../ui/page";
import { Button, Card, CardHeader } from "../../ui/primitives";
import { SERVICES } from "../services";
import SlaPolicies from "../SlaPolicies";

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://wafii.sa/wafiservices/api/v1 (عبر وكيل التطوير /api)";

export default function Settings() {
  const user = useSession()?.user;
  const [leaving, setLeaving] = useState(false);
  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="الحساب، ومهل الطلبات، ومصدر البيانات، وتفضيلات العرض." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader icon="users" title="الحساب" />
          <div className="space-y-3 px-5 pb-5 text-[12.5px]">
            <p className="text-ink">{user?.name}</p>
            <p dir="ltr" className="text-right text-ink-3">
              {user?.email}
            </p>
            <Button
              variant="outline"
              icon="logout"
              disabled={leaving}
              onClick={() => {
                setLeaving(true);
                void logout();
              }}
            >
              {leaving ? "جارٍ تسجيل الخروج…" : "تسجيل الخروج وإلغاء الرمز"}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader icon="database" title="مصدر البيانات" subtitle="واجهة لوحة المالك" />
          <div className="space-y-3 px-5 pb-5 text-[12.5px] leading-relaxed text-ink-2">
            <p dir="ltr" className="num text-right text-[11.5px] break-all text-ink-3">
              {API_BASE}
            </p>
            <p>اللوحة تقرأ فقط، عدا تعليم التنبيهات كمقروءة وتعديل مهل الطلبات. تتحدّث النظرة العامة وسجل النشاط كل دقيقة، والمتصلون كل 20 ثانية، أثناء فتح الصفحة والطلبات عند تغيير الفلاتر. تبقى اللوحة تحت 100 طلب في الدقيقة (حدّ الخادم 120).</p>
            <div>
              <p className="mb-2 text-[11.5px] font-medium text-ink-3">ما تسجّله كل خدمة</p>
              <ul className="divide-y divide-line rounded-lg border border-line text-[11.5px]">
                {SERVICES.map((s) => (
                  <li key={s.key} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-ink">{s.label}</span>
                    <span className="text-ink-3">
                      {[s.trail ? (s.key === "payments" ? "سجل تلقائي" : "سجل نشاط") : null, s.tracksAssignee ? "الإسناد" : null, s.tracksCreator ? "المنشئ" : null, s.statuses ? "الحالة" : null, s.admin ? "شاشة إدارة" : null].filter(Boolean).join(" · ") || "التاريخ فقط"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <SlaPolicies />

        <EffectsCard />
        <InstallCard />
      </div>
    </div>
  );
}
