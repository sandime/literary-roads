/**
 * scrape-driveins.mjs
 *
 * Fetches drive-in theater listings from driveintheater.com,
 * geocodes each address via Mapbox, and writes drive-ins.csv.
 *
 * Usage:
 *   VITE_MAPBOX_TOKEN=pk.xxx node scripts/scrape-driveins.mjs
 *
 * Output: scripts/drive-ins.csv  (ready to upload via admin page)
 */

import { writeFileSync } from 'fs';

const MAPBOX_TOKEN = process.env.VITE_MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) {
  console.error('❌  Set VITE_MAPBOX_TOKEN env var before running.');
  process.exit(1);
}

// ── 1. Fetch the theater list page ──────────────────────────────────────────

console.log('📡  Fetching driveintheater.com/drivlist.htm …');
const res = await fetch('http://www.driveintheater.com/drivlist.htm', {
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const html = await res.text();
console.log(`✅  Got ${html.length.toLocaleString()} bytes`);

// ── 2. Parse theaters from HTML ──────────────────────────────────────────────
// The page is organized by state with entries like:
//   <b>Theater Name</b><br>123 Main St<br>City, ST 12345<br>
// We extract all text nodes and reconstruct entries.

const theaters = [];

// Strip tags but keep line structure — replace <br> with newlines first
const normalized = html
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<p[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, '')           // strip all remaining tags
  .replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ')
  .replace(/&#\d+;/g, '')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');

const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

// US state abbreviations for anchor detection
const STATE_ABBRS = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]);

// City, ST  or  City, ST ZIPCODE
const cityStateZipRe = /^(.+?),\s+([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/;

let i = 0;
while (i < lines.length) {
  const line = lines[i];

  // Look for a city/state line — that anchors an entry
  const m = cityStateZipRe.exec(line);
  if (m) {
    const city    = m[1].trim();
    const state   = m[2].trim();
    const zipcode = m[3] || '';

    if (STATE_ABBRS.has(state)) {
      // Line before city/state is the address (or might be name if no address)
      const prevLine  = i > 0 ? lines[i - 1] : '';
      // Line 2 before is likely the name
      const prev2Line = i > 1 ? lines[i - 2] : '';

      // Heuristic: address lines often contain digits; name lines usually don't start with digits
      let name    = '';
      let address = '';

      if (/^\d/.test(prevLine)) {
        // prevLine looks like a street address
        address = prevLine;
        name    = prev2Line;
      } else {
        // prevLine is the name, no street address
        name    = prevLine;
        address = '';
      }

      // Basic sanity: name should exist and not be a state header
      if (name && name.length > 2 && name.length < 120 && !name.match(/^[A-Z]{2}$/) && !name.match(/^\d{5}/)) {
        theaters.push({ name, address, city, state, zipcode });
      }
    }
  }
  i++;
}

console.log(`🎬  Found ${theaters.length} theater entries`);

if (theaters.length === 0) {
  // Dump a sample so we can debug the page structure
  console.log('\n⚠️  No entries parsed. First 60 lines of cleaned text:');
  lines.slice(0, 60).forEach((l, idx) => console.log(`  ${idx}: ${l}`));
  process.exit(1);
}

// ── 3. Geocode via Mapbox ────────────────────────────────────────────────────

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function geocode(theater) {
  const { name, address, city, state, zipcode } = theater;
  const query = [address, city, state, zipcode].filter(Boolean).join(', ');
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
    + `?country=US&types=address,poi&limit=1&access_token=${MAPBOX_TOKEN}`;

  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  const feature = data.features?.[0];
  if (!feature) return null;
  const [lng, lat] = feature.center;
  return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
}

console.log('🗺️  Geocoding addresses via Mapbox …');
const rows = [];
let geocoded = 0, failed = 0;

for (let j = 0; j < theaters.length; j++) {
  const t = theaters[j];
  process.stdout.write(`\r   ${j + 1}/${theaters.length}  (✓${geocoded} ✗${failed})`);

  const coords = await geocode(t);
  if (coords) {
    rows.push({ ...t, ...coords });
    geocoded++;
  } else {
    // Include without coords — admin page can geocode these as fallback
    rows.push({ ...t, lat: '', lng: '' });
    failed++;
  }

  // Stay well under Mapbox's 600 req/min limit
  await delay(120);
}

console.log(`\n✅  Geocoded: ${geocoded}  |  Failed: ${failed}`);

// ── 4. Write CSV ─────────────────────────────────────────────────────────────

const escape = (v) => {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

const HEADERS = ['name', 'address', 'city', 'state', 'zipcode', 'lat', 'lng'];
const csvLines = [
  HEADERS.join(','),
  ...rows.map(r => HEADERS.map(h => escape(r[h])).join(',')),
];

const outPath = new URL('./drive-ins.csv', import.meta.url).pathname;
writeFileSync(outPath, csvLines.join('\n'), 'utf8');
console.log(`\n📄  Wrote ${rows.length} rows → scripts/drive-ins.csv`);
console.log('🚀  Upload via admin page: select "Drive-In Theaters", switch to CSV mode');
