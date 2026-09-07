"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Calendar, Plug, Square, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Booking, Session } from "@/lib/types";
import { Badge, Button, Card, EmptyState, IconTile, PageHeader, Skeleton } from "@/components/ui";
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
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);

  async function load() {
    const [b, s] = await Promise.all([
      apiFetch<Booking[]>("/bookings/me"),
      apiFetch<Session[]>("/sessions/me"),
    ]);
    setBookings(b);
    setSessions(s);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load your bookings"));
  }, []);

  async function cancelBooking(id: number) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await apiFetch(`/bookings/${id}/cancel`, { method: "POST" });
      toast.success("Booking cancelled.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function startSession(booking: Booking) {
    try {
      await apiFetch("/sessions/start", {
        method: "POST",
        body: JSON.stringify({
          connector_id: booking.connector_id,
          vehicle_id: booking.vehicle_id,
          booking_id: booking.id,
        }),
      });
      toast.success("Session started — plug in and charge.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function endSession(sessionId: number) {
    try {
      await apiFetch(`/sessions/${sessionId}/end`, { method: "POST" });
      toast.success("Session ended. Bill generated — check My Bills.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="My Sessions"
          subtitle="A session is created the moment you plug in — whether it came from a booking or a walk-in start. Energy delivered is read from the connector automatically, just like a real charger."
        />
        <ul className="space-y-3">
          {sessions === null &&
            [...Array(2)].map((_, i) => <Skeleton key={i} className="h-[72px]" />)}
          {sessions?.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center gap-3">
                <IconTile icon={Zap} tone={s.session_status === "charging" ? "indigo" : "slate"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    Connector #{s.connector_id}
                    <span className="text-slate-400 font-normal"> · started {new Date(s.start_time).toLocaleString()}</span>
                  </p>
                  {s.energy_delivered_kwh && (
                    <p className="text-sm text-slate-500">{s.energy_delivered_kwh} kWh delivered</p>
                  )}
                </div>
                <Badge status={s.session_status} />
              </div>
              {s.session_status === "charging" && (
                <div className="mt-3 pl-[52px] space-y-2.5">
                  <LiveEnergyEstimate startTime={s.start_time} powerKw={Number(s.connector_power_kw)} />
                  <Button onClick={() => endSession(s.id)}>
                    <Square size={12} fill="currentColor" /> End session
                  </Button>
                </div>
              )}
            </Card>
          ))}
          {sessions?.length === 0 && (
            <EmptyState icon={Zap}>
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
          {bookings === null &&
            [...Array(2)].map((_, i) => <Skeleton key={i} className="h-[72px]" />)}
          {bookings?.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-center gap-3">
                <IconTile icon={Calendar} tone={b.status === "confirmed" ? "indigo" : "slate"} />
                <div className="flex-1 min-w-0 text-sm text-slate-900">
                  Connector #{b.connector_id}
                  <div className="text-slate-500">
                    {new Date(b.start_time).toLocaleString()} — {new Date(b.end_time).toLocaleTimeString()}
                  </div>
                </div>
                <Badge status={b.status} />
              </div>
              {b.status === "confirmed" && (
                <div className="mt-3 pl-[52px] flex gap-2">
                  <Button size="sm" onClick={() => startSession(b)}>
                    <Plug size={12} /> Start session
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => cancelBooking(b.id)}>
                    <X size={12} /> Cancel
                  </Button>
                </div>
              )}
            </Card>
          ))}
          {bookings?.length === 0 && (
            <EmptyState icon={Calendar}>No upcoming bookings — walk-in sessions won&apos;t show up here.</EmptyState>
          )}
        </ul>
      </div>

      <Link href="/bills" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
        View my bills <ArrowRight size={14} />
      </Link>
    </div>
  );
}
