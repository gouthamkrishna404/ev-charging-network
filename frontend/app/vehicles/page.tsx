"use client";

import { useEffect, useState } from "react";
import { BatteryFull, Car, Plug, Plus } from "lucide-react";
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

  function modelFor(id: number) {
    return models.find((m) => m.id === id);
  }

  function modelLabel(id: number) {
    const model = modelFor(id);
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
        {vehicles?.map((v) => {
          const model = modelFor(v.model_id);
          return (
            <Card key={v.id} className="p-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <IconTile icon={Car} tone={v.vehicle_status === "active" ? "indigo" : "slate"} />
              <div className="flex-1 min-w-[160px]">
                <span className="font-medium block">{modelLabel(v.model_id)}</span>
                <span className="text-slate-500">{v.registration_number}</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  {model && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <BatteryFull size={12} /> {model.battery_capacity_kwh} kWh
                    </span>
                  )}
                  {model?.connector_type_names.map((type) => (
                    <span key={type} className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                      <Plug size={10} /> {type}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <Badge status={v.vehicle_status} />
                <Button variant="ghost" size="sm" onClick={() => toggleActive(v)}>
                  {v.vehicle_status === "active" ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            </Card>
          );
        })}
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
                  {m.make} {m.model_name} ({m.battery_capacity_kwh} kWh) · {m.connector_type_names.join("/")}
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
