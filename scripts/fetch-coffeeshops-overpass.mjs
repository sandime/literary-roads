#!/usr/bin/env node
// Fetch independent coffee shops from Overpass API (OpenStreetMap) and
// upload NEW entries to Firestore "coffeeShops" collection.
//
// Key design decisions:
//   • Uses OSM ID as Firestore docId → safe to re-run, never overwrites
//   • Checks Firestore before writing → additive only, never deletes
//   • Filters chains via brand:wikidata tag AND name blacklist
//   • Queries state-by-state to avoid Overpass timeouts
//
// Usage:
//   node scripts/fetch-coffeeshops-overpass.mjs              → dry-run (no Firestore)
//   node scripts/fetch-coffeeshops-overpass.mjs --upload     → write to Firestore
//   node scripts/fetch-coffeeshops-overpass.mjs --states TX,CA,NY --upload
//   node scripts/fetch-coffeeshops-overpass.mjs --resume TX  → skip states before TX

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN   = !process.argv.includes('--upload');

// ── CLI args ─────────────────────────────────────────────────────────────────
const statesArg  = process.argv.find((_, i) => process.argv[i - 1] === '--states');
const resumeArg  = process.argv.find((_, i) => process.argv[i - 1] === '--resume');
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// ── All US states + DC ────────────────────────────────────────────────────────
const ALL_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming','District of Columbia',
];

const ABBR_TO_STATE = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
  DC:'District of Columbia',
};

const STATES_TO_RUN = statesArg
  ? statesArg.split(',').map(s => {
      const trimmed = s.trim();
      return ABBR_TO_STATE[trimmed.toUpperCase()] || trimmed;
    })
  : ALL_STATES;

const startIndex = resumeArg
  ? STATES_TO_RUN.findIndex(s => s.toLowerCase() === resumeArg.toLowerCase())
  : 0;

// ── Chain filtering ───────────────────────────────────────────────────────────
// Primary: if OSM has tagged brand:wikidata, it's a recognized chain → skip
// Secondary: name-based blacklist for common chains OSM may have missed

const CHAIN_NAMES = [
  // Coffee giants
  'starbucks', 'dunkin', "dunkin'", 'peets', "peet's", 'caribou',
  'coffee bean', 'the coffee bean', 'tim hortons', "tim horton's",
  'biggby', 'dutch bros', 'dutch brother', 'scooters coffee', "scooter's",
  'dunn brothers', 'black rock coffee', 'black bear diner',
  // Acquired-by-corporate specialty chains
  'stumptown', 'philz coffee', 'philz', 'blue bottle',
  'intelligentsia',  // owned by JAB Holdings
  'joe coffee',      // the payment app chain
  'first watch', 'brueggers', "bruegger's", 'einsteins', "einstein's",
  'einstein bros', 'noah\'s bagels', "corner bakery", 'la madeleine',
  'au bon pain', 'panera', 'cosi coffee',
  // Fast food with coffee
  'mcdonalds', "mcdonald's", 'burger king', 'wendys', "wendy's",
  'taco bell', 'chick-fil-a', 'chick fil a', 'sonic drive',
  'jack in the box', 'hardees', "hardee's", 'carl\'s jr',
  // Convenience / gas
  'wawa', 'sheetz', '7-eleven', '7 eleven', 'speedway', 'casey\'s',
  'circle k', 'pilot flying', "love's travel", 'kwik trip', 'kwiktrip',
  'holiday stationstores', 'racetrac', 'marathon',
  // Retail chains with cafes
  'walmart', 'target', 'costco', 'sam\'s club',
  'whole foods', 'wegmans', 'kroger', 'safeway',
  // Donut / bakery chains
  'krispy kreme', 'shipley do-nuts', "shipley's", 'lamar\'s donuts',
  'duck donuts', 'winchells', "winchell's",
  // Other recognizable chains
  'ihop', 'dennys', "denny's", 'waffle house', 'cracker barrel',
  'perkins', 'huddle house', 'bob evans', 'village inn',
  'le pain quotidien', 'saxbys',
];

const isChainByName = (name) => {
  const lower = name.toLowerCase();
  return CHAIN_NAMES.some(c => lower.includes(c));
};

// Also exclude clearly non-cafe amenities that sneak in
const NAME_EXCLUDE = [
  'hospital', 'clinic', 'school', 'university', 'college', 'church',
  'hotel', 'motel', 'inn ', ' inn', 'airport',
];

const isExcludedVenue = (name) => {
  const lower = name.toLowerCase();
  return NAME_EXCLUDE.some(t => lower.includes(t));
};

