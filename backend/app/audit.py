from sqlalchemy.orm import Session

from app.models import Admin, AuditLog


def log_action(db: Session, admin: Admin, action: str, table: str, record_id: int, description: str) -> None:
    db.add(
        AuditLog(
            admin_id=admin.id,
            action=action,
            table_affected=table,
            record_id=record_id,
            description=description,
        )
    )
