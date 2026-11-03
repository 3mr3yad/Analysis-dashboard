// Data for the demo command center (VITE_DATA_SOURCE=mock): a seeded simulation, never mixed with real data.
// The real owner dashboard (src/owner/) talks to the Wafi API directly and does not use this module.
import { mockDataSource, mockRealtime } from "./mock/mockDataSource";
import type { DashboardDataSource, RealtimeSource } from "./types";

export const dataSource: DashboardDataSource = mockDataSource;
export const realtimeSource: RealtimeSource = mockRealtime;

export type { DashboardDataSource, RealtimeEvent, RealtimeSource, RealtimeStatus } from "./types";
