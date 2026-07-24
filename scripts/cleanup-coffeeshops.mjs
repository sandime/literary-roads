#!/usr/bin/env node
// Audit and soft-delete coffeeShops Firestore docs that are not actual coffee shops.
//
// Usage:
//   node scripts/cleanup-coffeeshops.mjs                        → dry run, all states
//   node scripts/cleanup-coffeeshops.mjs --state Oregon         → dry run, one state (name or abbr)
//   node scripts/cleanup-coffeeshops.mjs --delete               → soft-delete flagged docs
//   node scripts/cleanup-coffeeshops.mjs --state OR --delete    → soft-delete in one state
//   node scripts/cleanup-coffeeshops.mjs --state DC --keep "Compass Coffee,La Colombe" --delete
//                                                               → delete flagged, but protect named entries
//   node scripts/cleanup-coffeeshops.mjs --restore osm_node_123,osm_node_456
//                                                               → un-delete specific docs by ID

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.find((_, i) => argv[i - 1] === name);

const DRY_RUN     = !argv.includes('--delete') && !argv.includes('--restore');
const stateArg    = flag('--state');
const keepArg     = flag('--keep');
const restoreArg  = flag('--restore');

const KEEP_NAMES  = keepArg
  ? keepArg.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  : [];
const RESTORE_IDS = restoreArg
  ? restoreArg.split(',').map(s => s.trim()).filter(Boolean)
  : [];

// ── State name → abbreviation ─────────────────────────────────────────────────
// Firestore docs store addr:state from OSM, which is the 2-letter abbreviation.
const STATE_MAP = {
  alabama:'AL',alaska:'AK',arizona:'AZ',arkansas:'AR',california:'CA',
  colorado:'CO',connecticut:'CT',delaware:'DE',florida:'FL',georgia:'GA',
  hawaii:'HI',idaho:'ID',illinois:'IL',indiana:'IN',iowa:'IA',
  kansas:'KS',kentucky:'KY',louisiana:'LA',maine:'ME',maryland:'MD',
  massachusetts:'MA',michigan:'MI',minnesota:'MN',mississippi:'MS',
  missouri:'MO',montana:'MT',nebraska:'NE',nevada:'NV',
  'new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY',
  'north carolina':'NC','north dakota':'ND',ohio:'OH',oklahoma:'OK',
  oregon:'OR',pennsylvania:'PA','rhode island':'RI','south carolina':'SC',
  'south dakota':'SD',tennessee:'TN',texas:'TX',utah:'UT',vermont:'VT',
  virginia:'VA',washington:'WA','west virginia':'WV',wisconsin:'WI',
  wyoming:'WY','district of columbia':'DC',dc:'DC',
};

function resolveState(input) {
  if (!input) return null;
  const lower = input.toLowerCase().trim();
  // Full name lookup
  if (STATE_MAP[lower]) return STATE_MAP[lower];
  // Already an abbreviation
  const upper = input.toUpperCase().trim();
  if (upper.length <= 3) return upper;
  return upper;
}

const STATE_FILTER = stateArg ? resolveState(stateArg) : null;

// ── Firebase CLI OAuth2 auth ──────────────────────────────────────────────────
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

// ── Classification ────────────────────────────────────────────────────────────
const COFFEE_KEYWORDS = [
  'coffee', 'espresso', 'roaster', 'roastery', 'java', 'cafe', 'caffè',
  'cappuccino', 'latte', 'cortado', 'pour over', 'cold brew', 'coffeehouse',
  'coffee house', 'brew', 'barista', 'percolator', 'drip bar',
];

const CHAIN_NAMES = [
  'starbucks', 'dunkin', 'peets', "peet's", 'caribou', 'coffee bean',
  'tim hortons', 'biggby', 'dutch bros', 'scooters coffee', 'dunn brothers',
  'black rock coffee', 'stumptown', 'philz', 'blue bottle', 'intelligentsia',
  'panera', 'au bon pain', "mcdonald's", 'mcdonald', 'burger king', '7-eleven',
  'circle k', 'wawa', 'sheetz',
];

