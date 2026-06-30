# ✈ Book My Flight — Enhanced Edition

## New Features Added

### Frontend Features
1. **Flexible Date Search** — Calendar view of cheapest fares across 30 days (green = low-fare days), clickable to auto-select
2. **Multi-City Trip Planner** — Plan up to 5 destinations with a 7% multi-city discount
3. **Nearby Airport Suggestions** — Alternative airports with potential savings shown
4. **Visual Seat Map** — Interactive 6×6 airplane seat selector (unchanged + improved)
5. **Travel Assistant Chatbot** — FAQ bot answering baggage, check-in, cancellations, meals, etc. (floating 🤖 button)
6. **Live Flight Status** — Simulated departure/gate/delay info per route
7. **Destination Weather** — 5-day forecast for any Indian city
8. **Real-time Seat Availability** — Dynamically updated seat grid (unchanged + improved)
9. **Airport Terminal Navigation** — Gate/terminal/amenity info for BOM, DEL, BLR, CCU
10. **Carbon Footprint Calculator** — CO₂ per passenger, trees needed, car equivalent, offset option
11. **In-Flight Food Options** — Airline & class-specific menus with cart integration in booking modal

### New API Routes (server)
| Endpoint | Description |
|---|---|
| `GET /api/flights/status?from=BOM&to=DEL` | Live flight status & gate info |
| `GET /api/weather?city=Mumbai` | 5-day weather forecast |
| `GET /api/airports/nearby?city=Mumbai` | Nearby airport alternatives |
| `GET /api/deals/flexible?from=BOM&to=DEL&basePrice=4000` | 30-day fare calendar |
| `GET /api/carbon?from=BOM&to=DEL&passengers=1&class=Economy` | Carbon footprint |
| `GET /api/flights/food?airline=IndiGo&class=Economy` | In-flight meal menu |
| `GET /api/airports/terminal?code=BOM` | Terminal & gate map |
| `GET /api/multicity/fare?legs=BOM-DEL,DEL-BLR` | Multi-city fare estimate |

## Running Locally

```bash
npm install
cp .env.example .env   # then fill in MONGODB_URI etc.
npm run seed            # populates MongoDB with starter deals (run once)
npm start
# → http://localhost:3000
# Admin: username=admin, password=bmf@2026
```

## Deploying to Vercel (Free Tier)

This project is structured to deploy as a single Vercel project:
- `api/index.js` — the Express API, deployed as a serverless function
- `client/public/` — the static frontend, served directly by Vercel
- `vercel.json` — routes `/api/*` to the function, everything else to the SPA

Steps:
1. Push this repo to GitHub.
2. In Vercel, **New Project** → import the repo. Framework preset: "Other".
3. Add Environment Variables (Project Settings → Environment Variables):
   - `MONGODB_URI` — your MongoDB Atlas connection string
   - `SESSION_SECRET` — a long random string (used to sign auth cookies)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `FROM_NAME` — optional, for OTP emails (without these, OTP codes are logged to the Vercel function logs instead of emailed)
   - `OTP_EXPIRY_MINUTES` — optional, defaults to 10
4. Deploy.
5. Run the seed script once against your Atlas database (from your local machine, with `.env` pointing at the same `MONGODB_URI`) so the Deals page isn't empty: `npm run seed`.

### Why some things changed for Vercel
- **Deals & bookings** used to be stored in local JSON files. Vercel's filesystem is read-only and ephemeral, so they were migrated to MongoDB Atlas (the same database already used for customer accounts).
- **Login (admin + customer OTP)** used to rely on `express-session` with in-memory storage. Vercel functions are stateless — each request can hit a different, fresh instance — so in-memory sessions would log users out instantly. Login now uses a signed JWT stored in an httpOnly cookie, which carries the session state itself and needs no server memory.

## Navigation
- **✈ Deals** — Browse and book flights
- **🗺 Multi-City** — Plan multi-destination trips
- **🛫 Services** — Flight status, weather, airports, terminal maps, carbon, food
- **📋 My Bookings** — Look up bookings by phone number
- **⚙ Admin** — Manage deals and view all bookings
- **🤖 Chat** — Floating chatbot for travel FAQs

## Architecture
- Service Layer (MongoDB-backed), MVC/Front Controller
- Factory Method, Singleton, Chain of Responsibility, Strategy Pattern
- Stateless JWT-cookie auth (serverless-compatible)

