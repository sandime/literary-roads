// Wikipedia API integration for literary landmarks

// Specific literary author names (used for stricter checks like graves)
const LITERARY_AUTHOR_NAMES = [
  'hemingway', 'twain', 'poe', 'fitzgerald', 'faulkner',
  'dickinson', 'whitman', 'thoreau', 'emerson', 'alcott',
  'steinbeck', 'kerouac', 'salinger', 'morrison', 'angelou',
  'hawthorne', 'melville', "o'connor", 'williams', 'london',
  'frost', 'sandburg', 'cather', 'updike', 'cheever', 'carver',
  'vonnegut', 'capote', 'plath', 'sexton', 'ginsberg', 'hughes',
  'baldwin', 'ellison', 'hurston', 'toomer', 'dunbar', 'chesnutt',
  'wharton', 'james', 'adams', 'crane', 'norris', 'dreiser',
  'sinclair', 'dos passos', 'cummings', 'pound', 'eliot',
  'longfellow', 'whittier', 'lowell', 'holmes', 'irving',
  'cooper', 'stowe', 'chopin', 'jewett', 'freeman', 'garland',
];

const LITERARY_KEYWORDS = [
  ...LITERARY_AUTHOR_NAMES,
  'literary', 'literature', 'author', 'writer', 'poet',
  'birthplace', 'boyhood home', 'childhood home', 'home of',
  'house museum', 'writing', 'published',
];

// Titles containing these are always excluded regardless of keyword match
const TITLE_HARD_EXCLUDES = [
  'transit authority', 'transit station', 'transit center',
  'bus station', 'bus terminal', 'bus stop', 'bus depot',
  'train station', 'railway station', 'railroad station',
  'metro station', 'subway station', 'light rail',
  'airport', 'seaport', 'harbor',
  'courthouse', 'county court', 'city hall', 'town hall',
  'post office', 'fire station', 'police station', 'precinct',
  'military', 'fort ', ' fort', 'battle of', 'war memorial',
  'veterans memorial', 'soldiers memorial',
  'hospital', 'medical center', 'clinic',
  'shopping mall', 'shopping center', 'plaza',
  'power plant', 'water tower', 'sewage',
  'school district', 'board of education',
];

// Titles with these patterns are ONLY allowed if a known author name also appears in the title.
// e.g. "Mark Twain Elementary School" passes; "Jamestown High School" does not.
// Exception: if the title contains "library" it always passes.
const CONDITIONAL_EXCLUDES = [
  // Education
  'high school', 'middle school', 'elementary school', 'junior high',
  'primary school', 'grammar school', 'secondary school',
  'business college', 'community college', 'technical college',
  'vocational school', 'trade school',
  'academy', 'university', 'college',
  // Transit
  ' station', ' depot',
  // Religious buildings
  'church', 'cathedral', 'chapel', 'basilica',
  'synagogue', 'temple', 'mosque', 'parish',
  'monastery', 'abbey', 'convent', 'priory',
  'saint ', 'st. ', 'holy ',
  // Generic geographic/civic
  ' neighborhood', ' district', ' quarter',
  ' suburb', ' ward', ' borough',
  ' county', ' township',
  'city of ', 'town of ', 'village of ',
];

// Title patterns that indicate a grave/burial — only pass if a known author name is also present
const GRAVE_PATTERNS = ['grave of', 'tomb of', 'burial of', 'cemetery', 'graveyard', 'mausoleum'];

// Literary ACTIVITY terms — at least one of these must appear in the extract.
// Author names alone are NOT sufficient (a church named "St. James" contains "james"
// but has zero literary significance).
const EXTRACT_ACTIVITY_TERMS = [
  'author', 'writer', 'poet', 'novelist', 'playwright', 'literary',
  'literature', 'novel', 'book', 'poem', 'poetry', 'fiction',
  'nonfiction', 'non-fiction', 'memoir', 'biography', 'autobiography',
  'wrote', 'published', 'writing', 'storyteller', 'prose', 'verse',
  'short story', 'short stories', 'essay', 'journalism', 'journalist',
];

// Test whether `text` contains `word` as a whole word (not as part of a longer word).
// e.g. hasWord("jamestown west", "james") → false
//      hasWord("mark twain house", "twain") → true
const hasWord = (text, word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);

const titleHasAuthorName = (lower) => LITERARY_AUTHOR_NAMES.some(name => hasWord(lower, name));

// Explicit literary phrases in a title always pass, even if a conditional pattern also matches.
// e.g. "Louisville Literary District" contains ' district' (conditional) but also 'literary' → pass.
const TITLE_EXPLICIT_LITERARY = [
  'literary', 'literature', 'birthplace', 'boyhood home', 'childhood home',
  'home of', 'house museum', 'reading room', 'writers', 'poets',
];

const isLiteraryTitle = (title) => {
  const lower = title.toLowerCase();

  // Always pass libraries — they are inherently literary
  if (lower.includes('library')) return true;

  // Explicit literary phrase → pass before any conditional logic
  if (TITLE_EXPLICIT_LITERARY.some(kw => lower.includes(kw))) return true;

  // Hard exclude non-literary civic/transit locations
  if (TITLE_HARD_EXCLUDES.some(ex => lower.includes(ex))) return false;

  // Add missing hard excludes not covered above
  if (lower.includes('armory') || lower.includes('armoury')) return false;

  // Conditional excludes: schools, churches, neighborhoods, etc.
  // Only pass if the title also contains a known author's name as a whole word.
  const isConditional = CONDITIONAL_EXCLUDES.some(p => lower.includes(p));
  if (isConditional) {
    return titleHasAuthorName(lower);
  }

  // Grave/burial entries require a specific author name
  const isGrave = GRAVE_PATTERNS.some(p => lower.includes(p));
  if (isGrave) {
    return titleHasAuthorName(lower);
  }

  // Standard check: whole-word author names or remaining literary keyword phrases
  if (titleHasAuthorName(lower)) return true;
  const PHRASE_KEYWORDS = ['author', 'writer', 'poet', 'writing', 'published', 'house museum'];
  return PHRASE_KEYWORDS.some(kw => lower.includes(kw));
};

// Secondary check on the fetched article extract.
// Requires at least one literary ACTIVITY term — an author name alone is not enough,
// because many non-literary places are incidentally named after or contain author names.
const isLiteraryExtract = (extract) => {
  const lower = extract.toLowerCase();
  return EXTRACT_ACTIVITY_TERMS.some(kw => lower.includes(kw));
};

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

    // Filter by title first — no extra fetches needed for non-matches
    const matches = data.query.geosearch
      .filter(({ title }) => isLiteraryTitle(title))
      .slice(0, 5); // cap detail fetches to 5 per point

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
          const extract = detData.query?.pages?.[place.pageid]?.extract || '';
          // Reject if the article content has no literary substance
          if (!isLiteraryExtract(extract)) return null;
          const description = extract.substring(0, 150) + (extract.length > 150 ? '...' : '');
          return {
            id: `wiki_${place.pageid}`,
            name: place.title,
            type: 'landmark',
            lat: place.lat,
            lng: place.lon,
            address: place.title,
            description,
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
