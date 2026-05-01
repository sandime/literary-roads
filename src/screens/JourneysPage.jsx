// JourneysPage.jsx — Full-screen curated literary road trips page.
import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  collection, getDocs, query, where, orderBy,
  doc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import PosterIllustration from '../components/journey/PosterIllustrations';
import { BookIcon, CoffeeCupIcon, LiteraryLandmarkIcon } from '../components/Icons';

const CAT_SRC = `${import.meta.env.BASE_URL}images/library-cat.png`;
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
};

// ── Ghost SVG icon (mirrors the map marker) ───────────────────────────────────
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

// ── Type-specific icons (no emojis) ───────────────────────────────────────────
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
      // Simple road/route SVG for remaining types
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M3 12h18M12 3l-5 9h10L12 3z" />
        </svg>
      );
  }
}

const FILTER_PILLS = [
  { key: '',                 label: 'All routes'         },
  { key: 'ghostTown',        label: 'Ghost Towns'        },
  { key: 'lighthouse',       label: 'Lighthouses'        },
  { key: 'ufo',              label: 'UFO & Paranormal'   },
  { key: 'authorCountry',    label: 'Author Country'     },
  { key: 'coffeeShop',       label: 'Coffee Crawls'      },
  { key: 'bookstore',        label: 'Bookstores'         },
  { key: 'literaryLandmark', label: 'Literary Landmarks' },
  { key: 'route66',          label: 'Route 66'           },
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
  const text = routeType === 'route66' ? 'Centennial\n2026' : 'Literary\nRoads';
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

// ── Book cover card (fetches from Open Library) ───────────────────────────────
function BookCard({ book, index, onAddToReadNext, user }) {
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
        if (coverId) setCoverUrl(`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`);
      })
      .catch(() => {});
  }, [book.title, book.author]);

  const handleAdd = async () => {
    if (!user || adding || added) return;
    setAdding(true);
    try {
      await onAddToReadNext(book, index, coverUrl);
      setAdded(true);
    } finally { setAdding(false); }
  };

  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      marginBottom: 14, paddingBottom: 14,
      borderBottom: `1px solid ${P.border}`,
    }}>
      {/* Cover */}
      <div style={{
        width: 44, height: 64, flexShrink: 0,
        background: '#1a1810', borderRadius: 3, overflow: 'hidden',
      }}>
        <img
          src={coverUrl || CAT_SRC}
          alt={book.title}
          onLoad={onCoverLoad}
          onError={onCoverError}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Georgia, serif', fontSize: 13, color: P.cream,
          marginBottom: 2, lineHeight: 1.3,
        }}>{book.title}</div>
        {book.author && (
          <div style={{
            fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, marginBottom: 4,
          }}>{book.author}</div>
        )}
        {book.description && (
          <div style={{
            fontFamily: 'Georgia, serif', fontSize: 11, color: P.muted,
            fontStyle: 'italic', marginBottom: 6, lineHeight: 1.4,
          }}>{book.description}</div>
        )}
        {user && (
          <button onClick={handleAdd} disabled={adding || added} style={{
            background: 'none', border: `1px solid ${added ? P.gold : P.teal}`,
            borderRadius: 4, padding: '4px 10px', cursor: added ? 'default' : 'pointer',
            fontFamily: 'Bungee, sans-serif', fontSize: 8, letterSpacing: '0.06em',
            color: added ? P.gold : P.teal, opacity: adding ? 0.6 : 1,
          }}>
            {added ? 'ADDED' : adding ? '...' : '+ READ NEXT'}
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
    <div style={{ marginBottom: 36 }}>
      <div style={{ position: 'relative', width: '100%' }}>
        {/* 3D shadow */}
        <div style={{
          position: 'absolute', inset: 0,
          transform: 'translate(6px, 6px)',
          background: '#0A0905', borderRadius: 4,
        }} />
        {/* Main card */}
        <div style={{
          position: 'relative',
          border: `2px solid ${P.muted}`,
          borderRadius: 3, overflow: 'hidden', background: P.card,
        }}>
          <div style={{ border: '1px solid #6a6050', margin: 3, borderRadius: 2, overflow: 'hidden' }}>
            {/* Illustration */}
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
              }}>LITERARY ROADS</div>
              <StampBadge routeType={route.routeType} />
            </div>
            {/* Content */}
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
              {/* Meta strip */}
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
              <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
                <button onClick={() => onExplore(route)} style={{
                  flex: 1, fontFamily: 'Bungee, sans-serif', fontSize: 11,
                  letterSpacing: '0.06em', padding: '10px 16px',
                  background: P.orange, color: '#fff', border: 'none',
                  borderRadius: 4, cursor: 'pointer',
                }}>EXPLORE THIS ROUTE →</button>
                <button onClick={() => onSave(route)} style={{
                  flex: 1, fontFamily: 'Bungee, sans-serif', fontSize: 11,
                  letterSpacing: '0.06em', padding: '10px 16px',
                  background: 'transparent', color: P.teal,
                  border: `1.5px solid ${P.teal}`, borderRadius: 4, cursor: 'pointer',
                }}>SAVE</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Route card (parallelogram) ────────────────────────────────────────────────
