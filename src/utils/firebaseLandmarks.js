import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Haversine distance formula
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};


// Get curated literary landmarks from Firebase within radiusMiles of any route point.
// Pass start + all route points + end for full coverage.
// Use a generous radius (25 miles default) since ALA landmarks are geocoded to city centers.
export const getCuratedLandmarks = async (routePoints, radiusMiles = 25) => {
  try {
    const landmarksRef = collection(db, 'literary_landmarks');
    const snapshot = await getDocs(landmarksRef);

    const allLandmarks = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Skip docs without valid coordinates (failed geocoding)
      if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
      // Preserve the original source field (e.g. 'ALA') so The Shelf can attribute correctly
      // Always enforce type:'landmark' — guards against missing/incorrect Firestore field
      allLandmarks.push({ id: doc.id, ...data, type: 'landmark' });
    });

    console.log(`[Firestore] ${allLandmarks.length} total landmarks fetched`);

    // Sample route points to keep the distance check fast on long routes
    // Guard against old saved routes that stored coords as flat numbers instead of [lat,lng] pairs
    const samplePoints = routePoints
      .filter((_, i) => i % 5 === 0)
      .concat(routePoints[routePoints.length - 1])
      .filter(p => Array.isArray(p) && p.length >= 2);

    const nearbyLandmarks = allLandmarks.filter(landmark =>
      samplePoints.some(point =>
        getDistance(landmark.lat, landmark.lng, point[0], point[1]) <= radiusMiles
      )
    );

    console.log(`[Firestore] ${nearbyLandmarks.length} landmarks within ${radiusMiles} miles of route`);
    return nearbyLandmarks;
  } catch (error) {
    console.error('[Firestore] getCuratedLandmarks error:', error);
    return [];
  }
};

// Fetch all drive-ins from Firestore and normalize type to 'drivein'
const fetchAllDriveIns = async () => {
  const snapshot = await getDocs(collection(db, 'driveIns'));
  const all = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
    all.push({ id: doc.id, ...data, type: 'drivein' });
  });
  console.log(`[Firestore] ${all.length} drive-ins fetched`);
  return all;
};

export const getDriveInsAlongRoute = async (routePoints, radiusMiles = 100) => {
  try {
    const all = await fetchAllDriveIns();
    // Guard: old saved routes may contain bare numbers (flat [lat,lng,lat,lng,...] format)
    // instead of [[lat,lng],...] pairs — filter those out before destructuring
    const samples = routePoints
      .filter((_, i) => i % 5 === 0)
      .concat(routePoints[routePoints.length - 1])
      .filter(p => Array.isArray(p) && p.length >= 2);
    if (!samples.length) return [];
    return all.filter(d =>
      samples.some(([pLat, pLng]) => getDistance(d.lat, d.lng, pLat, pLng) <= radiusMiles)
    );
  } catch (error) {
    console.error('[Firestore] getDriveInsAlongRoute error:', error);
    return [];
  }
};

export const getDriveInsNear = async (lat, lng, radiusMiles = 75) => {
  try {
    const all = await fetchAllDriveIns();
    return all.filter(d => getDistance(d.lat, d.lng, lat, lng) <= radiusMiles);
  } catch (error) {
    console.error('[Firestore] getDriveInsNear error:', error);
    return [];
  }
};

// ── Ghost Towns ───────────────────────────────────────────────────────────────
const _ghostTownCache = { data: null, ts: 0 };
const GHOST_TOWN_TTL  = 10 * 60 * 1000; // 10 min

const fetchAllGhostTowns = async () => {
  const now = Date.now();
  if (_ghostTownCache.data && now - _ghostTownCache.ts < GHOST_TOWN_TTL) {
    return _ghostTownCache.data;
  }
  const snapshot = await getDocs(collection(db, 'ghostTowns'));
  const all = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
    if (data.active === false) return;
    all.push({
      id:               doc.id,
      name:             data.name             || '',
      type:             'ghostTown',
      lat:              data.lat,
      lng:              data.lng,
      city:             data.city             || '',
      state:            data.state            || '',
      description:      data.description      || '',
      historicalNotes:  data.historicalNotes  || '',
      bestTimeToVisit:  data.bestTimeToVisit  || '',
      website:          data.website          || '',
      source:           'firestore',
      coords:           [data.lat, data.lng],
    });
  });
  console.log(`[Firestore] ${all.length} active ghost towns fetched`);
  _ghostTownCache.data = all;
  _ghostTownCache.ts   = now;
  return all;
};

