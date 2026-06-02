#!/usr/bin/env node
// Fills missing `website` fields on observatory Firestore docs using four free sources:
//
//   Pass 1 — Overpass API    : re-fetches OSM tags for the original node/way IDs.
//   Pass 2 — Wikidata SPARQL : bulk coordinate match against Wikidata P856 entries.
//   Pass 3 — Wikipedia API   : searches Wikipedia by name, extracts the official
//                              website from the article's external links.
//   Pass 4 — DuckDuckGo HTML : scrapes DDG search results for the observatory name —
//                              the same thing you'd do manually in a browser.
//
// Usage:
//   node scripts/fill-observatory-websites.mjs              → dry run (no writes)
//   node scripts/fill-observatory-websites.mjs --upload     → write to Firestore
//   node scripts/fill-observatory-websites.mjs --passes 34  → only run passes 3 & 4
//
// Firestore write rules must be open when using --upload.

const DRY_RUN    = !process.argv.includes('--upload');
const PASSES     = (() => {
  const i = process.argv.indexOf('--passes');
  return i !== -1 ? new Set([...process.argv[i + 1]].map(Number)) : new Set([1, 2, 3, 4]);
})();

const BATCH_SIZE  = 50;    // IDs per Overpass request
const DELAY_OSM   = 1500;  // ms between Overpass batches
const DELAY_WP    = 400;   // ms between Wikipedia calls
const DELAY_DDG   = 1800;  // ms between DuckDuckGo requests (be polite)
const MATCH_KM    = 0.08;  // max distance for Wikidata coord match (~80 m)

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const WIKIDATA_URL = 'https://query.wikidata.org/sparql';
const WP_API       = 'https://en.wikipedia.org/w/api.php';
const DDG_URL      = 'https://html.duckduckgo.com/html/';
const UA           = 'LiteraryRoads/1.0 (observatory-website-filler; contact=awstories@gmail.com)';

// Domains we never want to store as an observatory's "website"
const SKIP_HOSTS = [
  'wikipedia.org', 'wikimedia.org', 'wikidata.org', 'mediawiki.org',
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
  'youtube.com', 'youtu.be', 'linkedin.com', 'flickr.com',
  'archive.org', 'web.archive.org',
  'google.com', 'maps.google.com', 'goo.gl',
  'yelp.com', 'tripadvisor.com', 'foursquare.com',
  'amazon.com', 'ebay.com', 'apple.com',
  // Academic journals and citation sources
  'doi.org', 'agu.org', 'aps.org', 'arxiv.org', 'jstor.org',
  'nature.com', 'science.org', 'springer.com', 'wiley.com',
  'scitech.ac.uk', 'edocket.access.gpo.gov',
  // Photo / image hosting
  'eso.org', 'jpl.nasa.gov', 'apod.nasa.gov',
  // News sites (not official observatory sites)
  'themonitor.com', 'stamfordadvocate.com', 'foxcities.org',
  'environment.ehp.qld.gov.au',
  // Map / coordinate links (geohack etc.)
  'toolforge.org',
  // Historical register pages (not the observatory's own site)
  'nps.gov', 'nrhp.mnhs.org', 'nationalregisterofhistoricplaces.com',
  // State historic register sites
  'in.gov', 'mnopedia.org',
  // Sky-condition prediction sites (not observatory sites)
  'cleardarksky.com',
  // Paper / citation databases
  'adsabs.harvard.edu', 'ui.adsabs.harvard.edu',
  // Authority / identifier registries and archives
  'isni.org', 'viaf.org', 'id.loc.gov', 'loc.gov',
  // Waymarking / geocaching
  'waymarking.com', 'geocaching.com',
  // Local news sites
  'pe.com',
];

