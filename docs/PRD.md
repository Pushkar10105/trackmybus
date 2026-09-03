# TrackMyBus - Product Requirements Document v2

**Project:** Real-Time Public Transport Tracking for Small Cities (SVH26003)
**Status:** Hackathon MVP + roadmap
**Stack:** React + Tailwind + Leaflet.js / Node.js + Express + Socket.io / PostgreSQL / Gemini API (free tier)

---

## 0. Judging Alignment

| Category | Weight | Covered in | Pitch angle |
|---|---|---|---|
| Presentation | 10 | Whole doc, §13 | Problem → solution → impact, with a tier-3-specific USP |
| Feasibility | 10 | §7, §11 | Phone GPS only, zero hardware, built in hackathon time |
| Scalability | 10 | §10 | Config-driven: new city = new config, not new code |
| Technical Implementation | 10 | §7, §8 | Real-time pipeline GPS → matching → ETA → push, plus LLM tool-calling assistant |
| Revenue Model | 5 | §9 | B2G SaaS + data + ticketing commission; commuter app stays free |
| Adaptability | 5 | §11 | Works with or without smartphones, GPS hardware, or driver cooperation |

---

## 1. Problem Statement

Tier-2 and tier-3 Indian cities largely lack any real-time public transport information. Commuters wait at stops with no idea when, or if, a bus is coming. This pushes people toward private vehicles and autos, worsening congestion and pollution in the cities least equipped to absorb it. Metros have Chalo, Google Maps transit data, and operator apps; small cities are commercially unattractive to those players, so the gap persists.

Secondary problems the same gap creates:

- Transit authorities have no data on where buses actually are, how late they run, or which routes are underserved.
- Bus condition issues (broken seats, unsafe driving) go unreported because there is no channel.
- Non-smartphone and non-English users are excluded from whatever digital tools do exist.

---

## 2. Vision and Goals

**Vision:** Make public transport visible and trustworthy in cities technology has skipped over, without requiring cities to buy hardware or citizens to own smartphones.

**MVP goals (hackathon):**

1. A driver can share live location with one tap from their own phone.
2. A commuter can open a browser link, pick a route, and see the bus moving with ETAs to upcoming stops.
3. An admin can manage routes/stops/buses and see flagged issues ranked by severity.
4. A commuter can ask "when is the next bus on route X?" in their own language and get a live answer.

**Non-goals for MVP:** payments, ML-based ETA, native mobile apps, SMS gateway integration, multi-city tenancy.

---

## 3. Target Users and Personas

| Persona | Context | Needs | Constraints |
|---|---|---|---|
| **Commuter** (student, daily wage worker, elderly) | Waiting at a roadside stop | "Is a bus coming? When? Is it full?" | Feature phones common, limited data, low English literacy |
| **Driver / conductor** | Driving, personal Android phone | Zero-effort compliance | Resistant to new tech, will not read instructions |
| **Transit admin** (municipal corp / STU staff) | Under-resourced office | Fleet visibility, complaint triage, basic reports | No technical staff, needs it to just work in a browser |
| **Government / Smart City body** | Planning and funding | Ridership and route performance data | Wants aggregated, anonymized, exportable data |

---

## 4. User Stories

### Driver

- As a driver, I log in once and see one big "Start Trip" button so I can start sharing location without training.
- As a driver, if my signal drops, my location pings are buffered and sent later so the trip record stays complete (Phase 2).

### Commuter

- As a commuter, I open a link with no install and pick my route to see where the bus is.
- As a commuter, I see the ETA to my stop and the 2 stops after it.
- As a commuter, I can flag a problem on the bus I am on (broken seat, AC, cleanliness, unsafe driving).
- As a commuter, I can report a lost item or a found item with the bus and approximate time.
- As a commuter, I can ask a chatbot in Hindi/Tamil/etc. by voice or text when the next bus is coming or how to get somewhere.

### Admin

- As an admin, I can add/edit routes, stops (with sequence), and buses, and assign drivers.
- As an admin, I see every active bus and its last update time.
- As an admin, I see flagged issues grouped by bus and category, sorted by severity, so the most-reported problems are at the top.
- As an admin, I can update lost & found item status (open / matched / closed).

