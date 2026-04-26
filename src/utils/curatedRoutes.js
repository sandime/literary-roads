// Firestore CRUD for the curatedRoutes collection.
// Each document represents one curated tour/route built in the admin panel.
import { db } from '../config/firebase';
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, startAt, endAt, limit as firestoreLimit,
} from 'firebase/firestore';

const COL = 'curatedRoutes';

// ── Collections available for stop search ─────────────────────────────────────
// unavailable = collection doesn't exist yet — show friendly message
export const ROUTE_TYPE_CONFIG = {
  ghostTown:        { label: 'Ghost Town Tour',         collection: 'ghostTowns',        available: true  },
  ufo:              { label: 'UFO & Paranormal Tour',    collection: 'ufoLocations',       available: false },
  nationalPark:     { label: 'National Park Route',      collection: 'nationalParks',      available: true  },
  lighthouse:       { label: 'Lighthouse Tour',          collection: 'lighthouses',        available: false },
  coffeeShop:       { label: 'Coffee Shop Crawl',        collection: 'coffeeShops',        available: true  },
  bookstore:        { label: 'Bookstore Crawl',          collection: 'bookstores',         available: true  },
  literaryLandmark: { label: 'Literary Landmarks Tour',  collection: 'literary_landmarks', available: true  },
  authorCountry:    { label: 'Author Country Route',     collection: ['literary_landmarks', 'bookstores'], available: true },
};

export const ROUTE_TYPE_OPTIONS = Object.entries(ROUTE_TYPE_CONFIG).map(([k, v]) => ({
  value: k, label: v.label,
}));

// ── Stop search ───────────────────────────────────────────────────────────────
// Uses Firestore prefix query (orderBy name, startAt/endAt).
// Falls back to getDocs+filter if the index isn't set up.
async function searchSingleCollection(colName, q, lim = 10) {
  try {
    const snap = await getDocs(
      query(
        collection(db, colName),
        orderBy('name'),
        startAt(q),
        endAt(q + '\uf8ff'),
        firestoreLimit(lim),
      )
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data(), _fromCollection: colName }));
  } catch {
    // Index not available — fall back to full scan + filter (admin use only, ok cost-wise)
    try {
      const snap = await getDocs(collection(db, colName));
      return snap.docs
        .map(d => ({ id: d.id, ...d.data(), _fromCollection: colName }))
        .filter(d => (d.name || '').toLowerCase().includes(q.toLowerCase()))
        .slice(0, lim);
    } catch {
      return [];
    }
  }
}

export async function searchStopsCollection(routeType, q) {
  const cfg = ROUTE_TYPE_CONFIG[routeType];
  if (!cfg || !cfg.available) return [];
  if (!q || q.trim().length < 2) return [];

  if (Array.isArray(cfg.collection)) {
    // Author Country Route — search both collections in parallel
    const [a, b] = await Promise.all(
      cfg.collection.map(c => searchSingleCollection(c, q, 6))
    );
    return [...a, ...b].slice(0, 10);
  }
  return searchSingleCollection(cfg.collection, q, 10);
}

// ── Manual stop entry ─────────────────────────────────────────────────────────
// Writes a new location doc to the correct collection with source:'manual'.
export async function addManualStop(routeType, stopData) {
  const cfg = ROUTE_TYPE_CONFIG[routeType];
  if (!cfg) throw new Error('Unknown route type');
  const colName = Array.isArray(cfg.collection) ? cfg.collection[0] : cfg.collection;

  const docRef = await addDoc(collection(db, colName), {
    ...stopData,
    source: 'manual',
    active: true,
    addedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...stopData, _fromCollection: colName };
}

// ── Curated Routes CRUD ───────────────────────────────────────────────────────
export async function fetchAllCuratedRoutes() {
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function saveCuratedRoute(data, existingId = null) {
  if (existingId) {
    const ref = doc(db, COL, existingId);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return existingId;
  } else {
    const ref = await addDoc(collection(db, COL), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }
}

export async function deleteCuratedRoute(id) {
  await deleteDoc(doc(db, COL, id));
}
