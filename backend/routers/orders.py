from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from typing import List

from ..database import get_db
from ..models import db_models, schemas
from .auth import get_current_user
from ..services.websocket_manager import manager

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/checkout", response_model=schemas.OrderResponse)
async def checkout(
    payload: schemas.CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    cart_result = await db.execute(select(db_models.Cart).where(db_models.Cart.user_id == user.id))
    cart = cart_result.scalars().first()
    if not cart:
        raise HTTPException(status_code=400, detail="Cart is empty")

    items_result = await db.execute(
        select(db_models.CartItem)
        .options(joinedload(db_models.CartItem.product))
        .where(db_models.CartItem.cart_id == cart.id)
    )
    cart_items = items_result.scalars().all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    for item in cart_items:
        if not item.product or item.product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {item.product.title if item.product else 'a product'}")

    total = sum(item.product.price * item.quantity for item in cart_items)
    order = db_models.Order(user_id=user.id, total_amount=total, shipping_address=payload.shipping_address)
    db.add(order)
    await db.commit()
    await db.refresh(order)

    for item in cart_items:
        db.add(db_models.OrderItem(
            order_id=order.id,
            product_id=item.product.id,
            seller_id=item.product.seller_id,
            quantity=item.quantity,
            price_at_purchase=item.product.price,
        ))
        item.product.stock -= item.quantity
        if item.product.stock <= 0:
            item.product.status = db_models.ListingStatus.SOLD_OUT
        await db.delete(item)
    await db.commit()

    result = await db.execute(
        select(db_models.Order)
        .options(joinedload(db_models.Order.items).joinedload(db_models.OrderItem.product))
        .where(db_models.Order.id == order.id)
    )
    order = result.unique().scalars().first()

    await manager.broadcast({"type": "new_order", "order_id": order.id, "user_id": user.id})
    return order


@router.get("/my-orders", response_model=List[schemas.OrderResponse])
async def my_orders(
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.Order)
        .options(joinedload(db_models.Order.items).joinedload(db_models.OrderItem.product))
        .where(db_models.Order.user_id == user.id)
        .order_by(db_models.Order.created_at.desc())
    )
    return result.unique().scalars().all()


@router.get("/received", response_model=List[schemas.OrderResponse])
async def received_orders(
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.Order)
        .join(db_models.OrderItem, db_models.OrderItem.order_id == db_models.Order.id)
        .options(joinedload(db_models.Order.items).joinedload(db_models.OrderItem.product))
        .where(db_models.OrderItem.seller_id == user.id)
        .order_by(db_models.Order.created_at.desc())
    )
    return result.unique().scalars().all()


@router.get("/{order_id}", response_model=schemas.OrderResponse)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.Order)
        .options(joinedload(db_models.Order.items).joinedload(db_models.OrderItem.product))
        .where(db_models.Order.id == order_id)
    )
    order = result.unique().scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    is_seller = any(item.seller_id == user.id for item in order.items)
    if order.user_id != user.id and not is_seller and user.role != db_models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not your order")
    return order


@router.put("/{order_id}/status", response_model=schemas.OrderResponse)
async def update_order_status(
    order_id: int,
    payload: schemas.OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.Order)
        .options(joinedload(db_models.Order.items).joinedload(db_models.OrderItem.product))
        .where(db_models.Order.id == order_id)
    )
    order = result.unique().scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    is_seller = any(item.seller_id == user.id for item in order.items)
    if not is_seller and user.role != db_models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to update this order")

    order.status = payload.status
    await db.commit()

    await manager.broadcast({"type": "order_status_update", "order_id": order.id, "status": order.status.value, "user_id": order.user_id})
    return order
