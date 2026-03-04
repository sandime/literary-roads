// Wikipedia API integration for literary landmarks

const LITERARY_KEYWORDS = [
  'hemingway', 'twain', 'poe', 'fitzgerald', 'faulkner',
  'dickinson', 'whitman', 'thoreau', 'emerson', 'alcott',
  'steinbeck', 'kerouac', 'salinger', 'morrison', 'angelou',
  'hawthorne', 'melville', 'london', "o'connor", 'williams',
  'literary', 'literature', 'author', 'writer', 'poet',
];

// Wrap a promise with a hard timeout
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

// Search for literary landmarks near a single point
export const searchLiteraryLandmarks = async (lat, lng, radiusMiles = 5) => {
  const radiusMeters = Math.round(Math.min(radiusMiles * 1609.34, 10000));
  try {
    const response = await withTimeout(
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=geosearch` +
        `&gscoord=${lat}|${lng}&gsradius=${radiusMeters}&gslimit=50` +
        `&format=json&origin=*`
      ),
      4000
    );
    const data = await response.json();
    if (!data.query?.geosearch) return [];

    // Filter by title keyword first — no extra fetches needed for non-matches
    const matches = data.query.geosearch.filter(({ title }) =>
      LITERARY_KEYWORDS.some((kw) => title.toLowerCase().includes(kw))
    ).slice(0, 5); // cap detail fetches to 5 per point

    const results = await Promise.all(
      matches.map(async (place) => {
        try {
          const det = await withTimeout(
            fetch(
              `https://en.wikipedia.org/w/api.php?action=query&pageids=${place.pageid}` +
              `&prop=extracts&exintro=1&explaintext=1&exsentences=2&format=json&origin=*`
            ),
            3000
          );
          const detData = await det.json();
          const extract = detData.query?.pages?.[place.pageid]?.extract || place.title;
          return {
            id: `wiki_${place.pageid}`,
            name: place.title,
            type: 'landmark',
            lat: place.lat,
            lng: place.lon,
            address: place.title,
            description: extract.substring(0, 150) + (extract.length > 150 ? '...' : ''),
            source: 'wikipedia',
            url: `https://en.wikipedia.org/?curid=${place.pageid}`,
          };
        } catch {
          return null;
        }
      })
    );

    return results.filter(Boolean);
  } catch {
    return [];
  }
};

// Search along a route — samples at most 6 evenly-spaced points, 10s total timeout
export const searchLiteraryAlongRoute = async (routePoints, radiusMiles = 5) => {
  if (!routePoints.length) return [];

  // Pick at most 6 evenly-spaced points regardless of route length
  const MAX_POINTS = 6;
  const step = Math.max(1, Math.floor(routePoints.length / MAX_POINTS));
  const samplePoints = routePoints.filter((_, i) => i % step === 0).slice(0, MAX_POINTS);

  const seenIds = new Set();
  const allLandmarks = [];

  try {
    await withTimeout(
      (async () => {
        for (const point of samplePoints) {
          const landmarks = await searchLiteraryLandmarks(point[0], point[1], radiusMiles);
          for (const lm of landmarks) {
            if (!seenIds.has(lm.id)) {
              seenIds.add(lm.id);
              allLandmarks.push(lm);
            }
          }
        }
      })(),
      10000 // 10s hard cap for the entire along-route search
    );
  } catch {
    // timeout or error — return whatever we have so far
  }

  return allLandmarks;
};
