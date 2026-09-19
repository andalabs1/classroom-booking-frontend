import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  Users,
  ChartNoAxesCombined,
  ScrollText,
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
    key: "adminRooms",
    title: "จัดการห้องเรียน",
    path: "/admin/rooms",
    icon: Building2,
  },
  {
    key: "adminBookings",
    title: "จัดการการจอง",
    path: "/admin/bookings",
    icon: CalendarCheck,
  },
  { key: "adminUsers", title: "จัดการผู้ใช้งาน", path: "/admin/users", icon: Users },
  {
    key: "adminReports",
    title: "รายงานและสถิติ",
    path: "/admin/reports",
    icon: ChartNoAxesCombined,
  },
  { key: "adminAudit", title: "บันทึกการดำเนินการ", path: "/admin/audit-logs", icon: ScrollText },
];
