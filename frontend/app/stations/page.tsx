"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import type { LatLngBounds } from "leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin, Navigation, RefreshCw, Search, SlidersHorizontal, Star, Tag, Zap } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Station } from "@/lib/types";
import { formatDistance, haversineKm } from "@/lib/geo";
import { Card, Chip, EmptyState, IconTile, Input, PageHeader, Select, Skeleton, Switch } from "@/components/ui";
import DraggableSheet, { SnapPoint } from "@/components/DraggableSheet";

const StationsMap = dynamic(() => import("@/components/StationsMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

type SortKey = "recommended" | "price_asc" | "rating_desc" | "distance";
type Enriched = { station: Station; connectorCount: number; availableCount: number; distanceKm: number | null };

function StationCard({ item, selected, onHover }: { item: Enriched; selected?: boolean; onHover?: () => void }) {
  const { station: s, connectorCount, availableCount, distanceKm } = item;
  const pct = connectorCount ? Math.round((availableCount / connectorCount) * 100) : 0;
  return (
    <Link href={`/stations/${s.id}`} onMouseEnter={onHover}>
      <Card className={`p-4 h-full ${selected ? "ring-2 ring-indigo-400" : ""}`} interactive>
        <div className="flex items-start gap-3">
          <IconTile icon={Zap} tone={availableCount > 0 ? "indigo" : "slate"} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-slate-100 truncate">{s.station_name}</p>
              {s.avg_rating !== null && (
                <span className="flex items-center gap-0.5 text-xs text-amber-400 shrink-0">
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
          {Array.from(new Set(s.chargers.flatMap((c) => c.connectors.map((con) => con.connector_type_name)))).map((type) => (
            <span key={type} className="text-[10px] font-medium text-slate-500 bg-white/[0.07] rounded-full px-2 py-0.5">
              {type}
            </span>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${availableCount > 0 ? "bg-emerald-500" : "bg-white/15"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${availableCount > 0 ? "text-emerald-400" : "text-slate-400"}`}>
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
}

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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SnapPoint>("peek");
  const [viewportBounds, setViewportBounds] = useState<LatLngBounds | null>(null);
  const [areaFilterBounds, setAreaFilterBounds] = useState<LatLngBounds | null>(null);

  useEffect(() => {
    apiFetch<Station[]>("/stations")
      .then(setStations)
      .catch(() => toast.error("Couldn't load stations. Try refreshing."));
  }, []);

  // Try to locate the driver as soon as the page loads -- silently, so a denied/blocked
  // permission doesn't interrupt anyone who didn't ask for it. The explicit "Use my
  // location" button below covers the case where this silent attempt didn't succeed.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortBy((current) => (current === "recommended" ? "distance" : current));
      },
      () => {},
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
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
        setAreaFilterBounds(null);
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

  const handleViewportChanged = useCallback((bounds: LatLngBounds) => setViewportBounds(bounds), []);

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
      if (areaFilterBounds && station.location.latitude && station.location.longitude) {
        if (!areaFilterBounds.contains([Number(station.location.latitude), Number(station.location.longitude)])) return false;
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
  }, [enriched, query, city, availableOnly, connectorTypes, sortBy, areaFilterBounds]);

  const activeFilterCount = (city !== "all" ? 1 : 0) + connectorTypes.size + (availableOnly ? 1 : 0);

  const nearby = useMemo(() => {
    if (!userLocation) return [];
    return [...enriched]
      .filter((e) => e.distanceKm !== null)
      .sort((a, b) => a.distanceKm! - b.distanceKm!)
      .slice(0, 4);
  }, [enriched, userLocation]);

  const filtersPanel = (
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
  );

  return (
    <div>
      {/* ---------- Mobile: full-bleed map with a draggable sheet, map-first discovery ---------- */}
      {/* Reserves real document height so the page can't scroll past the fixed overlay into
          the footer -- a map screen like this has no business revealing the site footer. */}
      <div className="md:hidden h-[calc(100vh-160px)]" aria-hidden />
      <div className="md:hidden fixed inset-0 z-0">
        {stations && (
          <StationsMap
            stations={filtered.map((f) => f.station)}
            userLocation={userLocation}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setSheetSnap("peek");
            }}
            onViewportChanged={handleViewportChanged}
            height="100vh"
          />
        )}
      </div>
      <div className="md:hidden fixed left-0 right-0 z-10 flex flex-col items-center gap-2 pointer-events-none" style={{ top: "calc(env(safe-area-inset-top,0px) + 68px)" }}>
        {viewportBounds && (
          <button
            onClick={() => {
              setAreaFilterBounds(viewportBounds);
              setViewportBounds(null);
            }}
            className="pointer-events-auto inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 rounded-full pl-3 pr-3.5 py-2 shadow-lg animate-fade-in-up"
          >
            <RefreshCw size={12} /> Search this area
          </button>
        )}
      </div>
      <button
        onClick={useMyLocation}
        disabled={locating}
        className="md:hidden fixed right-4 z-10 w-11 h-11 rounded-full bg-[#15131f] border border-white/10 shadow-lg flex items-center justify-center text-slate-300 disabled:opacity-60"
        style={{ bottom: "calc(64px + var(--safe-bottom) + 16px)" }}
        aria-label="Use my location"
      >
        <LocateFixed size={18} className={locating ? "animate-pulse" : ""} />
      </button>

      <DraggableSheet
        snap={sheetSnap}
        onSnapChange={setSheetSnap}
        header={
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold text-slate-100">
                {stations ? `${filtered.length} station${filtered.length === 1 ? "" : "s"}` : "Charging Stations"}
              </p>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${
                  activeFilterCount > 0 ? "border-indigo-300 bg-indigo-500/15 text-indigo-300" : "border-white/15 text-slate-400"
                }`}
              >
                <SlidersHorizontal size={12} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search stations…"
                className="w-full pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSheetSnap((s) => (s === "peek" ? "half" : s))}
              />
            </div>
            {areaFilterBounds && (
              <button
                onClick={() => setAreaFilterBounds(null)}
                className="text-xs font-medium text-indigo-400 flex items-center gap-1"
              >
                Showing this area only · Clear
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-3 pt-1">
          {showFilters && filtersPanel}
          {stations === null && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          {stations && filtered.map((item) => (
            <StationCard key={item.station.id} item={item} selected={selectedId === item.station.id} />
          ))}
          {stations && filtered.length === 0 && <EmptyState icon={Search}>No stations match your filters.</EmptyState>}
        </div>
      </DraggableSheet>

      {/* ---------- Desktop: split list + sticky map ---------- */}
      <div className="hidden md:block">
        <PageHeader
          title="Charging Stations"
          subtitle={`${stations?.length ?? "…"} stations across ${cityOptions.length || "several"} cities from every operator on the network.`}
        />

        {nearby.length > 0 && (
          <div className="mb-6 animate-fade-in-up">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Navigation size={14} className="text-indigo-500" />
              <p className="text-sm font-semibold text-slate-300">Nearby stations</p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {nearby.map(({ station: s, distanceKm, availableCount, connectorCount }) => (
                <Link key={s.id} href={`/stations/${s.id}`} className="shrink-0 w-56">
                  <Card className="p-3.5 h-full" interactive>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 mb-1.5">
                      <Navigation size={11} /> {formatDistance(distanceKm!)} away
                    </div>
                    <p className="text-sm font-medium text-slate-100 truncate">{s.station_name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{s.location.city}</p>
                    <p className={`text-xs font-medium mt-1.5 ${availableCount > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                      {availableCount} / {connectorCount} available
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
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
                  ? "border-indigo-300 bg-indigo-500/15 text-indigo-300"
                  : "border-white/15 text-slate-400 hover:bg-white/[0.05]"
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
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-white/15 text-slate-400 hover:bg-white/[0.05] transition-colors disabled:opacity-50 shrink-0"
            >
              <LocateFixed size={14} className={locating ? "animate-pulse" : ""} />
              {userLocation ? "Location set" : "Use my location"}
            </button>
          </div>

          {areaFilterBounds && (
            <button
              onClick={() => setAreaFilterBounds(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/15 ring-1 ring-indigo-400/25 rounded-full px-3 py-1"
            >
              Showing stations in the map&apos;s current area only · Clear
            </button>
          )}

          {showFilters && filtersPanel}
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

        {stations !== null && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_480px] gap-5 items-start">
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((item) => (
                  <StationCard
                    key={item.station.id}
                    item={item}
                    selected={selectedId === item.station.id}
                    onHover={() => setSelectedId(item.station.id)}
                  />
                ))}
              </div>
              {filtered.length === 0 && <EmptyState icon={Search}>No stations match your filters.</EmptyState>}
              {stations.length === 0 && <EmptyState icon={Zap}>No stations found.</EmptyState>}
            </div>

            <div className="sticky top-20">
              <Card className="overflow-hidden p-0 relative">
                <StationsMap
                  stations={filtered.map((f) => f.station)}
                  userLocation={userLocation}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onViewportChanged={handleViewportChanged}
                  height="calc(100vh - 180px)"
                />
                {viewportBounds && (
                  <button
                    onClick={() => {
                      setAreaFilterBounds(viewportBounds);
                      setViewportBounds(null);
                    }}
                    className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-full pl-3 pr-3.5 py-2 shadow-lg animate-fade-in-up"
                  >
                    <RefreshCw size={12} /> Search this area
                  </button>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
