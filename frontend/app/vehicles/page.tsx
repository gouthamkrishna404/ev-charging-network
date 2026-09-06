"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Vehicle, VehicleModel } from "@/lib/types";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui";

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

  async function toggleActive(vehicle: Vehicle) {
    setError(null);
    const action = vehicle.vehicle_status === "active" ? "deactivate" : "reactivate";
    try {
      await apiFetch(`/users/me/vehicles/${vehicle.id}/${action}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Vehicles"
        subtitle="Add every EV you drive — we use the model to know which connectors it can use, so incompatible ones are ruled out automatically when you book."
      />

      <ul className="space-y-2">
        {vehicles.map((v) => (
          <Card key={v.id} className="p-3 flex items-center justify-between text-sm">
            <span>
              <span className="font-medium">{modelLabel(v.model_id)}</span> — {v.registration_number}
            </span>
            <div className="flex items-center gap-2">
              <Badge status={v.vehicle_status} />
              <Button variant="ghost" onClick={() => toggleActive(v)}>
                {v.vehicle_status === "active" ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          </Card>
        ))}
        {vehicles.length === 0 && (
          <EmptyState>No vehicles yet — add one below, then head to Stations to book or start charging.</EmptyState>
        )}
      </ul>

      <Card className="p-4 max-w-sm">
        <h2 className="font-medium text-sm mb-3">Add a vehicle</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <Select className="w-full" value={modelId} onChange={(e) => setModelId(Number(e.target.value))}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.make} {m.model_name} ({m.battery_capacity_kwh} kWh)
              </option>
            ))}
          </Select>
          <Input
            placeholder="Registration number"
            className="w-full"
            value={registration}
            onChange={(e) => setRegistration(e.target.value)}
            required
          />
          {error && <Alert type="error">{error}</Alert>}
          <Button type="submit" className="w-full">
            Add vehicle
          </Button>
        </form>
      </Card>
    </div>
  );
}
