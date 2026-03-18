import { getMapboxRoute } from './mapbox';
import {
  getNearbyBookstores, getNearbyCoffeeShops, getNearbyLibraries,
  getNearbyMuseums, getNearbyRestaurants, getNearbyParks,
  getNearbyHistoricSites, getNearbyArtGalleries, getNearbyObservatories,
  getNearbyAquariums, getNearbyTheaters, getNearbyDriveIns,
} from './firestorePlaces';

export const RADIUS_MILES = { quick: 20, halfDay: 60, fullDay: 120 };

// Generate MORE stops than strictly needed — user picks which to visit via checkboxes
// quick: 3 candidates | halfDay: 6 candidates | fullDay: 9 candidates (+optional drivein)
const STOP_TARGETS = { quick: 3, halfDay: 6, fullDay: 9 };

export const VISIT_MINUTES = {
  bookstore: 60, library: 60, cafe: 30, landmark: 45, drivein: 120,
  museum: 90, artGallery: 75, park: 45, aquarium: 90,
  restaurant: 60, historicSite: 60, music: 45, garden: 45, observatory: 60,
  theater: 90, flea: 60, antique: 60,
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

// Fetch literary places: Firestore bookstores + Firestore coffeeShops
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

  const [bookBatches, cafeBatches, libBatches] = await Promise.all([
    Promise.all(points.map(pt => getNearbyBookstores(pt[0], pt[1], searchR).catch(() => []))),
    Promise.all(points.map(pt => getNearbyCoffeeShops(pt[0], pt[1], searchR).catch(() => []))),
    Promise.all(points.map(pt => getNearbyLibraries(pt[0], pt[1], searchR).catch(() => []))),
  ]);

  const seen = new Set();
  const results = [...bookBatches.flat(), ...cafeBatches.flat(), ...libBatches.flat()]
    .filter(p => { if (!p?.id || seen.has(p.id)) return false; seen.add(p.id); return true; })
    .map(p => ({ ...p, coords: p.coords ?? (p.lat != null ? [p.lat, p.lng] : null) }))
    .filter(p => p.coords);
  console.log(`[DayTrip] literary → ${results.length} places by type:`,
    Object.fromEntries(['cafe','bookstore','library','drivein'].map(t => [t, results.filter(p => p.type === t).length])));
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

// ── Restaurant filtering ──────────────────────────────────────────────────────

// Simple fuzzy match: substring OR Levenshtein ≤ 2 on individual tokens
const levenshtein = (a, b) => {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[a.length][b.length];
};

const cuisineMatch = (restaurantCuisine, query) => {
  if (!query) return true;
  if (!restaurantCuisine) return false;
  const q = query.toLowerCase().trim();
  // OSM cuisine can be "italian;pizza" — split on semicolon, comma, slash
  const parts = restaurantCuisine.toLowerCase().split(/[;,/]+/).map(s => s.trim()).filter(Boolean);
  return parts.some(part => {
    // Exact match
    if (part === q) return true;
    // Fuzzy match: allow ≤2 edits BUT only if similarity ≥ 80%
    // (prevents "persian" matching "peruvian": dist=2 but similarity=75%)
    const dist = levenshtein(part, q);
    if (dist > 2) return false;
    const similarity = 1 - dist / Math.max(part.length, q.length);
    return similarity >= 0.8;
  });
};

const DIETARY_KEYS = ['vegan', 'vegetarian', 'gluten_free', 'halal', 'kosher'];

const dietaryMatch = (place, dietaryFilters) => {
  if (!dietaryFilters || !dietaryFilters.size) return true;
  // OR logic — any enabled dietary filter that matches
  return [...dietaryFilters].some(diet =>
    DIETARY_KEYS.includes(diet) && place[`diet_${diet}`]?.toLowerCase() === 'yes'
  );
};

const filterRestaurants = (restaurants, restaurantFilter) => {
  if (!restaurantFilter) return restaurants;
  const { cuisine, dietary } = restaurantFilter;
  const hasCuisine = Boolean(cuisine);
  const hasDietary = dietary instanceof Set && dietary.size > 0;
  if (!hasCuisine && !hasDietary) return restaurants;

  return restaurants.filter(r => {
    // Cuisine filter — independent; skip if no cuisine entered
    if (hasCuisine && !cuisineMatch(r.cuisine, cuisine)) return false;
    // Dietary filter — independent, OR logic; skip if no diet selected
    if (hasDietary && !dietaryMatch(r, dietary)) return false;
    return true;
  });
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
export const generateDayTrip = async (startCoords, duration, variant = 0, excludedIds = new Set(), categories = null, restaurantFilter = null) => {
  // null means all enabled; otherwise only fetch/include what's in the Set
  const has = (cat) => !categories || categories.has(cat);
  const radius  = RADIUS_MILES[duration];
  // rMeters kept for backwards compat (not used after Google Places removal)

  console.log(`[DayTrip] generating ${duration} trip from [${startCoords}] variant=${variant}`);

  // Build compass sample points (mirrors fetchLiterary's strategy for large radii)
  const searchR = Math.min(radius, MAX_RADIUS_MILES);
  const points  = [startCoords];
  if (radius > MAX_RADIUS_MILES) {
    const off  = radius * 0.5;
    const latD = off / 69;
    const lngD = off / (69 * Math.cos(startCoords[0] * Math.PI / 180));
    points.push(
      [startCoords[0] + latD, startCoords[1]],
      [startCoords[0] - latD, startCoords[1]],
      [startCoords[0],         startCoords[1] + lngD],
      [startCoords[0],         startCoords[1] - lngD],
    );
  }

  // Fetch all categories in parallel from Firestore
  const fetchNearby = (fn) => Promise.all(
    points.map(pt => fn(pt[0], pt[1], searchR).catch(() => []))
  ).then(batches => {
    const seen = new Set();
    return batches.flat().filter(p => p?.id && !seen.has(p.id) && seen.add(p.id));
  });

  const none = Promise.resolve([]);
  const [literary, museums, aquariums, nature, restaurants, observatory, historicSites, artGalleries, theaters] = await Promise.all([
    fetchLiterary(startCoords, radius),
    has('museum')      ? fetchNearby(getNearbyMuseums)       : none,
    has('aquarium')    ? fetchNearby(getNearbyAquariums)     : none,
    has('park')        ? fetchNearby(getNearbyParks)         : none,
    has('restaurant')  ? fetchNearby(getNearbyRestaurants)   : none,
    has('observatory') ? fetchNearby(getNearbyObservatories) : none,
    has('historicSite')? fetchNearby(getNearbyHistoricSites) : none,
    has('artGallery')  ? fetchNearby(getNearbyArtGalleries)  : none,
    has('theater')     ? fetchNearby(getNearbyTheaters)      : none,
  ]);

  // Split literary pool by subtype — respect category filter
  const cafes      = has('cafe')      ? literary.filter(p => p.type === 'cafe')      : [];
  const bookstores = has('bookstore') ? literary.filter(p => p.type === 'bookstore') : [];
  const libraries  = has('library')   ? literary.filter(p => p.type === 'library')   : [];
  const landmarks  = has('landmark')  ? literary.filter(p => p.type === 'landmark')  : [];
  const driveins   = has('drivein')   ? literary.filter(p => p.type === 'drivein')   : [];

  // Sort by distance, rotate for variant so regenerate yields different picks
  const rotate = (pool) => rotatePool(tagDistance(pool, startCoords), variant);
  const cafePool  = rotate(cafes);
  const bookPool  = rotate(bookstores);
  const libPool   = rotate(libraries);
  const landPool  = rotate(landmarks);
  const drivePool = rotate(driveins);
  const musePool  = rotate(museums);
  const aquaPool  = rotate(aquariums);
  const parkPool  = rotate(nature);
  const filteredRestaurants = filterRestaurants(restaurants, restaurantFilter);
  const mealPool  = rotate(filteredRestaurants);
  // Track whether restaurant filter was active but returned nothing (for error messaging)
  const restaurantFilterActive = restaurantFilter &&
    (Boolean(restaurantFilter.cuisine) || (restaurantFilter.dietary instanceof Set && restaurantFilter.dietary.size > 0));
  const restaurantFilterEmpty  = restaurantFilterActive && restaurants.length > 0 && filteredRestaurants.length === 0;
  const obsvPool  = rotate(observatory);
  const histPool  = rotate(historicSites);
  const gallPool  = rotate(artGalleries);
  const theatPool = rotate(theaters);

  const stops   = [];
  const usedIds = new Set(excludedIds);
  // How many of each type we've picked — allow 1 of guaranteed types, up to 2 of variety
  const typeCounts = {};
  const MAX_PER_TYPE = {
    cafe: 1, bookstore: 1, library: 2, restaurant: 1, drivein: 1,
    museum: 2, aquarium: 1, park: 2, landmark: 2,
    observatory: 1, historicSite: 2, artGallery: 1, theater: 1,
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

  // STEP 1: Guaranteed priority picks (only if category is enabled)
  if (has('cafe'))       pick(cafePool, 'cafe');
  if (has('bookstore')  && duration !== 'quick') pick(bookPool, 'bookstore');
  if (has('restaurant') && duration !== 'quick') pick(mealPool, 'restaurant');

  // STEP 2: Fill remaining slots cycling through ALL variety pools
  // Ordering: museum → wildlife → park → landmark → music → garden → observatory
  // → 2nd museum → 2nd wildlife → 2nd park → 2nd landmark (for fullDay overflow)
  const varietyPools = [
    { pool: bookPool,  type: 'bookstore'   },
    { pool: libPool,   type: 'library'     },
    { pool: musePool,  type: 'museum'      },
    { pool: aquaPool,  type: 'aquarium'    },
    { pool: parkPool,  type: 'park'        },
    { pool: landPool,  type: 'landmark'    },
    { pool: histPool,  type: 'historicSite'},
    { pool: gallPool,  type: 'artGallery'  },
    { pool: obsvPool,  type: 'observatory' },
    { pool: theatPool, type: 'theater'     },
    // Second-pass for long trips
    { pool: libPool,   type: 'library'     },
    { pool: musePool,  type: 'museum'      },
    { pool: histPool,  type: 'historicSite'},
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
  if (duration === 'fullDay' && has('drivein')) {
    const driveIn = drivePool.find(p => !usedIds.has(p.id));
    if (driveIn) ordered.push(driveIn);
  }

  const waypoints = [startCoords, ...ordered.map(s => s.coords), startCoords];
  const segments  = await Promise.all(
    waypoints.slice(0, -1).map((pt, i) => getSegment(pt, waypoints[i + 1]))
  );

  return {
    stops:                ordered,
    routeCoordinates:     segments.flat(),
    segments,
    schedule:             buildSchedule(ordered, segments),
    duration,
    startCoords,
    restaurantFilterEmpty, // true when filter was set but no restaurants matched
  };
};
