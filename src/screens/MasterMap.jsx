import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, GeoJSON, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/lib/assets/MarkerCluster.css';
import 'react-leaflet-cluster/lib/assets/MarkerCluster.Default.css';
import L from 'leaflet';
import { MAP_CONFIG } from '../config/config';
import { autocompleteCity, geocodePlace, searchPlaces } from '../utils/mapboxGeocoding';
import { searchNearbyPlaces, searchNearbyPlacesTiered, searchAlongRoute } from '../utils/nearbySearch';
import { searchLiteraryAlongRoute, searchLiteraryLandmarks } from '../utils/wikipedia';
import { getCuratedLandmarks, getDriveInsAlongRoute, getDriveInsNear } from '../utils/firebaseLandmarks';
import { getLiteraryFestivalsAlongRoute, getLiteraryFestivalsNear } from '../utils/literaryFestivals';
import { getMapboxRoute } from '../utils/mapbox';
import { getTrip, addToTrip, removeFromTrip, clearTrip } from '../utils/tripStorage';
import { saveRoute, subscribeToSavedRoutes, deleteSavedRoute, updateRouteName } from '../utils/savedRoutes';
import { subscribeSavedStops, saveStop, unsaveStop } from '../utils/savedStops';
import { checkIn, deleteCheckIn, subscribeToLocationCars, carImgSrc } from '../utils/carCheckIns';
import { checkAndAwardBadges, subscribeToUserBadges } from '../utils/badgeChecker';
import { ADMIN_UID } from '../utils/newsletterAdmin';
import BadgeUnlockModal from '../components/BadgeUnlockModal';
import { checkHonkAllowed, recordHonk, sendHonkNotifications, clearHonkNotification, playHorn, requestHonkNotifPermission, showBrowserHonkNotification } from '../utils/honkUtils';
import RoadTrip from './RoadTrip';
import SaveRouteModal from '../components/SaveRouteModal';
import ShareRouteModal from '../components/ShareRouteModal';
import Guestbook from '../components/Guestbook';
import HitchhikerTale from '../components/HitchhikerTale';
import PostcardStudio from '../components/PostcardStudio';
import TaleModal from '../components/TaleModal';
import PitStopRating from '../components/PitStopRating';
import { CarIcon, CameraIcon, ProfileIcon, SignOutIcon, BadgesIcon, DayTripsIcon, FestivalTentIcon, AboutIcon, CodeOfEthicsIcon, PrivacyPolicyIcon, CreditsIcon, CloseIcon, LibraryIcon } from '../components/Icons';
import TripProgressPanel from '../components/TripProgressPanel';
import HamburgerDrawer from '../components/HamburgerDrawer';
import AudioNarrative from '../components/AudioNarrative';
import NavigateModal from '../components/NavigateModal';
import DiscoveredAuthorsStrip from '../components/DiscoveredAuthorsStrip';
import { AUTHOR_TIDBITS } from '../data/authorTidbits';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot, arrayUnion } from 'firebase/firestore';

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

// ── State-selection overlay constants ────────────────────────────────────────
const SS_DEFAULT_STYLE   = { fillColor: '#1A1B2E', fillOpacity: 0.65, color: '#40E0D0', weight: 1 };
const SS_SELECTED_STYLE  = { fillColor: '#40E0D0', fillOpacity: 0.22, color: '#40E0D0', weight: 3 };
const SS_HOVER_STYLE     = { fillColor: '#FF4E00', fillOpacity: 0.40, color: '#FF4E00', weight: 2 };
const SS_HOVER_SEL_STYLE = { fillColor: '#FF4E00', fillOpacity: 0.40, color: '#40E0D0', weight: 3 };

// ── State geographic centers [lat, lng, zoom] ─────────────────────────────────
const STATE_CENTERS = {
  'Alabama':              [32.806671,  -86.791130, 7],
  'Alaska':               [61.370716, -152.404419, 4],
  'Arizona':              [33.729759, -111.431221, 7],
  'Arkansas':             [34.969704,  -92.373123, 7],
  'California':           [36.116203, -119.681564, 6],
  'Colorado':             [39.059811, -105.311104, 7],
  'Connecticut':          [41.597782,  -72.755371, 8],
  'Delaware':             [39.318523,  -75.507141, 8],
  'Florida':              [27.766279,  -81.686783, 7],
  'Georgia':              [33.040619,  -83.643074, 7],
  'Hawaii':               [21.094318, -157.498337, 7],
  'Idaho':                [44.240459, -114.478828, 6],
  'Illinois':             [40.349457,  -88.986137, 7],
  'Indiana':              [39.849426,  -86.258278, 7],
  'Iowa':                 [42.011539,  -93.210526, 7],
  'Kansas':               [38.526600,  -96.726486, 7],
  'Kentucky':             [37.668140,  -84.670067, 7],
  'Louisiana':            [31.169546,  -91.867805, 7],
  'Maine':                [44.693947,  -69.381927, 7],
  'Maryland':             [39.063946,  -76.802101, 8],
  'Massachusetts':        [42.230171,  -71.530106, 8],
  'Michigan':             [43.326618,  -84.536095, 7],
  'Minnesota':            [45.694454,  -93.900192, 6],
  'Mississippi':          [32.741646,  -89.678696, 7],
  'Missouri':             [38.456085,  -92.288368, 7],
  'Montana':              [46.921925, -110.454353, 6],
  'Nebraska':             [41.125370,  -98.268082, 7],
  'Nevada':               [38.313515, -117.055374, 6],
  'New Hampshire':        [43.452492,  -71.563896, 8],
  'New Jersey':           [40.298904,  -74.521011, 8],
  'New Mexico':           [34.840515, -106.248482, 7],
  'New York':             [42.165726,  -74.948051, 7],
  'North Carolina':       [35.630066,  -79.806419, 7],
  'North Dakota':         [47.528912,  -99.784012, 7],
  'Ohio':                 [40.388783,  -82.764915, 7],
  'Oklahoma':             [35.565342,  -96.928917, 7],
  'Oregon':               [44.572021, -122.070938, 7],
  'Pennsylvania':         [40.590752,  -77.209755, 7],
  'Rhode Island':         [41.680893,  -71.511780, 9],
  'South Carolina':       [33.856892,  -80.945007, 7],
  'South Dakota':         [44.299782,  -99.438828, 7],
  'Tennessee':            [35.747845,  -86.692345, 7],
  'Texas':                [31.054487,  -97.563461, 6],
  'Utah':                 [40.150032, -111.862434, 7],
  'Vermont':              [44.045876,  -72.710686, 8],
  'Virginia':             [37.769337,  -78.169968, 7],
  'Washington':           [47.400902, -121.490494, 7],
  'West Virginia':        [38.491226,  -80.954453, 7],
  'Wisconsin':            [44.268543,  -89.616508, 7],
  'Wyoming':              [42.755966, -107.302490, 7],
  'District of Columbia': [38.9072,    -77.0369,  13],
};


// ── Author tidbit keyframes — injected once into document.head ────────────────
let _tidbitStyleInjected = false;
const ensureFlickerStyle = () => {
  if (_tidbitStyleInjected || typeof document === 'undefined') return;
  _tidbitStyleInjected = true;
  const el = document.createElement('style');
  el.textContent = `
    @keyframes neon-flicker {
      0%   { opacity: 1;    }
      15%  { opacity: 0.85; }
      17%  { opacity: 1;    }
      50%  { opacity: 1;    }
      51%  { opacity: 0.7;  }
      53%  { opacity: 1;    }
      100% { opacity: 1;    }
    }
    @keyframes neon-glow-flicker-orange {
      0%   { filter: drop-shadow(0 0 7px #FF4E00) drop-shadow(0 0 2px #FF7040); }
      15%  { filter: drop-shadow(0 0 1px #FF4E00); }
      17%  { filter: drop-shadow(0 0 7px #FF4E00) drop-shadow(0 0 2px #FF7040); }
      50%  { filter: drop-shadow(0 0 6px #FF4E00); }
      51%  { filter: drop-shadow(0 0 1px #FF4E00); }
      53%  { filter: drop-shadow(0 0 7px #FF4E00) drop-shadow(0 0 2px #FF7040); }
      100% { filter: drop-shadow(0 0 7px #FF4E00) drop-shadow(0 0 2px #FF7040); }
    }
    @keyframes neon-glow-flicker-teal {
      0%   { filter: drop-shadow(0 0 7px #40E0D0) drop-shadow(0 0 2px #70F0E0); }
      15%  { filter: drop-shadow(0 0 1px #40E0D0); }
      17%  { filter: drop-shadow(0 0 7px #40E0D0) drop-shadow(0 0 2px #70F0E0); }
      50%  { filter: drop-shadow(0 0 6px #40E0D0); }
      51%  { filter: drop-shadow(0 0 1px #40E0D0); }
      53%  { filter: drop-shadow(0 0 7px #40E0D0) drop-shadow(0 0 2px #70F0E0); }
      100% { filter: drop-shadow(0 0 7px #40E0D0) drop-shadow(0 0 2px #70F0E0); }
    }
    @keyframes tidbit-slide-in {
      from { transform: translateX(-120%); }
      to   { transform: translateX(0); }
    }
    @keyframes tidbit-slide-out {
      from { transform: translateX(0); }
      to   { transform: translateX(-120%); }
    }
  `;
  document.head.appendChild(el);
};

const SS_FALLBACK_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
  'District of Columbia',
];

