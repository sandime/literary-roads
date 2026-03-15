import { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import { autocompleteAddress, geocodePlace, reverseGeocode } from '../utils/mapboxGeocoding';
import { searchNearbyPlaces } from '../utils/nearbySearch';
import { saveRoute } from '../utils/savedRoutes';
import festivalsData from '../data/literaryFestivals.json';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ALL_STATES = ['AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','PR','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY'];
const TYPE_LABELS = {
  general:            { label: '📚 Book Festivals',        color: '#40E0D0' },
  poetry:             { label: '🎭 Poetry & Spoken Word',  color: '#B044FB' },
  genre:              { label: '🔍 Genre Specific',        color: '#FF4E00' },
  'writers-conference':{ label: '✍️ Writers\' Conferences', color: '#F5F5DC' },
  children:           { label: '📖 Children\'s & YA',      color: '#FFB347' },
};
const SIZE_BADGES = {
  major:    { label: 'MAJOR',    bg: 'bg-atomic-orange/20 border-atomic-orange/60',     text: 'text-atomic-orange' },
  regional: { label: 'REGIONAL', bg: 'bg-starlight-turquoise/20 border-starlight-turquoise/60', text: 'text-starlight-turquoise' },
  specialty:{ label: 'SPECIALTY',bg: 'bg-chrome-silver/20 border-chrome-silver/40',     text: 'text-chrome-silver' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

const makeStopMarker = (num, color = '#FF4E00') => L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid #1A1B2E;display:flex;align-items:center;justify-content:center;font-family:'Bungee',sans-serif;font-size:11px;color:#1A1B2E;box-shadow:0 0 8px ${color}88">${num}</div>`,
  iconSize: [28,28], iconAnchor: [14,14],
});

const makeFestivalMarker = () => L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;border-radius:50%;background:#B044FB;border:2.5px solid #1A1B2E;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 14px rgba(176,68,251,0.8)">🎪</div>`,
  iconSize: [32,32], iconAnchor: [16,16],
});

const makeStartMarker = () => L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#40E0D0;border:2px solid #1A1B2E;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 10px rgba(64,224,208,0.7)">🚗</div>`,
  iconSize: [28,28], iconAnchor: [14,14],
});

// ── Googie atomic starburst accent ────────────────────────────────────────────
const Starburst = ({ color = '#FF4E00', size = 20, style: sty = {} }) => {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI) / 8;
    const r = i % 2 === 0 ? size / 2 : size / 4.5;
    return `${size / 2 + r * Math.cos(angle)},${size / 2 + r * Math.sin(angle)}`;
  }).join(' ');
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'inline-block', flexShrink: 0, ...sty }}><polygon points={pts} fill={color} opacity="0.9" /></svg>;
};

