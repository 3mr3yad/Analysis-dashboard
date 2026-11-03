import { lazy, Suspense, useEffect } from "react";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { pageIndex } from "./layout/nav";
import MobileNav from "./layout/MobileNav";
import Sidebar from "./layout/Sidebar";
import Topbar from "./layout/Topbar";
import PanelHost from "./panels/PanelHost";
import Overview from "./pages/Overview";
import { useMotionPref } from "./state/prefs";
import { useRoute, type Page } from "./state/router";
import { loadDashboard, useDashboard } from "./state/store";
import { ambient } from "./three/ambientBus";
import { ErrorState, Skeleton } from "./ui/primitives";

const AmbientBackground = lazy(() => import("./three/AmbientBackground"));
const PAGES: Record<Page, React.LazyExoticComponent<() => React.JSX.Element> | (() => React.JSX.Element)> = {
  overview: Overview,
  live: lazy(() => import("./pages/LiveOps")),
  requests: lazy(() => import("./pages/Requests")),
  orders: lazy(() => import("./pages/Orders")),
  customers: lazy(() => import("./pages/Customers")),
  employees: lazy(() => import("./pages/Employees")),
  analytics: lazy(() => import("./pages/Analytics")),
  notifications: lazy(() => import("./pages/Notifications")),
  settings: lazy(() => import("./pages/Settings")),
};

function LoadingView() {
  return (
    <div aria-busy="true" aria-label="جارٍ التحميل">
      <Skeleton className="mb-3 h-4 w-48" />
      <Skeleton className="mb-8 h-8 w-96 max-w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-[14px]" />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Skeleton className="h-[380px] rounded-[14px] xl:col-span-4" />
        <Skeleton className="h-[380px] rounded-[14px] xl:col-span-8" />
      </div>
    </div>
  );
}

/** Offline demo command center (VITE_DATA_SOURCE=mock): seeded simulation, labelled as such throughout. */
export default function DemoApp() {
  const { page } = useRoute();
  const status = useDashboard((s) => s.status);
  const error = useDashboard((s) => s.error);
  const origin = useDashboard((s) => s.origin);
  const effects = useMotionPref();

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    ambient.section(pageIndex(page));
    window.scrollTo({ top: 0 });
  }, [page]);

  const PageView = PAGES[page];

  return (
    // Animate UI icons follow the same effects setting as the Three.js scenes ("auto" = OS reduce-motion).
    <AnimateUIProvider reducedMotion={effects === "off" ? "always" : effects === "on" ? "never" : "user"}>
      <div className="flex min-h-dvh">
        {effects !== "off" && (
          <Suspense fallback={null}>
            <AmbientBackground />
          </Suspense>
        )}
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="mx-auto w-full max-w-[1680px] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">
            {status === "loading" && <LoadingView />}
            {status === "error" && (
              <ErrorState
                title="تعذّر تحميل بيانات اللوحة"
                detail={origin === "api" ? `${error}. تحقق من أن نقاط النهاية متوفرة في الخادم وأن رمز الوصول صالح (الإعدادات ← مصدر البيانات).` : error}
                onRetry={loadDashboard}
              />
            )}
            {status === "ready" && (
              <Suspense fallback={<LoadingView />}>
                <div key={page} className="page-enter">
                  <PageView />
                </div>
              </Suspense>
            )}
          </main>
        </div>
        {status === "ready" && <PanelHost />}
        <MobileNav />
      </div>
    </AnimateUIProvider>
  );
}
