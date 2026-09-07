"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { isSuperAdmin } from "@/lib/auth";
import { ChargingPlan } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Field, IconTile, Input, PageHeader, Skeleton } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function AdminPlansPage() {
  return (
    <RequireAuth role="admin">
      <AdminPlansContent />
    </RequireAuth>
  );
}

function AdminPlansContent() {
  const [plans, setPlans] = useState<ChargingPlan[] | null>(null);
  const [planName, setPlanName] = useState("");
  const [fee, setFee] = useState("299");
  const [validityDays, setValidityDays] = useState("30");
  const [discount, setDiscount] = useState("10");
  const [priorityBooking, setPriorityBooking] = useState(false);
  const [maxSessions, setMaxSessions] = useState("");
  const [canManage, setCanManage] = useState(false);

  async function load() {
    setPlans(await apiFetch<ChargingPlan[]>("/admin/plans"));
  }

  useEffect(() => {
    setCanManage(isSuperAdmin());
    load().catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load plans"));
  }, []);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/admin/plans", {
        method: "POST",
        body: JSON.stringify({
          plan_name: planName,
          subscription_fee: Number(fee),
          validity_days: Number(validityDays),
          discount_percentage: Number(discount),
          priority_booking: priorityBooking,
          max_sessions: maxSessions ? Number(maxSessions) : null,
        }),
      });
      setPlanName("");
      toast.success("Plan created.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function deactivate(id: number) {
    if (!confirm("Deactivate this plan? Existing subscribers keep their discount until it expires, but no one new can subscribe.")) return;
    try {
      await apiFetch(`/admin/plans/${id}/deactivate`, { method: "POST" });
      toast.success("Plan deactivated.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function reactivate(id: number) {
    try {
      await apiFetch(`/admin/plans/${id}/reactivate`, { method: "POST" });
      toast.success("Plan reactivated.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Charging Plans"
        subtitle="Subscription plans you sell. The discount is a network-wide perk — once a driver subscribes to any plan, it applies at every operator's stations, not just yours."
      />

      <ul className="space-y-2">
        {plans === null && [...Array(2)].map((_, i) => <Skeleton key={i} className="h-[52px]" />)}
        {plans?.map((plan) => (
          <Card key={plan.id} className="p-3 flex items-center justify-between text-sm">
            <span className="flex items-center gap-3">
              <IconTile icon={Tag} tone={plan.status === "active" ? "indigo" : "slate"} />
              <span>
                <span className="font-medium">{plan.plan_name}</span> — ₹{plan.subscription_fee} /{" "}
                {plan.validity_days} days — {plan.discount_percentage}% off
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Badge status={plan.status} />
              {canManage && plan.status === "active" && (
                <Button variant="ghost" size="sm" onClick={() => deactivate(plan.id)}>
                  <X size={12} /> Deactivate
                </Button>
              )}
              {canManage && plan.status === "inactive" && (
                <Button variant="ghost" size="sm" onClick={() => reactivate(plan.id)}>
                  <RotateCcw size={12} /> Reactivate
                </Button>
              )}
            </div>
          </Card>
        ))}
        {plans?.length === 0 && <EmptyState icon={Tag}>No plans yet.</EmptyState>}
      </ul>

      {canManage ? (
        <Card className="p-5 max-w-md">
          <h2 className="font-medium text-sm text-slate-900 mb-3">Create a plan</h2>
          <form onSubmit={createPlan} className="space-y-3">
            <Field label="Plan name">
              <Input className="w-full" value={planName} onChange={(e) => setPlanName(e.target.value)} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fee (₹)">
                <Input type="number" step="0.01" className="w-full" value={fee} onChange={(e) => setFee(e.target.value)} required />
              </Field>
              <Field label="Validity (days)">
                <Input type="number" className="w-full" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} required />
              </Field>
              <Field label="Discount (%)">
                <Input type="number" step="0.01" className="w-full" value={discount} onChange={(e) => setDiscount(e.target.value)} required />
              </Field>
              <Field label="Max sessions">
                <Input type="number" className="w-full" placeholder="Unlimited" value={maxSessions} onChange={(e) => setMaxSessions(e.target.value)} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={priorityBooking} onChange={(e) => setPriorityBooking(e.target.checked)} />
              Priority booking
            </label>
            <Button type="submit" className="w-full justify-center">
              <Plus size={15} /> Create plan
            </Button>
          </form>
        </Card>
      ) : (
        <p className="text-sm text-slate-500">Only a super admin can create or deactivate plans.</p>
      )}
    </div>
  );
}
