from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from ..database import get_db
from ..models import db_models, schemas
from .auth import get_current_user
from ..services.websocket_manager import manager
from ..services.recommendation_engine import recommendation_engine

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=List[schemas.ProductResponse])
async def list_products(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    condition: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = None,
    limit: int = 60,
    db: AsyncSession = Depends(get_db),
):
    query = select(db_models.Product).where(db_models.Product.status == db_models.ListingStatus.AVAILABLE)

    if category:
        query = query.filter(db_models.Product.category == category)
    if brand:
        query = query.filter(db_models.Product.brand.ilike(f"%{brand}%"))
    if condition:
        query = query.filter(db_models.Product.condition == condition)
    if search:
        query = query.filter(
            (db_models.Product.title.ilike(f"%{search}%"))
            | (db_models.Product.brand.ilike(f"%{search}%"))
        )
    if min_price is not None:
        query = query.filter(db_models.Product.price >= min_price)
    if max_price is not None:
        query = query.filter(db_models.Product.price <= max_price)

    if sort == "price_asc":
        query = query.order_by(db_models.Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(db_models.Product.price.desc())
    elif sort == "views_desc":
        query = query.order_by(db_models.Product.views.desc())
    else:
        query = query.order_by(db_models.Product.created_at.desc())

    result = await db.execute(query.limit(limit))
    return result.scalars().all()


@router.get("/brands")
async def list_brands(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(db_models.Product.brand).distinct())
    return sorted({row[0] for row in result.all() if row[0]})


@router.get("/compare", response_model=List[schemas.ProductResponse])
async def compare_products(ids: str, db: AsyncSession = Depends(get_db)):
    try:
        id_list = [int(i) for i in ids.split(",") if i.strip()][:4]
    except ValueError:
        raise HTTPException(status_code=400, detail="ids must be a comma-separated list of integers")
    if not id_list:
        return []
    result = await db.execute(select(db_models.Product).where(db_models.Product.id.in_(id_list)))
    products = {p.id: p for p in result.scalars().all()}
    return [products[i] for i in id_list if i in products]


@router.get("/suggestions")
async def product_suggestions(q: str = "", limit: int = 6, db: AsyncSession = Depends(get_db)):
    if not q or len(q) < 2:
        return []
    query = (
        select(db_models.Product.id, db_models.Product.title)
        .filter(db_models.Product.title.ilike(f"%{q}%"))
        .limit(limit)
    )
    result = await db.execute(query)
    return [{"id": row.id, "title": row.title} for row in result.all()]


@router.get("/{product_id}", response_model=schemas.ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[db_models.User] = Depends(get_current_user),
):
    result = await db.execute(select(db_models.Product).filter(db_models.Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.views = (product.views or 0) + 1
    if user:
        db.add(db_models.Event(user_id=user.id, product_id=product_id, event_type=db_models.EventType.VIEW))
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/{product_id}/similar", response_model=List[schemas.ProductResponse])
async def similar_products(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(db_models.Product).filter(db_models.Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return await recommendation_engine.get_similar_products(db, product)


@router.post("/", response_model=schemas.ProductResponse)
async def create_listing(
    payload: schemas.ProductCreate,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    product = db_models.Product(**payload.dict(), seller_id=user.id, status=db_models.ListingStatus.AVAILABLE)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    db.add(db_models.PriceHistory(product_id=product.id, price=product.price))
    await db.commit()

    await manager.broadcast({"type": "new_listing", "product_id": product.id, "title": product.title})
    return product


@router.put("/{product_id}", response_model=schemas.ProductResponse)
async def update_listing(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(select(db_models.Product).filter(db_models.Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.seller_id != user.id and user.role != db_models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your listing")

    old_price = product.price
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)

    if payload.price is not None and payload.price < old_price:
        db.add(db_models.PriceHistory(product_id=product.id, price=product.price))
        await db.commit()
        await manager.broadcast({
            "type": "price_drop",
            "product_id": product.id,
            "title": product.title,
            "old_price": old_price,
            "new_price": product.price,
        })

    return product


@router.delete("/{product_id}")
async def delete_listing(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(select(db_models.Product).filter(db_models.Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.seller_id != user.id and user.role != db_models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your listing")

    await db.delete(product)
    await db.commit()
    return {"status": "success"}
