import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Bill, Charger, ChargingSession, Connector, Payment, Refund, Subscription, User
from app.notifications import notify
from app.schemas import BillOut, PaymentCreate, PaymentOut, RefundOut, RefundRequest

router = APIRouter(tags=["billing"])


@router.get("/bills/me", response_model=list[BillOut])
def list_my_bills(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Bill)
        .join(ChargingSession)
        .options(
            joinedload(Bill.session).joinedload(ChargingSession.connector).joinedload(Connector.connector_type),
            joinedload(Bill.session)
            .joinedload(ChargingSession.connector)
            .joinedload(Connector.charger)
            .joinedload(Charger.station),
        )
        .filter(ChargingSession.user_id == current_user.id)
        .order_by(Bill.generated_date.desc())
        .all()
    )


@router.post("/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def make_payment(
    payload: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if (payload.bill_id is None) == (payload.subscription_id is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Provide exactly one of bill_id or subscription_id"
        )

    if payload.bill_id is not None:
        bill = db.get(Bill, payload.bill_id)
        if bill is None or bill.session.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
        if bill.payment is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bill has already been paid")
        amount = bill.total_amount
        message = f"Payment of ₹{amount} received for bill #{bill.id}"
    else:
        subscription = db.get(Subscription, payload.subscription_id)
        if subscription is None or subscription.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
        if subscription.payments:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subscription fee already paid")
        amount = subscription.plan.subscription_fee
        message = f"Payment of ₹{amount} received for your {subscription.plan.plan_name} subscription"

    # No real payment gateway for the MVP -- simulate an always-successful transaction.
    payment = Payment(
        bill_id=payload.bill_id,
        subscription_id=payload.subscription_id,
        amount=amount,
        payment_method=payload.payment_method,
        payment_status="successful",
        transaction_reference=f"SIM-{secrets.token_hex(6).upper()}",
    )
    db.add(payment)
    notify(db, current_user.id, message, "Payment")
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/payments/{payment_id}/refund-request", response_model=RefundOut, status_code=status.HTTP_201_CREATED)
def request_refund(
    payment_id: int,
    payload: RefundRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    owner_id = payment.bill.session.user_id if payment.bill else payment.subscription.user_id
    if owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if payment.payment_status != "successful":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only successful payments can be refunded")
    if payment.refund is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A refund has already been requested")

    refund = Refund(payment_id=payment.id, amount=payment.amount, reason=payload.reason)
    db.add(refund)
    db.commit()
    db.refresh(refund)
    return refund
