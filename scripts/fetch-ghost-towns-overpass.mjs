#!/usr/bin/env node
// Fetch US ghost town locations from the Overpass API (OpenStreetMap) and
// upload to Firestore "ghostTowns" collection.
//
// Key design decisions:
//   • Uses OSM ID as Firestore docId → safe to re-run, never overwrites existing docs
//   • Queries three bounding boxes: continental US, Alaska, Hawaii
//   • out center tags; returns centroid coords for ways and relations
//   • All imported towns start as active: false — admin reviews before map display
//
// Usage:
//   node scripts/fetch-ghost-towns-overpass.mjs              → dry-run (prints summary)
//   node scripts/fetch-ghost-towns-overpass.mjs --upload     → write to Firestore
//
// Before --upload, temporarily open Firestore write rules for ghostTowns,
// then restore after the run.

const DRY_RUN = !process.argv.includes('--upload');
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// ── Bounding boxes ────────────────────────────────────────────────────────────
// [south, west, north, east]
const BBOXES = [
  { label: 'Continental US', bbox: '24,-125,49,-66' },
  { label: 'Alaska',         bbox: '51,-180,72,-130' },
  { label: 'Hawaii',         bbox: '18,-161,23,-154' },
];

// ── Coordinate-based state lookup (fallback when OSM tags lack state info) ───
// Rough bounding boxes for each state — good enough for the fallback case
const STATE_BOUNDS = [
  { abbr: 'AK', name: 'Alaska',         s: 54,  n: 72,  w: -180, e: -130 },
  { abbr: 'HI', name: 'Hawaii',         s: 18,  n: 23,  w: -161, e: -154 },
  { abbr: 'WA', name: 'Washington',     s: 45.5,n: 49,  w: -124, e: -116 },
  { abbr: 'OR', name: 'Oregon',         s: 41.9,n: 46.3,w: -124, e: -116 },
  { abbr: 'CA', name: 'California',     s: 32.5,n: 42,  w: -124, e: -114 },
  { abbr: 'ID', name: 'Idaho',          s: 41.9,n: 49,  w: -117, e: -111 },
  { abbr: 'NV', name: 'Nevada',         s: 35,  n: 42,  w: -120, e: -114 },
  { abbr: 'MT', name: 'Montana',        s: 44.3,n: 49,  w: -116, e: -104 },
  { abbr: 'WY', name: 'Wyoming',        s: 40.9,n: 45.1,w: -111, e: -104 },
  { abbr: 'UT', name: 'Utah',           s: 36.9,n: 42,  w: -114, e: -109 },
  { abbr: 'AZ', name: 'Arizona',        s: 31.3,n: 37,  w: -114, e: -109 },
  { abbr: 'CO', name: 'Colorado',       s: 36.9,n: 41.1,w: -109, e: -102 },
  { abbr: 'NM', name: 'New Mexico',     s: 31.3,n: 37,  w: -109, e: -103 },
  { abbr: 'ND', name: 'North Dakota',   s: 45.9,n: 49,  w: -104, e: -96.5 },
  { abbr: 'SD', name: 'South Dakota',   s: 42.4,n: 45.9,w: -104, e: -96.4 },
  { abbr: 'NE', name: 'Nebraska',       s: 39.9,n: 43,  w: -104, e: -95.3 },
  { abbr: 'KS', name: 'Kansas',         s: 36.9,n: 40.1,w: -102, e: -94.6 },
  { abbr: 'OK', name: 'Oklahoma',       s: 33.6,n: 37,  w: -103, e: -94.4 },
  { abbr: 'TX', name: 'Texas',          s: 25.8,n: 36.5,w: -106, e: -93.5 },
  { abbr: 'MN', name: 'Minnesota',      s: 43.5,n: 49.4,w: -97.3,e: -89.5 },
  { abbr: 'IA', name: 'Iowa',           s: 40.4,n: 43.5,w: -96.6,e: -90.1 },
  { abbr: 'MO', name: 'Missouri',       s: 35.9,n: 40.6,w: -95.8,e: -89.1 },
  { abbr: 'AR', name: 'Arkansas',       s: 33,  n: 36.5,w: -94.6,e: -89.6 },
  { abbr: 'LA', name: 'Louisiana',      s: 28.9,n: 33,  w: -94,  e: -88.8 },
  { abbr: 'WI', name: 'Wisconsin',      s: 42.5,n: 47.1,w: -92.9,e: -86.8 },
  { abbr: 'IL', name: 'Illinois',       s: 36.9,n: 42.5,w: -91.5,e: -87.5 },
  { abbr: 'MS', name: 'Mississippi',    s: 30,  n: 35,  w: -91.7,e: -88.1 },
  { abbr: 'MI', name: 'Michigan',       s: 41.7,n: 48.3,w: -90.4,e: -82.4 },
  { abbr: 'IN', name: 'Indiana',        s: 37.8,n: 41.8,w: -88.1,e: -84.8 },
  { abbr: 'KY', name: 'Kentucky',       s: 36.5,n: 39.2,w: -89.6,e: -81.9 },
  { abbr: 'TN', name: 'Tennessee',      s: 34.9,n: 36.7,w: -90.3,e: -81.6 },
  { abbr: 'AL', name: 'Alabama',        s: 30,  n: 35,  w: -88.5,e: -84.9 },
  { abbr: 'GA', name: 'Georgia',        s: 30.4,n: 35,  w: -85.6,e: -80.8 },
  { abbr: 'FL', name: 'Florida',        s: 24.5,n: 31.1,w: -87.6,e: -80 },
  { abbr: 'OH', name: 'Ohio',           s: 38.4,n: 42,  w: -84.8,e: -80.5 },
  { abbr: 'WV', name: 'West Virginia',  s: 37.2,n: 40.6,w: -82.7,e: -77.7 },
  { abbr: 'VA', name: 'Virginia',       s: 36.5,n: 39.5,w: -83.7,e: -75.2 },
  { abbr: 'NC', name: 'North Carolina', s: 33.8,n: 36.6,w: -84.3,e: -75.5 },
  { abbr: 'SC', name: 'South Carolina', s: 32,  n: 35.2,w: -83.4,e: -78.5 },
  { abbr: 'PA', name: 'Pennsylvania',   s: 39.7,n: 42.3,w: -80.5,e: -74.7 },
  { abbr: 'NY', name: 'New York',       s: 40.5,n: 45.1,w: -79.8,e: -71.8 },
  { abbr: 'VT', name: 'Vermont',        s: 42.7,n: 45.1,w: -73.4,e: -71.5 },
  { abbr: 'NH', name: 'New Hampshire',  s: 42.7,n: 45.3,w: -72.6,e: -70.6 },
  { abbr: 'ME', name: 'Maine',          s: 43,  n: 47.5,w: -71.1,e: -67 },
  { abbr: 'MA', name: 'Massachusetts',  s: 41.2,n: 42.9,w: -73.5,e: -69.9 },
  { abbr: 'RI', name: 'Rhode Island',   s: 41.1,n: 42.1,w: -71.9,e: -71.1 },
  { abbr: 'CT', name: 'Connecticut',    s: 40.9,n: 42.1,w: -73.7,e: -71.8 },
  { abbr: 'NJ', name: 'New Jersey',     s: 38.9,n: 41.4,w: -75.6,e: -73.9 },
  { abbr: 'DE', name: 'Delaware',       s: 38.4,n: 39.8,w: -75.8,e: -75 },
  { abbr: 'MD', name: 'Maryland',       s: 37.9,n: 39.7,w: -79.5,e: -75 },
  { abbr: 'DC', name: 'District of Columbia', s: 38.8, n: 39, w: -77.1, e: -76.9 },
];

