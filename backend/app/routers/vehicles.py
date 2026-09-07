from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import ConnectorType, ModelConnectorType, User, Vehicle, VehicleModel
from app.schemas import ConnectorTypeOut, VehicleCreate, VehicleModelOut, VehicleOut

router = APIRouter(tags=["vehicles"])


@router.get("/vehicle-models", response_model=list[VehicleModelOut])
def list_vehicle_models(db: Session = Depends(get_db)):
    return (
        db.query(VehicleModel)
        .options(joinedload(VehicleModel.connector_types).joinedload(ModelConnectorType.connector_type))
        .all()
    )


@router.get("/connector-types", response_model=list[ConnectorTypeOut])
def list_connector_types(db: Session = Depends(get_db)):
    return db.query(ConnectorType).all()


@router.get("/users/me/vehicles", response_model=list[VehicleOut])
def list_my_vehicles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Vehicle).filter(Vehicle.user_id == current_user.id).all()


@router.post("/users/me/vehicles", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def add_vehicle(
    payload: VehicleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    model = db.get(VehicleModel, payload.model_id)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle model not found")

    vehicle = Vehicle(
        user_id=current_user.id,
        model_id=payload.model_id,
        registration_number=payload.registration_number,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def _get_own_vehicle(vehicle_id: int, current_user: User, db: Session) -> Vehicle:
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None or vehicle.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle


@router.post("/users/me/vehicles/{vehicle_id}/deactivate", response_model=VehicleOut)
def deactivate_vehicle(vehicle_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    vehicle = _get_own_vehicle(vehicle_id, current_user, db)
    vehicle.vehicle_status = "inactive"
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.post("/users/me/vehicles/{vehicle_id}/reactivate", response_model=VehicleOut)
def reactivate_vehicle(vehicle_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    vehicle = _get_own_vehicle(vehicle_id, current_user, db)
    vehicle.vehicle_status = "active"
    db.commit()
    db.refresh(vehicle)
    return vehicle
