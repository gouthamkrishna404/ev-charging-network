"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { useRouter } from "next/navigation";
import { Station } from "@/lib/types";

function markerIcon(available: boolean) {
  const color = available ? "#4f46e5" : "#94a3b8";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:16px;height:16px;border-radius:9999px;
      background:${color};border:3px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

export default function StationsMap({ stations }: { stations: Station[] }) {
  const router = useRouter();
  const withCoords = stations.filter((s) => s.location.latitude && s.location.longitude);

  if (withCoords.length === 0) return null;

  const center: [number, number] = [
    withCoords.reduce((sum, s) => sum + Number(s.location.latitude), 0) / withCoords.length,
    withCoords.reduce((sum, s) => sum + Number(s.location.longitude), 0) / withCoords.length,
  ];

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      style={{ height: "280px", width: "100%", borderRadius: "12px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.map((s) => {
        const connectorCount = s.chargers.reduce((sum, c) => sum + c.connectors.length, 0);
        const availableCount = s.chargers.reduce(
          (sum, c) => sum + c.connectors.filter((con) => con.status === "available").length,
          0
        );
        return (
          <Marker
            key={s.id}
            position={[Number(s.location.latitude), Number(s.location.longitude)]}
            icon={markerIcon(availableCount > 0)}
            eventHandlers={{ click: () => router.push(`/stations/${s.id}`) }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-medium">{s.station_name}</p>
                <p className="text-slate-500">
                  {availableCount} / {connectorCount} available
                  {s.tariff && ` · ₹${s.tariff.price_per_kwh}/kWh`}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
