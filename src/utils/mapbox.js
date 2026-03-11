// Mapbox Directions API for real road routing
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Get real driving route between two points
// overviewFull=true returns full road geometry (better for short city segments)
export const getMapboxRoute = async (startLat, startLng, endLat, endLng, overviewFull = false) => {
  try {
    const overview = overviewFull ? 'full' : 'simplified';
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?` +
      `geometries=geojson&overview=${overview}&` +
      `access_token=${MAPBOX_ACCESS_TOKEN}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.message || data.error) {
      console.error('[Mapbox] API error:', data.message || data.error, data);
      return null;
    }

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // Convert GeoJSON coordinates [lng, lat] to [lat, lng] for Leaflet
      const points = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      console.log('[Mapbox] route points:', points.length, '| distance:', (route.distance / 1000).toFixed(0), 'km');
      return points;
    }

    console.warn('[Mapbox] no routes in response:', data);
    return null;
  } catch (error) {
    console.error('[Mapbox] routing error:', error);
    return null;
  }
};
