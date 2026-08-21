# 🧺 Baskit

**Baskit** is a full-stack general e-commerce marketplace, rebuilt from the ground up out of the PriceWave/AutoWave car-listing prototype. Buyers browse a multi-category catalog, add items to a cart and check out, track price-drop deals on their wishlist, compare products side by side, and see a seller's trust score before buying. Sellers list and manage their own inventory; admins moderate the marketplace and view sales analytics.

---

## ✨ Features

- **Multi-Category Catalog** — browse, search, and filter products across Electronics, Fashion, Home & Kitchen, Beauty, Sports & Outdoors, Books, Toys & Games, and Grocery.
- **Cart & Checkout** — add products to a cart, adjust quantities, and place an order (demo checkout — no real payment gateway). Stock decrements automatically on purchase.
- **Price-Drop Deal Alerts** — wishlist a product and get notified in real time when the seller cuts the price; a badge on the wishlist icon shows how many saved items have an active deal.
- **Product Comparison** — select up to 4 products and view a side-by-side spec/price comparison.
- **Seller Trust Score** — sellers earn a trust label (New Seller / Trusted / Top Rated) based on review ratings and fulfilled order volume, shown on every listing.
- **Reviews** — buyers can rate and review products from orders that have been delivered to them.
- **Wishlist** — save products for later, synced live via WebSocket.
- **Inquiries** — buyers can message sellers directly about a listing; sellers see inquiries received.
- **PDF Spec Sheet** — download a printable spec sheet for any listing (built with ReportLab).
- **Admin Dashboard** — listing moderation (approve/reject/delete), catalog analytics (by category, 14-day listing trend), and orders/revenue overview.
- **Google OAuth + Email/Password Auth** — role-based access (buyer/seller vs. admin).
- **Real-time updates** — WebSocket broadcasts for new listings, price drops, status changes, new orders, and wishlist activity.

---

## 🏗️ Tech Stack

- **Backend**: FastAPI, SQLAlchemy (async), SQLite, JWT auth, Google OAuth, ReportLab (PDF)
- **Frontend**: React + Vite, React Router, Axios, Recharts, Lucide icons

---

## 🚀 Running Locally

1. **Start Redis** (optional — reserved for future pub/sub, not required to run):
   ```bash
   docker-compose up -d
   ```

2. **Backend**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate      # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python data/generate_data.py  # seeds demo catalog + accounts
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
- Admin: `admin@baskit.com` / `admin123`
- Buyer/Seller: `user0@example.com` ... `user4@example.com` / `password123`

---

## 📁 Project Structure

```
backend/
  models/        # SQLAlchemy models + Pydantic schemas
  routers/       # auth, products, cart, orders, reviews, wishlist, inquiry, user, admin
  services/      # websocket_manager, recommendation_engine
  database.py    # async engine/session setup
  main.py        # FastAPI app entrypoint
data/
  generate_data.py  # seeds admin/user accounts + sample catalog, orders, reviews
frontend/
  src/pages/user/    # ProductListingPage, ProductDetailPage, WishlistPage, CartPage,
                      # CheckoutPage, ComparePage, PostProductPage, ProfilePage
  src/pages/admin/   # Dashboard
  src/services/api.js
  src/context/       # AuthContext, WishlistContext, CartContext, WebSocketContext
```
