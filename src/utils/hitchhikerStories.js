import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  increment,
  serverTimestamp,
} from 'firebase/firestore';

// Update the text of one sentence (author only). Reads + writes the full array.
export async function editSentence(locationId, sentenceIndex, newText, userId) {
  const ref = doc(db, 'hitchhikerStories', locationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Story not found.');
  const sentences = [...snap.data().sentences];
  if (sentences[sentenceIndex]?.userId !== userId) throw new Error('Not your sentence.');
  sentences[sentenceIndex] = {
    ...sentences[sentenceIndex],
    text: newText,
    editedAt: new Date().toISOString(),
  };
  await updateDoc(ref, { sentences });
}

export const MAX_SENTENCES = 100;
export const MAX_CHARS = 150;

// Real-time subscription to a story doc. Calls callback(story | null).
export function subscribeToStory(locationId, callback) {
  const ref = doc(db, 'hitchhikerStories', locationId);
  return onSnapshot(
    ref,
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    () => callback(null)
  );
}

export const MAX_TITLE_CHARS = 60;

// Append a sentence. Creates the story doc if it doesn't exist yet.
// customTitle is required when creating a new story; ignored for existing ones.
export async function addSentence(locationId, locationName, sentenceText, user, customTitle) {
  const ref = doc(db, 'hitchhikerStories', locationId);
  const sentence = {
    userId: user.uid,
    userName: user.displayName || 'Anonymous Traveler',
    text: sentenceText,
    timestamp: new Date().toISOString(),
  };

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      title: (customTitle || '').trim() || `The Tale of ${locationName}`,
      locationName,
      locationPlaceId: locationId,
      createdBy: { userId: user.uid, userName: user.displayName || 'Anonymous Traveler' },
      createdAt: serverTimestamp(),
      sentences: [sentence],
      sentenceCount: 1,
    });
  } else {
    const current = snap.data();
    if ((current.sentenceCount || 0) >= MAX_SENTENCES) {
      throw new Error('This tale has reached its maximum length.');
    }
    await updateDoc(ref, {
      sentences: arrayUnion(sentence),
      sentenceCount: increment(1),
    });
  }
}
