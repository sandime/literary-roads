// Mapbox Geocoding API — replaces ALL Google Places geocoding + autocomplete
// Free tier: 100,000 requests/month
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// Approximate bounding boxes [minLng, minLat, maxLng, maxLat] per US state/territory
// Used to bias city autocomplete toward the selected state
export const STATE_BBOX = {
  AL: [-88.47, 30.19, -84.89, 35.01], AK: [-179.15, 51.17, -129.97, 71.39],
  AZ: [-114.82, 31.33, -109.04, 37.00], AR: [-94.62, 33.00, -89.65, 36.50],
  CA: [-124.41, 32.53, -114.13, 42.01], CO: [-109.06, 36.99, -102.04, 41.00],
  CT: [-73.73, 40.99, -71.79, 42.05],  DE: [-75.79, 38.45, -75.05, 39.84],
  FL: [-87.63, 24.52, -80.03, 31.00],  GA: [-85.61, 30.36, -80.84, 35.00],
  HI: [-160.25, 18.91, -154.81, 22.24], ID: [-117.24, 41.99, -111.04, 49.00],
  IL: [-91.51, 36.97, -87.49, 42.51],  IN: [-88.10, 37.77, -84.79, 41.76],
  IA: [-96.64, 40.38, -90.14, 43.50],  KS: [-102.05, 36.99, -94.59, 40.00],
  KY: [-89.57, 36.50, -81.96, 39.15],  LA: [-94.04, 28.93, -88.82, 33.02],
  ME: [-71.09, 43.06, -66.95, 47.46],  MD: [-79.49, 37.91, -74.98, 39.72],
  MA: [-73.51, 41.24, -69.93, 42.89],  MI: [-90.42, 41.70, -82.41, 48.26],
  MN: [-97.24, 43.50, -89.49, 49.38],  MS: [-91.65, 30.19, -88.10, 35.00],
  MO: [-95.77, 35.99, -89.10, 40.61],  MT: [-116.05, 44.36, -104.04, 49.00],
  NE: [-104.05, 40.00, -95.31, 43.00], NV: [-120.01, 35.00, -114.03, 42.00],
  NH: [-72.56, 42.70, -70.70, 45.31],  NJ: [-75.56, 38.93, -73.89, 41.36],
  NM: [-109.05, 31.33, -103.00, 37.00], NY: [-79.76, 40.50, -71.86, 45.02],
  NC: [-84.32, 33.84, -75.46, 36.59],  ND: [-104.05, 45.94, -96.56, 49.00],
  OH: [-84.82, 38.40, -80.52, 42.33],  OK: [-103.00, 33.62, -94.43, 37.00],
  OR: [-124.57, 41.99, -116.46, 46.24], PA: [-80.52, 39.72, -74.69, 42.27],
  RI: [-71.91, 41.15, -71.12, 42.02],  SC: [-83.35, 32.05, -78.54, 35.22],
  SD: [-104.06, 42.48, -96.44, 45.94], TN: [-90.31, 34.98, -81.65, 36.68],
  TX: [-106.65, 25.84, -93.51, 36.50], UT: [-114.05, 36.99, -109.04, 42.00],
  VT: [-73.44, 42.73, -71.50, 45.02],  VA: [-83.68, 36.54, -75.25, 39.46],
  WA: [-124.73, 45.54, -116.92, 49.00], WV: [-82.64, 37.20, -77.72, 40.64],
  WI: [-92.89, 42.49, -86.25, 47.08],  WY: [-111.06, 40.99, -104.05, 45.01],
  DC: [-77.12, 38.79, -76.91, 38.99],  PR: [-67.29, 17.88, -65.22, 18.52],
};

// ── Session cache (same pattern as googlePlaces.js) ───────────────────────────
const _mem = new Map();
const _inflight = new Map();

const _get = (key) => {
  if (_mem.has(key)) return _mem.get(key);
  try {
    const raw = sessionStorage.getItem('mb:' + key);
    if (raw) { const v = JSON.parse(raw); _mem.set(key, v); return v; }
  } catch {}
  return undefined;
};

const _set = (key, value) => {
  _mem.set(key, value);
  try { sessionStorage.setItem('mb:' + key, JSON.stringify(value)); } catch {}
};

const _cached = async (key, fn) => {
  const cached = _get(key);
  if (cached !== undefined) return cached;
  if (_inflight.has(key)) return _inflight.get(key);
  const promise = fn()
    .then(r => { _set(key, r); _inflight.delete(key); return r; })
    .catch(e => { _inflight.delete(key); throw e; });
  _inflight.set(key, promise);
  return promise;
};

// Extract 2-letter state code from Mapbox context array (e.g. "US-OR" → "OR")
const extractState = (context = []) => {
  const region = context?.find(c => c.id?.startsWith('region.'));
  return (region?.short_code || '').replace(/^US-/, '');
};

