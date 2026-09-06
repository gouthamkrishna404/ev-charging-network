"""Populate the database with sample data across every table.

Run after migrations are applied:
    venv\\Scripts\\python -m app.seed
"""

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
            db.add(AuditLog(
                admin_id=admin.id, action="Create", table_affected="charging_stations",
                record_id=station.id, description=f"Created station '{station.station_name}'",
            ))

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

        # MG Road enforces opening hours (closed Sundays); Koramangala stations stay unrestricted
        # (no rows = always open) -- demonstrates both branches of the operating-hours check.
        for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]:
            db.add(
                StationOperatingHours(
                    station_id=station_mg_road.id, day_of_week=day,
                    opening_time=time(6, 0), closing_time=time(22, 0),
                )
            )

        basic_plan = ChargingPlan(
            operator_id=operator.id, plan_name="Basic", subscription_fee=Decimal("199.00"), validity_days=30,
            discount_percentage=Decimal("5.00"), priority_booking=False, max_sessions=10,
        )
        premium_plan = ChargingPlan(
            operator_id=operator.id, plan_name="Premium", subscription_fee=Decimal("499.00"), validity_days=30,
            discount_percentage=Decimal("15.00"), priority_booking=True, max_sessions=None,
        )
        fleet_plan = ChargingPlan(
            operator_id=operator.id, plan_name="Fleet", subscription_fee=Decimal("1999.00"), validity_days=90,
            discount_percentage=Decimal("25.00"), priority_booking=True, max_sessions=None,
        )
        db.add_all([basic_plan, premium_plan, fleet_plan])
        db.flush()

        technician_electrical = Technician(
            operator_id=operator.id, name="Ravi Kumar", phone="9811111111", specialization="Electrical"
        )
        technician_network = Technician(
            operator_id=operator.id, name="Meena Iyer", phone="9822222222", specialization="Networking"
        )
        db.add_all([technician_electrical, technician_network])
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

        subscription = Subscription(
            user_id=demo_user.id, plan_id=premium_plan.id,
            start_date=date.today() - timedelta(days=10), end_date=date.today() + timedelta(days=20),
            status="active", auto_renew=True,
        )
        db.add(subscription)
        db.flush()
        db.add(
            Payment(
                subscription_id=subscription.id, amount=premium_plan.subscription_fee, payment_method="card",
                payment_status="successful", transaction_reference="SIM-SEEDSUB01",
            )
        )

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

        for minutes, energy, power in [(15, "4.600", 74), (30, "9.200", 73), (45, "13.800", 74), (60, "18.500", 70)]:
            db.add(
                MeterReading(
                    session_id=past_session.id, timestamp=past_start + timedelta(minutes=minutes),
                    energy_reading_kwh=Decimal(energy), power_output_kw=Decimal(power),
                    voltage=Decimal("400.0"), current=Decimal(str(round(power * 1000 / 400))),
                )
            )

        # No subscription was active yet when this session ran, so no discount applies.
        energy_charge = (past_session.energy_delivered_kwh * Decimal("12.50")).quantize(Decimal("0.01"))
        tax_amount = (energy_charge * Decimal("0.05")).quantize(Decimal("0.01"))
        past_bill = Bill(
            session_id=past_session.id, energy_charge=energy_charge, subscription_discount=Decimal("0.00"),
            tax_amount=tax_amount, total_amount=energy_charge + tax_amount,
        )
        db.add(past_bill)
        db.flush()

        past_payment = Payment(
            bill_id=past_bill.id, amount=past_bill.total_amount, payment_method="upi",
            payment_status="successful", transaction_reference="SIM-SEEDDATA01",
        )
        db.add(past_payment)
        db.flush()

        db.add(Refund(
            payment_id=past_payment.id, amount=Decimal("20.00"),
            reason="Charging stopped early due to a connector fault", status="pending",
        ))

        db.add(StationReview(
            user_id=demo_user.id, station_id=station_mg_road.id, rating=5,
            comment="Fast and reliable, plenty of parking nearby.", is_verified=True,
        ))

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

        # An open maintenance ticket, taking a connector at Koramangala Block B out of service.
        broken_connector = (
            db.query(Connector)
            .join(Charger)
            .filter(Charger.station_id == station_koramangala_b.id, Connector.connector_type_id == ccs2.id)
            .first()
        )
        broken_connector.status = "out_of_service"
        db.add(Maintenance(
            station_id=station_koramangala_b.id, connector_id=broken_connector.id,
            technician_id=technician_electrical.id, issue_description="Connector reports intermittent power loss",
            priority="high", scheduled_date=datetime.now(timezone.utc) + timedelta(days=1), status="open",
        ))

        db.add_all(
            [
                Notification(user_id=demo_user.id, message="Welcome to Volt Grid! Add a vehicle to get started.", type="System"),
                Notification(user_id=demo_user.id, message=f"Booking confirmed for connector #{fast_connector.id}", type="Booking", is_read=True),
                Notification(user_id=demo_user.id, message=f"Session #{past_session.id} ended — bill total ₹{past_bill.total_amount}", type="Payment", is_read=True),
            ]
        )

        db.commit()
        print("Seed data created.")
        print(f"  Driver login:  driver@example.com / {DEMO_PASSWORD}")
        print(f"  Admin login:   admin@voltgrid.example / {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
