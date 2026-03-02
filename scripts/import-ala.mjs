#!/usr/bin/env node
// ALA Literary Landmarks importer
// Usage:
//   node scripts/import-ala.mjs            → parse only, prints first 5 as sample
//   node scripts/import-ala.mjs --upload   → geocode + upload all to Firestore

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANDMARKS_FILE = join(__dirname, '..', 'ala-landmarks.txt');
const GOOGLE_API_KEY = 'AIzaSyBPOAB29KqPB5noMr4RIo-FsW3Itx0vu5k';

// ── State abbreviation → full name ─────────────────────────────────────────
const STATE_MAP = {
  'Ala.': 'Alabama',    'AZ': 'Arizona',       'Ariz.': 'Arizona',
  'Ark.': 'Arkansas',   'Calif.': 'California', 'Colo.': 'Colorado',
  'Conn.': 'Connecticut','Del.': 'Delaware',    'D.C.': 'District of Columbia',
  'Fla.': 'Florida',    'Ga.': 'Georgia',       'Hawaii': 'Hawaii',
  'Idaho': 'Idaho',     'Ill.': 'Illinois',     'Ind.': 'Indiana',
  'Iowa': 'Iowa',       'Kan.': 'Kansas',        'Ky.': 'Kentucky',
  'La.': 'Louisiana',   'Maine': 'Maine',        'Md.': 'Maryland',
  'Mass.': 'Massachusetts', 'Mich.': 'Michigan', 'Minn.': 'Minnesota',
  'MN': 'Minnesota',    'Miss.': 'Mississippi',  'Mo.': 'Missouri',
  'Mont.': 'Montana',   'Nebr.': 'Nebraska',     'Neb.': 'Nebraska',
  'Nev.': 'Nevada',     'N.H.': 'New Hampshire', 'N.J.': 'New Jersey',
  'N.M.': 'New Mexico', 'N.Y.': 'New York',      'N.C.': 'North Carolina',
  'N.D.': 'North Dakota','Ohio': 'Ohio',         'Okla.': 'Oklahoma',
  'Ore.': 'Oregon',     'Pa.': 'Pennsylvania',   'R.I.': 'Rhode Island',
  'S.C.': 'South Carolina','S.D.': 'South Dakota','Tenn.': 'Tennessee',
  'Texas': 'Texas',     'Tex.': 'Texas',          'Utah': 'Utah',
  'Vt.': 'Vermont',     'Va.': 'Virginia',        'Wash.': 'Washington',
  'W.Va.': 'West Virginia','Wis.': 'Wisconsin',  'Wyo.': 'Wyoming',
};

// Build regex: longest abbreviations first to avoid partial matches (N.Y. before N.)
// Abbrevs that already end with "." (e.g. "Ala.") should NOT have an extra \. appended;
// abbrevs without a dot (e.g. "AZ", "Iowa") need \. to match the sentence-ending period.
const STATE_ABBREVS_SORTED = Object.keys(STATE_MAP).sort((a, b) => b.length - a.length);
const escapedAbbrevs = STATE_ABBREVS_SORTED.map(s => s.replace(/\./g, '\\.'));
const LOCATION_RE = new RegExp(
  `,\\s+([^,]+?),\\s+(${escapedAbbrevs.join('|')})\\.?(?=\\s|$)`,
);

// ── Description trimmer ────────────────────────────────────────────────────
// Takes up to 2 sentences; hard-caps at 160 chars if a single sentence is still too long.
function trimDescription(raw, maxChars = 160) {
  if (!raw) return '';
  // Strip leading lifespan "(1947-2013)" left over after author-name removal
  let text = raw.replace(/^\s*\(\d{4}-\d{4}\)\s*/, '').trim();
  // Split only on ". " where at least 3 lowercase letters precede the period, or a digit
  // (avoids splitting on short abbreviations: "Col.", "St.", "Jr.", "B.", "Ala.", etc.)
  const sentences = text.split(/(?<=[a-z]{3,}|\d)\.\s+(?=[A-Z])/);
  let result = '';
  for (const sentence of sentences) {
    const next = result ? `${result}. ${sentence}` : sentence;
    if (next.length <= maxChars) {
      result = next;
    } else {
      break;
    }
  }
  // If even the first sentence exceeds maxChars, truncate at last word boundary
  if (!result) {
    result = text.substring(0, maxChars).replace(/\s+\S*$/, '') + '\u2026';
  } else if (!result.endsWith('.')) {
    result += '.';
  }
  const final = result.trim();
  // Capitalize first letter (can be lower if we stripped a leading "Author Name" prefix)
  return final.charAt(0).toUpperCase() + final.slice(1);
}

