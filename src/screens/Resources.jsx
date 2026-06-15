import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  doc, updateDoc, setDoc, onSnapshot,
  collection, getDocs, serverTimestamp, getDoc,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { LibraryIcon } from '../components/Icons';
import { fetchPublishedGuides } from '../utils/bookstoreGuides';
import { subscribeToActiveSalon } from '../utils/salon';
import { getRandomFortune } from '../data/literaryFortunes.js';

const BASE     = import.meta.env.BASE_URL;
const HS_KEY   = 'highwaySnacks.open.v1';
const MAX_FAV  = 5;

// ── Design tokens ─────────────────────────────────────────────────────────────
const HS = {
  navy:     '#10162B',
  navy2:    '#0A0F20',
  navy3:    '#1A2342',
  navyLine: '#2A335A',
  cream:    '#FBF3DF',
  cream2:   '#E7D9B6',
  muted:    '#8C93B5',
  cyan:     '#39E0D6',
  pink:     '#F23D8E',
  flamingo: '#F58FB4',
  orange:   '#F5812A',
  mustard:  '#F4C740',
  red:      '#E1453B',
  green:    '#2FB6A8',
  ink:      '#11141F',
};

const GLOW = {
  cyan:    '0 0 10px rgba(57,224,214,.7), 0 0 26px rgba(57,224,214,.45)',
  pink:    '0 0 10px rgba(242,61,142,.75), 0 0 28px rgba(242,61,142,.5)',
  orange:  '0 0 10px rgba(245,129,42,.7), 0 0 24px rgba(245,129,42,.45)',
  mustard: '0 0 10px rgba(244,199,64,.6), 0 0 22px rgba(244,199,64,.4)',
};

const GUIDE_PALETTES = [
  { bg: '#7A4A2B', bg2: '#9A6437', accent: HS.mustard, motif: 'cup'   },
  { bg: '#13564F', bg2: '#1C766C', accent: HS.cyan,    motif: 'route' },
  { bg: '#5E2E50', bg2: '#7D3C69', accent: HS.flamingo, motif: 'star' },
  { bg: '#1A3A5E', bg2: '#254E7A', accent: HS.pink,    motif: 'star'  },
  { bg: '#2E4B1A', bg2: '#3E6424', accent: HS.green,   motif: 'cup'   },
];

// ── Book fetch (fortune booth reveal) ─────────────────────────────────────────
const GENRES = [
  'Fiction','Mystery & Thriller','Romance','Science Fiction','Fantasy',
  'Historical Fiction','Literary Fiction','Memoir & Biography','Poetry',
  'Young Adult','Horror','Classics',
];
const BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';

async function fetchSurpriseFromOL(genre, usedIds) {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=subject:"${encodeURIComponent(genre)}"&limit=40&fields=key,title,author_name,cover_i`
  );
  if (!res.ok) throw new Error('ol fail');
  const data = await res.json();
  const docs = (data.docs || []).filter(d => d.cover_i && !usedIds.has(`ol_${d.key}`));
  if (!docs.length) throw new Error('no ol results');
  const p = docs[Math.floor(Math.random() * docs.length)];
  return {
    id: `ol_${p.key}`,
    title:    p.title            || 'Unknown',
    author:   p.author_name?.[0] || 'Unknown',
    coverURL: `https://covers.openlibrary.org/b/id/${p.cover_i}-M.jpg`,
    genre,
  };
}

