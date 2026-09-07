"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";

// leaflet.markercluster is a plugin authored for a global-script context: it patches
// the shared `L` namespace instead of importing it, so `window.L` must exist first.
if (typeof window !== "undefined") {
  (window as unknown as { L: typeof L }).L = L;
}
// This must execute (not just be hoisted) after the window.L assignment above, so it
// needs a real require() call rather than a static import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("leaflet.markercluster");

import { useEffect, useRef, type MutableRefObject } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Station } from "@/lib/types";
import { haversineKm, formatDistance } from "@/lib/geo";

function markerIcon(available: boolean) {
  const color = available ? "#4f46e5" : "#94a3b8";
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:26px;height:34px;">
        ${
          available
            ? `<div style="position:absolute;left:5px;top:5px;width:16px;height:16px;border-radius:9999px;background:${color};opacity:0.35;" class="animate-pulse-ring"></div>`
            : ""
        }
        <svg width="26" height="34" viewBox="0 0 26 34" style="filter:drop-shadow(0 3px 6px rgba(15,23,42,0.35));position:relative">
          <path d="M13 0C5.8 0 0 5.8 0 13c0 9.5 13 21 13 21s13-11.5 13-21C26 5.8 20.2 0 13 0z" fill="${color}"/>
          <circle cx="13" cy="13" r="6" fill="white"/>
        </svg>
      </div>`,
    iconSize: [26, 34],
    iconAnchor: [13, 32],
    popupAnchor: [0, -30],
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:22px;height:22px;">
        <div style="position:absolute;inset:0;border-radius:9999px;background:#2563eb;opacity:0.25;" class="animate-pulse-ring"></div>
        <div style="position:absolute;left:4px;top:4px;width:14px;height:14px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function clusterIcon(count: number) {
  const size = count < 10 ? 36 : count < 25 ? 42 : 48;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:radial-gradient(circle at 30% 30%, #6366f1, #4338ca);color:white;font-size:13px;font-weight:700;border:3px solid white;box-shadow:0 4px 14px rgba(67,56,202,0.45);">${count}</div>`,
    iconSize: [size, size],
  });
}

function popupHtml(s: Station, distanceKm: number | null) {
  const connectorCount = s.chargers.reduce((sum, c) => sum + c.connectors.length, 0);
  const availableCount = s.chargers.reduce(
    (sum, c) => sum + c.connectors.filter((con) => con.status === "available").length,
    0
  );
  const types = Array.from(new Set(s.chargers.flatMap((c) => c.connectors.map((con) => con.connector_type_name))));
  const chips = types
    .map((t) => `<span class="text-[10px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">${t}</span>`)
    .join("");
  return `
    <div style="font-size:13px;width:220px;font-family:inherit">
      <div class="px-3.5 pt-3.5 pb-3">
        <div class="flex items-start justify-between gap-2">
          <p class="font-semibold text-slate-900 leading-snug">${s.station_name}</p>
          ${s.avg_rating ? `<span class="shrink-0 flex items-center gap-0.5 text-xs font-medium text-amber-600">★ ${s.avg_rating}</span>` : ""}
        </div>
        <p class="text-slate-400 text-[11px] mt-0.5">${s.operator_name} · ${s.location.city}${distanceKm !== null ? ` · ${formatDistance(distanceKm)}` : ""}</p>
        <div class="flex flex-wrap gap-1 mt-2">${chips}</div>
        <div class="flex items-center justify-between mt-2.5">
          <span class="text-xs font-semibold ${availableCount > 0 ? "text-emerald-700" : "text-slate-400"}">${availableCount} / ${connectorCount} available</span>
          ${s.tariff ? `<span class="text-xs text-slate-500">₹${s.tariff.price_per_kwh}/kWh</span>` : ""}
        </div>
      </div>
      <a href="/stations/${s.id}" class="block text-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-b-2xl transition-colors">View station &rarr;</a>
    </div>
  `;
}

function ClusterLayer({
  stations,
  userLocation,
  onSelect,
  markersRef,
  groupRef,
}: {
  stations: Station[];
  userLocation: { lat: number; lng: number } | null;
  onSelect?: (id: number) => void;
  markersRef: MutableRefObject<Map<number, L.Marker>>;
  groupRef: MutableRefObject<L.MarkerClusterGroup | null>;
}) {
  const map = useMap();

  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) => clusterIcon(cluster.getChildCount()),
    });
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    markersRef.current.clear();
    stations.forEach((s) => {
      if (!s.location.latitude || !s.location.longitude) return;
      const lat = Number(s.location.latitude);
      const lng = Number(s.location.longitude);
      const availableCount = s.chargers.reduce(
        (sum, c) => sum + c.connectors.filter((con) => con.status === "available").length,
        0
      );
      const distanceKm = userLocation ? haversineKm(userLocation.lat, userLocation.lng, lat, lng) : null;
      const marker = L.marker([lat, lng], { icon: markerIcon(availableCount > 0) });
      marker.bindPopup(popupHtml(s, distanceKm), { closeButton: true });
      if (onSelect) marker.on("click", () => onSelect(s.id));
      group.addLayer(marker);
      markersRef.current.set(s.id, marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, userLocation]);

  return null;
}

const NEARBY_RADIUS_KM = 75;