// ── Parser ─────────────────────────────────────────────────────────────────
function parseLandmarks() {
  const text = readFileSync(LANDMARKS_FILE, 'utf8');
  const lines = text.split('\n');
  let currentState = '';
  const landmarks = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const yearMatch = line.match(/^(\d{4})\s+(.+)/);
    if (!yearMatch) {
      // Section header — state name
      const candidate = line.trim();
      if (candidate && !candidate.match(/^\d/) && candidate.length < 40) {
        currentState = candidate.replace(/\s+/g, ' ');
      }
      continue;
    }

    const year = parseInt(yearMatch[1]);
    const rest = yearMatch[2];

    // ── Extract city/state from ", City, StateAbbr." pattern ────────────
    const locMatch = rest.match(LOCATION_RE);
    let name, city, state, descRaw;

    if (locMatch) {
      const locStart = rest.indexOf(locMatch[0]);
      name    = rest.substring(0, locStart).trim().replace(/,\s*$/, '');
      city    = locMatch[1].trim();
      state   = STATE_MAP[locMatch[2]] || currentState;
      descRaw = rest.substring(locStart + locMatch[0].length).trim();
    } else {
      // Fallback: no standard city/state found
      name    = rest.split(/[.,]/)[0].trim();
      city    = '';
      state   = currentState;
      descRaw = rest;
    }

    // ── Extract author ──────────────────────────────────────────────────
    // Pattern 1: "Landmark Name - Author Name" — dash separates name from author
    // Must match a dash surrounded by spaces that isn't inside initials (T.S.)
    let author = '';
    const dashMatch = name.match(/\s{1,2}-\s{1,2}(.+)$/);
    if (dashMatch) {
      author = dashMatch[1].trim();
      name   = name.substring(0, name.indexOf(dashMatch[0])).trim();
    }
    // Pattern 2: "Author Firstname [Initial.] Lastname" at start of description
    // Strictly 2-3 words: first name, optional middle initial, last name
    if (!author) {
      const authorMatch = descRaw.match(
        /^Author\s+([A-Z][a-zA-Z]+\.?(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-zA-Z]{2,}))/
      );
      if (authorMatch) {
        author  = authorMatch[1].trim();
        // Strip "Author [Name]" prefix from description
        descRaw = descRaw.substring(authorMatch[0].length).trim();
      }
    }

    // ── Extract dedication year ──────────────────────────────────────────
    const dedicatedMatch = descRaw.match(/Dedicated\s+(?:\w+\.?\s+\d+,\s+)?(\d{4})/);
    const dedicatedYear  = dedicatedMatch ? parseInt(dedicatedMatch[1]) : year;

    // ── Clean description (strip boilerplate, then trim to 2 sentences / ~150 chars) ──
    const cleaned = descRaw
      .replace(/\s*Dedicated[:\s][^.]+\.\s*/g, ' ')
      .replace(/\s*Partners?:\s[^.]*\./g, '')
      .replace(/\s*Partner:\s[^.]*\./g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const description = trimDescription(cleaned);

    landmarks.push({
      name:        name.trim(),
      city,
      state,
      description: description || cleaned.substring(0, 150),
      author,
      year:        dedicatedYear,
      type:        'landmark',
      source:      'ALA',
      sourceUrl:   'https://www.ala.org/',
    });
  }

  return landmarks;
}

// ── Geocoding ──────────────────────────────────────────────────────────────
async function geocode(city, state) {
  const address = city ? `${city}, ${state}, USA` : `${state}, USA`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results[0]) return null;
  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng };
}

// ── Firestore upload ───────────────────────────────────────────────────────
async function uploadToFirestore(landmarks) {
  const { initializeApp, getApps } = await import('firebase/app');
  const { getFirestore, collection, setDoc, doc } = await import('firebase/firestore');

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        apiKey:            'AIzaSyBlKiGzXCTIgjqjzDROB_dywrjJntizkYE',
        authDomain:        'the-literary-roads.firebaseapp.com',
        projectId:         'the-literary-roads',
        storageBucket:     'the-literary-roads.firebasestorage.app',
        messagingSenderId: '305145573086',
        appId:             '1:305145573086:web:206ec464384fe149c45c4f',
      });

  const db     = getFirestore(app);
  const colRef = collection(db, 'literary_landmarks');

  let uploaded = 0, skipped = 0, failed = 0;

  for (const lm of landmarks) {
    let coords = null;
    try {
      coords = await geocode(lm.city, lm.state);
      await new Promise(r => setTimeout(r, 120)); // stay under geocoding rate limit
    } catch (err) {
      console.warn(`  Geocoding error for "${lm.name}": ${err.message}`);
    }

    if (!coords) {
      console.warn(`  ⚠ Skipped (no coordinates): ${lm.name} — ${lm.city}, ${lm.state}`);
      skipped++;
      continue;
    }

    // Deterministic slug → safe to re-run without creating duplicates
    const slug = `ala_${lm.year}_${lm.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50)}`;

    try {
      await setDoc(doc(colRef, slug), { ...lm, lat: coords.lat, lng: coords.lng });
      console.log(`  ✓ ${lm.name}  (${lm.city || lm.state})`);
      uploaded++;
    } catch (err) {
      console.error(`  ✗ Failed: ${lm.name} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${uploaded} uploaded, ${skipped} skipped (no coords), ${failed} errors`);
  process.exit(0);
}

// ── Main ───────────────────────────────────────────────────────────────────
const landmarks = parseLandmarks();

if (process.argv.includes('--upload')) {
  console.log(`Geocoding and uploading ${landmarks.length} landmarks to Firestore…\n`);
  uploadToFirestore(landmarks).catch(err => { console.error(err); process.exit(1); });
} else {
  // Default: show first 5 for format verification
  console.log('── First 5 parsed landmarks (sample) ──\n');
  console.log(JSON.stringify(landmarks.slice(0, 5), null, 2));
  console.log(`\n── Total parsed: ${landmarks.length} landmarks ──`);
  console.log('\nVerify the format above, then run:');
  console.log('  node scripts/import-ala.mjs --upload');
}
