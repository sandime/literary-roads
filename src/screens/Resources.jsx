import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, onSnapshot, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { SparkleIcon } from '../components/Icons';

const MAX_FAVORITES = 5;

// ── Inline Starburst SVG (Googie atomic accent) ────────────────────────────
function Starburst({ color = '#FF4E00', size = 32, style = {} }) {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI) / 8;
    const r = i % 2 === 0 ? size / 2 : size / 4.5;
    return `${size / 2 + r * Math.cos(angle)},${size / 2 + r * Math.sin(angle)}`;
  }).join(' ');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'inline-block', flexShrink: 0, ...style }}>
      <polygon points={pts} fill={color} opacity="0.9" />
    </svg>
  );
}

// ── Surprise Me ────────────────────────────────────────────────────────────

const GENRES = [
  'Fiction', 'Mystery & Thriller', 'Romance', 'Science Fiction', 'Fantasy',
  'Historical Fiction', 'Literary Fiction', 'Memoir & Biography', 'Poetry',
  'Young Adult', 'Horror', 'Classics',
];

const BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
const SURPRISE_CACHE_TTL = 24 * 60 * 60 * 1000;

function getSurpriseCache(genre) {
  try {
    const raw = localStorage.getItem(`lr_surprise_${genre}`);
    if (!raw) return null;
    const { book, ts } = JSON.parse(raw);
    if (Date.now() - ts > SURPRISE_CACHE_TTL) { localStorage.removeItem(`lr_surprise_${genre}`); return null; }
    return book;
  } catch { return null; }
}

function setSurpriseCache(genre, book) {
  try { localStorage.setItem(`lr_surprise_${genre}`, JSON.stringify({ book, ts: Date.now() })); } catch {}
}

async function fetchSurpriseFromOpenLibrary(genre) {
  const url = `https://openlibrary.org/search.json?q=subject:"${encodeURIComponent(genre)}"&limit=20&fields=key,title,author_name,cover_i,first_sentence`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('ol fetch failed');
  const data = await res.json();
  const docs = (data.docs || []).filter(d => d.cover_i);
  if (!docs.length) throw new Error('no ol results');
  const doc = docs[Math.floor(Math.random() * docs.length)];
  return {
    id: `ol_${doc.key}`,
    title: doc.title || 'Unknown Title',
    author: doc.author_name?.[0] || 'Unknown Author',
    description: typeof doc.first_sentence === 'string' ? doc.first_sentence : '',
    coverURL: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
    averageRating: null,
    ratingsCount: null,
    genre,
  };
}

