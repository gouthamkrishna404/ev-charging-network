import {
  BarChart3,
  Calendar,
  Car,
  History,
  LayoutGrid,
  Receipt,
  RotateCcw,
  Tag,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_LINKS: NavLink[] = [
  { href: "/admin", label: "Stations", icon: LayoutGrid },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
  { href: "/admin/plans", label: "Plans", icon: Tag },
  { href: "/admin/team", label: "Team", icon: Users },
  { href: "/admin/audit-log", label: "Audit Log", icon: History },
];

export const DRIVER_LINKS: NavLink[] = [
  { href: "/stations", label: "Stations", icon: Zap },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/plans", label: "Plans", icon: Tag },
];

export const GUEST_LINKS: NavLink[] = [{ href: "/stations", label: "Stations", icon: Zap }];

/** Bottom tab bar caps at 5 slots (4 links + a "More" tab) to stay usable on a phone width. */
export const MOBILE_TAB_LIMIT = 4;
