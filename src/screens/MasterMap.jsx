import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MAP_CONFIG } from '../config/config';
import { searchAlongRoute, geocodeCity, getPlaceCoords, searchNearbyPlaces, autocompleteCity, searchPlacesByText } from '../utils/googlePlaces';
import { searchLiteraryAlongRoute, searchLiteraryLandmarks } from '../utils/wikipedia';
import { getCuratedLandmarks } from '../utils/firebaseLandmarks';
import { getMapboxRoute } from '../utils/mapbox';
import { getTrip, addToTrip, removeFromTrip, clearTrip } from '../utils/tripStorage';
import RoadTrip from './RoadTrip';
import Guestbook from '../components/Guestbook';
import HitchhikerTale from '../components/HitchhikerTale';
import TaleModal from '../components/TaleModal';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, setDoc, onSnapshot, arrayUnion } from 'firebase/firestore';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Major city suggestions per state — drives smart placeholder text in the route planner
const STATE_MAJOR_CITIES = {
  'Alabama':              { abbr: 'AL', cities: ['Birmingham', 'Montgomery', 'Mobile'] },
  'Alaska':               { abbr: 'AK', cities: ['Anchorage', 'Fairbanks', 'Juneau'] },
  'Arizona':              { abbr: 'AZ', cities: ['Phoenix', 'Tucson', 'Flagstaff'] },
  'Arkansas':             { abbr: 'AR', cities: ['Little Rock', 'Fayetteville', 'Fort Smith'] },
  'California':           { abbr: 'CA', cities: ['Los Angeles', 'San Francisco', 'San Diego'] },
  'Colorado':             { abbr: 'CO', cities: ['Denver', 'Boulder', 'Colorado Springs'] },
  'Connecticut':          { abbr: 'CT', cities: ['Hartford', 'New Haven', 'Mystic'] },
  'Delaware':             { abbr: 'DE', cities: ['Wilmington', 'Dover', 'Newark'] },
  'Florida':              { abbr: 'FL', cities: ['Miami', 'Orlando', 'Tampa'] },
  'Georgia':              { abbr: 'GA', cities: ['Atlanta', 'Savannah', 'Athens'] },
  'Hawaii':               { abbr: 'HI', cities: ['Honolulu', 'Hilo', 'Kailua'] },
  'Idaho':                { abbr: 'ID', cities: ['Boise', 'Idaho Falls', 'Coeur d\'Alene'] },
  'Illinois':             { abbr: 'IL', cities: ['Chicago', 'Springfield', 'Galena'] },
  'Indiana':              { abbr: 'IN', cities: ['Indianapolis', 'Bloomington', 'Fort Wayne'] },
  'Iowa':                 { abbr: 'IA', cities: ['Des Moines', 'Iowa City', 'Cedar Rapids'] },
  'Kansas':               { abbr: 'KS', cities: ['Kansas City', 'Wichita', 'Lawrence'] },
  'Kentucky':             { abbr: 'KY', cities: ['Louisville', 'Lexington', 'Bowling Green'] },
  'Louisiana':            { abbr: 'LA', cities: ['New Orleans', 'Baton Rouge', 'Lafayette'] },
  'Maine':                { abbr: 'ME', cities: ['Portland', 'Bar Harbor', 'Augusta'] },
  'Maryland':             { abbr: 'MD', cities: ['Baltimore', 'Annapolis', 'Frederick'] },
  'Massachusetts':        { abbr: 'MA', cities: ['Boston', 'Cambridge', 'Concord'] },
  'Michigan':             { abbr: 'MI', cities: ['Detroit', 'Ann Arbor', 'Grand Rapids'] },
  'Minnesota':            { abbr: 'MN', cities: ['Minneapolis', 'St. Paul', 'Duluth'] },
  'Mississippi':          { abbr: 'MS', cities: ['Jackson', 'Oxford', 'Natchez'] },
  'Missouri':             { abbr: 'MO', cities: ['St. Louis', 'Kansas City', 'Hannibal'] },
  'Montana':              { abbr: 'MT', cities: ['Missoula', 'Bozeman', 'Billings'] },
  'Nebraska':             { abbr: 'NE', cities: ['Omaha', 'Lincoln', 'Grand Island'] },
  'Nevada':               { abbr: 'NV', cities: ['Las Vegas', 'Reno', 'Carson City'] },
  'New Hampshire':        { abbr: 'NH', cities: ['Portsmouth', 'Manchester', 'Concord'] },
  'New Jersey':           { abbr: 'NJ', cities: ['Newark', 'Princeton', 'Jersey City'] },
  'New Mexico':           { abbr: 'NM', cities: ['Santa Fe', 'Albuquerque', 'Taos'] },
  'New York':             { abbr: 'NY', cities: ['New York City', 'Buffalo', 'Albany'] },
  'North Carolina':       { abbr: 'NC', cities: ['Asheville', 'Charlotte', 'Raleigh'] },
  'North Dakota':         { abbr: 'ND', cities: ['Fargo', 'Bismarck', 'Grand Forks'] },
  'Ohio':                 { abbr: 'OH', cities: ['Columbus', 'Cleveland', 'Cincinnati'] },
  'Oklahoma':             { abbr: 'OK', cities: ['Oklahoma City', 'Tulsa', 'Norman'] },
  'Oregon':               { abbr: 'OR', cities: ['Portland', 'Eugene', 'Ashland'] },
  'Pennsylvania':         { abbr: 'PA', cities: ['Philadelphia', 'Pittsburgh', 'Gettysburg'] },
  'Rhode Island':         { abbr: 'RI', cities: ['Providence', 'Newport', 'Bristol'] },
  'South Carolina':       { abbr: 'SC', cities: ['Charleston', 'Columbia', 'Beaufort'] },
  'South Dakota':         { abbr: 'SD', cities: ['Rapid City', 'Sioux Falls', 'Deadwood'] },
  'Tennessee':            { abbr: 'TN', cities: ['Nashville', 'Memphis', 'Knoxville'] },
  'Texas':                { abbr: 'TX', cities: ['Austin', 'Houston', 'San Antonio'] },
  'Utah':                 { abbr: 'UT', cities: ['Salt Lake City', 'Moab', 'Provo'] },
  'Vermont':              { abbr: 'VT', cities: ['Burlington', 'Montpelier', 'Stowe'] },
  'Virginia':             { abbr: 'VA', cities: ['Richmond', 'Charlottesville', 'Alexandria'] },
  'Washington':           { abbr: 'WA', cities: ['Seattle', 'Spokane', 'Olympia'] },
  'West Virginia':        { abbr: 'WV', cities: ['Charleston', 'Morgantown', 'Harpers Ferry'] },
  'Wisconsin':            { abbr: 'WI', cities: ['Milwaukee', 'Madison', 'Green Bay'] },
  'Wyoming':              { abbr: 'WY', cities: ['Cheyenne', 'Jackson', 'Laramie'] },
  'District of Columbia': { abbr: 'DC', cities: ['Washington'] },
  'Puerto Rico':          { abbr: 'PR', cities: ['San Juan', 'Ponce', 'Mayagüez'] },
};

