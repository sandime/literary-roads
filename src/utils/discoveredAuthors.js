import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ── discoveredAuthors subcollection under users/{uid} ────────────────────────
// Schema: { name, state, hookLine, expandedNarrative, wikipediaUrl,
//           discoveredDate (timestamp), addedToLibrary (boolean) }

export function subscribeToDiscoveredAuthors(uid, callback) {
  const ref = collection(db, 'users', uid, 'discoveredAuthors');
  return onSnapshot(ref, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function isAuthorDiscovered(uid, state, name) {
  const ref = collection(db, 'users', uid, 'discoveredAuthors');
  // With multi-author states, check by name+state if name provided; fall back to state-only
  const q = name
    ? query(ref, where('state', '==', state), where('name', '==', name))
    : query(ref, where('state', '==', state));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function addDiscoveredAuthor(uid, { name, state, hookLine, expandedNarrative, wikipediaUrl }) {
  // Prevent duplicates — check by state + name so multiple authors from the same state can each be saved
  const ref  = collection(db, 'users', uid, 'discoveredAuthors');
  const q    = query(ref, where('state', '==', state), where('name', '==', name));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id; // already saved

  const docRef = await addDoc(ref, {
    name,
    state,
    hookLine,
    expandedNarrative,
    wikipediaUrl,
    discoveredDate: serverTimestamp(),
    addedToLibrary: false,
  });
  return docRef.id;
}

export function useDiscoveredAuthors(uid) {
  const [authors, setAuthors] = useState([]);
  useEffect(() => {
    if (!uid) return;
    return subscribeToDiscoveredAuthors(uid, setAuthors);
  }, [uid]);
  return authors;
}
