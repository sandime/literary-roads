// src/screens/GazetteNewspaper.jsx
// Two-column newspaper layout: main content (75%) + NYT sidebar (25%).
// Route: /newspaper/current  (live)  |  /newspaper/vol-N-issue-M  (handled by GazetteIssue)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentIssue, fetchAllFeaturedSections } from '../utils/newsletterAdmin';
import GazetteContent, { formatIssueLine } from '../components/GazetteContent';

const BASE = import.meta.env.BASE_URL;

const C = {
  bg:     '#0D0E1A',
  panel:  '#1A1B2E',
  border: 'rgba(64,224,208,0.18)',
  teal:   '#40E0D0',
  orange: '#FF4E00',
  coral:  '#FF6B7A',
  cream:  '#F5F5DC',
  muted:  'rgba(192,192,192,0.45)',
  silver: '#C0C0C0',
  gold:   '#FFD700',
};

// ── NYT Sidebar ───────────────────────────────────────────────────────────────
function NytSidebar({ nyt }) {
  if (!nyt) return null;

  const SideSection = ({ title, icon, color, books = [] }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color, letterSpacing: '0.07em', marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${color}40` }}>
        {icon} {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {books.slice(0, 5).map(b => (
          <div key={b.rank} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {b.coverUrl && (
              <img src={b.coverUrl} alt={b.title} style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: C.muted }}># {b.rank}</div>
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.cream, lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted }}>{b.author}</div>
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
      {/* Sidebar header */}
      <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal, letterSpacing: '0.1em', padding: '16px 0 12px', borderBottom: `2px solid ${C.teal}40`, marginBottom: 18 }}>
        THIS WEEK IN BOOKS
      </div>

      <SideSection title="What's Trending" icon="◉" color={C.coral} books={nyt.fiction} />
      <SideSection title="Non-Fiction" icon="◎" color={C.coral} books={nyt.nonfiction} />
    </div>
  );
}

// ── GazetteNewspaper ──────────────────────────────────────────────────────────
export default function GazetteNewspaper() {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
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
    <div style={{ minHeight: '100vh', background: C.bg, color: C.cream, fontFamily: 'Special Elite, serif' }}>
      {/* Sticky toolbar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: C.panel, borderBottom: `2px solid ${C.teal}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/gazette')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
          ← ADMIN
        </button>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.teal, letterSpacing: '0.04em', flex: 1 }}>
          THE LITERARY ROADS GAZETTE
        </span>
        <button onClick={() => navigate('/newsletter')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
          SIMPLE VIEW
        </button>
        <button onClick={() => navigate('/newspaper/archive')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
          ARCHIVE
        </button>
      </div>

      {/* Masthead */}
      <div style={{ textAlign: 'center', padding: '32px 20px 24px', borderBottom: `2px solid ${C.teal}`, background: C.panel }}>
        <img src={`${BASE}images/newspaper-cat.png`} alt=""
          style={{ width: 70, height: 70, objectFit: 'contain', borderRadius: 10, marginBottom: 10 }} />
        <h1 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 32, color: C.teal, margin: '0 0 6px', letterSpacing: '0.04em' }}>
          THE LITERARY ROADS GAZETTE
        </h1>
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted, margin: 0 }}>
          {issueLine}
        </p>
      </div>

      {/* Pull quote — full width */}
      {data?.issue?.pullQuote && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 0' }}>
          <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg,rgba(64,224,208,0.08),rgba(255,78,0,0.05))', border: `1px solid rgba(64,224,208,0.22)`, borderLeft: `3px solid ${C.teal}`, borderRadius: 8 }}>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 16, color: C.cream, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              "{data.issue.pullQuote}"
            </p>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 80px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32, alignItems: 'start' }}>

        {/* Main content — 11 sections in order */}
        <div style={{ minWidth: 0 }}>
          <GazetteContent data={{ ...data, issue: { ...data?.issue, pullQuote: '' } }} />
          {/* Pull quote suppressed inside GazetteContent since we render it full-width above */}
        </div>

        {/* Sidebar — NYT only */}
        <aside>
          <NytSidebar nyt={data?.nyt} />
        </aside>
      </div>
    </div>
  );
}
