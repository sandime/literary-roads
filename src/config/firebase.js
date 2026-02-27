import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: Replace with your actual Firebase config
// Get this from Firebase Console > Project Settings > General
const firebaseConfig = {
  apiKey: "AIzaSyAg-y6Bx075pPTxUZ8giyzOojx_c61O4BM",
  authDomain: "the-literary-roads.firebaseapp.com",
  projectId: "the-literary-roads",
  storageBucket: "the-literary-roads.firebasestorage.app",
  messagingSenderId: "305145573086",
  appId: "1:305145573086:web:04a46d6d576ff01ec45c4f",
  measurementId: "G-GDKFFPQYLT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
