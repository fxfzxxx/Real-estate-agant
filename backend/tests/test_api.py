"""Backend tests using FastAPI TestClient with an in-memory SQLite database."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.models import Agent, Property, MarketSnapshot

# ---------------------------------------------------------------------------
# Test database setup
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite://"   # in-memory

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    yield db
    db.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed_agent(db) -> Agent:
    agent = Agent(
        name="Test Agent",
        email="agent@test.com",
        phone="0400000000",
        agency="Test Agency",
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


def _seed_property(db, agent_id: int) -> Property:
    prop = Property(
        title="Test House",
        address="1 Test Street, Kew VIC 3101",
        suburb="Kew",
        state="VIC",
        postcode="3101",
        price=900_000,
        bedrooms=3,
        bathrooms=2,
        car_spaces=1,
        property_type="house",
        features=["Pool", "Garden"],
        agent_id=agent_id,
        days_on_market=10,
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


# ===========================================================================
# Property tests
# ===========================================================================

class TestProperties:
    def test_list_properties_empty(self, client):
        r = client.get("/properties")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_and_retrieve_property(self, client, db_session):
        agent = _seed_agent(db_session)
        payload = {
            "title": "My House",
            "address": "5 Oak Ave, Richmond VIC 3121",
            "suburb": "Richmond",
            "state": "VIC",
            "postcode": "3121",
            "price": 1_200_000,
            "bedrooms": 4,
            "bathrooms": 2,
            "car_spaces": 2,
            "property_type": "house",
            "features": ["Pool"],
            "images": [],
            "agent_id": agent.id,
            "days_on_market": 5,
        }
        r = client.post("/properties", json=payload)
        assert r.status_code == 201
        data = r.json()
        assert data["title"] == "My House"
        assert data["price"] == 1_200_000

        r2 = client.get(f"/properties/{data['id']}")
        assert r2.status_code == 200
        assert r2.json()["suburb"] == "Richmond"

    def test_filter_by_suburb(self, client, db_session):
        agent = _seed_agent(db_session)
        _seed_property(db_session, agent.id)   # Kew
        r = client.get("/properties", params={"suburb": "Kew"})
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["suburb"] == "Kew"

    def test_filter_by_price_range(self, client, db_session):
        agent = _seed_agent(db_session)
        _seed_property(db_session, agent.id)   # 900k
        r = client.get("/properties", params={"price_min": 800_000, "price_max": 950_000})
        assert r.status_code == 200
        assert len(r.json()) == 1

        r2 = client.get("/properties", params={"price_min": 1_000_000})
        assert r2.status_code == 200
        assert len(r2.json()) == 0

    def test_404_on_missing_property(self, client):
        r = client.get("/properties/9999")
        assert r.status_code == 404

    def test_update_property(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)

        update = {
            "title": "Updated House",
            "address": prop.address,
            "suburb": prop.suburb,
            "state": prop.state,
            "postcode": prop.postcode,
            "price": 950_000,
            "bedrooms": prop.bedrooms,
            "bathrooms": prop.bathrooms,
            "car_spaces": prop.car_spaces,
            "property_type": prop.property_type,
            "features": prop.features,
            "images": [],
            "agent_id": agent.id,
            "days_on_market": prop.days_on_market,
        }
        r = client.put(f"/properties/{prop.id}", json=update)
        assert r.status_code == 200
        assert r.json()["title"] == "Updated House"
        assert r.json()["price"] == 950_000

    def test_delete_property(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)
        r = client.delete(f"/properties/{prop.id}")
        assert r.status_code == 204
        r2 = client.get(f"/properties/{prop.id}")
        assert r2.status_code == 404


# ===========================================================================
# Chat tests
# ===========================================================================

class TestChat:
    def test_chat_basic(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)

        r = client.post(
            f"/properties/{prop.id}/chat",
            json={"message": "Is this good for a family?", "session_id": "sess-001"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "reply" in data
        assert len(data["reply"]) > 0
        assert "messages" in data

    def test_chat_price_question(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)

        r = client.post(
            f"/properties/{prop.id}/chat",
            json={"message": "What is the price?", "session_id": "sess-002"},
        )
        assert r.status_code == 200
        reply = r.json()["reply"]
        assert "900,000" in reply or "$900" in reply

    def test_chat_invalid_property(self, client):
        r = client.post(
            "/properties/9999/chat",
            json={"message": "Hello", "session_id": "sess-003"},
        )
        assert r.status_code == 404

    def test_chat_history(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)
        session_id = "sess-hist-001"

        client.post(
            f"/properties/{prop.id}/chat",
            json={"message": "Tell me about this property", "session_id": session_id},
        )
        client.post(
            f"/properties/{prop.id}/chat",
            json={"message": "How many bedrooms?", "session_id": session_id},
        )

        r = client.get(
            f"/properties/{prop.id}/chat/history",
            params={"session_id": session_id},
        )
        assert r.status_code == 200
        msgs = r.json()
        # 2 user msgs + 2 assistant replies = 4 messages
        assert len(msgs) == 4


# ===========================================================================
# Guidance engine tests
# ===========================================================================

class TestGuidance:
    def test_initial_greeting(self, client):
        r = client.post(
            "/guidance",
            json={"message": "Hello", "session_id": "g-001"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "reply" in data
        assert "updated_context" in data

    def test_budget_extraction(self, client, db_session):
        agent = _seed_agent(db_session)
        _seed_property(db_session, agent.id)  # 900k

        r = client.post(
            "/guidance",
            json={
                "message": "My budget is around 900k and I want a house in Kew with 3 bedrooms",
                "session_id": "g-002",
            },
        )
        assert r.status_code == 200
        data = r.json()
        ctx = data["updated_context"]
        assert ctx.get("budget_max") is not None
        assert ctx.get("bedrooms_min") == 3

    def test_buyer_stage_active(self, client, db_session):
        agent = _seed_agent(db_session)
        _seed_property(db_session, agent.id)

        r = client.post(
            "/guidance",
            json={
                "message": "Looking in Kew, budget 900k, want 3 bedrooms house",
                "session_id": "g-003",
                "context": {
                    "budget_max": 900_000,
                    "preferred_suburbs": ["Kew"],
                    "bedrooms_min": 3,
                },
            },
        )
        assert r.status_code == 200
        assert r.json()["buyer_stage"] == "active"


# ===========================================================================
# CRM tests
# ===========================================================================

class TestCRM:
    def test_create_agent(self, client):
        r = client.post(
            "/crm/agents",
            json={
                "name": "Alice Smith",
                "email": "alice@agency.com",
                "phone": "0400111222",
                "agency": "ABC Realty",
            },
        )
        assert r.status_code == 201
        assert r.json()["name"] == "Alice Smith"

    def test_create_and_list_buyers(self, client):
        client.post(
            "/crm/buyers",
            json={
                "name": "Bob Jones",
                "email": "bob@test.com",
                "buyer_stage": "active",
            },
        )
        r = client.get("/crm/buyers")
        assert r.status_code == 200
        names = [b["name"] for b in r.json()]
        assert "Bob Jones" in names

    def test_lead_list_sorted_by_score(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)

        # Create buyer and submit enquiry (auto-creates lead)
        client.post(
            f"/properties/{prop.id}/enquiries",
            json={
                "name": "Lead Buyer",
                "email": "leadbuyer@test.com",
                "message": "Interested!",
            },
        )
        r = client.get("/crm/leads")
        assert r.status_code == 200
        leads = r.json()
        assert len(leads) >= 1
        assert leads[0]["score"] >= 0

    def test_update_lead(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)

        client.post(
            f"/properties/{prop.id}/enquiries",
            json={"name": "Update Buyer", "email": "update@test.com"},
        )
        leads = client.get("/crm/leads").json()
        lead_id = leads[0]["id"]

        r = client.patch(
            f"/crm/leads/{lead_id}",
            json={"stage": "viewing", "notes": "Showed property – very interested"},
        )
        assert r.status_code == 200
        assert r.json()["stage"] == "viewing"

    def test_log_crm_action(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)
        client.post(
            f"/properties/{prop.id}/enquiries",
            json={"name": "Action Buyer", "email": "action@test.com"},
        )
        leads = client.get("/crm/leads").json()
        lead_id = leads[0]["id"]

        r = client.post(f"/crm/leads/{lead_id}/actions", params={"action": "call"})
        assert r.status_code == 200
        data = r.json()
        assert data["next_action"] is not None


# ===========================================================================
# Enquiry tests
# ===========================================================================

class TestEnquiries:
    def test_submit_enquiry_creates_lead(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)

        r = client.post(
            f"/properties/{prop.id}/enquiries",
            json={
                "name": "Jane Doe",
                "email": "jane@test.com",
                "phone": "0411222333",
                "message": "Very interested in this property!",
            },
        )
        assert r.status_code == 201
        assert r.json()["email"] == "jane@test.com"

        # Lead should have been auto-created
        leads = client.get("/crm/leads").json()
        assert any(
            lead.get("source") == "enquiry_form" for lead in leads
        )

    def test_enquiry_invalid_property(self, client):
        r = client.post(
            "/properties/9999/enquiries",
            json={"name": "X", "email": "x@test.com"},
        )
        assert r.status_code == 404


# ===========================================================================
# Financial planning tests
# ===========================================================================

class TestFinancial:
    def test_quick_estimate(self, client, db_session):
        buyer_r = client.post(
            "/crm/buyers",
            json={"name": "Fin Buyer", "email": "fin@test.com"},
        )
        buyer_id = buyer_r.json()["id"]

        r = client.post(
            "/financial/estimate",
            json={
                "buyer_id": buyer_id,
                "annual_income": 120_000,
                "monthly_expenses": 2_500,
                "current_savings": 80_000,
                "monthly_savings_rate": 3_000,
                "deposit_target_pct": 0.20,
                "first_home_buyer": True,
                "has_existing_debt": False,
                "debt_monthly": 0,
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["borrowing_power"] > 0
        assert "message" in data
        assert data["estimated_ready_months"] >= 0

    def test_create_financial_profile(self, client, db_session):
        buyer_r = client.post(
            "/crm/buyers",
            json={"name": "Profile Buyer", "email": "profile@test.com"},
        )
        buyer_id = buyer_r.json()["id"]

        r = client.post(
            "/financial/profiles",
            json={
                "buyer_id": buyer_id,
                "annual_income": 90_000,
                "monthly_expenses": 2_000,
                "current_savings": 30_000,
                "monthly_savings_rate": 2_000,
                "deposit_target_pct": 0.20,
                "first_home_buyer": True,
                "has_existing_debt": False,
                "debt_monthly": 0,
            },
        )
        assert r.status_code == 201
        data = r.json()
        assert data["buyer_id"] == buyer_id
        assert data["estimated_borrowing_power"] > 0

    def test_cannot_create_duplicate_profile(self, client, db_session):
        buyer_r = client.post(
            "/crm/buyers",
            json={"name": "Dup Buyer", "email": "dup@test.com"},
        )
        buyer_id = buyer_r.json()["id"]
        profile_data = {
            "buyer_id": buyer_id,
            "annual_income": 80_000,
            "monthly_expenses": 1_800,
            "current_savings": 20_000,
            "monthly_savings_rate": 1_500,
            "deposit_target_pct": 0.20,
            "first_home_buyer": True,
            "has_existing_debt": False,
            "debt_monthly": 0,
        }
        client.post("/financial/profiles", json=profile_data)
        r2 = client.post("/financial/profiles", json=profile_data)
        assert r2.status_code == 409

    def test_affordability_ready_now(self, client, db_session):
        buyer_r = client.post(
            "/crm/buyers",
            json={"name": "Rich Buyer", "email": "rich@test.com"},
        )
        buyer_id = buyer_r.json()["id"]
        r = client.post(
            "/financial/estimate",
            json={
                "buyer_id": buyer_id,
                "annual_income": 250_000,
                "monthly_expenses": 3_000,
                "current_savings": 400_000,
                "monthly_savings_rate": 10_000,
                "deposit_target_pct": 0.20,
                "first_home_buyer": False,
                "has_existing_debt": False,
                "debt_monthly": 0,
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert "ready" in data["message"].lower() or data["current_savings_gap"] <= 0


# ===========================================================================
# Market insights tests
# ===========================================================================

class TestMarket:
    def test_list_snapshots_empty(self, client):
        r = client.get("/market/suburbs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_suburb_snapshot(self, client, db_session):
        snap = MarketSnapshot(
            suburb="Kew",
            state="VIC",
            median_price=2_100_000,
            avg_days_on_market=18,
            quarterly_growth_pct=2.1,
            annual_growth_pct=7.4,
            listings_count=34,
        )
        db_session.add(snap)
        db_session.commit()

        r = client.get("/market/suburbs/Kew")
        assert r.status_code == 200
        data = r.json()
        assert data["suburb"] == "Kew"
        assert data["median_price"] == 2_100_000

    def test_comparable_listings(self, client, db_session):
        agent = _seed_agent(db_session)
        p1 = _seed_property(db_session, agent.id)  # 900k Kew

        # Add a comparable property in same suburb
        comp = Property(
            title="Comparable in Kew",
            address="2 Test Street, Kew VIC 3101",
            suburb="Kew",
            state="VIC",
            postcode="3101",
            price=870_000,
            bedrooms=3,
            bathrooms=2,
            car_spaces=1,
            property_type="house",
            features=[],
            agent_id=agent.id,
        )
        db_session.add(comp)
        db_session.commit()

        r = client.get(f"/market/comparable/{p1.id}")
        assert r.status_code == 200
        assert len(r.json()) >= 1


# ===========================================================================
# Discovery recommendations (swipe) tests
# ===========================================================================

class TestRecommendations:
    def test_recommendations_exclude_swiped(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)

        r = client.get("/recommendations", params={"session_id": "sess-1"})
        assert r.status_code == 200
        assert len(r.json()) == 1

        r = client.post(
            "/recommendations/swipe",
            json={"property_id": prop.id, "session_id": "sess-1", "liked": True},
        )
        assert r.status_code == 201

        r = client.get("/recommendations", params={"session_id": "sess-1"})
        assert r.json() == []

        # Other sessions still see the property
        r = client.get("/recommendations", params={"session_id": "sess-2"})
        assert len(r.json()) == 1

    def test_liked_shortlist(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)
        client.post(
            "/recommendations/swipe",
            json={"property_id": prop.id, "session_id": "sess-1", "liked": True},
        )
        r = client.get("/recommendations/liked", params={"session_id": "sess-1"})
        assert r.status_code == 200
        assert [p["id"] for p in r.json()] == [prop.id]

    def test_swipe_unknown_property(self, client):
        r = client.post(
            "/recommendations/swipe",
            json={"property_id": 9999, "session_id": "s", "liked": False},
        )
        assert r.status_code == 404


# ===========================================================================
# Contact capture tests
# ===========================================================================

class TestContact:
    def test_contact_creates_buyer_and_lead(self, client):
        r = client.post(
            "/contact",
            json={
                "name": "Jane Buyer",
                "email": "jane@test.com",
                "phone": "0400 111 222",
                "message": "Please call me about Kew houses",
                "source": "contact_page",
            },
        )
        assert r.status_code == 201

        buyers = client.get("/crm/buyers").json()
        assert any(b["email"] == "jane@test.com" for b in buyers)
        leads = client.get("/crm/leads").json()
        assert any(l["source"] == "contact_page" for l in leads)

    def test_contact_from_chat_stores_preferences(self, client):
        r = client.post(
            "/contact",
            json={
                "name": "Chat User",
                "email": "chatuser@test.com",
                "source": "chat",
                "preferences": {"budget_max": 900000, "preferred_suburbs": ["Kew"]},
            },
        )
        assert r.status_code == 201
        buyers = client.get("/crm/buyers").json()
        buyer = next(b for b in buyers if b["email"] == "chatuser@test.com")
        assert buyer["budget_max"] == 900000
        assert buyer["preferred_suburbs"] == ["Kew"]

    def test_list_contacts(self, client):
        client.post("/contact", json={"name": "A", "email": "a@test.com"})
        r = client.get("/contact")
        assert r.status_code == 200
        assert len(r.json()) == 1


# ===========================================================================
# Popular properties + admin tests
# ===========================================================================

class TestAdmin:
    def test_popular_properties(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)
        r = client.get("/properties/popular")
        assert r.status_code == 200
        assert r.json()[0]["id"] == prop.id

    def test_admin_summary(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)
        client.post(
            f"/properties/{prop.id}/enquiries",
            json={"name": "E", "email": "e@test.com", "message": "hi"},
        )
        client.post("/contact", json={"name": "C", "email": "c@test.com"})
        r = client.get("/admin/summary")
        assert r.status_code == 200
        data = r.json()
        assert data["enquiries_count"] == 1
        assert data["contact_messages_count"] == 1
        assert len(data["recent_communications"]) == 2

    def test_property_popularity(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)
        client.post(
            "/recommendations/swipe",
            json={"property_id": prop.id, "session_id": "s", "liked": True},
        )
        r = client.get("/admin/property-popularity")
        assert r.status_code == 200
        row = r.json()[0]
        assert row["likes"] == 1
        assert row["popularity_score"] == 3

    def test_deals_pipeline_stages(self, client):
        r = client.get("/admin/deals")
        assert r.status_code == 200
        assert [s["stage"] for s in r.json()] == [
            "new", "contacted", "viewing", "offer", "closed",
        ]

    def test_generate_and_update_actions(self, client, db_session):
        # A new contact message should generate an outreach action
        client.post("/contact", json={"name": "Lead Gen", "email": "lg@test.com"})
        r = client.post("/admin/actions/generate")
        assert r.status_code == 200
        actions = r.json()
        assert any(a["category"] == "outreach" for a in actions)

        # Re-generating must not duplicate pending actions
        r2 = client.post("/admin/actions/generate")
        outreach_again = [a for a in r2.json() if a["category"] == "outreach"]
        assert outreach_again == []

        # Status transitions: pending -> done sets resolved_at
        action_id = actions[0]["id"]
        r3 = client.patch(f"/admin/actions/{action_id}", json={"status": "done"})
        assert r3.status_code == 200
        assert r3.json()["status"] == "done"
        assert r3.json()["resolved_at"] is not None

        summary = client.get("/admin/actions/summary").json()
        assert summary["done"] == 1

    def test_update_action_invalid_status(self, client):
        r = client.patch("/admin/actions/1", json={"status": "bogus"})
        assert r.status_code == 422

    def test_trending_properties(self, client, db_session):
        agent = _seed_agent(db_session)
        prop = _seed_property(db_session, agent.id)
        client.post(
            "/recommendations/swipe",
            json={"property_id": prop.id, "session_id": "s1", "liked": True},
        )
        r = client.get("/properties/trending")
        assert r.status_code == 200
        row = r.json()[0]
        assert row["property"]["id"] == prop.id
        assert row["likes"] == 1
