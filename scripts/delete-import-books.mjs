#!/usr/bin/env node
/**
 * delete-import-books.mjs
 * Deletes all books docs whose ID starts with "import_".
 * Usage:
 *   node scripts/delete-import-books.mjs          # dry run
 *   node scripts/delete-import-books.mjs --delete  # execute
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
let refreshToken;
try {
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  refreshToken = cfg.tokens?.refresh_token;
  if (!refreshToken) throw new Error('No refresh_token found.');
} catch (err) {
  console.error('[auth] Could not read Firebase CLI credentials:', err.message);
  process.exit(1);
}

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

const PROJECT_ID = 'the-literary-roads';
const BOOKS_URL  = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/books`;

async function listAllBooks(accessToken) {
  const all = [];
  let pageToken = null;
  do {
    const url = pageToken ? `${BOOKS_URL}?pageToken=${pageToken}&pageSize=300` : `${BOOKS_URL}?pageSize=300`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const doc of (data.documents || [])) {
      const id = doc.name.split('/').pop();
      const title = doc.fields?.title?.stringValue || '';
      all.push({ id, title });
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return all;
}

async function deleteBook(accessToken, docId) {
  const url = `${BOOKS_URL}/${docId}`;
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Delete failed for ${docId}: ${res.status} ${await res.text()}`);
}

const DRY_RUN = !process.argv.includes('--delete');

(async () => {
  console.log(DRY_RUN ? '[delete-import-books] DRY RUN — pass --delete to execute' : '[delete-import-books] DELETE MODE');

  const token = await getAccessToken();
  const allBooks = await listAllBooks(token);
  const targets = allBooks.filter(b => b.id.startsWith('import_'));

  console.log(`\n${targets.length} import_ records found (${allBooks.length} total):\n`);
  targets.forEach(b => console.log(`  ${b.id}  —  "${b.title}"`));

  if (DRY_RUN) {
    console.log('\nRun with --delete to remove them.');
    return;
  }

  console.log('\nDeleting…');
  let ok = 0, fail = 0;
  for (const { id, title } of targets) {
    try {
      await deleteBook(token, id);
      console.log(`  ✓ deleted  ${id}  "${title}"`);
      ok++;
    } catch (err) {
      console.error(`  ✗ failed   ${id}: ${err.message}`);
      fail++;
    }
  }
  console.log(`\nDone — ${ok} deleted, ${fail} failed.`);
})();
