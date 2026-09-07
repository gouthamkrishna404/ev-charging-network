# Schema Design Notes

This documents how the schema (27 tables — the full original 26-entity draft,
plus one new junction table, see `ERD.md`) evolved from the original rough
draft, and why. The system shipped in two passes: an MVP covering the core
loop (browse → book/walk-in → charge → bill → pay), then the remaining
entities below once that loop was proven to work.

## What changed from the original draft, and why

1. **Dropped composite primary keys built from every FK.** The original draft
   flagged every foreign key column as also being part of the primary key
   (e.g. `VEHICLE(VehicleID, UserID, ModelID)`). Every table now has a single
   surrogate integer PK; FKs are plain FKs. A composite key here would have
   let the same `VehicleID` legally repeat, which was never the intent.

2. **`STATION_ADMIN` junction table added.** The original model gave each
   station exactly one admin (`CHARGING_STATION.AdminID`). Since the product
   requirement is "multiple admins can manage a station," this became a
   many-to-many relationship, resolved with `station_admins(station_id, admin_id)`.

3. **Connector compatibility moved from vehicle to vehicle *model*.**
   `MODEL_CONNECTOR_TYPES` links `vehicle_models` to `connector_types`, not
   individual vehicles. Every Hyundai Ioniq 5 uses the same plug — compatibility
   is a property of the model, not of one user's specific car. This avoids
   re-entering the same data for every vehicle of the same model.

4. **Dropped two redundant/derived fields.**
   - `CHARGING_STATION.TotalConnectors` — this is just `COUNT(*)` over
     `connectors`; storing it invites drift from the real count.
   - `CHARGING_SESSION.TotalCost` — duplicated `BILL.TotalAmount`. A session's
     cost lives in exactly one place: the bill.

5. **`CHARGING_SESSION` no longer depends on `BOOKING` to know its own
   connector/user/vehicle.** Walk-in charging (no prior reservation) is a
   requirement, so a session can't rely on a booking that might not exist.
   `charging_sessions` now carries `connector_id`, `user_id`, and `vehicle_id`
   directly; `booking_id` is nullable and only present when the session
   originated from a reservation.

6. **`TARIFF` kept simple**: one active price per station (`price_per_kwh`),
   no peak/off-peak split and no effective-date history. Time-based pricing
   layered on top of `STATION_OPERATING_HOURS` was judged not worth the
   added complexity; tariff history would be the next thing to add if this
   went further.

7. **`PAYMENT` supports both bills and subscriptions**, exactly as in the
   original draft — a payment is for a charging session's bill *or* for a
   subscription's fee, never both. That exclusivity is enforced by a `CHECK`
   constraint (`ck_payments_exactly_one_target`), not just application logic.

## Entities added after the MVP

The MVP shipped with 17 tables covering the core loop. These were added once
that loop worked, matching the original draft (with the same PK/FK and
naming fixes applied throughout):

- **`charging_plans` / `subscriptions`** — a user subscribes to a plan; its
  `discount_percentage` is applied to `bills.energy_charge` at billing time
  and stored as `bills.subscription_discount` (a snapshot, not a live
  reference — the discount a past bill applied shouldn't change if the plan
  changes later). `charging_plans.operator_id` was added after the fact, for
  the same reason as `technicians.operator_id` below: a plan with no operator
  meant any subscriber's discount applied at *any* station on the whole
  marketplace, including competing operators who never agreed to honor it.
  Plans, and the discount check at billing time, are now scoped per operator
  — a user can hold one active subscription per operator simultaneously.
- **`station_operating_hours`** — per-day open/close times. A station with no
  rows is treated as open at all times (opt-in, not opt-out); `bookings` are
  rejected outside a station's configured hours for that day.
