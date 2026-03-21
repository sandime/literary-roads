// Combined nearby search: Firestore bookstores + Firestore coffeeShops + libraries
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
  // Abundant — 5 miles from route
  library: 5,
  cafe: 5,
  museum: 5,
  // Moderate — 10 miles from route
  bookstore: 10,
  restaurant: 10,
  park: 10,
  historicSite: 10,
  artGallery: 10,
  // Rare — 15 miles from route
  landmark: 15,
  drivein: 15,
  festival: 15,
  theater: 15,
  observatory: 15,
  aquarium: 15,
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
export const searchNearbyPlacesTiered = async (lat, lng) => {
  const [bookstores, cafes, libraries] = await Promise.all([
    getNearbyBookstores(lat, lng, CATEGORY_RADII.bookstore),
    getNearbyCoffeeShops(lat, lng, CATEGORY_RADII.cafe),
    getNearbyLibraries(lat, lng, CATEGORY_RADII.library),
  ]);
  return [...bookstores, ...cafes, ...libraries];
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

  const [bookstoreResults, cafeResults, libraryResults] = await Promise.all([
    Promise.all(samplePoints.map(([lat, lng]) => getNearbyBookstores(lat, lng, CATEGORY_RADII.bookstore))),
    Promise.all(samplePoints.map(([lat, lng]) => getNearbyCoffeeShops(lat, lng, CATEGORY_RADII.cafe))),
    Promise.all(samplePoints.map(([lat, lng]) => getNearbyLibraries(lat, lng, CATEGORY_RADII.library))),
  ]);

  const seenIds = new Set();
  return [...bookstoreResults.flat(), ...cafeResults.flat(), ...libraryResults.flat()]
    .filter(p => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });
};
