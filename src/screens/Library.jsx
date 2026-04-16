import { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { searchBooks } from '../utils/googleBooks';
import { checkAndAwardBadges } from '../utils/badgeChecker';
import BadgeUnlockModal from '../components/BadgeUnlockModal';
import { BackArrowIcon, LibraryIcon } from '../components/Icons';
import PostcardBuilder from '../components/PostcardBuilder';
import LibraryHome from './LibraryHome';
import LibraryArchive from './LibraryArchive';
import { useDiscoveredAuthors } from '../utils/discoveredAuthors';
import { AUTHOR_TIDBITS } from '../data/authorTidbits';

// ── Cover image helpers ───────────────────────────────────────────────────────
const CAT_SRC = `${import.meta.env.BASE_URL}images/library-cat.png`;
// onLoad: catches Open Library's 1×1 placeholder GIF (loads but naturalWidth === 1)
const onCoverLoad  = (e) => { if (e.target.naturalWidth <= 1) e.target.src = CAT_SRC; };
const onCoverError = (e) => { e.target.onerror = null; e.target.src = CAT_SRC; };

// ── Library palette ────────────────────────────────────────────────────────────
const L = {
  bg:       '#FFF8E7',
  turquoise:'#38C5C5',
  coral:    '#FF6B7A',
  peach:    '#FFB8A3',
  gold:     '#F5A623',
  dark:     '#2D2D2D',
  mid:      '#555555',
  muted:    '#999999',
  white:    '#FFFFFF',
  card:     '#FAFAFA',
  divider:  'rgba(56,197,197,0.18)',
  inputBg:  '#FFFFFF',
  inputBdr: 'rgba(56,197,197,0.55)',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => CURRENT_YEAR - i);

const LOG_VIBE_TAGS = [
  'immersive', 'family drama', 'character-driven', 'beautiful prose',
  'haunting', 'life changing', 'plot-driven', 'entertaining',
  'mind-bending', 'redemptive', 'comforting', 'surprising',
  'great ending', 'notable setting', 'slow', 'thought provoking', 'read again',
];
const FOUND_AT_OPTIONS = [
  'recommendation', 'podcast', 'library', 'bookstore',
  "friend's shelf", 'book review', 'Instagram', 'BookTok', 'somewhere else',
];
const FEEL_OPTIONS    = ['joyful', 'changed', 'sad', 'emotional'];
const EXTRAS_OPTIONS  = ['memorable characters', 'unforgettable line', 'scenery', 'great idea'];

const NF_VIBE_TAGS = [
  'eye-opening', 'well researched', 'accessible', 'dense', 'inspiring',
  'practical', 'changed my mind', 'fascinating', 'timely', 'essential reading',
  'beautifully written', 'quick read', 'deep dive', 'personal', 'controversial', 'life changing',
];
const NF_FEEL_OPTIONS   = ['inspired', 'informed', 'challenged', 'motivated', 'overwhelmed', 'enlightened', 'skeptical', 'moved'];
const NF_EXTRAS_OPTIONS = ['changed my perspective', 'surprising facts', 'would read again', 'dense but worth it', 'accessible writing'];

// Detect fiction vs nonfiction from Google Books categories array
function detectBookType(categories) {
  if (!categories?.length) return 'fiction';
  const joined = categories.join(' ').toLowerCase();
  if (joined.includes('nonfiction') || joined.includes('non-fiction') || joined.includes('non fiction')) return 'nonfiction';
  if (joined.includes('fiction')) return 'fiction';
  return 'fiction';
}

const CAT_FILTER_ACTIVE   = 'sepia(1) saturate(8) hue-rotate(-8deg) brightness(1.05) drop-shadow(0 0 6px rgba(245,166,35,0.9))';
const CAT_FILTER_INACTIVE = 'grayscale(1) brightness(0.55) opacity(0.4)';

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Shared input / button styles ──────────────────────────────────────────────
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: L.inputBg, border: `1.5px solid ${L.inputBdr}`,
  borderRadius: 10, color: L.dark,
  padding: '11px 14px', fontSize: 14,
  fontFamily: 'Special Elite, serif', outline: 'none',
  transition: 'border-color 0.2s',
};

const primaryBtn = {
  background: L.turquoise, color: L.white,
  border: 'none', borderRadius: 8, cursor: 'pointer',
  fontFamily: 'Bungee, sans-serif', letterSpacing: '0.06em',
  transition: 'opacity 0.15s, transform 0.15s',
};

const coralBtn = {
  background: L.coral, color: L.white,
  border: 'none', borderRadius: 8, cursor: 'pointer',
  fontFamily: 'Bungee, sans-serif', letterSpacing: '0.06em',
  transition: 'opacity 0.15s',
};

const ghostBtn = {
  background: 'transparent',
  border: `1.5px solid rgba(0,0,0,0.18)`,
  borderRadius: 8, color: L.mid, cursor: 'pointer',
  fontFamily: 'Bungee, sans-serif', letterSpacing: '0.06em',
  transition: 'border-color 0.15s, color 0.15s',
};

const deleteBtn = {
  background: 'rgba(255,107,122,0.07)',
  border: '1px solid rgba(255,107,122,0.3)',
  borderRadius: 8, color: L.coral, cursor: 'pointer',
  fontFamily: 'Bungee, sans-serif', letterSpacing: '0.06em',
  transition: 'background 0.15s',
};

// ── Cat rating ────────────────────────────────────────────────────────────────
function CatRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div style={{
      display: 'inline-flex', gap: 6, alignItems: 'center',
      background: 'rgba(245,166,35,0.08)',
      border: '1px solid rgba(245,166,35,0.25)',
      borderRadius: 12, padding: '6px 10px',
    }}>
      {[1,2,3,4,5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
          style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer',
            transition: 'transform 0.15s', transform: display >= n ? 'scale(1.18)' : 'scale(1)' }}
        >
          <img src="/literary-roads/images/retro_cat.png" alt={`${n}`}
            style={{ width: 38, height: 'auto', display: 'block',
              filter: display >= n ? CAT_FILTER_ACTIVE : CAT_FILTER_INACTIVE,
              transition: 'filter 0.15s' }}
          />
        </button>
      ))}
      {value > 0 && (
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.gold, letterSpacing: '0.06em', marginLeft: 4 }}>
          {value}/5
        </span>
      )}
    </div>
  );
}

function MiniCatRating({ value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
      {[1,2,3,4,5].map((n) => (
        <img key={n} src="/literary-roads/images/retro_cat.png" alt=""
          style={{ width: 14, height: 'auto', filter: value >= n ? CAT_FILTER_ACTIVE : CAT_FILTER_INACTIVE }} />
      ))}
    </div>
  );
}

