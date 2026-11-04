import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { API_BASE, getAuthToken } from "../services/api/httpClient";
import type { OnlineStaff } from "./types";

// Live push for the "Online Now" list (Staff.tsx) on top of the REST poll
// in api.ts (api.staffOnline, every 20s), which stays the source of truth
// for *who's online* and ages people out after online_threshold_seconds —
// this only makes a page change show up the instant it happens instead of
// waiting for the next poll tick. If VITE_PUSHER_APP_KEY/CLUSTER aren't
// set, or the socket never connects, the page keeps working exactly as it
// did before, purely on the 20s poll.

let echo: Echo<"pusher"> | null | undefined;

function getEcho(): Echo<"pusher"> | null {
  if (echo !== undefined) return echo;

  const key = import.meta.env.VITE_PUSHER_APP_KEY as string | undefined;
  const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER as string | undefined;
  if (!key || !cluster) return (echo = null);

  echo = new Echo({
    broadcaster: "pusher",
    Pusher,
    key,
    cluster,
    forceTLS: true,
    // The backend's /broadcasting/auth is Sanctum-token-authenticated (not
    // session/cookie), so the token has to be read fresh on every auth
    // request rather than baked in once at construction time.
    channelAuthorization: {
      transport: "ajax",
      endpoint: `${API_BASE}/broadcasting/auth`,
      headersProvider: () => {
        const token = getAuthToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    },
  });
  return echo;
}

/**
 * Subscribes to `presence.updated` on the private `owner-dashboard`
 * channel. Returns an unsubscribe function, always safe to call even if
 * Pusher isn't configured (no-op in that case).
 */
export function subscribePresenceUpdated(onUpdate: (row: OnlineStaff) => void): () => void {
  const client = getEcho();
  if (!client) return () => {};

  const channel = client.private("owner-dashboard").listen(".presence.updated", onUpdate);
  return () => {
    channel.stopListening(".presence.updated", onUpdate);
    client.leave("owner-dashboard");
  };
}
