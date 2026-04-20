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

// ── Award seasonal reading-quest badges ──────────────────────────────────────
// Call after booksReadThisYear changes. Returns array of newly-awarded badge defs.
export async function checkSeasonalBadges(userId, booksReadThisYear, goal) {
  if (!goal || booksReadThisYear === undefined) return [];
  try {
    const now         = new Date();
    const currentYear = now.getFullYear();
    const month       = now.getMonth(); // 0-indexed

    const earnedSnap     = await getDocs(collection(db, 'users', userId, 'badges'));
    const earnedThisYear = new Set(
      earnedSnap.docs
        .filter(d => d.data().year === currentYear)
        .map(d => d.id),
    );

    const SEASONAL_IDS = ['spring-reader', 'summer-scholar', 'fall-bibliophile', 'winter-wanderer'];
    const newlyEarned  = [];

    for (const badge of BADGES.filter(b => b.seasonal && b.id !== 'year-round-reader')) {
      if (month > badge.endMonth) continue;           // past the quarterly deadline
      if (earnedThisYear.has(badge.id)) continue;     // already earned this year
      if (booksReadThisYear < Math.ceil(goal * badge.threshold)) continue;

      await setDoc(doc(db, 'users', userId, 'badges', badge.id), {
        badgeId:  badge.id,
        earnedAt: serverTimestamp(),
        year:     currentYear,
        progress: booksReadThisYear,
      });
      earnedThisYear.add(badge.id); // for year-round check below
      newlyEarned.push(badge);
    }

    // Year-Round Reader — all 4 seasonal badges earned in same year
    if (!earnedThisYear.has('year-round-reader') &&
        SEASONAL_IDS.every(id => earnedThisYear.has(id))) {
      const yrBadge = BADGE_MAP['year-round-reader'];
      await setDoc(doc(db, 'users', userId, 'badges', 'year-round-reader'), {
        badgeId:  'year-round-reader',
        earnedAt: serverTimestamp(),
        year:     currentYear,
        progress: booksReadThisYear,
      });
      newlyEarned.push(yrBadge);
    }

    return newlyEarned;
  } catch (err) {
    console.error('[badgeChecker] seasonal:', err);
    return [];
  }
}

// ── Award Founder's Circle badge ──────────────────────────────────────────────
// Call after user logs a book. Conditions: accountNumber <= 100 AND booksRead >= 1.
// Reads founderEligible and booksRead count from Firestore — no caller bookkeeping needed.
export async function checkAndAwardFoundersBadge(userId) {
  try {
    const badgeRef  = doc(db, 'users', userId, 'badges', 'founders-circle');
    const badgeSnap = await getDoc(badgeRef);
    if (badgeSnap.exists()) return null; // already earned

    const [userSnap, booksSnap] = await Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDocs(collection(db, 'users', userId, 'booksRead')),
    ]);

    const userData = userSnap.data() || {};
    if (!userData.founderEligible) return null;   // not in first 100
    if (booksSnap.size < 1) return null;          // no book logged yet

    await setDoc(badgeRef, {
      badgeId:      'founders-circle',
      earnedAt:     serverTimestamp(),
      serialNumber: userData.accountNumber || 0,
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