// ── Overpass query builder ────────────────────────────────────────────────────
const buildQuery = (stateName) => `
[out:json][timeout:60];
area["name"="${stateName}"]["boundary"="administrative"]["admin_level"="4"]->.state;
(
  node["amenity"="cafe"]["name"](area.state);
  way["amenity"="cafe"]["name"](area.state);
  node["amenity"="coffee_shop"]["name"](area.state);
);
out center tags;
`;

// ── Fetch with retry ──────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const fetchOverpass = async (query, stateName, attempt = 1) => {
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) {
      if (res.status === 429 || res.status === 503) {
        const wait = attempt * 15000;
        console.log(`    ⚠ Rate limited (${res.status}). Waiting ${wait / 1000}s...`);
        await sleep(wait);
        return fetchOverpass(query, stateName, attempt + 1);
      }
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (attempt <= 3) {
      console.log(`    ⚠ Error (attempt ${attempt}/3): ${err.message}. Retrying...`);
      await sleep(5000 * attempt);
      return fetchOverpass(query, stateName, attempt + 1);
    }
    throw err;
  }
};

// ── Transform OSM element → Firestore document ────────────────────────────────
const transformElement = (el) => {
  const p = el.tags || {};
  const name = (p['name'] || '').trim();
  if (!name) return null;

  // Skip if OSM has tagged this as a recognized chain brand
  if (p['brand:wikidata'] || p['brand']) {
    const brand = (p['brand'] || '').toLowerCase();
    if (brand && CHAIN_NAMES.some(c => brand.includes(c))) return null;
    if (p['brand:wikidata']) return null; // any brand:wikidata = chain
  }

  if (isChainByName(name)) return null;
  if (isExcludedVenue(name)) return null;

  // Get coordinates (nodes have lat/lon; ways have center)
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!lat || !lng) return null;

  const houseNum = (p['addr:housenumber'] || '').trim();
  const street   = (p['addr:street']      || '').trim();
  const address  = [houseNum, street].filter(Boolean).join(' ') || null;
  const city     = (p['addr:city']     || '').trim() || null;
  const state    = (p['addr:state']    || '').trim() || null;
  const zipcode  = (p['addr:postcode'] || '').trim() || null;

  // Require at minimum a city and state — shops without location data aren't useful
  if (!city || !state) return null;
  const phone    = (p['phone'] || p['contact:phone'] || p['addr:phone'] || '').trim() || null;
  const website  = (p['website'] || p['contact:website'] || p['url'] || '').trim() || null;

  // Deterministic docId — safe to re-run without creating duplicates
  const osmId = `${el.type}/${el.id}`;
  const docId = `osm_${el.type}_${el.id}`;

  return {
    docId,
    osmId,
    name,
    address,
    city,
    state,
    zipcode,
    lat,
    lng,
    phone,
    website,
    type:   'cafe',
    source: 'openstreetmap',
  };
};

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('='.repeat(60));
console.log('  Literary Roads — Coffee Shop Overpass Fetcher');
console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (add --upload to write to Firestore)' : 'LIVE UPLOAD'}`);
console.log(`  States: ${statesArg ? STATES_TO_RUN.join(', ') : 'All 50 + DC'}`);
if (resumeArg) console.log(`  Resuming from: ${STATES_TO_RUN[startIndex]}`);
console.log('='.repeat(60));

const statesToProcess = STATES_TO_RUN.slice(startIndex);
const allDocs = [];
const stateStats = {};

for (let i = 0; i < statesToProcess.length; i++) {
  const stateName = statesToProcess[i];
  console.log(`\n[${i + 1}/${statesToProcess.length}] ${stateName}...`);

  let data;
  try {
    data = await fetchOverpass(buildQuery(stateName), stateName);
  } catch (err) {
    console.error(`  ✗ Failed to fetch ${stateName}: ${err.message}`);
    stateStats[stateName] = { raw: 0, added: 0, filtered: 0 };
    continue;
  }

  const elements = data.elements || [];
  console.log(`  Raw elements: ${elements.length}`);

  const docs = elements.map(transformElement).filter(Boolean);
  const filtered = elements.length - docs.length;

  // Dedup within this state's results (OSM can return dupes near boundaries)
  const seenIds = new Set();
  const unique = docs.filter(d => {
    if (seenIds.has(d.docId)) return false;
    seenIds.add(d.docId);
    return true;
  });

  console.log(`  Independent shops: ${unique.length}  (filtered ${filtered} chains/invalid)`);
  stateStats[stateName] = { raw: elements.length, added: unique.length, filtered };
  allDocs.push(...unique);

  // Respect Overpass rate limits — wait 3s between states
  if (i < statesToProcess.length - 1) await sleep(3000);
}

