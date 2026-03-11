import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import { autocompleteCity, geocodeCity } from '../utils/googlePlaces';
import { saveRoute } from '../utils/savedRoutes';
import { generateDayTrip, VISIT_MINUTES, RADIUS_MILES } from '../utils/dayTripAlgorithm';

// Fix default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TYPE_EMOJI  = { bookstore: '📚', cafe: '☕', landmark: '🌲', drivein: '🎬', museum: '🏛️', art_gallery: '🎨', park: '🌿', nature: '🌿', restaurant: '🍽️' };

const makeStopMarker = (num) => L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#FF4E00;border:2.5px solid #1A1B2E;display:flex;align-items:center;justify-content:center;font-family:'Bungee',sans-serif;font-size:12px;color:#1A1B2E;font-weight:900;box-shadow:0 0 10px rgba(255,78,0,0.7)">${num}</div>`,
  iconSize:   [30, 30],
  iconAnchor: [15, 15],
});

const makeStartMarker = () => L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#40E0D0;border:2.5px solid #1A1B2E;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 10px rgba(64,224,208,0.7)">🚗</div>`,
  iconSize:   [30, 30],
  iconAnchor: [15, 15],
});

// Fit map to route bounds
const FitBounds = ({ coords }) => {
  const mapRef = useRef(null);
  // Use a portal-free approach: attach after render
  useEffect(() => {
    if (!coords?.length) return;
    const map = mapRef.current;
    if (map) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  });
  return null;
};

