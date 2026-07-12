import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { fetchBookCover } from '../utils/booksCatalog';
import { searchBooks } from '../utils/googleBooks';

const L = {
  bg:     '#FFF8E7',
  purple: '#7B6EC4',
  dark:   '#2D2D2D',
  mid:    '#555555',
  muted:  '#999999',
  white:  '#FFFFFF',
};
const CAT_SRC = `${import.meta.env.BASE_URL}images/library-cat.png`;

const BUCKETS = [
  { id: 'quick',    label: 'Quick Read',     sub: 'Under 200 pages'       },
  { id: 'standard', label: 'Standard',       sub: '200–400 pages'         },
  { id: 'chunky',   label: 'Chunky',         sub: 'Over 400 pages'        },
  { id: 'unknown',  label: 'Length Unknown', sub: 'No page count on file' },
];

// Cutoffs are easy to adjust once real distribution is known
function assignBucket(pageCount) {
  if (!pageCount || pageCount <= 0) return 'unknown';
  if (pageCount < 200)  return 'quick';
  if (pageCount <= 400) return 'standard';
  return 'chunky';
}

// ── Bucket button (same visual pattern as MethodRow in LibrariansDesk) ────���───
function BucketButton({ bucket, count, onClick }) {
  const [hov, setHov] = useState(false);
  const disabled = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transform: hov ? 'translateX(3px)' : 'none',
        transition: 'transform 0.18s ease, opacity 0.15s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
        borderRadius: 12, position: 'relative',
        border: `1.5px solid ${hov ? L.purple : `${L.purple}44`}`,
        background: hov ? `${L.purple}0d` : L.white,
        boxShadow: hov ? `0 4px 14px ${L.purple}22` : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'border-color 0.18s, background 0.18s, box-shadow 0.18s',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: '12px 0 0 12px', background: L.purple }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 14, color: L.dark, letterSpacing: '0.04em' }}>
            {bucket.label}
          </p>
          <p style={{ margin: '3px 0 0', fontFamily: 'Special Elite, serif', fontSize: 12, color: L.mid, lineHeight: 1.4 }}>
            {bucket.sub}
          </p>
        </div>
        {count > 0 && (
          <span style={{
            flexShrink: 0, fontFamily: 'Bungee, sans-serif', fontSize: 9,
            background: `${L.purple}22`, color: L.purple,
            border: `1px solid ${L.purple}55`,
            borderRadius: 20, padding: '3px 9px', letterSpacing: '0.08em',
          }}>
            {count} {count === 1 ? 'book' : 'books'}
          </span>
        )}
        {!disabled && (
          <span style={{ color: L.purple, fontSize: 18, flexShrink: 0, opacity: hov ? 1 : 0.5, transition: 'opacity 0.15s' }}>→</span>
        )}
      </div>
    </button>
  );
}

