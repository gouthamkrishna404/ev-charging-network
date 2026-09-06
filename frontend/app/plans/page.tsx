"use client";

import { useEffect, useState } from "react";
import { Building2, Check, X, Zap } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { ChargingPlan, Subscription } from "@/lib/types";
import { Alert, Badge, Button, Card, PageHeader } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function PlansPage() {
  return (
    <RequireAuth role="driver">
      <PlansContent />
    </RequireAuth>
  );
}

function PlansContent() {
  const [plans, setPlans] = useState<ChargingPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function load() {
    const [p, s] = await Promise.all([
      apiFetch<ChargingPlan[]>("/plans"),
      apiFetch<Subscription[]>("/subscriptions/me"),
    ]);
    setPlans(p);
    setSubscriptions(s);
  }

  useEffect(() => {
    load();
  }, []);

  function planFor(sub: Subscription) {
    return plans.find((p) => p.id === sub.plan_id);
  }

  function activeSubscriptionFor(operatorId: number) {
    return subscriptions.find((s) => s.status === "active" && planFor(s)?.operator_id === operatorId);
  }

  async function subscribe(planId: number) {
    setMessage(null);
    try {
      const sub = await apiFetch<Subscription>("/subscriptions", {
        method: "POST",
        body: JSON.stringify({ plan_id: planId }),
      });
      await apiFetch("/payments", {
        method: "POST",
        body: JSON.stringify({ subscription_id: sub.id, payment_method: "card" }),
      });
      setMessage({ type: "success", text: "Subscribed! Your discount now applies to sessions at that network." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function cancelSubscription(id: number) {
    if (!confirm("Cancel this subscription? You'll lose the discount immediately.")) return;
    setMessage(null);
    try {
      await apiFetch(`/subscriptions/${id}/cancel`, { method: "POST" });
      setMessage({ type: "success", text: "Subscription cancelled." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  const operators = Array.from(new Map(plans.map((p) => [p.operator_id, p.operator_name])).entries());

  return (
    <div className="space-y-8">
      <PageHeader
        title="Charging Plans"
        subtitle="Each network sets its own plans. A subscription's discount only applies at that network's stations — subscribe to more than one if you charge across networks."
      />
      {message && <Alert type={message.type}>{message.text}</Alert>}

      {operators.map(([operatorId, operatorName]) => {
        const activeSubscription = activeSubscriptionFor(operatorId);
        const operatorPlans = plans.filter((p) => p.operator_id === operatorId);
        const featured = Math.max(...operatorPlans.map((p) => Number(p.discount_percentage)));
        return (
          <div key={operatorId}>
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-slate-400" />
              <h2 className="font-semibold text-slate-900">{operatorName}</h2>
            </div>

            {activeSubscription && (
              <div className="rounded-xl border border-indigo-100 shadow-sm p-4 bg-indigo-50/60 flex items-center justify-between mb-3">
                <p className="text-sm text-slate-700">
                  Active plan: <span className="font-medium">{planFor(activeSubscription)?.plan_name}</span> until{" "}
                  {activeSubscription.end_date} <Badge status={activeSubscription.status} />
                </p>
                <Button variant="ghost" size="sm" onClick={() => cancelSubscription(activeSubscription.id)}>
                  <X size={12} /> Cancel
                </Button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              {operatorPlans.map((plan) => {
                const isCurrent = activeSubscription?.plan_id === plan.id;
                const isFeatured = Number(plan.discount_percentage) === featured && operatorPlans.length > 1;
                return (
                  <Card
                    key={plan.id}
                    className={`p-5 flex flex-col relative ${isFeatured ? "ring-2 ring-indigo-500" : ""}`}
                  >
                    {isFeatured && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full">
                        Best value
                      </span>
                    )}
                    <p className="font-semibold text-slate-900">{plan.plan_name}</p>
                    <p className="text-2xl font-semibold mt-2 text-slate-900">
                      ₹{plan.subscription_fee}
                      <span className="text-sm text-slate-500 font-normal"> / {plan.validity_days} days</span>
                    </p>
                    <ul className="text-sm text-slate-600 mt-3 space-y-1.5 flex-1">
                      <li className="flex items-center gap-2">
                        <Zap size={13} className="text-indigo-500" /> {plan.discount_percentage}% off every session
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
      })}
    </div>
  );
}
