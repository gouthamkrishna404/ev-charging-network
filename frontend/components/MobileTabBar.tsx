"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { NavLink, MOBILE_TAB_LIMIT } from "@/lib/nav-links";
import { Sheet } from "./ui";

export default function MobileTabBar({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = links.length > MOBILE_TAB_LIMIT + 1 ? links.slice(0, MOBILE_TAB_LIMIT) : links;
  const overflow = links.length > MOBILE_TAB_LIMIT + 1 ? links.slice(MOBILE_TAB_LIMIT) : [];
  const overflowActive = overflow.some((l) => l.href === pathname);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-200"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${primary.length + (overflow.length > 0 ? 1 : 0)}, 1fr)` }}>
          {primary.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium"
              >
                <link.icon
                  size={20}
                  strokeWidth={active ? 2.4 : 2}
                  className={active ? "text-indigo-600" : "text-slate-400"}
                />
                <span className={active ? "text-indigo-600" : "text-slate-500"}>{link.label}</span>
              </Link>
            );
          })}
          {overflow.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium"
            >
              <MoreHorizontal size={20} strokeWidth={overflowActive ? 2.4 : 2} className={overflowActive ? "text-indigo-600" : "text-slate-400"} />
              <span className={overflowActive ? "text-indigo-600" : "text-slate-500"}>More</span>
            </button>
          )}
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="grid grid-cols-3 gap-2 -mx-1">
          {overflow.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-4 text-xs font-medium ${
                  active ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-600"
                }`}
              >
                <link.icon size={20} strokeWidth={active ? 2.4 : 2} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
