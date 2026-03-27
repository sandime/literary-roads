import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { searchBooks } from '../utils/googleBooks';
import {
  subscribeToGuestbook,
  checkBookExists,
  addBookEntry,
  addRecommendationToEntry,
} from '../utils/guestbook';

// Atomic-age 8-point starburst (Googie style)
// Points alternate outer (r=11) and inner (r=4.5) at 22.5° intervals, starting from top
const StarBurst = ({ className, style }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    style={style}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polygon points="12,1 13.7,7.8 19.8,4.2 16.2,10.3 23,12 16.2,13.7 19.8,19.8 13.7,16.2 12,23 10.3,16.2 4.2,19.8 7.8,13.7 1,12 7.8,10.3 4.2,4.2 10.3,7.8" />
  </svg>
);

const BookCoverPlaceholder = ({ title }) => (
  <div className="w-full h-full bg-midnight-navy border border-starlight-turquoise/20 flex items-center justify-center">
    <span
      className="text-starlight-turquoise/40 font-special-elite text-center px-1 leading-tight"
      style={{ fontSize: '8px' }}
    >
      {title?.substring(0, 18)}
    </span>
  </div>
);

export default function Guestbook({ locationId, user, onShowLogin, placeName = '', placeState = '' }) {
  const [view, setView] = useState('carousel'); // 'carousel' | 'expanded' | 'search' | 'write'
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState(null);

  // write-flow state
  const [pendingBook, setPendingBook] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [existingEntryId, setExistingEntryId] = useState(null);
  const [writeSource, setWriteSource] = useState('search'); // 'search' | 'expanded'
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [readNextAdded, setReadNextAdded] = useState(() => new Set());
  // search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef(null);

  // Subscribe to guestbook entries in real-time
  useEffect(() => {
    setLoadingEntries(true);
    const unsub = subscribeToGuestbook(locationId, (data) => {
      setEntries(data);
      setLoadingEntries(false);
    });
    return unsub;
  }, [locationId]);

  // Debounced book search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchBooks(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus search input when entering search view
  useEffect(() => {
    if (view === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [view]);

  // Background duplicate check — fires after a book is selected, never blocks the UI
  useEffect(() => {
    if (!pendingBook || writeSource !== 'search') return;
    let cancelled = false;
    checkBookExists(locationId, pendingBook.id)
      .then((existing) => {
        if (cancelled) return;
        if (existing) {
          setIsDuplicate(true);
          setExistingEntryId(existing.id);
          setExpandedEntry(existing);
        }
      })
      .catch(() => { /* network/permission error — proceed as new book */ });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBook?.id]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const goToCarousel = () => {
    setView('carousel');
    setExpandedEntry(null);
    setPendingBook(null);
    setSearchQuery('');
    setSearchResults([]);
    setIsDuplicate(false);
    setExistingEntryId(null);
    setSubmitError('');
  };

  const handleOpenSearch = () => {
    if (!user) { onShowLogin?.(); return; }
    setView('search');
  };

  // Synchronous — navigates to write view immediately; duplicate check runs in background
  const handleSelectBook = (book) => {
    const safeId = book.id.replace(/\//g, '_');
    setPendingBook({ ...book, id: safeId });
    setIsDuplicate(false);
    setExistingEntryId(null);
    setSubmitError('');
    setWriteSource('search');
    setView('write');
  };

  const handleAddVoiceFromExpanded = () => {
    if (!expandedEntry) return;
    setIsDuplicate(true);
    setExistingEntryId(expandedEntry.id);
    setPendingBook({
      id: expandedEntry.googleBooksId || expandedEntry.id,
      title: expandedEntry.bookTitle,
      author: expandedEntry.bookAuthor,
      coverURL: expandedEntry.bookCover,
    });
    setWriteSource('expanded');
    setView('write');
  };

  const handleSubmit = async () => {
    if (!user) { onShowLogin?.(); return; }

    const recommendation = {
      userId: user.uid,
      userName: user.displayName || 'Anonymous Traveler',
      timestamp: new Date().toISOString(),
    };

    const targetPath = isDuplicate && existingEntryId
      ? `guestbooks/${locationId}/entries/${existingEntryId}`
      : `guestbooks/${locationId}/entries/${pendingBook?.id}`;

    console.log('[Guestbook] Submitting to:', targetPath, '| user:', user.uid, '| isDuplicate:', isDuplicate);

    setSubmitting(true);
    setSubmitError('');
    try {
      if (isDuplicate && existingEntryId) {
        await addRecommendationToEntry(locationId, existingEntryId, recommendation);
      } else {
        await addBookEntry(locationId, pendingBook, recommendation);
      }
      console.log('[Guestbook] Save succeeded');

      // Write to My Recs in Library
      if (user && pendingBook) {
        try {
          await setDoc(
            doc(db, 'users', user.uid, 'libraryRecs', pendingBook.id),
            {
              title: pendingBook.title || '',
              author: pendingBook.author || '',
              coverUrl: pendingBook.coverURL || '',
              placeId: locationId,
              placeName,
              state: placeState,
              date: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (recErr) {
          console.warn('[Guestbook] libraryRecs write failed:', recErr);
        }
      }

      goToCarousel();
    } catch (err) {
      console.error('[Guestbook] Save failed — code:', err.code, '| message:', err.message, '| full error:', err);
      setSubmitError(`Failed to save. (${err.code || err.message})`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWriteBack = () => {
    if (writeSource === 'expanded') {
      setView('expanded');
    } else {
      setView('search');
    }
  };

  const handleAddToReadNext = async (entry) => {
    if (!user) { onShowLogin?.(); return; }
    const bookId = (entry.googleBooksId || entry.id || '').replace(/\//g, '_');
    if (!bookId) return;
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'libraryReadNext', bookId),
        {
          title: entry.bookTitle || '',
          author: entry.bookAuthor || '',
          coverUrl: entry.bookCover || '',
          recommendedBy: (entry.recommendations?.[0]?.userName) || 'A Literary Traveler',
          placeName,
          state: placeState,
          date: serverTimestamp(),
          whoWhatWhere: [entry.bookTitle, placeName, placeState].filter(Boolean).join(' · '),
        },
        { merge: true }
      );
      setReadNextAdded(prev => new Set([...prev, bookId]));
    } catch (err) {
      console.warn('[Guestbook] libraryReadNext write failed:', err);
    }
  };

  // ── Views ─────────────────────────────────────────────────────────────────

  const renderCarousel = () => (
    <div>
      {loadingEntries ? (
        <div className="flex justify-center py-5">
          <div className="w-5 h-5 border-2 border-atomic-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-chrome-silver font-special-elite text-sm">No books yet.</p>
          <p className="text-chrome-silver/50 font-special-elite text-xs mt-0.5">
            Be the first to leave a recommendation!
          </p>
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => { setExpandedEntry(entry); setView('expanded'); }}
              className="flex-shrink-0 flex flex-col items-center group cursor-pointer"
              style={{ width: '72px' }}
            >
              {/* Cover with star badge */}
              <div
                className="w-full rounded-sm overflow-hidden border border-white/10 group-hover:border-atomic-orange/60 transition-colors relative"
                style={{ height: '96px' }}
              >
                {entry.bookCover ? (
                  <img
                    src={entry.bookCover}
                    alt={entry.bookTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookCoverPlaceholder title={entry.bookTitle} />
                )}
                {/* Star badge bottom-right */}
                <div className="absolute bottom-1 right-1 bg-midnight-navy/85 rounded-sm px-1 py-0.5 flex items-center gap-0.5">
                  <StarBurst className="w-2.5 h-2.5 text-atomic-orange" />
                  <span className="text-paper-white font-bungee" style={{ fontSize: '9px' }}>
                    {entry.recommendationCount}
                  </span>
                </div>
              </div>

              {/* Title */}
              <p
                className="text-paper-white font-special-elite mt-1 text-center leading-tight group-hover:text-starlight-turquoise transition-colors w-full"
                style={{
                  fontSize: '9px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {entry.bookTitle}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Recommend a book button */}
      <button
        onClick={handleOpenSearch}
        className="mt-3 w-full border border-dashed border-atomic-orange/50 text-atomic-orange font-bungee py-2 rounded-lg hover:bg-atomic-orange/10 hover:border-atomic-orange transition-all flex items-center justify-center gap-2"
        style={{ fontSize: '11px' }}
      >
        <span className="text-sm leading-none">＋</span> RECOMMEND A BOOK
      </button>
    </div>
  );

  const renderExpanded = () => {
    if (!expandedEntry) return null;
    return (
      <div>
        <button
          onClick={goToCarousel}
          className="flex items-center gap-1 text-starlight-turquoise font-special-elite text-xs mb-3 hover:text-atomic-orange transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to books
        </button>

        {/* Book header */}
        <div className="flex gap-3 mb-3">
          <div
            className="flex-shrink-0 rounded-sm overflow-hidden border border-white/10"
            style={{ width: '52px', height: '72px' }}
          >
            {expandedEntry.bookCover ? (
              <img src={expandedEntry.bookCover} alt={expandedEntry.bookTitle} className="w-full h-full object-cover" />
            ) : (
              <BookCoverPlaceholder title={expandedEntry.bookTitle} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-starlight-turquoise font-bungee text-sm leading-tight">
              {expandedEntry.bookTitle}
            </p>
            <p className="text-chrome-silver font-special-elite text-xs mt-0.5">
              {expandedEntry.bookAuthor}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <StarBurst
                className="w-4 h-4 text-atomic-orange"
                style={{ filter: 'drop-shadow(0 0 4px rgba(255,78,0,0.7))' }}
              />
              <span className="text-atomic-orange font-bungee text-xs">
                {expandedEntry.recommendationCount}{' '}
                voice{expandedEntry.recommendationCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Recommendations list */}
        <div className="space-y-1.5 mb-3">
          {(expandedEntry.recommendations || []).map((rec, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
              <StarBurst className="w-3 h-3 text-atomic-orange flex-shrink-0" />
              <span className="text-chrome-silver font-special-elite text-xs">{rec.userName}</span>
            </div>
          ))}
        </div>

        {/* Add voice / sign-in */}
        {user ? (
          <div className="flex gap-2">
            <button
              onClick={handleAddVoiceFromExpanded}
              className="flex-1 border-2 border-starlight-turquoise text-starlight-turquoise font-bungee py-2 rounded-lg hover:bg-starlight-turquoise hover:text-midnight-navy transition-all"
              style={{ fontSize: '11px' }}
            >
              + ADD YOUR VOICE
            </button>
            <button
              onClick={() => handleAddToReadNext(expandedEntry)}
              className="flex-none border-2 font-bungee py-2 px-3 rounded-lg transition-all"
              style={{
                fontSize: '11px',
                borderColor: readNextAdded.has((expandedEntry.googleBooksId || expandedEntry.id || '').replace(/\//g, '_')) ? '#38C5C5' : 'rgba(56,197,197,0.4)',
                color: readNextAdded.has((expandedEntry.googleBooksId || expandedEntry.id || '').replace(/\//g, '_')) ? '#38C5C5' : 'rgba(56,197,197,0.7)',
                background: readNextAdded.has((expandedEntry.googleBooksId || expandedEntry.id || '').replace(/\//g, '_')) ? 'rgba(56,197,197,0.1)' : 'transparent',
              }}
            >
              {readNextAdded.has((expandedEntry.googleBooksId || expandedEntry.id || '').replace(/\//g, '_')) ? 'SAVED' : '+ READ NEXT'}
            </button>
          </div>
        ) : (
          <button
            onClick={onShowLogin}
            className="w-full border border-dashed border-starlight-turquoise/40 text-chrome-silver font-special-elite py-2 rounded-lg hover:border-starlight-turquoise hover:text-starlight-turquoise transition-all text-xs"
          >
            Sign in to add your voice
          </button>
        )}
      </div>
    );
  };

  const renderSearch = () => (
    <div>
      <button
        onClick={goToCarousel}
        className="flex items-center gap-1 text-starlight-turquoise font-special-elite text-xs mb-3 hover:text-atomic-orange transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Search input */}
      <div className="relative mb-3">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or author..."
          className="w-full bg-black/40 border-2 border-starlight-turquoise/60 text-paper-white font-special-elite px-3 py-2 pr-9 rounded-lg focus:outline-none focus:border-starlight-turquoise text-sm"
        />
        {searching ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-starlight-turquoise border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-starlight-turquoise/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
      </div>

      {/* Results */}
      {searchResults.length > 0 && (
        <div className="space-y-1">
          {searchResults.map((book) => (
            <button
              key={book.id}
              onPointerDown={() => handleSelectBook(book)}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors text-left group"
              style={{ touchAction: 'manipulation' }}
            >
              <div
                className="flex-shrink-0 rounded-sm overflow-hidden border border-white/10"
                style={{ width: '30px', height: '42px' }}
              >
                {book.coverURL ? (
                  <img src={book.coverURL} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <span style={{ fontSize: '10px' }}>📚</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-paper-white font-special-elite text-xs leading-tight truncate group-hover:text-starlight-turquoise transition-colors">
                  {book.title}
                </p>
                <p className="text-chrome-silver/60 font-special-elite truncate" style={{ fontSize: '10px' }}>
                  {book.author}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
        <p className="text-chrome-silver/50 font-special-elite text-xs text-center py-4">
          No books found — try a different title or author.
        </p>
      )}

      {searchQuery.length < 2 && (
        <p className="text-chrome-silver/30 font-special-elite text-xs text-center py-4">
          Type a title or author to search
        </p>
      )}
    </div>
  );

  const renderWrite = () => {
    if (!pendingBook) return null;

    return (
      <div>
        <button
          onClick={handleWriteBack}
          className="flex items-center gap-1 text-starlight-turquoise font-special-elite text-xs mb-3 hover:text-atomic-orange transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {writeSource === 'expanded' ? 'Back to book' : 'Back to search'}
        </button>

        {/* Selected book preview */}
        <div className="flex items-center gap-3 mb-3 bg-white/5 border border-white/10 rounded-lg p-2">
          <div
            className="flex-shrink-0 rounded-sm overflow-hidden border border-white/10"
            style={{ width: '38px', height: '52px' }}
          >
            {pendingBook.coverURL ? (
              <img src={pendingBook.coverURL} alt={pendingBook.title} className="w-full h-full object-cover" />
            ) : (
              <BookCoverPlaceholder title={pendingBook.title} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-starlight-turquoise font-bungee leading-tight truncate" style={{ fontSize: '11px' }}>
              {pendingBook.title}
            </p>
            <p className="text-chrome-silver font-special-elite truncate" style={{ fontSize: '10px' }}>
              {pendingBook.author}
            </p>
          </div>
        </div>

        {/* Duplicate notice */}
        {isDuplicate && (
          <div className="mb-3 bg-atomic-orange/10 border border-atomic-orange/40 rounded-lg px-3 py-2 flex items-start gap-2">
            <StarBurst className="w-3.5 h-3.5 text-atomic-orange flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-atomic-orange font-bungee" style={{ fontSize: '10px' }}>
                Already in the guestbook!
              </p>
              <p className="text-paper-white font-special-elite mt-0.5" style={{ fontSize: '10px' }}>
                Add your voice to the existing recommendation.
              </p>
            </div>
          </div>
        )}

        {submitError && (
          <p className="text-atomic-orange font-special-elite text-xs mb-3">{submitError}</p>
        )}

        {/* Auth gate */}
        {!user ? (
          <div className="text-center py-3">
            <p className="text-chrome-silver font-special-elite text-xs mb-3">
              Sign in to recommend this book
            </p>
            <button
              onClick={onShowLogin}
              className="border-2 border-atomic-orange text-atomic-orange font-bungee px-5 py-1.5 rounded-lg hover:bg-atomic-orange hover:text-midnight-navy transition-all text-xs"
            >
              SIGN IN
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={goToCarousel}
              className="flex-1 border border-white/20 text-chrome-silver font-bungee py-2 rounded-lg hover:border-white/40 hover:text-paper-white transition-all"
              style={{ fontSize: '11px' }}
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-atomic-orange text-midnight-navy font-bungee py-2 rounded-lg hover:bg-starlight-turquoise disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ fontSize: '11px' }}
            >
              {submitting ? 'SAVING...' : isDuplicate ? 'ADD MY VOICE' : 'RECOMMEND'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Root render ───────────────────────────────────────────────────────────

  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StarBurst
            className="w-5 h-5 text-atomic-orange"
            style={{ filter: 'drop-shadow(0 0 6px rgba(255,78,0,0.6))' }}
          />
          <h3 className="text-atomic-orange font-bungee text-sm tracking-wide">GUESTBOOK</h3>
          {!loadingEntries && entries.length > 0 && (
            <span
              className="bg-atomic-orange/15 text-atomic-orange font-bungee px-2 py-0.5 rounded-full border border-atomic-orange/30"
              style={{ fontSize: '10px' }}
            >
              {entries.length} book{entries.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {view === 'carousel' && !loadingEntries && (
          <p className="text-chrome-silver/40 font-special-elite" style={{ fontSize: '10px' }}>
            community picks
          </p>
        )}
      </div>

      {view === 'carousel' && renderCarousel()}
      {view === 'expanded' && renderExpanded()}
      {view === 'search' && renderSearch()}
      {view === 'write' && renderWrite()}
    </div>
  );
}
