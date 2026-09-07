"""Populate the database with a rich, realistic dataset across every table.

Generates two competing operators running 13 stations across 7 Indian cities,
~14 drivers with vehicles and subscriptions, and ~90 days of randomized (but
seeded, so reproducible) historical charging activity -- sessions, bills,
payments, refunds, reviews, and maintenance tickets -- on top of a couple of
deterministic "narrative" records used in the live demo walkthrough.

Run after migrations are applied:
    venv\\Scripts\\python -m app.seed
"""

import random
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from app.auth import hash_password
from app.database import SessionLocal
from app.models import (
    Admin,
    AuditLog,
    Bill,
    Booking,
    Charger,
    ChargingOperator,
    ChargingPlan,
    ChargingSession,
    ChargingStation,
    Connector,
    ConnectorType,
    Location,
    Maintenance,
    MeterReading,
    ModelConnectorType,
    Notification,
    Payment,
    Refund,
    StationAdmin,
    StationOperatingHours,
    StationReview,
    Subscription,
    Tariff,
    Technician,
    User,
    Vehicle,
    VehicleModel,
)

DEMO_PASSWORD = "Password123!"
TAX_RATE = Decimal("0.05")
ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

rng = random.Random(20260907)

CHARGER_TEMPLATES = {
    "fast_dc": {
        "charger_model": "ABB Terra 184",
        "power_capacity_kw": Decimal("180.00"),
        "connectors": [("CCS2", Decimal("150.00"))],
    },
    "fast_dc_dual": {
        "charger_model": "Exicom Harmony",
        "power_capacity_kw": Decimal("120.00"),
        "connectors": [("CCS2", Decimal("100.00")), ("CHAdeMO", Decimal("50.00"))],
    },
    "ac_slow": {
        "charger_model": "Delta AC Max",
        "power_capacity_kw": Decimal("22.00"),
        "connectors": [("Type 2", Decimal("22.00"))],
    },
    "ac_compact": {
        "charger_model": "Servotech AC001",
        "power_capacity_kw": Decimal("7.40"),
        "connectors": [("Type 1", Decimal("7.40"))],
    },
}

REVIEW_COMMENTS = {
    5: [
        "Fast and reliable, plenty of parking nearby.",
        "Never had to wait, connector was in great shape.",
        "Best charging stop on my commute -- consistently fast.",
        "Clean, well-lit, and the app made starting a session effortless.",
        "Staff on-site were helpful when I had a connector question.",
    ],
    4: [
        "Good experience overall, one connector was slower than rated.",
        "Solid station, a bit of a queue during evening rush.",
        "Reliable charging, wish there were more fast connectors.",
        "Worked well, parking was a little tight.",
    ],
    3: [
        "Charging was fine but the app took a while to recognize the session ended.",
        "Decent, though signage for the connectors could be clearer.",
        "Average wait time, got the job done.",
    ],
    2: [
        "One connector was out of service when I arrived.",
        "Charging speed was noticeably below the rated power.",
    ],
}

REFUND_REASONS = [
    "Charging stopped early due to a connector fault",
    "Billed for more energy than was actually delivered",
    "Session failed to start but was still charged",
    "Duplicate payment for the same session",
]

RTO_CODES = {
    "Bengaluru": "KA",
    "Pune": "MH",
    "Hyderabad": "TS",
    "Mumbai": "MH",
    "Delhi": "DL",
    "Gurugram": "HR",
    "Chennai": "TN",
}

DRIVER_NAMES = [
    "Demo Driver",
    "Rohan Sharma",
    "Priya Menon",
    "Arjun Nair",
    "Sneha Kulkarni",
    "Vikram Singh",
    "Ananya Reddy",
    "Karthik Subramaniam",
    "Isha Verma",
    "Aditya Joshi",
    "Neha Kapoor",
    "Rahul Desai",
    "Divya Pillai",
    "Manish Agarwal",
]

VEHICLE_MODEL_SPECS = [
    ("Tata", "Nexon EV", Decimal("30.20"), ["CCS2", "Type 2"]),
    ("Tata", "Punch EV", Decimal("25.00"), ["CCS2", "Type 2"]),
    ("MG", "Comet EV", Decimal("17.30"), ["Type 1", "Type 2"]),
    ("MG", "ZS EV", Decimal("50.30"), ["CCS2", "Type 2"]),
    ("Hyundai", "Ioniq 5", Decimal("72.60"), ["CCS2"]),
    ("Kia", "EV6", Decimal("77.40"), ["CCS2"]),
    ("Tesla", "Model 3", Decimal("60.00"), ["CCS2", "Type 2"]),
    ("Mahindra", "XUV400", Decimal("39.40"), ["CCS2", "Type 2"]),
    ("BYD", "Atto 3", Decimal("60.48"), ["CCS2", "CHAdeMO"]),
]

