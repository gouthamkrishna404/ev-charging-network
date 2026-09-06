from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Connector, ModelConnectorType, Vehicle


def check_connector_compatible(db: Session, vehicle: Vehicle, connector: Connector) -> None:
    compatible = (
        db.query(ModelConnectorType)
        .filter(
            ModelConnectorType.model_id == vehicle.model_id,
            ModelConnectorType.connector_type_id == connector.connector_type_id,
        )
        .first()
    )
    if compatible is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This vehicle's connector type isn't compatible with this connector",
        )
