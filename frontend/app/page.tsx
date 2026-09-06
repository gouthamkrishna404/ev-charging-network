"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isLoggedIn, getRole } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Station } from "@/lib/types";
import { Button, Card } from "@/components/ui";

const STEPS = [
  {
    icon: "📍",
    title: "Find a station",
    text: "Browse every station on the network, see live connector availability, pricing, opening hours, and driver reviews before you go.",
  },
  {
    icon: "🔌",
    title: "Book ahead or plug in",
    text: "Reserve a connector for later, or just walk up and start charging on the spot — both are supported on every connector.",
  },
  {
    icon: "💳",
    title: "Pay automatically",
    text: "When you unplug, your bill is generated instantly with any subscription discount already applied. Pay in one tap.",
  },
];

const DRIVER_FEATURES = [
  "Real-time connector availability across every station",
  "Reserve a slot in advance or charge without a booking",
  "Live energy-delivered tracking while a session is running",
  "Subscription plans with an automatic per-session discount",
  "One-tap refund requests if something goes wrong",
  "Notifications for bookings, payments, and refunds",
];

const OPERATOR_FEATURES = [
  "Stand up a new station — location, chargers, connectors, pricing — in minutes",
  "Set per-day operating hours enforced automatically at booking time",
  "Track bookings and revenue per station in real time",
  "Dispatch technicians and track maintenance tickets per connector",
  "Review and resolve driver refund requests",
  "Full audit trail of every admin action, automatically",
];

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [stats, setStats] = useState<{ stations: number; connectors: number; cities: number } | null>(null);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setRole(getRole());
    apiFetch<Station[]>("/stations")
      .then((stations) => {
        const connectors = stations.reduce(
          (sum, s) => sum + s.chargers.reduce((cSum, c) => cSum + c.connectors.length, 0),
          0
        );
        const cities = new Set(stations.map((s) => s.location.city)).size;
        setStats({ stations: stations.length, connectors, cities });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-16 pb-12">
      {/* Hero */}
      <section className="text-center pt-10">
        <p className="inline-block text-xs font-medium tracking-wide uppercase text-slate-500 bg-slate-100 rounded-full px-3 py-1 mb-4">
          EV charging, without the guesswork
        </p>
        <h1 className="text-4xl font-semibold text-slate-900">⚡ Volt Grid</h1>
        <p className="text-slate-600 mt-3 max-w-xl mx-auto text-lg">
          A marketplace that connects EV drivers with charging stations run by independent operators —
          find a connector, book it or plug in on the spot, and pay automatically when you&apos;re done.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {loggedIn ? (
            <Link href={role === "admin" ? "/admin" : "/stations"}>
              <Button>{role === "admin" ? "Go to dashboard" : "Browse stations"}</Button>
            </Link>
          ) : (
            <>
              <Link href="/register">
                <Button>Get started — it&apos;s free</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Log in</Button>
              </Link>
            </>
          )}
        </div>

        {stats && (
          <div className="mt-10 flex justify-center gap-8 text-sm text-slate-500">
            <div>
              <span className="block text-2xl font-semibold text-slate-900">{stats.stations}</span>
              stations live
            </div>
            <div>
              <span className="block text-2xl font-semibold text-slate-900">{stats.connectors}</span>
              connectors
            </div>
            <div>
              <span className="block text-2xl font-semibold text-slate-900">{stats.cities}</span>
              {stats.cities === 1 ? "city" : "cities"}
            </div>
          </div>
        )}
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 text-center mb-8">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="p-5 relative">
              <span className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="text-3xl mb-3">{step.icon}</div>
              <p className="font-medium text-slate-900">{step.title}</p>
              <p className="text-sm text-slate-500 mt-1">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature columns */}
      <section className="grid gap-6 sm:grid-cols-2">
        <Card className="p-6">
          <p className="font-semibold text-slate-900 mb-1">🚗 For drivers</p>
          <p className="text-sm text-slate-500 mb-4">Everything you need to charge without friction.</p>
          <ul className="space-y-2 text-sm text-slate-600">
            {DRIVER_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-green-600">✓</span> {f}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <p className="font-semibold text-slate-900 mb-1">🏢 For station operators</p>
          <p className="text-sm text-slate-500 mb-4">Run your network from one dashboard.</p>
          <ul className="space-y-2 text-sm text-slate-600">
            {OPERATOR_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-green-600">✓</span> {f}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Trust / reliability */}
      <section>
        <div className="rounded-lg bg-slate-900 text-white shadow-sm p-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🛡️</span>
            <div>
              <p className="font-semibold">Built so two drivers can never double-book the same connector</p>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Booking conflicts are rejected by a database-level constraint, not just application code —
                so it holds up correctly even under concurrent requests, not just in the happy path.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      {!loggedIn && (
        <section className="text-center">
          <p className="text-slate-600 mb-4">Ready to find your next charge?</p>
          <div className="flex justify-center gap-3">
            <Link href="/register">
              <Button>Create a driver account</Button>
            </Link>
            <Link href="/stations">
              <Button variant="secondary">Browse stations first</Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
