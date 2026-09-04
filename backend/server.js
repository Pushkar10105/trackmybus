// server.js
// Application entry point.
// Sets up Express, Socket.io, CORS, JSON parsing, mounts all route files,
// and starts the periodic "stale bus" checker that marks buses inactive when
// they stop sending GPS pings.

require("dotenv").config(); // Load .env variables before anything else

const express = require("express");
const http = require("http");
const { Server: SocketIO } = require("socket.io");
const cors = require("cors");
const pool = require("./db");

// ---------------------------------------------------------------------------
// Express app + HTTP server setup
// ---------------------------------------------------------------------------
const app = express();

// Wrap the express app in a plain Node HTTP server so Socket.io can share it
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// CORS – allow requests from the front-end origin(s) defined in .env
// ---------------------------------------------------------------------------
// CORS_ORIGIN can be a single URL, comma-separated list, or '*' for any origin.
const corsOriginEnv = process.env.CORS_ORIGIN || "*";
const allowedOrigins = corsOriginEnv.split(",").map((s) => s.trim());

const corsOptions = {
  origin: corsOriginEnv === "*"
    ? true // reflect request origin, compatible with credentials
    : (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Parse incoming JSON request bodies automatically
app.use(express.json());

// ---------------------------------------------------------------------------
// Socket.io setup
// ---------------------------------------------------------------------------
// Socket.io runs on the same port as Express by sharing the HTTP server.
const io = new SocketIO(server, {
  cors: {
    origin: corsOriginEnv === "*" ? true : allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store the io instance on the Express app so route handlers can access it
// via req.app.get("io") without circular imports.
app.set("io", io);

// ---------------------------------------------------------------------------
// Socket.io connection handling
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  /**
   * 'join_route' event
   * Emitted by the front-end when a commuter opens a live map for a route.
   * We add the socket to a named room so that location_update events are
   * broadcast only to commuters who care about that specific route.
   *
   * Expected payload: { route_id }
   */
  socket.on("join_route", ({ route_id }) => {
    if (!route_id) return;
    const room = `route:${route_id}`;
    socket.join(room);
    console.log(`  ↳ ${socket.id} joined room ${room}`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ---------------------------------------------------------------------------
// Route mounting
// ---------------------------------------------------------------------------
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/driver",    require("./routes/driver"));
app.use("/api/routes",    require("./routes/routes"));
app.use("/api/issues",    require("./routes/issues"));
app.use("/api/lostfound", require("./routes/lostfound"));
app.use("/api/admin",     require("./routes/admin"));

// ---------------------------------------------------------------------------
// Health check endpoint
// ---------------------------------------------------------------------------
// Simple endpoint so load balancers and CI pipelines can verify the server
// is alive without hitting any database logic.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Stale bus checker – runs every 60 seconds
// ---------------------------------------------------------------------------
// Some drivers may lose connectivity or forget to end their trip.
// This background job detects buses whose last GPS ping is older than
// 5 minutes and marks them 'inactive', then notifies connected commuters
// via Socket.io so the UI removes the ghost bus marker.
setInterval(async () => {
  try {
    // Find buses that are still marked 'active' but have not pinged recently
    const stale = await pool.query(
      `SELECT b.id AS bus_id, b.route_id
       FROM buses b
       JOIN LATERAL (
         SELECT timestamp FROM live_locations
         WHERE bus_id = b.id
         ORDER BY timestamp DESC
         LIMIT 1
       ) ll ON true
       WHERE b.status = 'active'
         AND ll.timestamp < NOW() - INTERVAL '5 minutes'`
    );

    if (stale.rows.length === 0) return;

    for (const bus of stale.rows) {
      // Mark the bus inactive in the database
      await pool.query(
        `UPDATE buses SET status = 'inactive' WHERE id = $1`,
        [bus.bus_id]
      );

      // Notify commuters watching this bus's route
      if (bus.route_id) {
        io.to(`route:${bus.route_id}`).emit("bus_inactive", {
          bus_id: bus.bus_id,
        });
      }

      console.log(`⚠️  Bus ${bus.bus_id} marked inactive (no ping for >5 min)`);
    }
  } catch (err) {
    console.error("Stale bus checker error:", err);
  }
}, 60_000); // run every 60 seconds

// ---------------------------------------------------------------------------
// Auto-migrate schema & seed data if tables do not exist
// ---------------------------------------------------------------------------
async function ensureDatabaseInitialized() {
  if (!process.env.DATABASE_URL) return;

  try {
    // Check if the primary 'users' table already exists
    const checkRes = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    const tablesExist = checkRes.rows[0]?.exists;
    if (!tablesExist || process.env.AUTO_MIGRATE === "true") {
      console.log("⚡ Empty or uninitialized database detected. Auto-migrating schema & seed data...");
      const { runMigration } = require("./scripts/migrate");
      await runMigration();
      console.log("✅ Database schema and seed data initialized successfully!");
    } else {
      console.log("✅ Database tables already exist, skipping auto-migration.");
    }
  } catch (err) {
    console.warn("⚠️  Database initialization check encountered an error:", err.message);
  }
}

// ---------------------------------------------------------------------------
// Start listening
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, async () => {
  console.log(`🚌 TrackMyBus API server running on http://${HOST}:${PORT}`);
  console.log(`   Health: http://${HOST}:${PORT}/api/health`);
  await ensureDatabaseInitialized();
});
