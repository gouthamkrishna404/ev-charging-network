"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Station, Vehicle } from "@/lib/types";

export default function StationDetailPage(props: PageProps<"/stations/[id]">) {
  const { id } = use(props.params);
  const router = useRouter();

  const [station, setStation] = useState<Station | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [bookingConnectorId, setBookingConnectorId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function load() {
    const [s, v] = await Promise.all([
      apiFetch<Station>(`/stations/${id}`),
      apiFetch<Vehicle[]>("/users/me/vehicles"),
    ]);
    setStation(s);
    setVehicles(v);
    if (v.length > 0) setVehicleId(v[0].id);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function startWalkIn(connectorId: number) {
    setMessage(null);
    if (vehicleId === "") {
      setMessage({ type: "error", text: "Add a vehicle first." });
      return;
    }
    try {
      await apiFetch("/sessions/start", {
        method: "POST",
        body: JSON.stringify({ connector_id: connectorId, vehicle_id: vehicleId }),
      });
      setMessage({ type: "success", text: "Session started. Manage it from My Bookings." });
      router.push("/bookings");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (vehicleId === "" || bookingConnectorId === null) return;
    try {
      await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          vehicle_id: vehicleId,
          connector_id: bookingConnectorId,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
        }),
      });
      setMessage({ type: "success", text: "Booking confirmed." });
      setBookingConnectorId(null);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  if (!station) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{station.station_name}</h1>
        <p className="text-sm text-slate-600">
          {station.location.address_line}, {station.location.city}, {station.location.state}
        </p>
        {station.tariff && <p className="text-sm text-slate-600">₹{station.tariff.price_per_kwh} / kWh</p>}
      </div>

      {vehicles.length === 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          You need to add a vehicle before booking or charging. Go to My Vehicles first.
        </p>
      )}

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>{message.text}</p>
      )}

      <div className="space-y-4">
        {station.chargers.map((charger) => (
          <div key={charger.id} className="border border-slate-200 rounded p-4 bg-white">
            <p className="font-medium text-sm">
              {charger.charger_model ?? "Charger"} &mdash; {charger.power_capacity_kw} kW
            </p>
            <ul className="mt-2 space-y-2">
              {charger.connectors.map((connector) => (
                <li key={connector.id} className="flex items-center justify-between text-sm border-t border-slate-100 pt-2">
                  <span>
                    Connector #{connector.id} &mdash; {connector.max_power_kw} kW &mdash;{" "}
                    <span
                      className={connector.status === "available" ? "text-green-700" : "text-slate-500"}
                    >
                      {connector.status}
                    </span>
                  </span>
                  {connector.status === "available" && vehicles.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startWalkIn(connector.id)}
                        className="rounded bg-slate-900 text-white px-3 py-1 text-xs"
                      >
                        Start now
                      </button>
                      <button
                        onClick={() => setBookingConnectorId(connector.id)}
                        className="rounded border border-slate-300 px-3 py-1 text-xs"
                      >
                        Book for later
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {bookingConnectorId !== null && charger.connectors.some((c) => c.id === bookingConnectorId) && (
              <form onSubmit={submitBooking} className="mt-3 flex flex-wrap items-end gap-2 bg-slate-50 p-3 rounded">
                <label className="text-xs">
                  Start
                  <input
                    type="datetime-local"
                    required
                    className="block border border-slate-300 rounded px-2 py-1 text-sm"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </label>
                <label className="text-xs">
                  End
                  <input
                    type="datetime-local"
                    required
                    className="block border border-slate-300 rounded px-2 py-1 text-sm"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </label>
                <button type="submit" className="rounded bg-slate-900 text-white px-3 py-2 text-xs">
                  Confirm booking
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
