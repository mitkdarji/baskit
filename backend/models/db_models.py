from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    hashed_password = Column(String)
    role = Column(SQLEnum(UserRole), default=UserRole.USER)
    created_at = Column(DateTime, default=datetime.utcnow)


class FuelType(str, enum.Enum):
    PETROL = "petrol"
    DIESEL = "diesel"
    ELECTRIC = "electric"
    HYBRID = "hybrid"
    CNG = "cng"


class Transmission(str, enum.Enum):
    MANUAL = "manual"
    AUTOMATIC = "automatic"


class BodyType(str, enum.Enum):
    SEDAN = "sedan"
    SUV = "suv"
    HATCHBACK = "hatchback"
    COUPE = "coupe"
    TRUCK = "truck"
    CONVERTIBLE = "convertible"
    WAGON = "wagon"
    MINIVAN = "minivan"


class Condition(str, enum.Enum):
    NEW = "new"
    USED = "used"
    CERTIFIED = "certified_pre_owned"


class ListingStatus(str, enum.Enum):
    PENDING = "pending"
    AVAILABLE = "available"
    SOLD = "sold"
    REJECTED = "rejected"


class Car(Base):
    __tablename__ = "cars"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    make = Column(String, index=True)
    model = Column(String, index=True)
    year = Column(Integer, index=True)
    price = Column(Float, index=True)
    mileage = Column(Integer, default=0)
    fuel_type = Column(SQLEnum(FuelType), default=FuelType.PETROL)
    transmission = Column(SQLEnum(Transmission), default=Transmission.MANUAL)
    body_type = Column(SQLEnum(BodyType), default=BodyType.SEDAN)
    condition = Column(SQLEnum(Condition), default=Condition.USED)
    color = Column(String, nullable=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    status = Column(SQLEnum(ListingStatus), default=ListingStatus.AVAILABLE)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    views = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User")


class EventType(str, enum.Enum):
    CLICK = "click"
    VIEW = "view"
    WISHLIST = "wishlist"
    INQUIRY = "inquiry"


class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    car_id = Column(Integer, ForeignKey("cars.id"))
    event_type = Column(SQLEnum(EventType))
    timestamp = Column(DateTime, default=datetime.utcnow)


class SavedCar(Base):
    __tablename__ = "saved_cars"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    car_id = Column(Integer, ForeignKey("cars.id"))
    added_at = Column(DateTime, default=datetime.utcnow)

    car = relationship("Car")


class InquiryStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    CLOSED = "closed"


class Inquiry(Base):
    __tablename__ = "inquiries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    car_id = Column(Integer, ForeignKey("cars.id"))
    message = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    status = Column(SQLEnum(InquiryStatus), default=InquiryStatus.NEW)
    created_at = Column(DateTime, default=datetime.utcnow)

    car = relationship("Car")
    user = relationship("User")
