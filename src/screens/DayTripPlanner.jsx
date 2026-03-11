import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import { autocompleteAddress, geocodeCity, reverseGeocode } from '../utils/googlePlaces';
import { saveRoute } from '../utils/savedRoutes';
import { generateDayTrip, buildRoute, VISIT_MINUTES, RADIUS_MILES } from '../utils/dayTripAlgorithm';

// Fix default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Navigation URL builders ───────────────────────────────────────────────────
const buildGoogleMapsUrl = (startCoords, stops) => {
  if (!stops.length || !startCoords) return null;
  const origin = `${startCoords[0]},${startCoords[1]}`;
  const waypoints = stops.slice(0, 9).map(s => `${s.coords[0]},${s.coords[1]}`).join('|');
  const params = new URLSearchParams({ api: '1', origin, destination: origin, travelmode: 'driving' });
  if (waypoints) params.set('waypoints', waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const buildAppleMapsUrl = (startCoords, stops) => {
  if (!stops.length || !startCoords) return null;
  const saddr = `${startCoords[0]},${startCoords[1]}`;
  const daddr = `${stops[0].coords[0]},${stops[0].coords[1]}`;
  return `https://maps.apple.com/?saddr=${saddr}&daddr=${daddr}&dirflg=d`;
};

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

const TYPE_EMOJI  = { bookstore: '📚', cafe: '☕', landmark: '🌲', drivein: '🎬', museum: '🏛️', art_gallery: '🎨', park: '🌿', nature: '🌿', restaurant: '🍽️', scenic: '🦁', music: '🎵', garden: '🪴', observatory: '🔭', flea: '🏪', antique: '🪑', historical: '🏛️' };

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

// Address autocomplete input — full street addresses, not just cities
const AddressInput = ({ value, onChange, onSelect, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop]       = useState(false);
  const containerRef = useRef(null);
  const debounceRef  = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!value || value.length < 2) { setSuggestions([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await autocompleteAddress(value, ['US']);
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
  const [startText, setStartText]     = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [duration, setDuration]       = useState('halfDay');
  const [locationMode, setLocationMode] = useState('address'); // 'address' | 'gps'
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [gpsError, setGpsError]       = useState('');

  // Result state
  const [trip, setTrip]       = useState(null);
  const [genError, setGenError] = useState('');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // Regenerate tracking
  const [tripCount, setTripCount]     = useState(1);
  const [variant, setVariant]         = useState(0);
  const [excludedIds, setExcludedIds] = useState(new Set());

  // Navigation modal
  const [showNavModal, setShowNavModal] = useState(false);

  // Checkbox / update-route state
  const [checkedIds, setCheckedIds]         = useState(new Set());
  const [activeTrip, setActiveTrip]         = useState(null); // route for checked stops
  const [isUpdatingRoute, setIsUpdatingRoute] = useState(false);

  const mapRef = useRef(null);

  const handleSelectSuggestion = async (desc) => {
    setStartText(desc);
    setStartCoords(null);
    const coords = await geocodeCity(desc);
    if (coords) setStartCoords([coords.lat, coords.lng]);
  };

  const handleUseGPS = () => {
    setLocationMode('gps');
    setGpsLoading(true);
    setGpsError('');
    setStartCoords(null);
    setStartText('');
    if (!navigator.geolocation) {
      setGpsError('GPS is not available on this device.');
      setGpsLoading(false);
      setLocationMode('address');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setStartCoords([latitude, longitude]);
        const addr = await reverseGeocode(latitude, longitude);
        setStartText(addr);
        setGpsLoading(false);
      },
      () => {
        setGpsError('Could not get location. Enter an address instead.');
        setGpsLoading(false);
        setLocationMode('address');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleSwitchToAddress = () => {
    setLocationMode('address');
    setStartCoords(null);
    setStartText('');
    setGpsError('');
  };

  const handleGenerate = async () => {
    if (!startCoords) {
      // Try geocoding what's typed
      const coords = await geocodeCity(startText);
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
      setCheckedIds(new Set(result.stops.map(s => s.id)));
      setActiveTrip(result);
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
    setCheckedIds(new Set());
    setActiveTrip(null);
    setGpsError('');
    setStep('input');
  };

  const toggleStop = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleUpdateRoute = async () => {
    if (!trip || !startCoords) return;
    const selected = trip.stops.filter(s => checkedIds.has(s.id));
    if (!selected.length) return;
    setIsUpdatingRoute(true);
    try {
      const result = await buildRoute(startCoords, selected);
      if (result) setActiveTrip(result);
    } finally {
      setIsUpdatingRoute(false);
    }
  };

  const handleSave = async () => {
    if (!user) { onShowLogin(); return; }
    const routeData = activeTrip || trip;
    setSaving(true);
    try {
      await saveRoute(user.uid, {
        routeName: `Day Trip from ${startText}`,
        notes: `${RADIUS_MILES[duration]}-mile radius · ${routeData.stops.length} stops`,
        startCity: startText,
        endCity:   startText,
        selectedStates: [],
        routeCoordinates: routeData.routeCoordinates,
        stops: routeData.stops,
      });
      setSaved(true);
    } catch (e) {
      console.error('[DayTripPlanner] save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadOnMap = () => {
    const routeData = activeTrip || trip;
    setShowNavModal(false);
    onLoadTrip({
      startCity:        startText,
      endCity:          startText,
      route:            routeData.routeCoordinates,
      visibleLocations: routeData.stops,
      tripStops:        routeData.stops, // ordered list for progress tracker
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
    { key: 'quick',   label: 'Quick',    sub: '30 min – 1 hr',  stops: '2–3',  radius: 20  },
    { key: 'halfDay', label: 'Half Day', sub: '1–3 hours',      stops: '4–6',  radius: 60  },
    { key: 'fullDay', label: 'Full Day', sub: '3–5 hours',      stops: '7–10', radius: 120 },
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

              {/* Mode: GPS or Address */}
              <div className="space-y-2 mb-3">

                {/* GPS option */}
                <button
                  type="button"
                  onClick={handleUseGPS}
                  disabled={gpsLoading}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    locationMode === 'gps'
                      ? 'border-starlight-turquoise bg-starlight-turquoise/10'
                      : 'border-starlight-turquoise/20 hover:border-starlight-turquoise/40'
                  }`}
                >
                  <span className="text-lg flex-shrink-0">
                    {gpsLoading ? (
                      <span className="inline-block w-5 h-5 border-2 border-starlight-turquoise border-t-transparent rounded-full animate-spin" />
                    ) : '📍'}
                  </span>
                  <span className="text-paper-white font-special-elite text-sm flex-1">
                    {gpsLoading
                      ? 'Getting your location…'
                      : locationMode === 'gps' && startCoords
                        ? <span className="truncate block max-w-[220px]">{startText || 'Current location'}</span>
                        : 'Use my current location'}
                  </span>
                  {locationMode === 'gps' && startCoords && (
                    <span className="text-starlight-turquoise font-bungee text-xs flex-shrink-0">✓</span>
                  )}
                </button>

                {gpsError && (
                  <p className="text-atomic-orange font-special-elite text-xs px-1">{gpsError}</p>
                )}

                {/* Address option */}
                <button
                  type="button"
                  onClick={handleSwitchToAddress}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    locationMode === 'address'
                      ? 'border-starlight-turquoise bg-starlight-turquoise/10'
                      : 'border-starlight-turquoise/20 hover:border-starlight-turquoise/40'
                  }`}
                >
                  <span className="text-lg flex-shrink-0">🔍</span>
                  <span className="text-paper-white font-special-elite text-sm">Enter an address</span>
                </button>
              </div>

              {locationMode === 'address' && (
                <AddressInput
                  value={startText}
                  onChange={(v) => { setStartText(v); setStartCoords(null); }}
                  onSelect={handleSelectSuggestion}
                  placeholder="123 Main St, Louisville, KY…"
                />
              )}
              {locationMode === 'address' && startCoords && (
                <p className="text-starlight-turquoise/60 font-special-elite text-xs mt-1">✓ Location confirmed</p>
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
        {step === 'result' && trip && activeTrip && (
          <div className="lr-fade">

            {/* Map — uses activeTrip (checked stops only) */}
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
                <Polyline positions={activeTrip.routeCoordinates}
                  pathOptions={{ color: '#FF4E00', weight: 4, opacity: 0.85 }}
                />
                <Marker position={trip.startCoords} icon={makeStartMarker()} />
                {activeTrip.stops.map((stop, i) => (
                  <Marker key={stop.id} position={stop.coords} icon={makeStopMarker(i + 1)} />
                ))}
              </MapContainer>
            </div>

            {/* Hint: tap to include/exclude stops */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-chrome-silver/50 font-special-elite text-xs">
                Tap stops to include or exclude them, then tap <span className="text-starlight-turquoise">UPDATE ROUTE</span>.
              </p>
            </div>

            {/* Stop list — all generated candidates with checkboxes */}
            <div className="px-4 pb-2 space-y-2">

              {/* Start row */}
              <div className="flex items-center gap-3 py-1">
                <div className="w-8 h-8 rounded-full bg-starlight-turquoise/20 border-2 border-starlight-turquoise flex items-center justify-center text-sm flex-shrink-0">🚗</div>
                <div>
                  <p className="text-starlight-turquoise font-bungee text-sm">START</p>
                  <p className="text-chrome-silver font-special-elite text-xs">{startText} · {activeTrip.schedule.startTime}</p>
                </div>
              </div>

              {trip.stops.map((stop, i) => {
                const checked  = checkedIds.has(stop.id);
                // Find schedule item in activeTrip (may not exist if unchecked)
                const schItem  = activeTrip.schedule.items.find(it => it.stop.id === stop.id);
                return (
                  <button
                    key={stop.id}
                    type="button"
                    onClick={() => toggleStop(stop.id)}
                    className={`w-full text-left rounded-xl p-3 flex items-start gap-3 border transition-all ${
                      checked
                        ? 'bg-black/40 border-starlight-turquoise/30'
                        : 'bg-black/20 border-starlight-turquoise/10 opacity-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                      checked ? 'bg-starlight-turquoise border-starlight-turquoise' : 'border-chrome-silver/40'
                    }`}>
                      {checked && <span className="text-midnight-navy text-[10px] font-bold">✓</span>}
                    </div>

                    {/* Stop number badge */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bungee text-midnight-navy text-xs flex-shrink-0 ${
                      checked ? 'bg-atomic-orange' : 'bg-chrome-silver/30'
                    }`}>
                      {i + 1}
                    </div>

                    {/* Stop details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-paper-white font-bungee text-sm leading-tight truncate">
                          {stop.name}
                        </span>
                        <span className="text-xs">{TYPE_EMOJI[stop.type] ?? '📍'}</span>
                      </div>
                      <p className="text-chrome-silver/60 font-special-elite text-xs mt-0.5 truncate">
                        {stop.address}
                      </p>
                      {checked && schItem && (
                        <div className="flex items-center gap-2 mt-1 text-xs font-special-elite">
                          <span className="text-starlight-turquoise">Arrive {schItem.arrivalTime}</span>
                          <span className="text-chrome-silver/30">·</span>
                          <span className="text-chrome-silver/50">~{schItem.visitMins} min</span>
                          <span className="text-chrome-silver/30">·</span>
                          <span className="text-chrome-silver/50">{schItem.driveMins} min drive</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Return */}
              <div className="flex items-center gap-3 py-1">
                <div className="w-8 h-8 rounded-full bg-starlight-turquoise/20 border-2 border-starlight-turquoise flex items-center justify-center text-sm flex-shrink-0">🏁</div>
                <div>
                  <p className="text-starlight-turquoise font-bungee text-sm">BACK HOME</p>
                  <p className="text-chrome-silver font-special-elite text-xs">{activeTrip.schedule.returnTime}</p>
                </div>
              </div>

              {/* Summary chips */}
              <div className="flex gap-2 flex-wrap py-1">
                {[
                  `🕐 ${formatDuration(activeTrip.schedule.totalMinutes)}`,
                  `📍 ${activeTrip.schedule.totalMiles} mi`,
                  `✅ ${checkedIds.size} of ${trip.stops.length} stops`,
                ].map(chip => (
                  <span key={chip} className="bg-starlight-turquoise/10 border border-starlight-turquoise/30 text-starlight-turquoise font-special-elite text-xs px-3 py-1 rounded-full">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-4 pb-8 space-y-3">

              {/* UPDATE ROUTE — shown when selection differs from activeTrip */}
              {checkedIds.size > 0 && checkedIds.size !== activeTrip.stops.length && (
                <button onClick={handleUpdateRoute} disabled={isUpdatingRoute}
                  className="w-full bg-starlight-turquoise text-midnight-navy font-bungee py-3 rounded-xl hover:bg-paper-white transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isUpdatingRoute
                    ? <><div className="w-4 h-4 border-2 border-midnight-navy border-t-transparent rounded-full animate-spin" /> UPDATING…</>
                    : `↺ UPDATE ROUTE (${checkedIds.size} stop${checkedIds.size !== 1 ? 's' : ''})`
                  }
                </button>
              )}

              <button onClick={() => setShowNavModal(true)} disabled={checkedIds.size === 0}
                className="w-full bg-atomic-orange text-midnight-navy font-bungee py-3.5 rounded-xl hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ boxShadow: checkedIds.size > 0 ? '0 0 20px rgba(255,78,0,0.4)' : 'none' }}
              >
                🗺️ NAVIGATE THIS TRIP
              </button>
              <p className="text-chrome-silver/40 font-special-elite text-xs text-center -mt-1">
                Opens navigation with all {checkedIds.size} selected stops
              </p>

              {saved ? (
                <div className="w-full border border-starlight-turquoise text-starlight-turquoise font-bungee py-3.5 rounded-xl text-center text-sm">
                  ✓ SAVED TO YOUR ROUTES
                </div>
              ) : (
                <button onClick={handleSave} disabled={saving || checkedIds.size === 0}
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
            disabled={!startText || gpsLoading}
            className="w-full bg-atomic-orange text-midnight-navy font-bungee rounded-xl hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed text-base"
            style={{
              minHeight: 56,
              boxShadow: (startText && !gpsLoading) ? '0 0 20px rgba(255,78,0,0.4)' : 'none',
            }}
          >
            GENERATE DAY TRIP →
          </button>
        </div>
      )}

      {/* ── Navigation modal ── */}
      {showNavModal && activeTrip && (
        <div
          className="fixed inset-0 z-[2000] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowNavModal(false)}
        >
          <div
            className="w-full max-w-lg bg-midnight-navy border-t-4 border-starlight-turquoise rounded-t-3xl px-5 pt-5 pb-8 space-y-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-1">
              <h3 className="text-starlight-turquoise font-bungee text-lg drop-shadow-[0_0_8px_rgba(64,224,208,0.7)]">
                NAVIGATE YOUR TRIP
              </h3>
              <p className="text-chrome-silver/60 font-special-elite text-xs">
                {checkedIds.size} stop{checkedIds.size !== 1 ? 's' : ''} · ~{activeTrip.schedule.totalMiles} mi · starts and ends at your location
              </p>
            </div>

            {/* Google Maps — primary */}
            {(() => {
              const url = buildGoogleMapsUrl(startCoords, activeTrip.stops);
              return url ? (
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 bg-[#4285F4]/15 border-2 border-[#4285F4]/60 hover:border-[#4285F4] text-paper-white font-bungee py-3.5 px-4 rounded-xl transition-all"
                >
                  <span className="text-xl">🗺️</span>
                  <div className="flex-1 text-left">
                    <span className="block text-sm">Google Maps</span>
                    <span className="block text-chrome-silver/50 font-special-elite text-xs normal-case font-normal">
                      All {activeTrip.stops.length} stops pre-loaded · turn-by-turn navigation
                    </span>
                  </div>
                  <span className="text-[#4285F4] font-special-elite text-xs">Recommended</span>
                </a>
              ) : null;
            })()}

            {/* Apple Maps — iOS only */}
            {isIOS() && (() => {
              const url = buildAppleMapsUrl(startCoords, activeTrip.stops);
              return url ? (
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 bg-black/30 border border-chrome-silver/20 hover:border-chrome-silver/50 text-paper-white font-bungee py-3 px-4 rounded-xl transition-all"
                >
                  <span className="text-xl">🍎</span>
                  <div className="flex-1 text-left">
                    <span className="block text-sm">Apple Maps</span>
                    <span className="block text-chrome-silver/40 font-special-elite text-xs normal-case font-normal">
                      First stop only · multi-stop not supported
                    </span>
                  </div>
                </a>
              ) : null;
            })()}

            {/* Load in App */}
            <button onClick={handleLoadOnMap}
              className="w-full flex items-center gap-3 bg-starlight-turquoise/10 border border-starlight-turquoise/30 hover:border-starlight-turquoise/70 text-paper-white font-bungee py-3 px-4 rounded-xl transition-all"
            >
              <span className="text-xl">📍</span>
              <div className="flex-1 text-left">
                <span className="block text-sm">View in Literary Roads</span>
                <span className="block text-chrome-silver/40 font-special-elite text-xs normal-case font-normal">
                  Shows stops on the book map · in-app progress tracker
                </span>
              </div>
            </button>

            <button onClick={() => setShowNavModal(false)}
              className="w-full text-chrome-silver/50 hover:text-chrome-silver font-special-elite text-sm py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayTripPlanner;
