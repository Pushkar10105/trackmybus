// routes/chat.js
// POST /api/chat – multilingual assistant with Gemini function calling.
// Falls back to a static message if the Gemini key is missing or the API fails.

const express = require("express");
const pool = require("../db");
const { getLiveBusesForRoute } = require("../utils/liveBuses");

const router = express.Router();

const FALLBACK =
  "Sorry, the assistant is busy. Pick your route from the dropdown to see live ETAs.";

// 10 requests per minute per IP; 30-second cache on the lowercased message
const hitsByIp = new Map();
const replyCache = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hitsByIp.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 10) {
    hitsByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  hitsByIp.set(ip, recent);
  return false;
}

async function getNextBusEta(route_name_or_id) {
  const q = String(route_name_or_id ?? "").trim();
  if (!q) return { error: "route_name_or_id is required" };
  const route = await pool.query(
    `SELECT id, name FROM routes
     WHERE id::text = $1 OR LOWER(name) LIKE LOWER($2)
     ORDER BY CASE WHEN id::text = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [q, `%${q}%`]
  );
  if (route.rows.length === 0) return { error: "Route not found" };
  const buses = await getLiveBusesForRoute(route.rows[0].id);
  return { route: route.rows[0], buses };
}

async function findRoute(from_stop, to_stop) {
  const from = `%${String(from_stop ?? "").trim()}%`;
  const to = `%${String(to_stop ?? "").trim()}%`;
  const result = await pool.query(
    `SELECT DISTINCT r.id, r.name
     FROM routes r
     JOIN stops a ON a.route_id = r.id
     JOIN stops b ON b.route_id = r.id
     WHERE LOWER(a.name) LIKE LOWER($1)
       AND LOWER(b.name) LIKE LOWER($2)
       AND a.sequence_number < b.sequence_number
     ORDER BY r.name`,
    [from, to]
  );
  return { routes: result.rows };
}

async function reportIssue(bus_number, category, description) {
  if (!bus_number || !category || !description) {
    return { error: "bus_number, category, and description are required" };
  }
  const bus = await pool.query(
    `SELECT id FROM buses WHERE LOWER(bus_number) = LOWER($1)`,
    [String(bus_number).trim()]
  );
  if (bus.rows.length === 0) return { error: `Bus '${bus_number}' not found` };
  try {
    const inserted = await pool.query(
      `INSERT INTO issue_flags (bus_id, category, description)
       VALUES ($1, $2, $3) RETURNING id, category`,
      [bus.rows[0].id, category, description]
    );
    return { ok: true, issue: inserted.rows[0] };
  } catch (err) {
    if (err.code === "23514") return { error: "Invalid category value" };
    throw err;
  }
}

const TOOLS = [
  {
    name: "get_next_bus_eta",
    description: "Look up live buses and ETAs for a route by id or name",
    parameters: {
      type: "object",
      properties: { route_name_or_id: { type: "string" } },
      required: ["route_name_or_id"],
    },
  },
  {
    name: "find_route",
    description: "Find routes where from_stop appears before to_stop",
    parameters: {
      type: "object",
      properties: {
        from_stop: { type: "string" },
        to_stop: { type: "string" },
      },
      required: ["from_stop", "to_stop"],
    },
  },
  {
    name: "report_issue",
    description: "File a commuter issue against a bus number",
    parameters: {
      type: "object",
      properties: {
        bus_number: { type: "string" },
        category: { type: "string" },
        description: { type: "string" },
      },
      required: ["bus_number", "category", "description"],
    },
  },
];

async function runTool(name, args = {}) {
  if (name === "get_next_bus_eta") return getNextBusEta(args.route_name_or_id);
  if (name === "find_route") return findRoute(args.from_stop, args.to_stop);
  if (name === "report_issue") {
    return reportIssue(args.bus_number, args.category, args.description);
  }
  return { error: `Unknown tool ${name}` };
}

async function askGemini(message, lang) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction:
      "You are the TrackMyBus assistant. Always reply in the same language the user wrote in " +
      `(the lang hint is "${lang || "en"}"). Keep answers to 1 or 2 short sentences. ` +
      "Only answer questions about bus timings, routes, and reporting bus issues. " +
      "If asked anything else, politely say what you can help with.",
    tools: [{ functionDeclarations: TOOLS }],
  });

  const chat = model.startChat();
  let result = await chat.sendMessage(message);
  for (let i = 0; i < 4; i++) {
    const calls = result.response.functionCalls?.() || [];
    if (!calls.length) break;
    const replies = [];
    for (const call of calls) {
      const output = await runTool(call.name, call.args || {});
      replies.push({
        functionResponse: { name: call.name, response: { result: output } },
      });
    }
    result = await chat.sendMessage(replies);
  }
  return result.response.text();
}

router.post("/", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const lang = String(req.body?.lang ?? "en").trim() || "en";
    if (!message) return res.status(400).json({ error: "message is required" });

    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: "Too many chat requests. Try again shortly." });
    }

    const cacheKey = message.toLowerCase();
    const cached = replyCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return res.json({ reply: cached.reply });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ reply: FALLBACK });
    }

    const reply = (await askGemini(message, lang)) || FALLBACK;
    replyCache.set(cacheKey, { reply, expires: Date.now() + 30_000 });
    return res.json({ reply });
  } catch (err) {
    console.error("POST /chat error:", err.message);
    return res.json({ reply: FALLBACK });
  }
});

module.exports = router;
