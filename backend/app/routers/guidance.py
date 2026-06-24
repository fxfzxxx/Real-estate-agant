"""Buyer Guidance Engine – conversational intake + AI property matching.

The engine processes natural language messages from buyers, builds a
preference profile across multiple turns, and surfaces the best matching
listings. In production the intent extraction step would use an LLM; here
we use lightweight keyword heuristics so the service runs without any
external API keys.
"""
import re
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Buyer, Lead, Property
from app.models.schemas import GuidanceRequest, GuidanceResponse, PropertyRead

router = APIRouter(prefix="/guidance", tags=["guidance"])


# ---------------------------------------------------------------------------
# Context extraction helpers
# ---------------------------------------------------------------------------

def _extract_budget(text: str) -> Optional[tuple]:
    """Return (min, max) budget tuple or None."""
    # e.g. "between 700k and 900k", "up to 1.2m", "around 850000"
    text = text.lower().replace(",", "")

    range_m = re.search(
        r"between\s+\$?([\d.]+)\s*(?:k|m)?\s+and\s+\$?([\d.]+)\s*(k|m)?", text
    )
    if range_m:
        lo = float(range_m.group(1))
        hi = float(range_m.group(2))
        unit = range_m.group(3) or ""
        mult = 1_000_000 if unit == "m" else (1_000 if unit == "k" or lo < 1_000 else 1)
        return (lo * mult, hi * mult)

    single_m = re.search(
        r"(?:up to|around|about|max|budget|spend)\s+\$?([\d.]+)\s*(k|m)?", text
    )
    if single_m:
        val = float(single_m.group(1))
        unit = single_m.group(2) or ""
        mult = 1_000_000 if unit == "m" else (1_000 if unit == "k" or val < 10_000 else 1)
        amount = val * mult
        return (amount * 0.8, amount)

    return None


def _extract_bedrooms(text: str) -> Optional[int]:
    text = text.lower()
    m = re.search(r"(\d+)\s*(?:bed(?:room)?s?|br)", text)
    if m:
        return int(m.group(1))
    if "studio" in text:
        return 0
    return None


def _extract_suburbs(text: str) -> list:
    # Look for "in <Suburb>" or "near <Suburb>" patterns
    matches = re.findall(r"(?:in|near|around|suburb)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", text)
    return [m.strip() for m in matches]


def _extract_property_type(text: str) -> Optional[str]:
    text = text.lower()
    for pt in ["apartment", "house", "townhouse", "villa", "land", "unit"]:
        if pt in text:
            return pt
    return None


def _extract_lifestyle(text: str) -> list:
    tags = []
    kw_map = {
        "quiet": "quiet street",
        "school": "near schools",
        "family": "family friendly",
        "invest": "investment",
        "pool": "pool",
        "garage": "garage",
        "pet": "pet friendly",
        "garden": "garden",
        "public transport": "public transport",
        "beach": "near beach",
        "city": "city fringe",
        "first home": "first home buyer",
    }
    t = text.lower()
    for kw, tag in kw_map.items():
        if kw in t:
            tags.append(tag)
    return tags


def _match_properties(db: Session, ctx: dict, limit: int = 5) -> list:
    """Query DB for properties that best match the accumulated context."""
    q = db.query(Property).filter(Property.status == "active")

    if ctx.get("budget_max"):
        q = q.filter(Property.price <= ctx["budget_max"] * 1.1)
    if ctx.get("budget_min"):
        q = q.filter(Property.price >= ctx["budget_min"] * 0.9)
    if ctx.get("bedrooms_min"):
        q = q.filter(Property.bedrooms >= ctx["bedrooms_min"])
    if ctx.get("property_types"):
        q = q.filter(Property.property_type.in_(ctx["property_types"]))
    if ctx.get("preferred_suburbs"):
        q = q.filter(Property.suburb.in_(ctx["preferred_suburbs"]))

    return q.limit(limit).all()


def _determine_buyer_stage(ctx: dict) -> str:
    if ctx.get("budget_max") and ctx.get("preferred_suburbs") and ctx.get("bedrooms_min"):
        return "active"
    if ctx.get("budget_max") or ctx.get("preferred_suburbs"):
        return "semi_ready"
    return "future"


