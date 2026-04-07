// src/screens/GazetteArchive.jsx
// Public archive listing — all published Gazette issues
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchArchivedIssues } from '../utils/newsletterAdmin';
import { formatIssueDate } from '../components/GazetteContent';

const BASE = import.meta.env.BASE_URL;

const C = {
  bg:     '#0D0E1A',
  panel:  '#1A1B2E',
  border: 'rgba(64,224,208,0.18)',
  teal:   '#40E0D0',
  orange: '#FF4E00',
  cream:  '#F5F5DC',
  silver: '#C0C0C0',
  muted:  'rgba(192,192,192,0.45)',
};

export default function GazetteArchive() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

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
    fetchArchivedIssues()
      .then(setIssues)
      .catch(err => console.error('[GazetteArchive]', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.cream, fontFamily: 'Special Elite, serif' }}>
      {/* Header */}
      <div style={{ background: C.panel, borderBottom: `2px solid ${C.teal}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => navigate('/newsletter')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '7px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
          ← CURRENT ISSUE
        </button>
        <img src={`${BASE}images/newspaper-cat.png`} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }} />
        <div>
          <h1 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: C.teal, margin: 0, letterSpacing: '0.06em' }}>
            GAZETTE ARCHIVE
          </h1>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted, margin: 0 }}>
            The Literary Roads Gazette — All Issues
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '36px 20px 80px' }}>
        {loading ? (
          <p style={{ fontFamily: 'Bungee, sans-serif', color: C.teal, fontSize: 13, letterSpacing: '0.08em', textAlign: 'center', padding: '60px 0' }}>
            LOADING ARCHIVE...
          </p>
        ) : issues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: C.muted, letterSpacing: '0.08em' }}>
              NO PUBLISHED ISSUES YET
            </p>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
              Publish your first issue from the admin panel to start the archive.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {issues.map((issue) => (
              <button
                key={issue.id}
                onClick={() => navigate(`/newspaper/${issue.slug}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: C.panel, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: '16px 20px',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.teal}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                {/* Vol/Issue badge */}
                <div style={{
                  flexShrink: 0, textAlign: 'center',
                  background: 'rgba(64,224,208,0.08)', border: `1px solid rgba(64,224,208,0.2)`,
                  borderRadius: 8, padding: '8px 14px', minWidth: 70,
                }}>
                  <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal, letterSpacing: '0.08em' }}>VOL. {issue.volume}</div>
                  <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 18, color: C.cream, lineHeight: 1.1 }}>#{issue.issue}</div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: C.cream, marginBottom: 3 }}>
                    Vol. {issue.volume} · Issue {issue.issue}
                  </div>
                  {issue.publishDate && (
                    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted, marginBottom: issue.pullQuote ? 6 : 0 }}>
                      {formatIssueDate(issue.publishDate)}
                    </div>
                  )}
                  {issue.pullQuote && (
                    <div style={{
                      fontFamily: 'Special Elite, serif', fontSize: 12,
                      color: 'rgba(245,245,220,0.7)', lineHeight: 1.5,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      fontStyle: 'italic',
                    }}>
                      "{issue.pullQuote}"
                    </div>
                  )}
                </div>

                <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.teal, flexShrink: 0 }}>READ →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
