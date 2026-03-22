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

// Tiered-radius version — used for route endpoints and single-point destination searches
// Libraries excluded from route planner results (too abundant, obscure unique discoveries)
export const searchNearbyPlacesTiered = async (lat, lng) => {
  const [bookstores, cafes] = await Promise.all([
    getNearbyBookstores(lat, lng, CATEGORY_RADII.bookstore),
    getNearbyCoffeeShops(lat, lng, CATEGORY_RADII.cafe),
  ]);
  return [...bookstores, ...cafes];
};

// Route search with tiered radii per category
// Samples route every 15 miles; cached points cost $0
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

  const [bookstoreResults, cafeResults] = await Promise.all([
    Promise.all(samplePoints.map(([lat, lng]) => getNearbyBookstores(lat, lng, CATEGORY_RADII.bookstore))),
    Promise.all(samplePoints.map(([lat, lng]) => getNearbyCoffeeShops(lat, lng, CATEGORY_RADII.cafe))),
  ]);

  // Deduplicate then cap per type to prevent dense-city routes from overwhelming
  // (e.g. Seattle→Spokane: 18 sample points × many Seattle bookstores = hundreds)
  const CAP = { bookstore: 40, cafe: 40 };
  const seenIds = new Set();
  const typeCounts = { bookstore: 0, cafe: 0 };
  return [...bookstoreResults.flat(), ...cafeResults.flat()]
    .filter(p => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      const type = p.type;
      if (CAP[type] !== undefined) {
        if (typeCounts[type] >= CAP[type]) return false;
        typeCounts[type]++;
      }
      return true;
    });
};
