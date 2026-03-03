#!/usr/bin/env node
// Literary Podcast Discovery — Listen Notes API
// Searches for book/literature podcasts and saves results for manual curation.
//
// Usage:  node scripts/discover-podcasts.mjs
// Output: scripts/podcasts-discovered.json

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const OUT_FILE  = join(__dirname, 'podcasts-discovered.json');
const ENV_FILE  = join(ROOT, '.env');

// ── Read API key from .env ─────────────────────────────────────────────────
function readDotEnv() {
  if (!existsSync(ENV_FILE)) return {};
  return Object.fromEntries(
    readFileSync(ENV_FILE, 'utf8')
      .split('\n')
      .filter(l => l.includes('=') && !l.trimStart().startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=');
        const key = l.slice(0, idx).trim();
        const val = l.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        return [key, val];
      })
  );
}

const API_KEY = readDotEnv().VITE_LISTEN_NOTES_API_KEY;
if (!API_KEY) {
  console.error('✗ VITE_LISTEN_NOTES_API_KEY not found in .env');
  process.exit(1);
}

// ── Listen Notes genre ID → readable label ─────────────────────────────────
const GENRE_MAP = {
  67:  'News',             68:  'TV & Film',        69:  'Arts',
  77:  'Sports',           78:  'Travel',            79:  'Arts',
  82:  'Design',           83:  'Fashion & Beauty',  85:  'Performing Arts',
  86:  'Visual Arts',      93:  'Business',          94:  'Careers',
  95:  'Entrepreneurship', 109: 'Science',           111: 'Social Sciences',
  122: 'Music',            123: 'News',              125: 'History',
  126: 'Society & Culture',127: 'Social Sciences',  128: 'Philosophy',
  129: 'Fiction',          130: 'Comedy',            132: 'Education',
  133: 'Education',        134: 'Fiction',           135: 'Government',
  136: 'History',          144: 'Personal Finance',  151: 'Locally Focused',
  155: 'Arts',             168: 'Society & Culture', 244: 'Personal Journals',
  246: 'Comedy Fiction',   247: 'Drama',             248: 'Science Fiction',
  249: 'Books',            250: 'Literature',        264: 'Narrative',
  296: 'Documentary',
};

// ── Search config ──────────────────────────────────────────────────────────
const QUERIES = [
  'literary fiction podcast',
  'book recommendations',
  'authors talking about books',
  'literature',
  'book news',
  'writing podcast',
  'bestseller books',
];
const RESULTS_EACH = 15;

// ── Manually pinned podcasts (always included regardless of search) ─────────
const PINNED = [
  {
    id:          'what-should-i-read-next',
    title:       'What Should I Read Next?',
    host:        'Anne Bogel',
    description: 'Anne Bogel — the blogger behind Modern Mrs. Darcy — talks books with readers, helping them find their next great read by dissecting what they love and what leaves them cold.',
    url:         'https://modernmrsdarcy.com/what-should-i-read-next/',
    rssUrl:      'https://feeds.simplecast.com/W_9rTEj_',
    tags:        ['Book Recommendations', 'Book Culture'],
    emoji:       '📚',
    active:      false,
    _pinned:     true,
  },
  {
    id:          'nyt-book-review',
    title:       'The Book Review',
    host:        'New York Times',
    description: 'The New York Times Book Review podcast features author interviews, discussions of the week\'s notable new books, and conversations about literature and the publishing world.',
    url:         'https://www.nytimes.com/column/book-review-podcast',
    rssUrl:      'https://rss.nytimes.com/services/xml/rss/nyt/Books.xml',
    tags:        ['Book News', 'Literary Criticism', 'Interviews'],
    emoji:       '📰',
    active:      false,
    _pinned:     true,
  },
];
const API_BASE     = 'https://listen-api.listennotes.com/api/v2';

// ── Helpers ────────────────────────────────────────────────────────────────
const slugify = str =>
  str.toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const stripHtml = str => str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const appleLink = itunesId =>
  itunesId ? `https://podcasts.apple.com/podcast/id${itunesId}` : '';

function assignEmoji(title, description = '') {
  const t = (title + ' ' + description).toLowerCase();
  if (t.includes('poet') || t.includes('verse'))         return '✍️';
  if (t.includes('histor') || t.includes('classic'))     return '📜';
  if (t.includes('interview') || t.includes('author'))   return '🎙️';
  if (t.includes('fiction') || t.includes('novel'))      return '📖';
  if (t.includes('mystery') || t.includes('thriller'))   return '🔍';
  if (t.includes('bookshop') || t.includes('bookstore')) return '🏪';
  if (t.includes('children') || t.includes('kids'))      return '🧸';
  if (t.includes('sci-fi') || t.includes('fantasy'))     return '🚀';
  if (t.includes('writing') || t.includes('craft'))      return '✏️';
  return '📚';
}

