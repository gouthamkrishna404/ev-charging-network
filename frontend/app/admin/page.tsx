"use client";

import { useEffect, useState } from "react";
import {
  Ban,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  Plug,
  Plus,
  Power,
  Tag,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { isSuperAdmin } from "@/lib/auth";
import { ConnectorTypeOut, Station } from "@/lib/types";
import { AdminBooking, Maintenance, Revenue, Technician, TeamAdmin } from "@/lib/admin-types";
import { Alert, Badge, Button, Card, EmptyState, Field, IconTile, Input, PageHeader, Select, Stat, Tabs } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TABS = [
  { key: "chargers", label: "Chargers", icon: Plug },
  { key: "hours", label: "Hours", icon: Clock },
  { key: "team", label: "Team", icon: Users },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "bookings", label: "Bookings", icon: Calendar },
];

export default function AdminPage() {
  return (
    <RequireAuth role="admin">
      <AdminContent />
    </RequireAuth>
  );
}

function AdminContent() {
  const [stations, setStations] = useState<Station[]>([]);
  const [connectorTypes, setConnectorTypes] = useState<ConnectorTypeOut[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("chargers");
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [team, setTeam] = useState<TeamAdmin[]>([]);
  const [stationAdmins, setStationAdmins] = useState<TeamAdmin[]>([]);
  const [assignAdminId, setAssignAdminId] = useState<number | "">("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [revenueByStation, setRevenueByStation] = useState<Record<number, Revenue>>({});

  const [showNewStation, setShowNewStation] = useState(false);
  const [stationName, setStationName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pricePerKwh, setPricePerKwh] = useState("12.50");

  const [chargerModel, setChargerModel] = useState("");
  const [chargerPower, setChargerPower] = useState("50");
  const [connectorTypeId, setConnectorTypeId] = useState<number | "">("");
  const [connectorPower, setConnectorPower] = useState("50");
  const [maintenanceConnectorId, setMaintenanceConnectorId] = useState<number | "">("");
  const [maintenanceTechId, setMaintenanceTechId] = useState<number | "">("");
  const [maintenanceIssue, setMaintenanceIssue] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [hours, setHours] = useState<Record<string, { open: string; close: string; enabled: boolean }>>(
    Object.fromEntries(DAYS.map((d) => [d, { open: "06:00", close: "22:00", enabled: false }]))
  );

  async function load() {
    try {
      const [s, ct, tech, tm] = await Promise.all([
        apiFetch<Station[]>("/admin/stations"),
        apiFetch<ConnectorTypeOut[]>("/connector-types"),
        apiFetch<Technician[]>("/admin/technicians"),
        apiFetch<TeamAdmin[]>("/admin/team"),
      ]);
      setStations(s);
      setConnectorTypes(ct);
      setTechnicians(tech);
      setTeam(tm);

      const revenues = await Promise.all(
        s.map((station) => apiFetch<Revenue>(`/admin/stations/${station.id}/revenue`))
      );
      setRevenueByStation(Object.fromEntries(s.map((station, i) => [station.id, revenues[i]])));
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Failed to load dashboard data" });
    }
  }

  useEffect(() => {
    setCanManageTeam(isSuperAdmin());
    load();
  }, []);

  async function toggle(stationId: number) {
    if (expanded === stationId) {
      setExpanded(null);
      return;
    }
    setExpanded(stationId);
    setActiveTab("chargers");
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
      setEditPrice(station.tariff?.price_per_kwh ?? "");
    }
    const [b, r, m, sa] = await Promise.all([
      apiFetch<AdminBooking[]>(`/admin/stations/${stationId}/bookings`),
      apiFetch<Revenue>(`/admin/stations/${stationId}/revenue`),
      apiFetch<Maintenance[]>(`/admin/stations/${stationId}/maintenance`),
      apiFetch<TeamAdmin[]>(`/admin/stations/${stationId}/admins`),
    ]);
    setBookings(b);
    setRevenue(r);
    setMaintenance(m);
    setStationAdmins(sa);
  }

  async function assignAdmin(stationId: number) {
    if (assignAdminId === "") return;
    try {
      await apiFetch(`/admin/stations/${stationId}/admins/${assignAdminId}`, { method: "POST" });
      setAssignAdminId("");
      setStationAdmins(await apiFetch<TeamAdmin[]>(`/admin/stations/${stationId}/admins`));
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function unassignAdmin(stationId: number, adminId: number) {
    if (!confirm("Remove this admin from managing the station?")) return;
    try {
      await apiFetch(`/admin/stations/${stationId}/admins/${adminId}`, { method: "DELETE" });
      setStationAdmins(await apiFetch<TeamAdmin[]>(`/admin/stations/${stationId}/admins`));
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
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

  async function updateTariff(stationId: number) {
    try {
      await apiFetch(`/admin/stations/${stationId}/tariff?price_per_kwh=${Number(editPrice)}`, { method: "PUT" });
      setMessage({ type: "success", text: "Price updated." });
      await load();
      setExpanded(stationId);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function toggleStationStatus(stationId: number, current: string) {
    const next = current === "active" ? "inactive" : "active";
    if (next === "inactive" && !confirm("Deactivate this station? It will disappear from driver search immediately."))
      return;
    try {
      await apiFetch(`/admin/stations/${stationId}/status?new_status=${next}`, { method: "PUT" });
      setMessage({ type: "success", text: `Station marked ${next}.` });
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
        action={
          <Button onClick={() => setShowNewStation(!showNewStation)}>
            <Plus size={15} /> {showNewStation ? "Cancel" : "New station"}
          </Button>
        }
      />
      {message && <Alert type={message.type}>{message.text}</Alert>}

      {stations.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Network overview</p>
          </div>
          <div className="flex gap-10 mb-5">
            <Stat
              value={`₹${stations.reduce((sum, s) => sum + Number(revenueByStation[s.id]?.total_revenue ?? 0), 0).toFixed(2)}`}
              label="total revenue"
            />
            <Stat
              value={stations.reduce((sum, s) => sum + (revenueByStation[s.id]?.completed_sessions ?? 0), 0)}
              label="completed sessions"
            />
            <Stat value={stations.length} label="stations" />
          </div>
          <ul className="space-y-2.5">
            {(() => {
              const maxRevenue = Math.max(...stations.map((s) => Number(revenueByStation[s.id]?.total_revenue ?? 0)), 1);
              return stations.map((s) => {
                const rev = Number(revenueByStation[s.id]?.total_revenue ?? 0);
                const pct = Math.max((rev / maxRevenue) * 100, rev > 0 ? 4 : 0);
                return (
                  <li key={s.id} className="flex items-center gap-3 text-sm">
                    <span className="w-48 sm:w-56 truncate text-slate-600 shrink-0" title={s.station_name}>
                      {s.station_name}
                    </span>
                    <div className="flex-1 h-5 rounded-md bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-md bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-medium text-slate-900 shrink-0">₹{rev.toFixed(0)}</span>
                  </li>
                );
              });
            })()}
          </ul>
        </Card>
      )}

      {showNewStation && (
        <Card className="p-5">
          <form onSubmit={createStation} className="grid gap-3 sm:grid-cols-2">
            <Field label="Station name">
              <Input className="w-full" value={stationName} onChange={(e) => setStationName(e.target.value)} required />
            </Field>
            <Field label="Price per kWh">
              <Input
                type="number"
                step="0.01"
                className="w-full"
                value={pricePerKwh}
                onChange={(e) => setPricePerKwh(e.target.value)}
                required
              />
            </Field>
            <Field label="Address">
              <Input className="w-full" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} required />
            </Field>
            <Field label="City">
              <Input className="w-full" value={city} onChange={(e) => setCity(e.target.value)} required />
            </Field>
            <Field label="State">
              <Input className="w-full" value={stateName} onChange={(e) => setStateName(e.target.value)} required />
            </Field>
            <Button type="submit" className="sm:col-span-2 justify-center">
              Create station
            </Button>
          </form>
        </Card>
      )}

      <ul className="space-y-3">
        {stations.map((s) => (
          <Card key={s.id} className="overflow-hidden">
            <button onClick={() => toggle(s.id)} className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
              <IconTile icon={Zap} tone={s.status === "active" ? "indigo" : "slate"} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{s.station_name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1 truncate">
                  <MapPin size={12} className="shrink-0" />
                  {s.location.address_line}, {s.location.city}
                </p>
                {s.tariff && (
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                    <Tag size={11} className="shrink-0" />₹{s.tariff.price_per_kwh}/kWh
                  </p>
                )}
              </div>
              <Badge status={s.status} />
            </button>

            {expanded === s.id && (
              <div className="border-t border-slate-100">
                <div className="p-4 pb-0 flex flex-wrap items-center justify-between gap-4">
                  {revenue && (
                    <div className="flex gap-8">
                      <Stat value={`₹${revenue.total_revenue}`} label="revenue" />
                      <Stat value={revenue.completed_sessions} label="sessions" />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-500">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-24"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                    />
                    <span className="text-sm text-slate-500">/kWh</span>
                    <Button size="sm" variant="secondary" onClick={() => updateTariff(s.id)}>
                      <DollarSign size={12} /> Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => toggleStationStatus(s.id, s.status)}>
                      <Power size={12} /> {s.status === "active" ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </div>

                <div className="px-4 mt-4">
                  <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
                </div>

                <div className="p-4">
                  {activeTab === "chargers" && (
                    <div>
                      <ul className="space-y-2">
                        {s.chargers.map((c) => (
                          <li key={c.id} className="text-sm bg-slate-50 rounded-lg p-3">
                            <p className="font-medium flex items-center gap-2">
                              <Plug size={14} className="text-slate-400" />
                              {c.charger_model ?? "Charger"} <span className="text-slate-400 font-normal">· {c.power_capacity_kw} kW</span>
                            </p>
                            <ul className="ml-6 mt-1.5 space-y-1">
                              {c.connectors.map((con) => (
                                <li key={con.id} className="flex items-center gap-2 text-slate-600">
                                  {con.connector_type_name} #{con.id} · {con.max_power_kw} kW <Badge status={con.status} />
                                </li>
                              ))}
                            </ul>
                            <form onSubmit={(e) => addConnector(c.id, e)} className="flex flex-wrap gap-2 mt-2 ml-6">
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
                              <Button type="submit" variant="secondary" size="sm">
                                Add connector
                              </Button>
                            </form>
                          </li>
                        ))}
                        {s.chargers.length === 0 && <EmptyState icon={Plug}>No chargers yet.</EmptyState>}
                      </ul>
                      <form onSubmit={(e) => addCharger(s.id, e)} className="flex flex-wrap gap-2 mt-3">
                        <Input placeholder="Charger model" value={chargerModel} onChange={(e) => setChargerModel(e.target.value)} />
                        <Input
                          type="number"
                          className="w-28"
                          value={chargerPower}
                          onChange={(e) => setChargerPower(e.target.value)}
                          placeholder="kW"
                        />
                        <Button type="submit" variant="secondary">
                          <Plus size={13} /> Add charger
                        </Button>
                      </form>
                    </div>
                  )}

                  {activeTab === "hours" && (
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                      <Button variant="secondary" size="sm" className="mt-3" onClick={() => saveHours(s.id)}>
                        Save hours
                      </Button>
                      <p className="text-xs text-slate-400 mt-1.5">Unchecked days = closed. No days checked = open 24/7.</p>
                    </div>
                  )}

                  {activeTab === "team" && (
                    <div>
                      <ul className="space-y-1.5 mb-3">
                        {stationAdmins.map((a) => (
                          <li key={a.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 text-sm">
                            <span className="flex items-center gap-2">
                              {a.name} <Badge status={a.role} />
                            </span>
                            {canManageTeam && stationAdmins.length > 1 && (
                              <Button variant="ghost" size="sm" onClick={() => unassignAdmin(s.id, a.id)}>
                                <UserMinus size={12} /> Remove
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                      {canManageTeam && (
                        <div className="flex gap-2">
                          <Select value={assignAdminId} onChange={(e) => setAssignAdminId(Number(e.target.value))}>
                            <option value="">Add admin…</option>
                            {team
                              .filter((t) => !stationAdmins.some((sa) => sa.id === t.id))
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                          </Select>
                          <Button variant="secondary" onClick={() => assignAdmin(s.id)}>
                            <UserPlus size={13} /> Assign
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "maintenance" && (
                    <div>
                      <ul className="space-y-1.5 mb-3">
                        {maintenance.map((m) => (
                          <li key={m.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 text-sm">
                            <span>
                              Connector #{m.connector_id} — {m.issue_description} <Badge status={m.status} />
                            </span>
                            {m.status !== "completed" && (
                              <Button variant="ghost" size="sm" onClick={() => completeMaintenance(m.id, s.id)}>
                                <CheckCircle2 size={12} /> Complete
                              </Button>
                            )}
                          </li>
                        ))}
                        {maintenance.length === 0 && <EmptyState icon={Wrench}>No maintenance tickets.</EmptyState>}
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
                      {technicians.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          <Ban size={12} /> No technicians yet — add one from the Team page first.
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === "bookings" && (
                    <ul className="space-y-1.5">
                      {bookings.map((b) => (
                        <li key={b.id} className="text-slate-600 flex items-center gap-2 text-sm bg-slate-50 rounded-lg p-2.5">
                          Connector #{b.connector_id} — {new Date(b.start_time).toLocaleString()} <Badge status={b.status} />
                        </li>
                      ))}
                      {bookings.length === 0 && <EmptyState icon={Calendar}>No bookings.</EmptyState>}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
        {stations.length === 0 && (
          <EmptyState icon={Building2}>No stations yet — create one above.</EmptyState>
        )}
      </ul>
    </div>
  );
}
