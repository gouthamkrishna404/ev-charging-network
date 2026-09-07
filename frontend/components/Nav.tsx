"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  Car,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  Receipt,
  RotateCcw,
  Tag,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { clearSession, getRole, isLoggedIn } from "@/lib/auth";
import NotificationBell from "./NotificationBell";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin", label: "My Stations", icon: LayoutGrid },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
  { href: "/admin/audit-log", label: "Audit Log", icon: History },
  { href: "/admin/plans", label: "Plans", icon: Tag },
  { href: "/admin/team", label: "Team", icon: Users },
];

const DRIVER_LINKS: NavLink[] = [
  { href: "/stations", label: "Stations", icon: Zap },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/plans", label: "Plans", icon: Tag },
];

const GUEST_LINKS: NavLink[] = [{ href: "/stations", label: "Stations", icon: Zap }];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setRole(getRole());
    setMenuOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearSession();
    setLoggedIn(false);
    router.push("/login");
  }

  const links = loggedIn && role === "admin" ? ADMIN_LINKS : loggedIn && role === "driver" ? DRIVER_LINKS : GUEST_LINKS;

  const desktopLinkClass = (href: string) =>
    `flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
      pathname === href ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
    }`;
  const mobileLinkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-3 text-sm ${
      pathname === href ? "text-indigo-700 font-medium bg-indigo-50" : "text-slate-600"
    }`;

  return (
    <nav className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1.5 font-semibold text-slate-900 whitespace-nowrap">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-orange-500/30">
            <Zap size={15} className="text-white" fill="white" strokeWidth={0} />
          </span>
          Volt Grid
        </Link>

        <div className="hidden md:flex items-center gap-1 flex-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={desktopLinkClass(link.href)}>
              <link.icon size={14} strokeWidth={2} />
              {link.label}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {loggedIn && role === "driver" && <NotificationBell />}
            {loggedIn ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <LogOut size={14} /> Log out
              </button>
            ) : (
              <>
                <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-sm text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-full font-medium transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 md:hidden">
          {loggedIn && role === "driver" && <NotificationBell />}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-100">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={mobileLinkClass(link.href)}>
              <link.icon size={16} strokeWidth={2} />
              {link.label}
            </Link>
          ))}
          <div className="border-t border-slate-100 px-4 py-3">
            {loggedIn ? (
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-600">
                <LogOut size={15} /> Log out
              </button>
            ) : (
              <div className="flex gap-4">
                <Link href="/login" className="text-sm text-slate-600">
                  Log in
                </Link>
                <Link href="/register" className="text-sm text-indigo-600 font-medium">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
