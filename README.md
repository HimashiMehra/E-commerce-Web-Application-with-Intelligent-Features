# Amazon Full-Stack E-Commerce Clone

A complete, production-ready Amazon-style e-commerce application built with Node.js, Express, MongoDB, Stripe, and vanilla HTML/CSS/JS.

## 🚀 Quick Start

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Edit `backend/.env`:
- `MONGO_URI` — Your MongoDB URI (default: local MongoDB)
- `STRIPE_SECRET_KEY` — From https://dashboard.stripe.com/test/apikeys
- `STRIPE_WEBHOOK_SECRET` — From Stripe CLI or dashboard
- `JWT_SECRET` — Any long random string
- `CLIENT_URL` — Frontend URL (default: http://localhost:5500)

### 3. Seed the Database
```bash
cd backend
npm run seed
```
This creates 24 products, an admin user, and a demo user.

### 4. Start the Backend
```bash
cd backend
npm run dev       # Development (with nodemon)
# OR
npm start         # Production
```
Backend runs at: http://localhost:5000

### 5. Open the Frontend
Open `frontend/index.html` in your browser, or serve it:
```bash
npx serve frontend -p 5500
```

---

## 👤 Demo Accounts

| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@amazon-clone.com | Admin@123456 |
| User  | demo@amazon-clone.com  | Demo@123456  |

---

## 💳 Stripe Test Payment

Use these test card details:
- **Card Number:** `4242 4242 4242 4242`
- **Expiry:** Any future date
- **CVV:** Any 3 digits
- **ZIP:** Any 5 digits

### Setup Stripe Webhook (Local Testing)
```bash
stripe listen --forward-to localhost:5000/api/payment/webhook
```
Copy the webhook signing secret and add it to `.env` as `STRIPE_WEBHOOK_SECRET`.

---

## 📁 Project Structure

```
Amazon-clone/
├── backend/
│   ├── config/db.js              # MongoDB connection
│   ├── controllers/              # Route handlers
│   ├── middleware/               # Auth, error, rate limiting
│   ├── models/                   # Mongoose schemas
│   ├── routes/                   # Express routes
│   ├── seed/seedProducts.js      # Database seeder
│   ├── utils/generateToken.js    # JWT utility
│   ├── .env                      # Environment variables
│   └── server.js                 # Express app entry
│
└── frontend/
    ├── css/                      # Stylesheets
    ├── js/                       # JavaScript modules
    ├── index.html                # Homepage
    ├── login.html                # Sign in
    ├── register.html             # Create account
    ├── product.html              # Product detail
    ├── cart.html                 # Shopping cart
    ├── checkout.html             # Checkout + Stripe
    ├── orders.html               # Order history
    ├── wishlist.html             # Wishlist
    └── admin.html                # Admin dashboard
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Get profile |
| GET  | /api/products | List products (search/filter/sort) |
| GET  | /api/products/:id | Get product |
| POST | /api/products | Create product (admin) |
| PUT  | /api/products/:id | Update product (admin) |
| DELETE | /api/products/:id | Delete product (admin) |
| GET  | /api/cart | Get cart |
| POST | /api/cart/add | Add to cart |
| PUT  | /api/cart/update | Update quantity |
| DELETE | /api/cart/remove/:id | Remove item |
| POST | /api/orders | Place order |
| GET  | /api/orders/myorders | My orders |
| GET  | /api/orders | All orders (admin) |
| PUT  | /api/orders/:id/status | Update status (admin) |
| POST | /api/payment/create-checkout-session | Stripe session |
| POST | /api/payment/webhook | Stripe webhook |

---

## 🚀 Deployment

### Backend (Render)
1. Push code to GitHub
2. Create new Web Service on Render
3. Set Build Command: `npm install`
4. Set Start Command: `node server.js`
5. Add all environment variables from `.env`

### Frontend (Netlify/Vercel)
1. Update `API_BASE` in `frontend/js/api.js` to your Render URL
2. Deploy the `frontend/` folder to Netlify or Vercel

### MongoDB Atlas
1. Create cluster at https://cloud.mongodb.com
2. Get connection string
3. Replace `MONGO_URI` in your environment

---

## 🔐 Security Features
- JWT Authentication with 7-day expiry
- bcrypt password hashing (12 rounds)
- Helmet.js security headers
- Rate limiting (100 req/15min general, 10 req/15min auth)
- MongoDB sanitization (NoSQL injection prevention)
- CORS configured for specific origins
- Stripe webhook signature verification

---

## ✨ Features
- 🛒 Full shopping cart (guest + logged-in)
- 💳 Stripe payment with webhooks
- 👑 Admin dashboard with product/order CRUD
- 🔍 Real-time search with debouncing
- 🎛️ Category, price, and rating filters
- ❤️ Wishlist
- ⭐ Product reviews and ratings
- 📦 Order tracking with timeline
- 🤖 AI Shopping Assistant (rule-based)
- 📱 Fully responsive design
- 🔔 Toast notifications
- ⚡ Skeleton loaders
