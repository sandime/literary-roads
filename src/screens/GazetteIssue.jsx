// src/screens/GazetteIssue.jsx
// Public view of a single archived Gazette issue — /newspaper/vol-1-issue-66
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchArchivedIssueBySlug } from '../utils/newsletterAdmin';
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

export default function GazetteIssue() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const root = document.getElementById('root');
    const prevBody = document.body.style.overflow;
    const prevRoot = root?.style.overflow;
    const prevRootH = root?.style.height;
    document.body.style.overflow = 'auto';
    if (root) { root.style.overflow = 'auto'; root.style.height = 'auto'; }
    return () => {
      document.body.style.overflow = prevBody;
      if (root) { root.style.overflow = prevRoot; root.style.height = prevRootH; }
    };
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetchArchivedIssueBySlug(slug)
      .then(issue => {
        if (!issue) { setNotFound(true); return; }
        // Normalize archived shape → GazetteContent data shape
        setData({
          issue: {
            volume:      issue.volume,
            issue:       issue.issue,
            publishDate: issue.publishDate,
            pullQuote:   issue.pullQuote || '',
          },
          festivals:    issue.festivals    || [],
          indiePicks:   issue.indiePicks   || [],
          debutAuthors: issue.debutAuthors || [],
          bookTokPicks: issue.bookTokPicks || [],
          tripReports:  issue.tripReports  || [],
          nyt:          issue.nyt          || null,
        });
      })
      .catch(err => { console.error('[GazetteIssue]', err); setNotFound(true); })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Bungee, sans-serif', color: C.teal, fontSize: 14, letterSpacing: '0.1em' }}>LOADING ISSUE...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ fontFamily: 'Bungee, sans-serif', color: C.teal, fontSize: 16, letterSpacing: '0.08em' }}>ISSUE NOT FOUND</p>
        <button onClick={() => navigate('/newspaper/archive')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '10px 22px', borderRadius: 8, border: 'none', background: C.teal, color: C.bg, cursor: 'pointer' }}>
          VIEW ARCHIVE
        </button>
      </div>
    );
  }

  const issueLine = formatIssueLine(data?.issue);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.cream, fontFamily: 'Special Elite, serif' }}>
      {/* Toolbar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: C.panel, borderBottom: `2px solid ${C.teal}`, padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/newspaper/archive')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '7px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
          ← ARCHIVE
        </button>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: C.teal, letterSpacing: '0.04em', flex: 1 }}>
          {issueLine || 'THE LITERARY ROADS GAZETTE'}
        </span>
        <button onClick={() => navigate('/newsletter')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '7px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
          CURRENT ISSUE
        </button>
      </div>

      {/* Content */}
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
          <div style={{ marginTop: 10, display: 'inline-block', padding: '3px 10px', borderRadius: 4, background: 'rgba(64,224,208,0.1)', border: `1px solid rgba(64,224,208,0.2)` }}>
            <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: C.teal, letterSpacing: '0.1em' }}>ARCHIVED ISSUE</span>
          </div>
        </div>

        <GazetteContent data={data} />
      </div>
    </div>
  );
}
