import type { Page } from "../state/router";
import type { IconName } from "../ui/Icon";

export const NAV: { page: Page; label: string; short: string; icon: IconName; group: "main" | "manage" | "system" }[] = [
  { page: "overview", label: "النظرة التنفيذية", short: "الرئيسية", icon: "overview", group: "main" },
  { page: "live", label: "العمليات المباشرة", short: "مباشر", icon: "live", group: "main" },
  { page: "requests", label: "طلبات العملاء", short: "الطلبات", icon: "requests", group: "manage" },
  { page: "orders", label: "الطلبات الشرائية", short: "المشتريات", icon: "orders", group: "manage" },
  { page: "customers", label: "العملاء", short: "العملاء", icon: "customers", group: "manage" },
  { page: "employees", label: "الموظفون والفرق", short: "الفريق", icon: "employees", group: "manage" },
  { page: "analytics", label: "التحليلات والتقارير", short: "التحليلات", icon: "analytics", group: "manage" },
  { page: "notifications", label: "التنبيهات", short: "التنبيهات", icon: "bell", group: "system" },
  { page: "settings", label: "الإعدادات", short: "الإعدادات", icon: "settings", group: "system" },
];

export const pageIndex = (p: Page) => NAV.findIndex((n) => n.page === p);
export const pageLabel = (p: Page) => NAV.find((n) => n.page === p)?.label ?? "";
