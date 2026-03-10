import { searchNearbyPlaces } from './googlePlaces';
import { getMapboxRoute } from './mapbox';

export const RADIUS_MILES = { quick: 20, halfDay: 60, fullDay: 120 };

// How many of each category to target per duration
const TARGETS = {
  quick:   { literary: 2, cultural: 0, nature: 0, meal: 0 },
  halfDay: { literary: 2, cultural: 1, nature: 0, meal: 0 },
  fullDay: { literary: 3, cultural: 1, nature: 1, meal: 1 },
};

// Max of any single type in one trip
const TYPE_LIMITS = {
  bookstore: 2, cafe: 2, landmark: 2, drivein: 1,
  museum: 1, art_gallery: 1, park: 2, nature: 2,
  restaurant: 1,
};

export const VISIT_MINUTES = {
  bookstore: 60, cafe: 30, landmark: 45, drivein: 120,
  museum: 90, art_gallery: 75, park: 45, nature: 45,
  restaurant: 60,
};

const AVG_SPEED_MPH = 35;
const GOOGLE_MAX_RADIUS_MILES = 30;

// ── Haversine ────────────────────────────────────────────────────────────────
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

const segmentMiles = (pts) => {
  if (!pts?.length) return 0;
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += haversine(pts[i - 1], pts[i]);
  return total;
};

// ── Google Places fetch helpers ──────────────────────────────────────────────

// Fetch a single category directly from Google Places (New) API
const fetchGoogleNearby = async (lat, lng, radiusMeters, includedTypes, typeLabel) => {
  const key = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id',
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 5,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: Math.min(radiusMeters, 50000),
          },
        },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.places || [])
      .map(p => ({
        id:      p.id,
        name:    p.displayName?.text || 'Unnamed',
        type:    typeLabel,
        lat:     p.location?.latitude,
        lng:     p.location?.longitude,
        address: p.formattedAddress || '',
        coords:  p.location ? [p.location.latitude, p.location.longitude] : null,
      }))
      .filter(p => p.coords);
  } catch {
    return [];
  }
};

// Fetch literary places, handling radii > Google's 50 km cap via compass sampling
const fetchLiterary = async (center, radiusMiles) => {
  const searchR = Math.min(radiusMiles, GOOGLE_MAX_RADIUS_MILES);
  const points  = [center];

  if (radiusMiles > GOOGLE_MAX_RADIUS_MILES) {
    const off    = radiusMiles * 0.5;
    const latD   = off / 69;
    const lngD   = off / (69 * Math.cos(center[0] * Math.PI / 180));
    points.push(
      [center[0] + latD, center[1]],
      [center[0] - latD, center[1]],
      [center[0],         center[1] + lngD],
      [center[0],         center[1] - lngD],
    );
  }

  const batches = await Promise.all(
    points.map(pt => searchNearbyPlaces(pt[0], pt[1], searchR).catch(() => []))
  );
  const seen = new Set();
  return batches.flat()
    .filter(p => { if (!p?.id || seen.has(p.id)) return false; seen.add(p.id); return true; })
    .map(p => ({ ...p, coords: p.coords ?? (p.lat != null ? [p.lat, p.lng] : null) }))
    .filter(p => p.coords);
};

// ── Stop selection ───────────────────────────────────────────────────────────

const tagDistance = (places, origin) =>
  places
    .map(p => ({ ...p, _distMiles: haversine(origin, p.coords) }))
    .filter(p => isFinite(p._distMiles))
    .sort((a, b) => a._distMiles - b._distMiles);

// Pick up to `n` from a pool, respecting the per-type limit
const pickFromPool = (pool, n, typeCounts) => {
  const picked = [];
  for (const p of pool) {
    if (picked.length >= n) break;
    const limit = TYPE_LIMITS[p.type] ?? 2;
    if ((typeCounts[p.type] || 0) >= limit) continue;
    typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
    picked.push(p);
  }
  return picked;
};

// ── Routing helpers ──────────────────────────────────────────────────────────

const getSegment = async (from, to) => {
  if (!from || !to) return [from || to, to || from].filter(Boolean);
  const seg = await getMapboxRoute(from[0], from[1], to[0], to[1]);
  if (seg?.length > 1) return seg;
  return Array.from({ length: 10 }, (_, i) => [
    from[0] + (to[0] - from[0]) * i / 9,
    from[1] + (to[1] - from[1]) * i / 9,
  ]);
};

// ── Schedule ─────────────────────────────────────────────────────────────────

const buildSchedule = (stops, segments) => {
  const START_HOUR = 9;
  let mins = START_HOUR * 60;
  let totalMiles = 0;

  const fmt = (m) => {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    return `${h % 12 || 12}:${String(min).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const items = stops.map((stop, i) => {
    const seg       = segments[i] || [];
    const miles     = segmentMiles(seg);
    const driveMins = Math.max(1, Math.round(miles / AVG_SPEED_MPH * 60));
    totalMiles     += miles;
    mins           += driveMins;
    const arrivalTime = fmt(mins);
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
    returnTime:   fmt(mins),
    startTime:    fmt(START_HOUR * 60),
    totalMiles:   Math.round(totalMiles),
    totalMinutes: mins - START_HOUR * 60,
  };
};

// ── Main export ───────────────────────────────────────────────────────────────
export const generateDayTrip = async (startCoords, duration) => {
  const radius  = RADIUS_MILES[duration];
  const targets = TARGETS[duration];
  const rMeters = Math.min(radius * 1609.34, 50000);

  // Fetch all categories in parallel
  const [literary, cultural, nature, meal] = await Promise.all([
    fetchLiterary(startCoords, radius),
    targets.cultural > 0
      ? fetchGoogleNearby(startCoords[0], startCoords[1], rMeters, ['museum', 'art_gallery'], 'museum')
      : Promise.resolve([]),
    targets.nature > 0
      ? fetchGoogleNearby(startCoords[0], startCoords[1], rMeters, ['park', 'botanical_garden', 'national_park'], 'park')
      : Promise.resolve([]),
    targets.meal > 0
      ? fetchGoogleNearby(startCoords[0], startCoords[1], rMeters, ['restaurant'], 'restaurant')
      : Promise.resolve([]),
  ]);

  // Tag distances
  const litDist  = tagDistance(literary, startCoords);
  const cultDist = tagDistance(cultural, startCoords);
  const natDist  = tagDistance(nature,   startCoords);
  const mealDist = tagDistance(meal,     startCoords);

  // Pick stops per category respecting type limits
  const typeCounts = {};
  const stops = [
    ...pickFromPool(litDist,  targets.literary,  typeCounts),
    ...pickFromPool(cultDist, targets.cultural,  typeCounts),
    ...pickFromPool(natDist,  targets.nature,    typeCounts),
    ...pickFromPool(mealDist, targets.meal,      typeCounts),
  ];

  if (!stops.length) return null;

  // Sort stops by distance for an efficient loop
  stops.sort((a, b) => a._distMiles - b._distMiles);

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
