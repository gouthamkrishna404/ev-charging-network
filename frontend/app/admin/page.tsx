"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { ConnectorTypeOut, Station } from "@/lib/types";
import { AdminBooking, Maintenance, Revenue, Technician } from "@/lib/admin-types";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AdminPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [connectorTypes, setConnectorTypes] = useState<ConnectorTypeOut[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // new station form
  const [showNewStation, setShowNewStation] = useState(false);
  const [stationName, setStationName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pricePerKwh, setPricePerKwh] = useState("12.50");

  // per-station transient form state
  const [chargerModel, setChargerModel] = useState("");
  const [chargerPower, setChargerPower] = useState("50");
  const [connectorTypeId, setConnectorTypeId] = useState<number | "">("");
  const [connectorPower, setConnectorPower] = useState("50");
  const [maintenanceConnectorId, setMaintenanceConnectorId] = useState<number | "">("");
  const [maintenanceTechId, setMaintenanceTechId] = useState<number | "">("");
  const [maintenanceIssue, setMaintenanceIssue] = useState("");
  const [hours, setHours] = useState<Record<string, { open: string; close: string; enabled: boolean }>>(
    Object.fromEntries(DAYS.map((d) => [d, { open: "06:00", close: "22:00", enabled: false }]))
  );

  async function load() {
    try {
      const [s, ct, tech] = await Promise.all([
        apiFetch<Station[]>("/admin/stations"),
        apiFetch<ConnectorTypeOut[]>("/connector-types"),
        apiFetch<Technician[]>("/admin/technicians"),
      ]);
      setStations(s);
      setConnectorTypes(ct);
      setTechnicians(tech);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Failed to load dashboard data" });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(stationId: number) {
    if (expanded === stationId) {
      setExpanded(null);
      return;
    }
    setExpanded(stationId);
    const station = stations.find((st) => st.id === stationId);
    if (station) {
      const initHours = Object.fromEntries(
        DAYS.map((d) => {
          const existing = station.operating_hours.find((h) => h.day_of_week === d);
          return [
            d,
            existing
              ? { open: existing.opening_time.slice(0, 5), close: existing.closing_time.slice(0, 5), enabled: true }
              : { open: "06:00", close: "22:00", enabled: false },
          ];
        })
      );
      setHours(initHours);
    }
    const [b, r, m] = await Promise.all([
      apiFetch<AdminBooking[]>(`/admin/stations/${stationId}/bookings`),
      apiFetch<Revenue>(`/admin/stations/${stationId}/revenue`),
      apiFetch<Maintenance[]>(`/admin/stations/${stationId}/maintenance`),
    ]);
    setBookings(b);
    setRevenue(r);
    setMaintenance(m);
  }

  async function createStation(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await apiFetch("/admin/stations", {
        method: "POST",
        body: JSON.stringify({
          station_name: stationName,
          location: { address_line: addressLine, city, state: stateName },
          price_per_kwh: Number(pricePerKwh),
        }),
      });
      setStationName("");
      setAddressLine("");
      setCity("");
      setStateName("");
      setShowNewStation(false);
      setMessage({ type: "success", text: "Station created." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function addCharger(stationId: number, e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch(`/admin/stations/${stationId}/chargers`, {
        method: "POST",
        body: JSON.stringify({ charger_model: chargerModel || null, power_capacity_kw: Number(chargerPower) }),
      });
      setChargerModel("");
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function addConnector(chargerId: number, e: React.FormEvent) {
    e.preventDefault();
    if (connectorTypeId === "") return;
    try {
      await apiFetch(`/admin/chargers/${chargerId}/connectors`, {
        method: "POST",
        body: JSON.stringify({ connector_type_id: connectorTypeId, max_power_kw: Number(connectorPower) }),
      });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function saveHours(stationId: number) {
    const payload = DAYS.filter((d) => hours[d].enabled).map((d) => ({
      day_of_week: d,
      opening_time: hours[d].open,
      closing_time: hours[d].close,
    }));
    try {
      await apiFetch(`/admin/stations/${stationId}/operating-hours`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setMessage({ type: "success", text: "Operating hours updated." });
      await load();
      setExpanded(stationId);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function createMaintenance(stationId: number, e: React.FormEvent) {
    e.preventDefault();
    if (maintenanceConnectorId === "" || maintenanceTechId === "") return;
    try {
      await apiFetch(`/admin/stations/${stationId}/maintenance`, {
        method: "POST",
        body: JSON.stringify({
          connector_id: maintenanceConnectorId,
          technician_id: maintenanceTechId,
          issue_description: maintenanceIssue,
          priority: "medium",
          scheduled_date: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      setMaintenanceIssue("");
      await load();
      setExpanded(stationId);
      const m = await apiFetch<Maintenance[]>(`/admin/stations/${stationId}/maintenance`);
      setMaintenance(m);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function completeMaintenance(ticketId: number, stationId: number) {
    await apiFetch(`/admin/maintenance/${ticketId}/complete`, { method: "POST" });
    await load();
    const m = await apiFetch<Maintenance[]>(`/admin/stations/${stationId}/maintenance`);
    setMaintenance(m);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stations I Manage"
        subtitle="Click a station to manage its chargers, connectors, pricing, hours, and maintenance."
        action={<Button onClick={() => setShowNewStation(!showNewStation)}>{showNewStation ? "Cancel" : "+ New station"}</Button>}
      />
      {message && <Alert type={message.type}>{message.text}</Alert>}

      {showNewStation && (
        <Card className="p-4">
          <form onSubmit={createStation} className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Station name" value={stationName} onChange={(e) => setStationName(e.target.value)} required />
            <Input placeholder="Price per kWh" type="number" step="0.01" value={pricePerKwh} onChange={(e) => setPricePerKwh(e.target.value)} required />
            <Input placeholder="Address" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} required />
            <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
            <Input placeholder="State" value={stateName} onChange={(e) => setStateName(e.target.value)} required />
            <Button type="submit" className="sm:col-span-2">
              Create station
            </Button>
          </form>
        </Card>
      )}

      <ul className="space-y-3">
        {stations.map((s) => (
          <Card key={s.id} className="p-4">
            <button onClick={() => toggle(s.id)} className="font-medium text-slate-900 hover:underline text-left w-full flex justify-between">
              <span>{s.station_name}</span>
              <Badge status={s.status} />
            </button>
            <p className="text-sm text-slate-500">
              {s.location.address_line}, {s.location.city} · ₹{s.tariff?.price_per_kwh}/kWh
            </p>

            {expanded === s.id && (
              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                {revenue && (
                  <p className="text-sm">
                    Revenue: <span className="font-medium">₹{revenue.total_revenue}</span> from {revenue.completed_sessions} completed session(s)
                  </p>
                )}

                <div>
                  <p className="text-sm font-medium mb-1">Chargers & connectors</p>
                  <ul className="space-y-2">
                    {s.chargers.map((c) => (
                      <li key={c.id} className="text-sm bg-slate-50 rounded-md p-2">
                        <p className="font-medium">
                          {c.charger_model ?? "Charger"} — {c.power_capacity_kw} kW
                        </p>
                        <ul className="ml-3 mt-1 space-y-1">
                          {c.connectors.map((con) => (
                            <li key={con.id} className="flex items-center gap-2 text-slate-600">
                              Connector #{con.id} — {con.max_power_kw} kW <Badge status={con.status} />
                            </li>
                          ))}
                        </ul>
                        <form onSubmit={(e) => addConnector(c.id, e)} className="flex flex-wrap gap-2 mt-2">
                          <Select
                            value={connectorTypeId}
                            onChange={(e) => setConnectorTypeId(Number(e.target.value))}
                            className="text-xs"
                          >
                            <option value="">Connector type…</option>
                            {connectorTypes.map((ct) => (
                              <option key={ct.id} value={ct.id}>
                                {ct.type_name}
                              </option>
                            ))}
                          </Select>
                          <Input
                            type="number"
                            className="w-24 text-xs"
                            value={connectorPower}
                            onChange={(e) => setConnectorPower(e.target.value)}
                            placeholder="kW"
                          />
                          <Button type="submit" variant="secondary">
                            Add connector
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <form onSubmit={(e) => addCharger(s.id, e)} className="flex flex-wrap gap-2 mt-2">
                    <Input placeholder="Charger model" value={chargerModel} onChange={(e) => setChargerModel(e.target.value)} />
                    <Input
                      type="number"
                      className="w-28"
                      value={chargerPower}
                      onChange={(e) => setChargerPower(e.target.value)}
                      placeholder="kW"
                    />
                    <Button type="submit" variant="secondary">
                      Add charger
                    </Button>
                  </form>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Operating hours</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {DAYS.map((d) => (
                      <label key={d} className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={hours[d].enabled}
                          onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], enabled: e.target.checked } })}
                        />
                        <span className="w-20">{d}</span>
                        <input
                          type="time"
                          value={hours[d].open}
                          disabled={!hours[d].enabled}
                          onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], open: e.target.value } })}
                          className="border border-slate-300 rounded px-1 py-0.5"
                        />
                        <input
                          type="time"
                          value={hours[d].close}
                          disabled={!hours[d].enabled}
                          onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], close: e.target.value } })}
                          className="border border-slate-300 rounded px-1 py-0.5"
                        />
                      </label>
                    ))}
                  </div>
                  <Button variant="secondary" className="mt-2" onClick={() => saveHours(s.id)}>
                    Save hours
                  </Button>
                  <p className="text-xs text-slate-400 mt-1">Unchecked days = closed. No days checked = open 24/7.</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Maintenance</p>
                  <ul className="space-y-1 text-sm mb-2">
                    {maintenance.map((m) => (
                      <li key={m.id} className="flex items-center justify-between bg-slate-50 rounded-md p-2">
                        <span>
                          Connector #{m.connector_id} — {m.issue_description} <Badge status={m.status} />
                        </span>
                        {m.status !== "completed" && (
                          <Button variant="ghost" onClick={() => completeMaintenance(m.id, s.id)}>
                            Mark completed
                          </Button>
                        )}
                      </li>
                    ))}
                    {maintenance.length === 0 && <EmptyState>No maintenance tickets.</EmptyState>}
                  </ul>
                  <form onSubmit={(e) => createMaintenance(s.id, e)} className="flex flex-wrap gap-2">
                    <Select value={maintenanceConnectorId} onChange={(e) => setMaintenanceConnectorId(Number(e.target.value))}>
                      <option value="">Connector…</option>
                      {s.chargers.flatMap((c) => c.connectors).map((con) => (
                        <option key={con.id} value={con.id}>
                          #{con.id}
                        </option>
                      ))}
                    </Select>
                    <Select value={maintenanceTechId} onChange={(e) => setMaintenanceTechId(Number(e.target.value))}>
                      <option value="">Technician…</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                    <Input
                      placeholder="Issue description"
                      className="flex-1 min-w-[160px]"
                      value={maintenanceIssue}
                      onChange={(e) => setMaintenanceIssue(e.target.value)}
                    />
                    <Button type="submit" variant="secondary">
                      Open ticket
                    </Button>
                  </form>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Bookings</p>
                  <ul className="space-y-1 text-sm">
                    {bookings.map((b) => (
                      <li key={b.id} className="text-slate-600 flex items-center gap-2">
                        Connector #{b.connector_id} — {new Date(b.start_time).toLocaleString()} <Badge status={b.status} />
                      </li>
                    ))}
                    {bookings.length === 0 && <EmptyState>No bookings.</EmptyState>}
                  </ul>
                </div>
              </div>
            )}
          </Card>
        ))}
        {stations.length === 0 && <EmptyState>No stations yet — create one above.</EmptyState>}
      </ul>
    </div>
  );
}
