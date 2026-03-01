import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Haversine distance formula
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Get curated literary landmarks from Firebase within radiusMiles of any route point.
// Pass start + all route points + end for full coverage.
// Use a generous radius (25 miles default) since ALA landmarks are geocoded to city centers.
export const getCuratedLandmarks = async (routePoints, radiusMiles = 25) => {
  try {
    const landmarksRef = collection(db, 'literary_landmarks');
    const snapshot = await getDocs(landmarksRef);

    const allLandmarks = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Skip docs without valid coordinates (failed geocoding)
      if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
      // Preserve the original source field (e.g. 'ALA') so The Shelf can attribute correctly
      allLandmarks.push({ id: doc.id, ...data });
    });

    console.log(`[Firestore] ${allLandmarks.length} total landmarks fetched`);

    // Sample route points to keep the distance check fast on long routes
    const samplePoints = routePoints.filter((_, i) => i % 5 === 0)
      .concat(routePoints[routePoints.length - 1]); // always include last point

    const nearbyLandmarks = allLandmarks.filter(landmark =>
      samplePoints.some(point =>
        getDistance(landmark.lat, landmark.lng, point[0], point[1]) <= radiusMiles
      )
    );

    console.log(`[Firestore] ${nearbyLandmarks.length} landmarks within ${radiusMiles} miles of route`);
    return nearbyLandmarks;
  } catch (error) {
    console.error('[Firestore] getCuratedLandmarks error:', error);
    return [];
  }
};
