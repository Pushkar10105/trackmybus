// routes/routes.js
// Public endpoints for browsing bus routes and checking live bus positions.
// No authentication required.

const express = require("express");
const pool = require("../db");
const { getLiveBusesForRoute } = require("../utils/liveBuses");

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

    const liveBuses = await getLiveBusesForRoute(route_id);
    return res.json(liveBuses);
  } catch (err) {
    console.error("GET /routes/:id/live error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
