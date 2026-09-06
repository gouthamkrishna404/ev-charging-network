"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getRole, isLoggedIn } from "@/lib/auth";
import NotificationBell from "./NotificationBell";

const ADMIN_LINKS = [
  { href: "/admin", label: "My Stations" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/audit-log", label: "Audit Log" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/team", label: "Team" },
];

const DRIVER_LINKS = [
  { href: "/stations", label: "Stations" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/bookings", label: "Bookings" },
  { href: "/bills", label: "Bills" },
  { href: "/plans", label: "Plans" },
];

const GUEST_LINKS = [{ href: "/stations", label: "Stations" }];

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
    `text-sm transition-colors ${pathname === href ? "text-slate-900 font-medium" : "text-slate-500 hover:text-slate-900"}`;
  const mobileLinkClass = (href: string) =>
    `block px-4 py-2.5 text-sm ${pathname === href ? "text-slate-900 font-medium bg-slate-50" : "text-slate-600"}`;

  return (
    <nav className="border-b border-slate-200 bg-white sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-semibold text-slate-900 whitespace-nowrap">
          ⚡ Volt Grid
        </Link>

        <div className="hidden md:flex items-center gap-6 flex-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={desktopLinkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-4">
            {loggedIn && role === "driver" && <NotificationBell />}
            {loggedIn ? (
              <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-900">
                Log out
              </button>
            ) : (
              <>
                <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
                  Log in
                </Link>
                <Link href="/register" className="text-sm text-slate-600 hover:text-slate-900">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3 md:hidden">
          {loggedIn && role === "driver" && <NotificationBell />}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="text-slate-600 text-xl leading-none px-1"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-100">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={mobileLinkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          <div className="border-t border-slate-100 px-4 py-2.5">
            {loggedIn ? (
              <button onClick={handleLogout} className="text-sm text-slate-600">
                Log out
              </button>
            ) : (
              <div className="flex gap-4">
                <Link href="/login" className="text-sm text-slate-600">
                  Log in
                </Link>
                <Link href="/register" className="text-sm text-slate-600">
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
