"""Pydantic schemas for request / response validation."""
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------

class AgentBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    agency: Optional[str] = None
    avatar_url: Optional[str] = None


class AgentCreate(AgentBase):
    pass


class AgentRead(AgentBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Properties
# ---------------------------------------------------------------------------

class PropertyBase(BaseModel):
    title: str
    description: Optional[str] = None
    address: str
    suburb: str
    state: str
    postcode: str
    price: float = Field(gt=0)
    bedrooms: int = 0
    bathrooms: int = 0
    car_spaces: int = 0
    land_size: Optional[float] = None
    property_type: Optional[str] = None
    status: str = "active"
    features: List[str] = []
    images: List[str] = []
    agent_id: Optional[int] = None
    days_on_market: int = 0


class PropertyCreate(PropertyBase):
    pass


class PropertyRead(PropertyBase):
    id: int
    created_at: datetime
    agent: Optional[AgentRead] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Buyers
# ---------------------------------------------------------------------------

class BuyerBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    preferred_suburbs: List[str] = []
    bedrooms_min: Optional[int] = None
    property_types: List[str] = []
    lifestyle_tags: List[str] = []
    buyer_stage: str = "future"


class BuyerCreate(BuyerBase):
    pass


class BuyerRead(BuyerBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Buyer Guidance Engine
# ---------------------------------------------------------------------------

class GuidanceRequest(BaseModel):
    """Conversational intake payload from buyer."""
    message: str
    session_id: str
    buyer_id: Optional[int] = None
    # Accumulated context from previous turns
    context: Optional[dict] = None


class GuidanceResponse(BaseModel):
    reply: str
    matched_properties: List[PropertyRead] = []
    updated_context: dict = {}
    buyer_stage: str = "future"


# ---------------------------------------------------------------------------
# Chat (per-listing AI assistant)
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    session_id: str
    buyer_id: Optional[int] = None


class ChatMessageRead(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    reply: str
    messages: List[ChatMessageRead] = []


# ---------------------------------------------------------------------------
# Enquiry Form
# ---------------------------------------------------------------------------

class EnquiryCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: Optional[str] = None


class EnquiryRead(EnquiryCreate):
    id: int
    property_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# CRM Leads
# ---------------------------------------------------------------------------

class LeadRead(BaseModel):
    id: int
    buyer_id: int
    agent_id: Optional[int]
    property_id: Optional[int]
    source: Optional[str]
    score: int
    temperature: str
    stage: str
    notes: Optional[str]
    next_action: Optional[str]
    next_action_due: Optional[datetime]
    behaviors: List[Any]
    created_at: datetime
    buyer: Optional[BuyerRead]

    model_config = {"from_attributes": True}


class LeadUpdate(BaseModel):
    score: Optional[int] = None
    temperature: Optional[str] = None
    stage: Optional[str] = None
    notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_due: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Financial Planning
# ---------------------------------------------------------------------------

class FinancialProfileCreate(BaseModel):
    buyer_id: int
    annual_income: float = Field(gt=0)
    monthly_expenses: float = Field(ge=0)
    current_savings: float = Field(ge=0)
    monthly_savings_rate: float = Field(ge=0)
    deposit_target_pct: float = 0.20
    target_purchase_price: Optional[float] = None
    has_existing_debt: bool = False
    debt_monthly: float = 0.0
    first_home_buyer: bool = True


class FinancialProfileRead(FinancialProfileCreate):
    id: int
    estimated_borrowing_power: Optional[float]
    estimated_ready_months: Optional[int]
    estimated_ready_price_min: Optional[float]
    estimated_ready_price_max: Optional[float]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AffordabilityEstimate(BaseModel):
    borrowing_power: float
    estimated_ready_months: int
    ready_price_min: float
    ready_price_max: float
    deposit_needed: float
    current_savings_gap: float
    months_to_deposit: int
    message: str


# ---------------------------------------------------------------------------
# Trending properties (client chat / landing)
# ---------------------------------------------------------------------------

class TrendingProperty(BaseModel):
    property: PropertyRead
    likes: int
    enquiries: int


# ---------------------------------------------------------------------------
# Property Swipes (discovery mode)
# ---------------------------------------------------------------------------

class SwipeCreate(BaseModel):
    property_id: int
    session_id: str
    liked: bool
    buyer_id: Optional[int] = None


class SwipeRead(SwipeCreate):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Contact Messages
# ---------------------------------------------------------------------------

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: Optional[str] = None
    source: str = "contact_page"
    preferences: dict = {}


class ContactMessageRead(ContactMessageCreate):
    id: int
    handled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Agent Actions (admin dashboard)
# ---------------------------------------------------------------------------

class AgentActionRead(BaseModel):
    id: int
    title: str
    description: Optional[str]
    category: str
    priority: str
    status: str
    lead_id: Optional[int]
    property_id: Optional[int]
    created_at: datetime
    resolved_at: Optional[datetime]

    model_config = {"from_attributes": True}


class AgentActionUpdate(BaseModel):
    status: str  # pending | done | dismissed | deferred


class ActionSummary(BaseModel):
    pending: int
    done: int
    dismissed: int
    deferred: int


# ---------------------------------------------------------------------------
# Admin dashboard aggregates
# ---------------------------------------------------------------------------

class CommunicationItem(BaseModel):
    kind: str          # enquiry | contact_message | chat_session
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    summary: Optional[str] = None
    property_id: Optional[int] = None
    property_title: Optional[str] = None
    created_at: datetime


class AdminSummary(BaseModel):
    enquiries_count: int
    contact_messages_count: int
    chat_sessions_count: int
    likes_count: int
    dislikes_count: int
    leads_count: int
    hot_leads_count: int
    recent_communications: List[CommunicationItem] = []


class PropertyPopularity(BaseModel):
    property: PropertyRead
    likes: int
    dislikes: int
    enquiries: int
    chat_messages: int
    popularity_score: int


class DealStage(BaseModel):
    stage: str
    leads: List[LeadRead] = []


# ---------------------------------------------------------------------------
# Market Insights
# ---------------------------------------------------------------------------

class MarketSnapshotRead(BaseModel):
    id: int
    suburb: str
    state: str
    median_price: Optional[float]
    avg_days_on_market: Optional[float]
    quarterly_growth_pct: Optional[float]
    annual_growth_pct: Optional[float]
    listings_count: int
    recorded_at: datetime

    model_config = {"from_attributes": True}
