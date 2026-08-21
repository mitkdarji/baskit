from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .db_models import (
    UserRole, EventType, Category, Condition, ListingStatus,
    InquiryStatus, OrderStatus,
)


# ── User / Auth ──

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.USER

class UserResponse(UserBase):
    id: int
    name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    created_at: datetime
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    id_token: str


# ── Product ──

class ProductBase(BaseModel):
    title: str
    category: Category = Category.ELECTRONICS
    brand: str
    price: float
    stock: int = 1
    condition: Condition = Condition.NEW
    color: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[Category] = None
    brand: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    condition: Optional[Condition] = None
    color: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[ListingStatus] = None

class ProductResponse(ProductBase):
    id: int
    status: ListingStatus
    seller_id: Optional[int] = None
    views: int
    created_at: datetime
    class Config:
        from_attributes = True


# ── Events ──

class EventBase(BaseModel):
    product_id: int
    event_type: EventType

class EventResponse(EventBase):
    id: int
    user_id: int
    timestamp: datetime
    class Config:
        from_attributes = True


# ── Saved products (wishlist) ──

class SavedProductResponse(BaseModel):
    id: int
    product: ProductResponse
    price_at_save: float
    price_drop: float
    added_at: datetime
    class Config:
        from_attributes = True


# ── Inquiries ──

class InquiryCreate(BaseModel):
    product_id: int
    message: Optional[str] = None
    phone: Optional[str] = None

class InquiryResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    message: Optional[str] = None
    phone: Optional[str] = None
    status: InquiryStatus
    created_at: datetime
    class Config:
        from_attributes = True


# ── Cart ──

class CartItemAdd(BaseModel):
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemResponse(BaseModel):
    id: int
    product: ProductResponse
    quantity: int
    subtotal: float
    class Config:
        from_attributes = True

class CartResponse(BaseModel):
    items: List[CartItemResponse]
    total: float


# ── Orders ──

class CheckoutRequest(BaseModel):
    shipping_address: str

class OrderItemResponse(BaseModel):
    id: int
    product: ProductResponse
    quantity: int
    price_at_purchase: float
    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    status: OrderStatus
    total_amount: float
    shipping_address: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse]
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: OrderStatus


# ── Reviews ──

class ReviewCreate(BaseModel):
    product_id: int
    rating: int
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class SellerTrustResponse(BaseModel):
    seller_id: int
    avg_rating: float
    review_count: int
    orders_fulfilled: int
    trust_label: str
