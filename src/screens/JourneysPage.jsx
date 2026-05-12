// JourneysPage.jsx — Curated literary road trips page.
import { useState, useEffect, useCallback, useMemo } from 'react';
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

// Category definitions for the stamp-album landing
const CATEGORY_DEFS = [
  { key: 'route66',          label: 'Route 66',            sub: 'Centennial 2026'     },
  { key: 'ghostTown',        label: 'Ghost Towns',         sub: 'Boom & bust'         },
  { key: 'lighthouse',       label: 'Lighthouses',         sub: 'Coastal beacons'     },
  { key: 'ufo',              label: 'UFO & Paranormal',    sub: 'High strange'        },
  { key: 'nationalPark',     label: 'National Parks',      sub: 'Public lands'        },
  { key: 'coffeeShop',       label: 'Coffee Crawls',       sub: 'Third places'        },
  { key: 'bookstore',        label: 'Bookstores',          sub: 'Indie shelves'       },
  { key: 'literaryLandmark', label: 'Literary Landmarks',  sub: 'Where it happened'   },
  { key: 'authorCountry',    label: 'Author Country',      sub: 'Lived geographies'   },
  { key: 'roadTrip',         label: 'Road Trips',          sub: 'Open road'           },
  { key: 'googie',           label: 'Googie Architecture', sub: 'Atomic age'          },
];

// ── Utility components ────────────────────────────────────────────────────────
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

