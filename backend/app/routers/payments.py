import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Bill, ChargingSession, Payment, User
from app.schemas import BillOut, PaymentCreate, PaymentOut

router = APIRouter(tags=["billing"])


@router.get("/bills/me", response_model=list[BillOut])
def list_my_bills(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Bill)
        .join(ChargingSession)
        .filter(ChargingSession.user_id == current_user.id)
        .order_by(Bill.generated_date.desc())
        .all()
    )


@router.post("/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def pay_bill(
    payload: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = db.get(Bill, payload.bill_id)
    if bill is None or bill.session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    if bill.payment is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bill has already been paid")

    # No real payment gateway for the MVP -- simulate an always-successful transaction.
    payment = Payment(
        bill_id=bill.id,
        amount=bill.total_amount,
        payment_method=payload.payment_method,
        payment_status="successful",
        transaction_reference=f"SIM-{secrets.token_hex(6).upper()}",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
