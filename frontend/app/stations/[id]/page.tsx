"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronLeft, Clock, MessageSquare, Play, Plug, Tag, UserCircle2, Zap } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { getRole, isLoggedIn } from "@/lib/auth";
import { Review, Station, Vehicle, VehicleModel } from "@/lib/types";
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  IconTile,
  Input,
  PageHeader,
  Select,
  SectionHeading,
  Skeleton,
  StarRating,
} from "@/components/ui";

const StationsMap = dynamic(() => import("@/components/StationsMap"), { ssr: false });

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DURATION_PRESETS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "4 hours", minutes: 240 },
];

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function StationDetailPage(props: PageProps<"/stations/[id]">) {
  const { id } = use(props.params);
  const router = useRouter();

  const [station, setStation] = useState<Station | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [bookingConnectorId, setBookingConnectorId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDriver, setIsDriver] = useState(false);

  async function load(driverNow: boolean) {
    // The station itself and its reviews are public -- fetch and render those first so a
    // problem with the driver-only calls below (e.g. an expired session) never leaves the
    // whole page stuck behind a skeleton with no visible error.
    try {
      const [s, r] = await Promise.all([apiFetch<Station>(`/stations/${id}`), apiFetch<Review[]>(`/stations/${id}/reviews`)]);
      setStation(s);
      setReviews(r);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load this station");
      return;
    }

    if (!driverNow) return;
    try {
      const [v, m] = await Promise.all([
        apiFetch<Vehicle[]>("/users/me/vehicles"),
        apiFetch<VehicleModel[]>("/vehicle-models"),
      ]);
      setVehicles(v);
      setModels(m);
      const active = v.filter((vehicle) => vehicle.vehicle_status === "active");
      if (active.length > 0) setVehicleId(active[0].id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load your vehicles");
    }
  }

  useEffect(() => {
    const driverNow = isLoggedIn() && getRole() === "driver";
    setIsDriver(driverNow);
    load(driverNow);
  }, [id]);

  const activeVehicles = vehicles.filter((v) => v.vehicle_status === "active");
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedModel = selectedVehicle ? models.find((m) => m.id === selectedVehicle.model_id) : undefined;

  const allConnectors = (station?.chargers ?? []).flatMap((c) => c.connectors);
  const bestConnector = allConnectors.find(
    (c) => c.status === "available" && (!selectedModel || selectedModel.connector_type_names.includes(c.connector_type_name))
  );

  function vehicleLabel(v: Vehicle) {
    const model = models.find((m) => m.id === v.model_id);
    return `${model ? `${model.make} ${model.model_name}` : "Vehicle"} — ${v.registration_number}`;
  }

  function openBookingForm(connectorId: number) {
    const start = new Date(Date.now() + 15 * 60000);
    start.setMinutes(Math.ceil(start.getMinutes() / 5) * 5, 0, 0);
    const end = new Date(start.getTime() + 60 * 60000);
    setStartTime(toLocalInputValue(start));
    setEndTime(toLocalInputValue(end));
    setBookingConnectorId(connectorId);
  }

  function applyDuration(minutes: number) {
    if (!startTime) return;
    setEndTime(toLocalInputValue(new Date(new Date(startTime).getTime() + minutes * 60000)));
  }

  const currentDurationMinutes =
    startTime && endTime ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000) : null;

  async function startWalkIn(connectorId: number) {
    if (vehicleId === "") {
      toast.error("Add a vehicle first.");
      return;
    }
    try {
      await apiFetch("/sessions/start", {
        method: "POST",
        body: JSON.stringify({ connector_id: connectorId, vehicle_id: vehicleId }),
      });
      toast.success("Session started — plug in and charge.");
      router.push("/bookings");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (vehicleId === "" || bookingConnectorId === null) return;
    try {
      await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          vehicle_id: vehicleId,
          connector_id: bookingConnectorId,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
        }),
      });
      toast.success("Booking confirmed.");
      setBookingConnectorId(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch(`/stations/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment || null }),
      });
      setReviewComment("");
      toast.success("Review posted.");
      const r = await apiFetch<Review[]>(`/stations/${id}/reviews`);
      setReviews(r);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  if (!station) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const sortedHours = [...station.operating_hours].sort(
    (a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
  );
  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
  const today = DAY_ORDER[(new Date().getDay() + 6) % 7];

  return (
    <div className={`space-y-6 animate-fade-in-up ${isDriver && activeVehicles.length > 0 && bestConnector ? "pb-20 md:pb-0" : ""}`}>
      <Link href="/stations" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-200 transition-colors">
        <ChevronLeft size={15} /> All stations
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        <IconTile icon={Zap} tone="indigo" />
        <div className="flex-1 min-w-[220px]">
          <PageHeader
            title={station.station_name}
            subtitle={`${station.location.address_line}, ${station.location.city}, ${station.location.state} · ${station.operator_name}`}
          />
          <div className="flex flex-wrap gap-4 -mt-4">
            {station.tariff && (
              <span className="flex items-center gap-1.5 text-sm text-slate-300 bg-white/[0.05] border border-white/12 rounded-full px-3 py-1">
                <Tag size={13} className="text-slate-400" />₹{station.tariff.price_per_kwh} / kWh
              </span>
            )}
            {avgRating !== null && (
              <span className="flex items-center gap-1.5 text-sm text-slate-300 bg-white/[0.05] border border-white/12 rounded-full px-3 py-1">
                <StarRating rating={Math.round(avgRating)} /> {avgRating.toFixed(1)} ({reviews.length})
              </span>
            )}
          </div>
        </div>
        {station.location.latitude && station.location.longitude && (
          <Card className="w-full sm:w-48 h-32 overflow-hidden p-0 shrink-0">
            <StationsMap stations={[station]} interactive={false} height="100%" />
          </Card>
        )}
      </div>

      {isDriver && activeVehicles.length > 0 && bestConnector && (
        <div className="hidden sm:flex relative rounded-2xl overflow-hidden bg-slate-950 text-white items-center gap-4 p-5">
          <div aria-hidden className="absolute inset-0 bg-mesh-hero" />
          <div className="relative flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase text-volt-400 bg-white/5 ring-1 ring-white/10 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-volt-400 animate-pulse-ring" />
              Ready to charge
            </span>
            <p className="font-display text-lg font-semibold mt-2">
              {bestConnector.connector_type_name} available now{selectedModel ? ` for your ${selectedModel.make} ${selectedModel.model_name}` : ""}
            </p>
            <p className="text-sm text-slate-400 mt-0.5">{bestConnector.max_power_kw} kW · no booking needed, plug in whenever you arrive</p>
          </div>
          <Button size="lg" className="relative shrink-0" onClick={() => startWalkIn(bestConnector.id)}>
            <Play size={14} /> Start now
          </Button>
        </div>
      )}

      {!isDriver && (
        <Alert type="error">
          <Link href="/login" className="underline">
            Log in as a driver
          </Link>{" "}
          to book a connector or start charging here.
        </Alert>
      )}
      {isDriver && activeVehicles.length === 0 && (
        <Alert type="error">
          Add or reactivate a vehicle before booking or charging —{" "}
          <Link href="/vehicles" className="underline">
            go to My Vehicles
          </Link>
          .
        </Alert>
      )}
      {loadError && <Alert type="error">{loadError}</Alert>}

      {activeVehicles.length > 1 && (
        <Card className="p-3 max-w-sm">
          <Field label="Charging as">
            <Select className="w-full" value={vehicleId} onChange={(e) => setVehicleId(Number(e.target.value))}>
              {activeVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleLabel(v)}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
      )}

      <SectionHeading icon={Plug} title="Chargers & connectors" />
      <div className="space-y-4">
        {station.chargers.map((charger) => (
          <Card key={charger.id} className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.07] flex items-center justify-center shrink-0">
                <Plug size={15} className="text-slate-500" />
              </div>
              <p className="font-medium text-sm text-slate-100">
                {charger.charger_model ?? "Charger"} <span className="text-slate-400 font-normal">· {charger.power_capacity_kw} kW</span>
              </p>
            </div>
            <ul className="space-y-2">
              {charger.connectors.map((connector) => {
                const incompatible =
                  !!selectedModel && !selectedModel.connector_type_names.includes(connector.connector_type_name);
                return (
                  <li
                    key={connector.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm border-t border-slate-100 pt-2.5"
                  >
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-300">{connector.connector_type_name}</span>
                      <span className="text-slate-400">#{connector.id} · {connector.max_power_kw} kW</span>
                      <Badge status={connector.status} />
                    </span>
                    {connector.status === "available" && activeVehicles.length > 0 && (
                      incompatible ? (
                        <span className="flex items-center gap-1.5 text-xs text-amber-400">
                          <AlertTriangle size={12} /> Not compatible with your {selectedModel!.make} {selectedModel!.model_name}
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => startWalkIn(connector.id)}>
                            <Play size={12} /> Start now
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openBookingForm(connector.id)}>
                            <Clock size={12} /> Book for later
                          </Button>
                        </div>
                      )
                    )}
                  </li>
                );
              })}
            </ul>

            {bookingConnectorId !== null && charger.connectors.some((c) => c.id === bookingConnectorId) && (
              <form onSubmit={submitBooking} className="mt-3 space-y-3 bg-white/[0.05] p-3.5 rounded-lg">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Start">
                    <Input
                      type="datetime-local"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </Field>
                  <Field label="End">
                    <Input type="datetime-local" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </Field>
                  <Button type="submit">Confirm booking</Button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-0.5">Quick duration:</span>
                  {DURATION_PRESETS.map((preset) => (
                    <Chip
                      key={preset.minutes}
                      active={currentDurationMinutes === preset.minutes}
                      onClick={() => applyDuration(preset.minutes)}
                    >
                      {preset.label}
                    </Chip>
                  ))}
                </div>
              </form>
            )}
          </Card>
        ))}
      </div>

      <SectionHeading icon={MessageSquare} title="More about this station" />
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {sortedHours.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} className="text-slate-400" />
              <p className="font-medium text-sm text-slate-100">Operating Hours</p>
            </div>
            <ul className="text-sm text-slate-400 grid grid-cols-2 lg:grid-cols-1 gap-2">
              {sortedHours.map((h) => (
                <li
                  key={h.id}
                  className={`rounded-lg px-2 py-1 flex items-center justify-between gap-2 ${h.day_of_week === today ? "bg-indigo-500/15 text-indigo-300 font-medium" : ""}`}
                >
                  <span>{h.day_of_week.slice(0, 3)}</span>
                  <span className="tabular-nums">{h.opening_time.slice(0, 5)}–{h.closing_time.slice(0, 5)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className={`p-4 ${sortedHours.length === 0 ? "lg:col-span-2" : ""}`}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={15} className="text-slate-400" />
            <p className="font-medium text-sm text-slate-100">Reviews</p>
          </div>
          <ul className="space-y-3 mb-4">
            {reviews.map((r) => (
              <li key={r.id} className="flex gap-3 text-sm border-b border-slate-100 pb-3 last:border-0">
                <UserCircle2 size={28} className="text-slate-300 shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={r.rating} />
                    {r.is_verified && <span className="text-xs text-emerald-400 font-medium">Verified visit</span>}
                  </div>
                  {r.comment && <p className="text-slate-400 mt-0.5">{r.comment}</p>}
                </div>
              </li>
            ))}
            {reviews.length === 0 && <EmptyState icon={MessageSquare}>No reviews yet.</EmptyState>}
          </ul>
          {isDriver ? (
            <form onSubmit={submitReview} className="flex flex-wrap items-end gap-2">
              <Field label="Rating">
                <Select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} star{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <Input
                placeholder="Optional comment"
                className="flex-1 min-w-[180px]"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
              <Button type="submit" variant="secondary">
                Post review
              </Button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">
              <Link href="/login" className="underline">
                Log in as a driver
              </Link>{" "}
              to leave a review.
            </p>
          )}
        </Card>
      </div>

      {/* Mobile-only sticky action bar -- the fastest path to charging shouldn't require
          scrolling past hours/reviews to find the Start button on a phone. Sits above the
          bottom tab bar rather than at true bottom:0 so the two don't overlap. */}
      {isDriver && activeVehicles.length > 0 && bestConnector && bookingConnectorId === null && (
        <div className="md:hidden fixed inset-x-0 bottom-16 z-20 px-4 pb-2">
          <div className="max-w-md mx-auto bg-slate-900 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 animate-fade-in-up">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{station.station_name}</p>
              <p className="text-xs text-slate-400">{bestConnector.connector_type_name} available now</p>
            </div>
            <Button size="sm" onClick={() => startWalkIn(bestConnector.id)} className="shrink-0">
              <Play size={12} /> Start now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