// City autocomplete input with Googie-style dropdown
const CityAutocomplete = ({ value, onChange, onPlaceSelect, placeholder, className, style, selectedStates = [] }) => {
  const hasPR = selectedStates.includes('Puerto Rico');
  const hasOtherStates = selectedStates.some((s) => s !== 'Puerto Rico');
  const regionCodes = hasPR && !hasOtherStates ? ['PR'] : hasPR ? ['US', 'PR'] : ['US'];
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({});
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const skipRef = useRef(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (skipRef.current) { skipRef.current = false; return; }
    if (!value || value.length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await autocompleteCity(value, regionCodes);
      setSuggestions(results);
      if (results.length > 0 && inputRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        setDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width });
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
      setActiveIndex(-1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    const close = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setShowDropdown(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const select = (s) => {
    skipRef.current = true;
    onChange(s.label);
    onPlaceSelect?.(s.id);   // pass placeId to parent for accurate geocoding
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); select(suggestions[activeIndex]); }
    else if (e.key === 'Escape') setShowDropdown(false);
  };

  return (
    <div ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); onPlaceSelect?.(null); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        style={style}
        autoComplete="off"
      />
      {showDropdown && suggestions.length > 0 && createPortal(
        <ul
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="bg-midnight-navy border-2 border-starlight-turquoise rounded-lg overflow-hidden shadow-[0_0_20px_rgba(64,224,208,0.3)]"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              onClick={() => select(s)}
              className={[
                'px-3 py-2.5 cursor-pointer flex items-baseline gap-0.5 transition-colors',
                i > 0 ? 'border-t border-starlight-turquoise/20' : '',
                i === activeIndex
                  ? 'bg-starlight-turquoise/20 text-starlight-turquoise'
                  : 'text-paper-white hover:bg-starlight-turquoise/10 hover:text-starlight-turquoise',
              ].join(' ')}
            >
              <span className="font-special-elite text-sm">{s.display}</span>
              {s.state && <span className="font-special-elite text-xs text-chrome-silver">, {s.state}</span>}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
};

// Custom Googie-style neon outline icons
const createCustomIcon = (type) => {
  const icons = {
    // OAK TREE - Historic Literary Landmarks (Neon Green)
    landmark: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-green">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow-green)" class="neon-marker neon-flicker-slow">
          <!-- Trunk -->
          <line x1="20" y1="36" x2="20" y2="25" stroke="#39FF14" stroke-width="3" stroke-linecap="round"/>
          <!-- Left branch -->
          <path d="M 20 27 Q 16 24 14 22" fill="none" stroke="#39FF14" stroke-width="2" stroke-linecap="round"/>
          <!-- Right branch -->
          <path d="M 20 26 Q 24 23 26 21" fill="none" stroke="#39FF14" stroke-width="2" stroke-linecap="round"/>
          <!-- Center branch -->
          <line x1="20" y1="25" x2="20" y2="18" stroke="#39FF14" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Left canopy lobe -->
          <ellipse cx="12" cy="16" rx="6" ry="5" fill="none" stroke="#39FF14" stroke-width="2"/>
          <!-- Center canopy lobe -->
          <ellipse cx="20" cy="11" rx="7" ry="6" fill="none" stroke="#39FF14" stroke-width="2"/>
          <!-- Right canopy lobe -->
          <ellipse cx="28" cy="16" rx="6" ry="5" fill="none" stroke="#39FF14" stroke-width="2"/>
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

// Smoothly pans/zooms the map to a search result without re-mounting the MapContainer
const MapController = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo(target.center, target.zoom, { duration: 1.2 });
  }, [target]);
  return null;
};

// Inline search bar rendered inside the header when showSearch is true
const PlaceSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({});
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query || query.length < 2) { setResults([]); setShowResults(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchPlacesByText(query);
      setResults(res);
      if (res.length > 0 && inputRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        setDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width });
        setShowResults(true);
      } else {
        setShowResults(false);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const close = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) setShowResults(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleSelect = (place) => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    onSelect(place);
  };

  const typeEmoji = { bookstore: '📚', cafe: '☕', landmark: '🌲' };

  return (
    <div className="max-w-2xl mx-auto w-full px-0 pb-1.5">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bookstores, cafes, landmarks…"
          className="w-full bg-black/60 border-2 border-starlight-turquoise/70 text-paper-white font-special-elite px-3 py-2 pr-8 rounded-lg focus:outline-none focus:border-starlight-turquoise"
          style={{ fontSize: '0.875rem' }}
          autoFocus
        />
        {searching && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-starlight-turquoise border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {showResults && results.length > 0 && createPortal(
        <ul
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="bg-midnight-navy border-2 border-starlight-turquoise rounded-lg overflow-hidden shadow-[0_0_20px_rgba(64,224,208,0.3)]"
        >
          {results.map((place, i) => (
            <li
              key={place.id}
              onPointerDown={() => handleSelect(place)}
              style={{ touchAction: 'manipulation' }}
              className={[
                'px-3 py-2.5 cursor-pointer transition-colors hover:bg-starlight-turquoise/10',
                i > 0 ? 'border-t border-starlight-turquoise/20' : '',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm flex-shrink-0">{typeEmoji[place.type] || '📍'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-special-elite text-paper-white text-sm truncate">{place.name}</p>
                  <p className="font-special-elite text-chrome-silver text-xs truncate">{place.address}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
};

const MasterMap = ({ selectedStates, onHome, onShowProfile, onShowLogin, onShowResources, routeStateRef }) => {
  const { user, logout } = useAuth();
  // Initialize from saved ref so route survives navigating away and back
  const saved = routeStateRef?.current ?? {};
  const [startCity, setStartCity] = useState(saved.startCity ?? '');
  const [endCity, setEndCity] = useState(saved.endCity ?? '');
  const [startPlaceId, setStartPlaceId] = useState(null);
  const [endPlaceId, setEndPlaceId] = useState(null);
  const [route, setRoute] = useState(saved.route ?? []);
  const [visibleLocations, setVisibleLocations] = useState(saved.visibleLocations ?? []);
  const [showPlanner, setShowPlanner] = useState(saved.showPlanner ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [shelfTab, setShelfTab] = useState('info'); // 'info' | 'guestbook' | 'tale'
  const [showTaleModal, setShowTaleModal] = useState(false);
  const [tripItems, setTripItems] = useState([]);
  const [showRoadTrip, setShowRoadTrip] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTarget, setSearchTarget] = useState(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  // Reset shelf tab whenever a new location is opened
  useEffect(() => { setShelfTab('info'); setShowTaleModal(false); }, [selectedLocation?.id]);

  // Sync route state back to ref so it survives navigation (MasterMap unmounts/remounts)
  useEffect(() => { if (routeStateRef) routeStateRef.current.startCity = startCity; }, [startCity, routeStateRef]);
  useEffect(() => { if (routeStateRef) routeStateRef.current.endCity = endCity; }, [endCity, routeStateRef]);
  useEffect(() => { if (routeStateRef) routeStateRef.current.route = route; }, [route, routeStateRef]);
  useEffect(() => { if (routeStateRef) routeStateRef.current.visibleLocations = visibleLocations; }, [visibleLocations, routeStateRef]);
  useEffect(() => { if (routeStateRef) routeStateRef.current.showPlanner = showPlanner; }, [showPlanner, routeStateRef]);

  const tripIds = useMemo(() => new Set(tripItems.map((i) => i.id)), [tripItems]);

  // Smart placeholder city hints: first selected state → start, last selected state → end
  const cityHint = useMemo(() => {
    if (!selectedStates.length) return { start: null, end: null };
    const firstInfo = STATE_MAJOR_CITIES[selectedStates[0]];
    const lastInfo  = STATE_MAJOR_CITIES[selectedStates[selectedStates.length - 1]];
    if (selectedStates.length === 1 && firstInfo) {
      // Single state: suggest two different cities so start ≠ end
      const endCity = firstInfo.cities[1] ?? firstInfo.cities[0];
      return {
        start: `${firstInfo.cities[0]}, ${firstInfo.abbr}`,
        end:   `${endCity}, ${firstInfo.abbr}`,
      };
    }
    return {
      start: firstInfo ? `${firstInfo.cities[0]}, ${firstInfo.abbr}` : null,
      end:   lastInfo  ? `${lastInfo.cities[0]}, ${lastInfo.abbr}`   : null,
    };
  }, [selectedStates]);

  // Trip source: Firestore for auth users, localStorage for guests — never mixed
  useEffect(() => {
    if (!user) {
      // Guest: load from localStorage, no Firestore involved
      setTripItems(getTrip());
      return;
    }
    // Auth user: clear any stale state immediately, then stream from Firestore
    setTripItems([]);
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => { setTripItems(snap.exists() ? (snap.data().trip || []) : []); },
      (err) => console.error('[MasterMap] trip sync:', err),
    );
    return unsub;
  }, [user]);

  // Clear the plotted route when the user logs out
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (prevUserRef.current !== null && user === null) {
      setRoute([]);
      setVisibleLocations([]);
      setStartCity('');
      setEndCity('');
      setError('');
      setSelectedLocation(null);
      setShowPlanner(true);
      if (routeStateRef) {
        routeStateRef.current = { startCity: '', endCity: '', route: [], visibleLocations: [], showPlanner: true };
      }
    }
    prevUserRef.current = user;
  }, [user, routeStateRef]);

  const saveTripToFirestore = (items) => {
    if (!user) return;
    setDoc(doc(db, 'users', user.uid), { trip: items }, { merge: true })
      .catch((err) => console.error('[MasterMap] save trip:', err));
  };

  // Record which states were being explored when an item is added (unique, cumulative)
  const trackVisitedStates = () => {
    if (!user || !selectedStates.length) return;
    setDoc(
      doc(db, 'users', user.uid),
      { visitedStates: arrayUnion(...selectedStates) },
      { merge: true },
    ).catch((err) => console.error('[MasterMap] track states:', err));
  };

  const handleTripToggle = (location) => {
    if (tripIds.has(location.id)) {
      const updated = tripItems.filter((i) => i.id !== location.id);
      setTripItems(updated);
      if (user) { saveTripToFirestore(updated); } else { removeFromTrip(location.id); }
    } else {
      const updated = [...tripItems, location];
      setTripItems(updated);
      if (user) {
        saveTripToFirestore(updated);
        trackVisitedStates();
      } else {
        addToTrip(location);
      }
    }
  };

  const handleClearTrip = () => {
    setTripItems([]);
    if (user) { saveTripToFirestore([]); } else { clearTrip(); }
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
    if (!startCity.trim() || !endCity.trim()) {
      setError('Please enter both a starting city and a destination.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Single state: append state name to help geocoder disambiguate.
      // Multiple states: use raw input so cities in any selected state resolve.
      const startQuery = selectedStates.length === 1 ? `${startCity.trim()}, ${selectedStates[0]}` : startCity.trim();
      const endQuery   = selectedStates.length === 1 ? `${endCity.trim()}, ${selectedStates[0]}`   : endCity.trim();

      // Prefer Place Details (placeId from autocomplete) for accurate coords;
      // fall back to text geocoding when user typed a city manually.
      const startCoords = (startPlaceId && await getPlaceCoords(startPlaceId)) || await geocodeCity(startQuery);
      const endCoords   = (endPlaceId   && await getPlaceCoords(endPlaceId))   || await geocodeCity(endQuery);

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

      // Build a full point list: start + route + end so getCuratedLandmarks covers the whole trip
      const allTripPoints = [
        [startCoords.lat, startCoords.lng],
        ...routePoints,
        [endCoords.lat, endCoords.lng],
      ];

      // ── Phase 1: fast sources (Google Places + Firestore) — blocks render ──
      const [places, curatedLandmarks, destPlaces] = await Promise.all([
        searchAlongRoute(routePoints, 5),
        getCuratedLandmarks(allTripPoints, 25),
        searchNearbyPlaces(endCoords.lat, endCoords.lng, 10),
      ]);

      const normName = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
      const seenIds = new Set();
      const seenNames = new Set();
      const mergeInto = (locations, incoming) => {
        for (const loc of incoming) {
          const nn = normName(loc.name);
          if (!seenIds.has(loc.id) && !seenNames.has(nn)) {
            seenIds.add(loc.id);
            seenNames.add(nn);
            locations.push(loc);
          }
        }
      };

      const phase1Locations = [];
      mergeInto(phase1Locations, [...curatedLandmarks, ...places, ...destPlaces]);
      setVisibleLocations(phase1Locations);

      // Fit map to route immediately
      const lats = routePoints.map(p => p[0]);
      const lngs = routePoints.map(p => p[1]);
      const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const maxDiff = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
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
      setLoading(false);

      // ── Phase 2: Wikipedia — runs in background, merges when ready ──
      Promise.all([
        searchLiteraryAlongRoute(routePoints, 5),
        searchLiteraryLandmarks(endCoords.lat, endCoords.lng, 10),
      ]).then(([wikiLandmarks, destWikiLandmarks]) => {
        const wikiLocations = [...wikiLandmarks, ...destWikiLandmarks];
        if (!wikiLocations.length) return;
        setVisibleLocations((prev) => {
          const merged = [...prev];
          // rebuild seen sets from current state
          const ids = new Set(prev.map(l => l.id));
          const names = new Set(prev.map(l => normName(l.name)));
          for (const loc of wikiLocations) {
            const nn = normName(loc.name);
            if (!ids.has(loc.id) && !names.has(nn)) {
              ids.add(loc.id);
              names.add(nn);
              merged.push(loc);
            }
          }
          console.log(`[MasterMap] +${merged.length - prev.length} Wikipedia landmarks added`);
          return merged;
        });
      }).catch(() => {});

    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Route plotting error:', err);
      setLoading(false);
    }
  };

  const handleSearchSelect = (place) => {
    setVisibleLocations((prev) => {
      if (prev.some((l) => l.id === place.id)) return prev;
      return [...prev, place];
    });
    setSearchTarget({ center: [place.lat, place.lng], zoom: 15 });
    setSelectedLocation(place);
    setShowPlanner(false);
    setShowSearch(false);
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

          {/* Home button — labeled on mobile, icon-only on md+ */}
          <button
            onClick={onHome}
            title="Back to map"
            className="flex-shrink-0 flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors px-2 py-0.5 md:p-1 md:absolute md:left-4 md:top-1/2 md:-translate-y-1/2"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="md:hidden font-bungee text-[9px] leading-tight">HOME</span>
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
                className={`bg-atomic-orange text-midnight-navy font-bungee px-2 md:px-4 py-1 md:py-2 rounded-full hover:bg-starlight-turquoise transition-all shadow-lg flex items-center gap-1 md:gap-2 text-[10px] md:text-sm${route.length > 0 ? ' hidden md:flex' : ''}`}
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline">NEAR ME</span>
              </button>
            )}

            {/* Clear Route button — desktop only (mobile version floats below header) */}
            {route.length > 0 && (
              <button
                onClick={handleClearRoute}
                className="hidden md:block font-bungee text-[11px] leading-tight tracking-wide text-atomic-orange hover:text-starlight-turquoise transition-colors border border-atomic-orange hover:border-starlight-turquoise rounded px-2 py-1 whitespace-nowrap"
              >
                CLEAR ROUTE
              </button>
            )}

            {/* Search button */}
            <button
              onClick={() => setShowSearch((v) => !v)}
              title="Search places"
              className={`flex flex-col items-center transition-colors px-2 py-0.5 md:p-1 ${
                showSearch ? 'text-atomic-orange' : 'text-starlight-turquoise hover:text-atomic-orange'
              }`}
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="md:hidden font-bungee text-[9px] leading-tight">SEARCH</span>
            </button>

            {/* My Trip button — labeled on mobile */}
            <button
              onClick={() => setShowRoadTrip(true)}
              className="relative flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors px-2 py-0.5 md:p-1"
              title="My Road Trip"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="md:hidden font-bungee text-[9px] leading-tight">MY TRIP</span>
              {tripItems.length > 0 && (
                <span className="absolute -top-0.5 right-0.5 bg-atomic-orange text-midnight-navy font-bungee text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {tripItems.length > 9 ? '9+' : tripItems.length}
                </span>
              )}
            </button>

            {/* Highway Snacks button */}
            <button
              onClick={onShowResources}
              title="Highway Snacks"
              className="flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors px-2 py-0.5 md:p-1"
            >
              {/* Coffee cup icon */}
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
              </svg>
              <span className="md:hidden font-bungee text-[9px] leading-tight">SNACKS</span>
              <span className="hidden md:inline font-bungee text-[10px] leading-tight tracking-wide">SNACKS</span>
            </button>

            {/* Profile / Login button + dropdown */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={user ? () => setShowUserMenu((v) => !v) : onShowLogin}
                title={user ? 'Traveler\'s Log' : 'Log In'}
                className="flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors px-2 py-0.5 md:p-1"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} className="w-5 h-5 md:w-6 md:h-6 rounded-full" alt="avatar"
                    style={{ border: '1.5px solid #40E0D0', boxShadow: showUserMenu ? '0 0 8px rgba(64,224,208,0.7)' : 'none' }} />
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

                  {/* User info header */}
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

                  {/* Divider */}
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
        {showSearch && (
          <PlaceSearch onSelect={handleSearchSelect} />
        )}
      </div>

      {/* Mobile-only: floating CLEAR ROUTE pill below header */}
      {route.length > 0 && (
        <button
          onClick={handleClearRoute}
          className="md:hidden absolute z-[999] font-bungee text-[10px] tracking-wide text-atomic-orange border border-atomic-orange bg-midnight-navy rounded-full px-3 py-1 shadow-lg"
          style={{ top: '50px', right: '12px' }}
        >
          ✕ CLEAR
        </button>
      )}

      {/* Map */}
      <div className={`h-full ${showSearch ? 'pt-[88px] md:pt-[128px]' : 'pt-11 md:pt-20'}`}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          style={{ background: '#1A1B2E' }}
          key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
        >
          {/* Dark base without labels */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {/* Bright label overlay — white text with halos for legibility */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
          />
          <MapController target={searchTarget} />

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
                click: () => {
                  console.log('[Shelf] Landmark clicked:', {
                    name: location.name,
                    source: location.source,
                    id: location.id,
                    city: location.city,
                    state: location.state,
                    lat: location.lat,
                    lng: location.lng,
                  });
                  setSelectedLocation(location);
                },
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Route Planner — mobile: slide-up from bottom (50vh); desktop: centered dialog */}
      {showPlanner && (
        <>
          {/* Mobile bottom drawer — fixed so iOS Safari URL bar doesn't push it off-screen */}
          <div
            className="md:hidden animate-slide-up border-t-4 border-starlight-turquoise rounded-t-3xl shadow-2xl overflow-y-auto"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '50vh', zIndex: 1001, background: '#0D0E1A' }}
          >
            <div className="h-2 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-80"></div>
            <div className="p-4">
              <h2 className="text-starlight-turquoise font-bungee text-[1.25rem] mb-1 text-center drop-shadow-[0_0_10px_rgba(64,224,208,0.8)] leading-tight">
                {stateLabel}
              </h2>
              <p className="text-atomic-orange font-special-elite text-[0.875rem] mb-3 text-center">
                Plot your literary journey
              </p>
              <div className="space-y-2">
                {selectedStates.length > 1 && (
                  <p className="text-chrome-silver font-special-elite text-xs text-center">
                    Include state if needed — e.g. "Memphis, TN"
                  </p>
                )}
                <CityAutocomplete
                  value={startCity}
                  onChange={setStartCity}
                  onPlaceSelect={setStartPlaceId}
                  placeholder={cityHint.start ? `Starting city — e.g. ${cityHint.start}` : 'Starting city, e.g. New York City'}
                  className="w-full border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange"
                  style={{ fontSize: '1rem', background: '#1A1B2E' }}
                  selectedStates={selectedStates}
                />
                <CityAutocomplete
                  value={endCity}
                  onChange={setEndCity}
                  onPlaceSelect={setEndPlaceId}
                  placeholder={cityHint.end ? `Destination — e.g. ${cityHint.end}` : 'Destination city, e.g. Buffalo'}
                  className="w-full border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange"
                  style={{ fontSize: '1rem', background: '#1A1B2E' }}
                  selectedStates={selectedStates}
                />
                {error && (
                  <p className="text-atomic-orange font-special-elite text-xs">{error}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handlePlotRoute}
                    disabled={loading}
                    className="flex-1 bg-atomic-orange text-midnight-navy font-bungee py-2.5 rounded-lg hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-50 text-[0.875rem]"
                  >
                    {loading ? 'SEARCHING...' : 'PLOT ROUTE'}
                  </button>
                  <button
                    onClick={onHome}
                    className="px-4 bg-transparent text-starlight-turquoise border-2 border-starlight-turquoise font-special-elite py-2 rounded-lg hover:bg-starlight-turquoise hover:text-midnight-navy transition-all text-[0.875rem]"
                  >
                    ← State
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: centered dialog */}
          <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-midnight-navy/95 border-4 border-starlight-turquoise rounded-lg p-6 shadow-2xl overflow-y-auto z-[1001]">
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
                <label className="text-paper-white font-special-elite text-[0.875rem] block mb-1">Starting City</label>
                <CityAutocomplete
                  value={startCity}
                  onChange={setStartCity}
                  onPlaceSelect={setStartPlaceId}
                  placeholder={cityHint.start ? `e.g., ${cityHint.start}` : 'e.g., New York City'}
                  className="w-full bg-black/50 border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange"
                  style={{ fontSize: '1rem' }}
                  selectedStates={selectedStates}
                />
              </div>
              <div>
                <label className="text-paper-white font-special-elite text-[0.875rem] block mb-1">Destination City</label>
                <CityAutocomplete
                  value={endCity}
                  onChange={setEndCity}
                  onPlaceSelect={setEndPlaceId}
                  placeholder={cityHint.end ? `e.g., ${cityHint.end}` : 'e.g., Buffalo'}
                  className="w-full bg-black/50 border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange"
                  style={{ fontSize: '1rem' }}
                  selectedStates={selectedStates}
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
        </>
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
        <div
          className="animate-slide-up bg-midnight-navy border-t-4 border-starlight-turquoise rounded-t-3xl shadow-2xl flex flex-col"
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '65vh', zIndex: 1001 }}
        >
          <div className="h-2 flex-shrink-0 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-80"></div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl mx-auto w-full">
            <button
              onClick={() => setSelectedLocation(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 text-starlight-turquoise hover:text-atomic-orange transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Type badge + name (always visible) */}
            <div className="flex items-center gap-2 mb-2">
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
                <span className="font-bungee text-xs px-3 py-1 border-2 rounded-full" style={{ color: '#39FF14', borderColor: '#39FF14' }}>
                  🌲 LITERARY LANDMARK
                </span>
              )}
            </div>

            <h2 className="text-starlight-turquoise font-bungee text-xl md:text-2xl mb-3 drop-shadow-[0_0_10px_rgba(64,224,208,0.8)]">
              {selectedLocation.name}
            </h2>

            {/* Tab bar — bookstores & cafes only */}
            {(selectedLocation.type === 'bookstore' || selectedLocation.type === 'cafe') && (
              <div className="flex gap-1 mb-4 border-b border-white/10 pb-0">
                {[
                  { id: 'info', label: 'INFO' },
                  { id: 'guestbook', label: 'GUESTBOOK' },
                  { id: 'tale', label: "HITCHHIKER'S TALE" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setShelfTab(tab.id)}
                    className="font-bungee px-3 py-1.5 rounded-t-lg transition-all relative"
                    style={{
                      fontSize: '10px',
                      color: shelfTab === tab.id ? '#40E0D0' : 'rgba(192,192,192,0.5)',
                      background: shelfTab === tab.id ? 'rgba(64,224,208,0.08)' : 'transparent',
                      borderBottom: shelfTab === tab.id ? '2px solid #40E0D0' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Info (or full content for landmarks) */}
            {(selectedLocation.type === 'landmark' || shelfTab === 'info') && (
              <div>
                <p className="text-paper-white font-special-elite text-sm mb-2 line-clamp-3 md:line-clamp-none">
                  {selectedLocation.description}
                </p>

                <div className="flex items-start gap-2 text-chrome-silver font-special-elite text-sm mb-2">
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
                    className="inline-flex items-center gap-2 text-atomic-orange font-special-elite text-sm hover:text-starlight-turquoise transition-colors"
                  >
                    <span>
                      {selectedLocation.source === 'ALA' ? 'View on ALA Literary Landmarks' : 'Read more on Wikipedia'}
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}

                {selectedLocation.source === 'ALA' && (
                  <p className="font-special-elite mt-3 pt-3 border-t border-white/10"
                    style={{ fontSize: '10px', color: 'rgba(192,192,192,0.55)', lineHeight: '1.4' }}>
                    Literary landmark courtesy of the{' '}
                    <a
                      href="https://www.ala.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'rgba(64,224,208,0.6)', textDecoration: 'underline' }}
                    >
                      American Library Association
                    </a>
                  </p>
                )}

                {/* Landmarks keep Guestbook inline */}
                {selectedLocation.type === 'landmark' && (
                  <Guestbook
                    key={selectedLocation.id}
                    locationId={selectedLocation.id}
                    user={user}
                    onShowLogin={onShowLogin}
                  />
                )}
              </div>
            )}

            {/* Tab: Guestbook */}
            {shelfTab === 'guestbook' && (selectedLocation.type === 'bookstore' || selectedLocation.type === 'cafe') && (
              <Guestbook
                key={selectedLocation.id}
                locationId={selectedLocation.id}
                user={user}
                onShowLogin={onShowLogin}
              />
            )}

            {/* Tab: Hitchhiker's Tale */}
            {shelfTab === 'tale' && (selectedLocation.type === 'bookstore' || selectedLocation.type === 'cafe') && (
              <HitchhikerTale
                key={selectedLocation.id}
                locationId={selectedLocation.id}
                locationName={selectedLocation.name}
                onOpenModal={() => setShowTaleModal(true)}
              />
            )}
          </div>

          {/* Sticky buttons — always visible at bottom */}
          <div className="flex-shrink-0 flex gap-3 px-4 pb-4 md:px-6 md:pb-6 pt-2 max-w-2xl mx-auto w-full">
            <button className="flex-1 bg-atomic-orange text-midnight-navy font-bungee py-2.5 rounded-lg hover:bg-starlight-turquoise transition-all shadow-lg">
              GET DIRECTIONS
            </button>
            <button
              onClick={() => handleTripToggle(selectedLocation)}
              className={`px-4 border-2 font-special-elite py-2.5 rounded-lg transition-all ${
                tripIds.has(selectedLocation.id)
                  ? 'bg-starlight-turquoise/20 border-starlight-turquoise text-starlight-turquoise hover:bg-atomic-orange/20 hover:border-atomic-orange hover:text-atomic-orange'
                  : 'bg-transparent border-starlight-turquoise text-starlight-turquoise hover:bg-starlight-turquoise hover:text-midnight-navy'
              }`}
            >
              {tripIds.has(selectedLocation.id) ? '✓ IN TRIP' : '+ ADD TO TRIP'}
            </button>
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

      {/* ── Hitchhiker's Tale modal ── */}
      {showTaleModal && selectedLocation && (
        <TaleModal
          locationId={selectedLocation.id}
          locationName={selectedLocation.name}
          user={user}
          onShowLogin={onShowLogin}
          onClose={() => setShowTaleModal(false)}
        />
      )}
    </div>
  );
};

export default MasterMap;
