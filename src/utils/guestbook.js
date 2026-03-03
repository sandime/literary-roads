import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  increment,
  serverTimestamp,
} from 'firebase/firestore';

// Real-time subscription to all book entries for a location, sorted by recommendationCount desc
export function subscribeToGuestbook(locationId, callback) {
  const col = collection(db, 'guestbooks', locationId, 'entries');
  return onSnapshot(
    col,
    (snap) => {
      const entries = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.recommendationCount || 0) - (a.recommendationCount || 0));
      callback(entries);
    },
    () => callback([])
  );
}

// Check if a book entry already exists for this location
export async function checkBookExists(locationId, googleBooksId) {
  const ref = doc(db, 'guestbooks', locationId, 'entries', googleBooksId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Create a new book entry with the first recommendation
export async function addBookEntry(locationId, book, recommendation) {
  const safeId = book.id.replace(/\//g, '_');
  const ref = doc(db, 'guestbooks', locationId, 'entries', safeId);
  await setDoc(ref, {
    bookTitle: book.title,
    bookAuthor: book.author,
    bookCover: book.coverURL || null,
    googleBooksId: safeId,
    recommendations: [recommendation],
    recommendationCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Append a recommendation to an existing entry
export async function addRecommendationToEntry(locationId, googleBooksId, recommendation) {
  const ref = doc(db, 'guestbooks', locationId, 'entries', googleBooksId);
  await updateDoc(ref, {
    recommendations: arrayUnion(recommendation),
    recommendationCount: increment(1),
    updatedAt: serverTimestamp(),
  });
}
