import { lazy, Suspense } from "react";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { useSession } from "./state/auth";
import { useMotionPref } from "./state/prefs";

const Login = lazy(() => import("./pages/Login"));
const OwnerApp = lazy(() => import("./owner/OwnerApp"));
// The offline demo is only reachable when explicitly built with VITE_DATA_SOURCE=mock.
const DemoApp = lazy(() => import("./DemoApp"));
const DEMO = import.meta.env.VITE_DATA_SOURCE === "mock";

/** Everything sits behind the owner sign-in; nothing loads or fetches until there is a session. */
export default function App() {
  const session = useSession();
  const effects = useMotionPref();
  return (
    // Animate UI icons follow the same effects setting as the Three.js scenes ("auto" = OS reduce-motion).
    <AnimateUIProvider reducedMotion={effects === "off" ? "always" : effects === "on" ? "never" : "user"}>
      <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>{!session ? <Login /> : DEMO ? <DemoApp /> : <OwnerApp />}</Suspense>
    </AnimateUIProvider>
  );
}
