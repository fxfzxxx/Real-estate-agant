"""Admin endpoints – communications summary, property popularity, deals,
and AI-recommended agent actions.

The action generator uses simple heuristics over CRM data; in production
this is where an LLM would rank and phrase the recommendations.
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    AgentAction,
    ChatMessage,
    ContactMessage,
    Enquiry,
    Lead,
    Property,
    PropertySwipe,
)
from app.models.schemas import (
    ActionSummary,
    AdminSummary,
    AgentActionRead,
    AgentActionUpdate,
    CommunicationItem,
    DealStage,
    LeadRead,
    PropertyPopularity,
    PropertyRead,
)

router = APIRouter(prefix="/admin", tags=["admin"])

DEAL_STAGES = ["new", "contacted", "viewing", "offer", "closed"]
ACTION_STATUSES = {"pending", "done", "dismissed", "deferred"}


# ---------------------------------------------------------------------------
# Communications summary
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=AdminSummary)
def get_summary(db: Session = Depends(get_db)):
    enquiries = db.query(Enquiry).order_by(Enquiry.created_at.desc()).limit(10).all()
    contacts = (
        db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(10).all()
    )

    recent: List[CommunicationItem] = []
    for e in enquiries:
        recent.append(
            CommunicationItem(
                kind="enquiry",
                name=e.name,
                email=e.email,
                phone=e.phone,
                summary=e.message,
                property_id=e.property_id,
                property_title=e.property.title if e.property else None,
                created_at=e.created_at,
            )
        )
    for c in contacts:
        recent.append(
            CommunicationItem(
                kind="contact_message",
                name=c.name,
                email=c.email,
                phone=c.phone,
                summary=c.message or f"Details shared via {c.source}",
                created_at=c.created_at,
            )
        )
    recent.sort(key=lambda item: item.created_at, reverse=True)

    return AdminSummary(
        enquiries_count=db.query(Enquiry).count(),
        contact_messages_count=db.query(ContactMessage).count(),
        chat_sessions_count=db.query(
            func.count(func.distinct(ChatMessage.session_id))
        ).scalar()
        or 0,
        likes_count=db.query(PropertySwipe).filter(PropertySwipe.liked.is_(True)).count(),
        dislikes_count=db.query(PropertySwipe)
        .filter(PropertySwipe.liked.is_(False))
        .count(),
        leads_count=db.query(Lead).count(),
        hot_leads_count=db.query(Lead).filter(Lead.temperature == "hot").count(),
        recent_communications=recent[:15],
    )


# ---------------------------------------------------------------------------
# Property popularity
# ---------------------------------------------------------------------------

@router.get("/property-popularity", response_model=List[PropertyPopularity])
def property_popularity(db: Session = Depends(get_db)):
    results = []
    for prop in db.query(Property).all():
        likes = (
            db.query(PropertySwipe)
            .filter(PropertySwipe.property_id == prop.id, PropertySwipe.liked.is_(True))
            .count()
        )
        dislikes = (
            db.query(PropertySwipe)
            .filter(PropertySwipe.property_id == prop.id, PropertySwipe.liked.is_(False))
            .count()
        )
        enquiries = db.query(Enquiry).filter(Enquiry.property_id == prop.id).count()
        chats = (
            db.query(ChatMessage)
            .filter(ChatMessage.property_id == prop.id, ChatMessage.role == "user")
            .count()
        )
        score = likes * 3 + enquiries * 5 + chats * 2 - dislikes
        results.append(
            PropertyPopularity(
                property=PropertyRead.model_validate(prop),
                likes=likes,
                dislikes=dislikes,
                enquiries=enquiries,
                chat_messages=chats,
                popularity_score=score,
            )
        )
    results.sort(key=lambda r: r.popularity_score, reverse=True)
    return results


# ---------------------------------------------------------------------------
# Deals pipeline
# ---------------------------------------------------------------------------

@router.get("/deals", response_model=List[DealStage])
def deals_pipeline(db: Session = Depends(get_db)):
    stages = []
    for stage in DEAL_STAGES:
        leads = (
            db.query(Lead)
            .filter(Lead.stage == stage)
            .order_by(Lead.score.desc())
            .all()
        )
        stages.append(
            DealStage(stage=stage, leads=[LeadRead.model_validate(l) for l in leads])
        )
    return stages


# ---------------------------------------------------------------------------
# AI-recommended agent actions
# ---------------------------------------------------------------------------

def _existing_action(db: Session, title: str) -> bool:
    return (
        db.query(AgentAction)
        .filter(AgentAction.title == title, AgentAction.status.in_(["pending", "deferred"]))
        .first()
        is not None
    )


def _generate_actions(db: Session) -> List[AgentAction]:
    """Heuristic recommendation engine – one action per detected situation."""
    created: List[AgentAction] = []

    # 1. Hot leads → follow up
    hot_leads = db.query(Lead).filter(
        Lead.temperature == "hot", Lead.stage.notin_(["closed"])
    ).all()
    for lead in hot_leads:
        buyer_name = lead.buyer.name if lead.buyer else f"Buyer #{lead.buyer_id}"
        title = f"Follow up hot lead: {buyer_name}"
        if not _existing_action(db, title):
            action = AgentAction(
                title=title,
                description=(
                    f"{buyer_name} has an intent score of {lead.score}. "
                    f"Suggested: {lead.next_action or 'call to discuss shortlisted properties'}."
                ),
                category="follow_up",
                priority="high",
                lead_id=lead.id,
                property_id=lead.property_id,
            )
            db.add(action)
            created.append(action)

    # 2. Leads sitting at offer stage → chase the deal
    offer_leads = db.query(Lead).filter(Lead.stage == "offer").all()
    for lead in offer_leads:
        buyer_name = lead.buyer.name if lead.buyer else f"Buyer #{lead.buyer_id}"
        title = f"Chase deal in progress: {buyer_name}"
        if not _existing_action(db, title):
            action = AgentAction(
                title=title,
                description=f"{buyer_name} has an active offer. Confirm paperwork and push toward close.",
                category="chase_deal",
                priority="high",
                lead_id=lead.id,
                property_id=lead.property_id,
            )
            db.add(action)
            created.append(action)

    # 3. Unhandled contact messages → outreach
    unhandled = db.query(ContactMessage).filter(ContactMessage.handled.is_(False)).all()
    for msg in unhandled:
        title = f"Respond to new contact: {msg.name}"
        if not _existing_action(db, title):
            action = AgentAction(
                title=title,
                description=(
                    f"{msg.name} ({msg.email}{', ' + msg.phone if msg.phone else ''}) "
                    f"reached out via {msg.source}. Message: {msg.message or '—'}"
                ),
                category="outreach",
                priority="medium",
            )
            db.add(action)
            created.append(action)

    # 4. Stale / unpopular listings → advertise
    for prop in db.query(Property).filter(Property.status == "active").all():
        likes = (
            db.query(PropertySwipe)
            .filter(PropertySwipe.property_id == prop.id, PropertySwipe.liked.is_(True))
            .count()
        )
        enquiries = db.query(Enquiry).filter(Enquiry.property_id == prop.id).count()
        if prop.days_on_market >= 30 and likes == 0 and enquiries == 0:
            title = f"Advertise stale listing: {prop.title}"
            if not _existing_action(db, title):
                action = AgentAction(
                    title=title,
                    description=(
                        f"{prop.title} has been on the market {prop.days_on_market} days "
                        "with no likes or enquiries. Consider a marketing push or price review."
                    ),
                    category="advertise",
                    priority="medium",
                    property_id=prop.id,
                )
                db.add(action)
                created.append(action)

    db.commit()
    return created


@router.post("/actions/generate", response_model=List[AgentActionRead])
def generate_actions(db: Session = Depends(get_db)):
    return _generate_actions(db)


@router.get("/actions", response_model=List[AgentActionRead])
def list_actions(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(AgentAction)
    if status:
        q = q.filter(AgentAction.status == status)
    return (
        q.order_by(AgentAction.created_at.desc()).offset(skip).limit(limit).all()
    )


@router.get("/actions/summary", response_model=ActionSummary)
def actions_summary(db: Session = Depends(get_db)):
    counts = {s: 0 for s in ACTION_STATUSES}
    for status, count in (
        db.query(AgentAction.status, func.count(AgentAction.id))
        .group_by(AgentAction.status)
        .all()
    ):
        counts[status] = count
    return ActionSummary(**counts)


@router.patch("/actions/{action_id}", response_model=AgentActionRead)
def update_action(
    action_id: int, payload: AgentActionUpdate, db: Session = Depends(get_db)
):
    if payload.status not in ACTION_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status: {payload.status}")
    action = db.query(AgentAction).filter(AgentAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    action.status = payload.status
    action.resolved_at = (
        datetime.now(timezone.utc) if payload.status in {"done", "dismissed"} else None
    )
    db.commit()
    db.refresh(action)
    return action
