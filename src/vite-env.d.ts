/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" runs the offline demo command center instead of the real owner dashboard. */
  readonly VITE_DATA_SOURCE?: "mock";
  /** API base for production builds (defaults to the /api dev proxy). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
