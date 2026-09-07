"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin, Search, SlidersHorizontal, Star, Tag, Zap } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Station } from "@/lib/types";
import { formatDistance, haversineKm } from "@/lib/geo";
import { Card, Chip, EmptyState, IconTile, Input, PageHeader, Select, Skeleton, Switch } from "@/components/ui";

const StationsMap = dynamic(() => import("@/components/StationsMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[380px] w-full" />,
});

type SortKey = "recommended" | "price_asc" | "rating_desc" | "distance";

export default function StationsPage() {
  const [stations, setStations] = useState<Station[] | null>(null);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [connectorTypes, setConnectorTypes] = useState<Set<string>>(new Set());
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("recommended");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    apiFetch<Station[]>("/stations")
      .then(setStations)
      .catch(() => toast.error("Couldn't load stations. Try refreshing."));
  }, []);

  const cityOptions = useMemo(
    () => Array.from(new Set((stations ?? []).map((s) => s.location.city))).sort(),
    [stations]
  );
  const connectorTypeOptions = useMemo(() => {
    const set = new Set<string>();
    (stations ?? []).forEach((s) => s.chargers.forEach((c) => c.connectors.forEach((con) => set.add(con.connector_type_name))));
    return Array.from(set).sort();
  }, [stations]);

  function toggleConnectorType(type: string) {
    setConnectorTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation isn't supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortBy("distance");
        setLocating(false);
        toast.success("Location found — sorting stations by distance.");
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Check browser permissions.");
      },
      { timeout: 8000 }
    );
  }

  const enriched = useMemo(
    () =>
      (stations ?? []).map((s) => {
        const connectorCount = s.chargers.reduce((sum, c) => sum + c.connectors.length, 0);
        const availableCount = s.chargers.reduce(
          (sum, c) => sum + c.connectors.filter((con) => con.status === "available").length,
          0
        );
        const distanceKm =
          userLocation && s.location.latitude && s.location.longitude
            ? haversineKm(userLocation.lat, userLocation.lng, Number(s.location.latitude), Number(s.location.longitude))
            : null;
        return { station: s, connectorCount, availableCount, distanceKm };
      }),
    [stations, userLocation]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = enriched.filter(({ station, availableCount }) => {
      if (q) {
        const matches =
          station.station_name.toLowerCase().includes(q) ||
          station.location.city.toLowerCase().includes(q) ||
          station.location.address_line.toLowerCase().includes(q) ||
          station.operator_name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (city !== "all" && station.location.city !== city) return false;
      if (availableOnly && availableCount === 0) return false;
      if (connectorTypes.size > 0) {
        const types = new Set(station.chargers.flatMap((c) => c.connectors.map((con) => con.connector_type_name)));
        if (![...connectorTypes].some((t) => types.has(t))) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "price_asc") {
        return Number(a.station.tariff?.price_per_kwh ?? Infinity) - Number(b.station.tariff?.price_per_kwh ?? Infinity);
      }
      if (sortBy === "rating_desc") {
        return (b.station.avg_rating ?? 0) - (a.station.avg_rating ?? 0);
      }
      if (sortBy === "distance") {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (a.availableCount > 0 !== b.availableCount > 0) return a.availableCount > 0 ? -1 : 1;
      return (b.station.avg_rating ?? 0) - (a.station.avg_rating ?? 0);
    });

    return list;
  }, [enriched, query, city, availableOnly, connectorTypes, sortBy]);

  const activeFilterCount = (city !== "all" ? 1 : 0) + connectorTypes.size + (availableOnly ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Charging Stations"
        subtitle={`${stations?.length ?? "…"} stations across ${cityOptions.length || "several"} cities from every operator on the network.`}
      />

      {stations && stations.length > 0 && (
        <Card className="mb-6 p-2 overflow-hidden">
          <StationsMap stations={filtered.map((f) => f.station)} userLocation={userLocation} />
        </Card>
      )}

      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, city, or operator…"
              className="w-full pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="shrink-0">
            <option value="recommended">Sort: Recommended</option>
            <option value="price_asc">Sort: Price, low to high</option>
            <option value="rating_desc">Sort: Highest rated</option>
            <option value="distance">Sort: Nearest to me</option>
          </Select>
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 shrink-0"
          >
            <LocateFixed size={14} className={locating ? "animate-pulse" : ""} />
            {userLocation ? "Location set" : "Use my location"}
          </button>
        </div>

        {showFilters && (
          <Card className="p-4 space-y-3 animate-fade-in-up">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Connector type</p>
              <div className="flex flex-wrap gap-1.5">
                {connectorTypeOptions.map((type) => (
                  <Chip key={type} active={connectorTypes.has(type)} onClick={() => toggleConnectorType(type)}>
                    {type}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-xs font-medium text-slate-500">City</span>
                <Select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="all">All cities</option>
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </label>
              <Switch checked={availableOnly} onChange={setAvailableOnly} label="Available now" />
            </div>
          </Card>
        )}
      </div>

      {stations === null && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 h-[104px] flex flex-col gap-2 justify-center">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map(({ station: s, connectorCount, availableCount, distanceKm }, i) => {
          const pct = connectorCount ? Math.round((availableCount / connectorCount) * 100) : 0;
          return (
            <Link key={s.id} href={`/stations/${s.id}`}>
              <Card className="p-4 h-full animate-fade-in-up" interactive style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                <div className="flex items-start gap-3">
                  <IconTile icon={Zap} tone={availableCount > 0 ? "indigo" : "slate"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-slate-900 truncate">{s.station_name}</p>
                      {s.avg_rating !== null && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600 shrink-0">
                          <Star size={11} fill="currentColor" /> {s.avg_rating}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                      <MapPin size={12} className="shrink-0" />
                      {s.location.address_line}, {s.location.city}
                      {distanceKm !== null && <span className="text-slate-400 shrink-0"> · {formatDistance(distanceKm)}</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.operator_name}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {Array.from(new Set(s.chargers.flatMap((c) => c.connectors.map((con) => con.connector_type_name)))).map(
                    (type) => (
                      <span key={type} className="text-[10px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                        {type}
                      </span>
                    )
                  )}
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${availableCount > 0 ? "bg-emerald-500" : "bg-slate-300"}`}
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
      {stations && filtered.length === 0 && <EmptyState icon={Search}>No stations match your filters.</EmptyState>}
      {stations?.length === 0 && <EmptyState icon={Zap}>No stations found.</EmptyState>}
    </div>
  );
}
