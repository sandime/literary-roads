#!/usr/bin/env node
/**
 * remove-chain.mjs
 *
 * Finds every document in the coffeeShops collection whose name contains
 * a given term (case-insensitive) and deletes it.
 *
 * Usage:
 *   node scripts/remove-chain.mjs "dunkin"              # dry run
 *   node scripts/remove-chain.mjs "dunkin" --delete     # permanently deletes
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const term = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!term) {
  console.error('Usage: node scripts/remove-chain.mjs "<search term>" [--delete]');
  process.exit(1);
}

const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
let refreshToken;
try {
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  refreshToken = cfg.tokens?.refresh_token;
  if (!refreshToken) throw new Error('No refresh_token found.');
} catch (err) {
  console.error('[auth]', err.message, '— run: firebase login --reauth');
  process.exit(1);
}

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

const PROJECT_ID = 'the-literary-roads';
const SHOPS_URL  = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/coffeeShops`;

async function listAllShops(token) {
  const all = [];
  let pageToken = null;
  do {
    const url = pageToken
      ? `${SHOPS_URL}?pageToken=${pageToken}&pageSize=300`
      : `${SHOPS_URL}?pageSize=300`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const doc of (data.documents || [])) {
      const id    = doc.name.split('/').pop();
      const name  = doc.fields?.name?.stringValue  || '';
      const city  = doc.fields?.city?.stringValue  || '';
      const state = doc.fields?.state?.stringValue || '';
      all.push({ id, name, city, state });
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return all;
}

async function deleteDoc(token, docId) {
  const res = await fetch(`${SHOPS_URL}/${docId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Delete failed for ${docId}: ${res.status} ${await res.text()}`);
}

const DRY_RUN = !process.argv.includes('--delete');
const needle  = term.toLowerCase();

(async () => {
  console.log(DRY_RUN
    ? `\n[remove-chain] DRY RUN  search: "${term}"  — pass --delete to permanently remove`
    : `\n[remove-chain] DELETE MODE  search: "${term}"`);

  const token   = await getAccessToken();
  const all     = await listAllShops(token);
  const matches = all.filter(s => s.name.toLowerCase().includes(needle));

  console.log(`\n${matches.length} match${matches.length !== 1 ? 'es' : ''} found in coffeeShops (${all.length} total docs):\n`);
  matches.forEach(({ id, name, city, state }) => {
    const loc = [city, state].filter(Boolean).join(', ');
    console.log(`  ${id.padEnd(40)}  ${name}${loc ? `  (${loc})` : ''}`);
  });

  if (DRY_RUN) {
    console.log('\nRun with --delete to remove them.\n');
    return;
  }

  console.log('\nDeleting…');
  let ok = 0, fail = 0;
  for (const { id, name } of matches) {
    try {
      await deleteDoc(token, id);
      console.log(`  ✓  ${name}  (${id})`);
      ok++;
    } catch (err) {
      console.error(`  ✗  ${name}: ${err.message}`);
      fail++;
    }
  }
  console.log(`\nDone — ${ok} deleted, ${fail} failed.\n`);
})();