// ── Book search ───────────────────────────────────────────────────────────────
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
      setResults(r); setSearching(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handlePick = (book) => { onSelect(book); setQuery(''); setResults([]); };

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search title, author..."
          style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderColor = L.turquoise; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(56,197,197,0.15)`; }}
          onBlur={e => { e.currentTarget.style.borderColor = L.inputBdr; e.currentTarget.style.boxShadow = 'none'; }}
          autoFocus
        />
        {searching && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            width: 16, height: 16, border: `2px solid ${L.turquoise}`, borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'lib-spin 0.7s linear infinite' }} />
        )}
      </div>
      {results.length > 0 && (
        <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden',
          border: `1.5px solid ${L.divider}`, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          maxHeight: 280, overflowY: 'auto' }}>
          {results.map((book, i) => (
            <button key={book.id} type="button" onClick={() => handlePick(book)}
              style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'center',
                padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                background: L.white,
                borderTop: i > 0 ? `1px solid ${L.divider}` : 'none',
                border: 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,197,197,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = L.white}
            >
              <div style={{ width: 40, height: 56, flexShrink: 0, borderRadius: 3, overflow: 'hidden',
                border: `1px solid ${L.divider}`, background: L.card }}>
                <img src={book.coverURL || CAT_SRC}
                  onLoad={onCoverLoad} onError={onCoverError}
                  alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark, margin: 0,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
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
        <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 13,
          textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
          No results found
        </p>
      )}
    </div>
  );
}

// ── Entry form (Book Log) ─────────────────────────────────────────────────────
function EntryForm({
  book, onSave, onCancel, saving, saveError, editMode = false,
  initialRating = 0, initialMonth = '', initialYear = '', initialFormat = 'read',
  initialReflection = '', initialVibeTags = [], initialFoundAt = [],
  initialFeel = [], initialExtras = [], initialRecommend = false,
  initialIsPrivate = false, initialPersonalNotes = '', initialPersonalNotesPrivate = true,
  initialBookType = 'fiction',
  initialWhatYouLearned = '', initialChangedThinking = '', initialWillApply = '',
}) {
  const [rating, setRating] = useState(initialRating);
  const [finishedMonth, setFinishedMonth] = useState(initialMonth);
  const [finishedYear, setFinishedYear] = useState(initialYear ? String(initialYear) : String(CURRENT_YEAR));
  const [format, setFormat] = useState(initialFormat);
  const [reflection, setReflection] = useState(initialReflection);
  const [logVibeTags, setLogVibeTags] = useState(initialVibeTags);
  const [foundAt, setFoundAt] = useState(initialFoundAt);
  const [feel, setFeel] = useState(initialFeel);
  const [extras, setExtras] = useState(initialExtras);
  const [recommend, setRecommend] = useState(initialRecommend);
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [personalNotes, setPersonalNotes] = useState(initialPersonalNotes);
  const [personalNotesPrivate, setPersonalNotesPrivate] = useState(initialPersonalNotesPrivate);
  const [bookType, setBookType] = useState(initialBookType);
  const [whatYouLearned, setWhatYouLearned] = useState(initialWhatYouLearned);
  const [changedThinking, setChangedThinking] = useState(initialChangedThinking);
  const [willApply, setWillApply] = useState(initialWillApply);

  // Auto-detect fiction vs nonfiction from Google Books categories (new books only)
  useEffect(() => {
    if (editMode) return;
    const detected = detectBookType(book?.categories);
    setBookType(detected);
  }, [book?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePill = (setter, val) =>
    () => setter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const ToggleSwitch = ({ checked, onChange }) => (
    <div onClick={onChange} style={{
      width: 40, height: 22, borderRadius: 11, cursor: 'pointer', flexShrink: 0,
      background: checked ? '#38C5C5' : 'rgba(56,197,197,0.15)',
      border: `1.5px solid ${checked ? '#38C5C5' : 'rgba(56,197,197,0.35)'}`,
      position: 'relative', transition: 'background 0.2s, border-color 0.2s',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: checked ? '#FFF8E7' : 'rgba(56,197,197,0.6)',
        position: 'absolute', top: 2,
        left: checked ? 20 : 2,
        transition: 'left 0.2s',
      }} />
    </div>
  );

  const ClosedLockSVG = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38C5C5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );

  const OpenLockSVG = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    </svg>
  );

  const pillBtn = (active) => ({
    padding: '4px 10px', borderRadius: 20, fontSize: 10, letterSpacing: '0.04em',
    fontFamily: 'Bungee, sans-serif', border: 'none', cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? L.turquoise : 'rgba(56,197,197,0.08)',
    color: active ? L.white : L.mid,
  });

  const selectStyle = {
    ...inputStyle, cursor: 'pointer',
    appearance: 'none', WebkitAppearance: 'none',
  };

  return (
    <div style={{ borderRadius: 14, padding: 18, border: `2px solid ${L.inputBdr}`,
      background: L.white, boxShadow: '0 2px 12px rgba(56,197,197,0.1)' }}>
      {book && !editMode && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ width: 56, height: 80, flexShrink: 0, borderRadius: 4,
            overflow: 'hidden', border: `2px solid ${L.divider}`, background: L.card }}>
            <img src={book.coverURL || CAT_SRC}
              onLoad={onCoverLoad} onError={onCoverError}
              alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: L.dark, lineHeight: 1.35, margin: 0,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {book.title}
            </p>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: L.mid, margin: '3px 0 0' }}>
              {book.author}
            </p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: L.muted,
            cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
      )}
      {editMode && book && (
        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.turquoise, marginBottom: 14, letterSpacing: '0.04em' }}>
          EDITING: {book.bookTitle || book.title}
        </p>
      )}

      {/* Section 1 — Book Privacy Toggle */}
      <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10,
        background: 'rgba(56,197,197,0.06)', border: '1px solid rgba(56,197,197,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isPrivate ? <ClosedLockSVG /> : <OpenLockSVG />}
            <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em' }}>
              KEEP THIS BOOK PRIVATE
            </span>
          </div>
          <ToggleSwitch checked={isPrivate} onChange={() => setIsPrivate(p => !p)} />
        </div>
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, margin: '6px 0 0 21px', lineHeight: 1.5 }}>
          Private books never appear on your public profile or Archive
        </p>
      </div>

      {/* Fiction / Non-Fiction toggle */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1.5px solid ${L.divider}` }}>
          {[{ value: 'fiction', label: 'FICTION' }, { value: 'nonfiction', label: 'NON-FICTION' }].map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setBookType(value)}
              style={{ flex: 1, padding: '9px 6px', border: 'none', cursor: 'pointer',
                fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em',
                transition: 'background 0.2s, color 0.2s',
                background: bookType === value ? L.turquoise : 'transparent',
                color: bookType === value ? L.white : L.muted }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>RATING</label>
        <CatRating value={rating} onChange={setRating} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>FINISHED</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={finishedMonth} onChange={e => setFinishedMonth(e.target.value)}
            style={{ ...selectStyle, flex: 1, color: finishedMonth ? L.dark : L.muted }}>
            <option value="">Month</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={finishedYear} onChange={e => setFinishedYear(e.target.value)}
            style={{ ...selectStyle, width: 100, color: finishedYear ? L.dark : L.muted }}>
            <option value="">Year</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>FORMAT</label>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1.5px solid ${L.divider}` }}>
          {[{ value: 'read', label: 'READ' }, { value: 'audio', label: 'LISTENED' }].map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setFormat(value)}
              style={{ flex: 1, padding: '9px 6px', border: 'none', cursor: 'pointer',
                fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em',
                transition: 'background 0.2s, color 0.2s',
                background: format === value ? L.turquoise : 'transparent',
                color: format === value ? L.white : L.muted }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* One-line reflection */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>ONE-LINE REFLECTION</label>
        <input
          type="text"
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          placeholder="A single sentence about this book…"
          style={{ ...inputStyle, padding: '8px 10px' }}
        />
      </div>

      {/* Vibe tags — fiction */}
      {bookType === 'fiction' && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>VIBE TAGS</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {LOG_VIBE_TAGS.map(tag => (
              <button key={tag} type="button" onClick={togglePill(setLogVibeTags, tag)} style={pillBtn(logVibeTags.includes(tag))}>
                {tag.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vibe tags — non-fiction */}
      {bookType === 'nonfiction' && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>VIBE TAGS</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {NF_VIBE_TAGS.map(tag => (
              <button key={tag} type="button" onClick={togglePill(setLogVibeTags, tag)} style={pillBtn(logVibeTags.includes(tag))}>
                {tag.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Where did you find this book? */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>WHERE DID YOU FIND THIS BOOK?</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {FOUND_AT_OPTIONS.map(opt => (
            <button key={opt} type="button" onClick={togglePill(setFoundAt, opt)} style={pillBtn(foundAt.includes(opt))}>
              {opt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* How did this book make you feel — fiction */}
      {bookType === 'fiction' && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>HOW DID THIS BOOK MAKE YOU FEEL?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {FEEL_OPTIONS.map(opt => (
              <button key={opt} type="button" onClick={togglePill(setFeel, opt)} style={pillBtn(feel.includes(opt))}>
                {opt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* How did this book make you feel — non-fiction */}
      {bookType === 'nonfiction' && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>HOW DID THIS BOOK MAKE YOU FEEL?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {NF_FEEL_OPTIONS.map(opt => (
              <button key={opt} type="button" onClick={togglePill(setFeel, opt)} style={pillBtn(feel.includes(opt))}>
                {opt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* What else — fiction */}
      {bookType === 'fiction' && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>WHAT ELSE DID YOU WANT TO SAY?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {EXTRAS_OPTIONS.map(opt => (
              <button key={opt} type="button" onClick={togglePill(setExtras, opt)} style={pillBtn(extras.includes(opt))}>
                {opt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* What else — non-fiction */}
      {bookType === 'nonfiction' && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>WHAT ELSE?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {NF_EXTRAS_OPTIONS.map(opt => (
              <button key={opt} type="button" onClick={togglePill(setExtras, opt)} style={pillBtn(extras.includes(opt))}>
                {opt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Non-fiction only: 3 reflection text fields */}
      {bookType === 'nonfiction' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>WHAT DID YOU LEARN?</label>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, margin: '0 0 8px', lineHeight: 1.5 }}>What surprised or stayed with you?</p>
            <textarea value={whatYouLearned} onChange={e => setWhatYouLearned(e.target.value)}
              placeholder="What surprised or stayed with you?"
              rows={3}
              style={{ ...inputStyle, padding: '8px 10px', resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>DID IT CHANGE HOW YOU THINK?</label>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, margin: '0 0 8px', lineHeight: 1.5 }}>About anything — big or small</p>
            <textarea value={changedThinking} onChange={e => setChangedThinking(e.target.value)}
              placeholder="About anything — big or small"
              rows={3}
              style={{ ...inputStyle, padding: '8px 10px', resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>WILL YOU APPLY ANYTHING?</label>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, margin: '0 0 8px', lineHeight: 1.5 }}>An idea, habit, or perspective</p>
            <textarea value={willApply} onChange={e => setWillApply(e.target.value)}
              placeholder="An idea, habit, or perspective"
              rows={3}
              style={{ ...inputStyle, padding: '8px 10px', resize: 'vertical' }} />
          </div>
        </>
      )}

      {/* Would you recommend? */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em' }}>WOULD YOU RECOMMEND?</label>
        <button type="button" onClick={() => setRecommend(p => !p)}
          style={{
            ...pillBtn(recommend),
            padding: '5px 14px', fontSize: 10,
            boxShadow: recommend ? '0 2px 8px rgba(56,197,197,0.35)' : 'none',
          }}>
          {recommend ? '✓ YES' : 'YES'}
        </button>
      </div>

      {/* Section 2 — Personal Notes */}
      <div style={{ marginBottom: 18, padding: 14, borderRadius: 10,
        background: 'rgba(255,184,163,0.2)', border: '1px solid rgba(245,166,35,0.3)' }}>
        <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.turquoise, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
          PERSONAL NOTES
        </label>
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, margin: '0 0 10px', lineHeight: 1.5 }}>
          Private by default — toggle to include when sharing
        </p>
        <textarea
          value={personalNotes}
          onChange={e => setPersonalNotes(e.target.value)}
          placeholder="Your private thoughts, notes, and reflections…"
          rows={7}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            fontFamily: 'Special Elite, serif', fontSize: 13,
            color: L.dark, background: L.white,
            border: `1.5px solid #F5A623`, borderRadius: 8,
            padding: '10px 12px', lineHeight: 1.6, outline: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          {personalNotesPrivate ? <ClosedLockSVG /> : <OpenLockSVG />}
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, flex: 1 }}>
            {personalNotesPrivate ? 'Notes are private' : 'Notes included when sharing'}
          </span>
          <ToggleSwitch checked={!personalNotesPrivate} onChange={() => setPersonalNotesPrivate(p => !p)} />
        </div>
      </div>

      {saveError && (
        <p style={{ fontFamily: 'Special Elite, serif', color: L.coral, fontSize: 12, marginBottom: 10 }}>{saveError}</p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onSave({ rating, finishedMonth, finishedYear: finishedYear ? Number(finishedYear) : '', format, reflection, vibeTags: logVibeTags, foundAt, feel, extras, recommend, isPrivate, personalNotes, personalNotesPrivate, bookType, whatYouLearned, changedThinking, willApply })}
          disabled={saving}
          style={{ ...primaryBtn, flex: 1, padding: 10, fontSize: 11, opacity: saving ? 0.5 : 1 }}>
          {saving ? 'SAVING...' : 'SAVE'}
        </button>
        <button onClick={onCancel} style={{ ...ghostBtn, padding: '10px 16px', fontSize: 11 }}>
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
      style={{ flexShrink: 0, width: 90, background: 'none', border: 'none', cursor: 'pointer',
        padding: 4, borderRadius: 8,
        outline: isActive ? `2px solid ${L.turquoise}` : '2px solid transparent',
        boxShadow: isActive ? `0 0 12px rgba(56,197,197,0.35)` : 'none',
        transition: 'outline 0.15s, box-shadow 0.15s' }}
    >
      <div style={{ width: 82, height: 116, borderRadius: 5, overflow: 'hidden',
        border: isActive ? `2px solid ${L.turquoise}` : `2px solid rgba(56,197,197,0.2)`,
        boxShadow: isActive ? `0 0 8px rgba(56,197,197,0.25)` : '0 2px 8px rgba(0,0,0,0.1)',
        background: L.card }}>
        <img src={entry.bookCover || CAT_SRC}
          onLoad={onCoverLoad} onError={onCoverError}
          alt={entry.bookTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <MiniCatRating value={entry.rating} />
      <p style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.mid,
        textAlign: 'center', lineHeight: 1.3, marginTop: 4,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {entry.bookTitle}
      </p>
    </button>
  );
}

