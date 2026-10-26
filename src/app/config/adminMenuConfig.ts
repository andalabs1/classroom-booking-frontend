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
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "adminRooms",
    path: "/admin/rooms",
    icon: Building2,
  },
  {
    key: "adminBookings",
    path: "/admin/bookings",
    icon: CalendarCheck,
  },
  { key: "adminUsers", path: "/admin/users", icon: Users },
  {
    key: "adminReports",
    path: "/admin/reports",
    icon: ChartNoAxesCombined,
  },
  { key: "adminAudit", path: "/admin/audit-logs", icon: ScrollText },
];
