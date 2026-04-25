#!/usr/bin/env node
// Diagnostic: count coffeeShops and bookstores in Firestore by state,
// and spot-check a handful of docs to verify field format (lat, lng).
//
// Usage:
//   node scripts/diagnose-places-db.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }         from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { dirname, join }        from 'path';
import { fileURLToPath }        from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Firebase admin init ───────────────────────────────────────────────────────
// Looks for serviceAccountKey.json next to this script, or falls back to
// GOOGLE_APPLICATION_CREDENTIALS env var.
const KEY_PATH = join(__dirname, 'serviceAccountKey.json');
if (!existsSync(KEY_PATH)) {
  console.error('ERROR: serviceAccountKey.json not found at', KEY_PATH);
  console.error('Download it from Firebase Console → Project settings → Service accounts.');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(KEY_PATH, 'utf8'))) });
const db = getFirestore();

// ── Helpers ───────────────────────────────────────────────────────────────────
async function auditCollection(colName) {
  console.log(`\n── ${colName} ──────────────────────────────────────────`);
  const snap = await db.collection(colName).get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const total = docs.length;
  const missingLat  = docs.filter(d => d.lat  == null).length;
  const missingLng  = docs.filter(d => d.lng  == null).length;
  const missingName = docs.filter(d => !d.name).length;
  const missingState = docs.filter(d => !d.state).length;

  console.log(`  Total docs : ${total}`);
  console.log(`  Missing lat: ${missingLat}`);
  console.log(`  Missing lng: ${missingLng}`);
  console.log(`  Missing name: ${missingName}`);
  console.log(`  Missing state: ${missingState}`);

  // Count by state
  const bySt = {};
  for (const d of docs) {
    const st = (d.state || '(none)').trim();
    bySt[st] = (bySt[st] || 0) + 1;
  }
  const sorted = Object.entries(bySt).sort((a, b) => b[1] - a[1]);
  console.log(`\n  By state (top 20):`);
  sorted.slice(0, 20).forEach(([st, n]) => console.log(`    ${st.padEnd(25)} ${n}`));
  if (sorted.length > 20) console.log(`    ... and ${sorted.length - 20} more states`);

  // Spot-check 3 docs to verify field format
  console.log(`\n  Sample docs (first 3):`);
  docs.slice(0, 3).forEach(d => {
    console.log(`    [${d.id}]`);
    console.log(`      name : ${d.name}`);
    console.log(`      lat  : ${d.lat}  (${typeof d.lat})`);
    console.log(`      lng  : ${d.lng}  (${typeof d.lng})`);
    console.log(`      state: ${d.state}`);
    console.log(`      city : ${d.city}`);
  });

  // Check for route-relevant states (NYC→Bismarck corridor)
  const routeStates = ['New York','New Jersey','Pennsylvania','Ohio','Indiana','Illinois',
                       'Wisconsin','Minnesota','South Dakota','North Dakota'];
  console.log(`\n  NYC→Bismarck corridor:`);
  routeStates.forEach(st => {
    const n = bySt[st] || 0;
    const flag = n === 0 ? ' ← EMPTY' : '';
    console.log(`    ${st.padEnd(25)} ${n}${flag}`);
  });

  return { total, bySt };
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log('Literary Roads — Places Database Diagnostic');
console.log('============================================');

await auditCollection('coffeeShops');
await auditCollection('bookstores');

console.log('\nDone.');
process.exit(0);
