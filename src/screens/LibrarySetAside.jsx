import { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { searchBooks } from '../utils/googleBooks';
import { fetchBookCover, titleAuthorSlug } from '../utils/booksCatalog';

// ── Palette ───────────────────────────────────────────────────────────────────
const L = {
  bg:       '#FFF8E7',
  lavender: '#9b8cbf',
  plank:    '#c4b8d4',
  teal:     '#38C5C5',
  coral:    '#FF6B7A',
  dark:     '#2D2D2D',
  mid:      '#555555',
  muted:    '#999999',
  white:    '#FFFFFF',
  card:     '#FAFAFA',
  divider:  'rgba(155,140,191,0.22)',
  inputBg:  '#FFFFFF',
  inputBdr: 'rgba(155,140,191,0.55)',
};

const CAT_SRC = `${import.meta.env.BASE_URL}images/library-cat.png`;
const onCoverLoad  = (e) => { if (e.target.naturalWidth <= 1) e.target.src = CAT_SRC; };
const onCoverError = (e) => { e.target.onerror = null; e.target.src = CAT_SRC; };

const REASONS = [
  { value: 'not-the-right-time', label: 'Not the right time' },
  { value: 'lost-interest',      label: 'Lost interest'       },
  { value: 'not-for-me',         label: 'Not for me'          },
  { value: 'too-heavy',          label: 'Too heavy right now' },
];

const REASON_LABELS = Object.fromEntries(REASONS.map(r => [r.value, r.label]));

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: L.inputBg, border: `1.5px solid ${L.inputBdr}`,
  borderRadius: 10, color: L.dark,
  padding: '11px 14px', fontSize: 14,
  fontFamily: 'Special Elite, serif', outline: 'none',
};

