import { db } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const GLOBAL_KEY = 'lr-honk-global';
const locKey = (id) => `lr-honk-loc-${id}`;
const MAX_PER_MIN = 3;
const LOC_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// Returns { allowed: true } or { allowed: false, reason: 'rate' | 'cooldown' }
export const checkHonkAllowed = (locationId) => {
  const now = Date.now();
  const recent = JSON.parse(localStorage.getItem(GLOBAL_KEY) || '[]')
    .filter(t => now - t < 60_000);
  if (recent.length >= MAX_PER_MIN) return { allowed: false, reason: 'rate' };
  const last = Number(localStorage.getItem(locKey(locationId)) || 0);
  if (now - last < LOC_COOLDOWN_MS) return { allowed: false, reason: 'cooldown' };
  return { allowed: true };
};

export const recordHonk = (locationId) => {
  const now = Date.now();
  const recent = JSON.parse(localStorage.getItem(GLOBAL_KEY) || '[]')
    .filter(t => now - t < 60_000);
  localStorage.setItem(GLOBAL_KEY, JSON.stringify([...recent, now]));
  localStorage.setItem(locKey(locationId), String(now));
};

// Writes a pending honk notification to each recipient's Firestore doc
export const sendHonkNotifications = (toUserIds, fromUserName, locationName) =>
  Promise.all(toUserIds.map(uid =>
    setDoc(doc(db, 'honkNotifications', uid), {
      fromName: fromUserName,
      locationName,
      at: serverTimestamp(),
      pending: true,
    })
  ));

export const clearHonkNotification = (userId) =>
  setDoc(doc(db, 'honkNotifications', userId), { pending: false }, { merge: true });

// ── Browser Notification API (desktop) ───────────────────────────────────────

// Request permission proactively (call when user parks their car).
// Returns true if permission was already granted or just granted.
export const requestHonkNotifPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
};

// Show a browser notification (falls back silently if not supported/denied).
// Shown even when the tab is in the background.
export const showBrowserHonkNotification = (fromName, locationName) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification('🚗 Beep Beep!', {
      body: `${fromName} honked at you at ${locationName}!`,
      icon: '/literary-roads/images/retro-car.png',
      tag: 'lr-honk', // replaces any existing honk notification instead of stacking
      silent: false,
    });
    setTimeout(() => n.close(), 6000);
  } catch { /* browsers may block even with permission in some contexts */ }
};

// Plays a retro "beep beep" car horn using the Web Audio API
export const playHorn = (soundEnabled) => {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (startOffset, freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + startOffset + 0.03);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + startOffset + 0.17);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startOffset + 0.23);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + 0.25);
    };
    beep(0,    392); // G4 — first beep
    beep(0.30, 440); // A4 — second beep (slight pitch shift for retro feel)
  } catch (e) {
    console.warn('[honk] audio error:', e);
  }
};
