from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from ..models import db_models


class RecommendationEngine:
    """Suggests similar products — same category or brand, within a nearby price band."""

    async def get_similar_products(self, db: AsyncSession, product: db_models.Product, limit: int = 6):
        price_low = product.price * 0.7
        price_high = product.price * 1.3

        query = (
            select(db_models.Product)
            .where(db_models.Product.id != product.id)
            .where(db_models.Product.status == db_models.ListingStatus.AVAILABLE)
            .where(
                (db_models.Product.category == product.category)
                | (db_models.Product.brand == product.brand)
            )
            .where(and_(db_models.Product.price >= price_low, db_models.Product.price <= price_high))
            .limit(limit)
        )
        result = await db.execute(query)
        similar = result.scalars().all()

        if len(similar) < limit:
            # Backfill with any other available products if not enough close matches.
            existing_ids = {p.id for p in similar} | {product.id}
            fallback_query = (
                select(db_models.Product)
                .where(db_models.Product.id.notin_(existing_ids))
                .where(db_models.Product.status == db_models.ListingStatus.AVAILABLE)
                .limit(limit - len(similar))
            )
            fallback_result = await db.execute(fallback_query)
            similar = list(similar) + list(fallback_result.scalars().all())

        return similar

    async def get_recommendations_for_user(self, db: AsyncSession, user_id: int, limit: int = 8):
        # Based on the user's most recently viewed product's category; falls back to newest listings.
        recent_view = await db.execute(
            select(db_models.Event)
            .where(db_models.Event.user_id == user_id)
            .where(db_models.Event.event_type == db_models.EventType.VIEW)
            .order_by(db_models.Event.timestamp.desc())
            .limit(1)
        )
        event = recent_view.scalars().first()

        if event:
            product_result = await db.execute(select(db_models.Product).where(db_models.Product.id == event.product_id))
            product = product_result.scalars().first()
            if product:
                return await self.get_similar_products(db, product, limit=limit)

        fallback = await db.execute(
            select(db_models.Product)
            .where(db_models.Product.status == db_models.ListingStatus.AVAILABLE)
            .order_by(db_models.Product.created_at.desc())
            .limit(limit)
        )
        return fallback.scalars().all()


recommendation_engine = RecommendationEngine()