---

## 5. Functional Requirements (MVP)

### 5.1 Authentication

- JWT-based login for drivers and admins. Commuters are anonymous (no login required).
- A driver token is scoped to their assigned bus; location posts for any other bus are rejected (403).

### 5.2 Driver App (`/driver`)

- Single screen: bus number, "Start Trip" / "End Trip" toggle, status indicator (sending / no signal).
- On start: Geolocation API polls every 5 seconds and POSTs `{bus_id, lat, lng, speed, timestamp}`.
- Creates a `trips` row on start, closes it on end.
- **Acceptance:** location appears on commuter map within 2 seconds of a post on a local network.

### 5.3 Live Tracking and ETA (backend)

- On each ping: store in `live_locations`, find nearest stop on the bus's route, compute ETA to the next 3 stops.
- ETA method (MVP): straight-line (haversine) distance between successive stops divided by the bus's rolling average speed over the last 10 pings; fallback to 20 km/h if fewer than 3 pings.
- Emit `location_update` over Socket.io to room `route:{route_id}`.
- **Acceptance:** ETA shown for at least 2 upcoming stops whenever a bus has at least 1 ping in the last 60 seconds. Buses with no ping for 5 minutes are shown as "inactive".

### 5.4 Commuter App (`/commuter`)

- Leaflet map centered on city (config value), OpenStreetMap tiles (free).
- Route dropdown; on select, join Socket.io room, render stops as markers and polyline, bus as a moving marker.
- Side panel: next 3 stops with ETA in minutes.
- Buttons: "Report an issue" (opens 5.6 form), "Lost & Found" (opens 5.7), floating chat button (opens 5.8).
- Low-bandwidth mode (Phase 2): if map tiles fail to load, fall back to text-only ETA list.

### 5.5 Admin Dashboard (`/admin`)

- Tables: routes, stops per route, buses (with driver, status, last seen).
- Forms: create/edit route, add stop with lat/lng and sequence, add bus and assign driver.
- Issue panel: see 5.6. Lost & found panel: see 5.7.

### 5.6 Community Issue Flagging

- Commuter form: bus number (pre-filled if a route is selected and one bus is active), category (`seat`, `ac`, `cleanliness`, `safety`, `driving`, `other`), optional free text, optional photo (Phase 2).
- Each submission creates an `issue_flags` row.
- Severity is derived, not manually set: flags with the same `bus_id` + `category` in a rolling 7-day window are counted. `low` = 1 to 2, `medium` = 3 to 5, `high` = 6+.
- Admin view is sorted by severity desc, then flag count desc. Admin can mark an issue group `resolved`, which resets the count.
- Anti-spam (MVP): rate limit to 1 flag per category per bus per browser session (localStorage token). Phase 2: phone OTP.
- **Acceptance:** submitting 3 flags for `seat` on the same bus moves it to `medium` and to the top of the admin list without any admin action.

### 5.7 Lost & Found

- Commuter form: type (`lost` / `found`), route, bus (optional), description, approximate time, contact phone.
- Public list on `/commuter` shows found items only (no contact info); lost reports are visible to admin only.
- Admin can set status `open` → `matched` → `closed` and see both parties' contact numbers.
- **Acceptance:** a found item appears in the public list immediately; admin can close it.

### 5.8 Multilingual Conversational Assistant

- Entry: floating chat button on `/commuter`. Text input plus mic button.
- Speech-to-text and text-to-speech via browser Web Speech API with locale from a language picker (`hi-IN`, `ta-IN`, `te-IN`, `kn-IN`, `mr-IN`, `en-IN`).
- `POST /api/chat {message, lang}` → backend calls Gemini Flash (free tier) with function calling. Tools exposed to the model:
  - `get_next_bus_eta(route_id_or_name)` → wraps `GET /api/routes/:id/live`
  - `find_route(from_stop, to_stop)` → finds routes containing both stops in order
  - `report_issue(bus_number, category, description)` → wraps 5.6
- System instruction: reply in the user's language, keep answers under 2 sentences, only answer transit questions, otherwise say what you can help with.
- Gemini key stored server-side only. Requests rate-limited to 10/min per IP.
- **Acceptance:** asking "route 5 par agla bus kab aayega?" returns the live ETA in Hindi within 3 seconds.

