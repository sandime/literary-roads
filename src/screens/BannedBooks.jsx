import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { fetchBookCover, titleAuthorSlug } from '../utils/booksCatalog';

const C = {
  bg:       '#FFF8E7',
  orange:   '#c8601a',
  midnight: '#0d1124',
  teal:     '#40E0D0',
  mutedTeal:'#c8d8d8',
  dark:     '#2D2D2D',
  mid:      '#555555',
  muted:    '#999999',
  white:    '#F5F5DC',
  surface:  '#121428',
};
const CAT_SRC = `${import.meta.env.BASE_URL}images/library-cat.png`;

// ── Flame icon ────────────────────────────────────────────────────────────────
function FlameIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 0-4 5.5-4 10a4 4 0 0 0 8 0c0-1.8-.6-3.5-1.5-5 0 1.5-.8 2.8-2.5 2.8S9.5 8.3 9.5 6.8C9 7.8 8 10 8 12" />
    </svg>
  );
}

// ── Lazy cover image ──────────────────────────────────────────────────────────
function CoverImg({ book, width = 56, height = 80 }) {
  const [src, setSrc] = useState(book.coverUrl || null);
  const tried = useRef(false);

  useEffect(() => {
    if (src || tried.current) return;
    tried.current = true;
    fetchBookCover(book).then(url => {
      if (!url) return;
      setSrc(url);
      updateDoc(doc(db, 'books', book.id), { coverUrl: url }).catch(() => {});
    });
  }, [book.id]);

  return (
    <div style={{
      width, height, borderRadius: 5, flexShrink: 0,
      overflow: 'hidden', background: '#1a2035',
      boxShadow: '1px 2px 6px rgba(0,0,0,0.22)',
    }}>
      <img
        src={src || CAT_SRC}
        alt={book.title}
        onError={e => { e.target.onerror = null; e.target.src = CAT_SRC; }}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}

// ── Book row ──────────────────────────────────────────────────────────────────
function BookRow({ book, onTap }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onTap}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', background: 'none', border: 'none', padding: 0,
        textAlign: 'left', cursor: 'pointer',
        borderBottom: `1px solid ${C.orange}18`,
      }}
    >
      <div style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        padding: '12px 0',
        background: hov ? 'rgba(200,96,26,0.04)' : 'transparent',
        borderRadius: 8,
        transition: 'background 0.15s',
      }}>
        <CoverImg book={book} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 3px', fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: C.dark, lineHeight: 1.3 }}>
            {book.title}
          </p>
          <p style={{ margin: '0 0 7px', fontFamily: 'Special Elite, serif', fontSize: 12, color: C.mid }}>
            {book.author}
          </p>
          <span style={{
            fontFamily: 'Bungee, sans-serif', fontSize: 8,
            padding: '2px 8px', borderRadius: 4, letterSpacing: '0.07em',
            border: `1px solid ${C.orange}66`,
            background: `${C.orange}12`,
            color: C.orange,
          }}>
            CHALLENGED
          </span>
        </div>
        <span style={{ color: C.orange, fontSize: 16, alignSelf: 'center', opacity: hov ? 0.9 : 0.35, transition: 'opacity 0.15s', flexShrink: 0 }}>→</span>
      </div>
    </button>
  );
}

