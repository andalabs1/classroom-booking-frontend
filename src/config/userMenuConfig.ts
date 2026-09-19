import {
  DoorOpen,
  CalendarDays,
  CalendarPlus,
  History,
  UserRound,
  type LucideIcon,
} from "lucide-react";
export type MenuItem = {
  key: string;
  title: string;
  path: string;
  icon: LucideIcon;
  permission?: string;
};
export const userMenuConfig: MenuItem[] = [
  { key: "rooms", title: "ห้องเรียน", path: "/rooms", icon: DoorOpen },
  {
    key: "schedule",
    title: "ตารางการใช้ห้อง",
    path: "/room-schedule",
    icon: CalendarDays,
  },
  {
    key: "booking",
    title: "จองห้องเรียน",
    path: "/booking",
    icon: CalendarPlus,
  },
  {
    key: "history",
    title: "ประวัติการจอง",
    path: "/booking-history",
    icon: History,
  },
  { key: "profile", title: "โปรไฟล์ของฉัน", path: "/profile", icon: UserRound },
];
