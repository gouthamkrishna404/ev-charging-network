"use client";

import { useEffect, useState } from "react";
import { Car, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Vehicle, VehicleModel } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Field, IconTile, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function VehiclesPage() {
  return (
    <RequireAuth role="driver">
      <VehiclesContent />
    </RequireAuth>
  );
}

function VehiclesContent() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [modelId, setModelId] = useState<number | "">("");
  const [registration, setRegistration] = useState("");

  async function load() {
    const [v, m] = await Promise.all([
      apiFetch<Vehicle[]>("/users/me/vehicles"),
      apiFetch<VehicleModel[]>("/vehicle-models"),
    ]);
    setVehicles(v);
    setModels(m);
    if (m.length > 0) setModelId((current) => (current === "" ? m[0].id : current));
  }

  useEffect(() => {
    load().catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load vehicles"));
  }, []);

  function modelLabel(id: number) {
    const model = models.find((m) => m.id === id);
    return model ? `${model.make} ${model.model_name}` : `Model #${id}`;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (modelId === "") return;
    try {
      await apiFetch("/users/me/vehicles", {
        method: "POST",
        body: JSON.stringify({ model_id: modelId, registration_number: registration }),
      });
      setRegistration("");
      toast.success("Vehicle added.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function toggleActive(vehicle: Vehicle) {
    const action = vehicle.vehicle_status === "active" ? "deactivate" : "reactivate";
    try {
      await apiFetch(`/users/me/vehicles/${vehicle.id}/${action}`, { method: "POST" });
      toast.success(action === "deactivate" ? "Vehicle deactivated." : "Vehicle reactivated.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Vehicles"
        subtitle="Add every EV you drive — we use the model to know which connectors it can use, so incompatible ones are ruled out automatically when you book."
      />

      <ul className="space-y-2">
        {vehicles === null && [...Array(2)].map((_, i) => <Skeleton key={i} className="h-[60px]" />)}
        {vehicles?.map((v) => (
          <Card key={v.id} className="p-3 flex items-center justify-between text-sm">
            <span className="flex items-center gap-3">
              <IconTile icon={Car} tone={v.vehicle_status === "active" ? "indigo" : "slate"} />
              <span>
                <span className="font-medium block">{modelLabel(v.model_id)}</span>
                <span className="text-slate-500">{v.registration_number}</span>
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Badge status={v.vehicle_status} />
              <Button variant="ghost" size="sm" onClick={() => toggleActive(v)}>
                {v.vehicle_status === "active" ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          </Card>
        ))}
        {vehicles?.length === 0 && (
          <EmptyState icon={Car}>No vehicles yet — add one below, then head to Stations to book or start charging.</EmptyState>
        )}
      </ul>

      <Card className="p-4 max-w-sm">
        <h2 className="font-medium text-sm text-slate-900 mb-3">Add a vehicle</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <Field label="Model">
            <Select className="w-full" value={modelId} onChange={(e) => setModelId(Number(e.target.value))}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.make} {m.model_name} ({m.battery_capacity_kwh} kWh)
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Registration number">
            <Input
              className="w-full"
              value={registration}
              onChange={(e) => setRegistration(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" className="w-full justify-center">
            <Plus size={15} /> Add vehicle
          </Button>
        </form>
      </Card>
    </div>
  );
}
