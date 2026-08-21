from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from ..database import get_db
from ..models import db_models, schemas
from .auth import get_current_user
from ..services.websocket_manager import manager

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("/")
async def get_wishlist(
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.SavedCar)
        .options(joinedload(db_models.SavedCar.car))
        .where(db_models.SavedCar.user_id == user.id)
        .order_by(db_models.SavedCar.added_at.desc())
    )
    saved = result.scalars().all()
    return [
        {"id": s.id, "added_at": s.added_at.isoformat(), "car": schemas.CarResponse.model_validate(s.car)}
        for s in saved if s.car
    ]


@router.post("/add/{car_id}")
async def add_to_wishlist(
    car_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    existing = await db.execute(
        select(db_models.SavedCar)
        .where(db_models.SavedCar.user_id == user.id)
        .where(db_models.SavedCar.car_id == car_id)
    )
    if existing.scalars().first():
        return {"status": "already_saved"}

    car_result = await db.execute(select(db_models.Car).where(db_models.Car.id == car_id))
    if not car_result.scalars().first():
        raise HTTPException(status_code=404, detail="Car not found")

    saved = db_models.SavedCar(user_id=user.id, car_id=car_id)
    db.add(saved)
    db.add(db_models.Event(user_id=user.id, car_id=car_id, event_type=db_models.EventType.WISHLIST))
    await db.commit()

    await manager.broadcast({"type": "wishlist_update", "user_id": user.id, "car_id": car_id, "action": "add"})
    return {"status": "success"}


@router.delete("/remove/{car_id}")
async def remove_from_wishlist(
    car_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.SavedCar)
        .where(db_models.SavedCar.user_id == user.id)
        .where(db_models.SavedCar.car_id == car_id)
    )
    saved = result.scalars().first()
    if saved:
        await db.delete(saved)
        await db.commit()
    return {"status": "success"}
