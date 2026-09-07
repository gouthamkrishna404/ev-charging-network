"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, User, Zap } from "lucide-react";
import { clearSession, getRole, isLoggedIn } from "@/lib/auth";
import { ADMIN_LINKS, DRIVER_LINKS, GUEST_LINKS } from "@/lib/nav-links";
import { Sheet } from "./ui";
import NotificationBell from "./NotificationBell";
import MobileTabBar from "./MobileTabBar";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setRole(getRole());
    setAccountOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearSession();
    setLoggedIn(false);
    setAccountOpen(false);
    router.push("/login");
  }

  const links = loggedIn && role === "admin" ? ADMIN_LINKS : loggedIn && role === "driver" ? DRIVER_LINKS : GUEST_LINKS;

  const desktopLinkClass = (href: string) =>
    `flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
      pathname === href ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
    }`;

  return (
    <>
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

          <div className="ml-auto flex items-center gap-1.5 md:hidden">
            {loggedIn && role === "driver" && <NotificationBell />}
            {loggedIn ? (
              <button
                onClick={() => setAccountOpen(true)}
                aria-label="Account"
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <User size={16} strokeWidth={2} />
              </button>
            ) : (
              <>
                <Link href="/login" className="text-sm text-slate-600 px-2.5 py-1.5">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-sm text-white bg-indigo-600 px-3 py-1.5 rounded-full font-medium"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {loggedIn && <MobileTabBar links={links} />}

      <Sheet open={accountOpen} onClose={() => setAccountOpen(false)} title="Account">
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3.5">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 capitalize">{role} account</p>
              <p className="text-xs text-slate-500">Signed in to Volt Grid</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors rounded-xl py-3"
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      </Sheet>
    </>
  );
}
