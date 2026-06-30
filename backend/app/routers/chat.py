"""AI Property Chat Assistant endpoints.

Each listing has its own AI chat interface. The assistant answers buyer
questions about the property using the listing data plus simple heuristics.

For production the `_ai_reply` function should delegate to an LLM (e.g.
OpenAI ChatCompletion) with the property context injected as a system prompt.
"""
import random
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import ChatMessage, Lead, Buyer, Property
from app.models.schemas import ChatRequest, ChatResponse, ChatMessageRead

router = APIRouter(prefix="/properties/{property_id}/chat", tags=["chat"])


# ---------------------------------------------------------------------------
# Simple rule-based AI – replace with LLM call in production
# ---------------------------------------------------------------------------

def _ai_reply(question: str, prop: Property) -> str:  # noqa: C901
    """Generate a context-aware response using listing data."""
    q = question.lower()
    features = ", ".join(prop.features) if prop.features else "N/A"
    suburb = prop.suburb

    # Family suitability
    if any(kw in q for kw in ["family", "kids", "school", "child"]):
        beds = prop.bedrooms
        family_str = (
            "Yes, this property is well-suited for families"
            if beds >= 3
            else "This property may suit a small family or couple"
        )
        return (
            f"{family_str}. It has {beds} bedrooms, located in {suburb}. "
            f"Features include: {features}. I can also check nearby school zones for you – "
            "just ask!"
        )

    # Price / affordability
    if any(kw in q for kw in ["price", "cost", "afford", "expensive", "cheap"]):
        return (
            f"This property is listed at ${prop.price:,.0f}. "
            f"It's a {prop.property_type or 'property'} in {suburb}. "
            "Would you like me to show you comparable listings nearby or help estimate your borrowing power?"
        )

    # Similar / nearby
    if any(kw in q for kw in ["similar", "nearby", "comparable", "other"]):
        return (
            f"There are several comparable {prop.property_type or 'properties'} in {suburb}. "
            "I can pull up properties in the same suburb with a similar price range. "
            "Would you like me to do that?"
        )

    # Size / space
    if any(kw in q for kw in ["size", "big", "large", "small", "space", "land", "sqm", "m2"]):
        land = f"{prop.land_size:.0f} m²" if prop.land_size else "not specified"
        return (
            f"This property offers {prop.bedrooms} bedrooms, {prop.bathrooms} bathrooms, "
            f"and {prop.car_spaces} car space(s). Land size: {land}. "
            f"Features: {features}."
        )

    # Investment
    if any(kw in q for kw in ["invest", "rental", "yield", "return", "rent"]):
        return (
            f"This property in {suburb} has strong investment potential. "
            f"Median rental yield in this suburb typically ranges from 3–5 %. "
            "I can share suburb market data to help you compare investment opportunities."
        )

    # Agent / inspection
    if any(kw in q for kw in ["inspect", "view", "agent", "contact", "open home"]):
        agent_name = prop.agent.name if prop.agent else "our agent"
        return (
            f"You can request an inspection through the enquiry form on this page. "
            f"{agent_name} will be in touch shortly to arrange a suitable time."
        )

    # Days on market
    if any(kw in q for kw in ["how long", "days on market", "listed"]):
        dom = prop.days_on_market
        return (
            f"This property has been on the market for {dom} day(s). "
            "The agent is actively reviewing offers."
        )

    # Fallback
    return (
        f"Great question! This {prop.property_type or 'property'} at {prop.address} "
        f"is listed at ${prop.price:,.0f} with {prop.bedrooms} bed / {prop.bathrooms} bath. "
        f"Features include: {features}. "
        "Feel free to ask me anything else about this property."
    )


def _score_behavior(lead: Lead, event: str) -> Lead:
    """Add a behaviour event and recalculate lead score / temperature."""
    if lead.behaviors is None:
        lead.behaviors = []
    lead.behaviors = list(lead.behaviors) + [event]

    # Simple heuristic scoring
    score = min(len(lead.behaviors) * 10, 100)
    lead.score = score
    if score >= 70:
        lead.temperature = "hot"
    elif score >= 40:
        lead.temperature = "warm"
    else:
        lead.temperature = "cold"
    return lead


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/history", response_model=List[ChatMessageRead])
def get_chat_history(
    property_id: int,
    session_id: str,
    db: Session = Depends(get_db),
):
    msgs = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.property_id == property_id,
            ChatMessage.session_id == session_id,
        )
        .order_by(ChatMessage.created_at)
        .all()
    )
    return msgs


@router.post("", response_model=ChatResponse)
def send_message(
    property_id: int,
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Persist user message
    user_msg = ChatMessage(
        property_id=property_id,
        session_id=payload.session_id,
        buyer_id=payload.buyer_id,
        role="user",
        content=payload.message,
    )
    db.add(user_msg)

    # Generate AI reply
    reply_text = _ai_reply(payload.message, prop)

    # Persist assistant message
    assistant_msg = ChatMessage(
        property_id=property_id,
        session_id=payload.session_id,
        buyer_id=payload.buyer_id,
        role="assistant",
        content=reply_text,
    )
    db.add(assistant_msg)
    db.commit()

    # Update CRM lead if buyer_id present
    if payload.buyer_id:
        lead = (
            db.query(Lead)
            .filter(
                Lead.buyer_id == payload.buyer_id,
                Lead.property_id == property_id,
            )
            .first()
        )
        if not lead:
            lead = Lead(
                buyer_id=payload.buyer_id,
                property_id=property_id,
                source="chat",
                next_action="Follow up with buyer after AI chat interaction",
            )
            db.add(lead)
            db.flush()
        _score_behavior(lead, f"chat_message: {payload.message[:60]}")
        db.commit()

    # Return last few messages for context
    msgs = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.property_id == property_id,
            ChatMessage.session_id == payload.session_id,
        )
        .order_by(ChatMessage.created_at)
        .all()
    )
    return ChatResponse(reply=reply_text, messages=msgs)
