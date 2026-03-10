import { db } from '../config/firebase';
import {
  collection, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp,
} from 'firebase/firestore';

export const createSharedRoute = async (userId, creatorName, savedRoute) => {
  const ref = doc(collection(db, 'sharedRoutes'));
  await setDoc(ref, {
    routeName:        savedRoute.routeName || 'Unnamed Route',
    notes:            savedRoute.notes || '',
    startCity:        savedRoute.startCity || '',
    endCity:          savedRoute.endCity || '',
    selectedStates:   savedRoute.selectedStates || [],
    routeCoordinates: typeof savedRoute.routeCoordinates === 'string'
      ? savedRoute.routeCoordinates
      : JSON.stringify(savedRoute.routeCoordinates || []),
    stops:            savedRoute.stops || [],
    bookstoreCount:   savedRoute.bookstoreCount || 0,
    cafeCount:        savedRoute.cafeCount || 0,
    landmarkCount:    savedRoute.landmarkCount || 0,
    createdBy:        userId,
    creatorName:      creatorName || 'A Literary Traveler',
    sourceRouteId:    savedRoute.id || null,
    shareCount:       0,
    cloneCount:       0,
    isPublic:         true,
    createdAt:        serverTimestamp(),
  });
  return ref.id;
};

export const getSharedRoute = async (routeId) => {
  const snap = await getDoc(doc(db, 'sharedRoutes', routeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const incrementShareCount = (routeId) =>
  updateDoc(doc(db, 'sharedRoutes', routeId), { shareCount: increment(1) }).catch(() => {});

export const incrementCloneCount = (routeId) =>
  updateDoc(doc(db, 'sharedRoutes', routeId), { cloneCount: increment(1) }).catch(() => {});
