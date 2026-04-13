import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { searchBooks } from '../utils/googleBooks';
import CarSelector from '../components/CarSelector';
import { saveSelectedCar, updateParkedCar } from '../utils/carCheckIns';
import { subscribeToTravelStats } from '../utils/travelStats';
import { subscribeToUserBadges, checkAndAwardBadges, checkAndAwardFoundersBadge, checkSeasonalBadges, computeBadgeProgress } from '../utils/badgeChecker';
import { BADGE_COUNT } from '../utils/badgeDefinitions';
import BadgeUnlockModal from '../components/BadgeUnlockModal';
import { deleteAccount } from '../utils/deleteAccount';
import { BackArrowIcon } from '../components/Icons';
import {
  QUEST_PRESETS,
  computeQuestStats,
  subscribeToReadingGoal,
  setReadingGoal,
  updateReadingGoalValue,
  archiveAndResetYear,
  subscribeToQuestHistory,
  countBooksForYear,
} from '../utils/readingQuest';

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

// ── Reading Quest: Goal-setting / change modal ──────────────────────────────
function GoalModal({ currentGoal, booksRead, onSave, onClose, errorMsg = '' }) {
  const isNew = !currentGoal;
  const [selected, setSelected] = useState(() => {
    if (!currentGoal) return 52;
    const preset = QUEST_PRESETS.find(p => p.value === currentGoal);
    return preset ? currentGoal : 'custom';
  });
  const [customVal, setCustomVal] = useState(() =>
    currentGoal && !QUEST_PRESETS.find(p => p.value === currentGoal) ? String(currentGoal) : '',
  );

  const finalGoal = selected === 'custom'
    ? (parseInt(customVal, 10) || 0)
    : selected;

  const canSave = finalGoal >= 1;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(5,6,15,0.92)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '500px',
        background: '#0D0E1A',
        border: '2px solid #40E0D0',
        borderRadius: '18px 18px 0 0',
        padding: '20px 24px 36px',
        boxShadow: '0 0 40px rgba(64,224,208,0.2)',
      }}>
        <div style={{ width: '36px', height: '4px', background: 'rgba(64,224,208,0.3)', borderRadius: '2px', margin: '0 auto 18px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h3 className="font-bungee" style={{ color: '#40E0D0', fontSize: '14px', letterSpacing: '0.06em', textShadow: '0 0 10px rgba(64,224,208,0.5)' }}>
            {isNew ? 'SET YOUR READING QUEST' : 'CHANGE YOUR READING GOAL'}
          </h3>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1.5px solid rgba(64,224,208,0.4)',
            borderRadius: '50%', width: '28px', height: '28px',
            color: '#40E0D0', fontSize: '16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        <p className="font-special-elite" style={{ fontSize: '12px', color: 'rgba(192,192,192,0.55)', marginBottom: '4px' }}>
          How many books do you want to read in {new Date().getFullYear()}?
        </p>
        {!isNew && (
          <p className="font-special-elite" style={{ fontSize: '11px', color: 'rgba(255,78,0,0.7)', marginBottom: '14px' }}>
            Current: {currentGoal} books · Progress: {booksRead}/{currentGoal}
          </p>
        )}
        {isNew && <div style={{ marginBottom: '14px' }} />}

        {/* Preset options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {QUEST_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setSelected(p.value)}
              className="font-special-elite"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                background: selected === p.value ? 'rgba(64,224,208,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${selected === p.value ? '#40E0D0' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${selected === p.value ? '#40E0D0' : 'rgba(192,192,192,0.3)'}`,
                  background: selected === p.value ? '#40E0D0' : 'transparent',
                  boxShadow: selected === p.value ? '0 0 6px rgba(64,224,208,0.6)' : 'none',
                }} />
                <span className="font-bungee" style={{ fontSize: '11px', color: selected === p.value ? '#40E0D0' : '#F5F5DC', letterSpacing: '0.04em' }}>
                  {p.label}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: selected === p.value ? '#FF4E00' : 'rgba(192,192,192,0.5)' }}>
                  {p.value} books
                </span>
                <span style={{ display: 'block', fontSize: '10px', color: 'rgba(192,192,192,0.35)' }}>
                  {p.sub}
                </span>
              </div>
            </button>
          ))}

          {/* Custom option */}
          <button
            onClick={() => setSelected('custom')}
            className="font-special-elite"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
              background: selected === 'custom' ? 'rgba(255,78,0,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${selected === 'custom' ? '#FF4E00' : 'rgba(255,255,255,0.1)'}`,
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${selected === 'custom' ? '#FF4E00' : 'rgba(192,192,192,0.3)'}`,
              background: selected === 'custom' ? '#FF4E00' : 'transparent',
              boxShadow: selected === 'custom' ? '0 0 6px rgba(255,78,0,0.6)' : 'none',
            }} />
            <span className="font-bungee" style={{ fontSize: '11px', color: selected === 'custom' ? '#FF4E00' : '#F5F5DC', letterSpacing: '0.04em' }}>
              CUSTOM
            </span>
            {selected === 'custom' && (
              <input
                type="number"
                min="1"
                max="9999"
                value={customVal}
                onChange={e => setCustomVal(e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="# books"
                style={{
                  marginLeft: 'auto',
                  width: '80px', padding: '4px 8px',
                  background: 'rgba(255,78,0,0.1)',
                  border: '1px solid rgba(255,78,0,0.5)',
                  borderRadius: '6px', color: '#FF4E00',
                  fontFamily: 'Bungee, sans-serif', fontSize: '12px',
                  outline: 'none',
                }}
              />
            )}
          </button>
        </div>

        {errorMsg && (
          <p className="font-special-elite text-xs mb-3 text-center"
            style={{ color: '#FF4E00', background: 'rgba(255,78,0,0.08)', border: '1px solid rgba(255,78,0,0.3)', borderRadius: '8px', padding: '8px 12px' }}>
            {errorMsg}
          </p>
        )}
        <button
          onClick={() => canSave && onSave(finalGoal)}
          disabled={!canSave}
          className="font-bungee"
          style={{
            width: '100%', padding: '13px',
            background: canSave ? '#FF4E00' : 'rgba(80,80,80,0.4)',
            color: '#1A1B2E', border: 'none', borderRadius: '10px',
            fontSize: '13px', letterSpacing: '0.1em', cursor: canSave ? 'pointer' : 'not-allowed',
            boxShadow: canSave ? '0 0 16px rgba(255,78,0,0.45)' : 'none',
            transition: 'background 0.2s',
          }}
        >
          {isNew ? 'START QUEST' : 'UPDATE GOAL'}
        </button>
      </div>
    </div>
  );
}

// ── Reading Quest: Past quests history modal ────────────────────────────────
function QuestHistoryModal({ history, onClose }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(5,6,15,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '420px',
        background: '#0D0E1A',
        border: '2px solid rgba(64,224,208,0.5)',
        borderRadius: '18px',
        padding: '24px',
        boxShadow: '0 0 40px rgba(64,224,208,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 className="font-bungee" style={{ color: '#40E0D0', fontSize: '14px', letterSpacing: '0.06em', textShadow: '0 0 10px rgba(64,224,208,0.5)' }}>
            READING QUEST HISTORY
          </h3>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1.5px solid rgba(64,224,208,0.4)',
            borderRadius: '50%', width: '28px', height: '28px',
            color: '#40E0D0', fontSize: '16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {history.length === 0 ? (
          <p className="font-special-elite text-sm text-center" style={{ color: 'rgba(192,192,192,0.4)', padding: '20px 0' }}>
            No past quests yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map(h => (
              <div key={h.year} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${h.completed ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}>
                <div>
                  <span className="font-bungee" style={{ fontSize: '13px', color: h.completed ? '#FFD700' : '#F5F5DC', letterSpacing: '0.04em' }}>
                    {h.year}
                  </span>
                  <span className="font-special-elite" style={{ marginLeft: '8px', fontSize: '12px', color: 'rgba(192,192,192,0.6)' }}>
                    {h.booksRead}/{h.goal} books
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '14px' }}>{h.completed ? '🏆' : ''}</span>
                  <span className="font-bungee" style={{ marginLeft: '6px', fontSize: '11px', color: h.completed ? '#FFD700' : 'rgba(192,192,192,0.5)' }}>
                    {h.percentComplete}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Profile component ──────────────────────────────────────────────────
export default function Profile({ onBack, onShowLibrary, onShowBadges, selectedStates = [] }) {
  const { user } = useAuth();

  const [privacyOn, setPrivacyOn] = useState(() => localStorage.getItem('lr-privacy') === 'true');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [favoriteBooks, setFavoriteBooks] = useState([]);
  const [founderEligible, setFounderEligible] = useState(false);
  const [tripCount, setTripCount] = useState(0);
  const [visitedCount, setVisitedCount] = useState(0);
  const [travelStats, setTravelStats]       = useState(null);
  const [readingStats, setReadingStats]     = useState({ booksRead: 0, fiveCat: 0, nextReads: 0, questBooksRead: 0 });
  const [earnedBadgeData, setEarnedBadgeData] = useState([]);
  const [newBadges, setNewBadges]             = useState([]);
  const [showBookModal, setShowBookModal]     = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading]     = useState(false);
  const [deleteError, setDeleteError]         = useState('');
  const [selectedCar, setSelectedCar] = useState(null);
  const [activeCheckIn, setActiveCheckIn] = useState(null); // { locationId, checkInId } | null
  // Reading Quest
  const [readingGoal, setReadingGoalState] = useState(null); // { goal, year } | null
  const [showGoalModal, setShowGoalModal]   = useState(false);
  const [goalSaveError, setGoalSaveError]   = useState('');
  const [showQuestHistory, setShowQuestHistory] = useState(false);
  const [questHistory, setQuestHistory]     = useState([]);
  const yearResetDoneRef = useRef(false);

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
        setFounderEligible(data.founderEligible === true);
        setTripCount((data.trip || []).length);
        setVisitedCount((data.visitedStates || []).length);
        setSelectedCar(data.selectedCar || null);
        setSoundEnabled(data.soundEnabled !== false); // default true
        setActiveCheckIn(data.activeCheckIn || null);
      },
      (err) => console.error('[Profile] snapshot:', err),
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToTravelStats(user.uid, setTravelStats);
  }, [user]);

  // Reading stats: booksRead count + 5-cat count + wantToRead count + quest count
  useEffect(() => {
    if (!user) return;
    const thisYear = new Date().getFullYear();
    let booksData = [], wantSize = 0;
    const emit = () => {
      const questCount = booksData.filter(d => d.finishedYear === thisYear).length;
      setReadingStats({
        booksRead:       booksData.length,
        fiveCat:         booksData.filter(d => d.rating === 5).length,
        nextReads:       wantSize,
        questBooksRead:  questCount,
      });
    };
    const unsubBooks = onSnapshot(
      collection(db, 'users', user.uid, 'booksRead'),
      snap => { booksData = snap.docs.map(d => d.data()); emit(); },
      err => console.error('[Profile] booksRead:', err),
    );
    const unsubWant = onSnapshot(
      collection(db, 'users', user.uid, 'wantToRead'),
      snap => { wantSize = snap.size; emit(); },
      err => console.error('[Profile] wantToRead:', err),
    );
    return () => { unsubBooks(); unsubWant(); };
  }, [user]);

  // Reading Goal subscription + yearly reset
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToReadingGoal(user.uid, async (data) => {
      if (!data) { setReadingGoalState(null); return; }
      const thisYear = new Date().getFullYear();
      // Auto-archive and reset if goal is from a prior year (runs once per session)
      if (data.year < thisYear && !yearResetDoneRef.current) {
        yearResetDoneRef.current = true;
        try {
          const lastYearBooks = await countBooksForYear(user.uid, data.year);
          await archiveAndResetYear(user.uid, data.year, data.goal, lastYearBooks);
        } catch (err) { console.error('[Profile] year reset:', err); }
        return; // subscription will fire again with the new doc
      }
      setReadingGoalState(data);
    });
    return unsub;
  }, [user]);

  // Quest history subscription
  useEffect(() => {
    if (!user) return;
    return subscribeToQuestHistory(user.uid, setQuestHistory);
  }, [user]);

  // Seasonal badge check when quest progress changes
  useEffect(() => {
    if (!user || !readingGoal || readingStats.questBooksRead === undefined) return;
    checkSeasonalBadges(user.uid, readingStats.questBooksRead, readingGoal.goal).then(newly => {
      if (newly.length > 0) setNewBadges(newly);
    });
  }, [user, readingStats.questBooksRead, readingGoal]);

  useEffect(() => {
    if (!user) return;
    return subscribeToUserBadges(user.uid, setEarnedBadgeData);
  }, [user]);

  // Check for newly earned badges when travelStats updates
  useEffect(() => {
    if (!user || !travelStats) return;
    checkAndAwardBadges(user.uid).then(newly => {
      if (newly.length > 0) setNewBadges(newly);
    });
  }, [user, travelStats]);

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
    // Check Founder's Circle — eligible users earn it when they add their first favorite book
    if (founderEligible && updated.length === 1) {
      checkAndAwardFoundersBadge(user.uid, founderEligible, updated.length).then(badge => {
        if (badge) setNewBadges([badge]);
      });
    }
  };

  const handleSaveGoal = async (goal) => {
    if (!user) return;
    setGoalSaveError('');
    try {
      if (readingGoal) await updateReadingGoalValue(user.uid, goal);
      else             await setReadingGoal(user.uid, goal);
      setShowGoalModal(false);
    } catch (err) {
      console.error('[Profile] save goal:', err);
      setGoalSaveError(err.code === 'permission-denied'
        ? 'Permission denied — ensure Firestore rules allow writes to users/{uid}/readingGoals'
        : 'Could not save goal. Please try again.');
    }
  };

  const handleRemoveBook = async (id) => {
    const updated = favoriteBooks.filter((b) => b.id !== id);
    setFavoriteBooks(updated);
    await saveBooks(updated);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteAccount(user.uid);
      // Auth deletion triggers onAuthStateChanged → user becomes null → App will redirect
    } catch (err) {
      console.error('[Profile] delete account:', err);
      if (err.code === 'auth/requires-recent-login') {
        setDeleteError('For security, please sign out and sign back in, then try again.');
      } else {
        setDeleteError('Something went wrong. Please try again.');
      }
      setDeleteLoading(false);
    }
  };

  const handleCarSelect = async (carType) => {
    if (!user) return;
    setSelectedCar(carType);
    await saveSelectedCar(user.uid, carType).catch((err) => console.error('[Profile] save car:', err));
    // If currently parked, repaint the live check-in so the new car appears on map instantly
    if (activeCheckIn) {
      updateParkedCar(user.uid, carType, activeCheckIn)
        .catch((err) => console.error('[Profile] update parked car:', err));
    }
  };

  const handlePrivacyToggle = () => {
    const next = !privacyOn;
    setPrivacyOn(next);
    localStorage.setItem('lr-privacy', String(next));
  };

  const handleSoundToggle = async () => {
    if (!user) return;
    const next = !soundEnabled;
    setSoundEnabled(next);
    await setDoc(doc(db, 'users', user.uid), { soundEnabled: next }, { merge: true });
  };

  const displayName = user?.displayName || 'Literary Traveler';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, overflowY: 'auto',
        background: 'radial-gradient(ellipse at 50% 20%, #2D1B69 0%, #1A1B2E 60%, #0D0E1A 100%)',
      }}
    >
    <div className="flex flex-col items-center justify-start px-4 py-8 w-full">
      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center hover:opacity-70 transition-opacity">
          <BackArrowIcon size={24} />
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

      {/* Stats row — two matching boxes */}
      <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">

        {/* ── YOUR JOURNEY SO FAR ── */}
        <div className="rounded-xl p-4 flex flex-col"
          style={{ background: '#1E1F33', border: '1px solid rgba(255,78,0,0.35)' }}>
          <p className="font-bungee text-xs mb-3 text-center"
            style={{ color: '#FF4E00', textShadow: '0 0 8px rgba(255,78,0,0.5)', letterSpacing: '0.05em' }}>
            YOUR JOURNEY SO FAR
          </p>
          <div className="flex-1 space-y-2 mb-4">
            {[
              { value: travelStats?.bookstoresVisited ?? 0, label: 'Bookstores Visited',   color: '#FF4E00' },
              { value: travelStats?.cafesVisited       ?? 0, label: 'Coffee Shops',        color: '#FF4E00' },
              { value: travelStats?.festivalsAttended  ?? 0, label: 'Festivals Attended',  color: '#FF4E00' },
              { value: travelStats?.statesExplored    ?? 0, label: 'States Explored',     color: '#FF4E00' },
            ].map(({ value, label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="font-bungee text-sm" style={{ color, textShadow: `0 0 6px ${color}60`, minWidth: '22px' }}>
                  {value}
                </span>
                <span className="font-special-elite text-chrome-silver" style={{ fontSize: '0.65rem' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={onShowBadges}
            className="w-full font-bungee text-[10px] py-2 rounded-lg transition-all"
            style={{ border: '1px solid rgba(255,78,0,0.5)', color: '#FF4E00', background: 'transparent', letterSpacing: '0.06em' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,78,0,0.12)'; e.currentTarget.style.borderColor = '#FF4E00'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,78,0,0.5)'; }}
          >
            VIEW BADGES
          </button>
        </div>

        {/* ── YOUR READING ── */}
        <div className="rounded-xl p-4 flex flex-col"
          style={{ background: '#1E1F33', border: '1px solid rgba(64,224,208,0.35)' }}>
          <p className="font-bungee text-xs mb-3 text-center"
            style={{ color: '#40E0D0', textShadow: '0 0 8px rgba(64,224,208,0.5)', letterSpacing: '0.05em' }}>
            YOUR READING
          </p>
          <div className="flex-1 space-y-2 mb-4">
            {[
              { value: readingStats.booksRead, label: 'Books Read',       color: '#40E0D0' },
              { value: readingStats.fiveCat,   label: 'Five-Cat Books',   color: '#40E0D0' },
              { value: readingStats.nextReads, label: 'Next Reads Saved', color: '#40E0D0' },
            ].map(({ value, label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="font-bungee text-sm" style={{ color, textShadow: `0 0 6px ${color}60`, minWidth: '22px' }}>
                  {value}
                </span>
                <span className="font-special-elite text-chrome-silver" style={{ fontSize: '0.65rem' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={onShowLibrary}
            className="w-full font-bungee text-[10px] py-2 rounded-lg transition-all"
            style={{ border: '1px solid rgba(64,224,208,0.5)', color: '#40E0D0', background: 'transparent', letterSpacing: '0.06em' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(64,224,208,0.12)'; e.currentTarget.style.borderColor = '#40E0D0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(64,224,208,0.5)'; }}
          >
            MY LIBRARY
          </button>
        </div>

      </div>

      {/* ── Reading Quest widget ── */}
      {user && (() => {
        const thisYear = new Date().getFullYear();
        const questBooks = readingStats.questBooksRead ?? 0;
        const stats = readingGoal ? computeQuestStats(questBooks, readingGoal.goal) : null;

        return (
          <div className="w-full max-w-lg rounded-xl p-4 mb-5"
            style={{ background: '#1E1F33', border: '1px solid rgba(64,224,208,0.3)' }}>

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bungee text-xs"
                style={{ color: '#40E0D0', textShadow: '0 0 8px rgba(64,224,208,0.5)', letterSpacing: '0.05em' }}>
                YOUR READING QUEST
              </h2>
              <span className="font-bungee text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(64,224,208,0.08)', border: '1px solid rgba(64,224,208,0.2)', color: 'rgba(64,224,208,0.6)' }}>
                {thisYear}
              </span>
            </div>

            {/* No goal set */}
            {!readingGoal && (
              <div className="text-center py-3">
                <p className="font-special-elite text-sm mb-4" style={{ color: 'rgba(192,192,192,0.5)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  Set a yearly reading goal and track your progress one book at a time.
                </p>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="font-bungee text-xs px-5 py-2.5 rounded-lg"
                  style={{
                    background: '#FF4E00', color: '#1A1B2E',
                    border: 'none', cursor: 'pointer', letterSpacing: '0.08em',
                    boxShadow: '0 0 14px rgba(255,78,0,0.45)',
                  }}
                >
                  START YOUR QUEST
                </button>
              </div>
            )}

            {/* Goal set — show progress */}
            {readingGoal && stats && (
              <>
                <p className="font-special-elite text-sm mb-3" style={{ color: 'rgba(245,245,220,0.75)', lineHeight: 1.4 }}>
                  <span className="font-bungee" style={{ color: '#FF4E00', fontSize: '13px' }}>
                    {thisYear} Challenge:
                  </span>{' '}
                  {readingGoal.goal} Books
                </p>

                {/* Progress bar */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <span className="font-bungee text-[10px]" style={{ color: 'rgba(192,192,192,0.45)', letterSpacing: '0.05em' }}>
                      {stats.pct}% COMPLETE
                    </span>
                    <span className="font-bungee text-xs" style={{ color: '#40E0D0', textShadow: '0 0 6px rgba(64,224,208,0.5)' }}>
                      {questBooks}/{readingGoal.goal}
                    </span>
                  </div>
                  <div style={{
                    height: '10px', borderRadius: '5px', overflow: 'hidden',
                    background: 'rgba(255,255,255,0.07)',
                    boxShadow: '0 0 6px rgba(0,0,0,0.4) inset',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${stats.pct}%`,
                      background: 'linear-gradient(90deg, #FF4E00, #40E0D0)',
                      borderRadius: '5px',
                      boxShadow: '0 0 8px rgba(64,224,208,0.5)',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>

                {/* Status */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', borderRadius: '8px', marginBottom: '12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <span style={{ fontSize: '1.1rem' }}>{stats.statusEmoji}</span>
                  <div>
                    <p className="font-bungee text-[11px]" style={{ color: '#F5F5DC', letterSpacing: '0.03em' }}>
                      {stats.status}
                    </p>
                    {stats.remaining > 0 && (
                      <p className="font-special-elite text-[10px]" style={{ color: 'rgba(192,192,192,0.5)', marginTop: '1px' }}>
                        {stats.remaining} {stats.remaining === 1 ? 'book' : 'books'} to go by Dec 31
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowGoalModal(true)}
                    className="font-bungee text-[10px] flex-1 py-2 rounded-lg transition-all"
                    style={{ border: '1px solid rgba(192,192,192,0.25)', color: 'rgba(192,192,192,0.6)', background: 'transparent', letterSpacing: '0.06em', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(192,192,192,0.5)'; e.currentTarget.style.color = '#F5F5DC'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(192,192,192,0.25)'; e.currentTarget.style.color = 'rgba(192,192,192,0.6)'; }}
                  >
                    CHANGE GOAL
                  </button>
                  <button
                    onClick={onShowLibrary}
                    className="font-bungee text-[10px] flex-1 py-2 rounded-lg transition-all"
                    style={{ border: '1px solid rgba(255,78,0,0.5)', color: '#FF4E00', background: 'transparent', letterSpacing: '0.06em', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,78,0,0.12)'; e.currentTarget.style.borderColor = '#FF4E00'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,78,0,0.5)'; }}
                  >
                    MY LIBRARY
                  </button>
                </div>
              </>
            )}

            {/* Past quests link */}
            {questHistory.length > 0 && (
              <button
                onClick={() => setShowQuestHistory(true)}
                className="font-special-elite w-full text-center mt-3 text-[11px] transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(64,224,208,0.4)', textDecoration: 'underline' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#40E0D0'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(64,224,208,0.4)'; }}
              >
                View Past Quests
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Badges section ── */}
      {user && (() => {
        const earnedIds     = new Set(earnedBadgeData.map(b => b.badgeId));
        const allProgress   = computeBadgeProgress(travelStats);
        const earnedBadges  = allProgress.filter(b => earnedIds.has(b.id));
        const nextBadge     = allProgress
          .filter(b => !earnedIds.has(b.id) && b.pct > 0)
          .sort((a, b) => b.pct - a.pct)[0] || null;
        // Most recent 6 (last earned first — use earnedBadgeData order isn't guaranteed, use definition order for now)
        const recentBadges = earnedBadges.slice(-6).reverse();

        return (
          <div className="w-full max-w-lg rounded-xl p-4 mb-5"
            style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="font-bungee text-sm"
                  style={{ color: '#40E0D0', textShadow: '0 0 8px rgba(64,224,208,0.5)', letterSpacing: '0.05em' }}>
                  BADGES EARNED
                </h2>
                <span className="font-bungee text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: '#40E0D020', border: '1px solid #40E0D040', color: '#40E0D0' }}>
                  {earnedBadges.length}
                </span>
              </div>
              {onShowBadges && (
                <button onClick={onShowBadges}
                  className="font-bungee text-[10px] px-3 py-1.5 rounded-full transition-all"
                  style={{ border: '1px solid rgba(64,224,208,0.4)', color: '#40E0D0', background: 'transparent', letterSpacing: '0.04em' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(64,224,208,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  VIEW ALL
                </button>
              )}
            </div>

            {/* Badge icons grid */}
            {recentBadges.length > 0 ? (
              <div className="grid grid-cols-6 gap-2 mb-4">
                {recentBadges.map(badge => (
                  <div key={badge.id} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: `radial-gradient(circle, ${badge.color}22, ${badge.color}08)`,
                        border: `1.5px solid ${badge.color}60`,
                        boxShadow: `0 0 8px ${badge.color}40`,
                        fontSize: '1.25rem',
                      }}>
                      {badge.icon}
                    </div>
                    <span className="font-bungee text-[7px] text-center leading-tight"
                      style={{ color: badge.color, maxWidth: '40px' }}>
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-special-elite text-xs mb-4 text-center"
                style={{ color: 'rgba(192,192,192,0.4)', lineHeight: 1.5 }}>
                No badges yet — park at a bookstore to start!
              </p>
            )}

            {/* Next badge progress */}
            {nextBadge && (
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '1.1rem' }}>{nextBadge.icon}</span>
                    <div>
                      <p className="font-bungee text-[10px] leading-tight"
                        style={{ color: nextBadge.color, letterSpacing: '0.03em' }}>
                        NEXT: {nextBadge.name}
                      </p>
                      <p className="font-special-elite text-[9px]"
                        style={{ color: 'rgba(192,192,192,0.45)' }}>
                        Just {nextBadge.required - nextBadge.current} more to go!
                      </p>
                    </div>
                  </div>
                  <span className="font-bungee text-[10px]"
                    style={{ color: 'rgba(192,192,192,0.4)' }}>
                    {nextBadge.current}/{nextBadge.required}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${nextBadge.pct}%`,
                      background: `linear-gradient(90deg, ${nextBadge.color}80, ${nextBadge.color})`,
                    }} />
                </div>
              </div>
            )}
          </div>
        );
      })()}

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

      {/* ── Preferences ── */}
      <div className="w-full max-w-lg rounded-xl mb-5 overflow-hidden"
        style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}>

        <div className="px-4 pt-4 pb-2">
          <h2 className="font-bungee text-sm" style={{ color: '#40E0D0', textShadow: '0 0 8px rgba(64,224,208,0.5)' }}>
            PREFERENCES
          </h2>
        </div>

        {/* Sound effects toggle */}
        <div className="p-4 flex items-center justify-between"
          style={{ borderTop: '1px solid #2A2B45', borderBottom: '1px solid #2A2B45' }}>
          <div>
            <p className="font-bungee text-paper-white text-xs">SOUND EFFECTS</p>
            <p className="font-special-elite text-chrome-silver text-xs mt-0.5">Honk horn when meeting fellow travelers</p>
          </div>
          <button onClick={handleSoundToggle} className="w-11 h-6 rounded-full relative transition-all flex-shrink-0"
            style={{ background: soundEnabled ? '#FF4E00' : '#3A3B55' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: soundEnabled ? '22px' : '2px' }} />
          </button>
        </div>

        {/* Privacy toggle */}
        <div className="p-4 flex items-center justify-between">
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
      </div>

      {/* ── Choose Your Ride ── */}
      <div className="w-full max-w-lg rounded-xl p-5 mb-5" style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bungee text-sm" style={{ color: '#FF4E00', textShadow: '0 0 8px rgba(255,78,0,0.5)' }}>
            CHOOSE YOUR RIDE
          </h2>
          {selectedCar && (
            <span className="font-special-elite text-xs" style={{ color: 'rgba(64,224,208,0.6)' }}>
              Ready to park!
            </span>
          )}
        </div>
        <p className="font-special-elite text-xs mb-4" style={{ color: 'rgba(192,192,192,0.45)' }}>
          Select your retro car to park at bookstores &amp; cafés along your route.
        </p>
        <CarSelector selectedCar={selectedCar} onSelect={handleCarSelect} />
      </div>

      {/* ── Danger Zone ── */}
      {user && (
        <div className="w-full max-w-lg rounded-xl p-5 mb-5"
          style={{ background: '#1E0A0A', border: '1px solid rgba(220,38,38,0.35)' }}>
          <h2 className="font-bungee text-sm mb-1" style={{ color: '#DC2626', letterSpacing: '0.06em' }}>
            DANGER ZONE
          </h2>
          <p className="font-special-elite text-xs mb-4" style={{ color: 'rgba(192,192,192,0.5)', lineHeight: 1.5 }}>
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError(''); }}
            className="font-bungee text-xs py-2 px-4 rounded-lg transition-all"
            style={{ border: '1px solid rgba(220,38,38,0.6)', color: '#DC2626', background: 'transparent', letterSpacing: '0.05em' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            DELETE MY ACCOUNT
          </button>
        </div>
      )}


      {/* Book search modal */}
      {showBookModal && (
        <BookModal
          favoriteBooks={favoriteBooks}
          onAdd={handleAddBook}
          onRemove={handleRemoveBook}
          onClose={() => setShowBookModal(false)}
        />
      )}

      {/* Reading Quest goal modal */}
      {showGoalModal && (
        <GoalModal
          currentGoal={readingGoal?.goal ?? null}
          booksRead={readingStats.questBooksRead ?? 0}
          onSave={handleSaveGoal}
          onClose={() => { setShowGoalModal(false); setGoalSaveError(''); }}
          errorMsg={goalSaveError}
        />
      )}

      {/* Reading Quest history modal */}
      {showQuestHistory && (
        <QuestHistoryModal
          history={questHistory}
          onClose={() => setShowQuestHistory(false)}
        />
      )}

      {/* Badge unlock celebration */}
      {newBadges.length > 0 && (
        <BadgeUnlockModal
          badges={newBadges}
          onClose={() => setNewBadges([])}
          onViewAll={onShowBadges}
        />
      )}

      {/* ── Account deletion confirmation modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center px-4"
          onClick={() => { if (!deleteLoading) setShowDeleteModal(false); }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0D0E1A', border: '2px solid rgba(220,38,38,0.6)' }}
            onClick={e => e.stopPropagation()}>

            {/* Red top strip */}
            <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent, #DC2626, transparent)' }} />

            <div className="px-6 py-6">
              <h2 className="font-bungee text-base mb-3" style={{ color: '#DC2626', letterSpacing: '0.05em' }}>
                DELETE ACCOUNT?
              </h2>

              <p className="font-special-elite text-sm mb-4"
                style={{ color: 'rgba(245,245,220,0.8)', lineHeight: 1.6 }}>
                This will permanently delete:
              </p>
              <ul className="font-special-elite text-xs mb-4 space-y-1"
                style={{ color: 'rgba(192,192,192,0.65)', lineHeight: 1.5 }}>
                {[
                  'Your profile and login',
                  'All saved routes and stops',
                  'Book Log and ratings',
                  'Check-in history',
                  'All badges and stats',
                  'Guestbook posts and Tale contributions',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span style={{ color: '#DC2626', flexShrink: 0 }}>✕</span>
                    {item}
                  </li>
                ))}
              </ul>

              <p className="font-bungee text-xs mb-4"
                style={{ color: 'rgba(220,38,38,0.8)', letterSpacing: '0.04em' }}>
                THIS ACTION CANNOT BE UNDONE.
              </p>

              {/* Type DELETE confirmation */}
              <label className="block font-bungee text-[10px] mb-1.5 tracking-widest"
                style={{ color: 'rgba(192,192,192,0.5)' }}>
                TYPE DELETE TO CONFIRM
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={deleteLoading}
                className="w-full rounded-lg px-3 py-2 font-bungee text-sm mb-4 outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${deleteConfirmText === 'DELETE' ? '#DC2626' : 'rgba(255,255,255,0.12)'}`,
                  color: '#F5F5DC',
                  letterSpacing: '0.08em',
                }}
              />

              {deleteError && (
                <p className="font-special-elite text-xs mb-4"
                  style={{ color: '#DC2626', lineHeight: 1.5 }}>
                  {deleteError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                  className="flex-1 font-bungee text-xs py-2.5 rounded-lg border transition-all"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(192,192,192,0.7)', background: 'transparent' }}
                  onMouseEnter={e => { if (!deleteLoading) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                  className="flex-1 font-bungee text-xs py-2.5 rounded-lg transition-all"
                  style={{
                    background: deleteConfirmText === 'DELETE' && !deleteLoading ? '#DC2626' : 'rgba(220,38,38,0.2)',
                    color: deleteConfirmText === 'DELETE' && !deleteLoading ? '#fff' : 'rgba(220,38,38,0.4)',
                    cursor: deleteConfirmText === 'DELETE' && !deleteLoading ? 'pointer' : 'not-allowed',
                    letterSpacing: '0.04em',
                  }}
                >
                  {deleteLoading ? 'DELETING...' : 'PERMANENTLY DELETE'}
                </button>
              </div>
            </div>

            <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent, #DC2626, transparent)' }} />
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
