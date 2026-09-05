// routes/issues.js
// Endpoints for submitting and managing commuter-reported bus issues.
//
// Public:  POST /api/issues           - anyone can submit a complaint
// Admin:   GET  /api/issues           - view aggregated issue summary
// Admin:   PATCH /api/issues/:busId/:category/resolve - close issues

const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/issues   (public – no auth required)
// ---------------------------------------------------------------------------
// Creates a new issue flag for a bus identified by its human-readable
// bus_number (e.g. "TS09-1234").
//
// Body: { bus_number, category, description }
//
// Valid categories: 'seat', 'ac', 'cleanliness', 'safety', 'driving', 'other'
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { bus_number, category, description } = req.body;

    if (!bus_number || !category || !description) {
      return res
        .status(400)
        .json({ error: "bus_number, category, and description are required" });
    }

    // Resolve the bus_number string to an actual bus id
    const busResult = await pool.query(
      `SELECT id FROM buses WHERE LOWER(bus_number) = LOWER($1)`,
      [String(bus_number).trim()]
    );

    if (busResult.rows.length === 0) {
      return res.status(404).json({ error: `Bus '${bus_number}' not found` });
    }

    const bus_id = busResult.rows[0].id;

    // Insert the new issue flag
    const result = await pool.query(
      `INSERT INTO issue_flags (bus_id, category, description)
       VALUES ($1, $2, $3)
       RETURNING id, bus_id, category, description, created_at`,
      [bus_id, category, description]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    // PostgreSQL check constraint violation has code 23514
    if (err.code === "23514") {
      return res.status(400).json({ error: "Invalid category value" });
    }
    console.error("POST /issues error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/issues   (admin only)
// ---------------------------------------------------------------------------
// Returns rows from the issue_summary view (pre-built in schema.sql).
// Sorted by severity (high → medium → low) then by most flags.
// ---------------------------------------------------------------------------
router.get("/", requireAuth("admin"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bus_id, bus_number, category, flag_count, last_flagged_at, severity
       FROM issue_summary
       ORDER BY
         CASE severity
           WHEN 'high'   THEN 1
           WHEN 'medium' THEN 2
           ELSE               3
         END,
         flag_count DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /issues error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/issues/:busId/:category/resolve   (admin only)
// ---------------------------------------------------------------------------
// Marks all unresolved issues for a given bus+category combination as
// resolved by setting resolved_at = NOW().
//
// Params: busId (integer), category (string)
// ---------------------------------------------------------------------------
router.patch(
  "/:busId/:category/resolve",
  requireAuth("admin"),
  async (req, res) => {
    try {
      const { busId, category } = req.params;

      const result = await pool.query(
        `UPDATE issue_flags
         SET resolved_at = NOW()
         WHERE bus_id = $1
           AND category = $2
           AND resolved_at IS NULL
         RETURNING id`,
        [busId, category]
      );

      return res.json({
        message: `Resolved ${result.rowCount} issue(s)`,
        resolved_ids: result.rows.map((r) => r.id),
      });
    } catch (err) {
      console.error("PATCH /issues/:busId/:category/resolve error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
