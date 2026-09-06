"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Booking, MeterReading, Session } from "@/lib/types";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import Sparkline from "@/components/Sparkline";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [readings, setReadings] = useState<Record<number, MeterReading[]>>({});
  const [energyBySession, setEnergyBySession] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function load() {
    const [b, s] = await Promise.all([
      apiFetch<Booking[]>("/bookings/me"),
      apiFetch<Session[]>("/sessions/me"),
    ]);
    setBookings(b);
    setSessions(s);

    const charging = s.filter((session) => session.session_status === "charging");
    const readingLists = await Promise.all(
      charging.map((session) => apiFetch<MeterReading[]>(`/sessions/${session.id}/readings`))
    );
    setReadings(Object.fromEntries(charging.map((session, i) => [session.id, readingLists[i]])));
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

  async function simulateReading(sessionId: number) {
    const previous = readings[sessionId] ?? [];
    const lastEnergy = previous.length ? Number(previous[previous.length - 1].energy_reading_kwh) : 0;
    const nextEnergy = (lastEnergy + 1.5 + Math.random() * 2).toFixed(3);
    await apiFetch(`/sessions/${sessionId}/readings`, {
      method: "POST",
      body: JSON.stringify({
        energy_reading_kwh: Number(nextEnergy),
        power_output_kw: Math.round(30 + Math.random() * 60),
      }),
    });
    const updated = await apiFetch<MeterReading[]>(`/sessions/${sessionId}/readings`);
    setReadings((prev) => ({ ...prev, [sessionId]: updated }));
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
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div>
        <PageHeader
          title="My Sessions"
          subtitle="A session is created the moment you plug in — whether it came from a booking or a walk-in start. End it here to generate your bill."
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
                  {readings[s.id]?.length > 0 && (
                    <div className="flex items-center gap-3">
                      <Sparkline values={readings[s.id].map((r) => Number(r.energy_reading_kwh))} />
                      <span className="text-xs text-slate-500">
                        {readings[s.id][readings[s.id].length - 1].energy_reading_kwh} kWh so far
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => simulateReading(s.id)}>
                      Simulate meter reading
                    </Button>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Final energy (kWh)"
                      className="w-44"
                      value={energyBySession[s.id] ?? ""}
                      onChange={(e) => setEnergyBySession({ ...energyBySession, [s.id]: e.target.value })}
                    />
                    <Button onClick={() => endSession(s.id)}>End session</Button>
                  </div>
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
