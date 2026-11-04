import { useState } from "react";
import { promptInstall, useInstallState } from "../pwa";
import { InstallGuide } from "./InstallButton";
import { Button, Card, CardHeader } from "./primitives";

/** Install the dashboard as an app on desktop or phone. */
export default function InstallCard() {
  const state = useInstallState();
  const [refused, setRefused] = useState(false);
  return (
    <Card>
      <CardHeader icon="download" title="تثبيت التطبيق" subtitle="افتح اللوحة كتطبيق مستقل على الكمبيوتر أو الجوال" />
      <div className="space-y-3 px-5 pb-5 text-[12.5px] leading-relaxed text-ink-2">
        {state === "installed" ? (
          <p className="text-good">اللوحة مثبّتة كتطبيق على هذا الجهاز.</p>
        ) : state === "available" && !refused ? (
          <>
            <p>تفتح في نافذتها الخاصة بدون شريط المتصفح، ولها أيقونة على سطح المكتب أو الشاشة الرئيسية.</p>
            <Button variant="solid" icon="download" onClick={() => void promptInstall().then((r) => r === "failed" && setRefused(true))}>
              تثبيت التطبيق
            </Button>
          </>
        ) : (
          <InstallGuide />
        )}
        <p className="text-[11.5px] text-ink-3">البيانات تبقى حيّة من الخادم دائمًا؛ التطبيق لا يحفظ بيانات العملاء على الجهاز.</p>
      </div>
    </Card>
  );
}
