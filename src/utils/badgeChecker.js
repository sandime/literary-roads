import { db } from '../config/firebase';
import {
  collection, getDocs, getDoc, setDoc, doc, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { BADGES, BADGE_MAP } from './badgeDefinitions';

// ── Fetch combined stats from Firestore ──────────────────────────────────────
async function fetchCombinedStats(userId) {
  const [checkInSnap, booksSnap] = await Promise.all([
    getDocs(collection(db, 'users', userId, 'checkInHistory')),
    getDocs(collection(db, 'users', userId, 'booksRead')),
  ]);

  const entries = checkInSnap.docs.map(d => d.data());
  const uniqueLocations = new Set(entries.map(e => e.locationId)).size;
  const statesExplored  = new Set(entries.map(e => e.state).filter(Boolean)).size;
  const counts = entries.reduce((acc, e) => {
    const t = e.locationType || 'bookstore';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return {
    totalCheckIns:     entries.length,
    uniqueLocations,
    bookstoresVisited: counts.bookstore   || 0,
    cafesVisited:      counts.cafe        || 0,
    festivalsAttended: counts.festival    || 0,
    statesExplored,
    booksLogged:       booksSnap.size,
  };
}

// ── Check all badges and award newly earned ones ──────────────────────────────
// Returns array of badge definition objects that were just awarded (empty if none)
export async function checkAndAwardBadges(userId) {
  try {
    const [stats, earnedSnap] = await Promise.all([
      fetchCombinedStats(userId),
      getDocs(collection(db, 'users', userId, 'badges')),
    ]);

    const earnedIds = new Set(earnedSnap.docs.map(d => d.id));
    const newlyEarned = [];

    for (const badge of BADGES) {
      if (badge.custom) continue; // handled separately
      if (earnedIds.has(badge.id)) continue;
      const current = stats[badge.stat] || 0;
      if (current >= badge.required) {
        await setDoc(doc(db, 'users', userId, 'badges', badge.id), {
          badgeId:  badge.id,
          earnedAt: serverTimestamp(),
          progress: current,
        });
        newlyEarned.push(badge);
      }
    }

    return newlyEarned;
  } catch (err) {
    console.error('[badgeChecker] checkAndAwardBadges:', err);
    return [];
  }
}

// ── Real-time subscription to a user's earned badges ─────────────────────────
// callback receives array of { badgeId, earnedAt, progress }
export function subscribeToUserBadges(userId, callback) {
  return onSnapshot(
    collection(db, 'users', userId, 'badges'),
    snap => callback(snap.docs.map(d => d.data())),
    err => console.error('[badgeChecker] subscribe:', err),
  );
}

// ── Award Founder's Circle badge ──────────────────────────────────────────────
// Call after user saves a favorite book. Returns badge definition if newly awarded, else null.
export async function checkAndAwardFoundersBadge(userId, founderEligible, favBookCount) {
  if (!founderEligible || favBookCount < 1) return null;
  try {
    const badgeRef  = doc(db, 'users', userId, 'badges', 'founders-circle');
    const badgeSnap = await getDoc(badgeRef);
    if (badgeSnap.exists()) return null; // already earned

    const userSnap    = await getDoc(doc(db, 'users', userId));
    const accountNumber = userSnap.data()?.accountNumber || 0;

    await setDoc(badgeRef, {
      badgeId:      'founders-circle',
      earnedAt:     serverTimestamp(),
      serialNumber: accountNumber,
      progress:     1,
    });

    return BADGE_MAP['founders-circle'];
  } catch (err) {
    console.error('[badgeChecker] founders badge:', err);
    return null;
  }
}

// ── Compute progress for every badge from a combined stats object ─────────────
// Returns array of badge objects enriched with { current, pct, earned }
export function computeBadgeProgress(stats) {
  return BADGES.map(badge => {
    if (badge.custom) {
      // Custom badges have no stat-based progress — shown as locked until earned
      return { ...badge, current: 0, pct: 0, earned: false };
    }
    const current = (stats && stats[badge.stat]) || 0;
    const pct     = Math.min(100, Math.round((current / badge.required) * 100));
    return { ...badge, current, pct, earned: current >= badge.required };
  });
}
