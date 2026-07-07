"""Contact endpoints – capture buyer details from the contact page or chat.

Whenever a visitor leaves their name / email / phone (via the contact form
or by sharing details in the AI chat) we store the message, upsert a Buyer,
and open a Lead so the admin side can follow up.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Buyer, ContactMessage, Lead
from app.models.schemas import ContactMessageCreate, ContactMessageRead

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", response_model=ContactMessageRead, status_code=201)
def submit_contact(payload: ContactMessageCreate, db: Session = Depends(get_db)):
    contact = ContactMessage(**payload.model_dump())
    db.add(contact)

    # Upsert buyer from the shared details
    buyer = db.query(Buyer).filter(Buyer.email == payload.email).first()
    if not buyer:
        buyer = Buyer(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            buyer_stage="semi_ready",
        )
        db.add(buyer)
        db.flush()
    elif payload.phone and not buyer.phone:
        buyer.phone = payload.phone

    # Fold chat-captured preferences into the buyer profile
    prefs = payload.preferences or {}
    if prefs.get("budget_min"):
        buyer.budget_min = prefs["budget_min"]
    if prefs.get("budget_max"):
        buyer.budget_max = prefs["budget_max"]
    if prefs.get("bedrooms_min"):
        buyer.bedrooms_min = prefs["bedrooms_min"]
    if prefs.get("preferred_suburbs"):
        buyer.preferred_suburbs = prefs["preferred_suburbs"]
    if prefs.get("property_types"):
        buyer.property_types = prefs["property_types"]
    if prefs.get("lifestyle_tags"):
        buyer.lifestyle_tags = prefs["lifestyle_tags"]

    # Open (or warm up) a lead for admin follow-up
    lead = db.query(Lead).filter(Lead.buyer_id == buyer.id).first()
    if not lead:
        lead = Lead(
            buyer_id=buyer.id,
            source=payload.source,
            score=30,
            temperature="warm",
            next_action="Reach out to new contact within 24 hours",
        )
        db.add(lead)
    else:
        lead.behaviors = list(lead.behaviors or []) + [f"contact_message: {payload.source}"]
        lead.score = min(lead.score + 15, 100)
        lead.temperature = "hot" if lead.score >= 70 else "warm"

    db.commit()
    db.refresh(contact)
    return contact


@router.get("", response_model=List[ContactMessageRead])
def list_contacts(
    source: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(ContactMessage)
    if source:
        q = q.filter(ContactMessage.source == source)
    return q.order_by(ContactMessage.created_at.desc()).offset(skip).limit(limit).all()