async function fetchSurpriseBook(genre, usedIds) {
  for (let a = 0; a < 3; a++) {
    try {
      const si  = Math.floor(Math.random() * 20) * 10;
      const key = BOOKS_API_KEY ? `&key=${BOOKS_API_KEY}` : '';
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(genre)}&startIndex=${si}&maxResults=40&printType=books&langRestrict=en${key}`
      );
      if (res.status === 429) break;
      if (!res.ok) throw new Error('fail');
      const data  = await res.json();
      const items = (data.items || []).filter(i =>
        i.volumeInfo?.imageLinks?.thumbnail && !usedIds.has(`g_${i.id}`)
      );
      if (!items.length) continue;
      const item = items[Math.floor(Math.random() * items.length)];
      const v    = item.volumeInfo;
      return {
        id:       `g_${item.id}`,
        title:    v.title           || 'Unknown',
        author:   v.authors?.[0]    || 'Unknown',
        coverURL: v.imageLinks.thumbnail.replace('http:', 'https:'),
        genre,
      };
    } catch {}
  }
  return fetchSurpriseFromOL(genre, usedIds);
}

// ── Atomic SVGs ───────────────────────────────────────────────────────────────
function Burst({ size = 200, rays = 16, color = HS.cyan, stroke, dot = true,
                 opacity = 1, className = '', style = {} }) {
  const cx = 50, cy = 50;
  const tris = [];
  for (let i = 0; i < rays; i++) {
    const a   = (i / rays) * Math.PI * 2 - Math.PI / 2;
    const len = i % 2 === 0 ? 48 : 30;
    const w   = i % 2 === 0 ? 0.10 : 0.055;
    const tipX = cx + Math.cos(a) * len;
    const tipY = cy + Math.sin(a) * len;
    const bx1  = cx + Math.cos(a - w) * 7;
    const by1  = cy + Math.sin(a - w) * 7;
    const bx2  = cx + Math.cos(a + w) * 7;
    const by2  = cy + Math.sin(a + w) * 7;
    tris.push(`M${bx1.toFixed(2)} ${by1.toFixed(2)} L${tipX.toFixed(2)} ${tipY.toFixed(2)} L${bx2.toFixed(2)} ${by2.toFixed(2)} Z`);
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true"
      style={{ width: size, height: size, opacity, overflow: 'visible', ...style }}>
      <path d={tris.join(' ')} fill={stroke ? 'none' : color}
        stroke={stroke ? color : 'none'} strokeWidth={stroke ? 1 : 0} strokeLinejoin="round" />
      {dot && <circle cx={cx} cy={cy} r="7.5" fill={color} />}
    </svg>
  );
}

function Spark({ size = 18, color = HS.cream, opacity = 1, style = {} }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true"
      style={{ opacity, overflow: 'visible', ...style }}>
      <path d="M50 3 C55 38 62 45 97 50 C62 55 55 62 50 97 C45 62 38 55 3 50 C38 45 45 38 50 3 Z"
        fill={color} />
    </svg>
  );
}

function Diamond({ w = 34, h = 70, color = HS.red, inner, style = {} }) {
  return (
    <svg viewBox="0 0 100 200" width={w} height={h} aria-hidden="true"
      style={{ overflow: 'visible', ...style }}>
      <path d="M50 2 L96 100 L50 198 L4 100 Z" fill={color} />
      {inner && <path d="M50 30 L78 100 L50 170 L22 100 Z" fill="none" stroke={inner} strokeWidth="5" />}
    </svg>
  );
}

// ── Page ornaments ─────────────────────────────────────────────────────────────
function SunburstWatermark() {
  return (
    <div aria-hidden="true" style={{
      position: 'fixed', top: '8%', left: '50%', transform: 'translateX(-50%)',
      zIndex: 0, pointerEvents: 'none', width: 'min(140vw, 1100px)',
      display: 'grid', placeItems: 'center',
    }}>
      <Burst size="min(140vw, 1100px)" rays={20} color={HS.cyan} opacity={0.05}
        dot={false} className="hs-spin" />
      <Burst size="min(90vw, 720px)" rays={20} color={HS.pink} opacity={0.045}
        stroke dot={false} style={{ position: 'absolute' }} />
    </div>
  );
}

function AmbientDiamonds() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div className="hs-twinkle" style={{ position: 'absolute', top: '14%', left: '4%' }}>
        <Diamond w={26} h={54} color={HS.red} inner={HS.cyan} style={{ opacity: 0.5 }} />
      </div>
      <div className="hs-twinkle" style={{ position: 'absolute', top: '40%', right: '4%', animationDelay: '1.1s' }}>
        <Diamond w={20} h={42} color={HS.mustard} style={{ opacity: 0.45 }} />
      </div>
      <div className="hs-twinkle" style={{ position: 'absolute', bottom: '12%', left: '6%', animationDelay: '0.6s' }}>
        <Diamond w={16} h={34} color={HS.green} inner={HS.flamingo} style={{ opacity: 0.4 }} />
      </div>
      <div className="hs-twinkle" style={{ position: 'absolute', top: '64%', left: '50%', animationDelay: '1.6s' }}>
        <Spark size={20} color={HS.cream} opacity={0.3} />
      </div>
      <div className="hs-twinkle" style={{ position: 'absolute', top: '24%', right: '12%', animationDelay: '2.1s' }}>
        <Spark size={16} color={HS.cyan} opacity={0.4} />
      </div>
    </div>
  );
}

// ── NeonSign ──────────────────────────────────────────────────────────────────
function NeonSign() {
  return (
    <div className="hs-neon" style={{ textAlign: 'left', lineHeight: 0.92 }}>
      <div className="hs-neon-word">HIGHWAY</div>
      <div className="hs-neon-word hs-neon-word--snacks">SNACKS</div>
    </div>
  );
}

// ── SpeechBubble ──────────────────────────────────────────────────────────────
function SpeechBubble({ children, tailStyle = {}, style = {} }) {
  return (
    <div style={{
      position: 'relative', display: 'inline-block',
      background: HS.cream, color: HS.ink,
      fontFamily: 'var(--hs-sans)', fontSize: 12.5, fontWeight: 600,
      lineHeight: 1.25, letterSpacing: '0.01em',
      padding: '9px 13px', borderRadius: 13,
      border: `2px solid ${HS.ink}`,
      boxShadow: '3px 3px 0 rgba(0,0,0,0.35)',
      ...style,
    }}>
      {children}
      <span style={{
        position: 'absolute', bottom: -9, right: 20, width: 14, height: 14,
        background: HS.cream,
        borderRight: `2px solid ${HS.ink}`, borderBottom: `2px solid ${HS.ink}`,
        transform: 'rotate(45deg)',
        ...tailStyle,
      }} />
    </div>
  );
}

// ── Reveal (height → auto settle) ─────────────────────────────────────────────
function Reveal({ open, children }) {
  const ref = useRef(null);
  const [h, setH] = useState(open ? 'auto' : 0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (open) {
      setH(el.scrollHeight);
      const t = setTimeout(() => setH('auto'), 380);
      return () => clearTimeout(t);
    } else {
      setH(el.scrollHeight);
      requestAnimationFrame(() => requestAnimationFrame(() => setH(0)));
    }
  }, [open]);
  return (
    <div style={{ height: h === 'auto' ? 'auto' : h, overflow: 'hidden',
      transition: 'height 400ms cubic-bezier(.4,0,.2,1)' }}>
      <div ref={ref}>{children}</div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ index, label, sub, accent = HS.cyan, icon, open, onToggle, children }) {
  const bodyRef = useRef(null);
  const [h, setH] = useState(open ? 'auto' : 0);

  useEffect(() => {
    const el = bodyRef.current; if (!el) return;
    if (open) {
      setH(el.scrollHeight);
      const t = setTimeout(() => setH('auto'), 420);
      return () => clearTimeout(t);
    } else {
      setH(el.scrollHeight);
      requestAnimationFrame(() => requestAnimationFrame(() => setH(0)));
    }
  }, [open]);

  return (
    <section style={{
      borderRadius: 18, overflow: 'hidden', background: HS.navy3,
      border: `1.5px solid ${HS.navyLine}`,
      boxShadow: open
        ? `0 0 0 1.5px ${accent}44, 0 18px 40px rgba(0,0,0,0.45)`
        : '0 8px 22px rgba(0,0,0,0.35)',
      transition: 'box-shadow 300ms ease',
    }}>
      <button onClick={onToggle} className="hs-marquee" aria-expanded={open} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '17px 18px', cursor: 'pointer', textAlign: 'left',
        background: 'transparent', border: 'none', color: HS.cream,
        borderBottom: open ? `1.5px solid ${HS.navyLine}` : '1.5px solid transparent',
        transition: 'border-color 300ms ease',
      }}>
        <span style={{
          flexShrink: 0, width: 34, height: 34, borderRadius: 9,
          display: 'grid', placeItems: 'center',
          background: HS.navy2, border: `1.5px solid ${accent}`,
          color: accent, fontFamily: 'var(--hs-mono)', fontWeight: 700, fontSize: 13,
          boxShadow: `inset 0 0 8px ${accent}33`,
        }}>{String(index).padStart(2, '0')}</span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', fontFamily: 'var(--hs-nameplate)',
            fontSize: 20, letterSpacing: '0.04em', color: HS.cream,
            textShadow: `0 0 1px ${accent}`,
          }}>{label}</span>
          {sub && <span style={{
            display: 'block', fontFamily: 'var(--hs-mono)', fontSize: 10.5,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: HS.muted, marginTop: 3,
          }}>{sub}</span>}
        </span>

        {icon}

        <span aria-hidden="true" style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
          display: 'grid', placeItems: 'center',
          border: `1.5px solid ${open ? accent : HS.navyLine}`,
          color: open ? accent : HS.muted,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 320ms cubic-bezier(.5,1.4,.5,1), color 240ms, border-color 240ms',
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5 L6 8 L9.5 4.5" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      <div ref={bodyRef} style={{
        height: h === 'auto' ? 'auto' : h, overflow: 'hidden',
        transition: 'height 400ms cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ padding: '20px 18px 22px' }}>{children}</div>
      </div>
    </section>
  );
}

// ── StampButton ───────────────────────────────────────────────────────────────
function StampButton({ children, color = HS.pink, onClick, style = {}, dark }) {
  return (
    <button onClick={onClick} className="hs-stamp" style={{
      fontFamily: 'var(--hs-sans)', fontWeight: 700, fontSize: 13.5,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      color: dark ? HS.navy : HS.cream,
      background: color, border: `2px solid ${HS.ink}`,
      borderRadius: 999, padding: '11px 20px', cursor: 'pointer',
      boxShadow: `3px 3px 0 ${HS.ink}`,
      transition: 'transform 120ms ease, box-shadow 120ms ease',
      ...style,
    }}>{children}</button>
  );
}

// ── HeadChip ──────────────────────────────────────────────────────────────────
function HeadChip({ color, label }) {
  return (
    <span className="hs-headchip" style={{
      fontFamily: 'var(--hs-mono)', fontSize: 9.5, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color, padding: '5px 9px', borderRadius: 999,
      border: `1px solid ${color}55`, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

// ── Section 01: Fortune Booth ─────────────────────────────────────────────────
function PerforatedTicket({ fortune, book, n }) {
  return (
    <div className="hs-ticket" style={{
      position: 'relative', background: HS.cream, color: HS.ink,
      borderRadius: 12, padding: '18px 20px 20px',
      boxShadow: '0 14px 30px rgba(0,0,0,0.5)',
      border: `2px solid ${HS.ink}`,
    }}>
      <span style={{ position: 'absolute', top: '50%', left: -9, width: 16, height: 16, background: HS.navy3, borderRadius: '50%', transform: 'translateY(-50%)', border: `2px solid ${HS.ink}` }} />
      <span style={{ position: 'absolute', top: '50%', right: -9, width: 16, height: 16, background: HS.navy3, borderRadius: '50%', transform: 'translateY(-50%)', border: `2px solid ${HS.ink}` }} />

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `2px dashed ${HS.ink}33`, paddingBottom: 9, marginBottom: 12,
      }}>
        <span style={{ fontFamily: 'var(--hs-nameplate)', fontSize: 13, letterSpacing: '0.12em' }}>
          STARK'S FORTUNE
        </span>
        <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 10.5, letterSpacing: '0.14em', color: HS.orange, fontWeight: 700 }}>
          NO. {String(n).padStart(4, '0')}
        </span>
      </div>

      <p style={{ margin: '0 0 16px', fontFamily: 'var(--hs-serif)', fontStyle: 'italic', fontSize: 18, lineHeight: 1.4, color: HS.ink }}>
        &ldquo;{fortune}&rdquo;
      </p>

      {book && (
        <div style={{
          display: 'flex', gap: 12, alignItems: 'center',
          background: HS.navy, color: HS.cream, borderRadius: 9, padding: '11px 13px',
        }}>
          {book.coverURL ? (
            <img src={book.coverURL} alt={book.title} style={{
              flexShrink: 0, width: 36, height: 50, objectFit: 'cover',
              borderRadius: 3, border: `1.5px solid ${HS.cream}`,
              boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
            }} onError={e => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div style={{
              flexShrink: 0, width: 36, height: 50, borderRadius: 3,
              background: `linear-gradient(135deg, ${HS.orange}, ${HS.red})`,
              border: `1.5px solid ${HS.cream}`,
            }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--hs-mono)', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS.cyan, marginBottom: 3 }}>
              Your book reveal
            </div>
            <div style={{ fontFamily: 'var(--hs-serif)', fontSize: 16, fontWeight: 600, lineHeight: 1.15 }}>{book.title}</div>
            <div style={{ fontFamily: 'var(--hs-sans)', fontSize: 12, color: HS.cream2, marginTop: 1 }}>
              {book.author} &middot; <span style={{ fontStyle: 'italic', color: HS.muted }}>{book.genre}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FortuneBooth({ user }) {
  const [ticket,    setTicket]    = useState(null);
  const [n,         setN]         = useState(1284);
  const [pulling,   setPulling]   = useState(false);
  const [saveStatus, setSave]     = useState('idle'); // idle | saving | saved | dupe | error
  const genreDeckRef = useRef([]);
  const usedIdsRef   = useRef(new Set());

  const pickGenre = () => {
    if (!genreDeckRef.current.length)
      genreDeckRef.current = [...GENRES].sort(() => Math.random() - 0.5);
    return genreDeckRef.current.pop();
  };

  const pull = useCallback(async () => {
    if (pulling) return;
    setPulling(true);
    setSave('idle');
    try {
      const [fortuneObj, book] = await Promise.all([
        Promise.resolve(getRandomFortune()),
        fetchSurpriseBook(pickGenre(), usedIdsRef.current).catch(() => null),
      ]);
      if (book) usedIdsRef.current.add(book.id);
      // Small delay for the "reading the cards" feel
      await new Promise(r => setTimeout(r, 400));
      setTicket({ fortune: fortuneObj.fortune, book });
      setN(v => v + 1);
    } finally {
      setPulling(false);
    }
  }, [pulling]);

  const saveBook = async () => {
    if (!user || !ticket?.book || saveStatus === 'saving') return;
    setSave('saving');
    try {
      const docId = ticket.book.id.replace(/\//g, '_');
      const ref   = doc(db, 'users', user.uid, 'libraryReadNext', docId);
      const snap  = await getDoc(ref);
      if (snap.exists()) { setSave('dupe'); return; }
      await setDoc(ref, {
        title:         ticket.book.title,
        author:        ticket.book.author,
        coverUrl:      ticket.book.coverURL || '',
        googleBooksId: ticket.book.id,
        whoWhatWhere:  `Highway Snacks · ${ticket.book.genre}`,
        date:          serverTimestamp(),
      });
      setSave('saved');
    } catch { setSave('error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Stark */}
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', inset: '10% 14% auto', height: '65%',
            background: `radial-gradient(60% 60% at 50% 40%, ${HS.cyan}26, transparent 70%)`,
            filter: 'blur(8px)',
          }} />
          <img src={`${BASE}images/stark-dog.png`} alt="Stark, the fortune-telling Labrador"
            style={{ width: '100%', maxWidth: 260, position: 'relative', filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.5))' }} />
        </div>

        {/* Console */}
        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          <div style={{ fontFamily: 'var(--hs-mono)', fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: HS.mustard, marginBottom: 8 }}>
            Your path, your books
          </div>
          <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--hs-display)', fontSize: 30, lineHeight: 1, color: HS.cream }}>
            Stark knows.
          </h3>
          <p style={{ margin: '0 0 18px', fontFamily: 'var(--hs-serif)', fontSize: 15, lineHeight: 1.5, color: HS.cream2 }}>
            One press of the plunger and the booth deals you a literary fortune &mdash; with a book to match.{' '}
            <span style={{ color: HS.muted, fontStyle: 'italic' }}>Allegedly.</span>
          </p>

          <button onClick={pull} disabled={pulling} style={{
            position: 'relative', width: '100%', cursor: pulling ? 'default' : 'pointer',
            border: 'none', background: 'transparent', padding: 0,
          }}>
            <span style={{
              display: 'block', textAlign: 'center',
              fontFamily: 'var(--hs-sans)', fontWeight: 800, fontSize: 15,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: HS.cream,
              padding: '15px 18px', borderRadius: 999,
              background: `linear-gradient(${HS.red}, ${HS.orange})`,
              border: `2px solid ${HS.ink}`,
              boxShadow: pulling
                ? `inset 0 3px 10px rgba(0,0,0,0.5), 0 1px 0 ${HS.ink}`
                : `0 5px 0 ${HS.ink}, 0 12px 22px rgba(225,69,59,0.4)`,
              transform: pulling ? 'translateY(4px)' : 'translateY(0)',
              transition: 'transform 120ms ease, box-shadow 120ms ease',
            }}>
              {pulling ? 'Reading the cards…' : ticket ? 'Pull another fortune' : 'Press for your fortune'}
            </span>
          </button>
          <div style={{ textAlign: 'center', marginTop: 10, fontFamily: 'var(--hs-mono)', fontSize: 10, letterSpacing: '0.16em', color: HS.muted, textTransform: 'uppercase' }}>
            ◦ Start ▸ press ▸ receive ◦
          </div>
        </div>
      </div>

      <Reveal open={!!ticket}>
        <div style={{ paddingTop: 20 }}>
          <div style={{
            height: 8, borderRadius: 4, background: HS.navy2,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
            border: `1px solid ${HS.navyLine}`, marginBottom: 16,
          }} />
          {ticket && (
            <div key={n} className="hs-dispense">
              <PerforatedTicket fortune={ticket.fortune} book={ticket.book} n={n} />
            </div>
          )}
          {/* Actions below ticket */}
          {ticket && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              {user && ticket.book && (
                saveStatus === 'saved' ? (
                  <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 11, letterSpacing: '0.06em', color: HS.cyan }}>
                    ✓ Added to Read Next
                  </span>
                ) : saveStatus === 'dupe' ? (
                  <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 11, color: HS.muted }}>
                    Already on your list
                  </span>
                ) : (
                  <button onClick={saveBook} disabled={saveStatus === 'saving'} style={{
                    fontFamily: 'var(--hs-mono)', fontSize: 11, letterSpacing: '0.06em',
                    background: 'transparent', color: HS.cyan,
                    border: `1.5px solid ${HS.cyan}55`, borderRadius: 999,
                    padding: '8px 16px', cursor: 'pointer',
                  }}>
                    {saveStatus === 'saving' ? 'Saving…' : '+ Add to Read Next'}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}

// ── Section 02: Newsstand ─────────────────────────────────────────────────────
function GuideMotif({ kind, color }) {
  if (kind === 'cup') return (
    <svg viewBox="0 0 60 60" width="46" height="46" aria-hidden="true">
      <path d="M12 20 H44 V34 a14 14 0 0 1 -28 0 Z" fill="none" stroke={color} strokeWidth="3" />
      <path d="M44 23 h6 a6 6 0 0 1 0 12 h-4" fill="none" stroke={color} strokeWidth="3" />
      <path d="M22 8 q-3 4 0 8 M30 8 q-3 4 0 8 M38 8 q-3 4 0 8" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
  if (kind === 'route') return (
    <svg viewBox="0 0 60 60" width="46" height="46" aria-hidden="true">
      <path d="M14 50 Q14 34 30 32 Q46 30 46 12" fill="none" stroke={color} strokeWidth="3"
        strokeDasharray="2 6" strokeLinecap="round" />
      <circle cx="14" cy="50" r="4" fill={color} />
      <path d="M46 6 l5 9 h-10 Z" fill={color} />
    </svg>
  );
  return <Spark size={42} color={color} />;
}

function MagazineCover({ g, fanned = 0, onClick, active }) {
  return (
    <button onClick={onClick} className="hs-cover" aria-pressed={active} style={{
      position: 'relative', flexShrink: 0, width: 124, height: 176,
      borderRadius: '5px 5px 4px 4px', cursor: 'pointer', padding: 0, textAlign: 'left',
      background: g.coverImageUrl
        ? 'transparent'
        : `linear-gradient(160deg, ${g.bg2}, ${g.bg})`,
      border: `1.5px solid ${HS.ink}`, color: g.ink || HS.cream, overflow: 'hidden',
      transform: `rotate(${fanned}deg) translateY(${active ? -10 : 0}px)`,
      transformOrigin: 'bottom center',
      boxShadow: active
        ? `0 16px 30px rgba(0,0,0,0.55), 0 0 0 2px ${g.accent}`
        : '0 10px 20px rgba(0,0,0,0.45)',
      transition: 'transform 260ms cubic-bezier(.5,1.3,.5,1), box-shadow 260ms',
    }}>
      {/* wire clip */}
      <span style={{ position: 'absolute', top: -7, left: '50%', width: 30, height: 14,
        transform: 'translateX(-50%)', borderRadius: '0 0 14px 14px',
        border: `2px solid ${HS.muted}`, borderTop: 'none', background: 'rgba(0,0,0,0.2)' }} />

      {g.coverImageUrl ? (
        <>
          <img src={g.coverImageUrl} alt={g.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 10px 8px' }}>
            <div style={{ fontFamily: 'var(--hs-display)', fontSize: 14, color: HS.cream, lineHeight: 1.1, whiteSpace: 'pre-line' }}>{g.title}</div>
          </div>
        </>
      ) : (
        <>
          <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, rgba(255,255,255,0.16), transparent 40%)' }} />
          <div style={{ position: 'relative', padding: '12px 11px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85 }}>
              {g.kicker || 'Field Guide'}
            </span>
            <div style={{ marginTop: 6, alignSelf: 'flex-start' }}>
              <GuideMotif kind={g.motif} color={g.accent} />
            </div>
            <h4 style={{ margin: 'auto 0 0', fontFamily: 'var(--hs-display)', fontSize: 20, lineHeight: 0.98, whiteSpace: 'pre-line' }}>
              {g.title}
            </h4>
            <span style={{ marginTop: 7, height: 3, width: 30, background: g.accent, borderRadius: 2 }} />
          </div>
        </>
      )}
    </button>
  );
}

function Newsstand({ guides, activeSalon, navigate }) {
  const published   = guides.filter(g => g.published);
  const comingSoon  = guides.filter(g => g.comingSoon && !g.published);

  // Build rack items: salon card + published guides + coming-soon
  const rackItems = [
    ...(activeSalon ? [{
      _type: 'salon',
      id: 'salon',
      title: activeSalon.bookTitle || 'The Salon',
      kicker: 'The Salon',
      bg: '#1A2A1F', bg2: '#243428',
      accent: '#C9A84C', motif: 'star',
      ink: '#FFF8E7',
      published: true,
      blurb: activeSalon.bookAuthor ? `${activeSalon.bookAuthor} — join readers this month.` : 'Reading together, once a month.',
      coverImageUrl: activeSalon.coverURL || activeSalon.coverImage || null,
    }] : []),
    ...published.map((g, i) => ({
      ...g,
      _type: 'guide',
      ...GUIDE_PALETTES[i % GUIDE_PALETTES.length],
      kicker: g.subtitle || 'Field Guide',
      blurb: g.subtitle || '',
    })),
    ...comingSoon.map((g, i) => ({
      ...g,
      _type: 'coming',
      ...GUIDE_PALETTES[(published.length + i) % GUIDE_PALETTES.length],
      kicker: 'Coming Soon',
    })),
  ];

  const [sel, setSel] = useState(null);

  const selectedItem =
    sel === 'gazette' ? {
      title: 'The Literary Roads Gazette',
      accent: HS.orange,
      blurb: 'The weekly dispatch from the road — book picks, community news, and detours worth taking.',
      action: () => navigate('/newspaper/current'),
      actionLabel: 'Read now',
    } :
    sel ? (() => {
      const it = rackItems.find(r => r.id === sel);
      if (!it) return null;
      if (it._type === 'salon') return {
        title: `The Salon · ${it.title}`,
        accent: it.accent,
        blurb: it.blurb,
        action: () => navigate('/salon'),
        actionLabel: 'Join the Salon',
      };
      if (it._type === 'guide') return {
        title: it.title,
        accent: it.accent,
        blurb: it.blurb || it.subtitle || 'A Literary Roads field guide.',
        action: () => navigate(`/guide/${it.id}`),
        actionLabel: 'Open guide',
      };
      return null;
    })() : null;

  return (
    <div>
      {/* Striped awning */}
      <div style={{
        height: 16, borderRadius: '6px 6px 0 0',
        background: `repeating-linear-gradient(90deg, ${HS.red} 0 16px, ${HS.cream} 16px 32px)`,
        border: `1.5px solid ${HS.ink}`, borderBottom: 'none', marginBottom: 14,
        boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
      }} />

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Gazette card */}
        <button onClick={() => setSel(sel === 'gazette' ? null : 'gazette')} className="hs-gazette"
          aria-pressed={sel === 'gazette'} style={{
          textAlign: 'left', cursor: 'pointer', padding: 14, borderRadius: 10,
          background: HS.cream, color: HS.ink, border: `2px solid ${HS.ink}`,
          boxShadow: sel === 'gazette'
            ? `0 14px 28px rgba(0,0,0,.5), 0 0 0 2px ${HS.orange}`
            : '0 10px 22px rgba(0,0,0,.4)',
          transition: 'box-shadow 200ms',
        }}>
          <div style={{
            fontFamily: 'var(--hs-mono)', fontSize: 9, letterSpacing: '0.2em',
            textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between',
            borderBottom: `1.5px solid ${HS.ink}`, paddingBottom: 5,
          }}>
            <span>Weekly Issue</span>
            <span>Tabloid · Community</span>
          </div>
          <div style={{
            fontFamily: 'var(--hs-nameplate)', fontSize: 25, lineHeight: 1,
            textAlign: 'center', padding: '9px 0 8px', borderBottom: `3px double ${HS.ink}`,
          }}>
            The Literary Roads<br />Gazette
          </div>
          <div style={{ display: 'flex', gap: 11, marginTop: 11 }}>
            <img src={`${BASE}images/cat-newspaper-hs.png`} alt="" style={{
              width: 78, height: 78, objectFit: 'contain', flexShrink: 0,
              filter: 'grayscale(1) contrast(1.05)',
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--hs-serif)', fontSize: 14, fontWeight: 700, lineHeight: 1.12, marginBottom: 4 }}>
                Dispatches from the literary road.
              </div>
              <div style={{
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                fontFamily: 'var(--hs-serif)', fontSize: 11, lineHeight: 1.4, color: HS.ink, opacity: 0.78,
              }}>
                Book picks, community features, and the detours worth taking — every week from Literary Roads.
              </div>
            </div>
          </div>
          <div style={{
            marginTop: 11, display: 'inline-flex', alignItems: 'center', gap: 7,
            fontFamily: 'var(--hs-sans)', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: HS.cream, background: HS.orange,
            border: `2px solid ${HS.ink}`, borderRadius: 999, padding: '7px 14px',
            boxShadow: `2px 2px 0 ${HS.ink}`,
          }}>
            Read now &rarr;
          </div>
        </button>

        {/* Magazine rack */}
        <div style={{
          borderRadius: 10, background: HS.navy2, border: `1.5px solid ${HS.navyLine}`,
          padding: '16px 8px 14px', display: 'flex', flexDirection: 'column',
        }}>
          {rackItems.length > 0 ? (
            <div className="hs-rack-scroll" style={{
              display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
              gap: 6, padding: '10px 14px 12px', overflowX: 'auto',
            }}>
              {rackItems.map((g, i) => (
                g._type === 'coming' ? (
                  <div key={g.id} style={{
                    position: 'relative', flexShrink: 0, width: 124, height: 176,
                    borderRadius: '5px 5px 4px 4px',
                    background: `linear-gradient(160deg, ${g.bg2}, ${g.bg})`,
                    border: `1.5px dashed ${HS.muted}`, overflow: 'hidden', opacity: 0.55,
                    transform: `rotate(${(i - (rackItems.length - 1) / 2) * 4}deg)`,
                    transformOrigin: 'bottom center',
                  }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: HS.muted, textAlign: 'center', padding: '0 8px' }}>
                        COMING SOON
                      </span>
                    </div>
                  </div>
                ) : (
                  <MagazineCover key={g.id} g={g} active={sel === g.id}
                    fanned={(i - (rackItems.length - 1) / 2) * 4}
                    onClick={() => setSel(sel === g.id ? null : g.id)} />
                )
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', textAlign: 'center' }}>
              <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: HS.muted }}>
                Guides coming soon
              </span>
            </div>
          )}
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: `1px solid ${HS.navyLine}` }}>
            <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: HS.muted }}>
              {published.length} guide{published.length !== 1 ? 's' : ''} available
            </span>
            {activeSalon && (
              <span style={{ fontFamily: 'var(--hs-sans)', fontWeight: 700, fontSize: 11, color: '#C9A84C', letterSpacing: '0.04em' }}>
                The Salon is open &rarr;
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selected detail strip */}
      <Reveal open={!!selectedItem}>
        {selectedItem && (
          <div style={{
            marginTop: 14, padding: '14px 16px', borderRadius: 10,
            background: HS.navy3, border: `1.5px solid ${selectedItem.accent}55`,
            display: 'flex', gap: 14, alignItems: 'center',
          }}>
            <span style={{ width: 8, alignSelf: 'stretch', borderRadius: 4, background: selectedItem.accent, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--hs-nameplate)', fontSize: 16, color: HS.cream, letterSpacing: '0.03em' }}>
                {selectedItem.title}
              </div>
              <p style={{ margin: '4px 0 0', fontFamily: 'var(--hs-serif)', fontSize: 13.5, lineHeight: 1.45, color: HS.cream2 }}>
                {selectedItem.blurb}
              </p>
            </div>
            <StampButton color={selectedItem.accent} dark onClick={selectedItem.action} style={{ flexShrink: 0, fontSize: 12 }}>
              {selectedItem.actionLabel}
            </StampButton>
          </div>
        )}
      </Reveal>
    </div>
  );
}

// ── Section 03: Radio ─────────────────────────────────────────────────────────
function Knob({ size = 64, angle = 0, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        position: 'relative', width: size, height: size, borderRadius: '50%',
        background: 'conic-gradient(from 0deg, #e9e4d8, #9a948a, #e9e4d8, #8c867c, #e9e4d8)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(0,0,0,0.25)',
        display: 'grid', placeItems: 'center',
      }}>
        <div style={{
          width: '64%', height: '64%', borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 32%, #4a443b, #1c1813)',
          transform: `rotate(${angle}deg)`,
          transition: 'transform 600ms cubic-bezier(.5,1.2,.4,1)',
          position: 'relative', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.6)',
        }}>
          <span style={{
            position: 'absolute', top: 5, left: '50%', width: 3, height: '34%',
            transform: 'translateX(-50%)', borderRadius: 2, background: HS.orange,
            boxShadow: GLOW.orange,
          }} />
        </div>
      </div>
      {label && <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: HS.muted }}>{label}</span>}
    </div>
  );
}

function EQBars({ on }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {[0, 1, 2, 3].map(i => (
        <span key={i} className={on ? 'hs-eqbar' : ''} style={{
          width: 3, height: on ? 14 : 3, background: HS.orange, borderRadius: 1,
          animationDelay: (i * 0.13) + 's', opacity: on ? 1 : 0.4,
        }} />
      ))}
    </span>
  );
}

function StarIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24"
      fill={filled ? HS.mustard : 'none'} stroke={filled ? HS.mustard : HS.muted}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function CarRadio({ podcasts, loading, favIds, onToggleFav, canFav, isLoggedIn }) {
  const [open, setOpen]  = useState(false);
  const [band, setBand]  = useState('fm');
  const [cur,  setCur]   = useState(null);

  const fmStations = podcasts.map(p => ({
    id:   p.id,
    freq: p.freq || `${(88 + podcasts.indexOf(p) * 3.8).toFixed(1)}`,
    name: p.title || '',
    host: p.host  || '',
    note: p.description ? p.description.slice(0, 80) + (p.description.length > 80 ? '…' : '') : '',
    url:  p.url   || null,
    tag:  p.tag   || '',
  }));

  const LR_NETWORK = [
    { id: 'lr1', freq: 'LR-1', name: 'The Festival Circuit', host: 'live from the road', note: 'Dispatches from literary festivals across the country', url: null },
    { id: 'lr2', freq: 'LR-2', name: 'In the Passenger Seat', host: 'author conversations', note: 'Coming soon — author road trips', url: null },
    { id: 'lr3', freq: 'LR-3', name: 'The Bulletin', host: 'community news', note: 'New chapters, meetups & shelf finds', url: null },
  ];

  const list = band === 'fm' ? fmStations : LR_NETWORK;

  const idx       = cur ? list.findIndex(s => s.id === cur.id) : -1;
  const dialAngle = idx < 0 ? -150 : -150 + (idx / Math.max(1, list.length - 1)) * 300;
  const needlePct = cur && band === 'fm'
    ? ((parseFloat(cur.freq) - 88) / (108 - 88)) * 100
    : 50;

  const ledMain = cur ? cur.name : 'Literary Roads FM';
  const ledFreq = cur ? cur.freq : band === 'fm' ? '— · —' : 'LR';

  const pickBand = (b) => { setBand(b); setCur(null); setOpen(true); };

  const handleStation = (s) => {
    const isOn = cur?.id === s.id;
    setCur(isOn ? null : s);
    if (!isOn && s.url) window.open(s.url, '_blank', 'noopener');
  };

  return (
    <div>
      {/* Radio face */}
      <div style={{
        position: 'relative', borderRadius: 18, padding: 16,
        background: 'linear-gradient(170deg, #322b22, #14100b)',
        border: '2px solid #0b0907',
        boxShadow: '0 16px 36px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        {/* Chrome trim */}
        <div style={{
          position: 'absolute', inset: 6, borderRadius: 13, pointerEvents: 'none',
          border: '1.5px solid transparent',
          background: 'linear-gradient(135deg, #cfc9bb, #6b6459, #cfc9bb) border-box',
          WebkitMask: 'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor', maskComposite: 'exclude',
        }} />

        {/* LED display */}
        <div style={{
          position: 'relative', borderRadius: 8, padding: '11px 14px',
          background: 'linear-gradient(#0c1410, #060a08)',
          border: '2px solid #000', boxShadow: 'inset 0 0 18px rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--hs-mono)', fontSize: 8.5, letterSpacing: '0.3em', color: 'rgba(245,129,42,0.5)', textTransform: 'uppercase', marginBottom: 3 }}>
              {band === 'fm' ? '‹ FM STATIONS ›' : '‹ LR NETWORK ›'}
            </div>
            <div className="hs-led" style={{
              fontFamily: 'var(--hs-mono)', fontWeight: 700, fontSize: 16, letterSpacing: '0.05em',
              color: HS.orange, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textShadow: '0 0 6px rgba(245,129,42,.9), 0 0 14px rgba(245,129,42,.55)',
            }}>
              {ledMain.toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <EQBars on={!!cur} />
            <div style={{ textAlign: 'right' }}>
              <div className="hs-led" style={{
                fontFamily: 'var(--hs-mono)', fontWeight: 700, fontSize: 22, lineHeight: 1,
                color: HS.mustard, textShadow: '0 0 6px rgba(244,199,64,.9)',
              }}>{ledFreq}</div>
              <div style={{ fontFamily: 'var(--hs-mono)', fontSize: 8, letterSpacing: '0.2em', color: 'rgba(244,199,64,0.5)', marginTop: 2 }}>
                {band === 'fm' ? 'MHz' : 'NET'}
              </div>
            </div>
          </div>
        </div>

        {/* Frequency scale */}
        <div style={{ position: 'relative', height: 30, margin: '13px 4px 6px' }}>
          <div style={{ position: 'absolute', top: 11, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #5a5247, #b8b0a2, #5a5247)' }} />
          {[88, 92, 96, 100, 104, 108].map((f, i) => (
            <div key={f} style={{ position: 'absolute', top: 0, left: (i / 5) * 100 + '%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              <div style={{ width: 1.5, height: 9, margin: '0 auto', background: '#9a9286' }} />
              <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 8, color: HS.muted }}>{f}</span>
            </div>
          ))}
          <div style={{
            position: 'absolute', top: 2, left: needlePct + '%',
            transform: 'translateX(-50%)', transition: 'left 600ms cubic-bezier(.5,1.2,.4,1)',
          }}>
            <div style={{ width: 2.5, height: 20, background: HS.red, borderRadius: 2, boxShadow: GLOW.pink }} />
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setOpen(o => !o)} aria-label="Tuner dial" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <Knob size={70} angle={dialAngle} label="Tune" />
            </button>
            <Knob size={46} angle={cur ? 40 : -30} label="Vol" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'stretch' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['fm', 'FM Shows'], ['lr', 'LR Network']].map(([b, lbl]) => (
                <button key={b} onClick={() => pickBand(b)} style={{
                  fontFamily: 'var(--hs-mono)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                  padding: '8px 11px', borderRadius: 6,
                  color: band === b ? HS.navy : HS.cream2,
                  background: band === b ? HS.cyan : '#231d16',
                  border: `1.5px solid ${band === b ? HS.cyan : '#3a3025'}`,
                  boxShadow: band === b ? GLOW.cyan : 'inset 0 1px 3px rgba(0,0,0,0.5)',
                  transition: 'all 180ms',
                }}>{lbl}</button>
              ))}
            </div>
            <button onClick={() => setOpen(o => !o)} style={{
              fontFamily: 'var(--hs-sans)', fontWeight: 800, fontSize: 13,
              letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
              color: HS.navy, background: `linear-gradient(${HS.mustard}, ${HS.orange})`,
              border: '2px solid #0b0907', borderRadius: 8, padding: '10px 18px',
              boxShadow: open ? 'inset 0 2px 6px rgba(0,0,0,0.5)' : '0 4px 0 #0b0907',
            }}>
              {open ? 'Close ▾' : 'Tune in ▴'}
            </button>
          </div>
        </div>
      </div>

      {/* Station list */}
      <Reveal open={open}>
        <div style={{ marginTop: 0, paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && band === 'fm' ? (
            <p style={{ fontFamily: 'var(--hs-mono)', fontSize: 11, color: HS.muted, textAlign: 'center', letterSpacing: '0.1em' }}>
              TUNING IN&hellip;
            </p>
          ) : list.length === 0 ? (
            <p style={{ fontFamily: 'var(--hs-mono)', fontSize: 11, color: HS.muted, textAlign: 'center', letterSpacing: '0.1em' }}>
              NO STATIONS ON THIS BAND YET
            </p>
          ) : list.map(s => {
            const on  = cur?.id === s.id;
            const fav = favIds.includes(s.id);
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 13,
                padding: '11px 14px', borderRadius: 10,
                background: on ? HS.navy3 : HS.navy2,
                border: `1.5px solid ${on ? HS.orange : HS.navyLine}`,
                boxShadow: on ? `0 0 0 1px ${HS.orange}55, inset 0 0 18px ${HS.orange}14` : 'none',
                transition: 'all 180ms',
              }}>
                <button onClick={() => handleStation(s)} style={{
                  display: 'flex', flex: 1, alignItems: 'center', gap: 13, textAlign: 'left',
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit',
                }}>
                  <span style={{
                    flexShrink: 0, width: 50, textAlign: 'center',
                    fontFamily: 'var(--hs-mono)', fontWeight: 700, fontSize: 15,
                    color: on ? HS.orange : HS.muted,
                    textShadow: on ? '0 0 8px rgba(245,129,42,.7)' : 'none',
                  }}>{s.freq}</span>
                  <span style={{ width: 1, alignSelf: 'stretch', background: HS.navyLine }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--hs-serif)', fontSize: 16, fontWeight: 700, color: HS.cream, lineHeight: 1.1 }}>
                      {s.name}
                    </span>
                    <span style={{ display: 'block', fontFamily: 'var(--hs-sans)', fontSize: 11.5, color: HS.muted, marginTop: 2 }}>
                      {s.host}{s.note ? ` · ${s.note}` : ''}
                    </span>
                  </span>
                  <span style={{
                    flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
                    display: 'grid', placeItems: 'center',
                    background: on ? HS.orange : 'transparent',
                    border: `1.5px solid ${on ? HS.orange : HS.muted}`,
                  }}>
                    {on ? <EQBars on /> : (
                      <svg width="11" height="12" viewBox="0 0 11 12">
                        <path d="M1 1 L10 6 L1 11 Z" fill={HS.muted} />
                      </svg>
                    )}
                  </span>
                </button>

                {/* Favorite star */}
                {isLoggedIn && band === 'fm' && (
                  <button onClick={() => onToggleFav(s.id)} title={fav ? 'Unfavorite' : canFav ? 'Favorite' : `Max ${MAX_FAV} favorites`}
                    style={{
                      background: 'none', border: 'none', padding: '4px', cursor: fav || canFav ? 'pointer' : 'not-allowed',
                      opacity: !fav && !canFav ? 0.35 : 1,
                      filter: fav ? `drop-shadow(0 0 4px ${HS.mustard})` : 'none',
                      flexShrink: 0,
                    }}>
                    <StarIcon filled={fav} />
                  </button>
                )}
              </div>
            );
          })}
          <div style={{ textAlign: 'center', marginTop: 4, fontFamily: 'var(--hs-mono)', fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: HS.muted }}>
            {band === 'fm'
              ? `${list.length} show${list.length !== 1 ? 's' : ''} on the dial · new every week`
              : 'Literary Roads network feed · coming soon'}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

// ── Library Finder ─────────────────────────────────────────────────────────────
function LibraryFinderSection({ navigate }) {
  const [libSearch, setLibSearch] = useState('');
  const handleSearch = (e) => {
    e.preventDefault();
    if (!libSearch.trim()) return;
    navigate(`/library-finder?q=${encodeURIComponent(libSearch.trim())}`);
  };
  return (
    <section style={{ marginTop: 40, marginBottom: 44 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#1A4D1A', border: '3px solid #fff', borderRadius: 6, padding: '10px 18px', marginBottom: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
        <div style={{ color: '#fff', flexShrink: 0 }}><LibraryIcon size={22} /></div>
        <div>
          <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 16, color: '#fff', letterSpacing: '0.08em', margin: 0, lineHeight: 1.1 }}>LIBRARY FINDER</p>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: 'rgba(255,255,255,0.75)', margin: '2px 0 0', lineHeight: 1 }}>Find a library near you</p>
        </div>
      </div>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input type="text" value={libSearch} onChange={e => setLibSearch(e.target.value)}
          placeholder="City, state or address..."
          style={{ flex: 1, background: '#F5F5DC', border: '1.5px solid rgba(26,77,26,0.4)', borderRadius: 10, color: '#1A1B2E', fontFamily: 'Special Elite, serif', fontSize: 14, padding: '10px 14px', outline: 'none' }} />
        <button type="submit" disabled={!libSearch.trim()} style={{
          background: libSearch.trim() ? '#FF4E00' : 'rgba(255,78,0,0.35)', color: '#fff',
          border: 'none', borderRadius: 10, fontFamily: 'Bungee, sans-serif', fontSize: 12, letterSpacing: '0.06em',
          padding: '10px 18px', cursor: libSearch.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap', flexShrink: 0,
          boxShadow: libSearch.trim() ? '0 0 16px rgba(255,78,0,0.4)' : 'none', transition: 'background .15s, box-shadow .15s',
        }}>SEARCH &rarr;</button>
      </form>
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Resources({ onBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sections open state (persisted)
  const [open, setOpen] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(HS_KEY));
      if (Array.isArray(s)) return new Set(s);
    } catch {}
    return new Set([1]);
  });
  useEffect(() => {
    localStorage.setItem(HS_KEY, JSON.stringify([...open]));
  }, [open]);
  const toggle = (i) => setOpen(prev => {
    const n = new Set(prev);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });

  // Data
  const [guides,      setGuides]      = useState([]);
  const [activeSalon, setActiveSalon] = useState(null);
  const [podcasts,    setPodcasts]    = useState([]);
  const [podLoading,  setPodLoading]  = useState(true);
  const [favIds,      setFavIds]      = useState([]);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => { fetchPublishedGuides().then(setGuides).catch(() => {}); }, []);
  useEffect(() => subscribeToActiveSalon(setActiveSalon), []);

  useEffect(() => {
    getDocs(collection(db, 'literary_podcasts')).then(snap => {
      setPodcasts(snap.docs.map(d => {
        const p = d.data();
        return {
          id: d.id, title: p.title || '', host: p.host || '',
          description: p.description || '', url: p.url || null,
          freq: p.freq || null,
          tag: Array.isArray(p.tags) ? p.tags[0] || '' : (p.tags || ''),
        };
      }));
    }).catch(() => {}).finally(() => setPodLoading(false));
  }, []);

  useEffect(() => {
    if (!user) { setFavIds([]); return; }
    return onSnapshot(doc(db, 'users', user.uid), snap => {
      setFavIds(snap.data()?.favoritePodcasts || []);
    });
  }, [user]);

  const persist = async (updated) => {
    if (!user || saving) return;
    setSaving(true);
    const ref = doc(db, 'users', user.uid);
    try { await updateDoc(ref, { favoritePodcasts: updated }); }
    catch { await setDoc(ref, { favoritePodcasts: updated }, { merge: true }); }
    finally { setSaving(false); }
  };

  const toggleFav = (id) => {
    if (!user) return;
    const isFav = favIds.includes(id);
    if (!isFav && favIds.length >= MAX_FAV) return;
    const updated = isFav ? favIds.filter(x => x !== id) : [...favIds, id];
    setFavIds(updated);
    persist(updated);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      background: 'radial-gradient(120% 80% at 50% -10%, #1A2342 0%, #10162B 46%, #0A0F20 100%) fixed',
      color: HS.cream,
    }}>
      <SunburstWatermark />
      <AmbientDiamonds />

      {/* Nav bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: `${HS.navy}f0`, borderBottom: `1px solid ${HS.navyLine}`,
        backdropFilter: 'blur(12px)', padding: '0 16px',
        height: 52, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', color: HS.cyan, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          fontFamily: 'var(--hs-mono)', fontSize: 11, letterSpacing: '0.08em',
          padding: '6px 8px', borderRadius: 6,
        }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          BACK
        </button>
      </div>

      {/* Main content */}
      <main style={{
        position: 'relative', zIndex: 2,
        maxWidth: 880, margin: '0 auto',
        padding: 'clamp(16px, 4vw, 30px) clamp(14px, 4vw, 26px) 56px',
      }}>

        {/* Header: neon sign + radio cat */}
        <header style={{ position: 'relative', paddingTop: 18, marginBottom: 26 }}>
          <div className="hs-radiocat" style={{ position: 'absolute', top: -6, right: -6, width: 'clamp(108px, 30vw, 176px)', zIndex: 3 }}>
            <div style={{ position: 'absolute', bottom: '38%', right: '60%', transform: 'translate(-14px, -55px)', zIndex: 4 }}>
              <SpeechBubble tailStyle={{ bottom: -8, right: 14, transform: 'rotate(0deg)' }}
                style={{ width: 'max-content', maxWidth: 'min(168px, 56vw)' }}>
                Stark knows things. <span style={{ color: HS.pink }}>Allegedly.</span>
              </SpeechBubble>
            </div>
            <img src={`${BASE}images/radio-cat.png`} alt="Literary Roads Radio cat at the mic"
              className="hs-float" style={{ width: '100%', height: 'auto', display: 'block',
                filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.5))' }} />
          </div>

          <div style={{ paddingTop: 'clamp(34px, 11vw, 58px)' }}>
            <div style={{ fontFamily: 'var(--hs-mono)', fontSize: 11, letterSpacing: '0.34em', textTransform: 'uppercase', color: HS.cyan, marginBottom: 12, opacity: 0.8 }}>
              ✦ Literary Roads presents
            </div>
            <NeonSign />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <span style={{ height: 1.5, flex: '0 0 38px', background: HS.pink, boxShadow: GLOW.pink }} />
              <span style={{ fontFamily: 'var(--hs-serif)', fontStyle: 'italic', fontSize: 15, color: HS.cream2 }}>For the road.</span>
              <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: HS.muted }}>
                &mdash; entertainment for the drive
              </span>
            </div>
          </div>
        </header>

        {/* Three sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section index={1} label="Surprise Me" sub="Stark's fortune booth"
            accent={HS.orange} open={open.has(1)} onToggle={() => toggle(1)}
            icon={<HeadChip color={HS.orange} label="Press ▸" />}>
            <FortuneBooth user={user} />
          </Section>

          <Section index={2} label="Literary Roads Newsstand" sub="The Gazette + guides"
            accent={HS.cyan} open={open.has(2)} onToggle={() => toggle(2)}
            icon={<HeadChip color={HS.cyan} label="Read ▸" />}>
            <Newsstand guides={guides} activeSalon={activeSalon} navigate={navigate} />
          </Section>

          <Section index={3} label="Literary Roads Radio" sub="Tune the dial"
            accent={HS.pink} open={open.has(3)} onToggle={() => toggle(3)}
            icon={<HeadChip color={HS.pink} label="Listen ▸" />}>
            <CarRadio podcasts={podcasts} loading={podLoading} favIds={favIds}
              onToggleFav={toggleFav} canFav={favIds.length < MAX_FAV} isLoggedIn={!!user} />
          </Section>
        </div>

        <LibraryFinderSection navigate={navigate} />

        {/* Footer */}
        <footer style={{
          paddingTop: 20, borderTop: `1px solid ${HS.navyLine}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, flexWrap: 'wrap', textAlign: 'center',
        }}>
          <img src={`${BASE}images/star-cat-mark.png`} alt=""
            style={{ width: 34, height: 34, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }} />
          <span style={{ fontFamily: 'var(--hs-nameplate)', fontSize: 14, letterSpacing: '0.1em', color: HS.cream2 }}>
            Highway Snacks
          </span>
          <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: HS.muted }}>
            A Literary Roads roadside attraction
          </span>
        </footer>
      </main>
    </div>
  );
}