// City autocomplete input with Googie-style dropdown
// filterToState: if true and exactly 1 state selected, restricts results to that state
const CityAutocomplete = ({ value, onChange, onPlaceSelect, placeholder, className, style, selectedStates = [], filterToState = false }) => {
  const hasPR = selectedStates.includes('Puerto Rico');
  const hasOtherStates = selectedStates.some((s) => s !== 'Puerto Rico');
  const regionCodes = hasPR && !hasOtherStates ? ['PR'] : hasPR ? ['US', 'PR'] : ['US'];

  // Derive state info for filtering (single-state only)
  const singleState    = selectedStates.length === 1 ? selectedStates[0] : null;
  const filterStateCode = filterToState && singleState
    ? (STATE_MAJOR_CITIES[singleState]?.abbr || null)
    : null;

  const [stateExpanded, setStateExpanded] = useState(false); // escape hatch: search all states
  const activeCode = stateExpanded ? null : filterStateCode;

  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({});
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const skipRef = useRef(false);
  const debounceRef = useRef(null);

  // Reset expanded state when selected state changes
  useEffect(() => { setStateExpanded(false); }, [singleState]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (skipRef.current) { skipRef.current = false; return; }
    if (!value || value.length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await autocompleteCity(value, regionCodes, activeCode);
      setSuggestions(results);
      if (results.length > 0 && inputRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        setDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width });
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
      setActiveIndex(-1);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [value, activeCode]);

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
    onPlaceSelect?.(s);      // pass full suggestion (includes lat/lng) — no extra geocode needed
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
        onChange={(e) => { onChange(e.target.value); onPlaceSelect?.(null); /* clears picked coords */ }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        style={style}
        autoComplete="off"
      />
      {filterStateCode && (
        <div className="flex items-center justify-between mt-1 px-0.5">
          <span className="font-special-elite text-[11px] text-chrome-silver/50">
            {stateExpanded ? 'Searching all states' : `Searching ${singleState} cities…`}
          </span>
          {!stateExpanded && (
            <button
              type="button"
              onClick={() => setStateExpanded(true)}
              className="font-special-elite text-[11px] text-starlight-turquoise hover:underline"
            >
              Search all states ↗
            </button>
          )}
        </div>
      )}
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

// Counter to give each icon's SVG filters a unique DOM ID, preventing cross-marker contamination
let _iconUid = 0;

// Neon green cluster badge for grouped landmark markers
const createLandmarkClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="cluster-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="22" cy="22" r="18" stroke="#39FF14" stroke-width="2.5" filter="url(#cluster-glow)"/>
          <circle cx="22" cy="22" r="18" fill="#39FF14" fill-opacity="0.15"/>
        </svg>
        <span style="
          position: absolute;
          color: #39FF14;
          font-family: 'Bungee', sans-serif;
          font-size: ${count > 99 ? '11px' : count > 9 ? '13px' : '15px'};
          line-height: 1;
          text-shadow: 0 0 8px #39FF14;
          pointer-events: none;
        ">${count}</span>
      </div>
    `,
    className: 'landmark-cluster-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};


// Custom Googie-style neon outline icons
const createCustomIcon = (type, hasStarburst = false, inTrip = false, label = '') => {
  const uid = ++_iconUid;
  const glowBoost = hasStarburst ? 'filter:drop-shadow(0 0 10px rgba(255,210,0,0.9));' : '';
  const safeLabel = label.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const a11y = safeLabel ? ` title="${safeLabel}" aria-label="${safeLabel}" role="img" tabindex="0"` : '';
  const starburstOverlay = hasStarburst
    ? `<img src="/literary-roads/images/starburst-rating.png" alt="" style="position:absolute;top:-14px;right:-14px;width:40px;height:40px;z-index:10;" />`
    : '';
  // Gold star badge on pins that are in "My Stops"
  const inTripOverlay = inTrip
    ? `<div style="position:absolute;top:-8px;left:-8px;width:20px;height:20px;background:#FFD700;border-radius:50%;border:2px solid #1A1B2E;display:flex;align-items:center;justify-content:center;font-size:10px;z-index:11;box-shadow:0 0 8px rgba(255,215,0,0.9)">⭐</div>`
    : '';
  const icons = {
    // OAK TREE - Historic Literary Landmarks (Neon Green)
    landmark: `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-green-${uid}" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow-green-${uid})" class="neon-marker neon-flicker-slow">
          <!-- Trunk -->
          <line x1="20" y1="36" x2="20" y2="25" stroke="#39FF14" stroke-width="3" stroke-linecap="round"/>
          <!-- Left branch -->
          <path d="M 20 27 Q 16 24 14 22" stroke="#39FF14" stroke-width="2" stroke-linecap="round"/>
          <!-- Right branch -->
          <path d="M 20 26 Q 24 23 26 21" stroke="#39FF14" stroke-width="2" stroke-linecap="round"/>
          <!-- Center branch -->
          <line x1="20" y1="25" x2="20" y2="18" stroke="#39FF14" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Left canopy lobe — shifted out for clear gap -->
          <ellipse cx="10" cy="17" rx="6" ry="5" stroke="#39FF14" stroke-width="2"/>
          <!-- Center canopy lobe -->
          <ellipse cx="20" cy="11" rx="6" ry="5.5" stroke="#39FF14" stroke-width="2"/>
          <!-- Right canopy lobe — shifted out for clear gap -->
          <ellipse cx="30" cy="17" rx="6" ry="5" stroke="#39FF14" stroke-width="2"/>
        </g>
      </svg>
    `,

    // BOOK - Independent Bookstores (Atomic Orange)
    bookstore: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-orange-${uid}">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow-orange-${uid})" class="neon-marker neon-flicker-fast">
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
          <filter id="glow-turquoise-${uid}">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow-turquoise-${uid})" class="neon-marker neon-shimmer">
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

    // MOVIE SCREEN - Drive-In Theaters (Magenta)
    drivein: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-magenta-${uid}">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow-magenta-${uid})" class="neon-marker">
          <!-- Screen frame -->
          <rect x="6" y="7" width="28" height="17" rx="1.5" fill="none" stroke="#E040FB" stroke-width="2"/>
          <!-- Screen glare -->
          <line x1="9" y1="10" x2="14" y2="10" stroke="#E040FB" stroke-width="1" opacity="0.45"/>
          <!-- Film strip squares inside screen -->
          <rect x="10" y="13" width="4" height="4" rx="0.5" fill="none" stroke="#E040FB" stroke-width="1" opacity="0.6"/>
          <rect x="18" y="13" width="4" height="4" rx="0.5" fill="none" stroke="#E040FB" stroke-width="1" opacity="0.6"/>
          <rect x="26" y="13" width="4" height="4" rx="0.5" fill="none" stroke="#E040FB" stroke-width="1" opacity="0.6"/>
          <!-- Pole -->
          <line x1="20" y1="24" x2="20" y2="32" stroke="#E040FB" stroke-width="2" stroke-linecap="round"/>
          <!-- Base -->
          <line x1="14" y1="32" x2="26" y2="32" stroke="#E040FB" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      </svg>
    `,

    // SPARKLE STAR — Literary Book Festivals (Purple/Violet)
    festival: `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-purple-${uid}">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow-purple-${uid})" class="neon-marker">
          <!-- 8-point star -->
          <path d="M 20 7 L 22.5 15.5 L 31 13 L 25.5 19.5 L 33 22 L 25.5 24.5 L 28 33 L 20.5 27.5 L 18 36 L 15.5 28 L 7 31 L 12.5 24.5 L 5 22 L 12.5 19.5 L 8 12 L 17.5 14.5 Z"
                fill="none" stroke="#B044FB" stroke-width="2" stroke-linejoin="round"/>
          <!-- Center circle -->
          <circle cx="20" cy="21" r="3" fill="none" stroke="#B044FB" stroke-width="1.5"/>
        </g>
      </svg>
    `,

    // COLUMNS - Museums (Sky Blue)
    museum: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="glow-skyblue-${uid}"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <g filter="url(#glow-skyblue-${uid})" class="neon-marker">
          <line x1="5" y1="34" x2="35" y2="34" stroke="#4FC3F7" stroke-width="2" stroke-linecap="round"/>
          <line x1="8" y1="18" x2="8" y2="32" stroke="#4FC3F7" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="20" y1="18" x2="20" y2="32" stroke="#4FC3F7" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="32" y1="18" x2="32" y2="32" stroke="#4FC3F7" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M4 18 L20 8 L36 18" fill="none" stroke="#4FC3F7" stroke-width="2" stroke-linejoin="round"/>
        </g>
      </svg>
    `,

    // FORK & KNIFE - Restaurants (Amber)
    restaurant: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="glow-amber-${uid}"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <g filter="url(#glow-amber-${uid})" class="neon-marker">
          <line x1="14" y1="8" x2="14" y2="32" stroke="#FFB300" stroke-width="2" stroke-linecap="round"/>
          <path d="M11 8 L11 16 Q14 18 17 16 L17 8" fill="none" stroke="#FFB300" stroke-width="1.5" stroke-linejoin="round"/>
          <line x1="26" y1="8" x2="26" y2="32" stroke="#FFB300" stroke-width="2" stroke-linecap="round"/>
          <path d="M23 8 Q23 18 26 20" fill="none" stroke="#FFB300" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M29 8 Q29 18 26 20" fill="none" stroke="#FFB300" stroke-width="1.5" stroke-linecap="round"/>
        </g>
      </svg>
    `,

    // PINE TREE - Parks & Nature (Mint)
    park: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="glow-mint-${uid}"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <g filter="url(#glow-mint-${uid})" class="neon-marker">
          <line x1="20" y1="32" x2="20" y2="22" stroke="#69F0AE" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M20 24 L10 32" fill="none" stroke="#69F0AE" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
          <path d="M8 26 L20 14 L32 26 Z" fill="none" stroke="#69F0AE" stroke-width="2" stroke-linejoin="round"/>
          <path d="M11 21 L20 10 L29 21 Z" fill="none" stroke="#69F0AE" stroke-width="2" stroke-linejoin="round"/>
          <path d="M14 16 L20 7 L26 16 Z" fill="none" stroke="#69F0AE" stroke-width="2" stroke-linejoin="round"/>
        </g>
      </svg>
    `,

    // CASTLE TOWER - Historic Sites (Gold)
    historicSite: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="glow-gold-${uid}"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <g filter="url(#glow-gold-${uid})" class="neon-marker">
          <rect x="11" y="16" width="18" height="18" fill="none" stroke="#FFCA28" stroke-width="2"/>
          <rect x="10" y="11" width="4" height="7" fill="none" stroke="#FFCA28" stroke-width="1.5"/>
          <rect x="16" y="11" width="4" height="7" fill="none" stroke="#FFCA28" stroke-width="1.5"/>
          <rect x="22" y="11" width="4" height="7" fill="none" stroke="#FFCA28" stroke-width="1.5"/>
          <path d="M17 34 L17 27 Q20 24 23 27 L23 34" fill="none" stroke="#FFCA28" stroke-width="1.5"/>
          <line x1="6" y1="34" x2="34" y2="34" stroke="#FFCA28" stroke-width="2" stroke-linecap="round"/>
        </g>
      </svg>
    `,

    // PICTURE FRAME - Art Galleries (Pink)
    artGallery: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="glow-pink-${uid}"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <g filter="url(#glow-pink-${uid})" class="neon-marker">
          <rect x="7" y="7" width="26" height="22" rx="1.5" fill="none" stroke="#F48FB1" stroke-width="2"/>
          <rect x="12" y="12" width="16" height="12" rx="1" fill="none" stroke="#F48FB1" stroke-width="1.5"/>
          <path d="M12 20 L17 15 L22 19 L26 14 L28 17" fill="none" stroke="#F48FB1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="15" y1="29" x2="15" y2="33" stroke="#F48FB1" stroke-width="2" stroke-linecap="round"/>
          <line x1="25" y1="29" x2="25" y2="33" stroke="#F48FB1" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="33" x2="28" y2="33" stroke="#F48FB1" stroke-width="1.5" stroke-linecap="round"/>
        </g>
      </svg>
    `,

    // DOME - Observatories (Cyan)
    observatory: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="glow-cyan-${uid}"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <g filter="url(#glow-cyan-${uid})" class="neon-marker">
          <path d="M7 24 Q7 8 20 8 Q33 8 33 24" fill="none" stroke="#80DEEA" stroke-width="2" stroke-linecap="round"/>
          <line x1="6" y1="24" x2="34" y2="24" stroke="#80DEEA" stroke-width="2" stroke-linecap="round"/>
          <rect x="13" y="24" width="14" height="8" rx="1" fill="none" stroke="#80DEEA" stroke-width="1.5"/>
          <line x1="18" y1="12" x2="24" y2="24" stroke="#80DEEA" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
          <circle cx="18" cy="11" r="2" fill="none" stroke="#80DEEA" stroke-width="1.5"/>
        </g>
      </svg>
    `,

    // FISH - Aquariums (Ocean Blue)
    aquarium: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="glow-ocean-${uid}"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <g filter="url(#glow-ocean-${uid})" class="neon-marker">
          <ellipse cx="18" cy="20" rx="10" ry="7" fill="none" stroke="#29B6F6" stroke-width="2"/>
          <path d="M28 20 L35 13 L35 27 Z" fill="none" stroke="#29B6F6" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="11" cy="18" r="2" fill="none" stroke="#29B6F6" stroke-width="1.5"/>
          <path d="M15 15 Q20 11 25 15" fill="none" stroke="#29B6F6" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
          <path d="M7 24 Q10 28 15 27" fill="none" stroke="#29B6F6" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
        </g>
      </svg>
    `,

    // DRAMA MASKS - Theaters (Hot Pink)
    theater: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="glow-hotpink-${uid}"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <g filter="url(#glow-hotpink-${uid})" class="neon-marker">
          <path d="M5 12 Q5 7 10 7 Q15 7 15 12 L15 22 Q12 26 10 26 Q7 26 5 22 Z" fill="none" stroke="#FF80AB" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M8 17 Q10 19 12 17" fill="none" stroke="#FF80AB" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M25 10 Q25 5 30 5 Q35 5 35 10 L35 20 Q32 23 30 22 Q28 24 25 20 Z" fill="none" stroke="#FF80AB" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M28 13 Q30 11 32 13" fill="none" stroke="#FF80AB" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="15" y1="22" x2="25" y2="20" stroke="#FF80AB" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
        </g>
      </svg>
    `,

    // OPEN ARCH + BOOK - Libraries (Yellow-Green)
    library: `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="glow-yg-${uid}"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <g filter="url(#glow-yg-${uid})" class="neon-marker">
          <!-- Arch entrance -->
          <path d="M10 32 L10 20 Q10 10 20 10 Q30 10 30 20 L30 32" fill="none" stroke="#AEEA00" stroke-width="2" stroke-linecap="round"/>
          <!-- Base line -->
          <line x1="7" y1="32" x2="33" y2="32" stroke="#AEEA00" stroke-width="2" stroke-linecap="round"/>
          <!-- Small open book inside arch -->
          <path d="M14 25 L14 20 Q20 22 20 22 Q20 22 26 20 L26 25 Q20 27 20 27 Q20 27 14 25" fill="none" stroke="#AEEA00" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
          <line x1="20" y1="20.5" x2="20" y2="26.5" stroke="#AEEA00" stroke-width="1"/>
        </g>
      </svg>
    `,

    // MAP PIN - Generic search result (Gold)
    search: `
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-gold-${uid}">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow-gold-${uid})">
          <path d="M 16 2 C 8.3 2 2 8.3 2 16 C 2 24 16 38 16 38 C 16 38 30 24 30 16 C 30 8.3 23.7 2 16 2 Z"
                fill="#FFD700" stroke="#B8860B" stroke-width="1.5"/>
          <circle cx="16" cy="16" r="5" fill="#1A1B2E"/>
        </g>
      </svg>
    `,
  };

  const isSearch = type === 'search';
  const icon = L.divIcon({
    html: `<div style="position:relative;display:inline-block;${glowBoost}"${a11y}>${icons[type] || icons.cafe}${starburstOverlay}${inTripOverlay}</div>`,
    className: 'custom-googie-marker',
    iconSize: isSearch ? [32, 40] : [40, 40],
    iconAnchor: isSearch ? [16, 40] : [20, 40],
    popupAnchor: [0, -40],
  });
  // Tag the icon so cluster functions can identify the marker's category
  icon._locationType = type;
  return icon;
};

// Pixel offsets (as iconAnchor values) to spread individual cars above a pin.
// iconAnchor [ax, ay]: icon appears with its (ax,ay) pixel at the marker's geo point.
// Default [14,68] = icon centered horizontally, 40px above pin bottom.
const SPREAD_ANCHORS = [
  [14, 68],  // 0: center (default)
  [-12, 68], // 1: 26px to the right
  [40, 68],  // 2: 26px to the left
  [14, 42],  // 3: center, lower (closer to pin)
];

