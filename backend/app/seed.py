"""Populate the database with sample data across every MVP table.

Run after migrations are applied:
    venv\\Scripts\\python -m app.seed
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.auth import hash_password
from app.database import SessionLocal
from app.models import (
    Admin,
    Bill,
    Booking,
    Charger,
    ChargingOperator,
    ChargingSession,
    ChargingStation,
    Connector,
    ConnectorType,
    Location,
    ModelConnectorType,
    Payment,
    StationAdmin,
    Tariff,
    User,
    Vehicle,
    VehicleModel,
)

DEMO_PASSWORD = "Password123!"


def run():
    db = SessionLocal()
    try:
        operator = ChargingOperator(
            operator_name="Volt Grid Networks",
            contact_email="ops@voltgrid.example",
            phone="9800000001",
            status="active",
        )
        db.add(operator)
        db.flush()

        admin = Admin(
            operator_id=operator.id,
            name="Asha Rao",
            email="admin@voltgrid.example",
            password_hash=hash_password(DEMO_PASSWORD),
            role="super_admin",
            status="active",
        )
        db.add(admin)

        ccs2 = ConnectorType(type_name="CCS2", standard_max_power_kw=Decimal("150.00"))
        type2 = ConnectorType(type_name="Type 2", standard_max_power_kw=Decimal("22.00"))
        chademo = ConnectorType(type_name="CHAdeMO", standard_max_power_kw=Decimal("50.00"))
        db.add_all([ccs2, type2, chademo])
        db.flush()

        nexon = VehicleModel(make="Tata", model_name="Nexon EV", battery_capacity_kwh=Decimal("30.20"))
        ioniq5 = VehicleModel(make="Hyundai", model_name="Ioniq 5", battery_capacity_kwh=Decimal("72.60"))
        model3 = VehicleModel(make="Tesla", model_name="Model 3", battery_capacity_kwh=Decimal("60.00"))
        db.add_all([nexon, ioniq5, model3])
        db.flush()

        db.add_all(
            [
                ModelConnectorType(model_id=nexon.id, connector_type_id=ccs2.id),
                ModelConnectorType(model_id=nexon.id, connector_type_id=type2.id),
                ModelConnectorType(model_id=ioniq5.id, connector_type_id=ccs2.id),
                ModelConnectorType(model_id=model3.id, connector_type_id=ccs2.id),
                ModelConnectorType(model_id=model3.id, connector_type_id=type2.id),
            ]
        )

        location_mg_road = Location(
            address_line="100 MG Road", city="Bengaluru", state="Karnataka",
            latitude=Decimal("12.975700"), longitude=Decimal("77.605600"),
        )
        location_koramangala = Location(
            address_line="5th Block, Koramangala", city="Bengaluru", state="Karnataka",
            latitude=Decimal("12.935200"), longitude=Decimal("77.624500"),
        )
        db.add_all([location_mg_road, location_koramangala])
        db.flush()

        station_mg_road = ChargingStation(
            operator_id=operator.id, location_id=location_mg_road.id,
            station_name="Volt Grid - MG Road", status="active",
        )
        # Two stations sharing one physical location, e.g. separate blocks of the same mall.
        station_koramangala_a = ChargingStation(
            operator_id=operator.id, location_id=location_koramangala.id,
            station_name="Volt Grid - Koramangala Block A", status="active",
        )
        station_koramangala_b = ChargingStation(
            operator_id=operator.id, location_id=location_koramangala.id,
            station_name="Volt Grid - Koramangala Block B", status="active",
        )
        db.add_all([station_mg_road, station_koramangala_a, station_koramangala_b])
        db.flush()

        stations = [station_mg_road, station_koramangala_a, station_koramangala_b]
        for station in stations:
            db.add(Tariff(station_id=station.id, price_per_kwh=Decimal("12.50")))
            db.add(StationAdmin(station_id=station.id, admin_id=admin.id))

            charger_fast = Charger(
                station_id=station.id, charger_model="ABB Terra 184", power_capacity_kw=Decimal("180.00"),
                status="active",
            )
            charger_slow = Charger(
                station_id=station.id, charger_model="Delta AC Max", power_capacity_kw=Decimal("22.00"),
                status="active",
            )
            db.add_all([charger_fast, charger_slow])
            db.flush()

            db.add_all(
                [
                    Connector(charger_id=charger_fast.id, connector_type_id=ccs2.id, max_power_kw=Decimal("150.00")),
                    Connector(charger_id=charger_slow.id, connector_type_id=type2.id, max_power_kw=Decimal("22.00")),
                ]
            )
        db.flush()

        demo_user = User(
            name="Demo Driver",
            email="driver@example.com",
            password_hash=hash_password(DEMO_PASSWORD),
            phone="9900000002",
            address="221B Residency Road, Bengaluru",
            account_status="active",
        )
        db.add(demo_user)
        db.flush()

        demo_vehicle = Vehicle(
            user_id=demo_user.id, model_id=nexon.id, registration_number="KA01AB1234", vehicle_status="active",
        )
        db.add(demo_vehicle)
        db.flush()

        # A completed booking -> session -> bill -> payment, so history views aren't empty.
        past_start = datetime.now(timezone.utc) - timedelta(days=1, hours=2)
        past_end = past_start + timedelta(hours=1)
        fast_connector = (
            db.query(Connector)
            .join(Charger)
            .filter(Charger.station_id == station_mg_road.id, Connector.connector_type_id == ccs2.id)
            .first()
        )

        past_booking = Booking(
            user_id=demo_user.id, vehicle_id=demo_vehicle.id, connector_id=fast_connector.id,
            start_time=past_start, end_time=past_end, status="completed",
        )
        db.add(past_booking)
        db.flush()

        past_session = ChargingSession(
            booking_id=past_booking.id, connector_id=fast_connector.id, user_id=demo_user.id,
            vehicle_id=demo_vehicle.id, start_time=past_start, end_time=past_end,
            session_status="completed", energy_delivered_kwh=Decimal("18.500"),
        )
        db.add(past_session)
        db.flush()

        energy_charge = (past_session.energy_delivered_kwh * Decimal("12.50")).quantize(Decimal("0.01"))
        tax_amount = (energy_charge * Decimal("0.05")).quantize(Decimal("0.01"))
        past_bill = Bill(
            session_id=past_session.id, energy_charge=energy_charge, tax_amount=tax_amount,
            total_amount=energy_charge + tax_amount,
        )
        db.add(past_bill)
        db.flush()

        db.add(
            Payment(
                bill_id=past_bill.id, amount=past_bill.total_amount, payment_method="upi",
                payment_status="successful", transaction_reference="SIM-SEEDDATA01",
            )
        )

        # An upcoming confirmed booking on a different connector, to demo the booking list.
        slow_connector = (
            db.query(Connector)
            .join(Charger)
            .filter(Charger.station_id == station_koramangala_a.id, Connector.connector_type_id == type2.id)
            .first()
        )
        future_start = datetime.now(timezone.utc) + timedelta(days=1)
        db.add(
            Booking(
                user_id=demo_user.id, vehicle_id=demo_vehicle.id, connector_id=slow_connector.id,
                start_time=future_start, end_time=future_start + timedelta(hours=2), status="confirmed",
            )
        )

        db.commit()
        print("Seed data created.")
        print(f"  Driver login:  driver@example.com / {DEMO_PASSWORD}")
        print(f"  Admin login:   admin@voltgrid.example / {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
