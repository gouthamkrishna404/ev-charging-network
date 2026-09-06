# EV Charging Network Management System (MVP)

A full-stack EV charging marketplace: drivers browse stations, book or walk up
to a connector, charge, get billed, and pay. Operators manage stations through
a lightweight admin view.

See [`docs/SCHEMA.md`](docs/SCHEMA.md) for schema design reasoning and
[`docs/ERD.md`](docs/ERD.md) for the entity-relationship diagram.

## Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
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
venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

API docs at http://localhost:8000/docs.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App at http://localhost:3000.

## Demo accounts (from the seed script)

- Driver: `driver@example.com` / `Password123!`
- Admin: `admin@voltgrid.example` / `Password123!`

## What's implemented

**Driver**: register/login, manage vehicles, browse stations (with operating
hours and reviews), book a connector or start a walk-in session, watch live
meter readings during a session, end a session, view/pay bills (with
subscription discount applied automatically), request refunds, subscribe to
a charging plan, and receive notifications on key events.

**Admin**: create and manage stations/chargers/connectors/tariffs/operating
hours, view bookings and revenue per station, open and resolve maintenance
tickets against technicians, approve or reject refund requests, and see a
full audit log of every admin action.

**Database-enforced concurrency control**: a PostgreSQL `EXCLUDE` constraint
rejects overlapping bookings on the same connector — not an
application-level check, so it holds up under concurrent requests.

See `docs/SCHEMA.md` for the full reasoning behind the schema, including
which entities were added in the MVP pass vs. afterward.
