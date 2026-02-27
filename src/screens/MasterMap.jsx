import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MAP_CONFIG } from '../config/config';
import { searchAlongRoute, geocodeCity, searchNearbyPlaces } from '../utils/googlePlaces';
import { searchLiteraryAlongRoute } from '../utils/wikipedia';
import { getCuratedLandmarks } from '../utils/firebaseLandmarks';
import { getMapboxRoute } from '../utils/mapbox';
import { getTrip, addToTrip, removeFromTrip, clearTrip } from '../utils/tripStorage';
import RoadTrip from './RoadTrip';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Googie-style neon outline icons
const createCustomIcon = (type) => {
  const icons = {
    // QUILL - Historic Literary Landmarks (Paper White)
    landmark: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-white">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow-white)" class="neon-marker neon-flicker-slow">
          <!-- Quill shaft -->
          <path d="M 29 7 Q 27 13 24 19 L 20 29"
                fill="none" stroke="#F5F5DC" stroke-width="2" stroke-linecap="round"/>
          <!-- Feather barbs -->
          <line x1="25" y1="13" x2="21" y2="15" stroke="#F5F5DC" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="23" y1="17" x2="19" y2="19" stroke="#F5F5DC" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="22" y1="21" x2="18" y2="23" stroke="#F5F5DC" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Ink tip -->
          <circle cx="20" cy="30" r="1.5" fill="#F5F5DC"/>
        </g>
      </svg>
    `,

    // BOOK - Independent Bookstores (Atomic Orange)
    bookstore: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-orange">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow-orange)" class="neon-marker neon-flicker-fast">
          <!-- Open book outline -->
          <path d="M 10 14 L 10 29 Q 20 27 20 27 Q 20 27 30 29 L 30 14 Q 20 16 20 16 Q 20 16 10 14"
                fill="none" stroke="#FF4E00" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
          <!-- Center spine -->
          <line x1="20" y1="14" x2="20" y2="28" stroke="#FF4E00" stroke-width="1.5"/>
        </g>
      </svg>
    `,

    // COFFEE CUP - Reader-Friendly Cafes (Starlight Turquoise)
    cafe: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-turquoise">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow-turquoise)" class="neon-marker neon-shimmer">
          <!-- Coffee cup outline -->
          <path d="M 12 16 L 14 28 Q 20 30 26 28 L 28 16"
                fill="none" stroke="#40E0D0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
          <!-- Handle -->
          <path d="M 28 19 Q 32 21 32 25 Q 32 27 29 28"
                fill="none" stroke="#40E0D0" stroke-width="2" stroke-linecap="round"/>
          <!-- Steam (3 wavy lines) -->
          <path d="M 16 14 Q 17 11 16 8" fill="none" stroke="#40E0D0" stroke-width="1.5"
                stroke-linecap="round"/>
          <path d="M 20 14 Q 21 10 20 7" fill="none" stroke="#40E0D0" stroke-width="1.5"
                stroke-linecap="round"/>
          <path d="M 24 14 Q 25 11 24 8" fill="none" stroke="#40E0D0" stroke-width="1.5"
                stroke-linecap="round"/>
        </g>
      </svg>
    `,
  };

  return L.divIcon({
    html: icons[type] || icons.cafe,
    className: 'custom-googie-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const MasterMap = ({ selectedStates, onHome }) => {
  const [startCity, setStartCity] = useState('');
  const [endCity, setEndCity] = useState('');
  const [route, setRoute] = useState([]);
  const [visibleLocations, setVisibleLocations] = useState([]);
  const [showPlanner, setShowPlanner] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [tripItems, setTripItems] = useState(() => getTrip());
  const [showRoadTrip, setShowRoadTrip] = useState(false);

  const tripIds = useMemo(() => new Set(tripItems.map((i) => i.id)), [tripItems]);

  const handleTripToggle = (location) => {
    if (tripIds.has(location.id)) {
      setTripItems(removeFromTrip(location.id));
    } else {
      setTripItems(addToTrip(location));
    }
  };

  const handleClearTrip = () => {
    setTripItems(clearTrip());
  };

  // State centers for initial zoom
  const STATE_CENTERS = {
    'Alabama': [32.806671, -86.791130, 7],
    'Alaska': [61.370716, -152.404419, 4],
    'Arizona': [33.729759, -111.431221, 7],
    'Arkansas': [34.969704, -92.373123, 7],
    'California': [36.116203, -119.681564, 6],
    'Colorado': [39.059811, -105.311104, 7],
    'Connecticut': [41.597782, -72.755371, 8],
    'Delaware': [39.318523, -75.507141, 8],
    'Florida': [27.766279, -81.686783, 7],
    'Georgia': [33.040619, -83.643074, 7],
    'Hawaii': [21.094318, -157.498337, 7],
    'Idaho': [44.240459, -114.478828, 6],
    'Illinois': [40.349457, -88.986137, 7],
    'Indiana': [39.849426, -86.258278, 7],
    'Iowa': [42.011539, -93.210526, 7],
    'Kansas': [38.526600, -96.726486, 7],
    'Kentucky': [37.668140, -84.670067, 7],
    'Louisiana': [31.169546, -91.867805, 7],
    'Maine': [44.693947, -69.381927, 7],
    'Maryland': [39.063946, -76.802101, 8],
    'Massachusetts': [42.230171, -71.530106, 8],
    'Michigan': [43.326618, -84.536095, 7],
    'Minnesota': [45.694454, -93.900192, 6],
    'Mississippi': [32.741646, -89.678696, 7],
    'Missouri': [38.456085, -92.288368, 7],
    'Montana': [46.921925, -110.454353, 6],
    'Nebraska': [41.125370, -98.268082, 7],
    'Nevada': [38.313515, -117.055374, 6],
    'New Hampshire': [43.452492, -71.563896, 8],
    'New Jersey': [40.298904, -74.521011, 8],
    'New Mexico': [34.840515, -106.248482, 7],
    'New York': [42.165726, -74.948051, 7],
    'North Carolina': [35.630066, -79.806419, 7],
    'North Dakota': [47.528912, -99.784012, 7],
    'Ohio': [40.388783, -82.764915, 7],
    'Oklahoma': [35.565342, -96.928917, 7],
    'Oregon': [44.572021, -122.070938, 7],
    'Pennsylvania': [40.590752, -77.209755, 7],
    'Rhode Island': [41.680893, -71.511780, 9],
    'South Carolina': [33.856892, -80.945007, 7],
    'South Dakota': [44.299782, -99.438828, 7],
    'Tennessee': [35.747845, -86.692345, 7],
    'Texas': [31.054487, -97.563461, 6],
    'Utah': [40.150032, -111.862434, 7],
    'Vermont': [44.045876, -72.710686, 8],
    'Virginia': [37.769337, -78.169968, 7],
    'Washington': [47.400902, -121.490494, 7],
    'West Virginia': [38.491226, -80.954453, 7],
    'Wisconsin': [44.268543, -89.616508, 7],
    'Wyoming': [42.755966, -107.302490, 7]
  };

  // Compute initial map view from all selected states
  const initMapState = (() => {
    const centers = selectedStates.map((s) => STATE_CENTERS[s]).filter(Boolean);
    if (!centers.length) return { center: MAP_CONFIG.defaultCenter, zoom: MAP_CONFIG.defaultZoom };
    const lats = centers.map((c) => c[0]);
    const lngs = centers.map((c) => c[1]);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const spread = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
    let zoom = 7;
    if (spread > 20) zoom = 4;
    else if (spread > 15) zoom = 5;
    else if (spread > 8)  zoom = 6;
    return { center: [midLat, midLng], zoom };
  })();

  const [mapCenter, setMapCenter] = useState(initMapState.center);
  const [mapZoom, setMapZoom]     = useState(initMapState.zoom);

  // Label shown in the planner panel header
  const stateLabel =
    selectedStates.length === 1
      ? selectedStates[0]
      : selectedStates.length <= 3
      ? selectedStates.join(' · ')
      : `${selectedStates.length} States`;

  const handleNearMe = () => {
    setLoading(true);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        const places = await searchNearbyPlaces(latitude, longitude, 10);

        setMapCenter([latitude, longitude]);
        setMapZoom(12);
        setVisibleLocations(places);
        setShowPlanner(false);
        setRoute([]);
        setLoading(false);
      },
      () => {
        setError('Could not get your location. Please enable location services.');
        setLoading(false);
      }
    );
  };

  const handlePlotRoute = async () => {
    setError('');
    setLoading(true);

    try {
      // Single state: append state name to help geocoder disambiguate.
      // Multiple states: use raw input so cities in any selected state resolve.
      const startQuery = selectedStates.length === 1 ? `${startCity}, ${selectedStates[0]}` : startCity;
      const endQuery   = selectedStates.length === 1 ? `${endCity}, ${selectedStates[0]}`   : endCity;

      const startCoords = await geocodeCity(startQuery);
      const endCoords   = await geocodeCity(endQuery);

      if (!startCoords) {
        setError(`Could not find "${startCity}". Try adding the state, e.g. "Memphis, TN".`);
        setLoading(false);
        return;
      }

      if (!endCoords) {
        setError(`Could not find "${endCity}". Try adding the state, e.g. "Memphis, TN".`);
        setLoading(false);
        return;
      }

      let routePoints = await getMapboxRoute(
        startCoords.lat, startCoords.lng,
        endCoords.lat, endCoords.lng
      );

      if (!routePoints) {
        routePoints = [];
        const steps = 50;
        for (let i = 0; i <= steps; i++) {
          const lat = startCoords.lat + (endCoords.lat - startCoords.lat) * (i / steps);
          const lng = startCoords.lng + (endCoords.lng - startCoords.lng) * (i / steps);
          routePoints.push([lat, lng]);
        }
      }

      setRoute(routePoints);

      const [places, wikiLandmarks, curatedLandmarks] = await Promise.all([
        searchAlongRoute(routePoints, 5),
        searchLiteraryAlongRoute(routePoints, 5),
        getCuratedLandmarks(routePoints, 5)
      ]);

      setVisibleLocations([...curatedLandmarks, ...places, ...wikiLandmarks]);

      const lats = routePoints.map(p => p[0]);
      const lngs = routePoints.map(p => p[1]);

      const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

      const latDiff = Math.max(...lats) - Math.min(...lats);
      const lngDiff = Math.max(...lngs) - Math.min(...lngs);
      const maxDiff = Math.max(latDiff, lngDiff);

      let zoom = 13;
      if (maxDiff > 10) zoom = 6;
      else if (maxDiff > 5) zoom = 7;
      else if (maxDiff > 2) zoom = 8;
      else if (maxDiff > 1) zoom = 9;
      else if (maxDiff > 0.5) zoom = 10;
      else if (maxDiff > 0.2) zoom = 11;

      setMapCenter([midLat, midLng]);
      setMapZoom(zoom);

      setShowPlanner(false);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Route plotting error:', err);
    }

    setLoading(false);
  };

  const handleClearRoute = () => {
    setRoute([]);
    setVisibleLocations([]);
    setStartCity('');
    setEndCity('');
    setError('');
    setSelectedLocation(null);
    setShowPlanner(true);
  };

  return (
    <div className="relative h-screen w-full">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-midnight-navy/95 border-b-2 border-starlight-turquoise px-3 py-2 md:py-4">
        {/* Mobile: flex row so NEAR ME is static, not absolute */}
        <div className="flex items-center md:block">

          {/* Home button — static on mobile, absolute on md+ */}
          <button
            onClick={onHome}
            title="Back to map"
            className="flex-shrink-0 text-starlight-turquoise hover:text-atomic-orange transition-colors p-1 md:absolute md:left-4 md:top-1/2 md:-translate-y-1/2"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>

          {/* Title */}
          <div className="flex-1 text-center mx-1 md:mx-0">
            <h1 className="text-starlight-turquoise font-bungee text-[15px] md:text-2xl text-center drop-shadow-[0_0_10px_rgba(64,224,208,0.8)] leading-tight">
              THE LITERARY ROADS
            </h1>
            <p className="hidden md:block text-atomic-orange font-special-elite text-center text-sm mt-1">
              Where every mile is a new chapter
            </p>
          </div>

          {/* Right buttons — static on mobile, absolute on md+ */}
          <div className="flex-shrink-0 flex items-center gap-1 md:absolute md:right-4 md:top-1/2 md:-translate-y-1/2 md:gap-2">
            {!showPlanner && (
              <button
                onClick={handleNearMe}
                className="bg-atomic-orange text-midnight-navy font-bungee px-2 md:px-4 py-1 md:py-2 rounded-full hover:bg-starlight-turquoise transition-all shadow-lg flex items-center gap-1 md:gap-2 text-[10px] md:text-sm"
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline">NEAR ME</span>
              </button>
            )}

            {/* Trip bag icon */}
            <button
              onClick={() => setShowRoadTrip(true)}
              className="relative text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
              title="My Road Trip"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {tripItems.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-atomic-orange text-midnight-navy font-bungee text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {tripItems.length > 9 ? '9+' : tripItems.length}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Map */}
      <div className="h-full pt-11 md:pt-20">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          style={{ background: '#1A1B2E' }}
          key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {route.length > 1 && (
            <Polyline
              positions={route}
              color="#40E0D0"
              weight={4}
              opacity={0.8}
            />
          )}

          {visibleLocations.map((location) => (
            <Marker
              key={location.id}
              position={[location.lat, location.lng]}
              icon={createCustomIcon(location.type)}
              eventHandlers={{
                click: () => setSelectedLocation(location),
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Route Planner — mobile: fixed slide-up from bottom; desktop md+: centered dialog */}
      {showPlanner && (
        <div
          className="animate-slide-up fixed bottom-0 left-0 right-0 z-[1001] md:absolute md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 bg-midnight-navy/95 border-t-4 md:border-4 border-starlight-turquoise rounded-t-3xl md:rounded-lg p-4 md:p-6 shadow-2xl overflow-y-auto"
          style={{ maxHeight: '70vh' }}
        >
          {/* Drag handle indicator (mobile only) */}
          <div className="md:hidden w-10 h-1 bg-starlight-turquoise/40 rounded-full mx-auto mb-3" />

          <h2 className="text-starlight-turquoise font-bungee text-[1.25rem] mb-1 text-center drop-shadow-[0_0_10px_rgba(64,224,208,0.8)] leading-tight">
            {stateLabel}
          </h2>
          <p className="text-atomic-orange font-special-elite text-[0.875rem] mb-3 text-center">
            Plot your literary journey
          </p>

          <div className="space-y-3">
            {selectedStates.length > 1 && (
              <p className="text-chrome-silver font-special-elite text-xs text-center -mb-1">
                Include state if needed — e.g. "Memphis, TN"
              </p>
            )}

            <div>
              <label className="text-paper-white font-special-elite text-[0.875rem] block mb-1">
                Starting City
              </label>
              <input
                type="text"
                value={startCity}
                onChange={(e) => setStartCity(e.target.value)}
                placeholder={selectedStates.length > 1 ? 'e.g., Memphis, TN' : 'e.g., New York City'}
                className="w-full bg-black/50 border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange"
                style={{ fontSize: '1rem' }}
              />
            </div>

            <div>
              <label className="text-paper-white font-special-elite text-[0.875rem] block mb-1">
                Destination City
              </label>
              <input
                type="text"
                value={endCity}
                onChange={(e) => setEndCity(e.target.value)}
                placeholder={selectedStates.length > 1 ? 'e.g., Chicago, IL' : 'e.g., Buffalo'}
                className="w-full bg-black/50 border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange"
                style={{ fontSize: '1rem' }}
              />
            </div>

            {error && (
              <div className="bg-atomic-orange/20 border border-atomic-orange px-3 py-2 rounded">
                <p className="text-atomic-orange font-special-elite text-xs">{error}</p>
              </div>
            )}

            <button
              onClick={handlePlotRoute}
              disabled={loading}
              className="w-full bg-atomic-orange text-midnight-navy font-bungee py-2.5 rounded-lg hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-[0.875rem]"
            >
              {loading ? 'SEARCHING...' : 'PLOT ROUTE'}
            </button>

            <button
              onClick={onHome}
              className="w-full bg-transparent text-starlight-turquoise border-2 border-starlight-turquoise font-special-elite py-2 rounded-lg hover:bg-starlight-turquoise hover:text-midnight-navy transition-all text-[0.875rem]"
            >
              ← Change State
            </button>
          </div>
        </div>
      )}

      {/* Clear Route Button */}
      {route.length > 0 && (
        <div className="absolute top-24 right-4 z-[1000]">
          <button
            onClick={handleClearRoute}
            className="bg-midnight-navy/90 text-starlight-turquoise border-2 border-starlight-turquoise px-4 py-2 rounded-lg font-special-elite text-sm hover:bg-starlight-turquoise hover:text-midnight-navy transition-all shadow-lg"
          >
            Clear Route
          </button>
        </div>
      )}

      {/* Route Info */}
      {route.length > 0 && !selectedLocation && (
        <div className="absolute bottom-4 md:bottom-8 inset-x-4 z-[1000] flex justify-center">
          <div className="bg-midnight-navy/90 border-2 border-atomic-orange px-3 md:px-6 py-1.5 md:py-3 rounded-lg">
            <p className="text-paper-white font-special-elite text-[10px] md:text-sm text-center">
              Found {visibleLocations.length} literary stop{visibleLocations.length !== 1 ? 's' : ''} along your route
            </p>
          </div>
        </div>
      )}

      {/* THE SHELF - Googie slide-up drawer */}
      {selectedLocation && (
        <div className="absolute bottom-0 left-0 right-0 z-[1001] bg-midnight-navy/98 border-t-4 border-starlight-turquoise rounded-t-3xl shadow-2xl animate-slide-up">
          <div className="h-2 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-80"></div>

          <div className="p-6 max-w-2xl mx-auto">
            <button
              onClick={() => setSelectedLocation(null)}
              className="absolute top-6 right-6 text-starlight-turquoise hover:text-atomic-orange transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-3">
              {selectedLocation.type === 'bookstore' && (
                <span className="text-atomic-orange font-bungee text-xs px-3 py-1 border-2 border-atomic-orange rounded-full">
                  📚 BOOKSTORE
                </span>
              )}
              {selectedLocation.type === 'cafe' && (
                <span className="text-starlight-turquoise font-bungee text-xs px-3 py-1 border-2 border-starlight-turquoise rounded-full">
                  ☕ COFFEE SHOP
                </span>
              )}
              {selectedLocation.type === 'landmark' && (
                <span className="text-paper-white font-bungee text-xs px-3 py-1 border-2 border-paper-white rounded-full">
                  ✒️ LITERARY LANDMARK
                </span>
              )}
            </div>

            <h2 className="text-starlight-turquoise font-bungee text-2xl mb-2 drop-shadow-[0_0_10px_rgba(64,224,208,0.8)]">
              {selectedLocation.name}
            </h2>

            <p className="text-paper-white font-special-elite text-sm mb-3">
              {selectedLocation.description}
            </p>

            <div className="flex items-start gap-2 text-chrome-silver font-special-elite text-sm mb-4">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{selectedLocation.address}</span>
            </div>

            {selectedLocation.url && (
              <a
                href={selectedLocation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-atomic-orange font-special-elite text-sm hover:text-starlight-turquoise transition-colors mb-4"
              >
                <span>Read more on Wikipedia</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}

            <div className="flex gap-3 mt-4">
              <button className="flex-1 bg-atomic-orange text-midnight-navy font-bungee py-3 rounded-lg hover:bg-starlight-turquoise transition-all shadow-lg">
                GET DIRECTIONS
              </button>
              <button
                onClick={() => handleTripToggle(selectedLocation)}
                className={`px-4 border-2 font-special-elite py-3 rounded-lg transition-all ${
                  tripIds.has(selectedLocation.id)
                    ? 'bg-starlight-turquoise/20 border-starlight-turquoise text-starlight-turquoise hover:bg-atomic-orange/20 hover:border-atomic-orange hover:text-atomic-orange'
                    : 'bg-transparent border-starlight-turquoise text-starlight-turquoise hover:bg-starlight-turquoise hover:text-midnight-navy'
                }`}
              >
                {tripIds.has(selectedLocation.id) ? '✓ IN TRIP' : '+ ADD TO TRIP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Road Trip overlay ── */}
      {showRoadTrip && (
        <RoadTrip
          items={tripItems}
          onRemove={(id) => setTripItems(removeFromTrip(id))}
          onClearAll={handleClearTrip}
          onClose={() => setShowRoadTrip(false)}
        />
      )}
    </div>
  );
};

export default MasterMap;
