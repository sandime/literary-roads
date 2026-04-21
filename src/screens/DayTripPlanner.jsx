import { useState, useEffect, useRef } from 'react';
import { PlayIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { geocodePlace, reverseGeocode } from '../utils/mapboxGeocoding';
import { saveRoute } from '../utils/savedRoutes';
import { generateDayTrip, buildRoute, VISIT_MINUTES, RADIUS_MILES } from '../utils/dayTripAlgorithm';
import AddressInput from '../components/journey/AddressInput';
import WaypointsSheet from '../components/journey/WaypointsSheet';
import SaveRouteButton from '../components/journey/SaveRouteButton';
import JourneyGenerating from '../components/journey/JourneyGenerating';
import Starburst from '../components/journey/Starburst';
import { CATEGORY_GROUPS, CATEGORY_OPTIONS, ALL_CATEGORIES, TYPE_ICON } from '../components/journey/constants';

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




// ─── Main Component ──────────────────────────────────────────────────────────
const DayTripPlanner = ({ onBack, onLoadTrip, onShowLogin }) => {
  const { user } = useAuth();

  // Step state
  const [step, setStep] = useState('input'); // 'input' | 'generating' | 'result'

  // Input state
  const [startText, setStartText]     = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [duration, setDuration]       = useState('halfDay');
  const [categories, setCategories]   = useState(new Set(ALL_CATEGORIES));
  const [cuisineFilter, setCuisineFilter]   = useState('');
  const [dietaryFilters, setDietaryFilters] = useState(new Set());
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

  // Waypoints sheet
  const [showWaypoints, setShowWaypoints] = useState(false);

  // Navigation modal
  const [showNavModal, setShowNavModal] = useState(false);

  // Pending-save banner (shown after trip is restored post-sign-in)
  const [pendingDaySave, setPendingDaySave] = useState(false);

  // On mount: restore any day trip that was saved to localStorage before sign-in
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem('lr_pending_day_trip');
      if (!raw) return;
      localStorage.removeItem('lr_pending_day_trip');
      const pending = JSON.parse(raw);
      if (Date.now() - pending.timestamp >= 30 * 60 * 1000 || !pending.trip) return;
      setStartText(pending.startText || '');
      setStartCoords(pending.startCoords || null);
      setDuration(pending.duration || 'halfDay');
      setTrip(pending.trip);
      const restoredActiveTrip = pending.activeTrip || pending.trip;
      setActiveTrip(restoredActiveTrip);
      setCheckedIds(new Set(pending.checkedIds || restoredActiveTrip.stops.map(s => s.id)));
      setTripCount(pending.tripCount || 1);
      setPendingDaySave(true);
      setStep('result');
    } catch {}
  }, [user]); // eslint-disable-line

  // Checkbox / update-route state
  const [checkedIds, setCheckedIds]         = useState(new Set());
  const [activeTrip, setActiveTrip]         = useState(null); // route for checked stops
  const [isUpdatingRoute, setIsUpdatingRoute] = useState(false);

  const handleSelectSuggestion = async (suggestion) => {
    const label = typeof suggestion === 'string' ? suggestion : (suggestion.label || suggestion.display || '');
    setStartText(label);
    // Mapbox suggestions already include coordinates — no extra geocode call
    if (suggestion?.lat && suggestion?.lng) {
      setStartCoords([suggestion.lat, suggestion.lng]);
    } else if (typeof suggestion === 'string') {
      const coords = await geocodePlace(suggestion);
      if (coords) setStartCoords([coords.lat, coords.lng]);
    }
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
      const coords = await geocodePlace(startText);
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
      const restaurantFilter = categories.has('restaurant')
        ? { cuisine: cuisineFilter.trim(), dietary: dietaryFilters }
        : null;
      const result = await generateDayTrip(coords, duration, nextVariant, nextExcluded, categories, restaurantFilter);
      if (!result || !result.stops.length) {
        setGenError('No locations found nearby. Try a different city or wider time range.');
        setStep('input');
        return;
      }
      // Warn when restaurant filter matched nothing (trip still generated, just no restaurant stop)
      if (result.restaurantFilterEmpty) {
        const cuisine = restaurantFilter?.cuisine;
        const diets   = restaurantFilter?.dietary?.size
          ? [...restaurantFilter.dietary].join(' or ')
          : '';
        const parts = [cuisine, diets].filter(Boolean).join(' ');
        setGenError(`No ${parts} restaurants found in this area — other stops included.`);
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
    if (!user) {
      // Persist the generated trip so it survives sign-in and can be saved immediately after
      try {
        const routeData = activeTrip || trip;
        localStorage.setItem('lr_pending_day_trip', JSON.stringify({
          startText,
          startCoords,
          duration,
          trip,
          activeTrip:  routeData,
          checkedIds:  Array.from(checkedIds),
          tripCount,
          timestamp:   Date.now(),
        }));
      } catch {}
      onShowLogin();
      return;
    }
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
        routeType: 'dayTrip',
      });
      setSaved(true);
    } catch (e) {
      console.error('[DayTripPlanner] save error:', e);
    } finally {
      setSaving(false);
    }
  };

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
    <div className="w-full bg-midnight-navy flex flex-col" style={{ height: '100dvh', minHeight: '100vh', overflow: 'hidden' }}>
      <style>{`
        @keyframes lr-fade-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .lr-fade { animation: lr-fade-in 0.3s ease; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-midnight-navy/95 border-b-2 border-starlight-turquoise px-4 py-3 flex items-center gap-3">
        <button onClick={onBack}
          className="text-starlight-turquoise hover:text-atomic-orange transition-colors flex-shrink-0"
          style={{ minWidth:40, minHeight:40, display:'flex', alignItems:'center', justifyContent:'center' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Starburst color="#40E0D0" size={14} />
            <h1 className="text-starlight-turquoise font-bungee text-lg leading-tight drop-shadow-[0_0_8px_rgba(64,224,208,0.7)]">
              {step === 'result' ? `DAY TRIP #${tripCount}` : 'PLAN A DAY TRIP'}
            </h1>
            <Starburst color="#FF4E00" size={10} style={{ opacity: 0.6 }} />
          </div>
          {step === 'result' && trip && (
            <p className="text-chrome-silver font-special-elite text-xs mt-0.5">
              {trip.stops.length} stops · ~{formatDuration(trip.schedule.totalMinutes)} · {trip.schedule.totalMiles} mi
            </p>
          )}
        </div>
        {step === 'result' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleBackToInput}
              className="text-chrome-silver/50 hover:text-chrome-silver transition-colors font-bungee text-xs border border-chrome-silver/20 hover:border-chrome-silver/50 px-2 py-1.5 rounded-full"
              title="Back to input"
            >
              ✏️
            </button>
            <button onClick={handleRegenerate}
              className="text-atomic-orange hover:text-starlight-turquoise transition-colors font-bungee text-xs border border-atomic-orange hover:border-starlight-turquoise px-3 py-1.5 rounded-full"
            >
              ↺ NEW
            </button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto"
        style={{
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          background: 'radial-gradient(ellipse at 15% 10%, rgba(255,78,0,0.05) 0%, transparent 45%), radial-gradient(ellipse at 85% 85%, rgba(64,224,208,0.04) 0%, transparent 45%)',
        }}>

        {/* ══ STEP 1: INPUT ══ */}
        {step === 'input' && (
          <div className="max-w-lg mx-auto px-4 py-6 space-y-6 lr-fade pb-28">

            {/* Starting location — combined input */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest flex items-center gap-1.5 mb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                STARTING FROM
              </label>
              <AddressInput
                value={startText}
                onChange={(v) => { setStartText(v); setStartCoords(null); setLocationMode('address'); }}
                onSelect={handleSelectSuggestion}
                placeholder="Address or city…"
                confirmed={!!(startCoords)}
                gpsLoading={gpsLoading}
                onGPS={handleUseGPS}
                onClear={handleSwitchToAddress}
              />
              {gpsError && (
                <p className="text-atomic-orange font-special-elite text-xs mt-1.5 px-1">{gpsError}</p>
              )}
            </div>

            {/* Neon divider */}
            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(64,224,208,0.35), rgba(255,78,0,0.15), transparent)', boxShadow: '0 0 4px rgba(64,224,208,0.15)' }} />

            {/* Time available */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest flex items-center gap-1.5 mb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
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

            {/* Neon divider */}
            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(64,224,208,0.35), rgba(255,78,0,0.15), transparent)', boxShadow: '0 0 4px rgba(64,224,208,0.15)' }} />

            {/* Waypoints */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest flex items-center gap-1.5 mb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                WAYPOINTS
              </label>
              <button
                type="button"
                onClick={() => setShowWaypoints(true)}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-starlight-turquoise/30 bg-starlight-turquoise/5 hover:border-starlight-turquoise/60 active:bg-starlight-turquoise/10 transition-all text-left"
                style={{ minHeight: 60 }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-paper-white font-special-elite text-sm truncate">
                    {(() => {
                      const count = categories.size;
                      if (count === 0) return 'No stops selected';
                      if (count === ALL_CATEGORIES.size) return 'All stop types';
                      const selected = CATEGORY_OPTIONS.filter(c => categories.has(c.key));
                      const names = selected.map(c => c.label);
                      if (names.length <= 2) return names.join(', ');
                      return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
                    })()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="bg-starlight-turquoise text-midnight-navy font-bungee text-xs px-2.5 py-0.5 rounded-full">
                    {categories.size}
                  </span>
                  <svg className="w-4 h-4 text-starlight-turquoise/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

          </div>
        )}

        {/* ══ STEP 2: GENERATING ══ */}
        {step === 'generating' && (
          <JourneyGenerating
            message="PLOTTING YOUR ROUTE…"
            subMessage="Finding the best literary stops nearby"
          />
        )}

        {/* ══ STEP 3: RESULT ══ */}
        {step === 'result' && trip && activeTrip && (
          <div className="lr-fade">

            {/* Restaurant filter notice */}
            {genError && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-lg border border-atomic-orange/40 bg-atomic-orange/10">
                <p className="text-atomic-orange font-special-elite text-xs text-center">{genError}</p>
              </div>
            )}

            {/* Restored trip banner — shown after sign-in recovery */}
            {pendingDaySave && (
              <div className="mx-4 mt-3 bg-starlight-turquoise/10 border border-starlight-turquoise/50 rounded-xl px-3 py-2.5 flex items-center gap-3">
                <span className="text-starlight-turquoise text-base flex-shrink-0">✓</span>
                <p className="text-paper-white font-special-elite text-sm flex-1 leading-tight">
                  Welcome back! Your trip was restored.
                </p>
                <button
                  onClick={() => { setPendingDaySave(false); handleSave(); }}
                  className="bg-atomic-orange text-midnight-navy font-bungee text-xs px-3 py-1.5 rounded-lg flex-shrink-0 hover:bg-starlight-turquoise transition-colors"
                >
                  SAVE
                </button>
                <button onClick={() => setPendingDaySave(false)}
                  className="text-chrome-silver/40 hover:text-chrome-silver flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

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
                <div className="w-8 h-8 rounded-full bg-starlight-turquoise/20 border-2 border-starlight-turquoise flex items-center justify-center flex-shrink-0">
                  <PlayIcon size={16} />
                </div>
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
                        {(() => { const IC = TYPE_ICON[stop.type]; return IC ? <IC size={14} /> : <span style={{ fontSize: 12 }}>📍</span>; })()}
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
                      {stop.note && (
                        <p className="text-chrome-silver/50 font-special-elite text-xs mt-1 italic">{stop.note}</p>
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
            <div className="px-4 space-y-3" style={{ paddingBottom: 120 }}>

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
                NAVIGATE THIS TRIP
              </button>
              <p className="text-chrome-silver/40 font-special-elite text-xs text-center -mt-1">
                Opens navigation with all {checkedIds.size} selected stops
              </p>

              <SaveRouteButton
                onSave={handleSave}
                saving={saving}
                saved={saved}
                disabled={checkedIds.size === 0}
                label="SAVE THIS TRIP"
              />
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
            className="w-full bg-atomic-orange text-midnight-navy font-bungee rounded-xl hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2"
            style={{
              minHeight: 56,
              boxShadow: (startText && !gpsLoading) ? '0 0 20px rgba(255,78,0,0.4)' : 'none',
              transition: 'box-shadow 0.15s, background 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => { if (startText && !gpsLoading) { e.currentTarget.style.boxShadow = '0 0 36px rgba(255,78,0,0.75), 0 0 60px rgba(255,78,0,0.25)'; e.currentTarget.style.transform = 'scale(1.01)'; } }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = (startText && !gpsLoading) ? '0 0 20px rgba(255,78,0,0.4)' : 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Starburst color="#1A1B2E" size={15} />
            GENERATE DAY TRIP →
          </button>
        </div>
      )}

      {/* ── Waypoints sheet / modal ── */}
      <WaypointsSheet
        open={showWaypoints}
        onClose={() => setShowWaypoints(false)}
        categories={categories}
        setCategories={setCategories}
        cuisineFilter={cuisineFilter}
        setCuisineFilter={setCuisineFilter}
        dietaryFilters={dietaryFilters}
        setDietaryFilters={setDietaryFilters}
      />

      {/* ── Navigation modal ── */}
      {showNavModal && activeTrip && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.65)',
                   display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowNavModal(false)}
        >
          {/* Sheet: container itself scrolls — same pattern as WaypointsSheet */}
          <div
            style={{
              width: '100%', maxWidth: 512,
              maxHeight: '80vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              background: '#1A1B2E',
              borderTop: '4px solid #40E0D0',
              borderRadius: '24px 24px 0 0',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#1A1B2E',
                          padding: '20px 20px 16px', borderBottom: '1px solid rgba(64,224,208,0.15)' }}>
              <h3 className="text-starlight-turquoise font-bungee"
                style={{ fontSize: 18, textShadow: '0 0 8px rgba(64,224,208,0.7)', margin: 0 }}>
                NAVIGATE YOUR TRIP
              </h3>
              <p className="font-special-elite" style={{ fontSize: 11, color: 'rgba(192,192,192,0.6)', margin: '2px 0 0' }}>
                {checkedIds.size} stop{checkedIds.size !== 1 ? 's' : ''} · ~{activeTrip.schedule.totalMiles} mi · starts and ends at your location
              </p>
            </div>

            {/* Scrollable options */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Google Maps — primary */}
              {(() => {
                const url = buildGoogleMapsUrl(startCoords, activeTrip.stops);
                return url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="font-bungee"
                    style={{ display: 'flex', alignItems: 'center', gap: 12,
                             background: 'rgba(66,133,244,0.12)', border: '2px solid rgba(66,133,244,0.55)',
                             borderRadius: 12, padding: '14px 16px', textDecoration: 'none', minHeight: 64 }}
                  >
                    <div style={{ flex: 1 }}>
                      <span className="font-bungee text-paper-white" style={{ display: 'block', fontSize: 14 }}>Google Maps</span>
                      <span className="font-special-elite" style={{ display: 'block', fontSize: 11, color: 'rgba(192,192,192,0.5)' }}>
                        All {activeTrip.stops.length} stops pre-loaded · turn-by-turn navigation
                      </span>
                    </div>
                    <span className="font-special-elite" style={{ fontSize: 11, color: '#4285F4', flexShrink: 0 }}>Recommended</span>
                  </a>
                ) : null;
              })()}

              {/* Apple Maps — iOS only */}
              {isIOS() && (() => {
                const url = buildAppleMapsUrl(startCoords, activeTrip.stops);
                return url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 12,
                             background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(192,192,192,0.2)',
                             borderRadius: 12, padding: '12px 16px', textDecoration: 'none', minHeight: 60 }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>🍎</span>
                    <div style={{ flex: 1 }}>
                      <span className="font-bungee text-paper-white" style={{ display: 'block', fontSize: 14 }}>Apple Maps</span>
                      <span className="font-special-elite" style={{ display: 'block', fontSize: 11, color: 'rgba(192,192,192,0.4)' }}>
                        First stop only · multi-stop not supported
                      </span>
                    </div>
                  </a>
                ) : null;
              })()}

            </div>

            {/* Sticky footer — Cancel button */}
            <div style={{ position: 'sticky', bottom: 0, zIndex: 10, background: '#1A1B2E',
                          padding: '12px 20px',
                          paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
                          borderTop: '1px solid rgba(64,224,208,0.15)' }}>
              <button onClick={() => setShowNavModal(false)}
                className="font-special-elite"
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                         color: 'rgba(192,192,192,0.5)', fontSize: 14, padding: '8px 0' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayTripPlanner;
