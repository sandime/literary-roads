import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { fetchBookCover, titleAuthorSlug } from '../utils/booksCatalog';
import { searchBooks } from '../utils/googleBooks';

const L = {
  bg:     '#FFF8E7',
  amber:  '#C17D3C',
  dark:   '#2D2D2D',
  mid:    '#555555',
  muted:  '#999999',
  white:  '#FFFFFF',
};
const CAT_SRC = `${import.meta.env.BASE_URL}images/library-cat.png`;

const BUCKETS = [
  { id: 'traditional', label: 'Traditional Classic', sub: 'Published before 1970'       },
  { id: 'modern',      label: 'Modern Classic',       sub: '1970 – 2005'                },
  { id: 'unknown',     label: 'Year Unknown',          sub: 'No publication date on record' },
];

// null  → never tried (backfill will attempt)
// 0     → tried, nothing found (sentinel: don't retry)
// >0    → valid year
// >2005 → excluded entirely (not a classic)
function assignBucket(publishedYear) {
  if (publishedYear === null) return 'unknown';
  if (publishedYear === 0)    return 'unknown';
  if (publishedYear > 2005)   return null; // excluded
  if (publishedYear < 1970)   return 'traditional';
  return 'modern';
}

// ── Bucket button ─────────────────────────────────────────────────────────────
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
        border: `1.5px solid ${hov ? L.amber : `${L.amber}44`}`,
        background: hov ? `${L.amber}0d` : L.white,
        boxShadow: hov ? `0 4px 14px ${L.amber}22` : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'border-color 0.18s, background 0.18s, box-shadow 0.18s',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: '12px 0 0 12px', background: L.amber }} />
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
            background: `${L.amber}22`, color: L.amber,
            border: `1px solid ${L.amber}55`,
            borderRadius: 20, padding: '3px 9px', letterSpacing: '0.08em',
          }}>
            {count} {count === 1 ? 'book' : 'books'}
          </span>
        )}
        {!disabled && (
          <span style={{ color: L.amber, fontSize: 18, flexShrink: 0, opacity: hov ? 1 : 0.5, transition: 'opacity 0.15s' }}>→</span>
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
function BookRow({ book }) {
  const isUnknown = !book.publishedYear || book.publishedYear === 0;

  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      padding: '12px 0', borderBottom: `1px solid ${L.amber}18`,
    }}>
      <CoverImg book={book} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: L.dark, lineHeight: 1.3 }}>
          {book.title}
        </p>
        <p style={{ margin: '0 0 6px', fontFamily: 'Special Elite, serif', fontSize: 12, color: L.mid }}>
          {book.author}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {!isUnknown && (
            <span style={{
              fontFamily: 'Special Elite, serif', fontSize: 11,
              color: L.amber, opacity: 0.85,
            }}>
              {book.publishedYear}
            </span>
          )}
          {isUnknown && (
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, fontStyle: 'italic' }}>
              We couldn't find a publication date for this one
            </span>
          )}
        </div>

        {book.whoWhatWhere && (
          <p style={{ margin: '5px 0 0', fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, fontStyle: 'italic', lineHeight: 1.4 }}>
            {book.whoWhatWhere}
          </p>
        )}
      </div>
    </div>
  );
}

const BACKFILL_BATCH = 5;

