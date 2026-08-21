from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from ..database import get_db
from ..models import db_models, schemas
from .auth import get_current_user
from ..services.websocket_manager import manager
from ..services.recommendation_engine import recommendation_engine

router = APIRouter(prefix="/cars", tags=["cars"])


@router.get("/", response_model=List[schemas.CarResponse])
async def list_cars(
    make: Optional[str] = None,
    body_type: Optional[str] = None,
    fuel_type: Optional[str] = None,
    transmission: Optional[str] = None,
    condition: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    sort: Optional[str] = None,
    limit: int = 60,
    db: AsyncSession = Depends(get_db),
):
    query = select(db_models.Car).where(db_models.Car.status == db_models.ListingStatus.AVAILABLE)

    if make:
        query = query.filter(db_models.Car.make.ilike(f"%{make}%"))
    if body_type:
        query = query.filter(db_models.Car.body_type == body_type)
    if fuel_type:
        query = query.filter(db_models.Car.fuel_type == fuel_type)
    if transmission:
        query = query.filter(db_models.Car.transmission == transmission)
    if condition:
        query = query.filter(db_models.Car.condition == condition)
    if search:
        query = query.filter(
            (db_models.Car.title.ilike(f"%{search}%"))
            | (db_models.Car.make.ilike(f"%{search}%"))
            | (db_models.Car.model.ilike(f"%{search}%"))
        )
    if min_price is not None:
        query = query.filter(db_models.Car.price >= min_price)
    if max_price is not None:
        query = query.filter(db_models.Car.price <= max_price)
    if min_year is not None:
        query = query.filter(db_models.Car.year >= min_year)
    if max_year is not None:
        query = query.filter(db_models.Car.year <= max_year)

    if sort == "price_asc":
        query = query.order_by(db_models.Car.price.asc())
    elif sort == "price_desc":
        query = query.order_by(db_models.Car.price.desc())
    elif sort == "year_desc":
        query = query.order_by(db_models.Car.year.desc())
    elif sort == "mileage_asc":
        query = query.order_by(db_models.Car.mileage.asc())
    else:
        query = query.order_by(db_models.Car.created_at.desc())

    result = await db.execute(query.limit(limit))
    return result.scalars().all()


@router.get("/makes")
async def list_makes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(db_models.Car.make).distinct())
    return sorted({row[0] for row in result.all() if row[0]})


@router.get("/suggestions")
async def car_suggestions(q: str = "", limit: int = 6, db: AsyncSession = Depends(get_db)):
    if not q or len(q) < 2:
        return []
    query = (
        select(db_models.Car.id, db_models.Car.title)
        .filter(db_models.Car.title.ilike(f"%{q}%"))
        .limit(limit)
    )
    result = await db.execute(query)
    return [{"id": row.id, "title": row.title} for row in result.all()]


@router.get("/{car_id}", response_model=schemas.CarResponse)
async def get_car(
    car_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[db_models.User] = Depends(get_current_user),
):
    result = await db.execute(select(db_models.Car).filter(db_models.Car.id == car_id))
    car = result.scalars().first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    car.views = (car.views or 0) + 1
    if user:
        db.add(db_models.Event(user_id=user.id, car_id=car_id, event_type=db_models.EventType.VIEW))
    await db.commit()
    await db.refresh(car)
    return car


@router.get("/{car_id}/similar", response_model=List[schemas.CarResponse])
async def similar_cars(car_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(db_models.Car).filter(db_models.Car.id == car_id))
    car = result.scalars().first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return await recommendation_engine.get_similar_cars(db, car)


@router.post("/", response_model=schemas.CarResponse)
async def create_listing(
    payload: schemas.CarCreate,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    car = db_models.Car(**payload.dict(), seller_id=user.id, status=db_models.ListingStatus.AVAILABLE)
    db.add(car)
    await db.commit()
    await db.refresh(car)

    await manager.broadcast({"type": "new_listing", "car_id": car.id, "title": car.title})
    return car


@router.put("/{car_id}", response_model=schemas.CarResponse)
async def update_listing(
    car_id: int,
    payload: schemas.CarUpdate,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(select(db_models.Car).filter(db_models.Car.id == car_id))
    car = result.scalars().first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    if car.seller_id != user.id and user.role != db_models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your listing")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(car, field, value)
    await db.commit()
    await db.refresh(car)
    return car


@router.delete("/{car_id}")
async def delete_listing(
    car_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(select(db_models.Car).filter(db_models.Car.id == car_id))
    car = result.scalars().first()
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    if car.seller_id != user.id and user.role != db_models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your listing")

    await db.delete(car)
    await db.commit()
    return {"status": "success"}
