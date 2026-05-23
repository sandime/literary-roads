import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../config/firebase';
import { geocodeNominatim } from '../utils/nominatimGeocoding';
import { LibraryIcon } from '../components/Icons';

// ── Haversine distance (miles) ────────────────────────────────────────────
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Library map pin ────────────────────────────────────────────────────────
const createLibraryPin = () => L.divIcon({
  html: `
    <div style="position:relative;width:30px;height:38px;">
      <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.716 0 0 6.716 0 15C0 23.284 15 38 15 38C15 38 30 23.284 30 15C30 6.716 23.284 0 15 0Z" fill="#006B6B"/>
        <line x1="7" y1="22" x2="23" y2="22" stroke="white" stroke-width="1.4"/>
        <rect x="7" y="10" width="3" height="12" rx="0.5" fill="white" fill-opacity="0.95"/>
        <rect x="11.5" y="13" width="2.5" height="9" rx="0.5" fill="rgba(255,255,255,0.65)"/>
        <rect x="15.5" y="8" width="3" height="14" rx="0.5" fill="white" fill-opacity="0.95"/>
        <rect x="20" y="11" width="3" height="11" rx="0.5" fill="rgba(255,255,255,0.75)"/>
      </svg>
    </div>
  `,
  className: '',
  iconSize: [30, 38],
  iconAnchor: [15, 38],
  popupAnchor: [0, -42],
});

