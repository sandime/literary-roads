// Combined nearby search: Firestore bookstores + Firestore coffeeShops + libraries
// Libraries are excluded from the exploratory map (route planner) but kept in Near Me.
import { getNearbyBookstores, getNearbyCoffeeShops, getNearbyLibraries } from './firestorePlaces';

const distanceMiles = ([lat1, lng1], [lat2, lng2]) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Tiered search radii based on category density
export const CATEGORY_RADII = {
  // Abundant — reduce only libraries to prevent swamping
  library: 5,
  // Normal — slightly wider for bookstores/cafes so sparse areas aren't missed; caps handle density
  cafe: 20,
  museum: 15,
  bookstore: 20,
  restaurant: 15,
  park: 15,
  historicSite: 15,
  artGallery: 15,
  theater: 15,
  // Very rare — extend further since they're worth the distance
  landmark: 20,
  drivein: 20,
  festival: 20,
  observatory: 20,
  aquarium: 20,
};

// Uniform-radius version — used for Near Me (all 15 miles)
export const searchNearbyPlaces = async (lat, lng, radiusMiles = 5) => {
  const [bookstores, cafes, libraries] = await Promise.all([
    getNearbyBookstores(lat, lng, radiusMiles),
    getNearbyCoffeeShops(lat, lng, radiusMiles),
    getNearbyLibraries(lat, lng, radiusMiles),
  ]);
  return [...bookstores, ...cafes, ...libraries];
};

// Tiered-radius version — used for single-point destination searches (Near Me, search select)
// Libraries excluded from route planner results (too abundant, obscure unique discoveries)
export const searchNearbyPlacesTiered = async (lat, lng) => {
  const [bookstores, cafes] = await Promise.all([
    getNearbyBookstores(lat, lng, CATEGORY_RADII.bookstore),
    getNearbyCoffeeShops(lat, lng, CATEGORY_RADII.cafe),
  ]);
  return [...bookstores, ...cafes];
};

// Route search with tiered radii per category.
// Samples route every 15 miles. CAP raised to 100 per type — distributeAlongRoute
// handles even spread, so the cap is just a safety valve against runaway fetches.
export const searchAlongRoute = async (routePoints) => {
  if (!routePoints.length) return [];

  const SAMPLE_INTERVAL = 15;
  const samplePoints = [routePoints[0]];
  let accumulated = 0;
  for (let i = 1; i < routePoints.length; i++) {
    accumulated += distanceMiles(routePoints[i - 1], routePoints[i]);
    if (accumulated >= SAMPLE_INTERVAL) {
      samplePoints.push(routePoints[i]);
      accumulated = 0;
    }
  }
  const last = routePoints[routePoints.length - 1];
  if (samplePoints[samplePoints.length - 1] !== last) samplePoints.push(last);

  console.log(`[nearbySearch] ${routePoints.length} pts → ${samplePoints.length} samples @ ${SAMPLE_INTERVAL}mi`);

  // Per-sample-point cap: take only the closest N results per point.
  // A global cap fills up at the start city and starves mid-route areas.
  // With closest-first sorting in getNearby*, slice(PER_POINT) gives the
  // nearest places to each sample point before dedup.
  const PER_POINT = 8;

  const [bookstoreResults, cafeResults] = await Promise.all([
    Promise.all(samplePoints.map(([lat, lng]) =>
      getNearbyBookstores(lat, lng, CATEGORY_RADII.bookstore).then(r => r.slice(0, PER_POINT))
    )),
    Promise.all(samplePoints.map(([lat, lng]) =>
      getNearbyCoffeeShops(lat, lng, CATEGORY_RADII.cafe).then(r => r.slice(0, PER_POINT))
    )),
  ]);

  // Deduplicate across all sample points (adjacent points share overlapping coverage)
  const seenIds = new Set();
  return [...bookstoreResults.flat(), ...cafeResults.flat()]
    .filter(p => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });
};

// ── Geographic thinning + destination guarantee ────────────────────────────
// Spreads all location types (bookstores, cafes, landmarks, drive-ins, festivals)
// evenly along the route so middle-of-route areas aren't crowded out by city endpoints.

// Minimum miles between two pins of the same type before the second one is dropped.
const THIN_DIST = {
  bookstore: 8,
  cafe:      8,
  landmark:  12,
  drivein:   30,
  festival:  50,
  ghostTown: 20,
};

// Returns cumulative route miles at each routePoints index.
function buildAccumulatedDist(routePoints) {
  const acc = [0];
  for (let i = 1; i < routePoints.length; i++) {
    acc.push(acc[i - 1] + distanceMiles(routePoints[i - 1], routePoints[i]));
  }
  return acc;
}

