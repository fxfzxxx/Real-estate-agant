# PropAI – AI-Driven Real Estate Discovery & CRM Platform

A conversational AI real estate platform that combines **listing discovery**, **buyer education**, and **agent CRM automation** into one integrated system — from first search to settlement.

---

## 🏗 Architecture

```
Real-estate-agant/
├── backend/          # Python FastAPI REST API + SQLite
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── database.py       # SQLAlchemy engine & session
│   │   ├── seed.py           # Demo data seeder
│   │   ├── models/
│   │   │   ├── models.py     # ORM models
│   │   │   └── schemas.py    # Pydantic schemas
│   │   └── routers/
│   │       ├── properties.py  # Property listings CRUD
│   │       ├── chat.py        # AI property chat assistant
│   │       ├── guidance.py    # Buyer guidance engine (AI matching)
│   │       ├── crm.py         # Agent CRM (leads, buyers, agents)
│   │       ├── financial.py   # Financial planning & affordability
│   │       ├── market.py      # Market insights (suburb snapshots)
│   │       └── enquiries.py   # Enquiry capture forms
│   ├── tests/
│   │   └── test_api.py       # 28 API integration tests
│   └── requirements.txt
└── frontend/         # Next.js 14 + TypeScript + Tailwind CSS
    └── src/
        ├── app/
        │   ├── page.tsx              # Home page
        │   ├── listings/             # Property listing portal
        │   ├── listings/[id]/        # Property detail + AI chat
        │   ├── guidance/             # AI buyer guidance engine
        │   ├── market/               # Market insights dashboard
        │   ├── financial/            # Financial readiness planner
        │   └── crm/                  # Agent CRM dashboard
        ├── components/
        │   ├── property/PropertyCard.tsx
        │   ├── chat/ChatWidget.tsx
        │   ├── guidance/GuidanceChat.tsx
        │   └── financial/FinancialPlanner.tsx
        ├── lib/api.ts    # Typed API client
        └── types/index.ts
```

---

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt

# Seed demo data (listings, agents, market snapshots)
python -m app.seed

# Start API server (http://localhost:8000)
uvicorn app.main:app --reload
```

API docs available at **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local      # set NEXT_PUBLIC_API_URL if needed
npm install
npm run dev                     # http://localhost:3000
```

---

## 🧩 Platform Features

### 1. 🏡 Property Listing Portal (`/listings`)
- Browse active listings with filters: suburb, type, price range, bedrooms
- Each listing has an enquiry capture form that auto-creates a CRM lead

### 2. 💬 AI Property Chat Assistant (`/listings/[id]` → Chat tab)
- Per-listing conversational AI that answers buyer questions using listing data
- Handles: family suitability, price, size, investment potential, comparable homes, inspections
- Every chat interaction is logged to the CRM and updates the lead's intent score
- **Production note:** Replace `_ai_reply()` in `backend/app/routers/chat.py` with an LLM call (e.g. OpenAI) — the property context is already structured for injection as a system prompt

### 3. 🧠 Buyer Guidance Engine (`/guidance`)
- Conversational intake: budget, suburb, bedroom count, property type, lifestyle preferences
- AI extracts preferences from natural language and surfaces matched listings in real time
- Classifies buyers as **active** / **semi-ready** / **future** based on profile completeness

### 4. 📊 Market Insights Dashboard (`/market`)
- Suburb-level: median price, days on market, quarterly & annual growth, listing count
- Comparable listings per property (±20% price in same suburb)
- Accessible from each property detail page via the "Market" tab

### 5. 🤖 Agentic CRM (`/crm`)
- Full lead pipeline: `new → contacted → viewing → offer → closed`
- Intent score (0–100) derived from buyer behaviour events
- Temperature classification: 🔥 hot / 🌡 warm / ❄️ cold
- One-click action logging (Call / Email / Showing / Offer) with AI-suggested next action
- All buyer interactions across chat, guidance, enquiries, and financial planner auto-create/update leads

### 6. 💰 Financial Readiness Planner (`/financial`)
- Estimates borrowing power using stress-tested interest rate (6.25% + 3% buffer)
- Calculates months to deposit target based on current savings + monthly savings rate
- Generates personalised readiness timeline and purchase price range
- Saves a financial profile to the CRM so the agent stays connected to future buyers

---

## 🔄 End-to-End Buyer Journey

```
Buyer chats or browses listing
       ↓
AI interprets intent + preferences
       ↓
System recommends best properties
       ↓
Buyer asks questions via property chat assistant
       ↓
AI answers using listing + market data
       ↓
CRM logs behaviour + scores lead
       ↓
High-intent leads flagged to agent
       ↓
Agent follows up and closes deal
```

**For future buyers:**
```
User joins portal (not ready to buy)
       ↓
Financial readiness profile created
       ↓
AI tracks savings + engagement over time
       ↓
Occasional property updates sent (low pressure)
       ↓
User becomes "ready buyer"
       ↓
Agent already owns the relationship
```

---

## 🧪 Running Tests

```bash
cd backend
python -m pytest tests/test_api.py -v
# 28 tests covering: properties, chat, guidance, CRM, enquiries, financial, market
```

---

## 🔮 Production Considerations

| Area | Current | Production |
|------|---------|------------|
| Database | SQLite | PostgreSQL |
| AI chat | Rule-based heuristics | OpenAI / Anthropic LLM |
| Auth | None | JWT / OAuth2 |
| File uploads | URL strings | S3 / object storage |
| Email follow-ups | Not implemented | SendGrid / SES |
| Deployment | Local | Docker + cloud |

To wire up an LLM for the chat assistant, replace `_ai_reply()` in `backend/app/routers/chat.py` with an OpenAI ChatCompletion call — the property object is already structured to pass as a system prompt context.
