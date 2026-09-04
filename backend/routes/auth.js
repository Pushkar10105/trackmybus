// routes/auth.js
// Handles user authentication.
// Currently only login is supported; registration is done via the admin seeder.

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

/**
 * POST /api/auth/login
 *
 * Body: { phone, password }
 *
 * Looks up the user by phone number, compares the submitted plain-text
 * password against the stored bcrypt hash, and issues a signed JWT if
 * they match.
 *
 * JWT payload contains: user_id, role, bus_id.
 * bus_id is the ID of the bus assigned to this driver (null for admin).
 *
 * Response: { token, role, user_id, bus_id }
 */
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Basic input validation
    if (!phone || !password) {
      return res.status(400).json({ error: "phone and password are required" });
    }

    // 1. Find the user by their phone number
    const userResult = await pool.query(
      "SELECT id, name, role, password_hash FROM users WHERE phone = $1",
      [phone]
    );

    if (userResult.rows.length === 0) {
      // Use a generic message to avoid leaking whether the phone exists
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];

    // 2. Compare the submitted password with the stored hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Resolve bus_id for drivers (null for admin / commuter)
    let bus_id = null;
    if (user.role === "driver") {
      const busResult = await pool.query(
        "SELECT id FROM buses WHERE driver_id = $1 LIMIT 1",
        [user.id]
      );
      if (busResult.rows.length > 0) {
        bus_id = busResult.rows[0].id;
      }
    }

    // 4. Sign and return a JWT that expires in 12 hours
    const payload = { user_id: user.id, role: user.role, bus_id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    return res.json({ token, role: user.role, user_id: user.id, bus_id });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
