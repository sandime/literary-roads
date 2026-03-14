import { db } from '../config/firebase';
import {
  doc, setDoc, updateDoc, getDocs, onSnapshot, serverTimestamp, collection,
} from 'firebase/firestore';

export const QUEST_PRESETS = [
  { label: 'Commuter',      value: 12,  sub: '1 book per month' },
  { label: 'Road Tripper',  value: 24,  sub: '2 books per month' },
  { label: 'Cross-Country', value: 52,  sub: '1 book per week' },
  { label: 'Navigator',     value: 100, sub: 'Nearly 2 per week' },
];

// ── Pure stat computation ─────────────────────────────────────────────────────
export function computeQuestStats(booksReadThisYear, goal) {
  if (!goal) return null;
  const now       = new Date();
  const year      = now.getFullYear();
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd   = new Date(year, 11, 31, 23, 59, 59).getTime();
  const yearPct   = (now.getTime() - yearStart) / (yearEnd - yearStart);
  const expected  = goal * yearPct;
  const diff      = booksReadThisYear - expected;

  let status, statusEmoji;
  if (booksReadThisYear >= goal) {
    status = 'Quest complete!';             statusEmoji = '🏆';
  } else if (diff >= 3) {
    status = 'Ahead of pace!';             statusEmoji = '🔥';
  } else if (diff <= -3) {
    status = 'Behind — but you\'ll catch up!'; statusEmoji = '💪';
  } else {
    status = 'On track!';                  statusEmoji = '📚';
  }

  const pct       = Math.min(100, Math.round((booksReadThisYear / goal) * 100));
  const remaining = Math.max(0, goal - booksReadThisYear);

  return { pct, remaining, status, statusEmoji, booksReadThisYear, goal, year };
}

// ── Firestore CRUD ────────────────────────────────────────────────────────────
const goalRef = (userId) => doc(db, 'users', userId, 'readingGoals', 'current');

export function subscribeToReadingGoal(userId, callback) {
  return onSnapshot(
    goalRef(userId),
    snap => callback(snap.exists() ? snap.data() : null),
    err => console.error('[readingQuest] goal:', err),
  );
}

export async function setReadingGoal(userId, goal) {
  await setDoc(goalRef(userId), {
    goal,
    year:      new Date().getFullYear(),
    startedAt: serverTimestamp(),
  });
}

export async function updateReadingGoalValue(userId, goal) {
  await updateDoc(goalRef(userId), { goal });
}

// Archive last year's progress then create the new year's goal (same goal value).
export async function archiveAndResetYear(userId, oldYear, oldGoal, booksReadLastYear) {
  const pct = Math.round((booksReadLastYear / oldGoal) * 100);
  await setDoc(doc(db, 'users', userId, 'readingQuestHistory', String(oldYear)), {
    year:            oldYear,
    goal:            oldGoal,
    booksRead:       booksReadLastYear,
    percentComplete: pct,
    completed:       booksReadLastYear >= oldGoal,
    archivedAt:      serverTimestamp(),
  });
  await setDoc(goalRef(userId), {
    goal:      oldGoal,
    year:      new Date().getFullYear(),
    startedAt: serverTimestamp(),
  });
}

export function subscribeToQuestHistory(userId, callback) {
  return onSnapshot(
    collection(db, 'users', userId, 'readingQuestHistory'),
    snap => callback(snap.docs.map(d => d.data()).sort((a, b) => b.year - a.year)),
    err => console.error('[readingQuest] history:', err),
  );
}

// How many booksRead docs were finished in a specific year
export async function countBooksForYear(userId, year) {
  const snap = await getDocs(collection(db, 'users', userId, 'booksRead'));
  return snap.docs.filter(d => d.data().finishedYear === year).length;
}