---

## 6. Non-Functional Requirements

- **Latency:** ping-to-map under 2s on LAN, under 5s on 3G.
- **Bandwidth:** commuter page initial load under 1 MB; location updates under 500 bytes each.
- **Availability (MVP):** single instance is acceptable; design must not block later horizontal scaling (stateless API, Socket.io adapter-ready).
- **Security:** JWT with expiry, bcrypt password hashes, HTTPS on deploy, no secrets in frontend bundle, parameterized SQL only.
- **Privacy:** driver location tied to bus, not person, in any commuter-facing or analytics output. Issue flags store no commuter identity in MVP.
- **Accessibility:** large tap targets on driver screen, high-contrast, text alternative to map.

---

## 7. Technical Architecture

```
Driver phone (browser, Geolocation API)
        |  POST /api/driver/location every 5s (JWT)
        v
Express API --> route matching + ETA calc --> PostgreSQL
        |                                     (routes, stops, buses, trips,
        |                                      live_locations, issue_flags,
        |                                      lost_found_items)
        v
Socket.io broadcast to room route:{id}
        |
        +--> /commuter (Leaflet map, ETA panel, chat widget)
        +--> /admin (fleet, issues by severity, lost & found)

/api/chat --> Gemini Flash (function calling) --> internal tools --> reply in user language
```

**Components**

- **Frontend:** React + Tailwind, Leaflet.js with OSM tiles, socket.io-client, Web Speech API.
- **Backend:** Node.js + Express, Socket.io, `pg`, `jsonwebtoken`, `bcrypt`, `@google/generative-ai`.
- **Database:** PostgreSQL (Replit built-in on deploy).
- **Hosting:** Replit free tier (single service serving API + static frontend).

**Key design decisions**

- Location source is driver phone GPS only for MVP. Crowd-sourced fallback is Phase 2.
- ETA is heuristic (distance / rolling speed). Good enough for demo; ML replaces it in Phase 3.
- Chatbot is a thin tool-calling layer over existing endpoints; no new data or translation service.

---

## 8. Data Model and API

### Tables

- `users` (id, name, phone, role: driver/commuter/admin, password_hash)
- `routes` (id, name, start_point, end_point, city_code)
- `stops` (id, route_id, name, lat, lng, sequence_number)
- `buses` (id, route_id, driver_id, bus_number, status)
- `trips` (id, bus_id, start_time, end_time, status)
- `live_locations` (id, bus_id, lat, lng, speed, timestamp)
- `issue_flags` (id, bus_id, category, description, created_at, resolved_at)
- `issue_summary` (view: bus_id, category, flag_count, severity, last_flagged_at)
- `lost_found_items` (id, type, route_id, bus_id, description, approx_time, contact_phone, status, created_at)

### Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | none | Returns JWT |
| POST | `/api/driver/location` | driver | Ingest ping, compute ETA, broadcast |
| POST | `/api/driver/trip/start` and `/end` | driver | Trip lifecycle |
| GET | `/api/routes` | none | All routes |
| GET | `/api/routes/:id` | none | Route with stops |
| GET | `/api/routes/:id/live` | none | Active buses + ETAs |
| POST | `/api/issues` | none | Create flag |
| GET | `/api/issues` | admin | Grouped by severity |
| PATCH | `/api/issues/:busId/:category/resolve` | admin | Reset group |
| POST | `/api/lostfound` | none | Create item |
| GET | `/api/lostfound` | none (found only) / admin (all) | List |
| PATCH | `/api/lostfound/:id` | admin | Update status |
| POST | `/api/chat` | none | Multilingual assistant |
| POST/PATCH/DELETE | `/api/admin/routes`, `/stops`, `/buses` | admin | Management |

### Socket events

- Client → server: `join_route {route_id}`
- Server → client: `location_update {bus_id, lat, lng, speed, etas:[{stop_id, stop_name, eta_min}]}`, `bus_inactive {bus_id}`

---

## 9. Revenue Model

