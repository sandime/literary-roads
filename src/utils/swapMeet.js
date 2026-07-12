import { db } from '../config/firebase';
import { getOrCreateBook } from './booksCatalog';
import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, serverTimestamp, getDocs,
  arrayUnion,
} from 'firebase/firestore';

// ── Cover URL helper ──────────────────────────────────────────────────────────
export function coverUrl(coverId, size = 'M') {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

// ── Read Next (uses libraryReadNext — consistent with JourneysPage pattern) ──
export async function addToReadNext(userId, book) {
  const raw = (book.coverId || book.title || 'unknown').toString();
  const bookId = raw.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 100);
  const ref = doc(db, 'users', userId, 'libraryReadNext', bookId);
  await setDoc(ref, {
    title:        book.title  || '',
    author:       book.author || '',
    coverId:      book.coverId || null,
    addedAt:      serverTimestamp(),
    date:         serverTimestamp(),
    lastViewedAt: null,
    source:       'swapMeet',
  }, { merge: true });
  const coverUrl = book.coverId ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg` : '';
  getOrCreateBook({ title: book.title || '', authors: [book.author || ''], coverUrl }).catch(() => {});
}

// ── Current swap meet (most recent by openAt — handles active + upcoming) ────
export function subscribeToCurrentMeet(callback) {
  const q = query(
    collection(db, 'swapMeets'),
    orderBy('openAt', 'desc'),
    limit(1)
  );
  return onSnapshot(q, snap => {
    if (snap.empty) { callback(null); return; }
    const d = snap.docs[0];
    callback({ id: d.id, ...d.data() });
  }, () => callback(null));
}

// ── Active meet (map marker) ──────────────────────────────────────────────────
export function subscribeToActiveSwapMeet(callback) {
  const q = query(
    collection(db, 'swapMeets'),
    where('status', '==', 'active'),
    limit(1)
  );
  return onSnapshot(q, snap => {
    callback(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
  }, () => callback(null));
}

// ── Tables ────────────────────────────────────────────────────────────────────
export function subscribeToTables(meetId, callback) {
  const q = query(
    collection(db, 'swapMeets', meetId, 'tables'),
    where('isPublic', '==', true),
    orderBy('joinedAt', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

export function subscribeToMyTable(meetId, userId, callback) {
  return onSnapshot(
    doc(db, 'swapMeets', meetId, 'tables', userId),
    snap => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    () => callback(null)
  );
}

export async function saveMyTable(meetId, userId, tableData) {
  const ref = doc(db, 'swapMeets', meetId, 'tables', userId);
  const snap = await getDoc(ref);
  await setDoc(ref, {
    ...tableData,
    userId,
    joinedAt: snap.exists() ? snap.data().joinedAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── Town Square ───────────────────────────────────────────────────────────────
export function subscribeToTownSquare(meetId, callback) {
  const q = query(
    collection(db, 'swapMeets', meetId, 'townSquare'),
    orderBy('sentAt', 'asc'),
    limit(200)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

export async function sendTownSquareMessage(meetId, userId, username, message) {
  await addDoc(collection(db, 'swapMeets', meetId, 'townSquare'), {
    userId,
    username,
    message: message.slice(0, 200),
    sentAt: serverTimestamp(),
    reported: false,
  });
}

export async function reportMessage(meetId, messageId) {
  await updateDoc(doc(db, 'swapMeets', meetId, 'townSquare', messageId), {
    reported: true,
  });
}

// ── Private chats ─────────────────────────────────────────────────────────────
export async function startOrGetChat(meetId, myId, theirId, bookContext) {
  const q = query(
    collection(db, 'swapMeets', meetId, 'chats'),
    where('participants', 'array-contains', myId)
  );
  const snap = await getDocs(q);
  const existing = snap.docs.find(d => d.data().participants.includes(theirId));
  if (existing) return existing.id;

  const ref = await addDoc(collection(db, 'swapMeets', meetId, 'chats'), {
    participants: [myId, theirId],
    bookContext,
    messages: [],
    startedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToChat(meetId, chatId, callback) {
  return onSnapshot(
    doc(db, 'swapMeets', meetId, 'chats', chatId),
    snap => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    () => callback(null)
  );
}

export async function sendChatMessage(meetId, chatId, userId, message) {
  await updateDoc(doc(db, 'swapMeets', meetId, 'chats', chatId), {
    messages: arrayUnion({
      userId,
      message: message.slice(0, 200),
      sentAt: new Date().toISOString(),
    }),
    lastMessageAt: serverTimestamp(),
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function createSwapMeet(data) {
  return addDoc(collection(db, 'swapMeets'), {
    ...data,
    status: 'upcoming',
    participantCount: 0,
    topBooks: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSwapMeet(meetId, data) {
  await updateDoc(doc(db, 'swapMeets', meetId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSwapMeet(meetId) {
  await deleteDoc(doc(db, 'swapMeets', meetId));
}

export function subscribeToAllSwapMeets(callback) {
  const q = query(collection(db, 'swapMeets'), orderBy('openAt', 'desc'), limit(20));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => callback([]));
}

export function subscribeToPublicTablesCount(meetId, callback) {
  const q = query(
    collection(db, 'swapMeets', meetId, 'tables'),
    where('isPublic', '==', true)
  );
  return onSnapshot(q, snap => callback(snap.size), () => callback(0));
}

export function subscribeToRecentTownSquare(meetId, callback) {
  const q = query(
    collection(db, 'swapMeets', meetId, 'townSquare'),
    orderBy('sentAt', 'desc'),
    limit(10)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse());
  }, () => callback([]));
}

export async function deleteTownSquareMessage(meetId, messageId) {
  await deleteDoc(doc(db, 'swapMeets', meetId, 'townSquare', messageId));
}
