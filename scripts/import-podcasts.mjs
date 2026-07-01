#!/usr/bin/env node
// Literary Podcasts importer
// Reads literary-podcasts.json and upserts each entry into Firestore.
// Uses firebase-admin (Admin SDK) — bypasses security rules entirely.
//
// One-time setup:
//   1. Firebase Console → Project Settings → Service Accounts → Generate New Key
//   2. Save the downloaded file as:  scripts/serviceAccountKey.json
//
// Usage:
//   node scripts/import-podcasts.mjs                    → dry run, prints what would be uploaded
//   node scripts/import-podcasts.mjs --upload           → upsert all entries to Firestore
//   node scripts/import-podcasts.mjs --upload --sync    → upsert all entries AND delete any Firestore
//                                                          docs whose ID is not in the JSON

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'literary-podcasts.json');
const KEY_FILE  = join(__dirname, 'serviceAccountKey.json');

// ── Load + validate JSON ───────────────────────────────────────────────────
function loadPodcasts() {
  let raw;
  try {
    raw = readFileSync(DATA_FILE, 'utf8');
  } catch {
    console.error(`✗ Cannot read ${DATA_FILE}`);
    process.exit(1);
  }

  let podcasts;
  try {
    podcasts = JSON.parse(raw);
  } catch (e) {
    console.error(`✗ Invalid JSON: ${e.message}`);
    process.exit(1);
  }

  if (!Array.isArray(podcasts) || podcasts.length === 0) {
    console.error('✗ literary-podcasts.json must be a non-empty array.');
    process.exit(1);
  }

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

// ── Firestore upload (Admin SDK) ───────────────────────────────────────────
async function uploadToFirestore(podcasts, sync = false) {
  if (!existsSync(KEY_FILE)) {
    console.error('✗ Service account key not found at:');
    console.error(`    ${KEY_FILE}`);
    console.error('');
    console.error('  To generate one:');
    console.error('  1. Go to https://console.firebase.google.com');
    console.error('  2. Project Settings → Service Accounts → Generate New Key');
    console.error('  3. Save the downloaded file as scripts/serviceAccountKey.json');
    process.exit(1);
  }

  const admin = (await import('firebase-admin')).default;

  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(readFileSync(KEY_FILE, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db     = admin.firestore();
  const colRef = db.collection('literary_podcasts');

  // ── Delete orphaned docs (--sync mode) ────────────────────────────────────
  if (sync) {
    console.log('Checking for removed entries…');
    const jsonIds  = new Set(podcasts.map(p => p.id));
    const existing = await colRef.get();
    let deleted = 0;
    for (const d of existing.docs) {
      if (!jsonIds.has(d.id)) {
        await d.ref.delete();
        console.log(`  🗑  deleted: ${d.data().title || d.id}`);
        deleted++;
      }
    }
    console.log(deleted === 0 ? '  (no orphaned docs)\n' : '');
  }

  // ── Upsert all entries ─────────────────────────────────────────────────────
  let uploaded = 0, failed = 0;

  for (const podcast of podcasts) {
    const data = { ...podcast };
    if (!data.rssUrl) delete data.rssUrl;

    try {
      await colRef.doc(podcast.id).set({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  ✓ ${podcast.title}`);
      uploaded++;
    } catch (err) {
      console.error(`  ✗ ${podcast.title} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${uploaded} upserted, ${failed} errors`);
  process.exit(failed > 0 ? 1 : 0);
}

// ── Dry run preview ────────────────────────────────────────────────────────
function dryRun(podcasts) {
  console.log('── Dry run — podcasts that would be uploaded ──\n');
  podcasts.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.id}]`);
    console.log(`     Title : ${p.title}`);
    console.log(`     Host  : ${p.host}`);
    console.log(`     Active: ${p.active}`);
    console.log(`     URL   : ${p.url}`);
    console.log('');
  });
  console.log(`── Total: ${podcasts.length} podcasts ──`);
  console.log('\nTo upload, run:');
  console.log('  node scripts/import-podcasts.mjs --upload --sync');
}

// ── Main ───────────────────────────────────────────────────────────────────
const podcasts = loadPodcasts();

if (process.argv.includes('--upload')) {
  const sync = process.argv.includes('--sync');
  console.log(`Uploading ${podcasts.length} podcasts to Firestore${sync ? ' [sync — will delete removed]' : ''}…\n`);
  uploadToFirestore(podcasts, sync).catch(err => { console.error(err); process.exit(1); });
} else {
  dryRun(podcasts);
}
