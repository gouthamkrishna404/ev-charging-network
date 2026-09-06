"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, MessageSquare, Play, Plug, Tag, UserCircle2, Zap } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { getRole, isLoggedIn } from "@/lib/auth";
import { Review, Station, Vehicle, VehicleModel } from "@/lib/types";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconTile,
  Input,
  PageHeader,
  Select,
  Skeleton,
  StarRating,
} from "@/components/ui";

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
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isDriver, setIsDriver] = useState(false);

  async function load(driverNow: boolean) {
    try {
      const [s, v, m, r] = await Promise.all([
        apiFetch<Station>(`/stations/${id}`),
        driverNow ? apiFetch<Vehicle[]>("/users/me/vehicles") : Promise.resolve([]),
        driverNow ? apiFetch<VehicleModel[]>("/vehicle-models") : Promise.resolve([]),
        apiFetch<Review[]>(`/stations/${id}/reviews`),
      ]);
      setStation(s);
      setVehicles(v);
      setModels(m);
      setReviews(r);
      const active = v.filter((vehicle) => vehicle.vehicle_status === "active");
      if (active.length > 0) setVehicleId(active[0].id);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Failed to load this station" });
    }
  }

  useEffect(() => {
    const driverNow = isLoggedIn() && getRole() === "driver";
    setIsDriver(driverNow);
    load(driverNow);
  }, [id]);

  const activeVehicles = vehicles.filter((v) => v.vehicle_status === "active");

  function vehicleLabel(v: Vehicle) {
    const model = models.find((m) => m.id === v.model_id);
    return `${model ? `${model.make} ${model.model_name}` : "Vehicle"} — ${v.registration_number}`;
  }

  async function startWalkIn(connectorId: number) {
    setMessage(null);
    if (vehicleId === "") {
      setMessage({ type: "error", text: "Add a vehicle first." });
      return;
    }
    try {
      await apiFetch("/sessions/start", {
        method: "POST",
        body: JSON.stringify({ connector_id: connectorId, vehicle_id: vehicleId }),
      });
      router.push("/bookings");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
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
      setMessage({ type: "success", text: "Booking confirmed." });
      setBookingConnectorId(null);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await apiFetch(`/stations/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment || null }),
      });
      setReviewComment("");
      const r = await apiFetch<Review[]>(`/stations/${id}/reviews`);
      setReviews(r);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
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
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <IconTile icon={Zap} tone="indigo" />
        <div className="flex-1">
          <PageHeader
            title={station.station_name}
            subtitle={`${station.location.address_line}, ${station.location.city}, ${station.location.state}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 -mt-4">
        {station.tariff && (
          <span className="flex items-center gap-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1">
            <Tag size={13} className="text-slate-400" />₹{station.tariff.price_per_kwh} / kWh
          </span>
        )}
        {avgRating !== null && (
          <span className="flex items-center gap-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1">
            <StarRating rating={Math.round(avgRating)} /> {avgRating.toFixed(1)} ({reviews.length})
          </span>
        )}
      </div>

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
      {message && <Alert type={message.type}>{message.text}</Alert>}

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

      <div className="space-y-4">
        {station.chargers.map((charger) => (
          <Card key={charger.id} className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Plug size={15} className="text-slate-500" />
              </div>
              <p className="font-medium text-sm text-slate-900">
                {charger.charger_model ?? "Charger"} <span className="text-slate-400 font-normal">· {charger.power_capacity_kw} kW</span>
              </p>
            </div>
            <ul className="space-y-2">
              {charger.connectors.map((connector) => (
                <li
                  key={connector.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm border-t border-slate-100 pt-2.5"
                >
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-700">{connector.connector_type_name}</span>
                    <span className="text-slate-400">#{connector.id} · {connector.max_power_kw} kW</span>
                    <Badge status={connector.status} />
                  </span>
                  {connector.status === "available" && activeVehicles.length > 0 && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => startWalkIn(connector.id)}>
                        <Play size={12} /> Start now
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setBookingConnectorId(connector.id)}>
                        <Clock size={12} /> Book for later
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {bookingConnectorId !== null && charger.connectors.some((c) => c.id === bookingConnectorId) && (
              <form onSubmit={submitBooking} className="mt-3 flex flex-wrap items-end gap-3 bg-slate-50 p-3 rounded-lg">
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
              </form>
            )}
          </Card>
        ))}
      </div>

      {sortedHours.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-slate-400" />
            <p className="font-medium text-sm text-slate-900">Operating Hours</p>
          </div>
          <ul className="text-sm text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sortedHours.map((h) => (
              <li
                key={h.id}
                className={`rounded-lg px-2 py-1 ${h.day_of_week === today ? "bg-indigo-50 text-indigo-700 font-medium" : ""}`}
              >
                {h.day_of_week.slice(0, 3)}: {h.opening_time.slice(0, 5)}–{h.closing_time.slice(0, 5)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={15} className="text-slate-400" />
          <p className="font-medium text-sm text-slate-900">Reviews</p>
        </div>
        <ul className="space-y-3 mb-4">
          {reviews.map((r) => (
            <li key={r.id} className="flex gap-3 text-sm border-b border-slate-100 pb-3 last:border-0">
              <UserCircle2 size={28} className="text-slate-300 shrink-0" strokeWidth={1.5} />
              <div>
                <div className="flex items-center gap-2">
                  <StarRating rating={r.rating} />
                  {r.is_verified && <span className="text-xs text-emerald-700 font-medium">Verified visit</span>}
                </div>
                {r.comment && <p className="text-slate-600 mt-0.5">{r.comment}</p>}
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
  );
}
