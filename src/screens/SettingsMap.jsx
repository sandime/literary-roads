import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

const L = {
  bg:       '#FFF8E7',
  turquoise:'#38C5C5',
  coral:    '#FF6B7A',
  peach:    '#FFB8A3',
  gold:     '#F5A623',
  dark:     '#2D2D2D',
  mid:      '#555555',
  muted:    '#999999',
  white:    '#FFFFFF',
};

const CAT_SRC = `${import.meta.env.BASE_URL}images/library-cat.png`;
const onCoverError = (e) => { e.target.onerror = null; e.target.src = CAT_SRC; };

const GEOJSON_URL = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';

// Beyond-the-map categories
const BEYOND = [
  { id: 'other_worlds',  label: 'Other Worlds',      sub: 'Planets, fictional realms, imagined places', types: ['planet', 'fictional_world', 'fictional_town', 'space'] },
  { id: 'at_sea',        label: 'At Sea',             sub: 'Ships, oceans, and open water',              types: ['vessel', 'sea', 'ocean'] },
  { id: 'single_house',  label: 'A Single House',     sub: 'Estates, manors, one unforgettable address', types: ['house', 'estate', 'manor'] },
  { id: 'elsewhere',     label: 'Elsewhere on Earth', sub: 'Countries, regions, and epic journeys',      types: ['country', 'region', 'continent', 'journey'] },
];