// ── Recs / ReadNext carousel card (no cat rating) ────────────────────────────
function CoverCard({ item, isActive, onClick }) {
  const cover = item.coverUrl || item.bookCover;
  const title = item.title || item.bookTitle;
  return (
    <button type="button" onClick={onClick}
      style={{ flexShrink: 0, width: 86, background: 'none', border: 'none', cursor: 'pointer',
        padding: 4, borderRadius: 8,
        outline: isActive ? `2px solid ${L.gold}` : '2px solid transparent',
        boxShadow: isActive ? `0 0 12px rgba(245,166,35,0.3)` : 'none',
        transition: 'outline 0.15s, box-shadow 0.15s' }}
    >
      <div style={{ width: 78, height: 112, borderRadius: 5, overflow: 'hidden',
        border: isActive ? `2px solid ${L.gold}` : `2px solid rgba(245,166,35,0.2)`,
        background: L.card }}>
        <img src={cover || CAT_SRC}
          onLoad={onCoverLoad} onError={onCoverError}
          alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <p style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.mid,
        textAlign: 'center', lineHeight: 1.3, marginTop: 4,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {title}
      </p>
    </button>
  );
}

// ── Postcard shelf card (book cover + state badge) ────────────────────────────
function PostcardShelfCard({ pc, isActive, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ flexShrink: 0, width: 90, background: 'none', border: 'none', cursor: 'pointer',
        padding: 4, borderRadius: 8,
        outline: isActive ? `2px solid ${L.coral}` : '2px solid transparent',
        boxShadow: isActive ? `0 0 12px rgba(255,107,122,0.35)` : 'none',
        transition: 'outline 0.15s, box-shadow 0.15s' }}
    >
      <div style={{ width: 82, height: 116, borderRadius: 5, overflow: 'hidden', position: 'relative',
        border: isActive ? `2px solid ${L.coral}` : `2px solid rgba(255,107,122,0.2)`,
        boxShadow: isActive ? `0 0 8px rgba(255,107,122,0.25)` : '0 2px 8px rgba(0,0,0,0.1)',
        background: L.card }}>
        <img src={pc.bookCover || CAT_SRC}
          onLoad={onCoverLoad} onError={onCoverError}
          alt={pc.bookTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {pc.stateCode && (
          <div style={{ position: 'absolute', bottom: 4, right: 4,
            background: '#F4ECCC', border: '1px solid #8B4513',
            fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: 9,
            color: '#2c1810', padding: '1px 4px', transform: 'rotate(-4deg)',
            boxShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>
            {pc.stateCode}
          </div>
        )}
      </div>
      <p style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.mid,
        textAlign: 'center', lineHeight: 1.3, marginTop: 4,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {pc.bookTitle}
      </p>
    </button>
  );
}

// ── Section shell ─────────────────────────────────────────────────────────────
function SectionShell({ title, accentColor, onBack, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: L.bg, overflowY: 'auto', fontFamily: 'Special Elite, serif' }}>
      <style>{`
        @keyframes lib-spin { to { transform: rotate(360deg); } }
        @keyframes lib-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10,
        background: L.bg, borderBottom: `2px solid ${accentColor}`,
        padding: '12px 16px', backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 600, margin: '0 auto' }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark,
              letterSpacing: '0.06em', padding: '4px 8px', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = accentColor}
            onMouseLeave={e => e.currentTarget.style.color = L.dark}
          >
            BACK
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LibraryIcon size={20} />
            <h1 style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 15,
              color: accentColor, letterSpacing: '0.06em' }}>
              {title}
            </h1>
          </div>
          <div style={{ width: 56 }} />
        </div>
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 16px 80px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Shelf card wrapper ────────────────────────────────────────────────────────
function ShelfCard({ accentColor, children }) {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden',
      border: `1px solid ${accentColor}33`, marginBottom: 16 }}>
      <div style={{ padding: 16, background: L.white }}>
        {children}
      </div>
    </div>
  );
}

// ── Main Library ──────────────────────────────────────────────────────────────
export default function Library({ onBack }) {
  const { user } = useAuth();
  const [view, setView] = useState('home'); // 'home'|'bookLog'|'postcards'|'myRecs'|'readNext'|'authorRoom'

  // Book log state
  const [loggedBooks, setLoggedBooks] = useState([]);
  const [showAddSearch, setShowAddSearch] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [activeCard, setActiveCard] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [newBadges, setNewBadges] = useState([]);
  const carouselRef = useRef(null);

  // Postcard Books shelf state (books user was reading when they made a postcard)
  const [postcardBooks, setPostcardBooks] = useState([]);
  const [showPostcardBuilder, setShowPostcardBuilder] = useState(false);
  const [activePostcard, setActivePostcard] = useState(null);

  // My Recs state
  const [myRecs, setMyRecs] = useState([]);
  const [activeRec, setActiveRec] = useState(null);

  // Read Next state
  const [readNext, setReadNext] = useState([]);
  const [activeReadNext, setActiveReadNext] = useState(null);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'booksRead'),
      snap => setLoggedBooks(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('[Library] booksRead:', err)
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'libraryPostcards'),
      snap => setPostcardBooks(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('[Library] libraryPostcards:', err)
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'libraryRecs'),
      snap => setMyRecs(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('[Library] libraryRecs:', err)
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'libraryReadNext'),
      snap => setReadNext(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('[Library] libraryReadNext:', err)
    );
    return unsub;
  }, [user]);

  const discoveredAuthors = useDiscoveredAuthors(user?.uid);
  const authorBooksCount  = readNext.filter(r => r.recommendedBy?.startsWith('Author Page:')).length;

  const sortedBooks = [...loggedBooks].sort((a, b) =>
    (b.timestamp?.toMillis?.() ?? 0) - (a.timestamp?.toMillis?.() ?? 0));
  const sortedPostcardBooks = [...postcardBooks].sort((a, b) =>
    (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  const sortedRecs = [...myRecs].sort((a, b) =>
    (b.date?.toMillis?.() ?? 0) - (a.date?.toMillis?.() ?? 0));
  const sortedReadNext = [...readNext].sort((a, b) =>
    (b.date?.toMillis?.() ?? 0) - (a.date?.toMillis?.() ?? 0));

  const handlePostcardSaved = () => setShowPostcardBuilder(false);

  const handleDeletePostcardBook = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'libraryPostcards', id));
      setActivePostcard(null);
    } catch (err) { console.error('[Library] delete postcard book:', err); }
  };

  const handleAddBook = async ({ rating, finishedMonth, finishedYear, format, reflection, vibeTags, foundAt, feel, extras, recommend, isPrivate, personalNotes, personalNotesPrivate, bookType, whatYouLearned, changedThinking, willApply }) => {
    if (!user || !selectedBook) return;
    setSaving(true); setSaveError('');
    try {
      const docId = selectedBook.id.replace(/\//g, '_');
      await setDoc(doc(db, 'users', user.uid, 'booksRead', docId), {
        bookTitle: selectedBook.title, bookAuthor: selectedBook.author,
        bookCover: selectedBook.coverURL || null, googleBooksId: selectedBook.id,
        rating, finishedMonth, finishedYear: finishedYear ? Number(finishedYear) : '',
        format, reflection, vibeTags, foundAt, feel, extras, recommend,
        isPrivate: isPrivate ?? false,
        personalNotes: personalNotes ?? '',
        personalNotesPrivate: personalNotesPrivate ?? true,
        bookType: bookType ?? 'fiction',
        whatYouLearned: whatYouLearned ?? '',
        changedThinking: changedThinking ?? '',
        willApply: willApply ?? '',
        timestamp: serverTimestamp(),
      });
      setSelectedBook(null); setShowAddSearch(false);
      checkAndAwardBadges(user.uid).then(newly => { if (newly.length > 0) setNewBadges(newly); });
    } catch (err) {
      console.error('[Library] save:', err);
      setSaveError('Could not save. Try again.');
    } finally { setSaving(false); }
  };

  const handleEditSave = async ({ rating, finishedMonth, finishedYear, format, reflection, vibeTags, foundAt, feel, extras, recommend, isPrivate, personalNotes, personalNotesPrivate, bookType, whatYouLearned, changedThinking, willApply }) => {
    if (!user || !editingEntry) return;
    setEditSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid, 'booksRead', editingEntry.id), {
        rating, finishedMonth, finishedYear, format, reflection, vibeTags, foundAt, feel, extras, recommend,
        isPrivate: isPrivate ?? false,
        personalNotes: personalNotes ?? '',
        personalNotesPrivate: personalNotesPrivate ?? true,
        bookType: bookType ?? 'fiction',
        whatYouLearned: whatYouLearned ?? '',
        changedThinking: changedThinking ?? '',
        willApply: willApply ?? '',
      });
      setEditingEntry(null); setActiveCard(null);
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

  const handleDeleteRec = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'libraryRecs', id));
      setActiveRec(null);
    } catch (err) { console.error('[Library] delete rec:', err); }
  };

  const handleDeleteReadNext = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'libraryReadNext', id));
      setActiveReadNext(null);
    } catch (err) { console.error('[Library] delete readNext:', err); }
  };

  const activeEntry = sortedBooks.find(b => b.id === activeCard);

  const estYear = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).getFullYear()
    : null;

  // ── Archive ──────────────────────────────────────────────────────────────────
  if (view === 'archive') {
    return <LibraryArchive onBack={() => setView('home')} />;
  }

  // ── Landing page ────────────────────────────────────────────────────────────
  if (view === 'home') {
    return (
      <>
        <LibraryHome
          onNavigate={setView}
          onBack={onBack}
          estYear={estYear}
          bookCounts={{
            bookLog:   loggedBooks.length,
            postcards: postcardBooks.length,
            myRecs:    myRecs.length,
            readNext:  readNext.length,
          }}
          discoveredAuthors={discoveredAuthors}
          authorBooksCount={authorBooksCount}
        />
        {/* Overlays still rendered above LibraryHome */}
        {newBadges.length > 0 && (
          <BadgeUnlockModal badges={newBadges} onClose={() => setNewBadges([])} />
        )}
      </>
    );
  }

  // ── BOOK LOG ─────────────────────────────────────────────────────────────────
  if (view === 'bookLog') {
    return (
      <SectionShell title="BOOK LOG" accentColor={L.turquoise} onBack={() => setView('home')}>

        {!user && (
          <ShelfCard accentColor={L.turquoise}>
            <p style={{ fontFamily: 'Bungee, sans-serif', color: L.turquoise, fontSize: 12, marginBottom: 4 }}>SIGN IN TO LOG BOOKS</p>
            <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 12 }}>Your book log is saved to your account.</p>
          </ShelfCard>
        )}

        {user && (
          <ShelfCard accentColor={L.turquoise}>
            {/* Section header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: L.turquoise, letterSpacing: '0.05em' }}>
                {sortedBooks.length > 0 ? `${sortedBooks.length} book${sortedBooks.length !== 1 ? 's' : ''}` : 'YOUR READING JOURNEY'}
              </span>
              <button
                onClick={() => { setShowAddSearch(v => !v); setSelectedBook(null); setActiveCard(null); setEditingEntry(null); }}
                style={{ ...primaryBtn, marginLeft: 'auto', padding: '5px 12px', fontSize: 10 }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {showAddSearch ? 'CANCEL' : '+ ADD BOOK'}
              </button>
            </div>

            {showAddSearch && !selectedBook && (
              <div style={{ marginBottom: 16, animation: 'lib-fade-in 0.2s ease' }}>
                <p style={{ fontFamily: 'Bungee, sans-serif', color: L.turquoise, fontSize: 10, letterSpacing: '0.08em', marginBottom: 10 }}>FIND A BOOK</p>
                <BookSearch onSelect={book => { setSelectedBook(book); setShowAddSearch(false); }} />
              </div>
            )}

            {selectedBook && (
              <div style={{ marginBottom: 16, animation: 'lib-fade-in 0.2s ease' }}>
                <EntryForm book={selectedBook} onSave={handleAddBook}
                  onCancel={() => setSelectedBook(null)} saving={saving} saveError={saveError} />
              </div>
            )}

            {!showAddSearch && !selectedBook && sortedBooks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ fontFamily: 'Bungee, sans-serif', color: L.turquoise, fontSize: 12, letterSpacing: '0.05em', marginBottom: 8 }}>
                  YOUR READING JOURNEY STARTS HERE
                </p>
                <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 13, fontStyle: 'italic', lineHeight: 1.6 }}>
                  Add your first finished book to start tracking your literary adventures and earning badges.
                </p>
              </div>
            )}

            {sortedBooks.length > 0 && (
              <div>
                <div ref={carouselRef} style={{ display: 'flex', gap: 10, overflowX: 'auto',
                  paddingBottom: 10, scrollbarWidth: 'thin', scrollbarColor: `${L.turquoise}33 transparent` }}>
                  {sortedBooks.map(entry => (
                    <BookCarouselCard key={entry.id} entry={entry} isActive={activeCard === entry.id}
                      onClick={() => { setActiveCard(prev => prev === entry.id ? null : entry.id); setEditingEntry(null); setShowAddSearch(false); setSelectedBook(null); }}
                    />
                  ))}
                </div>

                {activeEntry && !editingEntry && (
                  <div style={{ marginTop: 12, borderRadius: 12, padding: 14,
                    background: L.bg, border: `1.5px solid ${L.divider}`,
                    animation: 'lib-fade-in 0.18s ease' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 52, height: 74, flexShrink: 0, borderRadius: 4,
                        overflow: 'hidden', border: `1.5px solid ${L.divider}`, background: L.card }}>
                        <img src={activeEntry.bookCover || CAT_SRC}
                          onLoad={onCoverLoad} onError={onCoverError}
                          alt={activeEntry.bookTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark, lineHeight: 1.3, marginBottom: 3 }}>
                          {activeEntry.bookTitle}
                        </p>
                        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.mid, marginBottom: 6 }}>
                          {activeEntry.bookAuthor}
                        </p>
                        {activeEntry.rating > 0 && (
                          <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 5 }}>
                            {[1,2,3,4,5].map(n => (
                              <img key={n} src="/literary-roads/images/retro_cat.png" alt="" style={{ width: 24, height: 'auto',
                                filter: activeEntry.rating >= n ? CAT_FILTER_ACTIVE : CAT_FILTER_INACTIVE }} />
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {(activeEntry.finishedMonth || activeEntry.finishedYear) && (
                            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.muted }}>
                              {[activeEntry.finishedMonth, activeEntry.finishedYear].filter(Boolean).join(' ')}
                            </span>
                          )}
                          {activeEntry.format && (
                            <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
                              padding: '1px 6px', borderRadius: 4,
                              background: activeEntry.format === 'audio' ? 'rgba(255,107,122,0.1)' : 'rgba(56,197,197,0.1)',
                              color: activeEntry.format === 'audio' ? L.coral : L.turquoise,
                              border: `1px solid ${activeEntry.format === 'audio' ? 'rgba(255,107,122,0.25)' : L.divider}` }}>
                              {activeEntry.format === 'audio' ? 'AUDIO' : 'READ'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => setEditingEntry(activeEntry)}
                        style={{ ...ghostBtn, flex: 1, padding: 8, fontSize: 10 }}>
                        EDIT
                      </button>
                      <button onClick={() => handleDelete(activeEntry.id)}
                        style={{ ...deleteBtn, padding: '8px 14px', fontSize: 10 }}>
                        DELETE
                      </button>
                    </div>
                  </div>
                )}

                {editingEntry && (
                  <div style={{ marginTop: 12, animation: 'lib-fade-in 0.18s ease' }}>
                    <EntryForm book={editingEntry} editMode
                      initialRating={editingEntry.rating ?? 0}
                      initialMonth={editingEntry.finishedMonth ?? ''}
                      initialYear={editingEntry.finishedYear ?? ''}
                      initialFormat={editingEntry.format ?? 'read'}
                      initialReflection={editingEntry.reflection ?? ''}
                      initialVibeTags={editingEntry.vibeTags ?? []}
                      initialFoundAt={editingEntry.foundAt ?? []}
                      initialFeel={editingEntry.feel ?? []}
                      initialExtras={editingEntry.extras ?? []}
                      initialRecommend={editingEntry.recommend ?? false}
                      initialIsPrivate={editingEntry.isPrivate ?? false}
                      initialPersonalNotes={editingEntry.personalNotes ?? ''}
                      initialPersonalNotesPrivate={editingEntry.personalNotesPrivate ?? true}
                      initialBookType={editingEntry.bookType ?? 'fiction'}
                      initialWhatYouLearned={editingEntry.whatYouLearned ?? ''}
                      initialChangedThinking={editingEntry.changedThinking ?? ''}
                      initialWillApply={editingEntry.willApply ?? ''}
                      onSave={handleEditSave} onCancel={() => setEditingEntry(null)} saving={editSaving} />
                  </div>
                )}
              </div>
            )}
          </ShelfCard>
        )}

        {newBadges.length > 0 && <BadgeUnlockModal badges={newBadges} onClose={() => setNewBadges([])} />}
      </SectionShell>
    );
  }

  // ── POSTCARD BOOKS ────────────────────────────────────────────────────────────
  if (view === 'postcards') {
    return (
      <SectionShell title="POSTCARD BOOKS" accentColor={L.coral} onBack={() => setView('home')}>

        {!user && (
          <ShelfCard accentColor={L.coral}>
            <p style={{ fontFamily: 'Bungee, sans-serif', color: L.coral, fontSize: 12, marginBottom: 4 }}>SIGN IN TO CREATE POSTCARDS</p>
            <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 12 }}>Share your reading adventures with fellow travelers.</p>
          </ShelfCard>
        )}

        {user && (
          <ShelfCard accentColor={L.coral}>
            {/* Header row — create button always visible */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: L.coral, letterSpacing: '0.05em' }}>
                {sortedPostcardBooks.length > 0
                  ? `${sortedPostcardBooks.length} book${sortedPostcardBooks.length !== 1 ? 's' : ''}`
                  : 'CURRENTLY READING'}
              </span>
              <button onClick={() => { setShowPostcardBuilder(true); setActivePostcard(null); }}
                style={{ ...coralBtn, marginLeft: 'auto', padding: '5px 12px', fontSize: 10 }}>
                + CREATE POSTCARD
              </button>
            </div>

            {sortedPostcardBooks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ fontFamily: 'Bungee, sans-serif', color: L.coral, fontSize: 12, letterSpacing: '0.05em', marginBottom: 8 }}>
                  WHAT ARE YOU READING?
                </p>
                <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 13, fontStyle: 'italic', lineHeight: 1.6 }}>
                  Create a postcard for a book you&rsquo;re reading now and it&rsquo;ll live here as a memory of the road.
                </p>
              </div>
            ) : (
              <div>
                {/* Horizontal book cover shelf */}
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10,
                  scrollbarWidth: 'thin', scrollbarColor: `${L.coral}33 transparent` }}>
                  {sortedPostcardBooks.map(pb => (
                    <PostcardShelfCard key={pb.id} pc={{ ...pb, bookCover: pb.coverUrl, bookTitle: pb.title, bookAuthor: pb.author }}
                      isActive={activePostcard === pb.id}
                      onClick={() => setActivePostcard(prev => prev === pb.id ? null : pb.id)}
                    />
                  ))}
                </div>

                {/* Expanded detail panel */}
                {activePostcard && (() => {
                  const pb = sortedPostcardBooks.find(p => p.id === activePostcard);
                  if (!pb) return null;
                  const dateStr = pb.createdAt
                    ? new Date(pb.createdAt?.toDate?.() ?? pb.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '';
                  return (
                    <div style={{ marginTop: 12, borderRadius: 12, padding: 14,
                      background: L.bg, border: `1.5px solid ${L.divider}`,
                      animation: 'lib-fade-in 0.18s ease' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ width: 52, height: 74, flexShrink: 0, borderRadius: 4,
                          overflow: 'hidden', border: `1.5px solid rgba(255,107,122,0.2)`, background: L.card }}>
                          <img src={pb.coverUrl || CAT_SRC}
                            onLoad={onCoverLoad} onError={onCoverError}
                            alt={pb.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark, lineHeight: 1.3, marginBottom: 2 }}>
                            {pb.title}
                          </p>
                          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.mid, marginBottom: 6 }}>
                            {pb.author}
                          </p>
                          {pb.state && (
                            <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
                              padding: '2px 8px', borderRadius: 4, display: 'inline-block',
                              background: 'rgba(255,107,122,0.1)', color: L.coral,
                              border: '1px solid rgba(255,107,122,0.25)' }}>
                              {pb.state}
                            </span>
                          )}
                          {dateStr && (
                            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.muted, marginTop: 5 }}>
                              {dateStr}
                            </p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDeletePostcardBook(pb.id)}
                        style={{ ...deleteBtn, padding: '7px 14px', fontSize: 10 }}>
                        REMOVE
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </ShelfCard>
        )}

        {/* Postcard builder overlay */}
        {showPostcardBuilder && (
          <PostcardBuilder loggedBooks={sortedBooks} onClose={() => setShowPostcardBuilder(false)} onSaved={handlePostcardSaved} />
        )}
      </SectionShell>
    );
  }

  // ── MY RECS ───────────────────────────────────────────────────────────────────
  if (view === 'myRecs') {
    return (
      <SectionShell title="MY RECS" accentColor={L.gold} onBack={() => setView('home')}>

        {!user && (
          <ShelfCard accentColor={L.gold}>
            <p style={{ fontFamily: 'Bungee, sans-serif', color: L.gold, fontSize: 12, marginBottom: 4 }}>SIGN IN TO SEE YOUR RECS</p>
            <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 12 }}>Books you've recommended at stops on the map appear here.</p>
          </ShelfCard>
        )}

        {user && (
          <ShelfCard accentColor={L.gold}>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: L.gold, letterSpacing: '0.05em' }}>
                {sortedRecs.length > 0 ? `${sortedRecs.length} recommended` : 'MY RECOMMENDATIONS'}
              </span>
            </div>

            {sortedRecs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ fontFamily: 'Bungee, sans-serif', color: L.gold, fontSize: 12, letterSpacing: '0.05em', marginBottom: 8 }}>
                  NO RECS YET
                </p>
                <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 13, fontStyle: 'italic', lineHeight: 1.6 }}>
                  When you recommend a book in a guestbook at a bookstore or cafe on the map, it shows up here.
                </p>
              </div>
            )}

            {sortedRecs.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10,
                  scrollbarWidth: 'thin', scrollbarColor: `${L.gold}44 transparent` }}>
                  {sortedRecs.map(rec => (
                    <CoverCard key={rec.id} item={rec} isActive={activeRec?.id === rec.id}
                      onClick={() => setActiveRec(prev => prev?.id === rec.id ? null : rec)} />
                  ))}
                </div>

                {activeRec && (
                  <div style={{ marginTop: 12, borderRadius: 12, padding: 14,
                    background: L.bg, border: `1.5px solid rgba(245,166,35,0.3)`,
                    animation: 'lib-fade-in 0.18s ease' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 56, height: 80, flexShrink: 0, borderRadius: 4,
                        overflow: 'hidden', border: `1.5px solid rgba(245,166,35,0.3)`, background: L.card }}>
                        <img src={activeRec.coverUrl || CAT_SRC}
                          onLoad={onCoverLoad} onError={onCoverError}
                          alt={activeRec.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: L.dark, lineHeight: 1.3, marginBottom: 3 }}>
                          {activeRec.title}
                        </p>
                        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.mid, marginBottom: 6 }}>
                          {activeRec.author}
                        </p>
                        {(activeRec.placeName || activeRec.state) && (
                          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.turquoise, marginBottom: 3 }}>
                            Recommended at: {[activeRec.placeName, activeRec.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {activeRec.date && (
                          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.muted }}>
                            {formatDate(activeRec.date)}
                          </p>
                        )}
                        {activeRec.note && (
                          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.mid, fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
                            {activeRec.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button onClick={() => handleDeleteRec(activeRec.id)}
                        style={{ ...deleteBtn, padding: '8px 14px', fontSize: 10 }}>
                        REMOVE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ShelfCard>
        )}
      </SectionShell>
    );
  }

  // ── READ NEXT ─────────────────────────────────────────────────────────────────
  if (view === 'readNext') {
    return (
      <SectionShell title="READ NEXT" accentColor={L.peach} onBack={() => setView('home')}>

        {!user && (
          <ShelfCard accentColor={L.peach}>
            <p style={{ fontFamily: 'Bungee, sans-serif', color: '#C07A10', fontSize: 12, marginBottom: 4 }}>SIGN IN TO SEE YOUR LIST</p>
            <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 12 }}>Books you want to read next, saved from guestbooks on the map.</p>
          </ShelfCard>
        )}

        {user && (
          <ShelfCard accentColor={L.peach}>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: '#C07A10', letterSpacing: '0.05em' }}>
                {sortedReadNext.length > 0 ? `${sortedReadNext.length} book${sortedReadNext.length !== 1 ? 's' : ''} queued` : 'READ NEXT'}
              </span>
            </div>

            {sortedReadNext.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ fontFamily: 'Bungee, sans-serif', color: '#C07A10', fontSize: 12, letterSpacing: '0.05em', marginBottom: 8 }}>
                  YOUR WISH LIST IS EMPTY
                </p>
                <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 13, fontStyle: 'italic', lineHeight: 1.6 }}>
                  When you see a book you want to read in a guestbook on the map, tap the read next button to save it here.
                </p>
              </div>
            )}

            {sortedReadNext.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10,
                  scrollbarWidth: 'thin', scrollbarColor: `${L.peach}66 transparent` }}>
                  {sortedReadNext.map(item => (
                    <CoverCard key={item.id} item={item} isActive={activeReadNext?.id === item.id}
                      onClick={() => setActiveReadNext(prev => prev?.id === item.id ? null : item)} />
                  ))}
                </div>

                {activeReadNext && (
                  <div style={{ marginTop: 12, borderRadius: 12, padding: 14,
                    background: L.bg, border: `1.5px solid rgba(255,184,163,0.5)`,
                    animation: 'lib-fade-in 0.18s ease' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 56, height: 80, flexShrink: 0, borderRadius: 4,
                        overflow: 'hidden', border: `1.5px solid rgba(255,184,163,0.5)`, background: L.card }}>
                        <img src={activeReadNext.coverUrl || CAT_SRC}
                          onLoad={onCoverLoad} onError={onCoverError}
                          alt={activeReadNext.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: L.dark, lineHeight: 1.3, marginBottom: 3 }}>
                          {activeReadNext.title}
                        </p>
                        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.mid, marginBottom: 6 }}>
                          {activeReadNext.author}
                        </p>
                        {activeReadNext.recommendedBy && (
                          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.turquoise, marginBottom: 3 }}>
                            Recommended by {activeReadNext.recommendedBy}
                          </p>
                        )}
                        {(activeReadNext.placeName || activeReadNext.state) && (
                          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.mid, marginBottom: 3 }}>
                            at {[activeReadNext.placeName, activeReadNext.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {activeReadNext.date && (
                          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.muted }}>
                            {formatDate(activeReadNext.date)}
                          </p>
                        )}
                        {activeReadNext.whoWhatWhere && (
                          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.mid, fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
                            {activeReadNext.whoWhatWhere}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button onClick={() => handleDeleteReadNext(activeReadNext.id)}
                        style={{ ...deleteBtn, padding: '8px 14px', fontSize: 10 }}>
                        REMOVE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ShelfCard>
        )}
      </SectionShell>
    );
  }

  // ── AUTHOR ROOM ───────────────────────────────────────────────────────────────
  if (view === 'authorRoom') {
    const appBase    = window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const totalCount = Object.keys(AUTHOR_TIDBITS).length;

    return (
      <SectionShell title="THE AUTHOR ROOM" accentColor={L.coral} onBack={() => setView('home')}>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20,
          borderRadius: 10, overflow: 'hidden',
          border: '1px solid rgba(255,107,122,0.2)', background: '#FFFAF5' }}>
          {[
            { label: 'DISCOVERED', value: discoveredAuthors.length, color: L.coral },
            { label: 'REMAINING',  value: totalCount - discoveredAuthors.length, color: L.muted },
            { label: 'BOOKS ADDED', value: authorBooksCount, color: '#C07A10' },
          ].map((s, i) => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center', padding: '12px 8px',
              borderLeft: i > 0 ? '1px solid rgba(255,107,122,0.15)' : 'none',
            }}>
              <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 22, color: s.color, margin: 0, lineHeight: 1 }}>
                {s.value}
              </p>
              <p style={{ fontFamily: 'Special Elite, serif', fontSize: 9, color: L.muted, margin: '4px 0 0', letterSpacing: '0.08em' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {!user && (
          <ShelfCard accentColor={L.coral}>
            <p style={{ fontFamily: 'Bungee, sans-serif', color: L.coral, fontSize: 12, marginBottom: 4 }}>
              SIGN IN TO SEE YOUR AUTHORS
            </p>
            <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 13, lineHeight: 1.6 }}>
              Discover authors on the map to build your collection.
            </p>
          </ShelfCard>
        )}

        {user && discoveredAuthors.length === 0 && (
          <ShelfCard accentColor={L.coral}>
            <p style={{ fontFamily: 'Bungee, sans-serif', color: L.coral, fontSize: 12, marginBottom: 8, letterSpacing: '0.05em' }}>
              NO AUTHORS YET
            </p>
            <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 13, fontStyle: 'italic', lineHeight: 1.6 }}>
              Hover over states on the map to find the authors who called them home.
            </p>
          </ShelfCard>
        )}

        {user && discoveredAuthors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {discoveredAuthors.map(a => (
              <a
                key={a.id}
                href={`${appBase}/author?state=${encodeURIComponent(a.state)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  borderRadius: 12, overflow: 'hidden', display: 'flex',
                  border: '1px solid rgba(255,107,122,0.2)', background: L.white,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = L.coral; e.currentTarget.style.boxShadow = '0 3px 10px rgba(255,107,122,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,107,122,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 4, background: L.coral, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: '12px 12px 12px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: L.dark, margin: 0, letterSpacing: '0.03em' }}>
                        {a.name}
                      </p>
                      <p style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.coral, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {a.state}
                      </p>
                    </div>
                    {a.hookLine && (
                      <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: L.mid, fontStyle: 'italic', margin: 0, lineHeight: 1.5,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {a.hookLine}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: L.coral, fontSize: 16, flexShrink: 0 }}>
                    →
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </SectionShell>
    );
  }

  return null;
}
