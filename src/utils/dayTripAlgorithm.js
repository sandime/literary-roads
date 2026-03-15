import { getMapboxRoute } from './mapbox';
import { getNearbyBookstores, getNearbyCoffeeShops } from './firestorePlaces';
import { searchNearbyDriveIns, foursquareNearby, FS_CAT } from './foursquare';

export const RADIUS_MILES = { quick: 20, halfDay: 60, fullDay: 120 };

// Generate MORE stops than strictly needed — user picks which to visit via checkboxes
// quick: 3 candidates | halfDay: 6 candidates | fullDay: 9 candidates (+optional drivein)
const STOP_TARGETS = { quick: 3, halfDay: 6, fullDay: 9 };

export const VISIT_MINUTES = {
  bookstore: 60, cafe: 30, landmark: 45, drivein: 120,
  museum: 90, art_gallery: 75, park: 45, nature: 45,
  restaurant: 60, scenic: 30, music: 45, garden: 45, observatory: 60,
  flea: 60, antique: 60, historical: 45,
};

const AVG_SPEED_MPH = 35;
const MAX_RADIUS_MILES = 30; // Foursquare max radius is 100km; cap sampling at 30mi for quality

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

// ── Foursquare fetch helper (replaces fetchGoogleNearby) ─────────────────────
const fetchNearby = async (lat, lng, radiusMiles, categoryIds, typeLabel) => {
  console.log(`[DayTrip] fetching ${typeLabel} via Foursquare | cats: [${categoryIds.join(',')}] | radius: ${radiusMiles}mi`);
  try {
    const places = await foursquareNearby(lat, lng, radiusMiles, categoryIds, typeLabel);
    console.log(`[DayTrip] ${typeLabel} → ${places.length} places`);
    return places;
  } catch (err) {
    console.error(`[DayTrip] ${typeLabel} fetch error:`, err);
    return [];
  }
};

