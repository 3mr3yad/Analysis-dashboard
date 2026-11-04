import { useSyncExternalStore } from "react";

// Installable-app plumbing: registers the service worker in production builds and holds the
// browser's one-time install prompt so the settings page can offer an "install" button later.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState = "installed" | "available" | "ios" | "manual";

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function registerPwa() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
  // Dev keeps no service worker, so Vite's hot reload is never served from a stale cache.
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* not installable on this host/browser — the site still works normally */
      });
    });
  }
}

function state(): InstallState {
  if (installed || standalone()) return "installed";
  if (deferred) return "available";
  return isIos() ? "ios" : "manual";
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    state,
  );
}

/**
 * Shows the browser's own install dialog. "failed" means the browser refused to show it
 * (no prompt held, or not triggered by a real click) — callers fall back to instructions.
 */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "failed"> {
  const e = deferred;
  if (!e) return "failed";
  try {
    await e.prompt();
  } catch {
    return "failed"; // the event is still unused, so it stays available for the next click
  }
  deferred = null;
  const { outcome } = await e.userChoice;
  if (outcome === "accepted") installed = true;
  notify();
  return outcome;
}

export type InstallPlatform = "ios" | "android" | "desktop" | "safari-mac" | "firefox-desktop";

/** Which install instructions fit this device and browser. */
export function installPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  if (isIos()) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/firefox/i.test(ua)) return "firefox-desktop";
  if (/safari/i.test(ua) && !/chrome|chromium|edg/i.test(ua)) return "safari-mac";
  return "desktop";
}
