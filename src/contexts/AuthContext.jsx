import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';

const AuthContext = createContext(null);

// Atomically increments the global user counter and saves accountNumber to the user doc.
// Safe to call redundantly — skips if user already has an accountNumber.
async function assignAccountNumber(userId, extraFields = {}) {
  const counterRef = doc(db, 'globalCounters', 'userCount');
  const userRef    = doc(db, 'users', userId);
  await runTransaction(db, async (tx) => {
    const [userSnap, counterSnap] = await Promise.all([tx.get(userRef), tx.get(counterRef)]);
    if (userSnap.exists() && userSnap.data().accountNumber) return; // already assigned
    const accountNumber = (counterSnap.exists() ? (counterSnap.data().totalUsersCreated || 0) : 0) + 1;
    tx.set(counterRef, { totalUsersCreated: accountNumber }, { merge: true });
    tx.set(userRef, {
      ...extraFields,
      accountNumber,
      founderEligible: accountNumber <= 100,
    }, { merge: true });
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    }, () => setAuthLoading(false));
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const { isNewUser } = getAdditionalUserInfo(result);
    if (isNewUser) {
      await assignAccountNumber(result.user.uid, {
        displayName: result.user.displayName || 'Literary Traveler',
        createdAt: serverTimestamp(),
      });
    }
    return result;
  };

  const signInWithEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const registerWithEmail = async (email, password, displayName) => {
    const name = displayName?.trim() || 'Literary Traveler';
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    // Atomic: create user doc + assign founder account number
    await assignAccountNumber(result.user.uid, {
      displayName: name,
      createdAt: serverTimestamp(),
    });
    return result;
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, authLoading, signInWithGoogle, signInWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
