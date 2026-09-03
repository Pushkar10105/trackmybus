# TrackMyBus

Real-time public transport tracking for tier-2 and tier-3 Indian cities (SVH26003).

Commuters open a browser link, pick a route, and see the bus moving with ETAs to upcoming stops. Drivers share location with one tap from their own phone. Admins manage routes and see community-flagged issues ranked by severity. A multilingual chat assistant answers "when is the next bus?" in the user's own language.

**Full spec:** [docs/PRD.md](docs/PRD.md)

## Stack

| Layer | Tech |
|---|---|
| Frontend | React, Tailwind, Leaflet.js (OSM tiles), socket.io-client, Web Speech API |
| Backend | Node.js, Express, Socket.io, pg, jsonwebtoken, bcrypt, @google/generative-ai |
| Database | PostgreSQL |
| Assistant | Gemini Flash (free tier) with function calling |
| Hosting | Replit free tier |

## Folder layout

```
trackmybus/
├── README.md
├── docs/
│   ├── PRD.md                 # product requirements (source of truth)
│   └── prompts/               # copy-paste prompts for each build layer
│       ├── layer-1-schema.md
│       ├── layer-2-backend.md
│       ├── layer-2b-chat.md
│       ├── layer-3-frontend.md
│       ├── layer-4-integration.md
│       └── layer-5-deploy.md
├── database/
│   └── schema.sql             # output of Layer 1
├── backend/                   # output of Layer 2 (Express + Socket.io)
└── frontend/                  # output of Layer 3 (React + Tailwind)
```

## Build plan (who does what)

| Layer | Tool | Owner | Output |
|---|---|---|---|
| 1. Schema | Gemini / ChatGPT chat | Least experienced teammate | `database/schema.sql` |
| 2. Backend API + Socket.io | Google Antigravity | Backend lead | `backend/` |
| 2b. `/api/chat` assistant | Antigravity (small prompt) | Backend lead, after Layer 2 works | `backend/routes/chat.js` |
| 3. Frontend (3 pages + chat widget) | v0.dev | Frontend pair | `frontend/` |
| 4. Integration | Antigravity (small prompt) | Backend lead | working repo |
| 5. Deploy | Replit | Anyone | public URL |

Layers 1, 2 and 3 run in parallel. Frontend builds against the API shape documented in `docs/PRD.md` section 8, so it does not need to wait for the backend.

## Local setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or use Replit's built-in Postgres)
- A free Gemini API key from https://aistudio.google.com/apikey

### 1. Database

```bash
createdb trackmybus
psql trackmybus < database/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env     # then fill in values below
npm install
npm run dev              # http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

## Environment variables

### backend/.env

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgres://user:pass@localhost:5432/trackmybus` | Postgres connection |
| `JWT_SECRET` | `change-me` | Signs driver/admin tokens |
| `GEMINI_API_KEY` | `AIza...` | Chat assistant (server-side only, never in frontend) |
| `PORT` | `3000` | API port |
| `CITY_CENTER_LAT` | `17.3850` | Default map center |
| `CITY_CENTER_LNG` | `78.4867` | Default map center |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |

### frontend/.env

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Backend base URL |
| `VITE_SOCKET_URL` | `http://localhost:3000` | Socket.io URL |

## Pages

| Route | Who | What |
|---|---|---|
| `/driver` | Driver | Login, one big Start/End Trip button, sends GPS every 5s |
| `/commuter` | Public | Live map, route picker, ETAs, report issue, lost & found, chat widget |
| `/admin` | Admin | Routes/stops/buses management, issues by severity, lost & found status |

## Demo checklist

- [ ] Admin creates a route with 4 stops
- [ ] Driver phone starts trip, marker moves on projector
- [ ] ETAs update live for next 3 stops
- [ ] 3 flags for the same issue push it to medium severity on admin dashboard
- [ ] Ask the chat widget in Hindi by voice, get a spoken Hindi ETA

## Rules of the road

- Never commit `.env` files or API keys. `.gitignore` already covers them.
- Backend is the source of truth for API shape. If frontend needs a change, update `docs/PRD.md` section 8 first.
- Keep code commented for beginners; every teammate should be able to explain any file in the demo Q&A.
