#!/usr/bin/env node
// Seed Firestore "rssFeeds" collection with the 11 initial Literary Roads feeds.
//
// Uses the Firebase CLIENT SDK (no service account needed).
// Temporarily open Firestore write rules before running, then re-lock after.
//
// Usage:
//   node scripts/seed-rss-feeds.mjs            → dry-run (prints feeds)
//   node scripts/seed-rss-feeds.mjs --upload   → upload to Firestore
//
// Before --upload, add this rule in Firebase Console → Firestore → Rules:
//   match /rssFeeds/{doc} { allow read, write: if true; }   // TEMPORARY
// After upload, restore:
//   match /rssFeeds/{doc} { allow read: if true; allow write: if isAdmin(); }

const FEEDS = [
  {
    sourceName:       'Literary Hub',
    url:              'https://lithub.com/feed/',
    suggestedSection: 'handSelected',
    keywords:         ['books', 'author', 'literary', 'reading'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'Book Riot',
    url:              'https://bookriot.com/feed/',
    suggestedSection: 'readersChoice',
    keywords:         ['books', 'reading', 'bookstore'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'Shelf Awareness',
    url:              'https://www.shelf-awareness.com/issue.html?issue=rss',
    suggestedSection: 'headlights',
    keywords:         ['bookstore', 'indie', 'opening'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'Atlas Obscura',
    url:              'https://www.atlasobscura.com/feeds/latest',
    suggestedSection: 'headlights',
    keywords:         ['literary', 'books', 'road', 'travel', 'hidden'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'Sprudge',
    url:              'https://sprudge.com/feed',
    suggestedSection: 'waystation',
    keywords:         ['coffee', 'café', 'shop'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'Perfect Daily Grind',
    url:              'https://perfectdailygrind.com/feed',
    suggestedSection: 'waystation',
    keywords:         ['coffee', 'café', 'literary'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'Publishers Weekly',
    url:              'https://www.publishersweekly.com/pw/feeds/rss/pw-ht.xml',
    suggestedSection: 'onTheRoad',
    keywords:         ['tour', 'author', 'signing', 'event', 'reading'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'Poets and Writers',
    url:              'https://www.pw.org/content/rss',
    suggestedSection: 'onTheRoad',
    keywords:         ['tour', 'author', 'event', 'reading', 'signing'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'The Millions',
    url:              'https://themillions.com/feed',
    suggestedSection: 'readingRoom',
    keywords:         ['books', 'literary', 'reading', 'fiction'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'ABA Bookselling',
    url:              'https://www.bookweb.org/news/rss',
    suggestedSection: 'headlights',
    keywords:         ['bookstore', 'indie', 'opening', 'new'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'Afar Magazine',
    url:              'https://www.afar.com/feed',
    suggestedSection: 'dispatches',
    keywords:         ['road trip', 'literary', 'travel', 'bookstore'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       "Publishers Weekly Children's",
    url:              'https://www.publishersweekly.com/pw/feeds/rss/pw-ch.xml',
    suggestedSection: 'handSelected',
    keywords:         ['children', 'picture book', 'middle grade', 'young adult', 'author', 'new release'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'Horn Book',
    url:              'https://www.hbook.com/feed',
    suggestedSection: 'readingRoom',
    keywords:         ['children', 'books', 'reading', 'review', 'author'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       "Kirkus Children's",
    url:              'https://www.kirkusreviews.com/feed/childrens',
    suggestedSection: 'readersChoice',
    keywords:         ['children', 'picture book', 'middle grade', 'young adult', 'review', 'recommended'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'School Library Journal',
    url:              'https://www.slj.com/feed',
    suggestedSection: 'readingRoom',
    keywords:         ['children', 'books', 'library', 'reading', 'review'],
    active:           true,
    frequency:        'daily',
  },
  {
    sourceName:       'Nerdy Book Club',
    url:              'https://nerdybookclub.wordpress.com/feed',
    suggestedSection: 'readersChoice',
    keywords:         ['books', 'reading', 'children', 'author', 'community', 'recommend'],
    active:           true,
    frequency:        'daily',
  },
];

const DRY_RUN = !process.argv.includes('--upload');

if (DRY_RUN) {
  console.log('DRY RUN — pass --upload to write to Firestore.\n');
  FEEDS.forEach(f => console.log(`  [${f.suggestedSection}] ${f.sourceName} — ${f.url}`));
  console.log(`\nTotal: ${FEEDS.length} feeds`);
  process.exit(0);
}

// ── Firebase client SDK ──────────────────────────────────────────────────────
const { initializeApp, getApps } = await import('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = await import('firebase/firestore');

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

// Check for existing docs to avoid duplicates on re-run
const existing = await getDocs(collection(db, 'rssFeeds'));
const existingNames = new Set(existing.docs.map(d => d.data().sourceName));

let added = 0;
let skipped = 0;

for (const feed of FEEDS) {
  if (existingNames.has(feed.sourceName)) {
    console.log(`  SKIP (already exists): ${feed.sourceName}`);
    skipped++;
    continue;
  }
  await addDoc(collection(db, 'rssFeeds'), feed);
  console.log(`  + ${feed.sourceName}`);
  added++;
}

console.log(`\nDone. Added: ${added}, Skipped: ${skipped}`);
process.exit(0);
