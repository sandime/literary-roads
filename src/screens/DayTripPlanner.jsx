import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import { autocompleteAddress, geocodePlace, reverseGeocode } from '../utils/mapboxGeocoding';
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

// ── Googie atomic starburst accent ────────────────────────────────────────────
const Starburst = ({ color = '#FF4E00', size = 20, style: sty = {} }) => {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI) / 8;
    const r = i % 2 === 0 ? size / 2 : size / 4.5;
    return `${size / 2 + r * Math.cos(angle)},${size / 2 + r * Math.sin(angle)}`;
  }).join(' ');
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'inline-block', flexShrink: 0, ...sty }}><polygon points={pts} fill={color} opacity="0.9" /></svg>;
};

const TYPE_EMOJI  = { bookstore: '📚', cafe: '☕', landmark: '🌲', drivein: '🎬', museum: '🏛️', artGallery: '🎨', park: '🌿', restaurant: '🍽️', observatory: '🔭', historicSite: '🏰', aquarium: '🐠', theater: '🎭' };

const CATEGORY_GROUPS = [
  {
    id: 'literary', icon: '📚', label: 'LITERARY STOPS',
    items: [
      { key: 'bookstore',    emoji: '📚', label: 'Bookstores'         },
      { key: 'landmark',     emoji: '🌲', label: 'Literary Landmarks' },
      { key: 'drivein',      emoji: '🎬', label: 'Drive-in Theaters'  },
    ],
  },
  {
    id: 'food', icon: '☕', label: 'FOOD & DRINK',
    items: [
      { key: 'cafe',         emoji: '☕', label: 'Coffee Shops'       },
      { key: 'restaurant',   emoji: '🍽️', label: 'Restaurants'        },
    ],
  },
  {
    id: 'attractions', icon: '🎨', label: 'ATTRACTIONS',
    items: [
      { key: 'museum',       emoji: '🏛️', label: 'Museums'            },
      { key: 'park',         emoji: '🌿', label: 'Parks'              },
      { key: 'historicSite', emoji: '🏰', label: 'Historic Sites'     },
      { key: 'artGallery',   emoji: '🎨', label: 'Art Galleries'      },
      { key: 'observatory',  emoji: '🔭', label: 'Observatories'      },
      { key: 'aquarium',     emoji: '🐠', label: 'Aquariums'          },
      { key: 'theater',      emoji: '🎭', label: 'Theaters'           },
    ],
  },
];
const CATEGORY_OPTIONS = CATEGORY_GROUPS.flatMap(g => g.items);
const ALL_CATEGORIES   = new Set(CATEGORY_OPTIONS.map(c => c.key));

const makeStopMarker = (num) => L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#FF4E00;border:2.5px solid #1A1B2E;display:flex;align-items:center;justify-content:center;font-family:'Bungee',sans-serif;font-size:12px;color:#1A1B2E;font-weight:900;box-shadow:0 0 10px rgba(255,78,0,0.7)">${num}</div>`,
  iconSize:   [30, 30],
  iconAnchor: [15, 15],
});

const makeStartMarker = () => L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#40E0D0;border:2.5px solid #1A1B2E;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 10px rgba(64,224,208,0.7);color:#1A1B2E;font-family:Bungee,sans-serif;font-weight:bold">▶</div>`,
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

