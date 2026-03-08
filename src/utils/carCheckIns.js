import { db } from '../config/firebase';
import {
  collection, setDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
  getDoc, writeBatch,
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

export const checkIn = async (userId, userName, carType, locationId, lat, lng) => {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  console.log('[carCheckIns] checking in:', userId, 'at', locationId, 'car:', carType);

  // Read user's current active check-in (if any)
  const userCheckInRef = doc(db, 'userActiveCheckIn', userId);
  const existing = await getDoc(userCheckInRef);

  const batch = writeBatch(db);

  // Auto-leave previous location before parking at the new one
  if (existing.exists()) {
    const { locationId: oldLocId, checkInId: oldCheckInId } = existing.data();
    batch.delete(doc(db, 'activeCheckIns', oldLocId, 'cars', oldCheckInId));
  }

  // Create new check-in with a pre-generated ID so we can reference it in the batch
  const newCheckInRef = doc(collection(db, 'activeCheckIns', locationId, 'cars'));
  batch.set(newCheckInRef, {
    userId,
    userName,
    carType,
    checkedInAt: serverTimestamp(),
    expiresAt,
    latitude: lat,
    longitude: lng,
  });

  // Track user's single active check-in
  batch.set(userCheckInRef, { locationId, checkInId: newCheckInRef.id });

  await batch.commit();
  return newCheckInRef;
};

export const deleteCheckIn = (locationId, checkInId, userId) => {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'activeCheckIns', locationId, 'cars', checkInId));
  if (userId) batch.delete(doc(db, 'userActiveCheckIn', userId));
  return batch.commit();
};

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
