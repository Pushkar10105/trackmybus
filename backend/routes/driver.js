// routes/driver.js
// Endpoints available only to authenticated drivers.
// Handles trip lifecycle and periodic GPS location updates.

const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");
const { computeEtas } = require("../utils/geo");

const router = express.Router();

// All driver routes require a valid JWT with role="driver"
router.use(requireAuth("driver"));

// Helper to resolve the driver's bus_id from JWT payload or DB query
async function resolveBusId(user) {
  if (user && user.bus_id) return user.bus_id;
  if (user && user.user_id) {
    const res = await pool.query(
      "SELECT id FROM buses WHERE driver_id = $1 LIMIT 1",
      [user.user_id]
    );
    if (res.rows.length > 0) return res.rows[0].id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// POST /api/driver/trip/start
// ---------------------------------------------------------------------------
// Creates a new trip record for the bus assigned to this driver and marks
// the bus as 'active'.
//
// The driver must have a bus_id in their JWT (set at login time) or assigned in DB.
// If the bus already has an open trip we return it instead of creating
// a duplicate (idempotent behaviour).
//
// Emits a global 'bus_active' Socket.io event (mirrors 'bus_inactive' in
// trip/end) so admin dashboards and any route-scoped listeners can react
// in real time, rather than only picking up the change on next fetch.
//
// Response: { trip_id }
// ---------------------------------------------------------------------------
router.post("/trip/start", async (req, res) => {
  try {
    const bus_id = await resolveBusId(req.user);

    if (!bus_id) {
      return res.status(400).json({ error: "No bus assigned to this driver" });
    }

    // Check whether there is already an in-progress trip for this bus
    const existing = await pool.query(
      `SELECT id FROM trips WHERE bus_id = $1 AND status = 'in_progress' LIMIT 1`,
      [bus_id]
    );

    if (existing.rows.length > 0) {
      return res.json({ trip_id: existing.rows[0].id });
    }

    // Start a new trip and mark the bus as active
    const tripResult = await pool.query(
      `INSERT INTO trips (bus_id, start_time, status)
       VALUES ($1, NOW(), 'in_progress')
       RETURNING id`,
      [bus_id]
    );

    const busRow = await pool.query(
      `UPDATE buses SET status = 'active' WHERE id = $1 RETURNING route_id`,
      [bus_id]
    );

    const io = req.app.get("io");
    const route_id = busRow.rows[0]?.route_id;
    if (io) {
      // Global broadcast: admin dashboards aren't joined to any particular
      // route room, so they need this regardless of route_id. route_id is
      // included in the payload so route-scoped listeners can filter client-side.
      io.emit("bus_active", { bus_id: Number(bus_id), route_id });
    }

    return res.json({ trip_id: tripResult.rows[0].id });
  } catch (err) {
    console.error("trip/start error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/driver/trip/end
// ---------------------------------------------------------------------------
// Closes the currently open trip for this driver's bus (sets status to
// 'completed' and records end_time), then marks the bus as 'inactive'.
//
// Response: { message }
// ---------------------------------------------------------------------------
router.post("/trip/end", async (req, res) => {
  try {
    const bus_id = await resolveBusId(req.user);

    if (!bus_id) {
      return res.status(400).json({ error: "No bus assigned to this driver" });
    }

    // Find and close the open trip
    const result = await pool.query(
      `UPDATE trips
       SET status = 'completed', end_time = NOW()
       WHERE bus_id = $1 AND status = 'in_progress'
       RETURNING id`,
      [bus_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No active trip found for this bus" });
    }

    // Mark the bus as inactive and tell everyone immediately
    const busRow = await pool.query(
      `UPDATE buses SET status = 'inactive' WHERE id = $1 RETURNING route_id`,
      [bus_id]
    );
    const io = req.app.get("io");
    const route_id = busRow.rows[0]?.route_id;
    if (io) {
      // Global broadcast (see trip/start) so admin dashboards receive this
      // too, not just commuters subscribed to the route room.
      io.emit("bus_inactive", { bus_id: Number(bus_id), route_id });
    }

    return res.json({ message: "Trip ended successfully", trip_id: result.rows[0].id });
  } catch (err) {
    console.error("trip/end error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/driver/location
// ---------------------------------------------------------------------------
// Records a GPS ping from the driver's device and broadcasts real-time
// location + ETA data to all commuters subscribed to this route via Socket.io.
//
// Body: { bus_id, lat, lng, speed, timestamp }
//
// Key logic:
//   1. Verify bus_id matches the token to prevent spoofing.
//   2. Insert the ping into live_locations.
//   3. Compute average speed from the last 10 pings; use 20 km/h as
//      fallback if there are fewer than 3 pings or the average is < 5 km/h.
//   4. Find the nearest stop and compute ETAs to the next 3 stops.
//   5. Emit a Socket.io event to the route room and respond with the same data.
//
// Response: { bus_id, bus_number, lat, lng, speed, etas }
// ---------------------------------------------------------------------------
router.post("/location", async (req, res) => {
  try {
    const assignedBusId = await resolveBusId(req.user);
    let { bus_id, lat, lng, speed, timestamp } = req.body;

    // Fallback to assigned bus if not passed
    if (!bus_id && assignedBusId) {
      bus_id = assignedBusId;
    }

    // Security check: driver can only update their own bus
    if (Number(bus_id) !== Number(assignedBusId)) {
      return res.status(403).json({ error: "bus_id does not match your assigned bus" });
    }

    // Validate required fields
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ error: "lat and lng are required" });
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: "lat and lng must be valid coordinates" });
    }

    // 1. Insert the GPS ping into live_locations
    const pingTime = timestamp ? new Date(timestamp) : new Date();
    if (Number.isNaN(pingTime.getTime())) {
      return res.status(400).json({ error: "timestamp is invalid" });
    }
    await pool.query(
      `INSERT INTO live_locations (bus_id, lat, lng, speed, timestamp)
       VALUES ($1, $2, $3, $4, $5)`,
      [bus_id, latNum, lngNum, speed ?? 0, pingTime]
    );

    // 2. Load bus details (bus_number, route_id) for the emit payload
    const busResult = await pool.query(
      `SELECT b.bus_number, b.route_id
       FROM buses b WHERE b.id = $1`,
      [bus_id]
    );

    if (busResult.rows.length === 0) {
      return res.status(404).json({ error: "Bus not found" });
    }

    const { bus_number, route_id } = busResult.rows[0];

    // 3. Compute average speed from the last 10 pings
    const speedRows = await pool.query(
      `SELECT speed FROM live_locations
       WHERE bus_id = $1
       ORDER BY timestamp DESC
       LIMIT 10`,
      [bus_id]
    );

    let avgSpeed = 20; // default fallback speed in km/h
    const speeds = speedRows.rows.map((r) => Number(r.speed));
    if (speeds.length >= 3) {
      const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      avgSpeed = mean >= 5 ? mean : 20;
    }

    // 4. Load route stops ordered by sequence_number
    const stopsResult = await pool.query(
      `SELECT id, name, lat, lng, sequence_number
       FROM stops
       WHERE route_id = $1
       ORDER BY sequence_number ASC`,
      [route_id]
    );

    const stops = stopsResult.rows;

    // 5. Compute ETAs to the next stops after the nearest one
    const etas = computeEtas(latNum, lngNum, stops, avgSpeed);

    // 6. Build the payload for both the Socket.io broadcast and the HTTP response
    const payload = {
      bus_id: Number(bus_id),
      bus_number,
      lat: latNum,
      lng: lngNum,
      speed: Number(speed ?? 0),
      etas,
    };

    // 7. Broadcast to all commuters watching this route
    // req.app.get("io") retrieves the Socket.io instance stored on the app
    const io = req.app.get("io");
    if (io && route_id) {
      io.to(`route:${route_id}`).emit("location_update", payload);
    }

    return res.json(payload);
  } catch (err) {
    console.error("location error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/driver/assignment
// ---------------------------------------------------------------------------
// Returns the full assignment for the authenticated driver:
// bus details, route details, and the ordered list of stops on their route.
// Used by the frontend to display dynamic route/bus info and to generate
// simulated GPS coordinates along the actual assigned route.
//
// Response: { bus_id, bus_number, route_id, route_name, start_point,
//             end_point, stops: [{ id, name, lat, lng, sequence_number }] }
// ---------------------------------------------------------------------------
router.get("/assignment", async (req, res) => {
  try {
    const bus_id = await resolveBusId(req.user);

    if (!bus_id) {
      return res.status(404).json({ error: "No bus assigned to this driver" });
    }

    // Fetch bus + route details in a single query
    const busResult = await pool.query(
      `SELECT b.id AS bus_id, b.bus_number, b.route_id,
              r.name AS route_name, r.start_point, r.end_point
       FROM buses b
       LEFT JOIN routes r ON b.route_id = r.id
       WHERE b.id = $1`,
      [bus_id]
    );

    if (busResult.rows.length === 0) {
      return res.status(404).json({ error: "Assigned bus not found" });
    }

    const assignment = busResult.rows[0];

    // Fetch route stops in order
    let stops = [];
    if (assignment.route_id) {
      const stopsResult = await pool.query(
        `SELECT id, name, lat, lng, sequence_number
         FROM stops
         WHERE route_id = $1
         ORDER BY sequence_number ASC`,
        [assignment.route_id]
      );
      stops = stopsResult.rows;
    }

    return res.json({
      bus_id: assignment.bus_id,
      bus_number: assignment.bus_number,
      route_id: assignment.route_id,
      route_name: assignment.route_name,
      start_point: assignment.start_point,
      end_point: assignment.end_point,
      stops,
    });
  } catch (err) {
    console.error("assignment error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;