// ── Firestore bounding-box query ──────────────────────────────────────────
const searchLibraries = async (lat, lng, radiusMiles) => {
  const latDelta = radiusMiles / 69;
  const lngDelta = radiusMiles / (69 * Math.cos(lat * Math.PI / 180));
  const q = query(
    collection(db, 'libraries'),
    where('lat', '>=', lat - latDelta),
    where('lat', '<=', lat + latDelta),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(lib =>
      lib.lat && lib.lng &&
      Math.abs(lib.lng - lng) <= lngDelta &&
      haversine(lat, lng, lib.lat, lib.lng) <= radiusMiles
    )
    .sort((a, b) => haversine(lat, lng, a.lat, a.lng) - haversine(lat, lng, b.lat, b.lng))
    .slice(0, 50);
};

// ── Fit map bounds when results arrive ────────────────────────────────────
function FitBoundsController({ libraries }) {
  const map = useMap();
  useEffect(() => {
    if (!libraries?.length) return;
    const bounds = L.latLngBounds(libraries.map(l => [l.lat, l.lng]));
    map.fitBounds(bounds, { padding: [52, 52], maxZoom: 14 });
  }, [libraries, map]);
  return null;
}

// ── Main component ────────────────────────────────────────────────────────
export default function LibraryFinderScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchInput, setSearchInput]     = useState('');
  const [searchStatus, setSearchStatus]   = useState('idle'); // idle | loading | done | error
  const [libraries, setLibraries]         = useState([]);
  const [searchLabel, setSearchLabel]     = useState('');
  const [expandedRadius, setExpandedRadius] = useState(false);
  const [selectedLib, setSelectedLib]     = useState(null);

  const pinRef = useRef(null);
  if (!pinRef.current) pinRef.current = createLibraryPin();

  const doSearch = useCallback(async (term) => {
    if (!term.trim()) return;
    setSearchStatus('loading');
    setLibraries([]);
    setSelectedLib(null);
    setExpandedRadius(false);

    try {
      const geo = await geocodeNominatim(term.trim());
      if (!geo) { setSearchStatus('error'); setSearchLabel(term.trim()); return; }

      let results = await searchLibraries(geo.lat, geo.lng, 25);
      let expanded = false;
      if (results.length === 0) {
        results = await searchLibraries(geo.lat, geo.lng, 50);
        expanded = true;
      }

      setLibraries(results);
      setExpandedRadius(expanded);
      setSearchLabel(term.trim());
      setSearchStatus('done');
    } catch (err) {
      console.error('[LibraryFinder] search error:', err);
      setSearchStatus('error');
      setSearchLabel(term.trim());
    }
  }, []);

  // Auto-fire search from URL ?q= param (Highway Snacks entry point)
  const autoSearched = useRef(false);
  useEffect(() => {
    if (autoSearched.current) return;
    const q = searchParams.get('q');
    if (q) {
      autoSearched.current = true;
      setSearchInput(q);
      doSearch(q);
    }
  }, [searchParams, doSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch(searchInput);
  };

  const resultMsg = searchStatus === 'done'
    ? libraries.length === 0
      ? `No libraries found near ${searchLabel}`
      : expandedRadius
        ? `No libraries within 25 mi — showing ${libraries.length} within 50 mi of ${searchLabel}`
        : `${libraries.length} ${libraries.length === 1 ? 'library' : 'libraries'} near ${searchLabel}`
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#1A1B2E',
      display: 'flex', flexDirection: 'column',
      zIndex: 1000,
    }}>

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px',
        background: 'rgba(0,107,107,0.15)',
        borderBottom: '1px solid rgba(0,107,107,0.35)',
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent',
            border: '1.5px solid rgba(0,107,107,0.55)',
            color: '#40E0D0', borderRadius: '8px',
            fontFamily: 'Bungee, sans-serif', fontSize: '10px', letterSpacing: '0.05em',
            padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          ← BACK
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0 }}>
          <div style={{ color: '#40E0D0', flexShrink: 0 }}><LibraryIcon size={20} /></div>
          <span style={{
            fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(11px, 2.5vw, 15px)',
            color: '#40E0D0', letterSpacing: '0.08em', whiteSpace: 'nowrap',
          }}>
            LIBRARY FINDER
          </span>
        </div>

        {resultMsg && (
          <span style={{
            fontFamily: 'Special Elite, serif', fontSize: '11px', lineHeight: 1.3,
            color: expandedRadius ? 'rgba(255,78,0,0.75)' : 'rgba(64,224,208,0.65)',
            textAlign: 'right', maxWidth: '200px', flexShrink: 0,
          }}>
            {resultMsg}
          </span>
        )}
      </div>

      {/* ── Search bar ── */}
      <form onSubmit={handleSubmit} style={{
        flexShrink: 0,
        display: 'flex', gap: '8px',
        padding: '10px 14px',
        background: 'rgba(0,0,0,0.25)',
        borderBottom: '1px solid rgba(0,107,107,0.2)',
        zIndex: 10,
      }}>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="City, state or address..."
          style={{
            flex: 1,
            background: 'rgba(245,245,220,0.06)',
            border: '1.5px solid rgba(0,107,107,0.45)',
            borderRadius: '10px',
            color: '#F5F5DC',
            fontFamily: 'Special Elite, serif',
            fontSize: '14px',
            padding: '10px 14px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={searchStatus === 'loading' || !searchInput.trim()}
          style={{
            background: searchStatus === 'loading' || !searchInput.trim()
              ? 'rgba(0,107,107,0.3)' : '#006B6B',
            color: '#F5F5DC',
            border: 'none', borderRadius: '10px',
            fontFamily: 'Bungee, sans-serif', fontSize: '11px', letterSpacing: '0.06em',
            padding: '10px 16px',
            cursor: searchStatus === 'loading' || !searchInput.trim() ? 'default' : 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {searchStatus === 'loading' ? '...' : 'SEARCH →'}
        </button>
      </form>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4}
          style={{ width: '100%', height: '100%' }}
          zoomControl
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
          />
          {libraries.map(lib => (
            <Marker
              key={lib.id}
              position={[lib.lat, lib.lng]}
              icon={pinRef.current}
              eventHandlers={{ click: () => setSelectedLib(lib) }}
            />
          ))}
          {libraries.length > 0 && <FitBoundsController libraries={libraries} />}
        </MapContainer>

        {/* Loading overlay */}
        {searchStatus === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 500,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(26,27,46,0.72)', backdropFilter: 'blur(3px)',
          }}>
            <style>{`@keyframes lf-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: '3px solid rgba(0,107,107,0.25)', borderTopColor: '#006B6B',
              animation: 'lf-spin 0.8s linear infinite', marginBottom: '14px',
            }} />
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: '13px',
              color: 'rgba(64,224,208,0.7)', fontStyle: 'italic',
            }}>
              Finding libraries near {searchInput}…
            </p>
          </div>
        )}

        {/* Empty state */}
        {searchStatus === 'done' && libraries.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 200,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(26,27,46,0.8)', backdropFilter: 'blur(3px)',
            padding: '24px', textAlign: 'center',
          }}>
            <div style={{ opacity: 0.25, marginBottom: '16px' }}>
              <LibraryIcon size={72} />
            </div>
            <p style={{
              fontFamily: 'Bungee, sans-serif', fontSize: '13px',
              color: 'rgba(245,245,220,0.6)', letterSpacing: '0.06em', marginBottom: '10px',
            }}>
              No libraries found near {searchLabel}
            </p>
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: '12px',
              color: 'rgba(200,155,70,0.5)', lineHeight: 1.6,
            }}>
              Try a larger city nearby or<br />check the spelling of your search.
            </p>
          </div>
        )}

        {/* Error state */}
        {searchStatus === 'error' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 200,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(26,27,46,0.8)', backdropFilter: 'blur(3px)',
            padding: '24px', textAlign: 'center',
          }}>
            <p style={{
              fontFamily: 'Bungee, sans-serif', fontSize: '13px',
              color: 'rgba(255,78,0,0.8)', letterSpacing: '0.05em', marginBottom: '8px',
            }}>
              Couldn't find that location
            </p>
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: '12px',
              color: 'rgba(200,155,70,0.5)',
            }}>
              Try "City, State" format — e.g. Asheville, NC
            </p>
          </div>
        )}

        {/* Library card */}
        {selectedLib && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 600,
            background: 'rgba(10,11,22,0.97)',
            borderTop: '2px solid rgba(0,107,107,0.55)',
            borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
            padding: '16px 18px 24px',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          }}>
            <button
              onClick={() => setSelectedLib(null)}
              style={{
                position: 'absolute', top: '12px', right: '14px',
                background: 'transparent', border: 'none',
                color: 'rgba(192,192,192,0.4)', cursor: 'pointer',
                fontFamily: 'Bungee, sans-serif', fontSize: '14px', lineHeight: 1,
              }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ color: '#006B6B', flexShrink: 0, marginTop: '2px' }}>
                <LibraryIcon size={26} />
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingRight: '24px' }}>
                <h3 style={{
                  fontFamily: 'Bungee, sans-serif', fontSize: '14px',
                  color: '#F5F5DC', letterSpacing: '0.02em',
                  marginBottom: '5px', lineHeight: 1.25,
                }}>
                  {selectedLib.name}
                </h3>
                {selectedLib.address && (
                  <p style={{
                    fontFamily: 'Special Elite, serif', fontSize: '12px',
                    color: 'rgba(200,155,70,0.7)', margin: '1px 0', lineHeight: 1.4,
                  }}>
                    {selectedLib.address}
                  </p>
                )}
                {(selectedLib.city || selectedLib.state) && (
                  <p style={{
                    fontFamily: 'Special Elite, serif', fontSize: '12px',
                    color: 'rgba(200,155,70,0.7)', margin: '1px 0',
                  }}>
                    {[selectedLib.city, selectedLib.state].filter(Boolean).join(', ')}
                    {selectedLib.zipcode ? ` ${selectedLib.zipcode}` : ''}
                  </p>
                )}
                {selectedLib.phone && (
                  <p style={{
                    fontFamily: 'Special Elite, serif', fontSize: '12px',
                    color: 'rgba(192,192,192,0.45)', margin: '5px 0 0',
                  }}>
                    {selectedLib.phone}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              {selectedLib.website && (
                <a
                  href={selectedLib.website.startsWith('http') ? selectedLib.website : `https://${selectedLib.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1, textAlign: 'center',
                    background: 'rgba(0,107,107,0.18)',
                    border: '1.5px solid rgba(0,107,107,0.55)',
                    borderRadius: '10px', padding: '10px 12px',
                    fontFamily: 'Bungee, sans-serif', fontSize: '11px',
                    color: '#40E0D0', letterSpacing: '0.05em',
                    textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  VISIT WEBSITE
                </a>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLib.lat},${selectedLib.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, textAlign: 'center',
                  background: 'rgba(255,78,0,0.1)',
                  border: '1.5px solid rgba(255,78,0,0.4)',
                  borderRadius: '10px', padding: '10px 12px',
                  fontFamily: 'Bungee, sans-serif', fontSize: '11px',
                  color: '#FF4E00', letterSpacing: '0.05em',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                GET DIRECTIONS
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