function RouteCard({ route, onClick, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const typeColor = TYPE_COLOR[route.routeType] || P.teal;
  const skew = isMobile ? -2 : -4;
  const stops = route.stops || [];
  const books = Array.isArray(route.readingList) ? route.readingList.filter(b => b.title) : [];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', cursor: 'pointer', marginBottom: 16, minHeight: 44 }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        transform: `skewX(${skew}deg) translate(5px, 5px)`,
        background: typeColor + '30', borderRadius: 4,
      }} />
      <div style={{
        position: 'relative', background: P.card,
        border: '0.5px solid #3a3520', borderRadius: 4, overflow: 'hidden',
        transform: hovered ? `skewX(${skew}deg) translate(-1px, -1px)` : `skewX(${skew}deg)`,
        transition: 'transform 0.15s ease',
      }}>
        <div style={{ height: 2, background: typeColor }} />
        <div style={{ transform: `skewX(${-skew}deg)`, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ filter: `drop-shadow(0 0 6px ${typeColor})`, display: 'flex', alignItems: 'center' }}>
              <TypeIcon type={route.routeType} color={typeColor} size={20} />
            </span>
            <span style={{
              fontFamily: 'Special Elite, serif', fontSize: 8,
              color: typeColor, letterSpacing: '0.15em', textTransform: 'uppercase',
            }}>{TYPE_LABEL[route.routeType] || route.routeType}</span>
          </div>
          <div style={{
            fontFamily: 'Georgia, serif', fontSize: 13, color: P.cream,
            lineHeight: 1.35, marginBottom: 6,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{route.name}</div>
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 9, color: P.muted, marginBottom: 8 }}>
            {[route.state, stops.length ? `${stops.length} stops` : null, route.duration].filter(Boolean).join(' · ')}
          </div>
          {books[0] && (
            <div style={{ borderTop: '0.5px solid #2a2820', paddingTop: 8, marginTop: 4 }}>
              <div style={{
                fontFamily: 'Georgia, serif', fontSize: 10, color: P.teal,
                fontStyle: 'italic', lineHeight: 1.4,
              }}>
                {books[0].title}
                {books[0].author && <span style={{ color: P.muted }}> — {books[0].author}</span>}
              </div>
            </div>
          )}
          <div style={{
            marginTop: 10, fontFamily: 'Special Elite, serif', fontSize: 9,
            color: P.orange, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>EXPLORE →</div>
        </div>
      </div>
    </div>
  );
}

