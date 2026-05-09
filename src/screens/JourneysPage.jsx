// JourneysPage.jsx — Curated literary road trips page.
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  collection, getDocs, query, where,
  doc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import PosterIllustration from '../components/journey/PosterIllustrations';
import { BookIcon, CoffeeCupIcon, LiteraryLandmarkIcon } from '../components/Icons';
import SecretRoom from '../components/journey/SecretRoom';

const CAT_SRC = `${import.meta.env.BASE_URL}images/library-cat.png`;
const JOURNEY_CAT_SRC = `${import.meta.env.BASE_URL}images/journey-cat.png`;
const onCoverLoad  = (e) => { if (e.target.naturalWidth <= 1) e.target.src = CAT_SRC; };
const onCoverError = (e) => { e.target.onerror = null; e.target.src = CAT_SRC; };

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  bg:    '#1C1A14',
  card:  '#252318',
  orange:'#FF4E00',
  teal:  '#40E0D0',
  gold:  '#F5A623',
  cream: '#FFF8E7',
  muted: '#8a7d60',
  border:'#2a2820',
  navBg: '#141209',
};

// ── Route type colors ─────────────────────────────────────────────────────────
const TYPE_COLOR = {
  ghostTown:        '#F0F0F0',
  ufo:              '#9B59B6',
  lighthouse:       '#F5A623',
  nationalPark:     '#27AE60',
  coffeeShop:       '#8B4513',
  bookstore:        '#FF6B7A',
  literaryLandmark: '#40E0D0',
  authorCountry:    '#F5A623',
  route66:          '#E74C3C',
  googie:           '#FF4E00',
  roadTrip:         '#E74C3C',
};

const TYPE_LABEL = {
  ghostTown:        'Ghost Towns',
  ufo:              'UFO & Paranormal',
  lighthouse:       'Lighthouses',
  nationalPark:     'National Parks',
  coffeeShop:       'Coffee Crawls',
  bookstore:        'Bookstores',
  literaryLandmark: 'Literary Landmarks',
  authorCountry:    'Author Country',
  route66:          'Route 66',
  googie:           'Googie Architecture',
  roadTrip:         'Road Trips',
};

