"use client";

import { useEffect, useRef, useState } from "react";
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
        className="relative text-sm text-slate-600 hover:text-slate-900"
        aria-label="Notifications"
      >
        <span aria-hidden>🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-slate-500 hover:text-slate-800">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`px-3 py-2 text-sm border-b border-slate-50 ${n.is_read ? "text-slate-500" : "text-slate-900 bg-slate-50"}`}
              >
                {n.message}
                <div className="text-xs text-slate-400 mt-0.5">{new Date(n.sent_date).toLocaleString()}</div>
              </li>
            ))}
            {notifications.length === 0 && <li className="px-3 py-4 text-sm text-slate-500 text-center">No notifications yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