// ── Detail sheet (bottom sheet) ───────────────────────────────────────────────
function DetailSheet({ book, onClose, onViewShelf }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes bb-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 600, margin: '0 auto',
          background: C.midnight,
          border: `1.5px solid ${C.orange}`,
          borderRadius: '18px 18px 0 0',
          padding: '20px 20px 40px',
          animation: 'bb-slide-up 0.26s ease',
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.mutedTeal, fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 4px', opacity: 0.7 }}>
            ×
          </button>
        </div>

        {/* Header: cover + title + author */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 22 }}>
          <CoverImg book={book} width={52} height={74} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 5px', fontFamily: 'Bungee, sans-serif', fontSize: 14, color: C.white, lineHeight: 1.3 }}>
              {book.title}
            </p>
            <p style={{ margin: 0, fontFamily: 'Special Elite, serif', fontSize: 13, color: C.mutedTeal }}>
              {book.author}
            </p>
          </div>
        </div>

        {/* Why It's Challenged — only if bannedContext is present */}
        {book.bannedContext && (
          <div style={{ marginBottom: 22 }}>
            <p style={{
              margin: '0 0 9px',
              fontFamily: 'Bungee, sans-serif', fontSize: 10,
              color: C.orange, letterSpacing: '0.1em',
            }}>
              WHY IT'S CHALLENGED
            </p>
            <p style={{
              margin: 0,
              fontFamily: 'Special Elite, Georgia, serif', fontSize: 13,
              color: C.mutedTeal, lineHeight: 1.6,
            }}>
              {book.bannedContext}
            </p>
            {book.bannedSource && (
              <p style={{
                margin: '8px 0 0',
                fontFamily: 'Special Elite, serif', fontSize: 10,
                color: 'rgba(200,216,216,0.45)', fontStyle: 'italic',
              }}>
                Source: {book.bannedSource}
              </p>
            )}
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: `${C.orange}30`, marginBottom: 20 }} />

        {/* View in Shelf */}
        <button
          onClick={onViewShelf}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 8,
            fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.07em',
            background: 'transparent',
            border: `1.5px solid ${C.orange}`,
            color: C.orange, cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = `${C.orange}14`}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          VIEW IN YOUR SHELF →
        </button>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function BannedBooks({ onBack, onViewShelf, suppressedIds = new Set() }) {
  const { user } = useAuth();
  const [books,       setBooks]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedBook, setSelected]   = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    getDocs(collection(db, 'users', user.uid, 'libraryReadNext'))
      .then(async (rnSnap) => {
        const rnItems = rnSnap.docs
          .map(d => ({ _docId: d.id, ...d.data() }))
          .filter(item => !suppressedIds.has(item.googleBooksId));

        // For each readNext item, fetch the books doc and check banned === true.
        // Searches the `books` collection by title field — not the locations collections.
        const loaded = (await Promise.all(rnItems.map(async (item) => {
          const booksDocId = item.googleBooksId
            || titleAuthorSlug(item.title || '', item.author || '');
          if (!booksDocId) return null;

          const snap = await getDoc(doc(db, 'books', booksDocId)).catch(() => null);
          if (!snap?.exists()) return null;

          const booksData = snap.data();
          if (!booksData.banned) return null; // only include banned books

          return {
            id:           booksDocId,
            title:        item.title         || booksData.title  || '',
            author:       item.author        || (booksData.authors?.[0]) || '',
            authors:      booksData.authors  || [item.author || ''],
            coverUrl:     item.coverUrl      || booksData.coverUrl || '',
            whoWhatWhere: item.whoWhatWhere   || '',
            bannedContext: booksData.bannedContext || '',
            bannedSource:  booksData.bannedSource  || '',
          };
        }))).filter(Boolean);

        setBooks(loaded.sort((a, b) => a.title.localeCompare(b.title)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const handleViewShelf = () => {
    setSelected(null);
    onViewShelf?.();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: C.bg, overflowY: 'auto', fontFamily: 'Special Elite, serif' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: C.bg, borderBottom: `2px solid ${C.orange}`,
        padding: '12px 16px', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 600, margin: '0 auto' }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.dark,
              letterSpacing: '0.06em', padding: '4px 8px', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = C.orange}
            onMouseLeave={e => e.currentTarget.style.color = C.dark}
          >
            BACK
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted, letterSpacing: '0.14em' }}>
              THE LIBRARIAN'S DESK
            </p>
            <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 16, color: C.dark, fontWeight: 700 }}>
              Banned &amp; Challenged
            </h1>
          </div>
          <div style={{ width: 56 }} />
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 80px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <style>{`@keyframes bb-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{
              width: 36, height: 36, margin: '0 auto 16px',
              border: `3px solid ${C.orange}33`,
              borderTopColor: C.orange,
              borderRadius: '50%',
              animation: 'bb-spin 0.8s linear infinite',
            }} />
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted, fontStyle: 'italic' }}>
              Checking the stacks…
            </p>
          </div>

        ) : !user ? (
          <p style={{ textAlign: 'center', fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted, fontStyle: 'italic', marginTop: 40 }}>
            Sign in to browse your Read Next shelf.
          </p>

        ) : books.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <div style={{ marginBottom: 14 }}>
              <FlameIcon size={36} />
            </div>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: C.mid, fontStyle: 'italic', lineHeight: 1.7, maxWidth: 300, margin: '0 auto' }}>
              None of your Read Next books are banned. That might be worth fixing.
            </p>
          </div>

        ) : (
          <>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.mid, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 20, textAlign: 'center' }}>
              {books.length} book{books.length !== 1 ? 's' : ''} on your shelf {books.length === 1 ? 'has' : 'have'} been banned or challenged.
            </p>
            <div>
              {books.map(book => (
                <BookRow key={book.id} book={book} onTap={() => setSelected(book)} />
              ))}
            </div>
          </>
        )}
      </div>

      {selectedBook && (
        <DetailSheet
          book={selectedBook}
          onClose={() => setSelected(null)}
          onViewShelf={handleViewShelf}
        />
      )}
    </div>
  );
}