// ── Lazy cover image ──────────────────────────────────────────────────────────
function CoverImg({ book }) {
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
      width: 56, height: 80, borderRadius: 5, flexShrink: 0,
      overflow: 'hidden', background: '#e8e0d0',
      boxShadow: '1px 2px 6px rgba(0,0,0,0.12)',
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
function BookRow({ book, onAddToReadNext }) {
  const [added, setAdded] = useState(false);
  const [hov,   setHov]   = useState(false);
  const authors = Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || '');

  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      padding: '12px 0', borderBottom: `1px solid ${L.purple}18`,
    }}>
      <CoverImg book={book} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: L.dark, lineHeight: 1.3 }}>
          {book.title}
        </p>
        <p style={{ margin: '0 0 8px', fontFamily: 'Special Elite, serif', fontSize: 12, color: L.mid }}>
          {authors}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {book.pageCount > 0 && (
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted }}>
              {book.pageCount} pages
            </span>
          )}
          {onAddToReadNext && (
            <button
              onClick={() => { onAddToReadNext(book); setAdded(true); }}
              disabled={added}
              onMouseEnter={() => !added && setHov(true)}
              onMouseLeave={() => setHov(false)}
              style={{
                fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.07em',
                background: added ? `${L.purple}18` : hov ? L.purple : 'transparent',
                color:      added ? L.purple        : hov ? L.white  : L.purple,
                border: `1.5px solid ${L.purple}`,
                borderRadius: 20, padding: '4px 10px',
                cursor: added ? 'default' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {added ? '✓ ADDED' : '+ READ NEXT'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const BACKFILL_BATCH = 5;

// Fetch page counts for books that don't have one, BACKFILL_BATCH at a time.
// Updates Firestore + local state as results arrive; calls onDone when finished.
async function backfillPageCounts(books, setBooks, onDone) {
  const missing = books.filter(b => !b.pageCount);
  if (!missing.length) { onDone(); return; }

  for (let i = 0; i < missing.length; i += BACKFILL_BATCH) {
    const batch = missing.slice(i, i + BACKFILL_BATCH);
    await Promise.all(batch.map(async book => {
      const authors = Array.isArray(book.authors) ? book.authors.join(' ') : (book.authors || '');
      const results = await searchBooks(`${book.title} ${authors}`).catch(() => []);
      const match = results.find(r =>
        r.title?.toLowerCase() === book.title?.toLowerCase() && r.pageCount > 0
      ) || results.find(r => r.pageCount > 0);
      if (!match?.pageCount) return;
      updateDoc(doc(db, 'books', book.id), { pageCount: match.pageCount }).catch(() => {});
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, pageCount: match.pageCount } : b));
    }));
    if (i + BACKFILL_BATCH < missing.length) await new Promise(r => setTimeout(r, 150));
  }
  onDone();
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ByLength({ onBack, onAddToReadNext }) {
  const [books,          setBooks]      = useState([]);
  const [loading,        setLoading]    = useState(true);
  const [backfilling,    setBackfilling] = useState(false);
  const [selectedBucket, setSelected]   = useState(null);

  useEffect(() => {
    getDocs(collection(db, 'books'))
      .then(snap => {
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setBooks(loaded);
        const needsBackfill = loaded.some(b => !b.pageCount);
        if (needsBackfill) {
          setBackfilling(true);
          backfillPageCounts(loaded, setBooks, () => setBackfilling(false));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const grouped = books.reduce((acc, book) => {
    acc[assignBucket(book.pageCount)].push(book);
    return acc;
  }, { quick: [], standard: [], chunky: [], unknown: [] });

  const sorted = {
    quick:    [...grouped.quick].sort((a, b)    => (a.pageCount || 0) - (b.pageCount || 0)),
    standard: [...grouped.standard].sort((a, b) => (a.pageCount || 0) - (b.pageCount || 0)),
    chunky:   [...grouped.chunky].sort((a, b)   => (a.pageCount || 0) - (b.pageCount || 0)),
    unknown:  [...grouped.unknown].sort((a, b)  => (a.title || '').localeCompare(b.title || '')),
  };

  const activeBucket  = BUCKETS.find(b => b.id === selectedBucket);
  const currentBooks  = selectedBucket ? sorted[selectedBucket] : [];
  const handleBack    = () => selectedBucket ? setSelected(null) : onBack();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: L.bg, overflowY: 'auto', fontFamily: 'Special Elite, serif' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: L.bg, borderBottom: `2px solid ${L.purple}`,
        padding: '12px 16px', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 600, margin: '0 auto' }}>
          <button onClick={handleBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark,
              letterSpacing: '0.06em', padding: '4px 8px', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = L.purple}
            onMouseLeave={e => e.currentTarget.style.color = L.dark}
          >
            BACK
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.muted, letterSpacing: '0.14em' }}>
              {selectedBucket ? 'BY LENGTH' : "THE LIBRARIAN'S DESK"}
            </p>
            <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 16, color: L.dark, fontWeight: 700 }}>
              {selectedBucket ? activeBucket.label : 'By Length'}
            </h1>
          </div>
          <div style={{ width: 56 }} />
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 80px' }}>

        {loading || backfilling ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <style>{`
              @keyframes bl-spin { to { transform: rotate(360deg); } }
            `}</style>
            <div style={{
              width: 36, height: 36, margin: '0 auto 16px',
              border: `3px solid ${L.purple}33`,
              borderTopColor: L.purple,
              borderRadius: '50%',
              animation: 'bl-spin 0.8s linear infinite',
            }} />
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: L.muted, fontStyle: 'italic' }}>
              {loading ? 'Loading the stacks…' : 'Fetching page counts…'}
            </p>
          </div>

        ) : !selectedBucket ? (
          <>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: L.mid, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 24, textAlign: 'center' }}>
              Find something quick, or settle in for a while.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BUCKETS.map(bucket => (
                <BucketButton
                  key={bucket.id}
                  bucket={bucket}
                  count={grouped[bucket.id].length}
                  onClick={() => grouped[bucket.id].length > 0 && setSelected(bucket.id)}
                />
              ))}
            </div>
          </>

        ) : currentBooks.length === 0 ? (
          <p style={{ textAlign: 'center', fontFamily: 'Special Elite, serif', fontSize: 13, color: L.muted, fontStyle: 'italic', marginTop: 40 }}>
            No books in this category yet.
          </p>

        ) : (
          currentBooks.map(book => (
            <BookRow key={book.id} book={book} onAddToReadNext={onAddToReadNext} />
          ))
        )}

      </div>
    </div>
  );
}
