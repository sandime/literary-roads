// src/screens/LibraryArchive.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';

const BASE_URL = import.meta.env.BASE_URL;
const CAT_SRC  = `${BASE_URL}images/library-cat.png`;

const CAT_FILTER_ACTIVE   = 'sepia(1) saturate(8) hue-rotate(-8deg) brightness(1.05) drop-shadow(0 0 4px rgba(245,166,35,0.8))';
const CAT_FILTER_INACTIVE = 'grayscale(1) brightness(0.55) opacity(0.4)';

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
  divider:  'rgba(56,197,197,0.18)',
};

// Cover helpers — guards against Open Library's 1×1 placeholder GIF
const onCoverLoad  = (e) => { if (e.target.naturalWidth <= 1) e.target.src = CAT_SRC; };
const onCoverError = (e) => { e.target.onerror = null; e.target.src = CAT_SRC; };

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Small SVG icons ───────────────────────────────────────────────────────────
const QuillSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M20 4C17 3 8 7 4 20" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M4 20C8 17 12 14 17 10" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="4" y1="20" x2="8" y2="16" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const StampSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <rect x="3" y="3" width="18" height="18" rx="1" stroke="#38C5C5" strokeWidth="1.5" strokeDasharray="3 2"/>
    <rect x="6" y="6" width="12" height="12" stroke="#38C5C5" strokeWidth="1.5"/>
  </svg>
);

// ── Reusable pieces ───────────────────────────────────────────────────────────
function TagPill({ text, color }) {
  return (
    <span style={{
      fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.04em',
      padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap',
      background: `${color}15`, color,
      border: `1px solid ${color}40`,
    }}>
      {text.toUpperCase()}
    </span>
  );
}

