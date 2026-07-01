import { db } from '../config/firebase';
import {
  collection, setDoc, deleteDoc, doc, getDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';

const TYPE_TO_COL = {
  landmark:     'literary_landmarks',
  bookstore:    'bookstores',
  cafe:         'coffeeShops',
  drivein:      'driveIns',
  festival:     'literaryFestivals',
  library:      'libraries',
  museum:       'museums',
  restaurant:   'restaurants',
  park:         'parks',
  historicSite: 'historicSites',
  artGallery:   'artGalleries',
  observatory:  'observatories',
  aquarium:     'aquariums',
  theater:      'theaters',
  ghostTown:    'ghostTowns',
  ufoLocation:  'ufoLocations',
};

// Firestore collection: users/{userId}/savedStops/{docId}
// Requires rule: allow read, write: if request.auth != null && request.auth.uid == userId;

const sanitizeId = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, '_');

export const subscribeSavedStops = (userId, onUpdate) => {
  const q = query(
    collection(db, 'users', userId, 'savedStops'),
    orderBy('savedAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => onUpdate(snap.docs.map(d => ({ ...d.data(), id: d.data().stopId || d.id }))),
    (err) => console.error('[savedStops] subscribe:', err),
  );
};

export const saveStop = (userId, location) =>
  setDoc(doc(db, 'users', userId, 'savedStops', sanitizeId(location.id)), {
    stopId:      location.id,
    name:        location.name        || '',
    address:     location.address     || '',
    lat:         location.lat,
    lng:         location.lng,
    type:        location.type        || 'landmark',
    description: location.description || '',
    url:         location.url         || '',
    savedAt:     serverTimestamp(),
  });

export const unsaveStop = (userId, locationId) =>
  deleteDoc(doc(db, 'users', userId, 'savedStops', sanitizeId(locationId)));

// Returns a parallel-checked copy of stops with `unavailable: true` on any that
// have been soft-deleted in their source collection.
export const checkSavedStopsValidity = async (stops) => {
  const checks = await Promise.all(
    stops.map(async (stop) => {
      const col = TYPE_TO_COL[stop.type];
      if (!col || !stop.stopId) return stop;
      try {
        const snap = await getDoc(doc(db, col, stop.stopId));
        return snap.exists() && snap.data().deleted ? { ...stop, unavailable: true } : stop;
      } catch {
        return stop;
      }
    })
  );
  return checks;
};
