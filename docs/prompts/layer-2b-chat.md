# Layer 2b - Multilingual chat assistant

**Tool:** Google Antigravity (small prompt, run after Layer 2 works)
**Owner:** backend lead
**Output:** `backend/routes/chat.js`
**Prereq:** free Gemini API key from https://aistudio.google.com/apikey, saved as `GEMINI_API_KEY` in `backend/.env`

---

```
Add a POST /api/chat endpoint to my existing Express backend (in
backend/). It receives {message, lang}. Use the @google/generative-ai
package with the gemini-1.5-flash model (free tier, key from env var
GEMINI_API_KEY) and function calling.

Define 3 tools the model can call:

- get_next_bus_eta(route_name_or_id): look up the route by id or by
  fuzzy name match, then reuse the same logic as GET /api/routes/:id/live
  and return the active buses with ETAs.
- find_route(from_stop, to_stop): find routes where a stop matching
  from_stop appears before a stop matching to_stop in sequence order.
  Return route names.
- report_issue(bus_number, category, description): reuse the POST
  /api/issues logic.

System instruction for the model: "You are the TrackMyBus assistant.
Always reply in the same language the user wrote in (the `lang` hint
tells you their preferred locale). Keep answers to 1 or 2 short
sentences. Only answer questions about bus timings, routes, and
reporting bus issues. If asked anything else, politely say what you
can help with."

Run the tool-calling loop (model asks for tool -> execute -> send result
back -> get final text). Return {reply}. If the Gemini call fails or
quota is exceeded, return a plain English fallback like "Sorry, the
assistant is busy. Pick your route from the dropdown to see live ETAs."

Add a simple in-memory rate limit of 10 requests per minute per IP and
a 30-second cache keyed on the lowercased message. Keep it under ~120
lines, commented for a beginner.
```
