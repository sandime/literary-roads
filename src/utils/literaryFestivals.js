import festivalsData from '../data/literaryFestivals.json';

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

// Return festivals within radiusMiles of any sampled point along the route
export const getLiteraryFestivalsAlongRoute = (routePoints, radiusMiles = 100) => {
  if (!routePoints?.length) return [];
  // Sample every 5th point + last point so the check stays fast on long routes
  const samples = routePoints
    .filter((_, i) => i % 5 === 0)
    .concat([routePoints[routePoints.length - 1]]);

  return festivalsData
    .filter(f => samples.some(([pLat, pLng]) => distMiles(f.lat, f.lng, pLat, pLng) <= radiusMiles))
    .map(toLocation);
};

// Return festivals within radiusMiles of a single point (used for NEAR ME)
export const getLiteraryFestivalsNear = (lat, lng, radiusMiles = 75) =>
  festivalsData
    .filter(f => distMiles(f.lat, f.lng, lat, lng) <= radiusMiles)
    .map(toLocation);
