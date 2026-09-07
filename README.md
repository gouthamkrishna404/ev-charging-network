# Volt Grid — EV Charging Network Management System

A full-stack EV charging marketplace: drivers browse stations from competing
operators, book or walk up to a connector, charge, get billed, and pay.
Operators manage stations, pricing, staff, and maintenance through an admin
dashboard with real usage analytics.

See [`docs/SCHEMA.md`](docs/SCHEMA.md) for schema design reasoning and
[`docs/ERD.md`](docs/ERD.md) for the entity-relationship diagram.

## Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS, Recharts for
  analytics charts, Leaflet + `leaflet.markercluster` for the station map,
  Sonner for toast notifications
- Backend: FastAPI + SQLAlchemy + Alembic
- Database: PostgreSQL 17

## Prerequisites

- Python 3.11+ , Node 18+, PostgreSQL running locally.

## Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\python -m pip install -r requirements.txt
```

Create a database and role (adjust to your own Postgres setup, or reuse
`backend/.env` as-is if you have a `postgres` superuser with password
`postgres`):

```sql
CREATE ROLE ev_app WITH LOGIN PASSWORD 'ev_app_pw';
CREATE DATABASE ev_charging OWNER ev_app;
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- run inside ev_charging
```

Apply migrations and load sample data:

```bash
venv\Scripts\python -m alembic upgrade head
venv\Scripts\python -m app.seed
```

Run the API:

```bash
venv\Scripts\python -m uvicorn app.main:app --port 8000
```

(On Windows, `--reload` spawns a child worker process that can survive killing
the parent and keep serving stale code — safer to restart manually after
backend changes during development.)

API docs at http://localhost:8000/docs.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App at http://localhost:3000.

## Demo accounts (from the seed script)

The seed script creates two competing operators, 17 stations across 7 cities
(Chennai gets the deepest coverage — 6 stations across both operators, handy
for testing the "nearby stations" geolocation feature), 14 drivers, and ~90
days of randomized (but reproducible) historical activity.

- Driver: `driver@example.com` / `Password123!`
- Admin (Volt Grid Networks): `admin@voltgrid.example` / `Password123!`
- Admin (ChargeNow India): `admin@chargenow.example` / `Password123!`

## What's implemented

**Driver**: register/login, manage vehicles, browse stations on an
interactive clustered map with filters (connector type, city, availability,
price/rating/distance sorting, automatic "nearby stations" via geolocation),
book a connector or start a walk-in session, watch a live energy estimate
during a session, end a session, view/pay itemized bills, request refunds,
and subscribe to a charging plan — one active subscription at a time, whose
discount applies network-wide at any operator's stations, not just the one
that sold it — and receive notifications on key events.

**Admin**: register a new operator (self-serve, creates the operator's first
super-admin), add teammates and assign them to specific stations, create and
manage stations/chargers/connectors/tariffs/operating hours, view bookings
per station, open and resolve maintenance tickets against technicians,
approve or reject refund requests, see a full audit log of every admin
action, and review a dedicated analytics dashboard (revenue trend, revenue by
station, sessions by connector type, KPIs) backed by real SQL aggregation.

**Database-enforced concurrency control**: a PostgreSQL `EXCLUDE` constraint
rejects overlapping bookings on the same connector — not an
application-level check, so it holds up under concurrent requests.

See `docs/SCHEMA.md` for the full reasoning behind the schema, including
which entities were added in the MVP pass vs. afterward.
