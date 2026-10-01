// JourneysPage.jsx — Curated literary road trips page.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { getOrCreateBook } from '../utils/booksCatalog';

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

// ── Dusk ramp palette (strip backgrounds by display index) ───────────────────
const DUSK = ['#1B1F2A','#2a2234','#3a2640','#4d2d4c','#5E3A5A','#744a6c','#8a5670','#a0605a','#B96A3E'];
const duskAt = (i) => DUSK[Math.min(i, DUSK.length - 1)];

const DIFF_COLOR = { easy: '#40E0D0', moderate: '#F5A623', remote: '#FF4E00' };
const diffColor  = (d) => { if (!d) return '#8a7d60'; return DIFF_COLOR[d.toLowerCase()] || '#8a7d60'; };

const WORDMARK_GRADIENT = {
  background: 'linear-gradient(90deg, #a06a94 0%, #c0607a 40%, #e0704a 75%, #F58128 100%)',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
};

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

// ── Desktop route card (hover state) ─────────────────────────────────────────
function DesktopRouteCard({ route, stateLbl, stops, book, onExplore }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onExplore(route)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: P.card, border: `1px solid ${hovered ? '#8a5670' : P.border}`,
        borderRadius: 6, padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 8,
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'transform 150ms cubic-bezier(.2,.8,.2,1), border-color 150ms cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <div style={{ fontFamily: 'Special Elite, serif', fontSize: 9, color: P.gold, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        {[stateLbl, route.duration].filter(Boolean).join(' · ')}
      </div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, lineHeight: 1.25, color: P.cream }}>
        {route.name}
      </div>
      <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted }}>
        {stops > 0 && `${stops} stop${stops !== 1 ? 's' : ''}`}
        {stops > 0 && route.difficulty && ' · '}
        {route.difficulty && <span style={{ color: diffColor(route.difficulty) }}>{route.difficulty}</span>}
      </div>
      {book && (
        <div style={{
          fontFamily: 'Georgia, serif', fontSize: 12, lineHeight: 1.4,
          fontStyle: 'italic', color: P.muted,
          borderTop: `1px solid ${P.border}`, paddingTop: 8,
        }}>
          "{book.title}"{book.author ? ` — ${book.author}` : ''}
        </div>
      )}
    </div>
  );
}

