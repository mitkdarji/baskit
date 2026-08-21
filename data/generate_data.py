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

# title, category, brand, base_price, condition
PRODUCTS = [
    ("Wireless Noise-Cancelling Headphones", "electronics", "Sony", 24999, "new"),
    ("4K Smart TV 55-inch", "electronics", "Samsung", 54999, "new"),
    ("True Wireless Earbuds", "electronics", "boAt", 2499, "new"),
    ("Mechanical Gaming Keyboard", "electronics", "Logitech", 6999, "new"),
    ("Fitness Smartwatch", "electronics", "Fitbit", 12999, "new"),
    ("Portable Bluetooth Speaker", "electronics", "JBL", 3499, "refurbished"),
    ("Men's Slim Fit Denim Jacket", "fashion", "Levis", 3999, "new"),
    ("Women's Running Sneakers", "fashion", "Nike", 5999, "new"),
    ("Classic Leather Wallet", "fashion", "Fossil", 2299, "new"),
    ("Cotton Crew Neck T-Shirt Pack", "fashion", "H&M", 1299, "new"),
    ("Aviator Sunglasses", "fashion", "Ray-Ban", 7499, "new"),
    ("7-in-1 Induction Cooktop", "home_kitchen", "Prestige", 3299, "new"),
    ("Air Fryer 4.5L", "home_kitchen", "Philips", 8999, "new"),
    ("Non-Stick Cookware Set", "home_kitchen", "Prestige", 4499, "new"),
    ("Robot Vacuum Cleaner", "home_kitchen", "Xiaomi", 18999, "new"),
    ("Memory Foam Pillow Set", "home_kitchen", "Wakefit", 1899, "new"),
    ("Vitamin C Serum", "beauty", "Minimalist", 599, "new"),
    ("Hair Dryer 2200W", "beauty", "Philips", 1799, "new"),
    ("Electric Trimmer", "beauty", "Philips", 1299, "refurbished"),
    ("Matte Lipstick Set", "beauty", "Maybelline", 899, "new"),
    ("Yoga Mat Pro", "sports_outdoors", "Decathlon", 1499, "new"),
    ("Adjustable Dumbbell Set", "sports_outdoors", "Kore", 4999, "new"),
    ("Trekking Backpack 50L", "sports_outdoors", "Wildcraft", 3299, "new"),
    ("Badminton Racket Pro", "sports_outdoors", "Yonex", 2999, "new"),
    ("Atomic Habits", "books", "Penguin", 399, "new"),
    ("The Psychology of Money", "books", "HarperCollins", 349, "new"),
    ("Sapiens: A Brief History", "books", "Penguin", 499, "used"),
    ("Building a Second Brain", "books", "Simon & Schuster", 599, "new"),
    ("Remote Control Racing Car", "toys_games", "Hot Wheels", 1999, "new"),
    ("Building Blocks Set 500pc", "toys_games", "Lego", 5999, "new"),
    ("Board Game Strategy Pack", "toys_games", "Hasbro", 1299, "new"),
    ("Organic Almonds 1kg", "grocery", "Nutraj", 899, "new"),
    ("Cold Pressed Olive Oil 1L", "grocery", "Figaro", 749, "new"),
    ("Assorted Green Tea Box", "grocery", "Tetley", 349, "new"),
]

COLORS = ["Black", "White", "Silver", "Blue", "Red", "Grey", "Beige", None]
LOCATIONS = ["Ahmedabad", "Surat", "Vadodara", "Mumbai", "Pune", "Delhi", "Bengaluru", "Rajkot"]

REVIEW_COMMENTS = [
    "Great quality, exactly as described.",
    "Fast delivery and works perfectly.",
    "Good value for the price.",
    "Packaging could be better, but the product itself is solid.",
    "Exceeded my expectations, highly recommend.",
    "Decent, does the job.",
]


async def generate_data():
    async with AsyncSessionLocal() as db:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # 1. Admin account
        admin_email = "admin@baskit.com"
        result = await db.execute(select(db_models.User).filter(db_models.User.email == admin_email))
        if not result.scalars().first():
            db.add(db_models.User(
                email=admin_email,
                name="Baskit Admin",
                hashed_password=pwd_context.hash("admin123"),
                role=db_models.UserRole.ADMIN,
            ))

        # 2. Seller/buyer accounts
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

        # 3. Product listings
        existing_count = await db.scalar(select(db_models.Product.id).limit(1))
        if existing_count:
            print("Products already seeded, skipping.")
            return

        products = []
        for i, (title, category, brand, base_price, condition) in enumerate(PRODUCTS):
            price = round(base_price * random.uniform(0.92, 1.08), -1)
            product = db_models.Product(
                title=title,
                category=db_models.Category(category),
                brand=brand,
                price=price,
                stock=random.randint(3, 60),
                condition=db_models.Condition(condition),
                color=random.choice(COLORS),
                location=random.choice(LOCATIONS),
                description=f"{brand} {title} — sourced from a verified seller, ready to ship.",
                image_url=None,
                status=db_models.ListingStatus.AVAILABLE,
                seller_id=sellers[i % len(sellers)].id,
                views=random.randint(5, 400),
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 20)),
            )
            db.add(product)
            products.append(product)
        await db.commit()
        for p in products:
            await db.refresh(p)

        # 4. Price history (one row per product; simulate a couple of recent price drops)
        for i, product in enumerate(products):
            db.add(db_models.PriceHistory(
                product_id=product.id,
                price=product.price,
                recorded_at=product.created_at,
            ))
            if i % 6 == 0:
                # Simulate an earlier, higher price so this listing shows as a "deal".
                db.add(db_models.PriceHistory(
                    product_id=product.id,
                    price=round(product.price * 1.15, -1),
                    recorded_at=product.created_at,
                ))
        await db.commit()

        # 5. Wishlist a few products for demo users, at a higher price_at_save than current
        # (so the deal-alerts feature has something to show immediately).
        for i, buyer in enumerate(sellers):
            for product in random.sample(products, 3):
                saved_price = product.price * 1.1 if (i + product.id) % 3 == 0 else product.price
                db.add(db_models.SavedProduct(
                    user_id=buyer.id,
                    product_id=product.id,
                    price_at_save=round(saved_price, -1),
                    added_at=datetime.utcnow() - timedelta(days=random.randint(0, 10)),
                ))
        await db.commit()

        # 6. A handful of delivered orders + reviews so seller trust scores aren't all "New Seller"
        for buyer in sellers:
            other_products = [p for p in products if p.seller_id != buyer.id]
            chosen = random.sample(other_products, min(3, len(other_products)))
            order = db_models.Order(
                user_id=buyer.id,
                total_amount=sum(p.price for p in chosen),
                status=db_models.OrderStatus.DELIVERED,
                shipping_address=f"{buyer.name}, {random.choice(LOCATIONS)}, India",
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 15)),
            )
            db.add(order)
            await db.flush()

            for product in chosen:
                order_item = db_models.OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    seller_id=product.seller_id,
                    quantity=1,
                    price_at_purchase=product.price,
                )
                db.add(order_item)
                await db.flush()

                if random.random() < 0.7:
                    db.add(db_models.Review(
                        product_id=product.id,
                        user_id=buyer.id,
                        order_item_id=order_item.id,
                        rating=random.randint(3, 5),
                        comment=random.choice(REVIEW_COMMENTS),
                        created_at=datetime.utcnow() - timedelta(days=random.randint(0, 10)),
                    ))
        await db.commit()

        print("Seed data generated successfully.")


if __name__ == "__main__":
    asyncio.run(generate_data())