# (operator_key, station_name, address, city, state, lat, lng, price_per_kwh, hours_profile, charger_keys)
STATION_SPECS = [
    ("volt_grid", "Volt Grid - MG Road", "100 MG Road", "Bengaluru", "Karnataka", "12.975700", "77.605600",
     Decimal("12.50"), "standard_6_days", ["fast_dc", "fast_dc_dual", "ac_slow"]),
    ("volt_grid", "Volt Grid - Koramangala Block A", "5th Block, Koramangala", "Bengaluru", "Karnataka", "12.935200", "77.624500",
     Decimal("12.50"), "always_open", ["fast_dc", "ac_slow"]),
    ("volt_grid", "Volt Grid - Koramangala Block B", "5th Block, Koramangala", "Bengaluru", "Karnataka", "12.935200", "77.624500",
     Decimal("13.00"), "always_open", ["fast_dc", "ac_compact"]),
    ("volt_grid", "Volt Grid - Indiranagar", "100 Feet Road, Indiranagar", "Bengaluru", "Karnataka", "12.978400", "77.640800",
     Decimal("13.50"), "extended", ["ac_slow", "ac_compact"]),
    ("volt_grid", "Volt Grid - Kalyani Nagar", "Kalyani Nagar Main Road", "Pune", "Maharashtra", "18.547900", "73.901200",
     Decimal("11.80"), "standard_6_days", ["fast_dc", "ac_slow"]),
    ("volt_grid", "Volt Grid - Hitech City", "Hitech City Road", "Hyderabad", "Telangana", "17.443500", "78.377200",
     Decimal("11.50"), "always_open", ["fast_dc", "fast_dc_dual", "ac_slow", "ac_compact"]),
    ("chargenow", "ChargeNow - Whitefield", "ITPL Main Road, Whitefield", "Bengaluru", "Karnataka", "12.969800", "77.750000",
     Decimal("12.20"), "standard_6_days", ["fast_dc", "ac_slow"]),
    ("chargenow", "ChargeNow - Bandra Kurla Complex", "G Block, Bandra Kurla Complex", "Mumbai", "Maharashtra", "19.066000", "72.869700",
     Decimal("15.00"), "always_open", ["fast_dc", "fast_dc_dual", "ac_slow"]),
    ("chargenow", "ChargeNow - Powai", "Hiranandani Gardens, Powai", "Mumbai", "Maharashtra", "19.117600", "72.906000",
     Decimal("14.00"), "extended", ["ac_slow", "ac_compact"]),
    ("chargenow", "ChargeNow - Connaught Place", "Inner Circle, Connaught Place", "Delhi", "Delhi", "28.631500", "77.216700",
     Decimal("14.50"), "commercial", ["fast_dc", "ac_slow"]),
    ("chargenow", "ChargeNow - Cyber Hub", "DLF Cyber Hub", "Gurugram", "Haryana", "28.495000", "77.089000",
     Decimal("13.80"), "always_open", ["fast_dc", "fast_dc_dual", "ac_slow", "ac_compact"]),
    ("chargenow", "ChargeNow - OMR Sholinganallur", "Rajiv Gandhi Salai, Sholinganallur", "Chennai", "Tamil Nadu", "12.901000", "80.227900",
     Decimal("11.00"), "standard_6_days", ["fast_dc", "ac_slow"]),
    ("chargenow", "ChargeNow - Anna Nagar", "2nd Avenue, Anna Nagar", "Chennai", "Tamil Nadu", "13.085000", "80.210100",
     Decimal("11.20"), "always_open", ["ac_slow", "ac_compact"]),
    ("chargenow", "ChargeNow - T Nagar", "Usman Road, T Nagar", "Chennai", "Tamil Nadu", "13.041800", "80.234100",
     Decimal("11.50"), "commercial", ["fast_dc", "ac_slow"]),
    ("chargenow", "ChargeNow - Velachery", "Velachery Main Road", "Chennai", "Tamil Nadu", "12.979100", "80.221200",
     Decimal("10.80"), "standard_6_days", ["ac_slow", "ac_compact"]),
    ("volt_grid", "Volt Grid - Adyar", "Lattice Bridge Road, Adyar", "Chennai", "Tamil Nadu", "13.001200", "80.256500",
     Decimal("12.00"), "extended", ["fast_dc", "ac_slow"]),
    ("volt_grid", "Volt Grid - Nungambakkam", "Nungambakkam High Road", "Chennai", "Tamil Nadu", "13.056900", "80.242500",
     Decimal("12.80"), "always_open", ["fast_dc", "fast_dc_dual", "ac_slow"]),
]


