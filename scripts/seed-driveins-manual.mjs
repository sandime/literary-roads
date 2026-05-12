/**
 * seed-driveins-manual.mjs
 *
 * Geocodes 18 manually curated drive-in theaters via Mapbox and uploads
 * them to the Firestore `driveIns` collection.
 *
 * Usage:
 *   node scripts/seed-driveins-manual.mjs              → dry-run (geocodes, no upload)
 *   node scripts/seed-driveins-manual.mjs --upload     → write to Firestore
 *
 * Before --upload, temporarily open Firestore rules for driveIns:
 *   match /driveIns/{doc} { allow read, write: if true; }
 * Restore locked rules after upload completes.
 */

const DRY_RUN = !process.argv.includes('--upload');
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2hlcnJiZWFyIiwiYSI6ImNtbTQyMDV6eDA3aWMycnB6MTNwaXBzbzUifQ.p7Z5LU9CQPEkP8W7XGfWDw';

const RAW = [
  {
    name: 'Bay Drive-In',
    address: '45148 Bailey Settlement Rd',
    city: 'Redwood',
    state: 'NY',
    zip: '13679',
    website: 'https://www.baydrivein.com/',
    phone: '',
  },
  {
    name: 'Calvert Drive-In',
    address: '111 Drive-In Lane',
    city: 'Calvert City',
    state: 'KY',
    zip: '42029',
    website: 'https://www.thecalvertdrivein.com/',
    phone: '',
  },
  {
    name: 'Midway Twin Drive-In Theatre',
    address: '2736 OH-59',
    city: 'Ravenna',
    state: 'OH',
    zip: '44266',
    website: 'https://www.funflick.com/midway/',
    phone: '',
  },
  {
    name: 'Hilltop Drive-In Theater',
    address: 'Highway 8 & Highway 208',
    city: 'Chester',
    state: 'WV',
    zip: '26034',
    website: 'https://hilltopdriveintheater.com/',
    phone: '',
    _manualCoords: true,  // vague intersection — geocoder returns wrong state; add lat/lng manually
  },
  {
    name: "Swingin' Midway Drive-In",
    address: '2133 Hwy 30E',
    city: 'Athens',
    state: 'TN',
    zip: '37303',
    website: 'https://swinginmidwaydrivein.com/',
    phone: '(423) 263-2632',
  },
  {
    name: 'Grand River Drive-In',
    address: '1453 Grand River Pkwy N',
    city: 'Leeds',
    state: 'AL',
    zip: '35094',
    website: 'https://www.grandriverdrive-in.com/',
    phone: '(205) 352-9180',
  },
  {
    name: 'Dependable Drive-In',
    address: '549 Moon Clinton Road',
    city: 'Moon Township',
    state: 'PA',
    zip: '15108',
    website: 'https://www.dependabledrivein.com/',
    phone: '412-264-7011',
  },
  {
    name: 'Georgetown Drive-In Theatre',
    address: '8200 State Road 64',
    city: 'Georgetown',
    state: 'IN',
    zip: '',
    website: 'https://georgetowndrivein.com/',
    phone: '(812) 951-2616',
  },
  {
    name: 'West Wind Las Vegas Drive-In',
    address: '4150 W Carey Ave',
    city: 'North Las Vegas',
    state: 'NV',
    zip: '',
    website: 'https://www.westwinddi.com/locations/las-vegas',
    phone: '',
  },
  {
    name: 'Silver Lake Twin Drive-In',
    address: '7037 Chapman Ave',
    city: 'Perry',
    state: 'NY',
    zip: '14530',
    website: 'https://charcoalcorral.com/silver-lake-twin-drive-in/',
    phone: '585-237-5270',
  },
  {
    name: 'Super 322 Drive-In',
    address: '1682 Woodland-Bigler Hwy',
    city: 'Woodland',
    state: 'PA',
    zip: '16881',
    website: 'https://www.super322drive-in.com/',
    phone: '(814) 857-7821',
  },
  {
    name: 'US 23 Drive-In',
    address: '5200 Fenton Rd',
    city: 'Flint',
    state: 'MI',
    zip: '48507',
    website: 'https://www.us23driveintheater.com/',
    phone: '810-238-0751',
  },
  {
    name: 'Vintage Drive-In',
    address: '1520 W Henrietta Rd',
    city: 'Avon',
    state: 'NY',
    zip: '14414',
    website: 'https://vintagedrivein.com/',
    phone: '(585) 226-9290',
  },
  {
    name: 'Ocala Drive-In',
    address: '4850 S Pine Ave',
    city: 'Ocala',
    state: 'FL',
    zip: '34480',
    website: 'https://ocaladrivein.info/',
    phone: '',
  },
  {
    name: 'Stone Drive-In Theatre',
    address: '808 Theatre Lane',
    city: 'Mountain View',
    state: 'AR',
    zip: '72560',
    website: 'https://www.stonedrivein.net/',
    phone: '',
  },
  {
    name: 'Parkway Drive-In',
    address: '2909 E. Lamar Alexander Pkwy.',
    city: 'Maryville',
    state: 'TN',
    zip: '37804',
    website: 'https://www.parkwaydrivein.com/',
    phone: '865-379-9865',
  },
  {
    name: 'Cumberland Drive-In Theatre',
    address: '3290 Ritner Highway',
    city: 'Newville',
    state: 'PA',
    zip: '17241',
    website: 'https://www.81fun.com/cumberland/',
    phone: '(717) 776-5212',
  },
  {
    name: 'Swan Drive-In Theater',
    address: '651 Summit St',
    city: 'Blue Ridge',
    state: 'GA',
    zip: '30513',
    website: 'https://swandrivein.com/',
    phone: '(706) 632-5235',
  },
];

