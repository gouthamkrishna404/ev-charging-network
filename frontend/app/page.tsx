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
  Zap,
} from "lucide-react";
import { isLoggedIn, getRole } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { FeaturedReview, Station } from "@/lib/types";
import { Badge, Button, Card, IconTile, ProgressRing, StarRating } from "@/components/ui";

const STEPS = [
  {
    icon: MapPin,
    title: "Find a station",
    text: "Browse every station on the network on a live map, see connector availability, pricing, and driver reviews before you go.",
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
  { icon: CreditCard, text: "One membership, one discount, valid at every operator" },
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
  const [stats, setStats] = useState<{ stations: number; connectors: number; cities: string[] } | null>(null);
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setRole(getRole());
    apiFetch<Station[]>("/stations")
      .then((stations) => {
        const connectors = stations.reduce(
          (sum, s) => sum + s.chargers.reduce((cSum, c) => cSum + c.connectors.length, 0),
          0
        );
        const cities = Array.from(new Set(stations.map((s) => s.location.city))).sort();
        setStats({ stations: stations.length, connectors, cities });
      })
      .catch(() => {});
    apiFetch<FeaturedReview[]>("/stations/reviews/featured")
      .then((r) => setReviews(r.slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-24 pb-12">
      {/* Hero */}
      <section className="relative -mx-4 sm:-mx-6 px-4 sm:px-6 pt-14 pb-20 overflow-hidden bg-slate-950 text-white -mt-8">
        <div aria-hidden className="absolute inset-0 bg-mesh-hero" />
        <div aria-hidden className="absolute inset-0 bg-dot-grid opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,black,transparent)]" />

        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase text-volt-400 bg-white/5 ring-1 ring-white/10 rounded-full px-3 py-1 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-volt-400 animate-pulse-ring" />
              Live across {stats?.cities.length ?? "7+"} cities
            </p>
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.1]">
              Charging, mapped{" "}
              <span className="bg-gradient-to-r from-volt-400 via-emerald-300 to-indigo-300 bg-clip-text text-transparent">
                the way it should be.
              </span>
            </h1>
            <p className="text-slate-300 mt-6 max-w-lg text-lg leading-relaxed">
              Volt Grid is the marketplace that puts every operator&apos;s charging stations on one live map —
              find a connector, book it or plug in on the spot, and pay automatically when you&apos;re done.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {loggedIn ? (
                <Link href={role === "admin" ? "/admin" : "/stations"}>
                  <Button size="lg">{role === "admin" ? "Go to dashboard" : "Browse stations"}</Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg">Get started — it&apos;s free</Button>
                  </Link>
                  <Link href="/stations">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="bg-white/5! border-white/15! text-white! hover:bg-white/10!"
                    >
                      See the network
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {stats && (
              <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
                <div>
                  <span className="block text-3xl font-semibold tabular-nums">{stats.stations}</span>
                  <span className="text-sm text-slate-400">stations live</span>
                </div>
                <div>
                  <span className="block text-3xl font-semibold tabular-nums">{stats.connectors}</span>
                  <span className="text-sm text-slate-400">connectors</span>
                </div>
                <div>
                  <span className="block text-3xl font-semibold tabular-nums">{stats.cities.length}</span>
                  <span className="text-sm text-slate-400">{stats.cities.length === 1 ? "city" : "cities"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Decorative floating preview stack -- not real live data, just an
              illustration of the product so the hero doesn't lean on stock imagery. */}
          <div className="relative hidden lg:block h-[420px]" aria-hidden>
            <div className="absolute right-4 top-2 w-72 rotate-3 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
              <Card className="p-4 bg-white/95 backdrop-blur">
                <div className="flex items-center gap-2.5">
                  <IconTile icon={Zap} tone="indigo" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">Volt Grid · Indiranagar</p>
                    <p className="text-xs text-slate-400">0.6 km away</p>
                  </div>
                  <Badge status="available" />
                </div>
                <div className="mt-3 flex gap-1.5">
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">CCS2</span>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">Type 2</span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-3/4 rounded-full bg-emerald-500" />
                </div>
              </Card>
            </div>
            <div className="absolute left-0 bottom-4 w-64 -rotate-2 animate-fade-in-up" style={{ animationDelay: "220ms" }}>
              <Card className="p-4 bg-white/95 backdrop-blur">
                <p className="text-xs font-medium text-slate-500 mb-3">Charging now</p>
                <div className="flex items-center gap-4">
                  <ProgressRing progress={0.62} size={72} strokeWidth={6}>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">62%</span>
                  </ProgressRing>
                  <div>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums">31.4 kWh</p>
                    <p className="text-xs text-slate-500">~18 min remaining</p>
                  </div>
                </div>
              </Card>
            </div>
            <div className="absolute right-10 bottom-0 flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-full px-3.5 py-2 shadow-lg animate-fade-in-up" style={{ animationDelay: "340ms" }}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-ring" />
              <span className="text-xs font-medium text-slate-700">
                {stats ? `${stats.connectors} connectors online` : "Connectors online"}
              </span>
            </div>
          </div>
        </div>

        {stats && stats.cities.length > 0 && (
          <div className="relative max-w-6xl mx-auto mt-14 flex flex-wrap gap-2 border-t border-white/10 pt-6">
            {stats.cities.map((city) => (
              <span key={city} className="text-xs font-medium text-slate-300 bg-white/5 ring-1 ring-white/10 rounded-full px-3 py-1">
                {city}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight text-center mb-10">How it works</h2>
        <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div aria-hidden className="hidden sm:block absolute top-[26px] left-[16.5%] right-[16.5%] h-px bg-slate-200" />
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
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight text-center mb-8">What drivers are saying</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {reviews.map((r) => (
              <Card key={r.id} className="p-5">
                <StarRating rating={r.rating} />
                <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">&ldquo;{r.comment}&rdquo;</p>
                <p className="text-xs text-slate-400 mt-3">
                  {r.reviewer_name} · {r.station_name}, {r.city}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Trust / reliability */}
      <section>
        <div className="rounded-2xl bg-slate-900 text-white shadow-lg p-6 sm:p-7">
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
        <section className="relative -mx-4 sm:-mx-6 px-4 sm:px-6 py-14 overflow-hidden bg-slate-950 text-white text-center">
          <div aria-hidden className="absolute inset-0 bg-mesh-hero" />
          <div className="relative">
            <p className="text-2xl font-semibold tracking-tight">Ready to find your next charge?</p>
            <p className="text-slate-400 mt-2">Free to join, no card required to browse the network.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/register">
                <Button size="lg">Create a driver account</Button>
              </Link>
              <Link href="/stations">
                <Button size="lg" variant="secondary" className="bg-white/5! border-white/15! text-white! hover:bg-white/10!">
                  Browse stations first
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
