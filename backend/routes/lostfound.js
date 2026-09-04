// routes/lostfound.js
// Endpoints for the lost-and-found ledger.
//
// POST /api/lostfound       – public, submit a lost or found item
// GET  /api/lostfound       – public (found items only, no contact_phone)
//                           – admin gets ALL items WITH contact_phone
// PATCH /api/lostfound/:id  – admin only, update status

const express = require("express");
const pool = require("../db");
const jwt = require("jsonwebtoken");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/lostfound   (public)
// ---------------------------------------------------------------------------
// Creates a new lost-or-found item entry in the database.
//
// Body: { type, route_id, bus_id, description, approx_time, contact_phone }
//   - type: 'lost' or 'found'
//   - route_id / bus_id: optional, may be null if unknown
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { type, route_id, bus_id, description, approx_time, contact_phone } =
      req.body;

    if (!type || !description || !approx_time || !contact_phone) {
      return res.status(400).json({
        error: "type, description, approx_time, and contact_phone are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO lost_found_items
         (type, route_id, bus_id, description, approx_time, contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, type, status, created_at`,
      [type, route_id ?? null, bus_id ?? null, description, approx_time, contact_phone]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23514") {
      return res.status(400).json({ error: "Invalid type or status value" });
    }
    console.error("POST /lostfound error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/lostfound
// ---------------------------------------------------------------------------
// Behaviour depends on the caller's identity:
//   - Admin (valid token with role='admin'): returns ALL items, including
//     contact_phone for every item.
//   - Everyone else: returns only items of type='found', with contact_phone
//     stripped from the response to protect privacy.
//
// We attempt a soft token check here (no hard 401 on missing token) so
// that unauthenticated commuters can still browse found items.
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    // Try to decode the token without forcing 401 on failure
    let isAdmin = false;
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        isAdmin = decoded.role === "admin";
      } catch (_) {
        // Invalid token – treat as unauthenticated
      }
    }

    let result;
    if (isAdmin) {
      // Admin: return everything with contact_phone
      result = await pool.query(
        `SELECT id, type, route_id, bus_id, description, approx_time,
                contact_phone, status, created_at
         FROM lost_found_items
         ORDER BY created_at DESC`
      );
      return res.json(result.rows);
    } else {
      // Public: only 'found' items, contact_phone hidden
      result = await pool.query(
        `SELECT id, type, route_id, bus_id, description, approx_time,
                status, created_at
         FROM lost_found_items
         WHERE type = 'found'
         ORDER BY created_at DESC`
      );
      return res.json(result.rows);
    }
  } catch (err) {
    console.error("GET /lostfound error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/lostfound/:id   (admin only)
// ---------------------------------------------------------------------------
// Updates the status of a lost-or-found item.
// Body: { status }  – valid values: 'open', 'matched', 'closed'
// ---------------------------------------------------------------------------
router.patch("/:id", requireAuth("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const result = await pool.query(
      `UPDATE lost_found_items SET status = $1
       WHERE id = $2
       RETURNING id, type, status, created_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23514") {
      return res.status(400).json({ error: "Invalid status value" });
    }
    console.error("PATCH /lostfound/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
