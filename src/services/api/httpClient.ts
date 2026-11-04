// Thin fetch wrapper for the Wafi API. In development `/api` is proxied by Vite to
// https://wafii.sa/wafiservices/api/v1 (see vite.config.ts). The bearer token comes from
// the signed-in session (state/auth.ts) — nothing secret is baked into the bundle.

export class ApiError extends Error {
  readonly status: number;
  /** Laravel validation errors, keyed by field (422). */
  readonly fields: Record<string, string[]>;
  /** Seconds to wait before retrying (429). */
  readonly retryAfter: number | null;
  constructor(status: number, message: string, fields: Record<string, string[]> = {}, retryAfter: number | null = null) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.retryAfter = retryAfter;
  }
}

// Dev goes through the Vite proxy (/api); production builds call the API directly (it allows any origin).
const BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? "/api" : "https://wafii.sa/wafiservices/api/v1");
/** Same base the REST calls above use — exported so the Pusher channel authorizer (realtime.ts) hits the same /broadcasting/auth path, proxy included. */
export const API_BASE = BASE;

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Called by the auth store whenever the session changes. */
export function setAuthToken(t: string | null) {
  token = t;
}

/** Current bearer token, read lazily by the Pusher channel authorizer so it always sends the latest one. */
export function getAuthToken(): string | null {
  return token;
}

/** A 401 on an authenticated request means the token was revoked: the auth store signs out. */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

// The API allows 120 requests/minute per token. Authenticated calls queue client-side at 100/minute,
// so auto-refresh plus fast clicking never trips the server limit.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 100;
const sent: number[] = [];

async function takeSlot(signal?: AbortSignal) {
  for (;;) {
    const now = Date.now();
    while (sent.length && now - sent[0] >= WINDOW_MS) sent.shift();
    if (sent.length < MAX_PER_WINDOW) {
      sent.push(now);
      return;
    }
    await new Promise((r) => setTimeout(r, WINDOW_MS - (now - sent[0]) + 50));
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  }
}

async function request<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  if (token) await takeSlot(signal);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.");
  }

  if (!res.ok) {
    let message = res.statusText;
    let fields: Record<string, string[]> = {};
    try {
      const data = await res.json();
      if (typeof data?.message === "string") message = data.message;
      if (data?.errors && typeof data.errors === "object") fields = data.errors;
    } catch {
      /* non-JSON error body */
    }
    let retryAfter: number | null = null;
    if (res.status === 429) {
      const ra = Number(res.headers.get("Retry-After"));
      retryAfter = Number.isFinite(ra) && ra > 0 ? ra : 60;
      message = `طلبات كثيرة خلال وقت قصير. حاول بعد ${retryAfter} ثانية.`;
    }
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, message, fields, retryAfter);
  }
  return res.json() as Promise<T>;
}

export function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>("GET", path, undefined, signal);
}

export function postJson<T>(path: string, body: unknown = {}): Promise<T> {
  return request<T>("POST", path, body);
}

export function putJson<T>(path: string, body: unknown = {}): Promise<T> {
  return request<T>("PUT", path, body);
}
