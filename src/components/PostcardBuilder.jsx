import { useState, useRef, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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

  // ── Book cover — standard proportions ───────────────────────────────────────
  const coverX = 18, coverY = 26, coverW = 135, coverH = 200;
  if (data.bookCover) {
    const img = await loadImageEl(data.bookCover);
    if (img) {
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

  // ── Stamp — top right corner ─────────────────────────────────────────────────
  drawStamp(ctx, W - 62, 58, 94, data.stateCode, data.state);

  // ── TOP zone: title / author only (no state) ─────────────────────────────────
  const rx = coverX + coverW + 10;  // right column x
  const stampClearRight = W - 106;  // leave room for stamp
  const topMaxW = stampClearRight - rx;

  ctx.fillStyle = '#2c1810';
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px Georgia, serif';
  const titleBottom = wrapText(ctx, data.bookTitle || '', rx, 46, topMaxW, 27);

  ctx.font = 'italic 16px Georgia, serif';
  ctx.fillStyle = '#8B4513';
  const authorY = Math.max(titleBottom + 2, 90);
  ctx.fillText('by ' + (data.bookAuthor || ''), rx, authorY);

  // ── Divider 1 ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(139,69,19,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rx, 128); ctx.lineTo(W - 14, 128); ctx.stroke();

  // ── MIDDLE zone: message + signature ─────────────────────────────────────────
  if (data.message) {
    ctx.font = 'italic 13px Georgia, serif';
    ctx.fillStyle = '#2c1810';
    const msgBottom = wrapText(ctx, '\u201C' + data.message + '\u201D', rx, 146, W - rx - 14, 20);

    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillStyle = '#2c1810';
    ctx.fillText('\u2014 ' + (data.authorName || 'A Literary Traveler'), rx, Math.min(msgBottom + 4, H - 68));
  }

  // ── Divider 2 ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(139,69,19,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rx, H - 58); ctx.lineTo(W - 14, H - 58); ctx.stroke();

  // ── BOTTOM zone: vibe tags + hashtags ────────────────────────────────────────
  const bottomRightW = W - rx - 14;
  if (data.vibeTags?.length) {
    ctx.font = 'bold 10px Georgia, serif';
    ctx.fillStyle = '#8B4513';
    ctx.textAlign = 'left';
    const tagText = data.vibeTags.map(t => t.toUpperCase()).join('  ·  ');
    wrapText(ctx, tagText, rx, H - 44, bottomRightW, 14);
  }
  if (data.hashtags?.length) {
    ctx.font = '9px Georgia, serif';
    ctx.fillStyle = 'rgba(139,69,19,0.65)';
    ctx.textAlign = 'left';
    wrapText(ctx, data.hashtags.join(' '), rx, H - 28, bottomRightW, 12);
  }

  // ── Branding ─────────────────────────────────────────────────────────────────
  ctx.font = 'italic 9px Georgia, serif';
  ctx.fillStyle = 'rgba(139,69,19,0.4)';
  ctx.textAlign = 'right';
  ctx.fillText('Literary Roads', W - 14, H - 10);

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

      {/* Book cover — standard proportions left side */}
      <div style={{
        position: 'absolute', left: fs(18), top: fs(26),
        width: fs(135), height: fs(200),
        border: `${fs(2)}px solid #8B4513`,
        boxShadow: `${fs(3)}px ${fs(3)}px ${fs(10)}px rgba(0,0,0,0.3)`,
        background: '#2c1810', overflow: 'hidden',
      }}>
        {data.bookCover
          ? <img src={data.bookCover} alt={data.bookTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: fs(32) }}>?</div>
        }
      </div>

      {/* Stamp — top right corner */}
      {data.stateCode && (
        <div style={{ position: 'absolute', top: fs(14), right: fs(14) }}>
          <StampPreview stateCode={data.stateCode} stateName={data.state} size={fs(84)} />
        </div>
      )}

      {/* TOP zone: title / author only (no state — it's on the stamp) */}
      <div style={{ position: 'absolute', left: fs(163), top: fs(22), right: fs(108), overflow: 'hidden' }}>
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: fs(22), color: '#2c1810', lineHeight: 1.25,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {data.bookTitle}
        </p>
        <p style={{ margin: `${fs(5)}px 0 0`, fontStyle: 'italic', fontSize: fs(16), color: '#8B4513' }}>
          by {data.bookAuthor}
        </p>
      </div>

      {/* Divider 1 */}
      <div style={{ position: 'absolute', left: fs(163), right: fs(14), top: fs(130),
        height: fs(1), background: 'rgba(139,69,19,0.25)' }} />

      {/* MIDDLE zone: message + signature */}
      <div style={{ position: 'absolute', left: fs(163), top: fs(138), right: fs(14), bottom: fs(66) }}>
        {data.message ? (
          <>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: fs(13), color: '#2c1810', lineHeight: 1.7,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
              &ldquo;{data.message}&rdquo;
            </p>
            <p style={{ margin: `${fs(7)}px 0 0`, fontSize: fs(12), color: '#2c1810', fontWeight: 'bold' }}>
              &mdash; {data.authorName || 'A Literary Traveler'}
            </p>
          </>
        ) : null}
      </div>

      {/* Divider 2 */}
      <div style={{ position: 'absolute', left: fs(163), right: fs(14), bottom: fs(56),
        height: fs(1), background: 'rgba(139,69,19,0.2)' }} />

      {/* BOTTOM zone: vibe tags + hashtags */}
      <div style={{ position: 'absolute', left: fs(163), right: fs(14), bottom: fs(16) }}>
        {data.vibeTags?.length > 0 && (
          <p style={{ margin: 0, fontSize: fs(10), color: '#8B4513', fontWeight: 'bold',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.vibeTags.map(t => t.toUpperCase()).join('  ·  ')}
          </p>
        )}
        {data.hashtags?.length > 0 && (
          <p style={{ margin: `${fs(3)}px 0 0`, fontSize: fs(9), color: 'rgba(139,69,19,0.65)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.hashtags.join(' ')}
          </p>
        )}
      </div>

      {/* Branding */}
      <p style={{ position: 'absolute', bottom: fs(4), right: fs(10), margin: 0,
        fontStyle: 'italic', fontSize: fs(8), color: 'rgba(139,69,19,0.35)' }}>
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
        background: selected?.id === book.id ? 'rgba(255,107,122,0.07)' : PB.white,
        borderTop: i > 0 ? `1px solid ${PB.divider}` : 'none',
        border: 'none', transition: 'background 0.15s',
        outline: selected?.id === book.id ? `1.5px solid rgba(255,107,122,0.4)` : 'none',
      }}
      onMouseEnter={e => { if (selected?.id !== book.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
      onMouseLeave={e => { if (selected?.id !== book.id) e.currentTarget.style.background = PB.white; }}
    >
      <div style={{ width: 40, height: 56, flexShrink: 0, borderRadius: 3, overflow: 'hidden', background: '#e8e4dc', border: `1px solid ${PB.divider}` }}>
        {book.coverURL
          ? <img src={book.coverURL} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: PB.muted }}>?</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-bungee" style={{ fontSize: 11, color: PB.dark, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>{book.title}</p>
        <p className="font-special-elite" style={{ fontSize: 11, color: PB.muted, margin: '2px 0 0' }}>{book.author}</p>
      </div>
    </button>
  );

  const logItem = (entry, i) => {
    const book = { id: entry.googleBooksId, title: entry.bookTitle, author: entry.bookAuthor, coverURL: entry.bookCover };
    return (
      <button key={entry.id} type="button" onClick={() => pickBook(book)}
        style={{
          flexShrink: 0, width: 76, background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          borderRadius: 6, outline: selected?.id === book.id ? `2px solid ${PB.coral}` : '2px solid transparent',
          transition: 'outline 0.15s',
        }}>
        <div style={{ width: 68, height: 96, borderRadius: 4, overflow: 'hidden', background: '#e8e4dc', border: `1.5px solid ${PB.divider}` }}>
          {book.coverURL
            ? <img src={book.coverURL} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: PB.muted }}>?</div>
          }
        </div>
        <p className="font-special-elite" style={{ fontSize: 9, color: PB.mid, textAlign: 'center', marginTop: 4, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {book.title}
        </p>
      </button>
    );
  };

  return (
    <div style={stepWrap}>
      <StepHeader step={1} title="SELECT BOOK" onClose={onClose} />

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${PB.divider}`, marginBottom: 16 }}>
        {[['search', 'Search Books'], ['log', 'From My Log']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className="font-bungee"
            style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 11,
              background: 'transparent', letterSpacing: '0.06em',
              color: tab === key ? PB.coral : PB.muted,
              borderBottom: tab === key ? `2px solid ${PB.coral}` : '2px solid transparent',
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
              onFocus={e => e.currentTarget.style.borderColor = PB.coral}
              onBlur={e => e.currentTarget.style.borderColor = PB.inputBdr}
            />
            {searching && <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, border: `2px solid ${PB.coral}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'pb-spin 0.7s linear infinite' }} />}
          </div>
          {results.length > 0 && (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${PB.divider}`, maxHeight: 260, overflowY: 'auto' }}>
              {results.map((b, i) => searchResultItem(b, i))}
            </div>
          )}
          {!searching && query.length > 1 && results.length === 0 && (
            <p className="font-special-elite" style={{ textAlign: 'center', color: PB.muted, fontSize: 13, fontStyle: 'italic', padding: '12px 0' }}>No results found</p>
          )}
        </>
      )}

      {tab === 'log' && (
        loggedBooks.length === 0
          ? <p className="font-special-elite" style={{ textAlign: 'center', color: PB.muted, fontSize: 13, fontStyle: 'italic', padding: '20px 0' }}>No books in your log yet. Use the Search tab above.</p>
          : <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
              {loggedBooks.map((e, i) => logItem(e, i))}
            </div>
      )}

      {selected && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: 'rgba(255,107,122,0.06)', border: `1px solid rgba(255,107,122,0.25)`, display: 'flex', gap: 12, alignItems: 'center' }}>
          {selected.coverURL && (
            <img src={selected.coverURL} alt={selected.title} style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 3, border: `1px solid rgba(255,107,122,0.25)` }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="font-bungee" style={{ fontSize: 11, color: PB.coral, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>{selected.title}</p>
            <p className="font-special-elite" style={{ fontSize: 11, color: PB.muted, margin: '2px 0 0' }}>by {selected.author}</p>
          </div>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: PB.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      <StepFooter onBack={null} onNext={() => selected && onNext(selected)} nextDisabled={!selected} onClose={onClose} />
    </div>
  );
}

function Step2({ book, onNext, onBack, onClose }) {
  const { user } = useAuth();
  const [stateCode, setStateCode] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [message, setMessage] = useState('');
  const [authorName, setAuthorName] = useState(user?.displayName || '');
  const [vibeTags, setVibeTags] = useState([]);
  const [hashtags, setHashtags] = useState(() => {
    const slug = (book.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    return ['#literaryroads', slug ? `#${slug}` : ''].filter(Boolean).join(' ');
  });

  const selectedState = STATES.find(s => s.code === stateCode);

  // Refresh hashtags when state changes
  const handleStateChange = (code) => {
    setStateCode(code);
    const slug = (book.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    const tags = ['#literaryroads'];
    if (code) tags.push(`#read${code.toLowerCase()}`);
    if (slug) tags.push(`#${slug}`);
    setHashtags(tags.join(' '));
  };

  const handleGPS = () => {
    if (!navigator.geolocation) { setGpsError('Geolocation not available.'); return; }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lng } = pos.coords;
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=5&addressdetails=1`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'literary-roads-app/1.0' } });
        const json = await resp.json();
        const stateNameRaw = json.address?.state || '';
        const match = STATES.find(s => s.name.toLowerCase() === stateNameRaw.toLowerCase());
        if (match) handleStateChange(match.code);
        else setGpsError('Could not identify state. Please select manually.');
      } catch {
        setGpsError('Location lookup failed.');
      } finally {
        setGpsLoading(false);
      }
    }, () => { setGpsError('Location access denied.'); setGpsLoading(false); });
  };

  const toggleVibeTag = (tag) =>
    setVibeTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const remaining = MSG_LIMIT - message.length;
  const canNext = stateCode && message.trim();

  return (
    <div style={stepWrap}>
      <StepHeader step={2} title="STATE & MESSAGE" onClose={onClose} />
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>

        {/* State */}
        <label className="font-bungee" style={labelStyle}>WHERE DID YOU START READING?</label>
        <select value={stateCode} onChange={e => handleStateChange(e.target.value)} className="font-special-elite"
          style={{ ...inputStyle, cursor: 'pointer', marginBottom: 8, color: stateCode ? PB.dark : PB.muted }}>
          <option value="">Select a state...</option>
          {STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <button onClick={handleGPS} disabled={gpsLoading} className="font-bungee"
          style={{ ...outlineBtn, marginBottom: gpsError ? 6 : 14, opacity: gpsLoading ? 0.6 : 1, padding: '8px 0', width: '100%' }}>
          {gpsLoading ? 'DETECTING...' : 'USE MY CURRENT LOCATION'}
        </button>
        {gpsError && <p className="font-special-elite" style={{ color: '#c0392b', fontSize: 12, marginBottom: 10 }}>{gpsError}</p>}

        {stateCode && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <StampPreview stateCode={stateCode} stateName={selectedState?.name || stateCode} size={80} />
          </div>
        )}

        {/* Message */}
        <label className="font-bungee" style={labelStyle}>YOUR MESSAGE</label>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, MSG_LIMIT))}
            placeholder="What does this book mean to you?"
            rows={4}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6, paddingBottom: 28 }}
            onFocus={e => e.currentTarget.style.borderColor = PB.coral}
            onBlur={e => e.currentTarget.style.borderColor = PB.inputBdr}
          />
          <span className="font-bungee" style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 10,
            color: remaining < 40 ? PB.coral : PB.muted, letterSpacing: '0.04em' }}>
            {remaining}
          </span>
        </div>

        {/* Inspiration */}
        <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: `rgba(56,197,197,0.05)`, border: `1px solid ${PB.divider}` }}>
          <p className="font-bungee" style={{ fontSize: 9, color: PB.turq, letterSpacing: '0.08em', margin: '0 0 6px' }}>INSPIRATION</p>
          {PROMPTS.map((p, i) => (
            <p key={i} className="font-special-elite" style={{ margin: i > 0 ? '3px 0 0' : 0, fontSize: 10, color: PB.mid, fontStyle: 'italic' }}>{p}</p>
          ))}
        </div>

        {/* Vibe tags */}
        <label className="font-bungee" style={labelStyle}>VIBE TAGS</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
          {VIBE_TAGS.map(tag => (
            <button key={tag} type="button" onClick={() => toggleVibeTag(tag)} className="font-bungee"
              style={{
                padding: '3px 9px', borderRadius: 20, fontSize: 9, letterSpacing: '0.06em',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: vibeTags.includes(tag) ? PB.coral : 'rgba(56,197,197,0.08)',
                color: vibeTags.includes(tag) ? PB.white : PB.mid,
                boxShadow: vibeTags.includes(tag) ? '0 2px 8px rgba(255,107,122,0.3)' : 'none',
              }}>
              {tag.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Signature */}
        <label className="font-bungee" style={labelStyle}>SIGN YOUR POSTCARD</label>
        <input value={authorName} onChange={e => setAuthorName(e.target.value)}
          placeholder="Your name or pen name"
          style={{ ...inputStyle, marginBottom: 14 }}
          onFocus={e => e.currentTarget.style.borderColor = PB.coral}
          onBlur={e => e.currentTarget.style.borderColor = PB.inputBdr}
        />

        {/* Hashtags */}
        <label className="font-bungee" style={labelStyle}>HASHTAGS</label>
        <input value={hashtags} onChange={e => setHashtags(e.target.value)}
          placeholder="#literaryroads #bookstagram"
          style={{ ...inputStyle, marginBottom: 4 }}
          onFocus={e => e.currentTarget.style.borderColor = PB.coral}
          onBlur={e => e.currentTarget.style.borderColor = PB.inputBdr}
        />
        <p className="font-special-elite" style={{ fontSize: 10, color: PB.muted, margin: '0 0 16px', fontStyle: 'italic' }}>
          Suggested: #read{(stateCode || 'state').toLowerCase()} #literaryroads #bookstagram
        </p>
      </div>

      <StepFooter onBack={onBack}
        onNext={() => canNext && onNext({
          stateCode,
          state: selectedState?.name || stateCode,
          message,
          vibeTags,
          hashtags: hashtags.trim().split(/\s+/).filter(h => h.startsWith('#')),
          authorName: authorName.trim() || 'A Literary Traveler',
        })}
        nextDisabled={!canNext} onClose={onClose} />
    </div>
  );
}

function Step3({ data, onBack, saving, saved, onClose }) {
  const [downloading, setDownloading] = useState(false);

  const caption = [data.message, ...(data.hashtags || [])].join(' ');

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = await downloadPostcardImage(data);
      const link = document.createElement('a');
      link.download = `literary-roads-postcard.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleNativeShare = async () => {
    try {
      const canvas = await downloadPostcardImage(data);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], 'literary-roads-postcard.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: data.bookTitle, text: caption });
      } else {
        await handleDownload();
      }
    } catch (err) {
      if (err.name !== 'AbortError') await handleDownload();
    }
  };

  const handleFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(caption)}`,
      '_blank', 'noopener,width=600,height=400'
    );
  };

  const handleInstagram = async () => {
    try {
      await navigator.clipboard.writeText(caption);
    } catch { /* clipboard unavailable */ }
    await handleNativeShare();
  };

  const handleTikTok = async () => {
    try {
      await navigator.clipboard.writeText(caption);
    } catch { /* clipboard unavailable */ }
    await handleNativeShare();
  };

  const shareBtn = (label, color, onClick, icon) => (
    <button onClick={onClick} className="font-bungee"
      style={{
        flex: 1, padding: '10px 4px', borderRadius: 8, fontSize: 10, letterSpacing: '0.04em',
        border: `1.5px solid ${color}55`, background: `${color}0f`, color,
        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
      {icon}
      {label}
    </button>
  );

  return (
    <div style={stepWrap}>
      <StepHeader step={3} title="PREVIEW & SHARE" onClose={onClose} />

      {/* Preview */}
      <div style={{ width: '100%', overflowX: 'auto', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        <div style={{ transform: 'scale(0.5)', transformOrigin: 'top center', height: 200, pointerEvents: 'none' }}>
          <PostcardFront data={data} scale={1} />
        </div>
      </div>

      {/* Save status */}
      <div style={{ textAlign: 'center', padding: '10px 0', marginBottom: 12,
        borderRadius: 8,
        background: saved ? 'rgba(56,197,197,0.08)' : 'rgba(255,107,122,0.05)',
        border: saved ? `1px solid rgba(56,197,197,0.25)` : `1px solid rgba(255,107,122,0.15)` }}>
        <p className="font-bungee" style={{
          color: saved ? PB.turq : PB.muted, fontSize: 12, letterSpacing: '0.06em', margin: 0 }}>
          {saving ? 'SAVING TO LIBRARY...' : saved ? 'SAVED TO YOUR LIBRARY ✓' : 'PREPARING YOUR POSTCARD'}
        </p>
      </div>

      {/* Download */}
      <button onClick={handleDownload} disabled={downloading} className="font-bungee"
        style={{ width: '100%', padding: '10px 0', marginBottom: 14,
          background: 'transparent', border: `1.5px solid ${PB.divider}`,
          borderRadius: 8, color: PB.mid, fontSize: 11, letterSpacing: '0.06em',
          cursor: downloading ? 'default' : 'pointer', opacity: downloading ? 0.5 : 1 }}>
        {downloading ? 'GENERATING...' : 'DOWNLOAD IMAGE'}
      </button>

      {/* Share row */}
      <p className="font-bungee" style={{ fontSize: 9, color: PB.muted, letterSpacing: '0.1em', marginBottom: 8 }}>SHARE</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {shareBtn('INSTAGRAM', '#E1306C', handleInstagram,
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        )}
        {shareBtn('FACEBOOK', '#1877F2', handleFacebook,
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        )}
        {shareBtn('TIKTOK', '#69C9D0', handleTikTok,
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.86 4.86 0 01-1.01-.07z"/></svg>
        )}
      </div>

      {saved ? (
        <button onClick={onClose} className="font-bungee"
          style={{ width: '100%', padding: '10px 0', fontSize: 11,
            background: PB.turq, color: PB.white, borderRadius: 8, border: 'none', cursor: 'pointer',
            letterSpacing: '0.08em', boxShadow: '0 2px 12px rgba(56,197,197,0.3)' }}>
          DONE — VIEW MY SHELF
        </button>
      ) : (
        <button onClick={onBack} className="font-bungee"
          style={{ ...outlineBtn, width: '100%', padding: '10px 0', fontSize: 11 }}>
          BACK
        </button>
      )}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function StepHeader({ step, title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <span className="font-bungee" style={{ fontSize: 10, color: 'rgba(255,107,122,0.55)', letterSpacing: '0.1em' }}>
        STEP {step} OF 3
      </span>
      <h2 className="font-bungee" style={{ margin: 0, fontSize: 14, color: PB.coral, letterSpacing: '0.06em' }}>
        {title}
      </h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
        color: PB.muted, fontSize: 20, lineHeight: 1, padding: 2 }}>×</button>
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
        style={{ flex: 1, padding: 12,
          background: nextDisabled ? 'rgba(255,107,122,0.25)' : PB.coral,
          color: PB.white, borderRadius: 8, border: 'none', fontSize: 12, letterSpacing: '0.08em',
          cursor: nextDisabled ? 'default' : 'pointer',
          boxShadow: nextDisabled ? 'none' : '0 2px 12px rgba(255,107,122,0.35)' }}>
        NEXT
      </button>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

// ── Library palette (matches Library.jsx) ────────────────────────────────────
const PB = {
  bg:       '#FFF8E7',
  coral:    '#FF6B7A',
  turq:     '#38C5C5',
  gold:     '#F5A623',
  dark:     '#2D2D2D',
  mid:      '#555555',
  muted:    '#999999',
  white:    '#FFFFFF',
  card:     '#FAFAFA',
  inputBdr: 'rgba(56,197,197,0.45)',
  divider:  'rgba(56,197,197,0.18)',
};

const stepWrap = {
  display: 'flex', flexDirection: 'column', height: '100%',
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: PB.white, border: `1.5px solid ${PB.inputBdr}`,
  borderRadius: 10, color: PB.dark,
  padding: '11px 14px', fontSize: 14,
  fontFamily: 'Special Elite, serif', outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  fontSize: 10, color: 'rgba(255,107,122,0.85)', letterSpacing: '0.08em',
  display: 'block', marginBottom: 8,
};

const outlineBtn = {
  background: 'transparent', border: '1.5px solid rgba(0,0,0,0.18)',
  borderRadius: 8, color: PB.mid, fontSize: 11,
  letterSpacing: '0.06em', cursor: 'pointer',
};

// ── Main PostcardBuilder ──────────────────────────────────────────────────────

export default function PostcardBuilder({ onClose, onSaved, loggedBooks = [] }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [bookData, setBookData] = useState(null);
  const [stepData, setStepData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const postcardData = bookData && stepData ? {
    bookTitle: bookData.title,
    bookAuthor: bookData.author,
    bookCover: bookData.coverURL || null,
    state: stepData.state,
    stateCode: stepData.stateCode,
    message: stepData.message,
    vibeTags: stepData.vibeTags,
    hashtags: stepData.hashtags,
    authorName: stepData.authorName || 'A Literary Traveler',
  } : null;

  // Save the book entry once all data is ready and step 3 is showing
  useEffect(() => {
    if (step !== 3 || !user || !bookData || !stepData || saving || saved) return;
    const bookId = (bookData.id || bookData.googleBooksId || '')
      .replace(/\//g, '_') ||
      bookData.title.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
    const entry = {
      bookId,
      title:     bookData.title,
      author:    bookData.author,
      coverUrl:  bookData.coverURL || null,
      state:     stepData.state,
      stateCode: stepData.stateCode,
      createdAt: serverTimestamp(),
    };
    setSaving(true);
    setDoc(doc(db, 'users', user.uid, 'libraryPostcards', bookId), entry)
      .then(() => setSaved(true))
      .catch(err => console.error('[PostcardBuilder] save book:', err))
      .finally(() => setSaving(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(255,248,231,0.97)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: '20px 16px 60px',
    }}>
      <style>{`@keyframes pb-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{
        width: '100%', maxWidth: 520,
        background: PB.white, borderRadius: 16,
        border: `1.5px solid rgba(255,107,122,0.3)`,
        boxShadow: '0 0 32px rgba(255,107,122,0.1), 0 12px 40px rgba(0,0,0,0.1)',
        padding: '24px 20px', minHeight: 520,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Global header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
          paddingBottom: 16, borderBottom: `1px solid rgba(255,107,122,0.15)` }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <BackArrowIcon size={20} />
          </button>
          <span className="font-bungee" style={{ flex: 1, textAlign: 'center', fontSize: 13,
            color: PB.coral, letterSpacing: '0.06em' }}>
            CREATE BOOK POSTCARD
          </span>
          {/* Step indicator dots */}
          <div style={{ display: 'flex', gap: 5 }}>
            {[1,2,3].map(n => (
              <div key={n} style={{ width: 8, height: 8, borderRadius: '50%',
                background: n <= step ? PB.coral : 'rgba(255,107,122,0.18)',
                boxShadow: n === step ? `0 0 6px rgba(255,107,122,0.5)` : 'none',
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
            onNext={sd => { setStepData(sd); setStep(3); }} />
        )}
        {step === 3 && postcardData && (
          <Step3 data={postcardData} onClose={onClose}
            onBack={() => setStep(2)}
            saving={saving} saved={saved} />
        )}
      </div>
    </div>
  );
}
