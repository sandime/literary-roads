#!/usr/bin/env node
// Literary Podcasts importer — uses Firebase CLI authentication
// Reads literary-podcasts.json and upserts each entry into Firestore via REST API.
//
// Prerequisites: firebase login  (already done — no service account key needed)
//
// Usage:
//   node scripts/import-podcasts.mjs                    → dry run
//   node scripts/import-podcasts.mjs --upload           → upsert all entries
//   node scripts/import-podcasts.mjs --upload --sync    → upsert + delete removed entries

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath }  from 'url';
import { dirname, join }  from 'path';
import { homedir }        from 'os';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const DATA_FILE  = join(__dirname, 'literary-podcasts.json');
const PROJECT_ID = 'the-literary-roads';
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Firebase CLI OAuth2 client credentials (public constants in firebase-tools source)
const CLI_CLIENT_ID     = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

// ── Get refresh token from Firebase CLI configstore ────────────────────────
function getCliRefreshToken() {
  const configFile = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!existsSync(configFile)) return null;
  try {
    return JSON.parse(readFileSync(configFile, 'utf8')).tokens?.refresh_token || null;
  } catch { return null; }
}

// ── Exchange refresh token → access token ─────────────────────────────────
async function getAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     CLI_CLIENT_ID,
      client_secret: CLI_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Token refresh failed: ${data.error_description || JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ── Firestore REST helpers ─────────────────────────────────────────────────
// Convert a plain JS object to a Firestore REST API "fields" map
function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (typeof v === 'string')  fields[k] = { stringValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (typeof v === 'number')  fields[k] = { integerValue: String(v) };
    else if (Array.isArray(v)) fields[k] = { arrayValue: { values: v.map(s => ({ stringValue: String(s) })) } };
    else if (v === null) fields[k] = { nullValue: null };
  }
  return fields;
}

async function fsGet(token, collection) {
  const res = await fetch(`${FS_BASE}/${collection}?pageSize=300`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${collection}: ${res.status} ${await res.text()}`);
  return (await res.json()).documents || [];
}

async function fsPatch(token, collection, docId, fields) {
  // Build field mask so we overwrite all supplied fields
  const mask = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const url  = `${FS_BASE}/${collection}/${encodeURIComponent(docId)}?${mask}`;
  const res  = await fetch(url, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`PATCH ${docId}: ${res.status} ${await res.text()}`);
}

async function fsDelete(token, collection, docId) {
  const res = await fetch(`${FS_BASE}/${collection}/${encodeURIComponent(docId)}`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`DELETE ${docId}: ${res.status} ${await res.text()}`);
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

// ── Upload ─────────────────────────────────────────────────────────────────
async function upload(podcasts, sync = false) {
  const refreshToken = getCliRefreshToken();
  if (!refreshToken) {
    console.error('✗ Firebase CLI credentials not found. Run: firebase login');
    process.exit(1);
  }

  process.stdout.write('Getting access token… ');
  const token = await getAccessToken(refreshToken);
  console.log('✓\n');

  // ── Delete orphaned docs ─────────────────────────────────────────────────
  if (sync) {
    console.log('Checking for removed entries…');
    const existing = await fsGet(token, 'literary_podcasts');
    const jsonIds  = new Set(podcasts.map(p => p.id));
    let deleted = 0;
    for (const d of existing) {
      const id = d.name.split('/').pop();
      if (!jsonIds.has(id)) {
        await fsDelete(token, 'literary_podcasts', id);
        const title = d.fields?.title?.stringValue || id;
        console.log(`  🗑  deleted: ${title}`);
        deleted++;
      }
    }
    console.log(deleted === 0 ? '  (no orphaned docs)\n' : '');
  }

  // ── Upsert ───────────────────────────────────────────────────────────────
  console.log('Uploading…');
  let uploaded = 0, failed = 0;

  for (const podcast of podcasts) {
    const { id, rssUrl, ...rest } = podcast;
    const fields = toFirestoreFields(rssUrl ? { ...rest, rssUrl } : rest);
    // Add server timestamp as a string (REST API doesn't support serverTimestamp directly)
    fields.updatedAt = { timestampValue: new Date().toISOString() };
    try {
      await fsPatch(token, 'literary_podcasts', id, fields);
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
  console.log('  node scripts/import-podcasts.mjs --upload --sync');
}

// ── Main ───────────────────────────────────────────────────────────────────
const podcasts = loadPodcasts();

if (process.argv.includes('--upload')) {
  const sync = process.argv.includes('--sync');
  console.log(`Uploading ${podcasts.length} podcasts${sync ? ' [sync — will delete removed]' : ''}…\n`);
  upload(podcasts, sync).catch(err => { console.error('✗', err.message); process.exit(1); });
} else {
  dryRun(podcasts);
}
