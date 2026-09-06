"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Booking, Session } from "@/lib/types";
import { Alert, Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import LiveEnergyEstimate from "@/components/LiveEnergyEstimate";
import RequireAuth from "@/components/RequireAuth";

export default function BookingsPage() {
  return (
    <RequireAuth role="driver">
      <BookingsContent />
    </RequireAuth>
  );
}

function BookingsContent() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
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
    if (!confirm("Cancel this booking?")) return;
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
    try {
      await apiFetch(`/sessions/${sessionId}/end`, { method: "POST" });
      setMessage({ type: "success", text: "Session ended. Bill generated — check My Bills." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  return (
    <div className="space-y-8">
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div>
        <PageHeader
          title="My Sessions"
          subtitle="A session is created the moment you plug in — whether it came from a booking or a walk-in start. Energy delivered is read from the connector automatically, just like a real charger."
        />
        <ul className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  Connector #{s.connector_id} — started {new Date(s.start_time).toLocaleString()}
                  {s.energy_delivered_kwh && <> · {s.energy_delivered_kwh} kWh</>}
                </span>
                <Badge status={s.session_status} />
              </div>
              {s.session_status === "charging" && (
                <div className="mt-3 space-y-2">
                  <LiveEnergyEstimate startTime={s.start_time} powerKw={Number(s.connector_power_kw)} />
                  <Button onClick={() => endSession(s.id)}>End session</Button>
                </div>
              )}
            </Card>
          ))}
          {sessions.length === 0 && (
            <EmptyState>
              No sessions yet —{" "}
              <Link href="/stations" className="underline">
                find a station
              </Link>{" "}
              to start charging.
            </EmptyState>
          )}
        </ul>
      </div>

      <div>
        <PageHeader
          title="My Bookings"
          subtitle="Reservations you've made in advance. Cancel any time before you start charging."
        />
        <ul className="space-y-3">
          {bookings.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  Connector #{b.connector_id} — {new Date(b.start_time).toLocaleString()} to{" "}
                  {new Date(b.end_time).toLocaleTimeString()}
                </span>
                <div className="flex items-center gap-2">
                  <Badge status={b.status} />
                  {b.status === "confirmed" && (
                    <>
                      <Button onClick={() => startSession(b)}>Start session</Button>
                      <Button variant="secondary" onClick={() => cancelBooking(b.id)}>
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {bookings.length === 0 && <EmptyState>No upcoming bookings — walk-in sessions won&apos;t show up here.</EmptyState>}
        </ul>
      </div>

      <Link href="/bills" className="text-sm text-slate-600 underline">
        View my bills →
      </Link>
    </div>
  );
}
