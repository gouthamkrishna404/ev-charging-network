from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Charger, ChargingSession, ChargingStation, Connector, StationReview, User
from app.schemas import FeaturedReviewOut, ReviewCreate, ReviewOut

router = APIRouter(prefix="/stations", tags=["reviews"])


@router.get("/reviews/featured", response_model=list[FeaturedReviewOut])
def featured_reviews(db: Session = Depends(get_db)):
    reviews = (
        db.query(StationReview)
        .join(ChargingStation, StationReview.station_id == ChargingStation.id)
        .filter(StationReview.is_verified.is_(True), StationReview.rating >= 4, StationReview.comment.isnot(None))
        .order_by(StationReview.rating.desc(), StationReview.review_date.desc())
        .limit(9)
        .all()
    )
    return [
        FeaturedReviewOut(
            id=r.id,
            rating=r.rating,
            comment=r.comment,
            station_name=r.station.station_name,
            city=r.station.location.city,
            reviewer_name=r.user.name,
        )
        for r in reviews
    ]


@router.get("/{station_id}/reviews", response_model=list[ReviewOut])
def list_reviews(station_id: int, db: Session = Depends(get_db)):
    return (
        db.query(StationReview)
        .filter(StationReview.station_id == station_id)
        .order_by(StationReview.review_date.desc())
        .all()
    )


@router.post("/{station_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def add_review(
    station_id: int,
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.get(ChargingStation, station_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found")
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rating must be between 1 and 5")

    existing = (
        db.query(StationReview)
        .filter(StationReview.user_id == current_user.id, StationReview.station_id == station_id)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already reviewed this station")

    has_completed_session = (
        db.query(ChargingSession)
        .join(Connector, ChargingSession.connector_id == Connector.id)
        .join(Charger, Connector.charger_id == Charger.id)
        .filter(
            Charger.station_id == station_id,
            ChargingSession.user_id == current_user.id,
            ChargingSession.session_status == "completed",
        )
        .first()
        is not None
    )

    review = StationReview(
        user_id=current_user.id,
        station_id=station_id,
        rating=payload.rating,
        comment=payload.comment,
        is_verified=has_completed_session,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
