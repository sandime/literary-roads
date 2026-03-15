// Foursquare Places API v3 — replaces Google Places nearby + text search
// Free tier: 1,000 calls/day (~30k/month) — no credit card required
const FS_KEY  = import.meta.env.VITE_FOURSQUARE_API_KEY;
const FS_BASE = 'https://api.foursquare.com/v3/places/search';
const FS_FIELDS = 'fsq_id,name,geocodes,location,categories';

// ── Category IDs (Foursquare Places API v3) ───────────────────────────────────
export const FS_CAT = {
  cafe:             13035, // Coffee Shop
  restaurant:       13065, // Restaurant
  museum:           10027, // Museum
  art_gallery:      10002, // Art Gallery
  park:             16032, // Park
  national_park:    16019, // National Park
  botanical_garden: 16007, // Botanical Garden
  music_store:      11135, // Music Store
  zoo:              11057, // Zoo
  aquarium:         10004, // Aquarium
  movie_theater:    10030, // Movie Theater (filter by name for drive-ins)
  historical:       16017, // Historical Site
  flea_market:      18023, // Flea Market
  antique_shop:     17069, // Antique Shop
  planetarium:      10052, // Observatory / Planetarium
};

// ── Cafe quality filter (mirrors googlePlaces.js) ─────────────────────────────
const HARD_EXCLUDE_CAFE = [
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'kfc', 'domino', 'papa john',
  'subway', 'chipotle', 'chick-fil-a', 'sonic', 'arby', 'dairy queen', 'popeyes',
  'five guys', 'jimmy john', 'panda express', 'dunkin', 'tim horton', 'panera',
  '7-eleven', 'circle k', 'sheetz', 'wawa', 'speedway', 'shell', 'exxon',
  'chevron', 'bp ', 'valero', 'quiktrip', 'racetrac', 'cumberland farms',
  'cvs', 'walgreens', 'rite aid', 'krispy kreme', 'winchell',
  'brewing', 'brewery', 'brewhouse', 'brewpub', 'vineyard', 'winery', 'wine bar',
  'taproom', 'sports bar', 'cocktail', 'ristorante', 'trattoria', 'gastropub',
  'tavern', ' grill', 'grille', ' kitchen', 'steakhouse', 'chophouse',
  'sushi', 'ramen', 'taqueria', 'cantina', 'pizzeria',
];
const STRONG_COFFEE = [
  'coffee', 'espresso', 'cappuccino', 'latte', 'roasters', 'roastery',
  'brew', 'bean', 'cafe', 'caffeine', 'tea house', 'teahouse', 'perk',
];
const isRealCafe = (name) => {
  const l = name.toLowerCase();
  if (HARD_EXCLUDE_CAFE.some(t => l.includes(t))) return false;
  return STRONG_COFFEE.some(k => l.includes(k));
};

const DRIVEIN_KEYWORDS = ['drive-in', 'drive in', 'drivein', 'auto movie', 'twin drive'];
const isDriveIn = (name) => DRIVEIN_KEYWORDS.some(k => name.toLowerCase().includes(k));

// ── Session cache ─────────────────────────────────────────────────────────────
const _mem = new Map();
const _inflight = new Map();

const _get = (key) => {
  if (_mem.has(key)) return _mem.get(key);
  try {
    const raw = sessionStorage.getItem('fs:' + key);
    if (raw) { const v = JSON.parse(raw); _mem.set(key, v); return v; }
  } catch {}
  return undefined;
};
const _set = (key, value) => {
  _mem.set(key, value);
  try { sessionStorage.setItem('fs:' + key, JSON.stringify(value)); } catch {}
};
const _cached = async (key, fn) => {
  const cached = _get(key);
  if (cached !== undefined) return cached;
  if (_inflight.has(key)) return _inflight.get(key);
  const p = fn()
    .then(r => { _set(key, r); _inflight.delete(key); return r; })
    .catch(e => { _inflight.delete(key); throw e; });
  _inflight.set(key, p);
  return p;
};

