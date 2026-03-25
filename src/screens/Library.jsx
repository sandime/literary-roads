import { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { searchBooks } from '../utils/googleBooks';
import { checkAndAwardBadges } from '../utils/badgeChecker';
import BadgeUnlockModal from '../components/BadgeUnlockModal';
import { BackArrowIcon, LibraryIcon } from '../components/Icons';
import PostcardBuilder, { PostcardFront, PostcardBack, downloadPostcardImage } from '../components/PostcardBuilder';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => CURRENT_YEAR - i);

const CAT_FILTER_ACTIVE   = 'sepia(1) saturate(8) hue-rotate(-8deg) brightness(1.05) drop-shadow(0 0 6px rgba(255,200,0,0.95))';
const CAT_FILTER_INACTIVE = 'grayscale(1) brightness(0.38) opacity(0.55)';

// ── Cat rating selector ──────────────────────────────────────────────────────
function CatRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div style={{
      display: 'inline-flex', gap: '6px', alignItems: 'center',
      background: 'rgba(255, 200, 0, 0.07)',
      border: '1px solid rgba(255, 200, 0, 0.22)',
      borderRadius: '12px', padding: '6px 10px',
      boxShadow: '0 0 10px rgba(255,200,0,0.08) inset',
    }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer',
            transition: 'transform 0.15s', transform: display >= n ? 'scale(1.18)' : 'scale(1)' }}
          title={`${n} cat${n > 1 ? 's' : ''}`}
        >
          <img src="/literary-roads/images/retro_cat.png" alt={`cat ${n}`}
            style={{ width: '40px', height: 'auto', display: 'block',
              filter: display >= n ? CAT_FILTER_ACTIVE : CAT_FILTER_INACTIVE,
              transition: 'filter 0.15s' }}
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

// ── Mini cat rating (read-only, carousel) ───────────────────────────────────
function MiniCatRating({ value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <img key={n} src="/literary-roads/images/retro_cat.png" alt=""
          style={{ width: '16px', height: 'auto',
            filter: value >= n ? CAT_FILTER_ACTIVE : CAT_FILTER_INACTIVE }}
        />
      ))}
    </div>
  );
}

