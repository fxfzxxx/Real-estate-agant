"""Enquiry form endpoint – captures buyer enquiries per listing."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Buyer, Enquiry, Lead, Property
from app.models.schemas import EnquiryCreate, EnquiryRead

router = APIRouter(prefix="/properties/{property_id}/enquiries", tags=["enquiries"])


@router.post("", response_model=EnquiryRead, status_code=201)
def submit_enquiry(
    property_id: int,
    payload: EnquiryCreate,
    db: Session = Depends(get_db),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    enquiry = Enquiry(property_id=property_id, **payload.model_dump())
    db.add(enquiry)

    # Auto-create or update buyer + lead
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

    lead = (
        db.query(Lead)
        .filter(Lead.buyer_id == buyer.id, Lead.property_id == property_id)
        .first()
    )
    if not lead:
        lead = Lead(
            buyer_id=buyer.id,
            property_id=property_id,
            agent_id=prop.agent_id,
            source="enquiry_form",
            score=30,
            temperature="warm",
            next_action="Call buyer within 2 hours to discuss their enquiry",
        )
        db.add(lead)
    else:
        behaviors = list(lead.behaviors or [])
        behaviors.append("submitted_enquiry_form")
        lead.behaviors = behaviors
        lead.score = min(lead.score + 20, 100)
        lead.temperature = "hot" if lead.score >= 70 else "warm"

    db.commit()
    db.refresh(enquiry)
    return enquiry
