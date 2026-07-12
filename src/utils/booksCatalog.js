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
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

const GB_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';

// Stable doc ID for books that have no Google Books ID (Open Library, manual, SwapMeet paths).
export function titleAuthorSlug(title = '', author = '') {
  return [title, author]
    .filter(Boolean)
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

// Fetch cover URL for a book from Open Library (primary) or Google Books (fallback).
// Returns a URL string or null. Does NOT write to Firestore — caller handles persistence.
export async function fetchBookCover(book) {
  const title  = book.title || '';
  const author = (book.authors || [])[0] || book.author || '';
  const q      = [title, author].filter(Boolean).join(' ');

  // Open Library — no rate limiting, no key needed
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=5&fields=cover_i`
    );
    if (res.ok) {
      const data = await res.json();
      const coverId = (data.docs || []).find(d => d.cover_i)?.cover_i;
      if (coverId) return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
    }
  } catch {}

  // Google Books fallback — use API key to avoid rate limiting
  try {
    const key = GB_KEY ? `&key=${GB_KEY}` : '';
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=3${key}`);
    if (res.ok) {
      const data = await res.json();
      for (const item of (data.items || [])) {
        const thumb = item.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:');
        if (thumb) return thumb;
      }
    }
  } catch {}

  return null;
}

// Create a bare-bones book doc if one doesn't exist yet.
// bookData: { id?, title, authors[]|author, description?, coverUrl?, coverURL?, categories?, pageCount? }
// Uses bookData.id (Google Books volume ID) when present; falls back to titleAuthorSlug.
export async function getOrCreateBook(bookData) {
  // Sanitize ID — OL keys contain slashes (/works/OL123W) which are illegal in Firestore doc IDs
  const rawId = (bookData.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const id = rawId
    || titleAuthorSlug(
        bookData.title,
        Array.isArray(bookData.authors) ? bookData.authors[0] : (bookData.author || '')
       );
  if (!id) return null;

  const ref = doc(db, 'books', id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const existing = snap.data();
    if (!existing.pageCount && bookData.pageCount) {
      await updateDoc(ref, { pageCount: bookData.pageCount });
      return { id: snap.id, ...existing, pageCount: bookData.pageCount };
    }
    return { id: snap.id, ...existing };
  }

  const authors = Array.isArray(bookData.authors)
    ? bookData.authors
    : [(bookData.author || bookData.authors || '')].filter(Boolean);

  const bookDoc = {
    title:             bookData.title       || '',
    authors,
    description:       bookData.description || '',
    coverUrl:          bookData.coverUrl || bookData.coverURL || '',
    pageCount:         bookData.pageCount   || null,
    categories:        bookData.categories  || [],
    settings:          [],
    moods:             [],
    enrichmentVersion: 0,
    lastEnrichedAt:    null,
    createdAt:         serverTimestamp(),
  };
  await setDoc(ref, bookDoc);
  return { id, ...bookDoc };
}

// Query all books that have at least one high-confidence setting for a given state.
export async function getBooksForState(stateName) {
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
