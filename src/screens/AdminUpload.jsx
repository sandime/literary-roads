import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, doc, getDoc, getDocs, query, limit, serverTimestamp, writeBatch } from 'firebase/firestore';
import { geocodePlace } from '../utils/mapboxGeocoding';

// ─────────────────────────────────────────────────────────────────────────────
// Coffee shop filter — returns a reason string if excluded, null if included
// ─────────────────────────────────────────────────────────────────────────────
// ── Coffee shop filter — PRIORITY ORDER ──────────────────────────────────────
// 1. Excluded chains → always EXCLUDE
// 2. cuisine === "coffee_shop" → INCLUDE (primary OSM signal, trust it)
// 3. Name keywords (no cuisine tag) → INCLUDE as fallback
// 4. Everything else → EXCLUDE

const COFFEE_EXCL_CHAINS = [
  'dunkin', 'tim horton', "mcdonald's", 'mcdonald', 'burger king',
  '7-eleven', '7eleven', 'circle k', 'wawa', 'sheetz', 'dutch bros',
  'biggby', 'einstein bros', 'panera', 'au bon pain',
  'barnes & noble', 'barnes and noble', // already in bookstores collection
];
const COFFEE_KEYWORDS = [
  'coffee', 'espresso', 'roaster', 'roastery', 'java', 'cafe', 'caffè',
  'cappuccino', 'latte', 'cortado', 'pour over', 'cold brew',
];

const getCoffeeExcludeReason = (name, props) => {
  const n       = name.toLowerCase();
  const cuisine = (props['cuisine'] || '').toLowerCase();

  // 1. EXCLUDED CHAINS — checked first, no exceptions
  if (COFFEE_EXCL_CHAINS.some(c => n.includes(c))) return 'excluded chain';

  // 2. OSM CUISINE TAG — primary signal, trust it
  if (cuisine === 'coffee_shop') return null;

  // 3. NAME KEYWORDS — fallback when OSM has no cuisine tag
  if (COFFEE_KEYWORDS.some(k => n.includes(k))) return null;

  // 4. Everything else
  return 'no coffee_shop cuisine or keywords';
};

// ─────────────────────────────────────────────────────────────────────────────
// Collection configs
// isValid(name, props)         — simple boolean, used by all other collections
// getExcludeReason(name, props) — returns reason string or null; enables detailed
//                                 exclusion breakdown in stats (coffeeShops only for now)
// ─────────────────────────────────────────────────────────────────────────────
const JUNK = [
  'gift shop','gifts & more','gifts and more','souvenir','antique mall',
  'antique market','antique store','antique shop','general store',
  'convenience store','tobacco','vape','smoke shop',"sam's club",'costco',
  'target','walmart',"ollie's",'ollies','bargain outlet','bargain bin',
  'discount outlet','wholesale','dollar tree','dollar general','5 below',
  'five below','big lots','grocery','supermarket','crystal','mystical',
  'metaphysical','psychic','tarot',
];
const hasJunk = (l) => JUNK.some(t => l.includes(t));

