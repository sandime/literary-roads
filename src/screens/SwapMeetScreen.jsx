// SwapMeetScreen.jsx — Book Swap Meet feature
// Opens from the map marker or the profile card.
// initialTab prop: 'tables' | 'townSquare' | 'myTable'
import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToCurrentMeet, subscribeToTables, subscribeToMyTable,
  saveMyTable, subscribeToTownSquare, sendTownSquareMessage, reportMessage,
  startOrGetChat, subscribeToChat, sendChatMessage,
  addToReadNext, coverUrl,
} from '../utils/swapMeet';
import { searchBooks } from '../utils/googleBooks';

// ── Design tokens ─────────────────────────────────────────────────────────────
const P = {
  bg:      '#1a2e1a',
  surface: '#2a3e2a',
  accent:  '#7bc67e',
  orange:  '#FF4E00',
  cream:   '#FFF8E7',
  muted:   '#8aaa8a',
  border:  '#3a4e3a',
  table:   '#c8a96e',
  navy:    '#1A1B2E',
};

// ── Boomerang table SVG ───────────────────────────────────────────────────────
// Books are positioned along the curve of the boomerang.
// Position indices: 0=featured(center), 1=inner-left, 2=outer-left, 3=inner-right, 4=outer-right
const BOOK_POSITIONS = [
  { x: 195, y: 42, w: 36, h: 50 },   // featured — center top
  { x: 128, y: 56, w: 28, h: 40 },   // left inner
  { x: 62,  y: 74, w: 28, h: 38 },   // left outer
  { x: 258, y: 56, w: 28, h: 40 },   // right inner
  { x: 326, y: 74, w: 28, h: 38 },   // right outer
];

function BookOnTable({ coverId, title, x, y, w, h, featured, onClick }) {
  const url = coverId ? coverUrl(coverId, 'S') : null;
  const [loaded, setLoaded] = useState(false);

  return (
    <g
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      transform={`translate(${x - w / 2}, ${y - h / 2})`}
    >
      {/* Book shadow */}
      <rect x={2} y={2} width={w} height={h} rx={2} fill="rgba(0,0,0,0.25)" />
      {/* Book background */}
      <rect
        width={w} height={h} rx={2}
        fill={url && loaded ? 'transparent' : (featured ? '#8B5E3C' : '#6B4423')}
        stroke={featured ? P.orange : P.table}
        strokeWidth={featured ? 1.5 : 1}
      />
      {url && (
        <image
          href={url}
          width={w} height={h}
          clipPath={`inset(0 round 2px)`}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
          preserveAspectRatio="xMidYMid slice"
        />
      )}
      {/* Featured star indicator */}
      {featured && (
        <circle cx={w - 4} cy={4} r={4} fill={P.orange} />
      )}
    </g>
  );
}

function Boomerang({ books = [], featuredBook, size = 'card', onBookClick }) {
  const scale = size === 'large' ? 1 : 0.72;
  const vw = 400, vh = 120;
  const allSlots = [featuredBook, ...books.slice(0, 4)].filter(Boolean);

  return (
    <div style={{ width: '100%', maxWidth: size === 'large' ? 400 : 290, margin: '0 auto' }}>
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        {/* Boomerang table surface */}
        <path
          d="M20,100 Q60,20 200,40 Q340,60 380,100 Q300,110 200,95 Q100,110 20,100 Z"
          fill={P.table}
          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))"
        />
        {/* Wood grain texture */}
        <path d="M60,85 Q150,75 200,72 Q250,70 340,82" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
        <path d="M45,92 Q140,84 200,82 Q260,80 355,91" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />

        {/* Books */}
        {allSlots.map((book, i) => {
          const pos = BOOK_POSITIONS[i];
          if (!pos) return null;
          return (
            <BookOnTable
              key={i}
              coverId={book.coverId}
              title={book.title}
              x={pos.x} y={pos.y}
              w={pos.w} h={pos.h}
              featured={i === 0}
              onClick={onBookClick ? () => onBookClick(book, i) : undefined}
            />
          );
        })}

        {/* Empty slot placeholders */}
        {BOOK_POSITIONS.slice(allSlots.length).map((pos, i) => (
          <rect
            key={`empty-${i}`}
            x={pos.x - pos.w / 2} y={pos.y - pos.h / 2}
            width={pos.w} height={pos.h} rx={2}
            fill="rgba(0,0,0,0.12)"
            stroke="rgba(200,169,110,0.3)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        ))}
      </svg>
    </div>
  );
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function Countdown({ targetDate }) {
  const [str, setStr] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate) - Date.now();
      if (diff <= 0) { setStr('Now'); return; }
      const h = Math.floor(diff / 36e5);
      const m = Math.floor((diff % 36e5) / 6e4);
      const s = Math.floor((diff % 6e4) / 1e3);
      setStr(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return <span>{str}</span>;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2800);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      background: P.surface, border: `1px solid ${P.accent}`, borderRadius: 20,
      padding: '10px 20px', color: P.cream, fontFamily: 'Special Elite, serif',
      fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }}>
      {message}
    </div>
  );
}

