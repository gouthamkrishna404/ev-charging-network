"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Bell,
  Building2,
  Car,
  CheckCircle2,
  CreditCard,
  Gauge,
  MapPin,
  Plug,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { isLoggedIn, getRole } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Station } from "@/lib/types";
import { Button, Card, IconTile, Stat } from "@/components/ui";

const STEPS = [
  {
    icon: MapPin,
    title: "Find a station",
    text: "Browse every station on the network, see live connector availability, pricing, opening hours, and driver reviews before you go.",
  },
  {
    icon: Plug,
    title: "Book ahead or plug in",
    text: "Reserve a connector for later, or just walk up and start charging on the spot — both are supported on every connector.",
  },
  {
    icon: CreditCard,
    title: "Pay automatically",
    text: "When you unplug, your bill is generated instantly with any subscription discount already applied. Pay in one tap.",
  },
];

const DRIVER_FEATURES = [
  { icon: Gauge, text: "Real-time connector availability across every station" },
  { icon: Plug, text: "Reserve a slot in advance or charge without a booking" },
  { icon: BadgeCheck, text: "Energy delivered is read from the connector automatically" },
  { icon: CreditCard, text: "Subscription plans with an automatic per-session discount" },
  { icon: CheckCircle2, text: "One-tap refund requests if something goes wrong" },
  { icon: Bell, text: "Notifications for bookings, payments, and refunds" },
];

const OPERATOR_FEATURES = [
  { icon: Building2, text: "Stand up a new station — chargers, connectors, pricing — in minutes" },
  { icon: Gauge, text: "Set per-day operating hours enforced automatically at booking time" },
  { icon: CreditCard, text: "Track bookings and revenue per station in real time" },
  { icon: Wrench, text: "Dispatch technicians and track maintenance tickets per connector" },
  { icon: CheckCircle2, text: "Review and resolve driver refund requests" },
  { icon: ShieldCheck, text: "Full audit trail of every admin action, automatically" },
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
    <div className="space-y-20 pb-12">
      {/* Hero */}
      <section className="relative text-center pt-12 pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,theme(colors.indigo.100),transparent)]"
        />
        <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase text-indigo-700 bg-indigo-50 ring-1 ring-indigo-100 rounded-full px-3 py-1 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          EV charging, without the guesswork
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 tracking-tight flex items-center justify-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
            <Plug size={22} className="text-white" strokeWidth={2.5} />
          </span>
          Volt Grid
        </h1>
        <p className="text-slate-600 mt-4 max-w-xl mx-auto text-lg">
          A marketplace that connects EV drivers with charging stations run by independent operators —
          find a connector, book it or plug in on the spot, and pay automatically when you&apos;re done.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          {loggedIn ? (
            <Link href={role === "admin" ? "/admin" : "/stations"}>
              <Button size="md" className="px-5 py-2.5 text-base">
                {role === "admin" ? "Go to dashboard" : "Browse stations"}
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/register">
                <Button size="md" className="px-5 py-2.5 text-base">
                  Get started — it&apos;s free
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="md" className="px-5 py-2.5 text-base">
                  Log in
                </Button>
              </Link>
            </>
          )}
        </div>

        {stats && (
          <div className="mt-12 flex justify-center gap-10">
            <Stat value={stats.stations} label="stations live" />
            <Stat value={stats.connectors} label="connectors" />
            <Stat value={stats.cities} label={stats.cities === 1 ? "city" : "cities"} />
          </div>
        )}
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight text-center mb-8">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="p-5 relative" interactive>
              <span className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center ring-4 ring-slate-50">
                {i + 1}
              </span>
              <IconTile icon={step.icon} tone="indigo" />
              <p className="font-medium text-slate-900 mt-3">{step.title}</p>
              <p className="text-sm text-slate-500 mt-1">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature columns */}
      <section className="grid gap-6 sm:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <IconTile icon={Car} tone="indigo" />
            <div>
              <p className="font-semibold text-slate-900">For drivers</p>
              <p className="text-sm text-slate-500">Everything you need to charge without friction.</p>
            </div>
          </div>
          <ul className="space-y-3 text-sm text-slate-600">
            {DRIVER_FEATURES.map((f) => (
              <li key={f.text} className="flex gap-2.5 items-start">
                <f.icon size={16} className="text-indigo-500 mt-0.5 shrink-0" strokeWidth={2} />
                {f.text}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <IconTile icon={Building2} tone="amber" />
            <div>
              <p className="font-semibold text-slate-900">For station operators</p>
              <p className="text-sm text-slate-500">Run your network from one dashboard.</p>
            </div>
          </div>
          <ul className="space-y-3 text-sm text-slate-600">
            {OPERATOR_FEATURES.map((f) => (
              <li key={f.text} className="flex gap-2.5 items-start">
                <f.icon size={16} className="text-amber-500 mt-0.5 shrink-0" strokeWidth={2} />
                {f.text}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Trust / reliability */}
      <section>
        <div className="rounded-xl bg-slate-900 text-white shadow-lg p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} className="text-emerald-400" strokeWidth={2} />
            </div>
            <div>
              <p className="font-semibold text-base">Built so two drivers can never double-book the same connector</p>
              <p className="text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
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