// ── Stack card + flip-through view ───────────────────────────────────────────
function StackCard({ books, label, onClose }) {
  const [index, setIndex] = useState(0);
  const featured = books.find(b => b.featured) || books[0];
  const sortedBooks = featured
    ? [featured, ...books.filter(b => b.id !== featured.id)]
    : books;
  const current = sortedBooks[index] || sortedBooks[0];
  if (!current) return null;

  const isFirst = index === 0;
  const isFeatured = current.id === featured?.id;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(45,45,45,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={onClose}>
      <div
        style={{
          width: '100%', maxWidth: 360, position: 'relative',
          animation: 'lib-fade-in 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes lib-fade-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Stack effect — peeking cards behind */}
        {sortedBooks.length > 2 && (
          <div style={{ position: 'absolute', top: 10, left: 6, right: 6, bottom: -6,
            borderRadius: 14, background: `${L.peach}bb`, zIndex: -1 }} />
        )}
        {sortedBooks.length > 1 && (
          <div style={{ position: 'absolute', top: 5, left: 3, right: 3, bottom: -3,
            borderRadius: 14, background: `${L.turquoise}bb`, zIndex: -1 }} />
        )}

        {/* Main card */}
        <div style={{ borderRadius: 14, background: L.white, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative' }}>

          {/* Header */}
          <div style={{ background: L.coral, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}>
                {label.toUpperCase()}
              </p>
              <p style={{ margin: 0, fontFamily: 'Special Elite, serif', fontSize: 12, color: L.white }}>
                {sortedBooks.length} book{sortedBooks.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
                width: 28, height: 28, borderRadius: '50%', color: L.white, fontSize: 16, lineHeight: 1 }}>
              ×
            </button>
          </div>

          {/* Book */}
          <div style={{ padding: 16 }}>
            {isFeatured && isFirst && (
              <div style={{
                display: 'inline-block', marginBottom: 10,
                fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.1em',
                background: `${L.gold}22`, color: '#7A5800',
                border: `1px solid ${L.gold}66`, borderRadius: 20, padding: '3px 10px',
              }}>
                ★ FEATURED PICK
              </div>
            )}

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{
                width: 76, height: 108, flexShrink: 0, borderRadius: 6,
                overflow: 'hidden', boxShadow: '2px 4px 10px rgba(0,0,0,0.16)', background: '#eee',
              }}>
                <img src={current.coverUrl || CAT_SRC} alt={current.title} onError={onCoverError}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 700, color: L.dark, margin: '0 0 4px', lineHeight: 1.3 }}>
                  {current.title}
                </p>
                <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: L.mid, margin: '0 0 8px' }}>
                  {(current.authors || []).join(', ')}
                </p>
                {current.description && (
                  <p style={{
                    fontFamily: 'Special Elite, serif', fontSize: 11, color: L.mid,
                    lineHeight: 1.55, margin: 0,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
                  }}>
                    {current.description}
                  </p>
                )}
              </div>
            </div>

            {/* Settings tags */}
            {(current.settings || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                {current.settings.filter(s => s.confidence === 'high').map((s, i) => (
                  <span key={i} style={{
                    fontFamily: 'Special Elite, serif', fontSize: 10,
                    background: 'rgba(56,197,197,0.1)', border: '1px solid rgba(56,197,197,0.35)',
                    borderRadius: 20, padding: '2px 8px', color: '#1a7a7a',
                  }}>
                    {s.place}
                  </span>
                ))}
              </div>
            )}

            {/* Navigation */}
            {sortedBooks.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0}
                  style={{
                    padding: '8px 14px', borderRadius: 8, cursor: index === 0 ? 'default' : 'pointer',
                    background: 'transparent', border: `1.5px solid ${L.coral}`,
                    fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.coral,
                    opacity: index === 0 ? 0.35 : 1,
                  }}>
                  ←
                </button>

                {/* Progress dots */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 5 }}>
                  {sortedBooks.slice(0, 8).map((_, i) => (
                    <div key={i} onClick={() => setIndex(i)} style={{
                      width: i === index ? 18 : 6, height: 6, borderRadius: 3,
                      background: i === index ? L.coral : `${L.coral}44`,
                      cursor: 'pointer', transition: 'width 0.2s, background 0.2s',
                    }} />
                  ))}
                  {sortedBooks.length > 8 && (
                    <span style={{ fontFamily: 'Special Elite, serif', fontSize: 9, color: L.muted }}>…</span>
                  )}
                </div>

                <button onClick={() => setIndex(i => Math.min(sortedBooks.length - 1, i + 1))} disabled={index === sortedBooks.length - 1}
                  style={{
                    padding: '8px 14px', borderRadius: 8, cursor: index === sortedBooks.length - 1 ? 'default' : 'pointer',
                    background: 'transparent', border: `1.5px solid ${L.coral}`,
                    fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.coral,
                    opacity: index === sortedBooks.length - 1 ? 0.35 : 1,
                  }}>
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Beyond the map panel ──────────────────────────────────────────────────────
function BeyondPanel({ beyondBooks, onCategory }) {
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: `${L.coral}30` }} />
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.coral, letterSpacing: '0.12em' }}>
          BEYOND THE MAP
        </span>
        <div style={{ flex: 1, height: 1, background: `${L.coral}30` }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {BEYOND.map(cat => {
          const count = (beyondBooks[cat.id] || []).length;
          return (
            <button key={cat.id}
              onClick={() => count > 0 && onCategory(cat.id)}
              style={{
                background: L.white, border: `1px solid ${count > 0 ? `${L.coral}40` : 'rgba(0,0,0,0.07)'}`,
                borderRadius: 10, padding: '10px 14px', cursor: count > 0 ? 'pointer' : 'default',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                opacity: count > 0 ? 1 : 0.5, transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { if (count > 0) e.currentTarget.style.borderColor = L.coral; }}
              onMouseLeave={e => { if (count > 0) e.currentTarget.style.borderColor = `${L.coral}40`; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark, letterSpacing: '0.04em' }}>{cat.label}</p>
                <p style={{ margin: '2px 0 0', fontFamily: 'Special Elite, serif', fontSize: 10, color: L.muted }}>{cat.sub}</p>
              </div>
              {count > 0 && (
                <span style={{
                  flexShrink: 0, fontFamily: 'Bungee, sans-serif', fontSize: 10,
                  background: `${L.coral}18`, color: L.coral,
                  border: `1px solid ${L.coral}40`, borderRadius: 20, padding: '2px 8px',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SettingsMap({ onBack }) {
  const [geoJson, setGeoJson]         = useState(null);
  const [allBooks, setAllBooks]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [stateBooks, setStateBooks]   = useState({}); // { 'Montana': [book, ...] }
  const [beyondBooks, setBeyondBooks] = useState({}); // { 'other_worlds': [book, ...] }
  const [selected, setSelected]       = useState(null); // { books, label }
  const geoJsonRef = useRef(null);

  // Load GeoJSON + books in parallel
  useEffect(() => {
    Promise.all([
      fetch(GEOJSON_URL).then(r => r.json()).catch(() => null),
      getDocs(query(collection(db, 'books'), where('enrichmentVersion', '>=', 1))).catch(() => ({ docs: [] })),
    ]).then(([geo, snap]) => {
      setGeoJson(geo);
      const books = snap.docs ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      setAllBooks(books);

      // Index by state
      const byState = {};
      const byBeyond = {};
      BEYOND.forEach(c => { byBeyond[c.id] = []; });

      for (const book of books) {
        const settings = book.settings || [];
        const highSettings = settings.filter(s => s.confidence === 'high');
        for (const s of highSettings) {
          if (s.type === 'state') {
            const key = s.place;
            if (!byState[key]) byState[key] = [];
            if (!byState[key].find(b => b.id === book.id)) byState[key].push(book);
          }
          for (const cat of BEYOND) {
            if (cat.types.includes(s.type)) {
              if (!byBeyond[cat.id].find(b => b.id === book.id)) byBeyond[cat.id].push(book);
            }
          }
        }
      }
      setStateBooks(byState);
      setBeyondBooks(byBeyond);
      setLoading(false);
    });
  }, []);

  const handleStateClick = useCallback((stateName) => {
    const books = stateBooks[stateName] || [];
    if (books.length === 0) return;
    setSelected({ books, label: stateName });
  }, [stateBooks]);

  const handleBeyondCategory = useCallback((catId) => {
    const cat = BEYOND.find(c => c.id === catId);
    const books = beyondBooks[catId] || [];
    if (!books.length) return;
    setSelected({ books, label: cat.label });
  }, [beyondBooks]);

  const styleFeature = useCallback((feature) => {
    const name = feature.properties?.name || '';
    const count = (stateBooks[name] || []).length;
    const fill = count === 0
      ? 'rgba(153,153,153,0.12)'
      : count < 3
        ? 'rgba(56,197,197,0.25)'
        : count < 6
          ? 'rgba(56,197,197,0.45)'
          : 'rgba(56,197,197,0.68)';
    return {
      fillColor: fill,
      fillOpacity: 1,
      color: count > 0 ? L.turquoise : 'rgba(153,153,153,0.3)',
      weight: count > 0 ? 1.5 : 0.8,
    };
  }, [stateBooks]);

  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties?.name || '';
    const count = (stateBooks[name] || []).length;
    layer.on('click', () => handleStateClick(name));
    layer.bindTooltip(
      `<span style="font-family:Bungee,sans-serif;font-size:11px;color:${count > 0 ? L.turquoise : L.muted}">${name}</span>${count > 0 ? `<br/><span style="font-family:Special Elite,serif;font-size:10px;color:${L.mid}">${count} book${count !== 1 ? 's' : ''}</span>` : ''}`,
      { sticky: true, className: 'lib-map-tooltip' }
    );
  }, [stateBooks, handleStateClick]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: L.bg, overflowY: 'auto', fontFamily: 'Special Elite, serif' }}>
      <style>{`
        @keyframes lib-fade-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .lib-map-tooltip { background: #FFF8E7; border: 1px solid rgba(56,197,197,0.4); border-radius:6px; padding:5px 9px; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
        .lib-map-tooltip::before { display:none; }
        .leaflet-container { background: #EEF7F7; }
      `}</style>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 400,
        background: L.bg, borderBottom: `2px solid ${L.coral}`,
        padding: '12px 16px', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 680, margin: '0 auto' }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark,
              letterSpacing: '0.06em', padding: '4px 8px', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = L.coral}
            onMouseLeave={e => e.currentTarget.style.color = L.dark}
          >
            BACK
          </button>
          <div>
            <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.muted, letterSpacing: '0.14em', textAlign: 'center' }}>
              THE LIBRARIAN'S DESK
            </p>
            <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 16, color: L.dark, fontWeight: 700, textAlign: 'center' }}>
              By Setting
            </h1>
          </div>
          <div style={{ width: 56 }} />
        </div>
      </div>

      {/* Map */}
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {loading ? (
          <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: L.muted, fontStyle: 'italic' }}>Loading the map…</p>
          </div>
        ) : (
          <div style={{ height: 320, position: 'relative' }}>
            <MapContainer
              center={[39, -96]}
              zoom={3}
              zoomControl={false}
              attributionControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                attribution=""
              />
              {geoJson && (
                <GeoJSON
                  ref={geoJsonRef}
                  key={JSON.stringify(Object.keys(stateBooks))}
                  data={geoJson}
                  style={styleFeature}
                  onEachFeature={onEachFeature}
                />
              )}
            </MapContainer>

            {/* Legend */}
            <div style={{
              position: 'absolute', bottom: 10, right: 10, zIndex: 1000,
              background: 'rgba(255,248,231,0.92)', borderRadius: 8,
              border: '1px solid rgba(56,197,197,0.3)', padding: '6px 10px',
              backdropFilter: 'blur(4px)',
            }}>
              <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 8, color: L.muted, letterSpacing: '0.1em', marginBottom: 5 }}>BOOKS</p>
              {[
                { label: '0',   color: 'rgba(153,153,153,0.2)' },
                { label: '1–2', color: 'rgba(56,197,197,0.3)'  },
                { label: '3–5', color: 'rgba(56,197,197,0.5)'  },
                { label: '6+',  color: 'rgba(56,197,197,0.72)' },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <div style={{ width: 14, height: 10, borderRadius: 2, background: color, border: '1px solid rgba(0,0,0,0.1)' }} />
                  <span style={{ fontFamily: 'Special Elite, serif', fontSize: 9, color: L.mid }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {!loading && allBooks.length === 0 && (
          <div style={{ padding: '12px 16px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: L.muted, fontStyle: 'italic', lineHeight: 1.6 }}>
              No books have been tagged with settings yet. Run the seed script to populate the map.
            </p>
          </div>
        )}

        {/* Beyond the map panel */}
        <BeyondPanel beyondBooks={beyondBooks} onCategory={handleBeyondCategory} />
      </div>

      {/* Stack card overlay */}
      {selected && (
        <StackCard
          books={selected.books}
          label={selected.label}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