// ── Mobile accordion ──────────────────────────────────────────────────────────
function JourneysAccordion({ categories, routes, filter, stateFilter, onSelectCategory, onStateFilter, onExplore, onBack }) {
  const containerRef = useRef(null);
  const stripRefs    = useRef([]);

  const totalRoutes = routes.length;

  const handleStripClick = (key, idx) => {
    const newFilter = filter === key ? null : key;
    onSelectCategory(newFilter);
    onStateFilter('');
    if (newFilter !== null && containerRef.current && stripRefs.current[idx]) {
      const container = containerRef.current;
      const strip     = stripRefs.current[idx];
      setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        const stripRect     = strip.getBoundingClientRect();
        const offset = stripRect.top - containerRect.top + container.scrollTop - 56;
        container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
      }, 10);
    }
  };

  return (
    <div ref={containerRef} style={{ height: '100%', overflowY: 'auto', background: P.bg, color: P.cream }}>
      {/* Nav */}
      <div style={{
        background: P.navBg, borderBottom: `1px solid ${P.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', position: 'sticky', top: 0, zIndex: 5, height: 48,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Bungee, sans-serif', fontSize: 10, color: P.teal, letterSpacing: '0.06em', padding: 0 }}>← MAP</button>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: P.teal, letterSpacing: '0.06em', textShadow: '0 0 8px rgba(64,224,208,0.5)' }}>LITERARY ROADS</span>
        <div style={{ width: 40 }} />
      </div>

      {/* Header */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 30, lineHeight: 1, letterSpacing: '0.04em', margin: 0, ...WORDMARK_GRADIENT }}>JOURNEYS</h1>
        <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted, letterSpacing: '0.06em', flexShrink: 0 }}>
          {categories.length} collections · {totalRoutes} routes
        </span>
      </div>

      {/* Category strips */}
      {categories.map((cat, idx) => {
        const isOpen = filter === cat.key;
        const catRoutes = routes.filter(r =>
          cat.key === 'roadTrip'
            ? (r.routeType === 'roadTrip' || r.routeType === 'route66')
            : r.routeType === cat.key
        );
        const states       = [...new Set(catRoutes.map(r => r.state).filter(Boolean))].sort();
        const hasMulti     = catRoutes.some(r => r.state && r.state.includes(','));
        const visibleRoutes = stateFilter === ''          ? catRoutes :
                              stateFilter === 'Multi-state' ? catRoutes.filter(r => r.state?.includes(',')) :
                              catRoutes.filter(r => r.state === stateFilter);

        return (
          <div key={cat.key} ref={el => { stripRefs.current[idx] = el; }}>
            {/* Strip */}
            <div
              onClick={() => handleStripClick(cat.key, idx)}
              style={{
                height: 60, background: duskAt(idx), padding: '0 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: 'Special Elite, serif', fontSize: 8, color: P.cream, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{cat.sub}</span>
                <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, lineHeight: 1, color: P.cream }}>{cat.label.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.cream }}>{cat.count} routes</span>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', border: `1px solid ${P.cream}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.cream,
                }}>{isOpen ? '–' : '+'}</div>
              </div>
            </div>

            {/* Expanded panel */}
            {isOpen && (
              <div style={{ background: P.bg, padding: '12px 0 6px', borderBottom: `2px solid ${duskAt(idx)}` }}>
                {/* State chips */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '0 16px 6px' }}>
                  {['All states', ...(hasMulti ? ['Multi-state'] : []), ...states].map(s => {
                    const active = s === 'All states' ? stateFilter === '' : stateFilter === s;
                    return (
                      <button
                        key={s}
                        onClick={e => { e.stopPropagation(); onStateFilter(active || s === 'All states' ? '' : s); }}
                        style={{
                          flex: 'none', padding: '5px 10px', borderRadius: 14,
                          fontFamily: 'Bungee, sans-serif', fontSize: 8, letterSpacing: '0.08em',
                          background: active ? P.orange : 'transparent',
                          color: active ? '#fff' : P.muted,
                          border: active ? 'none' : `1px solid ${P.border}`,
                          cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap',
                        }}
                      >{s}</button>
                    );
                  })}
                </div>

                {/* Route rows */}
                {visibleRoutes.length === 0 ? (
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: P.muted, fontStyle: 'italic', padding: '12px 16px', margin: 0 }}>
                    Your road's clear here. Try another state.
                  </p>
                ) : visibleRoutes.map(r => {
                  const stops   = r.stops?.length || 0;
                  const stateLbl = (r.state && r.state.includes(',')) ? 'Multi-state' : r.state;
                  const meta    = [stateLbl, r.duration, stops > 0 ? `${stops} stop${stops !== 1 ? 's' : ''}` : null].filter(Boolean);
                  const book    = Array.isArray(r.readingList) ? r.readingList.find(b => b.title) : null;
                  return (
                    <div
                      key={r.id}
                      onClick={() => onExplore(r)}
                      style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '10px 16px', borderTop: `1px solid ${P.border}`, cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.25, color: P.cream, marginBottom: 2 }}>{r.name}</div>
                        <div style={{ fontFamily: 'Special Elite, serif', fontSize: 9, color: P.muted, letterSpacing: '0.06em', marginBottom: book ? 2 : 0 }}>
                          {meta.join(' · ')}
                          {r.difficulty && <span> · <span style={{ color: diffColor(r.difficulty) }}>{r.difficulty}</span></span>}
                        </div>
                        {book && <div style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: P.muted, fontStyle: 'italic' }}>"{book.title}"</div>}
                      </div>
                      <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: P.teal }}>›</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Desktop rail + panel ──────────────────────────────────────────────────────
