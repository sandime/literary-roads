import { db } from '../config/firebase';
import {
  collection, doc, addDoc, updateDoc, setDoc, onSnapshot,
  query, orderBy, limit, increment, serverTimestamp,
} from 'firebase/firestore';

// Both old ('open','review') and new ('upcoming','active','closed') statuses are displayable.
const VISIBLE_STATUSES = new Set(['upcoming', 'active', 'closed', 'open', 'review']);

// ── Active salon period ───────────────────────────────────────────────────────
// Returns the most recently-started salon with any displayable status.
export function subscribeToActiveSalon(callback) {
  const q = query(collection(db, 'salon'), orderBy('startDate', 'desc'), limit(5));
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const active = docs.find(d => VISIBLE_STATUSES.has(d.status));
    callback(active || null);
  }, () => callback(null));
}

// ── Enrollment ────────────────────────────────────────────────────────────────
// Writes to the users/{userId}/salonEnrollments/{salonId} subcollection.
// bookData (optional) is the salon period object — used to add the book to Read Next.
export async function enrollInSalon(salonId, userId, bookData = null) {
  await setDoc(doc(db, 'users', userId, 'salonEnrollments', salonId), {
    enrolledAt: serverTimestamp(),
    hasReviewed: false,
  });
  if (bookData?.bookTitle) {
    setDoc(doc(db, 'users', userId, 'wantToRead', `salon_${salonId}`), {
      title:    bookData.bookTitle,
      author:   bookData.bookAuthor  || '',
      coverURL: bookData.coverImage  || bookData.coverURL || null,
      source:   'the-salon',
      addedAt:  serverTimestamp(),
    }).catch(() => {});
  }
  updateDoc(doc(db, 'salon', salonId), {
    participantCount: increment(1),
  }).catch(() => {});
}

// ── Enrollment subscription ───────────────────────────────────────────────────
export function subscribeToEnrollment(userId, salonId, callback) {
  if (!userId || !salonId) { callback(false); return () => {}; }
  return onSnapshot(
    doc(db, 'users', userId, 'salonEnrollments', salonId),
    snap => callback(snap.exists()),
    () => callback(false),
  );
}

// ── Discussion cards (legacy — kept for backward compat) ──────────────────────
export function subscribeToSalonCards(salonId, sort, callback) {
  const dir = sort === 'oldest' ? 'asc' : 'desc';
  const q = query(
    collection(db, 'salon', salonId, 'cards'),
    orderBy('createdAt', dir),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

export function subscribeToCardReplies(salonId, cardId, callback) {
  const q = query(
    collection(db, 'salon', salonId, 'cards', cardId, 'replies'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

export async function postCard(salonId, { userId, userName, text, spoiler = false }) {
  return addDoc(collection(db, 'salon', salonId, 'cards'), {
    userId, userName, text, spoiler,
    isHostVoice: false, replyCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function postReply(salonId, cardId, { userId, userName, text }) {
  await addDoc(collection(db, 'salon', salonId, 'cards', cardId, 'replies'), {
    userId, userName, text, createdAt: serverTimestamp(),
  });
  updateDoc(doc(db, 'salon', salonId, 'cards', cardId), {
    replyCount: increment(1),
  }).catch(() => {});
}

// ── Time helpers ──────────────────────────────────────────────────────────────
export function computeEnrollment(period) {
  if (!period) return { joined: false, daysRemaining: 0, dayOf: 0, totalDays: 0 };
  const now   = Date.now();
  const start = period.startDate?.toMillis?.() ?? new Date(period.startDate).getTime();
  const end   = period.endDate?.toMillis?.()   ?? new Date(period.endDate).getTime();
  const totalDays     = Math.round((end - start) / 86_400_000);
  const dayOf         = Math.min(totalDays, Math.max(1, Math.ceil((now - start) / 86_400_000)));
  const daysRemaining = Math.max(0, totalDays - dayOf);
  return { totalDays, dayOf, daysRemaining };
}

export function formatSalonDates(period) {
  if (!period) return '';
  const fmt = ts => {
    const d = ts?.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };
  return `${fmt(period.startDate)} – ${fmt(period.endDate)}`;
}
