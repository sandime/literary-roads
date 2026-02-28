import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Setting up onAuthStateChanged listener');
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('[AuthContext] Auth state changed:', firebaseUser ? `user=${firebaseUser.email}` : 'null');
      setUser(firebaseUser);
      setAuthLoading(false);
    }, (error) => {
      console.error('[AuthContext] onAuthStateChanged error:', error);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    console.log('[AuthContext] signInWithGoogle called');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[AuthContext] Google sign-in success:', result.user.email);
      return result;
    } catch (e) {
      console.error('[AuthContext] Google sign-in error:', e.code, e.message, e);
      throw e;
    }
  };

  const signInWithEmail = async (email, password) => {
    console.log('[AuthContext] signInWithEmail called for:', email);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('[AuthContext] Email sign-in success:', result.user.email);
      return result;
    } catch (e) {
      console.error('[AuthContext] Email sign-in error:', e.code, e.message, e);
      throw e;
    }
  };

  const registerWithEmail = async (email, password) => {
    console.log('[AuthContext] registerWithEmail called for:', email);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('[AuthContext] Registration success:', result.user.email);
      return result;
    } catch (e) {
      console.error('[AuthContext] Registration error:', e.code, e.message, e);
      throw e;
    }
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