def _plate(rng_: random.Random, city: str) -> str:
    code = RTO_CODES.get(city, "KA")
    return f"{code}{rng_.randint(1, 9):02d}{chr(65 + rng_.randint(0, 25))}{chr(65 + rng_.randint(0, 25))}{rng_.randint(1000, 9999)}"


# A flat 6am-10pm draw makes every hour of the day look equally busy, which no real
# charging network does -- weight toward the two commute windows (dropping the car off
# on the way to work, topping up on the way home) so usage charts read like a real one.
_PEAK_HOURS = list(range(6, 23))
_PEAK_WEIGHTS = [3.0 if (8 <= h <= 10 or 18 <= h <= 20) else 1.5 if 11 <= h <= 17 else 0.7 for h in _PEAK_HOURS]


def _peak_hour(rng_: random.Random) -> int:
    return rng_.choices(_PEAK_HOURS, weights=_PEAK_WEIGHTS)[0]


def _add_station(db, operator, location, name, price_per_kwh, hours_profile, charger_keys, admins, connector_types, log_admin, created_at):
    station = ChargingStation(operator_id=operator.id, location_id=location.id, station_name=name, status="active")
    db.add(station)
    db.flush()

    db.add(Tariff(station_id=station.id, price_per_kwh=price_per_kwh))
    db.add(AuditLog(
        admin_id=log_admin.id, action="Create", table_affected="charging_stations",
        record_id=station.id, description=f"Created station '{name}'", timestamp=created_at,
    ))
    for admin in admins:
        db.add(StationAdmin(station_id=station.id, admin_id=admin.id))
        db.add(AuditLog(
            admin_id=log_admin.id, action="Assign", table_affected="station_admins",
            record_id=station.id, description=f"Assigned {admin.name} to manage '{name}'",
            timestamp=created_at + timedelta(minutes=5),
        ))

    if hours_profile == "standard_6_days":
        for day in ALL_DAYS[:6]:
            db.add(StationOperatingHours(station_id=station.id, day_of_week=day, opening_time=time(6, 0), closing_time=time(22, 0)))
    elif hours_profile == "commercial":
        for day in ALL_DAYS:
            db.add(StationOperatingHours(station_id=station.id, day_of_week=day, opening_time=time(9, 0), closing_time=time(21, 0)))
    elif hours_profile == "extended":
        for day in ALL_DAYS:
            db.add(StationOperatingHours(station_id=station.id, day_of_week=day, opening_time=time(6, 0), closing_time=time(23, 0)))
    # "always_open" -> no rows at all (station treated as always open)

    created_connectors = []
    for key in charger_keys:
        tmpl = CHARGER_TEMPLATES[key]
        charger = Charger(
            station_id=station.id, charger_model=tmpl["charger_model"],
            power_capacity_kw=tmpl["power_capacity_kw"], status="active",
        )
        db.add(charger)
        db.flush()
        for type_name, max_power in tmpl["connectors"]:
            connector = Connector(
                charger_id=charger.id, connector_type_id=connector_types[type_name].id, max_power_kw=max_power,
            )
            db.add(connector)
            db.flush()
            created_connectors.append({
                "connector": connector, "type_name": type_name,
                "station": station, "operator": operator, "price_per_kwh": price_per_kwh,
            })
    return station, created_connectors


