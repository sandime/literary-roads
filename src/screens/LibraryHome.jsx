import { useState } from 'react';
import { AUTHOR_TIDBITS } from '../data/authorTidbits';

// ── Library palette ────────────────────────────────────────────────────────────
const L = {
  turquoise: '#38C5C5',
  coral:     '#FF6B7A',
  cream:     '#FFF8E7',
  peach:     '#FFB8A3',
  gold:      '#F5A623',
  white:     '#FFFFFF',
  dark:      '#2D2D2D',
  sparkle1:  '#5FE3D0',
  sparkle2:  '#FF8FA3',
  sparkle3:  '#FFD166',
};

const SPINE_PALETTE = [
  '#38C5C5','#FF6B7A','#FFB8A3','#F5A623','#5FE3D0',
  '#FF8FA3','#FFD166','#FFFFFF','#B5E7E7','#E8C4A0',
];
const SPINE_H = [82, 70, 92, 68, 86, 74, 90, 66, 80, 76];
const SPINE_W = [22, 28, 20, 26, 24, 30, 20, 24, 26, 22];
const SPINE_LABELS = ['ROAD','NOVEL','JOURNEY','STORY','VERSE',
                      'PROSE','TALES','PAGES','WORDS','MAPS'];

const SHELVES = [
  { key: 'bookLog',   label: 'BOOK LOG',      sub: 'Your reading journey',     spines: [0,1,2,3,4,5,6,7,8] },
  { key: 'postcards', label: 'POSTCARD BOOKS', sub: 'Books sent from the road', spines: [3,6,1,8,4,0,7,2,5] },
  { key: 'myRecs',    label: 'MY RECS',        sub: 'Recommended at pit stops', spines: [7,2,5,0,8,3,1,6,4] },
  { key: 'readNext',  label: 'READ NEXT',      sub: 'Your literary wish list',  spines: [5,8,0,4,2,7,3,1,6] },
];

// ── Archive shelf — leather journal spines ────────────────────────────────────
const ARCHIVE_SPINES = [
  { w: 26, h: 88, color: '#8B2635', label: 'Vol. I',    lines: true  },
  { w: 16, h: 74, color: '#2D5A27', label: 'Vol. II',   lines: false },
  { w: 44, h: 86, color: '#1A3A5C', label: 'Vol. III',  lines: true  },
  { w: 16, h: 66, color: '#C8960C', label: 'Vol. IV',   lines: false },
  { w: 28, h: 92, color: '#38C5C5', label: 'Vol. V',    lines: true  },
  { w: 20, h: 70, color: '#E8D5A3', label: 'Vol. VI',   lines: false },
  { w: 30, h: 84, color: '#8B2635', label: 'Vol. VII',  lines: true  },
  { w: 14, h: 62, color: '#1A3A5C', label: 'Vol. VIII', lines: false },
  { w: 24, h: 80, color: '#C8960C', label: 'Vol. IX',   lines: true  },
];

