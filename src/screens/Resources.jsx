import { useAuth } from '../contexts/AuthContext';

// ── Podcast data (populate in next session) ────────────────────────────────
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
  { emoji: '🧠', label: 'Literary Trivia', desc: 'Test your knowledge of authors, novels, and hidden history.' },
  { emoji: '📓', label: 'Reading Challenges', desc: 'Road-trip themed reading lists and trackable challenges.' },
  { emoji: '🗺️', label: 'Author Hometown Tours', desc: 'Self-guided walking tours of literary cities.' },
  { emoji: '☕', label: 'Bookshop Guides', desc: 'Curated independent bookshop picks by state.' },
];

// ── PodcastCard ────────────────────────────────────────────────────────────
function PodcastCard({ podcast }) {
  return (
    <a
      href={podcast.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1.5px solid rgba(64,224,208,0.2)',
          borderRadius: '12px',
          padding: '16px 18px',
          display: 'flex', gap: '14px', alignItems: 'flex-start',
          transition: 'border-color .2s, background .2s, box-shadow .2s',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#40E0D0';
          e.currentTarget.style.background = 'rgba(64,224,208,0.06)';
          e.currentTarget.style.boxShadow = '0 0 16px rgba(64,224,208,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(64,224,208,0.2)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          e.currentTarget.style.boxShadow = 'none';
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
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Resources({ onBack }) {
  const { user } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #0e1030 0%, #090A1A 45%, #04050F 100%)',
      color: '#F5F5DC',
      overflowY: 'auto',
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

        {/* Spacer to balance the back button */}
        <div style={{ width: '60px' }} />
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

        {/* ── LITERARY PODCASTS ── */}
        <section style={{ marginBottom: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <h2 style={{
              fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(14px, 2.5vw, 18px)',
              color: '#FF4E00', letterSpacing: '0.08em', margin: 0,
              textShadow: '0 0 12px rgba(255,78,0,0.5)',
            }}>
              LITERARY PODCASTS
            </h2>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(255,78,0,0.4), transparent)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {PODCASTS.map((p) => <PodcastCard key={p.id} podcast={p} />)}
          </div>
        </section>

        {/* ── COMING SOON ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <h2 style={{
              fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(14px, 2.5vw, 18px)',
              color: '#40E0D0', letterSpacing: '0.08em', margin: 0,
              textShadow: '0 0 12px rgba(64,224,208,0.5)',
            }}>
              COMING SOON
            </h2>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, rgba(64,224,208,0.4), transparent)' }} />
          </div>

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
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
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
    </div>
  );
}
