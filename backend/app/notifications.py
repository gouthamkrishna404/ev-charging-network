from sqlalchemy.orm import Session

from app.models import Notification

VALID_TYPES = {"Booking", "Payment", "Maintenance", "Promotion", "System"}


def notify(db: Session, user_id: int, message: str, type_: str) -> None:
    assert type_ in VALID_TYPES
    db.add(Notification(user_id=user_id, message=message, type=type_))
