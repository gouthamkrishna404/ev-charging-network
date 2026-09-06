from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.audit import log_action
from app.auth import get_current_admin
from app.database import get_db
from app.models import (
    Admin,
    AuditLog,
    Bill,
    Booking,
    Charger,
    ChargingSession,
    ChargingStation,
    Connector,
    Location,
    Maintenance,
    Payment,
    Refund,
    StationAdmin,
    StationOperatingHours,
    Tariff,
    Technician,
)
from app.notifications import notify
from app.schemas import (
    AuditLogOut,
    BookingOut,
    ChargerCreate,
    ChargerOut,
    ConnectorCreate,
    ConnectorOut,
    MaintenanceCreate,
    MaintenanceOut,
    OperatingHoursOut,
    OperatingHoursSet,
    RefundOut,
    StationCreate,
    StationOut,
    TechnicianCreate,
    TechnicianOut,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _managed_station_ids(admin: Admin, db: Session) -> list[int]:
    rows = db.query(StationAdmin.station_id).filter(StationAdmin.admin_id == admin.id).all()
    return [row[0] for row in rows]


def _require_managed_station(station_id: int, admin: Admin, db: Session) -> None:
    if station_id not in _managed_station_ids(admin, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not manage this station")


def _station_query(db: Session):
    return db.query(ChargingStation).options(
        joinedload(ChargingStation.location),
        joinedload(ChargingStation.tariff),
        joinedload(ChargingStation.operating_hours),
        joinedload(ChargingStation.chargers).joinedload(Charger.connectors),
    )


# ---------- Stations, chargers, connectors ----------

@router.get("/stations", response_model=list[StationOut])
def my_stations(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    station_ids = _managed_station_ids(admin, db)
    return _station_query(db).filter(ChargingStation.id.in_(station_ids)).all()


@router.post("/stations", response_model=StationOut, status_code=status.HTTP_201_CREATED)
def create_station(
    payload: StationCreate, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)
):
    location = Location(**payload.location.model_dump())
    db.add(location)
    db.flush()

    station = ChargingStation(operator_id=admin.operator_id, location_id=location.id, station_name=payload.station_name)
    db.add(station)
    db.flush()

    db.add(Tariff(station_id=station.id, price_per_kwh=payload.price_per_kwh))
    db.add(StationAdmin(station_id=station.id, admin_id=admin.id))
    log_action(db, admin, "Create", "charging_stations", station.id, f"Created station '{station.station_name}'")
    db.commit()
    return _station_query(db).filter(ChargingStation.id == station.id).first()


@router.post("/stations/{station_id}/chargers", response_model=ChargerOut, status_code=status.HTTP_201_CREATED)
def add_charger(
    station_id: int,
    payload: ChargerCreate,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _require_managed_station(station_id, admin, db)
    charger = Charger(station_id=station_id, **payload.model_dump())
    db.add(charger)
    db.flush()
    log_action(db, admin, "Create", "chargers", charger.id, f"Added charger to station #{station_id}")
    db.commit()
    db.refresh(charger)
    return charger


@router.post("/chargers/{charger_id}/connectors", response_model=ConnectorOut, status_code=status.HTTP_201_CREATED)
def add_connector(
    charger_id: int,
    payload: ConnectorCreate,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    charger = db.get(Charger, charger_id)
    if charger is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charger not found")
    _require_managed_station(charger.station_id, admin, db)

    connector = Connector(charger_id=charger_id, **payload.model_dump())
    db.add(connector)
    db.flush()
    log_action(db, admin, "Create", "connectors", connector.id, f"Added connector to charger #{charger_id}")
    db.commit()
    db.refresh(connector)
    return connector


@router.put("/stations/{station_id}/tariff")
def set_tariff(
    station_id: int,
    price_per_kwh: float,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _require_managed_station(station_id, admin, db)
    tariff = db.query(Tariff).filter(Tariff.station_id == station_id).first()
    if tariff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tariff not found")
    tariff.price_per_kwh = price_per_kwh
    log_action(db, admin, "Update", "tariffs", tariff.id, f"Updated price to ₹{price_per_kwh}/kWh")
    db.commit()
    return {"station_id": station_id, "price_per_kwh": price_per_kwh}


@router.put("/stations/{station_id}/operating-hours", response_model=list[OperatingHoursOut])
def set_operating_hours(
    station_id: int,
    payload: list[OperatingHoursSet],
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _require_managed_station(station_id, admin, db)
    db.query(StationOperatingHours).filter(StationOperatingHours.station_id == station_id).delete()
    rows = [StationOperatingHours(station_id=station_id, **entry.model_dump()) for entry in payload]
    db.add_all(rows)
    log_action(db, admin, "Update", "station_operating_hours", station_id, "Set weekly operating hours")
    db.commit()
    return db.query(StationOperatingHours).filter(StationOperatingHours.station_id == station_id).all()


# ---------- Bookings & revenue ----------

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


# ---------- Technicians & maintenance ----------

@router.get("/technicians", response_model=list[TechnicianOut])
def list_technicians(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Technician).all()


@router.post("/technicians", response_model=TechnicianOut, status_code=status.HTTP_201_CREATED)
def create_technician(
    payload: TechnicianCreate, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)
):
    technician = Technician(**payload.model_dump())
    db.add(technician)
    db.flush()
    log_action(db, admin, "Create", "technicians", technician.id, f"Added technician '{technician.name}'")
    db.commit()
    db.refresh(technician)
    return technician


@router.get("/stations/{station_id}/maintenance", response_model=list[MaintenanceOut])
def station_maintenance(station_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    _require_managed_station(station_id, admin, db)
    return (
        db.query(Maintenance)
        .filter(Maintenance.station_id == station_id)
        .order_by(Maintenance.scheduled_date.desc())
        .all()
    )


@router.post(
    "/stations/{station_id}/maintenance", response_model=MaintenanceOut, status_code=status.HTTP_201_CREATED
)
def create_maintenance(
    station_id: int,
    payload: MaintenanceCreate,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _require_managed_station(station_id, admin, db)
    connector = db.get(Connector, payload.connector_id)
    if connector is None or connector.charger.station_id != station_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Connector does not belong to this station")

    ticket = Maintenance(station_id=station_id, **payload.model_dump())
    connector.status = "out_of_service"
    db.add(ticket)
    db.flush()
    log_action(
        db, admin, "Create", "maintenance_tickets", ticket.id, f"Opened ticket for connector #{connector.id}"
    )
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/maintenance/{ticket_id}/complete", response_model=MaintenanceOut)
def complete_maintenance(
    ticket_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)
):
    ticket = db.get(Maintenance, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance ticket not found")
    _require_managed_station(ticket.station_id, admin, db)

    ticket.status = "completed"
    ticket.completed_date = datetime.now(timezone.utc)
    ticket.connector.status = "available"
    log_action(db, admin, "Update", "maintenance_tickets", ticket.id, "Marked ticket completed")
    db.commit()
    db.refresh(ticket)
    return ticket


# ---------- Refunds ----------

def _managed_payment_ids(admin: Admin, db: Session):
    station_ids = _managed_station_ids(admin, db)
    return (
        db.query(Payment.id)
        .join(Bill, Payment.bill_id == Bill.id)
        .join(ChargingSession, Bill.session_id == ChargingSession.id)
        .join(Connector, ChargingSession.connector_id == Connector.id)
        .join(Charger, Connector.charger_id == Charger.id)
        .filter(Charger.station_id.in_(station_ids))
    )


@router.get("/refunds", response_model=list[RefundOut])
def list_refunds(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    payment_ids = [row[0] for row in _managed_payment_ids(admin, db)]
    return db.query(Refund).filter(Refund.payment_id.in_(payment_ids)).order_by(Refund.refund_date.desc()).all()


@router.post("/refunds/{refund_id}/approve", response_model=RefundOut)
def approve_refund(refund_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    refund = db.get(Refund, refund_id)
    if refund is None or refund.payment_id not in [row[0] for row in _managed_payment_ids(admin, db)]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refund not found")
    if refund.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Refund already resolved")

    refund.status = "approved"
    refund.payment.payment_status = "refunded"
    owner_id = refund.payment.bill.session.user_id
    notify(db, owner_id, f"Your refund of ₹{refund.amount} was approved", "Payment")
    log_action(db, admin, "Approve", "refunds", refund.id, f"Approved refund of ₹{refund.amount}")
    db.commit()
    db.refresh(refund)
    return refund


@router.post("/refunds/{refund_id}/reject", response_model=RefundOut)
def reject_refund(refund_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    refund = db.get(Refund, refund_id)
    if refund is None or refund.payment_id not in [row[0] for row in _managed_payment_ids(admin, db)]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refund not found")
    if refund.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Refund already resolved")

    refund.status = "rejected"
    owner_id = refund.payment.bill.session.user_id
    notify(db, owner_id, f"Your refund request for ₹{refund.amount} was rejected", "Payment")
    log_action(db, admin, "Reject", "refunds", refund.id, f"Rejected refund of ₹{refund.amount}")
    db.commit()
    db.refresh(refund)
    return refund


# ---------- Audit log ----------

@router.get("/audit-log", response_model=list[AuditLogOut])
def audit_log(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    return (
        db.query(AuditLog)
        .join(Admin, AuditLog.admin_id == Admin.id)
        .filter(Admin.operator_id == admin.operator_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(100)
        .all()
    )
