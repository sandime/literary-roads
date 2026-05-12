import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyBlKiGzXCTIgjqjzDROB_dywrjJntizkYE',
  authDomain:        'the-literary-roads.firebaseapp.com',
  projectId:         'the-literary-roads',
  storageBucket:     'the-literary-roads.firebasestorage.app',
  messagingSenderId: '305145573086',
  appId:             '1:305145573086:web:206ec464384fe149c45c4f',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

await setDoc(doc(db, 'driveIns', 'hilltop-drive-in-theater-wv'), {
  name:    'Hilltop Drive-In Theater',
  address: '1 Hilltop Dr',
  city:    'Chester',
  state:   'WV',
  zip:     '26034',
  website: 'https://hilltopdriveintheater.com/',
  phone:   '',
  lat:     40.589331899337886,
  lng:     -80.53999772384574,
  source:  'manual',
  active:  true,
  createdAt: serverTimestamp(),
});

console.log('Done — Hilltop Drive-In Theater added to driveIns.');
process.exit(0);