export const getGhostTownsNear = async (lat, lng, radiusMiles = 75) => {
  try {
    const all = await fetchAllGhostTowns();
    const nearby = all.filter(g => getDistance(g.lat, g.lng, lat, lng) <= radiusMiles);
    console.log(`[GhostTowns] ${all.length} total, ${nearby.length} within ${radiusMiles}mi of [${lat.toFixed(2)}, ${lng.toFixed(2)}]`);
    return nearby;
  } catch (error) {
    console.error('[GhostTowns] getGhostTownsNear FAILED:', error);
    return [];
  }
};

export const getGhostTownsAlongRoute = async (routePoints, radiusMiles = 30) => {
  try {
    const all = await fetchAllGhostTowns();
    const samples = routePoints
      .filter((_, i) => i % 5 === 0)
      .concat(routePoints[routePoints.length - 1])
      .filter(p => Array.isArray(p) && p.length >= 2);
    if (!samples.length) return [];
    const nearby = all.filter(g =>
      samples.some(([pLat, pLng]) => getDistance(g.lat, g.lng, pLat, pLng) <= radiusMiles)
    );
    console.log(`[GhostTowns] ${nearby.length} within ${radiusMiles}mi of route`);
    return nearby;
  } catch (error) {
    console.error('[GhostTowns] getGhostTownsAlongRoute FAILED:', error);
    return [];
  }
};

// ── Extra collections for main map (route planner + NEAR ME) ─────────────────
// Each collection is small enough to fetch-all and filter client-side.
const EXTRA_COLLECTIONS = [
  { name: 'museums',       type: 'museum'      },
  { name: 'restaurants',   type: 'restaurant'  },
  { name: 'parks',         type: 'park'        },
  { name: 'historicSites', type: 'historicSite'},
  { name: 'artGalleries',  type: 'artGallery'  },
  { name: 'observatories', type: 'observatory' },
  { name: 'aquariums',     type: 'aquarium'    },
  { name: 'theaters',      type: 'theater'     },
];

const _fetchCollection = async (colName, type) => {
  const snap = await getDocs(collection(db, colName));
  const all = [];
  snap.forEach(doc => {
    const d = doc.data();
    if (typeof d.lat !== 'number' || typeof d.lng !== 'number') return;
    all.push({ id: doc.id, ...d, type });
  });
  return all;
};

export const getExtraLocationsAlongRoute = async (routePoints, radiusMiles = 50) => {
  try {
    const samples = routePoints
      .filter((_, i) => i % 5 === 0)
      .concat(routePoints[routePoints.length - 1])
      .filter(p => Array.isArray(p) && p.length >= 2);
    if (!samples.length) return [];

    const batches = await Promise.all(
      EXTRA_COLLECTIONS.map(({ name, type }) =>
        _fetchCollection(name, type).catch(() => [])
      )
    );
    return batches.flat().filter(loc =>
      samples.some(([pLat, pLng]) => getDistance(loc.lat, loc.lng, pLat, pLng) <= radiusMiles)
    );
  } catch (error) {
    console.error('[Firestore] getExtraLocationsAlongRoute error:', error);
    return [];
  }
};

export const getExtraLocationsNear = async (lat, lng, radiusMiles = 75) => {
  try {
    const batches = await Promise.all(
      EXTRA_COLLECTIONS.map(({ name, type }) =>
        _fetchCollection(name, type).catch(() => [])
      )
    );
    return batches.flat().filter(loc =>
      getDistance(loc.lat, loc.lng, lat, lng) <= radiusMiles
    );
  } catch (error) {
    console.error('[Firestore] getExtraLocationsNear error:', error);
    return [];
  }
};
