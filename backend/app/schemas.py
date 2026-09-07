from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, EmailStr, ConfigDict


# ---------- Auth ----------

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str | None = None
    address: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    admin_role: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    phone: str | None
    address: str | None
    account_status: str


class OperatorRegister(BaseModel):
    operator_name: str
    contact_email: EmailStr
    phone: str | None = None
    admin_name: str
    admin_email: EmailStr
    admin_password: str


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: str
    status: str


class TeamAdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "station_manager"


# ---------- Vehicles ----------

class VehicleModelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    make: str
    model_name: str
    battery_capacity_kwh: Decimal


class ConnectorTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type_name: str
    standard_max_power_kw: Decimal


class VehicleCreate(BaseModel):
    model_id: int
    registration_number: str


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    model_id: int
    registration_number: str
    vehicle_status: str


# ---------- Stations ----------

class LocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    address_line: str
    city: str
    state: str
    latitude: Decimal | None
    longitude: Decimal | None


class ConnectorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    connector_type_id: int
    connector_type_name: str
    max_power_kw: Decimal
    status: str


class ChargerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    charger_model: str | None
    power_capacity_kw: Decimal
    status: str
    connectors: list[ConnectorOut] = []


class TariffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    price_per_kwh: Decimal


class OperatingHoursOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    day_of_week: str
    opening_time: time
    closing_time: time


class StationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    station_name: str
    status: str
    operator_id: int
    operator_name: str
    location: LocationOut
    chargers: list[ChargerOut] = []
    tariff: TariffOut | None = None
    operating_hours: list[OperatingHoursOut] = []
    avg_rating: float | None = None
    review_count: int = 0


# ---------- Admin: station/infrastructure management ----------

class LocationCreate(BaseModel):
    address_line: str
    city: str
    state: str
    latitude: Decimal | None = None
    longitude: Decimal | None = None


class StationCreate(BaseModel):
    station_name: str
    location: LocationCreate
    price_per_kwh: Decimal


class ChargerCreate(BaseModel):
    charger_model: str | None = None
    power_capacity_kw: Decimal


class ConnectorCreate(BaseModel):
    connector_type_id: int
    max_power_kw: Decimal


class OperatingHoursSet(BaseModel):
    day_of_week: str
    opening_time: time
    closing_time: time


# ---------- Bookings ----------

class BookingCreate(BaseModel):
    vehicle_id: int
    connector_id: int
    start_time: datetime
    end_time: datetime


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vehicle_id: int
    connector_id: int
    station_name: str
    connector_type_name: str
    booking_time: datetime
    start_time: datetime
    end_time: datetime
    status: str
    cancellation_reason: str | None


# ---------- Sessions ----------

class SessionStart(BaseModel):
    connector_id: int
    vehicle_id: int
    booking_id: int | None = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    booking_id: int | None
    connector_id: int
    connector_power_kw: Decimal
    station_name: str
    connector_type_name: str
    vehicle_id: int
    start_time: datetime
    end_time: datetime | None
    session_status: str
    energy_delivered_kwh: Decimal | None


# ---------- Billing ----------

class PaymentCreate(BaseModel):
    bill_id: int | None = None
    subscription_id: int | None = None
    payment_method: str


class RefundOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    payment_id: int
    amount: Decimal
    reason: str
    refund_date: datetime
    status: str


class RefundRequest(BaseModel):
    reason: str


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bill_id: int | None
    subscription_id: int | None
    amount: Decimal
    payment_date: datetime
    payment_method: str
    payment_status: str
    transaction_reference: str | None
    refund: RefundOut | None = None


class BillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int
    station_name: str
    connector_type_name: str
    energy_charge: Decimal
    subscription_discount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    generated_date: datetime
    payment: PaymentOut | None = None


# ---------- Charging plans & subscriptions ----------

class ChargingPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    operator_id: int
    operator_name: str
    plan_name: str
    subscription_fee: Decimal
    validity_days: int
    discount_percentage: Decimal
    priority_booking: bool
    max_sessions: int | None
    status: str


class ChargingPlanCreate(BaseModel):
    plan_name: str
    subscription_fee: Decimal
    validity_days: int
    discount_percentage: Decimal = Decimal("0")
    priority_booking: bool = False
    max_sessions: int | None = None


class SubscriptionCreate(BaseModel):
    plan_id: int


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    plan_id: int
    start_date: date
    end_date: date
    status: str
    auto_renew: bool


# ---------- Notifications ----------

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    message: str
    type: str
    sent_date: datetime
    is_read: bool


# ---------- Station reviews ----------

class ReviewCreate(BaseModel):
    rating: int
    comment: str | None = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    station_id: int
    rating: int
    comment: str | None
    review_date: datetime
    is_verified: bool


class FeaturedReviewOut(BaseModel):
    id: int
    rating: int
    comment: str | None
    station_name: str
    city: str
    reviewer_name: str


# ---------- Maintenance & technicians ----------

class TechnicianOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str | None
    specialization: str | None


class TechnicianCreate(BaseModel):
    name: str
    phone: str | None = None
    specialization: str | None = None


class MaintenanceCreate(BaseModel):
    connector_id: int
    technician_id: int
    issue_description: str
    priority: str = "medium"
    scheduled_date: datetime


class MaintenanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    station_id: int
    connector_id: int
    technician_id: int
    issue_description: str
    priority: str
    scheduled_date: datetime
    completed_date: datetime | None
    status: str


# ---------- Meter readings ----------

class MeterReadingCreate(BaseModel):
    energy_reading_kwh: Decimal
    power_output_kw: Decimal | None = None
    voltage: Decimal | None = None
    current: Decimal | None = None


class MeterReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: datetime
    energy_reading_kwh: Decimal
    power_output_kw: Decimal | None
    voltage: Decimal | None
    current: Decimal | None


# ---------- Audit log ----------

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    admin_id: int
    action: str
    table_affected: str
    record_id: int
    timestamp: datetime
    description: str | None
