from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(15))
    address = Column(String(255))
    registration_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    account_status = Column(String(20), nullable=False, server_default="active")

    __table_args__ = (
        CheckConstraint("account_status IN ('active','suspended','closed')", name="ck_users_account_status"),
    )

    vehicles = relationship("Vehicle", back_populates="user")
    bookings = relationship("Booking", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    reviews = relationship("StationReview", back_populates="user")


class ChargingOperator(Base):
    __tablename__ = "charging_operators"

    id = Column(Integer, primary_key=True)
    operator_name = Column(String(100), nullable=False)
    contact_email = Column(String(100), nullable=False, unique=True)
    phone = Column(String(15))
    status = Column(String(20), nullable=False, server_default="active")

    __table_args__ = (
        CheckConstraint("status IN ('active','suspended','closed')", name="ck_operators_status"),
    )

    stations = relationship("ChargingStation", back_populates="operator")
    admins = relationship("Admin", back_populates="operator")
    technicians = relationship("Technician", back_populates="operator")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True)
    operator_id = Column(Integer, ForeignKey("charging_operators.id"), nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, server_default="station_manager")
    status = Column(String(20), nullable=False, server_default="active")

    __table_args__ = (
        CheckConstraint("role IN ('super_admin','station_manager','finance_manager')", name="ck_admins_role"),
        CheckConstraint("status IN ('active','suspended')", name="ck_admins_status"),
    )

    operator = relationship("ChargingOperator", back_populates="admins")
    stations = relationship("StationAdmin", back_populates="admin")
    audit_logs = relationship("AuditLog", back_populates="admin")


class VehicleModel(Base):
    __tablename__ = "vehicle_models"

    id = Column(Integer, primary_key=True)
    make = Column(String(50), nullable=False)
    model_name = Column(String(50), nullable=False)
    battery_capacity_kwh = Column(Numeric(6, 2), nullable=False)

    __table_args__ = (UniqueConstraint("make", "model_name", name="uq_vehicle_models_make_model"),)

    vehicles = relationship("Vehicle", back_populates="model")
    connector_types = relationship("ModelConnectorType", back_populates="model")


class ConnectorType(Base):
    __tablename__ = "connector_types"

    id = Column(Integer, primary_key=True)
    type_name = Column(String(30), nullable=False, unique=True)
    standard_max_power_kw = Column(Numeric(6, 2), nullable=False)

    connectors = relationship("Connector", back_populates="connector_type")
    vehicle_models = relationship("ModelConnectorType", back_populates="connector_type")


class ModelConnectorType(Base):
    __tablename__ = "model_connector_types"

    model_id = Column(Integer, ForeignKey("vehicle_models.id"), primary_key=True)
    connector_type_id = Column(Integer, ForeignKey("connector_types.id"), primary_key=True)

    model = relationship("VehicleModel", back_populates="connector_types")
    connector_type = relationship("ConnectorType", back_populates="vehicle_models")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    model_id = Column(Integer, ForeignKey("vehicle_models.id"), nullable=False)
    registration_number = Column(String(20), nullable=False, unique=True)
    vehicle_status = Column(String(20), nullable=False, server_default="active")

    __table_args__ = (
        CheckConstraint("vehicle_status IN ('active','inactive')", name="ck_vehicles_status"),
    )

    user = relationship("User", back_populates="vehicles")
    model = relationship("VehicleModel", back_populates="vehicles")
    bookings = relationship("Booking", back_populates="vehicle")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True)
    address_line = Column(String(255), nullable=False)
    city = Column(String(50), nullable=False)
    state = Column(String(50), nullable=False)
    latitude = Column(Numeric(9, 6))
    longitude = Column(Numeric(9, 6))

    stations = relationship("ChargingStation", back_populates="location")