// ── Route detail view ─────────────────────────────────────────────────────────
function RouteDetail({ route, onBack, onLoadOnMap, isMobile, user, onShowLogin }) {
  const [direction, setDirection]       = useState('forward');
  const [selectedLeg, setSelectedLeg]   = useState('all');
  const [checkedStops, setCheckedStops] = useState(() => {
    const ids = {};
    (route.stops || []).forEach((_, i) => { ids[i] = true; });
    return ids;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [booksExpanded, setBooksExpanded] = useState(true);

  const stops    = route.stops || [];
  const legs     = route.legs  || [];
  const hasLegs  = legs.length > 0;
  const hasReverse = route.reversible && route.forwardStartLabel && route.reverseStartLabel;

  const orderedStops = direction === 'reverse' ? [...stops].reverse() : stops;
  const filteredStops = hasLegs && selectedLeg !== 'all'
    ? orderedStops.filter(s => s.legNumber === parseInt(selectedLeg))
    : orderedStops;

  const books = Array.isArray(route.readingList)
    ? route.readingList.filter(b => b.title)
    : [];

  const handleAddToReadNext = async (book, idx, coverUrl) => {
    if (!user) { onShowLogin?.(); return; }
    const docId = `journey_${route.id}_book${idx}_${Date.now()}`;
    await setDoc(doc(db, 'users', user.uid, 'libraryReadNext', docId), {
      title:        book.title,
      author:       book.author || '',
      coverUrl:     coverUrl || '',
      whoWhatWhere: `From curated route: ${route.name}`,
      date:         serverTimestamp(),
    });
  };

  const handleAddAllToReadNext = async () => {
    if (!user) { onShowLogin?.(); return; }
    await Promise.all(books.map((book, i) => handleAddToReadNext(book, i, null)));
  };

  const handleSaveRoute = async () => {
    if (!user) { onShowLogin?.(); return; }
    if (saving || saved) return;
    setSaving(true);
    try {
      const selectedStops = filteredStops.filter((_, i) => {
        const origIdx = direction === 'reverse' ? stops.length - 1 - i : i;
        return checkedStops[origIdx] !== false;
      });
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

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: P.bg, color: P.cream }}>

      {/* Back nav — min 44px touch target */}
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

      <div style={{ maxWidth: 680, margin: '0 auto', padding: isMobile ? '20px 16px 48px' : '28px 24px 60px' }}>

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
            {[route.state, (route.stops || []).length + ' stops'].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Direction selector */}
        {hasReverse && (
          <div style={{
            marginBottom: 24, padding: 16,
            background: P.card, border: `1px solid ${P.border}`, borderRadius: 6,
          }}>
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
          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 1.8,
            color: P.cream, marginBottom: 24,
          }}>
            {direction === 'reverse' && route.reverseDescription
              ? route.reverseDescription : route.description}
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
                    <div style={{
                      fontFamily: 'Georgia, serif', fontSize: 12, color: P.muted,
                      fontStyle: 'italic', marginTop: 4, lineHeight: 1.5,
                    }}>{stop.routeNote}</div>
                  )}
                  {stop.stopLink && (
                    <a href={stop.stopLink} target="_blank" rel="noopener noreferrer" style={{
                      display: 'inline-block', marginTop: 4,
                      fontFamily: 'Special Elite, serif', fontSize: 11,
                      color: P.teal, textDecoration: 'none',
                    }}>↗ Learn more</a>
                  )}
                  {stop.overnightNote && (
                    <div style={{
                      fontFamily: 'Georgia, serif', fontSize: 11,
                      color: P.muted + 'cc', fontStyle: 'italic', marginTop: 3, lineHeight: 1.4,
                    }}>Overnight: {stop.overnightNote}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reading list with individual book cards */}
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
                user={user}
              />
            ))}
            {user && books.length > 1 && (
              <button onClick={handleAddAllToReadNext} style={{
                marginTop: 8, fontFamily: 'Bungee, sans-serif', fontSize: 9,
                letterSpacing: '0.06em', padding: '7px 14px',
                background: 'transparent', color: P.muted,
                border: `1px solid ${P.border}`, borderRadius: 4, cursor: 'pointer',
              }}>+ ADD ALL TO READ NEXT</button>
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
          <div style={{
            marginBottom: 20, padding: 14,
            background: P.card, borderLeft: `3px solid ${P.gold}`,
            borderRadius: '0 6px 6px 0',
          }}>
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: P.gold, letterSpacing: '0.08em', marginBottom: 6 }}>OVERNIGHT SUGGESTIONS</div>
            <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.cream, lineHeight: 1.6 }}>{route.overnightSuggestions}</div>
          </div>
        )}

        {/* Nearest services */}
        {route.nearestServices && (
          <div style={{
            marginBottom: 20, padding: 14,
            background: P.card, borderLeft: `3px solid ${P.teal}`,
            borderRadius: '0 6px 6px 0',
          }}>
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: P.teal, letterSpacing: '0.08em', marginBottom: 6 }}>NEAREST SERVICES</div>
            <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.cream, lineHeight: 1.6 }}>{route.nearestServices}</div>
          </div>
        )}

        {/* Inspiration */}
        {route.inspiration && (
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: P.muted, fontStyle: 'italic', marginBottom: 24, lineHeight: 1.5 }}>
            {route.inspiration}
          </p>
        )}

        <RoadRule style={{ marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
          <button onClick={() => onLoadOnMap(route, direction, checkedStops)} style={{
            flex: 1, fontFamily: 'Bungee, sans-serif', fontSize: 11,
            letterSpacing: '0.06em', padding: '12px 20px',
            background: P.orange, color: '#fff', border: 'none',
            borderRadius: 4, cursor: 'pointer',
          }}>LOAD THIS ROUTE ON THE MAP</button>
          <button onClick={handleSaveRoute} disabled={saving} style={{
            flex: 1, fontFamily: 'Bungee, sans-serif', fontSize: 11,
            letterSpacing: '0.06em', padding: '12px 20px',
            background: 'transparent', color: saved ? P.gold : P.teal,
            border: `1.5px solid ${saved ? P.gold : P.teal}`,
            borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}>{saved ? 'SAVED ✓' : saving ? 'SAVING...' : 'SAVE THIS ROUTE'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function JourneysPage({
  onBack,
  onShowDayTrip,
  onShowFestivalTrip,
  onLoadCuratedRoute,
  onShowLogin,
}) {
  const { user } = useAuth();
  const [routes, setRoutes]           = useState([]);
  const [featured, setFeatured]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [detail, setDetail]           = useState(null);
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const planDropRef      = useRef(null);
  const curatedSectionRef = useRef(null);

  // Always start on landing page — never auto-open detail
  const openDetail = useCallback((route) => setDetail(route), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  useEffect(() => {
    if (!showPlanDropdown) return;
    const fn = (e) => { if (!planDropRef.current?.contains(e.target)) setShowPlanDropdown(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [showPlanDropdown]);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      let snap;
      try {
        // Try with orderBy (requires composite index — may still be building)
        snap = await getDocs(query(
          collection(db, 'curatedRoutes'),
          where('active', '==', true),
          orderBy('createdAt', 'desc'),
        ));
      } catch {
        // Index not ready — fall back to unordered query, sort client-side
        snap = await getDocs(query(
          collection(db, 'curatedRoutes'),
          where('active', '==', true),
        ));
      }
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

      setRoutes(all);

      const featuredRoutes = all.filter(r => r.featured);
      if (featuredRoutes.length > 0) {
        const sorted = [...featuredRoutes].sort((a, b) =>
          (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0)
        );
        setFeatured(sorted[0]);
      } else if (all.length > 0) {
        setFeatured(all[0]);
      }
    } catch (err) {
      console.error('[JourneysPage] load routes failed:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  const filteredRoutes = routes.filter(r => {
    if (filter && r.routeType !== filter) return false;
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

  const handleLoadOnMap = (route, direction, checkedStops) => {
    const stops = route.stops || [];
    const orderedStops = direction === 'reverse' ? [...stops].reverse() : stops;
    const selectedStops = orderedStops.filter((_, i) => {
      const origIdx = direction === 'reverse' ? stops.length - 1 - i : i;
      return checkedStops == null || checkedStops[origIdx] !== false;
    });
    onLoadCuratedRoute?.({ route, stops: selectedStops, direction });
  };

  // ── Detail view ────────────────────────────────────────────────────────────
  if (detail) {
    return (
      <RouteDetail
        route={detail}
        onBack={closeDetail}
        onLoadOnMap={handleLoadOnMap}
        isMobile={isMobile}
        user={user}
        onShowLogin={onShowLogin}
      />
    );
  }

  // ── Landing page ───────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: P.bg, color: P.cream }}>

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
        }}>
          Literary Roads
        </span>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted,
          padding: '12px 0', minHeight: 48,
        }}>Library</button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{
              fontFamily: 'Special Elite, serif', fontSize: 9, color: P.teal,
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6,
            }}>Plan your next adventure</div>
            <h1 style={{
              fontFamily: 'Bungee, sans-serif',
              fontSize: isMobile ? 28 : 38,
              color: P.teal, margin: '0 0 6px', lineHeight: 1,
              letterSpacing: '0.05em', textTransform: 'uppercase',
              textShadow: '0 0 18px rgba(64,224,208,0.6)',
            }}>
              JOURNEY<span style={{ color: P.orange }}>S</span>
            </h1>
            {(!isMobile || window.innerWidth > 400) && (
              <p style={{
                fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted,
                margin: 0, lineHeight: 1.5,
              }}>
                Curated literary road trips — ghost towns, lighthouses, author country, and the open road.
              </p>
            )}
          </div>
          {/* Journey cat */}
          <div style={{ textAlign: 'center', flexShrink: 0, marginLeft: 16 }}>
            <img
              src={`${import.meta.env.BASE_URL}images/journey-cat.png`}
              alt="Your guide"
              style={{ height: isMobile ? 60 : 80, display: 'block', margin: '0 auto' }}
              onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }}
            />
            <span style={{ display: 'none', fontSize: 32, lineHeight: 1 }}>&#9992;</span>
            <div style={{
              fontFamily: 'Special Elite, serif', fontSize: 8,
              color: P.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4,
            }}>Your guide</div>
          </div>
        </div>

        <RoadRule style={{ marginBottom: 22 }} />

        {/* Plan buttons */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 28,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div ref={planDropRef} style={{ position: 'relative', flex: isMobile ? undefined : '0 0 auto' }}>
            <button onClick={() => setShowPlanDropdown(v => !v)} style={{
              width: isMobile ? '100%' : 'auto',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em',
              padding: '10px 20px', background: P.orange, color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer',
            }}>PLAN YOUR OWN TRIP ▾</button>
            {showPlanDropdown && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                background: P.card, border: `1.5px solid ${P.border}`,
                borderRadius: 8, zIndex: 200, minWidth: 180, overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}>
                <button onClick={() => { setShowPlanDropdown(false); onShowDayTrip?.(); }} style={{
                  width: '100%', padding: '11px 16px', textAlign: 'left',
                  fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.cream,
                  background: 'transparent', border: 'none',
                  borderBottom: `1px solid ${P.border}`, cursor: 'pointer',
                }}>
                  DAY TRIP
                  <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted, marginTop: 1, fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>Local literary loop</div>
                </button>
                <button onClick={() => { setShowPlanDropdown(false); onShowFestivalTrip?.(); }} style={{
                  width: '100%', padding: '11px 16px', textAlign: 'left',
                  fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.cream,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                }}>
                  FESTIVAL TRIP
                  <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted, marginTop: 1, fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>Plan around a festival</div>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => curatedSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              flex: isMobile ? undefined : '0 0 auto',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em',
              padding: '10px 20px', background: 'transparent',
              color: P.teal, border: `1.5px solid ${P.teal}`,
              borderRadius: 4, cursor: 'pointer',
            }}>BROWSE CURATED ROUTES</button>
        </div>

        {/* Featured route */}
        {loading ? (
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted, marginBottom: 32 }}>
            Loading routes…
          </div>
        ) : featured ? (
          <FeaturedPoster
            route={featured}
            onExplore={openDetail}
            onSave={handleSaveRoute}
            isMobile={isMobile}
          />
        ) : null}

        {/* Curated routes section */}
        <div ref={curatedSectionRef}>
          <RoadRule style={{ marginBottom: 20 }} />

          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, alignItems: 'center' }}>
            {FILTER_PILLS.map(pill => (
              <button key={pill.key} onClick={() => setFilter(pill.key)} style={{
                flexShrink: 0, minHeight: 36, padding: '6px 14px', borderRadius: 18,
                cursor: 'pointer', fontFamily: 'Bungee, sans-serif', fontSize: 9,
                letterSpacing: '0.08em', whiteSpace: 'nowrap',
                background: filter === pill.key ? P.orange : 'transparent',
                color: filter === pill.key ? '#fff' : P.muted,
                border: filter === pill.key ? 'none' : '1px solid #3a3520',
                transition: 'all 0.12s',
              }}>{pill.label.toUpperCase()}</button>
            ))}
            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} style={{
              flexShrink: 0, minHeight: 36, padding: '6px 10px', borderRadius: 18,
              cursor: 'pointer', fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
              background: stateFilter ? P.orange + '18' : 'transparent',
              color: stateFilter ? P.orange : P.muted,
              border: stateFilter ? `1px solid ${P.orange}` : '1px solid #3a3520',
            }}>
              <option value="">ALL STATES</option>
              {US_STATES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
          </div>

          {/* Cards grid */}
          {loading ? (
            <div style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted }}>Loading…</div>
          ) : filteredRoutes.length === 0 ? (
            <div style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted, padding: '32px 0', textAlign: 'center' }}>
              No routes found for this filter.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? 0 : 16,
            }}>
              {filteredRoutes.map(route => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onClick={() => openDetail(route)}
                  isMobile={isMobile}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: P.navBg, borderTop: `0.5px solid ${P.border}`,
        padding: '14px 24px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', marginTop: 40,
      }}>
        <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted }}>
          {routes.length} {routes.length === 1 ? 'route' : 'routes'}
        </span>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Special Elite, serif', fontSize: 11, color: P.orange,
        }}>Suggest a route →</button>
      </div>
    </div>
  );
}
