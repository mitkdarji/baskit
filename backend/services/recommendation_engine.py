from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from ..models import db_models


class RecommendationEngine:
    """Suggests similar cars — same body type or make, within a nearby price band."""

    async def get_similar_cars(self, db: AsyncSession, car: db_models.Car, limit: int = 6):
        price_low = car.price * 0.7
        price_high = car.price * 1.3

        query = (
            select(db_models.Car)
            .where(db_models.Car.id != car.id)
            .where(db_models.Car.status == db_models.ListingStatus.AVAILABLE)
            .where(
                (db_models.Car.body_type == car.body_type)
                | (db_models.Car.make == car.make)
            )
            .where(and_(db_models.Car.price >= price_low, db_models.Car.price <= price_high))
            .limit(limit)
        )
        result = await db.execute(query)
        similar = result.scalars().all()

        if len(similar) < limit:
            # Backfill with any other available cars if not enough close matches.
            existing_ids = {c.id for c in similar} | {car.id}
            fallback_query = (
                select(db_models.Car)
                .where(db_models.Car.id.notin_(existing_ids))
                .where(db_models.Car.status == db_models.ListingStatus.AVAILABLE)
                .limit(limit - len(similar))
            )
            fallback_result = await db.execute(fallback_query)
            similar = list(similar) + list(fallback_result.scalars().all())

        return similar

    async def get_recommendations_for_user(self, db: AsyncSession, user_id: int, limit: int = 8):
        # Based on the user's most recent viewed car's body type; falls back to newest listings.
        recent_view = await db.execute(
            select(db_models.Event)
            .where(db_models.Event.user_id == user_id)
            .where(db_models.Event.event_type == db_models.EventType.VIEW)
            .order_by(db_models.Event.timestamp.desc())
            .limit(1)
        )
        event = recent_view.scalars().first()

        if event:
            car_result = await db.execute(select(db_models.Car).where(db_models.Car.id == event.car_id))
            car = car_result.scalars().first()
            if car:
                return await self.get_similar_cars(db, car, limit=limit)

        fallback = await db.execute(
            select(db_models.Car)
            .where(db_models.Car.status == db_models.ListingStatus.AVAILABLE)
            .order_by(db_models.Car.created_at.desc())
            .limit(limit)
        )
        return fallback.scalars().all()


recommendation_engine = RecommendationEngine()
