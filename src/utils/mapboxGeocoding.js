// Mapbox Geocoding API — replaces ALL Google Places geocoding + autocomplete
// Free tier: 100,000 requests/month
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

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
export const autocompleteCity = async (input, regionCodes = ['US']) => {
  if (!input || input.length < 2) return [];
  const key = `ac|city|${input.trim().toLowerCase()}`;
  return _cached(key, async () => {
    try {
      const country = regionCodes.includes('PR') ? 'US,PR' : 'US';
      const url = `${BASE}/${encodeURIComponent(input)}.json?` +
        `types=place,district,locality&country=${country}&autocomplete=true&limit=6&` +
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