// Returns the cumulative route-mile position of the route point closest to loc.
// Samples every 3rd point for speed on long polylines.
function routeMilesOf(loc, routePoints, accDist) {
  let minD = Infinity, pos = 0;
  for (let i = 0; i < routePoints.length; i += 3) {
    const d = distanceMiles([loc.lat, loc.lng], routePoints[i]);
    if (d < minD) { minD = d; pos = accDist[i]; }
  }
  return pos;
}

// Greedy thinning: sort all locations by their position along the route (start → end),
// then walk the list keeping a pin only when no same-type pin within THIN_DIST miles
// has already been kept. This naturally spaces pins across the whole route.
function thinAlongRoute(locations, routePoints) {
  if (!routePoints.length) return locations;
  const accDist = buildAccumulatedDist(routePoints);

  const withPos = locations.map(loc => ({
    loc,
    routeMiles: routeMilesOf(loc, routePoints, accDist),
  }));
  withPos.sort((a, b) => a.routeMiles - b.routeMiles);

  const kept = [];
  for (const { loc } of withPos) {
    const minDist = THIN_DIST[loc.type] ?? 10;
    const conflict = kept.some(k =>
      k.type === loc.type &&
      distanceMiles([k.lat, k.lng], [loc.lat, loc.lng]) < minDist
    );
    if (!conflict) kept.push(loc);
  }
  return kept;
}

// Destination guarantee: after thinning, ensure at least DEST_MIN bookstores and
// cafes exist within DEST_RADIUS miles of the end point. If thinning removed them,
// add back the closest ones from the pre-thinning pool.
function guaranteeDestination(thinned, allRaw, endLat, endLng) {
  const DEST_RADIUS = 15;
  const DEST_MIN    = 3;
  const result  = [...thinned];
  const keptIds = new Set(thinned.map(l => l.id));

  for (const type of ['bookstore', 'cafe']) {
    const alreadyNear = thinned.filter(l =>
      l.type === type &&
      distanceMiles([l.lat, l.lng], [endLat, endLng]) <= DEST_RADIUS
    ).length;
    if (alreadyNear >= DEST_MIN) continue;

    const needed = DEST_MIN - alreadyNear;
    const candidates = allRaw
      .filter(l =>
        l.type === type &&
        !keptIds.has(l.id) &&
        distanceMiles([l.lat, l.lng], [endLat, endLng]) <= DEST_RADIUS
      )
      .sort((a, b) =>
        distanceMiles([a.lat, a.lng], [endLat, endLng]) -
        distanceMiles([b.lat, b.lng], [endLat, endLng])
      )
      .slice(0, needed);

    for (const c of candidates) {
      result.push(c);
      keptIds.add(c.id);
    }
  }
  return result;
}

// Main export: thin all location types along the route, then guarantee destination coverage.
// - allLocations: merged + deduplicated array of all types (bookstores, cafes, landmarks, etc.)
// - routePoints:  [[lat, lng], ...] Mapbox polyline
// - endLat/endLng: destination coordinates for the guarantee pass
//
// Logs a 200-mile bucket table to the console so you can verify even distribution.
export function distributeAlongRoute(allLocations, routePoints, endLat, endLng) {
  const thinned = thinAlongRoute(allLocations, routePoints);
  const result  = guaranteeDestination(thinned, allLocations, endLat, endLng);

  // ── Distribution report ──────────────────────────────────────────────────
  if (routePoints.length > 0) {
    const accDist    = buildAccumulatedDist(routePoints);
    const totalMiles = Math.round(accDist[accDist.length - 1]);
    const BUCKET     = 200;
    const numBuckets = Math.ceil(totalMiles / BUCKET);
    const buckets    = Array.from({ length: numBuckets }, (_, i) => ({
      range:     `${i * BUCKET}–${Math.min((i + 1) * BUCKET, totalMiles)}mi`,
      bookstore: 0,
      cafe:      0,
      landmark:  0,
      drivein:   0,
      festival:  0,
      other:     0,
      total:     0,
    }));
    for (const loc of result) {
      const pos = routeMilesOf(loc, routePoints, accDist);
      const bi  = Math.min(Math.floor(pos / BUCKET), numBuckets - 1);
      const key = buckets[bi][loc.type] !== undefined ? loc.type : 'other';
      buckets[bi][key]++;
      buckets[bi].total++;
    }
    console.log(`[distribute] ${allLocations.length} raw → ${thinned.length} thinned → ${result.length} final (${totalMiles}mi route)`);
    console.table(buckets);
  }

  return result;
}