function CatRating({ value }) {
  if (!value || value < 1) return null;
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <img key={n} src={`${BASE_URL}images/retro_cat.png`} alt=""
          style={{ width: 16, height: 'auto', filter: value >= n ? CAT_FILTER_ACTIVE : CAT_FILTER_INACTIVE }} />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: L.white, borderRadius: 12, marginBottom: 12,
      border: `1px solid ${L.divider}`, padding: '14px',
      borderLeft: `4px solid ${L.divider}`,
      animation: 'archive-shimmer 1.4s ease-in-out infinite',
    }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 52, height: 74, borderRadius: 4, background: '#E8DFC8', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 12, width: '60%', background: '#E8DFC8', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 10, width: '40%', background: '#EDE8D8', borderRadius: 4, marginBottom: 14 }} />
          <div style={{ height: 9, width: '85%', background: '#EDE8D8', borderRadius: 4, marginBottom: 5 }} />
          <div style={{ height: 9, width: '70%', background: '#EDE8D8', borderRadius: 4, marginBottom: 5 }} />
          <div style={{ height: 9, width: '55%', background: '#EDE8D8', borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

// ── Journal entry card ────────────────────────────────────────────────────────
function JournalCard({ item, expanded, onToggleExpand }) {
  const showNotes = !item.personalNotesPrivate && !!item.personalNotes;

  return (
    <div
      style={{
        background: L.white, borderRadius: 12, marginBottom: 12,
        border: `1px solid rgba(245,166,35,0.2)`,
        borderLeft: `4px solid ${L.gold}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        animation: 'archive-fade-in 0.3s ease',
      }}
      onClick={() => onToggleExpand(item.id)}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 5px 18px rgba(245,166,35,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
      }}
    >
      <div style={{ padding: 14, display: 'flex', gap: 12 }}>
        {/* Cover */}
        <div style={{
          width: 52, height: 74, flexShrink: 0, borderRadius: 4,
          overflow: 'hidden', background: '#F5F0E0',
          border: `1.5px solid rgba(245,166,35,0.25)`,
        }}>
          <img
            src={item.bookCover || CAT_SRC}
            onLoad={onCoverLoad} onError={onCoverError}
            alt={item.bookTitle}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title + quill */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
            <p style={{
              fontFamily: 'Bungee, sans-serif', fontSize: 12, color: L.turquoise,
              lineHeight: 1.3, margin: 0, flex: 1,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {item.bookTitle}
            </p>
            <QuillSVG />
          </div>

          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.coral, margin: '0 0 6px' }}>
            {item.bookAuthor}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
            <CatRating value={item.rating} />
            {(item.finishedMonth || item.finishedYear) && (
              <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.muted }}>
                {[item.finishedMonth, item.finishedYear].filter(Boolean).join(' ')}
              </span>
            )}
          </div>

          {item.reflection && (
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: 12, color: L.dark,
              lineHeight: 1.65, margin: '0 0 8px',
              overflow: expanded ? 'visible' : 'hidden',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded ? undefined : 3,
              WebkitBoxOrient: 'vertical',
            }}>
              {item.reflection}
            </p>
          )}

          {/* Non-fiction: what you learned (always shown, truncated unless expanded) */}
          {item.bookType === 'nonfiction' && item.whatYouLearned && (
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: 11, color: L.mid,
              lineHeight: 1.6, margin: '0 0 8px',
              overflow: expanded ? 'visible' : 'hidden',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded ? undefined : 2,
              WebkitBoxOrient: 'vertical',
              borderLeft: `3px solid ${L.gold}`, paddingLeft: 8,
            }}>
              {item.whatYouLearned}
            </p>
          )}

          {expanded && (
            <>
              {item.feel?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {item.feel.map(t => <TagPill key={t} text={t} color={L.coral} />)}
                </div>
              )}
              {item.vibeTags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {item.vibeTags.map(t => <TagPill key={t} text={t} color={L.turquoise} />)}
                </div>
              )}
              {/* Non-fiction extra reflections */}
              {item.bookType === 'nonfiction' && (
                <>
                  {item.changedThinking && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.muted, letterSpacing: '0.06em' }}>CHANGED HOW I THINK</span>
                      <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.dark, lineHeight: 1.6, margin: '3px 0 0' }}>{item.changedThinking}</p>
                    </div>
                  )}
                  {item.willApply && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.muted, letterSpacing: '0.06em' }}>WILL APPLY</span>
                      <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.dark, lineHeight: 1.6, margin: '3px 0 0' }}>{item.willApply}</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {showNotes && (
            <div style={{
              marginTop: 8, padding: '8px 10px', borderRadius: 8,
              background: 'rgba(255,184,163,0.22)',
              border: `1px solid rgba(245,166,35,0.22)`,
            }}>
              <p style={{
                fontFamily: 'Special Elite, serif', fontSize: 11,
                color: L.dark, lineHeight: 1.65, margin: 0,
              }}>
                {item.personalNotes}
              </p>
            </div>
          )}

          {!expanded && (
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.gold, marginTop: 4, display: 'block' }}>
              tap to expand
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Postcard card ─────────────────────────────────────────────────────────────
function PostcardCard({ item, expanded, onToggleExpand }) {
  return (
    <div
      style={{
        background: L.white, borderRadius: 12, marginBottom: 12,
        border: `1px solid rgba(56,197,197,0.2)`,
        borderLeft: `4px solid ${L.turquoise}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        animation: 'archive-fade-in 0.3s ease',
      }}
      onClick={() => onToggleExpand(item.id)}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 5px 18px rgba(56,197,197,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
      }}
    >
      <div style={{ padding: 14, display: 'flex', gap: 12 }}>
        {/* Cover */}
        <div style={{
          width: 52, height: 74, flexShrink: 0, borderRadius: 4,
          overflow: 'hidden', background: '#E8F5F5',
          border: `1.5px solid rgba(56,197,197,0.25)`,
        }}>
          <img
            src={item.coverUrl || CAT_SRC}
            onLoad={onCoverLoad} onError={onCoverError}
            alt={item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title + stamp */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
            <p style={{
              fontFamily: 'Bungee, sans-serif', fontSize: 12, color: L.turquoise,
              lineHeight: 1.3, margin: 0, flex: 1,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {item.title}
            </p>
            <StampSVG />
          </div>

          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.coral, margin: '0 0 5px' }}>
            {item.author}
          </p>

          {/* State + stamp */}
          {(item.state || item.stateCode) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              {item.state && (
                <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.muted }}>
                  {item.state}
                </span>
              )}
              {item.stateCode && (
                <span style={{
                  background: '#F4ECCC', border: '1px solid #8B4513',
                  fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: 8,
                  color: '#2c1810', padding: '1px 4px', display: 'inline-block',
                  transform: 'rotate(-3deg)', boxShadow: '1px 1px 2px rgba(0,0,0,0.2)',
                }}>
                  {item.stateCode}
                </span>
              )}
            </div>
          )}

          {item.message && (
            <p style={{
              fontFamily: 'Special Elite, serif', fontSize: 12, color: L.dark,
              lineHeight: 1.65, margin: '0 0 8px',
              overflow: expanded ? 'visible' : 'hidden',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded ? undefined : 3,
              WebkitBoxOrient: 'vertical',
            }}>
              {item.message}
            </p>
          )}

          {expanded && (
            <>
              {item.vibeTags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {item.vibeTags.map(t => <TagPill key={t} text={t} color={L.turquoise} />)}
                </div>
              )}
              {item.hashtags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                  {item.hashtags.map(h => (
                    <span key={h} style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.turquoise }}>
                      #{h.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 8 }}>
            {item.authorName && (
              <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, fontStyle: 'italic' }}>
                — {item.authorName}
              </span>
            )}
            {item.createdAt && (
              <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.muted, marginLeft: 'auto' }}>
                {formatTimestamp(item.createdAt)}
              </span>
            )}
          </div>

          {!expanded && (
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: L.turquoise, marginTop: 4, display: 'block' }}>
              tap to expand
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LibraryArchive ────────────────────────────────────────────────────────────
export default function LibraryArchive({ onBack }) {
  const { user } = useAuth();
  const [journals,  setJournals]  = useState([]);
  const [postcards, setPostcards] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    async function load() {
      try {
        const [jSnap, pSnap] = await Promise.all([
          getDocs(collection(db, 'users', user.uid, 'booksRead')),
          getDocs(collection(db, 'users', user.uid, 'libraryPostcards')),
        ]);
        setJournals(
          jSnap.docs
            .map(d => ({ id: d.id, type: 'journal', ...d.data() }))
            .filter(j => !j.isPrivate)
            .map(j => ({ ...j, sortDate: j.timestamp?.toMillis?.() ?? 0 }))
        );
        setPostcards(
          pSnap.docs
            .map(d => ({ id: d.id, type: 'postcard', ...d.data() }))
            .map(p => ({ ...p, sortDate: p.createdAt?.toMillis?.() ?? 0 }))
        );
      } catch (err) {
        console.error('[LibraryArchive]', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const byDate = (arr) => [...arr].sort((a, b) => b.sortDate - a.sortDate);

  const displayed =
    filter === 'journals'  ? byDate(journals) :
    filter === 'postcards' ? byDate(postcards) :
    byDate([...journals, ...postcards]);

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  const FilterPill = ({ label, value }) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      style={{
        fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em',
        padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
        transition: 'all 0.15s',
        background: filter === value ? L.turquoise : 'rgba(56,197,197,0.1)',
        color: filter === value ? L.white : L.turquoise,
        boxShadow: filter === value ? '0 2px 10px rgba(56,197,197,0.28)' : 'none',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: L.bg, overflowY: 'auto',
      fontFamily: 'Special Elite, serif',
    }}>
      <style>{`
        @keyframes archive-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes archive-shimmer {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: L.bg, borderBottom: `2px solid #C8960C`,
        padding: '12px 16px', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 600, margin: '0 auto' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark,
              letterSpacing: '0.06em', padding: '4px 8px', transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#C8960C'}
            onMouseLeave={e => e.currentTarget.style.color = L.dark}
          >
            BACK
          </button>
          <h1 style={{
            margin: 0, fontFamily: 'Bungee, sans-serif',
            fontSize: 15, color: '#C8960C', letterSpacing: '0.06em',
          }}>
            THE ARCHIVE
          </h1>
          <div style={{ width: 56 }} />
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 80px' }}>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <FilterPill label="ALL"       value="all"       />
          <FilterPill label="JOURNALS"  value="journals"  />
          <FilterPill label="POSTCARDS" value="postcards" />
        </div>

        {/* Loading skeletons */}
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {/* Not signed in */}
        {!loading && !user && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontFamily: 'Bungee, sans-serif', color: L.turquoise, fontSize: 14, letterSpacing: '0.08em', marginBottom: 10 }}>
              SIGN IN TO SEE YOUR ARCHIVE
            </p>
            <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 13, lineHeight: 1.7 }}>
              Your literary history is saved to your account.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && user && displayed.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontFamily: 'Bungee, sans-serif', color: '#C8960C', fontSize: 14, letterSpacing: '0.06em', marginBottom: 12 }}>
              YOUR ARCHIVE AWAITS
            </p>
            <p style={{ fontFamily: 'Special Elite, serif', color: L.muted, fontSize: 14, lineHeight: 1.8, maxWidth: 300, margin: '0 auto' }}>
              {filter === 'all'
                ? 'Start journaling or create a postcard and your literary history will live here.'
                : filter === 'journals'
                  ? 'Log your first book to see your journal entries here.'
                  : 'Create a postcard to see it here.'}
            </p>
          </div>
        )}

        {/* Cards */}
        {!loading && displayed.map(item =>
          item.type === 'journal'
            ? <JournalCard  key={`j-${item.id}`} item={item} expanded={expandedId === `j-${item.id}`} onToggleExpand={() => toggleExpand(`j-${item.id}`)} />
            : <PostcardCard key={`p-${item.id}`} item={item} expanded={expandedId === `p-${item.id}`} onToggleExpand={() => toggleExpand(`p-${item.id}`)} />
        )}
      </div>
    </div>
  );
}
