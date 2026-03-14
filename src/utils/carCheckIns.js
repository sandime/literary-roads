import { db } from '../config/firebase';
import {
  collection, setDoc, deleteDoc, updateDoc, doc, onSnapshot, serverTimestamp,
  getDoc, writeBatch, deleteField,
} from 'firebase/firestore';

export const CAR_TYPES = {
  convertible: { label: 'Classic Convertible', file: 'car-icon-convertible.png'  },
  rocket:      { label: 'Rocket Coupe',        file: 'car-icon-black-fins.png'   },
  woody:       { label: 'Woody Wagon',         file: 'car-icon-woody.png'        },
  bookbus:     { label: 'Book Bus',            file: 'car-icon-bookbus.png'      },
  truck:       { label: 'Road Truck',          file: 'car-icon-truck.png'        },
  ghia:        { label: 'Karmann Ghia',        file: 'car-icon-ghia.png'         },
  pinkmoto:    { label: 'Pink Moto',           file: 'car-icon-pink-moto.png'    },
  pinkstud:    { label: 'Pink Studebaker',     file: 'car-icon-pink-stud.png'    },
  creamstud:   { label: 'Cream Studebaker',    file: 'car-icon-cream-stud.png'   },
  orangevw:    { label: 'Orange VW Bus',       file: 'car-icon-orange-vw.png'    },
};

// encodeURIComponent handles filenames with spaces (e.g. "car-icon-pink moto.png")
export const carImgSrc = (carType) => {
  const file = CAR_TYPES[carType]?.file ?? CAR_TYPES.convertible.file;
  return `/literary-roads/images/cars/${encodeURIComponent(file)}`;
};

export const saveSelectedCar = (userId, carType) =>
  setDoc(doc(db, 'users', userId), { selectedCar: carType }, { merge: true });

// locationMeta: { locationName, locationType, city, state } — saved to permanent history
export const checkIn = async (userId, userName, carType, locationId, lat, lng, locationMeta = {}) => {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  console.log('[carCheckIns] checking in:', userId, 'at', locationId, 'car:', carType);

  // Read user's current active check-in from their profile doc (no separate collection needed)
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const existing = userSnap.exists() ? (userSnap.data().activeCheckIn || null) : null;

  const batch = writeBatch(db);

  // Auto-leave previous location before parking at the new one
  if (existing) {
    batch.delete(doc(db, 'activeCheckIns', existing.locationId, 'cars', existing.checkInId));
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

  // Store active check-in info on the user doc (already accessible, no extra rules needed)
  batch.set(userRef, { activeCheckIn: { locationId, checkInId: newCheckInRef.id } }, { merge: true });

  await batch.commit();

  // ── Permanent history record (never expires) ──────────────────────────────
  // Saved separately so a batch failure doesn't block the active check-in
  try {
    const { locationName = '', locationType = 'bookstore', city = '', state = '' } = locationMeta;
    await setDoc(
      doc(db, 'users', userId, 'checkInHistory', newCheckInRef.id),
      {
        locationId,
        locationName,
        locationType,
        city,
        state,
        lat,
        lng,
        checkedInAt: serverTimestamp(),
        carUsed: carType,
      },
    );
  } catch (err) {
    // Non-fatal: history failure should never break the active check-in UX
    console.error('[carCheckIns] history write failed:', err);
  }

  return newCheckInRef;
};

// Called from Profile when user changes car while parked — reads activeCheckIn from user doc
export const updateParkedCar = async (userId, newCarType, activeCheckIn) => {
  if (!activeCheckIn?.locationId || !activeCheckIn?.checkInId) return;
  await updateDoc(
    doc(db, 'activeCheckIns', activeCheckIn.locationId, 'cars', activeCheckIn.checkInId),
    { carType: newCarType },
  );
};

export const deleteCheckIn = (locationId, checkInId, userId) => {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'activeCheckIns', locationId, 'cars', checkInId));
  // Clear the activeCheckIn field on the user doc
  if (userId) {
    batch.update(doc(db, 'users', userId), { activeCheckIn: deleteField() });
  }
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
