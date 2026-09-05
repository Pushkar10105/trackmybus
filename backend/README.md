# TrackMyBus – Backend API

A Node.js (v18+) / Express REST API with real-time Socket.io support for the TrackMyBus live-bus-tracking platform.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 or later |
| npm | 9 or later |
| PostgreSQL | 12 or later |

---

## 1 – Database setup

Run the schema (once) against an existing PostgreSQL database:

```bash
psql -U postgres -d trackmybus -f ../database/schema.sql
```

The schema script creates all tables, indexes, views, and seeds two accounts:

| Role   | Phone       | Password    |
|--------|-------------|-------------|
| admin  | 9000000001  | password123 |
| driver | 9000000002  | password123 |

---

## 2 – Configure environment variables

```bash
# From the backend/ directory:
cp .env.example .env
```

Edit `.env` and set:

```
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=some-long-random-string
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

---

## 3 – Install dependencies

```bash
cd backend
npm install
```

---

## 4 – Start the server

**Production:**
```bash
npm start
```

**Development (auto-restart on file changes, Node 18+):**
```bash
npm run dev
```

The server starts on `http://localhost:3000` (or the PORT in `.env`).

---

## 5 – Verify

```bash
# Health check
curl http://localhost:3000/api/health
# → {"ok":true}

# Login as the seeded driver
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9000000002","password":"password123"}' | jq .
```

---

## Endpoint Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | None | Login, returns JWT |

### Driver  (requires `role=driver` JWT)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/driver/trip/start` | Start a new trip |
| POST | `/api/driver/trip/end` | End the active trip |
| POST | `/api/driver/location` | Send GPS ping + get ETAs |

### Routes  (public)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/routes` | List all routes |
| GET | `/api/routes/:id` | Route detail + stops |
| GET | `/api/routes/:id/live` | Live bus positions + ETAs |

### Issues
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/issues` | None | Submit a complaint |
| GET | `/api/issues` | admin | View issue summary |
| PATCH | `/api/issues/:busId/:category/resolve` | admin | Resolve issues |

### Lost & Found
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/lostfound` | None | Report item |
| GET | `/api/lostfound` | Optional | Browse items |
| PATCH | `/api/lostfound/:id` | admin | Update status |

### Admin CRUD  (requires `role=admin` JWT)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/routes` | Create route |
| PATCH | `/api/admin/routes/:id` | Update route |
| DELETE | `/api/admin/routes/:id` | Delete route |
| POST | `/api/admin/stops` | Create stop |
| PATCH | `/api/admin/stops/:id` | Update stop |
| DELETE | `/api/admin/stops/:id` | Delete stop |
| POST | `/api/admin/buses` | Create bus (driver_phone resolved to driver_id) |
| PATCH | `/api/admin/buses/:id` | Update bus |
| DELETE | `/api/admin/buses/:id` | Delete bus |

### Utility
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |

---

## Socket.io Events

Connect to the server with a Socket.io client:

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:3000");

// Subscribe to live updates for route 1
socket.emit("join_route", { route_id: 1 });

// Listen for bus position broadcasts
socket.on("location_update", (data) => {
  // data: { bus_id, bus_number, lat, lng, speed, etas }
});

// Listen for a bus going offline
socket.on("bus_inactive", ({ bus_id }) => {
  // remove bus marker from the map
});
```

---

## File Structure

```
backend/
├── server.js              # Express app + Socket.io setup
├── db.js                  # pg connection pool
├── package.json
├── .env.example           # Environment variable template
├── README.md
├── middleware/
│   └── auth.js            # requireAuth(role) JWT middleware
├── utils/
│   └── geo.js             # haversineKm(), computeEtas()
└── routes/
    ├── auth.js            # POST /api/auth/login
    ├── driver.js          # Driver trip + location endpoints
    ├── routes.js          # Public route/stop/live endpoints
    ├── issues.js          # Issue reporting + admin view
    ├── lostfound.js       # Lost & found board
    └── admin.js           # Admin CRUD
```
