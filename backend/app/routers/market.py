"""Market Insights endpoints – suburb price trends, comparable listings."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import MarketSnapshot, Property
from app.models.schemas import MarketSnapshotRead, PropertyRead

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/suburbs", response_model=List[MarketSnapshotRead])
def list_snapshots(
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(MarketSnapshot)
    if state:
        q = q.filter(MarketSnapshot.state.ilike(f"%{state}%"))
    return q.order_by(MarketSnapshot.recorded_at.desc()).all()


@router.get("/suburbs/{suburb}", response_model=MarketSnapshotRead)
def get_suburb(suburb: str, state: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(MarketSnapshot).filter(
        MarketSnapshot.suburb.ilike(f"%{suburb}%")
    )
    if state:
        q = q.filter(MarketSnapshot.state.ilike(f"%{state}%"))
    snap = q.order_by(MarketSnapshot.recorded_at.desc()).first()
    if not snap:
        raise HTTPException(status_code=404, detail="No market data for this suburb")
    return snap


@router.get("/comparable/{property_id}", response_model=List[PropertyRead])
def comparable_listings(
    property_id: int,
    limit: int = 5,
    db: Session = Depends(get_db),
):
    """Return similar active listings in the same suburb."""
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    comps = (
        db.query(Property)
        .filter(
            Property.id != property_id,
            Property.suburb == prop.suburb,
            Property.status == "active",
            Property.price.between(prop.price * 0.8, prop.price * 1.2),
        )
        .limit(limit)
        .all()
    )
    return comps