// URL patterns that indicate a citation/reference, not an official site
function isCitationUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    // Image files
    if (/\.(jpg|jpeg|png|gif|svg|pdf|mp4|webm)(\?|$)/.test(path)) return true;
    // Very deep paths (≥5 segments) are usually article references
    if (path.split('/').filter(Boolean).length >= 5) return true;
    // Looks like a DOI or journal article path
    if (/\/doi\/|\/article\/|\/abstract\/|\/pubs\/crossref\/|\/spaceimages\//.test(path)) return true;
    return false;
  } catch { return true; }
}

// ── Firebase ─────────────────────────────────────────────────────────────────
const { initializeApp } = await import('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc } =
  await import('firebase/firestore');

const firebaseConfig = {
  apiKey:            'AIzaSyBlKiGzXCTIgjqjzDROB_dywrjJntizkYE',
  authDomain:        'the-literary-roads.firebaseapp.com',
  projectId:         'the-literary-roads',
  storageBucket:     'the-literary-roads.firebasestorage.app',
  messagingSenderId: '305145573086',
  appId:             '1:305145573086:web:206ec464384fe149c45c4f',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Shared helpers ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function isSkipped(url) {
  const h = hostname(url);
  if (SKIP_HOSTS.some(s => h === s || h.endsWith('.' + s))) return true;
  if (isCitationUrl(url)) return true;
  return false;
}

function pickOsmWebsite(tags = {}) {
  return tags.website || tags['contact:website'] || tags['contact:url'] || tags.url || null;
}

function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── 1. Load null-website docs ─────────────────────────────────────────────────
console.log('Fetching null-website observatory docs from Firestore…');
const snap = await getDocs(query(collection(db, 'observatories'), where('website', '==', null)));
console.log(`  Found ${snap.size} docs to process.\n`);

const allDocs = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
const nodes   = allDocs.filter(d => d.docId.startsWith('node_')).map(d => ({ ...d, osmId: d.docId.split('_')[1] }));
const ways    = allDocs.filter(d => d.docId.startsWith('way_')).map(d => ({ ...d, osmId: d.docId.split('_')[1] }));

const found = {}; // docId → { url, source }
const notYet = () => allDocs.filter(d => !found[d.docId]);

// ── Pass 1: Overpass ──────────────────────────────────────────────────────────
if (PASSES.has(1)) {
  async function overpassBatch(items, elementType) {
    const ql  = `[out:json][timeout:30]; ${elementType}(id:${items.map(i => i.osmId).join(',')}); out tags;`;
    const url  = `${OVERPASS_URL}?data=${encodeURIComponent(ql)}`;
    let json;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      json = await res.json();
    } catch (err) { console.error(`  Overpass error: ${err.message}`); return; }

    const tagMap = {};
    for (const el of json.elements || []) tagMap[String(el.id)] = el.tags || {};
    for (const item of items) {
      const url = pickOsmWebsite(tagMap[item.osmId]);
      if (url) { found[item.docId] = { url, source: 'overpass' }; console.log(`  ✓ [OSM] ${item.name} → ${url}`); }
    }
  }

  for (const [list, label] of [[nodes, 'nodes'], [ways, 'ways']]) {
    if (!list.length) continue;
    console.log(`── Pass 1: Overpass — ${list.length} ${label} ──`);
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      process.stdout.write(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(list.length / BATCH_SIZE)}… `);
      await overpassBatch(list.slice(i, i + BATCH_SIZE), label === 'nodes' ? 'node' : 'way');
      if (i + BATCH_SIZE < list.length) await sleep(DELAY_OSM);
    }
    console.log();
  }
}

// ── Pass 2: Wikidata coordinate match ─────────────────────────────────────────
if (PASSES.has(2)) {
  const candidates = notYet().filter(d => typeof d.lat === 'number');
  console.log(`── Pass 2: Wikidata SPARQL — ${candidates.length} unresolved docs ──`);

  const SPARQL = `SELECT DISTINCT ?item ?label ?website ?coord WHERE {
  VALUES ?type { wd:Q62832 wd:Q1349559 wd:Q28454 wd:Q1477436 }
  ?item wdt:P31 ?type . ?item wdt:P856 ?website . ?item wdt:P625 ?coord .
  ?item rdfs:label ?label . FILTER(LANG(?label) = "en")
}`;

  let wikiRows = [];
  try {
    console.log('  Querying Wikidata…');
    const res = await fetch(`${WIKIDATA_URL}?query=${encodeURIComponent(SPARQL)}&format=json`,
      { headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const parseCoord = s => { const m = s?.match(/Point\(([^ ]+) ([^ )]+)\)/); return m ? { lat: +m[2], lng: +m[1] } : null; };
    const inUS = ({ lat, lng }) =>
      (lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66) ||
      (lat >= 51 && lat <= 72 && lng >= -180 && lng <= -130) ||
      (lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154);
    for (const row of json.results.bindings) {
      const c = parseCoord(row.coord?.value);
      if (c && inUS(c)) wikiRows.push({ ...row, parsedLat: c.lat, parsedLng: c.lng });
    }
    console.log(`  Got ${wikiRows.length} US Wikidata entries.\n`);
  } catch (err) { console.error(`  Wikidata failed: ${err.message}\n`); }

  for (const d of candidates) {
    let best = null, bestDist = Infinity;
    for (const row of wikiRows) {
      const km = distKm(d.lat, d.lng, row.parsedLat, row.parsedLng);
      if (km < bestDist) { bestDist = km; best = row; }
    }
    if (best && bestDist <= MATCH_KM) {
      found[d.docId] = { url: best.website.value, source: `wikidata (${bestDist.toFixed(2)} km)` };
      console.log(`  ✓ [Wikidata] ${d.name} → ${best.website.value}`);
    }
  }
  console.log();
}

// ── Pass 3: Wikipedia search + extlinks ───────────────────────────────────────
if (PASSES.has(3)) {
  const candidates = notYet();
  console.log(`── Pass 3: Wikipedia — searching ${candidates.length} names ──`);

  // Only strip words that are truly non-identifying type/function words
  const GENERIC = new Set(['observatory', 'planetarium', 'telescope', 'astronomical',
                            'astronomy', 'institute', 'center', 'science', 'museum',
                            'the', 'and', 'of', 'for', 'at', 'in', 'the']);
  const sigWords = name => name.toLowerCase().split(/\W+/)
    .filter(w => w.length > 2 && !GENERIC.has(w));

  // Keywords that indicate a Wikipedia article is actually about an observatory/planetarium
  const OBS_TERMS = ['observatory', 'planetarium', 'telescope', 'astronomical', 'astronomy', 'dome'];

  async function wpSearch(name) {
    const words = sigWords(name);
    // Can't reliably match without at least one identifying word
    if (words.length === 0) return null;

    const url = `${WP_API}?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=5&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.query?.search || [];

    return results.find(r => {
      const title = r.title.toLowerCase();
      // Article title must contain an observatory-type term
      if (!OBS_TERMS.some(t => title.includes(t))) return false;
      // All significant name words must appear in the article title
      return words.every(w => title.includes(w));
    }) || null;
  }

  async function wpExtlinks(pageTitle) {
    const url = `${WP_API}?action=query&prop=extlinks&titles=${encodeURIComponent(pageTitle)}&ellimit=50&format=json&elexpandurl=1&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});
    if (!pages.length || pages[0].missing !== undefined) return [];
    return (pages[0].extlinks || []).map(l => l['*'] || l.url).filter(Boolean);
  }

  let wpFound = 0;
  for (let i = 0; i < candidates.length; i++) {
    const d = candidates[i];
    if (i > 0 && i % 10 === 0) process.stdout.write(`  ${i}/${candidates.length}…\n`);
    try {
      const article = await wpSearch(d.name);
      await sleep(DELAY_WP);
      if (!article) continue;

      const links = await wpExtlinks(article.title);
      await sleep(DELAY_WP);

      // Score each link: prefer name-word matches and short clean homepage URLs
      const words = sigWords(d.name);
      const scored = links
        .filter(l => !isSkipped(l))
        .map(l => {
          const h = hostname(l);
          const pathDepth = new URL(l).pathname.split('/').filter(Boolean).length;
          const nameScore = words.filter(w => h.includes(w)).length * 3;
          const depthScore = Math.max(0, 3 - pathDepth); // prefer shallower paths
          const tldScore   = /\.(edu|org|gov)$/.test(h) ? 1 : 0;
          return { url: l, score: nameScore + depthScore + tldScore };
        });
      scored.sort((a, b) => b.score - a.score);

      const pick = scored[0]?.url;
      if (pick) {
        found[d.docId] = { url: pick, source: `wikipedia ("${article.title}")` };
        console.log(`  ✓ [WP] ${d.name}`);
        console.log(`      article: ${article.title}`);
        console.log(`      ${pick}`);
        wpFound++;
      }
    } catch (err) {
      console.error(`  WP error for "${d.name}": ${err.message}`);
    }
  }
  console.log(`  Wikipedia found ${wpFound} websites.\n`);
}

// ── Pass 4: DuckDuckGo HTML scrape ────────────────────────────────────────────
if (PASSES.has(4)) {
  const candidates = notYet();
  console.log(`── Pass 4: DuckDuckGo — searching ${candidates.length} names ──`);

  async function ddgSearch(name) {
    const q   = `"${name}" official site`;
    const url = `${DDG_URL}?q=${encodeURIComponent(q)}&kl=us-en`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':     'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // DDG lite result links: href="//duckduckgo.com/l/?uddg=<encoded-url>&..."
    const urls = [];
    const re   = /uddg=([^&"'\s]+)/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      try {
        const decoded = decodeURIComponent(m[1]);
        if (decoded.startsWith('http') && !isSkipped(decoded)) urls.push(decoded);
      } catch {}
    }
    if (!urls.length) return null;

    // Prefer results whose domain contains words from the observatory name
    const words = name.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const scored = urls.map(u => ({
      url: u,
      score: words.filter(w => hostname(u).includes(w)).length,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].url;
  }

  let ddgFound = 0;
  for (let i = 0; i < candidates.length; i++) {
    const d = candidates[i];
    if (i > 0 && i % 10 === 0) process.stdout.write(`  ${i}/${candidates.length}…\n`);
    try {
      const url = await ddgSearch(d.name);
      if (url) {
        found[d.docId] = { url, source: 'duckduckgo' };
        console.log(`  ✓ [DDG] ${d.name} → ${url}`);
        ddgFound++;
      }
    } catch (err) {
      console.error(`  DDG error for "${d.name}": ${err.message}`);
    }
    await sleep(DELAY_DDG);
  }
  console.log(`  DuckDuckGo found ${ddgFound} websites.\n`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
const foundCount = Object.keys(found).length;
const bySource   = {};
for (const { source } of Object.values(found)) {
  const key = source.startsWith('wikidata') ? 'wikidata'
            : source.startsWith('wikipedia') ? 'wikipedia'
            : source;
  bySource[key] = (bySource[key] || 0) + 1;
}

console.log(`── Results ──`);
console.log(`  Docs checked:     ${snap.size}`);
console.log(`  Websites found:   ${foundCount}`);
for (const [src, n] of Object.entries(bySource)) console.log(`    via ${src}: ${n}`);
console.log(`  Still missing:    ${snap.size - foundCount}`);

if (foundCount === 0) { console.log('\nNo websites found.'); process.exit(0); }

if (DRY_RUN) {
  console.log('\nDRY RUN — pass --upload to write to Firestore.');
  process.exit(0);
}

// ── Write to Firestore ────────────────────────────────────────────────────────
console.log('\nWriting to Firestore…');
let written = 0;
for (const [docId, { url }] of Object.entries(found)) {
  try {
    await updateDoc(doc(db, 'observatories', docId), { website: url });
    written++;
  } catch (err) {
    console.error(`  Failed to update ${docId}: ${err.message}`);
  }
}
console.log(`Done. Updated ${written} docs.`);
process.exit(0);
