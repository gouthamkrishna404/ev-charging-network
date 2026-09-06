"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Vehicle, VehicleModel } from "@/lib/types";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [modelId, setModelId] = useState<number | "">("");
  const [registration, setRegistration] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [v, m] = await Promise.all([
      apiFetch<Vehicle[]>("/users/me/vehicles"),
      apiFetch<VehicleModel[]>("/vehicle-models"),
    ]);
    setVehicles(v);
    setModels(m);
    if (m.length > 0) setModelId(m[0].id);
  }

  useEffect(() => {
    load();
  }, []);

  function modelLabel(id: number) {
    const model = models.find((m) => m.id === id);
    return model ? `${model.make} ${model.model_name}` : `Model #${id}`;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (modelId === "") return;
    try {
      await apiFetch("/users/me/vehicles", {
        method: "POST",
        body: JSON.stringify({ model_id: modelId, registration_number: registration }),
      });
      setRegistration("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Vehicles</h1>

      <ul className="space-y-2">
        {vehicles.map((v) => (
          <li key={v.id} className="border border-slate-200 rounded p-3 bg-white text-sm">
            <span className="font-medium">{modelLabel(v.model_id)}</span> &mdash; {v.registration_number}{" "}
            <span className="text-slate-500">({v.vehicle_status})</span>
          </li>
        ))}
        {vehicles.length === 0 && <p className="text-sm text-slate-500">No vehicles yet.</p>}
      </ul>

      <form onSubmit={handleAdd} className="border-t border-slate-200 pt-4 space-y-3 max-w-sm">
        <h2 className="font-medium text-sm">Add a vehicle</h2>
        <select
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          value={modelId}
          onChange={(e) => setModelId(Number(e.target.value))}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.make} {m.model_name} ({m.battery_capacity_kwh} kWh)
            </option>
          ))}
        </select>
        <input
          placeholder="Registration number"
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          value={registration}
          onChange={(e) => setRegistration(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-slate-900 text-white px-4 py-2 text-sm">
          Add vehicle
        </button>
      </form>
    </div>
  );
}
