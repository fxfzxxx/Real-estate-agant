"""Property listings endpoints."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import ChatMessage, Enquiry, Property, PropertySwipe
from app.models.schemas import PropertyCreate, PropertyRead, TrendingProperty

router = APIRouter(prefix="/properties", tags=["properties"])


@router.get("", response_model=List[PropertyRead])
def list_properties(
    suburb: Optional[str] = None,
    state: Optional[str] = None,
    status: Optional[str] = "active",
    property_type: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    bedrooms_min: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Property)
    if suburb:
        q = q.filter(Property.suburb.ilike(f"%{suburb}%"))
    if state:
        q = q.filter(Property.state.ilike(f"%{state}%"))
    if status:
        q = q.filter(Property.status == status)
    if property_type:
        q = q.filter(Property.property_type == property_type)
    if price_min is not None:
        q = q.filter(Property.price >= price_min)
    if price_max is not None:
        q = q.filter(Property.price <= price_max)
    if bedrooms_min is not None:
        q = q.filter(Property.bedrooms >= bedrooms_min)
    return q.offset(skip).limit(limit).all()


@router.get("/popular", response_model=List[PropertyRead])
def popular_properties(
    limit: int = Query(4, ge=1, le=20), db: Session = Depends(get_db)
):
    """Most popular active listings, ranked by likes, enquiries and chats."""
    props = db.query(Property).filter(Property.status == "active").all()

    def score(prop: Property) -> int:
        likes = (
            db.query(PropertySwipe)
            .filter(PropertySwipe.property_id == prop.id, PropertySwipe.liked.is_(True))
            .count()
        )
        enquiries = db.query(Enquiry).filter(Enquiry.property_id == prop.id).count()
        chats = (
            db.query(ChatMessage)
            .filter(ChatMessage.property_id == prop.id, ChatMessage.role == "user")
            .count()
        )
        return likes * 3 + enquiries * 5 + chats * 2

    props.sort(key=score, reverse=True)
    return props[:limit]


@router.get("/trending", response_model=List[TrendingProperty])
def trending_properties(
    limit: int = Query(4, ge=1, le=20), db: Session = Depends(get_db)
):
    """Most-loved active listings with their engagement counts, for the
    client chat's "trending now" dialog."""
    rows = []
    for prop in db.query(Property).filter(Property.status == "active").all():
        likes = (
            db.query(PropertySwipe)
            .filter(PropertySwipe.property_id == prop.id, PropertySwipe.liked.is_(True))
            .count()
        )
        enquiries = db.query(Enquiry).filter(Enquiry.property_id == prop.id).count()
        rows.append((likes * 3 + enquiries * 5, likes, enquiries, prop))
    rows.sort(key=lambda r: r[0], reverse=True)
    return [
        TrendingProperty(property=PropertyRead.model_validate(p), likes=likes, enquiries=enq)
        for _score, likes, enq, p in rows[:limit]
    ]


@router.get("/{property_id}", response_model=PropertyRead)
def get_property(property_id: int, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


@router.post("", response_model=PropertyRead, status_code=201)
def create_property(payload: PropertyCreate, db: Session = Depends(get_db)):
    prop = Property(**payload.model_dump())
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


@router.put("/{property_id}", response_model=PropertyRead)
def update_property(
    property_id: int, payload: PropertyCreate, db: Session = Depends(get_db)
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(prop, k, v)
    db.commit()
    db.refresh(prop)
    return prop


@router.delete("/{property_id}", status_code=204)
def delete_property(property_id: int, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    db.delete(prop)
    db.commit()