// ── Address Autocomplete ───────────────────────────────────────────────────────
const AddressInput = ({ value, onChange, onSelect, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const containerRef = useRef(null);
  const debounceRef  = useRef(null);

  const handleChange = (v) => {
    onChange(v);
    clearTimeout(debounceRef.current);
    if (!v || v.length < 2) { setSuggestions([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await autocompleteAddress(v, ['US', 'PR']);
      if (res?.length) { setSuggestions(res); setShowDrop(true); }
    }, 500);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input type="text" value={value} onChange={e => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setShowDrop(false), 150)}
        placeholder={placeholder}
        className="w-full bg-black/50 border-2 border-starlight-turquoise/60 text-paper-white font-special-elite px-3 py-2.5 rounded-lg focus:outline-none focus:border-starlight-turquoise"
        style={{ fontSize: '0.9rem' }} autoComplete="off"
      />
      {showDrop && suggestions.length > 0 && (
        <ul style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:50, maxHeight:200, overflowY:'auto' }}
          className="bg-midnight-navy border-2 border-starlight-turquoise rounded-lg shadow-2xl"
        >
          {suggestions.map((s, i) => (
            <li key={i} onPointerDown={() => { onSelect(s); setShowDrop(false); }}
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

// ── Itinerary Generator ────────────────────────────────────────────────────────
async function buildFestivalItinerary(startCoords, startText, festivals, tripDays, packed, includeTypes) {
  const f1 = festivals[0];
  const f2 = festivals[1] || null;

  // Fetch nearby literary places for each festival city
  let places1 = [], places2 = [];
  try { places1 = await searchNearbyPlaces(f1.lat, f1.lng, 8) || []; } catch {}
  if (f2) {
    try { places2 = await searchNearbyPlaces(f2.lat, f2.lng, 8) || []; } catch {}
  }

  const books1  = places1.filter(p => p.type === 'bookstore');
  const cafes1  = places1.filter(p => p.type === 'cafe');
  const books2  = places2.filter(p => p.type === 'bookstore');
  const cafes2  = places2.filter(p => p.type === 'cafe');

  const slotsPerDay = packed ? 5 : 3;

  // Helper: pick next unused place
  const pick = (arr, used) => arr.find(p => !used.has(p.id)) || null;
  const used1 = new Set(), used2 = new Set();

  const festStop = (fest, dayTag, time, note, durationMins) => ({
    id: `fest-${fest.id}-${dayTag}`,
    name: fest.name,
    type: 'festival',
    coords: [fest.lat, fest.lng],
    address: `${fest.city}, ${fest.state}`,
    suggestedTime: time,
    note,
    durationMins,
    website: fest.website,
    isFestival: true,
  });

  const travelStop = (name, coords, time, note) => ({
    id: `travel-${Date.now()}-${Math.random()}`,
    name, type: 'travel', coords, address: '', suggestedTime: time, note, durationMins: 0,
  });

  const asStop = (p, time, note, durationMins) =>
    p ? { ...p, suggestedTime: time, note, durationMins } : null;

  const days = [];

  // ── WEEKEND (2 days) ────────────────────────────────────────────────────────
  if (tripDays === 2) {
    const c1a = pick(cafes1, used1); if (c1a) used1.add(c1a.id);
    const b1a = pick(books1, used1); if (b1a) used1.add(b1a.id);
    days.push({
      dayNum: 1,
      label: `Arrive in ${f1.city} — Festival Day 1`,
      stops: [
        travelStop(`Depart from ${startText}`, startCoords, '9:00 AM', 'Hit the road!'),
        asStop(c1a, '12:00 PM', 'Pit stop: fuel up for the festival', 30),
        festStop(f1, 'd1', '2:00 PM', f1.description.slice(0, 120) + (f1.description.length > 120 ? '…' : ''), packed ? 300 : 240),
        asStop(b1a, '7:00 PM', 'Browse the local literary scene after the festival', 60),
      ].filter(Boolean),
    });

    const c1b = pick(cafes1, used1); if (c1b) used1.add(c1b.id);
    const b1b = pick(books1, used1); if (b1b) used1.add(b1b.id);
    days.push({
      dayNum: 2,
      label: `Festival Day 2 → Drive Home`,
      stops: [
        asStop(c1b, '9:00 AM', 'Morning coffee before the final festival session', 30),
        festStop(f1, 'd2', '10:30 AM', `Final day at ${f1.name} — soak in every reading!`, packed ? 300 : 240),
        asStop(b1b, '4:00 PM', 'One last bookstore before the road home', 60),
        travelStop(`Return to ${startText}`, startCoords, '6:00 PM', 'Head home with new books and memories'),
      ].filter(Boolean),
    });

  // ── 3-4 DAYS ────────────────────────────────────────────────────────────────
  } else if (tripDays === 3) {
    const c1a = pick(cafes1, used1); if (c1a) used1.add(c1a.id);
    const b1a = pick(books1, used1); if (b1a) used1.add(b1a.id);
    const b1b = pick(books1, used1); if (b1b) used1.add(b1b.id);
    days.push({
      dayNum: 1,
      label: `Drive to ${f1.city}`,
      stops: [
        travelStop(`Depart from ${startText}`, startCoords, '9:00 AM', 'Start your literary road trip!'),
        asStop(c1a, '12:00 PM', 'Midway coffee stop in the festival city', 30),
        travelStop(`Arrive in ${f1.city}`, [f1.lat, f1.lng], '3:00 PM', `Check in and explore downtown ${f1.city}`),
        asStop(b1a, '5:00 PM', 'Get oriented at a local bookstore', 60),
      ].filter(Boolean),
    });

    const c1b = pick(cafes1, used1); if (c1b) used1.add(c1b.id);
    days.push({
      dayNum: 2,
      label: `Full Day at ${f1.name}`,
      stops: [
        asStop(c1b, '8:30 AM', 'Start the festival day properly caffeinated', 45),
        festStop(f1, 'd1', '10:00 AM', f1.description.slice(0, 120) + '…', packed ? 420 : 360),
        asStop(b1b, '5:30 PM', 'Evening bookstore after a full festival day', 60),
      ].filter(Boolean),
    });

    const c1c = pick(cafes1, used1) || (cafes1[0] && !used1.has(cafes1[0].id) ? cafes1[0] : cafes1[0]);
    const b1c = pick(books1, used1) || books1[0];
    days.push({
      dayNum: 3,
      label: `Last Session → Head Home`,
      stops: [
        asStop(c1c, '8:30 AM', 'Final morning coffee in the festival city', 30),
        festStop(f1, 'd2', '10:00 AM', 'Morning sessions before hitting the road', 180),
        asStop(b1c, '1:30 PM', 'Pick up a signed copy from local booksellers', 45),
        travelStop(`Return to ${startText}`, startCoords, '3:00 PM', 'Drive home with full bags and full heart'),
      ].filter(Boolean),
    });

  // ── WEEK (7 days) ────────────────────────────────────────────────────────────
  } else {
    // Day 1: Travel with en-route stops
    const c1a = pick(cafes1, used1); if (c1a) used1.add(c1a.id);
    const b1a = pick(books1, used1); if (b1a) used1.add(b1a.id);
    days.push({
      dayNum: 1, label: `Road to ${f1.city}`,
      stops: [
        travelStop(`Depart from ${startText}`, startCoords, '9:00 AM', 'Your literary journey begins!'),
        asStop(c1a, '12:00 PM', 'Midway pit stop', 30),
        asStop(b1a, '3:00 PM', 'Warm-up bookstore before the festival starts', 60),
        travelStop(`Settle into ${f1.city}`, [f1.lat, f1.lng], '6:00 PM', 'Dinner in the festival neighborhood'),
      ].filter(Boolean),
    });

    // Day 2-3: Festival Days
    const c1b = pick(cafes1, used1); if (c1b) used1.add(c1b.id);
    const b1b = pick(books1, used1); if (b1b) used1.add(b1b.id);
    const b1c = pick(books1, used1); if (b1c) used1.add(b1c.id);
    days.push({
      dayNum: 2, label: `Festival Day 1 at ${f1.name}`,
      stops: [
        asStop(c1b, '8:30 AM', 'Morning coffee to start festival day 1', 45),
        festStop(f1, 'd1', '10:00 AM', f1.description.slice(0, 120) + '…', packed ? 420 : 360),
        asStop(b1b, '6:00 PM', 'Post-festival bookstore crawl', 90),
      ].filter(Boolean),
    });

    const c1c = pick(cafes1, used1); if (c1c) used1.add(c1c.id);
    days.push({
      dayNum: 3, label: `Festival Day 2`,
      stops: [
        asStop(c1c, '8:30 AM', 'Day 2 fuel-up', 30),
        festStop(f1, 'd2', '10:00 AM', `Dive deeper into ${f1.name} programming`, packed ? 420 : 360),
        asStop(b1c, '6:00 PM', 'Explore the bookstores of ${f1.city} after dark', 60),
      ].filter(Boolean),
    });

    // Day 4: Explore the region (or travel to 2nd festival)
    if (f2) {
      const c2a = pick(cafes2, used2); if (c2a) used2.add(c2a.id);
      const b2a = pick(books2, used2); if (b2a) used2.add(b2a.id);
      days.push({
        dayNum: 4, label: `Travel to ${f2.city}`,
        stops: [
          travelStop(`Leave ${f1.city}`, [f1.lat, f1.lng], '9:00 AM', `Road trip to ${f2.city} for festival #2!`),
          asStop(c2a, '12:00 PM', 'En-route coffee stop', 30),
          asStop(b2a, '4:00 PM', `Discover the bookstores of ${f2.city}`, 60),
          travelStop(`Arrive in ${f2.city}`, [f2.lat, f2.lng], '6:00 PM', 'Check in and rest for festival #2'),
        ].filter(Boolean),
      });

      const c2b = pick(cafes2, used2); if (c2b) used2.add(c2b.id);
      const b2b = pick(books2, used2); if (b2b) used2.add(b2b.id);
      days.push({
        dayNum: 5, label: `${f2.name}`,
        stops: [
          asStop(c2b, '8:30 AM', 'Coffee before festival #2 kicks off', 30),
          festStop(f2, 'd1', '10:00 AM', f2.description.slice(0, 120) + '…', packed ? 420 : 360),
          asStop(b2b, '6:00 PM', 'Literary bookstore in the second festival city', 60),
        ].filter(Boolean),
      });
    } else {
      // Day 4-5: Explore local literary scene
      const b1d = pick(books1, used1) || books1[0];
      const c1d = pick(cafes1, used1) || cafes1[0];
      const c1e = pick(cafes1, used1) || cafes1[0];
      days.push({
        dayNum: 4, label: `Explore ${f1.city}'s Literary Scene`,
        stops: [
          asStop(c1d, '9:00 AM', 'Coffee at a different neighborhood café', 60),
          asStop(b1d, '11:00 AM', 'Deep dive into a local bookstore', 90),
          travelStop(`Literary walk of ${f1.city}`, [f1.lat, f1.lng], '2:00 PM', 'Explore neighborhoods mentioned in local literature'),
        ].filter(Boolean),
      });
      days.push({
        dayNum: 5, label: `One More Festival Day`,
        stops: [
          asStop(c1e, '8:30 AM', 'Morning coffee for the bonus festival day', 30),
          festStop(f1, 'd3', '10:00 AM', 'Extra sessions and final signings', packed ? 300 : 240),
          travelStop(`Evening in ${f1.city}`, [f1.lat, f1.lng], '5:00 PM', 'Final dinner in the festival city'),
        ].filter(Boolean),
      });
    }

    // Day 6: Begin return
    days.push({
      dayNum: 6, label: `Slow Drive Home`,
      stops: [
        travelStop(`Depart ${f2 ? f2.city : f1.city}`, f2 ? [f2.lat, f2.lng] : [f1.lat, f1.lng], '10:00 AM', 'Take the scenic route home'),
        travelStop('Halfway rest stop', startCoords, '3:00 PM', 'Find a coffee shop or bookstore along the way'),
      ],
    });

    // Day 7: Final return
    days.push({
      dayNum: 7, label: `Home Stretch`,
      stops: [
        travelStop('Final miles', startCoords, '10:00 AM', 'The last leg of a great literary journey'),
        travelStop(`Arrive home in ${startText}`, startCoords, '2:00 PM', 'Home — with a bag full of books and a full heart'),
      ],
    });
  }

  // Collect all unique coords for map
  const allCoords = days.flatMap(d => d.stops.filter(s => s.coords).map(s => s.coords));

  return { days, festivals, startText, startCoords, allCoords };
}

// ── Main Component ─────────────────────────────────────────────────────────────
const FestivalTripPlanner = ({ onBack, onLoadTrip, onShowLogin }) => {
  const { user } = useAuth();

  const [step, setStep] = useState('filter'); // filter → select → preferences → generating → itinerary

  // Filter state
  const [filterMonth, setFilterMonth] = useState('Any');
  const [filterState, setFilterState] = useState('Any');
  const [filterTypes, setFilterTypes] = useState(new Set(['general','poetry','genre','writers-conference','children']));
  const [filteredFests, setFilteredFests] = useState([]);

  // Selection state
  const [selectedFests, setSelectedFests] = useState([]);

  // Preferences state
  const [startText, setStartText]     = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [locationMode, setLocationMode] = useState('address');
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [gpsError, setGpsError]       = useState('');
  const [tripLength, setTripLength]   = useState('weekend'); // weekend | 3-4days | week
  const [includeTypes, setIncludeTypes] = useState({
    bookstores: true, cafes: true, landmarks: true,
    restaurants: false, museums: false, parks: false,
  });
  const [travelStyle, setTravelStyle] = useState('relaxed');

  // Itinerary state
  const [itinerary, setItinerary] = useState(null);
  const [genError, setGenError]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const mapRef = useRef(null);

  // ── Filter logic ─────────────────────────────────────────────────────────────
  const handleFindFestivals = () => {
    const results = festivalsData.filter(f => {
      if (!filterTypes.has(f.primaryType)) return false;
      if (filterState !== 'Any' && f.state !== filterState) return false;
      if (filterMonth !== 'Any') {
        const m = f.typicalMonth || '';
        if (!m.includes(filterMonth) && m !== 'Various') return false;
      }
      return true;
    });
    setFilteredFests(results);
    setSelectedFests([]);
    setStep('select');
  };

  const toggleType = (type) => {
    setFilterTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
  };

  // ── Festival selection ────────────────────────────────────────────────────────
  const toggleFestival = (fest) => {
    setSelectedFests(prev => {
      const exists = prev.find(f => f.id === fest.id);
      if (exists) return prev.filter(f => f.id !== fest.id);
      if (prev.length >= 2) return prev; // max 2
      return [...prev, fest];
    });
  };

  const sameMonthWarning = selectedFests.length === 2 &&
    selectedFests[0].typicalMonth === selectedFests[1].typicalMonth &&
    selectedFests[0].typicalMonth !== 'Various';

  const festDistance = selectedFests.length === 2
    ? haversine(selectedFests[0].lat, selectedFests[0].lng, selectedFests[1].lat, selectedFests[1].lng)
    : null;

  // ── Location ─────────────────────────────────────────────────────────────────
  const handleSelectAddress = async (suggestion) => {
    const label = typeof suggestion === 'string' ? suggestion : (suggestion.label || suggestion.display || '');
    setStartText(label);
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
    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device.');
      setGpsLoading(false);
      setLocationMode('address');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setStartCoords([latitude, longitude]);
        const addr = await reverseGeocode(latitude, longitude);
        setStartText(addr || '');
        setGpsLoading(false);
      },
      () => {
        setGpsError('Could not get location. Enter an address instead.');
        setGpsLoading(false);
        setLocationMode('address');
      },
      { timeout: 10000 }
    );
  };

  // ── Generate ─────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    let coords = startCoords;
    if (!coords) {
      const g = await geocodePlace(startText);
      if (!g) { setGenError('Please enter a valid starting location.'); return; }
      coords = [g.lat, g.lng];
      setStartCoords(coords);
    }
    setGenError('');
    setStep('generating');
    try {
      const dayCount = { weekend: 2, '3-4days': 3, week: 7 }[tripLength];
      const result = await buildFestivalItinerary(
        coords, startText, selectedFests, dayCount,
        travelStyle === 'packed', includeTypes
      );
      setItinerary(result);
      setSaved(false);
      setStep('itinerary');
    } catch (e) {
      console.error('[FestivalTripPlanner]', e);
      setGenError('Something went wrong generating your itinerary. Please try again.');
      setStep('preferences');
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) { onShowLogin(); return; }
    if (!itinerary) return;
    setSaving(true);
    try {
      const allStops = itinerary.days.flatMap(d => d.stops.filter(s => s.coords));
      const festNames = itinerary.festivals.map(f => f.name).join(' + ');
      await saveRoute(user.uid, {
        routeName: `Festival Trip: ${festNames}`,
        notes: `${itinerary.days.length}-day journey · ${itinerary.festivals.map(f => `${f.city}, ${f.state}`).join(' → ')}`,
        startCity: itinerary.startText,
        endCity: itinerary.startText,
        selectedStates: [],
        routeCoordinates: allStops.map(s => s.coords),
        stops: allStops,
      });
      setSaved(true);
    } catch (e) {
      console.error('[FestivalTripPlanner] save error:', e);
    } finally {
      setSaving(false);
    }
  };

  // ── Load on map ───────────────────────────────────────────────────────────────
  const handleLoadOnMap = () => {
    if (!itinerary) return;
    const stops = itinerary.days.flatMap(d => d.stops.filter(s => s.coords && s.type !== 'travel'));
    const coords = itinerary.days.flatMap(d => d.stops.filter(s => s.coords).map(s => s.coords));
    onLoadTrip({
      startCity: itinerary.startText,
      endCity: itinerary.festivals[itinerary.festivals.length - 1].city,
      route: coords,
      visibleLocations: stops,
      showPlanner: false,
    });
  };

  // ── Render helpers ────────────────────────────────────────────────────────────
  const STEP_LABELS = { filter:'FILTER', select:'SELECT', preferences:'PREFERENCES', generating:'GENERATING', itinerary:'ITINERARY' };
  const STEP_ORDER  = ['filter','select','preferences','generating','itinerary'];
  const stepIdx     = STEP_ORDER.indexOf(step);

  const TYPE_STOP_ICON = { festival:'🎪', bookstore:'📚', cafe:'☕', travel:'🚗', arrive:'🏨', landmark:'🌲', restaurant:'🍽️' };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-midnight-navy flex flex-col" style={{ height:'100dvh', minHeight:'100vh' }}>
      <style>{`
        @keyframes lr-fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .lr-fade { animation: lr-fade-in 0.3s ease; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-midnight-navy/95 border-b-2 border-starlight-turquoise px-4 py-3 flex items-center gap-3">
        <button onClick={step === 'filter' ? onBack : () => setStep(STEP_ORDER[Math.max(0, stepIdx - 1)])}
          className="text-starlight-turquoise hover:text-atomic-orange transition-colors flex-shrink-0"
          style={{ minWidth:40, minHeight:40, display:'flex', alignItems:'center', justifyContent:'center' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Starburst color="#B044FB" size={14} />
            <h1 className="text-starlight-turquoise font-bungee text-lg leading-tight drop-shadow-[0_0_8px_rgba(64,224,208,0.7)]">
              FESTIVAL TRIPS
            </h1>
            <Starburst color="#FF4E00" size={10} style={{ opacity: 0.6 }} />
          </div>
          <p className="text-chrome-silver font-special-elite text-xs mt-0.5">
            {step === 'filter' && 'Find festivals that match your travel window'}
            {step === 'select' && `${filteredFests.length} festivals found · select up to 2`}
            {step === 'preferences' && selectedFests.map(f => f.name).join(' + ')}
            {step === 'generating' && 'Building your literary itinerary…'}
            {step === 'itinerary' && `${itinerary?.days.length}-day journey · ${selectedFests.map(f=>f.city).join(' + ')}`}
          </p>
        </div>
        {/* Step dots */}
        <div className="flex gap-1 flex-shrink-0">
          {['filter','select','preferences','itinerary'].map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${
              step === s || (step === 'generating' && s === 'itinerary') ? 'bg-starlight-turquoise' :
              i < ['filter','select','preferences','itinerary'].indexOf(step) ? 'bg-starlight-turquoise/40' :
              'bg-chrome-silver/20'
            }`} />
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto" style={{ background: 'radial-gradient(ellipse at 20% 10%, rgba(176,68,251,0.04) 0%, transparent 45%), radial-gradient(ellipse at 80% 85%, rgba(64,224,208,0.04) 0%, transparent 45%)' }}>

        {/* ══ STEP 1: FILTER ══════════════════════════════════════════════════ */}
        {step === 'filter' && (
          <div className="max-w-lg mx-auto px-4 py-6 space-y-6 lr-fade pb-32">

            {/* Festival type */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest flex items-center gap-1.5 mb-3">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                FESTIVAL TYPE
              </label>
              <div className="space-y-2">
                {Object.entries(TYPE_LABELS).map(([key, { label, color }]) => (
                  <label key={key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      filterTypes.has(key)
                        ? 'border-starlight-turquoise/60 bg-starlight-turquoise/5'
                        : 'border-starlight-turquoise/10 opacity-60'
                    }`}
                  >
                    <input type="checkbox" checked={filterTypes.has(key)} onChange={() => toggleType(key)}
                      className="accent-starlight-turquoise flex-shrink-0" />
                    <span className="text-paper-white font-special-elite text-sm">{label}</span>
                    <div className="ml-auto w-3 h-3 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                  </label>
                ))}
              </div>
            </div>

            {/* Neon divider */}
            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(176,68,251,0.3), rgba(64,224,208,0.2), transparent)', boxShadow: '0 0 4px rgba(176,68,251,0.15)' }} />

            {/* Month */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest flex items-center gap-1.5 mb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                TRAVEL MONTH
              </label>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="w-full bg-black/50 border-2 border-starlight-turquoise/60 text-paper-white font-special-elite px-3 py-2.5 rounded-lg focus:outline-none focus:border-starlight-turquoise"
              >
                <option value="Any">Any month</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Neon divider */}
            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(64,224,208,0.3), rgba(176,68,251,0.2), transparent)', boxShadow: '0 0 4px rgba(64,224,208,0.15)' }} />

            {/* State/Territory */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest flex items-center gap-1.5 mb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                STATE/TERRITORY
              </label>
              <select value={filterState} onChange={e => setFilterState(e.target.value)}
                className="w-full bg-black/50 border-2 border-starlight-turquoise/60 text-paper-white font-special-elite px-3 py-2.5 rounded-lg focus:outline-none focus:border-starlight-turquoise"
              >
                <option value="Any">Any state or territory</option>
                {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

          </div>
        )}

        {/* ══ STEP 2: SELECT ══════════════════════════════════════════════════ */}
        {step === 'select' && (
          <div className="lr-fade pb-32">

            {/* Selection status */}
            {selectedFests.length > 0 && (
              <div className="sticky top-0 z-10 bg-midnight-navy/95 border-b border-starlight-turquoise/20 px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 flex gap-2 flex-wrap">
                  {selectedFests.map(f => (
                    <span key={f.id} className="bg-starlight-turquoise/10 border border-starlight-turquoise/40 text-starlight-turquoise font-bungee text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                      🎪 {f.name.length > 22 ? f.name.slice(0, 22) + '…' : f.name}
                      <button onClick={() => toggleFestival(f)} className="hover:text-atomic-orange">✕</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Conflict / distance warnings */}
            {sameMonthWarning && (
              <div className="mx-4 mt-3 bg-atomic-orange/10 border border-atomic-orange/40 rounded-xl px-3 py-2 flex items-start gap-2">
                <span className="text-atomic-orange text-base flex-shrink-0 mt-0.5">⚠️</span>
                <p className="text-paper-white font-special-elite text-xs leading-snug">
                  Both festivals are in <strong>{selectedFests[0].typicalMonth}</strong> — dates may overlap. Check event schedules to confirm.
                </p>
              </div>
            )}
            {festDistance !== null && !sameMonthWarning && (
              <div className={`mx-4 mt-3 rounded-xl px-3 py-2 flex items-center gap-2 border ${
                festDistance > 500
                  ? 'bg-atomic-orange/10 border-atomic-orange/40'
                  : 'bg-starlight-turquoise/10 border-starlight-turquoise/30'
              }`}>
                <span className="text-base flex-shrink-0">{festDistance > 500 ? '⚠️' : '✈️'}</span>
                <p className={`font-special-elite text-xs ${festDistance > 500 ? 'text-paper-white' : 'text-starlight-turquoise'}`}>
                  {festDistance > 500
                    ? `These festivals are ${festDistance} miles apart — consider picking just one unless you're up for a big adventure!`
                    : `${festDistance} miles apart — totally doable as a multi-stop road trip!`
                  }
                </p>
              </div>
            )}

            {filteredFests.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <div className="text-5xl mb-4">🎪</div>
                <p className="text-chrome-silver font-bungee text-sm">No festivals match your filters.</p>
                <button onClick={() => setStep('filter')} className="mt-4 text-starlight-turquoise font-special-elite text-sm underline">
                  Adjust filters
                </button>
              </div>
            ) : (
              <div className="px-4 pt-3 space-y-3">
                {filteredFests.map(fest => {
                  const isSelected = selectedFests.some(f => f.id === fest.id);
                  const canSelect  = isSelected || selectedFests.length < 2;
                  const typeMeta   = TYPE_LABELS[fest.primaryType] || TYPE_LABELS.general;
                  const sizeMeta   = SIZE_BADGES[fest.size] || SIZE_BADGES.regional;
                  return (
                    <button key={fest.id} onClick={() => canSelect && toggleFestival(fest)}
                      disabled={!canSelect && !isSelected}
                      className={`w-full text-left rounded-xl p-4 border-2 transition-all ${
                        isSelected
                          ? 'border-starlight-turquoise bg-starlight-turquoise/10 shadow-[0_0_16px_rgba(64,224,208,0.2)]'
                          : canSelect
                            ? 'border-starlight-turquoise/20 hover:border-starlight-turquoise/50 bg-black/20'
                            : 'border-starlight-turquoise/10 bg-black/10 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-starlight-turquoise border-starlight-turquoise' : 'border-chrome-silver/40'
                        }`}>
                          {isSelected && <span className="text-midnight-navy text-[10px] font-bold">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-paper-white font-bungee text-sm leading-tight">{fest.name}</span>
                            <span className={`font-bungee text-[9px] px-1.5 py-0.5 rounded border ${sizeMeta.bg} ${sizeMeta.text}`}>
                              {sizeMeta.label}
                            </span>
                          </div>
                          <p className="text-chrome-silver font-special-elite text-xs mb-1.5">
                            📍 {fest.city}, {fest.state} &nbsp;·&nbsp; 📅 {fest.typicalMonth}
                          </p>
                          <p className="text-chrome-silver/60 font-special-elite text-xs leading-snug line-clamp-2">
                            {fest.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="font-special-elite text-[10px] px-2 py-0.5 rounded-full border"
                              style={{ color: typeMeta.color, borderColor: typeMeta.color + '60', background: typeMeta.color + '15' }}>
                              {typeMeta.label}
                            </span>
                            {fest.tags?.slice(0, 3).map(tag => (
                              <span key={tag} className="text-chrome-silver/50 font-special-elite text-[10px] px-2 py-0.5 rounded-full border border-chrome-silver/20">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 3: PREFERENCES ═════════════════════════════════════════════ */}
        {step === 'preferences' && (
          <div className="max-w-lg mx-auto px-4 py-6 space-y-6 lr-fade pb-32">

            {/* Selected festivals summary */}
            <div className="bg-starlight-turquoise/5 border border-starlight-turquoise/30 rounded-xl p-3 space-y-1">
              {selectedFests.map(f => (
                <div key={f.id} className="flex items-center gap-2">
                  <span className="text-base">🎪</span>
                  <span className="text-paper-white font-bungee text-xs">{f.name}</span>
                  <span className="text-chrome-silver/60 font-special-elite text-xs ml-auto">{f.city}, {f.state}</span>
                </div>
              ))}
            </div>

            {/* Neon divider */}
            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(64,224,208,0.35), rgba(255,78,0,0.15), transparent)', boxShadow: '0 0 4px rgba(64,224,208,0.15)' }} />

            {/* Starting from */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest flex items-center gap-1.5 mb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                STARTING FROM
              </label>
              <div className="space-y-2 mb-3">
                <button type="button" onClick={handleUseGPS} disabled={gpsLoading}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    locationMode === 'gps' ? 'border-starlight-turquoise bg-starlight-turquoise/10' : 'border-starlight-turquoise/20 hover:border-starlight-turquoise/40'
                  }`}
                >
                  <span className="text-lg flex-shrink-0">
                    {gpsLoading ? <span className="inline-block w-5 h-5 border-2 border-starlight-turquoise border-t-transparent rounded-full animate-spin" /> : '📍'}
                  </span>
                  <span className="text-paper-white font-special-elite text-sm flex-1">
                    {gpsLoading ? 'Getting location…' : locationMode === 'gps' && startCoords ? (startText || 'Current location') : 'Use my current location'}
                  </span>
                  {locationMode === 'gps' && startCoords && <span className="text-starlight-turquoise font-bungee text-xs">✓</span>}
                </button>
                {gpsError && <p className="text-atomic-orange font-special-elite text-xs px-1">{gpsError}</p>}
                <button type="button" onClick={() => { setLocationMode('address'); setStartCoords(null); setStartText(''); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    locationMode === 'address' ? 'border-starlight-turquoise bg-starlight-turquoise/10' : 'border-starlight-turquoise/20 hover:border-starlight-turquoise/40'
                  }`}
                >
                  <span className="text-lg flex-shrink-0">🔍</span>
                  <span className="text-paper-white font-special-elite text-sm">Enter an address or city</span>
                </button>
              </div>
              {locationMode === 'address' && (
                <AddressInput value={startText} onChange={v => { setStartText(v); setStartCoords(null); }}
                  onSelect={handleSelectAddress} placeholder="Chicago, IL or 123 Main St…" />
              )}
              {startCoords && <p className="text-starlight-turquoise/60 font-special-elite text-xs mt-1">✓ Location confirmed</p>}
            </div>

            {/* Neon divider */}
            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(64,224,208,0.35), rgba(176,68,251,0.15), transparent)', boxShadow: '0 0 4px rgba(64,224,208,0.15)' }} />

            {/* Trip length */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest flex items-center gap-1.5 mb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                TRIP LENGTH
              </label>
              <div className="space-y-2">
                {[
                  { key: 'weekend', label: 'Weekend Getaway', sub: '2 days · perfect for nearby festivals' },
                  { key: '3-4days', label: '3–4 Day Journey', sub: '3 days · travel + 2 full festival days' },
                  { key: 'week',    label: 'Week-Long Adventure', sub: '7 days · travel, festival, explore & return' },
                ].map(opt => (
                  <label key={opt.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      tripLength === opt.key ? 'border-starlight-turquoise bg-starlight-turquoise/10' : 'border-starlight-turquoise/20 hover:border-starlight-turquoise/50'
                    }`}
                  >
                    <input type="radio" name="tripLength" value={opt.key}
                      checked={tripLength === opt.key} onChange={() => setTripLength(opt.key)}
                      className="accent-starlight-turquoise" />
                    <div className="flex-1">
                      <span className="text-paper-white font-bungee text-sm">{opt.label}</span>
                      <span className="text-chrome-silver/60 font-special-elite text-xs block">{opt.sub}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Include stops */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest block mb-2">
                INCLUDE STOPS
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'bookstores', label: '📚 Bookstores' },
                  { key: 'cafes',      label: '☕ Coffee Shops' },
                  { key: 'landmarks',  label: '🌲 Landmarks' },
                  { key: 'restaurants',label: '🍽️ Restaurants' },
                  { key: 'museums',    label: '🏛️ Museums' },
                  { key: 'parks',      label: '🌿 Parks' },
                ].map(({ key, label }) => (
                  <label key={key}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      includeTypes[key] ? 'border-starlight-turquoise/60 bg-starlight-turquoise/5' : 'border-starlight-turquoise/15'
                    }`}
                  >
                    <input type="checkbox" checked={includeTypes[key]}
                      onChange={() => setIncludeTypes(prev => ({ ...prev, [key]: !prev[key] }))}
                      className="accent-starlight-turquoise flex-shrink-0" />
                    <span className="text-paper-white font-special-elite text-xs">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Travel style */}
            <div>
              <label className="text-chrome-silver font-bungee text-xs tracking-widest block mb-2">
                TRAVEL STYLE
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'relaxed', label: '😌 Relaxed', sub: 'Fewer stops, more breathing room' },
                  { key: 'packed',  label: '⚡ Packed',  sub: 'More stops, maximize every hour' },
                ].map(opt => (
                  <label key={opt.key}
                    className={`flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-all ${
                      travelStyle === opt.key ? 'border-starlight-turquoise bg-starlight-turquoise/10' : 'border-starlight-turquoise/20 hover:border-starlight-turquoise/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input type="radio" name="travelStyle" value={opt.key}
                        checked={travelStyle === opt.key} onChange={() => setTravelStyle(opt.key)}
                        className="accent-starlight-turquoise" />
                      <span className="text-paper-white font-bungee text-sm">{opt.label}</span>
                    </div>
                    <span className="text-chrome-silver/60 font-special-elite text-xs pl-5">{opt.sub}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ══ STEP 4: GENERATING ══════════════════════════════════════════════ */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center h-full py-24 lr-fade">
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-starlight-turquoise/30 border-t-starlight-turquoise rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🎪</div>
            </div>
            <p className="text-starlight-turquoise font-bungee text-lg drop-shadow-[0_0_8px_rgba(64,224,208,0.7)]">
              BUILDING YOUR JOURNEY…
            </p>
            <p className="text-chrome-silver font-special-elite text-sm mt-2 text-center px-8">
              Finding bookstores, cafes, and literary spots near the festival
            </p>
          </div>
        )}

        {/* ══ STEP 5: ITINERARY ═══════════════════════════════════════════════ */}
        {step === 'itinerary' && itinerary && (
          <div className="lr-fade pb-4">

            {/* Mini map */}
            {itinerary.allCoords.length > 0 && (
              <div className="h-52 md:h-64 w-full">
                <MapContainer
                  center={itinerary.allCoords[0] || [39.5, -98.35]}
                  zoom={5}
                  className="h-full w-full"
                  style={{ background: '#1A1B2E' }}
                  whenCreated={m => { mapRef.current = m; }}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap contributors' />
                  <Polyline positions={itinerary.allCoords}
                    pathOptions={{ color: '#B044FB', weight: 3, opacity: 0.7, dashArray: '6, 6' }} />
                  {itinerary.startCoords && (
                    <Marker position={itinerary.startCoords} icon={makeStartMarker()} />
                  )}
                  {itinerary.festivals.map(f => (
                    <Marker key={f.id} position={[f.lat, f.lng]} icon={makeFestivalMarker()} />
                  ))}
                </MapContainer>
              </div>
            )}

            {/* Festival anchor cards */}
            <div className="px-4 pt-4 flex gap-3 overflow-x-auto pb-1">
              {itinerary.festivals.map(f => (
                <div key={f.id} className="flex-shrink-0 bg-[#B044FB]/10 border border-[#B044FB]/40 rounded-xl px-4 py-2.5 min-w-[180px]">
                  <p className="text-[#B044FB] font-bungee text-xs">🎪 FESTIVAL</p>
                  <p className="text-paper-white font-bungee text-sm leading-tight mt-0.5">{f.name}</p>
                  <p className="text-chrome-silver/60 font-special-elite text-xs mt-0.5">{f.city}, {f.state} · {f.typicalMonth}</p>
                </div>
              ))}
            </div>

            {/* Day-by-day itinerary */}
            <div className="px-4 pt-4 space-y-4">
              {itinerary.days.map(day => (
                <div key={day.dayNum} className="bg-black/30 border border-starlight-turquoise/15 rounded-xl overflow-hidden">
                  {/* Day header */}
                  <div className="bg-starlight-turquoise/10 border-b border-starlight-turquoise/20 px-4 py-2.5 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-starlight-turquoise/20 border border-starlight-turquoise/60 flex items-center justify-center font-bungee text-starlight-turquoise text-xs flex-shrink-0">
                      {day.dayNum}
                    </div>
                    <p className="text-paper-white font-bungee text-sm">{day.label}</p>
                  </div>
                  {/* Stops */}
                  <div className="divide-y divide-starlight-turquoise/10">
                    {day.stops.map((stop, idx) => {
                      const icon = TYPE_STOP_ICON[stop.type] || '📍';
                      const isFestival = stop.isFestival;
                      return (
                        <div key={stop.id || idx} className={`px-4 py-3 flex gap-3 ${isFestival ? 'bg-[#B044FB]/5' : ''}`}>
                          {/* Time + icon */}
                          <div className="flex flex-col items-center gap-1 flex-shrink-0 w-14">
                            <span className="text-chrome-silver/50 font-special-elite text-[10px] text-center leading-tight">
                              {stop.suggestedTime}
                            </span>
                            <span className="text-base">{icon}</span>
                          </div>
                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-bungee text-sm leading-tight ${isFestival ? 'text-[#B044FB]' : 'text-paper-white'}`}>
                              {stop.name}
                            </p>
                            {stop.address && (
                              <p className="text-chrome-silver/50 font-special-elite text-xs mt-0.5 truncate">{stop.address}</p>
                            )}
                            {stop.note && (
                              <p className="text-chrome-silver/70 font-special-elite text-xs mt-1 leading-snug italic">
                                {stop.note}
                              </p>
                            )}
                            {stop.durationMins > 0 && (
                              <span className="text-starlight-turquoise/60 font-special-elite text-[10px] mt-1 inline-block">
                                ~{stop.durationMins >= 60 ? `${Math.floor(stop.durationMins/60)}h${stop.durationMins%60 ? ` ${stop.durationMins%60}m` : ''}` : `${stop.durationMins} min`}
                              </span>
                            )}
                            {isFestival && stop.website && (
                              <a href={stop.website} target="_blank" rel="noopener noreferrer"
                                className="text-[#B044FB]/70 font-special-elite text-[10px] hover:text-[#B044FB] mt-1 inline-block underline"
                                onClick={e => e.stopPropagation()}
                              >
                                Festival website →
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="px-4 pt-4 pb-8 space-y-3">
              <button onClick={handleLoadOnMap}
                className="w-full bg-atomic-orange text-midnight-navy font-bungee py-3.5 rounded-xl hover:bg-starlight-turquoise transition-all shadow-lg flex items-center justify-center gap-2"
                style={{ boxShadow: '0 0 20px rgba(255,78,0,0.4)' }}
              >
                🗺️ VIEW ON LITERARY MAP
              </button>

              {saved ? (
                <div className="w-full border border-starlight-turquoise text-starlight-turquoise font-bungee py-3.5 rounded-xl text-center text-sm">
                  ✓ SAVED TO YOUR ROUTES
                </div>
              ) : (
                <button onClick={handleSave} disabled={saving}
                  className="w-full border-2 border-starlight-turquoise text-starlight-turquoise font-bungee py-3.5 rounded-xl hover:bg-starlight-turquoise hover:text-midnight-navy transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-starlight-turquoise border-t-transparent rounded-full animate-spin" />SAVING…</>
                    : <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>SAVE THIS JOURNEY</>
                  }
                </button>
              )}

              <button onClick={() => { setStep('filter'); setSelectedFests([]); setItinerary(null); setSaved(false); }}
                className="w-full text-chrome-silver/50 hover:text-chrome-silver font-special-elite text-sm py-2"
              >
                ↺ Plan a different festival trip
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed bottom CTA ── */}
      {(step === 'filter' || step === 'select' || step === 'preferences') && (
        <div style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:100,
          background: '#1A1B2E',
          borderTop: '2px solid rgba(64,224,208,0.3)',
          padding: '12px 16px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
        }}>
          {genError && <p className="text-atomic-orange font-special-elite text-xs text-center mb-2">{genError}</p>}

          {step === 'filter' && (
            <button onClick={handleFindFestivals} disabled={filterTypes.size === 0}
              className="w-full bg-atomic-orange text-midnight-navy font-bungee rounded-xl hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-40 text-base flex items-center justify-center gap-2"
              style={{ minHeight:56, boxShadow: filterTypes.size > 0 ? '0 0 20px rgba(255,78,0,0.4)' : 'none', transition: 'box-shadow 0.15s, background 0.15s, transform 0.1s' }}
              onMouseEnter={e => { if (filterTypes.size > 0) { e.currentTarget.style.boxShadow = '0 0 36px rgba(255,78,0,0.75), 0 0 60px rgba(255,78,0,0.25)'; e.currentTarget.style.transform = 'scale(1.01)'; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = filterTypes.size > 0 ? '0 0 20px rgba(255,78,0,0.4)' : 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Starburst color="#1A1B2E" size={15} />
              FIND FESTIVALS →
            </button>
          )}

          {step === 'select' && (
            <button onClick={() => setStep('preferences')} disabled={selectedFests.length === 0}
              className="w-full bg-atomic-orange text-midnight-navy font-bungee rounded-xl hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-40 text-base flex items-center justify-center gap-2"
              style={{ minHeight:56, boxShadow: selectedFests.length > 0 ? '0 0 20px rgba(255,78,0,0.4)' : 'none', transition: 'box-shadow 0.15s, background 0.15s, transform 0.1s' }}
              onMouseEnter={e => { if (selectedFests.length > 0) { e.currentTarget.style.boxShadow = '0 0 36px rgba(255,78,0,0.75), 0 0 60px rgba(255,78,0,0.25)'; e.currentTarget.style.transform = 'scale(1.01)'; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = selectedFests.length > 0 ? '0 0 20px rgba(255,78,0,0.4)' : 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {selectedFests.length > 0 && <Starburst color="#1A1B2E" size={15} />}
              {selectedFests.length === 0 ? 'SELECT A FESTIVAL TO CONTINUE' : `PLAN MY TRIP (${selectedFests.length} festival${selectedFests.length > 1 ? 's' : ''}) →`}
            </button>
          )}

          {step === 'preferences' && (
            <button onClick={handleGenerate} disabled={!startText || gpsLoading}
              className="w-full bg-atomic-orange text-midnight-navy font-bungee rounded-xl hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-40 text-base flex items-center justify-center gap-2"
              style={{ minHeight:56, boxShadow: startText && !gpsLoading ? '0 0 20px rgba(255,78,0,0.4)' : 'none', transition: 'box-shadow 0.15s, background 0.15s, transform 0.1s' }}
              onMouseEnter={e => { if (startText && !gpsLoading) { e.currentTarget.style.boxShadow = '0 0 36px rgba(255,78,0,0.75), 0 0 60px rgba(255,78,0,0.25)'; e.currentTarget.style.transform = 'scale(1.01)'; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = startText && !gpsLoading ? '0 0 20px rgba(255,78,0,0.4)' : 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Starburst color="#1A1B2E" size={15} />
              BUILD MY ITINERARY →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FestivalTripPlanner;