function JourneysDesktop({ categories, routes, filter, stateFilter, onSelectCategory, onStateFilter, onExplore, onBack }) {
  const selectedIdx = categories.findIndex(c => c.key === filter);
  const selectedCat = categories[Math.max(selectedIdx, 0)];

  const catRoutes = useMemo(() => routes.filter(r =>
    filter === 'roadTrip'
      ? (r.routeType === 'roadTrip' || r.routeType === 'route66')
      : r.routeType === filter
  ), [routes, filter]);

  const states    = useMemo(() => [...new Set(catRoutes.map(r => r.state).filter(Boolean))].sort(), [catRoutes]);
  const hasMulti  = catRoutes.some(r => r.state?.includes(','));

  const visibleRoutes = useMemo(() => {
    if (!stateFilter) return catRoutes;
    if (stateFilter === 'Multi-state') return catRoutes.filter(r => r.state?.includes(','));
    return catRoutes.filter(r => r.state === stateFilter);
  }, [catRoutes, stateFilter]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: P.bg, color: P.cream }}>
      {/* Nav */}
      <div style={{
        height: 56, background: P.navBg, borderBottom: `1px solid ${P.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.teal, letterSpacing: '0.06em', padding: 0 }}>← MAP</button>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: P.teal, letterSpacing: '0.06em', textShadow: '0 0 8px rgba(64,224,208,0.5)' }}>LITERARY ROADS</span>
        <div style={{ width: 60 }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '32px 48px 0', gap: 24, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Plan your next adventure</span>
            <h1 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 56, lineHeight: 0.95, letterSpacing: '0.04em', margin: 0, ...WORDMARK_GRADIENT }}>JOURNEYS</h1>
          </div>
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.muted, paddingBottom: 6 }}>
            {categories.length} collections · {routes.length} routes
          </span>
        </div>

        {/* Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0,1fr)', gap: 32, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left rail */}
          <div style={{ overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', borderRadius: '8px 8px 0 0' }}>
            {categories.map((cat, idx) => {
              const isSelected = cat.key === filter;
              return (
                <div
                  key={cat.key}
                  onClick={() => onSelectCategory(cat.key)}
                  style={{
                    height: 62, background: duskAt(idx), padding: '0 18px 0 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: isSelected ? 'inset 5px 0 0 #FFF8E7' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontFamily: 'Special Elite, serif', fontSize: 8, color: P.cream, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{cat.sub}</span>
                    <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, lineHeight: 1, color: P.cream }}>{cat.label.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.cream }}>{cat.count} routes</span>
                    <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.cream, width: 12, textAlign: 'center' }}>
                      {isSelected ? '●' : '›'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right panel */}
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 32 }}>
            {/* Panel header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 16, borderBottom: `2px solid ${duskAt(Math.max(selectedIdx, 0))}`, flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.gold, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>
                  The Collection · {selectedCat?.sub}
                </div>
                <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 32, lineHeight: 1, color: P.cream, margin: 0 }}>
                  {(selectedCat?.label || '').toUpperCase()}
                </h2>
              </div>
              <span style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.cream, paddingBottom: 4 }}>
                {catRoutes.length} routes
              </span>
            </div>

            {/* State chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 0 6px', flexShrink: 0 }}>
              {['All states', ...(hasMulti ? ['Multi-state'] : []), ...states].map(s => {
                const active = s === 'All states' ? !stateFilter : stateFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStateFilter(s === 'All states' ? '' : s)}
                    style={{
                      padding: '5px 10px', borderRadius: 14,
                      fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.08em',
                      background: active ? P.orange : 'transparent',
                      color: active ? '#fff' : P.muted,
                      border: active ? 'none' : `1px solid ${P.border}`,
                      cursor: 'pointer', textTransform: 'uppercase',
                    }}
                  >{s}</button>
                );
              })}
            </div>

            {/* Route grid */}
            {visibleRoutes.length === 0 ? (
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: P.muted, fontStyle: 'italic' }}>
                Your road's clear here. Try another state.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14 }}>
                {visibleRoutes.map(r => {
                  const stops   = r.stops?.length || 0;
                  const stateLbl = (r.state && r.state.includes(',')) ? 'Multi-state' : r.state;
                  const book    = Array.isArray(r.readingList) ? r.readingList.find(b => b.title) : null;
                  return <DesktopRouteCard key={r.id} route={r} stateLbl={stateLbl} stops={stops} book={book} onExplore={onExplore} />;
                })}
              </div>
            )}
          </div>
        </div>
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
      lastViewedAt: null,
    });
    getOrCreateBook({ title: book.title, authors: [book.author || ''], coverUrl: coverUrl || '', description: book.description || '' }).catch(() => {});
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
export default function JourneysPage({ onBack, onShowDayTrip, onShowFestivalTrip, onShowLogin }) {
  const { user } = useAuth();
  const [routes, setRoutes]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState(null);
  const [stateFilter, setStateFilter] = useState('');
  const [showSecretRoom, setShowSecretRoom] = useState(false);
  const [isDesktop, setIsDesktop]     = useState(() => typeof window !== 'undefined' && window.innerWidth >= 900);

  const navigate_ = useNavigate();
  const location_ = useLocation();

  const journeySubPath = location_.pathname.replace(/^\/journeys\/?/, '').split('?')[0];
  const detail = journeySubPath ? (location_.state?.route ?? null) : null;

  const openDetail  = useCallback((route) => navigate_(`/journeys/${route.id}`, { state: { route } }), [navigate_]);
  const closeDetail = useCallback(() => navigate_(-1), [navigate_]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const handler = e => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'curatedRoutes'), where('active', '==', true)));
      setRoutes(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      );
    } catch (err) {
      console.error('[JourneysPage] load routes failed:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  const countsByType = useMemo(() => {
    const counts = {};
    routes.forEach(r => { if (r.routeType) counts[r.routeType] = (counts[r.routeType] || 0) + 1; });
    counts['roadTrip'] = (counts['roadTrip'] || 0) + (counts['route66'] || 0);
    return counts;
  }, [routes]);

  const categoriesWithCounts = useMemo(() =>
    CATEGORY_DEFS.map(c => ({ ...c, count: countsByType[c.key] || 0 })),
    [countsByType]
  );

  const selectFilter = (key) => { setFilter(key); setStateFilter(''); };

  // Desktop: default to first category; mobile: null = all closed
  const effectiveFilter = useMemo(() => {
    if (!isDesktop) return filter;
    if (filter !== null) return filter;
    return categoriesWithCounts.find(c => c.count > 0)?.key || categoriesWithCounts[0]?.key || null;
  }, [isDesktop, filter, categoriesWithCounts]);

  if (detail) {
    return (
      <RouteDetail
        route={detail}
        onBack={closeDetail}
        isMobile={!isDesktop}
        user={user}
        onShowLogin={onShowLogin}
      />
    );
  }

  const sharedProps = {
    categories: categoriesWithCounts,
    routes,
    filter: effectiveFilter,
    stateFilter,
    onSelectCategory: selectFilter,
    onStateFilter: setStateFilter,
    onExplore: openDetail,
    onBack,
    loading,
  };

  return (
    <div style={{ height: '100vh', background: P.bg }}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted }}>Loading routes…</span>
        </div>
      ) : isDesktop ? (
        <JourneysDesktop {...sharedProps} />
      ) : (
        <JourneysAccordion {...sharedProps} />
      )}
      {showSecretRoom && <SecretRoom onClose={() => setShowSecretRoom(false)} />}
    </div>
  );
}