// Fetch literary places: Firestore bookstores + Firestore coffeeShops + Foursquare drive-ins
// Handles large radii via compass sampling (same strategy as before)
const fetchLiterary = async (center, radiusMiles) => {
  const searchR = Math.min(radiusMiles, MAX_RADIUS_MILES);
  const points  = [center];

  if (radiusMiles > MAX_RADIUS_MILES) {
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

  const [bookBatches, cafeBatches, driveInBatches] = await Promise.all([
    Promise.all(points.map(pt => getNearbyBookstores(pt[0], pt[1], searchR).catch(() => []))),
    Promise.all(points.map(pt => getNearbyCoffeeShops(pt[0], pt[1], searchR).catch(() => []))),
    Promise.all(points.map(pt => searchNearbyDriveIns(pt[0], pt[1], searchR * 3).catch(() => []))),
  ]);

  const seen = new Set();
  const results = [...bookBatches.flat(), ...cafeBatches.flat(), ...driveInBatches.flat()]
    .filter(p => { if (!p?.id || seen.has(p.id)) return false; seen.add(p.id); return true; })
    .map(p => ({ ...p, coords: p.coords ?? (p.lat != null ? [p.lat, p.lng] : null) }))
    .filter(p => p.coords);
  console.log(`[DayTrip] literary → ${results.length} places by type:`,
    Object.fromEntries(['cafe','bookstore','drivein'].map(t => [t, results.filter(p => p.type === t).length])));
  return results;
};

// ── Stop selection helpers ────────────────────────────────────────────────────

const tagDistance = (places, origin) =>
  places
    .map(p => ({ ...p, _distMiles: haversine(origin, p.coords) }))
    .filter(p => isFinite(p._distMiles))
    .sort((a, b) => a._distMiles - b._distMiles);

const rotatePool = (pool, n) => {
  if (!pool.length || n === 0) return pool;
  const offset = n % pool.length;
  return [...pool.slice(offset), ...pool.slice(0, offset)];
};

// ── Routing helpers ──────────────────────────────────────────────────────────

const getSegment = async (from, to) => {
  if (!from || !to) return [from || to, to || from].filter(Boolean);
  const seg = await getMapboxRoute(from[0], from[1], to[0], to[1], true);
  if (seg?.length > 1) return seg;
  return Array.from({ length: 10 }, (_, i) => [
    from[0] + (to[0] - from[0]) * i / 9,
    from[1] + (to[1] - from[1]) * i / 9,
  ]);
};

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

// ── buildRoute: recompute route for a user-selected subset of stops ────────────
// Called when user checks/unchecks stops and clicks UPDATE ROUTE.
export const buildRoute = async (startCoords, stops) => {
  if (!stops.length) return null;
  // Preserve drive-in at end
  const driveIns = stops.filter(s => s.type === 'drivein');
  const others   = stops.filter(s => s.type !== 'drivein');
  const ordered  = [...nearestNeighbor(startCoords, others), ...driveIns];
  const waypoints = [startCoords, ...ordered.map(s => s.coords), startCoords];
  const segments  = await Promise.all(
    waypoints.slice(0, -1).map((pt, i) => getSegment(pt, waypoints[i + 1]))
  );
  return {
    stops:            ordered,
    routeCoordinates: segments.flat(),
    segments,
    schedule:         buildSchedule(ordered, segments),
  };
};

// ── Main export ───────────────────────────────────────────────────────────────
// Generates MORE stops than strictly needed so the user can choose their itinerary.
// Stop selection rules:
//   quick:   1 cafe (required) + 2 variety — NO restaurant, NO drivein
//   halfDay: 1 cafe + 1 bookstore + 1 restaurant + 3 variety — NO drivein
//   fullDay: 1 cafe + 1 bookstore + 1 restaurant + 6 variety + optional drivein LAST
//
// Google Places (New) API v1 type names only — invalid types cause silent batch failures.
// Verified valid types: museum, art_gallery, zoo, aquarium, park, national_park,
//   botanical_garden, restaurant, music_store, garden_center, observatory, planetarium
export const generateDayTrip = async (startCoords, duration, variant = 0, excludedIds = new Set()) => {
  const radius  = RADIUS_MILES[duration];
  // rMeters kept for backwards compat (not used after Google Places removal)

  console.log(`[DayTrip] generating ${duration} trip from [${startCoords}] variant=${variant}`);

  // Fetch all categories in parallel — Firestore (bookstores) + Foursquare (everything else).
  const [literary, museums, wildlife, nature, restaurants, music, garden, observatory, flea, antique, historical] = await Promise.all([
    fetchLiterary(startCoords, radius),
    fetchNearby(startCoords[0], startCoords[1], radius, [FS_CAT.museum, FS_CAT.art_gallery], 'museum'),
    fetchNearby(startCoords[0], startCoords[1], radius, [FS_CAT.zoo, FS_CAT.aquarium], 'scenic'),
    fetchNearby(startCoords[0], startCoords[1], radius, [FS_CAT.park, FS_CAT.national_park, FS_CAT.botanical_garden], 'park'),
    duration !== 'quick'
      ? fetchNearby(startCoords[0], startCoords[1], radius, [FS_CAT.restaurant], 'restaurant')
      : Promise.resolve([]),
    fetchNearby(startCoords[0], startCoords[1], radius, [FS_CAT.music_store], 'music'),
    fetchNearby(startCoords[0], startCoords[1], radius, [FS_CAT.botanical_garden], 'garden'),
    fetchNearby(startCoords[0], startCoords[1], radius, [FS_CAT.planetarium], 'observatory'),
    fetchNearby(startCoords[0], startCoords[1], radius, [FS_CAT.flea_market], 'flea'),
    fetchNearby(startCoords[0], startCoords[1], radius, [FS_CAT.antique_shop], 'antique'),
    fetchNearby(startCoords[0], startCoords[1], radius, [FS_CAT.historical], 'historical'),
  ]);

  // Split literary pool by subtype
  const cafes      = literary.filter(p => p.type === 'cafe');
  const bookstores = literary.filter(p => p.type === 'bookstore');
  const landmarks  = literary.filter(p => p.type === 'landmark');
  const driveins   = literary.filter(p => p.type === 'drivein');

  // Sort by distance, rotate for variant so regenerate yields different picks
  const rotate = (pool) => rotatePool(tagDistance(pool, startCoords), variant);
  const cafePool  = rotate(cafes);
  const bookPool  = rotate(bookstores);
  const landPool  = rotate(landmarks);
  const drivePool = rotate(driveins);
  const musePool  = rotate(museums);
  const wildPool  = rotate(wildlife);
  const parkPool  = rotate(nature);
  const mealPool  = rotate(restaurants);
  const musiPool  = rotate(music);
  const gardPool  = rotate(garden);
  const obsvPool  = rotate(observatory);
  const fleaPool  = rotate(flea);
  const antqPool  = rotate(antique);
  const histPool  = rotate(historical);

  const stops   = [];
  const usedIds = new Set(excludedIds);
  // How many of each type we've picked — allow 1 of guaranteed types, up to 2 of variety
  const typeCounts = {};
  const MAX_PER_TYPE = {
    cafe: 1, bookstore: 1, restaurant: 1, drivein: 1,
    museum: 2, scenic: 2, park: 2, landmark: 2,
    music: 1, garden: 1, observatory: 1, flea: 1, antique: 1, historical: 2,
  };

  const pick = (pool, type) => {
    const max = MAX_PER_TYPE[type] ?? 2;
    if ((typeCounts[type] || 0) >= max) return false;
    const p = pool.find(p => !usedIds.has(p.id));
    if (!p) return false;
    usedIds.add(p.id);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
    stops.push(p);
    return true;
  };

  const target = STOP_TARGETS[duration];

  // STEP 1: Guaranteed priority picks
  pick(cafePool, 'cafe');                                 // Always: 1 coffee shop
  if (duration !== 'quick') pick(bookPool, 'bookstore'); // half/full: 1 bookstore
  if (duration !== 'quick') pick(mealPool, 'restaurant');// half/full: 1 restaurant

  // STEP 2: Fill remaining slots cycling through ALL variety pools
  // Ordering: museum → wildlife → park → landmark → music → garden → observatory
  // → 2nd museum → 2nd wildlife → 2nd park → 2nd landmark (for fullDay overflow)
  const varietyPools = [
    { pool: musePool,  type: 'museum'      },
    { pool: wildPool,  type: 'scenic'      },
    { pool: parkPool,  type: 'park'        },
    { pool: landPool,  type: 'landmark'    },
    { pool: musiPool,  type: 'music'       },
    { pool: gardPool,  type: 'garden'      },
    { pool: obsvPool,  type: 'observatory' },
    { pool: fleaPool,  type: 'flea'        },
    { pool: antqPool,  type: 'antique'     },
    { pool: histPool,  type: 'historical'  },
    // Second-pass for long trips
    { pool: musePool,  type: 'museum'      },
    { pool: wildPool,  type: 'scenic'      },
    { pool: parkPool,  type: 'park'        },
    { pool: landPool,  type: 'landmark'    },
  ];

  let vi = variant % 10; // start offset within first 10 unique types
  let noPickStreak = 0;
  while (stops.length < target && noPickStreak < varietyPools.length) {
    const { pool, type } = varietyPools[vi % varietyPools.length];
    if (pick(pool, type)) { noPickStreak = 0; } else { noPickStreak++; }
    vi++;
  }

  console.log(`[DayTrip] selected ${stops.length} stops:`,
    stops.map(s => `${s.type}:${s.name}`).join(' | '));

  if (!stops.length) return null;

  // STEP 3: Nearest-neighbor ordering (drive-ins always last)
  const ordered = [...nearestNeighbor(startCoords, stops)];

  // STEP 4: For full-day trips, optionally append a drive-in as the final stop
  if (duration === 'fullDay') {
    const driveIn = drivePool.find(p => !usedIds.has(p.id));
    if (driveIn) ordered.push(driveIn);
  }

  const waypoints = [startCoords, ...ordered.map(s => s.coords), startCoords];
  const segments  = await Promise.all(
    waypoints.slice(0, -1).map((pt, i) => getSegment(pt, waypoints[i + 1]))
  );

  return {
    stops:            ordered,
    routeCoordinates: segments.flat(),
    segments,
    schedule:         buildSchedule(ordered, segments),
    duration,
    startCoords,
  };
};
