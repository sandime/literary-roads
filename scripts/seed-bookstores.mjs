#!/usr/bin/env node
// Seed Firestore "bookstores" collection from 5 OpenStreetMap GeoJSON exports.
//
// Usage:
//   node scripts/seed-bookstores.mjs                            → dry-run
//   node scripts/seed-bookstores.mjs --upload                   → upload (needs service account)
//   node scripts/seed-bookstores.mjs --upload --key path/to.json → explicit key path
//
// Service account key: Firebase Console → Project Settings → Service Accounts → Generate New Key

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN   = !process.argv.includes('--upload');

// ── GeoJSON source files ────────────────────────────────────────────────────
const GEOJSON_FILES = [
  'books-midwest-export.geojson',
  'books-south-export.geojson',
  'books-southwest-export.geojson',
  'books.northeast.export.geojson',
  'northwest-pr-books-export.geojson',
];

// ── Bookstore filter (mirrors googlePlaces.js logic) ────────────────────────
const HARD_EXCLUDE = [
  'crystal', 'mystical', 'metaphysical', 'psychic', 'tarot',
  'gift shop', 'gifts & more', 'gifts and more', 'souvenir',
  'antique mall', 'antique market', 'antique store', 'antique shop',
  'general store', 'convenience store', 'tobacco', 'vape', 'smoke shop',
  "sam's club", 'costco', 'target', 'walmart', "ollie's", 'ollies',
  'bargain outlet', 'bargain bin', 'discount outlet', 'wholesale',
  'dollar tree', 'dollar general', '5 below', 'five below', 'big lots',
  'grocery', 'supermarket',
];

const KNOWN_CHAINS = [
  'barnes & noble', 'barnes and noble', 'half price books', "powell's",
  'books-a-million', 'books a million', 'second & charles', 'second and charles',
  'hastings', 'tattered cover', 'strand bookstore', 'the strand',
];

const BOOK_KEYWORDS = [
  'book', 'books', 'bookstore', 'bookshop', 'bookery', 'bookseller',
  'booksellers', 'library', 'lit ', 'literary', 'reading', 'page',
  'novel', 'story', 'stories', 'chapter', 'shelf', 'tome',
];

// College / university bookstores — high noise, skip them
const COLLEGE_EXCLUDE = [
  'university bookstore', 'college bookstore', 'campus bookstore',
  'campus store', 'university store', 'college store',
  'follett', 'barnes noble college', 'bn college', 'bncollege',
];

const isRealBookstore = (name) => {
  if (!name) return false;
  const lower = name.toLowerCase();
  if (HARD_EXCLUDE.some(t => lower.includes(t))) return false;
  if (COLLEGE_EXCLUDE.some(t => lower.includes(t))) return false;
  if (KNOWN_CHAINS.some(c => lower.includes(c))) return true;
  if (BOOK_KEYWORDS.some(k => lower.includes(k))) return true;
  return false;
};