// ── Geocoding ─────────────────────────────────────────────────────────────────

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function geocode({ name, address, city, state, zip }) {
  const query = [address, city, state, zip].filter(Boolean).join(', ');
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
    + `?country=US&types=address,poi&limit=1&access_token=${MAPBOX_TOKEN}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.center;
    return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
  } catch {
    return null;
  }
}

function toDocId(name, state) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + state.toLowerCase();
}

console.log(`\nGeocoding ${RAW.length} drive-ins via Mapbox...\n`);

const docs = [];
const failed = [];

for (let i = 0; i < RAW.length; i++) {
  const t = RAW[i];
  process.stdout.write(`  [${i + 1}/${RAW.length}] ${t.name} ... `);
  const coords = t._manualCoords ? null : await geocode(t);
  if (coords) {
    console.log(`(${coords.lat}, ${coords.lng})`);
    docs.push({
      docId: toDocId(t.name, t.state),
      name: t.name,
      address: t.address,
      city: t.city,
      state: t.state,
      zip: t.zip || '',
      website: t.website || '',
      phone: t.phone || '',
      lat: coords.lat,
      lng: coords.lng,
      source: 'manual',
      active: true,
    });
  } else {
    console.log('FAILED TO GEOCODE');
    failed.push(t);
    docs.push({
      docId: toDocId(t.name, t.state),
      name: t.name,
      address: t.address,
      city: t.city,
      state: t.state,
      zip: t.zip || '',
      website: t.website || '',
      phone: t.phone || '',
      lat: null,
      lng: null,
      source: 'manual',
      active: false,  // inactive until coordinates are added manually
    });
  }
  await delay(150);
}

console.log(`\nGeocoded: ${docs.length - failed.length}  |  Failed: ${failed.length}`);

if (failed.length > 0) {
  console.log('\nAddresses that need manual coordinates:');
  failed.forEach(t => console.log(`  • ${t.name} — ${t.address}, ${t.city}, ${t.state} ${t.zip}`));
}

if (DRY_RUN) {
  console.log('\n--- DRY RUN — no Firestore writes ---');
  console.log('Rerun with --upload to write to Firestore (open rules first).\n');
  process.exit(0);
}

// ── Firestore upload ──────────────────────────────────────────────────────────

const { initializeApp } = await import('firebase/app');
const { getFirestore, collection, doc, getDoc, writeBatch, serverTimestamp } =
  await import('firebase/firestore');

const firebaseConfig = {
  apiKey:            'AIzaSyBlKiGzXCTIgjqjzDROB_dywrjJntizkYE',
  authDomain:        'the-literary-roads.firebaseapp.com',
  projectId:         'the-literary-roads',
  storageBucket:     'the-literary-roads.firebasestorage.app',
  messagingSenderId: '305145573086',
  appId:             '1:305145573086:web:206ec464384fe149c45c4f',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Skip docs with no coordinates — report them at the end
const uploadable = docs.filter(d => d.lat !== null);
const noCoords   = docs.filter(d => d.lat === null);

console.log(`\nUploading ${uploadable.length} docs to Firestore driveIns (additive — skips existing)...`);

const snaps = await Promise.all(uploadable.map(d => getDoc(doc(db, 'driveIns', d.docId))));
const batch = writeBatch(db);
let added = 0, skipped = 0;

for (let i = 0; i < uploadable.length; i++) {
  if (snaps[i].exists()) { skipped++; continue; }
  const { docId, ...data } = uploadable[i];
  batch.set(doc(db, 'driveIns', docId), { ...data, createdAt: serverTimestamp() });
  added++;
}

if (added > 0) await batch.commit();

console.log(`\nDone. Added: ${added}  |  Skipped (already existed): ${skipped}`);

if (noCoords.length > 0) {
  console.log(`\n⚠️  ${noCoords.length} doc(s) NOT uploaded — geocoding failed, add coordinates manually:`);
  noCoords.forEach(d => console.log(`  • ${d.name} — ${d.address}, ${d.city}, ${d.state}`));
}

process.exit(0);
