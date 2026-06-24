"""Seed script – populates the database with realistic demo data."""
from datetime import datetime, timezone

from app.database import engine, SessionLocal
from app.models.models import Base, Agent, Property, Buyer, MarketSnapshot


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Agent).first():
        print("Database already seeded – skipping.")
        db.close()
        return

    # Agents
    agents = [
        Agent(
            name="Sarah Mitchell",
            email="sarah@premierproperty.com.au",
            phone="0412 345 678",
            agency="Premier Property Group",
            avatar_url="https://i.pravatar.cc/150?img=47",
        ),
        Agent(
            name="James Nguyen",
            email="james@eliterealty.com.au",
            phone="0423 456 789",
            agency="Elite Realty",
            avatar_url="https://i.pravatar.cc/150?img=68",
        ),
    ]
    db.add_all(agents)
    db.flush()

    # Properties
    properties = [
        Property(
            title="Modern Family Home in Kew",
            description=(
                "Stunning 4-bedroom residence in prestigious Kew. "
                "Featuring open-plan living, gourmet kitchen, and landscaped gardens. "
                "Walking distance to top schools and parklands."
            ),
            address="12 Elm Street, Kew VIC 3101",
            suburb="Kew",
            state="VIC",
            postcode="3101",
            price=1_850_000,
            bedrooms=4,
            bathrooms=3,
            car_spaces=2,
            land_size=620,
            property_type="house",
            features=["Pool", "Double Garage", "Ducted Heating", "Alfresco", "Study"],
            images=[
                "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
                "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800",
            ],
            agent_id=agents[0].id,
            days_on_market=12,
        ),
        Property(
            title="Stylish Apartment in South Yarra",
            description=(
                "Sophisticated 2-bedroom apartment with city views. "
                "Designer kitchen, spa bath, and premium finishes throughout. "
                "Steps from Chapel Street restaurants and tram network."
            ),
            address="8/42 Park Street, South Yarra VIC 3141",
            suburb="South Yarra",
            state="VIC",
            postcode="3141",
            price=920_000,
            bedrooms=2,
            bathrooms=2,
            car_spaces=1,
            land_size=None,
            property_type="apartment",
            features=["City Views", "Gym", "Concierge", "Secure Parking"],
            images=[
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
            ],
            agent_id=agents[1].id,
            days_on_market=5,
        ),
        Property(
            title="Charming Townhouse in Richmond",
            description=(
                "Beautifully renovated 3-bedroom townhouse in vibrant Richmond. "
                "North-facing courtyard, polished floorboards, and modern bathrooms. "
                "Minutes to MCG, Swan Street, and the CBD."
            ),
            address="3/27 Bridge Road, Richmond VIC 3121",
            suburb="Richmond",
            state="VIC",
            postcode="3121",
            price=1_150_000,
            bedrooms=3,
            bathrooms=2,
            car_spaces=1,
            land_size=180,
            property_type="townhouse",
            features=["Courtyard", "Polished Floors", "Split System AC", "Storage"],
            images=[
                "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
            ],
            agent_id=agents[0].id,
            days_on_market=21,
        ),
        Property(
            title="Entry-Level Unit in Footscray",
            description=(
                "Ideal first home or investment – spacious 2-bedroom unit "
                "with fresh interiors, private courtyard, and lock-up garage. "
                "Great transport links to the CBD."
            ),
            address="5/88 Paisley Street, Footscray VIC 3011",
            suburb="Footscray",
            state="VIC",
            postcode="3011",
            price=580_000,
            bedrooms=2,
            bathrooms=1,
            car_spaces=1,
            land_size=None,
            property_type="apartment",
            features=["Courtyard", "Lock-up Garage", "New Kitchen"],
            images=[
                "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
            ],
            agent_id=agents[1].id,
            days_on_market=34,
        ),
        Property(
            title="Executive Home in Toorak",
            description=(
                "Grand 5-bedroom family estate on 900 m² in Toorak's golden triangle. "
                "Heated pool, home theatre, 4-car garage, and prestigious school zoning."
            ),
            address="99 Glenferrie Road, Toorak VIC 3142",
            suburb="Toorak",
            state="VIC",
            postcode="3142",
            price=4_200_000,
            bedrooms=5,
            bathrooms=4,
            car_spaces=4,
            land_size=900,
            property_type="house",
            features=["Heated Pool", "Home Theatre", "Wine Cellar", "Smart Home", "4-Car Garage"],
            images=[
                "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
            ],
            agent_id=agents[0].id,
            days_on_market=8,
        ),
        Property(
            title="Light-Filled Apartment in Fitzroy",
            description=(
                "Trendy 1-bedroom apartment in the heart of Fitzroy. "
                "Exposed brick, high ceilings, and a sun-drenched balcony. "
                "Walk to Brunswick Street cafes and galleries."
            ),
            address="12/5 Johnston Street, Fitzroy VIC 3065",
            suburb="Fitzroy",
            state="VIC",
            postcode="3065",
            price=650_000,
            bedrooms=1,
            bathrooms=1,
            car_spaces=0,
            land_size=None,
            property_type="apartment",
            features=["Balcony", "Exposed Brick", "High Ceilings"],
            images=[
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
            ],
            agent_id=agents[1].id,
            days_on_market=3,
        ),
    ]
    db.add_all(properties)

    # Buyers
    buyers = [
        Buyer(
            name="Emily Chen",
            email="emily.chen@email.com",
            phone="0411 222 333",
            budget_min=800_000,
            budget_max=1_100_000,
            preferred_suburbs=["Richmond", "Fitzroy", "Collingwood"],
            bedrooms_min=2,
            property_types=["house", "townhouse"],
            lifestyle_tags=["near schools", "quiet street"],
            buyer_stage="active",
        ),
        Buyer(
            name="David Park",
            email="david.park@email.com",
            phone="0422 333 444",
            budget_min=500_000,
            budget_max=700_000,
            preferred_suburbs=["Footscray", "Yarraville", "Williamstown"],
            bedrooms_min=1,
            property_types=["apartment", "unit"],
            lifestyle_tags=["first home buyer", "public transport"],
            buyer_stage="semi_ready",
        ),
        Buyer(
            name="Sophie Laurent",
            email="sophie.laurent@email.com",
            phone="0433 444 555",
            buyer_stage="future",
        ),
    ]
    db.add_all(buyers)

    # Market Snapshots
    snapshots = [
        MarketSnapshot(suburb="Kew", state="VIC", median_price=2_100_000, avg_days_on_market=18, quarterly_growth_pct=2.1, annual_growth_pct=7.4, listings_count=34),
        MarketSnapshot(suburb="South Yarra", state="VIC", median_price=1_050_000, avg_days_on_market=22, quarterly_growth_pct=1.8, annual_growth_pct=5.9, listings_count=52),
        MarketSnapshot(suburb="Richmond", state="VIC", median_price=1_250_000, avg_days_on_market=19, quarterly_growth_pct=2.4, annual_growth_pct=8.1, listings_count=29),
        MarketSnapshot(suburb="Footscray", state="VIC", median_price=680_000, avg_days_on_market=28, quarterly_growth_pct=3.1, annual_growth_pct=9.8, listings_count=67),
        MarketSnapshot(suburb="Toorak", state="VIC", median_price=4_500_000, avg_days_on_market=35, quarterly_growth_pct=1.2, annual_growth_pct=4.3, listings_count=21),
        MarketSnapshot(suburb="Fitzroy", state="VIC", median_price=780_000, avg_days_on_market=15, quarterly_growth_pct=2.7, annual_growth_pct=10.2, listings_count=43),
    ]
    db.add_all(snapshots)

    db.commit()
    print("✅ Database seeded successfully.")
    db.close()


if __name__ == "__main__":
    seed()
