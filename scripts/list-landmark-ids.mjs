#!/usr/bin/env node
/**
 * list-landmark-ids.mjs
 *
 * Dumps every literary_landmarks document ID alongside the landmark name
 * so you can match them to your ElevenLabs MP3 files before uploading.
 *
 * Usage:
 *   node scripts/list-landmark-ids.mjs
 *   node scripts/list-landmark-ids.mjs > landmark-ids.txt
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

const PROJECT_ID    = 'the-literary-roads';
const LANDMARKS_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/literary_landmarks`;

async function listAllLandmarks(token) {
  const all = [];
  let pageToken = null;
  do {
    const url = pageToken
      ? `${LANDMARKS_URL}?pageToken=${pageToken}&pageSize=300`
      : `${LANDMARKS_URL}?pageSize=300`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const doc of (data.documents || [])) {
      const id      = doc.name.split('/').pop();
      const name    = doc.fields?.name?.stringValue    || '';
      const city    = doc.fields?.city?.stringValue    || '';
      const state   = doc.fields?.state?.stringValue   || '';
      const deleted = doc.fields?.deleted?.booleanValue || false;
      all.push({ id, name, city, state, deleted });
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return all;
}

(async () => {
  const token     = await getAccessToken();
  const landmarks = await listAllLandmarks(token);

  const active  = landmarks.filter(l => !l.deleted);
  const deleted = landmarks.filter(l =>  l.deleted);

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`  literary_landmarks — ${active.length} active  (${deleted.length} deleted, not shown)`);
  console.log(`${'─'.repeat(80)}\n`);
  console.log(`  ${'DOCUMENT ID'.padEnd(55)}  NAME`);
  console.log(`  ${'─'.repeat(54)}  ${'─'.repeat(40)}`);

  active
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach(({ id, name, city, state }) => {
      const location = [city, state].filter(Boolean).join(', ');
      console.log(`  ${id.padEnd(55)}  ${name}${location ? `  (${location})` : ''}`);
    });

  console.log(`\n  MP3 files go in: public/sounds/narrations/{id}.mp3\n`);
})();
