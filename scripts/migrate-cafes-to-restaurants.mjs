#!/usr/bin/env node
// Move food-forward "Cafe" entries from coffeeshops → restaurants collection.
//
// Step 1 (review):  node scripts/migrate-cafes-to-restaurants.mjs
// Step 2 (execute): node scripts/migrate-cafes-to-restaurants.mjs --move
//                   node scripts/migrate-cafes-to-restaurants.mjs --move --exclude "Name1,Name2"

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const argv   = process.argv.slice(2);
const MOVE   = argv.includes('--move');
const excArg = argv.find((_, i) => argv[i - 1] === '--exclude');
const EXCLUDE = excArg ? excArg.split(',').map(s => s.trim().toLowerCase()) : [];

// ── Firebase CLI auth ─────────────────────────────────────────────────────────
const CLI_CLIENT_ID     = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function getCliRefreshToken() {
  const f = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!existsSync(f)) return null;
  try { return JSON.parse(readFileSync(f, 'utf8')).tokens?.refresh_token || null; }
  catch { return null; }
}

async function getToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     CLI_CLIENT_ID,
      client_secret: CLI_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${data.error_description || JSON.stringify(data)}`);
  return data.access_token;
}

// ── Firestore REST helpers ────────────────────────────────────────────────────
const PROJECT = 'the-literary-roads';
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function listAll(collection, token) {
  const docs = [];
  let pageToken = null;
  do {
    const url = `${FS_BASE}/${collection}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`List ${collection} → ${res.status}: ${await res.text()}`);
    const data = await res.json();
    for (const d of (data.documents || [])) docs.push(d);
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return docs;
}

// Parse a Firestore REST document into a plain object (all fields)
function parseDoc(raw) {
  const id = raw.name.split('/').pop();
  const fields = raw.fields || {};
  const parsed = { _id: id, _raw: raw };
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue  !== undefined) parsed[k] = v.stringValue;
    else if (v.booleanValue !== undefined) parsed[k] = v.booleanValue;
    else if (v.integerValue !== undefined) parsed[k] = Number(v.integerValue);
    else if (v.doubleValue  !== undefined) parsed[k] = v.doubleValue;
    else if (v.nullValue    !== undefined) parsed[k] = null;
    // arrays / maps left as-is for copy purposes (use raw fields)
  }
  return parsed;
}

// Copy a coffeeshop raw document into the restaurants collection under the same ID
async function copyToRestaurants(raw, token) {
  const id = raw.name.split('/').pop();
  const url = `${FS_BASE}/restaurants/${id}`;
  const body = { fields: raw.fields };
  const res = await fetch(url, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Copy ${id} to restaurants → ${res.status}: ${await res.text()}`);
}

async function deleteDoc(collection, id, token) {
  const url = `${FS_BASE}/${collection}/${id}`;
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`DELETE ${collection}/${id} → ${res.status}: ${await res.text()}`);
}

// ── Candidate filter ──────────────────────────────────────────────────────────
function isCandidate(doc) {
  if (doc.deleted === true) return false;

  const name = doc.name || '';
  const lower = name.toLowerCase();

  // Must contain "cafe" (case-insensitive)
  if (!lower.includes('cafe')) return false;

  // KEEP: Italian spelling "caffè"
  if (name.toLowerCase().includes('caffè')) return false;
  // Also catch "caffe" without accent just in case
  if (name.toLowerCase().includes('caffe ') || name.toLowerCase().endsWith('caffe')) return false;

  // KEEP: has both "cafe" and "coffee"
  if (lower.includes('coffee')) return false;

  // KEEP: user manually marked with "(coffee)"
  if (lower.includes('(coffee)')) return false;

  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const refreshToken = getCliRefreshToken();
if (!refreshToken) {
  console.error('No Firebase CLI token found. Run: firebase login');
  process.exit(1);
}

console.log('Authenticating via Firebase CLI token...');
const token = await getToken(refreshToken);
console.log('OK\n');

console.log('Fetching coffeeshops collection...');
const rawCoffeeDocs = await listAll('coffeeShops', token);
const coffeeDocs    = rawCoffeeDocs.map(parseDoc);
console.log(`  ${coffeeDocs.length} total docs\n`);

const candidates = coffeeDocs.filter(isCandidate);

if (!MOVE) {
  // ── Step 1: review mode ────────────────────────────────────────────────────
  console.log(`Found ${candidates.length} candidate(s) with "Cafe" in name (food-forward, not kept by any rule):\n`);

  const byState = {};
  for (const d of candidates) {
    const key = d.state || '??';
    if (!byState[key]) byState[key] = [];
    byState[key].push(d);
  }

  for (const state of Object.keys(byState).sort()) {
    console.log(`── ${state} ─────────────────────────────────────────────`);
    for (const d of byState[state].sort((a, b) => (a.city || '').localeCompare(b.city || ''))) {
      console.log(`  ${d.name.padEnd(45)} ${(d.city || '').padEnd(20)} ${d.state || ''}`);
    }
    console.log('');
  }

  console.log(`Total: ${candidates.length}`);
  console.log('\nTo move all of these to restaurants, run:');
  console.log('  node scripts/migrate-cafes-to-restaurants.mjs --move');
  console.log('\nTo exclude specific entries:');
  console.log('  node scripts/migrate-cafes-to-restaurants.mjs --move --exclude "Name1,Name2"');
  process.exit(0);
}

// ── Step 2: move mode ─────────────────────────────────────────────────────────
const toMove = candidates.filter(d => {
  const lower = (d.name || '').toLowerCase();
  return !EXCLUDE.some(ex => lower.includes(ex));
});

if (toMove.length === 0) {
  console.log('No candidates to move after exclusions.');
  process.exit(0);
}

console.log(`Fetching restaurants collection to check for duplicates...`);
const rawRestDocs  = await listAll('restaurants', token);
const restNames    = new Set(rawRestDocs.map(d => {
  const f = d.fields || {};
  return (f.name?.stringValue || '').toLowerCase().trim();
}));

console.log(`  ${rawRestDocs.length} existing restaurants\n`);
console.log(`Moving ${toMove.length} doc(s)...\n`);

let moved = 0, skipped = 0, errors = 0;

for (const doc of toMove) {
  const nameLower = (doc.name || '').toLowerCase().trim();
  if (restNames.has(nameLower)) {
    console.log(`  SKIP (already in restaurants): ${doc.name} — ${doc.city}, ${doc.state}`);
    skipped++;
    continue;
  }

  try {
    await copyToRestaurants(doc._raw, token);
    await deleteDoc('coffeeShops', doc._id, token);
    console.log(`  MOVED: ${doc.name} — ${doc.city}, ${doc.state}`);
    moved++;
  } catch (err) {
    console.error(`  ERROR: ${doc.name} — ${err.message}`);
    errors++;
  }
}

console.log(`\nDone. Moved: ${moved}  Skipped (duplicate): ${skipped}  Errors: ${errors}`);
