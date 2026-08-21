from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Text
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


class Category(str, enum.Enum):
    ELECTRONICS = "electronics"
    FASHION = "fashion"
    HOME_KITCHEN = "home_kitchen"
    BEAUTY = "beauty"
    SPORTS_OUTDOORS = "sports_outdoors"
    BOOKS = "books"
    TOYS_GAMES = "toys_games"
    GROCERY = "grocery"


class Condition(str, enum.Enum):
    NEW = "new"
    USED = "used"
    REFURBISHED = "refurbished"


class ListingStatus(str, enum.Enum):
    PENDING = "pending"
    AVAILABLE = "available"
    SOLD_OUT = "sold_out"
    REJECTED = "rejected"


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    category = Column(SQLEnum(Category), default=Category.ELECTRONICS, index=True)
    brand = Column(String, index=True)
    price = Column(Float, index=True)
    stock = Column(Integer, default=1)
    condition = Column(SQLEnum(Condition), default=Condition.NEW)
    color = Column(String, nullable=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    status = Column(SQLEnum(ListingStatus), default=ListingStatus.AVAILABLE)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    views = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User")


class PriceHistory(Base):
    __tablename__ = "price_history"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    price = Column(Float)
    recorded_at = Column(DateTime, default=datetime.utcnow)


class EventType(str, enum.Enum):
    CLICK = "click"
    VIEW = "view"
    WISHLIST = "wishlist"
    INQUIRY = "inquiry"


class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    event_type = Column(SQLEnum(EventType))
    timestamp = Column(DateTime, default=datetime.utcnow)


class SavedProduct(Base):
    __tablename__ = "saved_products"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    price_at_save = Column(Float, default=0.0)
    added_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")


class InquiryStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    CLOSED = "closed"


class Inquiry(Base):
    __tablename__ = "inquiries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    message = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    status = Column(SQLEnum(InquiryStatus), default=InquiryStatus.NEW)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")
    user = relationship("User")


class Cart(Base):
    __tablename__ = "carts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)


class CartItem(Base):
    __tablename__ = "cart_items"
    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("carts.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=1)

    product = relationship("Product")


class OrderStatus(str, enum.Enum):
    PLACED = "placed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    total_amount = Column(Float, default=0.0)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PLACED)
    shipping_address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    seller_id = Column(Integer, ForeignKey("users.id"), index=True)
    quantity = Column(Integer, default=1)
    price_at_purchase = Column(Float, default=0.0)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    order_item_id = Column(Integer, ForeignKey("order_items.id"), nullable=True)
    rating = Column(Integer)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")
    user = relationship("User")
