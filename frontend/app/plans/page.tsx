"use client";

import { useEffect, useState } from "react";
import { Building2, Check, Globe, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { ChargingPlan, Subscription } from "@/lib/types";
import { Badge, Button, Card, PageHeader, Skeleton } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function PlansPage() {
  return (
    <RequireAuth role="driver">
      <PlansContent />
    </RequireAuth>
  );
}

function PlansContent() {
  const [plans, setPlans] = useState<ChargingPlan[] | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  async function load() {
    const [p, s] = await Promise.all([
      apiFetch<ChargingPlan[]>("/plans"),
      apiFetch<Subscription[]>("/subscriptions/me"),
    ]);
    setPlans(p);
    setSubscriptions(s);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load plans"));
  }, []);

  function planFor(sub: Subscription) {
    return (plans ?? []).find((p) => p.id === sub.plan_id);
  }

  async function subscribe(planId: number) {
    try {
      const sub = await apiFetch<Subscription>("/subscriptions", {
        method: "POST",
        body: JSON.stringify({ plan_id: planId }),
      });
      await apiFetch("/payments", {
        method: "POST",
        body: JSON.stringify({ subscription_id: sub.id, payment_method: "card" }),
      });
      toast.success("Subscribed! Your discount now applies at every station on the network.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function cancelSubscription(id: number) {
    if (!confirm("Cancel this subscription? You'll lose the discount immediately.")) return;
    try {
      await apiFetch(`/subscriptions/${id}/cancel`, { method: "POST" });
      toast.success("Subscription cancelled.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  if (plans === null) {
    return (
      <div className="space-y-8">
        <PageHeader title="Charging Plans" subtitle="Loading plans…" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const activeSubscription = subscriptions.find((s) => s.status === "active");
  const sortedPlans = [...plans].sort((a, b) => Number(b.discount_percentage) - Number(a.discount_percentage));
  const bestDiscount = Math.max(...plans.map((p) => Number(p.discount_percentage)), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Charging Plans"
        subtitle="One subscription, network-wide. Whichever plan you pick, its discount applies at every operator's stations — not just the one that sold it. Only one plan can be active at a time."
      />

      <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 ring-1 ring-indigo-100 rounded-full px-3 py-1.5 w-fit">
        <Globe size={13} /> Every plan below works at every station, from every operator
      </div>

      {activeSubscription && (
        <Card className="p-4 border-indigo-200 ring-1 ring-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-slate-700">
            Active plan: <span className="font-semibold">{planFor(activeSubscription)?.plan_name}</span> — {planFor(activeSubscription)?.discount_percentage}% off everywhere, until{" "}
            {activeSubscription.end_date} <Badge status={activeSubscription.status} />
          </p>
          <Button variant="ghost" size="sm" onClick={() => cancelSubscription(activeSubscription.id)}>
            <X size={12} /> Cancel
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedPlans.map((plan) => {
          const isCurrent = activeSubscription?.plan_id === plan.id;
          const isFeatured = Number(plan.discount_percentage) === bestDiscount;
          return (
            <Card
              key={plan.id}
              className={`p-5 flex flex-col relative animate-fade-in-up ${isFeatured ? "ring-2 ring-indigo-500" : ""}`}
            >
              {isFeatured && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full">
                  Best value
                </span>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Building2 size={12} /> {plan.operator_name}
              </div>
              <p className="font-semibold text-slate-900">{plan.plan_name}</p>
              <p className="text-2xl font-semibold mt-2 text-slate-900">
                ₹{plan.subscription_fee}
                <span className="text-sm text-slate-500 font-normal"> / {plan.validity_days} days</span>
              </p>
              <ul className="text-sm text-slate-600 mt-3 space-y-1.5 flex-1">
                <li className="flex items-center gap-2">
                  <Zap size={13} className="text-indigo-500" /> {plan.discount_percentage}% off at every station
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-indigo-500" />
                  {plan.max_sessions ? `${plan.max_sessions} sessions included` : "Unlimited sessions"}
                </li>
                {plan.priority_booking && (
                  <li className="flex items-center gap-2">
                    <Check size={13} className="text-indigo-500" /> Priority booking
                  </li>
                )}
              </ul>
              <Button
                className="mt-4 w-full justify-center"
                variant={isFeatured && !activeSubscription ? "primary" : "secondary"}
                disabled={isCurrent || !!activeSubscription}
                onClick={() => subscribe(plan.id)}
              >
                {isCurrent ? "Current plan" : activeSubscription ? "Already subscribed" : "Subscribe"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
