# Layer 4 - Integration

**Tool:** Google Antigravity (small, bounded prompt)
**Owner:** backend lead
**Output:** working repo end to end

---

```
I have three pieces of a project in one repo: a PostgreSQL schema
(database/schema.sql), a Node.js/Express + Socket.io backend (backend/),
and a React + Vite frontend (frontend/).

Get it running locally end to end:

1. Compare every fetch/axios call and socket event in frontend/ against
   what backend/ actually exposes. List every mismatch (path, method,
   request body shape, response shape, event name, auth header) and fix
   them, preferring to change the frontend to match the backend unless
   the backend is clearly wrong against docs/PRD.md section 8.
2. Make sure CORS and the Socket.io origin are configured for the
   frontend dev URL.
3. Add a root package.json with scripts: `dev` (runs backend and frontend
   concurrently), `db:setup` (applies schema.sql), and `build` (builds
   frontend into backend/public so Express serves it in production).
4. Run it, log in as the seeded driver, post a fake location, and confirm
   the commuter page receives the socket update. Fix anything that breaks.

Do not refactor or restyle anything that already works. Report what you
changed as a short bullet list.
```
