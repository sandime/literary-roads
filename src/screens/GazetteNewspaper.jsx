// src/screens/GazetteNewspaper.jsx
// Two-column newspaper layout with old-style masthead + nav bar + footer.
// Route: /newspaper/current
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentIssue, fetchAllFeaturedSections } from '../utils/newsletterAdmin';
import GazetteContent, { formatIssueLine, formatIssueDate } from '../components/GazetteContent';

const BASE = import.meta.env.BASE_URL;

const C = {
  ink:      '#1c2b2d',
  inkLight: '#3a4f52',
  teal:     '#4a9fa5',
  tealDark: '#2d6d74',
  coral:    '#e8956b',
  cream:    '#f5f1eb',
  creamDk:  '#ede7dc',
  gold:     '#f39c12',
  orange:   '#e67e22',
};

// ── Scroll fix hook ────────────────────────────────────────────────────────────
function useScrollFix() {
  useEffect(() => {
    const prev = { body: document.body.style.overflow, root: '', rootH: '' };
    const root = document.getElementById('root');
    if (root) { prev.root = root.style.overflow; prev.rootH = root.style.height; }
    document.body.style.overflow = 'auto';
    if (root) { root.style.overflow = 'auto'; root.style.height = 'auto'; }
    return () => {
      document.body.style.overflow = prev.body;
      if (root) { root.style.overflow = prev.root; root.style.height = prev.rootH; }
    };
  }, []);
}

