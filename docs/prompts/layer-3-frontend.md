# Layer 3 - Frontend

**Tool:** v0.dev by Vercel (free tier)
**Owner:** frontend pair
**Output:** `frontend/` folder
**Note:** build against the API shape in `docs/PRD.md` section 8. You do not need to wait for the backend.

---

```
Build a React + Vite + Tailwind web app called TrackMyBus with 3 pages
using react-router. It talks to a REST API at import.meta.env.VITE_API_URL
and a Socket.io server at import.meta.env.VITE_SOCKET_URL. Include a
.env.example.

1. /driver
   - Login form (phone + password) -> POST /api/auth/login, store the JWT
     in localStorage.
   - After login: show the bus number and one very large "Start Trip"
     button. On tap: POST /api/driver/trip/start, then use
     navigator.geolocation.watchPosition (or a 5-second interval) to
     POST /api/driver/location with {bus_id, lat, lng, speed, timestamp}
     and the Authorization: Bearer header. Button becomes "End Trip".
   - Show a small status pill: "Sending" (green), "No GPS signal"
     (yellow), "Error" (red). Big tap targets, high contrast, minimal text.

2. /commuter
   - Leaflet map (react-leaflet, OpenStreetMap tiles) centered on a
     config value. Route dropdown fed by GET /api/routes.
   - On route select: GET /api/routes/:id to draw stop markers and a
     polyline, GET /api/routes/:id/live for the initial bus position,
     and emit `join_route {route_id}` on the socket. On
     `location_update` events, move the bus marker and update a side
     panel listing the next 3 stops with eta_min. On `bus_inactive`,
     grey out the marker.
   - A "Report an issue" button opening a modal: bus number, category
     dropdown (seat, ac, cleanliness, safety, driving, other), optional
     text -> POST /api/issues. Block repeat submissions for the same
     bus+category in this browser session via localStorage.
   - A "Lost & Found" button opening a panel: list from GET
     /api/lostfound (found items) and a form (type lost/found, route,
     bus, description, approx time, contact phone) -> POST /api/lostfound.
   - A floating chat button (bottom right) opening a chat widget with a
     language picker (English, Hindi, Tamil, Telugu, Kannada, Marathi)
     mapped to locales en-IN, hi-IN, ta-IN, te-IN, kn-IN, mr-IN. Text
     input plus a mic button that uses the Web Speech API
     (webkitSpeechRecognition) with the chosen locale for speech-to-text.
     Send {message, lang} to POST /api/chat, show the reply, and read it
     aloud with window.speechSynthesis using the same locale. If speech
     APIs are unsupported, hide the mic and keep text working.

3. /admin
   - Login (reuse the /driver login form, role must be admin).
   - Tabs: Routes, Buses, Issues, Lost & Found.
   - Routes: table of routes; expanding a row shows its stops; forms to
     add a route and add a stop (name, lat, lng, sequence) via
     /api/admin/routes and /api/admin/stops.
   - Buses: table with bus number, route, driver, status, last seen;
     form to add a bus via /api/admin/buses.
   - Issues: GET /api/issues, table sorted as returned, severity shown as
     a colored badge (high red, medium orange, low grey), with a
     "Resolve" button -> PATCH /api/issues/:busId/:category/resolve.
   - Lost & Found: GET /api/lostfound with admin token, status dropdown
     per row -> PATCH /api/lostfound/:id.

Styling: clean Tailwind defaults, mobile-first for /driver and /commuter,
desktop-first for /admin. Don't over-invest in custom design. Keep
components small and commented so a beginner can explain them.
```
