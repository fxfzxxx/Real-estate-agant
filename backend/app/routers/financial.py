"""Financial Planning & Buyer Readiness endpoints.

Helps non-ready buyers understand affordability, track savings progress,
and get a personalised timeline to purchase. All engaged buyers stay
connected to their assigned agent throughout the journey.
"""
import math
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Buyer, FinancialProfile, Lead
from app.models.schemas import (
    AffordabilityEstimate,
    FinancialProfileCreate,
    FinancialProfileRead,
)

router = APIRouter(prefix="/financial", tags=["financial"])

# ---------------------------------------------------------------------------
# Affordability calculation helpers
# ---------------------------------------------------------------------------

_INTEREST_RATE = 0.0625       # 6.25 % p.a. indicative rate
_LOAN_TERM_YEARS = 30
_STRESS_BUFFER = 0.03         # +3 % stress test buffer
_EXPENSE_RATIO = 0.35         # assume 35 % of net income covers living costs if not provided


def _monthly_rate(annual_rate: float) -> float:
    return annual_rate / 12


def _max_loan(monthly_repayment: float, annual_rate: float, years: int) -> float:
    """PV of annuity: present value of a fixed monthly repayment."""
    r = _monthly_rate(annual_rate)
    n = years * 12
    if r == 0:
        return monthly_repayment * n
    return monthly_repayment * (1 - (1 + r) ** -n) / r


def calculate_affordability(profile: FinancialProfileCreate) -> AffordabilityEstimate:
    # Monthly net income (rough approximation after 32 % effective tax)
    net_monthly = (profile.annual_income * 0.68) / 12

    # Disposable income for mortgage
    living_costs = profile.monthly_expenses or (net_monthly * _EXPENSE_RATIO)
    debt_costs = profile.debt_monthly or 0.0
    disposable = net_monthly - living_costs - debt_costs

    # Stress-tested borrowing power
    stressed_rate = _INTEREST_RATE + _STRESS_BUFFER
    max_repayment = max(disposable * 0.85, 0)   # 85 % of disposable for mortgage
    borrowing_power = _max_loan(max_repayment, stressed_rate, _LOAN_TERM_YEARS)

    # Deposit calculations
    deposit_pct = profile.deposit_target_pct or 0.20
    target_price = profile.target_purchase_price or (borrowing_power / (1 - deposit_pct))
    deposit_needed = target_price * deposit_pct
    stamp_duty_approx = target_price * 0.03    # ~3 % simplistic estimate
    total_upfront = deposit_needed + stamp_duty_approx

    savings_gap = max(total_upfront - profile.current_savings, 0)
    monthly_savings = profile.monthly_savings_rate or 0
    months_to_deposit = (
        math.ceil(savings_gap / monthly_savings) if monthly_savings > 0 else 999
    )

    # Ready price range
    ready_price_min = (profile.current_savings + monthly_savings * months_to_deposit) / deposit_pct * 0.85
    ready_price_max = target_price * 1.1

    # Overall readiness months
    ready_months = months_to_deposit

    # Build human-readable message
    if savings_gap <= 0:
        message = (
            f"Great news – based on your savings of ${profile.current_savings:,.0f} "
            f"you already have the deposit for a home up to ${target_price:,.0f}. "
            f"Your estimated borrowing power is ${borrowing_power:,.0f}. "
            "You may be ready to buy now!"
        )
    else:
        years_str = f"{ready_months // 12} year(s) and {ready_months % 12} month(s)" if ready_months < 999 else "more than 83 years"
        message = (
            f"Based on your income of ${profile.annual_income:,.0f}/year and a savings rate of "
            f"${monthly_savings:,.0f}/month, you may be ready to purchase in approximately "
            f"{years_str} in the ${ready_price_min:,.0f}–${ready_price_max:,.0f} price range. "
            f"Your estimated borrowing power is ${borrowing_power:,.0f}."
        )

    return AffordabilityEstimate(
        borrowing_power=round(borrowing_power, 2),
        estimated_ready_months=ready_months,
        ready_price_min=round(ready_price_min, 2),
        ready_price_max=round(ready_price_max, 2),
        deposit_needed=round(deposit_needed, 2),
        current_savings_gap=round(savings_gap, 2),
        months_to_deposit=months_to_deposit,
        message=message,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/estimate", response_model=AffordabilityEstimate)
def estimate_affordability(payload: FinancialProfileCreate):
    """Calculate affordability without saving to DB – quick estimate."""
    return calculate_affordability(payload)


@router.post("/profiles", response_model=FinancialProfileRead, status_code=201)
def create_profile(payload: FinancialProfileCreate, db: Session = Depends(get_db)):
    buyer = db.query(Buyer).filter(Buyer.id == payload.buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    # Check existing
    existing = (
        db.query(FinancialProfile)
        .filter(FinancialProfile.buyer_id == payload.buyer_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Financial profile already exists for this buyer. Use PUT to update.",
        )

    estimate = calculate_affordability(payload)

    fp = FinancialProfile(
        **payload.model_dump(),
        estimated_borrowing_power=estimate.borrowing_power,
        estimated_ready_months=estimate.estimated_ready_months,
        estimated_ready_price_min=estimate.ready_price_min,
        estimated_ready_price_max=estimate.ready_price_max,
    )
    db.add(fp)

    # Update buyer stage
    if estimate.estimated_ready_months <= 0:
        buyer.buyer_stage = "active"
    elif estimate.estimated_ready_months <= 12:
        buyer.buyer_stage = "semi_ready"
    else:
        buyer.buyer_stage = "future"

    # Create / update CRM lead for the future buyer
    lead = db.query(Lead).filter(Lead.buyer_id == payload.buyer_id).first()
    if not lead:
        lead = Lead(
            buyer_id=payload.buyer_id,
            source="financial_planner",
            next_action="Send periodic market updates and affordability check-ins",
        )
        db.add(lead)
    else:
        behaviors = list(lead.behaviors or [])
        behaviors.append("financial_profile_created")
        lead.behaviors = behaviors
        lead.score = max(lead.score, 20)

    db.commit()
    db.refresh(fp)
    return fp


@router.get("/profiles/{buyer_id}", response_model=FinancialProfileRead)
def get_profile(buyer_id: int, db: Session = Depends(get_db)):
    fp = (
        db.query(FinancialProfile)
        .filter(FinancialProfile.buyer_id == buyer_id)
        .first()
    )
    if not fp:
        raise HTTPException(status_code=404, detail="Financial profile not found")
    return fp


@router.put("/profiles/{buyer_id}", response_model=FinancialProfileRead)
def update_profile(
    buyer_id: int,
    payload: FinancialProfileCreate,
    db: Session = Depends(get_db),
):
    fp = (
        db.query(FinancialProfile)
        .filter(FinancialProfile.buyer_id == buyer_id)
        .first()
    )
    if not fp:
        raise HTTPException(status_code=404, detail="Financial profile not found")

    estimate = calculate_affordability(payload)

    for k, v in payload.model_dump().items():
        setattr(fp, k, v)

    fp.estimated_borrowing_power = estimate.borrowing_power
    fp.estimated_ready_months = estimate.estimated_ready_months
    fp.estimated_ready_price_min = estimate.ready_price_min
    fp.estimated_ready_price_max = estimate.ready_price_max

    db.commit()
    db.refresh(fp)
    return fp