function ArchiveSpine({ w, h, color, label, lines }) {
  const lightText = color !== '#E8D5A3';
  const textColor = lightText ? 'rgba(255,255,255,0.82)' : '#5C3A1E';
  const lineColor = lightText ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';
  return (
    <div style={{
      width: w, height: h, flexShrink: 0, borderRadius: '2px 2px 0 0',
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(90deg, ${color}AA 0%, ${color} 25%, ${color}F0 75%, ${color}99 100%)`,
      boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.22), inset 1px 0 2px rgba(255,255,255,0.08)',
    }}>
      {lines && (
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <line x1={3} y1={9}    x2={w-3} y2={9}    stroke={lineColor} strokeWidth="0.9" />
          <line x1={3} y1={13}   x2={w-3} y2={13}   stroke={lineColor} strokeWidth="0.4" />
          <line x1={3} y1={h-9}  x2={w-3} y2={h-9}  stroke={lineColor} strokeWidth="0.9" />
          <line x1={3} y1={h-13} x2={w-3} y2={h-13} stroke={lineColor} strokeWidth="0.4" />
        </svg>
      )}
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        writingMode: 'vertical-rl', transform: 'rotate(180deg)',
        fontFamily: 'Georgia, serif', fontStyle: 'italic',
        fontSize: Math.max(5, Math.min(7, w - 6)),
        color: textColor, letterSpacing: '0.04em',
        padding: '16px 2px', userSelect: 'none',
      }}>
        {label}
      </span>
    </div>
  );
}

function ArchiveShelfUnit({ onNavigate, estYear }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onNavigate('archive')}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, width: '100%', textAlign: 'left',
        transform: hov ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.22s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '0 2px' }}>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: L.dark, letterSpacing: '0.05em' }}>
          THE ARCHIVE
        </span>
        <span style={{
          marginLeft: 'auto', fontFamily: 'Special Elite, serif', fontSize: 10,
          color: '#C8960C', fontStyle: 'italic',
        }}>
          {estYear ? `est. ${estYear}` : 'your literary history'}
        </span>
      </div>
      <div style={{
        background: '#EDE0C4',
        borderTop:   `1.5px solid ${hov ? '#C8960C' : 'rgba(200,150,12,0.35)'}`,
        borderLeft:  `1.5px solid ${hov ? '#C8960C' : 'rgba(200,150,12,0.35)'}`,
        borderRight: `1.5px solid ${hov ? '#C8960C' : 'rgba(200,150,12,0.35)'}`,
        borderBottom: 'none',
        borderRadius: '6px 6px 0 0',
        padding: '8px 8px 0',
        display: 'flex', alignItems: 'flex-end', gap: 2,
        minHeight: 96,
        transition: 'border-color 0.2s',
      }}>
        {ARCHIVE_SPINES.map((spine, idx) => <ArchiveSpine key={idx} {...spine} />)}
      </div>
      <div style={{
        height: 14,
        background: 'linear-gradient(180deg, #C8960C 0%, #8B6510 100%)',
        borderRadius: '0 0 5px 5px',
        borderBottom: `1.5px solid ${hov ? '#C8960C' : 'rgba(200,150,12,0.35)'}`,
        borderLeft:   `1.5px solid ${hov ? '#C8960C' : 'rgba(200,150,12,0.35)'}`,
        borderRight:  `1.5px solid ${hov ? '#C8960C' : 'rgba(200,150,12,0.35)'}`,
        borderTop: 'none',
        boxShadow: hov ? '0 5px 14px rgba(200,150,12,0.38)' : '0 3px 8px rgba(0,0,0,0.14)',
        transition: 'box-shadow 0.22s, border-color 0.2s',
      }} />
    </button>
  );
}

// ── Retro SVG shapes ──────────────────────────────────────────────────────────
const Starburst = ({ color, size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
    <polygon
      points="15,1 17,10 25,6 21,14 30,15 21,16 25,24 17,20 15,29 13,20 5,24 9,16 0,15 9,14 5,6 13,10"
      fill={color}
    />
  </svg>
);

const Diamond = ({ color, size = 24 }) => (
  <svg width={size} height={Math.round(size * 1.2)} viewBox="0 0 24 30" aria-hidden="true">
    <polygon points="12,0 24,15 12,30 0,15" fill={color} />
  </svg>
);

const Boomerang = ({ color, size = 36 }) => (
  <svg width={size} height={Math.round(size * 0.6)} viewBox="0 0 36 22" aria-hidden="true">
    <path d="M2,20 Q9,2 18,9 Q27,16 34,3"
      stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
  </svg>
);

const Ring = ({ color, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
    <circle cx="11" cy="11" r="8" fill="none" stroke={color} strokeWidth="3.5" />
  </svg>
);

const Trapezoid = ({ color, size = 36 }) => (
  <svg width={size} height={Math.round(size * 0.55)} viewBox="0 0 36 20" aria-hidden="true">
    <polygon points="7,0 29,0 36,20 0,20" fill={color} />
  </svg>
);

// ── Single shelf unit ─────────────────────────────────────────────────────────
function ShelfUnit({ shelf, onNavigate, count }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onNavigate(shelf.key)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, width: '100%', textAlign: 'left',
        transform: hov ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.22s ease',
      }}
    >
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '0 2px' }}>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: L.dark, letterSpacing: '0.05em' }}>
          {shelf.label}
        </span>
        {count > 0 && (
          <span style={{
            fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.white,
            background: L.coral, borderRadius: 10, padding: '2px 6px',
          }}>
            {count}
          </span>
        )}
        <span style={{
          marginLeft: 'auto', fontFamily: 'Special Elite, serif', fontSize: 10,
          color: L.turquoise, fontStyle: 'italic',
        }}>
          {shelf.sub}
        </span>
      </div>

      {/* Books */}
      <div style={{
        background: '#FEF3D0',
        borderTop: `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderLeft: `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderRight: `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderBottom: 'none',
        borderRadius: '6px 6px 0 0',
        padding: '8px 8px 0',
        display: 'flex', alignItems: 'flex-end', gap: 2,
        minHeight: 92,
        transition: 'border-color 0.2s',
      }}>
        {shelf.spines.map((si, idx) => (
          <div key={idx} style={{
            width:  SPINE_W[si % SPINE_W.length],
            height: SPINE_H[si % SPINE_H.length],
            background: SPINE_PALETTE[(si + idx * 2) % SPINE_PALETTE.length],
            borderRadius: '2px 2px 0 0',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: 'inset -1px 0 3px rgba(0,0,0,0.12)',
          }}>
            <span style={{
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              fontFamily: 'Special Elite, serif', fontSize: 6,
              color: 'rgba(255,255,255,0.8)', letterSpacing: '0.08em',
              overflow: 'hidden', textOverflow: 'clip', whiteSpace: 'nowrap',
              maxHeight: '85%',
            }}>
              {SPINE_LABELS[si % SPINE_LABELS.length]}
            </span>
          </div>
        ))}
      </div>

      {/* Shelf board */}
      <div style={{
        height: 14,
        background: `linear-gradient(180deg, ${L.gold} 0%, #B8721A 100%)`,
        borderRadius: '0 0 5px 5px',
        borderBottom: `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderLeft: `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderRight: `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderTop: 'none',
        boxShadow: hov
          ? `0 5px 14px rgba(56,197,197,0.35)`
          : '0 3px 8px rgba(0,0,0,0.14)',
        transition: 'box-shadow 0.22s, border-color 0.2s',
      }} />
    </button>
  );
}

// ── Cat link to Gazette ───────────────────────────────────────────────────────
function CatLink({ size = 180 }) {
  const [hov, setHov] = useState(false);
  return (
    <a
      href="https://sandime.github.io/literary-roads/newspaper/current"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'block', position: 'relative', flexShrink: 0,
        borderRadius: size <= 60 ? 8 : 12, textDecoration: 'none',
        transform: hov ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.22s ease',
        boxShadow: hov
          ? `0 0 0 2px ${L.coral}, 0 6px 20px rgba(255,107,122,0.3)`
          : 'none',
      }}
      title="Read The Literary Roads Gazette"
    >
      <img
        src={`${import.meta.env.BASE_URL}images/library-cat.png`}
        alt="Library cat reading in a chair"
        style={{
          width: size, height: size, objectFit: 'contain',
          borderRadius: size <= 60 ? 8 : 12, display: 'block',
          animation: 'lib-float 4s ease-in-out infinite',
        }}
      />
    </a>
  );
}

// ── Author Room doorway card ──────────────────────────────────────────────────
function AuthorRoomCard({ discoveredAuthors, authorBooksCount, onNavigate }) {
  const [hov, setHov] = useState(false);

  const totalStates      = Object.keys(AUTHOR_TIDBITS).length;
  const discoveredStates = new Set(discoveredAuthors.map(a => a.state));
  const previewDiscovered = discoveredAuthors.slice(0, 3);
  const undiscoveredSlots = Object.keys(AUTHOR_TIDBITS)
    .filter(s => !discoveredStates.has(s))
    .slice(0, Math.max(0, 3 - previewDiscovered.length));
  const remaining = totalStates - discoveredAuthors.length;

  return (
    <button
      type="button"
      onClick={() => onNavigate('authorRoom')}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, width: '100%', textAlign: 'left',
        transform: hov ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.22s ease',
      }}
    >
      <div style={{
        borderRadius: 12, overflow: 'hidden', display: 'flex',
        border: `1px solid ${hov ? '#FF6B7A' : 'rgba(255,107,122,0.25)'}`,
        background: '#FFFAF5',
        boxShadow: hov ? '0 5px 16px rgba(255,107,122,0.18)' : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        {/* Coral accent stripe */}
        <div style={{ width: 4, background: '#FF6B7A', flexShrink: 0 }} />

        {/* Body */}
        <div style={{ flex: 1, padding: '14px 12px' }}>
          {/* Eyebrow */}
          <p style={{
            fontFamily: 'Bungee, sans-serif', fontSize: 9,
            color: '#FF6B7A', letterSpacing: '0.14em',
            textTransform: 'uppercase', margin: '0 0 5px',
          }}>
            SECOND ROOM
          </p>

          {/* Title */}
          <h3 style={{
            fontFamily: 'Georgia, serif', fontSize: 18,
            color: '#2D2D2D', fontWeight: 700,
            margin: '0 0 7px', lineHeight: 1.2,
          }}>
            The Author Room
          </h3>

          {/* Description */}
          <p style={{
            fontFamily: 'Special Elite, serif', fontSize: 12,
            color: '#888', lineHeight: 1.6, margin: '0 0 12px',
          }}>
            Authors discovered through your literary road trips — waiting to be found.
          </p>

          {/* Preview chip strip */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
            {previewDiscovered.map(a => (
              <span key={a.id} style={{
                fontFamily: 'Special Elite, serif', fontSize: 10,
                background: 'rgba(245,166,35,0.14)',
                border: '1px solid rgba(245,166,35,0.45)',
                borderRadius: 20, padding: '3px 9px',
                color: '#7A5800', whiteSpace: 'nowrap',
              }}>
                {a.name} · {a.state}
              </span>
            ))}
            {undiscoveredSlots.map(state => (
              <span key={state} style={{
                fontFamily: 'Special Elite, serif', fontSize: 10,
                background: 'transparent',
                border: '1px dashed rgba(0,0,0,0.18)',
                borderRadius: 20, padding: '3px 9px',
                color: 'rgba(0,0,0,0.28)', whiteSpace: 'nowrap',
              }}>
                ??? · {state}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: '#888' }}>
              <strong style={{ fontFamily: 'Bungee, sans-serif', color: '#FF6B7A' }}>
                {discoveredAuthors.length}
              </strong>{' '}discovered
            </span>
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: '#888' }}>
              <strong style={{ fontFamily: 'Bungee, sans-serif', color: '#AAAAAA' }}>
                {remaining}
              </strong>{' '}remaining
            </span>
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: '#888' }}>
              <strong style={{ fontFamily: 'Bungee, sans-serif', color: '#C07A10' }}>
                {authorBooksCount}
              </strong>{' '}books added
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 14px 0 4px',
          color: '#FF6B7A', fontSize: 18, flexShrink: 0,
        }}>
          →
        </div>
      </div>
    </button>
  );
}

// ── LibraryHome ───────────────────────────────────────────────────────────────
export default function LibraryHome({ onNavigate, onBack, bookCounts = {}, estYear = null, discoveredAuthors = [], authorBooksCount = 0 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: L.cream, overflowY: 'auto',
      fontFamily: 'Special Elite, serif',
    }}>
      <style>{`
        @keyframes lib-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-7px); }
        }
        @keyframes lib-spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .lib-header-cat { display: none; }
        @media (max-width: 540px) {
          .lib-right-col { display: none !important; }
          .lib-header-cat { display: block; }
        }
      `}</style>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: L.cream, borderBottom: `2px solid ${L.turquoise}`,
        padding: '10px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 680, margin: '0 auto' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark,
              letterSpacing: '0.06em', padding: '4px 8px',
              borderRadius: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = L.turquoise}
            onMouseLeave={e => e.currentTarget.style.color = L.dark}
          >
            BACK
          </button>
          <h1 style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 16, color: L.turquoise, letterSpacing: '0.06em' }}>
            Literary Roads Library
          </h1>
          <div className="lib-header-cat"><CatLink size={44} /></div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Left column: shelves */}
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            {/* Top accent row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 22 }}>
              <Starburst color={L.coral}    size={22} />
              <Diamond   color={L.gold}     size={16} />
              <Ring      color={L.turquoise} size={18} />
              <Boomerang color={L.peach}    size={26} />
              <Trapezoid color={L.sparkle3} size={28} />
              <Starburst color={L.sparkle2} size={16} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {SHELVES.map(shelf => (
                <ShelfUnit
                  key={shelf.key}
                  shelf={shelf}
                  onNavigate={onNavigate}
                  count={bookCounts[shelf.key] || 0}
                />
              ))}
              <ArchiveShelfUnit onNavigate={onNavigate} estYear={estYear} />
            </div>

            {/* Bottom accent row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 22 }}>
              <Starburst color={L.turquoise} size={18} />
              <Diamond   color={L.coral}     size={14} />
              <Ring      color={L.gold}      size={16} />
              <Trapezoid color={L.peach}     size={24} />
              <Boomerang color={L.sparkle1}  size={28} />
            </div>

            {/* Author Room doorway */}
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,107,122,0.18)' }} />
                <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: 'rgba(255,107,122,0.6)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                  through the doorway
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,107,122,0.18)' }} />
              </div>
              <AuthorRoomCard
                discoveredAuthors={discoveredAuthors}
                authorBooksCount={authorBooksCount}
                onNavigate={onNavigate}
              />
            </div>
          </div>

          {/* Right column: cat + accents (desktop only) */}
          <div className="lib-right-col" style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Starburst color={L.gold}  size={28} />
              <Starburst color={L.coral} size={18} />
            </div>

            <CatLink size={160} />

            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: 12,
              color: L.turquoise, fontStyle: 'italic',
              textAlign: 'center', margin: 0, lineHeight: 1.6,
            }}>
              Every road trip deserves a good book.
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Boomerang color={L.coral}    size={30} />
              <Ring      color={L.peach}    size={20} />
              <Trapezoid color={L.turquoise} size={32} />
              <Diamond   color={L.sparkle3} size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
