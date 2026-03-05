import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { searchBooks } from '../utils/googleBooks';

// ── Book cover card (profile display) ──────────────────────────────────────
function BookCover({ book, onRemove }) {
  const coverSrc = book.coverURL || book.cover || null;
  return (
    <div style={{ flexShrink: 0, width: '88px', position: 'relative' }}>
      <a
        href={book.link || '#'}
        target="_blank"
        rel="noopener noreferrer"
        title={`${book.title} — ${book.author}`}
        style={{ display: 'block', textDecoration: 'none' }}
      >
        <div
          style={{
            width: '88px', height: '124px', borderRadius: '5px', overflow: 'hidden',
            border: '2px solid rgba(64,224,208,0.35)',
            boxShadow: '0 0 10px rgba(64,224,208,0.15)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#40E0D0'; e.currentTarget.style.boxShadow = '0 0 18px rgba(64,224,208,0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(64,224,208,0.35)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(64,224,208,0.15)'; }}
        >
          {coverSrc
            ? <img src={coverSrc} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(145deg, #5C3A1E, #2A1508)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px',
              }}>📖</div>
          }
        </div>
      </a>
      {/* Remove button */}
      <button
        onClick={() => onRemove(book.id)}
        title="Remove"
        style={{
          position: 'absolute', top: '-8px', right: '-8px',
          width: '22px', height: '22px', borderRadius: '50%',
          background: '#FF4E00', border: '1.5px solid #1A1B2E',
          color: '#1A1B2E', fontSize: '13px', lineHeight: 1,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', boxShadow: '0 0 8px rgba(255,78,0,0.6)',
        }}
      >×</button>
      {/* Title */}
      <p style={{
        marginTop: '6px', fontSize: '10px', color: 'rgba(200,200,200,0.65)',
        fontFamily: 'Special Elite, serif', textAlign: 'center', lineHeight: 1.3,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>{book.title}</p>
    </div>
  );
}

// ── Add-book modal ──────────────────────────────────────────────────────────
function BookModal({ favoriteBooks, onAdd, onRemove, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); setSearching(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setResults(await searchBooks(query));
      setSearching(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleAdd = (book) => {
    onAdd(book);
    // Clear search so user can find next book without stale results
    setQuery('');
    setResults([]);
  };

  const addedIds = new Set(favoriteBooks.map((b) => b.id));
  const full = favoriteBooks.length >= 4;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(5,6,15,0.9)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '500px',
        background: '#0D0E1A',
        border: '2px solid #40E0D0',
        borderRadius: '18px 18px 0 0',
        padding: '20px 20px 32px',
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 40px rgba(64,224,208,0.25), 0 -4px 30px rgba(0,0,0,0.6)',
      }}>

        {/* Fixed header — never scrolls */}
        <div style={{ flexShrink: 0 }}>
          {/* Drag handle */}
          <div style={{ width: '36px', height: '4px', background: 'rgba(64,224,208,0.3)', borderRadius: '2px', margin: '0 auto 16px' }} />

          {/* Title + close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h3 className="font-bungee" style={{ color: '#40E0D0', fontSize: '15px', textShadow: '0 0 12px rgba(64,224,208,0.6)', letterSpacing: '0.06em' }}>
                {full ? 'YOUR BOOKS' : 'ADD A BOOK'}
              </h3>
              {full && (
                <p className="font-special-elite" style={{ fontSize: '10px', color: 'rgba(255,78,0,0.7)', marginTop: '2px' }}>
                  Max 4 reached — remove one to add another
                </p>
              )}
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: '1.5px solid rgba(64,224,208,0.4)',
              borderRadius: '50%', width: '30px', height: '30px',
              color: '#40E0D0', fontSize: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, flexShrink: 0,
            }}>×</button>
          </div>

          {/* Slot counter */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', justifyContent: 'center' }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{
                width: '32px', height: '4px', borderRadius: '2px',
                background: i < favoriteBooks.length ? '#FF4E00' : 'rgba(255,78,0,0.15)',
                boxShadow: i < favoriteBooks.length ? '0 0 6px rgba(255,78,0,0.5)' : 'none',
                transition: 'background 0.3s',
              }} />
            ))}
            <span className="font-bungee" style={{ fontSize: '9px', color: 'rgba(192,192,192,0.4)', letterSpacing: '0.1em', marginLeft: '6px', alignSelf: 'center' }}>
              {favoriteBooks.length}/4
            </span>
          </div>

          {/* Current books (mini strip so user sees what's saved) */}
          {favoriteBooks.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {favoriteBooks.map((b) => {
                const src = b.coverURL || b.cover || null;
                return (
                  <div key={b.id} style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '36px', height: '50px', borderRadius: '3px', overflow: 'hidden', border: '1.5px solid rgba(64,224,208,0.4)' }}>
                      {src
                        ? <img src={src} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', background: '#2A1508', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📖</div>
                      }
                    </div>
                    <button onClick={() => onRemove(b.id)} style={{
                      position: 'absolute', top: '-5px', right: '-5px',
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: '#FF4E00', border: 'none', color: '#1A1B2E',
                      fontSize: '9px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                    }}>×</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search input — fixed, never moves */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={full ? 'Remove a book above to add more' : 'Search title, author...'}
            disabled={full}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: full ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
              border: `1.5px solid ${full ? 'rgba(64,224,208,0.15)' : 'rgba(64,224,208,0.4)'}`,
              borderRadius: '8px', color: full ? 'rgba(192,192,192,0.3)' : '#F5F5DC',
              padding: '10px 14px', fontSize: '15px',
              fontFamily: 'Special Elite, serif', outline: 'none',
              marginBottom: '10px', transition: 'border-color 0.2s',
              cursor: full ? 'not-allowed' : 'text',
            }}
            onFocus={(e) => { if (!full) e.currentTarget.style.borderColor = '#40E0D0'; }}
            onBlur={(e) => e.currentTarget.style.borderColor = full ? 'rgba(64,224,208,0.15)' : 'rgba(64,224,208,0.4)'}
          />
        </div>{/* end fixed header */}

        {/* Results list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {searching && (
            <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.45)', fontSize: '13px', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
              Searching...
            </p>
          )}
          {!searching && query.length > 1 && results.length === 0 && (
            <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.45)', fontSize: '13px', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
              No results found
            </p>
          )}
          {!searching && query.length <= 1 && (
            <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.25)', fontSize: '12px', textAlign: 'center', padding: '24px 0', fontStyle: 'italic' }}>
              Type to search the literary universe...
            </p>
          )}

          {results.map((book) => {
            const added = addedIds.has(book.id);
            return (
              <div key={book.id} style={{
                display: 'flex', gap: '12px', alignItems: 'center',
                padding: '10px', borderRadius: '10px', marginBottom: '8px',
                background: added ? 'rgba(64,224,208,0.06)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${added ? 'rgba(64,224,208,0.25)' : 'rgba(255,255,255,0.07)'}`,
                transition: 'background 0.2s',
              }}>
                {/* Cover thumbnail */}
                <div style={{
                  width: '44px', height: '62px', flexShrink: 0,
                  borderRadius: '3px', overflow: 'hidden',
                  border: '1px solid rgba(64,224,208,0.2)',
                }}>
                  {book.coverURL || book.cover
                    ? <img src={book.coverURL || book.cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: '#2A1508', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📖</div>
                  }
                </div>

                {/* Title + author */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-bungee" style={{
                    fontSize: '10px', color: '#F0E6CC', lineHeight: 1.3,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>{book.title}</p>
                  <p className="font-special-elite" style={{ fontSize: '11px', color: 'rgba(192,192,192,0.55)', marginTop: '3px' }}>
                    {book.author}
                  </p>
                  <span style={{
                    fontSize: '8px', fontFamily: 'Bungee, sans-serif', letterSpacing: '0.06em',
                    color: book.source === 'google' ? 'rgba(64,224,208,0.45)' : 'rgba(255,78,0,0.45)',
                    marginTop: '2px', display: 'block',
                  }}>
                    {book.source === 'google' ? 'GOOGLE BOOKS' : 'OPEN LIBRARY'}
                  </span>
                </div>

                {/* Add / Added button */}
                <button
                  onClick={() => !added && !full && handleAdd(book)}
                  disabled={added || full}
                  className="font-bungee"
                  style={{
                    flexShrink: 0,
                    padding: '7px 11px', borderRadius: '6px', fontSize: '10px',
                    letterSpacing: '0.06em', cursor: added || full ? 'default' : 'pointer',
                    border: added ? '1.5px solid #40E0D0' : 'none',
                    background: added ? 'transparent' : full ? 'rgba(255,78,0,0.2)' : '#FF4E00',
                    color: added ? '#40E0D0' : full ? 'rgba(255,78,0,0.5)' : '#1A1B2E',
                    boxShadow: added ? 'none' : full ? 'none' : '0 0 8px rgba(255,78,0,0.45)',
                  }}
                >
                  {added ? '✓ IN LIST' : full ? 'FULL' : 'ADD'}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ── Main Profile component ──────────────────────────────────────────────────
export default function Profile({ onBack, onShowBookLog, selectedStates = [] }) {
  const { user } = useAuth();

  const [privacyOn, setPrivacyOn] = useState(() => localStorage.getItem('lr-privacy') === 'true');
  const [favoriteBooks, setFavoriteBooks] = useState([]);
  const [tripCount, setTripCount] = useState(0);
  const [visitedCount, setVisitedCount] = useState(0);
  const [showBookModal, setShowBookModal] = useState(false);

  // Real-time sync: onSnapshot fires immediately on mount and on any cross-device change
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setFavoriteBooks(data.favoriteBooks || []);
        setTripCount((data.trip || []).length);
        setVisitedCount((data.visitedStates || []).length);
      },
      (err) => console.error('[Profile] snapshot:', err),
    );
    return unsub;
  }, [user]);

  const saveBooks = async (books) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    try {
      await updateDoc(ref, { favoriteBooks: books });
    } catch (err) {
      if (err.code === 'not-found') {
        await setDoc(ref, { favoriteBooks: books }, { merge: true });
      } else {
        console.error('[Profile] save books:', err);
      }
    }
  };

  const handleAddBook = async (book) => {
    if (favoriteBooks.length >= 4 || favoriteBooks.find((b) => b.id === book.id)) return;
    const updated = [...favoriteBooks, book];
    setFavoriteBooks(updated);
    await saveBooks(updated);
  };

  const handleRemoveBook = async (id) => {
    const updated = favoriteBooks.filter((b) => b.id !== id);
    setFavoriteBooks(updated);
    await saveBooks(updated);
  };

  const handlePrivacyToggle = () => {
    const next = !privacyOn;
    setPrivacyOn(next);
    localStorage.setItem('lr-privacy', String(next));
  };

  const displayName = user?.displayName || 'Literary Traveler';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      className="h-screen flex flex-col items-center justify-start px-4 py-8 overflow-y-auto"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #2D1B69 0%, #1A1B2E 60%, #0D0E1A 100%)' }}
    >
      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-6">
        <button onClick={onBack} className="font-special-elite text-chrome-silver hover:text-starlight-turquoise text-sm transition-colors">
          ← Back
        </button>
        <h1 className="font-bungee text-xl md:text-2xl" style={{ color: '#40E0D0', textShadow: '0 0 15px rgba(64,224,208,0.7)' }}>
          TRAVELER'S LOG
        </h1>
        <div className="w-12" />
      </div>

      {/* Profile card */}
      <div className="w-full max-w-lg rounded-2xl p-[2px] mb-5"
        style={{ background: 'linear-gradient(135deg, #40E0D0 0%, #FF4E00 100%)', boxShadow: '0 0 25px rgba(64,224,208,0.3)' }}>
        <div className="rounded-2xl p-6 flex items-center gap-4" style={{ background: '#1E1F33' }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="avatar" className="w-16 h-16 rounded-full flex-shrink-0"
              style={{ border: '3px solid #40E0D0', boxShadow: '0 0 12px rgba(64,224,208,0.6)' }} />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 font-bungee text-2xl"
              style={{ background: '#1A1B2E', border: '3px solid #40E0D0', boxShadow: '0 0 12px rgba(64,224,208,0.6)', color: '#40E0D0' }}>
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bungee text-paper-white text-base truncate">{displayName}</p>
            <p className="font-special-elite text-xs truncate mt-0.5" style={{ color: 'rgba(192,192,192,0.45)' }}>
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Stats + Book Log row */}
      <div className="w-full max-w-lg grid grid-cols-2 gap-3 mb-5">
        {/* Stops Saved stat */}
        <div className="rounded-xl p-4 flex flex-col items-center gap-1"
          style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}>
          <span className="text-2xl">📍</span>
          <span className="font-bungee text-2xl" style={{ color: '#FF4E00', textShadow: '0 0 10px rgba(255,78,0,0.5)' }}>{tripCount}</span>
          <span className="font-special-elite text-chrome-silver text-xs text-center">Stops Saved</span>
        </div>

        {/* BOOK LOG — image button */}
        <button
          onClick={onShowBookLog}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            transition: 'transform 0.2s ease, filter 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.filter = 'drop-shadow(0 0 10px rgba(64,224,208,0.7))';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.filter = 'none';
          }}
        >
          <img
            src="/literary-roads/images/book_log.png"
            alt="Book Log"
            style={{ width: '120px', display: 'block' }}
          />
        </button>
      </div>

      {/* ── Favorite Books ── (above stops so it's always visible on mobile) */}
      <div className="w-full max-w-lg rounded-xl p-5 mb-5" style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bungee text-sm" style={{ color: '#40E0D0', textShadow: '0 0 8px rgba(64,224,208,0.5)' }}>
            FAVORITE BOOKS
          </h2>
          <button
            onClick={() => setShowBookModal(true)}
            className="font-bungee text-xs px-3 py-1 rounded-full"
            style={{
              background: favoriteBooks.length >= 4 ? 'transparent' : '#FF4E00',
              color: favoriteBooks.length >= 4 ? '#40E0D0' : '#1A1B2E',
              boxShadow: favoriteBooks.length >= 4 ? 'none' : '0 0 10px rgba(255,78,0,0.45)',
              border: favoriteBooks.length >= 4 ? '1.5px solid rgba(64,224,208,0.5)' : 'none',
              cursor: 'pointer',
            }}
          >
            {favoriteBooks.length >= 4 ? 'EDIT BOOKS' : '+ ADD'}
          </button>
        </div>

        {favoriteBooks.length === 0 ? (
          <p className="font-special-elite text-sm text-center py-3 italic" style={{ color: 'rgba(192,192,192,0.35)' }}>
            No favorites yet — add up to 4 books
          </p>
        ) : (
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: '16px', paddingTop: '18px', paddingBottom: '4px',
          }}>
            {favoriteBooks.map((book) => (
              <BookCover key={book.id} book={book} onRemove={handleRemoveBook} />
            ))}
            {favoriteBooks.length < 4 && (
              <button
                onClick={() => setShowBookModal(true)}
                style={{
                  flexShrink: 0, width: '88px', height: '124px',
                  borderRadius: '5px', border: '2px dashed rgba(64,224,208,0.25)',
                  background: 'transparent', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', color: 'rgba(64,224,208,0.4)', transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(64,224,208,0.6)'; e.currentTarget.style.color = 'rgba(64,224,208,0.7)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(64,224,208,0.25)'; e.currentTarget.style.color = 'rgba(64,224,208,0.4)'; }}
              >
                <span style={{ fontSize: '26px' }}>+</span>
                <span className="font-bungee" style={{ fontSize: '8px', letterSpacing: '0.08em' }}>ADD BOOK</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Privacy toggle */}
      <div className="w-full max-w-lg rounded-xl p-4 mb-5 flex items-center justify-between"
        style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}>
        <div>
          <p className="font-bungee text-paper-white text-xs">PRIVATE PROFILE</p>
          <p className="font-special-elite text-chrome-silver text-xs mt-0.5">Hide your trips from others</p>
        </div>
        <button onClick={handlePrivacyToggle} className="w-11 h-6 rounded-full relative transition-all flex-shrink-0"
          style={{ background: privacyOn ? '#40E0D0' : '#3A3B55' }}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
            style={{ left: privacyOn ? '22px' : '2px' }} />
        </button>
      </div>

      {/* ALA Attribution */}
      <div className="w-full max-w-lg rounded-xl p-4 mb-5 text-center"
        style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}>
        <p className="font-special-elite text-chrome-silver text-xs leading-relaxed">
          Literary landmarks courtesy of the{' '}
          <a
            href="https://www.ala.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-starlight-turquoise hover:text-atomic-orange transition-colors underline"
          >
            American Library Association's Literary Landmarks Registry
          </a>
        </p>
      </div>

      {/* Book search modal */}
      {showBookModal && (
        <BookModal
          favoriteBooks={favoriteBooks}
          onAdd={handleAddBook}
          onRemove={handleRemoveBook}
          onClose={() => setShowBookModal(false)}
        />
      )}
    </div>
  );
}
