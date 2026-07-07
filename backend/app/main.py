"""FastAPI application entry point."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models.models import Base
from app.routers import (
    admin,
    chat,
    contact,
    crm,
    enquiries,
    financial,
    guidance,
    market,
    properties,
    recommendations,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Real Estate AI Platform API",
    description=(
        "AI-driven real estate discovery and CRM platform. "
        "Combines property listings, AI chat assistant, buyer guidance engine, "
        "agent CRM, market insights, and financial planning."
    ),
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

_frontend_url = os.getenv("FRONTEND_URL", "")
_extra_origins = [o.strip() for o in os.getenv("EXTRA_ORIGINS", "").split(",") if o.strip()]

allowed_origins = list(filter(None, [
    _frontend_url,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    *_extra_origins,
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(properties.router)
app.include_router(chat.router)
app.include_router(enquiries.router)
app.include_router(guidance.router)
app.include_router(crm.router)
app.include_router(financial.router)
app.include_router(market.router)
app.include_router(recommendations.router)
app.include_router(contact.router)
app.include_router(admin.router)


@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "Real Estate AI Platform API",
        "version": "1.0.0",
    }
