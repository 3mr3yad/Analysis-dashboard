import { lazy, Suspense, useEffect } from "react";
import { useMotionPref } from "../state/prefs";
import { ambient } from "../three/ambientBus";
import { Skeleton } from "../ui/primitives";
import Overview from "./pages/Overview";
import { useOwnerRoute, type OwnerPage } from "./router";
import { OWNER_NAV } from "./nav";
import Shell from "./Shell";

const AmbientBackground = lazy(() => import("../three/AmbientBackground"));
const PAGES: Record<OwnerPage, React.ComponentType> = {
  overview: Overview,
  tickets: lazy(() => import("./pages/Tickets")),
  analytics: lazy(() => import("./pages/Analytics")),
  orders: lazy(() => import("./pages/Orders")),
  alerts: lazy(() => import("./pages/Alerts")),
  customers: lazy(() => import("./pages/Customers")),
  iphone18: lazy(() => import("./pages/Iphone18")),
  activity: lazy(() => import("./pages/Activity")),
  staff: lazy(() => import("./pages/Staff")),
  settings: lazy(() => import("./pages/Settings")),
};

/** The real owner dashboard: every number comes from the Wafi Owner Dashboard API. */
export default function OwnerApp() {
  const { page } = useOwnerRoute();
  const effects = useMotionPref();

  // CSS-only effects (aurora drift, number shimmer) read this to stand still when effects are off.
  useEffect(() => {
    document.documentElement.dataset.effects = effects;
  }, [effects]);

  useEffect(() => {
    ambient.section(OWNER_NAV.findIndex((n) => n.page === page));
    window.scrollTo({ top: 0 });
  }, [page]);

  const Page = PAGES[page];
  return (
    <>
      {effects !== "off" && (
        <Suspense fallback={null}>
          <AmbientBackground />
        </Suspense>
      )}
      <Shell>
        <Suspense fallback={<Skeleton className="h-[480px] rounded-[14px]" />}>
          <div key={page} className="page-enter">
            <Page />
          </div>
        </Suspense>
      </Shell>
    </>
  );
}
