/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" runs the offline demo command center instead of the real owner dashboard. */
  readonly VITE_DATA_SOURCE?: "mock";
  /** API base for production builds (defaults to the /api dev proxy). */
  readonly VITE_API_BASE?: string;
  /** Pusher app key for the live "Online Now" push — same app as the backend's PUSHER_APP_KEY. Blank disables it, falling back to the 20s poll alone. */
  readonly VITE_PUSHER_APP_KEY?: string;
  readonly VITE_PUSHER_APP_CLUSTER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
