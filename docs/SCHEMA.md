# Schema Design Notes

This documents how the MVP schema (17 tables, see `ERD.md`) evolved from the
original 26-entity rough draft, and why.

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

6. **`TARIFF` simplified for MVP**: one active price per station
   (`price_per_kwh`), no peak/off-peak split and no effective-date history.
   Time-based pricing without `STATION_OPERATING_HOURS` (deferred) wasn't
   meaningful yet, and tariff history is a real V2 feature, not a demo blocker.

7. **`PAYMENT` simplified for MVP**: references `BILL` only. The original
   design also allowed a payment against a `SUBSCRIPTION`, but subscriptions
   are out of scope for the MVP, so that exclusive-or FK pair (and the
   `CHECK` constraint it would need) is deferred along with it.

## Deferred out of the MVP

Kept in the original design, planned for V2: `STATION_OPERATING_HOURS`,
`CHARGING_PLAN`, `SUBSCRIPTION`, `METER_READING`, `NOTIFICATION`,
`STATION_REVIEW`, `REFUND`.

Deferred further, to an "advanced" phase: `MAINTENANCE`, `TECHNICIAN`,
`AUDIT_LOG`. These matter for a production system but don't touch the core
loop (browse → book/walk-in → charge → bill → pay) the MVP demonstrates.

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
- `tariffs.station_id`, `bills.session_id`, and `payments.bill_id` are all
  `UNIQUE`, enforcing their intended one-to-one relationships at the database
  level, not just by convention in application code.
