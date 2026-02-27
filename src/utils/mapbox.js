// Mapbox Directions API for real road routing
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Get real driving route between two points
export const getMapboxRoute = async (startLat, startLng, endLat, endLng) => {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?` +
      `geometries=geojson&` +
      `access_token=${MAPBOX_ACCESS_TOKEN}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      // Convert GeoJSON coordinates [lng, lat] to [lat, lng] for Leaflet
      const points = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      
      console.log('Mapbox returned', points.length, 'route points');
      return points;
    }
    
    console.log('No Mapbox route found');
    return null;
  } catch (error) {
    console.error('Mapbox routing error:', error);
    return null;
  }
};
