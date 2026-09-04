# Layer 1 - Database schema

**Tool:** Gemini or ChatGPT (plain chat, free)
**Owner:** least experienced teammate
**Output:** save the SQL to `database/schema.sql`

---

```
Design a PostgreSQL database schema for a real-time bus tracking web app
called TrackMyBus. Tables needed:

- users (id, name, phone, role: driver/commuter/admin, password_hash)
- routes (id, name, start_point, end_point, city_code)
- stops (id, route_id, name, lat, lng, sequence_number)
- buses (id, route_id, driver_id, bus_number, status)
- trips (id, bus_id, start_time, end_time, status)
- live_locations (id, bus_id, lat, lng, speed, timestamp)
- issue_flags (id, bus_id, category: seat/ac/cleanliness/safety/driving/other,
  description, created_at, resolved_at)
- lost_found_items (id, type: lost/found, route_id, bus_id, description,
  approx_time, contact_phone, status: open/matched/closed, created_at)

Also create a VIEW called issue_summary that groups unresolved issue_flags
from the last 7 days by bus_id and category, with columns: bus_id, category,
flag_count, last_flagged_at, and severity computed as 'low' when flag_count
is 1-2, 'medium' when 3-5, 'high' when 6 or more.

Give me the full CREATE TABLE SQL with foreign keys and sensible indexes
(especially on live_locations(bus_id, timestamp) and stops(route_id,
sequence_number)), plus seed data: 2 sample routes with 4 stops each
(use real-looking lat/lng near Hyderabad), 1 admin user, 1 driver user,
and 1 sample bus assigned to that driver on route 1. Add a short comment
above each table explaining what it's for. I'm a beginner and want to
understand the design, not just copy it.
```
