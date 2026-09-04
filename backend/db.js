// db.js
// Creates and exports a single shared PostgreSQL connection pool.
// Using a pool instead of individual connections lets us reuse
// already-open TCP sockets, which is much faster under load.

const { Pool } = require("pg");
require("dotenv").config();

// 'Pool' manages multiple database connections automatically.
// We read the connection string from the environment so credentials
// never appear in source code.
const connectionString = process.env.DATABASE_URL;

// Automatically enable SSL for cloud-hosted databases (e.g. Neon, Supabase, Render)
// or when explicitly requested via sslmode=require, while keeping it disabled for internal Replit/localhost
let ssl = false;
if (
  process.env.PGSSLMODE === "require" ||
  (connectionString &&
    (connectionString.includes("sslmode=require") ||
     connectionString.includes("neon.tech") ||
     connectionString.includes("supabase.co") ||
     connectionString.includes("render.com")))
) {
  ssl = { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString,
  ssl,
});

// Quick test on startup so we fail early with a clear message
// instead of cryptic errors on the first real query.
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Failed to connect to the database:", err.message);
  } else {
    console.log("✅ Database pool connected successfully");
    release(); // return the test connection back to the pool
  }
});

module.exports = pool;
