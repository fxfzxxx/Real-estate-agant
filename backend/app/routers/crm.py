"""CRM endpoints – lead management, scoring, pipeline view."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Agent, Buyer, Lead
from app.models.schemas import (
    AgentCreate,
    AgentRead,
    BuyerCreate,
    BuyerRead,
    LeadRead,
    LeadUpdate,
)

router = APIRouter(prefix="/crm", tags=["crm"])


# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------

@router.get("/agents", response_model=List[AgentRead])
def list_agents(db: Session = Depends(get_db)):
    return db.query(Agent).all()


@router.post("/agents", response_model=AgentRead, status_code=201)
def create_agent(payload: AgentCreate, db: Session = Depends(get_db)):
    agent = Agent(**payload.model_dump())
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


# ---------------------------------------------------------------------------
# Buyers
# ---------------------------------------------------------------------------

@router.get("/buyers", response_model=List[BuyerRead])
def list_buyers(
    stage: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Buyer)
    if stage:
        q = q.filter(Buyer.buyer_stage == stage)
    return q.offset(skip).limit(limit).all()


@router.post("/buyers", response_model=BuyerRead, status_code=201)
def create_buyer(payload: BuyerCreate, db: Session = Depends(get_db)):
    buyer = Buyer(**payload.model_dump())
    db.add(buyer)
    db.commit()
    db.refresh(buyer)
    return buyer


@router.get("/buyers/{buyer_id}", response_model=BuyerRead)
def get_buyer(buyer_id: int, db: Session = Depends(get_db)):
    buyer = db.query(Buyer).filter(Buyer.id == buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    return buyer


# ---------------------------------------------------------------------------
# Leads
# ---------------------------------------------------------------------------

@router.get("/leads", response_model=List[LeadRead])
def list_leads(
    agent_id: Optional[int] = None,
    temperature: Optional[str] = None,
    stage: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Lead)
    if agent_id:
        q = q.filter(Lead.agent_id == agent_id)
    if temperature:
        q = q.filter(Lead.temperature == temperature)
    if stage:
        q = q.filter(Lead.stage == stage)
    # Sort by score descending (hottest first)
    q = q.order_by(Lead.score.desc())
    return q.offset(skip).limit(limit).all()


@router.get("/leads/{lead_id}", response_model=LeadRead)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/leads/{lead_id}", response_model=LeadRead)
def update_lead(
    lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(lead, k, v)
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/leads/{lead_id}/actions", response_model=LeadRead)
def log_action(
    lead_id: int,
    action: str,
    db: Session = Depends(get_db),
):
    """Log a CRM action (call, email, showing) and re-score lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    behaviors = list(lead.behaviors or [])
    behaviors.append(f"action: {action}")
    lead.behaviors = behaviors

    # Weighted scoring: explicit agent actions carry more weight
    action_score = min(len(behaviors) * 8 + 20, 100)
    lead.score = action_score
    lead.temperature = (
        "hot" if action_score >= 70 else ("warm" if action_score >= 40 else "cold")
    )

    # Suggest next action automatically
    action_suggestions = {
        "call": "Send email follow-up within 24 hours",
        "email": "Call buyer to discuss specific properties",
        "showing": "Send market report and suggest offer deadline",
        "offer": "Negotiate and close deal",
    }
    lead.next_action = action_suggestions.get(
        action.lower().split()[0], "Follow up with buyer"
    )

    db.commit()
    db.refresh(lead)
    return lead
