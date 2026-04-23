// Three-tier place search utility
// Tier 1: Firestore (free, our own data)
// Tier 2: Mapbox geocoding (low cost, existing)
// Tier 3: Google Places v1 API (explicit user action only — never automatic)
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { autocompleteAddress } from './mapboxGeocoding';

const PLACES_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const textMatch = (text, q) => (text || '').toLowerCase().includes(q.toLowerCase());

// ── Category keyword detection ─────────────────────────────────────────────
// When the user types a category word ("coffee shops", "bookstores", etc.)
// we return all nearby locations of that type rather than text-matching names.
const CATEGORY_MAP = {
  'bookstore':    'bookstore',
  'bookstores':   'bookstore',
  'book store':   'bookstore',
  'book stores':  'bookstore',
  'books':        'bookstore',
  'used books':   'bookstore',
  'indie books':  'bookstore',
  'coffee':       'cafe',
  'coffee shop':  'cafe',
  'coffee shops': 'cafe',
  'cafe':         'cafe',
  'cafes':        'cafe',
  'café':         'cafe',
  'cafés':        'cafe',
  'tea shop':     'cafe',
  'landmark':     'landmark',
  'landmarks':    'landmark',
  'festival':     'festival',
  'festivals':    'festival',
  'drive-in':     'drivein',
  'drive-ins':    'drivein',
  'drivein':      'drivein',
  'drive in':     'drivein',
  'ghost town':   'ghostTown',
  'ghost towns':  'ghostTown',
};

// Returns the Firestore type for a category query, or null if it's a specific search.
export function getCategoryType(q) {
  return CATEGORY_MAP[(q || '').trim().toLowerCase()] ?? null;
}

// ── Session cache for whole-collection fetches ─────────────────────────────
const _cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function cachedFetch(key, fn) {
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit && now - hit.ts < CACHE_TTL) return hit.data;
  const data = await fn();
  _cache.set(key, { data, ts: now });
  return data;
}

async function fetchAll(col) {
  const snap = await getDocs(collection(db, col));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// For large collections: lat bounding box around map center, then haversine filter
async function fetchNearby(col, type, centerLat, centerLng, radiusMiles = 150) {
  const latDelta = radiusMiles / 69;
  const q = query(
    collection(db, col),
    where('lat', '>=', centerLat - latDelta),
    where('lat', '<=', centerLat + latDelta),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, type, ...d.data() }))
    .filter(d => d.lat && d.lng && haversine(centerLat, centerLng, d.lat, d.lng) <= radiusMiles);
}

