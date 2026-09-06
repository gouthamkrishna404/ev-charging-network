from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Booking, Connector, User, Vehicle
from app.schemas import BookingCreate, BookingOut

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_time must be after start_time")

    vehicle = db.get(Vehicle, payload.vehicle_id)
    if vehicle is None or vehicle.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    if db.get(Connector, payload.connector_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    booking = Booking(
        user_id=current_user.id,
        vehicle_id=payload.vehicle_id,
        connector_id=payload.connector_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(booking)
    try:
        db.commit()
    except IntegrityError:
        # The `ex_bookings_no_overlap` EXCLUDE constraint (see app/models.py) is what
        # actually rejects this at the database level -- it's the only thing that's
        # race-condition-proof for two requests booking the same connector at once.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This connector is already booked for an overlapping time slot",
        )
    db.refresh(booking)
    return booking


@router.get("/me", response_model=list[BookingOut])
def list_my_bookings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.start_time.desc()).all()


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.get(Booking, booking_id)
    if booking is None or booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.status != "confirmed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only confirmed bookings can be cancelled")

    booking.status = "cancelled"
    booking.cancellation_reason = "Cancelled by user"
    db.commit()
    db.refresh(booking)
    return booking
