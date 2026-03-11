import { db } from '../config/firebase';
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';

// Firestore rejects documents containing `undefined` values.
// Recursively strip them — keeps null, replaces undefined with nothing.
const stripUndefined = (value) => {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return value;
};

export const saveRoute = async (userId, { routeName, notes, startCity, endCity, selectedStates, routeCoordinates, stops, myStops }) => {
  const bookstoreCount = stops.filter(s => s.type === 'bookstore').length;
  const cafeCount      = stops.filter(s => s.type === 'cafe').length;
  const landmarkCount  = stops.filter(s => s.type === 'landmark').length;

  // Strip undefined values so Firestore doesn't reject the write
  const cleanStops   = stripUndefined(stops);
  const cleanMyStops = myStops?.length ? stripUndefined(myStops) : [];

  const payload = {
    routeName,
    notes: notes || '',
    startCity,
    endCity,
    selectedStates: selectedStates || [],
    // Firestore doesn't support nested arrays ([[lat,lng],...]), so stringify
    routeCoordinates: JSON.stringify(routeCoordinates),
    stops: cleanStops,
    myStops: cleanMyStops,
    bookstoreCount,
    cafeCount,
    landmarkCount,
    createdAt: serverTimestamp(),
  };

  console.log('[savedRoutes] saving to users/', userId, '/savedRoutes — payload size approx', JSON.stringify(payload).length, 'chars');

  const ref = await addDoc(collection(db, 'users', userId, 'savedRoutes'), payload);
  console.log('[savedRoutes] saved successfully, doc id:', ref.id);
  return ref;
};

export const subscribeToSavedRoutes = (userId, onUpdate) => {
  const q = query(
    collection(db, 'users', userId, 'savedRoutes'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (err) => console.error('[savedRoutes] subscribe:', err),
  );
};

export const deleteSavedRoute = (userId, routeId) =>
  deleteDoc(doc(db, 'users', userId, 'savedRoutes', routeId));

export const updateRouteName = (userId, routeId, routeName) =>
  updateDoc(doc(db, 'users', userId, 'savedRoutes', routeId), { routeName });