// Single car icon — one per car for 1–4 car clusters
const createSingleCarIcon = (car, animating = false, index = 0) => {
  const src = carImgSrc(car.carType);
  const cls = animating ? 'lr-honking' : '';
  const anchor = SPREAD_ANCHORS[index] ?? SPREAD_ANCHORS[0];
  return L.divIcon({
    html: `<div class="${cls}" style="position:relative;display:inline-block"><img src="${src}" style="width:28px;height:28px;object-fit:contain;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.9))" /></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: anchor,
  });
};

// Convoy starburst icon — shown when 5+ cars are at one location
const createConvoyIcon = (count, animating = false) => {
  const cls = `lr-convoy${animating ? ' lr-honking' : ''}`;
  return L.divIcon({
    html: `<div class="${cls}" style="background:linear-gradient(135deg,#FF4E00,#FFD700);border:2.5px solid #FFD700;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-family:'Bungee',sans-serif;font-size:12px;color:#1A1B2E;line-height:1">🚗${count}</div>`,
    className: '',
    iconSize: [42, 42],
    iconAnchor: [21, 80],
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

// Tracks live map position into routeStateRef so navigating to Profile/Snacks/etc and back
// restores the exact view the user was on — not the hardcoded default.
const MapPositionTracker = ({ routeStateRef, onMove }) => {
  const map = useMap();
  useEffect(() => {
    const save = () => {
      const c = map.getCenter();
      if (routeStateRef) {
        routeStateRef.current.mapCenter = [c.lat, c.lng];
        routeStateRef.current.mapZoom   = map.getZoom();
      }
      if (onMove) onMove([c.lat, c.lng]);
    };
    map.on('moveend', save);
    map.on('zoomend', save);
    return () => { map.off('moveend', save); map.off('zoomend', save); };
  }, [map, routeStateRef, onMove]);
  return null;
};

// Inline Haversine — miles between two [lat, lng] pairs
const distMiles = ([lat1, lng1], [lat2, lng2]) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Fits the map to a lat/lng bounding box or flies to a center point
// target.bounds → fitBounds; target.center → flyTo
const FitBoundsController = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    if (target.bounds) {
      map.fitBounds(target.bounds, target.options ?? { padding: [60, 60] });
    } else if (target.center) {
      map.flyTo(target.center, target.zoom ?? 14, { duration: 1 });
    }
  }, [target]);
  return null;
};

// Flies map back to US overview when entering state-selection mode
const UiModeController = ({ uiMode }) => {
  const map = useMap();
  useEffect(() => {
    if (uiMode === 'stateSelect') {
      map.flyTo(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom, { duration: 1.2 });
    }
  }, [uiMode]);
  return null;
};

// Floating author tidbit trapezoid — fixed to the top-left corner of the map.
// Triggered by hovering a state for 600ms (debounce handled in onEachStateFeature).
// Slides in from the left on mount, slides out before unmounting.
// Auto-dismisses after 4.5s; hovering the card pauses the timer.
const AuthorTidbitOverlay = ({ stateName, onDismiss }) => {
  const map                     = useMap();
  const author                  = AUTHOR_TIDBITS[stateName];
  const [dismissed, setDismiss] = useState(false);
  const [hovered,   setHovered] = useState(false);
  const [color]                 = useState(() => Math.random() < 0.5 ? '#FF4E00' : '#40E0D0');
  const timerRef                = useRef(null);

  useEffect(() => { ensureFlickerStyle(); }, []);

  const triggerDismiss = () => {
    setDismiss(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, 320); // wait for slide-out to finish
  };

  const startTimer = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(triggerDismiss, 3500);
  };

  useEffect(() => {
    startTimer();
    return () => clearTimeout(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!author) return null;

  const W          = 168, H = 78;
  const CLIP       = 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)';
  const isOrange   = color === '#FF4E00';
  const borderColor = isOrange ? '#FF7040' : '#70F0E0';
  const depthColor  = isOrange ? '#CC3E00' : '#22A898';
  const glowAnim    = isOrange ? 'neon-glow-flicker-orange' : 'neon-glow-flicker-teal';

  return createPortal(
    // Slide animation wrapper
    <div style={{
      position:  'absolute',
      top:       '80px',
      left:      '16px',
      zIndex:    1000,
      animation: dismissed
        ? 'tidbit-slide-out 0.3s ease forwards'
        : 'tidbit-slide-in 0.35s ease forwards',
    }}>
      {/* Hover-scale + pointer wrapper */}
      <div
        style={{
          cursor:          'pointer',
          transform:       `scale(${hovered ? 1.04 : 1})`,
          transformOrigin: 'left center',
          transition:      'transform 0.2s ease',
        }}
        onMouseEnter={() => { setHovered(true);  clearTimeout(timerRef.current); }}
        onMouseLeave={() => { setHovered(false); startTimer(); }}
        onClick={() => {
          triggerDismiss();
          window.open(`${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/author?state=${encodeURIComponent(stateName)}`, '_blank', 'noopener noreferrer');
        }}
      >
        {/* Container — extra height for depth shadow offset */}
        <div style={{ position: 'relative', width: W, height: H + 7 }}>

          {/* Depth / extrusion layer — 5px down and right, no animation */}
          <div style={{
            position:  'absolute',
            top:       5,
            left:      5,
            width:     W,
            height:    H,
            clipPath:  CLIP,
            background: depthColor,
            zIndex:    0,
          }} />

          {/* Main face: thin lighter border (2px padding showing through) + flickering glow via filter */}
          <div style={{
            position:   'absolute',
            top:        0,
            left:       0,
            width:      W,
            height:     H,
            clipPath:   CLIP,
            background: borderColor,
            padding:    '2px',
            boxSizing:  'border-box',
            zIndex:     1,
            animation:  `${glowAnim} 4s ease-in-out infinite`,
          }}>
            {/* Solid fill inner */}
            <div style={{
              width:          '100%',
              height:         '100%',
              clipPath:       CLIP,
              background:     color,
              display:        'flex',
              flexDirection:  'column',
              justifyContent: 'center',
              padding:        '8px 20px 8px 14px',
              boxSizing:      'border-box',
            }}>
              <p style={{
                fontFamily:    'Bungee, sans-serif',
                fontSize:      '10px',
                color:         '#1A1B2E',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                margin:        0,
                lineHeight:    1.2,
              }}>
                {author.name}
              </p>
              <p style={{
                fontFamily:      'Special Elite, serif',
                fontSize:        '9px',
                color:           '#1A1B2E',
                margin:          '4px 0 0',
                lineHeight:      1.4,
                overflow:        'hidden',
                display:         '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}>
                {author.tidbit}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    map.getContainer()
  );
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
      const res = await searchPlaces(query);
      setResults(res);
      if (res.length > 0 && inputRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        setDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width });
        setShowResults(true);
      } else {
        setShowResults(false);
      }
      setSearching(false);
    }, 500);
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

  const typeEmoji = {
    bookstore: '📚', cafe: '☕', landmark: '🌲', drivein: '🎬', festival: '🎪',
    museum: '🏛️', restaurant: '🍽️', park: '🌲', historicSite: '🏰',
    artGallery: '🎨', observatory: '🔭', aquarium: '🐠', theater: '🎭',
    search: '📍',
  };

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

const MasterMap = ({ selectedStates, onHome, onShowProfile, onShowLogin, onShowResources, onShowLibrary, onShowAbout, onShowEthics, onShowCredits, onShowDayTrip, onShowFestivalTrip, onShowBadges, onShowPrivacy, routeStateRef, onBackToPlanner }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Initialize from saved ref so route survives navigating away and back
  const saved = routeStateRef?.current ?? {};
  // Determine initial UI mode — go to explore if there's existing route/state data
  const hasExploreState = (saved.route?.length > 0) || (saved.visibleLocations?.length > 0) || (selectedStates?.length > 0);
  const [uiMode, setUiMode] = useState(hasExploreState ? 'explore' : 'stateSelect');
  // Local copy of active states — initialized from prop, updated when user clicks EXPLORE
  const [activeStates, setActiveStates] = useState(selectedStates ?? []);
  // State-selection overlay state
  const [ssGeoJson, setSsGeoJson] = useState(null);
  const [ssLoadError, setSsLoadError] = useState(false);
  const [ssHovered, setSsHovered] = useState('');
  const [ssSelected, setSsSelected] = useState(new Set());
  const ssSelectedRef = useRef(new Set());
  const ssLayersRef = useRef({});
  const [tidbitState, setTidbitState] = useState(null); // state name whose author tidbit is visible
  const tidbitTimerRef = useRef(null);                  // 600ms debounce for hover trigger
  const [startCity, setStartCity] = useState(saved.startCity ?? '');
  const [endCity, setEndCity] = useState(saved.endCity ?? '');
  const [startPickedCoords, setStartPickedCoords] = useState(null);
  const [endPickedCoords,   setEndPickedCoords]   = useState(null);
  const handleStartPlaceSelect = (s) => setStartPickedCoords(s?.lat ? { lat: s.lat, lng: s.lng } : null);
  const handleEndPlaceSelect   = (s) => setEndPickedCoords(s?.lat   ? { lat: s.lat, lng: s.lng } : null);
  const [route, setRoute] = useState(saved.route ?? []);
  const [visibleLocations, setVisibleLocations] = useState(
    (saved.visibleLocations ?? []).map(s =>
      s.lat == null && s.coords?.length ? { ...s, lat: s.coords[0], lng: s.coords[1] } : s
    )
  );
  const [showPlanner, setShowPlanner] = useState(saved.showPlanner ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // pendingLocation: one-time trigger from StateSelector; persistedLocation: survives nav away/back
  const [selectedLocation, setSelectedLocation] = useState(
    saved.pendingLocation ?? saved.persistedLocation ?? null
  );
  const [shelfTab, setShelfTab] = useState('info'); // 'info' | 'guestbook' | 'tale' | 'postcard'
  const [showTaleModal, setShowTaleModal] = useState(false);
  const [starburstIds, setStarburstIds] = useState(new Set());
  const [tripItems, setTripItems] = useState([]);
  const [showRoadTrip, setShowRoadTrip] = useState(false);
  const [activeTripStops, setActiveTripStops] = useState(saved.tripStops ?? []);
  const [showUserMenu, setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const [showJourneysMenu, setShowJourneysMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTarget, setSearchTarget] = useState(null);
  const [showSaveRouteModal, setShowSaveRouteModal] = useState(false);
  const [showMyStopsNavigate, setShowMyStopsNavigate] = useState(false);
  const [showRouteNavigate, setShowRouteNavigate] = useState(false);
  const [fitTarget, setFitTarget] = useState(null);
  const [loadedRoute, setLoadedRoute] = useState(null);
  const [itineraryRoute, setItineraryRoute] = useState(null);   // day/festival trips shown as list
  const [loadedRouteType, setLoadedRouteType] = useState(saved.routeType ?? 'literary');
  const [pendingSavePrompt, setPendingSavePrompt]   = useState(!!saved.pendingSavePrompt);
  const [savingRoute, setSavingRoute] = useState(false);
  const [saveRouteError, setSaveRouteError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareRouteData, setShareRouteData] = useState(null);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [userCar, setUserCar] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [locationCars, setLocationCars] = useState({});  // { [locationId]: Car[] }
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInError, setCheckInError] = useState('');
  const [newBadges, setNewBadges]           = useState([]);
  const [earnedBadgeData, setEarnedBadgeData] = useState([]);
  const [honkingLocationId, setHonkingLocationId] = useState(null);
  const [honkToast, setHonkToast] = useState(null);   // { fromName, locationName }
  const [honkMessage, setHonkMessage] = useState(''); // rate-limit feedback
  const honkToastTimerRef = useRef(null);
  const honkMsgTimerRef = useRef(null);
  const carSubsRef = useRef({});
  const userMenuRef = useRef(null);       // desktop profile container
  const mobileMenuRef = useRef(null);     // mobile profile container
  const [shelfSnap, setShelfSnap] = useState('half'); // mobile: 'mini'|'half'|'full'
  const [shelfDeskMinimized, setShelfDeskMinimized] = useState(false);
  const shelfRef = useRef(null);
  const shelfDragRef = useRef(null);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const infoMenuRef = useRef(null);
  const journeysMenuRef = useRef(null);
  const [dcPillPos, setDcPillPos] = useState(null); // null = default CSS position
  const [listeningMode, setListeningMode] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e) => {
      const insideMenu = userMenuRef.current?.contains(e.target) ||
                         mobileMenuRef.current?.contains(e.target);
      if (!insideMenu) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  useEffect(() => {
    if (!showInfoMenu) return;
    const close = (e) => { if (!infoMenuRef.current?.contains(e.target)) setShowInfoMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showInfoMenu]);

  useEffect(() => {
    if (!showMobileMenu) return;
    const close = (e) => { if (!mobileMenuRef.current?.contains(e.target)) setShowMobileMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showMobileMenu]);

  useEffect(() => {
    if (!showJourneysMenu) return;
    const onMouse = (e) => { if (!journeysMenuRef.current?.contains(e.target)) setShowJourneysMenu(false); };
    const onKey   = (e) => { if (e.key === 'Escape') setShowJourneysMenu(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onMouse); document.removeEventListener('keydown', onKey); };
  }, [showJourneysMenu]);

  // Fetch GeoJSON for state-selection overlay (lazy — only when entering stateSelect mode)
  useEffect(() => {
    if (uiMode !== 'stateSelect' || ssGeoJson || ssLoadError) return;
    fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(setSsGeoJson)
      .catch(() => setSsLoadError(true));
  }, [uiMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset shelf snap/minimize when a new location is opened
  useEffect(() => {
    if (selectedLocation) { setShelfSnap('half'); setShelfDeskMinimized(false); }
  }, [selectedLocation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear pendingLocation from ref after mount so it doesn't survive future navigations
  useEffect(() => {
    if (routeStateRef?.current?.pendingLocation) {
      routeStateRef.current.pendingLocation = null;
    }
    // Fire near-me search if navigated here from the state selector's NEAR ME button
    if (routeStateRef?.current?.pendingNearMe) {
      routeStateRef.current.pendingNearMe = false;
      handleNearMe();
    }
    // Set fitBounds and loadedRoute panel when a saved route is loaded externally (e.g. shared URL)
    if (routeStateRef?.current?.pendingLoadedRoute) {
      const pending = routeStateRef.current.pendingLoadedRoute;
      routeStateRef.current.pendingLoadedRoute = null;
      setLoadedRoute(pending);
      setUiMode('explore');
      if (pending.myStops?.length) setCurrentRouteStops(pending.myStops);
      const coords = typeof pending.routeCoordinates === 'string'
        ? JSON.parse(pending.routeCoordinates)
        : (pending.routeCoordinates || []);
      const boundsPoints = coords.length > 0
        ? coords
        : (pending.stops || [])
            .filter(s => s.lat != null || s.coords?.length)
            .map(s => [s.lat ?? s.coords?.[0], s.lng ?? s.coords?.[1]]);
      if (boundsPoints.length > 0) {
        const lats = boundsPoints.map(p => p[0]);
        const lngs = boundsPoints.map(p => p[1]);
        setFitTarget({
          bounds: [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
          options: { padding: [70, 70], maxZoom: 13 },
        });
      }
    }
    // Open a specific landmark when navigated here via ?landmark=id (e.g. from author page)
    if (routeStateRef?.current?.pendingLandmark) {
      const landmarkId = routeStateRef.current.pendingLandmark;
      routeStateRef.current.pendingLandmark = null;
      (async () => {
        try {
          const snap = await getDoc(doc(db, 'literary_landmarks', landmarkId));
          if (snap.exists()) {
            const landmark = { id: snap.id, ...snap.data(), type: 'landmark' };
            setSelectedLocation(landmark);
            setFitTarget({ center: [landmark.lat, landmark.lng], zoom: 14 });
            setUiMode('explore');
          }
        } catch (e) {
          console.error('[MasterMap] pendingLandmark fetch failed', e);
        }
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset shelf tab and transient state whenever a new location is opened
  useEffect(() => { setShelfTab('info'); setShowTaleModal(false); setCheckInError(''); }, [selectedLocation?.id]);

  // Focus the shelf when a location opens (screen reader accessibility)
  useEffect(() => {
    if (selectedLocation) {
      setTimeout(() => shelfRef.current?.focus(), 50);
    }
  }, [selectedLocation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop any running narration when location changes or shelf closes
  useEffect(() => {
    window.speechSynthesis?.cancel();
  }, [selectedLocation?.id]);

  // Stop speech when listening mode is turned off
  useEffect(() => {
    if (!listeningMode) window.speechSynthesis?.cancel();
  }, [listeningMode]);

  // Auto-read landmark description when shelf opens in listening mode
  useEffect(() => {
    if (!listeningMode || !selectedLocation || selectedLocation.type !== 'landmark') return;
    const parts = [
      selectedLocation.name ? `${selectedLocation.name}.` : '',
      selectedLocation.city && selectedLocation.state
        ? `Located in ${selectedLocation.city}, ${selectedLocation.state}.`
        : (selectedLocation.city || selectedLocation.state || ''),
      selectedLocation.description || selectedLocation.reflection || '',
    ].filter(Boolean);
    const text = parts.join(' ');
    if (!text.trim()) return;
    const timer = setTimeout(() => {
      window.speechSynthesis?.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v =>
          v.name.includes('Samantha') || v.name.includes('Google US English') || v.name.includes('Karen')
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        if (preferred) utterance.voice = preferred;
        window.speechSynthesis.speak(utterance);
      };
      if (window.speechSynthesis.getVoices().length) setVoiceAndSpeak();
      else {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          setVoiceAndSpeak();
        };
      }
    }, 400);
    return () => { clearTimeout(timer); window.speechSynthesis?.cancel(); };
  }, [selectedLocation?.id, listeningMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Announce route when plotted in listening mode
  useEffect(() => {
    if (!listeningMode || route.length === 0) return;
    setAnnouncement(`Route plotted with ${visibleLocations.length} literary stop${visibleLocations.length !== 1 ? 's' : ''}.`);
  }, [route.length, listeningMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear announcement after screen reader has had time to read it
  useEffect(() => {
    if (!announcement) return;
    const t = setTimeout(() => setAnnouncement(''), 5000);
    return () => clearTimeout(t);
  }, [announcement]);

  // Pre-fetch ratings for all bookstore/cafe pins so starbursts show immediately on the map
  useEffect(() => {
    const eligible = visibleLocations.filter(
      (l) => l.type === 'bookstore' || l.type === 'cafe' || l.type === 'drivein'
    );
    if (!eligible.length) return;
    let cancelled = false;
    Promise.all(
      eligible.map((loc) =>
        getDoc(doc(db, 'locationRatings', loc.id))
          .then((snap) => (snap.exists() && snap.data().hasStarburst ? loc.id : null))
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      const starred = results.filter(Boolean);
      if (!starred.length) return;
      setStarburstIds((prev) => {
        const next = new Set(prev);
        starred.forEach((id) => next.add(id));
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [visibleLocations]);

  // Sync route state back to ref so it survives navigation (MasterMap unmounts/remounts)
  useEffect(() => { if (routeStateRef) routeStateRef.current.startCity = startCity; }, [startCity, routeStateRef]);
  useEffect(() => { if (routeStateRef) routeStateRef.current.endCity = endCity; }, [endCity, routeStateRef]);
  useEffect(() => { if (routeStateRef) routeStateRef.current.route = route; }, [route, routeStateRef]);
  useEffect(() => { if (routeStateRef) routeStateRef.current.visibleLocations = visibleLocations; }, [visibleLocations, routeStateRef]);
  useEffect(() => { if (routeStateRef) routeStateRef.current.showPlanner = showPlanner; }, [showPlanner, routeStateRef]);
  // Sync open stop so navigating to Profile/Snacks/Ethics and back restores The Shelf
  useEffect(() => { if (routeStateRef) routeStateRef.current.persistedLocation = selectedLocation; }, [selectedLocation, routeStateRef]);

  const tripIds = useMemo(() => new Set(tripItems.map((i) => i.id)), [tripItems]);

  // Sort stops by their geographic position along the route polyline (nearest-to-start first)
  const sortStopsAlongRoute = (stops, routePoints) => {
    if (!routePoints?.length || stops.length <= 1) return stops;
    // Build cumulative distance array for the route
    const cumDist = [0];
    for (let i = 1; i < routePoints.length; i++) {
      const [la1, lo1] = routePoints[i - 1];
      const [la2, lo2] = routePoints[i];
      const R = 3958.8, dLat = (la2 - la1) * Math.PI / 180, dLon = (lo2 - lo1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      cumDist.push(cumDist[i - 1] + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }
    const posOf = (stop) => {
      const [slat, slng] = stop.coords ?? (stop.lat != null ? [stop.lat, stop.lng] : [0, 0]);
      let minD = Infinity, bestPos = 0;
      for (let i = 0; i < routePoints.length; i++) {
        const [la, lo] = routePoints[i];
        const dLat = (la - slat) * Math.PI / 180, dLon = (lo - slng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(slat * Math.PI / 180) * Math.cos(la * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const d = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (d < minD) { minD = d; bestPos = cumDist[i]; }
      }
      return bestPos;
    };
    return [...stops].sort((a, b) => posOf(a) - posOf(b));
  };

  // Route-specific stops for THIS navigation session — separate from the global Road Trip bag.
  // Resets when route is cleared or a different route is loaded.
  const [currentRouteStops, setCurrentRouteStops] = useState([]);
  const currentRouteStopIds = useMemo(() => new Set(currentRouteStops.map(s => s.id)), [currentRouteStops]);

  // Permanent bookmarks — users/{uid}/savedStops subcollection
  const [savedStops, setSavedStops] = useState([]);
  const savedStopIds = useMemo(() => new Set(savedStops.map(s => s.id)), [savedStops]);

  // Spread co-located markers across types so they don't hide each other.
  // Groups any two markers within ~60 m of each other and fans them out ~30 m apart.
  const spreadMap = useMemo(() => {
    const TYPES = new Set(['landmark','festival','drivein','bookstore','cafe']);
    const markers = visibleLocations.filter(l => TYPES.has(l.type));
    const THRESHOLD = 0.0006; // ~60 m
    const RADIUS    = 0.00028; // ~30 m
    const offsets   = {};
    const processed = new Set();

    for (let i = 0; i < markers.length; i++) {
      const a = markers[i];
      if (processed.has(a.id)) continue;
      const group = [a];
      for (let j = i + 1; j < markers.length; j++) {
        const b = markers[j];
        if (processed.has(b.id)) continue;
        if (Math.abs(a.lat - b.lat) < THRESHOLD && Math.abs(a.lng - b.lng) < THRESHOLD) {
          group.push(b);
        }
      }
      if (group.length > 1) {
        group.forEach((m, k) => {
          processed.add(m.id);
          const angle = (2 * Math.PI * k) / group.length - Math.PI / 2;
          offsets[m.id] = [a.lat + RADIUS * Math.cos(angle), a.lng + RADIUS * Math.sin(angle)];
        });
      }
    }
    return offsets;
  }, [visibleLocations]);

  const handleSaveStop = (location) => {
    if (!user) { onShowLogin(); return; }
    saveStop(user.uid, location).catch(err => console.error('[savedStops] save error:', err));
  };

  const handleUnsaveStop = (locationId) => {
    if (!user) return;
    unsaveStop(user.uid, locationId).catch(err => console.error('[savedStops] unsave error:', err));
  };

  const handleRouteStopToggle = (location) => {
    setCurrentRouteStops(prev =>
      currentRouteStopIds.has(location.id)
        ? prev.filter(s => s.id !== location.id)
        : [...prev, location]
    );
  };

  // Smart placeholder city hints: first selected state → start, last selected state → end
  const cityHint = useMemo(() => {
    if (!activeStates.length) return { start: null, end: null };
    const firstInfo = STATE_MAJOR_CITIES[activeStates[0]];
    const lastInfo  = STATE_MAJOR_CITIES[activeStates[activeStates.length - 1]];
    if (activeStates.length === 1 && firstInfo) {
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
  }, [activeStates]);

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
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setTripItems(d.trip || []);
          setUserCar(d.selectedCar || null);
          setSoundEnabled(d.soundEnabled !== false); // default true
        } else {
          setTripItems([]);
          setUserCar(null);
          setSoundEnabled(true);
        }
      },
      (err) => console.error('[MasterMap] trip sync:', err),
    );
    return unsub;
  }, [user]);

  // Saved routes: stream from Firestore for logged-in users
  useEffect(() => {
    if (!user) { setSavedRoutes([]); return; }
    return subscribeToSavedRoutes(user.uid, setSavedRoutes);
  }, [user]);

  // Badge subscription for earned count (hamburger badge count)
  useEffect(() => {
    if (!user) { setEarnedBadgeData([]); return; }
    return subscribeToUserBadges(user.uid, setEarnedBadgeData);
  }, [user]);

  // Saved stops (permanent bookmarks): stream from Firestore
  useEffect(() => {
    if (!user) { setSavedStops([]); return; }
    return subscribeSavedStops(user.uid, setSavedStops);
  }, [user]);

  // Incoming honk notifications
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'honkNotifications', user.uid), (snap) => {
      if (!snap.exists() || !snap.data().pending) return;
      const { fromName, locationName } = snap.data();
      clearTimeout(honkToastTimerRef.current);
      setHonkToast({ fromName, locationName });
      showBrowserHonkNotification(fromName, locationName);
      honkToastTimerRef.current = setTimeout(() => {
        setHonkToast(null);
        clearHonkNotification(user.uid);
      }, 5000);
    });
    return () => { unsub(); clearTimeout(honkToastTimerRef.current); };
  }, [user]);

  // Car check-in subscriptions: one listener per visible bookstore/cafe
  useEffect(() => {
    const eligible = visibleLocations
      .filter(l => l.type === 'bookstore' || l.type === 'cafe')
      .map(l => l.id);
    const eligibleSet = new Set(eligible);
    const subs = carSubsRef.current;

    // Unsub from locations that are no longer visible
    Object.keys(subs).forEach(id => {
      if (!eligibleSet.has(id)) {
        subs[id]();
        delete subs[id];
      }
    });

    // Subscribe to newly visible locations
    eligible.forEach(id => {
      if (!subs[id]) {
        subs[id] = subscribeToLocationCars(id, (cars) => {
          setLocationCars(prev => ({ ...prev, [id]: cars }));
        });
      }
    });

    return () => {
      Object.values(carSubsRef.current).forEach(fn => fn());
      carSubsRef.current = {};
    };
  }, [visibleLocations]);

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
      setUserCar(null);
      if (routeStateRef) {
        routeStateRef.current = { startCity: '', endCity: '', route: [], visibleLocations: [], showPlanner: true };
      }
      setCurrentRouteStops([]);
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
    if (!user || !activeStates.length) return;
    setDoc(
      doc(db, 'users', user.uid),
      { visitedStates: arrayUnion(...activeStates) },
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

  const handleStarburstChange = (locationId, hasStarburst) => {
    setStarburstIds((prev) => {
      const next = new Set(prev);
      if (hasStarburst) next.add(locationId);
      else next.delete(locationId);
      return next;
    });
  };

  const handleRemoveFromTrip = (id) => {
    const updated = tripItems.filter((i) => i.id !== id);
    setTripItems(updated);
    if (user) { saveTripToFirestore(updated); } else { removeFromTrip(id); }
  };

  const handleClearTrip = () => {
    setTripItems([]);
    if (user) { saveTripToFirestore([]); } else { clearTrip(); }
  };

  const handleSaveRoute = async (routeName, notes) => {
    if (!user) return;
    setSavingRoute(true);
    setSaveRouteError('');
    console.log('[MasterMap] handleSaveRoute called — user:', user.uid, 'route points:', route.length, 'stops:', visibleLocations.length);
    try {
      await saveRoute(user.uid, {
        routeName,
        notes,
        startCity,
        endCity,
        selectedStates: activeStates,
        routeType: loadedRouteType,
        routeCoordinates: route,
        stops: visibleLocations,
        myStops: currentRouteStops,
      });
      console.log('[MasterMap] handleSaveRoute — success, closing modal');
      setShowSaveRouteModal(false);
      setSaveRouteError('');
    } catch (err) {
      console.error('[MasterMap] handleSaveRoute — FAILED:', err.code, err.message);
      if (err.code === 'permission-denied') {
        setSaveRouteError('Save failed: Firestore permissions. Add a savedRoutes subcollection rule in Firebase Console.');
      } else {
        setSaveRouteError(`Save failed: ${err.message}`);
      }
    } finally {
      setSavingRoute(false);
    }
  };

  const handleLoadRoute = (savedRoute) => {
    const type = savedRoute.routeType || 'literary';

    // Day/festival trips → itinerary list only, no map
    if (type === 'dayTrip' || type === 'festivalTrip') {
      // Normalize stops that only have coords:[lat,lng] so NAVIGATE button works
      const normalizedStops = (savedRoute.stops || []).map(s =>
        s.lat == null && s.coords?.length ? { ...s, lat: s.coords[0], lng: s.coords[1] } : s
      );
      setItineraryRoute({ ...savedRoute, stops: normalizedStops });
      setShowRoadTrip(false);
      return;
    }

    // Literary routes → load on map as normal
    setItineraryRoute(null);
    const coords = typeof savedRoute.routeCoordinates === 'string'
      ? JSON.parse(savedRoute.routeCoordinates)
      : (savedRoute.routeCoordinates || []);
    setRoute(coords);
    // Normalize festival stops that only have coords:[lat,lng] (no lat/lng properties)
    setVisibleLocations(
      (savedRoute.stops || []).map(s =>
        s.lat == null && s.coords?.length ? { ...s, lat: s.coords[0], lng: s.coords[1] } : s
      )
    );
    setStartCity(savedRoute.startCity || '');
    setEndCity(savedRoute.endCity || '');
    setSelectedLocation(null);
    setSearchTarget(null);
    setShowPlanner(false);
    setShowRoadTrip(false);
    // Restore previously selected navigation stops saved with this route
    setCurrentRouteStops(savedRoute.myStops || []);
    // Track which saved route is currently displayed
    setLoadedRoute(savedRoute);
    setLoadedRouteType(type);
    // Switch to explore mode so markers and route line are visible
    setUiMode('explore');

    // Fit map to route bounds. If no polyline (festival/day-trip), use stop coordinates.
    const pts = coords;
    const boundsPoints = pts.length > 0
      ? pts
      : (savedRoute.stops || [])
          .filter(s => s.lat != null || s.coords?.length)
          .map(s => [s.lat ?? s.coords?.[0], s.lng ?? s.coords?.[1]]);

    if (boundsPoints.length > 0) {
      const lats = boundsPoints.map(p => p[0]);
      const lngs = boundsPoints.map(p => p[1]);
      setFitTarget({
        bounds: [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
        options: { padding: [70, 70], maxZoom: 13 },
      });
    }
  };

  const handleCheckIn = async () => {
    if (!user || !selectedLocation || !userCar || checkInLoading) return;
    setCheckInLoading(true);
    setCheckInError('');
    console.log('[MasterMap] handleCheckIn — location:', selectedLocation.id, 'car:', userCar, 'user:', user.uid);
    try {
      // Extract city + state from formatted address, e.g. "123 Main St, Louisville, KY 40202"
      const addrMatch = (selectedLocation.address || '').match(/,\s*([^,]+),\s*([A-Z]{2})(?:\s|,|$)/);
      const locationMeta = {
        locationName: selectedLocation.name || '',
        locationType: selectedLocation.type || 'bookstore',
        city:  addrMatch ? addrMatch[1].trim() : '',
        state: addrMatch ? addrMatch[2].trim() : '',
      };
      const ref = await checkIn(
        user.uid,
        user.displayName || 'Literary Traveler',
        userCar,
        selectedLocation.id,
        selectedLocation.lat,
        selectedLocation.lng,
        locationMeta,
      );
      console.log('[MasterMap] check-in success, doc:', ref.id);
      // Ask for browser notification permission so honks are heard even when tab is backgrounded
      requestHonkNotifPermission();
      // Check for newly earned badges after parking
      checkAndAwardBadges(user.uid).then(newly => {
        if (newly.length > 0) setNewBadges(newly);
      });
    } catch (err) {
      console.error('[MasterMap] check-in FAILED:', err.code, err.message);
      if (err.code === 'permission-denied') {
        setCheckInError('Permission denied — add activeCheckIns rule in Firebase Console.');
      } else {
        setCheckInError(`Check-in failed: ${err.message}`);
      }
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleUnpark = async () => {
    if (!user || !selectedLocation) return;
    const carsHere = locationCars[selectedLocation.id] || [];
    const parked = carsHere.find(c => c.userId === user.uid);
    if (!parked) return;
    deleteCheckIn(selectedLocation.id, parked.id, user.uid).catch(err =>
      console.error('[MasterMap] unpark:', err.code, err.message)
    );
  };

  const _doHonk = (locationId, locationName, toUserIds) => {
    setHonkingLocationId(locationId);
    setTimeout(() => setHonkingLocationId(null), 900);
    playHorn(soundEnabled);
    recordHonk(locationId);
    sendHonkNotifications(toUserIds, user.displayName || 'A Fellow Traveler', locationName)
      .catch(err => console.error('[MasterMap] honk notify:', err));
  };

  const handleHonk = async (locationId, locationName) => {
    if (!user) return;
    const { allowed, reason } = checkHonkAllowed(locationId);
    if (!allowed) {
      const msg = reason === 'rate'
        ? 'Slow down! Max 3 honks per minute.'
        : 'Already honked at these travelers! Try again in 10 min.';
      clearTimeout(honkMsgTimerRef.current);
      setHonkMessage(msg);
      honkMsgTimerRef.current = setTimeout(() => setHonkMessage(''), 3000);
      return;
    }
    const others = (locationCars[locationId] || []).filter(c => c.userId !== user.uid);
    if (!others.length) return;
    const toUserIds = [...new Set(others.map(c => c.userId))];
    _doHonk(locationId, locationName, toUserIds);
  };

  const handleHonkOne = (locationId, locationName, targetUserId) => {
    if (!user || targetUserId === user.uid) return;
    const { allowed, reason } = checkHonkAllowed(locationId);
    if (!allowed) {
      const msg = reason === 'rate'
        ? 'Slow down! Max 3 honks per minute.'
        : 'Already honked at these travelers! Try again in 10 min.';
      clearTimeout(honkMsgTimerRef.current);
      setHonkMessage(msg);
      honkMsgTimerRef.current = setTimeout(() => setHonkMessage(''), 3000);
      return;
    }
    _doHonk(locationId, locationName, [targetUserId]);
  };

  const handleSelectStop = (item) => {
    setShowRoadTrip(false);
    setVisibleLocations(prev => prev.some(l => l.id === item.id) ? prev : [...prev, item]);
    setSelectedLocation(item);
    setSearchTarget({ center: [item.lat, item.lng], zoom: 15 });
    setShowPlanner(false);
  };

  const handleDeleteRoute = (routeId) => {
    if (!user) return;
    deleteSavedRoute(user.uid, routeId).catch(err => console.error('[MasterMap] delete route:', err));
  };

  const handleRenameRoute = (routeId, routeName) => {
    if (!user) return;
    updateRouteName(user.uid, routeId, routeName).catch(err => console.error('[MasterMap] rename route:', err));
  };

  // ── State-selection overlay functions ────────────────────────────────────────
  const toggleStateSelect = (name) => {
    setSsSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      ssSelectedRef.current = next;
      Object.entries(ssLayersRef.current).forEach(([n, layer]) => {
        layer.setStyle(next.has(n) ? SS_SELECTED_STYLE : SS_DEFAULT_STYLE);
      });
      return next;
    });
  };

  const onEachStateFeature = (feature, layer) => {
    const name = feature.properties.name;
    ssLayersRef.current[name] = layer;
    layer.on({
      mouseover: () => {
        layer.setStyle(ssSelectedRef.current.has(name) ? SS_HOVER_SEL_STYLE : SS_HOVER_STYLE);
        setSsHovered(name);
        // 600ms debounce — show tidbit only if user lingers on the state
        clearTimeout(tidbitTimerRef.current);
        if (AUTHOR_TIDBITS[name]) {
          tidbitTimerRef.current = setTimeout(() => setTidbitState(name), 600);
        }
      },
      mouseout: () => {
        layer.setStyle(ssSelectedRef.current.has(name) ? SS_SELECTED_STYLE : SS_DEFAULT_STYLE);
        setSsHovered('');
        // Cancel pending debounce if user left before 600ms
        clearTimeout(tidbitTimerRef.current);
      },
      click: () => toggleStateSelect(name),
    });
  };

  const clearStateSelections = () => {
    setSsSelected(new Set());
    ssSelectedRef.current = new Set();
    Object.values(ssLayersRef.current).forEach(l => l.setStyle(SS_DEFAULT_STYLE));
  };

  const handleExploreStates = () => {
    const statesArray = [...ssSelected];
    setActiveStates(statesArray);
    setUiMode('explore');
    setShowPlanner(true);
    if (statesArray.length > 0) {
      const centers = statesArray.map(s => STATE_CENTERS[s]).filter(Boolean);
      if (centers.length) {
        const lats = centers.map(c => c[0]);
        const lngs = centers.map(c => c[1]);
        const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        const spread = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
        let zoom = 7;
        if (spread > 20) zoom = 4;
        else if (spread > 15) zoom = 5;
        else if (spread > 8) zoom = 6;
        setSearchTarget({ center: [midLat, midLng], zoom });
      }
    }
  };

  // Jump directly into DC — auto-load pins, no route planner
  const handleExploreDC = async () => {
    const DC_LAT = 38.9072, DC_LNG = -77.0369;
    setActiveStates(['District of Columbia']);
    setUiMode('explore');
    setShowPlanner(false);
    setRoute([]);
    setLoadedRoute(null);
    setCurrentRouteStops([]);
    setSearchTarget({ center: [DC_LAT, DC_LNG], zoom: 13 });
    setLoading(true);
    try {
      const [places, nearFestivals, nearDriveIns, nearCurated] = await Promise.all([
        searchNearbyPlaces(DC_LAT, DC_LNG, 10),
        Promise.resolve(getLiteraryFestivalsNear(DC_LAT, DC_LNG, 10)),
        getDriveInsNear(DC_LAT, DC_LNG, 10),
        getCuratedLandmarks([[DC_LAT, DC_LNG]], 10),
      ]);
      const seenIds = new Set();
      const combined = [...places, ...nearFestivals, ...nearDriveIns, ...nearCurated]
        .filter(loc => { if (seenIds.has(loc.id)) return false; seenIds.add(loc.id); return true; });
      setVisibleLocations(combined);
    } catch (err) {
      console.error('[handleExploreDC]', err);
    } finally {
      setLoading(false);
    }
  };

  // Go back to state-selection mode, resetting all route/explore state
  const handleGoHome = () => {
    if (routeStateRef) {
      routeStateRef.current = { startCity: '', endCity: '', route: [], visibleLocations: [], showPlanner: true };
    }
    setStartCity('');
    setEndCity('');
    setRoute([]);
    setVisibleLocations([]);
    setCurrentRouteStops([]);
    setLoadedRoute(null);
    setActiveTripStops([]);
    setSelectedLocation(null);
    setItineraryRoute(null);
    setLoadedRouteType('literary');
    // Reset any highlighted state layers before clearing refs
    Object.values(ssLayersRef.current).forEach(l => l.setStyle(SS_DEFAULT_STYLE));
    // Clear stale layer refs so GeoJSON re-registers handlers on next render
    ssLayersRef.current = {};
    setSsSelected(new Set());
    ssSelectedRef.current = new Set();
    setUiMode('stateSelect');
  };

  // Compute initial map view from all selected states
  const initMapState = (() => {
    const centers = activeStates.map((s) => STATE_CENTERS[s]).filter(Boolean);
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

  const [mapCenter, setMapCenter] = useState(
    saved.pendingLocation?.coords    ? saved.pendingLocation.coords
    : saved.pendingLocation          ? [saved.pendingLocation.lat, saved.pendingLocation.lng]
    : saved.persistedLocation?.coords ? saved.persistedLocation.coords
    : saved.mapCenter                ? saved.mapCenter
    : initMapState.center
  );
  const [mapZoom, setMapZoom] = useState(
    (saved.pendingLocation || saved.persistedLocation) ? 15
    : saved.mapZoom ?? initMapState.zoom
  );

  // Label shown in the planner panel header
  const stateLabel =
    activeStates.length === 1
      ? activeStates[0]
      : activeStates.length <= 3
      ? activeStates.join(' · ')
      : `${activeStates.length} States`;

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

        const [places, nearFestivals, nearDriveIns, nearCurated] = await Promise.all([
          searchNearbyPlaces(latitude, longitude, 15),
          Promise.resolve(getLiteraryFestivalsNear(latitude, longitude, 15)),
          getDriveInsNear(latitude, longitude, 15),
          getCuratedLandmarks([[latitude, longitude]], 15),
        ]);

        // Deduplicate by id in case any location appears in multiple sources
        const seenIds = new Set();
        const combined = [...places, ...nearFestivals, ...nearDriveIns, ...nearCurated]
          .filter(loc => { if (seenIds.has(loc.id)) return false; seenIds.add(loc.id); return true; });

        setSearchTarget({ center: [latitude, longitude], zoom: 12 });
        setVisibleLocations(combined);
        setShowPlanner(false);
        setRoute([]);
        setLoadedRoute(null);
        setCurrentRouteStops([]);
        setUiMode('explore');
        setLoading(false);
        if (listeningMode) {
          setAnnouncement(`Found ${combined.length} nearby literary stop${combined.length !== 1 ? 's' : ''}.`);
        }
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
      const startQuery = activeStates.length === 1 ? `${startCity.trim()}, ${activeStates[0]}` : startCity.trim();
      const endQuery   = activeStates.length === 1 ? `${endCity.trim()}, ${activeStates[0]}`   : endCity.trim();

      // Prefer coords from autocomplete selection (no extra API call);
      // fall back to Mapbox geocoding when user typed a city manually.
      const startCoords = startPickedCoords || await geocodePlace(startQuery);
      const endCoords   = endPickedCoords   || await geocodePlace(endQuery);

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

      // ── Phase 1: bookstores, cafes, libraries, drive-ins, literary landmarks ──
      const [places, curatedLandmarks, driveIns, destPlaces] = await Promise.all([
        searchAlongRoute(routePoints),
        getCuratedLandmarks(allTripPoints, 20),
        getDriveInsAlongRoute(allTripPoints, 20),
        searchNearbyPlacesTiered(endCoords.lat, endCoords.lng),
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

      const festivals = getLiteraryFestivalsAlongRoute(allTripPoints, 100);
      const phase1Locations = [];
      mergeInto(phase1Locations, [...curatedLandmarks, ...driveIns, ...festivals, ...places, ...destPlaces]);
      setVisibleLocations(phase1Locations);
      setUiMode('explore');

      // Fit map to route immediately using fitBounds for accurate city-level zoom
      const lats = routePoints.map(p => p[0]);
      const lngs = routePoints.map(p => p[1]);
      setFitTarget({
        bounds: [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
        options: { padding: [70, 70], maxZoom: 13 },
      });
      setShowPlanner(false);
      setLoading(false);

      // ── Phase 2: Wikipedia — runs in background, merges when ready ──
      Promise.all([
        searchLiteraryAlongRoute(routePoints, 20),
        searchLiteraryLandmarks(endCoords.lat, endCoords.lng, 20),
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

  const handleSearchSelect = async (place) => {
    // Non-literary search results (landmark tagged by Google but not ALA/Wikipedia)
    // get a yellow pin and no Shelf — just zoom + popup
    const isLiteraryResult = place.type === 'bookstore' || place.type === 'cafe' ||
      (place.type === 'landmark' && place.source !== 'search');
    const normalizedPlace = isLiteraryResult ? place : { ...place, type: 'search' };

    if (!isLiteraryResult) {
      // Generic address/city: clear previous route + results, then load nearby literary places
      setRoute([]);
      setLoadedRoute(null);
      setCurrentRouteStops([]);
      setLoading(true);
      setShowPlanner(false);
      setShowSearch(false);

      const { lat, lng } = place;
      const [nearby, nearFestivals, nearDriveIns, nearCurated] = await Promise.all([
        searchNearbyPlacesTiered(lat, lng),
        Promise.resolve(getLiteraryFestivalsNear(lat, lng, 15)),
        getDriveInsNear(lat, lng, 15),
        getCuratedLandmarks([[lat, lng]], 15),
      ]);

      const seenIds = new Set();
      const combined = [normalizedPlace, ...nearby, ...nearFestivals, ...nearDriveIns, ...nearCurated]
        .filter(loc => { if (seenIds.has(loc.id)) return false; seenIds.add(loc.id); return true; });

      setVisibleLocations(combined);
      setSearchTarget({ center: [lat, lng], zoom: 13 });
      setUiMode('explore');
      setLoading(false);
    } else {
      // Literary result: just add it and open the Shelf
      setVisibleLocations((prev) => {
        if (prev.some((l) => l.id === normalizedPlace.id)) return prev;
        return [...prev, normalizedPlace];
      });
      setSearchTarget({ center: [place.lat, place.lng], zoom: 15 });
      setSelectedLocation(place);
      setShowPlanner(false);
      setShowSearch(false);
      setUiMode('explore');
    }
  };

  const handleClearRoute = () => {
    handleGoHome();
  };

  // ── Shelf drag handlers (mobile touch) ─────────────────────────────────────
  const handleShelfDragStart = (e) => {
    const snapPx = { mini: 56, half: window.innerHeight * 0.5, full: window.innerHeight * 0.8 };
    shelfDragRef.current = { startY: e.touches[0].clientY, startH: snapPx[shelfSnap] ?? window.innerHeight * 0.8, snap: shelfSnap };
  };
  const handleShelfDragMove = (e) => {
    if (!shelfDragRef.current) return;
    const dy = e.touches[0].clientY - shelfDragRef.current.startY;
    const newH = Math.max(56, Math.min(window.innerHeight * 0.88, shelfDragRef.current.startH - dy));
    if (shelfRef.current) { shelfRef.current.style.height = newH + 'px'; shelfRef.current.style.transition = 'none'; }
  };
  const handleShelfDragEnd = (e) => {
    if (!shelfDragRef.current) return;
    const dy = e.changedTouches[0].clientY - shelfDragRef.current.startY;
    const order = ['mini', 'half', 'full'];
    const idx = order.indexOf(shelfDragRef.current.snap);
    let next = shelfDragRef.current.snap;
    if (dy > 60) next = order[Math.max(0, idx - 1)];
    else if (dy < -60) next = order[Math.min(2, idx + 1)];
    if (shelfRef.current) { shelfRef.current.style.height = ''; shelfRef.current.style.transition = ''; }
    setShelfSnap(next);
    shelfDragRef.current = null;
  };

  return (
    <div className="relative h-screen w-full">
      {/* Skip navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-midnight-navy focus:text-starlight-turquoise focus:border focus:border-starlight-turquoise focus:rounded focus:font-bungee focus:text-sm"
      >
        Skip to main content
      </a>
      {/* Loading + listening mode announcements for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading && <span>Loading map results...</span>}
        {announcement && <span>{announcement}</span>}
      </div>

      {/* ══════════════════════════════════════════════
           HEADER
      ══════════════════════════════════════════════ */}
      <div className="fixed top-0 left-0 right-0 z-[1000] bg-midnight-navy/95 border-b-2 border-starlight-turquoise px-3 py-2 md:py-4">

        {/* ── Mobile header: hamburger | title | profile ── */}
        <div className="flex items-center md:hidden">

          {/* Hamburger */}
          <button
            onClick={() => setShowHamburger(true)}
            className="flex-shrink-0 text-starlight-turquoise active:text-atomic-orange transition-colors"
            style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Title */}
          <h1 className="flex-1 text-center text-starlight-turquoise font-bungee text-[15px] drop-shadow-[0_0_10px_rgba(64,224,208,0.8)] leading-tight px-2">
            THE LITERARY ROADS
          </h1>

          {/* Listening mode toggle */}
          <button
            aria-label="Toggle listening mode for screen reader users"
            aria-pressed={listeningMode}
            onClick={() => setListeningMode(v => !v)}
            className="flex-shrink-0 flex flex-col items-center transition-colors p-1"
            style={{ color: listeningMode ? '#FF4E00' : '#40E0D0', minWidth: 40, minHeight: 44, justifyContent: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            </svg>
          </button>

          {/* My Trips bookmark */}
          <button onClick={() => setShowRoadTrip(true)} title="My Trips"
            className="relative flex-shrink-0 text-starlight-turquoise active:text-atomic-orange transition-colors"
            style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {(tripItems.length + savedStops.length + savedRoutes.length) > 0 && (
              <span className="absolute top-1 right-1 bg-atomic-orange text-midnight-navy font-bungee text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
                {(tripItems.length + savedStops.length + savedRoutes.length) > 9 ? '9+' : (tripItems.length + savedStops.length + savedRoutes.length)}
              </span>
            )}
          </button>

          {/* Profile / Login */}
          <div ref={mobileMenuRef} style={{ position: 'relative' }} className="flex-shrink-0">
            <button
              onClick={user ? () => setShowMobileMenu(v => !v) : onShowLogin}
              style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              className="text-starlight-turquoise active:text-atomic-orange transition-colors"
              aria-label={user ? 'Profile menu' : 'Log in'}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} className="w-7 h-7 rounded-full" alt="avatar"
                  style={{ border: '1.5px solid #40E0D0', boxShadow: showMobileMenu ? '0 0 8px rgba(64,224,208,0.7)' : 'none' }} />
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </button>
            {user && showMobileMenu && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                minWidth: '160px', zIndex: 9999,
                background: '#0D0E1A', border: '1.5px solid #40E0D0',
                borderRadius: '10px', overflow: 'hidden',
                boxShadow: '0 0 20px rgba(64,224,208,0.25), 0 8px 32px rgba(0,0,0,0.8)',
                animation: 'lr-dropdown-in 0.18s ease',
              }}>
                <button
                  onPointerDown={() => { setShowMobileMenu(false); onShowProfile(); }}
                  className="w-full text-left font-bungee"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', fontSize: 12, color: '#40E0D0', background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 44 }}
                >
                  <ProfileIcon size={20} /> VIEW PROFILE
                </button>
                <div style={{ height: 1, background: 'rgba(64,224,208,0.15)', margin: '0 12px' }} />
                <button
                  onPointerDown={async () => { setShowMobileMenu(false); await logout(); handleGoHome(); }}
                  className="w-full text-left font-bungee"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', fontSize: 12, color: '#FF4E00', background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 44 }}
                >
                  <SignOutIcon size={20} /> SIGN OUT
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Desktop header: home | title | right buttons ── */}
        <div className="hidden md:block relative">
          <style>{`
            @keyframes lr-dropdown-in {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes lr-slide-in-left {
              from { transform: translateX(-100%); }
              to   { transform: translateX(0); }
            }
            @keyframes lr-car-honk {
              0%   { transform: translateY(0)   scale(1);    filter: drop-shadow(0 1px 4px rgba(0,0,0,0.9)); }
              20%  { transform: translateY(-6px) scale(1.15); filter: drop-shadow(0 0 16px rgba(255,220,0,1)) drop-shadow(0 0 8px rgba(255,255,255,0.8)); }
              40%  { transform: translateY(0)   scale(1);    filter: drop-shadow(0 1px 4px rgba(0,0,0,0.9)); }
              60%  { transform: translateY(-4px) scale(1.08); filter: drop-shadow(0 0 10px rgba(255,220,0,0.85)) drop-shadow(0 0 6px rgba(255,255,255,0.6)); }
              80%  { transform: translateY(0)   scale(1);    filter: drop-shadow(0 1px 4px rgba(0,0,0,0.9)); }
              100% { transform: translateY(0)   scale(1);    filter: drop-shadow(0 1px 4px rgba(0,0,0,0.9)); }
            }
            .lr-honking { animation: lr-car-honk 0.85s ease; }
            @keyframes lr-convoy-pulse {
              0%, 100% { box-shadow: 0 0 14px rgba(255,215,0,0.85), 0 0 6px rgba(255,78,0,0.5); }
              50%       { box-shadow: 0 0 28px rgba(255,215,0,1),    0 0 14px rgba(255,78,0,0.8); }
            }
            .lr-convoy { animation: lr-convoy-pulse 1.6s ease-in-out infinite; }
          `}</style>

          {/* Left group: Home + route actions */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {onBackToPlanner && (
              <button onClick={onBackToPlanner} title="Back to planner" aria-label="Back to planner"
                className="text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <button onClick={handleGoHome} title="Home" aria-label="Go to home screen"
              className="text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            {route.length > 0 && (
              <>
                <button
                  onClick={() => { if (user) { setSaveRouteError(''); setShowSaveRouteModal(true); } else { onShowLogin(); } }}
                  className="font-bungee text-[11px] leading-tight tracking-wide text-starlight-turquoise hover:text-atomic-orange transition-colors border border-starlight-turquoise hover:border-atomic-orange rounded px-2 py-1 whitespace-nowrap"
                >
                  SAVE ROUTE
                </button>
                {currentRouteStops.length > 0 && (
                  <button
                    onClick={() => setShowMyStopsNavigate(true)}
                    className="font-bungee text-[11px] leading-tight tracking-wide text-[#FFD700] hover:text-starlight-turquoise transition-colors border border-[#FFD700]/60 hover:border-starlight-turquoise rounded px-2 py-1 whitespace-nowrap"
                    style={{ boxShadow: '0 0 6px rgba(255,215,0,0.25)' }}
                  >
                    ⭐ MY STOPS ({currentRouteStops.length})
                  </button>
                )}
                <button
                  onClick={handleClearRoute}
                  className="font-bungee text-[11px] leading-tight tracking-wide text-atomic-orange hover:text-starlight-turquoise transition-colors border border-atomic-orange hover:border-starlight-turquoise rounded px-2 py-1 whitespace-nowrap"
                >
                  CLEAR ROUTE
                </button>
              </>
            )}
          </div>

          {/* Title */}
          <div className="text-center py-1">
            <h1 className="text-starlight-turquoise font-bungee text-2xl drop-shadow-[0_0_10px_rgba(64,224,208,0.8)] leading-tight">
              THE LITERARY ROADS
            </h1>
            <p className="text-atomic-orange font-special-elite text-sm mt-1">
              {uiMode === 'stateSelect'
                ? 'Click states to select your journey'
                : 'Where every mile is a new chapter'}
            </p>
          </div>

          {/* Right buttons */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Near Me */}
            <button onClick={handleNearMe}
              className="bg-atomic-orange text-midnight-navy font-bungee px-4 py-2 rounded-full hover:bg-starlight-turquoise transition-all shadow-lg flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              NEAR ME
            </button>

            {/* Curated Journeys */}
            <div className="relative" ref={journeysMenuRef}>
              <button onClick={() => setShowJourneysMenu(v => !v)} title="Curated Journeys"
                className={`flex flex-col items-center transition-colors p-1 ${showJourneysMenu ? 'text-atomic-orange' : 'text-starlight-turquoise hover:text-atomic-orange'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="font-bungee text-[10px] leading-tight tracking-wide">JOURNEYS</span>
              </button>
              {showJourneysMenu && (
                <div className="absolute right-0 top-full mt-2 z-[1100] bg-midnight-navy border-2 border-starlight-turquoise rounded-xl shadow-2xl overflow-hidden min-w-[180px]"
                  style={{ boxShadow: '0 0 24px rgba(64,224,208,0.2)' }}
                >
                  <button
                    onClick={() => { setShowJourneysMenu(false); onShowDayTrip?.(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-starlight-turquoise/10 transition-colors border-b border-starlight-turquoise/20"
                  >
                    <div>
                      <p className="text-paper-white font-bungee text-xs">DAY TRIPS</p>
                      <p className="text-chrome-silver/60 font-special-elite text-[10px]">Local literary loop</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowJourneysMenu(false); onShowFestivalTrip?.(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-starlight-turquoise/10 transition-colors"
                  >
                    <div>
                      <p className="text-paper-white font-bungee text-xs">FESTIVAL TRIPS</p>
                      <p className="text-chrome-silver/60 font-special-elite text-[10px]">Plan around a festival</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Search */}
            <button onClick={() => setShowSearch((v) => !v)} title="Search places" aria-label={showSearch ? 'Close search' : 'Search places'}
              aria-expanded={showSearch}
              className={`flex flex-col items-center transition-colors p-1 ${showSearch ? 'text-atomic-orange' : 'text-starlight-turquoise hover:text-atomic-orange'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Listening mode toggle */}
            <button
              aria-label="Toggle listening mode for screen reader users"
              aria-pressed={listeningMode}
              onClick={() => setListeningMode(v => !v)}
              className="flex flex-col items-center transition-colors p-1"
              style={{ color: listeningMode ? '#FF4E00' : '#40E0D0' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
              <span className="font-bungee text-[10px] leading-tight tracking-wide">LISTEN</span>
            </button>

            {/* My Trips */}
            <button onClick={() => setShowRoadTrip(true)} title="My Trips" aria-label="Open my trips"
              className="relative flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {(tripItems.length + savedStops.length + savedRoutes.length) > 0 && (
                <span className="absolute -top-0.5 right-0.5 bg-atomic-orange text-midnight-navy font-bungee text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {(tripItems.length + savedStops.length + savedRoutes.length) > 9 ? '9+' : (tripItems.length + savedStops.length + savedRoutes.length)}
                </span>
              )}
            </button>

            {/* Highway Snacks */}
            <button onClick={onShowResources} title="Highway Snacks"
              className="flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
              </svg>
              <span className="font-bungee text-[10px] leading-tight tracking-wide">SNACKS</span>
            </button>

            {/* Library */}
            {user && (
              <button onClick={onShowLibrary} title="My Library"
                className="flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
              >
                <LibraryIcon size={24} />
                <span className="font-bungee text-[10px] leading-tight tracking-wide">LIBRARY</span>
              </button>
            )}

            {/* AFTERWORD dropdown */}
            <div ref={infoMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowInfoMenu(v => !v)}
                className="flex flex-col items-center transition-colors p-1"
                style={{ color: showInfoMenu ? '#FF4E00' : '#40E0D0' }}
                title="Afterword"
                aria-label="Afterword menu"
                aria-expanded={showInfoMenu}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="font-bungee text-[10px] leading-tight tracking-wide">AFTERWORD</span>
              </button>
              {showInfoMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  minWidth: '170px', zIndex: 9999,
                  background: '#0D0E1A', border: '1.5px solid rgba(255,78,0,0.45)',
                  borderRadius: '10px', overflow: 'hidden',
                  boxShadow: '0 0 20px rgba(255,78,0,0.2), 0 8px 32px rgba(0,0,0,0.7)',
                  animation: 'lr-dropdown-in 0.18s ease',
                }}>
                  {[
                    { label: 'ABOUT',           action: () => { setShowInfoMenu(false); onShowAbout?.(); } },
                    { label: 'CODE OF ETHICS',  action: () => { setShowInfoMenu(false); onShowEthics?.(); } },
                    { label: 'PRIVACY POLICY',  action: () => { setShowInfoMenu(false); onShowPrivacy?.(); } },
                    { label: 'CREDITS',         action: () => { setShowInfoMenu(false); onShowCredits?.(); } },
                  ].map(({ label, action }, i) => (
                    <button key={label} onClick={action}
                      className="font-bungee w-full text-left"
                      style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', fontSize: '11px', letterSpacing: '0.05em', color: '#FF4E00', background: 'transparent', border: 'none', borderTop: i > 0 ? '1px solid rgba(255,78,0,0.12)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,78,0,0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile / Login */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={user ? () => setShowUserMenu((v) => !v) : onShowLogin}
                title={user ? "Traveler's Log" : 'Log In'}
                aria-label={user ? `Open traveler's log for ${user.displayName || 'Literary Traveler'}` : 'Log in'}
                aria-expanded={user ? showUserMenu : undefined}
                className="flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} className="w-6 h-6 rounded-full" alt="avatar"
                    style={{ border: '1.5px solid #40E0D0', boxShadow: showUserMenu ? '0 0 8px rgba(64,224,208,0.7)' : 'none' }} />
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </button>
              {user && showUserMenu && (
                <div style={{
                  position:'absolute', top:'calc(100% + 6px)', right:0,
                  minWidth:'160px', zIndex:9999, background:'#0D0E1A',
                  border:'1.5px solid #40E0D0', borderRadius:'10px',
                  boxShadow:'0 0 24px rgba(64,224,208,0.25), 0 8px 32px rgba(0,0,0,0.7)',
                  overflow:'hidden', animation:'lr-dropdown-in 0.18s ease',
                }}>
                  <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid rgba(64,224,208,0.15)' }}>
                    <p className="font-bungee" style={{ fontSize:'10px', color:'#40E0D0', letterSpacing:'0.06em', lineHeight:1.2 }}>
                      {user.displayName || 'Literary Traveler'}
                    </p>
                    <p className="font-special-elite" style={{ fontSize:'9px', color:'rgba(192,192,192,0.4)', marginTop:'2px' }}>
                      {user.email}
                    </p>
                  </div>
                  <button onClick={() => { setShowUserMenu(false); onShowProfile(); }}
                    className="font-bungee w-full text-left"
                    style={{ display:'flex', alignItems:'center', gap:'10px', padding:'11px 14px', fontSize:'11px', letterSpacing:'0.05em', color:'#40E0D0', background:'transparent', border:'none', cursor:'pointer', transition:'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background='rgba(64,224,208,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background='transparent'}
                  >
                    <ProfileIcon size={14} style={{ flexShrink:0 }} />
                    VIEW PROFILE
                  </button>
                  {user.uid === ADMIN_UID && (
                    <>
                      <div style={{ height:'1px', background:'rgba(64,224,208,0.1)', margin:'0 10px' }} />
                      <button
                        onClick={() => { setShowUserMenu(false); navigate('/gazette'); }}
                        className="font-bungee w-full text-left"
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'11px 14px', fontSize:'11px', letterSpacing:'0.05em', color:'#FFD166', background:'transparent', border:'none', cursor:'pointer', transition:'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background='rgba(255,209,102,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background='transparent'}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        GAZETTE ADMIN
                      </button>
                    </>
                  )}
                  <div style={{ height:'1px', background:'rgba(64,224,208,0.1)', margin:'0 10px' }} />
                  <button onClick={async () => { setShowUserMenu(false); await logout(); handleGoHome(); }}
                    className="font-bungee w-full text-left"
                    style={{ display:'flex', alignItems:'center', gap:'10px', padding:'11px 14px', fontSize:'11px', letterSpacing:'0.05em', color:'#FF4E00', background:'transparent', border:'none', cursor:'pointer', transition:'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background='rgba(255,78,0,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background='transparent'}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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

      {/* ══════════════════════════════════════════════
           MOBILE HAMBURGER DRAWER (mobile only)
      ══════════════════════════════════════════════ */}
      {showHamburger && (
        <div className="md:hidden">
          <HamburgerDrawer
            onClose={() => setShowHamburger(false)}
            onHome={handleGoHome}
            onSearch={() => setShowSearch(v => !v)}
            onNearMe={handleNearMe}
            onMyTrips={() => setShowRoadTrip(true)}
            onLibrary={onShowLibrary}
            onResources={onShowResources}
            onBookLog={onShowLibrary}
            onBadges={onShowBadges}
            tripItems={tripItems}
            earnedBadgeCount={earnedBadgeData.length}
            onDayTrip={onShowDayTrip}
            onFestivalTrip={onShowFestivalTrip}
            onAbout={onShowAbout}
            onEthics={onShowEthics}
            onPrivacy={onShowPrivacy}
            onCredits={onShowCredits}
            route={route}
            loadedRoute={loadedRoute}
            onSaveRoute={() => {
              if (user) { setSaveRouteError(''); setShowSaveRouteModal(true); }
              else { onShowLogin(); }
            }}
            onClearRoute={handleClearRoute}
            onProfile={onShowProfile}
            onLogin={onShowLogin}
            onSignOut={async () => { await logout(); handleGoHome(); }}
          />
        </div>
      )}

            {/* Map */}
      <div id="main-content" className={`h-full ${showSearch ? 'pt-[88px] md:pt-[128px]' : 'pt-11 md:pt-20'}`}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          style={{ background: '#1A1B2E' }}

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
          <FitBoundsController target={fitTarget} />
          <MapPositionTracker routeStateRef={routeStateRef} onMove={setMapCenter} />
          <UiModeController uiMode={uiMode} />

          {/* Author tidbit trapezoid — shown after 600ms hover on a state, auto-dismisses */}
          {uiMode === 'stateSelect' && tidbitState && (
            <AuthorTidbitOverlay
              key={tidbitState}
              stateName={tidbitState}
              onDismiss={() => setTidbitState(null)}
            />
          )}

          {/* Discovered authors strip — horizontal pill row at bottom in state-select mode */}
          {uiMode === 'stateSelect' && (
            <DiscoveredAuthorsStrip
              user={user}
              onAuthorClick={a => window.open(`${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/author?state=${encodeURIComponent(a.state)}`, '_blank', 'noopener noreferrer')}
            />
          )}

          {/* State-selection GeoJSON — shown only in stateSelect mode */}
          {uiMode === 'stateSelect' && ssGeoJson && (
            <GeoJSON
              key="state-select-geojson"
              data={ssGeoJson}
              style={SS_DEFAULT_STYLE}
              onEachFeature={onEachStateFeature}
            />
          )}

          {uiMode === 'explore' && route.length > 1 && (
            <Polyline
              positions={route}
              color="#40E0D0"
              weight={4}
              opacity={0.8}
            />
          )}

          {/* All place markers — only shown in explore mode */}
          {uiMode === 'explore' && <>

          {/* Landmark markers — clustered into neon green badges */}
          <MarkerClusterGroup
            iconCreateFunction={createLandmarkClusterIcon}
            maxClusterRadius={50}
            showCoverageOnHover={false}
            zoomToBoundsOnClick={true}
            spiderfyOnMaxZoom={true}
            chunkedLoading
          >
            {visibleLocations
              .filter(l => l.type === 'landmark')
              .map(location => (
                <Marker
                  key={location.id}
                  position={spreadMap[location.id] ?? [location.lat, location.lng]}
                  icon={createCustomIcon('landmark', starburstIds.has(location.id), currentRouteStopIds.has(location.id), `${location.name}${location.city ? ', ' + location.city : ''} — Literary Landmark`)}
                  eventHandlers={{ click: () => setSelectedLocation(location) }}
                />
              ))
            }
          </MarkerClusterGroup>

          {/* Search-pin markers — gold pin, never clustered */}
          {visibleLocations
            .filter(l => l.type === 'search')
            .map(location => (
              <Marker
                key={location.id}
                position={[location.lat, location.lng]}
                icon={createCustomIcon('search')}
              >
                <Popup className="search-pin-popup">
                  <div style={{ fontFamily: 'Special Elite, serif', minWidth: '140px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '2px' }}>{location.name}</div>
                    {location.address && <div style={{ fontSize: '11px', color: '#888' }}>{location.address}</div>}
                  </div>
                </Popup>
              </Marker>
            ))
          }

          {/* Bookstore markers — closest 5 to map center, never clustered */}
          {visibleLocations
            .filter(l => l.type === 'bookstore')
            .map(l => ({ l, d: distMiles(mapCenter, [l.lat, l.lng]) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 5)
            .map(({ l: location }) => (
              <Marker
                key={location.id}
                position={spreadMap[location.id] ?? [location.lat, location.lng]}
                icon={createCustomIcon('bookstore', starburstIds.has(location.id), currentRouteStopIds.has(location.id), `${location.name}${location.city ? ', ' + location.city : ''} — Bookstore`)}
                eventHandlers={{ click: () => setSelectedLocation(location) }}
              />
            ))
          }

          {/* Cafe markers — closest 5 to map center, never clustered */}
          {visibleLocations
            .filter(l => l.type === 'cafe')
            .map(l => ({ l, d: distMiles(mapCenter, [l.lat, l.lng]) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 5)
            .map(({ l: location }) => (
              <Marker
                key={location.id}
                position={spreadMap[location.id] ?? [location.lat, location.lng]}
                icon={createCustomIcon('cafe', starburstIds.has(location.id), currentRouteStopIds.has(location.id), `${location.name}${location.city ? ', ' + location.city : ''} — Coffee Shop`)}
                eventHandlers={{ click: () => setSelectedLocation(location) }}
              />
            ))
          }

          {/* Festival markers — never clustered (sparse by nature) */}
          {visibleLocations
            .filter(l => l.type === 'festival')
            .map(location => (
              <Marker
                key={location.id}
                position={spreadMap[location.id] ?? [location.lat, location.lng]}
                icon={createCustomIcon('festival', starburstIds.has(location.id), currentRouteStopIds.has(location.id), `${location.name}${location.city ? ', ' + location.city : ''} — Book Festival`)}
                eventHandlers={{ click: () => setSelectedLocation(location) }}
              />
            ))
          }

          {/* Drive-in markers — not clustered (too sparse to benefit) */}
          {visibleLocations
            .filter(l => l.type === 'drivein')
            .map(location => (
              <Marker
                key={location.id}
                position={spreadMap[location.id] ?? [location.lat, location.lng]}
                icon={createCustomIcon('drivein', starburstIds.has(location.id), currentRouteStopIds.has(location.id), `${location.name}${location.city ? ', ' + location.city : ''} — Drive-in Theater`)}
                eventHandlers={{ click: () => setSelectedLocation(location) }}
              />
            ))
          }

          {/* Car check-in badges — rendered above location pins */}
          {Object.entries(locationCars).map(([locationId, cars]) => {
            if (!cars.length) return null;
            const loc = visibleLocations.find(l => l.id === locationId);
            if (!loc) return null;

            const isHonking = honkingLocationId === locationId;
            const userParkedHere = !!user && cars.some(c => c.userId === user.uid);
            const honkHandler = { click: () => handleHonk(locationId, loc.name || locationId) };

            // 5+ cars → convoy starburst with popup listing travelers
            if (cars.length >= 5) {
              const canHonkConvoy = userParkedHere && cars.some(c => c.userId !== user?.uid);
              const locName = loc.name || locationId;
              return (
                <Marker
                  key={`convoy-${locationId}-${isHonking ? 'h' : 'i'}`}
                  position={[loc.lat, loc.lng]}
                  icon={createConvoyIcon(cars.length, isHonking)}
                  interactive={true}
                >
                  <Popup>
                    <div style={{ fontFamily: 'Bungee, sans-serif', minWidth: '170px' }}>
                      <p style={{ color: '#FF4E00', fontSize: '11px', marginBottom: '8px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CarIcon size={14} /> {cars.length} TRAVELERS HERE
                      </p>
                      {cars.map(c => {
                        const isMe = c.userId === user?.uid;
                        const canHonkThis = userParkedHere && !isMe;
                        return (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <img src={carImgSrc(c.carType)} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }} />
                            <span style={{ fontFamily: 'Special Elite, serif', fontSize: '11px', color: '#1A1B2E', flex: 1 }}>
                              {c.userName || 'Traveler'}{isMe ? ' (you)' : ''}
                            </span>
                            {canHonkThis && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleHonkOne(locationId, locName, c.userId); }}
                                style={{
                                  background: '#FF4E00', border: 'none', borderRadius: '4px',
                                  padding: '2px 6px', cursor: 'pointer', flexShrink: 0,
                                  fontFamily: 'Bungee, sans-serif', fontSize: '9px',
                                  color: '#1A1B2E', letterSpacing: '0.04em',
                                }}
                              >
                                📯
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {canHonkConvoy && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleHonk(locationId, locName); }}
                          style={{
                            marginTop: '6px', width: '100%',
                            background: 'linear-gradient(135deg, #FF4E00, #FFD700)',
                            border: 'none', borderRadius: '6px',
                            padding: '5px 8px', cursor: 'pointer',
                            fontFamily: 'Bungee, sans-serif', fontSize: '9px',
                            color: '#1A1B2E', letterSpacing: '0.04em',
                          }}
                        >
                          📯 HONK EVERYONE!
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            }

            // 1–4 cars → individual spread markers
            return cars.map((car, i) => {
              const canHonkThis = userParkedHere && car.userId !== user?.uid;
              return (
                <Marker
                  key={`car-${locationId}-${car.id}-${isHonking ? 'h' : 'i'}`}
                  position={[loc.lat, loc.lng]}
                  icon={createSingleCarIcon(car, isHonking && i === 0, i)}
                  interactive={canHonkThis}
                  title={canHonkThis ? '🚗 Tap to honk!' : undefined}
                  eventHandlers={canHonkThis ? honkHandler : undefined}
                />
              );
            });
          })}

          </>} {/* end uiMode === 'explore' markers */}

        </MapContainer>
      </div>

      {/* ══════════════════════════════════════════════
           STATE-SELECTION OVERLAY (stateSelect mode)
      ══════════════════════════════════════════════ */}
      {uiMode === 'stateSelect' && (
        <>
          {/* D.C. button — draggable; too small to reliably click on the map */}
          <button
            onClick={handleExploreDC}
            onMouseDown={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const offX = e.clientX - rect.left, offY = e.clientY - rect.top;
              let moved = false;
              const onMove = (me) => { moved = true; setDcPillPos({ top: me.clientY - offY, left: me.clientX - offX }); };
              const onUp = (ue) => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                if (moved) ue.stopPropagation();
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              const rect = e.currentTarget.getBoundingClientRect();
              const offX = touch.clientX - rect.left, offY = touch.clientY - rect.top;
              let moved = false;
              const onMove = (te) => { moved = true; te.preventDefault(); const t = te.touches[0]; setDcPillPos({ top: t.clientY - offY, left: t.clientX - offX }); };
              const onEnd = () => {
                window.removeEventListener('touchmove', onMove);
                window.removeEventListener('touchend', onEnd);
              };
              window.addEventListener('touchmove', onMove, { passive: false });
              window.addEventListener('touchend', onEnd);
            }}
            className="font-bungee"
            style={{
              position: 'fixed',
              top:   dcPillPos ? dcPillPos.top  : '4.5rem',
              left:  dcPillPos ? dcPillPos.left : undefined,
              right: dcPillPos ? undefined       : '1rem',
              zIndex: 1002,
              padding: '5px 11px', borderRadius: 8, fontSize: 10, letterSpacing: '0.08em',
              border: '2px solid rgba(64,224,208,0.4)',
              background: 'rgba(26,27,46,0.92)',
              color: '#F5F5DC',
              cursor: 'grab', backdropFilter: 'blur(4px)',
              userSelect: 'none', touchAction: 'none',
            }}
          >
            EXPLORE D.C.
          </button>

          {/* Hovered state label */}
          {ssHovered && (
            <div className="absolute left-1/2 transform -translate-x-1/2 z-[1002] bg-midnight-navy/95 border-2 border-atomic-orange px-6 py-3 rounded-lg pointer-events-none shadow-2xl"
              style={{ bottom: ssSelected.size > 0 ? '10rem' : '2rem' }}
            >
              <p className="text-atomic-orange font-bungee text-xl tracking-wider text-center">{ssHovered}</p>
              <p className="text-paper-white font-special-elite text-xs text-center mt-1">
                {ssSelected.has(ssHovered) ? 'Click to deselect' : 'Click to add to journey'}
              </p>
            </div>
          )}

          {/* Loading indicator */}
          {!ssGeoJson && !ssLoadError && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000]">
              <p className="text-starlight-turquoise font-special-elite text-sm animate-pulse">Loading map...</p>
            </div>
          )}

          {/* Bottom panel: selected chips + EXPLORE button */}
          <div
            className={`z-[1001] bg-midnight-navy/97 border-t-2 border-starlight-turquoise transition-transform duration-300 ease-out ${ssSelected.size > 0 ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
          >
            <div className="h-0.5 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-70" />
            <div className="p-4 pb-2">
              <div className="flex flex-wrap gap-2 mb-3 max-h-20 overflow-y-auto">
                {[...ssSelected].map(state => (
                  <button key={state} onClick={() => toggleStateSelect(state)}
                    className="bg-starlight-turquoise/15 text-starlight-turquoise border border-starlight-turquoise font-special-elite text-xs px-3 py-1 rounded-full flex items-center gap-1 hover:bg-atomic-orange/20 hover:border-atomic-orange hover:text-atomic-orange transition-all"
                  >
                    {state}<span className="text-sm leading-none ml-0.5">×</span>
                  </button>
                ))}
              </div>
              <button onClick={handleExploreStates}
                className="w-full bg-atomic-orange text-midnight-navy font-bungee py-4 rounded-lg hover:bg-starlight-turquoise transition-all shadow-lg text-base"
              >
                EXPLORE {ssSelected.size} STATE{ssSelected.size > 1 ? 'S' : ''} →
              </button>
            </div>
          </div>

          {/* Fallback: GeoJSON failed — show dropdown selector */}
          {ssLoadError && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-midnight-navy/95 border-4 border-starlight-turquoise rounded-lg p-6 max-w-sm w-full shadow-2xl">
              <h2 className="text-starlight-turquoise font-bungee text-xl mb-2 text-center drop-shadow-[0_0_10px_rgba(64,224,208,0.8)]">Choose Your States</h2>
              <p className="text-paper-white font-special-elite text-xs mb-3 text-center">Hold Ctrl / Cmd to select multiple</p>
              <select multiple size={8}
                onChange={e => {
                  const vals = new Set([...e.target.selectedOptions].map(o => o.value));
                  setSsSelected(vals);
                  ssSelectedRef.current = vals;
                }}
                className="w-full bg-black/50 border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-1 rounded focus:outline-none focus:border-atomic-orange text-sm mb-3"
              >
                {SS_FALLBACK_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {ssSelected.size > 0 && (
                <button onClick={handleExploreStates}
                  className="w-full bg-atomic-orange text-midnight-navy font-bungee py-3 rounded-lg hover:bg-starlight-turquoise transition-all"
                >
                  EXPLORE {ssSelected.size} STATE{ssSelected.size > 1 ? 'S' : ''} →
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Honk received toast ── */}
      {honkToast && (
        <div
          style={{
            position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 3000, background: '#0D0E1A', border: '2px solid #FF4E00',
            borderRadius: '12px', padding: '10px 16px',
            boxShadow: '0 0 24px rgba(255,78,0,0.5), 0 4px 20px rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', gap: '10px',
            animation: 'lr-dropdown-in 0.2s ease',
            width: 'max-content', maxWidth: 'min(380px, calc(100vw - 32px))',
          }}
        >
          <CarIcon size={20} />
          <div>
            <p className="font-bungee" style={{ fontSize: '11px', color: '#FF4E00', letterSpacing: '0.05em' }}>
              BEEP BEEP!
            </p>
            <p className="font-special-elite" style={{ fontSize: '12px', color: '#F5F5DC', lineHeight: 1.3 }}>
              <strong>{honkToast.fromName}</strong> honked at you at {honkToast.locationName}!
            </p>
          </div>
          <button
            onClick={() => { setHonkToast(null); clearHonkNotification(user.uid); }}
            style={{ background: 'none', border: 'none', color: 'rgba(192,192,192,0.5)', cursor: 'pointer', fontSize: '16px', padding: '2px', flexShrink: 0 }}
          >×</button>
        </div>
      )}

      {/* ── Honk rate-limit message ── */}
      {honkMessage && (
        <div
          style={{
            position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 3000, background: '#0D0E1A', border: '1.5px solid rgba(192,192,192,0.3)',
            borderRadius: '10px', padding: '8px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            animation: 'lr-dropdown-in 0.2s ease',
            maxWidth: 'calc(100vw - 32px)',
          }}
        >
          <p className="font-special-elite" style={{ fontSize: '12px', color: 'rgba(192,192,192,0.8)', whiteSpace: 'nowrap' }}>
            {honkMessage}
          </p>
        </div>
      )}

      {/* Route Planner — mobile: slide-up from bottom (50vh); desktop: centered dialog */}
      {uiMode === 'explore' && showPlanner && (
        <>
          {/* Mobile bottom drawer
              - maxHeight keeps it below the header on any screen/orientation
              - flex-col pins the gradient+title at top; only inputs scroll */}
          <div
            className="md:hidden animate-slide-up border-t-4 border-starlight-turquoise rounded-t-3xl shadow-2xl flex flex-col"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: 'calc(100vh - 52px)', zIndex: 1001, background: '#0D0E1A' }}
          >
            {/* Pinned: neon accent — never scrolls away */}
            <div className="h-2 flex-shrink-0 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-80"></div>

            {/* Pinned: title + subtitle */}
            <div className="flex-shrink-0 px-4 pt-4 pb-2 text-center">
              <h2 className="text-starlight-turquoise font-bungee text-[1.25rem] mb-1 drop-shadow-[0_0_10px_rgba(64,224,208,0.8)] leading-tight">
                {stateLabel}
              </h2>
              <p className="text-atomic-orange font-special-elite text-[0.875rem]">
                Plot your literary journey
              </p>
            </div>

            {/* Scrollable: inputs + buttons — handles overflow on short/landscape screens */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-2">
                {activeStates.length > 1 && (
                  <p className="text-chrome-silver font-special-elite text-xs text-center">
                    Include state if needed — e.g. "Memphis, TN"
                  </p>
                )}
                <CityAutocomplete
                  value={startCity}
                  onChange={setStartCity}
                  onPlaceSelect={handleStartPlaceSelect}
                  placeholder={cityHint.start ? `Starting city — e.g. ${cityHint.start}` : 'Starting city, e.g. New York City'}
                  className="w-full border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange"
                  style={{ fontSize: '1rem', background: '#1A1B2E' }}
                  selectedStates={activeStates}
                  filterToState={activeStates.length === 1}
                />
                <CityAutocomplete
                  value={endCity}
                  onChange={setEndCity}
                  onPlaceSelect={handleEndPlaceSelect}
                  placeholder={cityHint.end ? `Destination — e.g. ${cityHint.end}` : 'Destination city, e.g. Buffalo'}
                  className="w-full border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange"
                  style={{ fontSize: '1rem', background: '#1A1B2E' }}
                  selectedStates={activeStates}
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
                    onClick={handleGoHome}
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
              {activeStates.length > 1 && (
                <p className="text-chrome-silver font-special-elite text-xs text-center -mb-1">
                  Include state if needed — e.g. "Memphis, TN"
                </p>
              )}
              <div>
                <label className="text-paper-white font-special-elite text-[0.875rem] block mb-1">Starting City</label>
                <CityAutocomplete
                  value={startCity}
                  onChange={setStartCity}
                  onPlaceSelect={handleStartPlaceSelect}
                  placeholder={cityHint.start ? `e.g., ${cityHint.start}` : 'e.g., New York City'}
                  className="w-full bg-black/50 border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange"
                  style={{ fontSize: '1rem' }}
                  selectedStates={activeStates}
                  filterToState={activeStates.length === 1}
                />
              </div>
              <div>
                <label className="text-paper-white font-special-elite text-[0.875rem] block mb-1">Destination City</label>
                <CityAutocomplete
                  value={endCity}
                  onChange={setEndCity}
                  onPlaceSelect={handleEndPlaceSelect}
                  placeholder={cityHint.end ? `e.g., ${cityHint.end}` : 'e.g., Buffalo'}
                  className="w-full bg-black/50 border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange"
                  style={{ fontSize: '1rem' }}
                  selectedStates={activeStates}
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
                onClick={handleGoHome}
                className="w-full bg-transparent text-starlight-turquoise border-2 border-starlight-turquoise font-special-elite py-2 rounded-lg hover:bg-starlight-turquoise hover:text-midnight-navy transition-all text-[0.875rem]"
              >
                ← Change State
              </button>
            </div>
          </div>
        </>
      )}

      {/* Restored-route banner — shown once after sign-in when a pending route was recovered */}
      {pendingSavePrompt && route.length > 0 && user && (
        <div className="absolute top-14 md:top-[84px] inset-x-3 z-[999] flex justify-center pointer-events-none">
          <div className="bg-midnight-navy border-2 border-starlight-turquoise rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-2xl max-w-lg w-full pointer-events-auto">
            <span className="text-starlight-turquoise text-base flex-shrink-0">✓</span>
            <p className="text-paper-white font-special-elite text-sm flex-1 leading-tight">
              Your route was preserved! Ready to save it?
            </p>
            <button
              onClick={() => { setSaveRouteError(''); setShowSaveRouteModal(true); setPendingSavePrompt(false); }}
              className="bg-atomic-orange text-midnight-navy font-bungee text-xs px-3 py-1.5 rounded-lg flex-shrink-0 hover:bg-starlight-turquoise transition-colors"
            >
              SAVE
            </button>
            <button onClick={() => setPendingSavePrompt(false)}
              className="text-chrome-silver/40 hover:text-chrome-silver flex-shrink-0 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Day Trip Progress Panel */}
      {activeTripStops.length > 0 && route.length > 0 && !selectedLocation && (
        <div style={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', zIndex: 1000, maxWidth: '32rem', margin: '0 auto' }}>
          <TripProgressPanel
            stops={activeTripStops}
            startCoords={activeTripStops[0]?.coords ?? null}
            onDismiss={() => setActiveTripStops([])}
          />
        </div>
      )}

      {/* My Stops chip — fixed positioning so iOS Safari toolbar can't obscure it */}
      {currentRouteStops.length > 0 && !selectedLocation && activeTripStops.length === 0 && (
        <div
          style={{
            position: 'fixed',
            left: 12, right: 12,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div className="bg-midnight-navy/97 border-2 rounded-xl px-3 py-2.5 flex items-center gap-3 shadow-2xl max-w-lg w-full md:w-auto"
            style={{ borderColor: 'rgba(255,215,0,0.7)' }}>

            {/* Counter — desktop only (stars on map give enough feedback on mobile) */}
            <span className="hidden md:block font-special-elite text-sm flex-1 leading-tight" style={{ color: '#FFD700' }}>
              ⭐ {currentRouteStops.length} stop{currentRouteStops.length !== 1 ? 's' : ''} in My Stops
            </span>

            {/* Button — full-width with full label on mobile, compact on desktop */}
            <button
              onClick={() => setShowMyStopsNavigate(true)}
              className="flex-1 md:flex-none bg-atomic-orange text-midnight-navy font-bungee rounded-lg hover:bg-starlight-turquoise transition-colors"
              style={{ minHeight: 44, padding: '10px 14px', boxShadow: '0 0 12px rgba(255,78,0,0.4)', fontSize: '0.8rem' }}
            >
              <span className="md:hidden">NAVIGATE MY STOPS</span>
              <span className="hidden md:inline">NAVIGATE →</span>
            </button>
          </div>
        </div>
      )}

      {/* Loaded Route Panel — shown when a saved route is active, no My Stops selected yet */}
      {loadedRoute && !selectedLocation && activeTripStops.length === 0 && currentRouteStops.length === 0 && (
        <div style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', zIndex: 1000, display: 'flex', justifyContent: 'center' }}>
          <div className="bg-midnight-navy border-2 border-starlight-turquoise rounded-xl shadow-2xl px-4 py-3 w-full max-w-lg" style={{ backdropFilter: 'blur(8px)' }}>
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-starlight-turquoise font-bungee text-sm leading-tight truncate drop-shadow-[0_0_6px_rgba(64,224,208,0.6)]">
                  {loadedRoute.routeName}
                </p>
                <p className="text-chrome-silver/60 font-special-elite text-xs mt-0.5">
                  {visibleLocations.length} stop{visibleLocations.length !== 1 ? 's' : ''}
                  {loadedRoute.startCity && loadedRoute.endCity ? ` · ${loadedRoute.startCity} → ${loadedRoute.endCity}` : ''}
                </p>
              </div>
              <button
                onClick={() => { setShowRoadTrip(true); }}
                className="flex-shrink-0 text-chrome-silver/50 hover:text-starlight-turquoise font-special-elite text-xs border border-chrome-silver/20 hover:border-starlight-turquoise px-2 py-1 rounded transition-colors"
              >
                ← MY ROUTES
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRouteNavigate(true)}
                className="flex-1 bg-atomic-orange text-midnight-navy font-bungee text-xs py-2 rounded-lg hover:bg-starlight-turquoise transition-colors"
                style={{ boxShadow: '0 0 10px rgba(255,78,0,0.35)' }}
              >
                NAVIGATE
              </button>
              <button
                onClick={handleClearRoute}
                className="border border-chrome-silver/30 text-chrome-silver/50 hover:text-atomic-orange hover:border-atomic-orange font-bungee text-xs py-2 px-3 rounded-lg transition-colors"
                title="Clear route"
              >
                ✕
              </button>
            </div>
            <p className="text-chrome-silver/40 font-special-elite text-[10px] mt-1.5 text-center">
              Tap any stop on the map · ➕ ADD TO ROUTE to select stops for navigation
            </p>
          </div>
        </div>
      )}

      {/* Route Info — shown when a freshly plotted route has no saved route info and no My Stops */}
      {!loadedRoute && route.length > 0 && !selectedLocation && activeTripStops.length === 0 && currentRouteStops.length === 0 && (
        <div style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', zIndex: 1000, display: 'flex', justifyContent: 'center' }}>
          <div className="bg-midnight-navy/90 border-2 border-atomic-orange px-3 md:px-6 py-1.5 md:py-3 rounded-lg">
            <p className="text-paper-white font-special-elite text-[10px] md:text-sm text-center">
              <span className="text-[#FFD700]">tap a stop then ➕ ADD TO ROUTE to plan navigation</span>
            </p>
          </div>
        </div>
      )}

      {/* Stops-only Info — festival / near-me / day-trip: stops exist but no route polyline */}
      {route.length === 0 && visibleLocations.length > 0 && !selectedLocation && activeTripStops.length === 0 && currentRouteStops.length === 0 && (
        <div style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', zIndex: 1000, display: 'flex', justifyContent: 'center' }}>
          <div className="bg-midnight-navy/90 border-2 border-atomic-orange px-3 md:px-6 py-1.5 md:py-3 rounded-lg flex items-center gap-3">
            <button
              onClick={() => setShowRouteNavigate(true)}
              className="flex-shrink-0 bg-atomic-orange text-midnight-navy font-bungee text-[10px] md:text-xs px-3 py-1.5 rounded-lg hover:bg-starlight-turquoise transition-colors whitespace-nowrap"
            >
              PLAN NAVIGATION
            </button>
          </div>
        </div>
      )}

      {/* THE SHELF - Googie slide-up drawer */}
      {selectedLocation && (() => {
        const isMob = window.innerWidth < 768;
        const isExpanded = isMob ? shelfSnap !== 'mini' : !shelfDeskMinimized;
        const snapH = { mini: '56px', half: '50vh', full: '80vh' }[shelfSnap];
        return (
        <div
          ref={shelfRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedLocation.name} details`}
          tabIndex={-1}
          className="animate-slide-up bg-midnight-navy border-t-4 border-starlight-turquoise rounded-t-3xl shadow-2xl flex flex-col"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
            height: isMob ? snapH : (shelfDeskMinimized ? '56px' : undefined),
            maxHeight: isMob ? undefined : (shelfDeskMinimized ? '56px' : '65vh'),
            overflow: 'hidden',
            transition: 'height 0.28s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Mobile drag handle */}
          <div
            className="md:hidden flex-shrink-0 flex justify-center items-center pt-2.5 pb-1"
            style={{ cursor: 'grab', touchAction: 'none' }}
            onTouchStart={handleShelfDragStart}
            onTouchMove={handleShelfDragMove}
            onTouchEnd={handleShelfDragEnd}
          >
            <div style={{ width: '38px', height: '4px', background: 'rgba(64,224,208,0.35)', borderRadius: '2px' }} />
          </div>

          <div className="h-2 flex-shrink-0 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-80"></div>

          {/* Collapsed bar — tap to expand */}
          {!isExpanded && (
            <button
              className="flex-1 flex items-center px-4 gap-3 w-full"
              onClick={() => isMob ? setShelfSnap('half') : setShelfDeskMinimized(false)}
            >
              <span className="text-starlight-turquoise font-bungee text-sm truncate">{selectedLocation.name}</span>
              <span className="ml-auto text-chrome-silver/50 font-special-elite text-xs whitespace-nowrap">tap to expand ↑</span>
            </button>
          )}

          {/* Scrollable content */}
          {isExpanded && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl mx-auto w-full">
            {/* Close + desktop minimize buttons */}
            <div className="absolute top-3 right-3 md:top-5 md:right-5 flex items-center gap-1.5">
              {/* Desktop minimize */}
              <button
                className="hidden md:flex items-center justify-center w-7 h-7 rounded-full text-chrome-silver/60 hover:text-starlight-turquoise hover:bg-starlight-turquoise/10 transition-colors"
                onClick={() => setShelfDeskMinimized(true)}
                title="Minimize"
                aria-label="Minimize location panel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="4" y="11" width="16" height="2" rx="1"/>
                </svg>
              </button>
              <button
                onClick={() => setSelectedLocation(null)}
                aria-label={`Close ${selectedLocation.name} details`}
                className="text-starlight-turquoise hover:text-atomic-orange transition-colors"
              >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              </button>
            </div>

            {/* Type badge + name — compact single block */}
            <div className="mb-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                {selectedLocation.type === 'bookstore' && (
                  <span className="text-atomic-orange font-bungee text-[10px] px-2 py-0.5 border border-atomic-orange rounded-full">BOOKSTORE</span>
                )}
                {selectedLocation.type === 'cafe' && (
                  <span className="text-starlight-turquoise font-bungee text-[10px] px-2 py-0.5 border border-starlight-turquoise rounded-full">COFFEE SHOP</span>
                )}
                {selectedLocation.type === 'landmark' && (
                  <span className="font-bungee text-[10px] px-2 py-0.5 border rounded-full" style={{ color: '#39FF14', borderColor: '#39FF14' }}>LANDMARK</span>
                )}
                {selectedLocation.type === 'drivein' && (
                  <span className="font-bungee text-[10px] px-2 py-0.5 border rounded-full" style={{ color: '#E040FB', borderColor: '#E040FB' }}>DRIVE-IN</span>
                )}
                {selectedLocation.type === 'festival' && (
                  <span className="font-bungee text-[10px] px-2 py-0.5 border rounded-full" style={{ color: '#B044FB', borderColor: '#B044FB' }}>BOOK FESTIVAL</span>
                )}
                {starburstIds.has(selectedLocation.id) && (
                  <img src="/literary-roads/images/starburst-rating.png" alt="Highly recommended" title="10+ travelers recommend this!" style={{ width: '28px', height: '28px', flexShrink: 0 }} />
                )}
              </div>
              <h2 className="text-starlight-turquoise font-bungee text-base md:text-lg drop-shadow-[0_0_8px_rgba(64,224,208,0.7)] leading-tight">
                {selectedLocation.name}
              </h2>
            </div>

            {/* Audio narration — landmarks only */}
            {selectedLocation.type === 'landmark' && (
              <div className="mb-2">
                <AudioNarrative location={selectedLocation} />
              </div>
            )}

            {/* Pit stop rating — not shown for festivals (they're events, not permanent venues) */}
            {selectedLocation.type !== 'festival' && (
              <PitStopRating
                key={selectedLocation.id}
                locationId={selectedLocation.id}
                user={user}
                onShowLogin={onShowLogin}
                onStarburstChange={handleStarburstChange}
              />
            )}

            {/* Tab bar — bookstores & cafes only */}
            {(selectedLocation.type === 'bookstore' || selectedLocation.type === 'cafe') && (
              <div className="flex gap-1 mb-4 border-b border-white/10 pb-0">
                {[
                  { id: 'info', label: 'INFO' },
                  { id: 'guestbook', label: 'GUESTBOOK' },
                  { id: 'tale', label: "HITCHHIKER'S TALE" },
                  { id: 'postcard', label: 'POSTCARD', icon: <CameraIcon size={11} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setShelfTab(tab.id)}
                    className="font-bungee px-2 py-1.5 rounded-t-lg transition-all relative"
                    style={{
                      fontSize: '8.5px',
                      color: shelfTab === tab.id ? '#40E0D0' : 'rgba(192,192,192,0.5)',
                      background: shelfTab === tab.id ? 'rgba(64,224,208,0.08)' : 'transparent',
                      borderBottom: shelfTab === tab.id ? '2px solid #40E0D0' : '2px solid transparent',
                    }}
                  >
                    {tab.icon
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>{tab.icon}{tab.label}</span>
                      : tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Info (or full content for landmarks + festivals) */}
            {(selectedLocation.type === 'landmark' || selectedLocation.type === 'festival' || shelfTab === 'info') && (
              <div>
                <p className="text-paper-white font-special-elite text-sm mb-2 line-clamp-3 md:line-clamp-none">
                  {selectedLocation.description}
                </p>

                {(selectedLocation.address || selectedLocation.city) && (
                  <div className="flex items-start gap-2 text-chrome-silver font-special-elite text-sm mb-2">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>
                      {selectedLocation.address && <span>{selectedLocation.address}<br /></span>}
                      {selectedLocation.city && selectedLocation.state
                        ? `${selectedLocation.city}, ${selectedLocation.state}`
                        : selectedLocation.city || selectedLocation.state || ''}
                    </span>
                  </div>
                )}

                {selectedLocation.phone && (
                  <div className="flex items-center gap-2 text-chrome-silver font-special-elite text-sm mb-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${selectedLocation.phone}`} className="hover:text-starlight-turquoise transition-colors">
                      {selectedLocation.phone}
                    </a>
                  </div>
                )}

                {/* Festival-specific: dates and schedule */}
                {selectedLocation.type === 'festival' && selectedLocation.typicalMonth && (
                  <div className="flex items-start gap-2 text-chrome-silver font-special-elite text-sm mb-2">
                    <span className="flex-shrink-0">📅</span>
                    <span>
                      <span className="text-paper-white">{selectedLocation.typicalMonth}</span>
                      {selectedLocation.recurringPattern && (
                        <span className="text-chrome-silver/60"> · {selectedLocation.recurringPattern}</span>
                      )}
                    </span>
                  </div>
                )}

                {(selectedLocation.url || selectedLocation.website) && (
                  <a
                    href={selectedLocation.url || selectedLocation.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-atomic-orange font-special-elite text-sm hover:text-starlight-turquoise transition-colors"
                  >
                    <span>
                      {selectedLocation.type === 'festival' ? 'Visit Festival Website' :
                       selectedLocation.source === 'ALA' ? 'View on ALA Literary Landmarks' :
                       selectedLocation.type === 'drivein' ? 'Visit Website' :
                       selectedLocation.website ? 'Visit Website' : 'Read more on Wikipedia'}
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

                {/* Landmarks keep Guestbook inline (festivals are events, not permanent venues) */}
                {selectedLocation.type === 'landmark' && selectedLocation.type !== 'festival' && (
                  <Guestbook
                    key={selectedLocation.id}
                    locationId={selectedLocation.id}
                    user={user}
                    onShowLogin={onShowLogin}
                    placeName={selectedLocation?.name}
                    placeState={selectedLocation?.state}
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
                placeName={selectedLocation?.name}
                placeState={selectedLocation?.state}
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

            {/* Tab: Postcard Studio */}
            {shelfTab === 'postcard' && (selectedLocation.type === 'bookstore' || selectedLocation.type === 'cafe') && (
              <PostcardStudio
                key={selectedLocation.id}
                location={selectedLocation}
              />
            )}
          </div>
          )}

          {/* Sticky buttons — info tab only */}
          {isExpanded && (shelfTab === 'info' || selectedLocation.type === 'landmark') && (
          <div className="flex-shrink-0 flex flex-col gap-1.5 px-3 pb-3 md:px-5 md:pb-4 pt-1.5 max-w-2xl mx-auto w-full">
            {/* Row 1: Save Place (primary explore action) + Add to Route (navigation queue) */}
            <div className="flex gap-2">
              <button
                onClick={() => savedStopIds.has(selectedLocation.id)
                  ? handleUnsaveStop(selectedLocation.id)
                  : handleSaveStop(selectedLocation)}
                className={`flex-1 font-bungee text-xs py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  savedStopIds.has(selectedLocation.id)
                    ? 'bg-starlight-turquoise/20 border-2 border-starlight-turquoise text-starlight-turquoise'
                    : 'bg-starlight-turquoise/10 border-2 border-starlight-turquoise/60 text-starlight-turquoise hover:bg-starlight-turquoise/20 hover:border-starlight-turquoise'
                }`}
              >
                {savedStopIds.has(selectedLocation.id) ? '✓ SAVED' : '⭐ SAVE PLACE'}
              </button>
              <button
                onClick={() => handleRouteStopToggle(selectedLocation)}
                className={`px-3 border-2 font-bungee text-xs py-1.5 rounded-lg transition-all ${
                  currentRouteStopIds.has(selectedLocation.id)
                    ? 'bg-[#FFD700]/15 border-[#FFD700]/80 text-[#FFD700] hover:bg-atomic-orange/15 hover:border-atomic-orange hover:text-atomic-orange'
                    : 'bg-transparent border-[#FFD700]/30 text-[#FFD700]/60 hover:bg-[#FFD700]/10 hover:border-[#FFD700] hover:text-[#FFD700]'
                }`}
                title={currentRouteStopIds.has(selectedLocation.id) ? 'Remove from navigation route' : 'Add to navigation route'}
              >
                {currentRouteStopIds.has(selectedLocation.id) ? '✓ ON ROUTE' : '➕ ADD TO ROUTE'}
              </button>
            </div>

            {/* Row 2: Directions — secondary action */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-atomic-orange/10 border border-atomic-orange/50 text-atomic-orange font-bungee py-1.5 rounded-lg hover:bg-atomic-orange hover:text-midnight-navy transition-all text-xs flex items-center justify-center gap-1.5"
            >
              DIRECTIONS TO THIS STOP
            </a>

            {/* Row 3: Park Here — bookstores, cafes & drive-ins, logged-in users only */}
            {user && (selectedLocation.type === 'bookstore' || selectedLocation.type === 'cafe' || selectedLocation.type === 'drivein') && (() => {
              const carsHere = locationCars[selectedLocation.id] || [];
              const parked = carsHere.find(c => c.userId === user.uid);
              if (parked) {
                return (
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center justify-center gap-1.5 bg-atomic-orange/15 border border-atomic-orange text-atomic-orange font-bungee py-1.5 rounded-lg text-xs">
                      <img src={carImgSrc(parked.carType)} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                      PARKED ✓
                      {carsHere.length > 1 && <span className="font-special-elite opacity-60">· {carsHere.length} here</span>}
                    </div>
                    <button
                      onClick={handleUnpark}
                      className="px-3 border border-chrome-silver/40 text-chrome-silver/70 font-bungee py-1.5 rounded-lg hover:border-atomic-orange hover:text-atomic-orange transition-all text-xs"
                    >
                      LEAVE
                    </button>
                  </div>
                );
              }
              return (
                <div>
                  <button
                    onClick={handleCheckIn}
                    disabled={checkInLoading || !userCar}
                    className={`w-full font-bungee py-1.5 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5 ${
                      !userCar
                        ? 'bg-black/30 border border-chrome-silver/25 text-chrome-silver/35 cursor-not-allowed'
                        : 'bg-black/30 border border-atomic-orange text-atomic-orange hover:bg-atomic-orange hover:text-midnight-navy'
                    }`}
                  >
                    {checkInLoading ? 'PARKING...' : !userCar
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CarIcon size={14} /> Choose a ride in Profile first</span>
                      : <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CarIcon size={14} /> PARK HERE{carsHere.length > 0 ? ` · ${carsHere.length} here` : ''}</span>
                    }
                  </button>
                  {checkInError && (
                    <p className="font-special-elite text-atomic-orange text-[10px] mt-1 text-center leading-tight">{checkInError}</p>
                  )}
                </div>
              );
            })()}
          </div>
          )}
        </div>
        );
      })()}

      {/* ── Itinerary overlay — day/festival trips shown as list, no map ── */}
      {itineraryRoute && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1003, background: '#0D0E1A', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="border-b-2 border-starlight-turquoise bg-midnight-navy px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setItineraryRoute(null)}
              className="text-starlight-turquoise hover:text-atomic-orange transition-colors p-1 flex-shrink-0"
              title="Back to map"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-starlight-turquoise font-bungee text-lg leading-tight truncate drop-shadow-[0_0_8px_rgba(64,224,208,0.6)]">
                {itineraryRoute.routeName}
              </h2>
              <p className="text-chrome-silver/60 font-special-elite text-xs mt-0.5">
                {itineraryRoute.startCity && itineraryRoute.endCity
                  ? `${itineraryRoute.startCity} → ${itineraryRoute.endCity} · `
                  : ''}
                {(itineraryRoute.stops || []).length} stop{(itineraryRoute.stops || []).length !== 1 ? 's' : ''}
                {' · '}
                <span className="text-atomic-orange">{itineraryRoute.routeType === 'festivalTrip' ? 'Festival Trip' : 'Day Trip'}</span>
              </p>
            </div>
          </div>

          {/* Stop list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {(itineraryRoute.stops || []).length === 0 ? (
              <p className="text-chrome-silver/50 font-special-elite text-sm text-center py-12">No stops saved with this route.</p>
            ) : (
              (itineraryRoute.stops || []).map((stop, i) => (
                <div key={stop.id || i} className="bg-black/40 border border-starlight-turquoise/30 rounded-lg p-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-starlight-turquoise/15 border border-starlight-turquoise/60 text-starlight-turquoise font-bungee text-[11px] flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    {stop.type && (
                      <span className="text-chrome-silver/50 font-bungee text-[9px] tracking-wider uppercase block mb-0.5">
                        {stop.type === 'bookstore' ? 'Bookstore' : stop.type === 'cafe' ? 'Coffee Shop' : stop.type === 'festival' ? 'Festival' : stop.type === 'landmark' ? 'Landmark' : stop.type}
                      </span>
                    )}
                    <p className="text-starlight-turquoise font-bungee text-sm leading-tight">{stop.name}</p>
                    {stop.address && <p className="text-chrome-silver/60 font-special-elite text-xs mt-0.5 truncate">{stop.address}</p>}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action buttons */}
          <div className="border-t border-starlight-turquoise/20 p-4 flex gap-3 flex-shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
            <button
              onClick={() => {
                const stops = (itineraryRoute.stops || []).filter(s => s.lat != null || s.address);
                if (!stops.length) return;
                const waypoints = stops
                  .map(s => encodeURIComponent(s.address || `${s.lat},${s.lng}`))
                  .join('/');
                window.open(`https://www.google.com/maps/dir/${waypoints}`, '_blank');
              }}
              className="flex-1 bg-atomic-orange text-midnight-navy font-bungee py-3 rounded-lg hover:bg-starlight-turquoise transition-colors"
              style={{ boxShadow: '0 0 12px rgba(255,78,0,0.35)' }}
            >
              NAVIGATE →
            </button>
            <button
              onClick={() => {
                if (user && window.confirm(`Delete "${itineraryRoute.routeName}"?`)) {
                  deleteSavedRoute(user.uid, itineraryRoute.id).catch(console.error);
                  setItineraryRoute(null);
                }
              }}
              className="border border-chrome-silver/30 text-chrome-silver/50 hover:text-atomic-orange hover:border-atomic-orange font-bungee text-xs py-2 px-4 rounded-lg transition-colors"
              title="Delete route"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Road Trip overlay ── */}
      {showRoadTrip && (
        <RoadTrip
          items={tripItems}
          onRemove={handleRemoveFromTrip}
          onClearAll={handleClearTrip}
          onClose={() => setShowRoadTrip(false)}
          onSelectStop={handleSelectStop}
          savedRoutes={savedRoutes}
          onLoadRoute={handleLoadRoute}
          onDeleteRoute={handleDeleteRoute}
          onRenameRoute={handleRenameRoute}
          onShareRoute={(r) => { setShareRouteData(r); setShowShareModal(true); }}
          savedStops={savedStops}
          onRemoveSaved={handleUnsaveStop}
          onShareSaved={(stop) => {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`;
            const text = stop.address ? `${stop.name} — ${stop.address}` : stop.name;
            if (navigator.share) {
              navigator.share({ title: stop.name, text, url: mapsUrl }).catch(() => {});
            } else {
              window.open(mapsUrl, '_blank');
            }
          }}
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

      {/* ── Save Route modal ── */}
      {showSaveRouteModal && (
        <SaveRouteModal
          startCity={startCity}
          endCity={endCity}
          saving={savingRoute}
          error={saveRouteError}
          onSave={handleSaveRoute}
          onClose={() => { setShowSaveRouteModal(false); setSaveRouteError(''); }}
        />
      )}

      {/* ── Share Route modal ── */}
      {showShareModal && shareRouteData && (
        <ShareRouteModal
          route={shareRouteData}
          onClose={() => { setShowShareModal(false); setShareRouteData(null); }}
        />
      )}

      {/* ── Navigate My Stops modal (from header button) ── */}
      {showMyStopsNavigate && currentRouteStops.length > 0 && (
        <NavigateModal
          items={sortStopsAlongRoute(currentRouteStops, route)}
          onClose={() => setShowMyStopsNavigate(false)}
        />
      )}

      {/* ── Navigate modal for festival / near-me / stops-only routes ── */}
      {showRouteNavigate && visibleLocations.length > 0 && (
        <NavigateModal
          items={visibleLocations}
          selectable
          onClose={() => setShowRouteNavigate(false)}
        />
      )}

      {/* ── Badge unlock celebration ── */}
      {newBadges.length > 0 && (
        <BadgeUnlockModal
          badges={newBadges}
          onClose={() => setNewBadges([])}
          onViewAll={onShowBadges}
        />
      )}

    </div>
  );
};

export default MasterMap;
