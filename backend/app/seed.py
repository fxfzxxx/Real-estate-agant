"""Seed script – populates the database with realistic demo data.

All 50 property records are located in Stonefields, Auckland (postcode 1072).
The records are synthetic but modelled on the real Stonefields market: a
master-planned suburb on the old Mt Wellington quarry dominated by modern
terraces and townhouses, with low-rise apartments and standalone family
homes. Price bands, typologies and days-on-market reflect the suburb's
actual profile.

Run:  python -m app.seed            # seeds only if the DB is empty
      python -m app.seed --reset    # drops all tables and reseeds
"""
import random
import sys

from app.database import engine, SessionLocal
from app.models.models import (
    Base,
    Agent,
    Property,
    Buyer,
    ChatMessage,
    Enquiry,
    MarketSnapshot,
    PropertySwipe,
)

SUBURB = "Stonefields"
REGION = "Auckland"
POSTCODE = "1072"

# Stonefields streets (quarry/geology themed naming used across the suburb)
STREETS = [
    "Stonefields Avenue",
    "Tephra Boulevard",
    "Stonemason Avenue",
    "Barbarich Drive",
    "Tihi Street",
    "Korere Terrace",
    "Basalt Lane",
    "Scoria Crescent",
    "Obsidian Way",
    "Quarry View Road",
    "Pumice Place",
    "Moraine Way",
]

IMAGES = [
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800",
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800",
]

# (type, share of stock, price band NZ$, beds range, land m² range or None)
TYPOLOGY = [
    ("townhouse", 0.40, (950_000, 1_350_000), (2, 4), (90, 180)),
    ("house",     0.30, (1_300_000, 2_400_000), (3, 5), (200, 450)),
    ("apartment", 0.25, (700_000, 950_000), (1, 3), None),
    ("unit",      0.05, (850_000, 1_050_000), (2, 3), (80, 140)),
]

FEATURES_BY_TYPE = {
    "townhouse": ["North-Facing Courtyard", "Double Glazing", "Internal Garage",
                  "Heat Pump", "Designer Kitchen", "Study Nook", "EV Charger"],
    "house": ["Landscaped Garden", "Double Garage", "Open-Plan Living", "Heat Pump",
              "Butler's Pantry", "Media Room", "Solar Panels", "Outdoor Fireplace"],
    "apartment": ["Balcony", "Secure Parking", "Lift Access", "Storage Locker",
                  "Double Glazing", "Heat Pump", "City Views"],
    "unit": ["Private Courtyard", "Single Garage", "Heat Pump", "Low Maintenance",
             "Fresh Interiors"],
}

TITLE_TEMPLATES = {
    "townhouse": ["Modern Terrace on {street}", "Sun-Drenched Townhouse, {street}",
                  "Designer Terrace Living – {street}", "Family Townhouse near the Park"],
    "house": ["Standalone Family Home on {street}", "Executive Residence – {street}",
              "Entertainer's Home with Quarry Views", "Premium Family Living, {street}"],
    "apartment": ["Light-Filled Apartment on {street}", "Lock-and-Leave Apartment – {street}",
                  "Stylish City-Fringe Apartment", "Elevated Apartment with Views"],
    "unit": ["Easy-Care Unit on {street}", "Tidy Starter in the Heart of Stonefields"],
}

DESCRIPTION_BITS = [
    "Walking distance to Stonefields Market Square, cafes and the local school.",
    "Moments from Maungarei Springs Wetland and the suburb's walking trails.",
    "Easy access to Lunn Ave shopping and a quick commute to the CBD.",
    "Set in a quiet, family-friendly street in this master-planned community.",
    "Zoned for Stonefields School with parks and playgrounds on your doorstep.",
    "Enjoys all-day sun with views toward the basalt cliffs of the old quarry.",
]


