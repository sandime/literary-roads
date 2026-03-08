import { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { searchBooks } from '../utils/googleBooks';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => CURRENT_YEAR - i);

// Filter strings for the cat icon.
// The image is a black silhouette on a cream background (not transparent).
// "Active" pipeline: sepia → saturate → hue-rotate turns black→warm-amber and
//   cream→gold, then a drop-shadow adds the neon glow ring.
// "Inactive" pipeline: grayscale + heavy darken collapses everything to near-black,
//   blending into the dark page background so only a faint shape remains.
const CAT_FILTER_ACTIVE   = 'sepia(1) saturate(8) hue-rotate(-8deg) brightness(1.05) drop-shadow(0 0 6px rgba(255,200,0,0.95))';
const CAT_FILTER_INACTIVE = 'grayscale(1) brightness(0.18)';

// ── Cat rating selector ──────────────────────────────────────────────────────
function CatRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          style={{
            background: 'none', border: 'none', padding: '2px', cursor: 'pointer',
            transition: 'transform 0.15s',
            transform: display >= n ? 'scale(1.18)' : 'scale(1)',
          }}
          title={`${n} cat${n > 1 ? 's' : ''}`}
        >
          <img
            src="/literary-roads/images/retro_cat.png"
            alt={`cat ${n}`}
            style={{
              width: '48px', height: 'auto', display: 'block',
              filter: display >= n ? CAT_FILTER_ACTIVE : CAT_FILTER_INACTIVE,
              transition: 'filter 0.15s',
            }}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="font-bungee" style={{ fontSize: '10px', color: '#FFD700', letterSpacing: '0.06em', marginLeft: '4px' }}>
          {value}/5
        </span>
      )}
    </div>
  );
}