// ── Book search ───────────────────────────────────────────────────────────────
function BookSearch({ onSelect }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (query.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      const r = await searchBooks(query);
      setResults(r); setSearching(false);
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [query]);

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search title, author…"
          autoFocus
          style={inputStyle}
        />
        {searching && (
          <div style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 16,
            border: `2px solid ${L.lavender}`, borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'sa-spin 0.7s linear infinite',
          }} />
        )}
      </div>
      {results.length > 0 && (
        <div style={{
          marginTop: 8, borderRadius: 10, overflow: 'hidden',
          border: `1.5px solid ${L.divider}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          maxHeight: 280, overflowY: 'auto',
        }}>
          {results.map((book, i) => (
            <button
              key={book.id} type="button"
              onClick={() => { onSelect(book); setQuery(''); setResults([]); }}
              style={{
                width: '100%', display: 'flex', gap: 12, alignItems: 'center',
                padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                background: L.white,
                borderTop: i > 0 ? `1px solid ${L.divider}` : 'none',
                border: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(155,140,191,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = L.white}
            >
              <div style={{
                width: 40, height: 56, flexShrink: 0, borderRadius: 3,
                overflow: 'hidden', border: `1px solid ${L.divider}`, background: L.card,
              }}>
                <img src={book.coverURL || CAT_SRC}
                  onLoad={onCoverLoad} onError={onCoverError}
                  alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark, margin: 0,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3,
                }}>
                  {book.title}
                </p>
                <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, margin: '2px 0 0' }}>
                  {book.author}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {!searching && query.length > 1 && results.length === 0 && (
        <p style={{
          fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 13,
          textAlign: 'center', padding: '16px 0', fontStyle: 'italic',
        }}>
          No results found
        </p>
      )}
    </div>
  );
}

// ── Lazy cover card (carousel) ────────────────────────────────────────────────
function CoverCard({ item, isActive, onClick }) {
  const [src, setSrc]     = useState(item.coverUrl || null);
  const tried             = useRef(false);

  useEffect(() => {
    if (src || tried.current) return;
    tried.current = true;
    fetchBookCover({ title: item.title, authors: [item.author], id: item.googleBooksId })
      .then(url => { if (url) setSrc(url); });
  }, [item.id]);

  return (
    <button
      type="button" onClick={onClick}
      style={{
        flexShrink: 0, width: 86, background: 'none', border: 'none',
        cursor: 'pointer', padding: 4, borderRadius: 8,
        outline: isActive ? `2px solid ${L.lavender}` : '2px solid transparent',
        boxShadow: isActive ? `0 0 12px rgba(155,140,191,0.35)` : 'none',
        transition: 'outline 0.15s, box-shadow 0.15s',
      }}
    >
      <div style={{
        width: 78, height: 112, borderRadius: 5, overflow: 'hidden',
        border: isActive ? `2px solid ${L.lavender}` : `2px solid rgba(155,140,191,0.2)`,
        background: L.card,
      }}>
        <img
          src={src || CAT_SRC}
          onLoad={onCoverLoad} onError={onCoverError}
          alt={item.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <p style={{
        fontFamily: 'Special Elite, serif', fontSize: 10, color: L.mid,
        textAlign: 'center', lineHeight: 1.3, marginTop: 4,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {item.title}
      </p>
    </button>
  );
}

// ── Add book bottom sheet ─────────────────────────────────────────────────────
function AddSheet({ book, onCommit, onClose }) {
  const [reason, setReason] = useState(null);
  const [note,   setNote]   = useState('');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <style>{`@keyframes sa-slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 600, margin: '0 auto',
          background: '#FFFFFF',
          borderRadius: '18px 18px 0 0',
          border: `1.5px solid ${L.plank}`,
          padding: '22px 20px 40px',
          animation: 'sa-slide-up 0.26s ease',
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        {/* Book header */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 22 }}>
          <div style={{ width: 44, height: 62, flexShrink: 0, borderRadius: 4, overflow: 'hidden', background: L.card, border: `1px solid ${L.divider}` }}>
            <img src={book.coverURL || CAT_SRC} onLoad={onCoverLoad} onError={onCoverError}
              alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 3px', fontFamily: 'Bungee, sans-serif', fontSize: 13, color: L.dark, lineHeight: 1.3 }}>
              {book.title}
            </p>
            <p style={{ margin: 0, fontFamily: 'Special Elite, serif', fontSize: 12, color: L.mid }}>
              {book.author}
            </p>
          </div>
        </div>

        {/* Step 1 — Reason */}
        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.lavender, letterSpacing: '0.08em', margin: '0 0 12px' }}>
          WHY DID YOU SET IT ASIDE?
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {REASONS.map(r => (
            <button
              key={r.value} type="button"
              onClick={() => setReason(prev => prev === r.value ? null : r.value)}
              style={{
                padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
                fontFamily: 'Special Elite, serif', fontSize: 13,
                border: `1.5px solid ${reason === r.value ? L.lavender : 'rgba(155,140,191,0.35)'}`,
                background: reason === r.value ? 'rgba(155,140,191,0.14)' : 'transparent',
                color: reason === r.value ? L.lavender : L.mid,
                transition: 'all 0.15s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Step 2 — Note */}
        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.lavender, letterSpacing: '0.08em', margin: '0 0 8px' }}>
          ONE SENTENCE
        </p>
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <input
            type="text"
            value={note}
            onChange={e => { if (e.target.value.length <= 140) setNote(e.target.value); }}
            placeholder="One sentence — optional."
            style={{ ...inputStyle, paddingRight: 48 }}
          />
          {note.length > 0 && (
            <span style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              fontFamily: 'Special Elite, serif', fontSize: 10,
              color: note.length >= 130 ? L.coral : L.muted,
            }}>
              {140 - note.length}
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => onCommit(reason, note.trim() || null)}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.07em',
              background: L.lavender, border: 'none', color: L.white,
            }}
          >
            DONE
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Special Elite, serif', fontSize: 13,
              color: L.muted, padding: '0 8px',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function LibrarySetAside({ onBack, user: userProp }) {
  const authCtx          = useAuth();
  const user             = userProp || authCtx.user;

  const [items,        setItems]      = useState([]);
  const [activeId,     setActiveId]   = useState(null);
  const [showSearch,   setShowSearch] = useState(false);
  const [pendingBook,  setPending]    = useState(null); // book from search, awaiting sheet
  const [tryingAgain,  setTryingAgain] = useState(null); // id being moved
  const [removing,     setRemoving]   = useState(null);  // id being deleted
  const carouselRef = useRef(null);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'librarySetAside'),
      snap => setItems(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.addedAt?.toMillis?.() ?? 0) - (a.addedAt?.toMillis?.() ?? 0))
      ),
      err => console.error('[SetAside]', err)
    );
    return unsub;
  }, [user]);

  const activeItem = items.find(i => i.id === activeId) || null;

  // ── Commit add ──────────────────────────────────────────────────────────────
  const handleCommit = async (book, reason, note) => {
    if (!user || !book) return;
    // Close sheet immediately — don't wait for the write
    setPending(null);
    setShowSearch(false);
    const slug  = titleAuthorSlug(book.title || '', book.author || '');
    const docId = book.id ? book.id.replace(/\//g, '_') : slug;
    try {
      await setDoc(doc(db, 'users', user.uid, 'librarySetAside', docId), {
        title:                   book.title  || '',
        author:                  book.author || '',
        coverUrl:                book.coverURL || '',
        googleBooksId:           book.id   || null,
        titleAuthorSlug:         slug,
        addedAt:                 serverTimestamp(),
        setAsideReason:          reason || null,
        setAsideNote:            note   || null,
        suppressInRecommendations: reason === 'not-for-me',
      });
    } catch (err) {
      console.error('[SetAside] commit failed:', err);
    }
  };

  // ── Try Again — move to Read Next ───────────────────────────────────────────
  const handleTryAgain = async (item) => {
    if (!user || tryingAgain) return;
    setTryingAgain(item.id);
    try {
      const slug  = item.titleAuthorSlug || titleAuthorSlug(item.title || '', item.author || '');
      const docId = item.googleBooksId
        ? item.googleBooksId.replace(/\//g, '_')
        : `manual_${slug}_${Date.now()}`;
      await setDoc(doc(db, 'users', user.uid, 'libraryReadNext', docId), {
        title:        item.title    || '',
        author:       item.author   || '',
        coverUrl:     item.coverUrl || '',
        googleBooksId: item.googleBooksId || null,
        whoWhatWhere: null,
        date:         serverTimestamp(),
        lastViewedAt: null,
      });
      await deleteDoc(doc(db, 'users', user.uid, 'librarySetAside', item.id));
      setActiveId(null);
    } catch (err) { console.error('[SetAside] tryAgain:', err); }
    finally { setTryingAgain(null); }
  };

  // ── Remove ──────────────────────────────────────────────────────────────────
  const handleRemove = async (item) => {
    if (!user || removing) return;
    setRemoving(item.id);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'librarySetAside', item.id));
      setActiveId(null);
    } catch (err) { console.error('[SetAside] remove:', err); }
    finally { setRemoving(null); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: L.bg, overflowY: 'auto', fontFamily: 'Special Elite, serif' }}>
      <style>{`
        @keyframes sa-spin    { to { transform: rotate(360deg); } }
        @keyframes sa-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: L.bg, borderBottom: `2px solid ${L.plank}`,
        padding: '12px 16px', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 600, margin: '0 auto' }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark,
              letterSpacing: '0.06em', padding: '4px 8px', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = L.lavender}
            onMouseLeave={e => e.currentTarget.style.color = L.dark}
          >
            BACK
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.muted, letterSpacing: '0.14em' }}>
              THE LIBRARY
            </p>
            <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 16, color: L.dark, fontWeight: 700 }}>
              Set Aside
            </h1>
          </div>
          <button
            onClick={() => { setShowSearch(v => !v); setActiveId(null); }}
            style={{
              background: showSearch ? L.lavender : 'transparent',
              border: `1.5px solid ${L.lavender}`,
              borderRadius: 8, cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 10,
              color: showSearch ? L.white : L.lavender,
              letterSpacing: '0.06em', padding: '5px 10px',
              transition: 'all 0.15s',
            }}
          >
            {showSearch ? 'CANCEL' : '+ ADD BOOK'}
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 16px 80px' }}>

        {/* Search panel */}
        {showSearch && (
          <div style={{ marginBottom: 20, animation: 'sa-fade-in 0.2s ease' }}>
            <p style={{ fontFamily: 'Bungee, sans-serif', color: L.lavender, fontSize: 10, letterSpacing: '0.08em', marginBottom: 10 }}>
              FIND A BOOK
            </p>
            <BookSearch onSelect={book => { setPending(book); setShowSearch(false); }} />
          </div>
        )}

        {/* Not signed in */}
        {!user && (
          <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>
            Sign in to use Set Aside.
          </p>
        )}

        {/* Shelf card */}
        {user && (
          <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid rgba(155,140,191,0.25)`, marginBottom: 16 }}>
            <div style={{ padding: 16, background: L.white }}>

              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: L.lavender, letterSpacing: '0.05em' }}>
                  {items.length > 0 ? `${items.length} book${items.length !== 1 ? 's' : ''}` : 'SET ASIDE'}
                </span>
              </div>

              {/* Empty state */}
              {items.length === 0 && !showSearch && (
                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 13, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 16 }}>
                    You haven't set any books aside yet.
                  </p>
                  <button
                    onClick={() => setShowSearch(true)}
                    style={{
                      background: 'transparent', border: `1.5px solid ${L.lavender}`,
                      borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'Bungee, sans-serif', fontSize: 10,
                      color: L.lavender, letterSpacing: '0.06em', padding: '8px 16px',
                    }}
                  >
                    + ADD BOOK
                  </button>
                </div>
              )}

              {/* Carousel */}
              {items.length > 0 && (
                <div>
                  <div
                    ref={carouselRef}
                    style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10,
                      scrollbarWidth: 'thin', scrollbarColor: `rgba(155,140,191,0.4) transparent` }}
                  >
                    {items.map(item => (
                      <CoverCard
                        key={item.id}
                        item={item}
                        isActive={activeId === item.id}
                        onClick={() => setActiveId(prev => prev === item.id ? null : item.id)}
                      />
                    ))}
                  </div>

                  {/* Detail panel — inline expansion, same pattern as Book Log */}
                  {activeItem && (
                    <div style={{
                      marginTop: 12, borderRadius: 12, padding: 14,
                      background: L.bg, border: `1.5px solid rgba(155,140,191,0.3)`,
                      animation: 'sa-fade-in 0.18s ease',
                    }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        {/* Cover */}
                        <div style={{ width: 52, height: 74, flexShrink: 0, borderRadius: 4,
                          overflow: 'hidden', border: `1.5px solid rgba(155,140,191,0.25)`, background: L.card }}>
                          <img src={activeItem.coverUrl || CAT_SRC}
                            onLoad={onCoverLoad} onError={onCoverError}
                            alt={activeItem.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark, lineHeight: 1.3, marginBottom: 3 }}>
                            {activeItem.title}
                          </p>
                          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.mid, marginBottom: 8 }}>
                            {activeItem.author}
                          </p>
                          {activeItem.setAsideReason && (
                            <span style={{
                              fontFamily: 'Bungee, sans-serif', fontSize: 8,
                              padding: '2px 8px', borderRadius: 4, letterSpacing: '0.07em',
                              border: `1px solid rgba(155,140,191,0.5)`,
                              background: 'rgba(155,140,191,0.1)',
                              color: L.lavender, display: 'inline-block', marginBottom: 6,
                            }}>
                              {REASON_LABELS[activeItem.setAsideReason] || activeItem.setAsideReason}
                            </span>
                          )}
                          {activeItem.setAsideNote && (
                            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: L.mid, fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                              {activeItem.setAsideNote}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          onClick={() => handleTryAgain(activeItem)}
                          disabled={!!tryingAgain}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                            fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.05em',
                            background: 'transparent',
                            border: `1.5px solid ${L.teal}`,
                            color: L.teal,
                            opacity: tryingAgain ? 0.5 : 1,
                            transition: 'opacity 0.15s',
                          }}
                        >
                          {tryingAgain === activeItem.id ? 'MOVING…' : 'TRY AGAIN'}
                        </button>
                        <button
                          onClick={() => handleRemove(activeItem)}
                          disabled={!!removing}
                          style={{
                            padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                            fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.05em',
                            background: 'rgba(255,107,122,0.07)',
                            border: '1px solid rgba(255,107,122,0.3)',
                            color: L.coral,
                            opacity: removing ? 0.5 : 1,
                            transition: 'opacity 0.15s',
                          }}
                        >
                          {removing === activeItem.id ? 'REMOVING…' : 'REMOVE'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Add sheet (bottom sheet after book selected from search) ───────── */}
      {pendingBook && (
        <AddSheet
          book={pendingBook}
          onCommit={(reason, note) => handleCommit(pendingBook, reason, note)}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}
