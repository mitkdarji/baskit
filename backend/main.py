from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import engine, Base
from .routers import auth, products, admin, user, wishlist, inquiry, cart, orders, reviews
from .services.websocket_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Baskit API",
    description="General E-Commerce Marketplace API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(admin.router)
app.include_router(user.router)
app.include_router(wishlist.router)
app.include_router(inquiry.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(reviews.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/")
async def root():
    return {"status": "ok", "service": "Baskit API"}
