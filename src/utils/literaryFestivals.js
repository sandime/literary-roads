import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const COLLECTION = 'literaryFestivals';

const distMiles = (lat1, lon1, lat2, lon2) => {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const toLocation = (f) => ({
  id:               `festival_${f.id}`,
  name:             f.name,
  type:             'festival',
  lat:              f.lat,
  lng:              f.lng,
  coords:           [f.lat, f.lng],
  address:          `${f.city}, ${f.state}`,
  description:      f.description,
  url:              f.website,
  typicalMonth:     f.typicalMonth,
  recurringPattern: f.recurringPattern,
  size:             f.size,
});

// Fetch all festivals from Firestore (small collection — haversine filter client-side)
async function fetchAll() {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => d.data());
}

// Return festivals within radiusMiles of any sampled point along the route
export async function getLiteraryFestivalsAlongRoute(routePoints, radiusMiles = 100) {
  if (!routePoints?.length) return [];
  const festivals = await fetchAll();
  // Sample every 5th point + last point so the check stays fast on long routes
  const samples = routePoints
    .filter((_, i) => i % 5 === 0)
    .concat([routePoints[routePoints.length - 1]]);
  return festivals
    .filter(f => samples.some(([pLat, pLng]) => distMiles(f.lat, f.lng, pLat, pLng) <= radiusMiles))
    .map(toLocation);
}

// Return festivals within radiusMiles of a single point (used for NEAR ME)
export async function getLiteraryFestivalsNear(lat, lng, radiusMiles = 75) {
  const festivals = await fetchAll();
  return festivals
    .filter(f => distMiles(f.lat, f.lng, lat, lng) <= radiusMiles)
    .map(toLocation);
}

// Return all festivals as raw data objects (for filtering UI in FestivalTripPlanner)
export async function getAllFestivals() {
  return fetchAll();
}
