// SecretRoom.jsx — opened by the journey-cat easter egg.
//
// Pattern for replication:
//   - First visit: award a badge + show badge section, then gallery.
//   - Subsequent visits: go straight to gallery (badge already earned → checkAndAward returns null).
//   - Close: X button, ESC, or click outside the panel (desktop side margins).
//
// Other cat rooms that follow this same pattern:
//   library-cat  → Substack link (already implemented separately)
//   newspaper-cat → Gazette
//   store-cat    → future easter egg

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { checkAndAwardJourneyCatBadge } from '../../utils/badgeChecker';
import { BADGE_MAP } from '../../utils/badgeDefinitions';

const P = {
  bg:    '#1C1A14',
  cream: '#FFF8E7',
  muted: '#8a7d60',
  teal:  '#40E0D0',
  border:'#2a2820',
};

const MARGOLIES_PHOTOS = [
  {
    name: 'Star Lite Outdoor Theater',
    caption: 'Route 81-B, Fargo, North Dakota · 1980',
    url: 'https://cdn.loc.gov/service/pnp/mrg/00300/00317v.jpg',
    locUrl: 'https://www.loc.gov/item/2017702431/',
  },
  {
    name: 'Hanks Coffee Shop',
    caption: '4th Street, Benson, Arizona',
    url: 'https://cdn.loc.gov/service/pnp/mrg/01500/01513v.jpg',
    locUrl: 'https://hdl.loc.gov/loc.pnp/mrg.01513',
  },
  {
    name: 'Bomber Gas Station',
    caption: 'Route 99 E., Milwaukie, Oregon · 1980',
    url: 'https://cdn.loc.gov/service/pnp/mrg/00000/00004v.jpg',
    locUrl: 'https://hdl.loc.gov/loc.pnp/mrg.00004',
  },
  {
    name: 'Wigwam Village #6',
    caption: 'Route 66, Holbrook, Arizona',
    url: 'https://cdn.loc.gov/service/pnp/mrg/00100/00197v.jpg',
    locUrl: 'https://hdl.loc.gov/loc.pnp/mrg.00197',
  },
  {
    name: 'Pemi Motor Court',
    caption: 'Route 3, North Woodstock, New Hampshire',
    url: 'https://cdn.loc.gov/service/pnp/mrg/00100/00198v.jpg',
    locUrl: 'https://hdl.loc.gov/loc.pnp/mrg.00198',
  },
  {
    name: 'Flamingo Motel Sign',
    caption: 'Oklahoma City, Oklahoma',
    url: 'https://cdn.loc.gov/service/pnp/mrg/08500/08516v.jpg',
    locUrl: 'https://hdl.loc.gov/loc.pnp/mrg.08516',
  },
  {
    name: 'Orange Julep Stand',
    caption: 'Route 9, Plattsburgh, New York',
    url: 'https://cdn.loc.gov/service/pnp/mrg/00000/00089v.jpg',
    locUrl: 'https://hdl.loc.gov/loc.pnp/mrg.00089',
  },
  {
    name: 'Atomic Signs',
    caption: 'Route 550, Farmington, New Mexico',
    url: 'https://cdn.loc.gov/service/pnp/mrg/00600/00670v.jpg',
    locUrl: 'https://hdl.loc.gov/loc.pnp/mrg.00670',
  },
];

function Photo({ photo }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <a
      href={photo.locUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <div style={{ background: '#0e0c08', borderRadius: 2, overflow: 'hidden', marginBottom: 7 }}>
        <img
          src={photo.url}
          alt={photo.name}
          onLoad={() => setLoaded(true)}
          onError={e => {
            if (e.target.src.endsWith('v.jpg')) {
              e.target.onerror = null;
              e.target.src = e.target.src.replace('v.jpg', 'u.jpg');
            }
          }}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.45s ease',
          }}
        />
      </div>
      <div style={{
        fontFamily: 'Special Elite, serif',
        fontSize: 9,
        color: P.muted,
        lineHeight: 1.5,
        letterSpacing: '0.04em',
      }}>
        {photo.caption}
      </div>
    </a>
  );
}

