"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { Review, Station, Vehicle, VehicleModel } from "@/lib/types";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Select, StarRating } from "@/components/ui";

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
  const [loggedIn, setLoggedIn] = useState(false);

  async function load(loggedInNow: boolean) {
    const [s, v, m, r] = await Promise.all([
      apiFetch<Station>(`/stations/${id}`),
      loggedInNow ? apiFetch<Vehicle[]>("/users/me/vehicles") : Promise.resolve([]),
      loggedInNow ? apiFetch<VehicleModel[]>("/vehicle-models") : Promise.resolve([]),
      apiFetch<Review[]>(`/stations/${id}/reviews`),
    ]);
    setStation(s);
    setVehicles(v);
    setModels(m);
    setReviews(r);
    const active = v.filter((vehicle) => vehicle.vehicle_status === "active");
    if (active.length > 0) setVehicleId(active[0].id);
  }

  useEffect(() => {
    const loggedInNow = isLoggedIn();
    setLoggedIn(loggedInNow);
    load(loggedInNow);
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

  if (!station) return <EmptyState>Loading…</EmptyState>;

  const sortedHours = [...station.operating_hours].sort(
    (a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
  );
  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={station.station_name}
        subtitle={`${station.location.address_line}, ${station.location.city}, ${station.location.state}`}
      />

      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
        {station.tariff && <span>₹{station.tariff.price_per_kwh} / kWh</span>}
        {avgRating !== null && (
          <span className="flex items-center gap-1">
            <StarRating rating={Math.round(avgRating)} /> {avgRating.toFixed(1)} ({reviews.length})
          </span>
        )}
      </div>

      {!loggedIn && (
        <Alert type="error">
          <Link href="/login" className="underline">
            Log in
          </Link>{" "}
          to book a connector or start charging here.
        </Alert>
      )}
      {loggedIn && activeVehicles.length === 0 && (
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
        <label className="block text-sm text-slate-600">
          Charging as
          <Select
            className="block mt-1"
            value={vehicleId}
            onChange={(e) => setVehicleId(Number(e.target.value))}
          >
            {activeVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {vehicleLabel(v)}
              </option>
            ))}
          </Select>
        </label>
      )}

      <div className="space-y-4">
        {station.chargers.map((charger) => (
          <Card key={charger.id} className="p-4">
            <p className="font-medium text-sm text-slate-900">
              {charger.charger_model ?? "Charger"} — {charger.power_capacity_kw} kW
            </p>
            <ul className="mt-2 space-y-2">
              {charger.connectors.map((connector) => (
                <li key={connector.id} className="flex items-center justify-between text-sm border-t border-slate-100 pt-2">
                  <span className="flex items-center gap-2">
                    Connector #{connector.id} — {connector.max_power_kw} kW
                    <Badge status={connector.status} />
                  </span>
                  {connector.status === "available" && activeVehicles.length > 0 && (
                    <div className="flex gap-2">
                      <Button onClick={() => startWalkIn(connector.id)}>Start now</Button>
                      <Button variant="secondary" onClick={() => setBookingConnectorId(connector.id)}>
                        Book for later
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {bookingConnectorId !== null && charger.connectors.some((c) => c.id === bookingConnectorId) && (
              <form onSubmit={submitBooking} className="mt-3 flex flex-wrap items-end gap-2 bg-slate-50 p-3 rounded-md">
                <label className="text-xs text-slate-600">
                  Start
                  <Input
                    type="datetime-local"
                    required
                    className="block mt-1"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </label>
                <label className="text-xs text-slate-600">
                  End
                  <Input
                    type="datetime-local"
                    required
                    className="block mt-1"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </label>
                <Button type="submit">Confirm booking</Button>
              </form>
            )}
          </Card>
        ))}
      </div>

      {sortedHours.length > 0 && (
        <Card className="p-4">
          <p className="font-medium text-sm text-slate-900 mb-2">Operating Hours</p>
          <ul className="text-sm text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-1">
            {sortedHours.map((h) => (
              <li key={h.id}>
                {h.day_of_week.slice(0, 3)}: {h.opening_time.slice(0, 5)}–{h.closing_time.slice(0, 5)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <p className="font-medium text-sm text-slate-900 mb-3">Reviews</p>
        <ul className="space-y-3 mb-4">
          {reviews.map((r) => (
            <li key={r.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
              <div className="flex items-center gap-2">
                <StarRating rating={r.rating} />
                {r.is_verified && <span className="text-xs text-green-700">Verified visit</span>}
              </div>
              {r.comment && <p className="text-slate-600 mt-1">{r.comment}</p>}
            </li>
          ))}
          {reviews.length === 0 && <EmptyState>No reviews yet.</EmptyState>}
        </ul>
        {loggedIn ? (
          <form onSubmit={submitReview} className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-600">
              Rating
              <select
                className="block mt-1 border border-slate-300 rounded-md px-2 py-2 text-sm"
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
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
              Log in
            </Link>{" "}
            to leave a review.
          </p>
        )}
      </Card>
    </div>
  );
}
