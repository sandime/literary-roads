import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export const subscribeToTravelStats = (userId, callback) => {
  const ref = collection(db, 'users', userId, 'checkInHistory');
  return onSnapshot(
    ref,
    (snap) => {
      const entries = snap.docs.map(d => d.data());

      const uniqueLocations = new Set(entries.map(e => e.locationId)).size;
      const statesExplored  = new Set(entries.map(e => e.state).filter(Boolean)).size;

      const counts = entries.reduce((acc, e) => {
        const t = e.locationType || 'bookstore';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});

      callback({
        totalCheckIns:      entries.length,
        uniqueLocations,
        bookstoresVisited:  counts.bookstore   || 0,
        cafesVisited:       counts.cafe        || 0,
        festivalsAttended:  counts.festival    || 0,
        landmarksVisited:   counts.landmark    || 0,
        driveInsVisited:    counts['drive-in'] || 0,
        statesExplored,
      });
    },
    (err) => console.error('[travelStats] subscribe error:', err),
  );
};