// ── Core fetch helper ─────────────────────────────────────────────────────────
const fetchFS = async (params) => {
  if (!FS_KEY) { console.warn('[Foursquare] No API key set'); return []; }
  const url = new URL(FS_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  url.searchParams.set('fields', FS_FIELDS);
  try {
    const res = await fetch(url.toString(), { headers: { Authorization: FS_KEY } });
    if (!res.ok) {
      console.warn('[Foursquare] API error', res.status);
      return [];
    }
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('[Foursquare] fetch error:', err);
    return [];
  }
};

const toPlace = (p, type) => {
  const lat = p.geocodes?.main?.latitude;
  const lng = p.geocodes?.main?.longitude;
  if (!lat || !lng) return null;
  return {
    id:      p.fsq_id,
    name:    p.name,
    type,
    lat,
    lng,
    address: p.location?.formatted_address || '',
    coords:  [lat, lng],
    source:  'foursquare',
  };
};

// ── Generic nearby search by Foursquare category IDs ─────────────────────────
// typeLabel: the type string to assign each result (e.g. 'museum', 'park')
export const foursquareNearby = async (lat, lng, radiusMiles, categoryIds, typeLabel) => {
  const radiusMeters = Math.min(Math.round(radiusMiles * 1609.34), 100000);
  const catStr = Array.isArray(categoryIds) ? categoryIds.join(',') : String(categoryIds);
  const key = `fn|${lat.toFixed(2)}|${lng.toFixed(2)}|${radiusMiles}|${catStr}`;
  return _cached(key, async () => {
    const results = await fetchFS({ ll: `${lat},${lng}`, radius: radiusMeters, categories: catStr, limit: 10 });
    return results.map(p => toPlace(p, typeLabel)).filter(Boolean);
  });
};

// ── Coffee shops near a point ─────────────────────────────────────────────────
// Replaces: searchNearbyPlaces() cafes portion
export const searchNearbyCafes = async (lat, lng, radiusMiles = 5) => {
  const radiusMeters = Math.min(Math.round(radiusMiles * 1609.34), 100000);
  const key = `fc|${lat.toFixed(2)}|${lng.toFixed(2)}|${radiusMiles}`;
  return _cached(key, async () => {
    const results = await fetchFS({ ll: `${lat},${lng}`, radius: radiusMeters, categories: FS_CAT.cafe, limit: 15 });
    return results
      .filter(p => isRealCafe(p.name))
      .map(p => ({ ...toPlace(p, 'cafe'), description: 'Coffee shop' }))
      .filter(Boolean);
  });
};

// ── Drive-in theaters near a point ───────────────────────────────────────────
// Replaces: searchNearbyPlaces() drive-ins portion
export const searchNearbyDriveIns = async (lat, lng, radiusMiles = 30) => {
  const radiusMeters = Math.min(Math.round(radiusMiles * 1609.34), 100000);
  const key = `fd|${lat.toFixed(2)}|${lng.toFixed(2)}|${radiusMiles}`;
  return _cached(key, async () => {
    const results = await fetchFS({ ll: `${lat},${lng}`, radius: radiusMeters, categories: FS_CAT.movie_theater, limit: 10 });
    return results
      .filter(p => isDriveIn(p.name))
      .map(p => ({ ...toPlace(p, 'drivein'), description: 'Drive-in movie theater' }))
      .filter(Boolean);
  });
};

// ── Text search for places (replaces searchPlacesByText) ─────────────────────
export const foursquareTextSearch = async (query) => {
  if (!query || query.length < 2) return [];
  const key = `fts|${query.trim().toLowerCase()}`;
  return _cached(key, async () => {
    const results = await fetchFS({ query: query.trim(), near: 'United States', limit: 6 });
    return results
      .map(p => {
        const cats = (p.categories || []).map(c => c.id);
        const type = cats.includes(FS_CAT.cafe) ? 'cafe' : 'landmark';
        return { ...toPlace(p, type), description: '', source: 'search' };
      })
      .filter(Boolean);
  });
};
