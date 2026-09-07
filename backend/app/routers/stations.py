from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Charger, ChargingStation, Connector
from app.schemas import StationOut

router = APIRouter(prefix="/stations", tags=["stations"])


def _station_query(db: Session):
    return db.query(ChargingStation).options(
        joinedload(ChargingStation.location),
        joinedload(ChargingStation.operator),
        joinedload(ChargingStation.tariff),
        joinedload(ChargingStation.operating_hours),
        joinedload(ChargingStation.reviews),
        joinedload(ChargingStation.chargers)
        .joinedload(Charger.connectors)
        .joinedload(Connector.connector_type),
    )


@router.get("", response_model=list[StationOut])
def list_stations(city: str | None = None, db: Session = Depends(get_db)):
    query = _station_query(db).filter(ChargingStation.status == "active")
    if city:
        query = query.filter(ChargingStation.location.has(city=city))
    return query.all()


@router.get("/{station_id}", response_model=StationOut)
def get_station(station_id: int, db: Session = Depends(get_db)):
    station = _station_query(db).filter(ChargingStation.id == station_id).first()
    if station is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found")
    return station