// ── SVG icons ─────────────────────────────────────────────────────────────────
function GhostIcon({ size = 20, color = '#F0F0F0' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <path
        d="M 10 24 L 10 17 Q 10 7 20 7 Q 30 7 30 17 L 30 24 L 30 33 L 26 29 L 22 33 L 18 29 L 14 33 Z"
        fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
      />
      <ellipse cx="16" cy="18" rx="2.5" ry="3" fill="none" stroke={color} strokeWidth="1.5" />
      <ellipse cx="24" cy="18" rx="2.5" ry="3" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function TypeIcon({ type, color, size = 20 }) {
  const c = color || TYPE_COLOR[type] || P.teal;
  switch (type) {
    case 'ghostTown':
      return <GhostIcon size={size} color={c} />;
    case 'bookstore':
      return <BookIcon size={size} className="" style={{ color: c }} />;
    case 'coffeeShop':
      return <CoffeeCupIcon size={size} className="" style={{ color: c }} />;
    case 'literaryLandmark':
      return <LiteraryLandmarkIcon size={size} className="" style={{ color: c }} />;
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M3 17l4-8 4 4 4-6 4 10" />
          <path d="M3 17h18" />
        </svg>
      );
  }
}

// ── Filter pills config ───────────────────────────────────────────────────────
// key: null = featured landing view. Clicking an active pill does NOT toggle it
// off — use the FEATURED pill explicitly to return to the landing view.
const FILTER_PILLS = [
  { key: null,               label: 'Featured'           },
  { key: 'ghostTown',        label: 'Ghost Towns'        },
  { key: 'lighthouse',       label: 'Lighthouses'        },
  { key: 'ufo',              label: 'UFO & Paranormal'   },
  { key: 'authorCountry',    label: 'Author Country'     },
  { key: 'coffeeShop',       label: 'Coffee Crawls'      },
  { key: 'bookstore',        label: 'Bookstores'         },
  { key: 'literaryLandmark', label: 'Literary Landmarks' },
  { key: 'route66',          label: 'Route 66'           },
  { key: 'roadTrip',         label: 'Road Trips'         },
];

const US_STATES = [
  'Multi-state','Alabama','Alaska','Arizona','Arkansas','California','Colorado',
  'Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois',
  'Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana',
  'Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York',
  'North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah',
  'Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
  'District of Columbia',
];

// ── Dashed road rule ──────────────────────────────────────────────────────────
function RoadRule({ style = {} }) {
  return (
    <div style={{
      height: 1,
      background: 'repeating-linear-gradient(90deg, #FF4E00 0, #FF4E00 8px, transparent 8px, transparent 16px)',
      opacity: 0.7,
      ...style,
    }} />
  );
}

// ── Stamp badge ───────────────────────────────────────────────────────────────
function StampBadge({ routeType }) {
  const text = (routeType === 'route66' || routeType === 'roadTrip') ? 'Centennial\n2026' : 'Literary\nRoads';
  return (
    <div style={{
      position: 'absolute', top: 10, right: 10,
      width: 44, height: 44, borderRadius: '50%',
      border: `2px solid ${P.orange}`,
      background: 'rgba(255,78,0,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: 'rotate(12deg)',
      pointerEvents: 'none',
    }}>
      <span style={{
        fontFamily: 'Bungee, sans-serif', fontSize: 6,
        color: P.orange, textAlign: 'center', lineHeight: 1.3, whiteSpace: 'pre-line',
        letterSpacing: '0.04em',
      }}>{text}</span>
    </div>
  );
}

// ── Book cover card ───────────────────────────────────────────────────────────
function BookCard({ book, index, onAddToReadNext, onCoverFetched, user, forceAdded }) {
  const [coverUrl, setCoverUrl] = useState(null);
  const [adding, setAdding]     = useState(false);
  const [added, setAdded]       = useState(false);

  useEffect(() => {
    if (!book.title) return;
    const q = [book.title, book.author].filter(Boolean).join(' ');
    fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=1&fields=cover_i`)
      .then(r => r.json())
      .then(data => {
        const coverId = data.docs?.[0]?.cover_i;
        if (coverId) {
          const url = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
          setCoverUrl(url);
          onCoverFetched?.(index, url);
        }
      })
      .catch(() => {});
  }, [book.title, book.author]);

  const handleAdd = async () => {
    if (!user || adding || added) return;
    setAdding(true);
    try { await onAddToReadNext(book, index, coverUrl); setAdded(true); }
    finally { setAdding(false); }
  };

  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      marginBottom: 14, paddingBottom: 14,
      borderBottom: `1px solid ${P.border}`,
    }}>
      <div style={{ width: 44, height: 64, flexShrink: 0, background: '#1a1810', borderRadius: 3, overflow: 'hidden' }}>
        <img
          src={coverUrl || CAT_SRC}
          alt={book.title}
          onLoad={onCoverLoad}
          onError={onCoverError}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: P.cream, marginBottom: 2, lineHeight: 1.3 }}>{book.title}</div>
        {book.author && (
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, marginBottom: 4 }}>{book.author}</div>
        )}
        {book.description && (
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: P.muted, fontStyle: 'italic', marginBottom: 6, lineHeight: 1.4 }}>{book.description}</div>
        )}
        {user && (
          <button onClick={handleAdd} disabled={adding || added || forceAdded} style={{
            background: 'none', border: `1px solid ${(added || forceAdded) ? P.gold : P.teal}`,
            borderRadius: 4, padding: '4px 10px', cursor: (added || forceAdded) ? 'default' : 'pointer',
            fontFamily: 'Bungee, sans-serif', fontSize: 8, letterSpacing: '0.06em',
            color: (added || forceAdded) ? P.gold : P.teal, opacity: adding ? 0.6 : 1,
          }}>
            {(added || forceAdded) ? 'ADDED' : adding ? '...' : '+ READ NEXT'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Featured poster card ──────────────────────────────────────────────────────
function FeaturedPoster({ route, onExplore, onSave, isMobile }) {
  if (!route) return null;
  const stops = route.stops || [];
  const books = Array.isArray(route.readingList) ? route.readingList.filter(b => b.title) : [];
  const firstBook = books[0];

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{
          position: 'absolute', inset: 0,
          transform: 'translate(6px, 6px)',
          background: '#0A0905', borderRadius: 4,
        }} />
        <div style={{
          position: 'relative', border: `2px solid ${P.muted}`,
          borderRadius: 3, overflow: 'hidden', background: P.card,
        }}>
          <div style={{ border: '1px solid #6a6050', margin: 3, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: isMobile ? 160 : 220, background: '#0d0d0d' }}>
              {route.posterImageUrl ? (
                <img src={route.posterImageUrl} alt={route.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <PosterIllustration type={route.routeType} />
              )}
              <div style={{
                position: 'absolute', bottom: 10, left: 10,
                background: P.orange, color: '#fff',
                fontFamily: 'Bungee, sans-serif', fontSize: 8,
                letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 12,
              }}>FEATURED</div>
              <StampBadge routeType={route.routeType} />
            </div>
            <div style={{ background: '#0d1a0d', padding: '16px 18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, height: 1, background: '#2a3a2a' }} />
                <span style={{
                  fontFamily: 'Special Elite, serif', fontSize: 8,
                  letterSpacing: '0.3em', textTransform: 'uppercase', color: '#8a7060',
                }}>{TYPE_LABEL[route.routeType] || route.routeType}</span>
                <div style={{ flex: 1, height: 1, background: '#2a3a2a' }} />
              </div>
              <h2 style={{
                fontFamily: 'Georgia, serif', fontSize: 24, color: P.cream,
                letterSpacing: 1, margin: '0 0 6px', lineHeight: 1.2, textAlign: 'center',
              }}>{route.name}</h2>
              <p style={{
                fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted,
                textAlign: 'center', margin: '0 0 14px',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {stops.length} stops{route.state ? ` · ${route.state}` : ''}{route.reversible ? ' · Reversible' : ''}
              </p>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                border: '1px solid #2a3a2a', borderRadius: 4,
                marginBottom: 14, overflow: 'hidden',
              }}>
                {[
                  { num: stops.length || '—', label: 'STOPS'    },
                  { num: route.state || '—',   label: 'STATE'    },
                  { num: route.duration || '—',label: 'DURATION' },
                  { num: route.difficulty || 'Any', label: 'LEVEL' },
                ].map((m, i) => (
                  <div key={i} style={{
                    padding: '10px 6px', textAlign: 'center',
                    borderRight: i < 3 ? '1px solid #2a3a2a' : 'none',
                  }}>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: P.orange, lineHeight: 1 }}>{m.num}</div>
                    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 8, color: P.muted, letterSpacing: '0.08em', marginTop: 3, textTransform: 'uppercase' }}>{m.label}</div>
                  </div>
                ))}
              </div>
              {firstBook && (
                <div style={{ borderLeft: `2px solid ${P.orange}`, paddingLeft: 10, marginBottom: 16 }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: P.teal, fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{firstBook.title}"
                    {firstBook.author && <span style={{ color: P.muted }}> — {firstBook.author}</span>}
                  </div>
                </div>
              )}
              <button onClick={() => onExplore(route)} style={{
                width: '100%', fontFamily: 'Bungee, sans-serif', fontSize: 11,
                letterSpacing: '0.06em', padding: '10px 16px',
                background: P.orange, color: '#fff', border: 'none',
                borderRadius: 4, cursor: 'pointer',
              }}>EXPLORE THIS ROUTE →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Flat preview card ─────────────────────────────────────────────────────────
function PreviewCard({ route, onExplore, onSave, isMobile }) {
  const typeColor = TYPE_COLOR[route.routeType] || P.teal;
  const stops = route.stops || [];
  const books = Array.isArray(route.readingList) ? route.readingList.filter(b => b.title) : [];
  const firstBook = books[0];

  return (
    <div style={{
      background: P.card,
      border: `1px solid ${P.border}`,
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 14,
    }}>
      {/* Top color bar */}
      <div style={{ height: 3, background: typeColor, opacity: 0.7 }} />

      <div style={{ padding: '14px 16px' }}>
        {/* Type label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <TypeIcon type={route.routeType} color={typeColor} size={16} />
          <span style={{
            fontFamily: 'Special Elite, serif', fontSize: 8, color: typeColor,
            letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>{TYPE_LABEL[route.routeType] || route.routeType}</span>
        </div>

        {/* Route name */}
        <h3 style={{
          fontFamily: 'Georgia, serif', fontSize: isMobile ? 18 : 21,
          color: P.cream, margin: '0 0 4px', lineHeight: 1.25,
        }}>{route.name}</h3>

        {/* Subtitle */}
        <p style={{
          fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted,
          margin: '0 0 12px', letterSpacing: '0.04em',
        }}>
          {[stops.length ? `${stops.length} stops` : null, route.state, route.duration, route.difficulty].filter(Boolean).join(' · ')}
        </p>

        {/* 4-column meta strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          border: `1px solid ${P.border}`, borderRadius: 4,
          marginBottom: 12, overflow: 'hidden',
        }}>
          {[
            { num: stops.length || '—', label: 'STOPS'    },
            { num: route.state || '—',   label: 'STATE'    },
            { num: route.duration || '—',label: 'DURATION' },
            { num: route.difficulty || 'Any', label: 'LEVEL' },
          ].map((m, i) => (
            <div key={i} style={{
              padding: '8px 4px', textAlign: 'center',
              borderRight: i < 3 ? `1px solid ${P.border}` : 'none',
            }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: P.orange, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.num}</div>
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 7, color: P.muted, letterSpacing: '0.07em', marginTop: 2, textTransform: 'uppercase' }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* First book */}
        {firstBook && (
          <div style={{ borderLeft: `2px solid ${P.border}`, paddingLeft: 10, marginBottom: 14 }}>
            <div style={{
              fontFamily: 'Georgia, serif', fontSize: 11, color: P.teal,
              fontStyle: 'italic', lineHeight: 1.4,
            }}>
              "{firstBook.title}"
              {firstBook.author && <span style={{ color: P.muted }}> — {firstBook.author}</span>}
            </div>
          </div>
        )}

        {/* Action button */}
        <button onClick={() => onExplore(route)} style={{
          width: '100%', fontFamily: 'Bungee, sans-serif', fontSize: 10,
          letterSpacing: '0.06em', padding: '9px 14px',
          background: P.orange, color: '#fff', border: 'none',
          borderRadius: 4, cursor: 'pointer',
        }}>EXPLORE THIS ROUTE →</button>
      </div>
    </div>
  );
}

// ── Navigation URL builders ───────────────────────────────────────────────────
const buildGoogleMapsUrl = (stops) => {
  const pts = stops.filter(s => s.lat && s.lng);
  if (!pts.length) return null;
  const origin = `${pts[0].lat},${pts[0].lng}`;
  const dest   = `${pts[pts.length - 1].lat},${pts[pts.length - 1].lng}`;
  const mid    = pts.slice(1, pts.length - 1).slice(0, 8);
  const params = new URLSearchParams({ api: '1', origin, destination: dest, travelmode: 'driving' });
  if (mid.length) params.set('waypoints', mid.map(s => `${s.lat},${s.lng}`).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const buildAppleMapsUrl = (stops) => {
  const pts = stops.filter(s => s.lat && s.lng);
  if (!pts.length) return null;
  return `https://maps.apple.com/?saddr=${pts[0].lat},${pts[0].lng}&daddr=${pts[pts.length - 1].lat},${pts[pts.length - 1].lng}&dirflg=d`;
};

const isIOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

// ── Route detail view ─────────────────────────────────────────────────────────
function RouteDetail({ route, onBack, isMobile, user, onShowLogin }) {
  const [direction, setDirection]       = useState('forward');
  const [selectedLeg, setSelectedLeg]   = useState('all');
  const [checkedStops, setCheckedStops] = useState(() => {
    const ids = {};
    (route.stops || []).forEach((_, i) => { ids[i] = true; });
    return ids;
  });
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [booksExpanded, setBooksExpanded] = useState(true);
  const [showNavModal, setShowNavModal]   = useState(false);
  const [navStops, setNavStops]           = useState([]);
  const [coverUrls, setCoverUrls] = useState({});  // index → url, for Add All
  const [allAdded, setAllAdded]   = useState(false);

  const stops   = route.stops || [];
  const legs    = route.legs  || [];
  const hasLegs = legs.length > 0;
  const hasReverse = route.reversible && route.forwardStartLabel && route.reverseStartLabel;

  const orderedStops   = direction === 'reverse' ? [...stops].reverse() : stops;
  const filteredStops  = hasLegs && selectedLeg !== 'all'
    ? orderedStops.filter(s => s.legNumber === parseInt(selectedLeg))
    : orderedStops;

  const books = Array.isArray(route.readingList) ? route.readingList.filter(b => b.title) : [];

  const getSelectedStops = () =>
    filteredStops.filter((_, idx) => {
      const origIdx = direction === 'reverse' ? stops.length - 1 - idx : idx;
      return checkedStops[origIdx] !== false;
    });

  const handleAddToReadNext = async (book, idx, coverUrl) => {
    if (!user) { onShowLogin?.(); return; }
    const docId = `journey_${route.id}_book${idx}_${Date.now()}`;
    await setDoc(doc(db, 'users', user.uid, 'libraryReadNext', docId), {
      title: book.title, author: book.author || '',
      coverUrl: coverUrl || '',
      whoWhatWhere: `From curated route: ${route.name}`,
      date: serverTimestamp(),
    });
  };

  const handleAddAllToReadNext = async () => {
    if (!user || allAdded) { if (!user) onShowLogin?.(); return; }
    await Promise.all(books.map((book, i) => handleAddToReadNext(book, i, coverUrls[i] || null)));
    setAllAdded(true);
  };

  const handleSaveRoute = async () => {
    if (!user) { onShowLogin?.(); return; }
    if (saving || saved) return;
    setSaving(true);
    try {
      const selectedStops = getSelectedStops();
      const countsByType = {};
      selectedStops.forEach(s => {
        const key = `${s.type || route.routeType}Count`;
        countsByType[key] = (countsByType[key] || 0) + 1;
      });
      const routeId = `curated_${route.id}_${Date.now()}`;
      await setDoc(doc(db, 'users', user.uid, 'savedRoutes', routeId), {
        routeName: route.name, routeType: route.routeType,
        direction, stops: selectedStops, readingList: books,
        curatedRouteRef: route.id, ...countsByType,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
    } catch (err) {
      console.error('[JourneysPage] save route failed:', err);
    } finally { setSaving(false); }
  };

  const handleNavigateStops = () => {
    const selected = getSelectedStops().filter(s => s.lat && s.lng);
    if (!selected.length) return;
    // Save in background simultaneously
    if (user && !saved) { handleSaveRoute(); }
    setNavStops(selected);
    setShowNavModal(true);
  };

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: P.bg, color: P.cream }}>

      {/* Back nav */}
      <div style={{
        background: P.navBg, borderBottom: `1px solid ${P.border}`,
        padding: '0 20px', position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', minHeight: 48,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.teal,
          letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6,
          padding: '12px 8px 12px 0', minHeight: 48,
        }}>
          ← BACK TO JOURNEYS
        </button>
      </div>

      {/* Illustration */}
      <div style={{ height: isMobile ? 200 : 260, position: 'relative', background: '#0d0d0d', flexShrink: 0 }}>
        {route.posterImageUrl ? (
          <img src={route.posterImageUrl} alt={route.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <PosterIllustration type={route.routeType} />
        )}
        <StampBadge routeType={route.routeType} />
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: isMobile ? '20px 16px 60px' : '28px 24px 72px' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            display: 'inline-block', marginBottom: 8,
            fontFamily: 'Special Elite, serif', fontSize: 9,
            color: TYPE_COLOR[route.routeType] || P.teal,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            background: (TYPE_COLOR[route.routeType] || P.teal) + '18',
            border: `1px solid ${(TYPE_COLOR[route.routeType] || P.teal)}40`,
            padding: '3px 8px', borderRadius: 10,
          }}>{TYPE_LABEL[route.routeType] || route.routeType}</span>
          <h1 style={{
            fontFamily: 'Georgia, serif', fontSize: isMobile ? 22 : 28,
            color: P.cream, margin: '0 0 6px', lineHeight: 1.2,
          }}>{route.name}</h1>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, margin: 0 }}>
            {[route.state, stops.length + ' stops'].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Direction selector */}
        {hasReverse && (
          <div style={{ marginBottom: 24, padding: 16, background: P.card, border: `1px solid ${P.border}`, borderRadius: 6 }}>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, margin: '0 0 12px' }}>
              Which direction are you traveling?
            </p>
            <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <button onClick={() => setDirection('forward')} style={{
                flex: 1, padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em',
                border: direction === 'forward' ? `2px solid ${P.orange}` : `1px solid ${P.border}`,
                background: direction === 'forward' ? P.orange + '18' : 'transparent',
                color: direction === 'forward' ? P.orange : P.muted,
              }}>→ {route.forwardStartLabel}</button>
              <button onClick={() => setDirection('reverse')} style={{
                flex: 1, padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em',
                border: direction === 'reverse' ? `2px solid ${P.teal}` : `1px solid ${P.border}`,
                background: direction === 'reverse' ? P.teal + '18' : 'transparent',
                color: direction === 'reverse' ? P.teal : P.muted,
              }}>← {route.reverseStartLabel}</button>
            </div>
          </div>
        )}

        {/* Description */}
        {route.description && (
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 1.8, color: P.cream, marginBottom: 24 }}>
            {direction === 'reverse' && route.reverseDescription ? route.reverseDescription : route.description}
          </p>
        )}

        {/* Leg selector */}
        {hasLegs && (
          <div style={{ marginBottom: 20, overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 4 }}>
            {[{ key: 'all', label: 'All legs' }, ...legs.map((leg, i) => ({
              key: String(leg.legNumber || i + 1),
              label: `Leg ${leg.legNumber || i + 1}: ${leg.legName || ''}`,
            }))].map(tab => (
              <button key={tab.key} onClick={() => setSelectedLeg(tab.key)} style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
                fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
                border: selectedLeg === tab.key ? `1.5px solid ${P.orange}` : `1px solid ${P.border}`,
                background: selectedLeg === tab.key ? P.orange + '18' : 'transparent',
                color: selectedLeg === tab.key ? P.orange : P.muted, whiteSpace: 'nowrap',
              }}>{tab.label.toUpperCase()}</button>
            ))}
          </div>
        )}

        {/* Selected leg details */}
        {hasLegs && selectedLeg !== 'all' && (() => {
          const activeLeg = legs.find(l => String(l.legNumber) === selectedLeg);
          if (!activeLeg) return null;
          return (
            <div style={{ marginBottom: 20 }}>
              {activeLeg.legDescription && (
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: P.muted, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 10 }}>
                  {activeLeg.legDescription}
                </div>
              )}
              {activeLeg.legImageUrl && (
                <img src={activeLeg.legImageUrl} alt={activeLeg.legName || `Leg ${activeLeg.legNumber}`}
                  style={{ width: '100%', borderRadius: 8, marginBottom: 10, maxHeight: 220, objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              {activeLeg.legLink && (
                <a href={activeLeg.legLink} target="_blank" rel="noopener noreferrer" style={{
                  fontFamily: 'Special Elite, serif', fontSize: 12,
                  color: P.teal, textDecoration: 'none', display: 'inline-block', marginBottom: 4,
                }}>↗ Learn more about this leg</a>
              )}
            </div>
          );
        })()}

        {/* Stops list */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: P.teal, letterSpacing: '0.08em', marginBottom: 12 }}>STOPS</h3>
          {filteredStops.map((stop, idx) => {
            const origIdx = direction === 'reverse' ? stops.length - 1 - idx : idx;
            const isChecked = checkedStops[origIdx] !== false;
            return (
              <div key={idx} style={{
                display: 'flex', gap: 12, paddingBottom: 14, marginBottom: 14,
                borderBottom: `1px solid ${P.border}`,
                opacity: isChecked ? 1 : 0.4,
              }}>
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  <button
                    onClick={() => setCheckedStops(p => ({ ...p, [origIdx]: !isChecked }))}
                    style={{
                      width: 18, height: 18, borderRadius: 3, cursor: 'pointer',
                      border: `1.5px solid ${isChecked ? P.orange : P.muted}`,
                      background: isChecked ? P.orange + '30' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    {isChecked && <span style={{ color: P.orange, fontSize: 10, lineHeight: 1 }}>✓</span>}
                  </button>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Special Elite, serif', fontSize: 13, fontWeight: 'bold', color: P.cream, marginBottom: 2 }}>
                    <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: P.teal, letterSpacing: '0.06em', marginRight: 8 }}>
                      {idx + 1}
                    </span>
                    {stop.name}
                  </div>
                  {(stop.city || stop.state) && (
                    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, marginBottom: 4 }}>
                      {[stop.city, stop.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {stop.routeNote && (
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: P.muted, fontStyle: 'italic', marginTop: 4, lineHeight: 1.5 }}>{stop.routeNote}</div>
                  )}
                  {stop.stopLink && (
                    <a href={stop.stopLink} target="_blank" rel="noopener noreferrer" style={{
                      display: 'inline-block', marginTop: 4,
                      fontFamily: 'Special Elite, serif', fontSize: 11,
                      color: P.teal, textDecoration: 'none',
                    }}>↗ Learn more</a>
                  )}
                  {stop.stopImageUrl && (
                    <img src={stop.stopImageUrl} alt={stop.name}
                      style={{ width: '100%', borderRadius: 6, marginTop: 8, maxHeight: 180, objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                  {stop.overnightNote && (
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: P.muted + 'cc', fontStyle: 'italic', marginTop: 3, lineHeight: 1.4 }}>
                      <span style={{ color: P.teal, fontStyle: 'normal' }}>Overnight:</span> {stop.overnightNote}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reading list */}
        {books.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: P.teal, letterSpacing: '0.1em', margin: 0 }}>
                READ BEFORE YOU GO
              </h3>
              {!isMobile && books.length > 2 && (
                <button onClick={() => setBooksExpanded(v => !v)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted,
                }}>
                  {booksExpanded ? '▲ Collapse' : '▼ Show all'}
                </button>
              )}
            </div>
            {(booksExpanded || isMobile ? books : books.slice(0, 2)).map((book, i) => (
              <BookCard
                key={i}
                book={book}
                index={i}
                onAddToReadNext={handleAddToReadNext}
                onCoverFetched={(idx, url) => setCoverUrls(p => ({ ...p, [idx]: url }))}
                forceAdded={allAdded}
                user={user}
              />
            ))}
            {user && books.length > 1 && (
              <button onClick={handleAddAllToReadNext} disabled={allAdded} style={{
                marginTop: 8, fontFamily: 'Bungee, sans-serif', fontSize: 9,
                letterSpacing: '0.06em', padding: '7px 14px',
                background: allAdded ? P.gold + '18' : 'transparent',
                color: allAdded ? P.gold : P.muted,
                border: `1px solid ${allAdded ? P.gold : P.border}`,
                borderRadius: 4, cursor: allAdded ? 'default' : 'pointer',
              }}>{allAdded ? 'ALL ADDED TO READ NEXT' : '+ ADD ALL TO READ NEXT'}</button>
            )}
            {!user && (
              <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, fontStyle: 'italic' }}>
                Sign in to save books to your Read Next list.
              </p>
            )}
          </div>
        )}

        {/* Overnight suggestions */}
        {route.overnightSuggestions && (
          <div style={{ marginBottom: 20, padding: 14, background: P.card, borderLeft: `3px solid ${P.gold}`, borderRadius: '0 6px 6px 0' }}>
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: P.gold, letterSpacing: '0.08em', marginBottom: 6 }}>OVERNIGHT SUGGESTIONS</div>
            <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.cream, lineHeight: 1.6 }}>{route.overnightSuggestions}</div>
          </div>
        )}

        {/* Nearest services */}
        {route.nearestServices && (
          <div style={{ marginBottom: 20, padding: 14, background: P.card, borderLeft: `3px solid ${P.teal}`, borderRadius: '0 6px 6px 0' }}>
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: P.teal, letterSpacing: '0.08em', marginBottom: 6 }}>NEAREST SERVICES</div>
            <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.cream, lineHeight: 1.6 }}>{route.nearestServices}</div>
          </div>
        )}

        {route.inspiration && (
          <div style={{ marginBottom: 20, padding: 14, background: P.card, borderLeft: `3px solid ${P.muted}`, borderRadius: '0 6px 6px 0' }}>
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: P.muted, letterSpacing: '0.08em', marginBottom: 6 }}>INSPIRED BY</div>
            <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.cream, lineHeight: 1.6, fontStyle: 'italic' }}>{route.inspiration}</div>
          </div>
        )}

        <RoadRule style={{ marginBottom: 20 }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
          <button
            onClick={handleNavigateStops}
            disabled={getSelectedStops().filter(s => s.lat && s.lng).length === 0}
            style={{
              flex: 1, fontFamily: 'Bungee, sans-serif', fontSize: 11,
              letterSpacing: '0.06em', padding: '12px 20px',
              background: P.orange, color: '#fff', border: 'none',
              borderRadius: 4, cursor: 'pointer',
              opacity: getSelectedStops().filter(s => s.lat && s.lng).length === 0 ? 0.4 : 1,
            }}>NAVIGATE MY STOPS →</button>
          <button onClick={handleSaveRoute} disabled={saving} style={{
            flex: 1, fontFamily: 'Bungee, sans-serif', fontSize: 11,
            letterSpacing: '0.06em', padding: '12px 20px',
            background: 'transparent', color: saved ? P.gold : P.teal,
            border: `1.5px solid ${saved ? P.gold : P.teal}`,
            borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}>{saved ? 'SAVED' : saving ? 'SAVING...' : 'SAVE THIS ROUTE'}</button>
        </div>

        {!user && (
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, fontStyle: 'italic', marginTop: 8, textAlign: 'center' }}>
            Sign in to save routes and sync across devices.
          </p>
        )}
      </div>

      {/* Navigation modal */}
      {showNavModal && navStops.length > 0 && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowNavModal(false)}
        >
          <div
            style={{
              width: '100%', maxWidth: 512, maxHeight: '80vh', overflowY: 'auto',
              WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
              background: '#1A1B2E', borderTop: '4px solid #40E0D0',
              borderRadius: '24px 24px 0 0',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#1A1B2E', padding: '20px 20px 16px', borderBottom: '1px solid rgba(64,224,208,0.15)' }}>
              <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 18, color: '#40E0D0', textShadow: '0 0 8px rgba(64,224,208,0.7)', margin: 0 }}>
                NAVIGATE YOUR STOPS
              </h3>
              <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: 'rgba(192,192,192,0.6)', margin: '2px 0 0' }}>
                {navStops.length} stop{navStops.length !== 1 ? 's' : ''} · {route.name}
              </p>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(() => {
                const url = buildGoogleMapsUrl(navStops);
                return url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 12,
                             background: 'rgba(66,133,244,0.12)', border: '2px solid rgba(66,133,244,0.55)',
                             borderRadius: 12, padding: '14px 16px', textDecoration: 'none', minHeight: 64 }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: 'Bungee, sans-serif', display: 'block', fontSize: 14, color: '#F5F5DC' }}>Google Maps</span>
                      <span style={{ fontFamily: 'Special Elite, serif', display: 'block', fontSize: 11, color: 'rgba(192,192,192,0.5)' }}>
                        {navStops.length} stops pre-loaded · turn-by-turn navigation
                      </span>
                    </div>
                    <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: '#4285F4', flexShrink: 0 }}>Recommended</span>
                  </a>
                ) : null;
              })()}
              {isIOS() && (() => {
                const url = buildAppleMapsUrl(navStops);
                return url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 12,
                             background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(192,192,192,0.2)',
                             borderRadius: 12, padding: '12px 16px', textDecoration: 'none', minHeight: 60 }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: 'Bungee, sans-serif', display: 'block', fontSize: 14, color: '#F5F5DC' }}>Apple Maps</span>
                      <span style={{ fontFamily: 'Special Elite, serif', display: 'block', fontSize: 11, color: 'rgba(192,192,192,0.4)' }}>
                        First and last stop · limited waypoint support
                      </span>
                    </div>
                  </a>
                ) : null;
              })()}
            </div>
            <div style={{ position: 'sticky', bottom: 0, zIndex: 10, background: '#1A1B2E', padding: '12px 20px 20px', borderTop: '1px solid rgba(64,224,208,0.15)' }}>
              <button onClick={() => setShowNavModal(false)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                         fontFamily: 'Special Elite, serif', color: 'rgba(192,192,192,0.5)', fontSize: 14, padding: '8px 0' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function JourneysPage({
  onBack,
  onShowDayTrip,
  onShowFestivalTrip,
  onShowLogin,
}) {
  const { user } = useAuth();
  const [routes, setRoutes]           = useState([]);
  const [featured, setFeatured]       = useState(null);
  const [loading, setLoading]         = useState(true);
  // filter = null → landing (featured poster). filter = 'ghostTown' etc → preview cards.
  const [filter, setFilter]           = useState(null);
  const [stateFilter, setStateFilter] = useState('');
  const navigate_    = useNavigate();
  const location_    = useLocation();

  // Derive detail from URL + location state — /journeys/:id → detail view
  const journeySubPath = location_.pathname.replace(/^\/journeys\/?/, '').split('?')[0];
  const detail = journeySubPath ? (location_.state?.route ?? null) : null;

  const openDetail  = useCallback((route) => {
    navigate_(`/journeys/${route.id}`, { state: { route } });
  }, [navigate_]);
  const closeDetail = useCallback(() => navigate_(-1), [navigate_]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const [catHover, setCatHover] = useState(false);
  const [showSecretRoom, setShowSecretRoom] = useState(false);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      // Simple single-field query — no composite index needed, no createdAt-missing exclusion.
      // Sort client-side so documents without createdAt still appear.
      const snap = await getDocs(query(
        collection(db, 'curatedRoutes'),
        where('active', '==', true),
      ));
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

      setRoutes(all);

      const featuredRoutes = all.filter(r => r.featured);
      const sorted = featuredRoutes.length > 0
        ? [...featuredRoutes].sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0))
        : all;
      if (sorted.length > 0) setFeatured(sorted[0]);
    } catch (err) {
      console.error('[JourneysPage] load routes failed:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  const filteredRoutes = routes.filter(r => {
    if (filter !== null) {
      const typeMatch = filter === 'roadTrip'
        ? (r.routeType === 'roadTrip' || r.routeType === 'route66')
        : r.routeType === filter;
      if (!typeMatch) return false;
    }
    if (stateFilter && r.state !== stateFilter) return false;
    return true;
  });

  const handleSaveRoute = async (route) => {
    if (!user) { onShowLogin?.(); return; }
    try {
      const docId = `curated_${route.id}_${Date.now()}`;
      await setDoc(doc(db, 'users', user.uid, 'savedRoutes', docId), {
        routeName: route.name, routeType: route.routeType,
        stops: route.stops || [],
        readingList: Array.isArray(route.readingList) ? route.readingList.filter(b => b.title) : [],
        curatedRouteRef: route.id,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[JourneysPage] quick save failed:', err);
    }
  };

  const selectFilter = (key) => setFilter(key);

  // ── Detail view ───────────────────────────────────────────────────────────
  if (detail) {
    return (
      <RouteDetail
        route={detail}
        onBack={closeDetail}
        isMobile={isMobile}
        user={user}
        onShowLogin={onShowLogin}
      />
    );
  }

  // ── Landing / browse page ─────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: P.bg, color: P.cream }}>
      <style>{`
        @keyframes journey-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>

      {/* Sticky nav bar */}
      <div style={{
        background: P.navBg, borderBottom: `1px solid ${P.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', position: 'sticky', top: 0, zIndex: 100, minHeight: 48,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.teal,
          letterSpacing: '0.06em', padding: '12px 0', minHeight: 48,
        }}>← MAP</button>
        <span style={{
          fontFamily: 'Bungee, sans-serif', fontSize: 14, color: P.teal,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          textShadow: '0 0 8px rgba(64,224,208,0.5)',
        }}>LITERARY ROADS</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Special Elite, serif', fontSize: 9, color: P.teal,
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6,
            }}>Plan your next adventure</div>
            <h1 style={{
              fontFamily: 'Bungee, sans-serif',
              fontSize: isMobile ? 36 : 52,
              color: P.teal, margin: '0 0 8px', lineHeight: 1,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              textShadow: '0 0 20px rgba(64,224,208,0.65)',
            }}>
              JOURNEY<span style={{ color: P.orange }}>S</span>
            </h1>
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted,
              margin: 0, lineHeight: 1.5,
            }}>
              Curated literary road trips — ghost towns, lighthouses, author country, and the open road.
            </p>
          </div>
          {/* Journey cat — easter egg */}
          <div style={{ textAlign: 'center', flexShrink: 0, marginLeft: 20, position: 'relative' }}>
            <div
              style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
              onClick={() => setShowSecretRoom(true)}
              onMouseEnter={() => setCatHover(true)}
              onMouseLeave={() => setCatHover(false)}
            >
              <img
                src={JOURNEY_CAT_SRC}
                alt="Your guide"
                onError={e => { e.currentTarget.style.display = 'none'; }}
                style={{
                  height: isMobile ? 100 : 120,
                  display: 'block',
                  animation: 'journey-float 3s ease-in-out infinite',
                  transition: 'filter 0.2s',
                  filter: catHover ? 'brightness(1.1)' : 'none',
                }}
              />
              {catHover && (
                <div style={{
                  position: 'absolute', top: -22, left: '50%',
                  transform: 'translateX(-50%)',
                  fontFamily: 'Special Elite, serif',
                  fontSize: 11, color: 'rgba(245,245,220,0.45)',
                  pointerEvents: 'none', userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}>purrrr</div>
              )}
            </div>
            <div style={{
              fontFamily: 'Special Elite, serif', fontSize: 8,
              color: P.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4,
            }}>Your guide</div>
          </div>
        </div>

        <RoadRule style={{ marginBottom: 16 }} />

        {/* Filter pills — primary navigation, first interactive element */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 20,
          alignItems: 'center',
          // Hide scrollbar for cleaner look
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}>
          {FILTER_PILLS.map(pill => {
            const active = filter === pill.key;
            const isFeatured = pill.key === null;
            return (
              <button
                key={String(pill.key)}
                onClick={() => selectFilter(pill.key)}
                style={{
                  flexShrink: 0, minHeight: 36, padding: '6px 14px', borderRadius: 18,
                  cursor: active ? 'default' : 'pointer',
                  fontFamily: 'Bungee, sans-serif', fontSize: 9,
                  letterSpacing: '0.08em', whiteSpace: 'nowrap',
                  background: active ? (isFeatured ? P.teal : P.orange) : 'transparent',
                  color: active ? (isFeatured ? '#1C1A14' : '#fff') : (isFeatured ? P.teal : P.muted),
                  border: active ? 'none' : `1px solid ${isFeatured ? P.teal + '60' : '#3a3520'}`,
                  transition: 'all 0.12s',
                }}
              >
                {pill.label.toUpperCase()}
              </button>
            );
          })}
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} style={{
            flexShrink: 0, minHeight: 36, padding: '6px 10px', borderRadius: 18,
            cursor: 'pointer', fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
            background: stateFilter ? P.orange + '18' : 'transparent',
            color: stateFilter ? P.orange : P.muted,
            border: stateFilter ? `1px solid ${P.orange}` : '1px solid #3a3520',
            outline: 'none',
          }}>
            <option value="">ALL STATES</option>
            {US_STATES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>

        {/* Content area: featured poster (filter=null) OR preview cards (filter set) */}
        {loading ? (
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted, padding: '32px 0' }}>
            Loading routes…
          </div>
        ) : filter === null ? (
          /* ── Landing: featured poster ── */
          <>
            {featured ? (
              <FeaturedPoster
                route={featured}
                onExplore={openDetail}
                onSave={handleSaveRoute}
                isMobile={isMobile}
              />
            ) : (
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted, padding: '32px 0', textAlign: 'center' }}>
                No featured routes yet — select a type above to browse.
              </div>
            )}
          </>
        ) : (
          /* ── Type selected: flat preview cards ── */
          <>
            {filteredRoutes.length === 0 ? (
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted, padding: '32px 0', textAlign: 'center' }}>
                No {TYPE_LABEL[filter] || filter} routes yet.
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TypeIcon type={filter} size={16} />
                  <span style={{
                    fontFamily: 'Bungee, sans-serif', fontSize: 11,
                    color: TYPE_COLOR[filter] || P.teal, letterSpacing: '0.08em',
                  }}>{(TYPE_LABEL[filter] || filter).toUpperCase()}</span>
                  <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted }}>
                    — {filteredRoutes.length} {filteredRoutes.length === 1 ? 'route' : 'routes'}
                  </span>
                </div>
                {filteredRoutes.map(route => (
                  <PreviewCard
                    key={route.id}
                    route={route}
                    onExplore={openDetail}
                    onSave={handleSaveRoute}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Secret room overlay */}
      {showSecretRoom && (
        <SecretRoom onClose={() => setShowSecretRoom(false)} />
      )}

      {/* Footer */}
      <div style={{
        background: P.navBg, borderTop: `0.5px solid ${P.border}`,
        padding: '14px 24px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', marginTop: 32,
      }}>
        <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted }}>
          {routes.length} {routes.length === 1 ? 'route' : 'routes'}
        </span>
        <div style={{ display: 'flex', gap: 16 }}>
          {onShowDayTrip && (
            <button onClick={onShowDayTrip} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted,
            }}>Day Trip →</button>
          )}
          {onShowFestivalTrip && (
            <button onClick={onShowFestivalTrip} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted,
            }}>Festival Trip →</button>
          )}
        </div>
      </div>
    </div>
  );
}
