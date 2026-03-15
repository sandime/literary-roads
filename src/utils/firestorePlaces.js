// Firestore-based bookstore search — replaces Google Places bookstore calls
// Reads from the 'bookstores' collection seeded from OpenStreetMap data.
// Cost: $0 for reads (well within Firestore free tier for this dataset size)
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// In-session cache keyed by rounded lat/lng + radius (~0.7 mile grid)
const _mem = new Map();
const _inflight = new Map();
const _cacheKey = (lat, lng, r) => `fsp|${lat.toFixed(2)}|${lng.toFixed(2)}|${r}`;

const _cached = (key, fn) => {
  if (_mem.has(key)) return Promise.resolve(_mem.get(key));
  if (_inflight.has(key)) return _inflight.get(key);
  const p = fn()
    .then(v => { _mem.set(key, v); _inflight.delete(key); return v; })
    .catch(e => { _inflight.delete(key); throw e; });
  _inflight.set(key, p);
  return p;
};

// Query bookstores within radiusMiles of a point.
// Uses a lat bounding-box query (single-field range — no composite index needed),
// then filters by haversine to get a true circle.
export const getNearbyBookstores = async (lat, lng, radiusMiles = 5) => {
  const key = _cacheKey(lat, lng, radiusMiles);
  return _cached(key, async () => {
    const latDelta = radiusMiles / 69; // ~69 miles per degree of latitude
    try {
      const q = query(
        collection(db, 'bookstores'),
        where('lat', '>=', lat - latDelta),
        where('lat', '<=', lat + latDelta),
      );
      const snap = await getDocs(q);
      return snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(b => b.lat && b.lng && haversine(lat, lng, b.lat, b.lng) <= radiusMiles)
        .map(b => ({
          id:          b.id,
          name:        b.name,
          type:        'bookstore',
          lat:         b.lat,
          lng:         b.lng,
          address:     [b.address, b.city, b.state].filter(Boolean).join(', ') || '',
          phone:       b.phone  || '',
          website:     b.website || '',
          description: 'Independent bookstore',
          source:      'firestore',
          coords:      [b.lat, b.lng],
        }));
    } catch (err) {
      console.error('[Firestore] getNearbyBookstores error:', err);
      return [];
    }
  });
};
