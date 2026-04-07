// src/utils/newsletterAdmin.js
// Firestore CRUD for all 5 gazette admin collections + issue management
import { db } from '../config/firebase';
import {
  collection, getDocs, addDoc, getDoc, setDoc,
  updateDoc as firestoreUpdate,
  deleteDoc as firestoreDelete,
  doc, serverTimestamp, query, orderBy, where,
} from 'firebase/firestore';

export const ADMIN_UID = 'LmsIBzI7KjMqERTsmXxjHULHJ3M2';

// ── Section CRUD ──────────────────────────────────────────────────────────────

export async function fetchAll(col) {
  const snap = await getDocs(query(collection(db, col), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchFeatured(col) {
  const snap = await getDocs(query(collection(db, col), where('featured', '==', true)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createItem(col, data) {
  return addDoc(collection(db, col), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateItem(col, id, data) {
  return firestoreUpdate(doc(db, col, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(col, id) {
  return firestoreDelete(doc(db, col, id));
}

// ── Current issue metadata (gazette/currentIssue) ────────────────────────────

export async function fetchCurrentIssue() {
  const snap = await getDoc(doc(db, 'gazette', 'currentIssue'));
  return snap.exists()
    ? snap.data()
    : { volume: 1, issue: 1, publishDate: '', pullQuote: '' };
}

export async function saveCurrentIssue(data) {
  return setDoc(doc(db, 'gazette', 'currentIssue'), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── Archive (gazetteIssues collection) ───────────────────────────────────────

// Publish snapshot of current featured content as a permanent archived issue.
// Returns the new Firestore doc reference.
export async function publishIssue(issueMetadata, sections) {
  const { volume, issue, publishDate, pullQuote } = issueMetadata;
  const slug = `vol-${volume}-issue-${issue}`;
  return addDoc(collection(db, 'gazetteIssues'), {
    volume,
    issue,
    publishDate,
    pullQuote: pullQuote || '',
    slug,
    ...sections,      // festivals, indiePicks, debutAuthors, bookTokPicks, tripReports, nyt
    publishedAt: serverTimestamp(),
    status: 'published',
  });
}

export async function fetchArchivedIssues() {
  const snap = await getDocs(query(collection(db, 'gazetteIssues'), orderBy('publishedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchArchivedIssueBySlug(slug) {
  const snap = await getDocs(query(collection(db, 'gazetteIssues'), where('slug', '==', slug)));
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// ── All-sections fetch (for renderers) ───────────────────────────────────────
// Returns a single data object with all featured content for the current issue.
export async function fetchAllFeaturedSections(nytRaw) {
  const [
    festivalTrips, handSelected, dispatches, readersChoice,
    literaryLandmarks, readingRoom, headlights, onTheRoad,
    waystation, bookstoreQA, theLongRoad,
  ] = await Promise.all([
    fetchFeatured('festivals'),
    fetchFeatured('indiePicks'),
    fetchFeatured('tripReports'),
    fetchFeatured('bookTokPicks'),
    fetchFeatured('literaryLandmarks'),
    fetchFeatured('readingRoom'),
    fetchFeatured('headlights'),
    fetchFeatured('onTheRoad'),
    fetchFeatured('waystation'),
    fetchFeatured('bookstoreQA'),
    fetchFeatured('theLongRoad'),
  ]);
  return {
    festivalTrips, handSelected, dispatches, readersChoice,
    literaryLandmarks, readingRoom, headlights, onTheRoad,
    waystation, bookstoreQA, theLongRoad,
    nyt: nytRaw || null,
  };
}