async function fetchSurpriseBook() {
  const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
  const cached = getSurpriseCache(genre);
  if (cached) return cached;

  let book;
  try {
    const startIndex = Math.floor(Math.random() * 20) * 10; // 0–190
    const key = BOOKS_API_KEY ? `&key=${BOOKS_API_KEY}` : '';
    const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(genre)}&startIndex=${startIndex}&maxResults=10&printType=books&langRestrict=en${key}`;
    const res = await fetch(url);
    if (res.status === 429) throw new Error('rate_limited');
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    const items = (data.items || []).filter(item => item.volumeInfo?.imageLinks?.thumbnail);
    if (!items.length) throw new Error('no results');
    const item = items[Math.floor(Math.random() * items.length)];
    const v = item.volumeInfo;
    book = {
      id: `g_${item.id}`,
      title: v.title || 'Unknown Title',
      author: v.authors?.[0] || 'Unknown Author',
      description: v.description || '',
      coverURL: v.imageLinks.thumbnail.replace('http:', 'https:'),
      averageRating: v.averageRating || null,
      ratingsCount: v.ratingsCount || null,
      genre,
    };
  } catch {
    // Silently fall back to Open Library (no rate limits)
    book = await fetchSurpriseFromOpenLibrary(genre);
  }

  setSurpriseCache(genre, book);
  return book;
}


function SurpriseMe({ user }) {
  const [status, setStatus]         = useState('idle'); // idle | loading | result | error
  const [book, setBook]             = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | duplicate | error

  const handleSurprise = async () => {
    setStatus('loading');
    setBook(null);
    setSaveStatus('idle');
    try {
      setBook(await fetchSurpriseBook());
      setStatus('result');
    } catch {
      // Retry once (Open Library may also return empty on first try)
      try {
        setBook(await fetchSurpriseBook());
        setStatus('result');
      } catch {
        setStatus('error');
      }
    }
  };

  const handleSaveForLater = async () => {
    if (!user || !book || saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      const docId = book.id.replace(/\//g, '_');
      const ref = doc(db, 'users', user.uid, 'wantToRead', docId);
      const snap = await getDoc(ref);
      if (snap.exists()) { setSaveStatus('duplicate'); return; }
      await setDoc(ref, {
        bookTitle:   book.title,
        bookAuthor:  book.author,
        bookCover:   book.coverURL || null,
        genre:       book.genre,
        description: book.description || '',
        googleBooksId: book.id,
        savedAt:     serverTimestamp(),
        read:        false,
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const renderStars = (avg, count) => {
    if (!avg) return null;
    const full = Math.round(avg);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '14px' }}>
          {'⭐'.repeat(full)}{'☆'.repeat(5 - full)}
        </span>
        <span style={{ fontFamily: 'Special Elite, serif', fontSize: '12px', color: 'rgba(200,155,70,0.7)' }}>
          {avg.toFixed(1)}{count ? ` (${count.toLocaleString()} ratings)` : ''}
        </span>
      </div>
    );
  };

  return (
    <section style={{ marginBottom: '44px' }}>
      {/* Googie section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Starburst color="#FF4E00" size={28} />
        <h2 style={{
          fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(14px, 2.5vw, 18px)',
          color: '#FF4E00', letterSpacing: '0.08em', margin: 0,
          textShadow: '0 0 16px rgba(255,78,0,0.6)',
        }}>
          SURPRISE ME WITH A BOOK!
        </h2>
        <Starburst color="#FF4E00" size={20} style={{ opacity: 0.5 }} />
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(255,78,0,0.4), transparent)' }} />
      </div>

      {status === 'idle' && (
        <div style={{
          background: 'rgba(255,78,0,0.04)',
          border: '1.5px dashed rgba(255,78,0,0.3)',
          borderRadius: '14px', padding: '28px 20px', textAlign: 'center',
        }}>
          <p style={{
            fontFamily: 'Special Elite, serif', fontSize: '14px',
            color: 'rgba(245,245,220,0.65)', marginBottom: '20px', lineHeight: 1.6,
          }}>
            Need your next read? Let us surprise you with a random book pick!
          </p>
          <button onClick={handleSurprise} style={{
            fontFamily: 'Bungee, sans-serif', fontSize: '15px', letterSpacing: '0.08em',
            background: '#FF4E00', color: '#1A1B2E', border: 'none', borderRadius: '12px',
            padding: '14px 32px', cursor: 'pointer',
            boxShadow: '0 0 24px rgba(255,78,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
            transition: 'transform .1s, box-shadow .1s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(255,78,0,0.7), 0 4px 12px rgba(0,0,0,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(255,78,0,0.5), 0 4px 12px rgba(0,0,0,0.3)'; }}
          >
            SURPRISE ME!
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div style={{
          background: 'rgba(255,78,0,0.04)', border: '1.5px dashed rgba(255,78,0,0.3)',
          borderRadius: '14px', padding: '40px 20px', textAlign: 'center',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '3px solid rgba(255,78,0,0.2)', borderTopColor: '#FF4E00',
            margin: '0 auto 16px',
            animation: 'lr-spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes lr-spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: '13px', color: 'rgba(200,155,70,0.6)', fontStyle: 'italic' }}>
            Searching the stacks…
          </p>
        </div>
      )}

      {status === 'error' && (
        <div style={{
          background: 'rgba(255,78,0,0.04)', border: '1.5px dashed rgba(255,78,0,0.3)',
          borderRadius: '14px', padding: '28px 20px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: '13px', color: 'rgba(200,155,70,0.6)', marginBottom: '16px' }}>
            Couldn't find a book right now — try again!
          </p>
          <button onClick={handleSurprise} style={{
            fontFamily: 'Bungee, sans-serif', fontSize: '13px', letterSpacing: '0.06em',
            background: '#FF4E00', color: '#1A1B2E', border: 'none', borderRadius: '10px',
            padding: '12px 24px', cursor: 'pointer',
            boxShadow: '0 0 16px rgba(255,78,0,0.4)',
          }}>
            TRY AGAIN
          </button>
        </div>
      )}

      {status === 'result' && book && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1.5px solid rgba(255,78,0,0.35)',
          borderRadius: '16px', overflow: 'hidden',
          boxShadow: '0 0 28px rgba(255,78,0,0.12)',
        }}>
          {/* Genre badge */}
          <div style={{
            background: 'rgba(255,78,0,0.12)',
            borderBottom: '1px solid rgba(255,78,0,0.2)',
            padding: '8px 16px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Starburst color="#FF4E00" size={16} />
            <span style={{
              fontFamily: 'Bungee, sans-serif', fontSize: '10px',
              color: '#FF4E00', letterSpacing: '0.1em',
            }}>
              YOUR SURPRISE BOOK! &nbsp;·&nbsp; Genre: {book.genre}
            </span>
          </div>

          {/* Book content */}
          <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Cover */}
            <div style={{ flexShrink: 0 }}>
              <img
                src={book.coverURL}
                alt={book.title}
                style={{
                  width: '110px', height: '165px', objectFit: 'cover',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.6), 0 0 12px rgba(255,78,0,0.2)',
                }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: '180px' }}>
              <h3 style={{
                fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(14px, 2.5vw, 18px)',
                color: '#F5F5DC', letterSpacing: '0.03em',
                lineHeight: 1.25, marginBottom: '6px',
              }}>
                {book.title}
              </h3>
              <p style={{
                fontFamily: 'Special Elite, serif', fontSize: '13px',
                color: 'rgba(200,155,70,0.75)', marginBottom: '10px',
              }}>
                by {book.author}
              </p>

              {renderStars(book.averageRating, book.ratingsCount) && (
                <div style={{ marginBottom: '10px' }}>
                  {renderStars(book.averageRating, book.ratingsCount)}
                </div>
              )}

              {book.description && (
                <p style={{
                  fontFamily: 'Special Elite, serif', fontSize: '12px',
                  color: 'rgba(245,245,220,0.6)', lineHeight: 1.6,
                  display: '-webkit-box', WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {book.description}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ padding: '12px 20px 20px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Save for Later */}
            {saveStatus === 'saved' ? (
              <span style={{
                fontFamily: 'Bungee, sans-serif', fontSize: '11px', letterSpacing: '0.06em',
                color: '#40E0D0', padding: '10px 4px',
                filter: 'drop-shadow(0 0 6px rgba(64,224,208,0.6))',
              }}>
                ✓ SAVED TO READING LIST!
              </span>
            ) : saveStatus === 'duplicate' ? (
              <span style={{
                fontFamily: 'Bungee, sans-serif', fontSize: '11px',
                color: 'rgba(255,179,71,0.8)', padding: '10px 4px',
              }}>
                ALREADY ON YOUR LIST
              </span>
            ) : saveStatus === 'error' ? (
              <span style={{
                fontFamily: 'Special Elite, serif', fontSize: '12px',
                color: '#FF4E00', padding: '10px 0', fontStyle: 'italic',
              }}>
                Couldn't save — try again
              </span>
            ) : user ? (
              <button
                onClick={handleSaveForLater}
                disabled={saveStatus === 'saving'}
                style={{
                  fontFamily: 'Bungee, sans-serif', fontSize: '11px', letterSpacing: '0.06em',
                  background: 'transparent', color: '#40E0D0',
                  border: '1.5px solid rgba(64,224,208,0.5)', borderRadius: '8px',
                  padding: '10px 16px', cursor: saveStatus === 'saving' ? 'default' : 'pointer',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { if (saveStatus !== 'saving') e.currentTarget.style.background = 'rgba(64,224,208,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {saveStatus === 'saving' ? 'SAVING…' : 'SAVE FOR LATER'}
              </button>
            ) : (
              <span style={{
                fontFamily: 'Special Elite, serif', fontSize: '12px',
                color: 'rgba(200,155,70,0.55)', fontStyle: 'italic',
                padding: '10px 0',
              }}>
                Log in to save this book
              </span>
            )}

            {/* Surprise Me Again */}
            <button onClick={handleSurprise}
              style={{
                fontFamily: 'Bungee, sans-serif', fontSize: '11px', letterSpacing: '0.06em',
                background: '#FF4E00', color: '#1A1B2E',
                border: 'none', borderRadius: '8px',
                padding: '10px 14px', cursor: 'pointer',
                boxShadow: '0 0 12px rgba(255,78,0,0.4)',
                marginLeft: 'auto',
              }}>
              SURPRISE ME AGAIN!
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Want to Read Carousel ──────────────────────────────────────────────────

// Scroll advance distance (≈ 4 card widths + gaps)
const CAROUSEL_SCROLL_STEP = 620;

function BookDetailModal({ book, onClose, onRemove, onMarkRead }) {
  const [markStatus, setMarkStatus] = useState('idle'); // idle | saving | done
  const [removeStatus, setRemoveStatus] = useState('idle');

  const handleMarkRead = async () => {
    if (markStatus === 'saving') return;
    setMarkStatus('saving');
    try {
      const docId = book.id.replace(/\//g, '_');
      await setDoc(doc(db, 'users', book._uid, 'booksRead', docId), {
        bookTitle:     book.bookTitle,
        bookAuthor:    book.bookAuthor,
        bookCover:     book.bookCover || null,
        googleBooksId: book.id,
        rating: 0,
        finishedMonth: '',
        finishedYear: '',
        format: 'read',
        timestamp: serverTimestamp(),
      });
      await deleteDoc(doc(db, 'users', book._uid, 'wantToRead', docId));
      setMarkStatus('done');
      setTimeout(() => { onMarkRead(book.id); onClose(); }, 800);
    } catch {
      setMarkStatus('idle');
    }
  };

  const handleRemove = async () => {
    if (removeStatus === 'saving') return;
    setRemoveStatus('saving');
    try {
      const docId = book.id.replace(/\//g, '_');
      await deleteDoc(doc(db, 'users', book._uid, 'wantToRead', docId));
      onRemove(book.id);
      onClose();
    } catch {
      setRemoveStatus('idle');
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0D0E1A', border: '1.5px solid rgba(64,224,208,0.35)',
          borderRadius: '16px', maxWidth: '420px', width: '100%',
          maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 0 40px rgba(64,224,208,0.15), 0 20px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* Cover hero */}
        {book.bookCover && (
          <div style={{ textAlign: 'center', padding: '24px 24px 0', background: 'rgba(255,255,255,0.02)' }}>
            <img src={book.bookCover} alt={book.bookTitle}
              style={{
                height: '180px', borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                display: 'inline-block',
              }}
            />
          </div>
        )}

        {/* Info */}
        <div style={{ padding: '20px 24px' }}>
          <h2 style={{
            fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(14px,3vw,18px)',
            color: '#F5F5DC', lineHeight: 1.25, marginBottom: '6px',
          }}>
            {book.bookTitle}
          </h2>
          <p style={{
            fontFamily: 'Special Elite, serif', fontSize: '13px',
            color: 'rgba(200,155,70,0.75)', marginBottom: '10px',
          }}>
            by {book.bookAuthor}
          </p>

          {book.genre && (
            <span style={{
              fontFamily: 'Bungee, sans-serif', fontSize: '9px', letterSpacing: '0.08em',
              color: '#40E0D0', background: 'rgba(64,224,208,0.1)',
              border: '1px solid rgba(64,224,208,0.3)', borderRadius: '4px',
              padding: '2px 8px', display: 'inline-block', marginBottom: '12px',
            }}>
              {book.genre}
            </span>
          )}

          {book.description && (
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: '12px',
              color: 'rgba(245,245,220,0.6)', lineHeight: 1.7,
              marginBottom: '20px',
              display: '-webkit-box', WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {book.description}
            </p>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={handleMarkRead} disabled={markStatus !== 'idle'}
              style={{
                fontFamily: 'Bungee, sans-serif', fontSize: '12px', letterSpacing: '0.06em',
                background: markStatus === 'done' ? '#40E0D0' : 'rgba(64,224,208,0.15)',
                color: '#40E0D0', border: '1.5px solid rgba(64,224,208,0.5)',
                borderRadius: '10px', padding: '12px', cursor: markStatus !== 'idle' ? 'default' : 'pointer',
                transition: 'background .2s',
              }}>
              {markStatus === 'saving' ? 'SAVING…' : markStatus === 'done' ? '✓ MOVED TO BOOK LOG!' : 'MARK AS READ'}
            </button>
            <button onClick={handleRemove} disabled={removeStatus === 'saving'}
              style={{
                fontFamily: 'Bungee, sans-serif', fontSize: '12px', letterSpacing: '0.06em',
                background: 'transparent', color: 'rgba(255,78,0,0.7)',
                border: '1.5px solid rgba(255,78,0,0.3)', borderRadius: '10px',
                padding: '12px', cursor: removeStatus === 'saving' ? 'default' : 'pointer',
                transition: 'background .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,78,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {removeStatus === 'saving' ? 'REMOVING…' : 'REMOVE FROM LIST'}
            </button>
            <button onClick={onClose}
              style={{
                fontFamily: 'Special Elite, serif', fontSize: '13px',
                background: 'transparent', color: 'rgba(192,192,192,0.4)',
                border: 'none', cursor: 'pointer', padding: '8px',
              }}>
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WantToReadCarousel({ user }) {
  const [books, setBooks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'wantToRead'), snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, _uid: user.uid, ...d.data() }))
        .sort((a, b) => (b.savedAt?.toMillis?.() ?? 0) - (a.savedAt?.toMillis?.() ?? 0));
      setBooks(data);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  const handleRemove = (id) => setBooks(prev => prev.filter(b => b.id !== id));
  const doScroll = (dir) => scrollRef.current?.scrollBy({ left: dir * CAROUSEL_SCROLL_STEP, behavior: 'smooth' });

  if (!user) return null;

  return (
    <section style={{ marginBottom: '44px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Starburst color="#40E0D0" size={24} />
        <h2 style={{
          fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(14px, 2.5vw, 18px)',
          color: '#40E0D0', letterSpacing: '0.08em', margin: 0,
          textShadow: '0 0 12px rgba(64,224,208,0.5)', whiteSpace: 'nowrap',
        }}>
          NEXT READS
        </h2>
        {!loading && books.length > 0 && (
          <span style={{
            fontFamily: 'Bungee, sans-serif', fontSize: '10px',
            color: 'rgba(64,224,208,0.55)', letterSpacing: '0.06em', whiteSpace: 'nowrap',
          }}>
            ({books.length} saved)
          </span>
        )}
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(64,224,208,0.4), transparent)' }} />
      </div>

      {loading ? (
        <p style={{
          fontFamily: 'Special Elite, serif', fontSize: '13px',
          color: 'rgba(200,155,70,0.5)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0',
        }}>
          Loading your reading list…
        </p>
      ) : books.length === 0 ? (
        <div style={{
          background: 'rgba(64,224,208,0.03)', border: '1px dashed rgba(64,224,208,0.2)',
          borderRadius: '12px', padding: '24px', textAlign: 'center',
        }}>
          <Starburst color="rgba(64,224,208,0.3)" size={36} style={{ marginBottom: '8px' }} />
          <p style={{
            fontFamily: 'Special Elite, serif', fontSize: '13px',
            color: 'rgba(200,155,70,0.55)', lineHeight: 1.6, fontStyle: 'italic',
          }}>
            No books saved yet! Click Surprise Me to discover your next read.
          </p>
        </div>
      ) : (
        /* Carousel — all books, arrows advance ~4 cards */
        <div style={{ position: 'relative' }}>
          {/* Left arrow */}
          <button onClick={() => doScroll(-1)}
            style={{
              position: 'absolute', left: '-14px', top: '45%', transform: 'translateY(-50%)',
              zIndex: 2, background: 'rgba(13,14,26,0.9)', border: '1px solid rgba(64,224,208,0.3)',
              borderRadius: '50%', width: '32px', height: '32px',
              color: '#40E0D0', fontSize: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px rgba(64,224,208,0.2)',
            }}>‹</button>

          <div ref={scrollRef} style={{
            display: 'flex', gap: '12px',
            overflowX: 'auto', scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
            paddingBottom: '4px',
          }}>
            <style>{`#lr-wtr-scroll::-webkit-scrollbar { display: none; }`}</style>
            {books.map(book => (
              <BookCarouselCard key={book.id} book={book} onOpen={setModal} onRemove={handleRemove} uid={user.uid} />
            ))}
          </div>

          {/* Right arrow */}
          <button onClick={() => doScroll(1)}
            style={{
              position: 'absolute', right: '-14px', top: '45%', transform: 'translateY(-50%)',
              zIndex: 2, background: 'rgba(13,14,26,0.9)', border: '1px solid rgba(64,224,208,0.3)',
              borderRadius: '50%', width: '32px', height: '32px',
              color: '#40E0D0', fontSize: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px rgba(64,224,208,0.2)',
            }}>›</button>
        </div>
      )}

      {modal && (
        <BookDetailModal
          book={modal}
          onClose={() => setModal(null)}
          onRemove={(id) => { handleRemove(id); setModal(null); }}
          onMarkRead={(id) => { handleRemove(id); setModal(null); }}
        />
      )}
    </section>
  );
}

