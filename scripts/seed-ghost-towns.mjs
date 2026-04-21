#!/usr/bin/env node
// Fetch US ghost towns from Wikidata and import to Firestore "ghostTowns" collection.
//
// Uses the Wikidata SPARQL endpoint — no API key needed.
// Uses the Firebase CLIENT SDK (no service account — org policy blocks key downloads).
// Temporarily open Firestore write rules before --upload, then re-lock after.
//
// Usage:
//   node scripts/seed-ghost-towns.mjs           → dry-run (prints results, no Firestore write)
//   node scripts/seed-ghost-towns.mjs --upload  → write to Firestore
//
// Before --upload, add this rule in Firebase Console → Firestore → Rules:
//   match /ghostTowns/{doc} { allow read, write: if true; }   // TEMPORARY
// After upload, restore locked rules.

const DRY_RUN = !process.argv.includes('--upload');
const WIKIDATA_URL = 'https://query.wikidata.org/sparql';

// ── SPARQL query ──────────────────────────────────────────────────────────────
// Fetches all items that are:
//   - instance of ghost town (Q15661340) or subclass thereof
//   - located in the United States (Q30)
//   - have coordinates
// Returns label, coordinates, state, Wikipedia URL, and description.
// No country filter — many US ghost towns lack P17. We filter to US bounding
// box by coordinates in JavaScript after fetching. Also includes subclasses of
// Q350895 via P279 to catch items tagged as specific ghost town subtypes.
const SPARQL = `
SELECT DISTINCT ?item ?label ?coord ?stateLabel ?wpUrl ?description WHERE {
  { ?item wdt:P31 wd:Q350895 . }
  UNION
  { ?item wdt:P31 ?subclass . ?subclass wdt:P279 wd:Q350895 . }
  ?item wdt:P625 ?coord .
  ?item rdfs:label ?label . FILTER(LANG(?label) = "en")
  OPTIONAL {
    ?item wdt:P131+ ?state .
    ?state wdt:P31 wd:Q35657 .
    ?state rdfs:label ?stateLabel . FILTER(LANG(?stateLabel) = "en")
  }
  OPTIONAL {
    ?wpUrl schema:about ?item .
    ?wpUrl schema:isPartOf <https://en.wikipedia.org/> .
  }
  OPTIONAL {
    ?item schema:description ?description . FILTER(LANG(?description) = "en")
  }
}
ORDER BY ?label
`.trim();

// ── State name → abbreviation ─────────────────────────────────────────────────
const STATE_TO_ABBR = {
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

// Parse "Point(-117.1234 37.5678)" → { lat, lng }
function parseCoord(coordStr) {
  const m = coordStr.match(/Point\(([^ ]+) ([^ )]+)\)/);
  if (!m) return null;
  return { lat: parseFloat(m[2]), lng: parseFloat(m[1]) };
}

// Wikidata entity ID from full URI
function wikidataId(uri) {
  return uri.replace('http://www.wikidata.org/entity/', '');
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
console.log('Querying Wikidata for US ghost towns...');

let results;
try {
  const res = await fetch(
    `${WIKIDATA_URL}?query=${encodeURIComponent(SPARQL)}&format=json`,
    {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'LiteraryRoads/1.0 (ghost-town-importer; contact=awstories@gmail.com)',
      },
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    process.exit(1);
  }
  const json = await res.json();
  results = json.results.bindings;
} catch (err) {
  console.error('Fetch failed:', err.message);
  process.exit(1);
}

console.log(`Raw results from Wikidata: ${results.length}`);

// ── Transform ─────────────────────────────────────────────────────────────────
// Wikidata can return duplicate rows (multiple P131 paths to same state).
// Deduplicate by Wikidata entity ID, keeping the first row per item.
const seen = new Set();
const docs = [];

for (const row of results) {
  const id = wikidataId(row.item.value);
  if (seen.has(id)) continue;
  seen.add(id);

  const coords = parseCoord(row.coord.value);
  if (!coords) continue;

  // Filter to US bounding box (continental + Alaska + Hawaii)
  const { lat, lng } = coords;
  const inUS =
    (lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66) ||  // continental
    (lat >= 51 && lat <= 72 && lng >= -180 && lng <= -130) ||  // Alaska
    (lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154);    // Hawaii
  if (!inUS) continue;

  const stateName = row.stateLabel?.value || '';
  const stateAbbr = STATE_TO_ABBR[stateName] || '';

  const wpUrl = row.wpUrl?.value || '';

  docs.push({
    docId: `wd_${id}`,
    wikidataId: id,
    name:        row.label.value,
    lat:         coords.lat,
    lng:         coords.lng,
    state:       stateAbbr,
    city:        '',
    description: row.description?.value || '',
    website:     wpUrl,
    historicalNotes:     '',
    literaryConnections: '',
    nearestServices:     '',
    bestTimeToVisit:     '',
    readingList:         [],
    status:  'raw',
    source:  'wikidata',
    active:  false,
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────
const byState = {};
for (const d of docs) {
  const k = d.state || 'UNKNOWN';
  byState[k] = (byState[k] || 0) + 1;
}

console.log(`\nImportable: ${docs.length}`);
console.log('\nBreakdown by state:');
Object.entries(byState)
  .sort(([, a], [, b]) => b - a)  // most first
  .forEach(([state, count]) => console.log(`  ${state.padEnd(10)} ${count}`));

if (DRY_RUN) {
  console.log('\nDRY RUN — pass --upload to write to Firestore.');
  console.log('\nSample (first 20):');
  docs.slice(0, 20).forEach(d =>
    console.log(`  • ${d.name} — ${d.city || '?'}, ${d.state || 'UNKNOWN'} (${d.lat.toFixed(4)}, ${d.lng.toFixed(4)})`)
  );
  process.exit(0);
}

// ── Firestore upload (additive — skips existing docs) ─────────────────────────
const { initializeApp } = await import('firebase/app');
const { getFirestore, collection, doc, getDoc, writeBatch, serverTimestamp } =
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

console.log(`\nUploading ${docs.length} ghost towns to Firestore (additive only)...`);

for (let start = 0; start < docs.length; start += BATCH_SIZE) {
  const chunk = docs.slice(start, start + BATCH_SIZE);
  const snaps = await Promise.all(chunk.map(d => getDoc(doc(db, 'ghostTowns', d.docId))));
  const batch = writeBatch(db);
  let count = 0;

  for (let i = 0; i < chunk.length; i++) {
    if (snaps[i].exists()) { skipped++; continue; }
    const { docId, ...data } = chunk[i];
    batch.set(doc(db, 'ghostTowns', docId), { ...data, createdAt: serverTimestamp() });
    count++;
    added++;
  }

  if (count > 0) {
    await batch.commit();
    console.log(`  Batch wrote ${count} docs`);
  }
}

console.log(`\nDone. Added: ${added}  Skipped (already existed): ${skipped}`);
process.exit(0);
