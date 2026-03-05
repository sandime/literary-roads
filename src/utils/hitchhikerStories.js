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

// Append a sentence. Creates the story doc if it doesn't exist yet.
export async function addSentence(locationId, locationName, sentenceText, user) {
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
      title: `The Tale of ${locationName}`,
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
