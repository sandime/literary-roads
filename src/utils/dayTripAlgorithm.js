import { searchNearbyPlaces } from './googlePlaces';
import { getMapboxRoute } from './mapbox';

export const RADIUS_MILES   = { quick: 20,  halfDay: 60,  fullDay: 120 };
export const MAX_STOPS      = { quick: 2,   halfDay: 3,   fullDay: 5   };
export const VISIT_MINUTES  = { bookstore: 60, cafe: 30, landmark: 45, drivein: 120 };

const AVG_SPEED_MPH = 35;

// Google Places searchNearby caps at ~31 miles (50,000 m)
const GOOGLE_MAX_RADIUS_MILES = 30;

// Haversine distance between two [lat,lng] points → miles (defensive)
export const haversine = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return Infinity;
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return Infinity;
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

// Estimate total miles for a segment (array of [lat,lng] points)
const segmentMiles = (pts) => {
  if (!pts?.length) return 0;
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += haversine(pts[i - 1], pts[i]);
  return total;
};

// For radii > Google's limit, sample compass points and merge results
const fetchPlacesForRadius = async (center, radiusMiles) => {
  const searchRadius = Math.min(radiusMiles, GOOGLE_MAX_RADIUS_MILES);

  // Always search the center
  const points = [center];

  if (radiusMiles > GOOGLE_MAX_RADIUS_MILES) {
    // Add N/S/E/W sample points offset by ~half the total radius
    const offset = radiusMiles * 0.5;
    const latDeg = offset / 69;
    const lngDeg = offset / (69 * Math.cos(center[0] * Math.PI / 180));
    points.push(
      [center[0] + latDeg, center[1]],          // North
      [center[0] - latDeg, center[1]],          // South
      [center[0],           center[1] + lngDeg], // East
      [center[0],           center[1] - lngDeg], // West
    );
  }

  const results = await Promise.all(
    points.map(pt => searchNearbyPlaces(pt[0], pt[1], searchRadius).catch(() => []))
  );

  // Flatten, deduplicate by id, and normalize coords
  const seen = new Set();
  return results.flat().filter(p => {
    if (!p?.id || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  }).map(p => ({
    ...p,
    // Normalize to coords:[lat,lng] — searchNearbyPlaces uses .lat/.lng fields
    coords: p.coords ?? (p.lat != null ? [p.lat, p.lng] : null),
  })).filter(p => p.coords != null);
};

// Select a mixed-type set of stops, sorted nearest-first
const selectMixedStops = (sorted, maxStops) => {
  const byType = {};
  for (const p of sorted) {
    (byType[p.type] = byType[p.type] || []).push(p);
  }
  const types = Object.keys(byType);
  if (!types.length) return [];

  const result = [];
  let typeIdx = 0;
  while (result.length < maxStops) {
    const type = types[typeIdx % types.length];
    const pool = byType[type];
    if (pool?.length) result.push(pool.shift());
    typeIdx++;
    if (types.every(t => !byType[t]?.length)) break;
  }
  return result.sort((a, b) => a._distMiles - b._distMiles).slice(0, maxStops);
};

// Fetch Mapbox segment or fall back to a straight line
const getSegment = async (from, to) => {
  if (!from || !to) return [from || to, to || from].filter(Boolean);
  const seg = await getMapboxRoute(from[0], from[1], to[0], to[1]);
  if (seg?.length > 1) return seg;
  return Array.from({ length: 10 }, (_, i) => [
    from[0] + (to[0] - from[0]) * i / 9,
    from[1] + (to[1] - from[1]) * i / 9,
  ]);
};

// Build a schedule from stops + route segments starting at 9 AM
const buildSchedule = (stops, segments) => {
  const START_HOUR = 9;
  let mins = START_HOUR * 60;
  let totalMiles = 0;

  const formatTime = (m) => {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(min).padStart(2, '0')} ${ampm}`;
  };

  const items = stops.map((stop, i) => {
    const seg       = segments[i] || [];
    const miles     = segmentMiles(seg);
    const driveMins = Math.max(1, Math.round(miles / AVG_SPEED_MPH * 60));
    totalMiles     += miles;
    mins           += driveMins;
    const arrivalTime = formatTime(mins);
    const visitMins   = VISIT_MINUTES[stop.type] || 45;
    mins             += visitMins;
    return { stop, driveMins, arrivalTime, visitMins, miles };
  });

  const returnSeg   = segments[segments.length - 1] || [];
  const returnMiles = segmentMiles(returnSeg);
  const returnMins  = Math.max(1, Math.round(returnMiles / AVG_SPEED_MPH * 60));
  totalMiles       += returnMiles;
  mins             += returnMins;

  return {
    items,
    returnMins,
    returnTime:   formatTime(mins),
    startTime:    formatTime(START_HOUR * 60),
    totalMiles:   Math.round(totalMiles),
    totalMinutes: mins - START_HOUR * 60,
  };
};

// ─── Main export ────────────────────────────────────────────────────────────
export const generateDayTrip = async (startCoords, duration, selectedTypes) => {
  const radius   = RADIUS_MILES[duration];
  const maxStops = MAX_STOPS[duration];

  const raw = await fetchPlacesForRadius(startCoords, radius);

  // Filter by type, compute distance, drop any with bad coords
  const filtered = raw
    .filter(p => selectedTypes[p.type] && p.coords)
    .map(p => ({ ...p, _distMiles: haversine(startCoords, p.coords) }))
    .filter(p => isFinite(p._distMiles))
    .sort((a, b) => a._distMiles - b._distMiles);

  const stops = selectMixedStops(filtered, maxStops);
  if (!stops.length) return null;

  const waypoints = [startCoords, ...stops.map(s => s.coords), startCoords];
  const segments  = await Promise.all(
    waypoints.slice(0, -1).map((pt, i) => getSegment(pt, waypoints[i + 1]))
  );

  return {
    stops,
    routeCoordinates: segments.flat(),
    segments,
    schedule: buildSchedule(stops, segments),
    duration,
    startCoords,
  };
};
