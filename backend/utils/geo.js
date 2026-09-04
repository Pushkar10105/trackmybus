// utils/geo.js
// Geographic calculation helpers used for ETA estimation.
// All math here is "as the crow flies" (straight-line distances),
// which is a reasonable first approximation for bus route ETAs.

/**
 * haversineKm(lat1, lng1, lat2, lng2)
 *
 * Calculates the shortest distance between two GPS coordinates on a
 * sphere (the Earth) using the Haversine formula.
 *
 * Why Haversine? Because the Earth is curved; plain Pythagorean
 * distance on lat/lng numbers would give wrong answers at scale.
 *
 * Returns the distance in kilometres.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometres

  // Convert degrees to radians (trig functions in JS use radians)
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  // Core haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
}

/**
 * computeEtas(busLat, busLng, stops, avgSpeedKmh)
 *
 * Given the bus's current GPS position and an ordered list of route
 * stops, finds the nearest stop by straight-line distance, then
 * returns ETA (in whole minutes) to each of the next 1-3 stops
 * that come AFTER the nearest one.
 *
 * How ETAs are computed:
 *   - Start with the distance from the bus to the nearest stop.
 *   - Then walk along the remaining stops, adding each leg
 *     (nearest → next, next → next+1, …).
 *   - ETA (minutes) = cumulative distance (km) / speed (km/h) * 60.
 *   - Result is rounded to the nearest whole minute.
 *
 * @param {number} busLat  - Current latitude of the bus
 * @param {number} busLng  - Current longitude of the bus
 * @param {Array}  stops   - Array of stop objects {id, name, lat, lng, sequence_number}
 *                           ordered ascending by sequence_number
 * @param {number} avgSpeedKmh - Average speed to use for ETA maths
 * @returns {Array} [{stop_id, stop_name, eta_min}]  up to 3 entries
 */
function computeEtas(busLat, busLng, stops, avgSpeedKmh) {
  if (!stops || stops.length === 0) return [];

  // Guard against 0 / NaN so we never divide by zero
  let speed = Number(avgSpeedKmh);
  if (!Number.isFinite(speed) || speed <= 0) {
    speed = 20;
  }

  // --- Step 1: find the nearest stop ---
  let nearestIdx = 0;
  let nearestDist = Infinity;

  for (let i = 0; i < stops.length; i++) {
    const d = haversineKm(busLat, busLng, Number(stops[i].lat), Number(stops[i].lng));
    if (d < nearestDist) {
      nearestDist = d;
      nearestIdx = i;
    }
  }

  // --- Step 2: take up to 3 stops AFTER the nearest one ---
  const nextStops = stops.slice(nearestIdx + 1, nearestIdx + 4);
  const nearest = stops[nearestIdx];

  // --- Step 3: chain distance from the nearest stop along the route ---
  // Start at the nearest stop (not the bus) so we do not double-count
  // the bus→nearest leg when measuring bus→upcoming stop.
  const etas = [];
  let prevLat = Number(nearest.lat);
  let prevLng = Number(nearest.lng);
  let cumulativeKm = nearestDist;

  for (let i = 0; i < nextStops.length; i++) {
    const stop = nextStops[i];
    const legKm = haversineKm(prevLat, prevLng, Number(stop.lat), Number(stop.lng));
    cumulativeKm += legKm;

    const etaMin = Math.max(0, Math.round((cumulativeKm / speed) * 60));

    etas.push({
      stop_id: stop.id,
      stop_name: stop.name,
      eta_min: etaMin,
    });

    prevLat = Number(stop.lat);
    prevLng = Number(stop.lng);
  }

  return etas;
}

module.exports = { haversineKm, computeEtas };
