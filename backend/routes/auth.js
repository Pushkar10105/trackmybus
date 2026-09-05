// routes/auth.js
// Handles user authentication.
// Login is for existing users; signup allows new drivers to self-register.

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/signup
 *
 * Body: { name, phone, password }
 *
 * Creates a new driver account. Phone numbers must be unique across all
 * users (drivers, admins). New accounts are active immediately — no
 * separate approval step. Route/bus assignment is handled afterwards by
 * an admin (via the existing bus management endpoints), not at signup.
 *
 * Response: { token, role, user_id, bus_id } — same shape as /login, so
 * the frontend can log the driver straight in after signup.
 */
router.post("/signup", async (req, res) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const phone = String(req.body.phone ?? "").trim();
    const password = req.body.password;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: "name, phone, and password are required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this phone number already exists" });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const inserted = await pool.query(
      `INSERT INTO users (name, phone, password_hash, role)
       VALUES ($1, $2, $3, 'driver')
       RETURNING id, name, role`,
      [name, phone, password_hash]
    );
    const user = inserted.rows[0];

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "Server is missing JWT_SECRET" });
    }

    const bus_id = null;

    const payload = { user_id: user.id, role: user.role, bus_id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    return res.status(201).json({ token, role: user.role, user_id: user.id, bus_id });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

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
    const phone = String(req.body.phone ?? "").trim();
    const password = req.body.password;

    if (!phone || !password) {
      return res.status(400).json({ error: "phone and password are required" });
    }

    const userResult = await pool.query(
      "SELECT id, name, role, password_hash FROM users WHERE phone = $1",
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];

    if (user.role !== "driver" && user.role !== "admin") {
      return res.status(403).json({ error: "Only drivers and admins can log in" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

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

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "Server is missing JWT_SECRET" });
    }

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