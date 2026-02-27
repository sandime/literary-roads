const KEY = 'literary-roads-trip';

export const getTrip = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

export const addToTrip = (location) => {
  const trip = getTrip();
  if (trip.find((i) => i.id === location.id)) return trip;
  const updated = [...trip, location];
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
};

export const removeFromTrip = (id) => {
  const updated = getTrip().filter((i) => i.id !== id);
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
};

export const clearTrip = () => {
  localStorage.removeItem(KEY);
  return [];
};