// Simple city autocomplete input — inline dropdown, no portal
const LocationInput = ({ value, onChange, onSelect, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop]       = useState(false);
  const containerRef = useRef(null);
  const debounceRef  = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!value || value.length < 2) { setSuggestions([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await autocompleteCity(value, ['US']);
      const list = res || [];
      setSuggestions(list);
      setShowDrop(list.length > 0);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    const close = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setShowDrop(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDrop(true)}
        placeholder={placeholder}
        className="w-full bg-black/50 border-2 border-starlight-turquoise/60 text-paper-white font-special-elite px-3 py-2.5 rounded-lg focus:outline-none focus:border-starlight-turquoise"
        style={{ fontSize: '0.9rem' }}
        autoComplete="off"
      />
      {showDrop && suggestions.length > 0 && (
        <ul style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, maxHeight: 220, overflowY: 'auto' }}
          className="bg-midnight-navy border-2 border-starlight-turquoise rounded-lg shadow-2xl"
        >
          {suggestions.map((s, i) => (
            <li key={i}
              onPointerDown={() => { onSelect(s.label || s.display || s); setShowDrop(false); }}
              className="px-3 py-2.5 cursor-pointer hover:bg-starlight-turquoise/10 text-paper-white font-special-elite text-sm border-b border-starlight-turquoise/10 last:border-0"
            >
              {s.label || s.display || s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const DayTripPlanner = ({ onBack, onLoadTrip, onShowLogin }) => {
  const { user } = useAuth();

  // Step state
  const [step, setStep] = useState('input'); // 'input' | 'generating' | 'result'

  // Input state
  const [startText, setStartText]   = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [duration, setDuration]     = useState('halfDay');

  // Result state
  const [trip, setTrip]       = useState(null);
  const [genError, setGenError] = useState('');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // Regenerate tracking
  const [tripCount, setTripCount]     = useState(1);
  const [variant, setVariant]         = useState(0);
  const [excludedIds, setExcludedIds] = useState(new Set());

  const mapRef = useRef(null);

  const handleSelectSuggestion = async (desc) => {
    setStartText(desc);
    const coords = await geocodeCity(desc, null);
    if (coords) setStartCoords([coords.lat, coords.lng]);
  };

  const handleGenerate = async () => {
    if (!startCoords) {
      // Try geocoding what's typed
      const coords = await geocodeCity(startText, null);
      if (!coords) { setGenError('Please enter a valid starting location.'); return; }
      setStartCoords([coords.lat, coords.lng]);
      setTripCount(1);
      await doGenerate([coords.lat, coords.lng], 0, new Set());
    } else {
      setTripCount(1);
      await doGenerate(startCoords, 0, new Set());
    }
  };

  const doGenerate = async (coords, nextVariant = 0, nextExcluded = new Set()) => {
    setGenError('');
    setStep('generating');
    setSaved(false);
    try {
      const result = await generateDayTrip(coords, duration, nextVariant, nextExcluded);
      if (!result || !result.stops.length) {
        setGenError('No locations found nearby. Try a different city or wider time range.');
        setStep('input');
        return;
      }
      setTrip(result);
      setVariant(nextVariant);
      setExcludedIds(nextExcluded);
      setStep('result');
    } catch (e) {
      console.error('[DayTripPlanner] generation error:', e);
      setGenError('Something went wrong. Please try again.');
      setStep('input');
    }
  };

  // Regenerate in-place: accumulate shown stop IDs, advance variant
  const handleRegenerate = () => {
    if (!startCoords) { setStep('input'); return; }
    const nextExcluded = new Set(excludedIds);
    trip?.stops?.forEach(s => nextExcluded.add(s.id));
    const nextVariant = variant + 1;
    setTripCount(c => c + 1);
    doGenerate(startCoords, nextVariant, nextExcluded);
  };

  // Back to input (full reset)
  const handleBackToInput = () => {
    setTrip(null);
    setSaved(false);
    setTripCount(1);
    setVariant(0);
    setExcludedIds(new Set());
    setStep('input');
  };

  const handleSave = async () => {
    if (!user) { onShowLogin(); return; }
    setSaving(true);
    try {
      await saveRoute(user.uid, {
        routeName: `Day Trip from ${startText}`,
        notes: `${RADIUS_MILES[duration]}-mile radius · ${trip.stops.length} stops`,
        startCity: startText,
        endCity:   startText,
        selectedStates: [],
        routeCoordinates: trip.routeCoordinates,
        stops: trip.stops,
      });
      setSaved(true);
    } catch (e) {
      console.error('[DayTripPlanner] save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadOnMap = () => {
    onLoadTrip({
      startCity:        startText,
      endCity:          startText,
      route:            trip.routeCoordinates,
      visibleLocations: trip.stops,
      showPlanner:      false,
    });
  };

  // Fit map bounds when result renders
  useEffect(() => {
    if (step !== 'result' || !trip || !mapRef.current) return;
    try {
      const bounds = L.latLngBounds(trip.routeCoordinates);
      mapRef.current.fitBounds(bounds, { padding: [30, 30] });
    } catch {}
  }, [step, trip]);

  const DURATION_OPTIONS = [
    { key: 'quick',   label: 'Quick',    sub: '30 min – 1 hr',  stops: 2, radius: 20  },
    { key: 'halfDay', label: 'Half Day', sub: '1–3 hours',       stops: 3, radius: 60  },
    { key: 'fullDay', label: 'Full Day', sub: '3–5 hours',       stops: 5, radius: 120 },
  ];

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  };

  return (
    <div className="w-full bg-midnight-navy flex flex-col" style={{ height: '100dvh', minHeight: '100vh' }}>
      <style>{`
        @keyframes lr-fade-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .lr-fade { animation: lr-fade-in 0.3s ease; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-midnight-navy/95 border-b-2 border-starlight-turquoise px-4 py-3 flex items-center gap-3">
        <button onClick={step === 'result' ? handleBackToInput : onBack}
          className="text-starlight-turquoise hover:text-atomic-orange transition-colors flex-shrink-0"
          style={{ minWidth:40, minHeight:40, display:'flex', alignItems:'center', justifyContent:'center' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-starlight-turquoise font-bungee text-lg leading-tight drop-shadow-[0_0_8px_rgba(64,224,208,0.7)]">
            {step === 'result' ? `DAY TRIP #${tripCount}` : 'PLAN A DAY TRIP'}
          </h1>
          {step === 'result' && trip && (
            <p className="text-chrome-silver font-special-elite text-xs mt-0.5">
              {trip.stops.length} stops · ~{formatDuration(trip.schedule.totalMinutes)} · {trip.schedule.totalMiles} mi
            </p>
          )}
        </div>
        {step === 'result' && (
          <button onClick={handleRegenerate}
            className="text-atomic-orange hover:text-starlight-turquoise transition-colors font-bungee text-xs border border-atomic-orange hover:border-starlight-turquoise px-3 py-1.5 rounded-full flex-shrink-0"
          >
            ↺ NEW TRIP
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ══ STEP 1: INPUT ══ */}
        {step === 'input' && (
          <div className="max-w-lg mx-auto px-4 py-6 space-y-6 lr-fade pb-28">

            {/* Starting location */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest block mb-2">
                STARTING FROM
              </label>
              <LocationInput
                value={startText}
                onChange={setStartText}
                onSelect={handleSelectSuggestion}
                placeholder="City, neighborhood, or address…"
              />
              {startCoords && (
                <p className="text-starlight-turquoise/60 font-special-elite text-xs mt-1">
                  ✓ Location found
                </p>
              )}
            </div>

            {/* Time available */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest block mb-2">
                TIME AVAILABLE
              </label>
              <div className="space-y-2">
                {DURATION_OPTIONS.map(opt => (
                  <label key={opt.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      duration === opt.key
                        ? 'border-starlight-turquoise bg-starlight-turquoise/10'
                        : 'border-starlight-turquoise/20 hover:border-starlight-turquoise/50'
                    }`}
                  >
                    <input type="radio" name="duration" value={opt.key}
                      checked={duration === opt.key}
                      onChange={() => setDuration(opt.key)}
                      className="accent-starlight-turquoise"
                    />
                    <div className="flex-1">
                      <span className="text-paper-white font-bungee text-sm">{opt.label}</span>
                      <span className="text-chrome-silver/60 font-special-elite text-xs ml-2">{opt.sub}</span>
                    </div>
                    <span className="text-chrome-silver/40 font-special-elite text-xs">
                      {opt.stops} stops · {opt.radius} mi
                    </span>
                  </label>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ══ STEP 2: GENERATING ══ */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center h-full py-24 lr-fade">
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-starlight-turquoise/30 border-t-starlight-turquoise rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🗺️</div>
            </div>
            <p className="text-starlight-turquoise font-bungee text-lg drop-shadow-[0_0_8px_rgba(64,224,208,0.7)]">
              PLOTTING YOUR ROUTE…
            </p>
            <p className="text-chrome-silver font-special-elite text-sm mt-2">
              Finding the best literary stops nearby
            </p>
          </div>
        )}

        {/* ══ STEP 3: RESULT ══ */}
        {step === 'result' && trip && (
          <div className="lr-fade">

            {/* Map */}
            <div className="h-56 md:h-72 w-full">
              <MapContainer
                center={trip.startCoords}
                zoom={10}
                className="h-full w-full"
                style={{ background: '#1A1B2E' }}
                whenCreated={m => { mapRef.current = m; }}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <Polyline positions={trip.routeCoordinates}
                  pathOptions={{ color: '#FF4E00', weight: 4, opacity: 0.85 }}
                />
                {/* Start marker */}
                <Marker position={trip.startCoords} icon={makeStartMarker()} />
                {/* Stop markers */}
                {trip.stops.map((stop, i) => (
                  <Marker key={stop.id} position={stop.coords} icon={makeStopMarker(i + 1)} />
                ))}
              </MapContainer>
            </div>

            {/* Schedule */}
            <div className="px-4 py-4 space-y-0">

              {/* Start */}
              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-starlight-turquoise/20 border-2 border-starlight-turquoise flex items-center justify-center text-sm flex-shrink-0">🚗</div>
                <div>
                  <p className="text-starlight-turquoise font-bungee text-sm">START</p>
                  <p className="text-chrome-silver font-special-elite text-xs">{startText} · {trip.schedule.startTime}</p>
                </div>
              </div>

              {trip.schedule.items.map((item, i) => (
                <div key={item.stop.id}>
                  {/* Drive segment */}
                  <div className="flex items-center gap-3 py-1 ml-4">
                    <div className="w-0.5 h-6 bg-atomic-orange/40 mx-auto" style={{ marginLeft: 12 }} />
                    <p className="text-chrome-silver/50 font-special-elite text-xs">
                      🚗 {item.driveMins} min drive · {item.miles.toFixed(1)} mi
                    </p>
                  </div>

                  {/* Stop card */}
                  <div className="bg-black/40 border border-starlight-turquoise/25 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-atomic-orange flex items-center justify-center font-bungee text-midnight-navy text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-paper-white font-bungee text-sm leading-tight truncate">
                          {item.stop.name}
                        </span>
                        <span className="text-xs">{TYPE_EMOJI[item.stop.type]}</span>
                      </div>
                      <p className="text-chrome-silver/60 font-special-elite text-xs mt-0.5 truncate">
                        {item.stop.address}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs font-special-elite">
                        <span className="text-starlight-turquoise">Arrive {item.arrivalTime}</span>
                        <span className="text-chrome-silver/40">·</span>
                        <span className="text-chrome-silver/60">Spend ~{item.visitMins} min</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Return */}
              <div className="flex items-center gap-3 py-1 ml-4">
                <div className="w-0.5 h-6 bg-atomic-orange/40" style={{ marginLeft: 12 }} />
                <p className="text-chrome-silver/50 font-special-elite text-xs">
                  🚗 {trip.schedule.returnMins} min back to start
                </p>
              </div>
              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-starlight-turquoise/20 border-2 border-starlight-turquoise flex items-center justify-center text-sm flex-shrink-0">🏁</div>
                <div>
                  <p className="text-starlight-turquoise font-bungee text-sm">BACK HOME</p>
                  <p className="text-chrome-silver font-special-elite text-xs">{trip.schedule.returnTime}</p>
                </div>
              </div>

              {/* Trip summary chips */}
              <div className="flex gap-2 flex-wrap py-2">
                {[
                  `🕐 ${formatDuration(trip.schedule.totalMinutes)}`,
                  `📍 ${trip.schedule.totalMiles} miles`,
                  `🛑 ${trip.stops.length} stops`,
                ].map(chip => (
                  <span key={chip} className="bg-starlight-turquoise/10 border border-starlight-turquoise/30 text-starlight-turquoise font-special-elite text-xs px-3 py-1 rounded-full">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-4 pb-8 space-y-3">
              <button onClick={handleLoadOnMap}
                className="w-full bg-atomic-orange text-midnight-navy font-bungee py-3.5 rounded-xl hover:bg-starlight-turquoise transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                START NAVIGATION
              </button>

              {saved ? (
                <div className="w-full border border-starlight-turquoise text-starlight-turquoise font-bungee py-3.5 rounded-xl text-center text-sm">
                  ✓ SAVED TO YOUR ROUTES
                </div>
              ) : (
                <button onClick={handleSave} disabled={saving}
                  className="w-full border-2 border-starlight-turquoise text-starlight-turquoise font-bungee py-3.5 rounded-xl hover:bg-starlight-turquoise hover:text-midnight-navy transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-starlight-turquoise border-t-transparent rounded-full animate-spin" /> SAVING…</>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg> SAVE THIS TRIP</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Generate button — fixed to viewport bottom, immune to iOS vh bugs ── */}
      {step === 'input' && (
        <div
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
            background: '#1A1B2E',
            borderTop: '2px solid rgba(64,224,208,0.3)',
            padding: '12px 16px',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
          }}
        >
          {genError && (
            <p className="text-atomic-orange font-special-elite text-xs text-center mb-2">{genError}</p>
          )}
          <button
            onClick={handleGenerate}
            disabled={!startText}
            className="w-full bg-atomic-orange text-midnight-navy font-bungee rounded-xl hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed text-base"
            style={{
              minHeight: 56,
              boxShadow: startText ? '0 0 20px rgba(255,78,0,0.4)' : 'none',
            }}
          >
            GENERATE DAY TRIP →
          </button>
        </div>
      )}
    </div>
  );
};

export default DayTripPlanner;
