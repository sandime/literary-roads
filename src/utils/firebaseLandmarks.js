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

// Get curated literary landmarks from Firebase
export const getCuratedLandmarks = async (routePoints, radiusMiles = 5) => {
  try {
    // Get all curated landmarks from Firebase
    const landmarksRef = collection(db, 'literary_landmarks');
    const snapshot = await getDocs(landmarksRef);
    
    const allLandmarks = [];
    snapshot.forEach((doc) => {
      allLandmarks.push({
        id: doc.id,
        ...doc.data(),
        source: 'curated'
      });
    });
    
    // Filter to only those near the route
    const nearbyLandmarks = allLandmarks.filter(landmark => {
      return routePoints.some(point => {
        const distance = getDistance(landmark.lat, landmark.lng, point[0], point[1]);
        return distance <= radiusMiles;
      });
    });
    
    return nearbyLandmarks;
  } catch (error) {
    console.error('Error fetching curated landmarks:', error);
    return [];
  }
};
