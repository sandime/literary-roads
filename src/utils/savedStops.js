import { db } from '../config/firebase';
import {
  collection, setDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';

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