// ── TIER 1: Firestore ──────────────────────────────────────────────────────
// Category mode: if query matches a category keyword, returns all nearby locations
//   of that type (no name filter), up to 10, sorted by distance.
// Specific mode: text-matches name/city/state across all collections, up to 5 each.
export async function searchFirestore(q, centerLat, centerLng) {
  if (!q || q.trim().length < 2) return [];

  const dist = (item) => haversine(centerLat, centerLng, item.lat ?? 0, item.lng ?? 0);
  const toResult = (i, type) => ({
    ...i, type, source: 'firestore',
    address: i.address || [i.city, i.state].filter(Boolean).join(', ') || '',
    coords:  [i.lat, i.lng],
  });

  // ── Category mode ────────────────────────────────────────────────────────
  const categoryType = getCategoryType(q);
  if (categoryType) {
    let items = [];
    if (categoryType === 'bookstore') {
      items = await fetchNearby('bookstores', 'bookstore', centerLat, centerLng);
    } else if (categoryType === 'cafe') {
      items = await fetchNearby('coffeeShops', 'cafe', centerLat, centerLng);
    } else if (categoryType === 'landmark') {
      const all = await cachedFetch('literary_landmarks', () => fetchAll('literary_landmarks'));
      items = all.filter(i => i.lat && i.lng).map(i => ({ ...i, type: 'landmark' }));
    } else if (categoryType === 'festival') {
      const all = await cachedFetch('literaryFestivals', () => fetchAll('literaryFestivals'));
      items = all.filter(i => i.lat && i.lng).map(i => ({ ...i, type: 'festival' }));
    } else if (categoryType === 'drivein') {
      const all = await cachedFetch('driveIns', () => fetchAll('driveIns'));
      items = all.filter(i => i.lat && i.lng).map(i => ({ ...i, type: 'drivein' }));
    } else if (categoryType === 'ghostTown') {
      const all = await cachedFetch('ghostTowns', () => fetchAll('ghostTowns'));
      items = all.filter(i => i.active && i.lat && i.lng).map(i => ({ ...i, type: 'ghostTown' }));
    }
    return items
      .sort((a, b) => dist(a) - dist(b))
      .slice(0, 10)
      .map(i => toResult(i, categoryType));
  }

  // ── Specific search mode ─────────────────────────────────────────────────
  // Bookstores and coffeeShops use fetchAll (cached 10 min) so a specific name
  // like "Kean Coffee" is found regardless of where the map is currently centered.
  const [landmarks, festivals, driveIns, ghostTowns, bookstores, coffeeShops] = await Promise.all([
    cachedFetch('literary_landmarks', () => fetchAll('literary_landmarks')),
    cachedFetch('literaryFestivals',  () => fetchAll('literaryFestivals')),
    cachedFetch('driveIns',           () => fetchAll('driveIns')),
    cachedFetch('ghostTowns',         () => fetchAll('ghostTowns')),
    cachedFetch('bookstores',         () => fetchAll('bookstores')),
    cachedFetch('coffeeShops',        () => fetchAll('coffeeShops')),
  ]);

  const pickTop = (items, type) =>
    items
      .filter(i => i.lat && i.lng &&
        (textMatch(i.name, q) || textMatch(i.city, q) || textMatch(i.state, q)))
      .sort((a, b) => dist(a) - dist(b))
      .slice(0, 5)
      .map(i => toResult(i, type));

  const results = [
    ...pickTop(landmarks.map(l => ({ ...l, type: 'landmark' })),     'landmark'),
    ...pickTop(festivals.map(f => ({ ...f, type: 'festival' })),     'festival'),
    ...pickTop(driveIns.map(d => ({ ...d, type: 'drivein' })),       'drivein'),
    ...pickTop(ghostTowns.filter(g => g.active).map(g => ({ ...g, type: 'ghostTown' })), 'ghostTown'),
    ...pickTop(bookstores,  'bookstore'),
    ...pickTop(coffeeShops, 'cafe'),
  ];

  // Deduplicate by ID and by name+address (catches same place seeded twice with different IDs)
  const seenIds   = new Set();
  const seenNames = new Set();
  return results
    .filter(r => {
      if (seenIds.has(r.id)) return false;
      const nameKey = `${(r.name || '').toLowerCase().trim()}|${(r.address || '').toLowerCase().trim()}`;
      if (seenNames.has(nameKey)) return false;
      seenIds.add(r.id);
      seenNames.add(nameKey);
      return true;
    })
    .sort((a, b) => dist(a) - dist(b));
}

// ── TIER 2: Mapbox geocoding ───────────────────────────────────────────────
// Wraps the existing autocompleteAddress — same cost profile as before.
// Only used for specific place/address searches, not category queries.
export async function searchMapbox(q, signal) {
  if (!q || q.trim().length < 2) return [];
  try {
    const results = await autocompleteAddress(q, ['US', 'PR']);
    // If an abort happened, autocompleteAddress may still resolve — ignore stale results
    if (signal?.aborted) return [];
    return results.map(r => ({
      id:      r.id || `mb_${r.lat}_${r.lng}`,
      name:    r.display || r.label,
      type:    'search',
      lat:     r.lat,
      lng:     r.lng,
      address: r.label || '',
      source:  'mapbox',
      coords:  [r.lat, r.lng],
    }));
  } catch {
    return [];
  }
}

// ── TIER 3: Google Places v1 (explicit user action only) ───────────────────
// Uses the new Places API v1 which is REST + CORS-safe.
// NEVER call this automatically — only on user clicking "Search more places".
// Returns { results, error } so callers can surface failures to the user.
export async function searchGooglePlaces(q, centerLat, centerLng, signal) {
  if (!PLACES_KEY || !q) return { results: [], error: 'No API key configured.' };
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      signal,
      referrerPolicy: 'origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id,places.types',
      },
      body: JSON.stringify({
        textQuery: q,
        locationBias: {
          circle: {
            center: { latitude: centerLat, longitude: centerLng },
            radius: 50000,
          },
        },
        maxResultCount: 10,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('[Google Places] HTTP', res.status, errBody);
      return { results: [], error: `Google Places error ${res.status}` };
    }
    const data = await res.json();
    const results = (data.places || [])
      .filter(p => p.location?.latitude && p.location?.longitude)
      .map(p => ({
        id:      `gp_${p.id}`,
        name:    p.displayName?.text || '',
        type:    'search',
        lat:     p.location.latitude,
        lng:     p.location.longitude,
        address: p.formattedAddress || '',
        source:  'google',
        coords:  [p.location.latitude, p.location.longitude],
      }));
    return { results, error: null };
  } catch (err) {
    if (err.name === 'AbortError') return { results: [], error: null };
    console.error('[Google Places] fetch error:', err);
    return { results: [], error: 'Could not reach Google Places.' };
  }
}
