from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.compatibility import check_connector_compatible
from app.database import get_db
from app.models import Bill, Booking, ChargingSession, Connector, MeterReading, Subscription, User, Vehicle
from app.notifications import notify
from app.schemas import BillOut, MeterReadingCreate, MeterReadingOut, SessionEnd, SessionOut, SessionStart

router = APIRouter(prefix="/sessions", tags=["sessions"])

TAX_RATE = Decimal("0.05")  # flat 5% tax for MVP demo purposes


@router.post("/start", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def start_session(
    payload: SessionStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    connector = db.get(Connector, payload.connector_id)
    if connector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")
    if connector.status != "available":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Connector is not available")

    vehicle = db.get(Vehicle, payload.vehicle_id)
    if vehicle is None or vehicle.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    check_connector_compatible(db, vehicle, connector)

    booking = None
    if payload.booking_id is not None:
        booking = db.get(Booking, payload.booking_id)
        if booking is None or booking.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        if booking.connector_id != payload.connector_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is for a different connector")
        if booking.status != "confirmed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is not confirmed")

    charging_session = ChargingSession(
        booking_id=booking.id if booking else None,
        connector_id=connector.id,
        user_id=current_user.id,
        vehicle_id=vehicle.id,
        session_status="charging",
    )
    connector.status = "occupied"
    db.add(charging_session)
    db.commit()
    db.refresh(charging_session)
    return charging_session


def _active_subscription(db: Session, user_id: int) -> Subscription | None:
    return (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user_id,
            Subscription.status == "active",
            Subscription.end_date >= date.today(),
        )
        .first()
    )


@router.post("/{session_id}/end", response_model=BillOut)
def end_session(
    session_id: int,
    payload: SessionEnd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    charging_session = db.get(ChargingSession, session_id)
    if charging_session is None or charging_session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if charging_session.session_status != "charging":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not currently active")

    tariff = charging_session.connector.charger.station.tariff
    if tariff is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Station has no tariff configured")

    charging_session.end_time = datetime.now(timezone.utc)
    charging_session.energy_delivered_kwh = payload.energy_delivered_kwh
    charging_session.session_status = "completed"
    charging_session.connector.status = "available"

    if charging_session.booking is not None:
        charging_session.booking.status = "completed"

    energy_charge = (payload.energy_delivered_kwh * tariff.price_per_kwh).quantize(Decimal("0.01"))

    subscription = _active_subscription(db, current_user.id)
    subscription_discount = Decimal("0.00")
    if subscription is not None:
        subscription_discount = (energy_charge * subscription.plan.discount_percentage / 100).quantize(Decimal("0.01"))

    taxable_amount = energy_charge - subscription_discount
    tax_amount = (taxable_amount * TAX_RATE).quantize(Decimal("0.01"))
    total_amount = taxable_amount + tax_amount

    bill = Bill(
        session_id=charging_session.id,
        energy_charge=energy_charge,
        subscription_discount=subscription_discount,
        tax_amount=tax_amount,
        total_amount=total_amount,
    )
    db.add(bill)
    notify(
        db,
        current_user.id,
        f"Session #{charging_session.id} ended — bill total ₹{total_amount}",
        "Payment",
    )
    db.commit()
    db.refresh(bill)
    return bill


@router.get("/me", response_model=list[SessionOut])
def list_my_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(ChargingSession)
        .filter(ChargingSession.user_id == current_user.id)
        .order_by(ChargingSession.start_time.desc())
        .all()
    )


@router.post("/{session_id}/readings", response_model=MeterReadingOut, status_code=status.HTTP_201_CREATED)
def add_meter_reading(
    session_id: int,
    payload: MeterReadingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    charging_session = db.get(ChargingSession, session_id)
    if charging_session is None or charging_session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if charging_session.session_status != "charging":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not currently active")

    reading = MeterReading(session_id=session_id, **payload.model_dump())
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.get("/{session_id}/readings", response_model=list[MeterReadingOut])
def list_meter_readings(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    charging_session = db.get(ChargingSession, session_id)
    if charging_session is None or charging_session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return charging_session.meter_readings