// ── Global dedup across all states ────────────────────────────────────────────
const seenGlobal = new Set();
const uniqueAll = allDocs.filter(d => {
  if (seenGlobal.has(d.docId)) return false;
  seenGlobal.add(d.docId);
  return true;
});

console.log('\n' + '='.repeat(60));
console.log('  Summary');
console.log('='.repeat(60));
console.log(`  Total fetched (all states): ${allDocs.length}`);
console.log(`  After cross-state dedup:    ${uniqueAll.length}`);

// ── Dry run ────────────────────────────────────────────────────────────────────
if (DRY_RUN) {
  console.log('\n  Sample (first 20):');
  uniqueAll.slice(0, 20).forEach(d =>
    console.log(`    • ${d.name} — ${d.city ?? '?'}, ${d.state ?? '?'} (${d.website || 'no website'})`)
  );

  // Save GeoJSON for inspection
  const geojson = {
    type: 'FeatureCollection',
    features: uniqueAll.map(d => ({
      type: 'Feature',
      id: d.osmId,
      properties: { name: d.name, address: d.address, city: d.city, state: d.state, phone: d.phone, website: d.website },
      geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
    })),
  };
  const outPath = join(__dirname, '..', 'coffee-shops-overpass-new.geojson');
  writeFileSync(outPath, JSON.stringify(geojson, null, 2));
  console.log(`\n  Preview saved to: coffee-shops-overpass-new.geojson`);
  console.log('  Run with --upload to write to Firestore.');
  process.exit(0);
}

// ── Firestore upload (additive only) ─────────────────────────────────────────
const keyArg   = process.argv.find((a, i) => process.argv[i - 1] === '--key');
const keyPaths = [
  keyArg,
  join(__dirname, '..', 'service-account.json'),
  join(__dirname, '..', 'serviceAccount.json'),
  join(__dirname, 'service-account.json'),
].filter(Boolean);

const keyFile = keyPaths.find(p => existsSync(p));
if (!keyFile) {
  console.error(`
  ✗ No service account key found.
  Save it as: ${join(__dirname, '..', 'service-account.json')}
  Then re-run: node scripts/fetch-coffeeshops-overpass.mjs --upload
`);
  process.exit(1);
}

const admin = (await import('firebase-admin')).default;
const serviceAccount = JSON.parse(readFileSync(keyFile, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db     = admin.firestore();
const colRef = db.collection('coffeeShops');

let added = 0, skipped = 0, failed = 0;
const BATCH_SIZE = 400;

console.log(`\n  Uploading ${uniqueAll.length} shops to Firestore (additive only)...\n`);

for (let bStart = 0; bStart < uniqueAll.length; bStart += BATCH_SIZE) {
  const chunk = uniqueAll.slice(bStart, bStart + BATCH_SIZE);

  // Check existence in parallel — don't overwrite anything already in Firestore
  const snapshots = await Promise.all(chunk.map(e => colRef.doc(e.docId).get()));

  const batch = db.batch();
  let batchCount = 0;

  for (let i = 0; i < chunk.length; i++) {
    const { docId, ...data } = chunk[i];
    if (snapshots[i].exists) {
      skipped++;
      continue;
    }
    batch.set(colRef.doc(docId), {
      ...data,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    added++;
    batchCount++;
  }

  if (batchCount > 0) {
    try {
      await batch.commit();
      console.log(`  ✓ Batch ${Math.ceil((bStart + 1) / BATCH_SIZE)}: committed ${batchCount} shops`);
    } catch (err) {
      console.error(`  ✗ Batch failed: ${err.message}`);
      failed += batchCount;
      added  -= batchCount;
    }
  }

  const pct = Math.round(((bStart + chunk.length) / uniqueAll.length) * 100);
  process.stdout.write(`\r  Progress: ${pct}%  (added: ${added}, skipped: ${skipped}, failed: ${failed})`);
}

console.log('\n\n' + '='.repeat(60));
console.log('  Final Summary');
console.log('='.repeat(60));
console.log(`  Fetched from Overpass: ${uniqueAll.length}`);
console.log(`  Already in Firestore:  ${skipped}  (untouched)`);
console.log(`  Newly added:           ${added}`);
console.log(`  Failed:                ${failed}`);
console.log('='.repeat(60));

process.exit(0);
