// Nominatim (OpenStreetMap) geocoding — free, no API key required.
// Policy: max 1 request/second, must identify app via User-Agent.
// Use this for bulk CSV uploads instead of Mapbox to avoid quota costs.

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'LiteraryRoads/1.0 (literary-roads app; contact via github)';

// Simple in-memory cache (session lifetime)
const _cache = new Map();

// Rate-limit: track last request time, enforce 1.1s gap
let _lastRequestAt = 0;
const RATE_LIMIT_MS = 1100;

const _waitForRateLimit = async () => {
  const now = Date.now();
  const wait = _lastRequestAt + RATE_LIMIT_MS - now;
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _lastRequestAt = Date.now();
};

// Geocode a text query → { lat, lng, formatted } or null
// NOTE: Always call sequentially (not in parallel) to respect rate limit.
export const geocodeNominatim = async (query) => {
  if (!query || !query.trim()) return null;
  const key = query.trim().toLowerCase();
  if (_cache.has(key)) return _cache.get(key);

  await _waitForRateLimit();

  try {
    const url = `${NOMINATIM_BASE}?` + new URLSearchParams({
      q: query.trim(),
      format: 'json',
      limit: 1,
      countrycodes: 'us',
      addressdetails: 0,
    });
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.length) { _cache.set(key, null); return null; }
    const result = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      formatted: data[0].display_name || query,
    };
    _cache.set(key, result);
    return result;
  } catch (err) {
    console.error('[Nominatim] geocode error:', err);
    return null;
  }
};
