"""SQLAlchemy ORM models for the Real Estate platform."""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Property Listings
# ---------------------------------------------------------------------------

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    address = Column(String(500), nullable=False)
    suburb = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    postcode = Column(String(10), nullable=False)
    price = Column(Float, nullable=False)
    bedrooms = Column(Integer, default=0)
    bathrooms = Column(Integer, default=0)
    car_spaces = Column(Integer, default=0)
    land_size = Column(Float)          # m²
    property_type = Column(String(50))  # house, apartment, townhouse, land
    status = Column(String(50), default="active")  # active, sold, leased
    features = Column(JSON, default=list)          # ["Pool", "Garage", ...]
    images = Column(JSON, default=list)            # list of image URLs
    agent_id = Column(Integer, ForeignKey("agents.id"))
    days_on_market = Column(Integer, default=0)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    agent = relationship("Agent", back_populates="listings")
    enquiries = relationship("Enquiry", back_populates="property")
    chat_messages = relationship("ChatMessage", back_populates="property")


# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50))
    agency = Column(String(255))
    avatar_url = Column(String(500))
    created_at = Column(DateTime, default=_utcnow)

    listings = relationship("Property", back_populates="agent")
    leads = relationship("Lead", back_populates="agent")


# ---------------------------------------------------------------------------
# Buyers / Users
# ---------------------------------------------------------------------------

class Buyer(Base):
    __tablename__ = "buyers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50))
    # Buyer preferences collected via guidance engine
    budget_min = Column(Float)
    budget_max = Column(Float)
    preferred_suburbs = Column(JSON, default=list)
    bedrooms_min = Column(Integer)
    property_types = Column(JSON, default=list)
    lifestyle_tags = Column(JSON, default=list)  # ["school zone", "quiet", ...]
    # Buyer status
    buyer_stage = Column(String(50), default="future")  # active | semi_ready | future
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    leads = relationship("Lead", back_populates="buyer")
    financial_profile = relationship(
        "FinancialProfile", back_populates="buyer", uselist=False
    )
    chat_messages = relationship("ChatMessage", back_populates="buyer")


# ---------------------------------------------------------------------------
# CRM – Leads
# ---------------------------------------------------------------------------

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("agents.id"))
    property_id = Column(Integer, ForeignKey("properties.id"))
    source = Column(String(100))     # chat, enquiry_form, guidance_engine, financial_planner
    score = Column(Integer, default=0)           # 0-100 intent score
    temperature = Column(String(20), default="cold")  # hot | warm | cold
    stage = Column(String(50), default="new")        # new | contacted | viewing | offer | closed
    notes = Column(Text)
    next_action = Column(String(255))
    next_action_due = Column(DateTime)
    behaviors = Column(JSON, default=list)        # log of behavior events
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    buyer = relationship("Buyer", back_populates="leads")
    agent = relationship("Agent", back_populates="leads")
    property = relationship("Property")


# ---------------------------------------------------------------------------
# Enquiry Forms
# ---------------------------------------------------------------------------

class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50))
    message = Column(Text)
    created_at = Column(DateTime, default=_utcnow)

    property = relationship("Property", back_populates="enquiries")


# ---------------------------------------------------------------------------
# Chat Messages (per-listing AI chat)
# ---------------------------------------------------------------------------

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("buyers.id"))
    session_id = Column(String(100))    # anonymous session identifier
    role = Column(String(20), nullable=False)   # user | assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_utcnow)

    property = relationship("Property", back_populates="chat_messages")
    buyer = relationship("Buyer", back_populates="chat_messages")


# ---------------------------------------------------------------------------
# Financial Planning Profile
# ---------------------------------------------------------------------------

class FinancialProfile(Base):
    __tablename__ = "financial_profiles"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), unique=True, nullable=False)
    annual_income = Column(Float)
    monthly_expenses = Column(Float)
    current_savings = Column(Float)
    monthly_savings_rate = Column(Float)
    deposit_target_pct = Column(Float, default=0.20)  # 20 % deposit
    target_purchase_price = Column(Float)
    has_existing_debt = Column(Boolean, default=False)
    debt_monthly = Column(Float, default=0.0)
    first_home_buyer = Column(Boolean, default=True)
    # Computed / stored estimates
    estimated_borrowing_power = Column(Float)
    estimated_ready_months = Column(Integer)
    estimated_ready_price_min = Column(Float)
    estimated_ready_price_max = Column(Float)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    buyer = relationship("Buyer", back_populates="financial_profile")


# ---------------------------------------------------------------------------
# Market Data (Suburb Snapshots)
# ---------------------------------------------------------------------------

class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    suburb = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    median_price = Column(Float)
    avg_days_on_market = Column(Float)
    quarterly_growth_pct = Column(Float)
    annual_growth_pct = Column(Float)
    listings_count = Column(Integer, default=0)
    recorded_at = Column(DateTime, default=_utcnow)
