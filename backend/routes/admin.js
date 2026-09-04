// routes/admin.js
// Admin-only CRUD endpoints for managing routes, stops, and buses.
// Every endpoint requires a valid JWT with role="admin".

const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// All admin routes require the "admin" role
router.use(requireAuth("admin"));

// =============================================================================
// ROUTES CRUD  – /api/admin/routes
// =============================================================================

/**
 * POST /api/admin/routes
 * Create a new bus route.
 * Body: { name, start_point, end_point, city_code }
 */
router.post("/routes", async (req, res) => {
  try {
    const { name, start_point, end_point, city_code } = req.body;

    if (!name || !start_point || !end_point || !city_code) {
      return res
        .status(400)
        .json({ error: "name, start_point, end_point, city_code are required" });
    }

    const result = await pool.query(
      `INSERT INTO routes (name, start_point, end_point, city_code)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, start_point, end_point, city_code]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /admin/routes error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/admin/routes/:id
 * Partially update a route's fields.
 * Body: any subset of { name, start_point, end_point, city_code }
 */
router.patch("/routes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_point, end_point, city_code } = req.body;

    // Build a dynamic SET clause with only the supplied fields
    const fields = [];
    const values = [];
    let idx = 1;

    if (name)        { fields.push(`name = $${idx++}`);        values.push(name); }
    if (start_point) { fields.push(`start_point = $${idx++}`); values.push(start_point); }
    if (end_point)   { fields.push(`end_point = $${idx++}`);   values.push(end_point); }
    if (city_code)   { fields.push(`city_code = $${idx++}`);   values.push(city_code); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE routes SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Route not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /admin/routes/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/admin/routes/:id
 * Remove a route (cascades to its stops in the database).
 */
router.delete("/routes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM routes WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Route not found" });
    }
    return res.json({ message: "Route deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("DELETE /admin/routes/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// =============================================================================
// STOPS CRUD  – /api/admin/stops
// =============================================================================

/**
 * POST /api/admin/stops
 * Add a new stop to a route.
 * Body: { route_id, name, lat, lng, sequence_number }
 */
router.post("/stops", async (req, res) => {
  try {
    const { route_id, name, lat, lng, sequence_number } = req.body;

    if (!route_id || !name || lat === undefined || lng === undefined || !sequence_number) {
      return res
        .status(400)
        .json({ error: "route_id, name, lat, lng, sequence_number are required" });
    }

    const result = await pool.query(
      `INSERT INTO stops (route_id, name, lat, lng, sequence_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [route_id, name, lat, lng, sequence_number]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "A stop with that sequence_number already exists on this route" });
    }
    console.error("POST /admin/stops error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/admin/stops/:id
 * Update stop details.
 * Body: any subset of { name, lat, lng, sequence_number }
 */
router.patch("/stops/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, lat, lng, sequence_number } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined)            { fields.push(`name = $${idx++}`);            values.push(name); }
    if (lat !== undefined)             { fields.push(`lat = $${idx++}`);              values.push(lat); }
    if (lng !== undefined)             { fields.push(`lng = $${idx++}`);              values.push(lng); }
    if (sequence_number !== undefined) { fields.push(`sequence_number = $${idx++}`); values.push(sequence_number); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE stops SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Stop not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /admin/stops/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/admin/stops/:id
 * Remove a stop.
 */
router.delete("/stops/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM stops WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Stop not found" });
    }
    return res.json({ message: "Stop deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("DELETE /admin/stops/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// =============================================================================
// BUSES CRUD  – /api/admin/buses
// =============================================================================

/**
 * POST /api/admin/buses
 * Add a new bus to the fleet.
 * Body: { route_id, bus_number, driver_phone }
 *   - driver_phone is resolved to driver_id automatically.
 *   - driver_phone is optional (bus may start unassigned).
 */
router.post("/buses", async (req, res) => {
  try {
    const { route_id, bus_number, driver_phone } = req.body;

    if (!bus_number) {
      return res.status(400).json({ error: "bus_number is required" });
    }

    // Resolve driver_phone → driver_id if provided
    let driver_id = null;
    if (driver_phone) {
      const driverResult = await pool.query(
        `SELECT id FROM users WHERE phone = $1 AND role = 'driver'`,
        [driver_phone]
      );
      if (driverResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: `No driver found with phone '${driver_phone}'` });
      }
      driver_id = driverResult.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO buses (route_id, driver_id, bus_number)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [route_id ?? null, driver_id, bus_number]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Bus number already exists" });
    }
    console.error("POST /admin/buses error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/admin/buses/:id
 * Update a bus record.
 * Body: any subset of { route_id, driver_phone, bus_number, status }
 *   - driver_phone is resolved to driver_id if provided.
 */
router.patch("/buses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { route_id, driver_phone, bus_number, status } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    // Resolve driver_phone to driver_id if the caller supplied it
    if (driver_phone !== undefined) {
      if (driver_phone === null) {
        // Caller explicitly wants to unassign the driver
        fields.push(`driver_id = $${idx++}`);
        values.push(null);
      } else {
        const driverResult = await pool.query(
          `SELECT id FROM users WHERE phone = $1 AND role = 'driver'`,
          [driver_phone]
        );
        if (driverResult.rows.length === 0) {
          return res
            .status(404)
            .json({ error: `No driver found with phone '${driver_phone}'` });
        }
        fields.push(`driver_id = $${idx++}`);
        values.push(driverResult.rows[0].id);
      }
    }

    if (route_id !== undefined) { fields.push(`route_id = $${idx++}`);   values.push(route_id); }
    if (bus_number)             { fields.push(`bus_number = $${idx++}`);  values.push(bus_number); }
    if (status)                 { fields.push(`status = $${idx++}`);      values.push(status); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE buses SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bus not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23514") {
      return res.status(400).json({ error: "Invalid status value" });
    }
    console.error("PATCH /admin/buses/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/admin/buses/:id
 * Remove a bus from the fleet.
 */
router.delete("/buses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM buses WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bus not found" });
    }
    return res.json({ message: "Bus deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("DELETE /admin/buses/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
