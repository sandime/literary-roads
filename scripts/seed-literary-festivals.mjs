#!/usr/bin/env node
// Seed Firestore "literaryFestivals" collection from src/data/literaryFestivals.json
//
// Uses the Firebase CLIENT SDK (no service account needed).
// Temporarily open Firestore write rules before running, then re-lock after.
//
// Usage:
//   node scripts/seed-literary-festivals.mjs            → dry-run (counts only)
//   node scripts/seed-literary-festivals.mjs --upload   → upload to Firestore
//
// Before running --upload, set rules in Firebase Console:
//   match /literaryFestivals/{doc} {
//     allow read: if true;
//     allow write: if true;   // TEMPORARY — re-lock after import
//   }
// After upload, restore:
//   match /literaryFestivals/{doc} {
//     allow read: if true;
//     allow write: if false;
//   }

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN   = !process.argv.includes('--upload');

// ── Load JSON source ─────────────────────────────────────────────────────────
const jsonPath  = join(__dirname, '..', 'src', 'data', 'literaryFestivals.json');
const festivals = JSON.parse(readFileSync(jsonPath, 'utf8'));
console.log(`Loaded ${festivals.length} festivals from JSON.`);

if (DRY_RUN) {
  console.log('\nDRY RUN — pass --upload to write to Firestore.\n');
  const byState = {};
  for (const f of festivals) {
    byState[f.state || '(no state)'] = (byState[f.state || '(no state)'] || 0) + 1;
  }
  console.log('Festivals by state:');
  Object.entries(byState).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`  ${s}: ${n}`));
  console.log(`\nTotal: ${festivals.length}`);
  process.exit(0);
}

// ── Firebase client SDK ──────────────────────────────────────────────────────
const { initializeApp, getApps } = await import('firebase/app');
const { getFirestore, collection, setDoc, doc, getDocs } = await import('firebase/firestore');

const firebaseConfig = {
  apiKey:            'AIzaSyBlKiGzXCTIgjqjzDROB_dywrjJntizkYE',
  authDomain:        'the-literary-roads.firebaseapp.com',
  projectId:         'the-literary-roads',
  storageBucket:     'the-literary-roads.firebasestorage.app',
  messagingSenderId: '305145573086',
  appId:             '1:305145573086:web:206ec464384fe149c45c4f',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);

const COLLECTION = 'literaryFestivals';
let uploaded = 0;
let skipped  = 0;

// Upload one at a time (client SDK has no batch limit, but serial is safer for rules check)
for (const f of festivals) {
  if (!f.id) { console.warn('Skipping festival with no id:', f.name); skipped++; continue; }
  try {
    await setDoc(doc(db, COLLECTION, f.id), {
      id:               f.id,
      name:             f.name,
      city:             f.city            || '',
      state:            f.state           || '',
      lat:              f.lat,
      lng:              f.lng,
      description:      f.description     || '',
      website:          f.website         || '',
      typicalMonth:     f.typicalMonth    || '',
      recurringPattern: f.recurringPattern || '',
      size:             f.size            || 'regional',
      primaryType:      f.primaryType     || 'general',
      tags:             f.tags            || [],
      genre:            f.genre           || null,
    }, { merge: true });
    uploaded++;
    if (uploaded % 20 === 0) console.log(`  ${uploaded} / ${festivals.length} uploaded...`);
  } catch (err) {
    console.error(`  Failed: ${f.id} — ${err.message}`);
    skipped++;
  }
}

console.log(`\nDone. Uploaded: ${uploaded}, Skipped: ${skipped}`);

// Verify count
const snap = await getDocs(collection(db, COLLECTION));
console.log(`Firestore "${COLLECTION}" collection now has ${snap.size} documents.`);
process.exit(0);
