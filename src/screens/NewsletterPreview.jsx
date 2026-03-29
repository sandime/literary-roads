// src/screens/NewsletterPreview.jsx
// Read-only preview of the full newsletter + Download/Copy JSON export
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFeatured } from '../utils/newsletterAdmin';

const BASE = import.meta.env.BASE_URL;

const C = {
  bg:     '#0D0E1A',
  panel:  '#1A1B2E',
  border: 'rgba(64,224,208,0.18)',
  teal:   '#40E0D0',
  orange: '#FF4E00',
  coral:  '#FF6B7A',
  cream:  '#F5F5DC',
  silver: '#C0C0C0',
  muted:  'rgba(192,192,192,0.45)',
  purple: '#9B59B6',
};

// ── Small display helpers ──────────────────────────────────────────────────────
function Section({ title, icon, color, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${color}50` }}>
        <span style={{ fontSize: 14, color }}>{icon}</span>
        <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color, margin: 0, letterSpacing: '0.04em' }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}
function Card({ children }) {
  return <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' }}>{children}</div>;
}
function CardTitle({ children }) {
  return <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.cream, marginBottom: 3, letterSpacing: '0.03em' }}>{children}</div>;
}
function CardSub({ children }) {
  return <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginBottom: 5 }}>{children}</div>;
}
function CardBody({ children }) {
  return <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: 'rgba(245,245,220,0.85)', lineHeight: 1.65, margin: '5px 0' }}>{children}</p>;
}
function CardLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.teal, textDecoration: 'none', letterSpacing: '0.05em' }}>
      {children}
    </a>
  );
}

// ── NewsletterPreview ──────────────────────────────────────────────────────────
export default function NewsletterPreview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [festivals, indiePicks, debutAuthors, bookTokPicks, tripReports, nyt] = await Promise.all([
          fetchFeatured('festivals'),
          fetchFeatured('indiePicks'),
          fetchFeatured('debutAuthors'),
          fetchFeatured('bookTokPicks'),
          fetchFeatured('tripReports'),
          fetch(`${BASE}gazette-data.json`).then(r => r.json()).catch(() => null),
        ]);
        setData({ festivals, indiePicks, debutAuthors, bookTokPicks, tripReports, nyt });
      } catch (err) {
        console.error('[NewsletterPreview]', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const buildExport = () => {
    if (!data) return {};
    const strip = arr => arr.map(({ id, createdAt, updatedAt, ...rest }) => rest);
    return {
      generatedAt: new Date().toISOString(),
      mascotUrl: `${window.location.origin}${BASE}images/newspaper-cat.png`,
      sections: {
        festivals:      strip(data.festivals),
        indiePicks:     strip(data.indiePicks),
        nytBestsellers: {
          fiction:    data.nyt?.fiction    || [],
          nonfiction: data.nyt?.nonfiction || [],
          issueDate:  data.nyt?.issueDate  || '',
        },
        bookTokPicks:  strip(data.bookTokPicks),
        debutAuthors:  strip(data.debutAuthors),
        tripReports:   strip(data.tripReports),
      },
    };
  };

  const handleDownload = () => {
    const json = JSON.stringify(buildExport(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gazette-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildExport(), null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select a textarea
    }
  };

  const totalFeatured = data
    ? data.festivals.length + data.indiePicks.length + data.debutAuthors.length + data.bookTokPicks.length + data.tripReports.length
    : 0;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Bungee, sans-serif', color: C.teal, fontSize: 14, letterSpacing: '0.1em' }}>LOADING GAZETTE...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.cream, fontFamily: 'Special Elite, serif' }}>
      {/* ── Sticky toolbar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: C.panel, borderBottom: `2px solid ${C.teal}`, padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/gazette')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '7px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
          ← ADMIN
        </button>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.teal, letterSpacing: '0.05em', flex: 1 }}>
          NEWSLETTER PREVIEW
        </span>
        <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted }}>
          {totalFeatured} featured item{totalFeatured !== 1 ? 's' : ''}
        </span>
        <button onClick={handleCopy}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '7px 13px', borderRadius: 6, border: `1px solid ${C.teal}`, background: 'transparent', color: copied ? C.teal : C.teal, cursor: 'pointer', letterSpacing: '0.04em' }}>
          {copied ? '✓ COPIED!' : 'COPY JSON'}
        </button>
        <button onClick={handleDownload}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '7px 13px', borderRadius: 6, border: 'none', background: C.teal, color: C.bg, cursor: 'pointer', letterSpacing: '0.04em' }}>
          ↓ DOWNLOAD JSON
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '36px 20px 80px' }}>

        {/* Masthead */}
        <div style={{ textAlign: 'center', marginBottom: 44, borderBottom: `2px solid ${C.teal}`, paddingBottom: 28 }}>
          <img src={`${BASE}images/newspaper-cat.png`} alt="Literary Roads Gazette" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 12, marginBottom: 12 }} />
          <h1 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 24, color: C.teal, margin: '0 0 6px', letterSpacing: '0.04em' }}>
            THE LITERARY ROADS GAZETTE
          </h1>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted, margin: 0 }}>
            {data?.nyt?.issueDate || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {data?.nyt?.issueNumber ? ` · Issue #${data.nyt.issueNumber}` : ''}
          </p>
        </div>

        {/* Empty state */}
        {totalFeatured === 0 && !data?.nyt && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: C.muted, letterSpacing: '0.08em' }}>NO FEATURED CONTENT YET</p>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
              Go to the admin panel and mark items as featured to see them here.
            </p>
            <button onClick={() => navigate('/gazette')}
              style={{ marginTop: 20, fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '10px 22px', borderRadius: 8, border: 'none', background: C.teal, color: C.bg, cursor: 'pointer' }}>
              OPEN ADMIN
            </button>
          </div>
        )}

        {/* 1. Festivals */}
        {data?.festivals?.length > 0 && (
          <Section title="Literary Festivals & Events" icon="★" color={C.teal}>
            {data.festivals.map(item => (
              <Card key={item.id}>
                <CardTitle>{item.name}</CardTitle>
                <CardSub>{[item.location, item.date].filter(Boolean).join(' · ')}</CardSub>
                {item.context && <CardBody>{item.context}</CardBody>}
                {item.link && <CardLink href={item.link}>Event details →</CardLink>}
              </Card>
            ))}
          </Section>
        )}

        {/* 2. Indie Picks */}
        {data?.indiePicks?.length > 0 && (
          <Section title="Indie Bookseller Picks" icon="◆" color={C.orange}>
            {data.indiePicks.map(item => (
              <Card key={item.id}>
                <CardTitle>{item.bookstoreName}</CardTitle>
                <CardSub>{item.city}</CardSub>
                {item.recommendation && <CardBody>{item.recommendation}</CardBody>}
              </Card>
            ))}
          </Section>
        )}

        {/* 3. NYT Bestsellers */}
        {data?.nyt && (
          <Section title="NYT Bestsellers" icon="◎" color={C.coral}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[['FICTION', data.nyt.fiction], ['NONFICTION', data.nyt.nonfiction]].map(([label, books]) => (
                <div key={label}>
                  <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.coral, letterSpacing: '0.09em', marginBottom: 10 }}>{label}</p>
                  {(books || []).slice(0, 5).map(b => (
                    <div key={b.rank} style={{ marginBottom: 10 }}>
                      <div>
                        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted }}>#{b.rank} </span>
                        <span style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.cream }}>{b.title}</span>
                      </div>
                      <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted }}>{b.author}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 4. BookTok */}
        {data?.bookTokPicks?.length > 0 && (
          <Section title="BookTok This Week" icon="▶" color={C.purple}>
            {data.bookTokPicks.map(item => (
              <Card key={item.id}>
                <CardTitle>{item.bookTitle}</CardTitle>
                {item.commentary && <CardBody>{item.commentary}</CardBody>}
                {item.tiktokLink && <CardLink href={item.tiktokLink}>Watch on TikTok →</CardLink>}
              </Card>
            ))}
          </Section>
        )}

        {/* 5. Debut Authors */}
        {data?.debutAuthors?.length > 0 && (
          <Section title="Debut Author Spotlight" icon="✦" color={C.orange}>
            {data.debutAuthors.map(item => (
              <Card key={item.id}>
                <CardTitle>{item.authorName}</CardTitle>
                <CardSub>{item.bookTitle}</CardSub>
                {item.excerpt && <CardBody>{item.excerpt}</CardBody>}
                {item.link && <CardLink href={item.link}>Read more →</CardLink>}
              </Card>
            ))}
          </Section>
        )}

        {/* 6. Trip Reports */}
        {data?.tripReports?.length > 0 && (
          <Section title="Trip Reports" icon="⛽" color={C.teal}>
            {data.tripReports.map(item => (
              <Card key={item.id}>
                <CardTitle>{item.title}</CardTitle>
                <CardSub>{item.location}</CardSub>
                {item.narrative && <CardBody>{item.narrative}</CardBody>}
              </Card>
            ))}
          </Section>
        )}

      </div>
    </div>
  );
}
