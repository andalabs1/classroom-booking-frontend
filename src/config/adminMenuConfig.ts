import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  Users,
  ChartNoAxesCombined,
} from "lucide-react";
import type { MenuItem } from "./userMenuConfig";
export const adminMenuConfig: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "rooms",
    title: "จัดการห้องเรียน",
    path: "/admin/rooms",
    icon: Building2,
  },
  {
    key: "bookings",
    title: "จัดการการจอง",
    path: "/admin/bookings",
    icon: CalendarCheck,
  },
  { key: "users", title: "จัดการผู้ใช้งาน", path: "/admin/users", icon: Users },
  {
    key: "reports",
    title: "รายงานและสถิติ",
    path: "/admin/reports",
    icon: ChartNoAxesCombined,
  },
];
