"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getRole, isLoggedIn } from "@/lib/auth";
import NotificationBell from "./NotificationBell";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setRole(getRole());
  }, [pathname]);

  function handleLogout() {
    clearSession();
    setLoggedIn(false);
    router.push("/login");
  }

  const linkClass = (href: string) =>
    `text-sm transition-colors ${pathname === href ? "text-slate-900 font-medium" : "text-slate-500 hover:text-slate-900"}`;

  return (
    <nav className="border-b border-slate-200 bg-white sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-semibold text-slate-900">
          ⚡ Volt Grid
        </Link>
        {loggedIn && role === "admin" && (
          <>
            <Link href="/admin" className={linkClass("/admin")}>
              My Stations
            </Link>
            <Link href="/admin/refunds" className={linkClass("/admin/refunds")}>
              Refunds
            </Link>
            <Link href="/admin/audit-log" className={linkClass("/admin/audit-log")}>
              Audit Log
            </Link>
            <Link href="/admin/team" className={linkClass("/admin/team")}>
              Team
            </Link>
            <button onClick={handleLogout} className="ml-auto text-sm text-slate-500 hover:text-slate-900">
              Log out
            </button>
          </>
        )}
        {loggedIn && role === "driver" && (
          <>
            <Link href="/stations" className={linkClass("/stations")}>
              Stations
            </Link>
            <Link href="/vehicles" className={linkClass("/vehicles")}>
              Vehicles
            </Link>
            <Link href="/bookings" className={linkClass("/bookings")}>
              Bookings
            </Link>
            <Link href="/bills" className={linkClass("/bills")}>
              Bills
            </Link>
            <Link href="/plans" className={linkClass("/plans")}>
              Plans
            </Link>
            <div className="ml-auto flex items-center gap-4">
              <NotificationBell />
              <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-900">
                Log out
              </button>
            </div>
          </>
        )}
        {!loggedIn && (
          <>
            <Link href="/stations" className={linkClass("/stations")}>
              Stations
            </Link>
            <div className="ml-auto flex gap-4 text-sm">
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link href="/register" className="text-slate-600 hover:text-slate-900">
                Register
              </Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