- **`meter_readings`** — a time series against a `charging_session`. Originally
  the driver typed in a "final energy (kWh)" number to end a session, which
  doesn't reflect how charging actually works — a real charger's meter
  reports the energy, the driver never self-declares it. `charging_sessions.energy_delivered_kwh`
  is now computed server-side from elapsed time at the connector's rated
  power (`connectors.max_power_kw`) the moment a session ends, and a row is
  written to `meter_readings` at that point. The driver-facing "kWh so far"
  counter while charging is a client-side estimate using the same formula —
  it's for feedback only; the number that actually gets billed is calculated
  once, server-side, at end time.
- **`notifications`** — created automatically by the backend on key events
  (booking confirmed/cancelled, session ended, payment received, refund
  resolved), not user-authored.
- **`station_reviews`** — one review per `(user, station)` pair
  (`uq_review_user_station`); `is_verified` is computed server-side from
  whether the reviewer has a completed session at that station, not
  self-reported.
- **`refunds`** — a driver requests one against a successful `payment`;
  an admin who manages the station behind that payment approves or rejects
  it. Approval flips the payment to `refunded`.
- **`maintenance_tickets` / `technicians`** — connector-level only (per the
  MVP scoping decision), opening a ticket takes the connector `out_of_service`
  and completing it restores `available`. `technicians.operator_id` was added
  after the fact: the original draft (and this project's first pass) modeled
  technicians as a single global pool, which meant one operator's admin could
  see and assign another operator's field staff — a real multi-tenancy leak
  in a marketplace with more than one operator. Scoped per-operator now, the
  same way `admins` already were.
- **`audit_logs`** — every admin mutation (creating a station/charger/
  connector, editing a tariff or hours, resolving a maintenance ticket or
  refund) writes one row here. It's a plain FK-based log, not a generic
  polymorphic one — each admin action logs which table and record it touched
  as data, not as an enforced foreign key, which is a deliberate trade-off:
  it can't enforce referential integrity, but it doesn't need a separate
  audit table per entity type either.

## Constraints worth calling out

- **`bookings` has a PostgreSQL `EXCLUDE` constraint** (`ex_bookings_no_overlap`,
  using a GiST index over `(connector_id, tsrange(start_time, end_time))`,
  filtered to `status = 'confirmed'`). This is what actually prevents two
  users from booking the same connector for overlapping times — enforced by
  the database itself, not by an application-level "check then insert" that
  would have a race condition under concurrent requests. It requires the
  `btree_gist` extension (enabled in the first migration).
- Every `status`/`role`/`payment_method` style column has a `CHECK` constraint
  restricting it to an explicit value set, rather than being a free-text
  `VARCHAR` as in the original draft.
- `tariffs.station_id`, `bills.session_id`, `payments.bill_id`, and
  `payments.subscription_id` are all `UNIQUE`, enforcing their intended
  one-to-one relationships at the database level, not just by convention in
  application code.
- `payments` has `ck_payments_exactly_one_target`: exactly one of `bill_id` /
  `subscription_id` must be set. This is the "exclusive arc" pattern — a
  known relational modeling challenge (a payment is polymorphic over what it
  pays for) solved here with nullable FKs plus a `CHECK`, rather than a
  separate `payment_line_items` table, which would be overkill for two cases.

## Performance

- A later migration (`f1a2b3c4d5e6`) adds indexes on the columns the admin
  analytics dashboard and public station search actually filter/sort/group
  by: `bills.generated_date`, `charging_sessions.start_time` and
  `.connector_id`, `bookings.start_time`, `locations.city`, and
  `charging_stations.operator_id`. These weren't needed for the MVP's single
  operator and single historical session, but matter once the dataset is
  13 stations and hundreds of sessions deep.
- `ChargingStation.avg_rating` / `.review_count` are computed in Python from
  an eager-loaded `reviews` relationship rather than a SQL `AVG()`/`COUNT()`
  subquery, since the station list/detail queries already eager-load reviews
  for other reasons — adding a second aggregate query per request would be
  pure overhead for the same data.
