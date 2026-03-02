import { useState, useEffect } from 'react';
import { doc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';

const MAX_FAVORITES = 5;

// ── Podcast data ───────────────────────────────────────────────────────────
const PODCASTS = [
  {
    id: 'between-the-covers',
    title: 'Between the Covers',
    host: 'David Naimon',
    description: 'In-depth conversations with fiction writers about craft, process, and the life of writing.',
    url: 'https://tinhouse.com/podcast/',
    tag: 'Craft & Conversations',
    emoji: '🎙️',
  },
  {
    id: 'new-yorker-fiction',
    title: 'The New Yorker Fiction Podcast',
    host: 'Deborah Treisman',
    description: 'A prominent author reads and discusses a classic story from the New Yorker archive.',
    url: 'https://www.newyorker.com/podcast/fiction',
    tag: 'Short Fiction',
    emoji: '📖',
  },
  {
    id: 'book-riot',
    title: 'Book Riot Podcast',
    host: 'Rebecca Schinsky & Jeff O\'Neal',
    description: 'Book news, recommendations, and the reading life — for the obsessed reader.',
    url: 'https://bookriot.com/category/podcast/',
    tag: 'Book Culture',
    emoji: '📚',
  },
  {
    id: 'literary-disco',
    title: 'Literary Disco',
    host: 'Rider Strong, Julia Pistell & Tod Goldberg',
    description: 'Three writers geek out on books, movies, and culture with warmth and humor.',
    url: 'http://literarydisco.com',
    tag: 'Book Talk',
    emoji: '🎧',
  },
  {
    id: 'backlisted',
    title: 'Backlisted',
    host: 'John Mitchinson & Andy Miller',
    description: 'Rediscovering overlooked, forgotten, and underrated books with infectious enthusiasm.',
    url: 'https://backlisted.fm',
    tag: 'Classics & Rediscovery',
    emoji: '🔍',
  },
  {
    id: 'shakespeare-unlimited',
    title: 'Shakespeare Unlimited',
    host: 'Folger Shakespeare Library',
    description: 'Interviews with scholars, actors, and artists about Shakespeare\'s life, work, and legacy.',
    url: 'https://www.folger.edu/shakespeare-unlimited',
    tag: 'Literary History',
    emoji: '🎭',
  },
];

// ── Coming-soon sections ───────────────────────────────────────────────────
const COMING_SOON = [
  { emoji: '🧠', label: 'Literary Trivia',      desc: 'Test your knowledge of authors, novels, and hidden history.' },
  { emoji: '📓', label: 'Reading Challenges',   desc: 'Road-trip themed reading lists and trackable challenges.' },
  { emoji: '🗺️', label: 'Author Hometown Tours', desc: 'Self-guided walking tours of literary cities.' },
  { emoji: '☕', label: 'Bookshop Guides',       desc: 'Curated independent bookshop picks by state.' },
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
  const [favIds,    setFavIds]    = useState([]);   // string[]
  const [toast,     setToast]     = useState(null); // string | null
  const [saving,    setSaving]    = useState(false);

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

  const favPodcasts  = PODCASTS.filter((p) => favIds.includes(p.id));
  const otherPodcasts = PODCASTS.filter((p) => !favIds.includes(p.id));
  const canFavorite  = favIds.length < MAX_FAVORITES;

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
            🍟 HIGHWAY SNACKS
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {otherPodcasts.map((p) => (
              <PodcastCard key={p.id} {...cardProps(p)} />
            ))}
            {/* When all are favorited */}
            {otherPodcasts.length === 0 && (
              <p style={{
                fontFamily: 'Special Elite, serif', fontSize: '13px',
                color: 'rgba(200,155,70,0.5)', textAlign: 'center',
                fontStyle: 'italic', padding: '8px 0',
              }}>
                You've favorited all the podcasts — more coming soon!
              </p>
            )}
          </div>
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
            {COMING_SOON.map(({ emoji, label, desc }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(64,224,208,0.2)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <div style={{ fontSize: '24px' }}>{emoji}</div>
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
