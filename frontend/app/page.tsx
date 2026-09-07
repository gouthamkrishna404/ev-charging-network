"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
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
  Star,
  Wrench,
  Zap,
} from "lucide-react";
import { isLoggedIn, getRole } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { FeaturedReview, Station } from "@/lib/types";
import { Badge, Button, Card, IconTile, StarRating } from "@/components/ui";

const StationsMap = dynamic(() => import("@/components/StationsMap"), { ssr: false });

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
  const [stations, setStations] = useState<Station[] | null>(null);
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setRole(getRole());
    apiFetch<Station[]>("/stations").then(setStations).catch(() => {});
    apiFetch<FeaturedReview[]>("/stations/reviews/featured")
      .then((r) => setReviews(r.slice(0, 6)))
      .catch(() => {});
  }, []);

  const stats = useMemo(() => {
    if (!stations) return null;
    const connectors = stations.reduce((sum, s) => sum + s.chargers.reduce((cSum, c) => cSum + c.connectors.length, 0), 0);
    const available = stations.reduce(
      (sum, s) => sum + s.chargers.reduce((cSum, c) => cSum + c.connectors.filter((con) => con.status === "available").length, 0),
      0
    );
    const cities = Array.from(new Set(stations.map((s) => s.location.city))).sort();
    const rated = stations.filter((s) => s.avg_rating !== null);
    const avgRating = rated.length ? rated.reduce((sum, s) => sum + (s.avg_rating ?? 0), 0) / rated.length : null;
    const reviewCount = stations.reduce((sum, s) => sum + s.review_count, 0);
    const operators = new Set(stations.map((s) => s.operator_name)).size;
    return { stations: stations.length, connectors, available, cities, avgRating, reviewCount, operators };
  }, [stations]);

  const tickerFacts = useMemo(() => {
    if (!stats) return [];
    return [
      `${stats.available} of ${stats.connectors} connectors free right now`,
      `${stats.stations} stations across ${stats.cities.length} cities`,
      stats.avgRating ? `${stats.avgRating.toFixed(1)}★ average station rating` : null,
      "Two operators, one map, one membership",
    ].filter((x): x is string => !!x);
  }, [stats]);

  useEffect(() => {
    if (tickerFacts.length < 2) return;
    const interval = setInterval(() => setTickerIndex((i) => (i + 1) % tickerFacts.length), 3200);
    return () => clearInterval(interval);
  }, [tickerFacts.length]);

  return (
    <div className="space-y-24 pb-12">
      {/* Hero */}
      <section className="relative -mx-4 sm:-mx-6 px-4 sm:px-6 pt-14 pb-16 overflow-hidden text-white -mt-8">
        <div aria-hidden className="absolute inset-0 bg-mesh-hero" />
        <div aria-hidden className="absolute inset-0 bg-dot-grid opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,black,transparent)]" />

        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase text-volt-400 bg-white/5 ring-1 ring-white/10 rounded-full px-3 py-1 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-volt-400 animate-pulse-ring" />
              Live across {stats?.cities.length ?? "7+"} cities
            </p>
            <h1 className="font-display text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.1]">
              Charging, mapped{" "}
              <span className="bg-gradient-to-r from-volt-400 via-emerald-300 to-indigo-300 bg-clip-text text-transparent">
                the way it should be.
              </span>
            </h1>
            <p className="text-slate-300 mt-6 max-w-lg text-lg leading-relaxed">
              Voltaic is the marketplace that puts every operator&apos;s charging stations on one live map —
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
                    <Button size="lg" variant="secondary" className="bg-white/5! border-white/15! text-white! hover:bg-white/10!">
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

          {/* The real network map, not a mockup -- the map is the product's standout
              feature, so the first thing a visitor sees is the actual thing, live. */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 h-[220px] lg:h-[420px] bg-slate-900">
              {stations && stations.length > 0 && (
                <StationsMap stations={stations} interactive={false} height="100%" />
              )}
            </div>
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-full pl-2.5 pr-3 py-1.5 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-ring" />
              <span className="text-xs font-semibold text-slate-300">{stats ? `${stats.available} available now` : "Loading…"}</span>
            </div>
            {stats?.avgRating && (
              <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/95 backdrop-blur rounded-full px-3 py-1.5 shadow-lg">
                <Star size={12} className="text-amber-500" fill="currentColor" />
                <span className="text-xs font-semibold text-slate-300">{stats.avgRating.toFixed(1)} avg rating</span>
              </div>
            )}
          </div>
        </div>

        {tickerFacts.length > 0 && (
          <div className="relative max-w-6xl mx-auto mt-10 border-t border-white/10 pt-5 flex items-center gap-2.5 text-sm text-slate-300">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-volt-400 shrink-0">Right now</span>
            <span key={tickerIndex} className="animate-fade-in truncate">
              {tickerFacts[tickerIndex]}
            </span>
          </div>
        )}
      </section>

      {/* How it works */}
      <section>
        <h2 className="font-display text-2xl font-semibold text-slate-100 tracking-tight text-center mb-10">How it works</h2>
        <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div aria-hidden className="hidden sm:block absolute top-[26px] left-[16.5%] right-[16.5%] h-px bg-white/10" />
          {STEPS.map((step, i) => (
            <Card key={step.title} className="p-5 relative" interactive>
              <span className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center ring-4 ring-[#08070e]">
                {i + 1}
              </span>
              <IconTile icon={step.icon} tone="indigo" />
              <p className="font-medium text-slate-100 mt-3">{step.title}</p>
              <p className="text-sm text-slate-500 mt-1">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature columns */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <IconTile icon={Car} tone="indigo" />
            <div>
              <p className="font-display font-semibold text-slate-100">For drivers</p>
              <p className="text-sm text-slate-500">Everything you need to charge without friction.</p>
            </div>
          </div>
          <ul className="space-y-3 text-sm text-slate-400 flex-1">
            {DRIVER_FEATURES.map((f) => (
              <li key={f.text} className="flex gap-2.5 items-start">
                <f.icon size={16} className="text-indigo-500 mt-0.5 shrink-0" strokeWidth={2} />
                {f.text}
              </li>
            ))}
          </ul>
          {/* A real station-card preview, styled exactly like the one on /stations --
              proof of what the product actually looks like, not an illustration of it. */}
          <div className="mt-5 rounded-xl border border-white/10 p-3.5 bg-white/[0.04]">
            <div className="flex items-start gap-3">
              <IconTile icon={Zap} tone="indigo" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">Volt Grid - Indiranagar</p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <MapPin size={11} className="shrink-0" /> 100 Feet Road, Bengaluru
                </p>
              </div>
              <Badge status="available" />
            </div>
            <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
              <div className="h-full w-3/4 rounded-full bg-emerald-500" />
            </div>
          </div>
        </Card>
        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <IconTile icon={Building2} tone="amber" />
            <div>
              <p className="font-display font-semibold text-slate-100">For station operators</p>
              <p className="text-sm text-slate-500">Run your network from one dashboard.</p>
            </div>
          </div>
          <ul className="space-y-3 text-sm text-slate-400 flex-1">
            {OPERATOR_FEATURES.map((f) => (
              <li key={f.text} className="flex gap-2.5 items-start">
                <f.icon size={16} className="text-amber-500 mt-0.5 shrink-0" strokeWidth={2} />
                {f.text}
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl border border-white/10 p-3.5 bg-white/[0.04] flex gap-6">
            <div>
              <p className="text-lg font-semibold text-slate-100 tabular-nums">{stats?.operators ?? "—"}</p>
              <p className="text-xs text-slate-500">operators on the network</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-100 tabular-nums">{stats?.reviewCount ?? "—"}</p>
              <p className="text-xs text-slate-500">driver reviews</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-semibold text-slate-100 tracking-tight text-center mb-8">What drivers are saying</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {reviews.map((r) => (
              <Card key={r.id} className="p-5">
                <StarRating rating={r.rating} />
                <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">&ldquo;{r.comment}&rdquo;</p>
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
        <div className="rounded-2xl bg-slate-950/50 ring-1 ring-white/10 text-white shadow-lg p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} className="text-emerald-400" strokeWidth={2} />
            </div>
            <div>
              <p className="font-display font-semibold text-base">Built so two drivers can never double-book the same connector</p>
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
        <section className="relative -mx-4 sm:-mx-6 px-4 sm:px-6 py-14 overflow-hidden text-white text-center">
          <div aria-hidden className="absolute inset-0 bg-mesh-hero" />
          <div className="relative">
            <p className="font-display text-2xl font-semibold tracking-tight">Ready to find your next charge?</p>
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
