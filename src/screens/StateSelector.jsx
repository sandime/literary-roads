import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getTrip, removeFromTrip, clearTrip } from '../utils/tripStorage';
import { searchPlacesByText } from '../utils/googlePlaces';
import RoadTrip from './RoadTrip';
import ShareRouteModal from '../components/ShareRouteModal';
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

const StateSelector = ({ onStateSelect, onShowLogin, onShowProfile, onShowResources, onShowBookLog, onShowEthics, onShowCredits, onLoadSavedRoute, onSelectStop, onNearMe, onShowDayTrip }) => {
  const { user, logout } = useAuth();
  const [geoJson, setGeoJson]           = useState(null);
  const [loadError, setLoadError]       = useState(false);
  const [hoveredState, setHoveredState] = useState('');
  const [selectedStates, setSelectedStates] = useState(new Set());
  const [showUserMenu, setShowUserMenu]     = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const [showMyRoutes, setShowMyRoutes]     = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareRouteData, setShareRouteData] = useState(null);
  const [savedRoutes, setSavedRoutes]   = useState([]);
  const [tripItems, setTripItems]       = useState([]);
  const [showSearch, setShowSearch]     = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDropdownPos, setSearchDropdownPos] = useState({});
  const [showSearchDrop, setShowSearchDrop] = useState(false);

  // Refs keep event-handler closures from going stale
  const selectedRef    = useRef(new Set()); // mirrors selectedStates
  const layersRef      = useRef({});        // { stateName: leafletLayer }
  const userMenuRef      = useRef(null);
  const mobileMenuRef    = useRef(null);
  const infoMenuRef      = useRef(null);
  const searchInputRef = useRef(null);
  const searchDropRef  = useRef(null);
  const searchDebounce = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const close = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) setShowMobileMenu(false);
      if (infoMenuRef.current && !infoMenuRef.current.contains(e.target)) setShowInfoMenu(false);
      if (
        searchDropRef.current && !searchDropRef.current.contains(e.target) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target)
      ) setShowSearchDrop(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Search debounce
  useEffect(() => {
    clearTimeout(searchDebounce.current);
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); setShowSearchDrop(false); return; }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      const res = await searchPlacesByText(searchQuery);
      setSearchResults(res);
      if (res.length > 0 && searchInputRef.current) {
        const r = searchInputRef.current.getBoundingClientRect();
        setSearchDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width });
        setShowSearchDrop(true);
      } else {
        setShowSearchDrop(false);
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(searchDebounce.current);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) { setSavedRoutes([]); return; }
    return subscribeToSavedRoutes(user.uid, setSavedRoutes);
  }, [user]);

  useEffect(() => {
    if (!user) { setTripItems(getTrip()); return; }
    const ref = doc(db, 'users', user.uid);
    return onSnapshot(ref,
      (snap) => setTripItems(snap.exists() ? (snap.data().trip || []) : []),
      (err) => console.error('[StateSelector] trip sync:', err),
    );
  }, [user]);

  const saveTripToFirestore = (items) => {
    if (!user) return;
    setDoc(doc(db, 'users', user.uid), { trip: items }, { merge: true }).catch(console.error);
  };

  const handleRemoveFromTrip = (id) => {
    const updated = tripItems.filter(i => i.id !== id);
    setTripItems(updated);
    if (user) saveTripToFirestore(updated); else removeFromTrip(id);
  };

  const handleClearTrip = () => {
    setTripItems([]);
    if (user) saveTripToFirestore([]); else clearTrip();
  };

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

  const clearSelections = () => {
    setSelectedStates(new Set());
    selectedRef.current = new Set();
    Object.values(layersRef.current).forEach(l => l.setStyle(DEFAULT_STYLE));
  };

  const handleSearchSelect = (place) => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDrop(false);
    setShowSearch(false);
    onSelectStop?.(place);
  };

  const panelVisible = selectedStates.size > 0;

  return (
    <div className="h-screen w-full relative bg-midnight-navy overflow-hidden">

      {/* ── Header ── */}
      <div className={`absolute top-0 left-0 right-0 z-[1000] bg-midnight-navy/95 border-b-2 border-starlight-turquoise px-3 py-2 md:py-4`}>
        <style>{`
          @keyframes lr-dropdown-in {
            from { opacity: 0; transform: translateY(-6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* ── Mobile header ── */}
        <div className="flex items-center md:hidden">
          <button onClick={() => setShowHamburger(true)}
            className="flex-shrink-0 text-starlight-turquoise active:text-atomic-orange transition-colors"
            style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-starlight-turquoise font-bungee text-[15px] drop-shadow-[0_0_10px_rgba(64,224,208,0.8)] leading-tight px-2">
            THE LITERARY ROADS
          </h1>
          <div className="flex-shrink-0 flex items-center gap-1 ml-2">
            <button onClick={() => setShowMyRoutes(true)} title="My Trip"
              className="relative flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors px-2 py-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="font-bungee text-[9px] leading-tight">MY TRIP</span>
              {(tripItems.length > 0 || savedRoutes.length > 0) && (
                <span className="absolute -top-0.5 right-0.5 bg-atomic-orange text-midnight-navy font-bungee text-[9px] w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {tripItems.length + savedRoutes.length > 9 ? '9+' : tripItems.length + savedRoutes.length}
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
                    📖 VIEW PROFILE
                  </button>
                  <div style={{ height: 1, background: 'rgba(64,224,208,0.15)', margin: '0 12px' }} />
                  <button
                    onPointerDown={async () => { setShowMobileMenu(false); await logout(); }}
                    className="w-full text-left font-bungee"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', fontSize: 12, color: '#FF4E00', background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 44 }}
                  >
                    🚪 SIGN OUT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Desktop header: 3-column ── */}
        <div className="hidden md:block relative">

          {/* Left: Home */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button onClick={clearSelections} title="Reset selections"
              className="text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
          </div>

          {/* Center: Title */}
          <div className="text-center py-1">
            <h1 className="text-starlight-turquoise font-bungee text-2xl drop-shadow-[0_0_10px_rgba(64,224,208,0.8)] leading-tight">
              THE LITERARY ROADS
            </h1>
            <p className="text-atomic-orange font-special-elite text-sm mt-1">
              {selectedStates.size === 0
                ? 'Click states to select your journey'
                : `${selectedStates.size} state${selectedStates.size > 1 ? 's' : ''} selected — click more or continue`}
            </p>
          </div>

          {/* Right: NEAR ME | SEARCH | MY TRIP | HIGHWAY SNACKS | AFTERWORD | PROFILE */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">

            {/* Near Me */}
            <button onClick={() => onNearMe?.()}
              className="bg-atomic-orange text-midnight-navy font-bungee px-4 py-2 rounded-full hover:bg-starlight-turquoise transition-all shadow-lg flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              NEAR ME
            </button>

            {/* Day Trip Planner */}
            <button onClick={() => onShowDayTrip?.()} title="Plan a Day Trip"
              className="flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="font-bungee text-[10px] leading-tight tracking-wide">DAY TRIP</span>
            </button>

            {/* Search toggle */}
            <button onClick={() => setShowSearch(v => !v)} title="Search places"
              className={`flex flex-col items-center transition-colors p-1 ${showSearch ? 'text-atomic-orange' : 'text-starlight-turquoise hover:text-atomic-orange'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* My Trip */}
            <button onClick={() => setShowMyRoutes(true)} title="My Road Trip"
              className="relative flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {(tripItems.length > 0 || savedRoutes.length > 0) && (
                <span className="absolute -top-0.5 right-0.5 bg-atomic-orange text-midnight-navy font-bungee text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {tripItems.length + savedRoutes.length > 9 ? '9+' : tripItems.length + savedRoutes.length}
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

            {/* AFTERWORD dropdown */}
            <div ref={infoMenuRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowInfoMenu(v => !v)} title="Afterword"
                className="flex flex-col items-center transition-colors p-1"
                style={{ color: showInfoMenu ? '#FF4E00' : '#40E0D0' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="font-bungee text-[10px] leading-tight tracking-wide">AFTERWORD</span>
              </button>
              {showInfoMenu && (
                <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, minWidth:'170px', zIndex:9999, background:'#0D0E1A', border:'1.5px solid rgba(255,78,0,0.45)', borderRadius:'10px', overflow:'hidden', boxShadow:'0 0 20px rgba(255,78,0,0.2), 0 8px 32px rgba(0,0,0,0.7)', animation:'lr-dropdown-in 0.18s ease' }}>
                  {[
                    { label: 'CODE OF ETHICS', action: () => { setShowInfoMenu(false); onShowEthics?.(); } },
                    { label: 'CREDITS',        action: () => { setShowInfoMenu(false); onShowCredits?.(); } },
                  ].map(({ label, action }, i) => (
                    <button key={label} onClick={action} className="font-bungee w-full text-left"
                      style={{ display:'flex', alignItems:'center', padding:'10px 14px', fontSize:'11px', letterSpacing:'0.05em', color:'#FF4E00', background:'transparent', border:'none', borderTop: i > 0 ? '1px solid rgba(255,78,0,0.12)' : 'none', cursor:'pointer', transition:'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,78,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >{label}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile / Login */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button onClick={user ? () => setShowUserMenu(v => !v) : onShowLogin}
                title={user ? "Traveler's Log" : 'Log In'}
                className="flex flex-col items-center text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} className="w-6 h-6 rounded-full" alt="avatar"
                    style={{ border:'1.5px solid #40E0D0', boxShadow: showUserMenu ? '0 0 8px rgba(64,224,208,0.7)' : 'none' }} />
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </button>
              {user && showUserMenu && (
                <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, minWidth:'160px', zIndex:9999, background:'#0D0E1A', border:'1.5px solid #40E0D0', borderRadius:'10px', boxShadow:'0 0 24px rgba(64,224,208,0.25), 0 8px 32px rgba(0,0,0,0.7)', overflow:'hidden', animation:'lr-dropdown-in 0.18s ease' }}>
                  <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid rgba(64,224,208,0.15)' }}>
                    <p className="font-bungee" style={{ fontSize:'10px', color:'#40E0D0', letterSpacing:'0.06em', lineHeight:1.2 }}>{user.displayName || 'Literary Traveler'}</p>
                    <p className="font-special-elite" style={{ fontSize:'9px', color:'rgba(192,192,192,0.4)', marginTop:'2px' }}>{user.email}</p>
                  </div>
                  <button onClick={() => { setShowUserMenu(false); onShowProfile(); }} className="font-bungee w-full text-left"
                    style={{ display:'flex', alignItems:'center', gap:'10px', padding:'11px 14px', fontSize:'11px', letterSpacing:'0.05em', color:'#40E0D0', background:'transparent', border:'none', cursor:'pointer', transition:'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(64,224,208,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    VIEW PROFILE
                  </button>
                  <div style={{ height:'1px', background:'rgba(64,224,208,0.1)', margin:'0 10px' }} />
                  <button onClick={async () => { setShowUserMenu(false); await logout(); }} className="font-bungee w-full text-left"
                    style={{ display:'flex', alignItems:'center', gap:'10px', padding:'11px 14px', fontSize:'11px', letterSpacing:'0.05em', color:'#FF4E00', background:'transparent', border:'none', cursor:'pointer', transition:'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,78,0,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
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

        {/* Search bar row (desktop, when open) */}
        {showSearch && (
          <div className="hidden md:block max-w-2xl mx-auto w-full pb-1.5">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search bookstores, cafes, landmarks…"
                className="w-full bg-black/60 border-2 border-starlight-turquoise/70 text-paper-white font-special-elite px-3 py-2 pr-8 rounded-lg focus:outline-none focus:border-starlight-turquoise"
                style={{ fontSize: '0.875rem' }}
                autoFocus
              />
              {searchLoading && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-starlight-turquoise border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {showSearchDrop && searchResults.length > 0 && createPortal(
              <ul ref={searchDropRef}
                style={{ position:'fixed', top: searchDropdownPos.top, left: searchDropdownPos.left, width: searchDropdownPos.width, zIndex:9999 }}
                className="bg-midnight-navy border-2 border-starlight-turquoise rounded-lg overflow-hidden shadow-[0_0_20px_rgba(64,224,208,0.3)]"
              >
                {searchResults.map((place, i) => (
                  <li key={place.id} onPointerDown={() => handleSearchSelect(place)} style={{ touchAction:'manipulation' }}
                    className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-starlight-turquoise/10 ${i > 0 ? 'border-t border-starlight-turquoise/20' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm flex-shrink-0">
                        {{ bookstore:'📚', cafe:'☕', landmark:'🌲', drivein:'🎬' }[place.type] || '📍'}
                      </span>
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
        )}
      </div>

      {/* ── Map ── */}
      <div className={`h-full pt-16 ${showSearch ? 'md:pt-[128px]' : 'md:pt-20'}`}>
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
      {/* ── Hamburger drawer (mobile) ── */}
      {showHamburger && (
        <div className="md:hidden">
          <style>{`@keyframes lr-slide-in-left { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[2000] bg-black/60" onClick={() => setShowHamburger(false)} />
          {/* Drawer */}
          <div className="fixed top-0 left-0 h-full z-[2001] bg-midnight-navy border-r-2 border-starlight-turquoise flex flex-col shadow-2xl"
            style={{ width: 'min(280px, 82vw)', animation: 'lr-slide-in-left 0.22s ease' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-starlight-turquoise/30 flex-shrink-0">
              <span className="font-bungee text-starlight-turquoise text-sm tracking-widest drop-shadow-[0_0_8px_rgba(64,224,208,0.6)]">MENU</span>
              <button onClick={() => setShowHamburger(false)} className="text-chrome-silver hover:text-atomic-orange transition-colors p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-60 flex-shrink-0" />

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-2">
              {[
                { label: 'PLAN A DAY TRIP', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', action: () => { setShowHamburger(false); onShowDayTrip?.(); } },
                { label: 'MY TRIP', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z', action: () => { setShowHamburger(false); setShowMyRoutes(true); } },
                { label: 'HIGHWAY SNACKS', icon: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3', action: () => { setShowHamburger(false); onShowResources?.(); } },
                ...(user && onShowBookLog ? [{ label: 'BOOK LOG', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', action: () => { setShowHamburger(false); onShowBookLog(); } }] : []),
                { label: 'CODE OF ETHICS', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', action: () => { setShowHamburger(false); onShowEthics?.(); } },
                { label: 'CREDITS', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', action: () => { setShowHamburger(false); onShowCredits?.(); } },
              ].map(({ label, icon, action }) => (
                <button key={label} onClick={action}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left font-bungee text-[13px] text-paper-white hover:bg-starlight-turquoise/10 hover:text-starlight-turquoise transition-colors">
                  <svg className="w-5 h-5 flex-shrink-0 text-starlight-turquoise" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                  </svg>
                  {label}
                </button>
              ))}
            </nav>

            {/* Profile footer */}
            <div className="flex-shrink-0 border-t border-starlight-turquoise/30">
              {user ? (
                <>
                  <div className="px-5 py-3">
                    <p className="font-bungee text-[11px] text-starlight-turquoise truncate">{user.displayName || 'Literary Traveler'}</p>
                    <p className="font-special-elite text-[9px] text-chrome-silver/40 mt-0.5 truncate">{user.email}</p>
                  </div>
                  <button onClick={() => { setShowHamburger(false); onShowProfile?.(); }}
                    className="w-full flex items-center gap-4 px-5 py-3 font-bungee text-[13px] text-starlight-turquoise hover:bg-starlight-turquoise/10 transition-colors">
                    VIEW PROFILE
                  </button>
                  <button onClick={async () => { setShowHamburger(false); await logout(); }}
                    className="w-full flex items-center gap-4 px-5 py-3 font-bungee text-[13px] text-atomic-orange hover:bg-atomic-orange/10 transition-colors">
                    SIGN OUT
                  </button>
                </>
              ) : (
                <button onClick={() => { setShowHamburger(false); onShowLogin?.(); }}
                  className="w-full px-5 py-4 font-bungee text-[13px] text-starlight-turquoise hover:bg-starlight-turquoise/10 transition-colors text-left">
                  LOG IN / SIGN UP
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── My Routes overlay ── */}
      {showMyRoutes && (
        <RoadTrip
          items={tripItems}
          onRemove={handleRemoveFromTrip}
          onClearAll={handleClearTrip}
          onClose={() => setShowMyRoutes(false)}
          onSelectStop={(item) => { setShowMyRoutes(false); onSelectStop?.(item); }}
          savedRoutes={savedRoutes}
          onLoadRoute={(route) => { setShowMyRoutes(false); onLoadSavedRoute(route); }}
          onDeleteRoute={(id) => user && deleteSavedRoute(user.uid, id).catch(console.error)}
          onRenameRoute={(id, name) => user && updateRouteName(user.uid, id, name).catch(console.error)}
          onShareRoute={(r) => { setShareRouteData(r); setShowShareModal(true); }}
        />
      )}

      {/* ── Share Route modal ── */}
      {showShareModal && shareRouteData && (
        <ShareRouteModal
          route={shareRouteData}
          onClose={() => { setShowShareModal(false); setShareRouteData(null); }}
        />
      )}
    </div>
  );
};

export default StateSelector;