// ── Book search with debounce ────────────────────────────────────────────────
function BookSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const r = await searchBooks(query);
      setResults(r);
      setSearching(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handlePick = (book) => {
    onSelect(book);
    setQuery('');
    setResults([]);
  };

  return (
    <div>
      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, author..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#111220',
            border: '2px solid rgba(0,217,255,0.5)',
            borderRadius: '10px', color: '#F5F5DC',
            padding: '12px 40px 12px 14px', fontSize: '15px',
            fontFamily: 'Special Elite, serif', outline: 'none',
            boxShadow: '0 0 12px rgba(0,217,255,0.15)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#00D9FF';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,217,255,0.35)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0,217,255,0.5)';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(0,217,255,0.15)';
          }}
        />
        {searching && (
          <div style={{
            position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
            width: '16px', height: '16px',
            border: '2px solid #00D9FF', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
          }} />
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{
          marginTop: '8px', borderRadius: '10px', overflow: 'hidden',
          border: '1.5px solid rgba(0,217,255,0.25)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          maxHeight: '300px', overflowY: 'auto',
        }}>
          {results.map((book, i) => (
            <button
              key={book.id}
              type="button"
              onClick={() => handlePick(book)}
              style={{
                width: '100%', display: 'flex', gap: '12px', alignItems: 'center',
                padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                background: 'rgba(0,217,255,0.04)',
                borderTop: i > 0 ? '1px solid rgba(0,217,255,0.1)' : 'none',
                border: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,217,255,0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,217,255,0.04)'}
            >
              <div style={{
                width: '40px', height: '56px', flexShrink: 0,
                borderRadius: '3px', overflow: 'hidden',
                border: '1px solid rgba(0,217,255,0.2)',
                background: '#1A1B2E',
              }}>
                {book.coverURL
                  ? <img src={book.coverURL} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📖</div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-bungee" style={{
                  fontSize: '11px', color: '#F0E6CC', lineHeight: 1.3,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>{book.title}</p>
                <p className="font-special-elite" style={{ fontSize: '11px', color: 'rgba(192,192,192,0.6)', marginTop: '2px' }}>
                  {book.author}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {!searching && query.length > 1 && results.length === 0 && (
        <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.4)', fontSize: '13px', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
          No results found
        </p>
      )}
    </div>
  );
}

// ── Single logged book card ──────────────────────────────────────────────────
function LoggedBookCard({ entry, onDelete, onEdit }) {
  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      padding: '12px', borderRadius: '12px', marginBottom: '10px',
      background: 'rgba(0,217,255,0.04)',
      border: '1px solid rgba(0,217,255,0.15)',
      position: 'relative',
    }}>
      {/* Cover */}
      <div style={{
        width: '52px', height: '74px', flexShrink: 0,
        borderRadius: '4px', overflow: 'hidden',
        border: '1.5px solid rgba(0,217,255,0.25)',
        background: '#1A1B2E',
      }}>
        {entry.bookCover
          ? <img src={entry.bookCover} alt={entry.bookTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>📖</div>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-bungee" style={{
          fontSize: '11px', color: '#F0E6CC', lineHeight: 1.3, marginBottom: '2px',
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{entry.bookTitle}</p>
        <p className="font-special-elite" style={{ fontSize: '11px', color: 'rgba(192,192,192,0.55)', marginBottom: '6px' }}>
          {entry.bookAuthor}
        </p>

        {/* Cats */}
        {entry.rating > 0 && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '5px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <img
                key={n}
                src="/literary-roads/images/retro_cat.png"
                alt=""
                style={{
                  width: '40px', height: 'auto', display: 'block',
                  filter: entry.rating >= n ? CAT_FILTER_ACTIVE : CAT_FILTER_INACTIVE,
                }}
              />
            ))}
          </div>
        )}

        {/* Date + format */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {(entry.finishedMonth || entry.finishedYear) && (
            <span className="font-special-elite" style={{ fontSize: '10px', color: 'rgba(192,192,192,0.45)' }}>
              {[entry.finishedMonth, entry.finishedYear].filter(Boolean).join(' ')}
            </span>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            fontSize: '9px', fontFamily: 'Bungee, sans-serif', letterSpacing: '0.06em',
            padding: '1px 6px', borderRadius: '4px',
            background: entry.format === 'audio' ? 'rgba(255,78,0,0.15)' : 'rgba(57,255,20,0.12)',
            color: entry.format === 'audio' ? '#FF9060' : '#39FF14',
            border: `1px solid ${entry.format === 'audio' ? 'rgba(255,78,0,0.3)' : 'rgba(57,255,20,0.3)'}`,
          }}>
            {entry.format === 'audio' ? '🎧 AUDIO' : '📖 READ'}
          </span>
        </div>
      </div>

      {/* Action buttons — top-right corner */}
      <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '5px' }}>
        {/* Edit */}
        <button
          onClick={() => onEdit(entry)}
          style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: 'rgba(0,217,255,0.12)', border: '1px solid rgba(0,217,255,0.35)',
            color: '#00D9FF', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,217,255,0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,217,255,0.12)'}
          title="Edit entry"
        >
          {/* Pencil icon */}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        {/* Delete */}
        <button
          onClick={() => onDelete(entry.id)}
          style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: 'rgba(255,78,0,0.2)', border: '1px solid rgba(255,78,0,0.4)',
            color: '#FF4E00', fontSize: '12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,78,0,0.45)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,78,0,0.2)'}
          title="Remove from log"
        >×</button>
      </div>
    </div>
  );
}

