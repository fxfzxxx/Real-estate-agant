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
│   │       ├── properties.py       # Property listings CRUD + popular ranking
│   │       ├── chat.py             # AI property chat assistant
│   │       ├── guidance.py         # Buyer guidance engine (AI matching)
│   │       ├── recommendations.py  # Discovery swipe deck (like / dislike)
│   │       ├── contact.py          # Contact capture (form + chat details)
│   │       ├── crm.py              # Agent CRM (leads, buyers, agents)
│   │       ├── admin.py            # Admin summary, popularity, deals, AI actions
│   │       ├── financial.py        # Financial planning & affordability
│   │       ├── market.py           # Market insights (suburb snapshots)
│   │       └── enquiries.py        # Enquiry capture forms
│   ├── tests/
│   │   └── test_api.py       # 40 API integration tests
│   └── requirements.txt
└── frontend/         # Next.js 14 + TypeScript + Tailwind CSS
    └── src/
        ├── app/
        │   ├── (client)/                 # CLIENT SITE (buyer-facing)
        │   │   ├── page.tsx              # AI chat landing (greeting + popular listings)
        │   │   ├── browse/               # Browse properties (bento gallery + filters)
        │   │   ├── browse/[id]/          # Property detail + AI chat
        │   │   ├── discover/             # Discovery swipe (like / pass deck)
        │   │   ├── contact/              # Contact page (leave a message)
        │   │   └── financial/            # Financial readiness planner
        │   └── admin/                    # ADMIN SITE (agent-facing)
        │       ├── page.tsx              # AI dashboard (recommended actions)
        │       ├── inbox/                # Communications summary
        │       ├── properties/           # Property popularity analytics
        │       ├── deals/                # Deals pipeline by stage
        │       ├── leads/                # Lead management (CRM)
        │       └── market/               # Market insights dashboard
        ├── components/
        │   ├── layout/ClientNav.tsx      # Client top/bottom navigation
        │   ├── layout/AdminNav.tsx       # Admin sidebar navigation
        │   ├── property/PropertyTile.tsx # Stitch-styled property card
        │   ├── property/PropertyCard.tsx
        │   ├── chat/HomeChat.tsx         # Landing AI chat w/ contact capture
        │   └── chat/ChatWidget.tsx
        ├── lib/api.ts        # Typed API client
        ├── lib/session.ts    # Anonymous session + stored contact
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

The frontend is split into two sites sharing one backend:

- **Client site** (`/`) — buyer-facing: AI chat landing, browse, discovery swipe, contact
- **Admin site** (`/admin`) — agent-facing: AI action dashboard, inbox, popularity, deals, leads, market

### Client site

#### 1. 💬 AI Chat Landing (`/`)
- Lands on a conversational AI greeting with the most popular properties shown by default
- Extracts budget, suburbs, bedrooms and lifestyle preferences from natural language
- Prompts visitors to leave their name / email / phone; details shared in chat are
  captured automatically and create a CRM lead with the accumulated preferences

#### 2. 🏡 Browse Properties (`/browse`)
- Bento-style gallery (featured hero + cards) with suburb, price band, and type filters
- One-tap switch into Discovery Swipe mode

#### 3. 🃏 Discovery Swipe (`/discover`)
- Random recommendation deck: swipe right to like, left to pass (drag on touch,
  buttons on desktop)
- Likes build a shortlist, feed property popularity analytics, and enrich the
  buyer's preference profile for agent follow-up

#### 4. ✉️ Contact (`/contact`)
- Leave a message with name / email / phone — creates a contact record and CRM lead
- Call / text / email shortcuts

### Admin site

#### 5. 🤖 AI Dashboard (`/admin`)
- AI-recommended actions generated from client activity: follow up hot leads, chase
  deals at offer stage, respond to new contacts, advertise stale listings
- Every action is agent-triggered: **Do / Defer / Skip**, with reopen — plus a summary
  of actions done and still to do
- Live counters for hot leads, enquiries, messages, chat sessions, likes

#### 6. 📥 Communications Inbox (`/admin/inbox`)
- Summary of everything clients left on the site: property enquiries, contact
  messages (incl. details captured in chat) and chat/swipe activity counts

#### 7. 📈 Property Popularity (`/admin/properties`)
- Per-listing likes, passes, enquiries and chat engagement rolled into a popularity score

#### 8. 🤝 Deals Pipeline (`/admin/deals`)
- Every lead by stage (`new → contacted → viewing → offer → closed`) at a glance

### Shared / legacy features

#### 9. 💬 AI Property Chat Assistant (`/browse/[id]` → Chat tab)
- Per-listing conversational AI that answers buyer questions using listing data
- Handles: family suitability, price, size, investment potential, comparable homes, inspections
- Every chat interaction is logged to the CRM and updates the lead's intent score
- **Production note:** Replace `_ai_reply()` in `backend/app/routers/chat.py` with an LLM call (e.g. OpenAI) — the property context is already structured for injection as a system prompt

### 10. 📊 Market Insights Dashboard (`/admin/market`)
- Suburb-level: median price, days on market, quarterly & annual growth, listing count
- Comparable listings per property (±20% price in same suburb)
- Accessible from each property detail page via the "Market" tab

### 11. 🗂 Lead Management (`/admin/leads`)
- Full lead pipeline: `new → contacted → viewing → offer → closed`
- Intent score (0–100) derived from buyer behaviour events
- Temperature classification: 🔥 hot / 🌡 warm / ❄️ cold
- One-click action logging (Call / Email / Showing / Offer) with AI-suggested next action
- All buyer interactions across chat, guidance, enquiries, and financial planner auto-create/update leads

### 12. 💰 Financial Readiness Planner (`/financial`)
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
# 40 tests covering: properties, chat, guidance, CRM, enquiries, financial, market,
# recommendations/swipes, contact capture, and admin actions
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
