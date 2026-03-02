#!/usr/bin/env node
// Literary Podcasts importer
// Reads literary-podcasts.json and upserts each entry into Firestore.
//
// Usage:
//   node scripts/import-podcasts.mjs            → dry run, prints what would be uploaded
//   node scripts/import-podcasts.mjs --upload   → upload to Firestore

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'literary-podcasts.json');

// ── Load + validate JSON ───────────────────────────────────────────────────
function loadPodcasts() {
  let raw;
  try {
    raw = readFileSync(DATA_FILE, 'utf8');
  } catch {
    console.error(`✗ Cannot read ${DATA_FILE}`);
    console.error('  Make sure literary-podcasts.json exists in the scripts/ directory.');
    process.exit(1);
  }

  let podcasts;
  try {
    podcasts = JSON.parse(raw);
  } catch (e) {
    console.error(`✗ Invalid JSON in literary-podcasts.json: ${e.message}`);
    process.exit(1);
  }

  if (!Array.isArray(podcasts) || podcasts.length === 0) {
    console.error('✗ literary-podcasts.json must be a non-empty array.');
    process.exit(1);
  }

  // Validate required fields
  const errors = [];
  podcasts.forEach((p, i) => {
    if (!p.id)    errors.push(`  [${i}] missing "id"`);
    if (!p.title) errors.push(`  [${i}] missing "title" (id: ${p.id ?? '?'})`);
    if (!p.url)   errors.push(`  [${i}] missing "url"  (id: ${p.id ?? '?'})`);
  });
  if (errors.length) {
    console.error('✗ Validation errors:\n' + errors.join('\n'));
    process.exit(1);
  }

  return podcasts;
}

// ── Firestore upload ───────────────────────────────────────────────────────
async function uploadToFirestore(podcasts) {
  const { initializeApp, getApps } = await import('firebase/app');
  const { getFirestore, collection, setDoc, doc, serverTimestamp } = await import('firebase/firestore');

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        apiKey:            'AIzaSyBlKiGzXCTIgjqjzDROB_dywrjJntizkYE',
        authDomain:        'the-literary-roads.firebaseapp.com',
        projectId:         'the-literary-roads',
        storageBucket:     'the-literary-roads.firebasestorage.app',
        messagingSenderId: '305145573086',
        appId:             '1:305145573086:web:206ec464384fe149c45c4f',
      });

  const db     = getFirestore(app);
  const colRef = collection(db, 'literary_podcasts');

  let uploaded = 0, failed = 0;

  for (const podcast of podcasts) {
    // Strip empty rssUrl so Firestore doesn't store blank strings
    const data = { ...podcast };
    if (!data.rssUrl) delete data.rssUrl;

    try {
      // setDoc with the podcast id as document ID — safe to re-run (upsert)
      await setDoc(doc(colRef, podcast.id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      console.log(`  ✓ ${podcast.title}`);
      uploaded++;
    } catch (err) {
      console.error(`  ✗ ${podcast.title} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${uploaded} upserted, ${failed} errors`);
  if (failed === 0) console.log('Collection: literary_podcasts');
  process.exit(0);
}

// ── Dry run preview ────────────────────────────────────────────────────────
function dryRun(podcasts) {
  console.log('── Dry run — podcasts that would be uploaded ──\n');
  podcasts.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.id}]`);
    console.log(`     Title : ${p.title}`);
    console.log(`     Host  : ${p.host}`);
    console.log(`     Tags  : ${(p.tags || []).join(', ')}`);
    console.log(`     URL   : ${p.url}`);
    console.log('');
  });
  console.log(`── Total: ${podcasts.length} podcasts ──`);
  console.log('\nTo upload, run:');
  console.log('  node scripts/import-podcasts.mjs --upload');
}

// ── Main ───────────────────────────────────────────────────────────────────
const podcasts = loadPodcasts();

if (process.argv.includes('--upload')) {
  console.log(`Uploading ${podcasts.length} podcasts to Firestore (literary_podcasts)…\n`);
  uploadToFirestore(podcasts).catch(err => { console.error(err); process.exit(1); });
} else {
  dryRun(podcasts);
}
