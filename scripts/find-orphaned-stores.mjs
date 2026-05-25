#!/usr/bin/env node
// Scans ALL bookstoreGuides documents and lists any with stores subcollection data.
// Use this to find orphaned stops after a guide document was accidentally deleted/recreated.
//
// Usage (temporarily open Firestore rules to allow reads, or run while rules are open):
//   node scripts/find-orphaned-stores.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyBlKiGzXCTIgjqjzDROB_dywrjJntizkYE",
  authDomain:        "the-literary-roads.firebaseapp.com",
  projectId:         "the-literary-roads",
  storageBucket:     "the-literary-roads.firebasestorage.app",
  messagingSenderId: "305145573086",
  appId:             "1:305145573086:web:206ec464384fe149c45c4f",
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);

console.log('Scanning bookstoreGuides collection...\n');

const guidesSnap = await getDocs(collection(db, 'bookstoreGuides'));
console.log(`Found ${guidesSnap.size} guide document(s) total.\n`);

for (const guideDoc of guidesSnap.docs) {
  const data      = guideDoc.data();
  const storesSnap = await getDocs(collection(db, 'bookstoreGuides', guideDoc.id, 'stores'));

  const label = `"${data.title ?? '(no title)'}" [ID: ${guideDoc.id}]`;

  if (storesSnap.size > 0) {
    console.log(`✓ ${label} — ${storesSnap.size} stop(s):`);
    storesSnap.docs.forEach((s, i) => {
      const sd = s.data();
      console.log(`    ${i + 1}. ${sd.name ?? '?'} — ${[sd.city, sd.state].filter(Boolean).join(', ')}`);
    });
  } else {
    console.log(`  ${label} — no stops`);
  }
}

console.log('\nDone.');
process.exit(0);
