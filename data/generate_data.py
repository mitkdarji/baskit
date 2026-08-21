import asyncio
import random
from sqlalchemy.future import select
from passlib.context import CryptContext
from datetime import datetime, timedelta

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import AsyncSessionLocal, engine, Base
from backend.models import db_models

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

CARS = [
    # make, model, [body_type], [fuel], [transmission]
    ("Maruti Suzuki", "Swift", "hatchback", "petrol", "manual"),
    ("Maruti Suzuki", "Baleno", "hatchback", "petrol", "automatic"),
    ("Hyundai", "Creta", "suv", "petrol", "automatic"),
    ("Hyundai", "i20", "hatchback", "petrol", "manual"),
    ("Hyundai", "Venue", "suv", "diesel", "manual"),
    ("Tata", "Nexon", "suv", "electric", "automatic"),
    ("Tata", "Harrier", "suv", "diesel", "automatic"),
    ("Tata", "Tiago", "hatchback", "cng", "manual"),
    ("Honda", "City", "sedan", "petrol", "automatic"),
    ("Honda", "Amaze", "sedan", "petrol", "manual"),
    ("Toyota", "Innova Crysta", "minivan", "diesel", "manual"),
    ("Toyota", "Fortuner", "suv", "diesel", "automatic"),
    ("Toyota", "Glanza", "hatchback", "hybrid", "automatic"),
    ("Kia", "Seltos", "suv", "petrol", "automatic"),
    ("Kia", "Sonet", "suv", "diesel", "manual"),
    ("Mahindra", "XUV700", "suv", "diesel", "automatic"),
    ("Mahindra", "Thar", "suv", "diesel", "manual"),
    ("Skoda", "Slavia", "sedan", "petrol", "automatic"),
    ("Volkswagen", "Virtus", "sedan", "petrol", "manual"),
    ("MG", "Astor", "suv", "petrol", "automatic"),
    ("MG", "ZS EV", "suv", "electric", "automatic"),
    ("BMW", "3 Series", "sedan", "petrol", "automatic"),
    ("Mercedes-Benz", "C-Class", "sedan", "diesel", "automatic"),
    ("Audi", "A4", "sedan", "petrol", "automatic"),
    ("Renault", "Kwid", "hatchback", "petrol", "manual"),
]

COLORS = ["White", "Silver", "Black", "Red", "Blue", "Grey", "Beige"]
LOCATIONS = ["Ahmedabad", "Surat", "Vadodara", "Mumbai", "Pune", "Delhi", "Bengaluru", "Rajkot"]

CURRENT_YEAR = 2026

BODY_TYPE_FACTOR = {
    "sedan": 1.0, "hatchback": 0.85, "suv": 1.25, "coupe": 1.15,
    "truck": 1.3, "convertible": 1.4, "wagon": 0.95, "minivan": 1.05,
}
FUEL_FACTOR = {
    "petrol": 1.0, "diesel": 1.05, "hybrid": 1.15, "electric": 1.3, "cng": 0.9,
}
TRANSMISSION_FACTOR = {"manual": 0.95, "automatic": 1.08}


def estimate_base_price(body_type, fuel_type, transmission):
    return 750000 * BODY_TYPE_FACTOR[body_type] * FUEL_FACTOR[fuel_type] * TRANSMISSION_FACTOR[transmission]


async def generate_data():
    async with AsyncSessionLocal() as db:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # 1. Admin account
        admin_email = "admin@autowave.com"
        result = await db.execute(select(db_models.User).filter(db_models.User.email == admin_email))
        if not result.scalars().first():
            db.add(db_models.User(
                email=admin_email,
                name="AutoWave Admin",
                hashed_password=pwd_context.hash("admin123"),
                role=db_models.UserRole.ADMIN,
            ))

        # 2. Seller/user accounts
        sellers = []
        for i in range(5):
            email = f"user{i}@example.com"
            result = await db.execute(select(db_models.User).filter(db_models.User.email == email))
            existing = result.scalars().first()
            if not existing:
                new_user = db_models.User(
                    email=email,
                    name=f"Demo User {i}",
                    hashed_password=pwd_context.hash("password123"),
                    role=db_models.UserRole.USER,
                )
                db.add(new_user)
                await db.flush()
                sellers.append(new_user)
            else:
                sellers.append(existing)
        await db.commit()

        # 3. Car listings
        existing_count = await db.scalar(select(db_models.Car.id).limit(1))
        if existing_count:
            print("Cars already seeded, skipping.")
        else:
            for i, (make, model, body_type, fuel_type, transmission) in enumerate(CARS):
                year = random.randint(2015, CURRENT_YEAR)
                age = CURRENT_YEAR - year
                mileage = max(int(age * random.uniform(6000, 14000)), 500)
                base = estimate_base_price(body_type, fuel_type, transmission)
                depreciation = max(1 - age * 0.06, 0.25)
                price = round(base * depreciation * random.uniform(0.9, 1.1), -3)

                car = db_models.Car(
                    title=f"{year} {make} {model}",
                    make=make,
                    model=model,
                    year=year,
                    price=price,
                    mileage=mileage,
                    fuel_type=db_models.FuelType(fuel_type),
                    transmission=db_models.Transmission(transmission),
                    body_type=db_models.BodyType(body_type),
                    condition=random.choice(list(db_models.Condition)),
                    color=random.choice(COLORS),
                    location=random.choice(LOCATIONS),
                    description=f"Well-maintained {make} {model}, single owner, all service records available.",
                    image_url=None,
                    status=db_models.ListingStatus.AVAILABLE,
                    seller_id=sellers[i % len(sellers)].id,
                    views=random.randint(5, 400),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 20)),
                )
                db.add(car)

        await db.commit()
        print("Seed data generated successfully.")


if __name__ == "__main__":
    asyncio.run(generate_data())
