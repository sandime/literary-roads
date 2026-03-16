import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export const subscribeToTravelStats = (userId, callback) => {
  let checkInEntries = [];
  let booksLoggedCount = 0;

  const emit = () => {
    const uniqueLocations = new Set(checkInEntries.map(e => e.locationId)).size;
    const statesExplored  = new Set(checkInEntries.map(e => e.state).filter(Boolean)).size;
    const counts = checkInEntries.reduce((acc, e) => {
      const t = e.locationType || 'bookstore';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    callback({
      totalCheckIns:     checkInEntries.length,
      uniqueLocations,
      bookstoresVisited: counts.bookstore   || 0,
      cafesVisited:      counts.cafe        || 0,
      festivalsAttended: counts.festival    || 0,
      landmarksVisited:  counts.landmark    || 0,
      driveInsVisited:   counts.drivein     || 0,
      statesExplored,
      booksLogged:       booksLoggedCount,
    });
  };

  const unsubCheckIns = onSnapshot(
    collection(db, 'users', userId, 'checkInHistory'),
    (snap) => { checkInEntries = snap.docs.map(d => d.data()); emit(); },
    (err) => console.error('[travelStats] checkInHistory error:', err),
  );

  const unsubBooks = onSnapshot(
    collection(db, 'users', userId, 'booksRead'),
    (snap) => { booksLoggedCount = snap.size; emit(); },
    (err) => console.error('[travelStats] booksRead error:', err),
  );

  return () => { unsubCheckIns(); unsubBooks(); };
};
