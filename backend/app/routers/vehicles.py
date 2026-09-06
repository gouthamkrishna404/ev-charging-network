from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Vehicle, VehicleModel
from app.schemas import VehicleCreate, VehicleModelOut, VehicleOut

router = APIRouter(tags=["vehicles"])


@router.get("/vehicle-models", response_model=list[VehicleModelOut])
def list_vehicle_models(db: Session = Depends(get_db)):
    return db.query(VehicleModel).all()


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
