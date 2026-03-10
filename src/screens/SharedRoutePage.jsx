import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import { getSharedRoute, incrementCloneCount } from '../utils/sharedRoutes';
import { saveRoute } from '../utils/savedRoutes';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TYPE_COLORS = { bookstore: '#FF4E00', cafe: '#40E0D0', landmark: '#39FF14', drivein: '#E040FB' };
const TYPE_EMOJI  = { bookstore: '📚', cafe: '☕', landmark: '🌲', drivein: '🎬' };

const makeStopIcon = (type) => L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:${TYPE_COLORS[type] || '#C0C0C0'};
    border:2.5px solid #1A1B2E;
    display:flex;align-items:center;justify-content:center;
    font-size:13px;line-height:1;
    box-shadow:0 0 8px ${TYPE_COLORS[type] || '#C0C0C0'}88;
  ">${TYPE_EMOJI[type] || '📍'}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Fit map bounds to the route polyline
const FitRoute = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (!coords || coords.length < 2) return;
    const bounds = L.latLngBounds(coords.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, coords]);
  return null;
};

const SharedRoutePage = () => {
  const { routeId }    = useParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const [route, setRoute]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloned, setCloned]   = useState(false);
  const [cloneError, setCloneError] = useState('');

  useEffect(() => {
    getSharedRoute(routeId).then(data => {
      if (!data) { setNotFound(true); }
      else { setRoute(data); }
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [routeId]);

  const routeCoords = (() => {
    if (!route?.routeCoordinates) return [];
    try {
      const parsed = typeof route.routeCoordinates === 'string'
        ? JSON.parse(route.routeCoordinates)
        : route.routeCoordinates;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })();

  const mapCenter = routeCoords.length > 0
    ? routeCoords[Math.floor(routeCoords.length / 2)]
    : [39.5, -98.35];

  const handleClone = async () => {
    if (!user) {
      navigate(`${import.meta.env.BASE_URL}`.replace(/\/$/, '') + '?login=1');
      return;
    }
    setCloning(true);
    setCloneError('');
    try {
      await saveRoute(user.uid, {
        routeName:        `${route.routeName}`,
        notes:            route.notes || '',
        startCity:        route.startCity || '',
        endCity:          route.endCity || '',
        selectedStates:   route.selectedStates || [],
        routeCoordinates: routeCoords,
        stops:            route.stops || [],
      });
      await incrementCloneCount(routeId);
      setCloned(true);
    } catch (e) {
      setCloneError('Could not save route. Please try again.');
    } finally {
      setCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-midnight-navy flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-starlight-turquoise border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-starlight-turquoise font-special-elite">Loading route…</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-screen w-full bg-midnight-navy flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-atomic-orange font-bungee text-2xl mb-3">ROUTE NOT FOUND</p>
          <p className="text-paper-white font-special-elite text-sm mb-6">
            This route may have been deleted or the link is invalid.
          </p>
          <button
            onClick={() => navigate(import.meta.env.BASE_URL || '/')}
            className="bg-starlight-turquoise text-midnight-navy font-bungee px-6 py-3 rounded-lg hover:bg-atomic-orange transition-all"
          >
            GO TO THE LITERARY ROADS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative bg-midnight-navy overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-midnight-navy/95 border-b-2 border-starlight-turquoise px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(import.meta.env.BASE_URL || '/')}
            className="text-starlight-turquoise hover:text-atomic-orange transition-colors flex-shrink-0"
            title="Go to The Literary Roads"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-starlight-turquoise font-bungee text-base leading-tight truncate drop-shadow-[0_0_8px_rgba(64,224,208,0.7)]">
              {route.routeName}
            </h1>
            <p className="text-chrome-silver font-special-elite text-xs truncate">
              by {route.creatorName}
              {route.startCity && route.endCity && ` · ${route.startCity} → ${route.endCity}`}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-special-elite">
            {route.bookstoreCount > 0 && <span className="text-atomic-orange">📚{route.bookstoreCount}</span>}
            {route.cafeCount      > 0 && <span className="text-starlight-turquoise">☕{route.cafeCount}</span>}
            {route.landmarkCount  > 0 && <span style={{ color:'#39FF14' }}>🌲{route.landmarkCount}</span>}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="h-full pt-[68px]">
        <MapContainer
          center={mapCenter}
          zoom={6}
          className="h-full w-full"
          style={{ background: '#1A1B2E' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {routeCoords.length > 1 && (
            <>
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: '#FF4E00', weight: 4, opacity: 0.85 }}
              />
              <FitRoute coords={routeCoords} />
            </>
          )}
          {(route.stops || []).map((stop) =>
            stop.coords ? (
              <Marker
                key={stop.id}
                position={stop.coords}
                icon={makeStopIcon(stop.type)}
              />
            ) : null
          )}
        </MapContainer>
      </div>

      {/* Bottom card: clone button */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-midnight-navy/97 border-t-2 border-starlight-turquoise px-4 py-4">
        <div className="h-0.5 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-60 -mt-4 mb-4" />

        {route.notes && (
          <p className="text-paper-white/60 font-special-elite text-xs italic mb-3 line-clamp-2">
            "{route.notes}"
          </p>
        )}

        {cloneError && (
          <p className="text-atomic-orange font-special-elite text-xs mb-2 text-center">{cloneError}</p>
        )}

        {cloned ? (
          <div className="text-center">
            <p className="text-starlight-turquoise font-bungee text-sm mb-3">✓ ROUTE SAVED TO YOUR TRIPS!</p>
            <button
              onClick={() => navigate(import.meta.env.BASE_URL || '/')}
              className="w-full bg-atomic-orange text-midnight-navy font-bungee py-3 rounded-lg hover:bg-starlight-turquoise transition-all"
            >
              OPEN IN THE LITERARY ROADS
            </button>
          </div>
        ) : (
          <button
            onClick={handleClone}
            disabled={cloning}
            className="w-full bg-atomic-orange text-midnight-navy font-bungee py-3 rounded-lg hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {cloning ? (
              <>
                <div className="w-4 h-4 border-2 border-midnight-navy border-t-transparent rounded-full animate-spin" />
                SAVING…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                MAKE THIS ROUTE MINE
              </>
            )}
          </button>
        )}

        <p className="text-chrome-silver/40 font-special-elite text-[10px] text-center mt-2">
          Shared {route.shareCount > 0 ? `${route.shareCount} time${route.shareCount !== 1 ? 's' : ''}` : ''} · Saved by {route.cloneCount || 0} traveler{route.cloneCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

export default SharedRoutePage;
