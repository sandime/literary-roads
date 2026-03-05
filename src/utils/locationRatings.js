import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  increment,
} from 'firebase/firestore';

export const STARBURST_THRESHOLD = 2; // temporary — change back to 10 for production

// Real-time subscription to a location's rating doc.
// Calls callback(data | null).
export function subscribeToRating(locationId, callback) {
  const ref = doc(db, 'locationRatings', locationId);
  return onSnapshot(
    ref,
    (snap) => callback(snap.exists() ? snap.data() : null),
    () => callback(null)
  );
}

// Cast a yes/no vote. Throws if the user has already voted.
export async function castVote(locationId, userId, vote) {
  const ref = doc(db, 'locationRatings', locationId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();
    if ((data.voters || []).includes(userId)) {
      throw new Error('Already voted');
    }
    const newYesVotes = (data.yesVotes || 0) + (vote === 'yes' ? 1 : 0);
    const updates = {
      voters: arrayUnion(userId),
      hasStarburst: newYesVotes >= STARBURST_THRESHOLD,
    };
    if (vote === 'yes') updates.yesVotes = increment(1);
    else updates.noVotes = increment(1);
    await updateDoc(ref, updates);
  } else {
    const yesVotes = vote === 'yes' ? 1 : 0;
    await setDoc(ref, {
      yesVotes,
      noVotes: vote === 'no' ? 1 : 0,
      voters: [userId],
      hasStarburst: yesVotes >= STARBURST_THRESHOLD,
    });
  }
}