def _build_reply(ctx: dict, matched: list, message: str) -> str:  # noqa: C901
    msg_lower = message.lower()
    parts = []

    if not ctx:
        parts.append(
            "Hi! I'm here to help you find the perfect property. "
            "Let's start with a few questions – what's your budget range? "
            "And are you looking for a house, apartment, or something else?"
        )
        return " ".join(parts)

    if "budget" not in ctx and any(kw in msg_lower for kw in ["hello", "hi", "start", "help"]):
        return (
            "Great to meet you! To find your ideal home, could you share "
            "your approximate budget and the suburb(s) you're interested in?"
        )

    ack = []
    if ctx.get("budget_max"):
        ack.append(f"budget up to ${ctx['budget_max']:,.0f}")
    if ctx.get("bedrooms_min"):
        ack.append(f"{ctx['bedrooms_min']}+ bedrooms")
    if ctx.get("preferred_suburbs"):
        ack.append(f"suburb(s): {', '.join(ctx['preferred_suburbs'])}")
    if ctx.get("property_types"):
        ack.append(f"type: {ctx['property_types'][0]}")
    if ctx.get("lifestyle_tags"):
        ack.append(f"preferences: {', '.join(ctx['lifestyle_tags'])}")

    if ack:
        parts.append(f"Got it – I've noted your {'; '.join(ack)}.")

    if matched:
        parts.append(
            f"I found {len(matched)} propert{'ies' if len(matched) != 1 else 'y'} that match your criteria."
        )
        for prop in matched[:3]:
            parts.append(
                f"• {prop.title} – {prop.address}, ${prop.price:,.0f}, "
                f"{prop.bedrooms} bed / {prop.bathrooms} bath."
            )
        if len(matched) > 3:
            parts.append(f"…and {len(matched) - 3} more.")
    else:
        parts.append(
            "I don't have exact matches right now, but new listings are added regularly. "
            "Would you like me to notify you when something suitable comes up?"
        )

    if not ctx.get("preferred_suburbs"):
        parts.append("Which suburb or area are you most interested in?")
    elif not ctx.get("budget_max"):
        parts.append("Could you share your budget range so I can refine my suggestions?")
    elif not ctx.get("bedrooms_min"):
        parts.append("How many bedrooms are you looking for?")

    return " ".join(parts)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", response_model=GuidanceResponse)
def guidance_chat(payload: GuidanceRequest, db: Session = Depends(get_db)):
    ctx = payload.context or {}

    # Extract signals from latest message
    budget = _extract_budget(payload.message)
    if budget:
        ctx["budget_min"] = budget[0]
        ctx["budget_max"] = budget[1]

    beds = _extract_bedrooms(payload.message)
    if beds is not None:
        ctx["bedrooms_min"] = beds

    suburbs = _extract_suburbs(payload.message)
    if suburbs:
        existing = ctx.get("preferred_suburbs", [])
        ctx["preferred_suburbs"] = list(set(existing + suburbs))

    pt = _extract_property_type(payload.message)
    if pt:
        existing = ctx.get("property_types", [])
        if pt not in existing:
            ctx["property_types"] = existing + [pt]

    lifestyle = _extract_lifestyle(payload.message)
    if lifestyle:
        existing = ctx.get("lifestyle_tags", [])
        ctx["lifestyle_tags"] = list(set(existing + lifestyle))

    # Match properties
    matched = _match_properties(db, ctx)

    # Determine buyer stage
    stage = _determine_buyer_stage(ctx)

    # Update buyer profile in DB if buyer_id provided
    if payload.buyer_id:
        buyer = db.query(Buyer).filter(Buyer.id == payload.buyer_id).first()
        if buyer:
            if ctx.get("budget_min"):
                buyer.budget_min = ctx["budget_min"]
            if ctx.get("budget_max"):
                buyer.budget_max = ctx["budget_max"]
            if ctx.get("bedrooms_min"):
                buyer.bedrooms_min = ctx["bedrooms_min"]
            if ctx.get("preferred_suburbs"):
                buyer.preferred_suburbs = ctx["preferred_suburbs"]
            if ctx.get("property_types"):
                buyer.property_types = ctx["property_types"]
            if ctx.get("lifestyle_tags"):
                buyer.lifestyle_tags = ctx["lifestyle_tags"]
            buyer.buyer_stage = stage

            # Auto-create / update lead
            lead = db.query(Lead).filter(Lead.buyer_id == payload.buyer_id).first()
            if not lead:
                lead = Lead(
                    buyer_id=payload.buyer_id,
                    source="guidance_engine",
                    next_action="Review buyer guidance profile and send property matches",
                )
                db.add(lead)
            lead.behaviors = list(lead.behaviors or []) + [
                f"guidance_turn: {payload.message[:80]}"
            ]
            score = min(len(lead.behaviors) * 12, 100)
            lead.score = score
            lead.temperature = "hot" if score >= 70 else ("warm" if score >= 40 else "cold")
            db.commit()

    reply = _build_reply(ctx, matched, payload.message)

    return GuidanceResponse(
        reply=reply,
        matched_properties=[PropertyRead.model_validate(p) for p in matched],
        updated_context=ctx,
        buyer_stage=stage,
    )
