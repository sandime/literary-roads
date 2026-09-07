#!/usr/bin/env node
/**
 * migrate-import-books.mjs
 *
 * Copies every books doc whose ID starts with "import_" to a stable
 * titleAuthorSlug ID, then deletes the original.
 *
 * Usage:
 *   node scripts/migrate-import-books.mjs           # dry run
 *   node scripts/migrate-import-books.mjs --migrate  # execute
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
const BOOKS_URL  = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/books`;

function titleAuthorSlug(title, author) {
  return [title, author]
    .filter(Boolean)
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

async function listAllBooks(token) {
  const all = [];
  let pageToken = null;
  do {
    const url = pageToken ? `${BOOKS_URL}?pageToken=${pageToken}&pageSize=300` : `${BOOKS_URL}?pageSize=300`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const doc of (data.documents || [])) {
      all.push({ id: doc.name.split('/').pop(), fields: doc.fields });
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return all;
}

async function writeDoc(token, docId, fields) {
  const res = await fetch(`${BOOKS_URL}/${docId}`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Write failed for ${docId}: ${res.status} ${await res.text()}`);
}

async function deleteDoc(token, docId) {
  const res = await fetch(`${BOOKS_URL}/${docId}`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Delete failed for ${docId}: ${res.status} ${await res.text()}`);
}

const DRY_RUN = !process.argv.includes('--migrate');

(async () => {
  console.log(DRY_RUN
    ? '[migrate-import-books] DRY RUN — pass --migrate to execute'
    : '[migrate-import-books] MIGRATE MODE');

  const token    = await getAccessToken();
  const allBooks = await listAllBooks(token);

  const imports  = allBooks.filter(b => b.id.startsWith('import_'));
  const otherIds = new Set(allBooks.filter(b => !b.id.startsWith('import_')).map(b => b.id));

  console.log(`\n${imports.length} import_ records to migrate:\n`);

  const plan = imports.map(b => {
    const title  = b.fields?.title?.stringValue  || '';
    const author = (b.fields?.authors?.arrayValue?.values || [])[0]?.stringValue || '';
    const newId  = titleAuthorSlug(title, author);
    const clash  = otherIds.has(newId);
    return { oldId: b.id, newId, title, author, fields: b.fields, clash };
  });

  plan.forEach(p => {
    const flag = p.clash ? '  ⚠️  TARGET EXISTS — will skip' : '';
    console.log(`  ${p.oldId}`);
    console.log(`    → ${p.newId}${flag}`);
  });

  const toMigrate = plan.filter(p => !p.clash);
  const skipped   = plan.filter(p =>  p.clash);

  console.log(`\n${toMigrate.length} to migrate, ${skipped.length} skipped (target ID already exists)`);

  if (DRY_RUN) {
    console.log('\nRun with --migrate to execute.');
    return;
  }

  console.log('\nMigrating…');
  let ok = 0, fail = 0;

  for (const { oldId, newId, title, fields } of toMigrate) {
    try {
      await writeDoc(token, newId, fields);
      await deleteDoc(token, oldId);
      console.log(`  ✓  "${title}"\n     ${oldId} → ${newId}`);
      ok++;
    } catch (err) {
      console.error(`  ✗  "${title}": ${err.message}`);
      fail++;
    }
  }

  console.log(`\nDone — ${ok} migrated, ${fail} failed, ${skipped.length} skipped.`);
})();
