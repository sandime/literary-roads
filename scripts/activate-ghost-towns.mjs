#!/usr/bin/env node
// Set active: true on every document in the ghostTowns Firestore collection.
//
// Uses the Firebase CLIENT SDK — no service account key needed.
//
// BEFORE running --commit, temporarily open write rules in Firebase Console:
//   Firestore → Rules → replace the ghostTowns rule with:
//     match /ghostTowns/{doc} { allow read, write: if true; }
// After the script finishes, restore:
//     match /ghostTowns/{doc} { allow read: if true; allow write: if isAdmin(); }
//
// Usage:
//   node scripts/activate-ghost-towns.mjs           → dry-run (read-only, no rule change needed)
//   node scripts/activate-ghost-towns.mjs --commit  → write active: true to all docs

const DRY_RUN = !process.argv.includes('--commit');

if (DRY_RUN) {
  console.log('\n  DRY RUN — pass --commit to write changes\n');
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

// ── Fetch all docs ────────────────────────────────────────────────────────────
console.log('  Fetching ghostTowns collection…');
const snap = await getDocs(collection(db, 'ghostTowns'));
const total = snap.size;

const needsUpdate = snap.docs.filter(d => d.data().active !== true);
const alreadyActive = total - needsUpdate.length;

console.log(`  Total docs:      ${total}`);
console.log(`  Already active:  ${alreadyActive}`);
console.log(`  Will update:     ${needsUpdate.length}\n`);

if (needsUpdate.length === 0) {
  console.log('  Nothing to do — all ghost towns already have active: true.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('  Sample docs that will be updated:');
  needsUpdate.slice(0, 10).forEach(d => {
    const { name, state } = d.data();
    console.log(`    [${d.id}]  ${name || '(unnamed)'}  —  ${state || '?'}`);
  });
  if (needsUpdate.length > 10) {
    console.log(`    … and ${needsUpdate.length - 10} more`);
  }
  console.log(`
  To apply:
    1. In Firebase Console → Firestore → Rules, temporarily set:
         match /ghostTowns/{doc} { allow read, write: if true; }
       Click Publish.
    2. Run:  node scripts/activate-ghost-towns.mjs --commit
    3. Restore rules:
         match /ghostTowns/{doc} { allow read: if true; allow write: if isAdmin(); }
       Click Publish.
`);
  process.exit(0);
}

// ── Batch update ──────────────────────────────────────────────────────────────
const BATCH_SIZE = 400;
let updated = 0;

for (let i = 0; i < needsUpdate.length; i += BATCH_SIZE) {
  const chunk = needsUpdate.slice(i, i + BATCH_SIZE);
  const batch = writeBatch(db);
  chunk.forEach(d => batch.update(doc(db, 'ghostTowns', d.id), { active: true }));
  await batch.commit();
  updated += chunk.length;
  console.log(`  Updated ${updated} / ${needsUpdate.length}…`);
}

console.log(`\n  Done. ${updated} ghost towns set to active: true.`);
console.log(`  Total visible on map: ${total}`);
console.log(`\n  Remember to restore the Firestore rules for ghostTowns.\n`);
process.exit(0);
