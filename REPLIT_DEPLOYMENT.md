# TrackMyBus – Replit Deployment Guide

This guide walks you through deploying the TrackMyBus backend to Replit with a public URL and its built-in PostgreSQL database, migrating your database schema and seed data over.

---

## Architecture on Replit

- **Runtime:** Node.js 20 on Linux (Nix environment)
- **Web Server:** Express on port `3000` bound to `0.0.0.0`
- **Real-Time:** Socket.io sharing port `3000`
- **Database:** Replit Built-in PostgreSQL (managed instance)
- **Public URL:** `https://<your-repl-name>.<your-username>.replit.app`
- **Auto-Migration:** On server start, `server.js` checks if the `users` table exists. If the database is empty, it automatically executes `database/schema.sql` to create all tables, indexes, views, and seed initial data.

---

## Step-by-Step Deployment Instructions

### Step 1: Import the Repository into Replit

1. Go to [https://replit.com](https://replit.com) and log in.
2. Click the **+ Create Repl** button (top right or sidebar).
3. In the modal, choose **"Import from Git"**.
4. Paste your repository URL:
   ```
   https://gitlab.com/claude-fable-group2/trackmybus.git
   ```
   *(Or connect your GitHub/GitLab account if it is a private repository, or upload the project folder).*
5. Select **Node.js** as the template if prompted, then click **Import from Git**.

---

### Step 2: Enable Replit's Built-in PostgreSQL Database

1. In your Repl workspace, look at the left sidebar and click on **Tools** (or the wrench/grid icon).
2. Click **Database** (or search for "PostgreSQL" / "SQL Database").
3. Click **Create Database** (or ask the Replit Agent: *"Add a PostgreSQL database"*).
4. Replit will provision a managed PostgreSQL database and **automatically set the `DATABASE_URL` environment variable**.

---

### Step 3: Configure Replit Secrets (Environment Variables)

1. In the left sidebar, click on **Tools > Secrets** (lock icon 🔒).
2. Add the following secrets:

| Key | Value | Description |
|---|---|---|
| `JWT_SECRET` | `trackmybus_secure_production_secret_2026_xyz` | Secret key for signing driver & admin JWT tokens |
| `CORS_ORIGIN` | `*` | Allowed CORS origins (`*` or your frontend URL) |

*(Note: `DATABASE_URL`, `PORT=3000`, and `HOST=0.0.0.0` are handled automatically by Replit and `.replit`)*.

---

### Step 4: Run the Application & Migrate Schema

1. Click the large green **▶ Run** button at the top of Replit.
2. Replit will:
   - Install dependencies if not already installed (`npm install`).
   - Run `npm start` (which runs `node backend/server.js`).
   - Bind to `http://0.0.0.0:3000`.
   - **Auto-run database migration:** The server detects an empty database and automatically executes `database/schema.sql`.
3. In the Console output, you will see:
   ```text
   🚌 TrackMyBus API server running on http://0.0.0.0:3000
      Health: http://0.0.0.0:3000/api/health
   ⚡ Empty or uninitialized database detected. Auto-migrating schema & seed data...
   🔄 Connecting to database for migration...
   ✅ Connected to database.
   📄 Reading schema from: /home/runner/trackmybus/database/schema.sql
   ⚡ Executing schema and seed data SQL...
   🎉 Migration completed successfully!
      - Users seeded:   2
      - Routes seeded:  2
      - Buses seeded:   1
   ✅ Database schema and seed data initialized successfully!
   ```

*(Optional: If you ever need to manually re-run or reset the migration, open the Replit **Shell** tab and run: `npm run migrate`)*.

---

### Step 5: Get Your Public URL & Deploy

1. Once running, Replit's **Webview** tab opens automatically displaying the server status or a live preview.
2. In the Webview panel header, copy the public URL:
   ```
   https://<your-repl-name>.<your-username>.replit.app
   ```
3. To make it persistently deployed (free tier autoscale or cloud deployment):
   - Click the **Deploy** button at the top right of the Replit workspace.
   - Choose **Autoscale** deployment (or the default free deployment option).
   - Click **Deploy your project**.

---

## Verification & Testing Live Endpoints

Replace `https://trackmybus.<user>.replit.app` below with your actual Replit URL:

### 1. Health Check
```bash
curl -X GET https://trackmybus.<user>.replit.app/api/health
```
**Response:**
```json
{"ok":true}
```

---

### 2. Login as Seeded Driver (Ramesh Kumar)
```bash
curl -X POST https://trackmybus.<user>.replit.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9000000002","password":"password123"}'
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "driver",
  "user_id": 2,
  "bus_id": 1
}
```

---

### 3. Fetch All Public Routes
```bash
curl -X GET https://trackmybus.<user>.replit.app/api/routes
```
**Response:**
```json
[
  {
    "id": 1,
    "name": "Route 10H - IT Express Corridor",
    "start_point": "Secunderabad Railway Station",
    "end_point": "Gachibowli DLF Cybercity",
    "city_code": "HYD"
  },
  {
    "id": 2,
    "name": "Route AC-Pushpak - Airport Liner",
    "start_point": "Mehdipatnam Bus Terminal",
    "end_point": "Rajiv Gandhi Intl Airport (RGIA)",
    "city_code": "HYD"
  }
]
```

---

### 4. Fetch Live Locations & ETAs for Route 1
```bash
curl -X GET https://trackmybus.<user>.replit.app/api/routes/1/live
```
**Response:**
```json
[
  {
    "bus_id": 1,
    "bus_number": "TS09-1234",
    "lat": 17.4421,
    "lng": 78.412,
    "speed": 48.2,
    "etas": [
      {
        "stop_id": 4,
        "stop_name": "Gachibowli DLF Cybercity Gate",
        "eta_min": 5
      }
    ]
  }
]
```

---

### 5. Test Real-time WebSockets (Socket.io)
You can connect to your Replit public URL with any Socket.io client:
```javascript
const { io } = require("socket.io-client");

const socket = io("https://trackmybus.<user>.replit.app", {
  transports: ["websocket", "polling"]
});

socket.on("connect", () => {
  console.log("Connected to Replit Socket.io server!");
  socket.emit("join_route", { route_id: 1 });
});

socket.on("location_update", (data) => {
  console.log("Real-time bus telemetry:", data);
});
```
