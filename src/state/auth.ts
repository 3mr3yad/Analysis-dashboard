import { useSyncExternalStore } from "react";
import { clearApiCache } from "../owner/api";
import { postJson, setAuthToken, setUnauthorizedHandler } from "../services/api/httpClient";

// Owner sign-in against the Wafi API (POST /login → Sanctum token). The token never expires on its
// own, so "remember me" keeps it in localStorage; otherwise it lives in sessionStorage and goes with the tab.

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface Session {
  token: string;
  user: AuthUser;
}

const KEY = "ceo.session";

function storages(): Storage[] {
  const out: Storage[] = [];
  try {
    out.push(localStorage, sessionStorage);
  } catch {
    /* storage unavailable (private mode / blocked) — session stays in memory */
  }
  return out;
}

function read(): Session | null {
  for (const s of storages()) {
    try {
      const raw = s.getItem(KEY);
      if (!raw) continue;
      const v = JSON.parse(raw) as Session;
      if (typeof v?.token === "string" && v.user) return v;
    } catch {
      /* corrupt entry — ignore */
    }
  }
  return null;
}

function write(v: Session | null, remember: boolean) {
  for (const s of storages()) {
    try {
      s.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
  if (!v) return;
  try {
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(v));
  } catch {
    /* in-memory only */
  }
}

let session = read();
setAuthToken(session?.token ?? null);
const listeners = new Set<() => void>();

function set(v: Session | null, remember = false) {
  if (!v) clearApiCache();
  session = v;
  setAuthToken(v?.token ?? null);
  write(v, remember);
  listeners.forEach((l) => l());
}

// A revoked token (401 on any request) drops back to the login screen.
setUnauthorizedHandler(() => set(null));

export function useSession(): Session | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
  );
}

export async function login(email: string, password: string, remember: boolean) {
  const res = await postJson<{ token: string; user: AuthUser }>("/login", { email, password });
  set({ token: res.token, user: res.user }, remember);
}

/** Revokes the token server-side (best effort), then clears it locally either way. */
export async function logout() {
  try {
    if (session) await postJson("/logout");
  } catch {
    /* already revoked or offline — still sign out locally */
  } finally {
    set(null);
  }
}
