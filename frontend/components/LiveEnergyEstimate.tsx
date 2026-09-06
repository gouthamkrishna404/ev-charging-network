"use client";

import { useEffect, useState } from "react";

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

// No real charger hardware to poll, so this is a live estimate only -- the
// authoritative energy figure is computed server-side (elapsed time at the
// connector's rated power) the moment the session actually ends.
export default function LiveEnergyEstimate({ startTime, powerKw }: { startTime: string; powerKw: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = Math.max(0, (now - new Date(startTime).getTime()) / 1000);
  const estimatedKwh = (powerKw * (elapsedSeconds / 3600)).toFixed(2);

  return (
    <p className="text-sm text-slate-600 flex items-center gap-2">
      <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
      {formatElapsed(elapsedSeconds)} elapsed · ~{estimatedKwh} kWh so far
    </p>
  );
}
