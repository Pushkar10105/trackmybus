// utils/liveBuses.js
// Shared helper for "which buses are live on this route right now?"
// Used by GET /api/routes/:id/live and by the chat assistant tools.

const pool = require("../db");
const { computeEtas } = require("./geo");

/**
 * Returns live bus payloads for a route, or [] if none are currently pinging.
 * A bus is "live" when it is marked active AND its last GPS ping is
 * no older than 5 minutes.
 */
async function getLiveBusesForRoute(route_id) {
  const busesResult = await pool.query(
    `SELECT
       b.id        AS bus_id,
       b.bus_number,
       ll.lat,
       ll.lng,
       ll.speed
     FROM buses b
     JOIN LATERAL (
       SELECT lat, lng, speed, timestamp
       FROM live_locations
       WHERE bus_id = b.id
       ORDER BY timestamp DESC
       LIMIT 1
     ) ll ON true
     WHERE b.route_id = $1
       AND b.status = 'active'
       AND ll.timestamp >= NOW() - INTERVAL '5 minutes'`,
    [route_id]
  );

  if (busesResult.rows.length === 0) return [];

  const stopsResult = await pool.query(
    `SELECT id, name, lat, lng, sequence_number
     FROM stops
     WHERE route_id = $1
     ORDER BY sequence_number ASC`,
    [route_id]
  );
  const stops = stopsResult.rows;

  return busesResult.rows.map((bus) => {
    const avgSpeed = Number(bus.speed) >= 5 ? Number(bus.speed) : 20;
    const etas = computeEtas(Number(bus.lat), Number(bus.lng), stops, avgSpeed);
    return {
      bus_id: bus.bus_id,
      bus_number: bus.bus_number,
      lat: Number(bus.lat),
      lng: Number(bus.lng),
      speed: Number(bus.speed),
      etas,
    };
  });
}

module.exports = { getLiveBusesForRoute };
