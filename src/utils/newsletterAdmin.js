// src/utils/newsletterAdmin.js
// Firestore CRUD for all 5 gazette admin collections
import { db } from '../config/firebase';
import {
  collection, getDocs, addDoc,
  updateDoc as firestoreUpdate,
  deleteDoc as firestoreDelete,
  doc, serverTimestamp, query, orderBy, where,
} from 'firebase/firestore';

export const ADMIN_UID = 'LmsIBzI7KjMqERTsmXxjHULHJ3M2';

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
