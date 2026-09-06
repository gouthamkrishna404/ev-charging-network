"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Booking, Session } from "@/lib/types";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [energyBySession, setEnergyBySession] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function load() {
    const [b, s] = await Promise.all([
      apiFetch<Booking[]>("/bookings/me"),
      apiFetch<Session[]>("/sessions/me"),
    ]);
    setBookings(b);
    setSessions(s);
  }

  useEffect(() => {
    load();
  }, []);

  async function cancelBooking(id: number) {
    setMessage(null);
    try {
      await apiFetch(`/bookings/${id}/cancel`, { method: "POST" });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function startSession(booking: Booking) {
    setMessage(null);
    try {
      await apiFetch("/sessions/start", {
        method: "POST",
        body: JSON.stringify({
          connector_id: booking.connector_id,
          vehicle_id: booking.vehicle_id,
          booking_id: booking.id,
        }),
      });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function endSession(sessionId: number) {
    setMessage(null);
    const energy = energyBySession[sessionId];
    if (!energy) {
      setMessage({ type: "error", text: "Enter the energy delivered (kWh) first." });
      return;
    }
    try {
      await apiFetch(`/sessions/${sessionId}/end`, {
        method: "POST",
        body: JSON.stringify({ energy_delivered_kwh: Number(energy) }),
      });
      setMessage({ type: "success", text: "Session ended. Bill generated — check My Bills." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  return (
    <div className="space-y-8">
      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>{message.text}</p>
      )}

      <div>
        <h1 className="text-xl font-semibold mb-3">My Sessions</h1>
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="border border-slate-200 rounded p-3 bg-white text-sm">
              <div className="flex items-center justify-between">
                <span>
                  Connector #{s.connector_id} &mdash; started {new Date(s.start_time).toLocaleString()} &mdash;{" "}
                  <span className="font-medium">{s.session_status}</span>
                  {s.energy_delivered_kwh && <> &middot; {s.energy_delivered_kwh} kWh</>}
                </span>
              </div>
              {s.session_status === "charging" && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Energy delivered (kWh)"
                    className="border border-slate-300 rounded px-2 py-1 text-sm w-48"
                    value={energyBySession[s.id] ?? ""}
                    onChange={(e) => setEnergyBySession({ ...energyBySession, [s.id]: e.target.value })}
                  />
                  <button
                    onClick={() => endSession(s.id)}
                    className="rounded bg-slate-900 text-white px-3 py-1 text-xs"
                  >
                    End session
                  </button>
                </div>
              )}
            </li>
          ))}
          {sessions.length === 0 && <p className="text-sm text-slate-500">No sessions yet.</p>}
        </ul>
      </div>

      <div>
        <h1 className="text-xl font-semibold mb-3">My Bookings</h1>
        <ul className="space-y-2">
          {bookings.map((b) => (
            <li key={b.id} className="border border-slate-200 rounded p-3 bg-white text-sm">
              <div className="flex items-center justify-between">
                <span>
                  Connector #{b.connector_id} &mdash; {new Date(b.start_time).toLocaleString()} to{" "}
                  {new Date(b.end_time).toLocaleTimeString()} &mdash; <span className="font-medium">{b.status}</span>
                </span>
                {b.status === "confirmed" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startSession(b)}
                      className="rounded bg-slate-900 text-white px-3 py-1 text-xs"
                    >
                      Start session
                    </button>
                    <button
                      onClick={() => cancelBooking(b.id)}
                      className="rounded border border-slate-300 px-3 py-1 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
          {bookings.length === 0 && <p className="text-sm text-slate-500">No bookings yet.</p>}
        </ul>
      </div>

      <Link href="/bills" className="text-sm underline">
        View my bills &rarr;
      </Link>
    </div>
  );
}