class ChargingStation(Base):
    __tablename__ = "charging_stations"

    id = Column(Integer, primary_key=True)
    operator_id = Column(Integer, ForeignKey("charging_operators.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    station_name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, server_default="active")

    __table_args__ = (
        CheckConstraint("status IN ('active','inactive','under_maintenance')", name="ck_stations_status"),
    )

    operator = relationship("ChargingOperator", back_populates="stations")
    location = relationship("Location", back_populates="stations")
    chargers = relationship("Charger", back_populates="station")
    admins = relationship("StationAdmin", back_populates="station")
    tariff = relationship("Tariff", back_populates="station", uselist=False)
    operating_hours = relationship(
        "StationOperatingHours", back_populates="station", order_by="StationOperatingHours.id"
    )
    reviews = relationship("StationReview", back_populates="station")
    maintenance_tickets = relationship("Maintenance", back_populates="station")


class StationAdmin(Base):
    __tablename__ = "station_admins"

    station_id = Column(Integer, ForeignKey("charging_stations.id"), primary_key=True)
    admin_id = Column(Integer, ForeignKey("admins.id"), primary_key=True)

    station = relationship("ChargingStation", back_populates="admins")
    admin = relationship("Admin", back_populates="stations")


class Charger(Base):
    __tablename__ = "chargers"

    id = Column(Integer, primary_key=True)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    charger_model = Column(String(50))
    power_capacity_kw = Column(Numeric(6, 2), nullable=False)
    status = Column(String(20), nullable=False, server_default="active")

    __table_args__ = (
        CheckConstraint("status IN ('active','inactive','under_maintenance')", name="ck_chargers_status"),
    )

    station = relationship("ChargingStation", back_populates="chargers")
    connectors = relationship("Connector", back_populates="charger")


class Connector(Base):
    __tablename__ = "connectors"

    id = Column(Integer, primary_key=True)
    charger_id = Column(Integer, ForeignKey("chargers.id"), nullable=False)
    connector_type_id = Column(Integer, ForeignKey("connector_types.id"), nullable=False)
    max_power_kw = Column(Numeric(6, 2), nullable=False)
    status = Column(String(20), nullable=False, server_default="available")

    __table_args__ = (
        CheckConstraint(
            "status IN ('available','occupied','reserved','out_of_service')", name="ck_connectors_status"
        ),
    )

    charger = relationship("Charger", back_populates="connectors")
    connector_type = relationship("ConnectorType", back_populates="connectors")
    bookings = relationship("Booking", back_populates="connector")
    maintenance_tickets = relationship("Maintenance", back_populates="connector")


class Tariff(Base):
    __tablename__ = "tariffs"

    id = Column(Integer, primary_key=True)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False, unique=True)
    price_per_kwh = Column(Numeric(6, 2), nullable=False)

    station = relationship("ChargingStation", back_populates="tariff")


class StationOperatingHours(Base):
    __tablename__ = "station_operating_hours"

    id = Column(Integer, primary_key=True)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    day_of_week = Column(String(10), nullable=False)
    opening_time = Column(Time, nullable=False)
    closing_time = Column(Time, nullable=False)

    __table_args__ = (
        UniqueConstraint("station_id", "day_of_week", name="uq_operating_hours_station_day"),
        CheckConstraint(
            "day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')",
            name="ck_operating_hours_day",
        ),
        CheckConstraint("closing_time > opening_time", name="ck_operating_hours_time_order"),
    )

    station = relationship("ChargingStation", back_populates="operating_hours")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    connector_id = Column(Integer, ForeignKey("connectors.id"), nullable=False)
    booking_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), nullable=False, server_default="confirmed")
    cancellation_reason = Column(String(255))

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_bookings_time_order"),
        CheckConstraint(
            "status IN ('confirmed','cancelled','completed','no_show')", name="ck_bookings_status"
        ),
        ExcludeConstraint(
            (Column("connector_id"), "="),
            (func.tstzrange(Column("start_time"), Column("end_time")), "&&"),
            where="status = 'confirmed'",
            using="gist",
            name="ex_bookings_no_overlap",
        ),
    )

    user = relationship("User", back_populates="bookings")
    vehicle = relationship("Vehicle", back_populates="bookings")
    connector = relationship("Connector", back_populates="bookings")
    session = relationship("ChargingSession", back_populates="booking", uselist=False)