// ── Stamp-album components ────────────────────────────────────────────────────
function PostageBadge({ count, rotate = 8 }) {
  return (
    <div style={{
      position: 'absolute', top: 8, right: 8, width: 38, height: 38,
      borderRadius: '50%', background: 'rgba(255,248,231,0.95)',
      border: `1.5px dashed ${P.orange}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: `rotate(${rotate}deg)`,
      fontFamily: 'Bungee, sans-serif', fontSize: 5.5, color: P.orange,
      letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.15,
      whiteSpace: 'pre-line',
      boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
      zIndex: 2, pointerEvents: 'none',
    }}>{`${count}\nROUTES`}</div>
  );
}

function PosterCard({ cat, featured, onTap }) {
  return (
    <div onClick={() => onTap?.(cat.key)} style={{
      position: 'relative', cursor: 'pointer',
      background: '#0a0805',
      padding: 6, paddingBottom: 38,
      border: `1px solid ${P.border}`,
      boxShadow: '0 2px 0 rgba(0,0,0,0.6), 0 6px 18px rgba(0,0,0,0.5)',
      transform: featured ? 'rotate(-0.4deg)' : 'rotate(0.3deg)',
    }}>
      <div style={{
        position: 'relative', width: '100%',
        aspectRatio: featured ? '1.4' : '0.78',
        overflow: 'hidden',
        border: '1px solid #1a1810',
      }}>
        <PosterIllustration type={cat.key} />
        {/* Type label overlay */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(180deg, transparent 0%, rgba(10,5,2,0.85) 70%, rgba(10,5,2,0.95) 100%)',
          padding: featured ? '36px 14px 12px' : '20px 8px 8px',
        }}>
          <div style={{
            fontFamily: 'Special Elite, serif',
            fontSize: featured ? 9 : 7, color: P.gold,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            marginBottom: 3,
          }}>{cat.sub}</div>
          <div style={{
            fontFamily: 'Bungee, sans-serif',
            fontSize: featured ? 22 : 13, color: P.cream,
            letterSpacing: '0.02em', lineHeight: 0.95,
            textShadow: '0 1px 0 #000',
          }}>{cat.label.toUpperCase()}</div>
        </div>
        <PostageBadge count={cat.count} rotate={featured ? -10 : 8} />
      </div>
      {/* Perforated stamp footer */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 32,
        background: '#f4e4b0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px',
        borderTop: `1px dashed ${P.border}`,
        backgroundImage: 'radial-gradient(circle at 4px 0, #0a0805 2.5px, transparent 2.5px), radial-gradient(circle at 4px 32px, #0a0805 2.5px, transparent 2.5px)',
        backgroundSize: '8px 32px',
        backgroundRepeat: 'repeat-x',
      }}>
        <span style={{
          fontFamily: 'Special Elite, serif', fontSize: 9, color: '#3a2810',
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>Literary Roads</span>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: P.orange }}>→</span>
      </div>
    </div>
  );
}

// ── Stamp-album landing ───────────────────────────────────────────────────────
function JourneysLanding({ categories, featuredKey, onCategoryTap, onBack, onSecretRoom, onShowDayTrip, onShowFestivalTrip, totalRoutes }) {
  const featuredCat = categories.find(c => c.key === featuredKey) || categories[0];
  const restCats = categories.filter(c => c !== featuredCat);

  return (
    <div style={{
      height: '100%', overflowY: 'auto', background: P.bg, color: P.cream,
      backgroundImage: 'radial-gradient(rgba(255,78,0,0.04) 1px, transparent 1px)',
      backgroundSize: '12px 12px',
      position: 'relative',
    }}>
      {/* Journey cat — tour guide, upper-right corner */}
      <style>{`
        @keyframes journey-cat-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>
      <img
        src={JOURNEY_CAT_SRC}
        alt=""
        onClick={onSecretRoom}
        onError={e => { e.currentTarget.style.display = 'none'; }}
        style={{
          position: 'absolute', top: 56, right: 12,
          height: 96, cursor: 'pointer', zIndex: 101,
          animation: 'journey-cat-bounce 1.6s ease-in-out infinite',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
        }}
      />

      {/* Sticky nav */}
      <div style={{
        background: P.navBg, borderBottom: `1px solid ${P.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', position: 'sticky', top: 0, zIndex: 100, height: 48,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Bungee, sans-serif', fontSize: 10, color: P.teal,
          letterSpacing: '0.06em', padding: 0,
        }}>← MAP</button>
        <span style={{
          fontFamily: 'Bungee, sans-serif', fontSize: 12, color: P.teal,
          letterSpacing: '0.06em',
          textShadow: '0 0 8px rgba(64,224,208,0.5)',
        }}>LITERARY ROADS</span>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: '20px 14px 60px' }}>
        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            fontFamily: 'Special Elite, serif', fontSize: 9, color: P.teal,
            letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4,
          }}>Plan your next adventure</div>
          <h1 style={{
            fontFamily: 'Bungee, sans-serif', fontSize: 38,
            color: P.teal, margin: '0 0 6px', lineHeight: 0.95,
            letterSpacing: '0.04em',
            textShadow: '0 0 20px rgba(64,224,208,0.55)',
          }}>JOURNEY<span style={{ color: P.orange }}>S</span></h1>
          <p style={{
            fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted,
            margin: 0, lineHeight: 1.5, maxWidth: '88%',
          }}>A stamp-album of curated American road trips — pick a postcard.</p>
        </div>

        <RoadRule style={{ marginBottom: 18, opacity: 0.6 }} />

        {/* Featured poster */}
        {featuredCat && (
          <div style={{ marginBottom: 22 }}>
            <PosterCard cat={featuredCat} featured onTap={onCategoryTap} />
          </div>
        )}

        {/* The Collection divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: P.border }} />
          <span style={{
            fontFamily: 'Special Elite, serif', fontSize: 9, color: P.muted,
            letterSpacing: '0.25em', textTransform: 'uppercase',
          }}>The Collection</span>
          <div style={{ flex: 1, height: 1, background: P.border }} />
        </div>

        {/* 2-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {restCats.map((cat, i) => (
            <div key={cat.key} style={{ transform: `rotate(${i % 2 === 0 ? 0.6 : -0.5}deg)` }}>
              <PosterCard cat={cat} onTap={onCategoryTap} />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted,
            fontStyle: 'italic', letterSpacing: '0.04em',
          }}>~ choose your road ~</div>
          {/* Route count + Day/Festival Trip links */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted }}>
              {totalRoutes} {totalRoutes === 1 ? 'route' : 'routes'}
            </span>
            <div style={{ display: 'flex', gap: 14 }}>
              {onShowDayTrip && (
                <button onClick={onShowDayTrip} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted,
                }}>Day Trip →</button>
              )}
              {onShowFestivalTrip && (
                <button onClick={onShowFestivalTrip} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted,
                }}>Festival Trip →</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Route card (category view) ────────────────────────────────────────────────
function RouteCard({ route, onExplore }) {
  const stops = route.stops || [];
  const books = Array.isArray(route.readingList) ? route.readingList.filter(b => b.title) : [];
  const blurb = books[0]?.title
    ? `"${books[0].title}"${books[0].author ? ` — ${books[0].author}` : ''}`
    : (route.description ? route.description.slice(0, 80) + (route.description.length > 80 ? '…' : '') : '');

  return (
    <div
      onClick={() => onExplore(route)}
      style={{
        background: P.card, border: `1px solid ${P.border}`,
        borderRadius: 4, overflow: 'hidden', marginBottom: 12,
        display: 'grid', gridTemplateColumns: '110px 1fr',
        cursor: 'pointer',
      }}
    >
      <div style={{ height: '100%', minHeight: 110, position: 'relative' }}>
        <PosterIllustration type={route.routeType} />
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{
          fontFamily: 'Special Elite, serif', fontSize: 8, color: P.gold,
          letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4,
        }}>
          {[route.state, route.duration].filter(Boolean).join(' · ')}
        </div>
        <h3 style={{
          fontFamily: 'Georgia, serif', fontSize: 15, color: P.cream,
          margin: '0 0 6px', lineHeight: 1.2,
        }}>{route.name}</h3>
        {blurb && (
          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 11, color: P.muted,
            fontStyle: 'italic', lineHeight: 1.45, margin: '0 0 10px',
          }}>{blurb}</p>
        )}
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          {stops.length > 0 && (
            <span style={{
              fontFamily: 'Bungee, sans-serif', fontSize: 7, color: P.orange,
              letterSpacing: '0.08em', padding: '3px 6px',
              border: `1px solid ${P.orange}`, borderRadius: 2,
            }}>{stops.length} STOPS</span>
          )}
          {route.difficulty && (
            <span style={{
              fontFamily: 'Bungee, sans-serif', fontSize: 7, color: P.teal,
              letterSpacing: '0.08em', padding: '3px 6px',
              border: `1px solid ${P.teal}`, borderRadius: 2,
            }}>{route.difficulty.toUpperCase()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category view ─────────────────────────────────────────────────────────────
function CategoryView({ categoryKey, routes, stateFilter, onStateFilter, onExplore, onBack }) {
  const label = TYPE_LABEL[categoryKey] || categoryKey;
  const states = useMemo(() => [...new Set(routes.map(r => r.state).filter(Boolean))].sort(), [routes]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: P.bg, color: P.cream }}>
      {/* Nav */}
      <div style={{
        background: P.navBg, borderBottom: `1px solid ${P.border}`,
        display: 'flex', alignItems: 'center', padding: '0 16px',
        position: 'sticky', top: 0, zIndex: 100, height: 48,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Bungee, sans-serif', fontSize: 10, color: P.teal,
          letterSpacing: '0.06em', padding: 0,
        }}>← JOURNEYS</button>
      </div>

      {/* Hero poster */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <PosterIllustration type={categoryKey} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 30%, rgba(28,26,20,0.5) 60%, #1C1A14 100%)',
        }} />
        <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
          <div style={{
            fontFamily: 'Special Elite, serif', fontSize: 9, color: P.gold,
            letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4,
          }}>The Collection</div>
          <h1 style={{
            fontFamily: 'Bungee, sans-serif', fontSize: 26, color: P.cream,
            margin: 0, letterSpacing: '0.03em', lineHeight: 1,
            textShadow: '0 2px 0 #000',
          }}>{label.toUpperCase()}</h1>
        </div>
      </div>

      <div style={{ padding: '18px 14px 60px' }}>
        {/* State filter chips */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 18, paddingBottom: 4,
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}>
          {['All States', ...states].map((s, i) => {
            const active = i === 0 ? stateFilter === '' : stateFilter === s;
            return (
              <button key={s} onClick={() => onStateFilter(i === 0 ? '' : s)} style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 16,
                fontFamily: 'Bungee, sans-serif', fontSize: 8, letterSpacing: '0.08em',
                background: active ? P.orange : 'transparent',
                color: active ? '#fff' : P.muted,
                border: active ? 'none' : `1px solid ${P.border}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{s.toUpperCase()}</button>
            );
          })}
        </div>

        {/* Route count rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{
            fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted, letterSpacing: '0.1em',
          }}>{routes.length} ROUTE{routes.length !== 1 ? 'S' : ''}</span>
          <div style={{
            flex: 1, height: 1,
            background: 'repeating-linear-gradient(90deg, #FF4E00 0, #FF4E00 6px, transparent 6px, transparent 12px)',
            opacity: 0.5,
          }} />
        </div>

        {routes.length === 0 ? (
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted, padding: '32px 0', textAlign: 'center' }}>
            No routes yet in this collection.
          </div>
        ) : (
          routes.map(r => <RouteCard key={r.id} route={r} onExplore={onExplore} />)
        )}
      </div>
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

  const isDone = added || forceAdded;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '50px 1fr', gap: 12,
      padding: '10px 0', borderBottom: `1px solid ${P.border}`,
    }}>
      {/* Spine swatch */}
      <div style={{
        height: 70, background: 'linear-gradient(135deg, #5a1808 0%, #2a0a04 100%)',
        borderRadius: 2, position: 'relative',
        boxShadow: 'inset -2px 0 0 rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={book.title}
            onLoad={onCoverLoad}
            onError={onCoverError}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 4, textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'Bungee, sans-serif', fontSize: 5, color: '#f4d878',
              letterSpacing: '0.05em', lineHeight: 1.1,
            }}>{book.title.toUpperCase()}</div>
          </div>
        )}
      </div>
      <div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: P.cream, marginBottom: 2, lineHeight: 1.25 }}>{book.title}</div>
        {book.author && (
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted, marginBottom: 4 }}>{book.author}</div>
        )}
        {book.description && (
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: P.muted, fontStyle: 'italic', marginBottom: 6, lineHeight: 1.4 }}>{book.description}</div>
        )}
        {user && (
          <button onClick={handleAdd} disabled={adding || isDone} style={{
            background: 'transparent', border: `1px solid ${isDone ? P.gold : P.teal}`,
            borderRadius: 3, padding: '3px 8px', cursor: isDone ? 'default' : 'pointer',
            fontFamily: 'Bungee, sans-serif', fontSize: 7, letterSpacing: '0.08em',
            color: isDone ? P.gold : P.teal, opacity: adding ? 0.6 : 1,
          }}>
            {isDone ? 'ADDED' : adding ? '...' : '+ READ NEXT'}
          </button>
        )}
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
  const [coverUrls, setCoverUrls] = useState({});
  const [allAdded, setAllAdded]   = useState(false);

  const stops   = route.stops || [];
  const legs    = route.legs  || [];
  const hasLegs = legs.length > 0;
  const hasReverse = route.reversible && route.forwardStartLabel && route.reverseStartLabel;

  const orderedStops  = direction === 'reverse' ? [...stops].reverse() : stops;
  const filteredStops = hasLegs && selectedLeg !== 'all'
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
    if (user && !saved) { handleSaveRoute(); }
    setNavStops(selected);
    setShowNavModal(true);
  };

  const typeLabel = TYPE_LABEL[route.routeType] || route.routeType;
  const typeColor = TYPE_COLOR[route.routeType] || P.teal;

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
          fontFamily: 'Bungee, sans-serif', fontSize: 10, color: P.teal,
          letterSpacing: '0.06em', padding: '12px 8px 12px 0', minHeight: 48,
        }}>← {typeLabel.toUpperCase()}</button>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', height: isMobile ? 220 : 260, background: '#0d0d0d' }}>
        {route.posterImageUrl ? (
          <img src={route.posterImageUrl} alt={route.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <PosterIllustration type={route.routeType} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 40%, rgba(28,26,20,0.6) 75%, #1C1A14 100%)',
        }} />
        {/* Postmark stamp */}
        <div style={{
          position: 'absolute', top: 14, right: 14, width: 56, height: 56,
          borderRadius: '50%', border: `2px solid ${P.orange}`,
          background: 'rgba(255,78,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: 'rotate(-12deg)',
          fontFamily: 'Bungee, sans-serif', fontSize: 6.5, color: P.orange,
          textAlign: 'center', lineHeight: 1.2, letterSpacing: '0.06em',
          whiteSpace: 'pre-line',
        }}>{`LITERARY\nROADS\n${route.state ? route.state.slice(0, 2).toUpperCase() : ''}·26`}</div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: isMobile ? '20px 16px 60px' : '28px 24px 72px' }}>

        {/* Title block */}
        <span style={{
          display: 'inline-block', marginBottom: 8,
          fontFamily: 'Special Elite, serif', fontSize: 9, color: typeColor,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          background: typeColor + '18', border: `1px solid ${typeColor}40`,
          padding: '3px 8px', borderRadius: 10,
        }}>{typeLabel}</span>
        <h1 style={{
          fontFamily: 'Bungee, sans-serif', fontSize: isMobile ? 20 : 24,
          color: P.cream, margin: '0 0 4px', letterSpacing: '0.02em', lineHeight: 1.05,
        }}>{route.name.toUpperCase()}</h1>
        <p style={{
          fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted,
          margin: '0 0 16px', letterSpacing: '0.04em',
        }}>
          {[route.state, route.duration, route.difficulty].filter(Boolean).join(' · ')}
        </p>

        {/* Direction selector */}
        {hasReverse && (
          <div style={{ marginBottom: 20, padding: 14, background: P.card, border: `1px solid ${P.border}`, borderRadius: 6 }}>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, margin: '0 0 10px' }}>
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
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.75, color: P.cream, marginBottom: 22 }}>
            {direction === 'reverse' && route.reverseDescription ? route.reverseDescription : route.description}
          </p>
        )}

        {/* Stat strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          border: `1px solid ${P.border}`, borderRadius: 4,
          marginBottom: 24, overflow: 'hidden', background: P.card,
        }}>
          {[
            { num: stops.length || '—', label: 'STOPS'    },
            { num: route.duration || '—', label: 'DURATION' },
            { num: route.difficulty ? route.difficulty[0] : '—', label: 'LEVEL' },
            { num: books.length || '—', label: 'BOOKS'    },
          ].map((m, i) => (
            <div key={i} style={{
              padding: '10px 4px', textAlign: 'center',
              borderRight: i < 3 ? `1px solid ${P.border}` : 'none',
            }}>
              <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 18, color: P.orange, lineHeight: 1 }}>{m.num}</div>
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 8, color: P.muted, letterSpacing: '0.1em', marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>

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

        {/* THE ROUTE — stops timeline */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{
            fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.teal,
            letterSpacing: '0.1em', margin: '0 0 14px',
          }}>THE ROUTE</h3>
          {filteredStops.map((stop, idx) => {
            const origIdx = direction === 'reverse' ? stops.length - 1 - idx : idx;
            const isChecked = checkedStops[origIdx] !== false;
            const isLast = idx === filteredStops.length - 1;
            return (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10,
                paddingBottom: isLast ? 0 : 14, marginBottom: isLast ? 0 : 14,
                borderBottom: isLast ? 'none' : `1px solid ${P.border}`,
                opacity: isChecked ? 1 : 0.38,
              }}>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setCheckedStops(p => ({ ...p, [origIdx]: !isChecked }))}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: isChecked ? P.orange : 'transparent',
                      border: `2px solid ${isChecked ? P.orange : P.muted}`,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Bungee, sans-serif', fontSize: 11,
                      color: isChecked ? '#fff' : P.muted,
                      boxShadow: isChecked ? '0 1px 0 rgba(0,0,0,0.4)' : 'none',
                      padding: 0,
                    }}
                  >{idx + 1}</button>
                  {!isLast && (
                    <div style={{
                      position: 'absolute', top: 30, left: 13, bottom: -14, width: 2,
                      background: 'repeating-linear-gradient(180deg, #FF4E00 0, #FF4E00 4px, transparent 4px, transparent 8px)',
                      opacity: 0.4,
                    }} />
                  )}
                </div>
                <div>
                  <div style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: P.cream, fontWeight: 'bold', marginBottom: 2 }}>
                    {stop.name}
                  </div>
                  {(stop.city || stop.state) && (
                    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted, letterSpacing: '0.04em', marginBottom: 5 }}>
                      {[stop.city, stop.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {stop.routeNote && (
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: P.muted, fontStyle: 'italic', lineHeight: 1.5 }}>
                      {stop.routeNote}
                    </div>
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

        {/* Read before you go */}
        {books.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.teal, letterSpacing: '0.1em', margin: 0 }}>
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
                key={i} book={book} index={i}
                onAddToReadNext={handleAddToReadNext}
                onCoverFetched={(idx, url) => setCoverUrls(p => ({ ...p, [idx]: url }))}
                forceAdded={allAdded} user={user}
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
        <button
          onClick={handleNavigateStops}
          disabled={getSelectedStops().filter(s => s.lat && s.lng).length === 0}
          style={{
            width: '100%', fontFamily: 'Bungee, sans-serif', fontSize: 12,
            letterSpacing: '0.08em', padding: '14px',
            background: P.orange, color: '#fff', border: 'none',
            borderRadius: 4, cursor: 'pointer', marginBottom: 10,
            boxShadow: '0 2px 0 rgba(0,0,0,0.4)',
            opacity: getSelectedStops().filter(s => s.lat && s.lng).length === 0 ? 0.4 : 1,
          }}>NAVIGATE MY STOPS →</button>
        <button onClick={handleSaveRoute} disabled={saving} style={{
          width: '100%', fontFamily: 'Bungee, sans-serif', fontSize: 11,
          letterSpacing: '0.08em', padding: '12px',
          background: 'transparent',
          color: saved ? P.gold : P.teal,
          border: `1.5px solid ${saved ? P.gold : P.teal}`,
          borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}>{saved ? 'SAVED' : saving ? 'SAVING...' : 'SAVE THIS ROUTE'}</button>

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
  const [filter, setFilter]           = useState(null);
  const [stateFilter, setStateFilter] = useState('');
  const navigate_    = useNavigate();
  const location_    = useLocation();
  const [showSecretRoom, setShowSecretRoom] = useState(false);

  const journeySubPath = location_.pathname.replace(/^\/journeys\/?/, '').split('?')[0];
  const detail = journeySubPath ? (location_.state?.route ?? null) : null;

  const openDetail  = useCallback((route) => {
    navigate_(`/journeys/${route.id}`, { state: { route } });
  }, [navigate_]);
  const closeDetail = useCallback(() => navigate_(-1), [navigate_]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
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

  // Route counts per category key
  const countsByType = useMemo(() => {
    const counts = {};
    routes.forEach(r => {
      if (!r.routeType) return;
      counts[r.routeType] = (counts[r.routeType] || 0) + 1;
    });
    // roadTrip filter also shows route66 routes
    counts['roadTrip'] = (counts['roadTrip'] || 0) + (counts['route66'] || 0);
    return counts;
  }, [routes]);

  // Routes filtered by current category + state
  const filteredRoutes = useMemo(() => routes.filter(r => {
    if (filter !== null) {
      const typeMatch = filter === 'roadTrip'
        ? (r.routeType === 'roadTrip' || r.routeType === 'route66')
        : r.routeType === filter;
      if (!typeMatch) return false;
    }
    if (stateFilter && r.state !== stateFilter) return false;
    return true;
  }), [routes, filter, stateFilter]);

  const selectFilter = (key) => {
    setFilter(key);
    setStateFilter('');
  };

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

  // ── Category definitions with live counts ─────────────────────────────────
  const categoriesWithCounts = CATEGORY_DEFS.map(c => ({
    ...c,
    count: countsByType[c.key] || 0,
  }));

  // ── Landing ───────────────────────────────────────────────────────────────
  if (filter === null) {
    return (
      <div style={{ height: '100vh', position: 'relative', background: P.bg }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted }}>Loading routes…</span>
          </div>
        ) : (
          <JourneysLanding
            categories={categoriesWithCounts}
            featuredKey={featured?.routeType}
            onCategoryTap={selectFilter}
            onBack={onBack}
            onSecretRoom={() => setShowSecretRoom(true)}
            onShowDayTrip={onShowDayTrip}
            onShowFestivalTrip={onShowFestivalTrip}
            totalRoutes={routes.length}
          />
        )}
        {showSecretRoom && <SecretRoom onClose={() => setShowSecretRoom(false)} />}
      </div>
    );
  }

  // ── Category view ─────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', position: 'relative', background: P.bg }}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted }}>Loading routes…</span>
        </div>
      ) : (
        <CategoryView
          categoryKey={filter}
          routes={filteredRoutes}
          stateFilter={stateFilter}
          onStateFilter={setStateFilter}
          onExplore={openDetail}
          onBack={() => setFilter(null)}
        />
      )}
      {showSecretRoom && <SecretRoom onClose={() => setShowSecretRoom(false)} />}
    </div>
  );
}
