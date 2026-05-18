import { db } from '../config/firebase';
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

const COL = 'bookstoreGuides';

export async function fetchGuides() {
  const snap = await getDocs(collection(db, COL));
  const guides = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Sort by createdAt desc client-side to avoid requiring a Firestore composite index
  return guides.sort((a, b) => {
    const ta = a.createdAt?.seconds ?? 0;
    const tb = b.createdAt?.seconds ?? 0;
    return tb - ta;
  });
}

export async function fetchPublishedGuides() {
  const all = await fetchGuides();
  return all.filter(g => g.published || g.comingSoon);
}

export async function fetchGuide(guideId) {
  const snap = await getDoc(doc(db, COL, guideId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createGuide(data) {
  return addDoc(collection(db, COL), {
    ...data,
    published: data.published ?? false,
    comingSoon: data.comingSoon ?? false,
    storeCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateGuide(guideId, data) {
  return updateDoc(doc(db, COL, guideId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteGuide(guideId) {
  return deleteDoc(doc(db, COL, guideId));
}

export async function fetchGuideStores(guideId) {
  const snap = await getDocs(collection(db, COL, guideId, 'stores'));
  const stores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return stores.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function addGuideStore(guideId, data, totalStores = 0) {
  const ref = await addDoc(collection(db, COL, guideId, 'stores'), {
    ...data,
    order: data.order ?? totalStores,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, COL, guideId), {
    storeCount: totalStores + 1,
    updatedAt: serverTimestamp(),
  });
  return ref;
}

export async function updateGuideStore(guideId, storeId, data) {
  return updateDoc(doc(db, COL, guideId, 'stores', storeId), data);
}

export async function deleteGuideStore(guideId, storeId, newTotal) {
  await deleteDoc(doc(db, COL, guideId, 'stores', storeId));
  if (newTotal != null) {
    await updateDoc(doc(db, COL, guideId), {
      storeCount: newTotal,
      updatedAt: serverTimestamp(),
    });
  }
}
