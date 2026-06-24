"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models.models import Base
from app.routers import chat, crm, enquiries, financial, guidance, market, properties


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
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(properties.router)
app.include_router(chat.router)
app.include_router(enquiries.router)
app.include_router(guidance.router)
app.include_router(crm.router)
app.include_router(financial.router)
app.include_router(market.router)


@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "Real Estate AI Platform API",
        "version": "1.0.0",
    }
