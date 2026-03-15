// Combined nearby search: Firestore bookstores + Firestore coffeeShops
// Drop-in replacement for googlePlaces.searchNearbyPlaces + searchAlongRoute
import { getNearbyBookstores, getNearbyCoffeeShops } from './firestorePlaces';

const distanceMiles = ([lat1, lng1], [lat2, lng2]) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Drop-in replacement for googlePlaces.searchNearbyPlaces
// Combines: Firestore bookstores + Firestore coffeeShops
export const searchNearbyPlaces = async (lat, lng, radiusMiles = 5) => {
  const [bookstores, cafes] = await Promise.all([
    getNearbyBookstores(lat, lng, radiusMiles),
    getNearbyCoffeeShops(lat, lng, radiusMiles),
  ]);
  return [...bookstores, ...cafes];
};

// Drop-in replacement for googlePlaces.searchAlongRoute
// Samples route every 15 miles; cached points cost $0
export const searchAlongRoute = async (routePoints, radiusMiles = 5) => {
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

  const results = await Promise.all(
    samplePoints.map(([lat, lng]) => searchNearbyPlaces(lat, lng, radiusMiles))
  );

  const seenIds = new Set();
  return results.flat().filter(p => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });
};
