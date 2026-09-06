"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { isSuperAdmin } from "@/lib/auth";
import { ChargingPlan } from "@/lib/types";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function AdminPlansPage() {
  return (
    <RequireAuth role="admin">
      <AdminPlansContent />
    </RequireAuth>
  );
}

function AdminPlansContent() {
  const [plans, setPlans] = useState<ChargingPlan[]>([]);
  const [planName, setPlanName] = useState("");
  const [fee, setFee] = useState("299");
  const [validityDays, setValidityDays] = useState("30");
  const [discount, setDiscount] = useState("10");
  const [priorityBooking, setPriorityBooking] = useState(false);
  const [maxSessions, setMaxSessions] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [canManage, setCanManage] = useState(false);

  async function load() {
    setPlans(await apiFetch<ChargingPlan[]>("/admin/plans"));
  }

  useEffect(() => {
    setCanManage(isSuperAdmin());
    load();
  }, []);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
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
      setMessage({ type: "success", text: "Plan created." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function deactivate(id: number) {
    if (!confirm("Deactivate this plan? Existing subscribers keep their discount until it expires, but no one new can subscribe.")) return;
    await apiFetch(`/admin/plans/${id}/deactivate`, { method: "POST" });
    await load();
  }

  async function reactivate(id: number) {
    await apiFetch(`/admin/plans/${id}/reactivate`, { method: "POST" });
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Charging Plans"
        subtitle="Subscription plans drivers can buy for a discount at your stations specifically — other networks' subscribers don't get your discount, and vice versa."
      />
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <ul className="space-y-2">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-3 flex items-center justify-between text-sm">
            <span>
              <span className="font-medium">{plan.plan_name}</span> — ₹{plan.subscription_fee} / {plan.validity_days}{" "}
              days — {plan.discount_percentage}% off
            </span>
            <div className="flex items-center gap-2">
              <Badge status={plan.status} />
              {canManage && plan.status === "active" && (
                <Button variant="ghost" onClick={() => deactivate(plan.id)}>
                  Deactivate
                </Button>
              )}
              {canManage && plan.status === "inactive" && (
                <Button variant="ghost" onClick={() => reactivate(plan.id)}>
                  Reactivate
                </Button>
              )}
            </div>
          </Card>
        ))}
        {plans.length === 0 && <EmptyState>No plans yet.</EmptyState>}
      </ul>

      {canManage ? (
        <Card className="p-4 max-w-md">
          <h2 className="font-medium text-sm mb-3">Create a plan</h2>
          <form onSubmit={createPlan} className="space-y-3">
            <Input placeholder="Plan name" value={planName} onChange={(e) => setPlanName(e.target.value)} required />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="0.01" placeholder="Fee (₹)" value={fee} onChange={(e) => setFee(e.target.value)} required />
              <Input type="number" placeholder="Validity (days)" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} required />
              <Input type="number" step="0.01" placeholder="Discount (%)" value={discount} onChange={(e) => setDiscount(e.target.value)} required />
              <Input type="number" placeholder="Max sessions (blank = unlimited)" value={maxSessions} onChange={(e) => setMaxSessions(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={priorityBooking} onChange={(e) => setPriorityBooking(e.target.checked)} />
              Priority booking
            </label>
            <Button type="submit" className="w-full">
              Create plan
            </Button>
          </form>
        </Card>
      ) : (
        <p className="text-sm text-slate-500">Only a super admin can create or deactivate plans.</p>
      )}
    </div>
  );
}
