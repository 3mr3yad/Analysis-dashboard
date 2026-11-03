import type { Department, Employee, ServiceRequest, Snapshot } from "../domain/types";
import type { Indexes } from "../state/indexes";
import { completedAt, isOpen } from "./requests";
import { inRange, type TimeWindow } from "./time";

export interface EmployeeStats {
  employee: Employee;
  completed: number;
  open: number;
  overdue: number;
  avgResponse: number;
  avgResolution: number;
  csat: number | null;
  rated: number;
  /** Open workload relative to the team median (1 = median). */
  loadIndex: number;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export function employeeStats(d: Snapshot, ix: Indexes, w: TimeWindow, now: number): EmployeeStats[] {
  const rows = d.employees.map((employee) => {
    const mine: ServiceRequest[] = ix.requestsByAssignee.get(employee.id) ?? [];
    const open = mine.filter(isOpen);
    const done = mine.filter((r) => inRange(completedAt(r), w.from, w.to));
    const createdInWindow = mine.filter((r) => inRange(r.createdAt, w.from, w.to) && r.firstResponseAt);
    const rated = done.filter((r) => r.rating !== undefined);
    return {
      employee,
      completed: done.length,
      open: open.length,
      overdue: open.filter((r) => r.dueAt < now).length,
      avgResponse: avg(createdInWindow.map((r) => r.firstResponseAt! - r.createdAt)),
      avgResolution: avg(done.map((r) => completedAt(r)! - r.createdAt)),
      csat: rated.length ? (rated.filter((r) => r.rating! >= 4).length / rated.length) * 100 : null,
      rated: rated.length,
      loadIndex: 0,
    };
  });
  const sorted = rows.map((r) => r.open).sort((a, b) => a - b);
  const median = Math.max(1, sorted[Math.floor(sorted.length / 2)]);
  for (const r of rows) r.loadIndex = r.open / median;
  return rows;
}

export interface DepartmentStats {
  department: Department;
  headcount: number;
  completed: number;
  open: number;
  overdue: number;
  avgResolution: number;
  csat: number | null;
}

export function departmentStats(rows: EmployeeStats[]): DepartmentStats[] {
  const by = new Map<Department, EmployeeStats[]>();
  for (const r of rows) by.set(r.employee.department, [...(by.get(r.employee.department) ?? []), r]);
  return [...by.entries()].map(([department, rs]) => {
    const rated = rs.filter((r) => r.csat !== null);
    const ratedN = rated.reduce((s, r) => s + r.rated, 0);
    return {
      department,
      headcount: rs.length,
      completed: rs.reduce((s, r) => s + r.completed, 0),
      open: rs.reduce((s, r) => s + r.open, 0),
      overdue: rs.reduce((s, r) => s + r.overdue, 0),
      avgResolution: avg(rs.map((r) => r.avgResolution).filter(Number.isFinite)),
      csat: ratedN ? rated.reduce((s, r) => s + r.csat! * r.rated, 0) / ratedN : null,
    };
  });
}
