from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from ..database import get_db
from ..models import db_models, schemas
from ..services.recommendation_engine import recommendation_engine
from .auth import get_current_user

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/profile", response_model=schemas.UserResponse)
async def get_profile(user: db_models.User = Depends(get_current_user)):
    return user


@router.put("/profile", response_model=schemas.UserResponse)
async def update_profile(
    payload: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/recommendations", response_model=List[schemas.CarResponse])
async def get_recommendations(
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    return await recommendation_engine.get_recommendations_for_user(db, user.id)


@router.get("/my-listings", response_model=List[schemas.CarResponse])
async def my_listings(
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.Car)
        .where(db_models.Car.seller_id == user.id)
        .order_by(db_models.Car.created_at.desc())
    )
    return result.scalars().all()