// ── Book search modal ─────────────────────────────────────────────────────────
function BookSearchModal({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await searchBooks(q, 8);
      setResults(res || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => { if (query.length > 2) search(query); }, 500);
    return () => clearTimeout(id);
  }, [query, search]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 4000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 500, background: P.bg, borderTop: `2px solid ${P.accent}`, borderRadius: '16px 16px 0 0', padding: '20px 16px 36px', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: P.accent, margin: '0 0 14px', letterSpacing: '0.06em' }}>ADD A BOOK</h3>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title or author…"
          style={{ width: '100%', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: '10px 14px', color: P.cream, fontFamily: 'Special Elite, serif', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
        />
        {loading && <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.muted, marginTop: 10, fontStyle: 'italic' }}>Searching…</p>}
        <div style={{ marginTop: 12 }}>
          {results.map(book => {
            const cid = book.coverUrl?.match(/\/id\/(\d+)/)?.[1] || null;
            return (
              <div key={book.id} onClick={() => onSelect({ title: book.title, author: book.author, coverId: cid })}
                style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${P.border}`, cursor: 'pointer' }}>
                {cid
                  ? <img src={coverUrl(cid, 'S')} alt="" style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 50, background: '#4A2E18', borderRadius: 2, flexShrink: 0 }} />
                }
                <div>
                  <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.cream, lineHeight: 1.3 }}>{book.title}</div>
                  <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted }}>{book.author}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Private chat modal ────────────────────────────────────────────────────────
function ChatModal({ meet, myId, myName, theirId, theirName, bookContext, onClose }) {
  const [chatId, setChatId]   = useState(null);
  const [chat, setChat]       = useState(null);
  const [msg, setMsg]         = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    startOrGetChat(meet.id, myId, theirId, bookContext).then(setChatId).catch(() => {});
  }, [meet.id, myId, theirId, bookContext]);

  useEffect(() => {
    if (!chatId) return;
    return subscribeToChat(meet.id, chatId, setChat);
  }, [meet.id, chatId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages?.length]);

  const send = async () => {
    if (!msg.trim() || !chatId) return;
    setSending(true);
    try {
      await sendChatMessage(meet.id, chatId, myId, msg.trim());
      setMsg('');
    } finally { setSending(false); }
  };

  const closeTs = meet.closeAt?.toDate ? meet.closeAt.toDate() : new Date(meet.closeAt || Date.now() + 864e5);
  const fmtTime = iso => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 4000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 500, background: P.bg, borderTop: `2px solid ${P.accent}`, borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: P.muted, cursor: 'pointer', fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: 0 }}>← BACK</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.cream }}>{theirName}</div>
            {bookContext && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted }}>about "{bookContext.title}"</div>}
          </div>
        </div>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!chat && <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.muted, textAlign: 'center', fontStyle: 'italic' }}>Starting conversation…</p>}
          {chat?.messages?.map((m, i) => {
            const mine = m.userId === myId;
            return (
              <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '72%', padding: '9px 13px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: mine ? P.orange : P.surface,
                  color: P.cream, fontFamily: 'Special Elite, serif', fontSize: 13,
                }}>
                  {m.message}
                  <div style={{ fontSize: 9, color: mine ? 'rgba(255,255,255,0.5)' : P.muted, marginTop: 3, textAlign: mine ? 'right' : 'left' }}>
                    {fmtTime(m.sentAt)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        {/* Closing reminder */}
        <div style={{ padding: '6px 16px', background: 'rgba(255,78,0,0.08)', borderTop: `1px solid ${P.border}` }}>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.orange, margin: 0, textAlign: 'center' }}>
            This chat closes Monday at noon ET
          </p>
        </div>
        {/* Input */}
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 8 }}>
          <input
            value={msg}
            onChange={e => setMsg(e.target.value.slice(0, 200))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Say something…"
            style={{ flex: 1, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 20, padding: '9px 14px', color: P.cream, fontFamily: 'Special Elite, serif', fontSize: 13, outline: 'none' }}
          />
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted, alignSelf: 'center', minWidth: 24 }}>{200 - msg.length}</span>
          <button
            onClick={send} disabled={!msg.trim() || sending}
            style={{ background: P.orange, border: 'none', borderRadius: 20, padding: '9px 18px', color: P.cream, fontFamily: 'Bungee, sans-serif', fontSize: 11, cursor: 'pointer', opacity: !msg.trim() ? 0.45 : 1 }}
          >SEND</button>
        </div>
      </div>
    </div>
  );
}

// ── Full table view modal ─────────────────────────────────────────────────────
function TableModal({ table, meet, onClose, onReadNext, user, onSayHello }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: P.bg, zIndex: 3500, overflowY: 'auto' }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, background: P.bg, borderBottom: `1px solid ${P.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: P.accent, cursor: 'pointer', fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: 0 }}>← TABLES</button>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: P.cream, marginLeft: 'auto' }}>{table.username}</span>
      </div>

      <div style={{ padding: '20px 16px 60px', maxWidth: 480, margin: '0 auto' }}>
        {/* User info */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted }}>
            Literary Roadster since {table.memberSince?.toDate ? table.memberSince.toDate().getFullYear() : '—'}
          </div>
          {table.statesVisited?.length > 0 && (
            <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, marginTop: 3 }}>
              Reading in: {table.statesVisited.slice(0, 5).join(', ')}{table.statesVisited.length > 5 ? ` +${table.statesVisited.length - 5}` : ''}
            </div>
          )}
        </div>

        {/* Boomerang */}
        <Boomerang books={table.books || []} featuredBook={table.featuredBook} size="large" />

        {/* Featured pick */}
        {table.featuredBook && (
          <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: 16, marginTop: 20 }}>
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: P.orange, letterSpacing: '0.1em', marginBottom: 8 }}>FEATURED PICK</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {table.featuredBook.coverId && (
                <img src={coverUrl(table.featuredBook.coverId)} alt="" style={{ width: 50, height: 70, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: P.cream, lineHeight: 1.3, marginBottom: 3 }}>{table.featuredBook.title}</div>
                <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, marginBottom: 8 }}>{table.featuredBook.author}</div>
                {table.featuredBook.note && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.cream, fontStyle: 'italic', lineHeight: 1.5 }}>"{table.featuredBook.note}"</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {user && <button onClick={() => onReadNext(table.featuredBook)} style={{ flex: 1, background: 'transparent', border: `1px solid ${P.accent}`, borderRadius: 6, padding: '8px', color: P.accent, fontFamily: 'Bungee, sans-serif', fontSize: 10, cursor: 'pointer' }}>+ READ NEXT</button>}
              {user && user.uid !== table.userId && <button onClick={() => onSayHello(table.featuredBook)} style={{ flex: 1, background: P.orange, border: 'none', borderRadius: 6, padding: '8px', color: P.cream, fontFamily: 'Bungee, sans-serif', fontSize: 10, cursor: 'pointer' }}>SAY HELLO</button>}
            </div>
          </div>
        )}

        {/* Other books */}
        {(table.books || []).map((book, i) => (
          <div key={i} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: 14, marginTop: 10, display: 'flex', gap: 12 }}>
            {book.coverId && <img src={coverUrl(book.coverId)} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.cream, lineHeight: 1.3 }}>{book.title}</div>
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, marginBottom: book.note ? 6 : 0 }}>{book.author}</div>
              {book.note && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.cream, fontStyle: 'italic' }}>"{book.note}"</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {user && <button onClick={() => onReadNext(book)} style={{ background: 'transparent', border: `1px solid ${P.accent}`, borderRadius: 6, padding: '6px 12px', color: P.accent, fontFamily: 'Bungee, sans-serif', fontSize: 9, cursor: 'pointer' }}>+ READ NEXT</button>}
                {user && user.uid !== table.userId && <button onClick={() => onSayHello(book)} style={{ background: 'transparent', border: `1px solid ${P.orange}`, borderRadius: 6, padding: '6px 12px', color: P.orange, fontFamily: 'Bungee, sans-serif', fontSize: 9, cursor: 'pointer' }}>SAY HELLO</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Table card ────────────────────────────────────────────────────────────────
function TableCard({ table, meet, user, onVisit, onReadNext }) {
  const allBooks = [table.featuredBook, ...(table.books || [])].filter(Boolean);
  return (
    <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 14px 12px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: P.cream }}>{table.username}</span>
        <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted }}>
          since {table.memberSince?.toDate ? table.memberSince.toDate().getFullYear() : '—'}
        </span>
      </div>
      {table.statesVisited?.length > 0 && (
        <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted, marginBottom: 10 }}>
          Reading in: {table.statesVisited.slice(0, 4).join(', ')}
        </div>
      )}

      <Boomerang books={table.books || []} featuredBook={table.featuredBook} size="card" />

      {table.featuredBook && (
        <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
          <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: P.orange, marginBottom: 2 }}>{table.featuredBook.title}</div>
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted }}>{table.featuredBook.author}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {user && allBooks.length > 0 && (
          <button
            onClick={() => onReadNext(allBooks)}
            style={{ flex: 1, background: 'transparent', border: `1px solid ${P.accent}`, borderRadius: 6, padding: '7px', color: P.accent, fontFamily: 'Bungee, sans-serif', fontSize: 9, cursor: 'pointer' }}
          >
            + ADD ALL TO READ NEXT
          </button>
        )}
        <button
          onClick={() => onVisit(table)}
          style={{ flex: 1, background: P.orange, border: 'none', borderRadius: 6, padding: '7px', color: P.cream, fontFamily: 'Bungee, sans-serif', fontSize: 9, cursor: 'pointer' }}
        >
          VISIT TABLE →
        </button>
      </div>
    </div>
  );
}

