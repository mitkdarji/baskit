from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from ..database import get_db
from ..models import db_models, schemas
from .auth import get_current_user
from ..services.websocket_manager import manager

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


def _to_response(saved: db_models.SavedProduct) -> dict:
    return {
        "id": saved.id,
        "added_at": saved.added_at.isoformat(),
        "price_at_save": saved.price_at_save,
        "price_drop": max(0.0, saved.price_at_save - saved.product.price),
        "product": schemas.ProductResponse.model_validate(saved.product),
    }


@router.get("/")
async def get_wishlist(
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.SavedProduct)
        .options(joinedload(db_models.SavedProduct.product))
        .where(db_models.SavedProduct.user_id == user.id)
        .order_by(db_models.SavedProduct.added_at.desc())
    )
    saved = result.scalars().all()
    return [_to_response(s) for s in saved if s.product]


@router.get("/deals")
async def get_wishlist_deals(
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.SavedProduct)
        .options(joinedload(db_models.SavedProduct.product))
        .where(db_models.SavedProduct.user_id == user.id)
    )
    saved = result.scalars().all()
    deals = [s for s in saved if s.product and s.price_at_save > s.product.price]
    return [_to_response(s) for s in deals]


@router.post("/add/{product_id}")
async def add_to_wishlist(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    existing = await db.execute(
        select(db_models.SavedProduct)
        .where(db_models.SavedProduct.user_id == user.id)
        .where(db_models.SavedProduct.product_id == product_id)
    )
    if existing.scalars().first():
        return {"status": "already_saved"}

    product_result = await db.execute(select(db_models.Product).where(db_models.Product.id == product_id))
    product = product_result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    saved = db_models.SavedProduct(user_id=user.id, product_id=product_id, price_at_save=product.price)
    db.add(saved)
    db.add(db_models.Event(user_id=user.id, product_id=product_id, event_type=db_models.EventType.WISHLIST))
    await db.commit()

    await manager.broadcast({"type": "wishlist_update", "user_id": user.id, "product_id": product_id, "action": "add"})
    return {"status": "success"}


@router.delete("/remove/{product_id}")
async def remove_from_wishlist(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.SavedProduct)
        .where(db_models.SavedProduct.user_id == user.id)
        .where(db_models.SavedProduct.product_id == product_id)
    )
    saved = result.scalars().first()
    if saved:
        await db.delete(saved)
        await db.commit()
    return {"status": "success"}