// ── City / locality autocomplete ──────────────────────────────────────────────
// Replaces: autocompleteCity()
// Returns: [{id, display, state, label, lat, lng}]
// stateCode: optional 2-letter code (e.g. "TX") — filters results to that state,
//            with bbox bias + post-filter. Falls back to nationwide if < 3 results.
export const autocompleteCity = async (input, regionCodes = ['US'], stateCode = null) => {
  if (!input || input.length < 2) return [];
  const key = `ac|city|${input.trim().toLowerCase()}|${stateCode || ''}`;
  return _cached(key, async () => {
    const country = regionCodes.includes('PR') ? 'US,PR' : 'US';

    const fetchResults = async (bbox) => {
      const bboxParam = bbox ? `&bbox=${bbox.join(',')}` : '';
      const url = `${BASE}/${encodeURIComponent(input)}.json?` +
        `types=place,district,locality&country=${country}&autocomplete=true&limit=6${bboxParam}&` +
        `access_token=${MAPBOX_TOKEN}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!data.features) return [];
      return data.features.map(f => {
        const state = extractState(f.context);
        return {
          id:      f.id,
          placeId: f.id,
          display: f.text || '',
          state,
          label:   f.place_name || f.text || '',
          lat:     f.geometry.coordinates[1],
          lng:     f.geometry.coordinates[0],
        };
      });
    };

    try {
      if (stateCode && STATE_BBOX[stateCode]) {
        // Filtered: bbox-constrained + post-filter to state code
        const all      = await fetchResults(STATE_BBOX[stateCode]);
        const filtered = all.filter(r => r.state === stateCode);
        if (filtered.length >= 3) return filtered;
        // Fallback: nationwide (no bbox), but still prefer state matches first
        const nationwide = await fetchResults(null);
        const stateFirst = nationwide.filter(r => r.state === stateCode);
        return stateFirst.length >= 1
          ? [...stateFirst, ...nationwide.filter(r => r.state !== stateCode)].slice(0, 6)
          : nationwide;
      }
      return fetchResults(null);
    } catch (err) {
      console.error('[Mapbox] city autocomplete error:', err);
      return [];
    }
  });
};

// ── Address / POI autocomplete ────────────────────────────────────────────────
// Replaces: autocompleteAddress()
// Returns: [{id, display, label, placeId, lat, lng}]
export const autocompleteAddress = async (input, regionCodes = ['US']) => {
  if (!input || input.length < 2) return [];
  const key = `ac|addr|${input.trim().toLowerCase()}`;
  return _cached(key, async () => {
    try {
      const country = regionCodes.includes('PR') ? 'US,PR' : 'US';
      const url = `${BASE}/${encodeURIComponent(input)}.json?` +
        `types=address,poi,place,locality&country=${country}&autocomplete=true&limit=6&` +
        `access_token=${MAPBOX_TOKEN}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!data.features) return [];
      return data.features.map(f => ({
        id:      f.id,
        placeId: f.id,
        display: f.text || '',
        label:   f.place_name || f.text || '',
        lat:     f.geometry.coordinates[1],
        lng:     f.geometry.coordinates[0],
      }));
    } catch (err) {
      console.error('[Mapbox] address autocomplete error:', err);
      return [];
    }
  });
};

// ── Geocode text → coordinates ────────────────────────────────────────────────
// Replaces: geocodeCity() and getPlaceCoords()
// Returns: {lat, lng, formatted} or null
export const geocodePlace = async (query) => {
  if (!query || !query.trim()) return null;
  const key = `geo|${query.trim().toLowerCase()}`;
  return _cached(key, async () => {
    try {
      const url = `${BASE}/${encodeURIComponent(query.trim())}.json?` +
        `types=place,address,locality&country=US,PR&limit=1&` +
        `access_token=${MAPBOX_TOKEN}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!data.features?.length) return null;
      const f = data.features[0];
      return {
        lat:       f.geometry.coordinates[1],
        lng:       f.geometry.coordinates[0],
        formatted: f.place_name || f.text || query,
      };
    } catch (err) {
      console.error('[Mapbox] geocode error:', err);
      return null;
    }
  });
};

// ── POI / place text search ───────────────────────────────────────────────────
// Replaces: foursquareTextSearch — uses Mapbox address+poi autocomplete
// Returns: [{id, name, type, lat, lng, address, coords, source}]
export const searchPlaces = async (query) => {
  const results = await autocompleteAddress(query);
  return results.map(r => ({
    id:      r.id,
    name:    r.display || r.label,
    type:    'search',
    lat:     r.lat,
    lng:     r.lng,
    address: r.label || '',
    coords:  [r.lat, r.lng],
    source:  'mapbox',
  }));
};

// ── Reverse geocode coordinates → address string ──────────────────────────────
// Replaces: reverseGeocode()
export const reverseGeocode = async (lat, lng) => {
  const key = `rev|${lat.toFixed(4)}|${lng.toFixed(4)}`;
  return _cached(key, async () => {
    try {
      const url = `${BASE}/${lng},${lat}.json?types=address,place&limit=1&access_token=${MAPBOX_TOKEN}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.features?.length) return data.features[0].place_name || '';
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  });
};