def run():
    db = SessionLocal()
    try:
        # ---------- Connector types ----------
        connector_types = {
            "CCS2": ConnectorType(type_name="CCS2", standard_max_power_kw=Decimal("150.00")),
            "Type 2": ConnectorType(type_name="Type 2", standard_max_power_kw=Decimal("22.00")),
            "CHAdeMO": ConnectorType(type_name="CHAdeMO", standard_max_power_kw=Decimal("50.00")),
            "Type 1": ConnectorType(type_name="Type 1", standard_max_power_kw=Decimal("7.40")),
        }
        db.add_all(connector_types.values())
        db.flush()

        # ---------- Vehicle models + connector compatibility ----------
        models = {}
        model_supported_types: dict[int, set[str]] = {}
        for make, model_name, battery, supported in VEHICLE_MODEL_SPECS:
            model = VehicleModel(make=make, model_name=model_name, battery_capacity_kwh=battery)
            db.add(model)
            db.flush()
            models[(make, model_name)] = model
            model_supported_types[model.id] = set(supported)
            for type_name in supported:
                db.add(ModelConnectorType(model_id=model.id, connector_type_id=connector_types[type_name].id))
        db.flush()

        # ---------- Operators, admins, technicians, plans ----------
        volt_grid = ChargingOperator(operator_name="Volt Grid Networks", contact_email="ops@voltgrid.example", phone="9800000001", status="active")
        chargenow = ChargingOperator(operator_name="ChargeNow India", contact_email="ops@chargenow.example", phone="9800000002", status="active")
        db.add_all([volt_grid, chargenow])
        db.flush()
        operators = {"volt_grid": volt_grid, "chargenow": chargenow}

        admin_asha = Admin(operator_id=volt_grid.id, name="Asha Rao", email="admin@voltgrid.example",
                            password_hash=hash_password(DEMO_PASSWORD), role="super_admin", status="active")
        admin_karan = Admin(operator_id=volt_grid.id, name="Karan Mehta", email="karan.mehta@voltgrid.example",
                             password_hash=hash_password(DEMO_PASSWORD), role="station_manager", status="active")
        admin_divya = Admin(operator_id=chargenow.id, name="Divya Nair", email="admin@chargenow.example",
                             password_hash=hash_password(DEMO_PASSWORD), role="super_admin", status="active")
        admin_farah = Admin(operator_id=chargenow.id, name="Farah Khan", email="farah.khan@chargenow.example",
                             password_hash=hash_password(DEMO_PASSWORD), role="finance_manager", status="active")
        db.add_all([admin_asha, admin_karan, admin_divya, admin_farah])
        db.flush()

        technicians = {
            "volt_grid": [
                Technician(operator_id=volt_grid.id, name="Ravi Kumar", phone="9811111111", specialization="Electrical"),
                Technician(operator_id=volt_grid.id, name="Meena Iyer", phone="9822222222", specialization="Networking"),
            ],
            "chargenow": [
                Technician(operator_id=chargenow.id, name="Suresh Pillai", phone="9833333333", specialization="Mechanical"),
                Technician(operator_id=chargenow.id, name="Fatima Sheikh", phone="9844444444", specialization="Electrical"),
            ],
        }
        for group in technicians.values():
            db.add_all(group)
        db.flush()

        plans = {
            "volt_grid": [
                ChargingPlan(operator_id=volt_grid.id, plan_name="Basic", subscription_fee=Decimal("199.00"), validity_days=30,
                             discount_percentage=Decimal("5.00"), priority_booking=False, max_sessions=10),
                ChargingPlan(operator_id=volt_grid.id, plan_name="Premium", subscription_fee=Decimal("499.00"), validity_days=30,
                             discount_percentage=Decimal("15.00"), priority_booking=True, max_sessions=None),
                ChargingPlan(operator_id=volt_grid.id, plan_name="Fleet", subscription_fee=Decimal("1999.00"), validity_days=90,
                             discount_percentage=Decimal("25.00"), priority_booking=True, max_sessions=None),
            ],
            "chargenow": [
                ChargingPlan(operator_id=chargenow.id, plan_name="Lite", subscription_fee=Decimal("149.00"), validity_days=30,
                             discount_percentage=Decimal("8.00"), priority_booking=False, max_sessions=8),
                ChargingPlan(operator_id=chargenow.id, plan_name="Standard", subscription_fee=Decimal("449.00"), validity_days=30,
                             discount_percentage=Decimal("18.00"), priority_booking=True, max_sessions=None),
                ChargingPlan(operator_id=chargenow.id, plan_name="Pro Fleet", subscription_fee=Decimal("2199.00"), validity_days=90,
                             discount_percentage=Decimal("28.00"), priority_booking=True, max_sessions=None),
            ],
        }
        for group in plans.values():
            db.add_all(group)
        db.flush()

        # ---------- Locations + stations ----------
        location_cache: dict[tuple[str, str], Location] = {}
        all_connectors = []
        admin_by_operator = {"volt_grid": [admin_asha, admin_karan], "chargenow": [admin_divya, admin_farah]}
        log_admin_by_operator = {"volt_grid": admin_asha, "chargenow": admin_divya}
        stations_by_name = {}
        seed_now = datetime.now(timezone.utc)

        # Stagger "station creation" further back in the past for operators with more
        # stations, so the audit log reads like a network that grew over months rather
        # than a single burst of identical timestamps.
        per_operator_index: dict[str, int] = {}
        for operator_key, name, address, city, state, lat, lng, price, hours_profile, charger_keys in STATION_SPECS:
            loc_key = (city, lat)
            if loc_key not in location_cache:
                location_cache[loc_key] = Location(
                    address_line=address, city=city, state=state,
                    latitude=Decimal(lat), longitude=Decimal(lng),
                )
                db.add(location_cache[loc_key])
                db.flush()
            operator = operators[operator_key]
            # Only the station's *own* super admin plus one station manager get assigned, mirroring real access control.
            admins = [a for a in admin_by_operator[operator_key] if a.role in ("super_admin", "station_manager")][:2]
            idx = per_operator_index.get(operator_key, 0)
            per_operator_index[operator_key] = idx + 1
            created_at = seed_now - timedelta(days=180 - idx * 18, hours=rng.uniform(0, 20))
            station, connectors = _add_station(
                db, operator, location_cache[loc_key], name, price, hours_profile, charger_keys,
                admins, connector_types, log_admin_by_operator[operator_key], created_at,
            )
            stations_by_name[name] = station
            all_connectors.extend(connectors)
        db.flush()
        admin_by_operator_id = {operators["volt_grid"].id: admin_asha, operators["chargenow"].id: admin_divya}

        # ---------- Drivers + vehicles ----------
        model_list = list(models.values())
        users = []
        vehicles_by_user = {}
        vehicle_owners_by_type: dict[str, list[tuple]] = {t: [] for t in connector_types}

        for i, name in enumerate(DRIVER_NAMES):
            email = "driver@example.com" if name == "Demo Driver" else f"{name.lower().replace(' ', '.')}@example.com"
            city = rng.choice(list(RTO_CODES.keys()))
            user = User(
                name=name, email=email, password_hash=hash_password(DEMO_PASSWORD),
                phone=f"98{rng.randint(10000000, 99999999)}", address=f"{rng.randint(1, 999)} {city} Main Road",
                account_status="active",
            )
            db.add(user)
            db.flush()
            users.append(user)

            # Cycle primary model assignment to guarantee every connector type has at least one compatible owner.
            primary_model = model_list[i % len(model_list)]
            reg = _plate(rng, city)
            vehicle = Vehicle(user_id=user.id, model_id=primary_model.id, registration_number=reg, vehicle_status="active")
            db.add(vehicle)
            db.flush()
            vehicles_by_user.setdefault(user.id, []).append(vehicle)
            for type_name in model_supported_types[primary_model.id]:
                vehicle_owners_by_type[type_name].append((user, vehicle))

            if rng.random() < 0.3:
                extra_model = rng.choice(model_list)
                extra_vehicle = Vehicle(
                    user_id=user.id, model_id=extra_model.id,
                    registration_number=_plate(rng, city), vehicle_status="active",
                )
                db.add(extra_vehicle)
                db.flush()
                vehicles_by_user[user.id].append(extra_vehicle)
                for type_name in model_supported_types[extra_model.id]:
                    vehicle_owners_by_type[type_name].append((user, extra_vehicle))
        db.flush()
        demo_user = next(u for u in users if u.email == "driver@example.com")
        demo_vehicle = vehicles_by_user[demo_user.id][0]

        # ---------- Subscriptions ----------
        # A subscription's discount is sitewide (applies at any operator's stations), so
        # each user carries at most one -- keyed by user_id only, not (user_id, operator_id).
        subs_index: dict[int, list[tuple]] = {}
        all_plans = plans["volt_grid"] + plans["chargenow"]
        today = date.today()

        def _create_subscription(user, plan, start_date, force_status=None):
            end_date = start_date + timedelta(days=plan.validity_days)
            status = force_status or ("active" if end_date >= today else "expired")
            sub = Subscription(user_id=user.id, plan_id=plan.id, start_date=start_date, end_date=end_date,
                                status=status, auto_renew=rng.random() < 0.5)
            db.add(sub)
            db.flush()
            db.add(Payment(
                subscription_id=sub.id, amount=plan.subscription_fee,
                payment_date=datetime.combine(start_date, time(10, 0), tzinfo=timezone.utc),
                payment_method=rng.choice(["card", "upi", "wallet", "net_banking"]),
                payment_status="successful", transaction_reference=f"SIM-SUB{sub.id:05d}",
            ))
            subs_index.setdefault(user.id, []).append((start_date, end_date, plan.discount_percentage))
            return sub

        # Demo Driver keeps the specific Premium subscription used in the walkthrough narrative.
        _create_subscription(demo_user, plans["volt_grid"][1], today - timedelta(days=10), force_status="active")

        other_users = [u for u in users if u.id != demo_user.id]
        for user in rng.sample(other_users, 7):
            plan = rng.choice(all_plans)
            start_date = today - timedelta(days=rng.randint(5, 85))
            status_override = "cancelled" if rng.random() < 0.15 else None
            _create_subscription(user, plan, start_date, force_status=status_override)
        db.flush()

        def _active_discount(user_id: int, on_date: date) -> Decimal | None:
            for start_date, end_date, discount in subs_index.get(user_id, []):
                if start_date <= on_date <= end_date:
                    return discount
            return None

        # ---------- Bulk historical sessions, bills, payments, refunds ----------
        now = datetime.now(timezone.utc)
        session_count = 0
        completed_sessions_by_station: dict[int, list] = {}

        for info in all_connectors:
            connector = info["connector"]
            type_name = info["type_name"]
            candidates = vehicle_owners_by_type.get(type_name) or []
            if not candidates:
                continue

            for _ in range(rng.randint(8, 22)):
                user, vehicle = rng.choice(candidates)
                days_ago = rng.uniform(1, 89)
                start_time = (now - timedelta(days=days_ago)).replace(
                    hour=_peak_hour(rng), minute=rng.choice([0, 15, 30, 45]), second=0, microsecond=0
                )
                power = connector.max_power_kw
                if power >= Decimal("100"):
                    duration_minutes = rng.randint(15, 45)
                elif power >= Decimal("20"):
                    duration_minutes = rng.randint(30, 60)
                else:
                    duration_minutes = rng.randint(45, 150)
                end_time = start_time + timedelta(minutes=duration_minutes)
                full_energy = (power * Decimal(duration_minutes) / Decimal(60)).quantize(Decimal("0.001"))

                status_roll = rng.random()
                session_status = "completed" if status_roll < 0.93 else "interrupted" if status_roll < 0.98 else "failed"
                energy = full_energy if session_status == "completed" else (full_energy * Decimal("0.55")).quantize(Decimal("0.001")) if session_status == "interrupted" else None

                booking = None
                if session_status != "failed" and rng.random() < 0.55:
                    booking = Booking(
                        user_id=user.id, vehicle_id=vehicle.id, connector_id=connector.id,
                        start_time=start_time, end_time=end_time, status="completed",
                    )
                    db.add(booking)
                    db.flush()

                session = ChargingSession(
                    booking_id=booking.id if booking else None, connector_id=connector.id,
                    user_id=user.id, vehicle_id=vehicle.id, start_time=start_time,
                    end_time=end_time if session_status != "failed" else None,
                    session_status=session_status, energy_delivered_kwh=energy,
                )
                db.add(session)
                db.flush()
                session_count += 1

                if session_status == "failed":
                    continue

                completed_sessions_by_station.setdefault(info["station"].id, []).append(session)

                mid_time = start_time + timedelta(minutes=duration_minutes // 2)
                db.add(MeterReading(
                    session_id=session.id, timestamp=mid_time, energy_reading_kwh=(energy / 2).quantize(Decimal("0.001")),
                    power_output_kw=power, voltage=Decimal("400.0"), current=(power * 1000 / 400).quantize(Decimal("0.1")),
                ))
                db.add(MeterReading(
                    session_id=session.id, timestamp=end_time, energy_reading_kwh=energy,
                    power_output_kw=power, voltage=Decimal("400.0"), current=(power * 1000 / 400).quantize(Decimal("0.1")),
                ))

                energy_charge = (energy * info["price_per_kwh"]).quantize(Decimal("0.01"))
                discount_pct = _active_discount(user.id, start_time.date())
                discount = (energy_charge * discount_pct / 100).quantize(Decimal("0.01")) if discount_pct else Decimal("0.00")
                taxable = energy_charge - discount
                tax = (taxable * TAX_RATE).quantize(Decimal("0.01"))
                total = taxable + tax

                bill = Bill(
                    session_id=session.id, energy_charge=energy_charge, subscription_discount=discount,
                    tax_amount=tax, total_amount=total, generated_date=end_time,
                )
                db.add(bill)
                db.flush()

                payment_roll = rng.random()
                payment_status = "successful" if payment_roll < 0.90 else "pending" if payment_roll < 0.97 else "failed"
                payment = Payment(
                    bill_id=bill.id, amount=total, payment_date=end_time,
                    payment_method=rng.choice(["card", "upi", "wallet", "net_banking"]),
                    payment_status=payment_status, transaction_reference=f"SIM-{session.id:06d}",
                )
                db.add(payment)
                db.flush()

                if payment_status == "successful" and rng.random() < 0.06:
                    refund_status = rng.choice(["pending", "approved", "rejected"])
                    requested_at = end_time + timedelta(hours=rng.uniform(1, 48))
                    refund = Refund(
                        payment_id=payment.id, amount=(total * Decimal("0.2")).quantize(Decimal("0.01")),
                        reason=rng.choice(REFUND_REASONS), status=refund_status, refund_date=requested_at,
                    )
                    db.add(refund)
                    if refund_status == "approved":
                        payment.payment_status = "refunded"
                    if refund_status in ("approved", "rejected"):
                        db.flush()
                        resolving_admin = admin_by_operator_id.get(info["operator"].id)
                        if resolving_admin:
                            db.add(AuditLog(
                                admin_id=resolving_admin.id,
                                action="Approve" if refund_status == "approved" else "Reject",
                                table_affected="refunds", record_id=refund.id,
                                description=f"{refund_status.capitalize()} refund of ₹{refund.amount} for {info['station'].station_name}",
                                timestamp=requested_at + timedelta(hours=rng.uniform(1, 30)),
                            ))
        db.flush()

        # ---------- Reviews ----------
        for station in stations_by_name.values():
            reviewers = completed_sessions_by_station.get(station.id, [])
            reviewer_users = list({s.user_id: s.user for s in reviewers}.values()) if reviewers else []
            reviewed_already = set()
            for _ in range(rng.randint(3, 7)):
                if reviewer_users and rng.random() < 0.8:
                    user = rng.choice(reviewer_users)
                    verified = True
                else:
                    user = rng.choice(users)
                    verified = False
                if user.id in reviewed_already:
                    continue
                reviewed_already.add(user.id)
                rating = rng.choices([5, 4, 3, 2], weights=[45, 35, 15, 5])[0]
                comment = rng.choice(REVIEW_COMMENTS[rating]) if rng.random() < 0.85 else None
                db.add(StationReview(
                    user_id=user.id, station_id=station.id, rating=rating, comment=comment,
                    review_date=now - timedelta(days=rng.uniform(0, 80)), is_verified=verified,
                ))
        db.flush()

        # Keep the original, specific 5-star review used in the walkthrough narrative.
        mg_road = stations_by_name["Volt Grid - MG Road"]
        if not db.query(StationReview).filter_by(user_id=demo_user.id, station_id=mg_road.id).first():
            db.add(StationReview(
                user_id=demo_user.id, station_id=mg_road.id, rating=5,
                comment="Fast and reliable, plenty of parking nearby.", is_verified=True,
            ))

        # ---------- Maintenance tickets ----------
        for operator_key, station_names in [
            ("volt_grid", [n for n in stations_by_name if n.startswith("Volt Grid")]),
            ("chargenow", [n for n in stations_by_name if n.startswith("ChargeNow")]),
        ]:
            techs = technicians[operator_key]
            for _ in range(rng.randint(5, 8)):
                station_name = rng.choice(station_names)
                station = stations_by_name[station_name]
                connectors = [c for c in all_connectors if c["station"].id == station.id]
                if not connectors:
                    continue
                connector = rng.choice(connectors)["connector"]
                status_choice = rng.choices(["open", "in_progress", "completed", "cancelled"], weights=[30, 15, 45, 10])[0]
                scheduled = (
                    now - timedelta(days=rng.uniform(1, 60))
                    if status_choice in ("completed", "cancelled")
                    else now - timedelta(days=rng.uniform(-5, 10))
                )
                ticket = Maintenance(
                    station_id=station.id, connector_id=connector.id, technician_id=rng.choice(techs).id,
                    issue_description=rng.choice([
                        "Connector reports intermittent power loss",
                        "Display panel unresponsive",
                        "Cable latch is loose",
                        "Scheduled firmware update",
                        "Reported overheating during fast charge",
                    ]),
                    priority=rng.choices(["low", "medium", "high", "critical"], weights=[20, 45, 25, 10])[0],
                    scheduled_date=scheduled, status=status_choice,
                    completed_date=scheduled + timedelta(hours=rng.randint(2, 48)) if status_choice == "completed" else None,
                )
                db.add(ticket)
                if status_choice in ("open", "in_progress"):
                    connector.status = "out_of_service"
        db.flush()

        # ---------- Demo-user narrative extras (booking overlap demo, notifications) ----------
        future_start = now + timedelta(days=1)
        koramangala_a = stations_by_name["Volt Grid - Koramangala Block A"]
        slow_connector = next(c["connector"] for c in all_connectors if c["station"].id == koramangala_a.id and c["type_name"] == "Type 2")
        db.add(Booking(
            user_id=demo_user.id, vehicle_id=demo_vehicle.id, connector_id=slow_connector.id,
            start_time=future_start, end_time=future_start + timedelta(hours=2), status="confirmed",
        ))

        notifications = [
            Notification(
                user_id=demo_user.id, message="Welcome to Volt Grid! Add a vehicle to get started.",
                type="System", sent_date=now - timedelta(days=88), is_read=True,
            ),
            Notification(
                user_id=demo_user.id, message="Your Premium subscription is now active -- 15% off at every station on the network.",
                type="Promotion", sent_date=now - timedelta(days=10), is_read=True,
            ),
            Notification(
                user_id=demo_user.id, message=f"Booking confirmed at {koramangala_a.station_name} for tomorrow.",
                type="Booking", sent_date=now, is_read=False,
            ),
        ]

        # Derive the rest from the demo user's own recent activity so the bell reflects
        # real bills/refunds instead of a few disconnected canned lines.
        demo_bills = (
            db.query(Bill)
            .join(ChargingSession, Bill.session_id == ChargingSession.id)
            .filter(ChargingSession.user_id == demo_user.id)
            .order_by(Bill.generated_date.desc())
            .limit(6)
            .all()
        )
        for bill in demo_bills:
            payment = bill.payment
            if payment is None:
                continue
            recent = payment.payment_date >= now - timedelta(days=5)
            if payment.payment_status in ("successful", "refunded"):
                notifications.append(Notification(
                    user_id=demo_user.id,
                    message=f"Payment of ₹{bill.total_amount} received for your session at {bill.station_name}.",
                    type="Payment", sent_date=payment.payment_date, is_read=not recent,
                ))
            elif payment.payment_status == "failed":
                notifications.append(Notification(
                    user_id=demo_user.id,
                    message=f"Payment of ₹{bill.total_amount} failed for your session at {bill.station_name} -- please retry.",
                    type="Payment", sent_date=payment.payment_date, is_read=not recent,
                ))
            if payment.refund is not None:
                refund = payment.refund
                if refund.status == "approved":
                    notifications.append(Notification(
                        user_id=demo_user.id, message=f"Your refund of ₹{refund.amount} was approved and is on its way.",
                        type="Payment", sent_date=refund.refund_date, is_read=refund.refund_date < now - timedelta(days=5),
                    ))
                elif refund.status == "pending":
                    notifications.append(Notification(
                        user_id=demo_user.id, message=f"Refund request for ₹{refund.amount} is under review.",
                        type="Payment", sent_date=refund.refund_date, is_read=False,
                    ))

        db.add_all(notifications)

        db.commit()
        print("Seed data created.")
        print(f"  Stations: {len(stations_by_name)} across {len(RTO_CODES)} cities, 2 operators")
        print(f"  Drivers: {len(users)}, historical sessions: {session_count}")
        print(f"  Driver login:  driver@example.com / {DEMO_PASSWORD}")
        print(f"  Admin login:   admin@voltgrid.example / {DEMO_PASSWORD}  (Volt Grid Networks)")
        print(f"  Admin login:   admin@chargenow.example / {DEMO_PASSWORD}  (ChargeNow India)")
    finally:
        db.close()


if __name__ == "__main__":
    run()
