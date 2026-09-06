"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Station } from "@/lib/types";

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);

  useEffect(() => {
    apiFetch<Station[]>("/stations").then(setStations);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Charging Stations</h1>
      <ul className="space-y-3">
        {stations.map((s) => {
          const connectorCount = s.chargers.reduce((sum, c) => sum + c.connectors.length, 0);
          const availableCount = s.chargers.reduce(
            (sum, c) => sum + c.connectors.filter((con) => con.status === "available").length,
            0
          );
          return (
            <li key={s.id} className="border border-slate-200 rounded p-4 bg-white">
              <Link href={`/stations/${s.id}`} className="font-medium hover:underline">
                {s.station_name}
              </Link>
              <p className="text-sm text-slate-600">
                {s.location.address_line}, {s.location.city}, {s.location.state}
              </p>
              <p className="text-sm text-slate-600">
                {availableCount} / {connectorCount} connectors available
                {s.tariff && <> &middot; ₹{s.tariff.price_per_kwh}/kWh</>}
              </p>
            </li>
          );
        })}
        {stations.length === 0 && <p className="text-sm text-slate-500">No stations found.</p>}
      </ul>
    </div>
  );
}
