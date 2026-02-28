import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// TODO: Replace with your actual Firebase config
// Get this from Firebase Console > Project Settings > General
const firebaseConfig = {
  apiKey: "AIzaSyBlKiGzXCTIgjqjzDROB_dywrjJntizkYE",
  authDomain: "the-literary-roads.firebaseapp.com",
  projectId: "the-literary-roads",
  storageBucket: "the-literary-roads.firebasestorage.app",
  messagingSenderId: "305145573086",
  appId: "1:305145573086:web:206ec464384fe149c45c4f",
  measurementId: "G-X60BFMGE9Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log('[Firebase] App initialized:', app.name, '| Project:', firebaseConfig.projectId);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
console.log('[Firebase] Auth instance:', auth);
console.log('[Firebase] Auth currentUser on init:', auth.currentUser);
console.log('[Firebase] Auth app name:', auth.app.name);

export default app;
