// Shared books collection utilities.
// Any feature that needs a book doc (Book Log, Read Next, Postcard, By Setting)
// should call getOrCreateBook() rather than writing directly — keeps creation
// consistent across entry points.
//
// NOTE: This does NOT auto-tag settings. The one-time seed script
// (scripts/seed-book-settings.mjs) handles enrichment for existing books.
// A Cloud Function trigger for new books can be added later once there is
// real traffic to justify it — see that script for the enrichment logic.

import { db } from '../config/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

// Create a bare-bones book doc if one doesn't exist yet.
// googleBooksData: { id, title, author(s), description, coverUrl, categories }
export async function getOrCreateBook(googleBooksData) {
  const id = googleBooksData.id;
  if (!id) return null;

  const ref = doc(db, 'books', id);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };

  const bookDoc = {
    title:            googleBooksData.title       || '',
    authors:          Array.isArray(googleBooksData.authors)
                        ? googleBooksData.authors
                        : [googleBooksData.author || googleBooksData.authors || ''].filter(Boolean),
    description:      googleBooksData.description || '',
    coverUrl:         googleBooksData.coverUrl || googleBooksData.coverURL || '',
    categories:       googleBooksData.categories  || [],
    settings:         [],
    moods:            [],
    enrichmentVersion: 0,
    lastEnrichedAt:   null,
    createdAt:        serverTimestamp(),
  };
  await setDoc(ref, bookDoc);
  return { id, ...bookDoc };
}

// Query all books that have at least one high-confidence setting for a given state.
export async function getBooksForState(stateName) {
  // Firestore array-contains works on the whole object only if you match the exact object.
  // We store a flattened stateIndex array for efficient lookups (populated by the seed script).
  // Fall back to client-side filter if stateIndex not present.
  const snap = await getDocs(
    query(collection(db, 'books'),
      where('stateIndex', 'array-contains', stateName.toLowerCase()))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Query books by settings.type for the "Beyond the map" panel.
export async function getBooksForSettingType(types) {
  const snap = await getDocs(
    query(collection(db, 'books'),
      where('settingTypes', 'array-contains-any', types))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Get all books that have settings (for the map — used to build state count index).
export async function getAllBooksWithSettings() {
  const snap = await getDocs(
    query(collection(db, 'books'), where('stateIndex', '!=', null))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
