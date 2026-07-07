"""Discovery recommendations – random property deck with like / dislike swipes.

Powers the client "swipe" mode: serves properties the session has not yet
rated, records each swipe, and folds likes into the buyer's preference
profile so the admin side can follow up.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Buyer, Lead, Property, PropertySwipe
from app.models.schemas import PropertyRead, SwipeCreate, SwipeRead

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=List[PropertyRead])
def get_recommendations(
    session_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Random active properties the session has not swiped yet."""
    swiped_ids = [
        row[0]
        for row in db.query(PropertySwipe.property_id)
        .filter(PropertySwipe.session_id == session_id)
        .all()
    ]
    q = db.query(Property).filter(Property.status == "active")
    if swiped_ids:
        q = q.filter(Property.id.notin_(swiped_ids))
    return q.order_by(func.random()).limit(limit).all()


@router.post("/swipe", response_model=SwipeRead, status_code=201)
def record_swipe(payload: SwipeCreate, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == payload.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    swipe = PropertySwipe(**payload.model_dump())
    db.add(swipe)

    # Fold likes into the buyer profile / lead behaviours when identified
    if payload.buyer_id and payload.liked:
        buyer = db.query(Buyer).filter(Buyer.id == payload.buyer_id).first()
        if buyer:
            if prop.suburb not in (buyer.preferred_suburbs or []):
                buyer.preferred_suburbs = list(buyer.preferred_suburbs or []) + [prop.suburb]
            if prop.property_type and prop.property_type not in (buyer.property_types or []):
                buyer.property_types = list(buyer.property_types or []) + [prop.property_type]

            lead = db.query(Lead).filter(Lead.buyer_id == buyer.id).first()
            if not lead:
                lead = Lead(
                    buyer_id=buyer.id,
                    property_id=prop.id,
                    agent_id=prop.agent_id,
                    source="discovery_swipe",
                    next_action="Send buyer similar properties to their liked listings",
                )
                db.add(lead)
                db.flush()
            lead.behaviors = list(lead.behaviors or []) + [f"liked_property: {prop.title}"]
            lead.score = min(len(lead.behaviors) * 10, 100)
            lead.temperature = (
                "hot" if lead.score >= 70 else ("warm" if lead.score >= 40 else "cold")
            )

    db.commit()
    db.refresh(swipe)
    return swipe


@router.get("/liked", response_model=List[PropertyRead])
def get_liked(session_id: str, db: Session = Depends(get_db)):
    """Properties this session liked – lets the client show a shortlist."""
    return (
        db.query(Property)
        .join(PropertySwipe, PropertySwipe.property_id == Property.id)
        .filter(PropertySwipe.session_id == session_id, PropertySwipe.liked.is_(True))
        .all()
    )
