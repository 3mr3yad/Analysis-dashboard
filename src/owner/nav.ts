import type { IconName } from "../ui/Icon";
import type { OwnerPage } from "./router";

/** `mobile` marks the five pages that fit the bottom bar on phones; the rest stay reachable from links. */
export const OWNER_NAV: { page: OwnerPage; label: string; short: string; icon: IconName; mobile?: boolean }[] = [
  { page: "overview", label: "النظرة العامة", short: "الرئيسية", icon: "overview", mobile: true },
  { page: "tickets", label: "سجل الطلبات", short: "الطلبات", icon: "requests", mobile: true },
  { page: "analytics", label: "التحليلات والإيرادات", short: "التحليلات", icon: "analytics", mobile: true },
  { page: "orders", label: "طلبات الشراء", short: "الشراء", icon: "orders" },
  { page: "customers", label: "العملاء", short: "العملاء", icon: "customers", mobile: true },
  { page: "iphone18", label: "iPhone 18 Purchases", short: "iPhone 18", icon: "phone" },
  { page: "alerts", label: "التنبيهات", short: "التنبيهات", icon: "bell" },
  { page: "activity", label: "سجل النشاط", short: "النشاط", icon: "live" },
  { page: "staff", label: "الموظفون", short: "الموظفون", icon: "employees", mobile: true },
  { page: "settings", label: "الإعدادات", short: "الإعدادات", icon: "settings" },
];