const STATE_NAME_TO_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA',
  'Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD',
  'Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO',
  'Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ',
  'New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH',
  'Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
  'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT',
  'Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
  'District of Columbia':'DC',
};

// Already-abbreviated (2-letter) state codes from OSM tags
const KNOWN_ABBRS = new Set(Object.values(STATE_NAME_TO_ABBR));

function latLngToStateAbbr(lat, lng) {
  for (const s of STATE_BOUNDS) {
    if (lat >= s.s && lat <= s.n && lng >= s.w && lng <= s.e) return s.abbr;
  }
  return null;
}

function resolveState(tags, lat, lng) {
  // Try explicit state tags first (abandoned:place nodes often use is_in:state)
  const candidates = [
    tags['addr:state'],
    tags['is_in:state_code'],
    tags['is_in:state'],       // full state name, common on abandoned:place
  ].filter(Boolean).map(s => s.trim());

  for (const raw of candidates) {
    const up = raw.toUpperCase();
    if (KNOWN_ABBRS.has(up)) return up;
    const abbr = STATE_NAME_TO_ABBR[raw];
    if (abbr) return abbr;
  }

  // is_in tag is a comma-separated breadcrumb: "Rhyolite, Nye County, Nevada, USA"
  // Walk right-to-left looking for a recognizable state name
  const isIn = (tags['is_in'] || '').trim();
  if (isIn) {
    const parts = isIn.split(',').map(p => p.trim()).reverse();
    for (const part of parts) {
      const up = part.toUpperCase();
      if (KNOWN_ABBRS.has(up)) return up;
      const abbr = STATE_NAME_TO_ABBR[part];
      if (abbr) return abbr;
    }
  }

  // Fallback: bounding-box coordinate lookup
  return latLngToStateAbbr(lat, lng);
}