function classify(doc) {
  if (doc.deleted === true) return 'already-deleted';
  const name = (doc.name || '').toLowerCase();
  if (CHAIN_NAMES.some(c => name.includes(c))) return 'chain';
  if (COFFEE_KEYWORDS.some(k => name.includes(k))) return 'keep';
  return 'remove';
}

// ── Firestore REST helpers ────────────────────────────────────────────────────
const PROJECT_ID = 'the-literary-roads';
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function fetchAllDocs(token) {
  const docs = [];
  let pageToken = null;
  do {
    const url = `${FS_BASE}/coffeeShops?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`List coffeeShops → ${res.status}`);
    const data = await res.json();
    (data.documents || []).forEach(d => docs.push(parseDoc(d)));
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return docs;
}

function parseDoc(raw) {
  const fields = raw.fields || {};
  const str  = (k) => fields[k]?.stringValue  ?? null;
  const bool = (k) => fields[k]?.booleanValue ?? null;
  return {
    id:      raw.name.split('/').pop(),
    name:    str('name')  || '',
    city:    str('city')  || '',
    state:   str('state') || '',
    deleted: bool('deleted') || false,
    source:  str('source') || '',
  };
}

async function patchDeleted(id, value, token) {
  const body = { fields: { deleted: { booleanValue: value } } };
  const res = await fetch(`${FS_BASE}/coffeeShops/${id}?updateMask.fieldPaths=deleted`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${id} → ${res.status}: ${text}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('='.repeat(60));
console.log('  Literary Roads — Coffee Shop DB Cleanup');
if (RESTORE_IDS.length) {
  console.log(`  Mode: RESTORE (${RESTORE_IDS.length} doc IDs)`);
} else {
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (add --delete to apply)' : 'LIVE DELETE'}`);
}
if (STATE_FILTER) console.log(`  State: ${stateArg} → ${STATE_FILTER}`);
if (KEEP_NAMES.length) console.log(`  Protected names: ${KEEP_NAMES.join(', ')}`);
console.log('='.repeat(60));

const refreshToken = getCliRefreshToken();
if (!refreshToken) {
  console.error('\n✗ Firebase CLI credentials not found. Run: firebase login');
  process.exit(1);
}

let token;
try {
  token = await getFirebaseToken(refreshToken);
  console.log('\n✓ Firebase auth OK\n');
} catch (err) {
  console.error(`\n✗ Auth failed: ${err.message}`);
  console.error('  Try: firebase login --reauth');
  process.exit(1);
}

// ── Restore mode ──────────────────────────────────────────────────────────────
if (RESTORE_IDS.length) {
  console.log(`  Restoring ${RESTORE_IDS.length} doc(s)...\n`);
  let ok = 0, fail = 0;
  for (const id of RESTORE_IDS) {
    try {
      await patchDeleted(id, false, token);
      console.log(`  ✓ Restored: ${id}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ Failed: ${id} — ${err.message}`);
      fail++;
    }
  }
  console.log(`\n  Restored: ${ok}  Failed: ${fail}\n`);
  process.exit(fail > 0 ? 1 : 0);
}

// ── Audit + delete mode ───────────────────────────────────────────────────────
console.log('  Fetching all coffeeShops docs...');
const allDocs = await fetchAllDocs(token);
console.log(`  Total docs in collection: ${allDocs.length}\n`);

const docs = STATE_FILTER
  ? allDocs.filter(d => (d.state || '').toUpperCase() === STATE_FILTER)
  : allDocs;

if (STATE_FILTER) console.log(`  Docs matching ${STATE_FILTER}: ${docs.length}\n`);

