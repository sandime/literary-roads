#!/usr/bin/env node
// Delete all ghostTowns documents whose description does NOT contain "ghost town".
//
// Uses the Firebase CLIENT SDK — no service account key or gcloud needed.
//
// Usage:
//   node scripts/delete-human-settlements.mjs           → dry-run (no deletes, no rule change needed)
//   node scripts/delete-human-settlements.mjs --commit  → delete matching docs
//
// Before running --commit, temporarily open write rules in Firebase Console:
//   match /ghostTowns/{doc} { allow read, write: if true; }
// Restore after:
//   match /ghostTowns/{doc} { allow read: if true; allow write: if isAdmin(); }

const DRY_RUN = !process.argv.includes('--commit');

if (DRY_RUN) {
  console.log('\n  DRY RUN — pass --commit to delete\n');
}

// ── Firebase client SDK ───────────────────────────────────────────────────────
const { initializeApp }   = await import('firebase/app');
const { getFirestore, collection, getDocs, doc, writeBatch } =
  await import('firebase/firestore');

const app = initializeApp({
  apiKey:            'AIzaSyBlKiGzXCTIgjqjzDROB_dywrjJntizkYE',
  authDomain:        'the-literary-roads.firebaseapp.com',
  projectId:         'the-literary-roads',
  storageBucket:     'the-literary-roads.firebasestorage.app',
  messagingSenderId: '305145573086',
  appId:             '1:305145573086:web:206ec464384fe149c45c4f',
});

const db = getFirestore(app);

// ── Fetch and filter ──────────────────────────────────────────────────────────
console.log('  Fetching ghostTowns collection…');
const snap = await getDocs(collection(db, 'ghostTowns'));
console.log(`  Total docs: ${snap.size}\n`);

const matches = snap.docs.filter(d =>
  !(d.data().description || '').toLowerCase().includes('ghost town')
);

console.log(`  Docs WITHOUT "ghost town" in description: ${matches.length}`);

if (matches.length === 0) {
  console.log('  Nothing to delete.');
  process.exit(0);
}

// Show a sample
console.log('\n  Sample:');
matches.slice(0, 8).forEach(d => {
  const { name, state, description } = d.data();
  console.log(`    [${d.id}]  ${name || '(unnamed)'}  —  ${state || '?'}`);
  console.log(`      "${description}"`);
});
if (matches.length > 8) console.log(`    … and ${matches.length - 8} more\n`);

if (DRY_RUN) {
  console.log('\n  To delete:');
  console.log('    1. Firebase Console → Firestore → Rules → temporarily set:');
  console.log('         match /ghostTowns/{doc} { allow read, write: if true; }');
  console.log('       Click Publish.');
  console.log('    2. node scripts/delete-human-settlements.mjs --commit');
  console.log('    3. Restore rules:');
  console.log('         match /ghostTowns/{doc} { allow read: if true; allow write: if isAdmin(); }');
  console.log('       Click Publish.\n');
  process.exit(0);
}

// ── Batch delete (400 per batch) ──────────────────────────────────────────────
console.log('\n  Deleting…');
const BATCH_SIZE = 400;
let deleted = 0;

for (let i = 0; i < matches.length; i += BATCH_SIZE) {
  const batch = writeBatch(db);
  matches.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(doc(db, 'ghostTowns', d.id)));
  await batch.commit();
  deleted += Math.min(BATCH_SIZE, matches.length - i);
  console.log(`  Deleted ${deleted} / ${matches.length}…`);
}

console.log(`\n  Done. ${deleted} documents deleted.`);
console.log(`  Remaining ghost towns: ${snap.size - deleted}\n`);
process.exit(0);