// ── Overpass query ────────────────────────────────────────────────────────────
// OSM mappers almost never use historic=ghost_town (only 2 nodes worldwide).
// Real ghost-town coverage lives in abandoned:place=* and place=locality with
// disused/ruins markers. We union all meaningful tagging schemes.
const buildQuery = (bbox) => `
[out:json][timeout:180];
(
  node["abandoned:place"~"^(village|town|hamlet|city|settlement)$"]["name"](${bbox});
  way["abandoned:place"~"^(village|town|hamlet|city|settlement)$"]["name"](${bbox});
  relation["abandoned:place"~"^(village|town|hamlet|city|settlement)$"]["name"](${bbox});
  node["disused:place"~"^(village|town|hamlet|city|settlement)$"]["name"](${bbox});
  way["disused:place"~"^(village|town|hamlet|city|settlement)$"]["name"](${bbox});
  node["ghost_town"="yes"]["name"](${bbox});
  way["ghost_town"="yes"]["name"](${bbox});
  node["historic"="ghost_town"]["name"](${bbox});
  way["historic"="ghost_town"]["name"](${bbox});
);
out center tags;
`;

// ── Fetch with retry ──────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchOverpass(query, label, attempt = 1) {
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'LiteraryRoads/1.0 (ghost-town-importer)',
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.log(`  HTTP ${res.status} body: ${body.slice(0, 300)}`);
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        const wait = attempt * 20000;
        console.log(`  Rate limited/timeout (${res.status}). Waiting ${wait / 1000}s...`);
        await sleep(wait);
        return fetchOverpass(query, label, attempt + 1);
      }
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (attempt <= 3) {
      console.log(`  Error (attempt ${attempt}/3): ${err.message}. Retrying in ${5 * attempt}s...`);
      await sleep(5000 * attempt);
      return fetchOverpass(query, label, attempt + 1);
    }
    throw err;
  }
}

