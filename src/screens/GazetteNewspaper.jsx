// src/screens/GazetteNewspaper.jsx
// Two-column newspaper layout: main content (75%) + NYT sidebar (25%).
// Route: /newspaper/current  (live)  |  /newspaper/vol-N-issue-M  (handled by GazetteIssue)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentIssue, fetchAllFeaturedSections } from '../utils/newsletterAdmin';
import GazetteContent, { formatIssueLine } from '../components/GazetteContent';

const BASE = import.meta.env.BASE_URL;

const C = {
  bg:       '#f5f1eb',
  bgDark:   '#ede7dc',
  panel:    '#fff',
  teal:     '#4a9fa5',
  tealDark: '#2d6d74',
  coral:    '#e8956b',
  gold:     '#f39c12',
  orange:   '#e67e22',
  ink:      '#1c2b2d',
  inkLight: '#3a4f52',
  border:   'rgba(28,43,45,0.12)',
  muted:    'rgba(28,43,45,0.45)',
};

// ── NYT Sidebar ───────────────────────────────────────────────────────────────
function NytSidebar({ nyt }) {
  if (!nyt) return null;

  const SideSection = ({ title, icon, color, books = [] }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: 'Bungee, sans-serif', fontSize: 9, color, letterSpacing: '0.1em',
        marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${color}50`,
      }}>
        {icon} {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {books.slice(0, 5).map(b => (
          <div key={b.rank} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {b.coverUrl && (
              <img src={b.coverUrl} alt={b.title}
                style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 3, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }} />
            )}
            <div>
              <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: C.coral }}>#{b.rank}</div>
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.ink, lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.inkLight, fontStyle: 'italic' }}>{b.author}</div>
              {b.weeksOnList > 1 && (
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 7, color: C.orange, marginTop: 2 }}>{b.weeksOnList}W</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'sticky',
      top: 56,
      maxHeight: 'calc(100vh - 72px)',
      overflowY: 'auto',
      padding: '0 0 24px 20px',
      scrollbarWidth: 'thin',
    }}>
      <div style={{
        fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal,
        letterSpacing: '0.1em', padding: '16px 0 12px',
        borderBottom: `2px solid ${C.teal}50`, marginBottom: 18,
      }}>
        THIS WEEK IN BOOKS
      </div>
      <SideSection title="What's Trending" icon="◉" color={C.coral} books={nyt.fiction} />
      <SideSection title="Non-Fiction"     icon="◎" color={C.tealDark} books={nyt.nonfiction} />
    </div>
  );
}

// ── GazetteNewspaper ──────────────────────────────────────────────────────────
export default function GazetteNewspaper() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [nytRaw, issue] = await Promise.all([
          fetch(`${BASE}gazette-data.json`).then(r => r.json()).catch(() => null),
          fetchCurrentIssue(),
        ]);
        const sections = await fetchAllFeaturedSections(nytRaw);
        setData({ ...sections, issue });
      } catch (err) {
        console.error('[GazetteNewspaper]', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Bungee, sans-serif', color: C.teal, fontSize: 14, letterSpacing: '0.1em' }}>LOADING GAZETTE...</p>
      </div>
    );
  }

  const issueLine = formatIssueLine(data?.issue) ||
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: 'Special Elite, serif' }}>

      {/* Paper texture overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(28,43,45,0.035) 31px, rgba(28,43,45,0.035) 32px)',
      }} />

      {/* Sticky toolbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: C.ink, borderBottom: `3px double ${C.teal}`,
        padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/gazette')} style={{
          fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 11px',
          borderRadius: 4, border: `1px solid rgba(255,255,255,0.2)`,
          background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
        }}>
          ← ADMIN
        </button>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: C.teal, letterSpacing: '0.06em', flex: 1 }}>
          THE LITERARY ROADS GAZETTE
        </span>
        <button onClick={() => navigate('/newsletter')} style={{
          fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 11px',
          borderRadius: 4, border: `1px solid rgba(255,255,255,0.2)`,
          background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
        }}>
          SIMPLE VIEW
        </button>
        <button onClick={() => navigate('/newspaper/archive')} style={{
          fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 11px',
          borderRadius: 4, border: `1px solid rgba(255,255,255,0.2)`,
          background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
        }}>
          ARCHIVE
        </button>
      </div>

      {/* Masthead */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '36px 20px 28px', background: C.panel, borderBottom: `4px double ${C.ink}` }}>
        {/* Decorative rule above */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ flex: 1, maxWidth: 200, height: 1, background: C.border }} />
          <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: C.muted, letterSpacing: '0.2em' }}>EST. 2025</span>
          <div style={{ flex: 1, maxWidth: 200, height: 1, background: C.border }} />
        </div>

        <img src={`${BASE}images/newspaper-cat.png`} alt=""
          style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 12, marginBottom: 14, boxShadow: '0 4px 16px rgba(74,159,165,0.2)' }} />

        <h1 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 36, color: C.ink, margin: '0 0 8px', letterSpacing: '0.02em', lineHeight: 1.1 }}>
          The Literary Roads Gazette
        </h1>

        {/* Subhead rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', margin: '10px 0' }}>
          <div style={{ flex: 1, maxWidth: 120, height: 2, background: C.teal }} />
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.inkLight, letterSpacing: '0.06em' }}>
            Books · Roads · Stories
          </span>
          <div style={{ flex: 1, maxWidth: 120, height: 2, background: C.teal }} />
        </div>

        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted, margin: '6px 0 0', letterSpacing: '0.03em' }}>
          {issueLine}
        </p>
      </div>

      {/* Pull quote — full width */}
      {data?.issue?.pullQuote && (
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '24px 20px 0' }}>
          <div style={{
            padding: '20px 28px',
            background: C.bgDark,
            borderLeft: `4px solid ${C.teal}`,
            borderRadius: '0 6px 6px 0',
          }}>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 17, color: C.ink, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              "{data.issue.pullQuote}"
            </p>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1100, margin: '0 auto',
        padding: '28px 20px 80px',
        display: 'grid', gridTemplateColumns: '1fr 260px', gap: 36, alignItems: 'start',
      }}>
        {/* Main content */}
        <div style={{ minWidth: 0 }}>
          <GazetteContent
            data={{ ...data, issue: { ...data?.issue, pullQuote: '' } }}
            theme="light"
          />
        </div>

        {/* Sidebar — NYT only */}
        <aside style={{ borderLeft: `2px solid ${C.border}` }}>
          <NytSidebar nyt={data?.nyt} />
        </aside>
      </div>
    </div>
  );
}
