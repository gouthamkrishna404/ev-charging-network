"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getRole, isLoggedIn } from "@/lib/auth";

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

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-semibold">
          EV Charging Network
        </Link>
        {loggedIn && role === "admin" && (
          <>
            <Link href="/admin" className="text-sm text-slate-600 hover:text-slate-900">
              My Stations
            </Link>
            <button onClick={handleLogout} className="ml-auto text-sm text-slate-600 hover:text-slate-900">
              Log out
            </button>
          </>
        )}
        {loggedIn && role === "driver" && (
          <>
            <Link href="/stations" className="text-sm text-slate-600 hover:text-slate-900">
              Stations
            </Link>
            <Link href="/vehicles" className="text-sm text-slate-600 hover:text-slate-900">
              My Vehicles
            </Link>
            <Link href="/bookings" className="text-sm text-slate-600 hover:text-slate-900">
              My Bookings
            </Link>
            <Link href="/bills" className="text-sm text-slate-600 hover:text-slate-900">
              My Bills
            </Link>
            <button onClick={handleLogout} className="ml-auto text-sm text-slate-600 hover:text-slate-900">
              Log out
            </button>
          </>
        )}
        {!loggedIn && (
          <div className="ml-auto flex gap-4 text-sm">
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link href="/register" className="text-slate-600 hover:text-slate-900">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
