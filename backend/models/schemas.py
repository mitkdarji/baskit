from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .db_models import UserRole, EventType, FuelType, Transmission, BodyType, Condition, ListingStatus, InquiryStatus


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


# ── Car ──

class CarBase(BaseModel):
    title: str
    make: str
    model: str
    year: int
    price: float
    mileage: int = 0
    fuel_type: FuelType = FuelType.PETROL
    transmission: Transmission = Transmission.MANUAL
    body_type: BodyType = BodyType.SEDAN
    condition: Condition = Condition.USED
    color: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

class CarCreate(CarBase):
    pass

class CarUpdate(BaseModel):
    title: Optional[str] = None
    price: Optional[float] = None
    mileage: Optional[int] = None
    fuel_type: Optional[FuelType] = None
    transmission: Optional[Transmission] = None
    body_type: Optional[BodyType] = None
    condition: Optional[Condition] = None
    color: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[ListingStatus] = None

class CarResponse(CarBase):
    id: int
    status: ListingStatus
    seller_id: Optional[int] = None
    views: int
    created_at: datetime
    class Config:
        from_attributes = True


# ── Events ──

class EventBase(BaseModel):
    car_id: int
    event_type: EventType

class EventResponse(EventBase):
    id: int
    user_id: int
    timestamp: datetime
    class Config:
        from_attributes = True


# ── Saved cars (wishlist) ──

class SavedCarAdd(BaseModel):
    user_id: int
    car_id: int

class SavedCarResponse(BaseModel):
    id: int
    car: CarResponse
    added_at: datetime
    class Config:
        from_attributes = True


# ── Inquiries ──

class InquiryCreate(BaseModel):
    car_id: int
    message: Optional[str] = None
    phone: Optional[str] = None

class InquiryResponse(BaseModel):
    id: int
    car_id: int
    user_id: int
    message: Optional[str] = None
    phone: Optional[str] = None
    status: InquiryStatus
    created_at: datetime
    class Config:
        from_attributes = True
