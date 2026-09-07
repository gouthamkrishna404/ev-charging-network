"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Calendar, CreditCard, Sparkles, Wrench, Zap, type LucideIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AppNotification } from "@/lib/types";

const TYPE_ICONS: Record<string, LucideIcon> = {
  Booking: Calendar,
  Payment: CreditCard,
  Maintenance: Wrench,
  Promotion: Sparkles,
  System: Zap,
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const data = await apiFetch<AppNotification[]>("/notifications/me");
      setNotifications(data);
    } catch {
      // not logged in as a driver, or request failed -- fail quietly, this is a peripheral widget
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAllRead() {
    await apiFetch("/notifications/read-all", { method: "POST" });
    await load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative text-slate-400 hover:text-slate-100 transition-colors p-1.5 rounded-lg hover:bg-white/[0.06]"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 ring-2 ring-[#0a0912]">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#100e1a] border border-white/10 rounded-xl shadow-2xl z-10 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-white/[0.03]">
            <span className="text-sm font-semibold text-slate-200">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              return (
                <li
                  key={n.id}
                  className={`flex gap-2.5 px-3.5 py-2.5 text-sm border-b border-white/[0.05] last:border-0 ${n.is_read ? "text-slate-500" : "text-slate-100 bg-indigo-500/[0.06]"}`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.is_read ? "bg-white/[0.05] text-slate-500" : "bg-indigo-500/20 text-indigo-300"}`}
                  >
                    <Icon size={12} />
                  </span>
                  <div className="min-w-0">
                    {n.message}
                    <div className="text-xs text-slate-500 mt-0.5">{new Date(n.sent_date).toLocaleString()}</div>
                  </div>
                </li>
              );
            })}
            {notifications.length === 0 && <li className="px-3.5 py-6 text-sm text-slate-500 text-center">No notifications yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
