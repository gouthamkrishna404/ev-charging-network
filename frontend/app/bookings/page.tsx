"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, Clock, History, Plug, Receipt, Square, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Booking, Session } from "@/lib/types";
import { Badge, Button, Card, EmptyState, IconTile, PageHeader, SectionHeading, Skeleton, Stat } from "@/components/ui";
import LiveEnergyEstimate from "@/components/LiveEnergyEstimate";
import RequireAuth from "@/components/RequireAuth";

export default function BookingsPage() {
  return (
    <RequireAuth role="driver">
      <BookingsContent />
    </RequireAuth>
  );
}

function relativeDay(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`;
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

  const loading = bookings === null || sessions === null;
  const activeSession = sessions?.find((s) => s.session_status === "charging") ?? null;
  const pastSessions = sessions?.filter((s) => s.session_status !== "charging") ?? [];
  const upcomingBookings = bookings?.filter((b) => b.status === "confirmed") ?? [];
  // "completed" bookings are intentionally excluded here -- the session they produced
  // already appears in history with richer detail (energy delivered, live status).
  // Only bookings that never turned into a session are worth surfacing again.
  const unfulfilledBookings = bookings?.filter((b) => b.status === "cancelled" || b.status === "no_show") ?? [];
  const totalEnergy = (sessions ?? []).reduce((sum, s) => sum + (s.energy_delivered_kwh ? Number(s.energy_delivered_kwh) : 0), 0);
  const completedCount = (sessions ?? []).filter((s) => s.session_status === "completed").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bookings & Sessions"
        subtitle="Reserve a connector ahead of time, or start charging the moment you plug in — energy delivered is read from the connector automatically."
      />

      {!loading && (sessions!.length > 0 || bookings!.length > 0) && (
        <Card className="p-5 flex flex-wrap gap-8">
          <Stat value={completedCount} label="sessions completed" />
          <Stat value={`${totalEnergy.toFixed(1)} kWh`} label="total energy delivered" />
          <Stat value={upcomingBookings.length} label="upcoming bookings" />
        </Card>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {activeSession && (
        <Card className="p-5 border-indigo-200 ring-1 ring-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white animate-fade-in-up">
          <div className="flex items-start gap-4">
            <IconTile icon={Zap} tone="indigo" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900">{activeSession.station_name}</p>
                <Badge status={activeSession.session_status} />
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {activeSession.connector_type_name} · started {relativeDay(activeSession.start_time)}
              </p>
              <div className="mt-3 space-y-3">
                <LiveEnergyEstimate startTime={activeSession.start_time} powerKw={Number(activeSession.connector_power_kw)} />
                <Button onClick={() => endSession(activeSession.id)}>
                  <Square size={12} fill="currentColor" /> End session
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div>
        <SectionHeading icon={Calendar} title="Upcoming bookings" />
        <ul className="space-y-3">
          {loading && [...Array(2)].map((_, i) => <Skeleton key={i} className="h-[76px]" />)}
          {!loading && upcomingBookings.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-center gap-3">
                <IconTile icon={Plug} tone="indigo" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{b.station_name}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 flex-wrap">
                    <span>{b.connector_type_name}</span>
                    <span className="text-slate-300">·</span>
                    <Clock size={12} className="text-slate-400" />
                    {new Date(b.start_time).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    {" – "}
                    {new Date(b.end_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <Badge status={b.status} />
              </div>
              <div className="mt-3 pl-[52px] flex gap-2">
                <Button size="sm" onClick={() => startSession(b)}>
                  <Plug size={12} /> Start session
                </Button>
                <Button size="sm" variant="secondary" onClick={() => cancelBooking(b.id)}>
                  <X size={12} /> Cancel
                </Button>
              </div>
            </Card>
          ))}
          {!loading && upcomingBookings.length === 0 && (
            <EmptyState icon={Calendar}>
              No upcoming bookings —{" "}
              <Link href="/stations" className="underline">
                find a station
              </Link>{" "}
              to reserve a connector, or walk in any time.
            </EmptyState>
          )}
        </ul>
      </div>

      <div>
        <SectionHeading icon={History} title="Session history" />
        <ul className="space-y-2">
          {loading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
          {!loading && pastSessions.map((s) => (
            <Card key={s.id} className="p-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <IconTile icon={Zap} tone="slate" />
              <div className="flex-1 min-w-[140px] text-sm">
                <p className="text-slate-900 truncate">
                  <span className="font-medium">{s.station_name}</span>
                  <span className="text-slate-400"> · {s.connector_type_name}</span>
                </p>
                <p className="text-slate-500 text-xs">{relativeDay(s.start_time)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {s.energy_delivered_kwh && (
                  <span className="text-sm font-medium text-slate-700">{Number(s.energy_delivered_kwh).toFixed(2)} kWh</span>
                )}
                <Badge status={s.session_status} />
              </div>
            </Card>
          ))}
          {!loading && pastSessions.length === 0 && <EmptyState icon={Zap}>No past sessions yet.</EmptyState>}
          {!loading && unfulfilledBookings.map((b) => (
            <Card key={`booking-${b.id}`} className="p-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <IconTile icon={Calendar} tone="slate" />
              <div className="flex-1 min-w-[140px] text-sm">
                <p className="text-slate-900 truncate">
                  <span className="font-medium">{b.station_name}</span>
                  <span className="text-slate-400"> · {b.connector_type_name}</span>
                </p>
                <p className="text-slate-500 text-xs">{relativeDay(b.start_time)}</p>
              </div>
              <Badge status={b.status} />
            </Card>
          ))}
        </ul>
      </div>

      <Link href="/bills" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
        <Receipt size={14} /> View my bills
      </Link>
    </div>
  );
}
