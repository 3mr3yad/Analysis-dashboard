// MOCK DATA ONLY — see world.ts.
import type { DashboardDataSource, RealtimeEvent, RealtimeSource } from "../types";
import { createMockWorld, type MockWorld } from "./world";

let world: MockWorld | null = null;
const getWorld = () => (world ??= createMockWorld());

export const mockDataSource: DashboardDataSource = {
  origin: "mock",
  async loadSnapshot() {
    // Small delay so loading states are exercised the same way as with the network.
    await new Promise((res) => setTimeout(res, 450));
    return getWorld().snapshot();
  },
  async markNotificationsRead() {
    /* mock: read state lives in the client store only */
  },
};

/** Simulated event stream. Presence here is NOT real employee presence. */
export const mockRealtime: RealtimeSource = {
  origin: "mock",
  connect(onEvent: (e: RealtimeEvent) => void, onStatus) {
    onStatus("connecting");
    let timer: number | undefined;
    const schedule = () => {
      timer = window.setTimeout(() => {
        for (const e of getWorld().tick(Date.now())) onEvent(e);
        schedule();
      }, 4000 + Math.random() * 5000);
    };
    const start = window.setTimeout(() => {
      onStatus("connected");
      schedule();
    }, 600);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(timer);
      onStatus("disconnected");
    };
  },
};