- **B2G SaaS licensing:** per-city subscription tiered by fleet size, sold to municipal corporations and state transport undertakings.
- **Ticketing commission (Phase 2):** small convenience fee on UPI digital tickets.
- **Data-as-a-service:** anonymized ridership, dwell-time, and route-performance analytics licensed to planners, Smart City Mission bodies, and researchers.
- **Local ad space:** non-intrusive local business listings on route/stop pages.
- **Commuter app stays free.** Monetization sits on the institutional and data side.

---

## 10. Scalability Plan

- **Config-driven onboarding:** a city is a `city_code` plus routes/stops/fleet rows. No code changes.
- **Stateless API:** any instance can serve any request; Socket.io Redis adapter added when going multi-instance.
- **Queue-based ingest (Phase 3):** pings go to a queue before ETA processing so bursts never block the API.
- **Data isolation:** all tables carry `city_code`; per-city exports and deletes are trivial.
- **Cost scales with usage**, not with redesign: same architecture from 1 bus to 50 cities.

---

## 11. Adaptability and Resilience

- Works with or without GPS hardware (phone-based by default).
- Degrades gracefully: map → text ETA → SMS (Phase 2) as connectivity drops.
- Functions with partial driver adoption via crowd-sourced fallback (Phase 2).
- Language and literacy adaptable via the conversational assistant and voice.
- Not hard-coded to buses: shared autos and vans onboard as `vehicle_type` on the same schema.

---

## 12. Roadmap

**Phase 1 - Hackathon MVP:** driver GPS streaming, live map + ETA, admin management, JWT auth, community issue flagging with auto-severity, lost & found, multilingual chat assistant (text + voice, 3 intents).

**Phase 2 - Near-term:** SMS/USSD ETA queries, crowd-sourced location fallback, offline ping buffering, occupancy indicator (empty/moderate/full), photo attachments on flags, OTP anti-spam, UPI ticketing.

**Phase 3 - Vision:** ML predictive ETA from historical trips, paid municipal analytics dashboard, informal transit (auto/van) support, multi-city SaaS rollout with queue-based ingest.

---

## 13. Demo Script (5 minutes)

1. Admin adds a route with 4 stops on the map (30s).
2. Teammate on phone logs in as driver, taps Start Trip, walks around the venue (30s).
3. Commuter view on projector: bus marker moves, ETAs tick down (60s).
4. Two teammates flag "broken seat" on the same bus from their phones; admin dashboard shows it jump to medium severity live (45s).
5. Speak into the chat widget in Hindi: "route 1 par agla bus kab aayega?" and get a spoken Hindi answer with the live ETA (45s).
6. Close on revenue and scalability slide (60s).

---

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Operator resistance | One-tap driver UI; crowd-sourced fallback (P2) |
| Poor GPS / connectivity | Offline buffering, text fallback, SMS (P2) |
| Flag spam or abuse | Session rate limit (MVP), OTP (P2), admin resolve |
| Gemini free-tier quota during demo | Cache identical questions for 30s; hard fallback to English template reply if API fails |
| Web Speech API unsupported on a browser | Text input always available; test on Chrome Android beforehand |
| Data privacy | Bus-level not person-level location, anonymized analytics, JWT + HTTPS |

---

## 15. Success Metrics

- Reduction in average commuter wait time at pilot stops.
- Daily active commuter sessions per route.
- Driver compliance rate (% of trips with active GPS sharing).
- Issues flagged → resolved ratio and median time to resolve.
- Chat assistant: % of queries answered by a tool call (vs. fallback).
- Cities onboarded via config only.

---

## 16. Team Split

| Layer | Tool | Owner |
|---|---|---|
| 1. Schema (§8 tables) | Gemini/ChatGPT chat | Least experienced teammate |
| 2. Backend API + Socket.io | Antigravity | Most experienced backend teammate |
| 2b. `/api/chat` assistant | Antigravity (small prompt) | Same as Layer 2, after core API works |
| 3. Frontend (3 pages + chat widget) | v0.dev | Frontend pair |
| 4. Integration | Antigravity (small prompt) | Backend owner |
| 5. Deploy | Replit | Anyone |

Prompts for each layer live in `docs/prompts/`.