const COLLECTIONS = {
  bookstores: {
    label: 'Bookstores',
    icon: '📚',
    type: 'bookstore',
    presetFiles: [
      'books-midwest-export.geojson',
      'books-south-export.geojson',
      'books-southwest-export.geojson',
      'books.northeast.export.geojson',
      'northwest-pr-books-export.geojson',
    ],
    isValid: (name) => {
      const l = name.toLowerCase();
      if (hasJunk(l)) return false;
      if (['university bookstore','college bookstore','campus bookstore','campus store',
           'university store','college store','follett','bncollege'].some(t => l.includes(t))) return false;
      if (['barnes & noble','barnes and noble','half price books',"powell's",'books-a-million',
           'books a million','second & charles','strand bookstore','tattered cover'].some(c => l.includes(c))) return true;
      return ['book','books','bookstore','bookshop','bookery','bookseller','library',
              'literary','reading','novel','chapter','shelf','tome'].some(k => l.includes(k));
    },
  },
  coffeeShops: {
    label: 'Coffee Shops',
    icon: '☕',
    type: 'cafe',
    presetFiles: [],
    getExcludeReason: getCoffeeExcludeReason,
    isValid: (name, props) => getCoffeeExcludeReason(name, props) === null,
  },
  restaurants: {
    label: 'Restaurants',
    icon: '🍽️',
    type: 'restaurant',
    presetFiles: [],
    isValid: (name) => {
      const l = name.toLowerCase();
      if (hasJunk(l)) return false;
      if (['mcdonald','burger king','wendy','taco bell','kfc','domino','subway',
           'chipotle','sonic','arby','dairy queen','popeyes','five guys','panda express',
           'panera','dunkin','7-eleven','circle k','sheetz','wawa'].some(t => l.includes(t))) return false;
      return ['restaurant','diner','bistro','eatery','brasserie','tavern','grill',
              'kitchen','grille','chophouse','steakhouse','pub','inn'].some(k => l.includes(k));
    },
  },
  museums: {
    label: 'Museums',
    icon: '🏛️',
    type: 'museum',
    presetFiles: [],
    isValid: (name) => {
      if (!name) return false;
      const l = name.toLowerCase();
      return ['museum','musée','hall of fame','science center','science centre',
              'natural history','children\'s museum'].some(k => l.includes(k));
    },
  },
  parks: {
    label: 'Parks & Nature',
    icon: '🌲',
    type: 'park',
    presetFiles: [],
    isValid: (name) => {
      if (!name) return false;
      const l = name.toLowerCase();
      if (['parking','car park','park and ride','parkway'].some(t => l.includes(t))) return false;
      return ['national park','state park','nature reserve','wildlife refuge',
              'botanical garden','arboretum','preserve','conservation','wilderness'].some(k => l.includes(k))
          || (l.includes('park') && !l.includes('parking'));
    },
  },
  historicSites: {
    label: 'Historic Sites',
    icon: '🏰',
    type: 'historicSite',
    presetFiles: [],
    isValid: (name) => {
      if (!name) return false;
      const l = name.toLowerCase();
      return ['historic','historical','heritage','landmark','monument','memorial',
              'battlefield','fort ','mansion','birthplace','abbey',
              'cathedral','castle','ruins'].some(k => l.includes(k));
    },
  },
  aquariums: {
    label: 'Aquariums',
    icon: '🐠',
    type: 'aquarium',
    presetFiles: [],
    isValid: (name) => {
      if (!name) return false;
      const l = name.toLowerCase();
      return ['aquarium','aquatic','marine science','sea life','sealife',
              'ocean center','reef'].some(k => l.includes(k));
    },
  },
  observatories: {
    label: 'Observatories & Planetariums',
    icon: '🔭',
    type: 'observatory',
    presetFiles: [],
    isValid: (name) => {
      if (!name) return false;
      const l = name.toLowerCase();
      return ['observatory','planetarium','telescope','astronomy','star center',
              'space center','space centre'].some(k => l.includes(k));
    },
  },
  artGalleries: {
    label: 'Art Galleries',
    icon: '🎨',
    type: 'artGallery',
    presetFiles: [],
    isValid: (name) => {
      if (!name) return false;
      const l = name.toLowerCase();
      return ['gallery','galleries','art center','arts center','art centre',
              'arts centre','art space','artspace','contemporary art'].some(k => l.includes(k));
    },
  },
  theaters: {
    label: 'Theaters & Cinemas',
    icon: '🎭',
    type: 'theater',
    presetFiles: [],
    isValid: (name) => {
      if (!name) return false;
      const l = name.toLowerCase();
      return ['theater','theatre','cinema','playhouse','amphitheater','amphitheatre',
              'opera house','concert hall','performing arts','drive-in','drive in'].some(k => l.includes(k));
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GeoJSON feature → Firestore entry
// reasonCounts: optional mutable object { [reason]: count } for tracking
// ─────────────────────────────────────────────────────────────────────────────
const transformFeature = (feature, config, reasonCounts) => {
  const p   = feature.properties || {};
  const geo = feature.geometry;
  const name = (p['name'] || '').trim();
  if (!name) return null;
  if (!geo || geo.type !== 'Point' || !Array.isArray(geo.coordinates)) return null;
  const [lng, lat] = geo.coordinates;
  if (typeof lat !== 'number' || typeof lng !== 'number' || (lat === 0 && lng === 0)) return null;

  // Use detailed reason tracking if available, else simple isValid
  if (config.getExcludeReason) {
    const reason = config.getExcludeReason(name, p);
    if (reason !== null) {
      if (reasonCounts) reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      return null;
    }
  } else if (!config.isValid(name, p)) {
    return null;
  }

  const houseNum = (p['addr:housenumber'] || '').trim();
  const street   = (p['addr:street']      || '').trim();
  const address  = [houseNum, street].filter(Boolean).join(' ') || null;
  const city     = (p['addr:city']     || '').trim() || null;
  const state    = (p['addr:state']    || '').trim() || null;
  const zipcode  = (p['addr:postcode'] || '').trim() || null;
  const phone    = (p['addr:phone'] || p['phone'] || p['contact:phone'] || '').trim() || null;
  const website  = (p['website'] || p['contact:website'] || p['url'] || '').trim() || null;
  const osmId    = (feature.id || p['@id'] || '').replace(/\//g, '_');
  const docId    = osmId || `osm_${lat.toFixed(6)}_${lng.toFixed(6)}`;

  return { docId, name, address, city, state, zipcode, lat, lng, phone, website,
           type: config.type, source: 'openstreetmap' };
};

// ─────────────────────────────────────────────────────────────────────────────
// Deduplicate: by OSM docId first, then by name+city+state
// ─────────────────────────────────────────────────────────────────────────────
const deduplicate = (entries) => {
  const seenDocIds  = new Set();
  const seenNameKey = new Set();
  const unique      = [];
  let dupeCount     = 0;
  for (const entry of entries) {
    if (seenDocIds.has(entry.docId)) { dupeCount++; continue; }
    if (entry.city) {
      const key = [
        entry.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        entry.city.toLowerCase().replace(/[^a-z0-9]/g, ''),
        (entry.state || '').toLowerCase(),
      ].join('|');
      if (seenNameKey.has(key)) { dupeCount++; continue; }
      seenNameKey.add(key);
    }
    seenDocIds.add(entry.docId);
    unique.push(entry);
  }
  return { unique, dupeCount };
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV helpers
// ─────────────────────────────────────────────────────────────────────────────

// Parse a CSV string → array of row objects. Handles quoted fields and \r\n.
const parseCSV = (text) => {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const splitRow = (line) => {
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };

  const rawHeaders = splitRow(lines[0]);
  // Normalize: lowercase, trim quotes, collapse whitespace → snake_case
  const headers = rawHeaders.map(h => h.replace(/^"|"$/g, '').toLowerCase().trim().replace(/\s+/g, '_'));

  // Map common column name variants to canonical names
  const ALIASES = {
    latitude: 'lat', longitude: 'lng', lon: 'lng', long: 'lng',
    street: 'address', street_address: 'address', addr: 'address',
    zip: 'zipcode', postal_code: 'zipcode', postcode: 'zipcode',
    st: 'state', telephone: 'phone', tel: 'phone',
    url: 'website', web: 'website', link: 'website',
    place_name: 'name', business_name: 'name', title: 'name',
  };
  const canonical = headers.map(h => ALIASES[h] ?? h);

  const rows = lines.slice(1)
    .map(line => {
      const vals = splitRow(line);
      const row = {};
      canonical.forEach((h, i) => { row[h] = (vals[i] ?? '').replace(/^"|"$/g, '').trim(); });
      return row;
    })
    .filter(row => row.name); // must have a name

  return { headers: canonical, rows };
};

// Build a Firestore-ready entry from a CSV row (post-geocoding if needed)
const csvRowToEntry = (row, type) => {
  const lat = parseFloat(row.lat);
  const lng = parseFloat(row.lng);
  if (!row.name || isNaN(lat) || isNaN(lng)) return null;
  const slug = row.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 24);
  const docId = `csv_${slug}_${lat.toFixed(4)}_${lng.toFixed(4)}`.replace(/\./g, '_');
  return {
    docId,
    name:    row.name,
    address: row.address  || null,
    city:    row.city     || null,
    state:   row.state    || null,
    zipcode: row.zipcode  || null,
    phone:   row.phone    || null,
    website: row.website  || null,
    lat, lng,
    type,
    source: 'csv',
  };
};

const EMPTY_STATS = { total: 0, filtered: 0, dupes: 0, uploaded: 0, skipped: 0, failed: 0, deleted: 0, geocoded: 0, excludeReasons: {} };

// Delete every document in a Firestore collection in 400-doc pages
const deleteCollection = async (colName, onProgress) => {
  let total = 0;
  while (true) {
    const snap = await getDocs(query(collection(db, colName), limit(400)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    total += snap.docs.length;
    onProgress(total);
  }
  return total;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminUpload() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [selectedKey, setSelectedKey]     = useState('bookstores');
  const [uploadMode, setUploadMode]       = useState('geojson'); // 'geojson' | 'csv'
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [usePreset, setUsePreset]         = useState(true);
  const [deleteFirst, setDeleteFirst]     = useState(false);
  // CSV state
  const [csvFile, setCsvFile]             = useState(null);
  const [csvRows, setCsvRows]             = useState([]);    // parsed rows
  const [csvHeaders, setCsvHeaders]       = useState([]);
  const [needsGeocoding, setNeedsGeocoding] = useState(false);
  const csvInputRef = useRef(null);
  // Shared
  const [phase, setPhase]                 = useState('idle');
  const [stats, setStats]                 = useState(EMPTY_STATS);
  const [current, setCurrent]             = useState('');
  const [errorMsg, setErrorMsg]           = useState('');

  const config    = COLLECTIONS[selectedKey];
  const hasPreset = config.presetFiles.length > 0;
  const busy      = phase === 'loading' || phase === 'uploading';

  const handleCollectionChange = (key) => {
    setSelectedKey(key);
    setUploadedFiles([]);
    setUsePreset(COLLECTIONS[key].presetFiles.length > 0);
    setDeleteFirst(false);
    setCsvFile(null); setCsvRows([]); setCsvHeaders([]); setNeedsGeocoding(false);
    setPhase('idle');
    setStats(EMPTY_STATS);
    setCurrent('');
    setErrorMsg('');
  };

  const handleModeChange = (mode) => {
    setUploadMode(mode);
    setCsvFile(null); setCsvRows([]); setCsvHeaders([]); setNeedsGeocoding(false);
    setUploadedFiles([]);
    setPhase('idle');
    setStats(EMPTY_STATS);
    setCurrent('');
    setErrorMsg('');
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    setPhase('idle');
    setErrorMsg('');
    setCsvRows([]); setCsvHeaders([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      setCsvHeaders(headers);
      setCsvRows(rows);
      const missingCoords = rows.some(r => !r.lat || !r.lng || isNaN(parseFloat(r.lat)) || isNaN(parseFloat(r.lng)));
      setNeedsGeocoding(missingCoords);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    setUploadedFiles(Array.from(e.target.files));
    setPhase('idle');
    setErrorMsg('');
  };

  const parseFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => { try { resolve(JSON.parse(e.target.result)); } catch { reject(new Error(`${file.name} is not valid JSON`)); } };
    reader.onerror = ()  => reject(new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });

  const handleUpload = async () => {
    const cfg            = COLLECTIONS[selectedKey];
    const usePresetFiles = hasPreset && usePreset;

    if (!usePresetFiles && uploadedFiles.length === 0) {
      setErrorMsg('Please select at least one GeoJSON file.');
      return;
    }

    setPhase('loading');
    setStats(EMPTY_STATS);
    setErrorMsg('');

    // ── Step 0 (optional): Delete existing collection ────────────────────────
    if (deleteFirst) {
      setCurrent(`Deleting existing ${selectedKey} docs…`);
      try {
        const deleted = await deleteCollection(selectedKey, (n) =>
          setCurrent(`Deleting existing docs… ${n.toLocaleString()} removed`)
        );
        setStats(s => ({ ...s, deleted }));
      } catch (err) {
        setErrorMsg(`Failed to delete collection: ${err.message}`);
        setPhase('error');
        return;
      }
    }

    setCurrent('Loading GeoJSON files…');

    // ── Step 1: Parse ────────────────────────────────────────────────────────
    const reasonCounts = {}; // mutable, passed into transformFeature
    let allEntries     = [];
    let totalRaw       = 0;

    const sources = usePresetFiles
      ? cfg.presetFiles.map(f => ({ type: 'url', name: f, url: `${import.meta.env.BASE_URL}geojson/${f}` }))
      : uploadedFiles.map(f => ({ type: 'file', name: f.name, file: f }));

    for (const src of sources) {
      try {
        setCurrent(`Parsing ${src.name}…`);
        const data  = src.type === 'url'
          ? await fetch(src.url).then(r => r.json())
          : await parseFile(src.file);
        const feats = data.features || [];
        totalRaw   += feats.length;
        for (const f of feats) {
          const entry = transformFeature(f, cfg, reasonCounts);
          if (entry) allEntries.push(entry);
        }
      } catch (err) {
        setErrorMsg(`Failed to load ${src.name}: ${err.message}`);
        setPhase('error');
        return;
      }
    }

    // ── Step 2: Deduplicate ──────────────────────────────────────────────────
    const { unique, dupeCount } = deduplicate(allEntries);
    const filtered = totalRaw - allEntries.length;
    setStats(s => ({ ...s, total: totalRaw, filtered, dupes: dupeCount, excludeReasons: { ...reasonCounts } }));

    // ── Step 3: Batch upload ─────────────────────────────────────────────────
    setPhase('uploading');
    const BATCH_SIZE = 400;
    const colRef     = collection(db, selectedKey);
    let uploaded = 0, skipped = 0, failed = 0;

    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const chunk = unique.slice(i, i + BATCH_SIZE);
      setCurrent(`Uploading ${i + 1}–${Math.min(i + BATCH_SIZE, unique.length)} of ${unique.length}…`);

      // Skip existence checks when we just wiped the collection — faster
      const existChecks = deleteFirst
        ? chunk.map(() => false)
        : await Promise.all(
            chunk.map(entry => getDoc(doc(colRef, entry.docId)).then(s => s.exists()).catch(() => false))
          );

      const batch = writeBatch(db);
      let batchCount = 0;
      for (let j = 0; j < chunk.length; j++) {
        if (existChecks[j]) { skipped++; continue; }
        const { docId, ...data } = chunk[j];
        batch.set(doc(colRef, docId), { ...data, addedAt: serverTimestamp() });
        batchCount++;
      }

      if (batchCount > 0) {
        try {
          await batch.commit();
          uploaded += batchCount;
        } catch (err) {
          console.error('Batch failed:', err);
          failed += batchCount;
          if (err.code === 'permission-denied') {
            setErrorMsg(
              `Firestore permissions denied. Add this rule in Firebase Console → Firestore → Rules:\n\n` +
              `match /${selectedKey}/{doc} {\n  allow read, write: if request.auth != null;\n}`
            );
            setPhase('error');
            setStats(s => ({ ...s, uploaded, skipped, failed }));
            return;
          }
        }
      }
      setStats(s => ({ ...s, uploaded, skipped, failed }));
    }

    setCurrent('');
    setPhase('done');
    setStats(s => ({ ...s, uploaded, skipped, failed }));
  };

  // ── CSV upload handler ───────────────────────────────────────────────────────
  const handleCsvUpload = async () => {
    if (!csvRows.length) { setErrorMsg('No rows parsed from CSV.'); return; }

    setPhase('loading');
    setStats(EMPTY_STATS);
    setErrorMsg('');

    // Step 0: delete existing if requested
    if (deleteFirst) {
      setCurrent(`Deleting existing ${selectedKey} docs…`);
      try {
        const deleted = await deleteCollection(selectedKey, (n) =>
          setCurrent(`Deleting… ${n.toLocaleString()} removed`)
        );
        setStats(s => ({ ...s, deleted }));
      } catch (err) {
        setErrorMsg(`Failed to delete collection: ${err.message}`);
        setPhase('error');
        return;
      }
    }

    // Step 1: geocode rows missing lat/lng
    let rows = [...csvRows];
    let geocoded = 0, skippedGeo = 0;
    if (needsGeocoding) {
      setPhase('loading');
      const BATCH = 10; // geocode 10 at a time
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH);
        setCurrent(`Geocoding ${i + 1}–${Math.min(i + BATCH, rows.length)} of ${rows.length}…`);
        await Promise.all(slice.map(async (row) => {
          if (row.lat && row.lng && !isNaN(parseFloat(row.lat)) && !isNaN(parseFloat(row.lng))) return;
          const parts = [row.address, row.city, row.state, row.zipcode].filter(Boolean);
          if (!parts.length) { row._skip = true; skippedGeo++; return; }
          const query = `${row.name ? row.name + ', ' : ''}${parts.join(', ')}`;
          const result = await geocodePlace(query).catch(() => null);
          if (result) {
            row.lat = String(result.lat);
            row.lng = String(result.lng);
            geocoded++;
          } else {
            row._skip = true;
            skippedGeo++;
          }
        }));
      }
      rows = rows.filter(r => !r._skip);
    }

    // Step 2: transform to Firestore entries
    const cfg = COLLECTIONS[selectedKey];
    const entries = rows.map(r => csvRowToEntry(r, cfg.type)).filter(Boolean);
    const { unique, dupeCount } = deduplicate(entries);
    const filtered = csvRows.length - entries.length + skippedGeo;
    setStats(s => ({ ...s, total: csvRows.length, filtered, dupes: dupeCount, geocoded }));

    // Step 3: batch upload
    setPhase('uploading');
    const BATCH_SIZE = 400;
    const colRef = collection(db, selectedKey);
    let uploaded = 0, skipped = 0, failed = 0;

    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const chunk = unique.slice(i, i + BATCH_SIZE);
      setCurrent(`Uploading ${i + 1}–${Math.min(i + BATCH_SIZE, unique.length)} of ${unique.length}…`);

      const existChecks = deleteFirst
        ? chunk.map(() => false)
        : await Promise.all(
            chunk.map(entry => getDoc(doc(colRef, entry.docId)).then(s => s.exists()).catch(() => false))
          );

      const batch = writeBatch(db);
      let batchCount = 0;
      for (let j = 0; j < chunk.length; j++) {
        if (existChecks[j]) { skipped++; continue; }
        const { docId, ...data } = chunk[j];
        batch.set(doc(colRef, docId), { ...data, addedAt: serverTimestamp() });
        batchCount++;
      }

      if (batchCount > 0) {
        try {
          await batch.commit();
          uploaded += batchCount;
        } catch (err) {
          console.error('Batch failed:', err);
          failed += batchCount;
          if (err.code === 'permission-denied') {
            setErrorMsg(`Firestore permissions denied.\n\nmatch /${selectedKey}/{doc} {\n  allow read, write: if request.auth != null;\n}`);
            setPhase('error');
            setStats(s => ({ ...s, uploaded, skipped, failed }));
            return;
          }
        }
      }
      setStats(s => ({ ...s, uploaded, skipped, failed }));
    }

    setCurrent('');
    setPhase('done');
    setStats(s => ({ ...s, uploaded, skipped, failed }));
  };

  const canUpload = user && !busy && phase !== 'done' &&
    (uploadMode === 'csv' ? csvRows.length > 0 : (hasPreset && usePreset || uploadedFiles.length > 0));

  const hasReasons = Object.keys(stats.excludeReasons).length > 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-midnight-navy flex flex-col items-center justify-start p-6 pt-12">
      <div className="w-full max-w-lg">

        <h1 className="font-bungee text-starlight-turquoise text-3xl mb-1 drop-shadow-[0_0_12px_rgba(64,224,208,0.7)]">
          ADMIN UPLOAD
        </h1>
        <p className="font-special-elite text-chrome-silver text-sm mb-8">
          Seed any Firestore collection from OpenStreetMap GeoJSON exports.
        </p>

        {/* Auth check */}
        {!user && (
          <div className="border-2 border-atomic-orange rounded-xl p-4 mb-6">
            <p className="font-bungee text-atomic-orange text-sm">SIGN IN REQUIRED</p>
            <p className="font-special-elite text-paper-white text-sm mt-1">
              Sign in with Google first, then return to this page.
            </p>
          </div>
        )}

        {/* Collection selector */}
        <div className="mb-5">
          <label className="font-bungee text-starlight-turquoise text-xs tracking-widest block mb-2">
            SELECT COLLECTION
          </label>
          <div className="relative">
            <select
              value={selectedKey}
              onChange={e => handleCollectionChange(e.target.value)}
              disabled={busy}
              className="w-full bg-black/40 border border-starlight-turquoise/40 rounded-xl px-4 py-3 font-special-elite text-paper-white text-sm appearance-none focus:outline-none focus:border-starlight-turquoise disabled:opacity-40"
            >
              {Object.entries(COLLECTIONS).map(([key, cfg]) => (
                <option key={key} value={key} className="bg-midnight-navy">
                  {cfg.icon}  {cfg.label}  →  {key}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-starlight-turquoise text-xs">▼</span>
          </div>
        </div>

        {/* Upload mode toggle */}
        <div className="flex gap-2 mb-6">
          {[['geojson', '🗺️ GeoJSON'], ['csv', '📋 CSV']].map(([mode, label]) => (
            <button key={mode} onClick={() => handleModeChange(mode)} disabled={busy}
              className={`flex-1 py-2.5 rounded-xl font-bungee text-xs tracking-wider border transition-all disabled:opacity-40 ${
                uploadMode === mode
                  ? 'bg-starlight-turquoise/20 border-starlight-turquoise text-starlight-turquoise'
                  : 'bg-transparent border-white/20 text-chrome-silver hover:border-white/40'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── CSV MODE ─────────────────────────────────────────────────────── */}
        {uploadMode === 'csv' && (
          <div className="mb-6">
            <label className="font-bungee text-starlight-turquoise text-xs tracking-widest block mb-2">
              CSV FILE
            </label>

            {/* Expected columns hint */}
            <div className="border border-starlight-turquoise/20 rounded-xl p-3 mb-3 bg-white/5">
              <p className="font-bungee text-starlight-turquoise text-xs tracking-widest mb-1">EXPECTED COLUMNS</p>
              <p className="font-special-elite text-chrome-silver text-xs leading-relaxed">
                <span className="text-paper-white">Required:</span> name<br/>
                <span className="text-paper-white">With coords:</span> name, lat, lng, address, city, state, zipcode, phone, website<br/>
                <span className="text-paper-white">Auto-geocode:</span> name, address, city, state, zipcode (lat/lng added automatically via Mapbox)
              </p>
            </div>

            {/* File picker */}
            <input ref={csvInputRef} type="file" accept=".csv,.txt" onChange={handleCsvFileChange}
              disabled={busy} className="hidden" />
            <button onClick={() => csvInputRef.current?.click()} disabled={busy}
              className="w-full border-2 border-dashed border-starlight-turquoise/40 rounded-xl p-4 font-special-elite text-chrome-silver text-sm hover:border-starlight-turquoise/70 hover:text-paper-white transition-all text-center disabled:opacity-40">
              {csvFile
                ? csvFile.name
                : 'Click to choose a .csv file'}
            </button>

            {/* CSV preview */}
            {csvRows.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-special-elite text-chrome-silver text-xs">
                    <span className="text-paper-white">{csvRows.length.toLocaleString()} rows</span> detected
                    {needsGeocoding && (
                      <span className="text-atomic-orange ml-2">· lat/lng missing — will auto-geocode via Mapbox</span>
                    )}
                    {!needsGeocoding && (
                      <span className="text-starlight-turquoise ml-2">· lat/lng present ✓</span>
                    )}
                  </p>
                </div>
                {/* Column list */}
                <div className="flex flex-wrap gap-1">
                  {csvHeaders.map(h => (
                    <span key={h} className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                      ['name','lat','lng','address','city','state'].includes(h)
                        ? 'bg-starlight-turquoise/20 text-starlight-turquoise'
                        : 'bg-white/10 text-chrome-silver'
                    }`}>{h}</span>
                  ))}
                </div>
                {/* First 3 rows preview */}
                <div className="bg-black/40 rounded-lg p-2 overflow-x-auto">
                  <p className="font-bungee text-chrome-silver/50 text-xs mb-1">PREVIEW (first 3 rows)</p>
                  {csvRows.slice(0, 3).map((row, i) => (
                    <p key={i} className="font-mono text-xs text-chrome-silver/80 truncate">
                      {row.name}{row.city ? ` · ${row.city}` : ''}{row.state ? `, ${row.state}` : ''}
                      {row.lat ? ` (${parseFloat(row.lat).toFixed(4)}, ${parseFloat(row.lng).toFixed(4)})` : ' [needs geocoding]'}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GEOJSON MODE ──────────────────────────────────────────────────── */}
        {uploadMode === 'geojson' && (
        <div className="mb-6">
          <label className="font-bungee text-starlight-turquoise text-xs tracking-widest block mb-2">
            GEOJSON SOURCE
          </label>

          {hasPreset && (
            <div className="flex gap-2 mb-3">
              <button onClick={() => setUsePreset(true)} disabled={busy}
                className={`flex-1 py-2 rounded-lg font-special-elite text-sm border transition-all ${
                  usePreset ? 'bg-starlight-turquoise/20 border-starlight-turquoise text-starlight-turquoise'
                            : 'bg-transparent border-white/20 text-chrome-silver hover:border-white/40'}`}>
                Preset files ({config.presetFiles.length})
              </button>
              <button onClick={() => setUsePreset(false)} disabled={busy}
                className={`flex-1 py-2 rounded-lg font-special-elite text-sm border transition-all ${
                  !usePreset ? 'bg-starlight-turquoise/20 border-starlight-turquoise text-starlight-turquoise'
                             : 'bg-transparent border-white/20 text-chrome-silver hover:border-white/40'}`}>
                Upload files
              </button>
            </div>
          )}

          {(!hasPreset || !usePreset) && (
            <>
              <input ref={fileInputRef} type="file" accept=".geojson,.json" multiple
                onChange={handleFileChange} disabled={busy} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={busy}
                className="w-full border-2 border-dashed border-starlight-turquoise/40 rounded-xl p-4 font-special-elite text-chrome-silver text-sm hover:border-starlight-turquoise/70 hover:text-paper-white transition-all text-center disabled:opacity-40">
                {uploadedFiles.length > 0
                  ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} selected: ${uploadedFiles.map(f => f.name).join(', ')}`
                  : 'Click to choose .geojson file(s) from your computer'}
              </button>
            </>
          )}

          {hasPreset && usePreset && (
            <p className="font-special-elite text-chrome-silver/50 text-xs mt-2">
              {config.presetFiles.join(' · ')}
            </p>
          )}
        </div>
        )}

        {/* Delete-first toggle */}
        {user && phase === 'idle' && (
          <div className="mb-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={deleteFirst}
                  onChange={e => setDeleteFirst(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  deleteFirst ? 'bg-atomic-orange border-atomic-orange' : 'bg-transparent border-white/30 group-hover:border-atomic-orange/60'
                }`}>
                  {deleteFirst && <span className="text-midnight-navy text-xs font-bold leading-none">✓</span>}
                </div>
              </div>
              <div>
                <p className="font-bungee text-atomic-orange text-xs tracking-widest">DELETE EXISTING DOCS FIRST</p>
                <p className="font-special-elite text-chrome-silver/70 text-xs mt-0.5">
                  Wipes the <code className="text-atomic-orange">{selectedKey}</code> collection before uploading.
                  Use this to re-seed with an updated filter. Requires write permission on the collection.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Firestore rules reminder */}
        {user && phase === 'idle' && (
          <div className="border border-starlight-turquoise/30 rounded-xl p-4 mb-6 bg-white/5">
            <p className="font-bungee text-starlight-turquoise text-xs tracking-widest mb-2">FIRESTORE RULES</p>
            <p className="font-special-elite text-paper-white text-sm mb-2">
              Ensure your rules allow authenticated writes to <code className="text-starlight-turquoise">{selectedKey}</code>:
            </p>
            <pre className="text-xs text-starlight-turquoise/80 bg-black/40 rounded p-3 overflow-x-auto font-mono leading-relaxed">{`match /${selectedKey}/{doc} {\n  allow read, write: if request.auth != null;\n}`}</pre>
            <p className="font-special-elite text-chrome-silver/60 text-xs mt-2">Remove this rule after seeding.</p>
          </div>
        )}

        {/* Stats */}
        {phase !== 'idle' && (
          <div className="border border-starlight-turquoise/20 rounded-xl p-4 mb-6 bg-black/30 font-special-elite text-sm space-y-1">

            {/* Input counts */}
            {stats.deleted > 0 && (
              <div className="flex justify-between text-atomic-orange/80">
                <span>Deleted (wiped before upload)</span>
                <span>{stats.deleted.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-chrome-silver">
              <span>Total features in files</span>
              <span className="text-paper-white">{stats.total.toLocaleString()}</span>
            </div>
            {stats.geocoded > 0 && (
              <div className="flex justify-between text-chrome-silver">
                <span>Auto-geocoded via Mapbox</span>
                <span className="text-starlight-turquoise">{stats.geocoded.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-chrome-silver">
              <span>Passed quality filter</span>
              <span className="text-paper-white">{(stats.total - stats.filtered).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-chrome-silver">
              <span>Excluded by filter</span>
              <span className="text-paper-white">{stats.filtered.toLocaleString()}</span>
            </div>

            {/* Exclusion reason breakdown */}
            {hasReasons && (
              <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-white/10 pl-3">
                {Object.entries(stats.excludeReasons)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <div key={reason} className="flex justify-between text-chrome-silver/60 text-xs">
                      <span>↳ {reason}</span>
                      <span>{count.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex justify-between text-chrome-silver">
              <span>Duplicates removed</span>
              <span className="text-paper-white">{stats.dupes.toLocaleString()}</span>
            </div>

            <div className="h-px bg-starlight-turquoise/10 my-1" />

            <div className="flex justify-between">
              <span className="text-starlight-turquoise">Uploaded to Firestore</span>
              <span className="text-starlight-turquoise font-bold">{stats.uploaded.toLocaleString()}</span>
            </div>
            {stats.skipped > 0 && (
              <div className="flex justify-between text-chrome-silver/60">
                <span>Already existed (skipped)</span>
                <span>{stats.skipped.toLocaleString()}</span>
              </div>
            )}
            {stats.failed > 0 && (
              <div className="flex justify-between text-atomic-orange">
                <span>Failed</span>
                <span>{stats.failed.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        {current && (
          <div className="flex items-center gap-3 mb-6">
            <span className="w-4 h-4 border-2 border-starlight-turquoise border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="font-special-elite text-starlight-turquoise text-sm">{current}</span>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && errorMsg && (
          <div className="border-2 border-atomic-orange rounded-xl p-4 mb-6">
            <p className="font-bungee text-atomic-orange text-xs tracking-widest mb-2">ERROR</p>
            <pre className="font-special-elite text-paper-white text-xs whitespace-pre-wrap leading-relaxed">{errorMsg}</pre>
          </div>
        )}

        {/* Done */}
        {phase === 'done' && (
          <div className="border-2 border-starlight-turquoise rounded-xl p-5 mb-6 text-center">
            <p className="font-bungee text-starlight-turquoise text-xl drop-shadow-[0_0_8px_rgba(64,224,208,0.6)]">DONE!</p>
            <p className="font-special-elite text-paper-white text-sm mt-1">
              {stats.uploaded.toLocaleString()} {config.label.toLowerCase()} added to{' '}
              <code className="text-starlight-turquoise">{selectedKey}</code>.
              {stats.skipped > 0 && ` ${stats.skipped.toLocaleString()} already existed.`}
            </p>
            <p className="font-special-elite text-chrome-silver/60 text-xs mt-3">
              Remember to remove the temporary Firestore rule.
            </p>
            <button
              onClick={() => { setPhase('idle'); setStats(EMPTY_STATS); setCsvFile(null); setCsvRows([]); setCsvHeaders([]); setNeedsGeocoding(false); setUploadedFiles([]); }}
              className="mt-4 font-bungee text-xs text-starlight-turquoise border border-starlight-turquoise/40 rounded-lg px-4 py-2 hover:bg-starlight-turquoise/10 transition-all"
            >
              UPLOAD ANOTHER COLLECTION
            </button>
          </div>
        )}

        {/* Upload button */}
        {phase !== 'done' && (
          <button
            onClick={uploadMode === 'csv' ? handleCsvUpload : handleUpload}
            disabled={!canUpload}
            className="w-full font-bungee rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: '#FF4E00',
              color: '#1A1B2E',
              minHeight: 56,
              fontSize: '1rem',
              boxShadow: canUpload ? '0 0 24px rgba(255,78,0,0.5)' : 'none',
            }}
          >
            {phase === 'idle'      && (uploadMode === 'csv' && needsGeocoding
              ? `${config.icon} GEOCODE + UPLOAD ${config.label.toUpperCase()}`
              : `${config.icon} UPLOAD ${config.label.toUpperCase()} TO FIRESTORE`)}
            {phase === 'loading'   && (needsGeocoding ? 'GEOCODING…' : 'LOADING FILES…')}
            {phase === 'uploading' && 'UPLOADING…'}
            {phase === 'error'     && `${config.icon} RETRY UPLOAD`}
          </button>
        )}

        <p className="font-special-elite text-chrome-silver/40 text-xs text-center mt-3">
          Filters · deduplicates · writes to Firestore <code>{selectedKey}</code> collection
        </p>
      </div>
    </div>
  );
}
