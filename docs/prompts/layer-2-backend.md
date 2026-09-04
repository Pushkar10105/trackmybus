# Layer 2 - Backend API + real-time

**Tool:** Google Antigravity (free preview)
**Owner:** most experienced backend teammate
**Output:** `backend/` folder

---

```
Here is my database schema: [paste database/schema.sql]

Build a Node.js/Express backend for TrackMyBus using this schema. Use the
`pg` library with parameterized queries, `jsonwebtoken` for auth, `bcrypt`
for passwords, and `socket.io` for real-time. Read config from a .env file
(DATABASE_URL, JWT_SECRET, PORT, CORS_ORIGIN) and include a .env.example.

Endpoints:

1. POST /api/auth/login - {phone, password} -> {token, role, bus_id}.
   Drivers and admins only.

2. POST /api/driver/trip/start and POST /api/driver/trip/end - driver only,
   opens/closes a trips row for the driver's bus.

3. POST /api/driver/location - driver only, receives {bus_id, lat, lng,
   speed, timestamp}. Reject with 403 if bus_id is not the driver's bus.
   Save to live_locations, find the nearest stop on that bus's route,
   and compute ETA (minutes) to the next 3 stops using haversine distance
   divided by the bus's average speed over its last 10 pings (fallback
   20 km/h if fewer than 3 pings). Then emit a Socket.io event
   `location_update` to room `route:{route_id}` with
   {bus_id, lat, lng, speed, etas:[{stop_id, stop_name, eta_min}]}.

4. GET /api/routes - all routes.
   GET /api/routes/:id - route with its stops ordered by sequence.
   GET /api/routes/:id/live - active buses on that route (last ping within
   5 minutes) with their latest location and ETAs.

5. POST /api/issues - public, {bus_number, category, description}.
   GET /api/issues - admin only, returns rows from the issue_summary view
   sorted by severity (high, medium, low) then flag_count desc.
   PATCH /api/issues/:busId/:category/resolve - admin only, sets
   resolved_at = now() on all matching unresolved flags.

6. POST /api/lostfound - public, creates an item.
   GET /api/lostfound - public returns only type='found' items without
   contact_phone; if a valid admin token is present, return all items
   with contact_phone.
   PATCH /api/lostfound/:id - admin only, updates status.

7. Admin CRUD: POST/PATCH/DELETE on /api/admin/routes, /api/admin/stops,
   /api/admin/buses.

Socket.io: clients send `join_route {route_id}` to join a room. Every
60 seconds, check for buses with no ping in 5 minutes and emit
`bus_inactive {bus_id}` to their route room.

Structure the code as: server.js, db.js, middleware/auth.js, routes/*.js,
utils/geo.js (haversine + ETA). Keep every file commented and simple
enough for a beginner to read and explain in a demo Q&A. Add a
README section on how to run it locally.
```
