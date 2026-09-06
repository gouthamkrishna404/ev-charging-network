from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.database import get_db
from app.models import (
    Admin,
    Bill,
    Booking,
    Charger,
    ChargingSession,
    ChargingStation,
    Connector,
    StationAdmin,
)
from app.schemas import BookingOut, StationOut

router = APIRouter(prefix="/admin", tags=["admin"])


def _managed_station_ids(admin: Admin, db: Session) -> list[int]:
    rows = db.query(StationAdmin.station_id).filter(StationAdmin.admin_id == admin.id).all()
    return [row[0] for row in rows]


def _require_managed_station(station_id: int, admin: Admin, db: Session) -> None:
    if station_id not in _managed_station_ids(admin, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not manage this station")


@router.get("/stations", response_model=list[StationOut])
def my_stations(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    station_ids = _managed_station_ids(admin, db)
    return db.query(ChargingStation).filter(ChargingStation.id.in_(station_ids)).all()


@router.get("/stations/{station_id}/bookings", response_model=list[BookingOut])
def station_bookings(station_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    _require_managed_station(station_id, admin, db)
    return (
        db.query(Booking)
        .join(Connector, Booking.connector_id == Connector.id)
        .join(Charger, Connector.charger_id == Charger.id)
        .filter(Charger.station_id == station_id)
        .order_by(Booking.start_time.desc())
        .all()
    )


@router.get("/stations/{station_id}/revenue")
def station_revenue(station_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    _require_managed_station(station_id, admin, db)
    total = (
        db.query(func.coalesce(func.sum(Bill.total_amount), 0))
        .join(ChargingSession, Bill.session_id == ChargingSession.id)
        .join(Connector, ChargingSession.connector_id == Connector.id)
        .join(Charger, Connector.charger_id == Charger.id)
        .filter(Charger.station_id == station_id)
        .scalar()
    )
    session_count = (
        db.query(func.count(ChargingSession.id))
        .join(Connector, ChargingSession.connector_id == Connector.id)
        .join(Charger, Connector.charger_id == Charger.id)
        .filter(Charger.station_id == station_id, ChargingSession.session_status == "completed")
        .scalar()
    )
    return {"station_id": station_id, "total_revenue": total, "completed_sessions": session_count}
