"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Station } from "@/lib/types";
import { Card, PageHeader, EmptyState } from "@/components/ui";

export default function StationsPage() {
  const [stations, setStations] = useState<Station[] | null>(null);

  useEffect(() => {
    apiFetch<Station[]>("/stations").then(setStations);
  }, []);

  return (
    <div>
      <PageHeader title="Charging Stations" subtitle="Find a connector and book or start charging." />
      {stations === null && <EmptyState>Loading stations…</EmptyState>}
      <div className="grid gap-4 sm:grid-cols-2">
        {stations?.map((s) => {
          const connectorCount = s.chargers.reduce((sum, c) => sum + c.connectors.length, 0);
          const availableCount = s.chargers.reduce(
            (sum, c) => sum + c.connectors.filter((con) => con.status === "available").length,
            0
          );
          return (
            <Link key={s.id} href={`/stations/${s.id}`}>
              <Card className="p-4 h-full hover:border-slate-400 transition-colors">
                <p className="font-medium text-slate-900">{s.station_name}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {s.location.address_line}, {s.location.city}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span
                    className={`text-sm font-medium ${availableCount > 0 ? "text-green-700" : "text-slate-400"}`}
                  >
                    {availableCount} / {connectorCount} available
                  </span>
                  {s.tariff && <span className="text-sm text-slate-500">₹{s.tariff.price_per_kwh}/kWh</span>}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
      {stations?.length === 0 && <EmptyState>No stations found.</EmptyState>}
    </div>
  );
}