function BookCarouselCard({ book, onOpen, onRemove, uid }) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async (e) => {
    e.stopPropagation();
    if (removing) return;
    setRemoving(true);
    try {
      await deleteDoc(doc(db, 'users', uid, 'wantToRead', book.id));
      onRemove(book.id);
    } catch {
      setRemoving(false);
    }
  };

  return (
    <div
      onClick={() => onOpen(book)}
      style={{
        flexShrink: 0,
        width: 'clamp(110px, 22vw, 140px)',
        scrollSnapAlign: 'start',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {/* Cover */}
      <div style={{
        width: '100%', aspectRatio: '2/3',
        borderRadius: '8px', overflow: 'hidden',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(64,224,208,0.15)',
        marginBottom: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        transition: 'box-shadow .2s, transform .2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(64,224,208,0.3)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {book.bookCover ? (
          <img src={book.bookCover} alt={book.bookTitle}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.style.background = 'rgba(64,224,208,0.08)'; }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(64,224,208,0.05)',
          }}>
            <Starburst color="rgba(64,224,208,0.25)" size={40} />
          </div>
        )}
      </div>

      {/* Remove × */}
      <button
        onClick={handleRemove}
        title="Remove from list"
        style={{
          position: 'absolute', top: '4px', right: '4px',
          width: '20px', height: '20px', borderRadius: '50%',
          background: 'rgba(13,14,26,0.85)', border: '1px solid rgba(255,78,0,0.4)',
          color: 'rgba(255,78,0,0.7)', fontSize: '11px', lineHeight: 1,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: removing ? 0.4 : 0.7,
          transition: 'opacity .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = removing ? '0.4' : '0.7'; }}
      >
        ×
      </button>

      {/* Title + author */}
      <p style={{
        fontFamily: 'Bungee, sans-serif', fontSize: '10px',
        color: '#F5F5DC', letterSpacing: '0.02em',
        lineHeight: 1.3, marginBottom: '3px',
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {book.bookTitle}
      </p>
      <p style={{
        fontFamily: 'Special Elite, serif', fontSize: '10px',
        color: 'rgba(200,155,70,0.6)', lineHeight: 1.3,
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      }}>
        {book.bookAuthor}
      </p>
    </div>
  );
}

// ── Coming-soon sections ───────────────────────────────────────────────────
const COMING_SOON = [
  { label: 'Literary Trivia',       desc: 'Test your knowledge of authors, novels, and hidden history.' },
  { label: 'Reading Challenges',    desc: 'Road-trip themed reading lists and trackable challenges.' },
  { label: 'Author Hometown Tours', desc: 'Self-guided walking tours of literary cities.' },
  { label: 'Bookshop Guides',       desc: 'Curated independent bookshop picks by state.' },
];

// ── Star icon ──────────────────────────────────────────────────────────────
function StarIcon({ filled }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
      fill={filled ? '#FFD700' : 'none'}
      stroke={filled ? '#FFD700' : 'rgba(200,155,70,0.5)'}
      strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', transition: 'fill .15s, stroke .15s' }}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ label, color, glowColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
      <h2 style={{
        fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(14px, 2.5vw, 18px)',
        color, letterSpacing: '0.08em', margin: 0,
        textShadow: `0 0 12px ${glowColor}`,
      }}>
        {label}
      </h2>
      <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, ${glowColor.replace('0.5', '0.4')}, transparent)` }} />
    </div>
  );
}

// ── PodcastCard ────────────────────────────────────────────────────────────
function PodcastCard({ podcast, isFavorited, onToggle, canFavorite, isLoggedIn }) {
  const [hovered, setHovered] = useState(false);
  const [starHovered, setStarHovered] = useState(false);

  const handleStarClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(podcast.id);
  };

  return (
    <div style={{ position: 'relative' }}>
      <a
        href={podcast.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', display: 'block' }}
      >
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: isFavorited ? 'rgba(255,215,0,0.04)' : 'rgba(255,255,255,0.03)',
            border: `1.5px solid ${isFavorited ? 'rgba(255,215,0,0.35)' : hovered ? '#40E0D0' : 'rgba(64,224,208,0.2)'}`,
            borderRadius: '12px',
            padding: '16px 48px 16px 18px', // right padding for star button
            display: 'flex', gap: '14px', alignItems: 'flex-start',
            boxShadow: isFavorited
              ? '0 0 16px rgba(255,215,0,0.1)'
              : hovered ? '0 0 16px rgba(64,224,208,0.15)' : 'none',
            transition: 'border-color .2s, background .2s, box-shadow .2s',
          }}
        >
          {/* Emoji icon */}
          <div style={{
            fontSize: '28px', lineHeight: 1, flexShrink: 0,
            width: '44px', height: '44px',
            background: 'rgba(64,224,208,0.08)',
            border: '1px solid rgba(64,224,208,0.2)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {podcast.emoji}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
              <span style={{
                fontFamily: 'Bungee, sans-serif', fontSize: '13px',
                color: '#F5F5DC', letterSpacing: '0.04em',
              }}>
                {podcast.title}
              </span>
              <span style={{
                fontFamily: 'Bungee, sans-serif', fontSize: '8px',
                letterSpacing: '0.08em', color: '#40E0D0',
                background: 'rgba(64,224,208,0.12)',
                border: '1px solid rgba(64,224,208,0.3)',
                borderRadius: '4px', padding: '1px 6px',
                whiteSpace: 'nowrap',
              }}>
                {podcast.tag}
              </span>
            </div>
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: '11px',
              color: 'rgba(200,155,70,0.7)', marginBottom: '6px',
            }}>
              Hosted by {podcast.host}
            </p>
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: '12px',
              color: 'rgba(245,245,220,0.65)', lineHeight: 1.5, margin: 0,
            }}>
              {podcast.description}
            </p>
          </div>

          {/* Arrow */}
          <div style={{ flexShrink: 0, color: 'rgba(64,224,208,0.45)', fontSize: '16px', marginTop: '2px' }}>
            ↗
          </div>
        </div>
      </a>

      {/* ── Star button (outside <a> to avoid nested interactive elements) ── */}
      {isLoggedIn && (
        <button
          onClick={handleStarClick}
          onMouseEnter={() => setStarHovered(true)}
          onMouseLeave={() => setStarHovered(false)}
          title={isFavorited ? 'Remove from favorites' : canFavorite ? 'Add to favorites' : `Maximum ${MAX_FAVORITES} favorites`}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'transparent', border: 'none',
            cursor: isFavorited || canFavorite ? 'pointer' : 'not-allowed',
            padding: '4px',
            borderRadius: '6px',
            opacity: !isFavorited && !canFavorite ? 0.4 : 1,
            // Glow when favorited
            filter: isFavorited
              ? 'drop-shadow(0 0 6px rgba(255,215,0,0.8)) drop-shadow(0 0 12px rgba(255,215,0,0.4))'
              : starHovered && canFavorite
              ? 'drop-shadow(0 0 4px rgba(255,215,0,0.5))'
              : 'none',
            transition: 'filter .15s, opacity .15s',
          }}
        >
          <StarIcon filled={isFavorited} />
        </button>
      )}
    </div>
  );
}

// ── Toast message ──────────────────────────────────────────────────────────
function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999,
      background: 'rgba(13,14,26,0.96)',
      border: '1.5px solid rgba(255,78,0,0.6)',
      borderRadius: '10px',
      padding: '10px 18px',
      display: 'flex', alignItems: 'center', gap: '10px',
      boxShadow: '0 0 20px rgba(255,78,0,0.3), 0 4px 16px rgba(0,0,0,0.5)',
      animation: 'lr-toast-in .2s ease',
      whiteSpace: 'nowrap',
    }}>
      <style>{`
        @keyframes lr-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <span style={{ fontSize: '16px' }}>⭐</span>
      <span style={{ fontFamily: 'Special Elite, serif', fontSize: '13px', color: '#F5F5DC' }}>
        {message}
      </span>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent', border: 'none',
          color: 'rgba(200,155,70,0.6)', cursor: 'pointer',
          fontSize: '16px', lineHeight: 1, padding: '0 0 0 4px',
        }}
      >×</button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Resources({ onBack }) {
  const { user } = useAuth();
  const [podcasts,  setPodcasts]  = useState([]);
  const [podLoading, setPodLoading] = useState(true);
  const [favIds,    setFavIds]    = useState([]);   // string[]
  const [toast,     setToast]     = useState(null); // string | null
  const [saving,    setSaving]    = useState(false);

  // Fetch podcasts from Firestore literary_podcasts collection
  useEffect(() => {
    console.log('[Resources] Fetching literary_podcasts from Firestore…');
    getDocs(collection(db, 'literary_podcasts'))
      .then((snap) => {
        console.log(`[Resources] Got ${snap.size} podcast docs`);
        const data = snap.docs.map((d) => {
          const p = d.data();
          return {
            id: d.id,
            title: p.title || '',
            host: p.host || '',
            description: p.description || '',
            url: p.url || '#',
            emoji: p.emoji || '🎙️',
            // Firestore stores tags as array; PodcastCard renders a single tag string
            tag: Array.isArray(p.tags) ? p.tags[0] || '' : (p.tags || ''),
          };
        });
        console.log('[Resources] Podcasts loaded:', data.map((p) => p.title));
        setPodcasts(data);
      })
      .catch((err) => {
        console.error('[Resources] Failed to load podcasts — code:', err.code, '| message:', err.message);
      })
      .finally(() => setPodLoading(false));
  }, []);

  // Real-time sync with Firestore (same pattern as Profile)
  useEffect(() => {
    if (!user) { setFavIds([]); return; }
    const ref  = doc(db, 'users', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setFavIds(snap.data()?.favoritePodcasts || []);
    });
    return unsub;
  }, [user]);

  // Persist to Firestore
  const persist = async (updated) => {
    if (!user || saving) return;
    setSaving(true);
    const ref = doc(db, 'users', user.uid);
    try {
      await updateDoc(ref, { favoritePodcasts: updated });
    } catch {
      await setDoc(ref, { favoritePodcasts: updated }, { merge: true });
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorite = (id) => {
    if (!user) return;
    const isFav = favIds.includes(id);
    if (!isFav && favIds.length >= MAX_FAVORITES) {
      setToast(`Maximum ${MAX_FAVORITES} favorites — remove one to add another`);
      return;
    }
    const updated = isFav
      ? favIds.filter((x) => x !== id)
      : [...favIds, id];
    setFavIds(updated);   // optimistic update
    persist(updated);
  };

  const favPodcasts   = podcasts.filter((p) => favIds.includes(p.id));
  const otherPodcasts = podcasts.filter((p) => !favIds.includes(p.id));
  const canFavorite   = favIds.length < MAX_FAVORITES;

  const cardProps = (p) => ({
    podcast: p,
    isFavorited: favIds.includes(p.id),
    onToggle: toggleFavorite,
    canFavorite,
    isLoggedIn: !!user,
  });

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at 50% 0%, #0e1030 0%, #090A1A 45%, #04050F 100%)',
      color: '#F5F5DC',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>

      {/* ── Header bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(13,14,26,0.95)',
        borderBottom: '2px solid #40E0D0',
        backdropFilter: 'blur(10px)',
        padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        height: '56px',
        boxShadow: '0 0 24px rgba(64,224,208,0.2)',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: 'none',
            color: '#40E0D0', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px',
            fontFamily: 'Bungee, sans-serif', fontSize: '11px',
            letterSpacing: '0.08em',
            padding: '6px 8px', borderRadius: '6px',
            transition: 'background .15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(64,224,208,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          BACK
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(14px, 3vw, 20px)',
            color: '#40E0D0', letterSpacing: '0.06em', margin: 0,
            textShadow: '0 0 14px rgba(64,224,208,0.6)',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <SparkleIcon size={20} /> HIGHWAY SNACKS
            </span>
          </h1>
        </div>

        {/* Favorites count badge */}
        {user && favIds.length > 0 && (
          <div style={{
            fontFamily: 'Bungee, sans-serif', fontSize: '10px',
            color: '#FFD700', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: '4px',
            filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.6))',
            whiteSpace: 'nowrap',
          }}>
            <StarIcon filled />
            <span>{favIds.length}/{MAX_FAVORITES}</span>
          </div>
        )}
        {(!user || favIds.length === 0) && <div style={{ width: '44px' }} />}
      </div>

      {/* ── Page content ── */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 16px 48px' }}>

        {/* Tagline */}
        <p style={{
          fontFamily: 'Special Elite, serif', fontSize: '15px',
          color: 'rgba(200,155,70,0.7)', textAlign: 'center',
          marginBottom: '36px', fontStyle: 'italic',
        }}>
          Fuel for the literary road — podcasts, trivia, and reading adventures
        </p>

        {/* ── SURPRISE ME ── */}
        <SurpriseMe user={user} />

        {/* ── NEWSPAPER ── */}
        <section style={{ marginBottom: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <svg width="22" height="22" viewBox="0 0 30 30" aria-hidden="true" style={{ flexShrink: 0 }}>
              <polygon points="15,1 17,10 25,6 21,14 30,15 21,16 25,24 17,20 15,29 13,20 5,24 9,16 0,15 9,14 5,6 13,10" fill="#FF4E00"/>
            </svg>
            <h2 style={{
              fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(14px, 2.5vw, 18px)',
              color: '#FF4E00', letterSpacing: '0.08em', margin: 0,
              textShadow: '0 0 12px rgba(255,78,0,0.5)', whiteSpace: 'nowrap',
            }}>
              NEWSPAPER
            </h2>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(255,78,0,0.4), transparent)' }} />
          </div>
          <div style={{
            background: 'rgba(255,78,0,0.04)',
            border: '1px solid rgba(255,78,0,0.25)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: '13px',
              color: 'rgba(245,241,235,0.85)', lineHeight: '1.75',
              marginBottom: '16px',
            }}>
              Read the Literary Roads Gazette — a weekly literary newspaper for readers who love the road.
              Trending books, indie picks, debut authors, festivals, and road trip routes — every Sunday.
            </p>
            <a
              href="https://sandime.github.io/literary-roads/newspaper/current"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                fontFamily: 'Bungee, sans-serif', fontSize: '12px', letterSpacing: '0.08em',
                color: '#1A1B2E', background: '#FF4E00',
                padding: '10px 22px', borderRadius: '4px', textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              READ THE GAZETTE
            </a>
          </div>
        </section>

        {/* ── YOUR FAVORITES ── */}
        {user && favPodcasts.length > 0 && (
          <section style={{ marginBottom: '44px' }}>
            <SectionHeader
              label="YOUR FAVORITES"
              color="#FFD700"
              glowColor="rgba(255,215,0,0.5)"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {favPodcasts.map((p) => (
                <PodcastCard key={p.id} {...cardProps(p)} />
              ))}
            </div>
          </section>
        )}

        {/* "Log in to save favorites" nudge (guests only) */}
        {!user && (
          <div style={{
            marginBottom: '28px',
            background: 'rgba(255,215,0,0.04)',
            border: '1px dashed rgba(255,215,0,0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '18px' }}>⭐</span>
            <span style={{
              fontFamily: 'Special Elite, serif', fontSize: '13px',
              color: 'rgba(255,215,0,0.6)',
            }}>
              Log in to save favorite podcasts across sessions
            </span>
          </div>
        )}

        {/* ── ALL PODCASTS / REMAINING PODCASTS ── */}
        <section style={{ marginBottom: '44px' }}>
          <SectionHeader
            label={favPodcasts.length > 0 ? 'ALL PODCASTS' : 'LITERARY PODCASTS'}
            color="#FF4E00"
            glowColor="rgba(255,78,0,0.5)"
          />
          {podLoading ? (
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: '13px',
              color: 'rgba(200,155,70,0.5)', textAlign: 'center',
              fontStyle: 'italic', padding: '16px 0',
            }}>
              Loading podcasts…
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {otherPodcasts.map((p) => (
                <PodcastCard key={p.id} {...cardProps(p)} />
              ))}
              {otherPodcasts.length === 0 && !podLoading && podcasts.length > 0 && (
                <p style={{
                  fontFamily: 'Special Elite, serif', fontSize: '13px',
                  color: 'rgba(200,155,70,0.5)', textAlign: 'center',
                  fontStyle: 'italic', padding: '8px 0',
                }}>
                  You've favorited all the podcasts — more coming soon!
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── COMING SOON ── */}
        <section>
          <SectionHeader
            label="COMING SOON"
            color="#40E0D0"
            glowColor="rgba(64,224,208,0.5)"
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {COMING_SOON.map(({ label, desc }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(64,224,208,0.2)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: 'Bungee, sans-serif', fontSize: '11px',
                    color: 'rgba(245,245,220,0.6)', letterSpacing: '0.06em',
                  }}>
                    {label}
                  </span>
                  <span style={{
                    fontFamily: 'Bungee, sans-serif', fontSize: '7px',
                    color: '#FF4E00', letterSpacing: '0.1em',
                    border: '1px solid rgba(255,78,0,0.4)',
                    borderRadius: '3px', padding: '1px 5px',
                    whiteSpace: 'nowrap',
                  }}>
                    SOON
                  </span>
                </div>
                <p style={{
                  fontFamily: 'Special Elite, serif', fontSize: '11px',
                  color: 'rgba(200,155,70,0.5)', margin: 0, lineHeight: 1.5,
                }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ── Toast ── */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

    </div>
  );
}
