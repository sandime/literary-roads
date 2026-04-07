// src/screens/NewsletterPreview.jsx
// Read-only preview of the current issue + Download/Copy JSON export
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFeatured, fetchCurrentIssue } from '../utils/newsletterAdmin';
import GazetteContent, { formatIssueLine } from '../components/GazetteContent';

const BASE = import.meta.env.BASE_URL;

const C = {
  bg:    '#0D0E1A',
  panel: '#1A1B2E',
  teal:  '#40E0D0',
  cream: '#F5F5DC',
  muted: 'rgba(192,192,192,0.45)',
  silver:'#C0C0C0',
  border:'rgba(64,224,208,0.18)',
};

export default function NewsletterPreview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [festivals, indiePicks, debutAuthors, bookTokPicks, tripReports, nytRaw, issue] =
          await Promise.all([
            fetchFeatured('festivals'),
            fetchFeatured('indiePicks'),
            fetchFeatured('debutAuthors'),
            fetchFeatured('bookTokPicks'),
            fetchFeatured('tripReports'),
            fetch(`${BASE}gazette-data.json`).then(r => r.json()).catch(() => null),
            fetchCurrentIssue(),
          ]);
        setData({ festivals, indiePicks, debutAuthors, bookTokPicks, tripReports, nyt: nytRaw, issue });
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
      issue: data.issue,
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
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Bungee, sans-serif', color: C.teal, fontSize: 14, letterSpacing: '0.1em' }}>LOADING GAZETTE...</p>
      </div>
    );
  }

  const issueLine = formatIssueLine(data?.issue)
    || (data?.nyt?.issueDate
      ? `Week of ${data.nyt.issueDate}${data.nyt.issueNumber ? ` · Issue #${data.nyt.issueNumber}` : ''}`
      : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

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
        <button onClick={() => navigate('/newspaper/archive')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '7px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer', letterSpacing: '0.04em' }}>
          ARCHIVE
        </button>
        <button onClick={handleCopy}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '7px 13px', borderRadius: 6, border: `1px solid ${C.teal}`, background: 'transparent', color: C.teal, cursor: 'pointer', letterSpacing: '0.04em' }}>
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
          <img src={`${BASE}images/newspaper-cat.png`} alt="Literary Roads Gazette"
            style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 12, marginBottom: 12 }} />
          <h1 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 24, color: C.teal, margin: '0 0 6px', letterSpacing: '0.04em' }}>
            THE LITERARY ROADS GAZETTE
          </h1>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted, margin: 0 }}>
            {issueLine}
          </p>
        </div>

        <GazetteContent data={data} />
      </div>
    </div>
  );
}
