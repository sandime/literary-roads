// SwapMeetScreen.jsx — Book Swap Meet feature
// Opens from the map marker or the profile card.
// initialTab prop: 'tables' | 'townSquare' | 'myTable'
import { useState, useEffect, useRef, useCallback } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToCurrentMeet, subscribeToTables, subscribeToMyTable,
  saveMyTable, subscribeToTownSquare, sendTownSquareMessage, reportMessage,
  startOrGetChat, subscribeToChat, sendChatMessage,
  addToReadNext, coverUrl,
} from '../utils/swapMeet';
import { searchBooks } from '../utils/googleBooks';
import {
  SW, FairScene, Awning, Pennants, StringLights, WoodSign,
  Burst, SwapBook, BookTable, PriceTag, SwapBtn,
} from '../components/swap/SwapKit';

const BASE = import.meta.env.BASE_URL;
const CAT_SRC = `${BASE}images/swapmeet-cat.png`;

// Map Firestore book → SwapBook src prop
const bookSrc = (b) => b?.coverURL || (b?.coverId ? coverUrl(b.coverId) : null);
const toSwapBook = (b) => b ? { ...b, src: bookSrc(b) } : null;

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
  useEffect(() => { const id = setTimeout(onDone, 2800); return () => clearTimeout(id); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      background: SW.cream, border: `2px solid ${SW.ink}`, borderRadius: 20,
      padding: '10px 20px', color: SW.ink, fontFamily: SW.fonts.type, fontSize: 13,
      zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
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
    try { const res = await searchBooks(q, 8); setResults(res || []); }
    catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => { if (query.length > 2) search(query); }, 500);
    return () => clearTimeout(id);
  }, [query, search]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(58,42,30,0.72)', zIndex: 4000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 500, background: SW.cream, borderTop: `3px solid ${SW.ink}`,
        borderRadius: '16px 16px 0 0', padding: '20px 16px 36px', maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 -6px 30px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: SW.fonts.display, fontSize: 13, color: SW.ink,
          margin: '0 0 14px', letterSpacing: '0.06em' }}>ADD A BOOK</h3>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title or author…"
          style={{ width: '100%', background: SW.paper2, border: `2px solid ${SW.ink}`,
            borderRadius: 8, padding: '10px 14px', color: SW.ink, fontFamily: SW.fonts.serif,
            fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
        />
        {loading && <p style={{ fontFamily: SW.fonts.type, fontSize: 12, color: SW.muted,
          marginTop: 10, fontStyle: 'italic' }}>Searching…</p>}
        <div style={{ marginTop: 12 }}>
          {results.map(book => {
            const olMatch = book.coverURL?.match(/\/id\/(\d+)/)?.[1] || null;
            const coverSrc = book.coverURL || null;
            const coverId  = olMatch || null;
            return (
              <div key={book.id}
                onClick={() => onSelect({ title: book.title, author: book.author, coverId, coverURL: coverSrc })}
                style={{ display: 'flex', gap: 12, padding: '10px 0',
                  borderBottom: `1px solid ${SW.line}`, cursor: 'pointer', alignItems: 'center' }}>
                {coverSrc
                  ? <img src={coverSrc} alt="" style={{ width: 48, height: 68, objectFit: 'cover',
                      borderRadius: 3, flexShrink: 0, boxShadow: '2px 2px 6px rgba(0,0,0,0.3)',
                      border: `1.5px solid ${SW.ink}` }}/>
                  : <div style={{ width: 48, height: 68, background: SW.plum, borderRadius: 3, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: SW.fonts.display, fontSize: 8,
                        color: 'rgba(255,248,231,0.5)', textAlign: 'center', padding: '0 4px' }}>NO COVER</span>
                    </div>
                }
                <div>
                  <div style={{ fontFamily: SW.fonts.display, fontSize: 12, color: SW.ink, lineHeight: 1.3 }}>{book.title}</div>
                  <div style={{ fontFamily: SW.fonts.type, fontSize: 12, color: SW.muted }}>{book.author}</div>
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

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat?.messages?.length]);

  const send = async () => {
    if (!msg.trim() || !chatId) return;
    setSending(true);
    try { await sendChatMessage(meet.id, chatId, myId, msg.trim()); setMsg(''); }
    finally { setSending(false); }
  };

  const fmtTime = iso => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', flexDirection: 'column' }}
      onClick={onClose}>
      <FairScene style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
        {/* Nav */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, background: SW.kraft,
          borderBottom: `2px solid ${SW.ink}`, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: SW.ink2,
            fontFamily: SW.fonts.display, fontSize: 10, cursor: 'pointer', padding: 0 }}>‹ BACK</button>
          <span style={{ flex: 1, textAlign: 'center', fontFamily: SW.fonts.display,
            fontSize: 12, color: SW.ink }}>{theirName}</span>
          <div style={{ width: 30 }}/>
        </div>

        {/* Book context banner */}
        {bookContext && (
          <div style={{ padding: '12px 16px 4px', display: 'flex', justifyContent: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: SW.cream,
              border: `2px solid ${SW.ink}`, borderRadius: 10, padding: '8px 14px 8px 10px',
              boxShadow: '0 3px 0 rgba(58,42,30,0.18)' }}>
              <SwapBook src={bookSrc(bookContext)} title={bookContext.title} author={bookContext.author} w={30} h={45}/>
              <div>
                <div style={{ fontFamily: SW.fonts.type, fontSize: 9, color: SW.muted }}>about</div>
                <div style={{ fontFamily: SW.fonts.serif, fontWeight: 700, fontSize: 12.5, color: SW.ink }}>{bookContext.title}</div>
                <div style={{ fontFamily: SW.fonts.serif, fontStyle: 'italic', fontSize: 10.5, color: SW.ink2 }}>{bookContext.author}</div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', display: 'flex',
          flexDirection: 'column', gap: 10 }} onClick={e => e.stopPropagation()}>
          {!chat && <p style={{ fontFamily: SW.fonts.type, fontSize: 12, color: SW.muted,
            textAlign: 'center', fontStyle: 'italic' }}>Starting conversation…</p>}
          {chat?.messages?.map((m, i) => {
            const mine = m.userId === myId;
            return (
              <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '74%', padding: '9px 13px',
                  borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: mine ? SW.orange : SW.cream, color: mine ? '#fff' : SW.ink,
                  border: mine ? 'none' : `1.5px solid ${SW.ink}`,
                  fontFamily: SW.fonts.serif, fontSize: 13, lineHeight: 1.4 }}>
                  {m.message}
                  <div style={{ fontSize: 8.5, opacity: 0.6, marginTop: 3, textAlign: mine ? 'right' : 'left' }}>
                    {fmtTime(m.sentAt)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef}/>
        </div>

        {/* Closing reminder */}
        <div style={{ background: `rgba(255,78,0,0.08)`, borderTop: `1px solid ${SW.line}`,
          padding: '6px 16px' }} onClick={e => e.stopPropagation()}>
          <div style={{ fontFamily: SW.fonts.type, fontSize: 10, color: SW.orange, textAlign: 'center' }}>
            This chat closes Monday at noon ET
          </div>
        </div>

        {/* Composer */}
        <div style={{ background: SW.kraft, borderTop: `2px solid ${SW.ink}`,
          padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}
          onClick={e => e.stopPropagation()}>
          <input value={msg} onChange={e => setMsg(e.target.value.slice(0, 200))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Say something…"
            style={{ flex: 1, background: SW.cream, border: `1.5px solid ${SW.ink}`,
              borderRadius: 20, padding: '9px 14px', color: SW.ink,
              fontFamily: SW.fonts.serif, fontSize: 13, outline: 'none' }}/>
          <span style={{ fontFamily: SW.fonts.type, fontSize: 10, color: SW.muted,
            alignSelf: 'center', minWidth: 24 }}>{200 - msg.length}</span>
          <SwapBtn variant="primary" onClick={send} disabled={!msg.trim() || sending}
            style={{ minHeight: 38, borderRadius: 20, fontSize: 11 }}>SEND</SwapBtn>
        </div>
      </FairScene>
    </div>
  );
}

// ── Full table visit modal ─────────────────────────────────────────────────────
function TableModal({ table, meet, onClose, onReadNext, user, onSayHello }) {
  const featured = toSwapBook(table.featuredBook);
  const others   = (table.books || []).map(toSwapBook);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3500 }}>
      <FairScene style={{ height: '100%' }}>
        {/* Nav */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, background: SW.kraft,
          borderBottom: `2px solid ${SW.ink}`, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: SW.ink2,
            fontFamily: SW.fonts.display, fontSize: 10, cursor: 'pointer', padding: 0 }}>‹ TABLES</button>
          <span style={{ flex: 1, textAlign: 'center', fontFamily: SW.fonts.display,
            fontSize: 13, color: SW.ink }}>{table.username}'s table</span>
          <div style={{ width: 36 }}/>
        </div>

        <div style={{ padding: '16px 16px 50px' }}>
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <div style={{ fontFamily: SW.fonts.type, fontSize: 11, color: SW.ink2 }}>
              Literary Roadster since {table.memberSince?.toDate ? table.memberSince.toDate().getFullYear() : '—'}
            </div>
            {table.statesVisited?.length > 0 && (
              <div style={{ fontFamily: SW.fonts.type, fontSize: 11, color: SW.ink2 }}>
                Reading in: {table.statesVisited.slice(0, 5).join(' · ')}
              </div>
            )}
          </div>

          <div style={{ margin: '14px 0' }}>
            <BookTable featured={featured} books={others} width={340} awningA={SW.teal} awningB={SW.cream}/>
          </div>

          {/* Featured pick */}
          {featured && (
            <div style={{ background: SW.cream, border: `2px solid ${SW.ink}`, borderRadius: 12,
              padding: 14, boxShadow: '0 5px 0 rgba(58,42,30,0.18)', marginBottom: 10 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Burst r={9} c={SW.orange} points={10}/>
                <span style={{ fontFamily: SW.fonts.display, fontSize: 9, color: SW.orange,
                  letterSpacing: '0.08em' }}>FEATURED PICK</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <SwapBook {...featured} w={58} h={86} featured/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: SW.fonts.serif, fontWeight: 700, fontSize: 16,
                    color: SW.ink, lineHeight: 1.2 }}>{featured.title}</div>
                  <div style={{ fontFamily: SW.fonts.serif, fontStyle: 'italic', fontSize: 12.5,
                    color: SW.ink2, marginTop: 2 }}>{featured.author}</div>
                  {featured.note && <div style={{ fontFamily: SW.fonts.serif, fontSize: 13,
                    color: SW.ink, fontStyle: 'italic', marginTop: 8, lineHeight: 1.45 }}>"{featured.note}"</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {user && <SwapBtn variant="sage" full style={{ fontSize: 9 }}
                  onClick={() => onReadNext(table.featuredBook)}>+ READ NEXT</SwapBtn>}
                {user && user.uid !== table.userId && (
                  <SwapBtn variant="primary" full style={{ fontSize: 9 }}
                    onClick={() => onSayHello(table.featuredBook)}>SAY HELLO</SwapBtn>
                )}
              </div>
            </div>
          )}

          {/* Other books */}
          {others.map((b, i) => b && (
            <div key={i} style={{ background: SW.cream, border: `2px solid ${SW.ink}`,
              borderRadius: 12, padding: 12, marginTop: 10, display: 'flex', gap: 12,
              boxShadow: '0 4px 0 rgba(58,42,30,0.14)' }}>
              <SwapBook {...b} w={42} h={62}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SW.fonts.serif, fontWeight: 700, fontSize: 13.5,
                  color: SW.ink, lineHeight: 1.2 }}>{b.title}</div>
                <div style={{ fontFamily: SW.fonts.serif, fontStyle: 'italic', fontSize: 11.5,
                  color: SW.ink2 }}>{b.author}</div>
                {b.note && <div style={{ marginTop: 6 }}><PriceTag color={SW.kraft2}>"{b.note}"</PriceTag></div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {user && <SwapBtn variant="sage" style={{ fontSize: 8.5, minHeight: 32 }}
                    onClick={() => onReadNext(table.books[i])}>+ READ NEXT</SwapBtn>}
                  {user && user.uid !== table.userId && (
                    <SwapBtn variant="ghost" style={{ fontSize: 8.5, minHeight: 32 }}
                      onClick={() => onSayHello(table.books[i])}>SAY HELLO</SwapBtn>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </FairScene>
    </div>
  );
}

// ── Sticky header: pennants + kraft band + tabs ───────────────────────────────
function SwapHeader({ tab, onTab, onBack, meet }) {
  const tabs = [['tables', 'TABLES'], ['townSquare', 'TOWN SQUARE'], ['myTable', 'MY TABLE']];
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30 }}>
      <div style={{ background: SW.skyLo }}>
        <Pennants width={390} count={11}/>
      </div>
      <div style={{ background: SW.kraft, borderBottom: `2px solid ${SW.ink}`,
        boxShadow: '0 3px 10px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: SW.ink2,
            fontFamily: SW.fonts.display, fontSize: 10, cursor: 'pointer', padding: 0 }}>‹ MAP</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: SW.fonts.display, fontSize: 14, color: SW.ink,
              letterSpacing: '0.04em' }}>BOOK SWAP MEET</div>
            {meet?.hostCity && (
              <div style={{ fontFamily: SW.fonts.type, fontSize: 9.5, color: SW.ink2 }}>
                {meet.hostCity}, {meet.hostState}
              </div>
            )}
          </div>
          {meet?.status === 'active' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: SW.sage,
                boxShadow: `0 0 8px ${SW.sageGlow}`,
                animation: 'sw-twinkle 2s ease-in-out infinite' }}/>
              <span style={{ fontFamily: SW.fonts.type, fontSize: 9.5, color: SW.sage }}>OPEN</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', borderTop: `1px solid ${SW.line}` }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => onTab(k)} style={{ flex: 1, fontFamily: SW.fonts.display,
              fontSize: 9.5, letterSpacing: '0.04em', padding: '10px 0',
              background: tab === k ? SW.cream : 'transparent', border: 'none',
              borderBottom: tab === k ? `3px solid ${SW.orange}` : '3px solid transparent',
              color: tab === k ? SW.orange : SW.muted, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Table card in the feed ────────────────────────────────────────────────────
function TableCard({ table, meet, user, onVisit, onReadNext }) {
  const featured = toSwapBook(table.featuredBook);
  const books    = (table.books || []).map(toSwapBook);
  const allBooks = [table.featuredBook, ...(table.books || [])].filter(Boolean);
  return (
    <div style={{ background: SW.cream, border: `2px solid ${SW.ink}`, borderRadius: 14,
      padding: '14px 14px 16px', marginBottom: 14, boxShadow: '0 5px 0 rgba(58,42,30,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: SW.fonts.display, fontSize: 13, color: SW.ink }}>{table.username}</span>
        <span style={{ fontFamily: SW.fonts.type, fontSize: 10, color: SW.muted }}>
          Roadster since {table.memberSince?.toDate ? table.memberSince.toDate().getFullYear() : '—'}
        </span>
      </div>
      {table.statesVisited?.length > 0 && (
        <div style={{ fontFamily: SW.fonts.type, fontSize: 10.5, color: SW.ink2, marginTop: 2 }}>
          Reading in: {table.statesVisited.slice(0, 4).join(' · ')}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <BookTable featured={featured} books={books} width={300} awningA={SW.red} awningB={SW.cream}/>
      </div>

      {featured?.note && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <PriceTag color={SW.mustard}>"{featured.note}"</PriceTag>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {user && allBooks.length > 0 && (
          <SwapBtn variant="sage" full style={{ fontSize: 9 }}
            onClick={() => onReadNext(allBooks)}>+ ADD ALL TO READ NEXT</SwapBtn>
        )}
        <SwapBtn variant="primary" full style={{ fontSize: 9 }}
          onClick={() => onVisit(table)}>VISIT TABLE →</SwapBtn>
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
    for (const b of list) await addToReadNext(user.uid, b).catch(() => {});
    setToast(`${list.length > 1 ? `${list.length} books` : `"${list[0].title}"`} added to Read Next`);
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'newRoadsters', label: 'New Roadsters' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 14, overflowX: 'auto' }}>
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            flexShrink: 0, fontFamily: SW.fonts.display, fontSize: 9, letterSpacing: '0.04em',
            padding: '6px 13px', borderRadius: 20,
            border: `2px solid ${filter === f.key ? SW.ink : SW.line}`,
            background: filter === f.key ? SW.mustard : SW.cream,
            color: SW.ink, cursor: 'pointer' }}>{f.label}</button>
        ))}
      </div>

      {filtered.length === 0
        ? <p style={{ fontFamily: SW.fonts.type, fontSize: 13, color: SW.muted,
            textAlign: 'center', fontStyle: 'italic', paddingTop: 40 }}>
            No public tables yet. Be the first to open your table!
          </p>
        : filtered.map(table => (
          <TableCard key={table.id} table={table} meet={meet} user={user}
            onVisit={setVisiting} onReadNext={handleReadNext}/>
        ))
      }

      {visitingTable && (
        <TableModal table={visitingTable} meet={meet} user={user}
          onClose={() => setVisiting(null)}
          onReadNext={handleReadNext}
          onSayHello={book => { setVisiting(null); setChatTarget({ table: visitingTable, book }); }}/>
      )}

      {chatTarget && user && (
        <ChatModal meet={meet} myId={user.uid} myName={user.displayName || 'Roadster'}
          theirId={chatTarget.table.userId} theirName={chatTarget.table.username}
          bookContext={chatTarget.book} onClose={() => setChatTarget(null)}/>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)}/>}
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
    setHasNew(false); setAtBottom(true);
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 340, padding: '0 24px', textAlign: 'center' }}>
        <Burst r={16} c={SW.mustard} points={12}/>
        <div style={{ fontFamily: SW.fonts.display, fontSize: 17, color: SW.ink, margin: '14px 0 12px' }}>
          TOWN SQUARE
        </div>
        <div style={{ fontFamily: SW.fonts.serif, fontSize: 14, color: SW.ink2, lineHeight: 1.6 }}>
          The shared space for everyone at today's meet. Talk books. Ask questions. Say hello.
        </div>
        <div style={{ fontFamily: SW.fonts.serif, fontStyle: 'italic', fontSize: 12.5,
          color: SW.muted, marginTop: 10 }}>Messages disappear when the meet closes.</div>
        <div style={{ fontFamily: SW.fonts.display, fontSize: 10, color: SW.orange,
          letterSpacing: '0.04em', margin: '18px 0' }}>
          BE GENEROUS · BE CURIOUS · BE KIND
        </div>
        <SwapBtn variant="primary" onClick={() => { sessionStorage.setItem(TS_WELCOME_KEY, '1'); setWelcomed(true); }}>
          I'M IN →
        </SwapBtn>
        <div style={{ marginTop: 24 }}><StringLights width={340} count={11}/></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)' }}>
      <div style={{ padding: '6px 0 2px' }}><StringLights width={390} count={14} warm/></div>

      <div ref={listRef}
        onScroll={e => {
          const el = e.currentTarget;
          const near = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
          setAtBottom(near);
          if (near) setHasNew(false);
        }}
        style={{ flex: 1, overflowY: 'auto', padding: '4px 0 8px' }}>
        {messages.map(m => (
          <div key={m.id}
            onContextMenu={e => { e.preventDefault(); setLongPress(m.id); }}
            onTouchStart={() => { const t = setTimeout(() => setLongPress(m.id), 500); return () => clearTimeout(t); }}
            style={{ padding: '6px 0', borderBottom: `1px solid ${SW.line}`, position: 'relative' }}>
            <span style={{ fontFamily: SW.fonts.display, fontSize: 10, color: SW.sage }}>{m.username}</span>
            <span style={{ fontFamily: SW.fonts.type, fontSize: 9.5, color: SW.muted, marginLeft: 8 }}>{fmtTime(m.sentAt)}</span>
            {m.reported && <span style={{ fontFamily: SW.fonts.display, fontSize: 8, color: '#DC2626', marginLeft: 8 }}>REPORTED</span>}
            <p style={{ fontFamily: SW.fonts.serif, fontSize: 13.5, color: SW.ink, margin: '3px 0 0', lineHeight: 1.5 }}>{m.message}</p>
            {longPress === m.id && (
              <div style={{ position: 'absolute', right: 0, top: 0, background: SW.cream,
                border: `2px solid ${SW.ink}`, borderRadius: 8, padding: 4, zIndex: 10 }}>
                <button onClick={() => handleReport(m.id)} style={{ display: 'block', width: '100%',
                  background: 'none', border: 'none', color: '#DC2626', fontFamily: SW.fonts.display,
                  fontSize: 10, cursor: 'pointer', padding: '6px 12px', textAlign: 'left' }}>Report</button>
                <button onClick={() => setLongPress(null)} style={{ display: 'block', width: '100%',
                  background: 'none', border: 'none', color: SW.muted, fontFamily: SW.fonts.type,
                  fontSize: 11, cursor: 'pointer', padding: '6px 12px', textAlign: 'left' }}>Cancel</button>
              </div>
            )}
          </div>
        ))}
        <div ref={endRef}/>
      </div>

      {hasNew && (
        <button onClick={scrollToBottom} style={{ background: SW.sage, border: 'none',
          borderRadius: 20, padding: '6px 16px', color: SW.cream, fontFamily: SW.fonts.display,
          fontSize: 10, cursor: 'pointer', margin: '0 auto 8px' }}>
          NEW MESSAGES
        </button>
      )}

      {user ? (
        <div style={{ borderTop: `2px solid ${SW.ink}`, paddingTop: 10,
          background: SW.kraft, display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0 2px' }}>
          <input value={msg} onChange={e => setMsg(e.target.value.slice(0, 200))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Say something to the square…"
            style={{ flex: 1, background: SW.cream, border: `1.5px solid ${SW.ink}`,
              borderRadius: 20, padding: '9px 14px', color: SW.ink,
              fontFamily: SW.fonts.serif, fontSize: 13, outline: 'none' }}/>
          <span style={{ fontFamily: SW.fonts.type, fontSize: 10, color: SW.muted, alignSelf: 'center' }}>
            {200 - msg.length}
          </span>
          <SwapBtn variant="primary" onClick={handleSend} disabled={!msg.trim() || sending}
            style={{ minHeight: 38, borderRadius: 20, fontSize: 11 }}>SEND</SwapBtn>
        </div>
      ) : (
        <p style={{ fontFamily: SW.fonts.type, fontSize: 12, color: SW.muted,
          textAlign: 'center', padding: '10px 0', borderTop: `1px solid ${SW.line}` }}>
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
  const [showSearch, setShowSearch] = useState(null);
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
        username:      user.displayName || 'Roadster',
        memberSince:   myTable?.memberSince || serverTimestamp(),
        featuredBook:  featuredBook || null,
        books,
        isPublic,
        statesVisited: myTable?.statesVisited || [],
      });
      setToast('Table saved');
    } catch { setToast('Save failed'); }
    finally { setSaving(false); }
  };

  const handleBookSelect = (book) => {
    if (showSearch === 'featured') setFeatured({ ...book, note: '' });
    else if (typeof showSearch === 'number') {
      const updated = [...books]; updated[showSearch] = { ...book, note: '' }; setBooks(updated);
    }
    setShowSearch(null);
  };

  const moveBook = (i, dir) => {
    const next = [...books], target = i + dir;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    setBooks(next);
  };

  const removeBook = (i) => setBooks(books.filter((_, idx) => idx !== i));

  const openAt = meet?.openAt?.toDate ? meet.openAt.toDate() : meet?.openAt ? new Date(meet.openAt) : null;
  const isActive = meet?.status === 'active';

  const previewFeatured = toSwapBook(featuredBook);
  const previewBooks    = books.map(toSwapBook);

  return (
    <div>
      {/* Opens banner */}
      {!isActive && openAt && (
        <div style={{ background: SW.cream, border: `2px solid ${SW.sage}`, borderRadius: 12,
          padding: '12px 14px', marginBottom: 16, boxShadow: '0 4px 0 rgba(91,168,94,0.22)' }}>
          <div style={{ fontFamily: SW.fonts.display, fontSize: 11, color: SW.sage,
            letterSpacing: '0.04em' }}>YOUR TABLE</div>
          <div style={{ fontFamily: SW.fonts.type, fontSize: 12.5, color: SW.ink, marginTop: 4 }}>
            Opens Sunday at noon ET · Opens in <strong style={{ color: SW.orange }}><Countdown targetDate={openAt}/></strong>
          </div>
          <div style={{ fontFamily: SW.fonts.type, fontSize: 11, color: SW.muted, marginTop: 3 }}>
            Prepare now — your table goes live at noon.
          </div>
          {meet.hostCity && <div style={{ fontFamily: SW.fonts.type, fontSize: 11, color: SW.muted, marginTop: 3 }}>
            Host city: {meet.hostCity}, {meet.hostState}
          </div>}
        </div>
      )}

      {/* Table preview */}
      <div style={{ fontFamily: SW.fonts.display, fontSize: 9, color: SW.muted,
        letterSpacing: '0.08em', marginBottom: 8 }}>TABLE PREVIEW</div>
      <BookTable featured={previewFeatured} books={previewBooks} width={320}
        awningA={SW.plum} awningB={SW.cream}/>

      {/* Featured pick editor */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Burst r={8} c={SW.orange} points={10}/>
          <span style={{ fontFamily: SW.fonts.display, fontSize: 9, color: SW.orange,
            letterSpacing: '0.08em' }}>FEATURED PICK</span>
        </div>
        {featuredBook ? (
          <div style={{ background: SW.cream, border: `2px solid ${SW.ink}`, borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <SwapBook src={bookSrc(featuredBook)} title={featuredBook.title}
                author={featuredBook.author} w={40} h={60} featured/>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SW.fonts.serif, fontWeight: 700, fontSize: 13,
                  color: SW.ink, lineHeight: 1.2 }}>{featuredBook.title}</div>
                <div style={{ fontFamily: SW.fonts.serif, fontStyle: 'italic', fontSize: 11,
                  color: SW.ink2 }}>{featuredBook.author}</div>
              </div>
              <button onClick={() => setFeatured(null)} style={{ background: 'none', border: 'none',
                color: SW.muted, cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
            </div>
            <textarea
              value={featuredBook.note || ''}
              onChange={e => setFeatured({ ...featuredBook, note: e.target.value.slice(0, 140) })}
              placeholder="Why this book? (optional, 140 chars)"
              rows={2}
              style={{ width: '100%', background: SW.paper2, border: `1px solid ${SW.line}`,
                borderRadius: 6, padding: '8px 10px', color: SW.ink, fontFamily: SW.fonts.serif,
                fontStyle: 'italic', fontSize: 12, resize: 'none', boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ fontFamily: SW.fonts.type, fontSize: 9.5, color: SW.muted, textAlign: 'right', marginTop: 3 }}>
              {140 - (featuredBook.note?.length || 0)} left
            </div>
          </div>
        ) : (
          <button onClick={() => setShowSearch('featured')} style={{ width: '100%',
            background: SW.paper2, border: `2px dashed ${SW.muted}`, borderRadius: 10, padding: 20,
            color: SW.muted, fontFamily: SW.fonts.display, fontSize: 10, cursor: 'pointer' }}>
            + TAP TO SET FEATURED PICK
          </button>
        )}
      </div>

      {/* Additional books */}
      <div style={{ marginTop: 18, marginBottom: 8 }}>
        <div style={{ fontFamily: SW.fonts.display, fontSize: 9, color: SW.muted,
          letterSpacing: '0.08em', marginBottom: 8 }}>ON YOUR TABLE (up to 4)</div>
        {books.map((book, i) => (
          <div key={i} style={{ background: SW.cream, border: `2px solid ${SW.ink}`,
            borderRadius: 10, padding: 10, marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={() => moveBook(i, -1)} disabled={i === 0}
                style={{ background: 'none', border: 'none', color: SW.muted, cursor: 'pointer',
                  fontSize: 14, padding: '1px 4px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
              <button onClick={() => moveBook(i, 1)} disabled={i === books.length - 1}
                style={{ background: 'none', border: 'none', color: SW.muted, cursor: 'pointer',
                  fontSize: 14, padding: '1px 4px', opacity: i === books.length - 1 ? 0.3 : 1 }}>↓</button>
            </div>
            <SwapBook src={bookSrc(book)} title={book.title} author={book.author} w={32} h={48}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SW.fonts.serif, fontWeight: 700, fontSize: 12.5, color: SW.ink }}>{book.title}</div>
              <div style={{ fontFamily: SW.fonts.serif, fontStyle: 'italic', fontSize: 10.5, color: SW.ink2 }}>{book.author}</div>
              <textarea value={book.note || ''}
                onChange={e => { const u = [...books]; u[i] = { ...book, note: e.target.value.slice(0, 140) }; setBooks(u); }}
                placeholder="Optional note (140 chars)"
                rows={1}
                style={{ width: '100%', marginTop: 4, background: SW.paper2, border: `1px solid ${SW.line}`,
                  borderRadius: 4, padding: '4px 8px', color: SW.ink, fontFamily: SW.fonts.serif,
                  fontStyle: 'italic', fontSize: 11, resize: 'none', boxSizing: 'border-box', outline: 'none' }}/>
            </div>
            <button onClick={() => removeBook(i)} style={{ background: 'none', border: 'none',
              color: SW.red, cursor: 'pointer', fontSize: 18, padding: '0 4px', flexShrink: 0 }}>×</button>
          </div>
        ))}
        {books.length < 4 && (
          <button onClick={() => setShowSearch(books.length)} style={{ width: '100%',
            background: SW.paper2, border: `2px dashed ${SW.muted}`, borderRadius: 10, padding: 12,
            color: SW.muted, fontFamily: SW.fonts.display, fontSize: 9.5, cursor: 'pointer' }}>
            + ADD BOOK ({books.length}/4)
          </button>
        )}
      </div>

      {/* Privacy toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: SW.cream, border: `2px solid ${SW.ink}`, borderRadius: 10,
        padding: '12px 14px', margin: '16px 0' }}>
        <div>
          <div style={{ fontFamily: SW.fonts.display, fontSize: 9.5, color: SW.ink }}>YOUR TABLE IS VISIBLE TO:</div>
          <div style={{ fontFamily: SW.fonts.type, fontSize: 11.5, color: isPublic ? SW.sage : SW.muted, marginTop: 3 }}>
            {isPublic ? 'Everyone at the swap meet' : 'Just me (preparing)'}
          </div>
        </div>
        <button onClick={() => setPublic(!isPublic)} style={{ width: 46, height: 26, borderRadius: 13,
          border: `2px solid ${SW.ink}`, background: isPublic ? SW.sage : SW.kraft2,
          cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 1, width: 20, height: 20, background: SW.cream,
            borderRadius: '50%', border: `1.5px solid ${SW.ink}`,
            transition: 'left .2s', left: isPublic ? 22 : 2 }}/>
        </button>
      </div>

      <SwapBtn variant="primary" full disabled={saving || !user} onClick={handleSave}
        style={{ fontSize: 12, minHeight: 50 }}>
        {saving ? 'SAVING…' : 'SAVE MY TABLE'}
      </SwapBtn>

      {showSearch !== null && (
        <BookSearchModal onSelect={handleBookSelect} onClose={() => setShowSearch(null)}/>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)}/>}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SwapMeetScreen({ onBack, onShowLogin, initialTab = 'tables' }) {
  const { user } = useAuth();
  const [meet, setMeet]           = useState(undefined);
  const [tab, setTab]             = useState(initialTab);
  const [showWelcome, setWelcome] = useState(true);

  useEffect(() => subscribeToCurrentMeet(setMeet), []);

  const enterTab = (t) => {
    setWelcome(false);
    setTab(t);
  };

  const fmtDate = ts => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const closeAt = meet?.closeAt?.toDate ? meet.closeAt.toDate() : meet?.closeAt ? new Date(meet.closeAt) : null;

  // ── Welcome gate (active meet, first visit) ──────────────────────────────
  if (meet?.status === 'active' && showWelcome) {
    return (
      <FairScene style={{ height: '100%' }}>
        <div style={{ position: 'relative', zIndex: 3 }}><Pennants width={390} count={12}/></div>
        <div style={{ position: 'relative', zIndex: 2, padding: '4px 22px 30px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

          <WoodSign width={290} accent={SW.orange} tilt={-1.5} style={{ marginTop: 6 }}>
            LITERARY ROADS<br/>BOOK SWAP MEET
          </WoodSign>

          <img src={CAT_SRC} alt="Swap Meet Cat"
            style={{ width: 250, height: 250, objectFit: 'contain', marginTop: 4,
              filter: 'drop-shadow(0 16px 26px rgba(0,0,0,0.4))' }}/>

          <div style={{ background: SW.cream, border: `2.5px solid ${SW.ink}`, borderRadius: 10,
            padding: '12px 22px', marginTop: 4, boxShadow: '0 5px 0 rgba(58,42,30,0.25)' }}>
            <div style={{ fontFamily: SW.fonts.display, fontSize: 18, color: SW.ink }}>
              {meet.hostCity}, {meet.hostState}
            </div>
            <div style={{ fontFamily: SW.fonts.type, fontSize: 11, color: SW.ink2, marginTop: 4 }}>
              {fmtDate(meet.openAt)} · Closes Monday noon ET
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              <Burst r={7} c={SW.teal}/>
              <span style={{ fontFamily: SW.fonts.type, fontSize: 12, color: SW.sage }}>
                {meet.participantCount > 0 ? `${meet.participantCount} Literary Roadsters` : 'Literary Roadsters'}
              </span>
              <Burst r={7} c={SW.teal}/>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20, width: '100%' }}>
            <SwapBtn variant="primary" full onClick={() => enterTab('tables')}>BROWSE TABLES</SwapBtn>
            <SwapBtn variant="wood" full onClick={() => enterTab('myTable')}>MY TABLE</SwapBtn>
          </div>
        </div>
        <StringLights width={390} count={14}/>
      </FairScene>
    );
  }

  // ── Main screen with header + tabs ───────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'hidden',
      background: `linear-gradient(180deg, ${SW.skyHi} 0%, ${SW.sky} 30%, ${SW.skyLo} 52%, ${SW.grass} 52%, ${SW.grassDk} 100%)`,
      color: SW.ink, position: 'relative' }}>

      <SwapHeader tab={tab} onTab={setTab} onBack={onBack} meet={meet}/>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 80px' }}>

        {/* Loading */}
        {meet === undefined && (
          <p style={{ fontFamily: SW.fonts.type, fontSize: 13, color: SW.ink2,
            textAlign: 'center', paddingTop: 60, fontStyle: 'italic' }}>Loading…</p>
        )}

        {/* No meet */}
        {meet === null && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <WoodSign width={260} style={{ margin: '0 auto 20px' }}>NEXT MEET COMING SOON</WoodSign>
            <p style={{ fontFamily: SW.fonts.type, fontSize: 14, color: SW.ink2, lineHeight: 1.7 }}>
              No swap meet is scheduled right now.<br/>Check back on the weekend!
            </p>
          </div>
        )}

        {/* Closed banner */}
        {meet?.status === 'closed' && tab !== 'myTable' && (
          <div style={{ textAlign: 'center', paddingTop: 20, marginBottom: 24 }}>
            <div style={{ fontFamily: SW.fonts.display, fontSize: 14, color: SW.muted, marginBottom: 8 }}>
              THIS MEET HAS CLOSED
            </div>
            <p style={{ fontFamily: SW.fonts.type, fontSize: 13, color: SW.muted }}>
              The next swap meet will be announced soon.
            </p>
          </div>
        )}

        {/* Active meet — status strip */}
        {meet?.status === 'active' && (
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, justifyContent: 'center',
            flexWrap: 'wrap', background: SW.cream, borderRadius: 10, padding: '8px 14px',
            border: `1.5px solid ${SW.line}` }}>
            <span style={{ fontFamily: SW.fonts.type, fontSize: 11, color: SW.sage }}>OPEN NOW</span>
            {meet.participantCount > 0 && (
              <span style={{ fontFamily: SW.fonts.type, fontSize: 11, color: SW.muted }}>
                {meet.participantCount} Roadsters here
              </span>
            )}
            {closeAt && (
              <span style={{ fontFamily: SW.fonts.type, fontSize: 11, color: SW.muted }}>
                Closes in <Countdown targetDate={closeAt}/>
              </span>
            )}
          </div>
        )}

        {/* Tab content */}
        {meet && meet !== null && tab === 'tables' && meet.status === 'active' && (
          <TablesContent meet={meet} user={user}/>
        )}
        {meet && meet !== null && tab === 'townSquare' && meet.status === 'active' && (
          <TownSquareContent meet={meet} user={user}/>
        )}
        {meet && meet !== null && tab === 'myTable' && (
          user
            ? <MyTableContent meet={meet} user={user}/>
            : <div style={{ textAlign: 'center', paddingTop: 60 }}>
                <p style={{ fontFamily: SW.fonts.type, fontSize: 14, color: SW.ink2, marginBottom: 20 }}>
                  Sign in to set up your table.
                </p>
                <SwapBtn variant="primary" onClick={onShowLogin}>SIGN IN</SwapBtn>
              </div>
        )}
      </div>
    </div>
  );
}
