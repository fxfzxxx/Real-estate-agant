"""Property listings endpoints."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Property
from app.models.schemas import PropertyCreate, PropertyRead

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
