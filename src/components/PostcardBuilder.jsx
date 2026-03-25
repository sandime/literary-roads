import { useState, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { searchBooks } from '../utils/googleBooks';
import { BackArrowIcon } from './Icons';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATES = [
  { name: 'Alabama', code: 'AL' }, { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' }, { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' }, { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' }, { name: 'Delaware', code: 'DE' },
  { name: 'Florida', code: 'FL' }, { name: 'Georgia', code: 'GA' },
  { name: 'Hawaii', code: 'HI' }, { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' }, { name: 'Indiana', code: 'IN' },
  { name: 'Iowa', code: 'IA' }, { name: 'Kansas', code: 'KS' },
  { name: 'Kentucky', code: 'KY' }, { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' }, { name: 'Maryland', code: 'MD' },
  { name: 'Massachusetts', code: 'MA' }, { name: 'Michigan', code: 'MI' },
  { name: 'Minnesota', code: 'MN' }, { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' }, { name: 'Montana', code: 'MT' },
  { name: 'Nebraska', code: 'NE' }, { name: 'Nevada', code: 'NV' },
  { name: 'New Hampshire', code: 'NH' }, { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' }, { name: 'New York', code: 'NY' },
  { name: 'North Carolina', code: 'NC' }, { name: 'North Dakota', code: 'ND' },
  { name: 'Ohio', code: 'OH' }, { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' }, { name: 'Pennsylvania', code: 'PA' },
  { name: 'Rhode Island', code: 'RI' }, { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota', code: 'SD' }, { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' }, { name: 'Utah', code: 'UT' },
  { name: 'Vermont', code: 'VT' }, { name: 'Virginia', code: 'VA' },
  { name: 'Washington', code: 'WA' }, { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' }, { name: 'Wyoming', code: 'WY' },
  { name: 'Washington DC', code: 'DC' }, { name: 'Puerto Rico', code: 'PR' },
];

const VIBE_TAGS = [
  'immersive', 'family drama', 'character driven', 'beautiful prose',
  'haunting', 'life changing', 'plot-driven', 'entertaining',
  'mind-bending', 'redemptive', 'comforting',
];

const MSG_LIMIT = 280;

const PROMPTS = [
  'Where were you when you started this book?',
  'What drew you to pick it up?',
  'Who should read this book?',
  'How did this book make you feel?',
];

// ── Canvas helpers ────────────────────────────────────────────────────────────

function loadImageEl(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);  // graceful fallback
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
  return curY + lineHeight;
}

function drawStamp(ctx, cx, cy, size, stateCode, stateName) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);  // ~-7 degrees

  const h = size;
  const w = size * 0.88;  // slightly narrow rectangle

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;

  // Background
  ctx.fillStyle = '#F4ECCC';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';

  // Perforated edge (dashed inner border)
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
  ctx.setLineDash([]);

  // Decorative inner thin border
  ctx.strokeStyle = 'rgba(139,69,19,0.3)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20);

  // State code
  ctx.fillStyle = '#2c1810';
  ctx.font = `bold ${Math.floor(size * 0.28)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stateCode, 0, -h * 0.09);

  // "LITERARY ROADS"
  ctx.fillStyle = '#8B4513';
  ctx.font = `${Math.floor(size * 0.082)}px Georgia, serif`;
  ctx.fillText('LITERARY ROADS', 0, h * 0.18);

  // State name
  ctx.fillStyle = '#666';
  ctx.font = `${Math.floor(size * 0.076)}px Georgia, serif`;
  const name = stateName.length > 14 ? stateName.slice(0, 13) + '.' : stateName.toUpperCase();
  ctx.fillText(name, 0, h * 0.33);

  // Outer solid frame
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

// Generates and downloads the postcard front as a PNG
export async function downloadPostcardImage(data) {
  const W = 600, H = 400;
  const canvas = document.createElement('canvas');
  canvas.width = W * 2;   // retina
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#FFFDE7';
  ctx.fillRect(0, 0, W, H);

  // Subtle paper texture (thin cross-hatching)
  ctx.strokeStyle = 'rgba(139,69,19,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 20) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
  }
  for (let j = 0; j < H; j += 20) {
    ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke();
  }

  // Outer border
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  // Inner border
  ctx.strokeStyle = 'rgba(139,69,19,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(13, 13, W - 26, H - 26);

  // ── Book cover ──────────────────────────────────────────────────────────────
  const coverX = 22, coverY = 50, coverW = 168, coverH = 260;
  if (data.bookCover) {
    const img = await loadImageEl(data.bookCover);
    if (img) {
      // Clip to cover rect
      ctx.save();
      ctx.beginPath();
      ctx.rect(coverX, coverY, coverW, coverH);
      ctx.clip();
      ctx.drawImage(img, coverX, coverY, coverW, coverH);
      ctx.restore();
    } else {
      ctx.fillStyle = '#2c1810';
      ctx.fillRect(coverX, coverY, coverW, coverH);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 36px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', coverX + coverW / 2, coverY + coverH / 2 + 12);
    }
  } else {
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(coverX, coverY, coverW, coverH);
  }
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 2;
  ctx.strokeRect(coverX, coverY, coverW, coverH);

  // ── Text area ───────────────────────────────────────────────────────────────
  const tx = coverX + coverW + 18;
  const textMaxW = W - tx - 130;

  // Title
  ctx.fillStyle = '#2c1810';
  ctx.textAlign = 'left';
  ctx.font = `bold 21px Georgia, serif`;
  const titleBottom = wrapText(ctx, data.bookTitle, tx, 78, textMaxW, 26);

  // Author
  ctx.font = `italic 16px Georgia, serif`;
  ctx.fillStyle = '#8B4513';
  ctx.fillText('by ' + data.bookAuthor, tx, Math.max(titleBottom, 112));

  // Location
  const locLine = Math.max(titleBottom, 112) + 24;
  ctx.font = '14px Georgia, serif';
  ctx.fillStyle = '#666';
  const loc = data.city ? `${data.city}, ${data.state}` : data.state;
  ctx.fillText(loc, tx, locLine);

  // Vibe tags (small caps)
  if (data.vibeTags?.length) {
    ctx.font = '13px Georgia, serif';
    ctx.fillStyle = '#8B4513';
    const tagText = data.vibeTags.map(t => t.toUpperCase()).join('  ·  ');
    wrapText(ctx, tagText, tx, locLine + 22, textMaxW, 17);
  }

  // ── Stamp ───────────────────────────────────────────────────────────────────
  drawStamp(ctx, W - 74, 68, 110, data.stateCode, data.state);

  // ── Hashtags ─────────────────────────────────────────────────────────────────
  if (data.hashtags?.length) {
    ctx.font = 'bold 10px Georgia, serif';
    ctx.fillStyle = 'rgba(139,69,19,0.8)';
    ctx.textAlign = 'left';
    wrapText(ctx, data.hashtags.join(' '), 28, H - 44, W - 56, 14);
  }

  // ── Branding ─────────────────────────────────────────────────────────────────
  ctx.font = 'italic 10px Georgia, serif';
  ctx.fillStyle = 'rgba(139,69,19,0.45)';
  ctx.textAlign = 'right';
  ctx.fillText('Literary Roads', W - 20, H - 14);

  return canvas;
}

// ── Stamp SVG preview ────────────────────────────────────────────────────────

function StampPreview({ stateCode, stateName, size = 90 }) {
  const w = size * 0.88;
  const h = size;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{ transform: 'rotate(-5deg)', filter: 'drop-shadow(2px 3px 4px rgba(0,0,0,0.3))' }}>
      <rect width={w} height={h} fill="#F4ECCC" />
      <rect x="5" y="5" width={w - 10} height={h - 10}
        fill="none" stroke="#8B4513" strokeWidth="1.5" strokeDasharray="3,3" />
      <rect x="10" y="10" width={w - 20} height={h - 20}
        fill="none" stroke="rgba(139,69,19,0.3)" strokeWidth="0.5" />
      <text x={w / 2} y={h * 0.44} textAnchor="middle" dominantBaseline="middle"
        fontFamily="Georgia, serif" fontWeight="bold" fontSize={size * 0.28}
        fill="#2c1810">{stateCode}</text>
      <text x={w / 2} y={h * 0.66} textAnchor="middle"
        fontFamily="Georgia, serif" fontSize={size * 0.082} fill="#8B4513">
        LITERARY ROADS
      </text>
      <text x={w / 2} y={h * 0.80} textAnchor="middle"
        fontFamily="Georgia, serif" fontSize={size * 0.076} fill="#666">
        {stateName.length > 14 ? stateName.slice(0, 13) + '.' : stateName.toUpperCase()}
      </text>
      <rect width={w} height={h} fill="none" stroke="#8B4513" strokeWidth="2" />
    </svg>
  );
}

// ── Postcard HTML preview ─────────────────────────────────────────────────────

export function PostcardFront({ data, scale = 1 }) {
  const W = 600 * scale, H = 400 * scale;
  const fs = (n) => n * scale;

  return (
    <div style={{
      width: W, height: H, position: 'relative', flexShrink: 0,
      background: '#FFFDE7',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(139,69,19,0.04) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(139,69,19,0.04) 20px)',
      border: `${fs(4)}px solid #8B4513`,
      boxSizing: 'border-box',
      boxShadow: '4px 4px 16px rgba(0,0,0,0.25)',
      fontFamily: 'Georgia, serif',
      overflow: 'hidden',
    }}>
      {/* Inner border */}
      <div style={{ position: 'absolute', inset: fs(10), border: `${fs(0.5)}px solid rgba(139,69,19,0.25)`, pointerEvents: 'none' }} />

      {/* Book cover */}
      <div style={{
        position: 'absolute', left: fs(22), top: fs(50),
        width: fs(168), height: fs(260),
        border: `${fs(2)}px solid #8B4513`,
        boxShadow: `${fs(3)}px ${fs(3)}px ${fs(10)}px rgba(0,0,0,0.3)`,
        background: '#2c1810', overflow: 'hidden',
      }}>
        {data.bookCover
          ? <img src={data.bookCover} alt={data.bookTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: fs(32) }}>?</div>
        }
      </div>

      {/* Text area */}
      <div style={{ position: 'absolute', left: fs(208), top: fs(54), right: fs(128), bottom: fs(50) }}>
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: fs(18), color: '#2c1810', lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {data.bookTitle}
        </p>
        <p style={{ margin: `${fs(5)}px 0 0`, fontStyle: 'italic', fontSize: fs(14), color: '#8B4513' }}>
          by {data.bookAuthor}
        </p>
        {(data.city || data.state) && (
          <p style={{ margin: `${fs(10)}px 0 0`, fontSize: fs(13), color: '#666' }}>
            {data.city ? `${data.city}, ${data.state}` : data.state}
          </p>
        )}
        {data.vibeTags?.length > 0 && (
          <p style={{ margin: `${fs(10)}px 0 0`, fontSize: fs(12), color: '#8B4513', lineHeight: 1.6,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
            {data.vibeTags.map(t => t.toUpperCase()).join('  ·  ')}
          </p>
        )}
      </div>

      {/* Stamp — top right */}
      {data.stateCode && (
        <div style={{ position: 'absolute', top: fs(18), right: fs(18) }}>
          <StampPreview stateCode={data.stateCode} stateName={data.state} size={fs(90)} />
        </div>
      )}

      {/* Hashtags — bottom */}
      {data.hashtags?.length > 0 && (
        <div style={{ position: 'absolute', bottom: fs(14), left: fs(26), right: fs(16) }}>
          <p style={{ margin: 0, fontSize: fs(10), color: 'rgba(139,69,19,0.8)', fontWeight: 'bold',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.hashtags.join(' ')}
          </p>
        </div>
      )}

      {/* Branding */}
      <p style={{ position: 'absolute', bottom: fs(5), right: fs(12), margin: 0,
        fontStyle: 'italic', fontSize: fs(9), color: 'rgba(139,69,19,0.4)' }}>
        Literary Roads
      </p>
    </div>
  );
}

export function PostcardBack({ data, scale = 1 }) {
  const W = 600 * scale, H = 400 * scale;
  const fs = (n) => n * scale;
  const createdDate = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{
      width: W, height: H, position: 'relative', flexShrink: 0,
      background: '#FFFDE7',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(139,69,19,0.04) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(139,69,19,0.04) 20px)',
      border: `${fs(4)}px solid #8B4513`,
      boxSizing: 'border-box',
      boxShadow: '4px 4px 16px rgba(0,0,0,0.25)',
      fontFamily: 'Georgia, serif',
      overflow: 'hidden',
    }}>
      {/* Inner border */}
      <div style={{ position: 'absolute', inset: fs(10), border: `${fs(0.5)}px solid rgba(139,69,19,0.25)`, pointerEvents: 'none' }} />

      {/* Vertical divider */}
      <div style={{ position: 'absolute', left: '55%', top: fs(20), bottom: fs(20),
        width: fs(1), background: 'rgba(139,69,19,0.3)' }} />

      {/* Message side */}
      <div style={{ position: 'absolute', left: fs(22), top: fs(22), width: '52%', bottom: fs(22) }}>
        <p style={{ margin: 0, fontSize: fs(15), color: '#2c1810', lineHeight: 1.7, fontStyle: 'italic',
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 7, WebkitBoxOrient: 'vertical' }}>
          &ldquo;{data.message}&rdquo;
        </p>
        <div style={{ marginTop: fs(14) }}>
          <p style={{ margin: 0, fontSize: fs(14), color: '#2c1810', fontWeight: 'bold' }}>
            &mdash; {data.authorName || 'A Literary Traveler'}
          </p>
          {(data.city || data.state) && (
            <p style={{ margin: `${fs(3)}px 0 0`, fontSize: fs(13), color: '#666' }}>
              {data.city ? `${data.city}, ${data.state}` : data.state}
            </p>
          )}
          <p style={{ margin: `${fs(3)}px 0 0`, fontSize: fs(13), color: '#888' }}>
            {createdDate}
          </p>
        </div>
      </div>

      {/* Address / right side */}
      <div style={{ position: 'absolute', left: '57%', top: fs(28), right: fs(18), bottom: fs(22) }}>
        {/* Stamp */}
        {data.stateCode && (
          <div style={{ position: 'absolute', top: 0, right: 0 }}>
            <StampPreview stateCode={data.stateCode} stateName={data.state} size={fs(72)} />
          </div>
        )}
        {/* Address lines */}
        <div style={{ marginTop: fs(90), borderTop: `${fs(1)}px solid rgba(139,69,19,0.25)`, paddingTop: fs(8) }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: fs(22), borderBottom: `${fs(0.5)}px solid rgba(139,69,19,0.2)`, marginBottom: fs(4) }} />
          ))}
        </div>
        {/* Branding */}
        <div style={{ position: 'absolute', bottom: fs(4), left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: fs(10), color: 'rgba(139,69,19,0.6)', letterSpacing: '0.1em' }}>
            LITERARY ROADS
          </p>
          <p style={{ margin: `${fs(1)}px 0 0`, fontStyle: 'italic', fontSize: fs(9), color: 'rgba(139,69,19,0.35)' }}>
            Book Postcard
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