// Fetch publication years for books where publishedYear === null (never tried).
// Writes publishedYear to the books doc: the found year, or 0 as a sentinel
// meaning "tried but nothing found" — preventing retries on future loads.
async function backfillPublishedYears(books, setBooks, onDone) {
  // Only try books where we've never attempted a lookup (null ≠ 0 sentinel)
  const missing = books.filter(b => b.publishedYear === null);
  if (!missing.length) { onDone(); return; }

  for (let i = 0; i < missing.length; i += BACKFILL_BATCH) {
    const batch = missing.slice(i, i + BACKFILL_BATCH);
    await Promise.all(batch.map(async book => {
      const author = Array.isArray(book.authors) ? book.authors.join(' ') : (book.author || '');
      const results = await searchBooks(`${book.title} ${author}`).catch(() => []);
      const match =
        results.find(r => r.title?.toLowerCase() === book.title?.toLowerCase() && r.publishedYear) ||
        results.find(r => r.publishedYear);
      // Write found year or 0 sentinel — both prevent future retry
      const year = match?.publishedYear || 0;
      updateDoc(doc(db, 'books', book.id), { publishedYear: year }).catch(() => {});
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, publishedYear: year } : b));
    }));
    if (i + BACKFILL_BATCH < missing.length) await new Promise(r => setTimeout(r, 150));
  }
  onDone();
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ByEra({ onBack }) {
  const { user } = useAuth();
  const [books,          setBooks]      = useState([]);
  const [loading,        setLoading]    = useState(true);
  const [backfilling,    setBackfilling] = useState(false);
  const [selectedBucket, setSelected]   = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    getDocs(collection(db, 'users', user.uid, 'libraryReadNext'))
      .then(async (rnSnap) => {
        const rnItems = rnSnap.docs.map(d => ({ _docId: d.id, ...d.data() }));

        // For each readNext item, fetch its books doc to get publishedYear
        const loaded = (await Promise.all(rnItems.map(async (item) => {
          const booksDocId = item.googleBooksId
            || titleAuthorSlug(item.title || '', item.author || '');
          if (!booksDocId) return null;

          const snap = await getDoc(doc(db, 'books', booksDocId)).catch(() => null);
          const booksData = (snap?.exists() ? snap.data() : {}) || {};

          return {
            id:           booksDocId,
            title:        item.title    || '',
            author:       item.author   || '',
            authors:      [item.author  || ''],
            coverUrl:     item.coverUrl || booksData.coverUrl || '',
            whoWhatWhere: item.whoWhatWhere || '',
            publishedYear: booksData.publishedYear ?? null,
          };
        }))).filter(Boolean);

        setBooks(loaded);

        const needsBackfill = loaded.some(b => b.publishedYear === null);
        if (needsBackfill) {
          setBackfilling(true);
          backfillPublishedYears(loaded, setBooks, () => setBackfilling(false));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  // Bucket counts — exclude post-2005 (assignBucket returns null)
  const grouped = books.reduce((acc, book) => {
    const bucket = assignBucket(book.publishedYear);
    if (bucket) acc[bucket].push(book);
    return acc;
  }, { traditional: [], modern: [], unknown: [] });

  const sorted = {
    traditional: [...grouped.traditional].sort((a, b) => (a.publishedYear || 0) - (b.publishedYear || 0)),
    modern:      [...grouped.modern].sort((a, b) => (a.publishedYear || 0) - (b.publishedYear || 0)),
    unknown:     [...grouped.unknown].sort((a, b) => (a.title || '').localeCompare(b.title || '')),
  };

  const activeBucket = BUCKETS.find(b => b.id === selectedBucket);
  const currentBooks = selectedBucket ? sorted[selectedBucket] : [];
  const handleBack   = () => selectedBucket ? setSelected(null) : onBack();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: L.bg, overflowY: 'auto', fontFamily: 'Special Elite, serif' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: L.bg, borderBottom: `2px solid ${L.amber}`,
        padding: '12px 16px', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 600, margin: '0 auto' }}>
          <button onClick={handleBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark,
              letterSpacing: '0.06em', padding: '4px 8px', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = L.amber}
            onMouseLeave={e => e.currentTarget.style.color = L.dark}
          >
            BACK
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.muted, letterSpacing: '0.14em' }}>
              {selectedBucket ? 'BY ERA' : "THE LIBRARIAN'S DESK"}
            </p>
            <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 16, color: L.dark, fontWeight: 700 }}>
              {selectedBucket ? activeBucket.label : 'By Era'}
            </h1>
          </div>
          <div style={{ width: 56 }} />
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 80px' }}>

        {loading || backfilling ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <style>{`@keyframes be-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{
              width: 36, height: 36, margin: '0 auto 16px',
              border: `3px solid ${L.amber}33`,
              borderTopColor: L.amber,
              borderRadius: '50%',
              animation: 'be-spin 0.8s linear infinite',
            }} />
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: L.muted, fontStyle: 'italic' }}>
              {loading ? 'Loading the stacks…' : 'Looking up publication dates…'}
            </p>
          </div>

        ) : !user ? (
          <p style={{ textAlign: 'center', fontFamily: 'Special Elite, serif', fontSize: 13, color: L.muted, fontStyle: 'italic', marginTop: 40 }}>
            Sign in to browse your Read Next shelf by era.
          </p>

        ) : !selectedBucket ? (
          <>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: L.mid, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 24, textAlign: 'center' }}>
              Find a classic from your Read Next list.
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
            {books.length > 0 && books.every(b => assignBucket(b.publishedYear) === null) && (
              <p style={{ marginTop: 24, textAlign: 'center', fontFamily: 'Special Elite, serif', fontSize: 13, color: L.muted, fontStyle: 'italic' }}>
                No books published before 2006 on your Read Next shelf.
              </p>
            )}
          </>

        ) : currentBooks.length === 0 ? (
          <p style={{ textAlign: 'center', fontFamily: 'Special Elite, serif', fontSize: 13, color: L.muted, fontStyle: 'italic', marginTop: 40 }}>
            No books in this category yet.
          </p>

        ) : (
          currentBooks.map(book => (
            <BookRow key={book.id} book={book} />
          ))
        )}

      </div>
    </div>
  );
}