// ── Transform OSM element → Firestore document ────────────────────────────────
function transformElement(el) {
  const tags = el.tags || {};

  const name = (tags['name'] || '').trim();
  if (!name) return null; // Skip unnamed ghost towns

  // Coordinates: nodes have lat/lon directly; ways and relations have center
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!lat || !lng) return null;

  const stateAbbr = resolveState(tags, lat, lng);

  const city    = (tags['addr:city'] || tags['is_in:city'] || '').trim() || null;
  const website = (tags['website'] || tags['contact:website'] || tags['url'] || '').trim() || null;

  // Build a short description from available OSM tags
  const descParts = [];
  if (tags['description']) descParts.push(tags['description']);
  if (tags['note'])        descParts.push(tags['note']);
  if (tags['historic:era']) descParts.push(`Era: ${tags['historic:era']}`);
  const description = descParts.join(' ').trim() || null;

  // Deterministic docId — safe to re-run without creating duplicates
  const docId = `osm_${el.type}_${el.id}`;

  return {
    docId,
    name,
    lat,
    lng,
    state: stateAbbr,     // 2-letter abbr, or null if unresolvable
    city,
    description,
    historicalNotes:  '',
    literaryConnections: '',
    nearestServices:  '',
    bestTimeToVisit:  '',
    website,
    readingList:      [],
    status:           'raw',
    source:           'openstreetmap',
    active:           false,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('='.repeat(60));
console.log('  Literary Roads — Ghost Towns Overpass Fetcher');
console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (add --upload to write to Firestore)' : 'LIVE UPLOAD'}`);
console.log('='.repeat(60));

const allDocs = [];
const seenIds = new Set();

for (const { label, bbox } of BBOXES) {
  console.log(`\nQuerying ${label}...`);
  let data;
  try {
    data = await fetchOverpass(buildQuery(bbox), label);
  } catch (err) {
    console.error(`  Failed to fetch ${label}: ${err.message}`);
    continue;
  }

  const elements = data.elements || [];
  console.log(`  Raw elements: ${elements.length}`);

  let transformed = 0, skippedNoName = 0, skippedNoCoords = 0, dupes = 0;

  for (const el of elements) {
    const doc = transformElement(el);
    if (!doc) {
      if (!(el.tags?.name)) skippedNoName++;
      else skippedNoCoords++;
      continue;
    }
    if (seenIds.has(doc.docId)) { dupes++; continue; }
    seenIds.add(doc.docId);
    allDocs.push(doc);
    transformed++;
  }

  console.log(`  Imported: ${transformed}  (no name: ${skippedNoName}, no coords: ${skippedNoCoords}, dupes: ${dupes})`);

  // Be polite to Overpass between bounding boxes
  await sleep(8000);
}

// ── State breakdown ───────────────────────────────────────────────────────────
const byState = {};
for (const doc of allDocs) {
  const k = doc.state || 'UNKNOWN';
  byState[k] = (byState[k] || 0) + 1;
}

console.log('\n' + '='.repeat(60));
console.log('  Summary');
console.log('='.repeat(60));
console.log(`  Total ghost towns collected: ${allDocs.length}`);
console.log('\n  Breakdown by state:');
Object.entries(byState)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([state, count]) => console.log(`    ${state.padEnd(10)} ${count}`));

// ── Dry run ───────────────────────────────────────────────────────────────────
if (DRY_RUN) {
  console.log('\n  Sample (first 20):');
  allDocs.slice(0, 20).forEach(d =>
    console.log(`    • ${d.name} — ${d.city ?? '?'}, ${d.state ?? 'UNKNOWN'} (${d.lat.toFixed(4)}, ${d.lng.toFixed(4)})`)
  );
  console.log('\n  Run with --upload to write to Firestore.');
  console.log('  Remember to temporarily open Firestore write rules for ghostTowns before uploading.');
  process.exit(0);
}

// ── Firestore upload (additive only) — Firebase client SDK ───────────────────
const { initializeApp }    = await import('firebase/app');
const { getFirestore, collection: col, doc: fdoc, getDoc, writeBatch, serverTimestamp } =
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

let added = 0, skipped = 0;
const BATCH_SIZE = 400;

console.log(`\n  Uploading ${allDocs.length} ghost towns to Firestore (additive only)...\n`);

for (let bStart = 0; bStart < allDocs.length; bStart += BATCH_SIZE) {
  const chunk = allDocs.slice(bStart, bStart + BATCH_SIZE);

  // Check existence in parallel — never overwrite docs already in Firestore
  const snapshots = await Promise.all(
    chunk.map(e => getDoc(fdoc(db, 'ghostTowns', e.docId)))
  );

  const batch = writeBatch(db);
  let batchCount = 0;

  for (let i = 0; i < chunk.length; i++) {
    const { docId, ...data } = chunk[i];
    if (snapshots[i].exists()) {
      skipped++;
      continue;
    }
    batch.set(fdoc(db, 'ghostTowns', docId), {
      ...data,
      importedAt: serverTimestamp(),
    });
    batchCount++;
    added++;
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Batch ${Math.floor(bStart / BATCH_SIZE) + 1}: wrote ${batchCount} docs`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`  Done. Added: ${added}  Skipped (already existed): ${skipped}`);
console.log('='.repeat(60));
process.exit(0);