// ── API ────────────────────────────────────────────────────────────────────
async function search(query) {
  const url = new URL(`${API_BASE}/search`);
  url.searchParams.set('q',        query);
  url.searchParams.set('type',     'podcast');
  url.searchParams.set('language', 'English');
  url.searchParams.set('offset',   '0');

  const res = await fetch(url.toString(), {
    headers: { 'X-ListenAPI-Key': API_KEY },
  });

  if (res.status === 401) {
    console.error('\n✗ Invalid API key (401). Check VITE_LISTEN_NOTES_API_KEY in .env');
    process.exit(1);
  }
  if (res.status === 429) {
    console.warn('  ⚠ Rate limited — waiting 2 s…');
    await new Promise(r => setTimeout(r, 2000));
    return search(query);
  }
  if (!res.ok) {
    console.warn(`  ⚠ HTTP ${res.status} — skipping`);
    return [];
  }

  const json = await res.json();
  return (json.results || []).slice(0, RESULTS_EACH);
}

// ── Main ───────────────────────────────────────────────────────────────────
console.log('\n🎙️  Literary Podcast Discovery');
console.log(`   Queries  : ${QUERIES.join(', ')}`);
console.log(`   Per query: ${RESULTS_EACH} results`);
console.log(`   Pinned   : ${PINNED.map(p => p.title).join(', ')}\n`);

const seen = new Map(); // listenNotesId → formatted podcast

// Seed pinned podcasts first (keyed by slug so they survive dedup)
for (const p of PINNED) seen.set(p.id, p);

for (const query of QUERIES) {
  process.stdout.write(`  Searching "${query}"… `);
  const results = await search(query);
  let newCount = 0;

  for (const p of results) {
    const lnId = p.id;
    if (seen.has(lnId)) continue; // already found from another query

    const genres = (p.genre_ids || [])
      .map(id => GENRE_MAP[id])
      .filter(Boolean);

    const titleRaw = (p.title_original || p.title || '').trim();
    const descRaw  = stripHtml(p.description_original || p.description || '');

    seen.set(lnId, {
      id:          slugify(titleRaw || lnId),
      title:       titleRaw,
      host:        (p.publisher_original || p.publisher || '').trim(),
      description: descRaw,
      url:         p.website || '',
      rssUrl:      (p.rss || '').startsWith('http') ? p.rss : '',
      tags:        genres,
      emoji:       assignEmoji(titleRaw, descRaw),
      active:      false,
      // Discovery metadata — remove before copying to literary-podcasts.json
      _apple:          appleLink(p.itunes_id),
      _listenNotesUrl: p.listennotes_url || '',
    });
    newCount++;
  }

  console.log(`${results.length} results, ${newCount} new`);
  await new Promise(r => setTimeout(r, 400)); // polite pause
}

// ── Format + sort ──────────────────────────────────────────────────────────
const podcasts = [...seen.values()].sort((a, b) => {
  if (a._pinned && !b._pinned) return -1;  // pinned always first
  if (!a._pinned && b._pinned) return  1;
  return a.title.localeCompare(b.title);    // then alphabetical
});

// ── Save ───────────────────────────────────────────────────────────────────
writeFileSync(OUT_FILE, JSON.stringify(podcasts, null, 2));

// ── Print preview ──────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  Found ${podcasts.length} unique podcasts\n`);

podcasts.forEach((p, i) => {
  const pinned = p._pinned   ? ' ★ pinned' : '';
  const tags   = p.tags?.length ? `  Tags    : ${p.tags.join(', ')}\n` : '';
  const apple  = p._apple    ? `  Apple   : ${p._apple}\n` : '';
  const url    = p.url       ? `  URL     : ${p.url}\n` : '';
  const desc   = p.description
    ? `  ${p.description.slice(0, 120)}${p.description.length > 120 ? '…' : ''}\n`
    : '';

  console.log(`${String(i + 1).padStart(2)}. ${p.emoji}  ${p.title}${pinned}`);
  console.log(`    Host: ${p.host}`);
  if (tags)   process.stdout.write(tags);
  if (apple)  process.stdout.write(apple);
  if (url)    process.stdout.write(url);
  if (desc)   process.stdout.write(desc);
  console.log('');
});

console.log(`${'─'.repeat(60)}`);
console.log(`  Saved → scripts/podcasts-discovered.json\n`);
console.log('Next steps:');
console.log('  1. Review scripts/podcasts-discovered.json');
console.log('  2. Copy keepers into scripts/literary-podcasts.json');
console.log('  3. Set "active": true on the ones you want live');
console.log('  4. Remove the _pinned / _apple / _listenNotesUrl fields');
console.log('  5. Run: node scripts/import-podcasts.mjs --upload\n');
