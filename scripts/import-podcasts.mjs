#!/usr/bin/env node
// Literary Podcasts importer
// Reads literary-podcasts.json and upserts each entry into Firestore.
// Signs in with Firebase email/password — no service account key needed.
//
// Usage:
//   node scripts/import-podcasts.mjs                    → dry run
//   node scripts/import-podcasts.mjs --upload           → upsert all entries
//   node scripts/import-podcasts.mjs --upload --sync    → upsert + delete removed entries
//
// Credentials (pick one):
//   FIREBASE_EMAIL=you@email.com FIREBASE_PASSWORD=yourpass node scripts/import-podcasts.mjs --upload --sync
//   or set them in scripts/.env.local

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'literary-podcasts.json');
const ENV_FILE  = join(__dirname, '.env.local');

// ── Load optional .env.local ───────────────────────────────────────────────
if (existsSync(ENV_FILE)) {
  readFileSync(ENV_FILE, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .forEach(l => {
      const [k, ...v] = l.split('=');
      if (!process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim();
    });
}

// ── Load + validate JSON ───────────────────────────────────────────────────
function loadPodcasts() {
  let raw;
  try { raw = readFileSync(DATA_FILE, 'utf8'); }
  catch { console.error(`✗ Cannot read ${DATA_FILE}`); process.exit(1); }

  let podcasts;
  try { podcasts = JSON.parse(raw); }
  catch (e) { console.error(`✗ Invalid JSON: ${e.message}`); process.exit(1); }

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
  if (errors.length) { console.error('✗ Validation errors:\n' + errors.join('\n')); process.exit(1); }

  return podcasts;
}

// ── Firestore upload ───────────────────────────────────────────────────────
async function uploadToFirestore(podcasts, sync = false) {
  const email    = process.env.FIREBASE_EMAIL;
  const password = process.env.FIREBASE_PASSWORD;

  if (!email || !password) {
    console.error('✗ Firebase credentials not set.\n');
    console.error('  Run with your credentials:');
    console.error('    FIREBASE_EMAIL=you@email.com FIREBASE_PASSWORD=yourpass node scripts/import-podcasts.mjs --upload --sync');
    console.error('');
    console.error('  Or create scripts/.env.local containing:');
    console.error('    FIREBASE_EMAIL=you@email.com');
    console.error('    FIREBASE_PASSWORD=yourpass');
    process.exit(1);
  }

  const { initializeApp, getApps } = await import('firebase/app');
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
  const { getFirestore, collection, doc, setDoc, deleteDoc, getDocs, serverTimestamp } = await import('firebase/firestore');

  const app = getApps().length ? getApps()[0] : initializeApp({
    apiKey:            'AIzaSyBlKiGzXCTIgjqjzDROB_dywrjJntizkYE',
    authDomain:        'the-literary-roads.firebaseapp.com',
    projectId:         'the-literary-roads',
    storageBucket:     'the-literary-roads.firebasestorage.app',
    messagingSenderId: '305145573086',
    appId:             '1:305145573086:web:206ec464384fe149c45c4f',
  });

  // Sign in
  process.stdout.write(`Signing in as ${email}… `);
  try {
    await signInWithEmailAndPassword(getAuth(app), email, password);
    console.log('✓');
  } catch (err) {
    console.log('✗');
    console.error(`  Auth failed: ${err.message}`);
    process.exit(1);
  }

  const db     = getFirestore(app);
  const colRef = collection(db, 'literary_podcasts');

  // ── Delete orphaned docs (--sync) ─────────────────────────────────────────
  if (sync) {
    console.log('\nChecking for removed entries…');
    const jsonIds  = new Set(podcasts.map(p => p.id));
    const existing = await getDocs(colRef);
    let deleted = 0;
    for (const d of existing.docs) {
      if (!jsonIds.has(d.id)) {
        await deleteDoc(d.ref);
        console.log(`  🗑  deleted: ${d.data().title || d.id}`);
        deleted++;
      }
    }
    console.log(deleted === 0 ? '  (no orphaned docs)\n' : '');
  }

  // ── Upsert all entries ─────────────────────────────────────────────────────
  console.log('\nUploading…');
  let uploaded = 0, failed = 0;

  for (const podcast of podcasts) {
    const data = { ...podcast };
    if (!data.rssUrl) delete data.rssUrl;
    try {
      await setDoc(doc(colRef, podcast.id), { ...data, updatedAt: serverTimestamp() });
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

// ── Dry run ────────────────────────────────────────────────────────────────
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
  console.log('  FIREBASE_EMAIL=you@email.com FIREBASE_PASSWORD=yourpass node scripts/import-podcasts.mjs --upload --sync');
}

// ── Main ───────────────────────────────────────────────────────────────────
const podcasts = loadPodcasts();

if (process.argv.includes('--upload')) {
  const sync = process.argv.includes('--sync');
  console.log(`Uploading ${podcasts.length} podcasts${sync ? ' [sync — will delete removed]' : ''}…`);
  uploadToFirestore(podcasts, sync).catch(err => { console.error(err); process.exit(1); });
} else {
  dryRun(podcasts);
}
