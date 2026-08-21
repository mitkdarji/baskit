import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List

from ..database import get_db
from ..models import db_models, schemas
from .auth import get_current_user

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("/", response_model=schemas.ReviewResponse)
async def create_review(
    payload: schemas.ReviewCreate,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    if not 1 <= payload.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    order_item_result = await db.execute(
        select(db_models.OrderItem)
        .join(db_models.Order, db_models.Order.id == db_models.OrderItem.order_id)
        .where(db_models.Order.user_id == user.id)
        .where(db_models.OrderItem.product_id == payload.product_id)
        .where(db_models.Order.status == db_models.OrderStatus.DELIVERED)
    )
    order_item = order_item_result.scalars().first()
    if not order_item:
        raise HTTPException(status_code=403, detail="You can only review products from delivered orders")

    existing = await db.execute(
        select(db_models.Review)
        .where(db_models.Review.user_id == user.id)
        .where(db_models.Review.product_id == payload.product_id)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="You already reviewed this product")

    review = db_models.Review(
        product_id=payload.product_id,
        user_id=user.id,
        order_item_id=order_item.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


@router.get("/product/{product_id}", response_model=List[schemas.ReviewResponse])
async def get_product_reviews(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(db_models.Review)
        .where(db_models.Review.product_id == product_id)
        .order_by(db_models.Review.created_at.desc())
    )
    return result.scalars().all()


@router.get("/seller/{seller_id}/trust-score", response_model=schemas.SellerTrustResponse)
async def get_seller_trust_score(seller_id: int, db: AsyncSession = Depends(get_db)):
    avg_rating = await db.scalar(
        select(func.coalesce(func.avg(db_models.Review.rating), 0.0))
        .join(db_models.Product, db_models.Product.id == db_models.Review.product_id)
        .where(db_models.Product.seller_id == seller_id)
    )
    review_count = await db.scalar(
        select(func.count(db_models.Review.id))
        .join(db_models.Product, db_models.Product.id == db_models.Review.product_id)
        .where(db_models.Product.seller_id == seller_id)
    )
    orders_fulfilled = await db.scalar(
        select(func.count(db_models.OrderItem.id))
        .where(db_models.OrderItem.seller_id == seller_id)
    )

    avg_rating = round(avg_rating or 0.0, 2)
    review_count = review_count or 0
    orders_fulfilled = orders_fulfilled or 0

    score = avg_rating * math.log(review_count + 1, 2) + orders_fulfilled * 0.1
    if review_count == 0:
        trust_label = "New Seller"
    elif score >= 8:
        trust_label = "Top Rated"
    elif score >= 3:
        trust_label = "Trusted"
    else:
        trust_label = "New Seller"

    return schemas.SellerTrustResponse(
        seller_id=seller_id,
        avg_rating=avg_rating,
        review_count=review_count,
        orders_fulfilled=orders_fulfilled,
        trust_label=trust_label,
    )
