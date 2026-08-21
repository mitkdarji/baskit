from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from ..database import get_db
from ..models import db_models, schemas
from .auth import get_current_admin
from ..services.websocket_manager import manager

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    skip: int = 0,
    limit: int = 50,
    search: str = None,
    status: str = None,
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    query = select(db_models.Product)
    if search:
        query = query.where(db_models.Product.title.ilike(f"%{search}%"))
    if status:
        query = query.where(db_models.Product.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_count = await db.scalar(count_query)

    query = query.order_by(db_models.Product.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    products = result.scalars().all()

    inquiry_counts_result = await db.execute(
        select(db_models.Inquiry.product_id, func.count(db_models.Inquiry.id)).group_by(db_models.Inquiry.product_id)
    )
    inquiry_counts = {row[0]: row[1] for row in inquiry_counts_result.all()}

    items = []
    for product in products:
        items.append({
            "product_id": product.id,
            "title": product.title,
            "price": product.price,
            "views": product.views,
            "inquiries": inquiry_counts.get(product.id, 0),
            "status": product.status.value,
            "seller_id": product.seller_id,
            "created_at": product.created_at.isoformat(),
        })

    return {"items": items, "total": total_count, "skip": skip, "limit": limit}


@router.get("/analytics/overview")
async def get_analytics_overview(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    total_listings = await db.scalar(select(func.count(db_models.Product.id)))
    available = await db.scalar(
        select(func.count(db_models.Product.id)).where(db_models.Product.status == db_models.ListingStatus.AVAILABLE)
    )
    pending = await db.scalar(
        select(func.count(db_models.Product.id)).where(db_models.Product.status == db_models.ListingStatus.PENDING)
    )
    sold_out = await db.scalar(
        select(func.count(db_models.Product.id)).where(db_models.Product.status == db_models.ListingStatus.SOLD_OUT)
    )
    total_inquiries = await db.scalar(select(func.count(db_models.Inquiry.id)))
    avg_price = await db.scalar(select(func.coalesce(func.avg(db_models.Product.price), 0.0)))
    total_views = await db.scalar(select(func.coalesce(func.sum(db_models.Product.views), 0)))

    return {
        "total_listings": total_listings or 0,
        "available": available or 0,
        "pending": pending or 0,
        "sold_out": sold_out or 0,
        "total_inquiries": total_inquiries or 0,
        "avg_price": round(avg_price or 0.0, 2),
        "total_views": total_views or 0,
    }


@router.get("/analytics/by-category")
async def analytics_by_category(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    result = await db.execute(
        select(db_models.Product.category, func.count(db_models.Product.id), func.coalesce(func.avg(db_models.Product.price), 0.0))
        .group_by(db_models.Product.category)
    )
    return [
        {"category": row[0].value, "count": row[1], "avg_price": round(row[2], 2)}
        for row in result.all()
    ]


@router.get("/analytics/listings-trend")
async def analytics_listings_trend(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    since = datetime.utcnow() - timedelta(days=14)
    result = await db.execute(
        select(func.strftime("%Y-%m-%d", db_models.Product.created_at).label("day"), func.count(db_models.Product.id))
        .where(db_models.Product.created_at >= since)
        .group_by("day")
        .order_by("day")
    )
    return [{"day": row[0], "count": row[1]} for row in result.all()]


@router.get("/analytics/orders-overview")
async def analytics_orders_overview(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    total_orders = await db.scalar(select(func.count(db_models.Order.id)))
    total_revenue = await db.scalar(select(func.coalesce(func.sum(db_models.Order.total_amount), 0.0)))
    avg_order_value = await db.scalar(select(func.coalesce(func.avg(db_models.Order.total_amount), 0.0)))

    return {
        "total_orders": total_orders or 0,
        "total_revenue": round(total_revenue or 0.0, 2),
        "avg_order_value": round(avg_order_value or 0.0, 2),
    }


@router.put("/listings/{product_id}/status")
async def update_listing_status(
    product_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    result = await db.execute(select(db_models.Product).where(db_models.Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        product.status = db_models.ListingStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.commit()
    await db.refresh(product)

    await manager.broadcast({"type": "listing_status_update", "product_id": product.id, "status": product.status.value})
    return {"status": "success", "product_id": product.id, "new_status": product.status.value}


@router.delete("/listings/{product_id}")
async def admin_delete_listing(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    result = await db.execute(select(db_models.Product).where(db_models.Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.commit()
    return {"status": "success"}
