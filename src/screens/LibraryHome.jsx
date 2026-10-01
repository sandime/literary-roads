import { useState, useEffect } from 'react';
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
  { key: 'bookLog',   label: 'BOOK LOG',      sub: 'Your reading journey',                          subShort: 'Your reading journey',  spines: [0,1,2,3,4,5,6,7,8] },
  { key: 'postcards', label: 'POSTCARD BOOKS', sub: 'Share a postcard of the book you\'re reading',  subShort: 'Share a postcard',       spines: [3,6,1,8,4,0,7,2,5] },
  { key: 'myRecs',    label: 'MY RECS',        sub: 'Recommended at pit stops',                      subShort: 'From pit stops',         spines: [7,2,5,0,8,3,1,6,4] },
  { key: 'readNext',  label: 'READ NEXT',      sub: 'Your literary wish list',                       subShort: 'Your wish list',         spines: [5,8,0,4,2,7,3,1,6] },
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

function ArchiveSpine({ w, h, color, label, lines, scale = 1 }) {
  const sw = Math.round(w * scale);
  const sh = Math.round(h * scale);
  const lightText = color !== '#E8D5A3';
  const textColor = lightText ? 'rgba(255,255,255,0.82)' : '#5C3A1E';
  const lineColor = lightText ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';
  return (
    <div style={{
      width: sw, height: sh, flexShrink: 0, borderRadius: '2px 2px 0 0',
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(90deg, ${color}AA 0%, ${color} 25%, ${color}F0 75%, ${color}99 100%)`,
      boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.22), inset 1px 0 2px rgba(255,255,255,0.08)',
    }}>
      {lines && (
        <svg width={sw} height={sh} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <line x1={3} y1={9}    x2={sw-3} y2={9}    stroke={lineColor} strokeWidth="0.9" />
          <line x1={3} y1={13}   x2={sw-3} y2={13}   stroke={lineColor} strokeWidth="0.4" />
          <line x1={3} y1={sh-9}  x2={sw-3} y2={sh-9}  stroke={lineColor} strokeWidth="0.9" />
          <line x1={3} y1={sh-13} x2={sw-3} y2={sh-13} stroke={lineColor} strokeWidth="0.4" />
        </svg>
      )}
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        writingMode: 'vertical-rl', transform: 'rotate(180deg)',
        fontFamily: 'Georgia, serif', fontStyle: 'italic',
        fontSize: Math.max(5, Math.min(7, sw - 6)),
        color: textColor, letterSpacing: '0.04em',
        padding: '16px 2px', userSelect: 'none',
      }}>
        {label}
      </span>
    </div>
  );
}

function ArchiveShelfUnit({ onNavigate, estYear, scale = 1 }) {
  const [hov, setHov] = useState(false);
  const plankH = scale < 1 ? 12 : 14;
  const minH   = scale < 1 ? 80 : 96;
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
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: scale < 1 ? 12 : 13, color: L.dark, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          THE ARCHIVE
        </span>
        <span style={{
          marginLeft: 'auto', fontFamily: 'Special Elite, serif', fontSize: scale < 1 ? 9 : 10,
          color: '#C8960C', fontStyle: 'italic', textAlign: 'right',
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
        minHeight: minH, overflow: scale < 1 ? 'hidden' : 'visible',
        transition: 'border-color 0.2s',
      }}>
        {ARCHIVE_SPINES.map((spine, idx) => <ArchiveSpine key={idx} {...spine} scale={scale} />)}
      </div>
      <div style={{
        height: plankH,
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

// ── Set Aside shelf ───────────────────────────────────────────────────────────
const SET_ASIDE_SPINES = [2, 5, 0, 7, 3, 8];

function SetAsideShelfUnit({ onNavigate, count, scale = 1 }) {
  const [hov, setHov] = useState(false);
  const plankH = scale < 1 ? 12 : 14;
  const minH   = scale < 1 ? 80 : 96;
  return (
    <button
      type="button"
      onClick={() => onNavigate('setAside')}
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
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: scale < 1 ? 12 : 13, color: L.dark, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          SET ASIDE
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
          marginLeft: 'auto', fontFamily: 'Special Elite, serif', fontSize: scale < 1 ? 9 : 10,
          color: '#9b8cbf', fontStyle: 'italic', textAlign: 'right',
        }}>
          {scale < 1 ? 'Unfinished' : 'books you didn\'t finish'}
        </span>
      </div>

      <div style={{
        background: '#EDE8F4',
        borderTop:   `1.5px solid ${hov ? '#c4b8d4' : 'rgba(196,184,212,0.5)'}`,
        borderLeft:  `1.5px solid ${hov ? '#c4b8d4' : 'rgba(196,184,212,0.5)'}`,
        borderRight: `1.5px solid ${hov ? '#c4b8d4' : 'rgba(196,184,212,0.5)'}`,
        borderBottom: 'none',
        borderRadius: '6px 6px 0 0',
        padding: '8px 8px 0',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 2,
        minHeight: minH, overflow: scale < 1 ? 'hidden' : 'visible',
        transition: 'border-color 0.2s',
      }}>
        {SET_ASIDE_SPINES.map((si, idx) => (
          <div key={idx} style={{
            width:  Math.round(SPINE_W[si % SPINE_W.length] * scale),
            height: Math.round(SPINE_H[si % SPINE_H.length] * scale),
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

      <div style={{
        height: plankH,
        background: 'linear-gradient(180deg, #c4b8d4 0%, #b0a2c2 100%)',
        borderRadius: '0 0 5px 5px',
        borderBottom: `1.5px solid ${hov ? '#c4b8d4' : 'rgba(196,184,212,0.5)'}`,
        borderLeft:   `1.5px solid ${hov ? '#c4b8d4' : 'rgba(196,184,212,0.5)'}`,
        borderRight:  `1.5px solid ${hov ? '#c4b8d4' : 'rgba(196,184,212,0.5)'}`,
        borderTop: 'none',
        boxShadow: hov ? '0 5px 14px rgba(196,184,212,0.45)' : '0 3px 8px rgba(0,0,0,0.14)',
        transition: 'box-shadow 0.22s, border-color 0.2s',
      }} />
    </button>
  );
}

// ── Single shelf unit ─────────────────────────────────────────────────────────
function ShelfUnit({ shelf, onNavigate, count, scale = 1 }) {
  const [hov, setHov] = useState(false);
  const plankH = scale < 1 ? 12 : 14;
  const minH   = scale < 1 ? 80 : 92;
  const subText = scale < 1 ? shelf.subShort : shelf.sub;
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
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: scale < 1 ? 12 : 13, color: L.dark, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          {shelf.label}
        </span>
        {count > 0 && (
          <span style={{
            fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.white,
            background: L.coral, borderRadius: 10, padding: '2px 6px', flexShrink: 0,
          }}>
            {count}
          </span>
        )}
        <span style={{
          marginLeft: 'auto', fontFamily: 'Special Elite, serif', fontSize: scale < 1 ? 9 : 10,
          color: L.turquoise, fontStyle: 'italic', textAlign: 'right',
        }}>
          {subText}
        </span>
      </div>

      {/* Books */}
      <div style={{
        background: '#FEF3D0',
        borderTop:   `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderLeft:  `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderRight: `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderBottom: 'none',
        borderRadius: '6px 6px 0 0',
        padding: '8px 8px 0',
        display: 'flex', alignItems: 'flex-end', gap: 2,
        minHeight: minH, overflow: scale < 1 ? 'hidden' : 'visible',
        transition: 'border-color 0.2s',
      }}>
        {shelf.spines.map((si, idx) => (
          <div key={idx} style={{
            width:  Math.round(SPINE_W[si % SPINE_W.length] * scale),
            height: Math.round(SPINE_H[si % SPINE_H.length] * scale),
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
        height: plankH,
        background: `linear-gradient(180deg, ${L.gold} 0%, #B8721A 100%)`,
        borderRadius: '0 0 5px 5px',
        borderBottom: `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderLeft:   `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderRight:  `1.5px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.3)'}`,
        borderTop: 'none',
        boxShadow: hov ? '0 5px 14px rgba(56,197,197,0.35)' : '0 3px 8px rgba(0,0,0,0.14)',
        transition: 'box-shadow 0.22s, border-color 0.2s',
      }} />
    </button>
  );
}

// ── Author Room doorway card ──────────────────────────────────────────────────
function AuthorRoomCard({ discoveredAuthors, authorBooksCount, onNavigate, isMobile = false }) {
  const [hov, setHov] = useState(false);
  const totalStates = Object.keys(AUTHOR_TIDBITS).length;
  const remaining   = totalStates - discoveredAuthors.length;

  if (isMobile) {
    return (
      <button
        type="button"
        onClick={() => onNavigate('authorRoom')}
        style={{
          flex: 1, background: '#FFFAF5', border: `1px solid ${hov ? '#FF6B7A' : 'rgba(255,107,122,0.35)'}`,
          borderRadius: 10, padding: '9px 12px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
          cursor: 'pointer', textAlign: 'left',
          transform: hov ? 'translateY(-4px)' : 'none',
          transition: 'transform 0.22s ease, border-color 0.2s',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: '#FF6B7A', letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>SECOND ROOM</p>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#2D2D2D', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>The Author Room →</h3>
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 9, color: '#888', margin: 0 }}>
          <strong style={{ fontFamily: 'Bungee, sans-serif', color: '#FF6B7A' }}>{discoveredAuthors.length}</strong> discovered ·{' '}
          <strong style={{ fontFamily: 'Bungee, sans-serif', color: '#AAAAAA' }}>{remaining}</strong> left
        </p>
      </button>
    );
  }

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
        borderRadius: 12, padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 6,
        border: `1px solid ${hov ? '#FF6B7A' : 'rgba(255,107,122,0.35)'}`,
        background: '#FFFAF5',
        boxShadow: hov ? '0 5px 16px rgba(255,107,122,0.18)' : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: '#FF6B7A', letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>SECOND ROOM</p>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#2D2D2D', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>The Author Room →</h3>
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: '#888', lineHeight: 1.5, margin: 0 }}>
          Authors discovered through your literary road trips — waiting to be found.
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: '#888' }}>
            <strong style={{ fontFamily: 'Bungee, sans-serif', color: '#FF6B7A' }}>{discoveredAuthors.length}</strong>{' '}discovered
          </span>
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: '#888' }}>
            <strong style={{ fontFamily: 'Bungee, sans-serif', color: '#AAAAAA' }}>{remaining}</strong>{' '}remaining
          </span>
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: '#888' }}>
            <strong style={{ fontFamily: 'Bungee, sans-serif', color: '#C07A10' }}>{authorBooksCount}</strong>{' '}books added
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Librarian's Desk doorway card ─────────────────────────────────────────────
function LibrariansDesk({ onNavigate, isMobile = false }) {
  const [hov, setHov] = useState(false);

  if (isMobile) {
    return (
      <button
        type="button"
        onClick={() => onNavigate('librariansDesk')}
        style={{
          flex: 1, background: '#F7FFFF', border: `1px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.35)'}`,
          borderRadius: 10, padding: '9px 12px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
          cursor: 'pointer', textAlign: 'left',
          transform: hov ? 'translateY(-4px)' : 'none',
          transition: 'transform 0.22s ease, border-color 0.2s',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: L.turquoise, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>THIRD ROOM</p>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#2D2D2D', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>The Librarian's Desk →</h3>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate('librariansDesk')}
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
        borderRadius: 12, padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 6,
        border: `1px solid ${hov ? L.turquoise : 'rgba(56,197,197,0.35)'}`,
        background: '#F7FFFF',
        boxShadow: hov ? '0 5px 16px rgba(56,197,197,0.18)' : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.turquoise, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>THIRD ROOM</p>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#2D2D2D', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>The Librarian's Desk →</h3>
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: '#888', lineHeight: 1.5, margin: 0 }}>
          Need help finding a book?
        </p>
      </div>
    </button>
  );
}

// ── LibraryHome ───────────────────────────────────────────────────────────────
export default function LibraryHome({ onNavigate, onBack, bookCounts = {}, estYear = null, discoveredAuthors = [], authorBooksCount = 0, setAsideCount = 0 }) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 600);
  const [catHov, setCatHov]     = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 599px)');
    const handler = e => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const scale = isMobile ? 0.82 : 1;

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
      `}</style>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: L.cream, borderBottom: `2px solid ${L.turquoise}`,
        padding: '10px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 860, margin: '0 auto' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark,
              letterSpacing: '0.06em', padding: '4px 8px', borderRadius: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = L.turquoise}
            onMouseLeave={e => e.currentTarget.style.color = L.dark}
          >
            BACK
          </button>
          <h1 style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: isMobile ? 14 : 16, color: L.turquoise, letterSpacing: '0.06em' }}>
            Literary Roads Library
          </h1>
          <div style={{ width: 60 }} />
        </div>
      </div>

      <div style={{
        maxWidth: 860, margin: '0 auto',
        padding: isMobile ? '12px 16px 40px' : '20px 24px 48px',
        display: 'flex', flexDirection: 'column',
        gap: isMobile ? 20 : 24,
      }}>

        {isMobile ? (
          /* ── Mobile: nook + doorways row ──────────────────────────────── */
          <div style={{
            display: 'grid', gridTemplateColumns: '104px minmax(0,1fr)',
            gap: 12, alignItems: 'stretch',
            borderBottom: '1px solid rgba(56,197,197,.3)', paddingBottom: 14,
          }}>
            {/* Left: Gazette link */}
            <a
              href="#/newspaper/current"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, textDecoration: 'none',
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}images/library-cat.png`}
                alt="Library cat reading in a chair"
                style={{ width: 104, height: 104, objectFit: 'contain', display: 'block', animation: 'lib-float 4s ease-in-out infinite' }}
              />
              <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: L.coral, letterSpacing: '0.06em', textAlign: 'center' }}>
                TODAY'S GAZETTE →
              </span>
            </a>

            {/* Right: doorway buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AuthorRoomCard
                discoveredAuthors={discoveredAuthors}
                authorBooksCount={authorBooksCount}
                onNavigate={onNavigate}
                isMobile={true}
              />
              <LibrariansDesk onNavigate={onNavigate} isMobile={true} />
            </div>
          </div>
        ) : (
          /* ── Desktop: reading nook strip ──────────────────────────────── */
          <a
            href="#/newspaper/current"
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setCatHov(true)}
            onMouseLeave={() => setCatHov(false)}
            style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center',
              gap: 20, textDecoration: 'none',
              borderBottom: '1px solid rgba(56,197,197,.3)', paddingBottom: 16,
            }}
            title="Read The Literary Roads Gazette"
          >
            <img
              src={`${import.meta.env.BASE_URL}images/library-cat.png`}
              alt="Library cat reading in a chair"
              style={{
                width: 120, height: 120, objectFit: 'contain', flexShrink: 0,
                animation: 'lib-float 4s ease-in-out infinite',
                transform: catHov ? 'translateY(-3px)' : 'none',
                transition: 'transform 0.22s ease',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontFamily: 'Special Elite, serif', fontSize: 15, fontStyle: 'italic', color: L.turquoise }}>
                Every road trip deserves a good book.
              </span>
              <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.coral, letterSpacing: '0.06em' }}>
                READ TODAY'S GAZETTE →
              </span>
            </div>
          </a>
        )}

        {/* ── Shelves ─────────────────────────────────────────────────────── */}
        {isMobile ? (
          /* Mobile: single column */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {SHELVES.map(shelf => (
              <ShelfUnit key={shelf.key} shelf={shelf} onNavigate={onNavigate} count={bookCounts[shelf.key] || 0} scale={scale} />
            ))}
            <ArchiveShelfUnit onNavigate={onNavigate} estYear={estYear} scale={scale} />
            <SetAsideShelfUnit onNavigate={onNavigate} count={setAsideCount} scale={scale} />
          </div>
        ) : (
          /* Desktop: 2-up grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '22px 28px' }}>
            {SHELVES.map(shelf => (
              <ShelfUnit key={shelf.key} shelf={shelf} onNavigate={onNavigate} count={bookCounts[shelf.key] || 0} scale={scale} />
            ))}
            <ArchiveShelfUnit onNavigate={onNavigate} estYear={estYear} scale={scale} />
            <SetAsideShelfUnit onNavigate={onNavigate} count={setAsideCount} scale={scale} />
          </div>
        )}

        {/* ── Doorways (desktop only) ──────────────────────────────────────── */}
        {!isMobile && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,107,122,0.18)' }} />
              <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.coral, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                through the doorway
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,107,122,0.18)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
              <AuthorRoomCard
                discoveredAuthors={discoveredAuthors}
                authorBooksCount={authorBooksCount}
                onNavigate={onNavigate}
                isMobile={false}
              />
              <LibrariansDesk onNavigate={onNavigate} isMobile={false} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