class ChargingSession(Base):
    __tablename__ = "charging_sessions"

    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True, unique=True)
    connector_id = Column(Integer, ForeignKey("connectors.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    end_time = Column(DateTime(timezone=True))
    session_status = Column(String(20), nullable=False, server_default="initiated")
    energy_delivered_kwh = Column(Numeric(8, 3))

    __table_args__ = (
        CheckConstraint(
            "session_status IN ('initiated','charging','completed','interrupted','failed')",
            name="ck_sessions_status",
        ),
    )

    booking = relationship("Booking", back_populates="session")
    connector = relationship("Connector")
    user = relationship("User")
    vehicle = relationship("Vehicle")
    bill = relationship("Bill", back_populates="session", uselist=False)
    meter_readings = relationship(
        "MeterReading", back_populates="session", order_by="MeterReading.timestamp"
    )


class MeterReading(Base):
    __tablename__ = "meter_readings"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("charging_sessions.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    energy_reading_kwh = Column(Numeric(10, 3), nullable=False)
    power_output_kw = Column(Numeric(6, 2))
    voltage = Column(Numeric(6, 2))
    current = Column(Numeric(6, 2))

    session = relationship("ChargingSession", back_populates="meter_readings")


class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("charging_sessions.id"), nullable=False, unique=True)
    energy_charge = Column(Numeric(10, 2), nullable=False)
    subscription_discount = Column(Numeric(8, 2), nullable=False, server_default="0")
    tax_amount = Column(Numeric(8, 2), nullable=False, server_default="0")
    total_amount = Column(Numeric(10, 2), nullable=False)
    generated_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    session = relationship("ChargingSession", back_populates="bill")
    payment = relationship("Payment", back_populates="bill", uselist=False)


class ChargingPlan(Base):
    __tablename__ = "charging_plans"

    id = Column(Integer, primary_key=True)
    plan_name = Column(String(50), nullable=False, unique=True)
    subscription_fee = Column(Numeric(8, 2), nullable=False)
    validity_days = Column(Integer, nullable=False)
    discount_percentage = Column(Numeric(5, 2), nullable=False, server_default="0")
    priority_booking = Column(Boolean, nullable=False, server_default="false")
    max_sessions = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, server_default="active")

    __table_args__ = (CheckConstraint("status IN ('active','inactive')", name="ck_plans_status"),)

    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("charging_plans.id"), nullable=False)
    start_date = Column(Date, nullable=False, server_default=func.current_date())
    end_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, server_default="active")
    auto_renew = Column(Boolean, nullable=False, server_default="false")

    __table_args__ = (
        CheckConstraint("status IN ('active','expired','cancelled')", name="ck_subscriptions_status"),
    )

    user = relationship("User", back_populates="subscriptions")
    plan = relationship("ChargingPlan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=True, unique=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True, unique=True)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    payment_method = Column(String(30), nullable=False)
    payment_status = Column(String(20), nullable=False, server_default="pending")
    transaction_reference = Column(String(50))

    __table_args__ = (
        CheckConstraint("payment_method IN ('card','upi','wallet','net_banking')", name="ck_payments_method"),
        CheckConstraint(
            "payment_status IN ('pending','successful','failed','refunded')", name="ck_payments_status"
        ),
        CheckConstraint(
            "(bill_id IS NOT NULL AND subscription_id IS NULL) OR "
            "(bill_id IS NULL AND subscription_id IS NOT NULL)",
            name="ck_payments_exactly_one_target",
        ),
    )

    bill = relationship("Bill", back_populates="payment")
    subscription = relationship("Subscription", back_populates="payments")
    refund = relationship("Refund", back_populates="payment", uselist=False)


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False, unique=True)
    amount = Column(Numeric(10, 2), nullable=False)
    reason = Column(String(255), nullable=False)
    refund_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    status = Column(String(20), nullable=False, server_default="pending")

    __table_args__ = (
        CheckConstraint("status IN ('pending','approved','rejected')", name="ck_refunds_status"),
    )

    payment = relationship("Payment", back_populates="refund")


class Technician(Base):
    __tablename__ = "technicians"

    id = Column(Integer, primary_key=True)
    operator_id = Column(Integer, ForeignKey("charging_operators.id"), nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(15))
    specialization = Column(String(50))

    operator = relationship("ChargingOperator", back_populates="technicians")
    maintenance_tickets = relationship("Maintenance", back_populates="technician")


class Maintenance(Base):
    __tablename__ = "maintenance_tickets"

    id = Column(Integer, primary_key=True)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    connector_id = Column(Integer, ForeignKey("connectors.id"), nullable=False)
    technician_id = Column(Integer, ForeignKey("technicians.id"), nullable=False)
    issue_description = Column(String(255), nullable=False)
    priority = Column(String(10), nullable=False, server_default="medium")
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    completed_date = Column(DateTime(timezone=True))
    status = Column(String(20), nullable=False, server_default="open")

    __table_args__ = (
        CheckConstraint("priority IN ('low','medium','high','critical')", name="ck_maintenance_priority"),
        CheckConstraint(
            "status IN ('open','in_progress','completed','cancelled')", name="ck_maintenance_status"
        ),
    )

    station = relationship("ChargingStation", back_populates="maintenance_tickets")
    connector = relationship("Connector", back_populates="maintenance_tickets")
    technician = relationship("Technician", back_populates="maintenance_tickets")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(String(255), nullable=False)
    type = Column(String(20), nullable=False)
    sent_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    is_read = Column(Boolean, nullable=False, server_default="false")

    __table_args__ = (
        CheckConstraint(
            "type IN ('Booking','Payment','Maintenance','Promotion','System')", name="ck_notifications_type"
        ),
    )

    user = relationship("User", back_populates="notifications")


class StationReview(Base):
    __tablename__ = "station_reviews"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(String(500))
    review_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    is_verified = Column(Boolean, nullable=False, server_default="false")

    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_reviews_rating"),
        UniqueConstraint("user_id", "station_id", name="uq_review_user_station"),
    )

    user = relationship("User", back_populates="reviews")
    station = relationship("ChargingStation", back_populates="reviews")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    admin_id = Column(Integer, ForeignKey("admins.id"), nullable=False)
    action = Column(String(100), nullable=False)
    table_affected = Column(String(50), nullable=False)
    record_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    description = Column(String(255))

    admin = relationship("Admin", back_populates="audit_logs")
