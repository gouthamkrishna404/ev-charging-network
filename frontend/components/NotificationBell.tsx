"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AppNotification } from "@/lib/types";

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
        className="relative text-slate-500 hover:text-slate-900 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-semibold text-slate-700">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`px-3.5 py-2.5 text-sm border-b border-slate-50 last:border-0 ${n.is_read ? "text-slate-500" : "text-slate-900 bg-indigo-50/40"}`}
              >
                {n.message}
                <div className="text-xs text-slate-400 mt-0.5">{new Date(n.sent_date).toLocaleString()}</div>
              </li>
            ))}
            {notifications.length === 0 && <li className="px-3.5 py-6 text-sm text-slate-500 text-center">No notifications yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
