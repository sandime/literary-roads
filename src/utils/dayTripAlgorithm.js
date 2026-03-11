import { searchNearbyPlaces } from './googlePlaces';
import { getMapboxRoute } from './mapbox';

export const RADIUS_MILES = { quick: 20, halfDay: 60, fullDay: 120 };

// Total stop targets per duration (excluding optional drive-in)
const STOP_TARGETS = { quick: 2, halfDay: 4, fullDay: 6 };

export const VISIT_MINUTES = {
  bookstore: 60, cafe: 30, landmark: 45, drivein: 120,
  museum: 90, art_gallery: 75, park: 45, nature: 45,
  restaurant: 60, scenic: 30,
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
        maxResultCount: 10,
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
    const off  = radiusMiles * 0.5;
    const latD = off / 69;
    const lngD = off / (69 * Math.cos(center[0] * Math.PI / 180));
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

// ── Stop selection helpers ────────────────────────────────────────────────────

const tagDistance = (places, origin) =>
  places
    .map(p => ({ ...p, _distMiles: haversine(origin, p.coords) }))
    .filter(p => isFinite(p._distMiles))
    .sort((a, b) => a._distMiles - b._distMiles);

// Rotate pool by n positions so regenerate gives different candidates
const rotatePool = (pool, n) => {
  if (!pool.length || n === 0) return pool;
  const offset = n % pool.length;
  return [...pool.slice(offset), ...pool.slice(0, offset)];
};

// ── Routing helpers ──────────────────────────────────────────────────────────

// Use overview=full for short city segments — simplified is too coarse at city scale
const getSegment = async (from, to) => {
  if (!from || !to) return [from || to, to || from].filter(Boolean);
  const seg = await getMapboxRoute(from[0], from[1], to[0], to[1], true);
  if (seg?.length > 1) return seg;
  return Array.from({ length: 10 }, (_, i) => [
    from[0] + (to[0] - from[0]) * i / 9,
    from[1] + (to[1] - from[1]) * i / 9,
  ]);
};

// Nearest-neighbor ordering — minimizes zigzagging
const nearestNeighbor = (start, stops) => {
  const ordered = [];
  const remaining = [...stops];
  let current = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = haversine(current, remaining[0].coords);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversine(current, remaining[i].coords);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    ordered.push(remaining[bestIdx]);
    current = remaining[bestIdx].coords;
    remaining.splice(bestIdx, 1);
  }
  return ordered;
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
// Stop selection rules by duration:
//   quick:   1 cafe (required) + 0-1 variety — NO restaurant, NO drivein
//   halfDay: 1 cafe + 1 bookstore + 1 restaurant + 1 variety — drivein excluded
//   fullDay: 1 cafe + 1 bookstore + 1 restaurant + 3 variety + optional drivein LAST
//
// variant:     integer >= 0, increments on each regenerate to rotate candidate pools
// excludedIds: Set of place IDs already shown this session
export const generateDayTrip = async (startCoords, duration, variant = 0, excludedIds = new Set()) => {
  const radius  = RADIUS_MILES[duration];
  const rMeters = Math.min(radius * 1609.34, 50000);

  // Fetch all categories in parallel (skip restaurant for quick trips)
  const [literary, cultural, scenic, nature, meal] = await Promise.all([
    fetchLiterary(startCoords, radius),
    fetchGoogleNearby(startCoords[0], startCoords[1], rMeters,
      ['museum', 'art_gallery', 'history_museum', 'science_museum'], 'museum'),
    fetchGoogleNearby(startCoords[0], startCoords[1], rMeters,
      ['tourist_attraction', 'viewpoint', 'zoo', 'aquarium'], 'scenic'),
    fetchGoogleNearby(startCoords[0], startCoords[1], rMeters,
      ['park', 'botanical_garden', 'national_park', 'nature_reserve'], 'park'),
    duration !== 'quick'
      ? fetchGoogleNearby(startCoords[0], startCoords[1], rMeters, ['restaurant'], 'restaurant')
      : Promise.resolve([]),
  ]);

  // Split literary pool by subtype
  const cafes      = literary.filter(p => p.type === 'cafe');
  const bookstores = literary.filter(p => p.type === 'bookstore');
  const landmarks  = literary.filter(p => p.type === 'landmark');
  const driveins   = literary.filter(p => p.type === 'drivein');

  // Sort by distance, then rotate for variant so regenerate gives different picks
  const rotate = (pool) => rotatePool(tagDistance(pool, startCoords), variant);
  const cafePool  = rotate(cafes);
  const bookPool  = rotate(bookstores);
  const landPool  = rotate(landmarks);
  const drivePool = rotate(driveins);
  const cultPool  = rotate(cultural);
  const scenPool  = rotate(scenic);
  const parkPool  = rotate(nature);
  const mealPool  = rotate(meal);

  const stops   = [];
  const usedIds = new Set(excludedIds);
  const typesPicked = new Set(); // enforce 1 of each type

  // Pick the first available item from a pool that hasn't been used or type-picked
  const pick = (pool, type) => {
    if (typesPicked.has(type)) return false;
    const p = pool.find(p => !usedIds.has(p.id));
    if (!p) return false;
    usedIds.add(p.id);
    typesPicked.add(type);
    stops.push(p);
    return true;
  };

  // STEP 1: Guaranteed priority picks (in order)
  pick(cafePool, 'cafe');                                    // Always: 1 coffee shop
  if (duration !== 'quick') pick(bookPool, 'bookstore');     // half/full day: 1 bookstore
  if (duration !== 'quick') pick(mealPool, 'restaurant');    // half/full day: 1 restaurant

  // STEP 2: Fill remaining slots with one-of-each variety
  // Cycle through variety types; stop when target reached or all pools exhausted
  const target = STOP_TARGETS[duration];
  const varietyPools = [
    { pool: cultPool, type: 'museum'   },
    { pool: scenPool, type: 'scenic'   },
    { pool: parkPool, type: 'park'     },
    { pool: landPool, type: 'landmark' },
  ];
  let vi = variant % varietyPools.length;
  let noPickStreak = 0;
  while (stops.length < target && noPickStreak < varietyPools.length) {
    const { pool, type } = varietyPools[vi % varietyPools.length];
    if (pick(pool, type)) { noPickStreak = 0; } else { noPickStreak++; }
    vi++;
  }

  if (!stops.length) return null;

  // STEP 3: Order non-drivein stops by nearest-neighbor (minimize zigzagging)
  const ordered = nearestNeighbor(startCoords, stops);

  // STEP 4: For full-day trips, optionally append a drive-in as the very last stop
  // (drive-ins run in the evening — always the final destination, never mid-route)
  if (duration === 'fullDay') {
    const driveIn = drivePool.find(p => !usedIds.has(p.id));
    if (driveIn) ordered.push(driveIn);
  }

  const waypoints = [startCoords, ...ordered.map(s => s.coords), startCoords];
  const segments  = await Promise.all(
    waypoints.slice(0, -1).map((pt, i) => getSegment(pt, waypoints[i + 1]))
  );

  return {
    stops: ordered,
    routeCoordinates: segments.flat(),
    segments,
    schedule: buildSchedule(ordered, segments),
    duration,
    startCoords,
  };
};
