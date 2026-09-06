from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import ChargingPlan, Subscription, User
from app.schemas import ChargingPlanOut, SubscriptionCreate, SubscriptionOut

router = APIRouter(tags=["subscriptions"])


@router.get("/plans", response_model=list[ChargingPlanOut])
def list_plans(db: Session = Depends(get_db)):
    return db.query(ChargingPlan).filter(ChargingPlan.status == "active").all()


@router.get("/subscriptions/me", response_model=list[SubscriptionOut])
def list_my_subscriptions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id)
        .order_by(Subscription.start_date.desc())
        .all()
    )


@router.post("/subscriptions", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def subscribe(
    payload: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.get(ChargingPlan, payload.plan_id)
    if plan is None or plan.status != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    existing = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.status == "active",
            Subscription.end_date >= date.today(),
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have an active subscription")

    subscription = Subscription(
        user_id=current_user.id,
        plan_id=plan.id,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=plan.validity_days),
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


@router.post("/subscriptions/{subscription_id}/cancel", response_model=SubscriptionOut)
def cancel_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subscription = db.get(Subscription, subscription_id)
    if subscription is None or subscription.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    if subscription.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only an active subscription can be cancelled")

    subscription.status = "cancelled"
    subscription.auto_renew = False
    db.commit()
    db.refresh(subscription)
    return subscription
