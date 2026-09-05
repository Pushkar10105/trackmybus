# Layer 5 - Deployment

**Tool:** Replit (free tier)
**Owner:** anyone
**Output:** public URL for the demo

---

```
I have a working Node.js/Express + Socket.io backend with a PostgreSQL
database and a React (Vite) frontend for a bus-tracking app called
TrackMyBus. Here is my repo: [GitLab/GitHub link].

Set this up on Replit:

1. Use Replit's built-in PostgreSQL and apply database/schema.sql to it.
2. Set Replit Secrets for DATABASE_URL, JWT_SECRET, GEMINI_API_KEY,
   CORS_ORIGIN (the Replit public URL), and PORT.
3. Build the frontend into backend/public so a single Express process
   serves both the API and the static site on one port.
4. Deploy it and give me the public URL.
5. Confirm that the Socket.io connection works over the public URL
   (websocket or polling fallback) and that HTTPS is enabled, because
   the browser Geolocation API on /driver requires HTTPS.
```

**Before the demo:** open the public `/driver` URL on a phone over mobile data and confirm the location permission prompt appears. Test the chat widget mic on Chrome for Android.