// ── TABLES TAB ────────────────────────────────────────────────────────────────
function TablesContent({ meet, user }) {
  const [tables, setTables]         = useState([]);
  const [filter, setFilter]         = useState('all');
  const [visitingTable, setVisiting] = useState(null);
  const [chatTarget, setChatTarget]  = useState(null);
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    if (!meet) return;
    return subscribeToTables(meet.id, setTables);
  }, [meet?.id]);

  const myTables = tables.filter(t => t.userId !== user?.uid);

  const filtered = (() => {
    if (filter === 'newRoadsters') {
      return [...myTables].sort((a, b) => {
        const aY = a.memberSince?.toDate ? a.memberSince.toDate().getFullYear() : 0;
        const bY = b.memberSince?.toDate ? b.memberSince.toDate().getFullYear() : 0;
        return bY - aY;
      });
    }
    return myTables;
  })();

  const handleReadNext = async (books) => {
    if (!user) return;
    const list = Array.isArray(books) ? books : [books];
    for (const b of list) {
      await addToReadNext(user.uid, b).catch(() => {});
    }
    setToast(`${list.length > 1 ? `${list.length} books` : `"${list[0].title}"`} added to Read Next`);
  };

  const handleSayHello = (table, book) => {
    if (!user) return;
    setChatTarget({ table, book });
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'newRoadsters', label: 'New Roadsters' },
  ];

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              flexShrink: 0, fontFamily: 'Bungee, sans-serif', fontSize: 10,
              letterSpacing: '0.06em', padding: '6px 14px', borderRadius: 20,
              border: `1px solid ${filter === f.key ? P.accent : P.border}`,
              background: filter === f.key ? 'rgba(123,198,126,0.15)' : 'transparent',
              color: filter === f.key ? P.accent : P.muted, cursor: 'pointer',
            }}
          >{f.label}</button>
        ))}
      </div>

      {filtered.length === 0
        ? <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted, textAlign: 'center', fontStyle: 'italic', paddingTop: 40 }}>
            No public tables yet. Be the first to open your table!
          </p>
        : filtered.map(table => (
          <TableCard
            key={table.id}
            table={table}
            meet={meet}
            user={user}
            onVisit={setVisiting}
            onReadNext={handleReadNext}
          />
        ))
      }

      {visitingTable && (
        <TableModal
          table={visitingTable}
          meet={meet}
          user={user}
          onClose={() => setVisiting(null)}
          onReadNext={handleReadNext}
          onSayHello={book => { setVisiting(null); setChatTarget({ table: visitingTable, book }); }}
        />
      )}

      {chatTarget && user && (
        <ChatModal
          meet={meet}
          myId={user.uid}
          myName={user.displayName || 'Roadster'}
          theirId={chatTarget.table.userId}
          theirName={chatTarget.table.username}
          bookContext={chatTarget.book}
          onClose={() => setChatTarget(null)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

// ── TOWN SQUARE TAB ───────────────────────────────────────────────────────────
const TS_WELCOME_KEY = 'lr_ts_welcomed';

function TownSquareContent({ meet, user }) {
  const [messages, setMessages]   = useState([]);
  const [msg, setMsg]             = useState('');
  const [sending, setSending]     = useState(false);
  const [welcomed, setWelcomed]   = useState(() => !!sessionStorage.getItem(TS_WELCOME_KEY));
  const [atBottom, setAtBottom]   = useState(true);
  const [hasNew, setHasNew]       = useState(false);
  const [longPress, setLongPress] = useState(null);
  const listRef = useRef(null);
  const endRef  = useRef(null);

  useEffect(() => {
    if (!meet) return;
    return subscribeToTownSquare(meet.id, newMsgs => {
      setMessages(newMsgs);
      if (atBottom) setTimeout(() => endRef.current?.scrollIntoView(), 50);
      else setHasNew(true);
    });
  }, [meet?.id]);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNew(false);
    setAtBottom(true);
  };

  const handleSend = async () => {
    if (!msg.trim() || !user || !meet) return;
    setSending(true);
    try {
      await sendTownSquareMessage(meet.id, user.uid, user.displayName || 'Roadster', msg.trim());
      setMsg('');
      setTimeout(scrollToBottom, 100);
    } finally { setSending(false); }
  };

  const handleReport = async (msgId) => {
    await reportMessage(meet.id, msgId).catch(() => {});
    setLongPress(null);
  };

  const fmtTime = ts => {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!welcomed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, padding: '0 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 18, color: P.accent, margin: '0 0 16px', letterSpacing: '0.06em' }}>TOWN SQUARE</h2>
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: P.cream, lineHeight: 1.7, margin: '0 0 10px' }}>
          The shared space for everyone at today's meet.
        </p>
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted, lineHeight: 1.7, margin: '0 0 6px' }}>
          Talk books. Ask questions. Say hello.
        </p>
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted, lineHeight: 1.7, margin: '0 0 24px' }}>
          Messages disappear when the meet closes.
        </p>
        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.orange, letterSpacing: '0.06em', margin: '0 0 24px' }}>
          Be generous. Be curious. Be kind.
        </p>
        <button
          onClick={() => { sessionStorage.setItem(TS_WELCOME_KEY, '1'); setWelcomed(true); }}
          style={{ background: P.orange, border: 'none', borderRadius: 8, padding: '12px 32px', color: P.cream, fontFamily: 'Bungee, sans-serif', fontSize: 13, cursor: 'pointer', letterSpacing: '0.06em' }}
        >
          I'M IN →
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
      {/* Messages */}
      <div
        ref={listRef}
        onScroll={e => {
          const el = e.currentTarget;
          const near = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
          setAtBottom(near);
          if (near) setHasNew(false);
        }}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}
      >
        {messages.map(m => (
          <div
            key={m.id}
            onContextMenu={e => { e.preventDefault(); setLongPress(m.id); }}
            onTouchStart={() => { const t = setTimeout(() => setLongPress(m.id), 500); return () => clearTimeout(t); }}
            style={{ padding: '6px 0', position: 'relative' }}
          >
            <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: P.accent }}>{m.username}</span>
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted, marginLeft: 8 }}>{fmtTime(m.sentAt)}</span>
            {m.reported && <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: '#DC2626', marginLeft: 8 }}>REPORTED</span>}
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.cream, margin: '3px 0 0', lineHeight: 1.5 }}>{m.message}</p>
            {longPress === m.id && (
              <div style={{ position: 'absolute', right: 0, top: 0, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: 4, zIndex: 10 }}>
                <button onClick={() => handleReport(m.id)} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: '#DC2626', fontFamily: 'Bungee, sans-serif', fontSize: 10, cursor: 'pointer', padding: '6px 12px', textAlign: 'left' }}>Report</button>
                <button onClick={() => setLongPress(null)} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: P.muted, fontFamily: 'Special Elite, serif', fontSize: 11, cursor: 'pointer', padding: '6px 12px', textAlign: 'left' }}>Cancel</button>
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {hasNew && (
        <button onClick={scrollToBottom} style={{ background: P.accent, border: 'none', borderRadius: 20, padding: '6px 16px', color: P.navy, fontFamily: 'Bungee, sans-serif', fontSize: 10, cursor: 'pointer', margin: '0 auto 8px' }}>
          NEW MESSAGES
        </button>
      )}

      {/* Input */}
      {user ? (
        <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 10, display: 'flex', gap: 8 }}>
          <input
            value={msg}
            onChange={e => setMsg(e.target.value.slice(0, 200))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Say something to the square…"
            style={{ flex: 1, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 20, padding: '9px 14px', color: P.cream, fontFamily: 'Special Elite, serif', fontSize: 13, outline: 'none' }}
          />
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted, alignSelf: 'center' }}>{200 - msg.length}</span>
          <button
            onClick={handleSend} disabled={!msg.trim() || sending}
            style={{ background: P.orange, border: 'none', borderRadius: 20, padding: '9px 18px', color: P.cream, fontFamily: 'Bungee, sans-serif', fontSize: 11, cursor: 'pointer', opacity: !msg.trim() ? 0.45 : 1 }}
          >SEND</button>
        </div>
      ) : (
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.muted, textAlign: 'center', padding: '10px 0', borderTop: `1px solid ${P.border}` }}>
          Sign in to join the conversation
        </p>
      )}
    </div>
  );
}

