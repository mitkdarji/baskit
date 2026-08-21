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
    query = select(db_models.Car)
    if search:
        query = query.where(db_models.Car.title.ilike(f"%{search}%"))
    if status:
        query = query.where(db_models.Car.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_count = await db.scalar(count_query)

    query = query.order_by(db_models.Car.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    cars = result.scalars().all()

    inquiry_counts_result = await db.execute(
        select(db_models.Inquiry.car_id, func.count(db_models.Inquiry.id)).group_by(db_models.Inquiry.car_id)
    )
    inquiry_counts = {row[0]: row[1] for row in inquiry_counts_result.all()}

    items = []
    for car in cars:
        items.append({
            "car_id": car.id,
            "title": car.title,
            "price": car.price,
            "views": car.views,
            "inquiries": inquiry_counts.get(car.id, 0),
            "status": car.status.value,
            "seller_id": car.seller_id,
            "created_at": car.created_at.isoformat(),
        })

    return {"items": items, "total": total_count, "skip": skip, "limit": limit}


@router.get("/analytics/overview")
async def get_analytics_overview(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    total_listings = await db.scalar(select(func.count(db_models.Car.id)))
    available = await db.scalar(
        select(func.count(db_models.Car.id)).where(db_models.Car.status == db_models.ListingStatus.AVAILABLE)
    )
    pending = await db.scalar(
        select(func.count(db_models.Car.id)).where(db_models.Car.status == db_models.ListingStatus.PENDING)
    )
    sold = await db.scalar(
        select(func.count(db_models.Car.id)).where(db_models.Car.status == db_models.ListingStatus.SOLD)
    )
    total_inquiries = await db.scalar(select(func.count(db_models.Inquiry.id)))
    avg_price = await db.scalar(select(func.coalesce(func.avg(db_models.Car.price), 0.0)))
    total_views = await db.scalar(select(func.coalesce(func.sum(db_models.Car.views), 0)))

    return {
        "total_listings": total_listings or 0,
        "available": available or 0,
        "pending": pending or 0,
        "sold": sold or 0,
        "total_inquiries": total_inquiries or 0,
        "avg_price": round(avg_price or 0.0, 2),
        "total_views": total_views or 0,
    }


@router.get("/analytics/by-body-type")
async def analytics_by_body_type(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    result = await db.execute(
        select(db_models.Car.body_type, func.count(db_models.Car.id), func.coalesce(func.avg(db_models.Car.price), 0.0))
        .group_by(db_models.Car.body_type)
    )
    return [
        {"body_type": row[0].value, "count": row[1], "avg_price": round(row[2], 2)}
        for row in result.all()
    ]


@router.get("/analytics/listings-trend")
async def analytics_listings_trend(
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    since = datetime.utcnow() - timedelta(days=14)
    result = await db.execute(
        select(func.strftime("%Y-%m-%d", db_models.Car.created_at).label("day"), func.count(db_models.Car.id))
        .where(db_models.Car.created_at >= since)
        .group_by("day")
        .order_by("day")
    )
    return [{"day": row[0], "count": row[1]} for row in result.all()]


@router.put("/listings/{car_id}/status")
async def update_listing_status(
    car_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    result = await db.execute(select(db_models.Car).where(db_models.Car.id == car_id))
    car = result.scalars().first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    try:
        car.status = db_models.ListingStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.commit()
    await db.refresh(car)

    await manager.broadcast({"type": "listing_status_update", "car_id": car.id, "status": car.status.value})
    return {"status": "success", "car_id": car.id, "new_status": car.status.value}


@router.delete("/listings/{car_id}")
async def admin_delete_listing(
    car_id: int,
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_current_admin),
):
    result = await db.execute(select(db_models.Car).where(db_models.Car.id == car_id))
    car = result.scalars().first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    await db.delete(car)
    await db.commit()
    return {"status": "success"}