function FitBounds({
  stations,
  userLocation,
  programmaticMoveRef,
}: {
  stations: Station[];
  userLocation: { lat: number; lng: number } | null;
  programmaticMoveRef: MutableRefObject<boolean>;
}) {
  const map = useMap();
  useEffect(() => {
    // Deferred one frame: when userLocation and the station list change in the same
    // batch (the silent auto-locate on the stations page does exactly this), this
    // effect and ClusterLayer's clearLayers()+re-add both fire together. Calling
    // fitBounds while the cluster group's internal tree is mid-rebuild is what threw
    // "Cannot use 'in' operator to search for '_leaflet_id' in undefined" -- a real
    // leaflet.markercluster race, not a one-off. Waiting a frame lets the marker
    // rebuild finish first.
    const raf = requestAnimationFrame(() => {
      // Every fitBounds/setView call below is the map moving itself, not the driver --
      // flag it so the viewport listener doesn't mistake it for a manual pan and pop up
      // a "Search this area" button for a move nobody actually made.
      programmaticMoveRef.current = true;
      // Once we know where the driver is, focus the map on them and whatever's actually
      // nearby -- fitting bounds to the entire (possibly nationwide) station list would
      // zoom back out and bury their location marker among every other pin on the map.
      if (userLocation) {
        const nearby = stations
          .filter((s) => s.location.latitude && s.location.longitude)
          .map((s): [number, number] => [Number(s.location.latitude), Number(s.location.longitude)])
          .filter(([lat, lng]) => haversineKm(userLocation.lat, userLocation.lng, lat, lng) <= NEARBY_RADIUS_KM)
          .sort(
            (a, b) =>
              haversineKm(userLocation.lat, userLocation.lng, a[0], a[1]) -
              haversineKm(userLocation.lat, userLocation.lng, b[0], b[1])
          )
          .slice(0, 8);

        if (nearby.length === 0) {
          map.setView([userLocation.lat, userLocation.lng], 12);
        } else {
          map.fitBounds(L.latLngBounds([[userLocation.lat, userLocation.lng], ...nearby]), {
            padding: [40, 40],
            maxZoom: 14,
          });
        }
        return;
      }

      const points: [number, number][] = stations
        .filter((s) => s.location.latitude && s.location.longitude)
        .map((s) => [Number(s.location.latitude), Number(s.location.longitude)]);
      if (points.length === 0) return;
      if (points.length === 1) {
        map.setView(points[0], 13);
        return;
      }
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 14 });
    });
    return () => cancelAnimationFrame(raf);
  }, [map, stations, userLocation, programmaticMoveRef]);
  return null;
}

/** Lets the driver-facing station list drive the map: selecting a card zooms/spiderfies
 * to that marker (even if it's currently buried in a cluster) and opens its popup. */
function SelectionSync({
  selectedId,
  markersRef,
  groupRef,
  programmaticMoveRef,
}: {
  selectedId: number | null;
  markersRef: MutableRefObject<Map<number, L.Marker>>;
  groupRef: MutableRefObject<L.MarkerClusterGroup | null>;
  programmaticMoveRef: MutableRefObject<boolean>;
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedId === null) return;
    const marker = markersRef.current.get(selectedId);
    const group = groupRef.current;
    programmaticMoveRef.current = true;
    if (!marker || !group) return;
    group.zoomToShowLayer(marker, () => {
      map.panTo(marker.getLatLng(), { animate: true });
      marker.openPopup();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
  return null;
}

function ViewportListener({
  onChange,
  programmaticMoveRef,
}: {
  onChange: (bounds: L.LatLngBounds) => void;
  programmaticMoveRef: MutableRefObject<boolean>;
}) {
  const map = useMapEvents({
    moveend: () => {
      // A fitBounds/setView call fires moveend too -- skip exactly that one report
      // rather than a blanket timer, so "Search this area" only ever reflects a
      // pan/zoom the driver actually made, however long data took to arrive.
      if (programmaticMoveRef.current) {
        programmaticMoveRef.current = false;
        return;
      }
      onChange(map.getBounds());
    },
  });
  return null;
}

export default function StationsMap({
  stations,
  userLocation = null,
  selectedId = null,
  onSelect,
  height = "420px",
  interactive = true,
  onViewportChanged,
}: {
  stations: Station[];
  userLocation?: { lat: number; lng: number } | null;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  height?: string;
  /** false renders a calm, non-hijacking preview -- no scroll-zoom or zoom buttons -- for
   * decorative contexts like the marketing hero, where the page should still scroll normally. */
  interactive?: boolean;
  onViewportChanged?: (bounds: L.LatLngBounds) => void;
}) {
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const programmaticMoveRef = useRef(false);

  const withCoords = stations.filter((s) => s.location.latitude && s.location.longitude);
  if (withCoords.length === 0) return null;

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [
        withCoords.reduce((sum, s) => sum + Number(s.location.latitude), 0) / withCoords.length,
        withCoords.reduce((sum, s) => sum + Number(s.location.longitude), 0) / withCoords.length,
      ];

  return (
    <MapContainer
      center={center}
      zoom={5}
      scrollWheelZoom={interactive}
      zoomControl={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      attributionControl={interactive}
      style={{ height, width: "100%" }}
      className="rounded-2xl overflow-hidden"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClusterLayer stations={withCoords} userLocation={userLocation} onSelect={onSelect} markersRef={markersRef} groupRef={groupRef} />
      <FitBounds stations={withCoords} userLocation={userLocation} programmaticMoveRef={programmaticMoveRef} />
      <SelectionSync selectedId={selectedId} markersRef={markersRef} groupRef={groupRef} programmaticMoveRef={programmaticMoveRef} />
      {onViewportChanged && <ViewportListener onChange={onViewportChanged} programmaticMoveRef={programmaticMoveRef} />}
      {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon()} />}
    </MapContainer>
  );
}
