"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { ChargingPlan, Subscription } from "@/lib/types";
import { Alert, Badge, Button, Card, PageHeader } from "@/components/ui";

export default function PlansPage() {
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

  const activeSubscription = subscriptions.find((s) => s.status === "active");

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
      setMessage({ type: "success", text: "Subscribed! Your discount now applies to charging sessions." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Charging Plans"
        subtitle="Subscribe once and the discount is applied to every bill automatically — no codes, nothing to remember at checkout."
      />
      {message && <Alert type={message.type}>{message.text}</Alert>}

      {activeSubscription && (
        <div className="rounded-lg border border-slate-200 shadow-sm p-4 bg-slate-50">
          <p className="text-sm">
            Active plan: <span className="font-medium">{plans.find((p) => p.id === activeSubscription.plan_id)?.plan_name}</span>{" "}
            until {activeSubscription.end_date} <Badge status={activeSubscription.status} />
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = activeSubscription?.plan_id === plan.id;
          return (
            <Card key={plan.id} className="p-5 flex flex-col">
              <p className="font-semibold text-slate-900">{plan.plan_name}</p>
              <p className="text-2xl font-semibold mt-2">
                ₹{plan.subscription_fee}
                <span className="text-sm text-slate-500 font-normal"> / {plan.validity_days} days</span>
              </p>
              <ul className="text-sm text-slate-600 mt-3 space-y-1 flex-1">
                <li>{plan.discount_percentage}% off every session</li>
                <li>{plan.max_sessions ? `${plan.max_sessions} sessions included` : "Unlimited sessions"}</li>
                {plan.priority_booking && <li>Priority booking</li>}
              </ul>
              <Button
                className="mt-4 w-full"
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
