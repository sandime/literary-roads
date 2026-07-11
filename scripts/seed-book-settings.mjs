#!/usr/bin/env node
// One-time batch script: enrich books in Firestore with AI-generated setting tags.
//
// Queries all books without a settings array, calls Claude to infer settings,
// writes results back. Designed to be re-run safely (skips already-enriched books).
//
// NOTE: This is the ONLY setting-tagging mechanism. There is intentionally no
// Cloud Function trigger for new books — add that later when there is regular
// new-book traffic to justify it. The enrichment logic here can be reused verbatim.
//
// Prerequisites:
//   firebase login                            (already done)
//   ANTHROPIC_API_KEY=sk-ant-...             (set in environment or .env.local)
//
// Usage:
//   node scripts/seed-book-settings.mjs             → dry run
//   node scripts/seed-book-settings.mjs --upload    → write to Firestore
//   node scripts/seed-book-settings.mjs --limit 10  → process only 10 books

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN   = !process.argv.includes('--upload');
const limitArg  = process.argv.find((_, i) => process.argv[i - 1] === '--limit');
const LIMIT     = limitArg ? parseInt(limitArg, 10) : Infinity;

const PROJECT_ID = 'the-literary-roads';
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Firebase CLI OAuth2 auth (same pattern as import-podcasts.mjs) ────────────
const CLI_CLIENT_ID     = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function getCliRefreshToken() {
  const configFile = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!existsSync(configFile)) return null;
  try {
    return JSON.parse(readFileSync(configFile, 'utf8')).tokens?.refresh_token || null;
  } catch { return null; }
}

async function getFirebaseToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token', refresh_token: refreshToken,
      client_id: CLI_CLIENT_ID, client_secret: CLI_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${data.error_description || JSON.stringify(data)}`);
  return data.access_token;
}

// ── Anthropic API ─────────────────────────────────────────────────────────────
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL  = 'claude-sonnet-4-6';

async function inferSettings(book) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set');

  const prompt = `You are a literary geography assistant. Given a book's metadata, identify its primary setting(s) as structured data.

Book: "${book.title}"
Author(s): ${(book.authors || []).join(', ')}
Categories: ${(book.categories || []).join(', ')}
Description: ${(book.description || '').slice(0, 800)}

Return a JSON array of setting objects. Each object must have:
- "place": the name of the place (e.g. "Montana", "Paris", "The Hundred Acre Wood")
- "type": one of: state, city, country, region, house, vessel, planet, fictional_town, fictional_world, journey
- "confidence": "high", "medium", or "low"
- "source": "ai-generated"

Rules:
- Only include settings that are clearly supported by the description/title/categories.
- "high" = the book is unmistakably set there and the place is central to the story.
- "medium" = the setting is likely but not stated explicitly in the description.
- "low" = possible but uncertain.
- If the book has no identifiable real or fictional place setting (e.g. pure concept nonfiction), return an empty array [].
- Washington D.C. / District of Columbia → type: "state", place: "District of Columbia"
- Puerto Rico → type: "state", place: "Puerto Rico"
- Alaska and Hawaii → type: "state" (same as other US states)
- Return ONLY the JSON array, no other text.

