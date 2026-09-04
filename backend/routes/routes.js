// routes/routes.js
// Public endpoints for browsing bus routes and checking live bus positions.
// No authentication required.

const express = require("express");
const pool = require("../db");
const { computeEtas } = require("../utils/geo");

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/routes
// ---------------------------------------------------------------------------
// Returns every route in the system (id, name, start, end, city_code).
// Useful for showing a route-picker screen in the app.
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, start_point, end_point, city_code, created_at
       FROM routes
       ORDER BY id ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /routes error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/routes/:id
// ---------------------------------------------------------------------------
// Returns a single route along with its ordered list of stops.
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the route
    const routeResult = await pool.query(
      `SELECT id, name, start_point, end_point, city_code, created_at
       FROM routes WHERE id = $1`,
      [id]
    );

    if (routeResult.rows.length === 0) {
      return res.status(404).json({ error: "Route not found" });
    }

    // Fetch its stops in sequence order
    const stopsResult = await pool.query(
      `SELECT id, name, lat, lng, sequence_number
       FROM stops
       WHERE route_id = $1
       ORDER BY sequence_number ASC`,
      [id]
    );

    return res.json({
      ...routeResult.rows[0],
      stops: stopsResult.rows,
    });
  } catch (err) {
    console.error("GET /routes/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/routes/:id/live
// ---------------------------------------------------------------------------
// Returns live bus positions for all active buses on this route that have
// sent a GPS ping within the last 5 minutes, together with ETAs to the
// next stops (reuses computeEtas from utils/geo.js).
//
// Response: [{ bus_id, bus_number, lat, lng, speed, etas }]
// ---------------------------------------------------------------------------
router.get("/:id/live", async (req, res) => {
  try {
    const { id: route_id } = req.params;

    // Confirm the route exists
    const routeCheck = await pool.query(
      `SELECT id FROM routes WHERE id = $1`,
      [route_id]
    );
    if (routeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Route not found" });
    }

    // Find all buses on this route that have a recent ping (within 5 min)
    const busesResult = await pool.query(
      `SELECT
         b.id        AS bus_id,
         b.bus_number,
         ll.lat,
         ll.lng,
         ll.speed,
         ll.timestamp AS last_ping
       FROM buses b
       JOIN LATERAL (
         SELECT lat, lng, speed, timestamp
         FROM live_locations
         WHERE bus_id = b.id
         ORDER BY timestamp DESC
         LIMIT 1
       ) ll ON true
       WHERE b.route_id = $1
         AND ll.timestamp >= NOW() - INTERVAL '5 minutes'`,
      [route_id]
    );

    if (busesResult.rows.length === 0) {
      return res.json([]); // no active buses right now
    }

    // Load this route's stops once (shared for all buses on the route)
    const stopsResult = await pool.query(
      `SELECT id, name, lat, lng, sequence_number
       FROM stops
       WHERE route_id = $1
       ORDER BY sequence_number ASC`,
      [route_id]
    );
    const stops = stopsResult.rows;

    // For each active bus compute ETAs using its last known speed
    const liveBuses = busesResult.rows.map((bus) => {
      // Use a reasonable fallback speed if the stored speed is too low
      const avgSpeed = Number(bus.speed) >= 5 ? Number(bus.speed) : 20;
      const etas = computeEtas(Number(bus.lat), Number(bus.lng), stops, avgSpeed);
      return {
        bus_id: bus.bus_id,
        bus_number: bus.bus_number,
        lat: Number(bus.lat),
        lng: Number(bus.lng),
        speed: Number(bus.speed),
        etas,
      };
    });

    return res.json(liveBuses);
  } catch (err) {
    console.error("GET /routes/:id/live error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
