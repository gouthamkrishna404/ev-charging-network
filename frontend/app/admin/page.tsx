"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Station } from "@/lib/types";
import { AdminBooking, Revenue } from "@/lib/admin-types";

export default function AdminPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);

  useEffect(() => {
    apiFetch<Station[]>("/admin/stations").then(setStations);
  }, []);

  async function toggle(stationId: number) {
    if (expanded === stationId) {
      setExpanded(null);
      return;
    }
    setExpanded(stationId);
    const [b, r] = await Promise.all([
      apiFetch<AdminBooking[]>(`/admin/stations/${stationId}/bookings`),
      apiFetch<Revenue>(`/admin/stations/${stationId}/revenue`),
    ]);
    setBookings(b);
    setRevenue(r);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Stations I Manage</h1>
      <ul className="space-y-3">
        {stations.map((s) => (
          <li key={s.id} className="border border-slate-200 rounded p-4 bg-white">
            <button onClick={() => toggle(s.id)} className="font-medium hover:underline text-left">
              {s.station_name}
            </button>
            <p className="text-sm text-slate-600">
              {s.location.address_line}, {s.location.city}
            </p>

            {expanded === s.id && (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                {revenue && (
                  <p className="text-sm">
                    Revenue: <span className="font-medium">₹{revenue.total_revenue}</span> from{" "}
                    {revenue.completed_sessions} completed session(s)
                  </p>
                )}
                <div>
                  <p className="text-sm font-medium mb-1">Bookings</p>
                  <ul className="space-y-1 text-sm">
                    {bookings.map((b) => (
                      <li key={b.id} className="text-slate-600">
                        Connector #{b.connector_id} &mdash; {new Date(b.start_time).toLocaleString()} &mdash;{" "}
                        {b.status}
                      </li>
                    ))}
                    {bookings.length === 0 && <li className="text-slate-500">No bookings.</li>}
                  </ul>
                </div>
              </div>
            )}
          </li>
        ))}
        {stations.length === 0 && <p className="text-sm text-slate-500">No stations assigned to you.</p>}
      </ul>
    </div>
  );
}