Example: [{"place":"Montana","type":"state","confidence":"high","source":"ai-generated"}]`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() || '[]';

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn(`    ⚠ Could not parse JSON: ${text.slice(0, 80)}`);
    return [];
  }
}

// ── Firestore REST helpers ─────────────────────────────────────────────────────
function fromFirestoreValue(v) {
  if (v.stringValue  !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue  !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue    !== undefined) return null;
  if (v.arrayValue)  return (v.arrayValue.values || []).map(fromFirestoreValue);
  if (v.mapValue)    return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, val]) => [k, fromFirestoreValue(val)]));
  if (v.timestampValue) return v.timestampValue;
  return null;
}

function fromFirestoreDoc(doc) {
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields || {})) obj[k] = fromFirestoreValue(v);
  return obj;
}

function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string')  return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, toFirestoreValue(val)])) } };
  return { nullValue: null };
}

async function listBooks(token) {
  const books = [];
  let pageToken = null;
  do {
    const url = `${FS_BASE}/books?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`List books: ${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const doc of (data.documents || [])) {
      const id = doc.name.split('/').pop();
      books.push({ id, ...fromFirestoreDoc(doc) });
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return books;
}

async function patchBook(token, bookId, fields) {
  const mask = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const url  = `${FS_BASE}/books/${encodeURIComponent(bookId)}?${mask}`;
  const res  = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`PATCH ${bookId}: ${res.status} ${await res.text()}`);
}

// ── Build denormalized index arrays for efficient Firestore queries ─────────────
function buildIndexes(settings) {
  const stateIndex   = [];
  const settingTypes = [];
  for (const s of settings) {
    if (s.confidence === 'high' || s.confidence === 'medium') {
      if (s.type === 'state') stateIndex.push(s.place.toLowerCase());
      settingTypes.push(s.type);
    }
  }
  return {
    stateIndex:   [...new Set(stateIndex)],
    settingTypes: [...new Set(settingTypes)],
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

console.log('='.repeat(60));
console.log('  Literary Roads — Book Settings Seed Script');
console.log(`  Mode:  ${DRY_RUN ? 'DRY RUN (add --upload to write)' : 'LIVE UPLOAD'}`);
console.log(`  Model: ${CLAUDE_MODEL}`);
console.log('='.repeat(60));

if (!ANTHROPIC_KEY) {
  console.error('\n✗ ANTHROPIC_API_KEY is not set.');
  console.error('  Run: export ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

const refreshToken = getCliRefreshToken();
if (!refreshToken) {
  console.error('\n✗ Firebase CLI credentials not found. Run: firebase login');
  process.exit(1);
}

console.log('\nGetting Firebase token…');
const token = await getFirebaseToken(refreshToken);
console.log('✓ Authenticated\n');

console.log('Loading books from Firestore…');
const allBooks = await listBooks(token);
console.log(`  Found ${allBooks.length} total books`);

// Only process books that don't yet have settings (enrichmentVersion 0 or missing)
const toProcess = allBooks
  .filter(b => !b.enrichmentVersion || b.enrichmentVersion < 1)
  .slice(0, LIMIT);

console.log(`  Books to enrich: ${toProcess.length}\n`);

if (toProcess.length === 0) {
  console.log('Nothing to do — all books already have settings.');
  process.exit(0);
}

const stats = { high: 0, medium: 0, low: 0, empty: 0, errors: 0 };

for (let i = 0; i < toProcess.length; i++) {
  const book = toProcess[i];
  process.stdout.write(`[${i + 1}/${toProcess.length}] ${book.title?.slice(0, 50) ?? book.id}… `);

  let settings;
  try {
    settings = await inferSettings(book);
  } catch (err) {
    console.log(`✗ ${err.message}`);
    stats.errors++;
    await sleep(2000);
    continue;
  }

  // Tally confidence levels
  const confidences = settings.map(s => s.confidence);
  if (settings.length === 0) {
    stats.empty++;
    console.log('(no setting)');
  } else if (confidences.includes('high')) {
    stats.high++;
    console.log(`✓ high — ${settings.find(s => s.confidence === 'high').place}`);
  } else if (confidences.includes('medium')) {
    stats.medium++;
    console.log(`~ medium — ${settings[0].place}`);
  } else {
    stats.low++;
    console.log(`? low — ${settings[0].place}`);
  }

  if (!DRY_RUN) {
    const { stateIndex, settingTypes } = buildIndexes(settings);
    const fields = {
      settings:          toFirestoreValue(settings),
      stateIndex:        toFirestoreValue(stateIndex),
      settingTypes:      toFirestoreValue(settingTypes),
      enrichmentVersion: toFirestoreValue(1),
      lastEnrichedAt:    { timestampValue: new Date().toISOString() },
    };
    try {
      await patchBook(token, book.id, fields);
    } catch (err) {
      console.error(`  ✗ Write failed: ${err.message}`);
      stats.errors++;
    }
  }

  // ~2 req/s to stay well within Anthropic rate limits
  if (i < toProcess.length - 1) await sleep(500);
}

console.log('\n' + '='.repeat(60));
console.log('  Summary');
console.log('='.repeat(60));
console.log(`  High confidence:    ${stats.high}`);
console.log(`  Medium confidence:  ${stats.medium}`);
console.log(`  Low confidence:     ${stats.low}`);
console.log(`  No setting found:   ${stats.empty}`);
console.log(`  Errors:             ${stats.errors}`);
if (DRY_RUN) console.log('\n  Run with --upload to write results to Firestore.');
console.log('='.repeat(60));
