from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from ..database import get_db
from ..models import db_models, schemas
from .auth import get_current_user

router = APIRouter(prefix="/cart", tags=["cart"])


async def _get_or_create_cart(db: AsyncSession, user_id: int) -> db_models.Cart:
    result = await db.execute(select(db_models.Cart).where(db_models.Cart.user_id == user_id))
    cart = result.scalars().first()
    if not cart:
        cart = db_models.Cart(user_id=user_id)
        db.add(cart)
        await db.commit()
        await db.refresh(cart)
    return cart


def _to_response(items: list[db_models.CartItem]) -> schemas.CartResponse:
    item_responses = []
    total = 0.0
    for item in items:
        if not item.product:
            continue
        subtotal = item.product.price * item.quantity
        total += subtotal
        item_responses.append(schemas.CartItemResponse(
            id=item.id,
            product=schemas.ProductResponse.model_validate(item.product),
            quantity=item.quantity,
            subtotal=subtotal,
        ))
    return schemas.CartResponse(items=item_responses, total=total)


@router.get("/", response_model=schemas.CartResponse)
async def get_cart(
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    cart = await _get_or_create_cart(db, user.id)
    result = await db.execute(
        select(db_models.CartItem)
        .options(joinedload(db_models.CartItem.product))
        .where(db_models.CartItem.cart_id == cart.id)
    )
    return _to_response(result.scalars().all())


@router.post("/add/{product_id}", response_model=schemas.CartResponse)
async def add_to_cart(
    product_id: int,
    payload: schemas.CartItemAdd = schemas.CartItemAdd(),
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    product_result = await db.execute(select(db_models.Product).where(db_models.Product.id == product_id))
    product = product_result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    cart = await _get_or_create_cart(db, user.id)
    existing = await db.execute(
        select(db_models.CartItem)
        .where(db_models.CartItem.cart_id == cart.id)
        .where(db_models.CartItem.product_id == product_id)
    )
    item = existing.scalars().first()
    if item:
        item.quantity += payload.quantity
    else:
        item = db_models.CartItem(cart_id=cart.id, product_id=product_id, quantity=payload.quantity)
        db.add(item)
    await db.commit()

    result = await db.execute(
        select(db_models.CartItem)
        .options(joinedload(db_models.CartItem.product))
        .where(db_models.CartItem.cart_id == cart.id)
    )
    return _to_response(result.scalars().all())


@router.put("/item/{item_id}", response_model=schemas.CartResponse)
async def update_cart_item(
    item_id: int,
    payload: schemas.CartItemUpdate,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    cart = await _get_or_create_cart(db, user.id)
    result = await db.execute(
        select(db_models.CartItem)
        .where(db_models.CartItem.id == item_id)
        .where(db_models.CartItem.cart_id == cart.id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if payload.quantity <= 0:
        await db.delete(item)
    else:
        item.quantity = payload.quantity
    await db.commit()

    result = await db.execute(
        select(db_models.CartItem)
        .options(joinedload(db_models.CartItem.product))
        .where(db_models.CartItem.cart_id == cart.id)
    )
    return _to_response(result.scalars().all())


@router.delete("/item/{item_id}", response_model=schemas.CartResponse)
async def remove_cart_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    cart = await _get_or_create_cart(db, user.id)
    result = await db.execute(
        select(db_models.CartItem)
        .where(db_models.CartItem.id == item_id)
        .where(db_models.CartItem.cart_id == cart.id)
    )
    item = result.scalars().first()
    if item:
        await db.delete(item)
        await db.commit()

    result = await db.execute(
        select(db_models.CartItem)
        .options(joinedload(db_models.CartItem.product))
        .where(db_models.CartItem.cart_id == cart.id)
    )
    return _to_response(result.scalars().all())


@router.delete("/clear", response_model=schemas.CartResponse)
async def clear_cart(
    db: AsyncSession = Depends(get_db),
    user: db_models.User = Depends(get_current_user),
):
    cart = await _get_or_create_cart(db, user.id)
    result = await db.execute(select(db_models.CartItem).where(db_models.CartItem.cart_id == cart.id))
    for item in result.scalars().all():
        await db.delete(item)
    await db.commit()
    return schemas.CartResponse(items=[], total=0.0)
