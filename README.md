# 🚗 AutoWave

**AutoWave** is a full-stack car listing marketplace, rebuilt from the PriceWave e-commerce engine. Buyers browse and filter listings, save cars to a wishlist, and contact sellers; sellers post and manage their own listings; admins moderate the marketplace and view analytics.

---

## ✨ Features

- **Car Listings** — post, browse, search, and filter by make, body type, fuel type, transmission, condition, price range, and year.
- **Similar Cars** — each listing surfaces comparable cars by body type/make and price band.
- **Wishlist** — save cars for later, synced live via WebSocket.
- **Inquiries** — buyers contact sellers directly; sellers see inquiries received on their listings.
- **PDF Spec Sheet** — download a printable spec sheet for any listing (built with ReportLab).
- **Admin Dashboard** — listing moderation (approve/reject/delete), marketplace analytics (listings by body type, 14-day listing trend, inquiry counts, views).
- **Google OAuth + Email/Password Auth** — role-based access (buyer/seller vs. admin).
- **Real-time updates** — WebSocket broadcasts for new listings, status changes, and wishlist activity.

Pricing is plain and seller-set — there is no dynamic or ML-based pricing in this build.

---

## 🏗️ Tech Stack

- **Backend**: FastAPI, SQLAlchemy (async), SQLite, Redis (pub/sub for WebSocket), JWT auth, Google OAuth, ReportLab (PDF)
- **Frontend**: React + Vite, React Router, Axios, Recharts, Lucide icons

---

## 🚀 Running Locally

1. **Start Redis** (needed for real-time updates):
   ```bash
   docker-compose up -d
   ```

2. **Backend**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate      # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python data/generate_data.py  # seeds demo listings + accounts
   python -m uvicorn backend.main:app --reload --port 8000
   ```

3. **Frontend** (in a second terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open **http://localhost:3000**.

### Demo accounts (after seeding)
- Admin: `admin@autowave.com` / `admin123`
- Buyer/Seller: `user0@example.com` ... `user4@example.com` / `password123`

---

## 📁 Project Structure

```
backend/
  models/        # SQLAlchemy models + Pydantic schemas
  routers/       # auth, cars, wishlist, inquiry, user, admin
  services/      # websocket_manager, recommendation_engine
  database.py    # async engine/session setup
  main.py        # FastAPI app entrypoint
data/
  generate_data.py  # seeds admin/user accounts + sample listings
frontend/
  src/pages/user/    # CarListingPage, CarDetailPage, WishlistPage, PostCarPage, ProfilePage
  src/pages/admin/   # Dashboard
  src/services/api.js
  src/context/       # AuthContext, WishlistContext, WebSocketContext
```
