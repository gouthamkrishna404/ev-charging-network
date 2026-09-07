"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MapPin, Search, Tag, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Station } from "@/lib/types";
import { Card, EmptyState, IconTile, Input, PageHeader, Skeleton } from "@/components/ui";

const StationsMap = dynamic(() => import("@/components/StationsMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full" />,
});

export default function StationsPage() {
  const [stations, setStations] = useState<Station[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiFetch<Station[]>("/stations").then(setStations);
  }, []);

  const filtered = stations?.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.station_name.toLowerCase().includes(q) ||
      s.location.city.toLowerCase().includes(q) ||
      s.location.address_line.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader title="Charging Stations" subtitle="Find a connector and book or start charging." />

      {stations && stations.length > 0 && (
        <Card className="mb-6 p-2 overflow-hidden">
          <StationsMap stations={stations} />
        </Card>
      )}

      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by name, city, or address…"
          className="w-full pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {stations === null && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 h-[104px] flex flex-col gap-2 justify-center">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered?.map((s) => {
          const connectorCount = s.chargers.reduce((sum, c) => sum + c.connectors.length, 0);
          const availableCount = s.chargers.reduce(
            (sum, c) => sum + c.connectors.filter((con) => con.status === "available").length,
            0
          );
          const pct = connectorCount ? Math.round((availableCount / connectorCount) * 100) : 0;
          return (
            <Link key={s.id} href={`/stations/${s.id}`}>
              <Card className="p-4 h-full" interactive>
                <div className="flex items-start gap-3">
                  <IconTile icon={Zap} tone={availableCount > 0 ? "indigo" : "slate"} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{s.station_name}</p>
                    <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                      <MapPin size={12} className="shrink-0" />
                      {s.location.address_line}, {s.location.city}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${availableCount > 0 ? "bg-emerald-500" : "bg-slate-300"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${availableCount > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                      {availableCount} / {connectorCount} available
                    </span>
                    {s.tariff && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Tag size={11} />₹{s.tariff.price_per_kwh}/kWh
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
      {stations && filtered?.length === 0 && <EmptyState icon={Search}>No stations match &quot;{query}&quot;.</EmptyState>}
      {stations?.length === 0 && <EmptyState icon={Zap}>No stations found.</EmptyState>}
    </div>
  );
}