// ── Book search ──────────────────────────────────────────────────────────────
function BookSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

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

  const handlePick = (book) => { onSelect(book); setQuery(''); setResults([]); };

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, author..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#111220', border: '2px solid rgba(0,217,255,0.5)',
            borderRadius: '10px', color: '#F5F5DC',
            padding: '12px 40px 12px 14px', fontSize: '15px',
            fontFamily: 'Special Elite, serif', outline: 'none',
            boxShadow: '0 0 12px rgba(0,217,255,0.15)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#00D9FF'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,217,255,0.35)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,217,255,0.5)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,217,255,0.15)'; }}
          autoFocus
        />
        {searching && (
          <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
            width: '16px', height: '16px', border: '2px solid #00D9FF', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'lib-spin 0.7s linear infinite' }} />
        )}
      </div>
      {results.length > 0 && (
        <div style={{ marginTop: '8px', borderRadius: '10px', overflow: 'hidden',
          border: '1.5px solid rgba(0,217,255,0.25)', boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          maxHeight: '280px', overflowY: 'auto' }}>
          {results.map((book, i) => (
            <button key={book.id} type="button" onClick={() => handlePick(book)}
              style={{ width: '100%', display: 'flex', gap: '12px', alignItems: 'center',
                padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                background: 'rgba(0,217,255,0.04)',
                borderTop: i > 0 ? '1px solid rgba(0,217,255,0.1)' : 'none',
                border: 'none', transition: 'background 0.15s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,217,255,0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,217,255,0.04)'}
            >
              <div style={{ width: '40px', height: '56px', flexShrink: 0, borderRadius: '3px',
                overflow: 'hidden', border: '1px solid rgba(0,217,255,0.2)', background: '#1A1B2E' }}>
                {book.coverURL
                  ? <img src={book.coverURL} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📖</div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-bungee" style={{ fontSize: '11px', color: '#F0E6CC', lineHeight: 1.3,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {book.title}
                </p>
                <p className="font-special-elite" style={{ fontSize: '11px', color: 'rgba(192,192,192,0.6)', marginTop: '2px' }}>
                  {book.author}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {!searching && query.length > 1 && results.length === 0 && (
        <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.4)', fontSize: '13px',
          textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
          No results found
        </p>
      )}
    </div>
  );
}

// ── Entry form ───────────────────────────────────────────────────────────────
function EntryForm({ book, onSave, onCancel, saving, saveError, initialRating = 0, initialMonth = '', initialYear = '', initialFormat = 'read', editMode = false }) {
  const [rating, setRating] = useState(initialRating);
  const [finishedMonth, setFinishedMonth] = useState(initialMonth);
  const [finishedYear, setFinishedYear] = useState(initialYear ? String(initialYear) : String(CURRENT_YEAR));
  const [format, setFormat] = useState(initialFormat);

  return (
    <div style={{ borderRadius: '14px', padding: '18px', border: '2px solid rgba(0,217,255,0.4)',
      background: '#080916', boxShadow: '0 0 24px rgba(0,217,255,0.1)' }}>

      {/* Book preview */}
      {book && !editMode && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div style={{ width: '56px', height: '80px', flexShrink: 0, borderRadius: '4px',
            overflow: 'hidden', border: '2px solid rgba(0,217,255,0.4)', background: '#1A1B2E' }}>
            {book.coverURL
              ? <img src={book.coverURL} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📖</div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="font-bungee" style={{ fontSize: '12px', color: '#F0E6CC', lineHeight: 1.35,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {book.title}
            </p>
            <p className="font-special-elite" style={{ fontSize: '12px', color: 'rgba(192,192,192,0.55)', marginTop: '3px' }}>
              {book.author}
            </p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'rgba(192,192,192,0.4)',
            cursor: 'pointer', fontSize: '18px', lineHeight: 1, flexShrink: 0 }} title="Cancel">×</button>
        </div>
      )}

      {editMode && book && (
        <p className="font-bungee" style={{ fontSize: '11px', color: '#00D9FF', marginBottom: '14px', letterSpacing: '0.04em' }}>
          EDITING: {book.bookTitle || book.title}
        </p>
      )}

      {/* Rating */}
      <div style={{ marginBottom: '14px' }}>
        <label className="font-bungee" style={{ fontSize: '10px', color: 'rgba(0,217,255,0.7)', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>RATING</label>
        <CatRating value={rating} onChange={setRating} />
      </div>

      {/* Finished date */}
      <div style={{ marginBottom: '14px' }}>
        <label className="font-bungee" style={{ fontSize: '10px', color: 'rgba(0,217,255,0.7)', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>FINISHED</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={finishedMonth} onChange={(e) => setFinishedMonth(e.target.value)} className="font-special-elite"
            style={{ flex: 1, background: '#111220', border: '1.5px solid rgba(0,217,255,0.35)',
              borderRadius: '8px', color: finishedMonth ? '#F5F5DC' : 'rgba(192,192,192,0.4)',
              padding: '8px 10px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
            <option value="">Month</option>
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={finishedYear} onChange={(e) => setFinishedYear(e.target.value)} className="font-special-elite"
            style={{ width: '100px', background: '#111220', border: '1.5px solid rgba(0,217,255,0.35)',
              borderRadius: '8px', color: finishedYear ? '#F5F5DC' : 'rgba(192,192,192,0.4)',
              padding: '8px 10px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
            <option value="">Year</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Format */}
      <div style={{ marginBottom: '18px' }}>
        <label className="font-bungee" style={{ fontSize: '10px', color: 'rgba(0,217,255,0.7)', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>FORMAT</label>
        <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid rgba(0,217,255,0.3)' }}>
          {[{ value: 'read', label: '📖 READ' }, { value: 'audio', label: '🎧 LISTENED' }].map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setFormat(value)} className="font-bungee"
              style={{ flex: 1, padding: '9px 6px', border: 'none', cursor: 'pointer',
                fontSize: '10px', letterSpacing: '0.06em', transition: 'background 0.2s, color 0.2s',
                background: format === value ? '#00D9FF' : 'transparent',
                color: format === value ? '#0A1A2F' : 'rgba(192,192,192,0.5)',
                boxShadow: format === value ? '0 0 12px rgba(0,217,255,0.4)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {saveError && (
        <p className="font-special-elite" style={{ color: '#FF4E00', fontSize: '12px', marginBottom: '10px' }}>{saveError}</p>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => onSave({ rating, finishedMonth, finishedYear: finishedYear ? Number(finishedYear) : '', format })}
          disabled={saving} className="font-bungee"
          style={{ flex: 1, padding: '10px', background: saving ? 'rgba(255,78,0,0.4)' : '#FF4E00',
            color: '#1A1B2E', borderRadius: '8px', border: 'none', fontSize: '11px',
            letterSpacing: '0.08em', cursor: saving ? 'default' : 'pointer',
            boxShadow: saving ? 'none' : '0 0 12px rgba(255,78,0,0.4)' }}>
          {saving ? 'SAVING...' : 'SAVE'}
        </button>
        <button onClick={onCancel} className="font-bungee"
          style={{ padding: '10px 16px', background: 'transparent',
            border: '1.5px solid rgba(192,192,192,0.25)', borderRadius: '8px',
            color: 'rgba(192,192,192,0.5)', fontSize: '11px', cursor: 'pointer' }}>
          CANCEL
        </button>
      </div>
    </div>
  );
}

// ── Carousel book card ────────────────────────────────────────────────────────
function BookCarouselCard({ entry, isActive, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ flexShrink: 0, width: '90px', background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px', borderRadius: '8px',
        outline: isActive ? '2px solid #40E0D0' : '2px solid transparent',
        boxShadow: isActive ? '0 0 14px rgba(64,224,208,0.4)' : 'none',
        transition: 'outline 0.15s, box-shadow 0.15s' }}
    >
      <div style={{ width: '82px', height: '116px', borderRadius: '5px', overflow: 'hidden',
        border: isActive ? '2px solid #40E0D0' : '2px solid rgba(64,224,208,0.25)',
        boxShadow: isActive ? '0 0 10px rgba(64,224,208,0.3)' : '0 2px 8px rgba(0,0,0,0.4)',
        background: '#1A1B2E' }}>
        {entry.bookCover
          ? <img src={entry.bookCover} alt={entry.bookTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>📖</div>
        }
      </div>
      <MiniCatRating value={entry.rating} />
      <p className="font-special-elite" style={{ fontSize: '10px', color: 'rgba(200,200,200,0.65)',
        textAlign: 'center', lineHeight: 1.3, marginTop: '4px',
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {entry.bookTitle}
      </p>
    </button>
  );
}

// ── Coming soon shelf ─────────────────────────────────────────────────────────
function ComingSoonShelf({ emoji, title, description }) {
  return (
    <div style={{ marginBottom: '16px', borderRadius: '14px', overflow: 'hidden',
      border: '1px solid rgba(255,78,0,0.15)' }}>
      {/* Shelf header */}
      <div style={{ background: 'rgba(255,78,0,0.06)', borderBottom: '1px solid rgba(255,78,0,0.12)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>{emoji}</span>
        <h3 className="font-bungee" style={{ fontSize: '12px', color: '#FF4E00',
          letterSpacing: '0.06em', textShadow: '0 0 8px rgba(255,78,0,0.4)' }}>
          {title}
        </h3>
        <span className="font-bungee" style={{ marginLeft: 'auto', fontSize: '9px',
          color: 'rgba(255,78,0,0.45)', letterSpacing: '0.08em', padding: '2px 8px',
          border: '1px solid rgba(255,78,0,0.2)', borderRadius: '20px' }}>
          COMING SOON
        </span>
      </div>
      <div style={{ padding: '16px', background: 'rgba(255,78,0,0.02)' }}>
        <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.4)', fontSize: '13px',
          fontStyle: 'italic', textAlign: 'center', lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

// ── Main Library component ────────────────────────────────────────────────────
export default function Library({ onBack }) {
  const { user } = useAuth();

  // Book log state
  const [loggedBooks, setLoggedBooks] = useState([]);
  const [showAddSearch, setShowAddSearch] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [activeCard, setActiveCard] = useState(null);  // id of carousel card expanded
  const [editingEntry, setEditingEntry] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [newBadges, setNewBadges] = useState([]);
  const carouselRef = useRef(null);

  // Postcard state
  const [postcards, setPostcards] = useState([]);
  const [showPostcardBuilder, setShowPostcardBuilder] = useState(false);
  const [viewingPostcard, setViewingPostcard] = useState(null);
  const [downloadingPostcard, setDownloadingPostcard] = useState(false);

  // Real-time Firestore sync
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'booksRead'),
      (snap) => setLoggedBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[Library] snapshot:', err)
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'postcards'),
      (snap) => setPostcards(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[Library] postcards snapshot:', err)
    );
    return unsub;
  }, [user]);

  const handlePostcardSaved = (postcard) => {
    setShowPostcardBuilder(false);
    setViewingPostcard(postcard);
  };

  const handleDeletePostcard = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'postcards', id));
      setViewingPostcard(null);
    } catch (err) { console.error('[Library] delete postcard:', err); }
  };

  const handleDownloadPostcard = async (postcard) => {
    setDownloadingPostcard(true);
    try {
      const canvas = await downloadPostcardImage(postcard);
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const slug = (postcard.bookTitle || 'postcard').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
        a.download = `${slug}-${postcard.stateCode || 'lr'}-literary-roads.png`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) { console.error('[Library] download postcard:', err); }
    finally { setDownloadingPostcard(false); }
  };

  const sortedPostcards = [...postcards].sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });

  const sortedBooks = [...loggedBooks].sort((a, b) => {
    const ta = a.timestamp?.toMillis?.() ?? 0;
    const tb = b.timestamp?.toMillis?.() ?? 0;
    return tb - ta;
  });

  const handleAddBook = async ({ rating, finishedMonth, finishedYear, format }) => {
    if (!user || !selectedBook) return;
    setSaving(true);
    setSaveError('');
    try {
      const docId = selectedBook.id.replace(/\//g, '_');
      await setDoc(doc(db, 'users', user.uid, 'booksRead', docId), {
        bookTitle: selectedBook.title,
        bookAuthor: selectedBook.author,
        bookCover: selectedBook.coverURL || null,
        googleBooksId: selectedBook.id,
        rating, finishedMonth, finishedYear: finishedYear ? Number(finishedYear) : '',
        format, timestamp: serverTimestamp(),
      });
      setSelectedBook(null);
      setShowAddSearch(false);
      checkAndAwardBadges(user.uid).then(newly => { if (newly.length > 0) setNewBadges(newly); });
    } catch (err) {
      console.error('[Library] save:', err);
      setSaveError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async ({ rating, finishedMonth, finishedYear, format }) => {
    if (!user || !editingEntry) return;
    setEditSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid, 'booksRead', editingEntry.id), { rating, finishedMonth, finishedYear, format });
      setEditingEntry(null);
      setActiveCard(null);
    } catch (err) { console.error('[Library] edit:', err); }
    finally { setEditSaving(false); }
  };

  const handleDelete = async (docId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'booksRead', docId));
      setActiveCard(null);
    } catch (err) { console.error('[Library] delete:', err); }
  };

  const activeEntry = sortedBooks.find(b => b.id === activeCard);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'radial-gradient(ellipse at 50% 0%, #0a1535 0%, #090A1A 50%, #04050F 100%)',
      overflowY: 'auto',
      fontFamily: 'Special Elite, serif',
    }}>
      <style>{`
        @keyframes lib-spin { to { transform: rotate(360deg); } }
        @keyframes lib-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px 80px' }}>

        {/* ── Header ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(4,5,15,0.97)', borderBottom: '2px solid rgba(64,224,208,0.3)',
          padding: '14px 0 12px', marginBottom: '20px', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <BackArrowIcon size={24} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LibraryIcon size={22} />
              <h1 className="font-bungee" style={{ color: '#40E0D0', fontSize: '16px', letterSpacing: '0.06em',
                textShadow: '0 0 20px rgba(64,224,208,0.8), 0 0 40px rgba(64,224,208,0.4)' }}>
                LITERARY ROADS LIBRARY
              </h1>
            </div>
            <div style={{ width: '48px' }} />
          </div>
        </div>

        {/* ── Welcome ── */}
        {user && (
          <div style={{ marginBottom: '20px', padding: '16px 18px', borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(64,224,208,0.06) 0%, rgba(255,78,0,0.04) 100%)',
            border: '1px solid rgba(64,224,208,0.2)' }}>
            <p className="font-bungee" style={{ color: '#40E0D0', fontSize: '13px', letterSpacing: '0.05em',
              textShadow: '0 0 10px rgba(64,224,208,0.5)', marginBottom: '6px' }}>
              Welcome to Your Library, {user.displayName?.split(' ')[0] || 'Literary Traveler'}!
            </p>
            <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.55)', fontSize: '12px' }}>
              {loggedBooks.length > 0
                ? `${loggedBooks.length} book${loggedBooks.length !== 1 ? 's' : ''} logged`
                : 'Your reading journey starts here'}
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════
             SHELF 1: BOOK LOG
        ══════════════════════════════════════ */}
        <div style={{ marginBottom: '16px', borderRadius: '14px', overflow: 'hidden',
          border: '1px solid rgba(0,217,255,0.2)' }}>

          {/* Shelf header */}
          <div style={{ background: 'rgba(0,217,255,0.05)', borderBottom: '1px solid rgba(0,217,255,0.15)',
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="font-bungee" style={{ fontSize: '13px', color: '#00D9FF',
              letterSpacing: '0.06em', textShadow: '0 0 8px rgba(0,217,255,0.5)' }}>
              BOOK LOG
            </h2>
            {loggedBooks.length > 0 && (
              <span className="font-special-elite" style={{ fontSize: '11px', color: 'rgba(0,217,255,0.45)',
                marginLeft: '4px', paddingTop: '1px' }}>
                ({loggedBooks.length})
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
              {user && (
                <button
                  onClick={() => { setShowAddSearch(v => !v); setSelectedBook(null); setActiveCard(null); setEditingEntry(null); }}
                  className="font-bungee"
                  style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '10px',
                    letterSpacing: '0.06em', border: 'none', cursor: 'pointer',
                    background: showAddSearch ? 'rgba(0,217,255,0.15)' : '#00D9FF',
                    color: showAddSearch ? '#00D9FF' : '#0A1A2F',
                    boxShadow: showAddSearch ? 'none' : '0 0 10px rgba(0,217,255,0.35)',
                    outline: showAddSearch ? '1.5px solid rgba(0,217,255,0.4)' : 'none',
                    transition: 'all 0.15s' }}>
                  {showAddSearch ? '✕ CANCEL' : '+ ADD BOOK'}
                </button>
              )}
            </div>
          </div>

          {/* Shelf body */}
          <div style={{ padding: '16px', background: 'rgba(0,217,255,0.02)' }}>

            {/* Guest prompt */}
            {!user && (
              <div style={{ borderRadius: '10px', padding: '16px', border: '1.5px solid rgba(0,217,255,0.2)',
                background: 'rgba(0,217,255,0.04)', textAlign: 'center' }}>
                <p className="font-bungee" style={{ color: '#00D9FF', fontSize: '12px', marginBottom: '4px' }}>SIGN IN TO LOG BOOKS</p>
                <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.5)', fontSize: '12px' }}>Your book log is saved to your account</p>
              </div>
            )}

            {/* Add book — search */}
            {user && showAddSearch && !selectedBook && (
              <div style={{ marginBottom: '16px', animation: 'lib-fade-in 0.2s ease' }}>
                <p className="font-bungee" style={{ color: 'rgba(0,217,255,0.7)', fontSize: '10px',
                  letterSpacing: '0.08em', marginBottom: '10px' }}>FIND A BOOK</p>
                <BookSearch onSelect={(book) => { setSelectedBook(book); setShowAddSearch(false); }} />
              </div>
            )}

            {/* Add book — entry form */}
            {user && selectedBook && (
              <div style={{ marginBottom: '16px', animation: 'lib-fade-in 0.2s ease' }}>
                <EntryForm
                  book={selectedBook}
                  onSave={handleAddBook}
                  onCancel={() => { setSelectedBook(null); }}
                  saving={saving}
                  saveError={saveError}
                />
              </div>
            )}

            {/* Empty state */}
            {user && !showAddSearch && !selectedBook && loggedBooks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ fontSize: '36px', marginBottom: '10px' }}>📚</p>
                <p className="font-bungee" style={{ color: '#00D9FF', fontSize: '12px',
                  letterSpacing: '0.05em', marginBottom: '6px' }}>YOUR READING JOURNEY STARTS HERE</p>
                <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.45)', fontSize: '13px',
                  fontStyle: 'italic', lineHeight: 1.6 }}>
                  Add your first finished book to start tracking your literary adventures and earning badges.
                </p>
              </div>
            )}

            {/* Book carousel */}
            {user && sortedBooks.length > 0 && (
              <div>
                <div ref={carouselRef} style={{ display: 'flex', gap: '10px', overflowX: 'auto',
                  paddingBottom: '10px', scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(0,217,255,0.2) transparent' }}>
                  {sortedBooks.map((entry) => (
                    <BookCarouselCard
                      key={entry.id}
                      entry={entry}
                      isActive={activeCard === entry.id}
                      onClick={() => {
                        setActiveCard(prev => prev === entry.id ? null : entry.id);
                        setEditingEntry(null);
                        setShowAddSearch(false);
                        setSelectedBook(null);
                      }}
                    />
                  ))}
                </div>

                {/* Expanded detail / edit panel */}
                {activeEntry && !editingEntry && (
                  <div style={{ marginTop: '12px', borderRadius: '12px', padding: '14px',
                    background: '#080916', border: '1.5px solid rgba(64,224,208,0.3)',
                    animation: 'lib-fade-in 0.18s ease' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '52px', height: '74px', flexShrink: 0, borderRadius: '4px',
                        overflow: 'hidden', border: '1.5px solid rgba(0,217,255,0.3)', background: '#1A1B2E' }}>
                        {activeEntry.bookCover
                          ? <img src={activeEntry.bookCover} alt={activeEntry.bookTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>📖</div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="font-bungee" style={{ fontSize: '11px', color: '#F0E6CC', lineHeight: 1.3, marginBottom: '3px' }}>
                          {activeEntry.bookTitle}
                        </p>
                        <p className="font-special-elite" style={{ fontSize: '11px', color: 'rgba(192,192,192,0.5)', marginBottom: '6px' }}>
                          {activeEntry.bookAuthor}
                        </p>
                        {activeEntry.rating > 0 && (
                          <div style={{ display: 'flex', gap: '2px', alignItems: 'center', marginBottom: '5px' }}>
                            {[1,2,3,4,5].map(n => (
                              <img key={n} src="/literary-roads/images/retro_cat.png" alt="" style={{
                                width: '26px', height: 'auto',
                                filter: activeEntry.rating >= n ? CAT_FILTER_ACTIVE : CAT_FILTER_INACTIVE,
                              }} />
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {(activeEntry.finishedMonth || activeEntry.finishedYear) && (
                            <span className="font-special-elite" style={{ fontSize: '10px', color: 'rgba(192,192,192,0.4)' }}>
                              {[activeEntry.finishedMonth, activeEntry.finishedYear].filter(Boolean).join(' ')}
                            </span>
                          )}
                          <span style={{ fontSize: '9px', fontFamily: 'Bungee, sans-serif', letterSpacing: '0.06em',
                            padding: '1px 6px', borderRadius: '4px',
                            background: activeEntry.format === 'audio' ? 'rgba(255,78,0,0.15)' : 'rgba(57,255,20,0.12)',
                            color: activeEntry.format === 'audio' ? '#FF9060' : '#39FF14',
                            border: `1px solid ${activeEntry.format === 'audio' ? 'rgba(255,78,0,0.3)' : 'rgba(57,255,20,0.3)'}` }}>
                            {activeEntry.format === 'audio' ? '🎧 AUDIO' : '📖 READ'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button onClick={() => setEditingEntry(activeEntry)} className="font-bungee"
                        style={{ flex: 1, padding: '8px', background: 'rgba(0,217,255,0.1)',
                          border: '1px solid rgba(0,217,255,0.35)', borderRadius: '8px',
                          color: '#00D9FF', fontSize: '10px', letterSpacing: '0.06em', cursor: 'pointer' }}>
                        ✏ EDIT
                      </button>
                      <button onClick={() => handleDelete(activeEntry.id)} className="font-bungee"
                        style={{ padding: '8px 14px', background: 'rgba(255,78,0,0.1)',
                          border: '1px solid rgba(255,78,0,0.3)', borderRadius: '8px',
                          color: '#FF4E00', fontSize: '10px', letterSpacing: '0.06em', cursor: 'pointer' }}>
                        DELETE
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit panel */}
                {editingEntry && (
                  <div style={{ marginTop: '12px', animation: 'lib-fade-in 0.18s ease' }}>
                    <EntryForm
                      book={editingEntry}
                      editMode
                      initialRating={editingEntry.rating ?? 0}
                      initialMonth={editingEntry.finishedMonth ?? ''}
                      initialYear={editingEntry.finishedYear ?? ''}
                      initialFormat={editingEntry.format ?? 'read'}
                      onSave={handleEditSave}
                      onCancel={() => setEditingEntry(null)}
                      saving={editSaving}
                    />
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ══════════════════════════════════════
             SHELF 2: POSTCARD BOOKS
        ══════════════════════════════════════ */}
        <div style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,78,0,0.2)' }}>

          {/* Shelf header */}
          <div style={{ background: 'rgba(255,78,0,0.05)', borderBottom: '1px solid rgba(255,78,0,0.15)',
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="font-bungee" style={{ fontSize: 13, color: '#FF4E00', letterSpacing: '0.06em',
              margin: 0, textShadow: '0 0 8px rgba(255,78,0,0.4)' }}>
              POSTCARD BOOKS
            </h2>
            {postcards.length > 0 && (
              <span className="font-special-elite" style={{ fontSize: 11, color: 'rgba(255,78,0,0.45)', paddingTop: 1 }}>
                ({postcards.length})
              </span>
            )}
            {user && (
              <button onClick={() => setShowPostcardBuilder(true)} className="font-bungee"
                style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, fontSize: 10,
                  letterSpacing: '0.06em', border: 'none', cursor: 'pointer',
                  background: '#FF4E00', color: '#1A1B2E',
                  boxShadow: '0 0 10px rgba(255,78,0,0.35)', transition: 'all 0.15s' }}>
                + CREATE POSTCARD
              </button>
            )}
          </div>

          {/* Shelf body */}
          <div style={{ padding: 16, background: 'rgba(255,78,0,0.02)' }}>

            {!user && (
              <div style={{ borderRadius: 10, padding: 16, border: '1.5px solid rgba(255,78,0,0.2)',
                background: 'rgba(255,78,0,0.04)', textAlign: 'center' }}>
                <p className="font-bungee" style={{ color: '#FF4E00', fontSize: 12, margin: '0 0 4px' }}>SIGN IN TO CREATE POSTCARDS</p>
                <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.5)', fontSize: 12, margin: 0 }}>Share your reading adventures with fellow travelers</p>
              </div>
            )}

            {user && sortedPostcards.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 16px' }}>
                <p className="font-bungee" style={{ color: '#FF4E00', fontSize: 13, letterSpacing: '0.05em', marginBottom: 8 }}>
                  SHARE YOUR READING ADVENTURES
                </p>
                <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.45)', fontSize: 13,
                  fontStyle: 'italic', lineHeight: 1.6, marginBottom: 16 }}>
                  Create beautiful vintage postcards that capture the moment you discovered a book. Perfect for sharing on social media.
                </p>
                <button onClick={() => setShowPostcardBuilder(true)} className="font-bungee"
                  style={{ padding: '9px 20px', borderRadius: 10, fontSize: 11, letterSpacing: '0.06em',
                    border: 'none', cursor: 'pointer', background: '#FF4E00', color: '#1A1B2E',
                    boxShadow: '0 0 12px rgba(255,78,0,0.4)' }}>
                  + CREATE YOUR FIRST POSTCARD
                </button>
              </div>
            )}

            {user && sortedPostcards.length > 0 && (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10,
                scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,78,0,0.2) transparent' }}>
                {sortedPostcards.map(pc => (
                  <button key={pc.id} type="button" onClick={() => setViewingPostcard(pc)}
                    style={{ flexShrink: 0, width: 120, background: 'none', border: 'none', cursor: 'pointer',
                      padding: 0, borderRadius: 6, outline: '2px solid transparent',
                      transition: 'outline 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.outline = '2px solid rgba(255,78,0,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.outline = '2px solid transparent'}
                  >
                    {/* Mini postcard thumbnail */}
                    <div style={{ width: 120, height: 80, background: '#FFFDE7', border: '2px solid #8B4513',
                      borderRadius: 4, overflow: 'hidden', position: 'relative',
                      boxShadow: '2px 2px 6px rgba(0,0,0,0.3)' }}>
                      {pc.bookCover && (
                        <img src={pc.bookCover} alt={pc.bookTitle}
                          style={{ position: 'absolute', left: 5, top: 5, width: 36, height: 54, objectFit: 'cover', border: '1px solid #8B4513' }} />
                      )}
                      {pc.stateCode && (
                        <div style={{ position: 'absolute', top: 4, right: 4,
                          background: '#F4ECCC', border: '1px solid #8B4513', padding: '2px 5px',
                          fontSize: 11, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#2c1810',
                          transform: 'rotate(-5deg)', boxShadow: '1px 1px 3px rgba(0,0,0,0.25)' }}>
                          {pc.stateCode}
                        </div>
                      )}
                    </div>
                    <p className="font-bungee" style={{ fontSize: 9, color: '#FF4E00', margin: '4px 0 1px',
                      textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                      {pc.stateCode}{pc.city ? ` · ${pc.city}` : ''}
                    </p>
                    <p className="font-special-elite" style={{ fontSize: 9, color: 'rgba(192,192,192,0.5)',
                      margin: 0, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', maxWidth: 120 }}>
                      {pc.bookTitle}
                    </p>
                  </button>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* ══════════════════════════════════════
             SHELF 3: MY RECOMMENDATIONS
        ══════════════════════════════════════ */}
        <ComingSoonShelf
          emoji="⭐"
          title="MY RECOMMENDATIONS"
          description="Share your favorite books with fellow literary travelers."
        />

        {/* ══════════════════════════════════════
             SHELF 4: WANT TO READ NEXT
        ══════════════════════════════════════ */}
        <ComingSoonShelf
          emoji="🔖"
          title="WANT TO READ NEXT"
          description="Keep track of books you want to read on your next road trip."
        />

      </div>

      {/* Badge unlock modal */}
      {newBadges.length > 0 && (
        <BadgeUnlockModal badges={newBadges} onClose={() => setNewBadges([])} />
      )}

      {/* Postcard builder overlay */}
      {showPostcardBuilder && (
        <PostcardBuilder
          loggedBooks={sortedBooks}
          onClose={() => setShowPostcardBuilder(false)}
          onSaved={handlePostcardSaved}
        />
      )}

      {/* Postcard view overlay */}
      {viewingPostcard && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(4,5,15,0.97)',
          backdropFilter: 'blur(6px)',
          overflowY: 'auto', padding: '20px 16px 60px',
          fontFamily: 'Special Elite, serif' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
              paddingBottom: 14, borderBottom: '1px solid rgba(255,78,0,0.2)' }}>
              <button onClick={() => setViewingPostcard(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <BackArrowIcon size={20} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-bungee" style={{ margin: 0, fontSize: 13, color: '#FF4E00',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {viewingPostcard.bookTitle}
                </p>
                <p className="font-special-elite" style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(192,192,192,0.45)' }}>
                  {viewingPostcard.city ? `${viewingPostcard.city}, ${viewingPostcard.state}` : viewingPostcard.state}
                  {viewingPostcard.createdAt && (
                    <> &middot; {new Date(viewingPostcard.createdAt?.toDate?.() ?? viewingPostcard.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                  )}
                </p>
              </div>
            </div>

            {/* Postcard previews — stacked on mobile, side by side on wider screens */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24, alignItems: 'center' }}>
              {/* Front */}
              <div>
                <p className="font-bungee" style={{ fontSize: 9, color: 'rgba(255,78,0,0.5)', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 8 }}>FRONT</p>
                <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center', height: 222, pointerEvents: 'none' }}>
                  <PostcardFront data={viewingPostcard} scale={1} />
                </div>
              </div>
              {/* Back */}
              <div>
                <p className="font-bungee" style={{ fontSize: 9, color: 'rgba(255,78,0,0.5)', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 8 }}>BACK</p>
                <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center', height: 222, pointerEvents: 'none' }}>
                  <PostcardBack data={viewingPostcard} scale={1} />
                </div>
              </div>
            </div>

            {/* Hashtags */}
            {viewingPostcard.hashtags?.length > 0 && (
              <p className="font-special-elite" style={{ fontSize: 12, color: 'rgba(255,78,0,0.6)',
                marginBottom: 20, textAlign: 'center' }}>
                {viewingPostcard.hashtags.join(' ')}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => handleDownloadPostcard(viewingPostcard)} disabled={downloadingPostcard}
                className="font-bungee"
                style={{ padding: '13px 0', borderRadius: 10, fontSize: 12, letterSpacing: '0.08em',
                  border: 'none', cursor: downloadingPostcard ? 'default' : 'pointer',
                  background: downloadingPostcard ? 'rgba(255,78,0,0.4)' : '#FF4E00', color: '#1A1B2E',
                  boxShadow: downloadingPostcard ? 'none' : '0 0 14px rgba(255,78,0,0.4)' }}>
                {downloadingPostcard ? 'GENERATING...' : 'DOWNLOAD IMAGE'}
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => {
                    const caption = [viewingPostcard.message, ...(viewingPostcard.hashtags || [])].join(' ');
                    const url = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(caption)}`;
                    window.open(url, '_blank', 'noopener,width=600,height=400');
                  }} className="font-bungee"
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 11, letterSpacing: '0.06em',
                    border: '1.5px solid rgba(255,78,0,0.35)', background: 'rgba(255,78,0,0.07)',
                    color: '#FF4E00', cursor: 'pointer' }}>
                  FACEBOOK
                </button>
                <button onClick={() => {
                    const img = viewingPostcard.bookCover || '';
                    const desc = [viewingPostcard.bookTitle, viewingPostcard.message, ...(viewingPostcard.hashtags || [])].join(' ');
                    const url = `https://pinterest.com/pin/create/button/?description=${encodeURIComponent(desc)}&media=${encodeURIComponent(img)}`;
                    window.open(url, '_blank', 'noopener,width=600,height=500');
                  }} className="font-bungee"
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 11, letterSpacing: '0.06em',
                    border: '1.5px solid rgba(255,78,0,0.35)', background: 'rgba(255,78,0,0.07)',
                    color: '#FF4E00', cursor: 'pointer' }}>
                  PINTEREST
                </button>
                <button onClick={async () => {
                    const caption = [viewingPostcard.message, ...(viewingPostcard.hashtags || [])].join(' ');
                    try { await navigator.clipboard.writeText(caption); alert('Caption copied! Now open Instagram and upload your downloaded image.'); }
                    catch { alert('Download the image, then open Instagram to share.'); }
                  }} className="font-bungee"
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 11, letterSpacing: '0.06em',
                    border: '1.5px solid rgba(255,78,0,0.35)', background: 'rgba(255,78,0,0.07)',
                    color: '#FF4E00', cursor: 'pointer' }}>
                  INSTAGRAM
                </button>
              </div>

              <button onClick={() => handleDeletePostcard(viewingPostcard.id)} className="font-bungee"
                style={{ padding: '10px 0', borderRadius: 10, fontSize: 11, letterSpacing: '0.06em',
                  border: '1.5px solid rgba(255,78,0,0.2)', background: 'transparent',
                  color: 'rgba(255,78,0,0.45)', cursor: 'pointer', marginTop: 4 }}>
                DELETE POSTCARD
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
