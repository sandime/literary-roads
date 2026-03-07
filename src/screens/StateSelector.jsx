import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import MyRoutes from '../components/MyRoutes';
import { subscribeToSavedRoutes, deleteSavedRoute, updateRouteName } from '../utils/savedRoutes';

const US_CENTER = [39.5, -98.35];
const US_ZOOM = 4;

const FALLBACK_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
  'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

// Leaflet path styles
const DEFAULT_STYLE     = { fillColor: '#1A1B2E', fillOpacity: 0.65, color: '#40E0D0', weight: 1 };
const SELECTED_STYLE    = { fillColor: '#40E0D0', fillOpacity: 0.22, color: '#40E0D0', weight: 3 };
const HOVER_STYLE       = { fillColor: '#FF4E00', fillOpacity: 0.40, color: '#FF4E00', weight: 2 };
const HOVER_SEL_STYLE   = { fillColor: '#FF4E00', fillOpacity: 0.40, color: '#40E0D0', weight: 3 };

const StateSelector = ({ onStateSelect, onShowLogin, onShowProfile, onShowResources, onLoadSavedRoute }) => {
  const { user, logout } = useAuth();
  const [geoJson, setGeoJson]           = useState(null);
  const [loadError, setLoadError]       = useState(false);
  const [hoveredState, setHoveredState] = useState('');
  const [selectedStates, setSelectedStates] = useState(new Set());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMyRoutes, setShowMyRoutes] = useState(false);
  const [savedRoutes, setSavedRoutes]   = useState([]);

  // Refs keep event-handler closures from going stale
  const selectedRef = useRef(new Set()); // mirrors selectedStates
  const layersRef   = useRef({});        // { stateName: leafletLayer }
  const userMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const close = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!user) { setSavedRoutes([]); return; }
    return subscribeToSavedRoutes(user.uid, setSavedRoutes);
  }, [user]);

  useEffect(() => {
    fetch(
      'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
    )
      .then((r) => {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      })
      .then(setGeoJson)
      .catch(() => setLoadError(true));
  }, []);

  // Toggle a state and immediately re-style all layers
  const toggleState = (name) => {
    setSelectedStates((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);

      selectedRef.current = next;

      // Imperatively update every layer so no re-mount needed
      Object.entries(layersRef.current).forEach(([n, layer]) => {
        layer.setStyle(next.has(n) ? SELECTED_STYLE : DEFAULT_STYLE);
      });

      return next;
    });
  };

  const onEachState = (feature, layer) => {
    const name = feature.properties.name;
    layersRef.current[name] = layer;

    layer.on({
      mouseover: () => {
        const sel = selectedRef.current.has(name);
        layer.setStyle(sel ? HOVER_SEL_STYLE : HOVER_STYLE);
        setHoveredState(name);
      },
      mouseout: () => {
        const sel = selectedRef.current.has(name);
        layer.setStyle(sel ? SELECTED_STYLE : DEFAULT_STYLE);
        setHoveredState('');
      },
      click: () => toggleState(name),
    });
  };

  const handleContinue = () => {
    onStateSelect([...selectedStates]);
  };

  const panelVisible = selectedStates.size > 0;

  return (
    <div className="h-screen w-full relative bg-midnight-navy overflow-hidden">

      {/* ── Header ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-midnight-navy/95 border-b-2 border-starlight-turquoise px-3 py-2 md:py-4">
        <div className="flex items-center">
          {/* Title block */}
          <div className="flex-1 text-center">
            <h1 className="text-starlight-turquoise font-bungee text-[15px] md:text-2xl drop-shadow-[0_0_10px_rgba(64,224,208,0.8)] leading-tight">
              THE LITERARY ROADS
            </h1>
            <p className="text-atomic-orange font-special-elite text-xs md:text-sm mt-0.5">
              {selectedStates.size === 0
                ? 'Click states to select your journey'
                : `${selectedStates.size} state${selectedStates.size > 1 ? 's' : ''} selected — click more or continue`}
            </p>
          </div>

          {/* Right nav icons */}
          <div className="flex-shrink-0 flex items-center gap-1 md:gap-2 ml-2">

            {/* My Trip / Saved Routes */}
            <button
              onClick={() => setShowMyRoutes(true)}
              title="My Trip"
              className="relative flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors px-2 py-0.5 md:p-1"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="font-bungee text-[9px] leading-tight md:hidden">MY TRIP</span>
              {savedRoutes.length > 0 && (
                <span className="absolute -top-0.5 right-0.5 bg-atomic-orange text-midnight-navy font-bungee text-[9px] w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {savedRoutes.length > 9 ? '9+' : savedRoutes.length}
                </span>
              )}
            </button>

            {/* Highway Snacks */}
            <button
              onClick={onShowResources}
              title="Highway Snacks"
              className="flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors px-2 py-0.5 md:p-1"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
              </svg>
              <span className="md:hidden font-bungee text-[9px] leading-tight">SNACKS</span>
              <span className="hidden md:inline font-bungee text-[10px] leading-tight tracking-wide">SNACKS</span>
            </button>

            {/* Profile / Login */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={user ? () => setShowUserMenu((v) => !v) : onShowLogin}
                title={user ? "Traveler's Log" : 'Log In'}
                className="flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors px-2 py-0.5 md:p-1"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} className="w-5 h-5 md:w-6 md:h-6 rounded-full"
                    style={{ border: '1.5px solid #40E0D0', boxShadow: showUserMenu ? '0 0 8px rgba(64,224,208,0.7)' : 'none' }} alt="avatar" />
                ) : (
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                <span className="md:hidden font-bungee text-[9px] leading-tight">
                  {user ? 'LOG' : 'LOG IN'}
                </span>
              </button>

              {/* Dropdown */}
              {user && showUserMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  minWidth: '160px', zIndex: 9999,
                  background: '#0D0E1A',
                  border: '1.5px solid #40E0D0',
                  borderRadius: '10px',
                  boxShadow: '0 0 24px rgba(64,224,208,0.25), 0 8px 32px rgba(0,0,0,0.7)',
                  overflow: 'hidden',
                  animation: 'lr-dropdown-in 0.18s ease',
                }}>
                  <style>{`
                    @keyframes lr-dropdown-in {
                      from { opacity: 0; transform: translateY(-6px); }
                      to   { opacity: 1; transform: translateY(0); }
                    }
                  `}</style>

                  {/* User info */}
                  <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(64,224,208,0.15)' }}>
                    <p className="font-bungee" style={{ fontSize: '10px', color: '#40E0D0', letterSpacing: '0.06em', lineHeight: 1.2 }}>
                      {user.displayName || 'Literary Traveler'}
                    </p>
                    <p className="font-special-elite" style={{ fontSize: '9px', color: 'rgba(192,192,192,0.4)', marginTop: '2px' }}>
                      {user.email}
                    </p>
                  </div>

                  {/* View Profile */}
                  <button
                    onClick={() => { setShowUserMenu(false); onShowProfile(); }}
                    className="font-bungee w-full text-left"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '11px 14px', fontSize: '11px', letterSpacing: '0.05em',
                      color: '#40E0D0', background: 'transparent', border: 'none',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(64,224,208,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    VIEW PROFILE
                  </button>

                  <div style={{ height: '1px', background: 'rgba(64,224,208,0.1)', margin: '0 10px' }} />

                  {/* Sign Out */}
                  <button
                    onClick={async () => { setShowUserMenu(false); await logout(); }}
                    className="font-bungee w-full text-left"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '11px 14px', fontSize: '11px', letterSpacing: '0.05em',
                      color: '#FF4E00', background: 'transparent', border: 'none',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,78,0,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    SIGN OUT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="h-full pt-16 md:pt-20">
        <MapContainer
          center={US_CENTER}
          zoom={US_ZOOM}
          className="h-full w-full"
          style={{ background: '#1A1B2E' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {geoJson && (
            <GeoJSON
              data={geoJson}
              style={DEFAULT_STYLE}
              onEachFeature={onEachState}
            />
          )}
        </MapContainer>
      </div>

      {/* ── Hover label (above bottom panel) ── */}
      {hoveredState && (
        <div className="absolute left-1/2 transform -translate-x-1/2 z-[1002] bg-midnight-navy/95 border-2 border-atomic-orange px-6 py-3 rounded-lg pointer-events-none shadow-2xl"
          style={{ bottom: panelVisible ? '10rem' : '2rem' }}
        >
          <p className="text-atomic-orange font-bungee text-xl tracking-wider text-center">
            {hoveredState}
          </p>
          <p className="text-paper-white font-special-elite text-xs text-center mt-1">
            {selectedStates.has(hoveredState) ? 'Click to deselect' : 'Click to add to journey'}
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {!geoJson && !loadError && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000]">
          <p className="text-starlight-turquoise font-special-elite text-sm animate-pulse">
            Loading map...
          </p>
        </div>
      )}

      {/* ── Bottom panel: selected chips + Continue button ── */}
      <div
        className={`z-[1001] bg-midnight-navy/97 border-t-2 border-starlight-turquoise transition-transform duration-300 ease-out ${
          panelVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
      >
        {/* Neon accent line */}
        <div className="h-0.5 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-70" />

        <div className="p-4 pb-2">
          {/* State chips */}
          <div className="flex flex-wrap gap-2 mb-3 max-h-20 overflow-y-auto">
            {[...selectedStates].map((state) => (
              <button
                key={state}
                onClick={() => toggleState(state)}
                className="bg-starlight-turquoise/15 text-starlight-turquoise border border-starlight-turquoise font-special-elite text-xs px-3 py-1 rounded-full flex items-center gap-1 hover:bg-atomic-orange/20 hover:border-atomic-orange hover:text-atomic-orange transition-all"
              >
                {state}
                <span className="text-sm leading-none ml-0.5">×</span>
              </button>
            ))}
          </div>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            className="w-full bg-atomic-orange text-midnight-navy font-bungee py-4 rounded-lg hover:bg-starlight-turquoise transition-all shadow-lg text-base"
          >
            EXPLORE {selectedStates.size} STATE{selectedStates.size > 1 ? 'S' : ''} →
          </button>
        </div>
      </div>

      {/* ── Fallback: GeoJSON fetch failed ── */}
      {loadError && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-midnight-navy/95 border-4 border-starlight-turquoise rounded-lg p-6 max-w-sm w-full shadow-2xl">
          <h2 className="text-starlight-turquoise font-bungee text-xl mb-2 text-center drop-shadow-[0_0_10px_rgba(64,224,208,0.8)]">
            Choose Your States
          </h2>
          <p className="text-paper-white font-special-elite text-xs mb-3 text-center">
            Hold Ctrl / Cmd to select multiple
          </p>
          <select
            multiple
            size={8}
            onChange={(e) => {
              const vals = new Set([...e.target.selectedOptions].map((o) => o.value));
              setSelectedStates(vals);
              selectedRef.current = vals;
            }}
            className="w-full bg-black/50 border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-1 rounded focus:outline-none focus:border-atomic-orange text-sm mb-3"
          >
            {FALLBACK_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {selectedStates.size > 0 && (
            <button
              onClick={handleContinue}
              className="w-full bg-atomic-orange text-midnight-navy font-bungee py-3 rounded-lg hover:bg-starlight-turquoise transition-all"
            >
              EXPLORE {selectedStates.size} STATE{selectedStates.size > 1 ? 'S' : ''} →
            </button>
          )}
        </div>
      )}
      {/* ── My Routes overlay ── */}
      {showMyRoutes && (
        <div className="fixed inset-0 z-[2000] bg-midnight-navy flex flex-col" style={{ animation: 'lr-slide-in-left 0.22s ease' }}>
          <style>{`@keyframes lr-slide-in-left { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-starlight-turquoise flex-shrink-0 bg-midnight-navy">
            <button
              onClick={() => setShowMyRoutes(false)}
              className="text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="font-bungee text-starlight-turquoise text-lg drop-shadow-[0_0_10px_rgba(64,224,208,0.8)]">
              MY SAVED ROUTES
            </h2>
            <div className="w-8" />
          </div>
          <div className="h-0.5 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-70 flex-shrink-0" />

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!user ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <svg className="w-16 h-16 text-starlight-turquoise/25 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-paper-white font-bungee text-xl mb-2">SIGN IN TO SEE YOUR ROUTES</p>
                <p className="text-chrome-silver font-special-elite text-sm max-w-xs mb-6">
                  Log in to access your saved routes and load them directly onto the map.
                </p>
                <button
                  onClick={() => { setShowMyRoutes(false); onShowLogin(); }}
                  className="bg-atomic-orange text-midnight-navy font-bungee px-6 py-3 rounded-lg hover:bg-starlight-turquoise transition-all shadow-lg"
                >
                  LOG IN
                </button>
              </div>
            ) : (
              <MyRoutes
                savedRoutes={savedRoutes}
                onLoad={(route) => { setShowMyRoutes(false); onLoadSavedRoute(route); }}
                onDelete={(id) => deleteSavedRoute(user.uid, id).catch(console.error)}
                onRename={(id, name) => updateRouteName(user.uid, id, name).catch(console.error)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StateSelector;
