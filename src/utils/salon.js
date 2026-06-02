import { db } from '../config/firebase';
import {
  collection, doc, addDoc, updateDoc, setDoc, onSnapshot,
  query, orderBy, limit, increment, serverTimestamp,
} from 'firebase/firestore';

// ── Active salon period ───────────────────────────────────────────────────────
// Returns the most recently-started published salon (open or review state).
export function subscribeToActiveSalon(callback) {
  const q = query(collection(db, 'salon'), orderBy('startDate', 'desc'), limit(5));
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const active = docs.find(d => d.published && (d.status === 'open' || d.status === 'review'));
    callback(active || null);
  }, () => callback(null));
}

// ── Discussion cards ──────────────────────────────────────────────────────────
export function subscribeToSalonCards(salonId, sort, callback) {
  const dir = sort === 'oldest' ? 'asc' : 'desc';
  const q = query(
    collection(db, 'salon', salonId, 'cards'),
    orderBy('createdAt', dir)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

// ── Replies for a single card ─────────────────────────────────────────────────
export function subscribeToCardReplies(salonId, cardId, callback) {
  const q = query(
    collection(db, 'salon', salonId, 'cards', cardId, 'replies'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

// ── Post a new card ───────────────────────────────────────────────────────────
export async function postCard(salonId, { userId, userName, text, spoiler = false }) {
  return addDoc(collection(db, 'salon', salonId, 'cards'), {
    userId,
    userName,
    text,
    spoiler,
    isHostVoice: false,
    replyCount: 0,
    createdAt: serverTimestamp(),
  });
}

// ── Post a reply ──────────────────────────────────────────────────────────────
export async function postReply(salonId, cardId, { userId, userName, text }) {
  await addDoc(collection(db, 'salon', salonId, 'cards', cardId, 'replies'), {
    userId,
    userName,
    text,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'salon', salonId, 'cards', cardId), {
    replyCount: increment(1),
  });
}

// ── Enrollment ────────────────────────────────────────────────────────────────
// Stored in users/{userId} so auth rules are straightforward.
export async function enrollInSalon(salonId, userId) {
  await setDoc(
    doc(db, 'users', userId),
    { salonEnrollments: { [salonId]: true } },
    { merge: true }
  );
  await updateDoc(doc(db, 'salon', salonId), {
    memberCount: increment(1),
  });
}

// ── Time helpers ──────────────────────────────────────────────────────────────
export function computeEnrollment(period) {
  if (!period) return { joined: false, daysRemaining: 0, dayOf: 0, totalDays: 0 };
  const now   = Date.now();
  const start = period.startDate?.toMillis?.() ?? new Date(period.startDate).getTime();
  const end   = period.endDate?.toMillis?.()   ?? new Date(period.endDate).getTime();
  const totalDays    = Math.round((end - start)   / 86_400_000);
  const dayOf        = Math.min(totalDays, Math.round((now - start) / 86_400_000) + 1);
  const daysRemaining = Math.max(0, Math.ceil((end - now) / 86_400_000));
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
