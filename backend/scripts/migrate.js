// scripts/migrate.js
// Standalone migration script that applies database/schema.sql
// against the target PostgreSQL database specified by DATABASE_URL.
//
// Usage:
//   node backend/scripts/migrate.js
//   or
//   npm run migrate (inside backend or root)

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ Error: DATABASE_URL is not set in environment or .env file.");
    process.exit(1);
  }

  // Determine SSL configuration
  let ssl = false;
  if (
    process.env.PGSSLMODE === "require" ||
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("neon.tech") ||
    databaseUrl.includes("supabase.co") ||
    databaseUrl.includes("render.com")
  ) {
    ssl = { rejectUnauthorized: false };
  }

  console.log("🔄 Connecting to database for migration...");
  const client = new Client({
    connectionString: databaseUrl,
    ssl,
  });

  try {
    await client.connect();
    console.log("✅ Connected to database.");

    // Find schema.sql file
    const possiblePaths = [
      path.resolve(__dirname, "../../database/schema.sql"),
      path.resolve(__dirname, "../database/schema.sql"),
      path.resolve(process.cwd(), "database/schema.sql"),
    ];

    let schemaPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        schemaPath = p;
        break;
      }
    }

    if (!schemaPath) {
      throw new Error("Could not find schema.sql in expected database directories.");
    }

    console.log(`📄 Reading schema from: ${schemaPath}`);
    const sql = fs.readFileSync(schemaPath, "utf8");

    console.log("⚡ Executing schema and seed data SQL...");
    await client.query(sql);

    // Verify imported data
    const userCount = await client.query("SELECT COUNT(*)::int AS count FROM users;");
    const routeCount = await client.query("SELECT COUNT(*)::int AS count FROM routes;");
    const busCount = await client.query("SELECT COUNT(*)::int AS count FROM buses;");

    console.log("🎉 Migration completed successfully!");
    console.log(`   - Users seeded:   ${userCount.rows[0].count}`);
    console.log(`   - Routes seeded:  ${routeCount.rows[0].count}`);
    console.log(`   - Buses seeded:   ${busCount.rows[0].count}`);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Allow importing as a helper or running directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