// ── Transform a GeoJSON feature → Firestore document ────────────────────────
const transformFeature = (feature) => {
  const p   = feature.properties || {};
  const geo = feature.geometry;

  // Must have a name
  const name = (p['name'] || '').trim();
  if (!name) return null;

  // Must have valid point coordinates
  if (!geo || geo.type !== 'Point' || !Array.isArray(geo.coordinates)) return null;
  const [lng, lat] = geo.coordinates; // GeoJSON is [lng, lat]
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (lat === 0 && lng === 0) return null;

  // Apply bookstore quality filter
  if (!isRealBookstore(name)) return null;

  // Build address string
  const houseNum = (p['addr:housenumber'] || '').trim();
  const street   = (p['addr:street']      || '').trim();
  const address  = [houseNum, street].filter(Boolean).join(' ') || null;

  const city    = (p['addr:city']     || '').trim() || null;
  const state   = (p['addr:state']    || '').trim() || null;
  const zipcode = (p['addr:postcode'] || '').trim() || null;
  const phone   = (p['addr:phone']    || p['phone']   || p['contact:phone']   || '').trim() || null;
  const website = (p['website']       || p['contact:website'] || p['url'] || '').trim() || null;

  // Deterministic doc ID from OSM id — safe to re-run without creating duplicates
  const osmId = (feature.id || p['@id'] || '').replace(/\//g, '_');
  const docId = osmId || `osm_${lat.toFixed(6)}_${lng.toFixed(6)}`;

  return {
    docId,
    name,
    address,
    city,
    state,
    zipcode,
    lat,
    lng,
    phone,
    website,
    type:   'bookstore',
    source: 'openstreetmap',
  };
};

// ── Load and combine all GeoJSON files ──────────────────────────────────────
console.log('='.repeat(60));
console.log('  Literary Roads — Bookstore Seeder');
console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (add --upload to write to Firestore)' : 'LIVE UPLOAD'}`);
console.log('='.repeat(60));

let totalRaw = 0, totalInvalid = 0, totalFiltered = 0;
const allFeatures = [];

for (const filename of GEOJSON_FILES) {
  const filepath = join(__dirname, '..', 'geojson-literary-roads', filename);
  try {
    const raw  = JSON.parse(readFileSync(filepath, 'utf8'));
    const feats = raw.features || [];
    console.log(`\n📂 ${filename}: ${feats.length} features`);
    totalRaw += feats.length;

    for (const f of feats) {
      const doc = transformFeature(f);
      if (!doc) {
        totalInvalid++;
      } else {
        allFeatures.push(doc);
      }
    }
  } catch (err) {
    console.error(`  ✗ Could not read ${filename}: ${err.message}`);
  }
}

totalFiltered = totalRaw - allFeatures.length - totalInvalid;

// ── Deduplicate ──────────────────────────────────────────────────────────────
// Primary:   OSM doc ID (globally unique)
// Secondary: normalized name + city + state (catches cross-region boundary dupes)
const seenDocIds  = new Set();
const seenNameKey = new Set();
const unique      = [];
let dupeCount     = 0;

for (const doc of allFeatures) {
  // Primary dedup — OSM ID
  if (seenDocIds.has(doc.docId)) {
    console.log(`  ⊗ Duplicate OSM ID: ${doc.name} (${doc.city}, ${doc.state})`);
    dupeCount++;
    continue;
  }

  // Secondary dedup — name + city + state (only when city is known;
  // entries without a city are different locations of the same chain)
  if (doc.city) {
    const nameKey = [
      doc.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      doc.city.toLowerCase().replace(/[^a-z0-9]/g, ''),
      (doc.state || '').toLowerCase(),
    ].join('|');

    if (seenNameKey.has(nameKey)) {
      console.log(`  ⊗ Duplicate name/city: ${doc.name} (${doc.city}, ${doc.state})`);
      dupeCount++;
      continue;
    }
    seenNameKey.add(nameKey);
  }

  seenDocIds.add(doc.docId);
  unique.push(doc);
}

// ── Summary before upload ────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  Pre-upload Summary');
console.log('='.repeat(60));
console.log(`  Total features in files:  ${totalRaw}`);
console.log(`  Filtered out (no name/coords/quality): ${totalRaw - allFeatures.length}`);
console.log(`  Duplicates removed:       ${dupeCount}`);
console.log(`  Ready to upload:          ${unique.length}`);

if (DRY_RUN) {
  console.log('\n  Sample (first 10):');
  unique.slice(0, 10).forEach(d =>
    console.log(`    • ${d.name} — ${d.city ?? '?'}, ${d.state ?? '?'}`)
  );
  console.log('\n  Run with --upload to write to Firestore.');
  process.exit(0);
}

// ── Upload to Firestore (via Admin SDK with service account) ─────────────────
console.log('\n  Starting Firestore upload...\n');

// Locate service account key
const keyArg    = process.argv.find((a, i) => process.argv[i - 1] === '--key');
const keyPaths  = [
  keyArg,
  join(__dirname, '..', 'service-account.json'),
  join(__dirname, '..', 'serviceAccount.json'),
  join(__dirname, 'service-account.json'),
].filter(Boolean);

const keyFile = keyPaths.find(p => existsSync(p));
if (!keyFile) {
  console.error(`
  ✗ No service account key found.

  To fix:
    1. Go to Firebase Console → Project Settings → Service Accounts
    2. Click "Generate New Key" → downloads a JSON file
    3. Save it as: ${join(__dirname, '..', 'service-account.json')}
    4. Re-run: node scripts/seed-bookstores.mjs --upload

  (The file is in .gitignore — it will NOT be committed.)
`);
  process.exit(1);
}

console.log(`  Using service account: ${keyFile}\n`);

const admin   = (await import('firebase-admin')).default;
const serviceAccount = JSON.parse(readFileSync(keyFile, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db     = admin.firestore();
const colRef = db.collection('bookstores');

let added = 0, skipped = 0, failed = 0;
const BATCH_SIZE = 400; // Firestore batch limit is 500 ops

// Process in batches for speed
for (let bStart = 0; bStart < unique.length; bStart += BATCH_SIZE) {
  const chunk = unique.slice(bStart, bStart + BATCH_SIZE);

  // Check existence in parallel first
  const snapshots = await Promise.all(chunk.map(e => colRef.doc(e.docId).get()));

  const batch = db.batch();
  let batchCount = 0;

  for (let i = 0; i < chunk.length; i++) {
    const { docId, ...data } = chunk[i];
    if (snapshots[i].exists) {
      console.log(`  ⊗ Already in Firestore: ${data.name} (${data.city}, ${data.state})`);
      skipped++;
      continue;
    }
    batch.set(colRef.doc(docId), {
      ...data,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ Added: ${data.name} — ${data.city ?? '?'}, ${data.state ?? '?'}`);
    added++;
    batchCount++;
  }

  if (batchCount > 0) {
    try {
      await batch.commit();
    } catch (err) {
      console.error(`  ✗ Batch commit failed: ${err.message}`);
      failed += batchCount;
      added  -= batchCount;
    }
  }
}

// ── Final summary ────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  Final Summary');
console.log('='.repeat(60));
console.log(`  Total features in files:  ${totalRaw}`);
console.log(`  Filtered (quality check): ${totalRaw - allFeatures.length}`);
console.log(`  Duplicates removed:       ${dupeCount}`);
console.log(`  Already in Firestore:     ${skipped}`);
console.log(`  Added to Firestore:       ${added}`);
console.log(`  Failed/errors:            ${failed}`);
console.log('='.repeat(60));

process.exit(0);