const keep        = docs.filter(d => classify(d) === 'keep');
const remove      = docs.filter(d => classify(d) === 'remove');
const chains      = docs.filter(d => classify(d) === 'chain');
const alreadyGone = docs.filter(d => classify(d) === 'already-deleted');

// Apply --keep protection (name substring match, case-insensitive)
const isProtected = (d) =>
  KEEP_NAMES.some(k => (d.name || '').toLowerCase().includes(k) || d.id === k);

const toDelete   = [...remove, ...chains].filter(d => !isProtected(d));
const protected_ = [...remove, ...chains].filter(d =>  isProtected(d));

// ── Report ────────────────────────────────────────────────────────────────────
console.log('─'.repeat(60));
console.log(`  KEEP    (coffee keyword in name):  ${keep.length}`);
console.log(`  REMOVE  (no coffee keyword):        ${remove.length}`);
console.log(`  CHAINS  (flagged chain name):       ${chains.length}`);
console.log(`  ALREADY deleted:                    ${alreadyGone.length}`);
if (protected_.length) console.log(`  PROTECTED by --keep:               ${protected_.length}`);
console.log('─'.repeat(60));

if (remove.length > 0) {
  const byState = {};
  remove.forEach(d => {
    const s = d.state || '(no state)';
    if (!byState[s]) byState[s] = [];
    byState[s].push(d);
  });

  console.log('\n  TO BE REMOVED (no coffee keyword):');
  Object.entries(byState)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([state, entries]) => {
      console.log(`\n  ${state} (${entries.length}):`);
      entries.forEach(d => {
        const prot = isProtected(d) ? ' [PROTECTED]' : '';
        console.log(`    • [${d.id}]${prot} ${d.name}${d.city ? ` — ${d.city}` : ''}`);
      });
    });
}

if (chains.length > 0) {
  console.log('\n  CHAINS (should not be in DB):');
  chains.forEach(d => {
    const prot = isProtected(d) ? ' [PROTECTED]' : '';
    console.log(`    • [${d.id}]${prot} ${d.name}${d.city ? ` — ${d.city}` : ''}`);
  });
}

if (protected_.length > 0) {
  console.log('\n  PROTECTED (--keep match, will not be deleted):');
  protected_.forEach(d => console.log(`    • [${d.id}] ${d.name}${d.city ? ` — ${d.city}` : ''}`));
}

if (DRY_RUN) {
  console.log(`\n  Dry run complete.`);
  console.log(`  ${toDelete.length} doc(s) would be soft-deleted.`);
  if (protected_.length) console.log(`  ${protected_.length} doc(s) protected by --keep.`);
  console.log('\n  To apply:   add --delete');
  console.log('  To protect: add --keep "Name One,Name Two"');
  console.log('  To restore: node scripts/cleanup-coffeeshops.mjs --restore id1,id2\n');
  process.exit(0);
}

if (toDelete.length === 0) {
  console.log('\n  Nothing to delete. Collection is clean.\n');
  process.exit(0);
}

console.log(`\n  Soft-deleting ${toDelete.length} docs...\n`);
let deleted = 0, failed = 0;
for (const d of toDelete) {
  try {
    await patchDeleted(d.id, true, token);
    deleted++;
    process.stdout.write(`\r  Progress: ${deleted + failed}/${toDelete.length}  (deleted: ${deleted}, failed: ${failed})`);
  } catch (err) {
    failed++;
    console.error(`\n  ✗ Failed ${d.id}: ${err.message}`);
  }
}

console.log('\n\n' + '='.repeat(60));
console.log('  Done');
console.log(`  Soft-deleted: ${deleted}`);
if (failed)      console.log(`  Failed:       ${failed}`);
if (protected_.length) console.log(`  Protected:    ${protected_.length} (skipped)`);
console.log('='.repeat(60));
console.log('\n  To restore specific entries:');
console.log('  node scripts/cleanup-coffeeshops.mjs --restore id1,id2\n');

process.exit(failed > 0 ? 1 : 0);