export default function SecretRoom({ onClose }) {
  const { user } = useAuth();
  const [showBadge, setShowBadge] = useState(false);
  const badge = BADGE_MAP['curious-as-a-cat'];

  // Award badge on first visit; returns null on all subsequent visits
  useEffect(() => {
    if (!user) return;
    checkAndAwardJourneyCatBadge(user.uid).then(awarded => {
      if (awarded) setShowBadge(true);
    });
  }, [user]);

  // ESC key
  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  // Prevent background scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      <style>{`
        @keyframes secret-fadein {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes badge-drop {
          0%   { opacity: 0; transform: translateY(-30px) scale(0.8); }
          65%  { transform: translateY(5px) scale(1.05); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes badge-glow-pulse {
          0%, 100% { box-shadow: 0 0 14px 3px rgba(245,245,220,0.16); }
          50%       { box-shadow: 0 0 28px 8px rgba(245,245,220,0.3); }
        }
        .secret-room-panel {
          animation: secret-fadein 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .secret-badge-icon {
          animation: badge-drop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     badge-glow-pulse 2.2s ease-in-out 0.55s infinite;
        }
        .secret-gallery {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }
        @media (max-width: 640px) {
          .secret-gallery {
            display: flex;
            flex-direction: row;
            overflow-x: auto;
            gap: 14px;
            padding-bottom: 10px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .secret-gallery::-webkit-scrollbar { display: none; }
          .secret-gallery-item { flex: 0 0 155px; }
        }
      `}</style>

      {/* Backdrop — clicking the dark margin area (desktop) closes overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.72)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
        onClick={onClose}
      >
        {/* Room panel */}
        <div
          className="secret-room-panel"
          style={{
            width: '100%',
            maxWidth: 720,
            minHeight: '100vh',
            margin: '0 auto',
            background: P.bg,
            position: 'relative',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Sticky close bar */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: P.bg,
            display: 'flex', justifyContent: 'flex-end',
            padding: '14px 20px 10px',
            borderBottom: `1px solid ${P.border}`,
          }}>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Special Elite, serif', fontSize: 22,
                color: P.muted, lineHeight: 1, padding: '2px 6px',
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '44px 24px 68px', maxWidth: 640, margin: '0 auto' }}>

            {/* ── Section 1: Badge award (first visit only) ── */}
            {showBadge && badge && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                paddingBottom: 44, marginBottom: 44,
                borderBottom: `1px solid ${P.border}`,
              }}>
                <div
                  className="secret-badge-icon"
                  style={{
                    width: 100, height: 100, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'radial-gradient(circle, rgba(245,245,220,0.1), rgba(245,245,220,0.03))',
                    border: '2px solid rgba(245,245,220,0.3)',
                    marginBottom: 18,
                  }}
                >
                  {badge.iconSvg
                    ? <div style={{ width: 58, height: 58 }} dangerouslySetInnerHTML={{ __html: badge.iconSvg }} />
                    : <span style={{ fontSize: '2.6rem' }}>{badge.icon}</span>
                  }
                </div>
                <div style={{
                  fontFamily: 'Georgia, serif', fontSize: 20,
                  color: P.cream, letterSpacing: '0.02em', marginBottom: 7,
                }}>
                  Curious as a Cat
                </div>
                <div style={{
                  fontFamily: 'Special Elite, serif', fontSize: 9,
                  color: P.muted, letterSpacing: '0.22em', textTransform: 'uppercase',
                }}>
                  Badge Unlocked
                </div>
              </div>
            )}

            {/* ── Section 2: Photograph gallery ── */}
            <div style={{ marginBottom: 44 }}>
              {/* Label with decorative rule */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: P.border }} />
                <span style={{
                  fontFamily: 'Special Elite, serif', fontSize: 9,
                  color: P.muted, letterSpacing: '0.25em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  America's Road Photographer
                </span>
                <div style={{ flex: 1, height: 1, background: P.border }} />
              </div>

              <p style={{
                fontFamily: 'Georgia, serif', fontSize: 13,
                color: P.muted, fontStyle: 'italic', lineHeight: 1.75,
                marginBottom: 28, textAlign: 'center',
              }}>
                John Margolies spent forty years photographing the American roadside. These are his photographs.
              </p>

              <div className="secret-gallery">
                {MARGOLIES_PHOTOS.map(photo => (
                  <div key={photo.name} className="secret-gallery-item">
                    <Photo photo={photo} />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 3: External link ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <a
                href="https://www.loc.gov/pictures/search/?q=mrg&st=gallery"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'Special Elite, serif', fontSize: 13,
                  color: P.teal, border: `1px solid ${P.teal}`,
                  borderRadius: 4, padding: '10px 22px',
                  textDecoration: 'none', letterSpacing: '0.03em',
                  display: 'inline-block', background: 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(64,224,208,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Explore John Margolies' America →
              </a>
              <p style={{
                fontFamily: 'Special Elite, serif', fontSize: 9,
                color: 'rgba(138,125,96,0.55)', textAlign: 'center',
                lineHeight: 1.75, letterSpacing: '0.04em', maxWidth: 400,
              }}>
                Photographs by John Margolies · John Margolies Roadside America Photograph Archive · Library of Congress, Prints and Photographs Division · No known copyright restrictions
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
