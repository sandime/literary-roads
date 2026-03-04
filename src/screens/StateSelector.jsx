import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';

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

const StateSelector = ({ onStateSelect, onShowLogin, onShowProfile, onShowResources }) => {
  const { user } = useAuth();
  const [geoJson, setGeoJson]           = useState(null);
  const [loadError, setLoadError]       = useState(false);
  const [hoveredState, setHoveredState] = useState('');
  const [selectedStates, setSelectedStates] = useState(new Set());

  // Refs keep event-handler closures from going stale
  const selectedRef = useRef(new Set()); // mirrors selectedStates
  const layersRef   = useRef({});        // { stateName: leafletLayer }

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
            <button
              onClick={user ? onShowProfile : onShowLogin}
              title={user ? "Traveler's Log" : 'Log In'}
              className="flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors px-2 py-0.5 md:p-1"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} className="w-5 h-5 md:w-6 md:h-6 rounded-full"
                  style={{ border: '1.5px solid #40E0D0' }} alt="avatar" />
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
    </div>
  );
};

export default StateSelector;
