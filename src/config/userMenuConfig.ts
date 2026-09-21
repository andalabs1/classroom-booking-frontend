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
  path: string;
  icon: LucideIcon;
  permission?: string;
};
export const userMenuConfig: MenuItem[] = [
  { key: "rooms", path: "/rooms", icon: DoorOpen },
  {
    key: "schedule",
    path: "/room-schedule",
    icon: CalendarDays,
  },
  {
    key: "booking",
    path: "/booking",
    icon: CalendarPlus,
  },
  {
    key: "history",
    path: "/booking-history",
    icon: History,
  },
  { key: "profile", path: "/profile", icon: UserRound },
];
