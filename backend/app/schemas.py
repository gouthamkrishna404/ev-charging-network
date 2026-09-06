from datetime import datetime
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


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    phone: str | None
    address: str | None
    account_status: str


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


class StationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    station_name: str
    status: str
    location: LocationOut
    chargers: list[ChargerOut] = []
    tariff: TariffOut | None = None


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


class SessionEnd(BaseModel):
    energy_delivered_kwh: Decimal


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    booking_id: int | None
    connector_id: int
    vehicle_id: int
    start_time: datetime
    end_time: datetime | None
    session_status: str
    energy_delivered_kwh: Decimal | None


# ---------- Billing ----------

class PaymentCreate(BaseModel):
    bill_id: int
    payment_method: str


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bill_id: int
    amount: Decimal
    payment_date: datetime
    payment_method: str
    payment_status: str
    transaction_reference: str | None


class BillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int
    energy_charge: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    generated_date: datetime
    payment: PaymentOut | None = None