def _make_properties(rng: random.Random, agent_ids: list) -> list:
    props = []
    counts = [round(share * 50) for _, share, *_ in TYPOLOGY]
    # Ensure exactly 50
    counts[0] += 50 - sum(counts)

    street_numbers: dict = {}
    for (ptype, _share, price_band, beds_range, land_range), count in zip(TYPOLOGY, counts):
        for _ in range(count):
            street = rng.choice(STREETS)
            street_numbers[street] = street_numbers.get(street, rng.randint(1, 8)) + rng.randint(1, 6)
            number = street_numbers[street]
            unit_prefix = f"{rng.randint(1, 12)}/" if ptype in ("apartment", "unit") else ""

            beds = rng.randint(*beds_range)
            baths = max(1, beds - rng.randint(0, 1))
            cars = 0 if (ptype == "apartment" and rng.random() < 0.25) else rng.randint(1, 2)
            price = round(rng.uniform(*price_band) / 5_000) * 5_000
            land = rng.randint(*land_range) if land_range else None

            title = rng.choice(TITLE_TEMPLATES[ptype]).format(street=street)
            features = rng.sample(FEATURES_BY_TYPE[ptype], k=rng.randint(3, 5))
            description = (
                f"{beds}-bedroom {ptype} in Stonefields, Auckland. "
                + " ".join(rng.sample(DESCRIPTION_BITS, k=2))
            )

            imgs = rng.sample(IMAGES, k=2)
            status = "sold" if rng.random() < 0.10 else "active"

            props.append(
                Property(
                    title=title,
                    description=description,
                    address=f"{unit_prefix}{number} {street}, Stonefields, Auckland {POSTCODE}",
                    suburb=SUBURB,
                    state=REGION,
                    postcode=POSTCODE,
                    price=price,
                    bedrooms=beds,
                    bathrooms=baths,
                    car_spaces=cars,
                    land_size=land,
                    property_type=ptype,
                    status=status,
                    features=features,
                    images=imgs,
                    agent_id=rng.choice(agent_ids),
                    days_on_market=rng.randint(1, 75),
                )
            )
    rng.shuffle(props)
    return props