// ── NYT Sidebar ───────────────────────────────────────────────────────────────
function NytSidebar({ nyt }) {
  if (!nyt) return null;
  const SideSection = ({ title, icon, color, books = [] }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color, letterSpacing: '0.1em', marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${color}50` }}>
        {icon} {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {books.slice(0, 5).map(b => (
          <div key={b.rank} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {b.coverUrl && <img src={b.coverUrl} alt={b.title} style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 3, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }} />}
            <div>
              <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: C.coral }}>#{b.rank}</div>
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.ink, lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.inkLight, fontStyle: 'italic' }}>{b.author}</div>
              {b.weeksOnList > 1 && <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 7, color: C.orange, marginTop: 2 }}>{b.weeksOnList}W</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{ position: 'sticky', top: 90, maxHeight: 'calc(100vh - 106px)', overflowY: 'auto', padding: '0 0 24px 20px', scrollbarWidth: 'thin' }}>
      <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal, letterSpacing: '0.1em', padding: '16px 0 12px', borderBottom: `2px solid ${C.teal}50`, marginBottom: 18 }}>
        NYT BESTSELLERS THIS WEEK
      </div>
      <SideSection title="What's Trending" icon="◉" color={C.coral} books={nyt.fiction} />
      <SideSection title="Non-Fiction"     icon="◎" color={C.tealDark} books={nyt.nonfiction} />
    </div>
  );
}

// ── GazetteNewspaper ──────────────────────────────────────────────────────────
export default function GazetteNewspaper() {
  useScrollFix();
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
      <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Bungee, sans-serif', color: C.teal, fontSize: 14, letterSpacing: '0.1em' }}>LOADING GAZETTE...</p>
      </div>
    );
  }

  const issue     = data?.issue;
  const issueLine = formatIssueLine(issue);
  const dateline  = issue?.publishDate
    ? formatIssueDate(issue.publishDate)
    : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: C.cream, color: C.ink, fontFamily: 'Special Elite, serif' }}>

      {/* ── Masthead ─────────────────────────────────────────────────────────── */}
      <div style={{ background: C.ink, color: C.cream }}>

        {/* Top bar */}
        <div style={{ background: C.tealDark, padding: '7px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.04em' }}>
            theliteraryroads.com
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/gazette')} style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
              ← ADMIN
            </button>
            <button onClick={() => navigate('/newsletter')} style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
              SIMPLE VIEW
            </button>
            <button onClick={() => navigate('/newspaper/archive')} style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
              ARCHIVE
            </button>
          </div>
        </div>

        {/* Main masthead */}
        <div style={{ padding: '24px 24px 18px', textAlign: 'center', borderBottom: `3px solid ${C.coral}`, position: 'relative' }}>
          {/* Left SVG accent */}
          <div style={{ position: 'absolute', top: '50%', left: 24, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="60" height="80" viewBox="0 0 60 80" aria-hidden="true">
              <path d="M4,72 Q16,20 30,36 Q44,52 56,8" stroke={C.coral} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7"/>
              <polygon points="12,16 14,22 20,20 17,26 24,26 18,30 21,37 15,33 12,40 9,33 3,37 6,30 0,26 7,26 4,20 10,22"
                fill={C.gold} transform="translate(18,0) scale(0.7)" opacity="0.8"/>
            </svg>
            {issueLine && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: '50%', background: C.coral, border: `3px solid ${C.cream}` }}>
                <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 16, color: '#fff', lineHeight: 1 }}>
                  {issue?.issue || '1'}
                </span>
                <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 7, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.1em' }}>ISSUE</span>
              </div>
            )}
          </div>

          {/* Cat — right side */}
          <div style={{ position: 'absolute', top: '50%', right: 24, transform: 'translateY(-50%)' }}>
            <img src={`${BASE}images/newspaper-cat.png`} alt=""
              style={{ width: 'clamp(56px,8vw,92px)', height: 'auto', maxHeight: 90, objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 18px rgba(0,0,0,0.25)', display: 'block' }} />
          </div>

          <h1 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(22px,5vw,56px)', color: C.cream, letterSpacing: '0.03em', lineHeight: 1, margin: 0, textShadow: `3px 3px 0 ${C.tealDark}` }}>
            The Literary Roads Gazette
          </h1>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 'clamp(12px,2vw,16px)', color: C.coral, letterSpacing: '0.12em', marginTop: 8, marginBottom: 0, fontStyle: 'italic' }}>
            Books for the road. Roads for the books.
          </p>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: 'rgba(245,241,235,0.6)', marginTop: 6, letterSpacing: '0.06em' }}>
            {issueLine ? `${issueLine} · ` : ''}{dateline}
          </p>
        </div>

        {/* Nav bar */}
        <nav aria-label="Sections" style={{ background: C.teal, padding: '0 24px', display: 'flex', alignItems: 'stretch', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            ['#festivals',    'Festivals'],
            ['#handselected', 'Hand-Selected'],
            ['#dispatches',   'Dispatches'],
            ['#readerschoice','Readers\' Choice'],
            ['#landmark',     'Landmark'],
            ['#readingroom',  'Reading Room'],
            ['#headlights',   'Headlights'],
            ['#ontheroad',    'On the Road'],
            ['#waystation',   'Waystation'],
            ['#qa',           'Q&A'],
            ['#longroad',     'The Long Road'],
          ].map(([href, label]) => (
            <a key={href} href={href} style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.85)', textDecoration: 'none', padding: '10px 13px', whiteSpace: 'nowrap', borderBottom: '3px solid transparent', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.color='#fff'; e.currentTarget.style.borderBottomColor=C.cream; }}
              onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.85)'; e.currentTarget.style.borderBottomColor='transparent'; }}>
              {label}
            </a>
          ))}
          <a href="/literary-roads/" style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.08em', color: C.coral, textDecoration: 'none', padding: '10px 13px', whiteSpace: 'nowrap', borderBottom: '3px solid transparent', display: 'flex', alignItems: 'center', fontWeight: 700, marginLeft: 'auto' }}>
            &#9658; Explore Map
          </a>
        </nav>
      </div>

      {/* ── Pull quote — full width ───────────────────────────────────────────── */}
      {data?.issue?.pullQuote && (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 0' }}>
          <div style={{ padding: '18px 24px', background: C.creamDk, borderLeft: `4px solid ${C.teal}`, borderRadius: '0 6px 6px 0' }}>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 17, color: C.ink, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              "{data.issue.pullQuote}"
            </p>
          </div>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 0', display: 'grid', gridTemplateColumns: '1fr 260px', gap: 36, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <GazetteContent
            data={{ ...data, issue: { ...data?.issue, pullQuote: '' } }}
            theme="light"
            hideNyt
          />
        </div>
        <aside style={{ borderLeft: `2px solid rgba(28,43,45,0.1)` }}>
          <NytSidebar nyt={data?.nyt} />
        </aside>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer id="subscribe" style={{ background: C.ink, color: C.cream, marginTop: 60, padding: '40px 24px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            <div>
              <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.teal, letterSpacing: '0.06em', marginBottom: 12 }}>The Literary Roads Gazette</div>
              <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, lineHeight: 1.7, color: 'rgba(245,241,235,0.75)', margin: '0 0 10px' }}>
                A weekly literary newspaper for readers who love the road. Trending books, indie picks, festivals, and road trip routes — every Sunday.
              </p>
              <a href="https://literaryroads.substack.com/subscribe" target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.coral, textDecoration: 'none', letterSpacing: '0.06em' }}>
                Subscribe on Substack →
              </a>
            </div>
            <div>
              <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.teal, letterSpacing: '0.06em', marginBottom: 12 }}>Data Sources</div>
              <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, lineHeight: 1.7, color: 'rgba(245,241,235,0.75)', margin: '0 0 10px' }}>
                NYT Books API · Bookshop.org · American Booksellers Association Indie Next List · Publishers Weekly · Google Books · Open Library
              </p>
              <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, lineHeight: 1.7, color: 'rgba(245,241,235,0.6)', margin: 0 }}>
                BookTok buzz aggregated from top creator posts each week.
              </p>
            </div>
            <div>
              <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.teal, letterSpacing: '0.06em', marginBottom: 12 }}>Literary Roads</div>
              <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, lineHeight: 1.7, color: 'rgba(245,241,235,0.75)', margin: '0 0 10px' }}>
                The Gazette is published by <a href="/literary-roads/" style={{ color: C.coral, textDecoration: 'none' }}>Literary Roads</a> — a map-based app for literary road trips across America.
              </p>
              <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, lineHeight: 1.7, color: 'rgba(245,241,235,0.75)', margin: '0 0 10px' }}>
                Find bookstores, cafes, and literary landmarks along any route.
              </p>
              <a href="/literary-roads/" style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.coral, textDecoration: 'none', letterSpacing: '0.06em' }}>
                Open the Map →
              </a>
            </div>
          </div>

          <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid rgba(255,255,255,0.1)`, paddingBottom: 24, fontFamily: 'Special Elite, serif', fontSize: 11, color: 'rgba(245,241,235,0.4)', textAlign: 'center', letterSpacing: '0.04em' }}>
            © 2026 Literary Roads · theliteraryroads.com · All book cover rights belong to respective publishers · NYT data used under license
          </div>
        </div>
      </footer>
    </div>
  );
}