// ── Inline edit panel ────────────────────────────────────────────────────────
function EditPanel({ entry, onSave, onCancel, saving }) {
  const [rating, setRating] = useState(entry.rating ?? 0);
  const [finishedMonth, setFinishedMonth] = useState(entry.finishedMonth ?? '');
  const [finishedYear, setFinishedYear] = useState(entry.finishedYear ? String(entry.finishedYear) : '');
  const [format, setFormat] = useState(entry.format ?? 'read');

  return (
    <div style={{
      borderRadius: '12px', padding: '14px',
      background: '#080916',
      border: '1.5px solid rgba(0,217,255,0.4)',
      marginBottom: '10px',
      boxShadow: '0 0 16px rgba(0,217,255,0.08)',
    }}>
      {/* Book title */}
      <p className="font-bungee" style={{ fontSize: '11px', color: '#00D9FF', marginBottom: '12px', letterSpacing: '0.04em' }}>
        EDITING: {entry.bookTitle}
      </p>

      {/* Rating */}
      <div style={{ marginBottom: '12px' }}>
        <label className="font-bungee" style={{ fontSize: '10px', color: 'rgba(0,217,255,0.7)', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
          RATING
        </label>
        <CatRating value={rating} onChange={setRating} />
      </div>

      {/* Finished date */}
      <div style={{ marginBottom: '12px' }}>
        <label className="font-bungee" style={{ fontSize: '10px', color: 'rgba(0,217,255,0.7)', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
          FINISHED
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={finishedMonth}
            onChange={(e) => setFinishedMonth(e.target.value)}
            className="font-special-elite"
            style={{
              flex: 1, background: '#111220', border: '1.5px solid rgba(0,217,255,0.35)',
              borderRadius: '8px', color: finishedMonth ? '#F5F5DC' : 'rgba(192,192,192,0.4)',
              padding: '8px 10px', fontSize: '13px', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">Month</option>
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={finishedYear}
            onChange={(e) => setFinishedYear(e.target.value)}
            className="font-special-elite"
            style={{
              width: '100px', background: '#111220', border: '1.5px solid rgba(0,217,255,0.35)',
              borderRadius: '8px', color: finishedYear ? '#F5F5DC' : 'rgba(192,192,192,0.4)',
              padding: '8px 10px', fontSize: '13px', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">Year</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Format */}
      <div style={{ marginBottom: '14px' }}>
        <label className="font-bungee" style={{ fontSize: '10px', color: 'rgba(0,217,255,0.7)', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
          FORMAT
        </label>
        <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid rgba(0,217,255,0.3)' }}>
          {[
            { value: 'read', label: '📖 READ' },
            { value: 'audio', label: '🎧 LISTENED' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormat(value)}
              className="font-bungee"
              style={{
                flex: 1, padding: '8px 6px', border: 'none', cursor: 'pointer',
                fontSize: '10px', letterSpacing: '0.06em', transition: 'background 0.2s, color 0.2s',
                background: format === value ? '#00D9FF' : 'transparent',
                color: format === value ? '#0A1A2F' : 'rgba(192,192,192,0.5)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onSave({ rating, finishedMonth, finishedYear: finishedYear ? Number(finishedYear) : '', format })}
          disabled={saving}
          className="font-bungee"
          style={{
            flex: 1, padding: '10px',
            background: saving ? 'rgba(255,78,0,0.4)' : '#FF4E00',
            color: '#1A1B2E', borderRadius: '8px', border: 'none',
            fontSize: '11px', letterSpacing: '0.08em', cursor: saving ? 'default' : 'pointer',
            boxShadow: saving ? 'none' : '0 0 12px rgba(255,78,0,0.4)',
          }}
        >
          {saving ? 'SAVING...' : 'SAVE'}
        </button>
        <button
          onClick={onCancel}
          className="font-bungee"
          style={{
            padding: '10px 16px', background: 'transparent',
            border: '1.5px solid rgba(192,192,192,0.25)', borderRadius: '8px',
            color: 'rgba(192,192,192,0.5)', fontSize: '11px', cursor: 'pointer',
          }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

// ── Main BookLog component ───────────────────────────────────────────────────
export default function BookLog({ onBack }) {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState(null);
  const [rating, setRating] = useState(0);
  const [finishedMonth, setFinishedMonth] = useState('');
  const [finishedYear, setFinishedYear] = useState('');
  const [format, setFormat] = useState('read');
  const [saving, setSaving] = useState(false);
  const [loggedBooks, setLoggedBooks] = useState([]);
  const [saveError, setSaveError] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [sortOrder, setSortOrder] = useState(
    () => localStorage.getItem('booklog-sort') ?? 'date'
  );

  // Real-time sync with Firestore subcollection (stored unsorted — sort happens in render)
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'users', user.uid, 'booksRead');
    const unsub = onSnapshot(colRef, (snap) => {
      setLoggedBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('[BookLog] snapshot:', err));
    return unsub;
  }, [user]);

  const handleSortChange = (order) => {
    setSortOrder(order);
    localStorage.setItem('booklog-sort', order);
  };

  const sortedBooks = [...loggedBooks].sort((a, b) => {
    const ta = a.timestamp?.toMillis?.() ?? 0;
    const tb = b.timestamp?.toMillis?.() ?? 0;
    if (sortOrder === 'rating-desc') return (b.rating ?? 0) - (a.rating ?? 0) || tb - ta;
    if (sortOrder === 'rating-asc')  return (a.rating ?? 0) - (b.rating ?? 0) || tb - ta;
    if (sortOrder === 'title')       return (a.bookTitle ?? '').localeCompare(b.bookTitle ?? '');
    return tb - ta; // 'date' default
  });

  const resetForm = () => {
    setSelectedBook(null);
    setRating(0);
    setFinishedMonth('');
    setFinishedYear('');
    setFormat('read');
    setSaveError('');
  };

  const handleAddToLog = async () => {
    if (!user || !selectedBook) return;
    setSaving(true);
    setSaveError('');
    try {
      const docId = selectedBook.id.replace(/\//g, '_');
      await setDoc(
        doc(db, 'users', user.uid, 'booksRead', docId),
        {
          bookTitle: selectedBook.title,
          bookAuthor: selectedBook.author,
          bookCover: selectedBook.coverURL || null,
          googleBooksId: selectedBook.id,
          rating,
          finishedMonth,
          finishedYear: finishedYear ? Number(finishedYear) : '',
          format,
          timestamp: serverTimestamp(),
        },
      );
      resetForm();
    } catch (err) {
      console.error('[BookLog] save:', err);
      setSaveError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (updates) => {
    if (!user || !editingEntry) return;
    setEditSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid, 'booksRead', editingEntry.id), updates);
      setEditingEntry(null);
    } catch (err) {
      console.error('[BookLog] edit:', err);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'booksRead', docId));
    } catch (err) {
      console.error('[BookLog] delete:', err);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'radial-gradient(ellipse at 50% 0%, #0a1535 0%, #090A1A 50%, #04050F 100%)',
        overflowY: 'auto',
        fontFamily: 'Special Elite, serif',
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0,217,255,0.5), 0 0 30px rgba(0,217,255,0.2); }
          50% { box-shadow: 0 0 20px rgba(0,217,255,0.8), 0 0 50px rgba(0,217,255,0.35); }
        }
      `}</style>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 16px 60px' }}>

        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(4,5,15,0.97)',
          borderBottom: '2px solid rgba(0,217,255,0.3)',
          padding: '14px 0 12px',
          marginBottom: '20px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={onBack}
              className="font-special-elite"
              style={{ color: 'rgba(192,192,192,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
            >
              ← Back
            </button>
            <h1 className="font-bungee" style={{
              color: '#00D9FF', fontSize: '20px', letterSpacing: '0.08em',
              textShadow: '0 0 20px rgba(0,217,255,0.8), 0 0 40px rgba(0,217,255,0.4)',
            }}>
              BOOK LOG
            </h1>
            <div style={{ width: '48px' }} />
          </div>
          {loggedBooks.length > 0 && (
            <p className="font-special-elite" style={{
              textAlign: 'center', fontSize: '11px',
              color: 'rgba(0,217,255,0.5)', marginTop: '4px',
            }}>
              {loggedBooks.length} book{loggedBooks.length !== 1 ? 's' : ''} logged
            </p>
          )}
        </div>

        {/* Guest prompt */}
        {!user && (
          <div style={{
            borderRadius: '12px', padding: '20px',
            border: '1.5px solid rgba(0,217,255,0.25)',
            background: 'rgba(0,217,255,0.05)',
            textAlign: 'center', marginBottom: '24px',
          }}>
            <p className="font-bungee" style={{ color: '#00D9FF', fontSize: '13px', marginBottom: '6px' }}>
              SIGN IN TO LOG BOOKS
            </p>
            <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.5)', fontSize: '12px' }}>
              Your book log is saved to your account
            </p>
          </div>
        )}

        {/* ── Search section ── */}
        {user && (
          <>
            <div style={{
              borderRadius: '14px', padding: '18px',
              border: '1.5px solid rgba(0,217,255,0.2)',
              background: 'rgba(0,217,255,0.03)',
              marginBottom: '16px',
            }}>
              <h2 className="font-bungee" style={{
                color: '#00D9FF', fontSize: '13px', letterSpacing: '0.08em',
                marginBottom: '12px', textShadow: '0 0 10px rgba(0,217,255,0.5)',
              }}>
                FIND A BOOK
              </h2>
              <BookSearch onSelect={setSelectedBook} />
            </div>

            {/* ── Entry form ── */}
            {selectedBook && (
              <div style={{
                borderRadius: '14px', padding: '18px',
                border: '2px solid rgba(0,217,255,0.4)',
                background: '#080916',
                marginBottom: '16px',
                boxShadow: '0 0 24px rgba(0,217,255,0.1)',
                animation: 'neon-pulse 3s ease-in-out infinite',
              }}>
                {/* Selected book preview */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '18px' }}>
                  <div style={{
                    width: '60px', height: '84px', flexShrink: 0,
                    borderRadius: '5px', overflow: 'hidden',
                    border: '2px solid rgba(0,217,255,0.4)',
                    boxShadow: '0 0 12px rgba(0,217,255,0.3)',
                    background: '#1A1B2E',
                  }}>
                    {selectedBook.coverURL
                      ? <img src={selectedBook.coverURL} alt={selectedBook.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>📖</div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-bungee" style={{
                      fontSize: '12px', color: '#F0E6CC', lineHeight: 1.35,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    }}>{selectedBook.title}</p>
                    <p className="font-special-elite" style={{ fontSize: '12px', color: 'rgba(192,192,192,0.55)', marginTop: '3px' }}>
                      {selectedBook.author}
                    </p>
                  </div>
                  <button
                    onClick={resetForm}
                    style={{
                      background: 'none', border: 'none', color: 'rgba(192,192,192,0.4)',
                      cursor: 'pointer', fontSize: '18px', lineHeight: 1, flexShrink: 0, padding: '2px',
                    }}
                    title="Choose different book"
                  >×</button>
                </div>

                {/* Rating */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="font-bungee" style={{ fontSize: '10px', color: 'rgba(0,217,255,0.7)', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                    RATING
                  </label>
                  <CatRating value={rating} onChange={setRating} />
                </div>

                {/* Finished date */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="font-bungee" style={{ fontSize: '10px', color: 'rgba(0,217,255,0.7)', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                    FINISHED
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={finishedMonth}
                      onChange={(e) => setFinishedMonth(e.target.value)}
                      className="font-special-elite"
                      style={{
                        flex: 1, background: '#111220', border: '1.5px solid rgba(0,217,255,0.35)',
                        borderRadius: '8px', color: finishedMonth ? '#F5F5DC' : 'rgba(192,192,192,0.4)',
                        padding: '9px 10px', fontSize: '13px', outline: 'none', cursor: 'pointer',
                      }}
                    >
                      <option value="">Month</option>
                      {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={finishedYear}
                      onChange={(e) => setFinishedYear(e.target.value)}
                      className="font-special-elite"
                      style={{
                        width: '100px', background: '#111220', border: '1.5px solid rgba(0,217,255,0.35)',
                        borderRadius: '8px', color: finishedYear ? '#F5F5DC' : 'rgba(192,192,192,0.4)',
                        padding: '9px 10px', fontSize: '13px', outline: 'none', cursor: 'pointer',
                      }}
                    >
                      <option value="">Year</option>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Format toggle */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="font-bungee" style={{ fontSize: '10px', color: 'rgba(0,217,255,0.7)', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                    FORMAT
                  </label>
                  <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid rgba(0,217,255,0.3)' }}>
                    {[
                      { value: 'read', label: '📖 READ' },
                      { value: 'audio', label: '🎧 LISTENED' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormat(value)}
                        className="font-bungee"
                        style={{
                          flex: 1, padding: '9px 6px', border: 'none', cursor: 'pointer',
                          fontSize: '10px', letterSpacing: '0.06em', transition: 'background 0.2s, color 0.2s',
                          background: format === value ? '#00D9FF' : 'transparent',
                          color: format === value ? '#0A1A2F' : 'rgba(192,192,192,0.5)',
                          boxShadow: format === value ? '0 0 12px rgba(0,217,255,0.4)' : 'none',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save error */}
                {saveError && (
                  <p className="font-special-elite" style={{ color: '#FF4E00', fontSize: '12px', marginBottom: '10px' }}>
                    {saveError}
                  </p>
                )}

                {/* Add to Log button */}
                <button
                  onClick={handleAddToLog}
                  disabled={saving}
                  className="font-bungee"
                  style={{
                    width: '100%', padding: '13px',
                    background: saving ? 'rgba(255,78,0,0.4)' : '#FF4E00',
                    color: '#1A1B2E', borderRadius: '10px', border: 'none',
                    fontSize: '13px', letterSpacing: '0.08em', cursor: saving ? 'default' : 'pointer',
                    boxShadow: saving ? 'none' : '0 0 18px rgba(255,78,0,0.5)',
                    transition: 'background 0.2s, box-shadow 0.2s',
                  }}
                >
                  {saving ? 'SAVING...' : '+ ADD TO LOG'}
                </button>
              </div>
            )}

            {/* ── Logged books list ── */}
            {loggedBooks.length > 0 && (
              <div>
                {/* Header row: title + sort pills */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h2 className="font-bungee" style={{
                    color: '#39FF14', fontSize: '13px', letterSpacing: '0.08em',
                    textShadow: '0 0 10px rgba(57,255,20,0.6)',
                  }}>
                    YOUR LOG
                  </h2>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {[
                      { key: 'date',        label: 'RECENT' },
                      { key: 'rating-desc', label: '★ BEST' },
                      { key: 'rating-asc',  label: '★ WORST' },
                      { key: 'title',       label: 'A→Z' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => handleSortChange(key)}
                        className="font-bungee"
                        style={{
                          padding: '4px 9px', fontSize: '9px', letterSpacing: '0.07em',
                          borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
                          border: `1.5px solid ${sortOrder === key ? '#39FF14' : 'rgba(57,255,20,0.25)'}`,
                          background: sortOrder === key ? 'rgba(57,255,20,0.15)' : 'transparent',
                          color: sortOrder === key ? '#39FF14' : 'rgba(57,255,20,0.45)',
                          boxShadow: sortOrder === key ? '0 0 8px rgba(57,255,20,0.3)' : 'none',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {sortedBooks.map((entry) =>
                  editingEntry?.id === entry.id ? (
                    <EditPanel
                      key={entry.id}
                      entry={editingEntry}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingEntry(null)}
                      saving={editSaving}
                    />
                  ) : (
                    <LoggedBookCard
                      key={entry.id}
                      entry={entry}
                      onDelete={handleDelete}
                      onEdit={setEditingEntry}
                    />
                  )
                )}
              </div>
            )}

            {loggedBooks.length === 0 && !selectedBook && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.4 }}>📚</div>
                <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.3)', fontSize: '13px', fontStyle: 'italic' }}>
                  Your reading log is empty — start by searching for a book above
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
