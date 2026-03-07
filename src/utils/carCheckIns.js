import { db } from '../config/firebase';
import {
  collection, addDoc, setDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
} from 'firebase/firestore';

export const CAR_TYPES = {
  convertible: { label: 'Classic Convertible', file: 'car-icon-convertible.png' },
  rocket:      { label: 'Rocket Coupe',        file: 'car-icon-black-fins.png'  },
  woody:       { label: 'Woody Wagon',          file: 'car-icon-woody.png'       },
  bookbus:     { label: 'Book Bus',             file: 'car-icon-bookbus.png'     },
};

export const carImgSrc = (carType) =>
  `/literary-roads/images/cars/${CAR_TYPES[carType]?.file ?? CAR_TYPES.convertible.file}`;

export const saveSelectedCar = (userId, carType) =>
  setDoc(doc(db, 'users', userId), { selectedCar: carType }, { merge: true });

export const checkIn = (userId, userName, carType, locationId, lat, lng) => {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  console.log('[carCheckIns] checking in:', userId, 'at', locationId, 'car:', carType);
  return addDoc(collection(db, 'activeCheckIns', locationId, 'cars'), {
    userId,
    userName,
    carType,
    checkedInAt: serverTimestamp(),
    expiresAt,
    latitude: lat,
    longitude: lng,
  });
};

export const deleteCheckIn = (locationId, checkInId) =>
  deleteDoc(doc(db, 'activeCheckIns', locationId, 'cars', checkInId));

export const subscribeToLocationCars = (locationId, onUpdate) => {
  const ref = collection(db, 'activeCheckIns', locationId, 'cars');
  return onSnapshot(
    ref,
    (snap) => {
      const now = Date.now();
      const active = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => new Date(c.expiresAt).getTime() > now);
      onUpdate(active);
    },
    (err) => console.error('[carCheckIns] subscribe', locationId, err),
  );
};
