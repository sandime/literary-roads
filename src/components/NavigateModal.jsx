import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { autocompleteAddress, geocodePlace, reverseGeocode } from '../utils/mapboxGeocoding';

const MAX_WAYPOINTS = 9; // Google Maps URL limit

const TYPE_LABEL = {
  bookstore: '📚 Bookstore', cafe: '☕ Coffee', landmark: '🌲 Landmark',
  drivein: '🎬 Drive-In', museum: '🏛️ Museum', scenic: '🦁 Attraction',
  park: '🌿 Park', restaurant: '🍽️ Restaurant', music: '🎵 Music Store',
  garden: '🪴 Garden', observatory: '🔭 Observatory', flea: '🏪 Flea Market',
  antique: '🪑 Antiques', historical: '🏛️ Historical',
};

// Extract a usable lat,lng string from a stop object
const stopLatLng = (s) => {
  if (s.coords?.[0] != null) return `${s.coords[0]},${s.coords[1]}`;
  if (s.lat != null && s.lng != null) return `${s.lat},${s.lng}`;
  return null;
};

const buildGoogleMapsUrl = (origin, destination, stops) => {
  const waypoints = stops.map(stopLatLng).filter(Boolean).join('|');
  const params = new URLSearchParams({ api: '1', travelmode: 'driving' });
  params.set('origin', origin);
  params.set('destination', destination);
  if (waypoints) params.set('waypoints', waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

// ── Inline address autocomplete ───────────────────────────────────────────────
const AddrInput = ({ value, onChange, onSelect, placeholder, disabled }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow]               = useState(false);
  const containerRef = useRef(null);
  const debounceRef  = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!value || value.length < 2) { setSuggestions([]); setShow(false); return; }
    debounceRef.current = setTimeout(async () => {
      const list = (await autocompleteAddress(value, ['US', 'PR'])) || [];
      setSuggestions(list);
      setShow(list.length > 0);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    const close = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text" value={value} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShow(true)}
        placeholder={placeholder}
        className="w-full bg-black/50 border-2 border-starlight-turquoise/60 text-paper-white font-special-elite px-3 py-2.5 rounded-lg focus:outline-none focus:border-starlight-turquoise disabled:opacity-40"
        style={{ fontSize: '0.9rem' }}
        autoComplete="off"
      />
      {show && suggestions.length > 0 && (
        <ul
          style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60, maxHeight: 200, overflowY: 'auto' }}
          className="bg-midnight-navy border-2 border-starlight-turquoise rounded-lg shadow-2xl"
        >
          {suggestions.map((s, i) => (
            <li key={i}
              onPointerDown={() => { onSelect(s); setShow(false); }}
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

// ── Main modal ────────────────────────────────────────────────────────────────
const NavigateModal = ({ items, onClose, selectable = false }) => {
  const [startText, setStartText]     = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endSameAsStart, setEndSameAsStart] = useState(true);
  const [endText, setEndText]         = useState('');
  const [endCoords, setEndCoords]     = useState(null);
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [gpsError, setGpsError]       = useState('');
  const [formError, setFormError]     = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set(items.map(s => s.id)));

  const toggleStop = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const activeItems   = selectable ? items.filter(s => selectedIds.has(s.id)) : items;
  const waypointStops = activeItems.slice(0, MAX_WAYPOINTS);
  const overflow      = activeItems.length - MAX_WAYPOINTS;

  const handleSelectStart = async (suggestion) => {
    const label = typeof suggestion === 'string' ? suggestion : (suggestion.label || suggestion.display || '');
    setStartText(label);
    // Mapbox suggestions already include coordinates — no extra geocode call needed
    if (suggestion?.lat && suggestion?.lng) {
      setStartCoords([suggestion.lat, suggestion.lng]);
    } else if (typeof suggestion === 'string') {
      const c = await geocodePlace(suggestion);
      if (c) setStartCoords([c.lat, c.lng]);
    }
  };

  const handleSelectEnd = async (suggestion) => {
    const label = typeof suggestion === 'string' ? suggestion : (suggestion.label || suggestion.display || '');
    setEndText(label);
    if (suggestion?.lat && suggestion?.lng) {
      setEndCoords([suggestion.lat, suggestion.lng]);
    } else if (typeof suggestion === 'string') {
      const c = await geocodePlace(suggestion);
      if (c) setEndCoords([c.lat, c.lng]);
    }
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) { setGpsError('GPS not available on this device.'); return; }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setStartCoords([latitude, longitude]);
        const addr = await reverseGeocode(latitude, longitude);
        setStartText(addr);
        setGpsLoading(false);
      },
      () => { setGpsError('Could not get your location.'); setGpsLoading(false); },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleNavigate = () => {
    if (!startText.trim()) {
      setFormError('Please enter a starting address or use GPS.');
      return;
    }
    setFormError('');

    const origin = startCoords
      ? `${startCoords[0]},${startCoords[1]}`
      : startText;

    const destination = endSameAsStart
      ? origin
      : (endCoords ? `${endCoords[0]},${endCoords[1]}` : (endText.trim() || origin));

    window.open(buildGoogleMapsUrl(origin, destination, waypointStops), '_blank');
    onClose();
  };

  // Render into document.body via portal so fixed positioning is never broken
  // by CSS transforms on ancestor elements (Leaflet layers, RoadTrip slide-up animation, etc.)
  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', zIndex: 99999 }}
      onClick={onClose}
    >
      {/* flex-col so header + scroll-content + sticky-footer stack correctly */}
      <div
        className="w-full max-w-lg bg-midnight-navy border-t-4 border-starlight-turquoise rounded-t-3xl flex flex-col"
        style={{ maxHeight: '90dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header — always visible ── */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h3 className="text-starlight-turquoise font-bungee text-lg drop-shadow-[0_0_8px_rgba(64,224,208,0.7)]">
              NAVIGATE MY STOPS
            </h3>
            <p className="text-chrome-silver/60 font-special-elite text-xs mt-0.5">
              {items.length} stop{items.length !== 1 ? 's' : ''} · ordered along route
            </p>
          </div>
          <button onClick={onClose} className="text-chrome-silver/40 hover:text-chrome-silver text-2xl leading-none mt-1 flex-shrink-0">✕</button>
        </div>

        {/* ── Scrollable form content ── */}
        <div className="flex-1 overflow-y-auto px-5 space-y-5 pb-2">

          {/* ── Starting address ── */}
          <div>
            <label className="text-chrome-silver font-bungee text-xs tracking-widest block mb-2">
              STARTING FROM
            </label>
            <button
              type="button" onClick={handleUseGPS} disabled={gpsLoading}
              className="w-full flex items-center gap-2 mb-2 text-starlight-turquoise font-special-elite text-sm border border-starlight-turquoise/30 rounded-lg px-3 py-2 hover:bg-starlight-turquoise/10 transition-colors disabled:opacity-50"
            >
              {gpsLoading
                ? <span className="w-4 h-4 border-2 border-starlight-turquoise border-t-transparent rounded-full animate-spin flex-shrink-0" />
                : <span className="flex-shrink-0">📍</span>
              }
              <span>{gpsLoading ? 'Getting your location…' : 'Use my current location'}</span>
            </button>
            {gpsError && <p className="text-atomic-orange font-special-elite text-xs mb-2">{gpsError}</p>}
            <AddrInput
              value={startText}
              onChange={(v) => { setStartText(v); setStartCoords(null); }}
              onSelect={handleSelectStart}
              placeholder="123 Main St, Louisville, KY…"
            />
            {startCoords && (
              <p className="text-starlight-turquoise/60 font-special-elite text-xs mt-1">✓ Location confirmed</p>
            )}
          </div>

          {/* ── Ending address ── */}
          <div>
            <label className="text-chrome-silver font-bungee text-xs tracking-widest block mb-2">
              ENDING AT
            </label>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox" checked={endSameAsStart}
                onChange={e => setEndSameAsStart(e.target.checked)}
                className="accent-starlight-turquoise w-4 h-4"
              />
              <span className="text-paper-white font-special-elite text-sm">
                Return to starting point (circular trip)
              </span>
            </label>
            {!endSameAsStart && (
              <AddrInput
                value={endText}
                onChange={(v) => { setEndText(v); setEndCoords(null); }}
                onSelect={handleSelectEnd}
                placeholder="Ending address…"
              />
            )}
          </div>

          {/* ── Stops ── */}
          <div>
            <label className="text-chrome-silver font-bungee text-xs tracking-widest block mb-2">
              {selectable ? 'CHOOSE YOUR STOPS' : 'YOUR STOPS'}
              {overflow > 0 && (
                <span className="text-atomic-orange ml-2 normal-case font-special-elite tracking-normal">
                  (first {MAX_WAYPOINTS} selected — Google Maps limit)
                </span>
              )}
            </label>
            {selectable && (
              <p className="text-chrome-silver/60 font-special-elite text-xs mb-2">
                {selectedIds.size} of {items.length} selected · uncheck stops you want to skip
              </p>
            )}
            {overflow > 0 && !selectable && (
              <p className="text-atomic-orange/70 font-special-elite text-xs mb-2">
                Remove {overflow} stop{overflow !== 1 ? 's' : ''} from My Stops to include all in navigation.
              </p>
            )}
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {items.map((stop, i) => {
                const isChecked = !selectable || selectedIds.has(stop.id);
                const orderNum  = selectable
                  ? (isChecked ? waypointStops.findIndex(s => s.id === stop.id) + 1 : null)
                  : i + 1;
                const isOverflow = selectable && isChecked && waypointStops.findIndex(s => s.id === stop.id) === -1;
                return (
                  <div
                    key={stop.id}
                    className={`flex items-start gap-2.5 ${selectable ? 'cursor-pointer' : ''} ${isOverflow ? 'opacity-40' : ''}`}
                    onClick={selectable ? () => toggleStop(stop.id) : undefined}
                  >
                    {selectable ? (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStop(stop.id)}
                        onClick={e => e.stopPropagation()}
                        className="accent-starlight-turquoise w-4 h-4 mt-0.5 flex-shrink-0"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-atomic-orange text-midnight-navy font-bungee text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {orderNum}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`font-special-elite text-xs leading-tight truncate ${isChecked ? 'text-paper-white' : 'text-chrome-silver/40 line-through'}`}>
                        {stop.name}
                      </p>
                      <p className="text-chrome-silver/50 font-special-elite text-[10px] truncate">
                        {TYPE_LABEL[stop.type] ?? '📍'}
                        {stop.address ? ` · ${stop.address}` : ''}
                      </p>
                    </div>
                    {selectable && isChecked && orderNum && (
                      <span className="w-5 h-5 rounded-full bg-atomic-orange text-midnight-navy font-bungee text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {orderNum}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── Sticky footer — INSIDE the modal sheet so it stays pinned at the bottom ── */}
        <div
          className="flex-shrink-0 px-5 pt-3 border-t border-starlight-turquoise/20 bg-midnight-navy rounded-b-3xl"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        >
          {formError && (
            <p className="text-atomic-orange font-special-elite text-xs mb-2">{formError}</p>
          )}
          <button
            onClick={handleNavigate}
            disabled={!startText.trim() || gpsLoading}
            className="w-full bg-atomic-orange text-midnight-navy font-bungee rounded-xl hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              minHeight: 52,
              boxShadow: startText.trim() ? '0 0 20px rgba(255,78,0,0.4)' : 'none',
            }}
          >
            START NAVIGATION
          </button>
          <p className="text-chrome-silver/40 font-special-elite text-xs text-center mt-1.5">
            Opens Google Maps with {waypointStops.length} stop{waypointStops.length !== 1 ? 's' : ''}
            {selectable && selectedIds.size > MAX_WAYPOINTS ? ` (${MAX_WAYPOINTS} max)` : ' in geographic order'}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NavigateModal;
