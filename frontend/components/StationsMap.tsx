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

import { useEffect, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { Station } from "@/lib/types";
import { haversineKm } from "@/lib/geo";

function markerIcon(available: boolean) {
  const color = available ? "#4f46e5" : "#94a3b8";
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 5px rgba(37,99,235,0.25);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function clusterIcon(count: number) {
  const size = count < 10 ? 34 : count < 25 ? 40 : 46;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:#4f46e5;color:white;font-size:12px;font-weight:600;border:3px solid white;box-shadow:0 2px 8px rgba(79,70,229,0.4);">${count}</div>`,
    iconSize: [size, size],
  });
}

function popupHtml(s: Station) {
  const connectorCount = s.chargers.reduce((sum, c) => sum + c.connectors.length, 0);
  const availableCount = s.chargers.reduce(
    (sum, c) => sum + c.connectors.filter((con) => con.status === "available").length,
    0
  );
  const types = Array.from(new Set(s.chargers.flatMap((c) => c.connectors.map((con) => con.connector_type_name))));
  const chips = types
    .map(
      (t) =>
        `<span style="font-size:10px;font-weight:500;color:#475569;background:#f1f5f9;border-radius:9999px;padding:2px 7px;margin-right:3px;">${t}</span>`
    )
    .join("");
  return `
    <div style="font-size:13px;min-width:180px;font-family:inherit">
      <p style="font-weight:600;margin:0 0 2px;color:#0f172a">${s.station_name}</p>
      <p style="color:#94a3b8;margin:0 0 6px;font-size:11px">${s.operator_name}</p>
      <p style="margin:0 0 4px">${chips}</p>
      <p style="color:${availableCount > 0 ? "#047857" : "#94a3b8"};margin:0 0 2px;font-weight:500">${availableCount} / ${connectorCount} available</p>
      ${s.tariff ? `<p style="color:#64748b;margin:0 0 8px">₹${s.tariff.price_per_kwh}/kWh</p>` : '<p style="margin:0 0 8px"></p>'}
      <a href="/stations/${s.id}" style="display:inline-block;font-size:12px;font-weight:600;color:white;background:#4f46e5;border-radius:6px;padding:5px 10px;text-decoration:none">View station →</a>
    </div>
  `;
}

function ClusterLayer({ stations }: { stations: Station[] }) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 45,
      iconCreateFunction: (cluster) => clusterIcon(cluster.getChildCount()),
    });
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    stations.forEach((s) => {
      if (!s.location.latitude || !s.location.longitude) return;
      const availableCount = s.chargers.reduce(
        (sum, c) => sum + c.connectors.filter((con) => con.status === "available").length,
        0
      );
      const marker = L.marker([Number(s.location.latitude), Number(s.location.longitude)], {
        icon: markerIcon(availableCount > 0),
      });
      marker.bindPopup(popupHtml(s));
      group.addLayer(marker);
    });
  }, [stations]);

  return null;
}

const NEARBY_RADIUS_KM = 75;

function FitBounds({ stations, userLocation }: { stations: Station[]; userLocation: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
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
  }, [map, stations, userLocation]);
  return null;
}

export default function StationsMap({
  stations,
  userLocation = null,
}: {
  stations: Station[];
  userLocation?: { lat: number; lng: number } | null;
}) {
  const withCoords = stations.filter((s) => s.location.latitude && s.location.longitude);
  if (withCoords.length === 0) return null;

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [
        withCoords.reduce((sum, s) => sum + Number(s.location.latitude), 0) / withCoords.length,
        withCoords.reduce((sum, s) => sum + Number(s.location.longitude), 0) / withCoords.length,
      ];

  return (
    <MapContainer center={center} zoom={5} scrollWheelZoom style={{ height: "380px", width: "100%", borderRadius: "12px" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClusterLayer stations={withCoords} />
      <FitBounds stations={withCoords} userLocation={userLocation} />
      {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon()} />}
    </MapContainer>
  );
}