def seed(reset: bool = False):
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Agent).first():
        print("Database already seeded – skipping. Use --reset to reseed from scratch.")
        db.close()
        return

    rng = random.Random(42)  # deterministic output

    # Agents
    agents = [
        Agent(
            name="Sarah Mitchell",
            email="sarah@stonefieldsrealty.co.nz",
            phone="021 345 678",
            agency="Stonefields Realty Group",
            avatar_url="https://i.pravatar.cc/150?img=47",
        ),
        Agent(
            name="James Nguyen",
            email="james@stonefieldsrealty.co.nz",
            phone="021 456 789",
            agency="Stonefields Realty Group",
            avatar_url="https://i.pravatar.cc/150?img=68",
        ),
    ]
    db.add_all(agents)
    db.flush()

    # Properties – 50 records, all in Stonefields
    properties = _make_properties(rng, [a.id for a in agents])
    db.add_all(properties)

    # Buyers
    buyers = [
        Buyer(
            name="Emily Chen",
            email="emily.chen@email.com",
            phone="021 222 333",
            budget_min=950_000,
            budget_max=1_300_000,
            preferred_suburbs=["Stonefields"],
            bedrooms_min=3,
            property_types=["townhouse", "house"],
            lifestyle_tags=["near schools", "quiet street"],
            buyer_stage="active",
        ),
        Buyer(
            name="David Park",
            email="david.park@email.com",
            phone="021 333 444",
            budget_min=700_000,
            budget_max=900_000,
            preferred_suburbs=["Stonefields"],
            bedrooms_min=1,
            property_types=["apartment", "unit"],
            lifestyle_tags=["first home buyer", "public transport"],
            buyer_stage="semi_ready",
        ),
        Buyer(
            name="Sophie Laurent",
            email="sophie.laurent@email.com",
            phone="021 444 555",
            buyer_stage="future",
        ),
    ]
    db.add_all(buyers)

    # Engagement history – swipes, enquiries and chat questions so that
    # popularity/trending rankings are meaningful from day one
    db.flush()
    active_props = [p for p in properties if p.status == "active"]
    trending = rng.sample(active_props, k=8)  # a handful of clear favourites

    first_names = ["Olivia", "Liam", "Isla", "Noah", "Amelia", "Jack", "Mia", "Leo",
                   "Ruby", "Ethan", "Grace", "Hunter", "Ella", "Mason", "Zoe", "Cooper"]
    swipes, enquiries, chats = [], [], []

    for prop in active_props:
        likes = rng.randint(8, 22) if prop in trending else rng.randint(0, 5)
        dislikes = rng.randint(0, 4)
        for i in range(likes):
            swipes.append(PropertySwipe(
                property_id=prop.id, session_id=f"seed-session-{rng.randint(1, 60)}", liked=True,
            ))
        for i in range(dislikes):
            swipes.append(PropertySwipe(
                property_id=prop.id, session_id=f"seed-session-{rng.randint(1, 60)}", liked=False,
            ))

    for prop in rng.sample(trending, k=6):
        name = rng.choice(first_names)
        enquiries.append(Enquiry(
            property_id=prop.id,
            name=f"{name} {rng.choice('ABCDEFGHJKLMNPRSTW')}.",
            email=f"{name.lower()}{rng.randint(1, 99)}@email.com",
            phone=f"021 {rng.randint(100, 999)} {rng.randint(1000, 9999)}",
            message=rng.choice([
                "Hi, is this property still available? Keen to view this weekend.",
                "Could you send me the LIM report and title details?",
                "What are the body corporate fees? Interested in making an offer.",
                "Is the vendor open to pre-auction offers?",
            ]),
        ))

    chat_questions = [
        "Is this property in the Stonefields School zone?",
        "How long has it been on the market?",
        "What similar properties sold nearby recently?",
        "Is it suitable for a family with two kids?",
    ]
    for prop in rng.sample(trending, k=5):
        session = f"seed-chat-{prop.id}"
        for q in rng.sample(chat_questions, k=rng.randint(1, 3)):
            chats.append(ChatMessage(property_id=prop.id, session_id=session, role="user", content=q))
            chats.append(ChatMessage(property_id=prop.id, session_id=session, role="assistant",
                                     content="(seeded demo reply)"))

    db.add_all(swipes)
    db.add_all(enquiries)
    db.add_all(chats)

    # Market snapshots – Stonefields plus neighbouring suburbs for context
    snapshots = [
        MarketSnapshot(suburb="Stonefields", state=REGION, median_price=1_250_000, avg_days_on_market=32, quarterly_growth_pct=1.4, annual_growth_pct=4.2, listings_count=50),
        MarketSnapshot(suburb="Mt Wellington", state=REGION, median_price=1_050_000, avg_days_on_market=36, quarterly_growth_pct=1.1, annual_growth_pct=3.5, listings_count=64),
        MarketSnapshot(suburb="St Johns", state=REGION, median_price=1_400_000, avg_days_on_market=34, quarterly_growth_pct=1.6, annual_growth_pct=4.8, listings_count=28),
        MarketSnapshot(suburb="Meadowbank", state=REGION, median_price=1_550_000, avg_days_on_market=30, quarterly_growth_pct=1.8, annual_growth_pct=5.1, listings_count=22),
    ]
    db.add_all(snapshots)

    db.commit()
    active = sum(1 for p in properties if p.status == "active")
    print(f"✅ Database seeded: {len(properties)} Stonefields properties ({active} active), "
          f"{len(agents)} agents, {len(buyers)} buyers, {len(snapshots)} market snapshots, "
          f"{len(swipes)} swipes, {len(enquiries)} enquiries, {len(chats)} chat messages.")
    db.close()


if __name__ == "__main__":
    seed(reset="--reset" in sys.argv)