// Address autocomplete input with integrated GPS button
const AddressInput = ({ value, onChange, onSelect, placeholder, confirmed, gpsLoading, onGPS, onClear }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop]       = useState(false);
  const containerRef = useRef(null);
  const debounceRef  = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!value || value.length < 2) { setSuggestions([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await autocompleteAddress(value, ['US', 'PR']);
      const list = res || [];
      setSuggestions(list);
      setShowDrop(list.length > 0);
    }, 500);
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

  const borderColor = confirmed ? 'rgba(64,224,208,0.9)' : 'rgba(64,224,208,0.4)';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Input row with embedded GPS + clear buttons */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDrop(true)}
          placeholder={placeholder}
          className="font-special-elite text-paper-white"
          style={{
            width: '100%', background: 'rgba(0,0,0,0.5)',
            border: `2px solid ${borderColor}`,
            borderRadius: 10, padding: '12px 80px 12px 14px',
            fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
          }}
          autoComplete="off"
        />
        {/* Right-side action buttons */}
        <div style={{ position: 'absolute', right: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Clear button — shown when there's text */}
          {value && (
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onClear(); }}
              style={{ width: 30, height: 30, borderRadius: 6, background: 'none', border: 'none',
                       cursor: 'pointer', color: 'rgba(192,192,192,0.5)', fontSize: 18, lineHeight: 1,
                       display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Clear"
            >
              ×
            </button>
          )}
          {/* GPS button */}
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); if (!gpsLoading) onGPS(); }}
            disabled={gpsLoading}
            style={{ width: 36, height: 36, borderRadius: 8,
                     background: confirmed ? 'rgba(64,224,208,0.15)' : 'rgba(64,224,208,0.08)',
                     border: `1px solid ${confirmed ? 'rgba(64,224,208,0.5)' : 'rgba(64,224,208,0.2)'}`,
                     cursor: gpsLoading ? 'default' : 'pointer',
                     display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Use my location"
          >
            {gpsLoading ? (
              <span style={{ display: 'inline-block', width: 14, height: 14,
                             border: '2px solid rgba(64,224,208,0.3)', borderTopColor: '#40E0D0',
                             borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={confirmed ? '#40E0D0' : 'rgba(64,224,208,0.7)'} strokeWidth={2.5}>
                <path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      {/* Confirmation line */}
      {confirmed && (
        <p className="font-special-elite" style={{ fontSize: 11, color: 'rgba(64,224,208,0.6)', marginTop: 4, paddingLeft: 2 }}>
          ✓ Location confirmed
        </p>
      )}
      {/* Autocomplete dropdown */}
      {showDrop && suggestions.length > 0 && (
        <ul style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, maxHeight: 220, overflowY: 'auto' }}
          className="bg-midnight-navy border-2 border-starlight-turquoise rounded-lg shadow-2xl"
        >
          {suggestions.map((s, i) => (
            <li key={i}
              onPointerDown={() => { onSelect(s); setShowDrop(false); }}
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

// ── Waypoints sheet / modal ───────────────────────────────────────────────────
const WaypointsSheet = ({ open, onClose, categories, setCategories, cuisineFilter, setCuisineFilter, dietaryFilters, setDietaryFilters }) => {
  const sheetRef   = useRef(null);
  const dragStartY = useRef(null);
  const dragDelta  = useRef(0);

  const onTouchStart = (e) => { dragStartY.current = e.touches[0].clientY; dragDelta.current = 0; };
  const onTouchMove  = (e) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    dragDelta.current = dy;
    if (dy > 0 && sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd = () => {
    if (dragDelta.current > 80) onClose();
    else if (sheetRef.current) sheetRef.current.style.transform = '';
    dragStartY.current = null;
    dragDelta.current  = 0;
  };

  const toggleCat  = (key) => setCategories(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleDiet = (key) => setDietaryFilters(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  if (!open) return null;

  const selectedCount = categories.size;

  // ── sticky bg so it covers content as it scrolls under ──────────────────
  const stickyBg = { position: 'sticky', zIndex: 10, background: '#1A1B2E' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.65)',
               display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
               alignItems: 'center' }}
      onClick={onClose}
    >
      {/* ── Sheet: the container ITSELF scrolls; sticky pins header+footer ── */}
      <div
        ref={sheetRef}
        className="waypoints-sheet"
        style={{
          width: '100%', maxWidth: 480,
          maxHeight: '80vh',
          overflowY: 'auto',                /* scroll lives HERE — same element as maxHeight */
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          background: '#1A1B2E',
          borderRadius: '24px 24px 0 0',
          transition: 'transform 0.18s ease',
        }}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* ── Sticky header (top: 0) ── */}
        <div style={{ ...stickyBg, top: 0 }}>
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(192,192,192,0.3)' }} />
          </div>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 20px 12px', borderBottom: '1px solid rgba(64,224,208,0.2)' }}>
            <div>
              <h3 className="text-starlight-turquoise font-bungee"
                style={{ fontSize: 16, textShadow: '0 0 6px rgba(64,224,208,0.6)', margin: 0 }}>
                WAYPOINTS
              </h3>
              <p className="font-special-elite" style={{ fontSize: 11, color: 'rgba(192,192,192,0.5)', margin: 0 }}>
                {selectedCount} of {ALL_CATEGORIES.size} selected
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setCategories(new Set(ALL_CATEGORIES))}
                className="font-special-elite" style={{ fontSize: 12, color: 'rgba(64,224,208,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>
                All
              </button>
              <span style={{ color: 'rgba(192,192,192,0.2)', fontSize: 12 }}>·</span>
              <button onClick={() => setCategories(new Set())}
                className="font-special-elite" style={{ fontSize: 12, color: 'rgba(192,192,192,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                None
              </button>
              <button onClick={onClose}
                style={{ marginLeft: 4, width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(192,192,192,0.2)',
                         background: 'none', cursor: 'pointer', color: 'rgba(192,192,192,0.5)', fontSize: 14,
                         display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* ── Scrollable content (plain block flow) ── */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {CATEGORY_GROUPS.map(group => {
            const groupChecked = group.items.filter(i => categories.has(i.key)).length;
            return (
              <div key={group.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>{group.icon}</span>
                  <span className="font-bungee text-atomic-orange" style={{ fontSize: 11, letterSpacing: '0.1em' }}>{group.label}</span>
                  <span className="font-special-elite" style={{ fontSize: 11, color: 'rgba(192,192,192,0.3)', marginLeft: 2 }}>{groupChecked}/{group.items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(({ key, emoji, label }) => {
                    const checked      = categories.has(key);
                    const isRestaurant = key === 'restaurant';
                    return (
                      <div key={key}>
                        <button
                          type="button"
                          onClick={() => toggleCat(key)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px', borderRadius: 12, border: `1px solid ${checked ? 'rgba(64,224,208,0.5)' : 'rgba(192,192,192,0.12)'}`,
                            background: checked ? 'rgba(64,224,208,0.08)' : 'transparent',
                            cursor: 'pointer', textAlign: 'left', minHeight: 52,
                          }}
                        >
                          <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? '#40E0D0' : 'rgba(192,192,192,0.4)'}`,
                                        background: checked ? '#40E0D0' : 'transparent', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {checked && <span style={{ color: '#1A1B2E', fontSize: 10, fontWeight: 900 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{emoji}</span>
                          <span className="font-special-elite" style={{ fontSize: 14, flex: 1, color: checked ? '#F5F5DC' : 'rgba(192,192,192,0.5)' }}>
                            {label}
                          </span>
                        </button>

                        {isRestaurant && checked && (
                          <div style={{ marginTop: 6, marginLeft: 16, paddingLeft: 16,
                                        borderLeft: '2px solid rgba(64,224,208,0.3)', paddingBottom: 4 }}>
                            <div style={{ position: 'relative', marginTop: 8 }}>
                              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                                             fontSize: 12, color: 'rgba(192,192,192,0.5)', pointerEvents: 'none' }}>🔍</span>
                              <input
                                type="text"
                                value={cuisineFilter}
                                onChange={e => setCuisineFilter(e.target.value)}
                                placeholder="Filter by cuisine (optional)"
                                className="font-special-elite"
                                style={{ width: '100%', background: 'rgba(26,27,46,0.7)', border: '1px solid rgba(192,192,192,0.2)',
                                         borderRadius: 8, paddingLeft: 32, paddingRight: cuisineFilter ? 28 : 10,
                                         paddingTop: 8, paddingBottom: 8, color: '#F5F5DC', fontSize: 12,
                                         outline: 'none', boxSizing: 'border-box' }}
                              />
                              {cuisineFilter && (
                                <button onClick={() => setCuisineFilter('')}
                                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                           background: 'none', border: 'none', color: 'rgba(192,192,192,0.5)',
                                           cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 10 }}>
                              {[
                                { key: 'vegan', label: 'Vegan' }, { key: 'vegetarian', label: 'Vegetarian' },
                                { key: 'gluten_free', label: 'Gluten-free' }, { key: 'halal', label: 'Halal' },
                                { key: 'kosher', label: 'Kosher' },
                              ].map(({ key: dk, label: dl }) => {
                                const dChecked = dietaryFilters.has(dk);
                                return (
                                  <button key={dk} type="button" onClick={() => toggleDiet(dk)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                                             border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                                    <div style={{ width: 16, height: 16, borderRadius: 3,
                                                  border: `2px solid ${dChecked ? '#FF4E00' : 'rgba(192,192,192,0.4)'}`,
                                                  background: dChecked ? '#FF4E00' : 'transparent', flexShrink: 0,
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {dChecked && <span style={{ color: '#1A1B2E', fontSize: 8, fontWeight: 900 }}>✓</span>}
                                    </div>
                                    <span className="font-special-elite" style={{ fontSize: 12, color: 'rgba(192,192,192,0.8)' }}>{dl}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* Bottom spacer so last item isn't hidden under sticky footer */}
          <div style={{ height: 8 }} />
        </div>

        {/* ── Sticky footer (bottom: 0) ── */}
        <div style={{ ...stickyBg, bottom: 0,
                      padding: '12px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
                      borderTop: '1px solid rgba(64,224,208,0.2)' }}>
          <button
            onClick={onClose}
            className="font-bungee"
            style={{ width: '100%', background: '#FF4E00', color: '#1A1B2E', border: 'none',
                     borderRadius: 12, minHeight: 56, fontSize: 15, cursor: 'pointer',
                     boxShadow: '0 0 16px rgba(255,78,0,0.35)', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#40E0D0'}
            onMouseLeave={e => e.currentTarget.style.background = '#FF4E00'}
          >
            DONE — {selectedCount} SELECTED
          </button>
        </div>
      </div>
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

  const mapRef = useRef(null);

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
        @keyframes lr-fade-in  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes lr-sheet-in { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes lr-modal-in { from { opacity:0; transform:scale(0.95) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .lr-fade { animation: lr-fade-in 0.3s ease; }
        .waypoints-sheet { animation: lr-sheet-in 0.28s cubic-bezier(0.32,0.72,0,1); }
        @media (min-width: 768px) { .waypoints-sheet { animation: lr-modal-in 0.2s ease; } }
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
      <div className="flex-1 overflow-y-auto" style={{ background: 'radial-gradient(ellipse at 15% 10%, rgba(255,78,0,0.05) 0%, transparent 45%), radial-gradient(ellipse at 85% 85%, rgba(64,224,208,0.04) 0%, transparent 45%)' }}>

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

            {/* Restaurant filter notice */}
            {genError && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-lg border border-atomic-orange/40 bg-atomic-orange/10">
                <p className="text-atomic-orange font-special-elite text-xs text-center">{genError}</p>
              </div>
            )}

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