function Step1({ loggedBooks, onNext, onClose }) {
  const [tab, setTab] = useState('search');  // 'search' | 'log'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);

  const handleQuery = (q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const r = await searchBooks(q);
      setResults(r);
      setSearching(false);
    }, 350);
  };

  const pickBook = (b) => setSelected(b);

  const searchResultItem = (book, i) => (
    <button key={book.id || i} type="button" onClick={() => pickBook(book)}
      style={{
        width: '100%', display: 'flex', gap: 12, alignItems: 'center',
        padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
        background: selected?.id === book.id ? 'rgba(255,78,0,0.08)' : 'rgba(255,255,255,0.03)',
        borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
        border: 'none', transition: 'background 0.15s',
        outline: selected?.id === book.id ? '1.5px solid rgba(255,78,0,0.4)' : 'none',
      }}
      onMouseEnter={e => { if (selected?.id !== book.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={e => { if (selected?.id !== book.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
    >
      <div style={{ width: 40, height: 56, flexShrink: 0, borderRadius: 3, overflow: 'hidden', background: '#1A1B2E', border: '1px solid rgba(255,255,255,0.1)' }}>
        {book.coverURL
          ? <img src={book.coverURL} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'rgba(255,255,255,0.2)' }}>?</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-bungee" style={{ fontSize: 11, color: '#F0E6CC', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>{book.title}</p>
        <p className="font-special-elite" style={{ fontSize: 11, color: 'rgba(192,192,192,0.55)', margin: '2px 0 0' }}>{book.author}</p>
      </div>
    </button>
  );

  const logItem = (entry, i) => {
    const book = { id: entry.googleBooksId, title: entry.bookTitle, author: entry.bookAuthor, coverURL: entry.bookCover };
    return (
      <button key={entry.id} type="button" onClick={() => pickBook(book)}
        style={{
          flexShrink: 0, width: 76, background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          borderRadius: 6, outline: selected?.id === book.id ? '2px solid #FF4E00' : '2px solid transparent',
          transition: 'outline 0.15s',
        }}>
        <div style={{ width: 68, height: 96, borderRadius: 4, overflow: 'hidden', background: '#1A1B2E', border: '1.5px solid rgba(255,255,255,0.12)' }}>
          {book.coverURL
            ? <img src={book.coverURL} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'rgba(255,255,255,0.2)' }}>?</div>
          }
        </div>
        <p className="font-special-elite" style={{ fontSize: 9, color: 'rgba(192,192,192,0.55)', textAlign: 'center', marginTop: 4, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {book.title}
        </p>
      </button>
    );
  };

  return (
    <div style={stepWrap}>
      <StepHeader step={1} title="SELECT BOOK" onClose={onClose} />

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 16 }}>
        {[['search', 'Search Books'], ['log', 'From My Log']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className="font-bungee"
            style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 11,
              background: 'transparent', letterSpacing: '0.06em',
              color: tab === key ? '#FF4E00' : 'rgba(192,192,192,0.5)',
              borderBottom: tab === key ? '2px solid #FF4E00' : '2px solid transparent',
              transition: 'color 0.15s', marginBottom: -1 }}>
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input value={query} onChange={e => handleQuery(e.target.value)}
              placeholder="Search by title or author..."
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = '#FF4E00'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
            />
            {searching && <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, border: '2px solid #FF4E00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'pb-spin 0.7s linear infinite' }} />}
          </div>
          {results.length > 0 && (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', maxHeight: 260, overflowY: 'auto' }}>
              {results.map((b, i) => searchResultItem(b, i))}
            </div>
          )}
          {!searching && query.length > 1 && results.length === 0 && (
            <p className="font-special-elite" style={{ textAlign: 'center', color: 'rgba(192,192,192,0.35)', fontSize: 13, fontStyle: 'italic', padding: '12px 0' }}>No results found</p>
          )}
        </>
      )}

      {tab === 'log' && (
        loggedBooks.length === 0
          ? <p className="font-special-elite" style={{ textAlign: 'center', color: 'rgba(192,192,192,0.4)', fontSize: 13, fontStyle: 'italic', padding: '20px 0' }}>No books in your log yet. Use the Search tab above.</p>
          : <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
              {loggedBooks.map((e, i) => logItem(e, i))}
            </div>
      )}

      {selected && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: 'rgba(255,78,0,0.06)', border: '1px solid rgba(255,78,0,0.3)', display: 'flex', gap: 12, alignItems: 'center' }}>
          {selected.coverURL && (
            <img src={selected.coverURL} alt={selected.title} style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 3, border: '1px solid rgba(255,78,0,0.3)' }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="font-bungee" style={{ fontSize: 11, color: '#FF4E00', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>{selected.title}</p>
            <p className="font-special-elite" style={{ fontSize: 11, color: 'rgba(192,192,192,0.55)', margin: '2px 0 0' }}>by {selected.author}</p>
          </div>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(192,192,192,0.4)', cursor: 'pointer', fontSize: 18 }}>x</button>
        </div>
      )}

      <StepFooter onBack={null} onNext={() => selected && onNext(selected)} nextDisabled={!selected} onClose={onClose} />
    </div>
  );
}

function Step2({ book, onNext, onBack, onClose }) {
  const [stateCode, setStateCode] = useState('');
  const [city, setCity] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const selectedState = STATES.find(s => s.code === stateCode);

  const handleGPS = () => {
    if (!navigator.geolocation) { setGpsError('Geolocation not available.'); return; }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lng } = pos.coords;
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=5&addressdetails=1`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'literary-roads-app/1.0' } });
        const data = await resp.json();
        const stateNameRaw = data.address?.state || '';
        const match = STATES.find(s => s.name.toLowerCase() === stateNameRaw.toLowerCase());
        if (match) setStateCode(match.code);
        else setGpsError('Could not identify state. Please select manually.');
        setCity(data.address?.city || data.address?.town || '');
      } catch {
        setGpsError('Location lookup failed.');
      } finally {
        setGpsLoading(false);
      }
    }, () => { setGpsError('Location access denied.'); setGpsLoading(false); });
  };

  return (
    <div style={stepWrap}>
      <StepHeader step={2} title="CHOOSE STATE" onClose={onClose} />

      <label className="font-bungee" style={labelStyle}>WHERE DID YOU START READING THIS BOOK?</label>

      <select value={stateCode} onChange={e => setStateCode(e.target.value)} className="font-special-elite"
        style={{ ...inputStyle, cursor: 'pointer', marginBottom: 10, color: stateCode ? '#F5F5DC' : 'rgba(192,192,192,0.4)' }}>
        <option value="">Select a state...</option>
        {STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
      </select>

      <button onClick={handleGPS} disabled={gpsLoading} className="font-bungee"
        style={{ ...outlineBtn, marginBottom: gpsError ? 6 : 16, opacity: gpsLoading ? 0.6 : 1 }}>
        {gpsLoading ? 'DETECTING...' : 'USE MY CURRENT LOCATION'}
      </button>
      {gpsError && <p className="font-special-elite" style={{ color: '#FF6060', fontSize: 12, marginBottom: 12 }}>{gpsError}</p>}

      <label className="font-bungee" style={labelStyle}>CITY (OPTIONAL)</label>
      <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Portland"
        style={{ ...inputStyle, marginBottom: 20 }}
        onFocus={e => e.currentTarget.style.borderColor = '#FF4E00'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
      />

      {stateCode && (
        <div style={{ marginBottom: 16 }}>
          <p className="font-bungee" style={{ ...labelStyle, marginBottom: 10 }}>STAMP PREVIEW</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <StampPreview stateCode={stateCode} stateName={selectedState?.name || stateCode} size={100} />
          </div>
        </div>
      )}

      <StepFooter onBack={onBack} onNext={() => stateCode && onNext({ stateCode, state: selectedState?.name || stateCode, city })} nextDisabled={!stateCode} onClose={onClose} />
    </div>
  );
}

function Step3({ book, stateData, onNext, onBack, onClose }) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [authorName, setAuthorName] = useState(user?.displayName || '');
  const [vibeTags, setVibeTags] = useState([]);
  const [hashtags, setHashtags] = useState(() => {
    const tags = ['#literaryroads'];
    if (stateData.stateCode) tags.push(`#read${stateData.stateCode.toLowerCase()}`);
    const slug = (book.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    if (slug) tags.push(`#${slug}`);
    return tags.join(' ');
  });

  const toggleVibeTag = (tag) => {
    setVibeTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const remaining = MSG_LIMIT - message.length;

  return (
    <div style={stepWrap}>
      <StepHeader step={3} title="WRITE YOUR MESSAGE" onClose={onClose} />

      <label className="font-bungee" style={labelStyle}>YOUR MESSAGE</label>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, MSG_LIMIT))}
          placeholder="What does this book mean to you?"
          rows={5}
          style={{ ...inputStyle, resize: 'none', lineHeight: 1.6, paddingBottom: 28 }}
          onFocus={e => e.currentTarget.style.borderColor = '#FF4E00'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
        />
        <span className="font-bungee" style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 10,
          color: remaining < 40 ? '#FF4E00' : 'rgba(192,192,192,0.4)', letterSpacing: '0.04em' }}>
          {remaining}
        </span>
      </div>

      {/* Prompt suggestions */}
      <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="font-bungee" style={{ fontSize: 9, color: '#fcd8c5', letterSpacing: '0.08em', margin: '0 0 8px' }}>INSPIRATION</p>
        {PROMPTS.map((p, i) => (
          <p key={i} className="font-special-elite" style={{ margin: i > 0 ? '4px 0 0' : 0, fontSize: 11, color: '#fcd8c5', fontStyle: 'italic' }}>
            {p}
          </p>
        ))}
      </div>

      {/* Vibe tags */}
      <label className="font-bungee" style={labelStyle}>VIBE TAGS</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {VIBE_TAGS.map(tag => (
          <button key={tag} type="button" onClick={() => toggleVibeTag(tag)} className="font-bungee"
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 9, letterSpacing: '0.06em',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: vibeTags.includes(tag) ? '#FF4E00' : 'rgba(255,255,255,0.08)',
              color: vibeTags.includes(tag) ? '#1A1B2E' : '#fcd8c5',
              boxShadow: vibeTags.includes(tag) ? '0 0 10px rgba(255,78,0,0.35)' : 'none',
            }}>
            {tag.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Signature */}
      <label className="font-bungee" style={labelStyle}>SIGN YOUR POSTCARD</label>
      <input value={authorName} onChange={e => setAuthorName(e.target.value)}
        placeholder="Your name or pen name"
        style={{ ...inputStyle, marginBottom: 20 }}
        onFocus={e => e.currentTarget.style.borderColor = '#FF4E00'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
      />

      {/* Hashtags */}
      <label className="font-bungee" style={labelStyle}>HASHTAGS</label>
      <input value={hashtags} onChange={e => setHashtags(e.target.value)}
        placeholder="#literaryroads #bookstagram"
        style={{ ...inputStyle, marginBottom: 6 }}
        onFocus={e => e.currentTarget.style.borderColor = '#FF4E00'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
      />
      <p className="font-special-elite" style={{ fontSize: 10, color: 'rgba(192,192,192,0.3)', margin: '0 0 20px', fontStyle: 'italic' }}>
        Suggested: #read{(stateData.stateCode || 'state').toLowerCase()} #literaryroads #bookstagram
      </p>

      <StepFooter onBack={onBack}
        onNext={() => message.trim() && onNext({ message, vibeTags, hashtags: hashtags.trim().split(/\s+/).filter(h => h.startsWith('#')), authorName: authorName.trim() || 'A Literary Traveler' })}
        nextDisabled={!message.trim()} onClose={onClose} />
    </div>
  );
}

function Step4({ data, onBack, onSave, saving, onClose }) {
  const [side, setSide] = useState('front');

  return (
    <div style={stepWrap}>
      <StepHeader step={4} title="PREVIEW & SHARE" onClose={onClose} />

      {/* Side toggle */}
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.12)', marginBottom: 16 }}>
        {[['front', 'FRONT'], ['back', 'BACK']].map(([key, label]) => (
          <button key={key} onClick={() => setSide(key)} className="font-bungee"
            style={{ flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: 11,
              background: side === key ? '#FF4E00' : 'transparent',
              color: side === key ? '#1A1B2E' : 'rgba(192,192,192,0.5)',
              letterSpacing: '0.06em', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Preview — scaled down */}
      <div style={{ width: '100%', overflowX: 'auto', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        <div style={{ transform: 'scale(0.5)', transformOrigin: 'top center', height: 200, pointerEvents: 'none' }}>
          {side === 'front'
            ? <PostcardFront data={data} scale={1} />
            : <PostcardBack data={data} scale={1} />
          }
        </div>
      </div>

      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
        <p className="font-bungee" style={{ fontSize: 10, color: 'rgba(192,192,192,0.4)', letterSpacing: '0.08em', margin: '0 0 6px' }}>AFTER SAVING YOU CAN</p>
        {['Download as image', 'Share to Facebook', 'Share to Pinterest', 'Copy caption for Instagram'].map((item, i) => (
          <p key={i} className="font-special-elite" style={{ margin: i > 0 ? '3px 0 0' : 0, fontSize: 12, color: 'rgba(192,192,192,0.5)' }}>
            {item}
          </p>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} className="font-bungee" style={{ ...outlineBtn, flex: 'none', padding: '12px 18px' }}>BACK</button>
        <button onClick={onSave} disabled={saving} className="font-bungee"
          style={{ flex: 1, padding: 12, background: saving ? 'rgba(255,78,0,0.4)' : '#FF4E00',
            color: '#1A1B2E', borderRadius: 8, border: 'none', fontSize: 12, letterSpacing: '0.08em',
            cursor: saving ? 'default' : 'pointer', boxShadow: saving ? 'none' : '0 0 14px rgba(255,78,0,0.4)' }}>
          {saving ? 'SAVING...' : 'SAVE POSTCARD'}
        </button>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function StepHeader({ step, title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <span className="font-bungee" style={{ fontSize: 10, color: 'rgba(255,78,0,0.5)', letterSpacing: '0.1em' }}>
        STEP {step} OF 4
      </span>
      <h2 className="font-bungee" style={{ margin: 0, fontSize: 14, color: '#FF4E00',
        textShadow: '0 0 12px rgba(255,78,0,0.5)', letterSpacing: '0.06em' }}>
        {title}
      </h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
        color: 'rgba(192,192,192,0.4)', fontSize: 20, lineHeight: 1, padding: 2 }}>x</button>
    </div>
  );
}

function StepFooter({ onBack, onNext, nextDisabled, onClose }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 16 }}>
      {onBack
        ? <button onClick={onBack} className="font-bungee" style={{ ...outlineBtn, flex: 'none', padding: '12px 16px' }}>BACK</button>
        : <button onClick={onClose} className="font-bungee" style={{ ...outlineBtn, flex: 'none', padding: '12px 16px' }}>CANCEL</button>
      }
      <button onClick={onNext} disabled={nextDisabled} className="font-bungee"
        style={{ flex: 1, padding: 12, background: nextDisabled ? 'rgba(255,78,0,0.3)' : '#FF4E00',
          color: '#1A1B2E', borderRadius: 8, border: 'none', fontSize: 12, letterSpacing: '0.08em',
          cursor: nextDisabled ? 'default' : 'pointer',
          boxShadow: nextDisabled ? 'none' : '0 0 14px rgba(255,78,0,0.4)' }}>
        NEXT
      </button>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const stepWrap = {
  display: 'flex', flexDirection: 'column', height: '100%',
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#111220', border: '1.5px solid rgba(255,255,255,0.2)',
  borderRadius: 10, color: '#F5F5DC',
  padding: '11px 14px', fontSize: 14,
  fontFamily: 'Special Elite, serif', outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  fontSize: 10, color: 'rgba(255,78,0,0.7)', letterSpacing: '0.08em',
  display: 'block', marginBottom: 8,
};

const outlineBtn = {
  background: 'transparent', border: '1.5px solid rgba(192,192,192,0.25)',
  borderRadius: 8, color: 'rgba(192,192,192,0.5)', fontSize: 11,
  letterSpacing: '0.06em', cursor: 'pointer',
};

// ── Main PostcardBuilder ──────────────────────────────────────────────────────

export default function PostcardBuilder({ onClose, onSaved, loggedBooks = [] }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [bookData, setBookData] = useState(null);
  const [stateData, setStateData] = useState(null);
  const [messageData, setMessageData] = useState(null);
  const [saving, setSaving] = useState(false);

  const postcardData = bookData && stateData && messageData ? {
    bookTitle: bookData.title,
    bookAuthor: bookData.author,
    bookCover: bookData.coverURL || null,
    state: stateData.state,
    stateCode: stateData.stateCode,
    city: stateData.city || '',
    message: messageData.message,
    vibeTags: messageData.vibeTags,
    hashtags: messageData.hashtags,
    authorName: messageData.authorName || 'A Literary Traveler',
  } : null;

  const handleSave = async () => {
    if (!user || !postcardData) return;
    setSaving(true);
    try {
      const docRef = await addDoc(
        collection(db, 'users', user.uid, 'postcards'),
        { ...postcardData, createdAt: serverTimestamp() }
      );
      onSaved({ id: docRef.id, ...postcardData, createdAt: new Date().toISOString() });
    } catch (err) {
      console.error('[PostcardBuilder] save:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(4,5,15,0.96)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: '20px 16px 60px',
    }}>
      <style>{`@keyframes pb-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{
        width: '100%', maxWidth: 520,
        background: '#0D0E1A', borderRadius: 16,
        border: '1.5px solid rgba(255,78,0,0.3)',
        boxShadow: '0 0 40px rgba(255,78,0,0.12), 0 16px 48px rgba(0,0,0,0.7)',
        padding: '24px 20px', minHeight: 520,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Global header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
          paddingBottom: 16, borderBottom: '1px solid rgba(255,78,0,0.15)' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <BackArrowIcon size={20} />
          </button>
          <span className="font-bungee" style={{ flex: 1, textAlign: 'center', fontSize: 13,
            color: '#FF4E00', letterSpacing: '0.06em',
            textShadow: '0 0 12px rgba(255,78,0,0.5)' }}>
            CREATE BOOK POSTCARD
          </span>
          {/* Step indicator dots */}
          <div style={{ display: 'flex', gap: 5 }}>
            {[1,2,3,4].map(n => (
              <div key={n} style={{ width: 8, height: 8, borderRadius: '50%',
                background: n <= step ? '#FF4E00' : 'rgba(255,78,0,0.2)',
                boxShadow: n === step ? '0 0 6px rgba(255,78,0,0.7)' : 'none',
                transition: 'all 0.2s' }} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <Step1 loggedBooks={loggedBooks} onClose={onClose}
            onNext={book => { setBookData(book); setStep(2); }} />
        )}
        {step === 2 && (
          <Step2 book={bookData} onClose={onClose}
            onBack={() => setStep(1)}
            onNext={sd => { setStateData(sd); setStep(3); }} />
        )}
        {step === 3 && (
          <Step3 book={bookData} stateData={stateData} onClose={onClose}
            onBack={() => setStep(2)}
            onNext={md => { setMessageData(md); setStep(4); }} />
        )}
        {step === 4 && postcardData && (
          <Step4 data={postcardData} onClose={onClose}
            onBack={() => setStep(3)}
            onSave={handleSave} saving={saving} />
        )}
      </div>
    </div>
  );
}