// ── MY TABLE TAB ──────────────────────────────────────────────────────────────
function MyTableContent({ meet, user }) {
  const [myTable, setMyTable]       = useState(null);
  const [featuredBook, setFeatured] = useState(null);
  const [books, setBooks]           = useState([]);
  const [isPublic, setPublic]       = useState(false);
  const [editNote, setEditNote]     = useState(null);
  const [showSearch, setShowSearch] = useState(null); // 'featured' | index
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    if (!meet || !user) return;
    return subscribeToMyTable(meet.id, user.uid, table => {
      if (table) {
        setMyTable(table);
        setFeatured(table.featuredBook || null);
        setBooks(table.books || []);
        setPublic(table.isPublic || false);
      }
    });
  }, [meet?.id, user?.uid]);

  const handleSave = async () => {
    if (!user || !meet) return;
    setSaving(true);
    try {
      await saveMyTable(meet.id, user.uid, {
        username:     user.displayName || 'Roadster',
        memberSince:  myTable?.memberSince || serverTimestamp(),
        featuredBook: featuredBook || null,
        books:        books,
        isPublic,
        statesVisited: myTable?.statesVisited || [],
      });
      setToast('Table saved');
    } catch { setToast('Save failed'); }
    finally { setSaving(false); }
  };

  const handleBookSelect = (book) => {
    if (showSearch === 'featured') {
      setFeatured({ ...book, note: '' });
    } else if (typeof showSearch === 'number') {
      const updated = [...books];
      updated[showSearch] = { ...book, note: '' };
      setBooks(updated);
    }
    setShowSearch(null);
  };

  const moveBook = (i, dir) => {
    const next = [...books];
    const target = i + dir;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    setBooks(next);
  };

  const removeBook = (i) => setBooks(books.filter((_, idx) => idx !== i));

  const openAt = meet?.openAt?.toDate ? meet.openAt.toDate() : meet?.openAt ? new Date(meet.openAt) : null;
  const isActive = meet?.status === 'active';

  return (
    <div>
      {!isActive && openAt && (
        <div style={{ background: 'rgba(123,198,126,0.08)', border: `1px solid rgba(123,198,126,0.2)`, borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.accent, letterSpacing: '0.06em', marginBottom: 4 }}>YOUR TABLE</div>
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.cream }}>
            Opens Sunday at noon ET · Opens in <strong style={{ color: P.orange }}><Countdown targetDate={openAt} /></strong>
          </div>
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: P.muted, marginTop: 6 }}>
            Prepare now — your table goes live at noon.
          </div>
          {meet.hostCity && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted, marginTop: 3 }}>Host city: {meet.hostCity}, {meet.hostState}</div>}
        </div>
      )}

      {/* Boomerang preview */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: P.muted, letterSpacing: '0.08em', marginBottom: 10 }}>TABLE PREVIEW</div>
        <Boomerang books={books} featuredBook={featuredBook} size="large" />
      </div>

      {/* Featured pick */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: P.orange, letterSpacing: '0.08em', marginBottom: 8 }}>FEATURED PICK</div>
        {featuredBook ? (
          <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              {featuredBook.coverId && <img src={coverUrl(featuredBook.coverId)} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.cream }}>{featuredBook.title}</div>
                <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted }}>{featuredBook.author}</div>
              </div>
              <button onClick={() => setFeatured(null)} style={{ background: 'none', border: 'none', color: P.muted, cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
            </div>
            <textarea
              value={featuredBook.note || ''}
              onChange={e => setFeatured({ ...featuredBook, note: e.target.value.slice(0, 140) })}
              placeholder="Why this book? (optional, 140 chars)"
              rows={2}
              style={{ width: '100%', background: '#1a2e1a', border: `1px solid ${P.border}`, borderRadius: 6, padding: '8px 10px', color: P.cream, fontFamily: 'Special Elite, serif', fontSize: 12, resize: 'none', boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted, textAlign: 'right' }}>{140 - (featuredBook.note?.length || 0)}</div>
          </div>
        ) : (
          <button
            onClick={() => setShowSearch('featured')}
            style={{ width: '100%', background: P.surface, border: `1px dashed ${P.border}`, borderRadius: 10, padding: '20px', color: P.muted, fontFamily: 'Bungee, sans-serif', fontSize: 11, cursor: 'pointer', textAlign: 'center' }}
          >
            + TAP TO SET FEATURED PICK
          </button>
        )}
      </div>

      {/* Additional books */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: P.muted, letterSpacing: '0.08em', marginBottom: 8 }}>ON YOUR TABLE (up to 4)</div>
        {books.map((book, i) => (
          <div key={i} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
              {book.coverId && <img src={coverUrl(book.coverId)} alt="" style={{ width: 32, height: 44, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: P.cream }}>{book.title}</div>
                <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted }}>{book.author}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <button onClick={() => moveBook(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: P.muted, cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}>↑</button>
                <button onClick={() => moveBook(i, 1)} disabled={i === books.length - 1} style={{ background: 'none', border: 'none', color: P.muted, cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}>↓</button>
                <button onClick={() => removeBook(i)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>×</button>
              </div>
            </div>
            <textarea
              value={book.note || ''}
              onChange={e => { const u = [...books]; u[i] = { ...book, note: e.target.value.slice(0, 140) }; setBooks(u); }}
              placeholder="Optional note (140 chars)"
              rows={1}
              style={{ width: '100%', background: '#1a2e1a', border: `1px solid ${P.border}`, borderRadius: 6, padding: '6px 10px', color: P.cream, fontFamily: 'Special Elite, serif', fontSize: 12, resize: 'none', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
        ))}
        {books.length < 4 && (
          <button
            onClick={() => setShowSearch(books.length)}
            style={{ width: '100%', background: P.surface, border: `1px dashed ${P.border}`, borderRadius: 10, padding: '12px', color: P.muted, fontFamily: 'Bungee, sans-serif', fontSize: 10, cursor: 'pointer', textAlign: 'center' }}
          >
            + ADD BOOK ({books.length}/4)
          </button>
        )}
      </div>

      {/* Privacy toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: P.cream, letterSpacing: '0.04em' }}>YOUR TABLE IS VISIBLE TO:</div>
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: isPublic ? P.accent : P.muted, marginTop: 3 }}>
            {isPublic ? 'Everyone at the swap meet' : 'Just me (preparing)'}
          </div>
        </div>
        <button
          onClick={() => setPublic(!isPublic)}
          style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: isPublic ? P.accent : P.border, cursor: 'pointer', position: 'relative', flexShrink: 0 }}
        >
          <span style={{ position: 'absolute', top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: 'left 0.2s', left: isPublic ? 22 : 2 }} />
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !user}
        style={{ width: '100%', background: P.orange, border: 'none', borderRadius: 10, padding: '14px', color: P.cream, fontFamily: 'Bungee, sans-serif', fontSize: 13, letterSpacing: '0.06em', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'SAVING…' : 'SAVE MY TABLE'}
      </button>

      {showSearch !== null && (
        <BookSearchModal
          onSelect={handleBookSelect}
          onClose={() => setShowSearch(null)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SwapMeetScreen({ onBack, onShowLogin, initialTab = 'tables' }) {
  const { user } = useAuth();
  const [meet, setMeet]   = useState(undefined); // undefined = loading
  const [tab, setTab]     = useState(initialTab);

  useEffect(() => subscribeToCurrentMeet(setMeet), []);

  const fmtDate = ts => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const closeAt = meet?.closeAt?.toDate ? meet.closeAt.toDate() : meet?.closeAt ? new Date(meet.closeAt) : null;

  const tabs = [
    { key: 'tables',     label: 'TABLES' },
    { key: 'townSquare', label: 'TOWN SQUARE' },
    { key: 'myTable',    label: 'MY TABLE' },
  ];

  return (
    <div style={{ height: '100%', background: P.bg, color: P.cream, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
      <style>{`
        @keyframes swap-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.85; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: P.surface, borderBottom: `1px solid ${P.border}`, padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: P.accent, cursor: 'pointer', fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em', padding: 0 }}>← MAP</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: P.accent, letterSpacing: '0.06em', textShadow: `0 0 12px rgba(123,198,126,0.5)` }}>BOOK SWAP MEET</div>
            {meet?.hostCity && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: P.muted }}>{meet.hostCity}, {meet.hostState} · {fmtDate(meet.openAt)}</div>}
          </div>
          <div style={{ width: 48 }} />
        </div>

        {/* Status strip */}
        {meet?.status === 'active' && (
          <div style={{ display: 'flex', gap: 14, paddingBottom: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.accent, animation: 'swap-pulse 2s ease-in-out infinite' }}>OPEN NOW</span>
            {meet.participantCount > 0 && <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted }}>{meet.participantCount} Roadsters here</span>}
            {closeAt && <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: P.muted }}>Closes in <Countdown targetDate={closeAt} /></span>}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: `1px solid ${P.border}` }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em',
                padding: '12px 0', background: 'transparent', border: 'none',
                borderBottom: tab === t.key ? `2px solid ${P.orange}` : '2px solid transparent',
                color: tab === t.key ? P.orange : P.muted, cursor: 'pointer',
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 80px' }}>
        {meet === undefined && (
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted, textAlign: 'center', paddingTop: 60, fontStyle: 'italic' }}>Loading…</p>
        )}

        {meet === null && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 20, color: P.accent, marginBottom: 12 }}>NEXT MEET COMING SOON</div>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: P.muted, lineHeight: 1.7 }}>No swap meet is scheduled right now.<br />Check back on the weekend!</p>
          </div>
        )}

        {meet?.status === 'closed' && tab !== 'myTable' && (
          <div style={{ textAlign: 'center', paddingTop: 40, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: P.muted, marginBottom: 8 }}>THIS MEET HAS CLOSED</div>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: P.muted }}>The next swap meet will be announced soon.</p>
          </div>
        )}

        {meet && meet !== null && tab === 'tables' && meet.status === 'active' && (
          <TablesContent meet={meet} user={user} />
        )}

        {meet && meet !== null && tab === 'townSquare' && meet.status === 'active' && (
          <TownSquareContent meet={meet} user={user} />
        )}

        {meet && meet !== null && tab === 'myTable' && (
          user
            ? <MyTableContent meet={meet} user={user} />
            : (
              <div style={{ textAlign: 'center', paddingTop: 60 }}>
                <p style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: P.muted, marginBottom: 20 }}>Sign in to set up your table.</p>
                <button onClick={onShowLogin} style={{ background: P.orange, border: 'none', borderRadius: 8, padding: '12px 28px', color: P.cream, fontFamily: 'Bungee, sans-serif', fontSize: 12, cursor: 'pointer' }}>SIGN IN</button>
              </div>
            )
        )}
      </div>
    </div>
  );
}
