"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { ProgressRing } from "./ui";

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

// No real charger hardware to poll, so this is a live estimate only -- the
// authoritative energy figure is computed server-side (elapsed time at the
// connector's rated power) the moment the session actually ends. There's no
// fixed target kWh to reach (the driver decides when to stop), so the ring
// spins indeterminately rather than filling toward a number that doesn't exist.
export default function LiveEnergyEstimate({ startTime, powerKw }: { startTime: string; powerKw: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = Math.max(0, (now - new Date(startTime).getTime()) / 1000);
  const estimatedKwh = powerKw * (elapsedSeconds / 3600);

  return (
    <div className="flex items-center gap-4">
      <ProgressRing progress={null} size={68} strokeWidth={5}>
        <Zap size={20} className="text-indigo-500" fill="currentColor" strokeWidth={0} />
      </ProgressRing>
      <div>
        <p className="text-2xl font-semibold text-slate-900 tabular-nums leading-none">~{estimatedKwh.toFixed(2)} kWh</p>
        <p className="text-sm text-slate-500 mt-1.5">{formatElapsed(elapsedSeconds)} elapsed · {powerKw} kW</p>
      </div>
    </div>
  );
}
