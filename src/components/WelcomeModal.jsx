import { useState, useEffect } from 'react';

const WELCOMED_KEY = 'literaryRoadsWelcomed';

export function hasBeenWelcomed() {
  try { return !!localStorage.getItem(WELCOMED_KEY); } catch { return false; }
}

function markWelcomed() {
  try { localStorage.setItem(WELCOMED_KEY, '1'); } catch {}
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy:    '#1A1B2E',
  cream:   '#FFF8E7',
  orange:  '#FF4E00',
  teal:    '#40E0D0',
  dark:    '#2D2D2D',
  muted:   '#888888',
  white:   '#FFFFFF',
};

// ── Route decoration ──────────────────────────────────────────────────────────
function RouteBar() {
  const dot  = (color) => (
    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
  );
  const line = () => (
    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)', minWidth: 8 }} />
  );
  const label = (text, color) => (
    <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
      {text}
    </span>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px 14px', overflow: 'hidden' }}>
      {dot(C.orange)}
      {line()}
      {label('50 STATES', C.white)}
      {line()}
      {dot(C.teal)}
      {line()}
      {label('WASHINGTON D.C.', C.teal)}
      {line()}
      {dot(C.teal)}
      {line()}
      {label('PUERTO RICO', C.teal)}
      {line()}
      {dot(C.orange)}
    </div>
  );
}

// ── Feature bullet ────────────────────────────────────────────────────────────
function Bullet({ color, children }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
      {/* Diamond marker */}
      <span style={{
        display: 'inline-block', width: 8, height: 8,
        background: color, flexShrink: 0, marginTop: 4,
        transform: 'rotate(45deg)',
      }} />
      <p style={{
        fontFamily: 'Special Elite, serif', fontSize: 13,
        color: C.dark, lineHeight: 1.6, margin: 0,
      }}>
        {children}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WelcomeModal({ onDismiss, onSignIn }) {
  const [visible, setVisible] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    markWelcomed();
    onDismiss?.();
  };

  const handleSignIn = () => {
    markWelcomed();
    onDismiss?.();
    onSignIn?.();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(10,10,20,0.78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        style={{
          background: C.cream,
          borderRadius: 12,
          width: '100%',
          maxWidth: 480,
          overflow: 'hidden',
          boxShadow: '0 8px 48px rgba(0,0,0,0.55)',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
        }}
      >
        {/* ── Header (navy) ── */}
        <div style={{ background: C.navy, padding: '20px 20px 0', position: 'relative' }}>

          {/* Dismiss X */}
          <button
            onClick={dismiss}
            aria-label="Close welcome"
            style={{
              position: 'absolute', top: 12, right: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.teal, fontSize: 20, lineHeight: 1,
              padding: 4, opacity: 0.8,
              fontFamily: 'sans-serif',
            }}
          >
            ×
          </button>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <img
              src={import.meta.env.BASE_URL + 'images/logo-196.png'}
              alt="The Literary Roads"
              height="48"
              style={{ display: 'inline-block' }}
            />
            {/* Thin orange rule */}
            <div style={{ height: 1, background: C.orange, margin: '12px auto 0', width: '80%', opacity: 0.6 }} />
          </div>

          {/* Hook line */}
          <div style={{ textAlign: 'center', padding: '4px 24px 16px' }}>
            <p style={{
              fontFamily: 'Georgia, serif', fontStyle: 'italic',
              fontSize: 13, color: 'rgba(245,245,220,0.55)',
              lineHeight: 1.65, margin: 0,
            }}>
              If you&rsquo;re the type of person who plans road trips around great coffee shops,{' '}
              <span style={{ color: C.teal, fontStyle: 'italic' }}>
                you&rsquo;ll love The Literary Roads.
              </span>
            </p>
          </div>

          {/* Route bar */}
          <RouteBar />
        </div>

        {/* ── Body (cream) ── */}
        <div style={{ padding: '20px 20px 8px' }}>

          {/* Feature bullets */}
          <Bullet color={C.orange}>
            <strong style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.04em', color: C.dark }}>On the map</strong>
            {' '}— explore routes, bookmark stops, save favorites, and when you&rsquo;re ready — navigate. Indie bookstores, coffee shops, literary landmarks, festivals, and drive-ins across America.
          </Bullet>

          <Bullet color={C.orange}>
            Check in your car, contribute to the Hitchhiker&rsquo;s Tales community story, and send a postcard selfie from a newly discovered bookstore.
          </Bullet>

          <Bullet color={C.teal}>
            <strong style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.04em', color: C.dark }}>In the Library</strong>
            {' '}— log your reads, track what&rsquo;s next, reflect in your book journal, and discover authors state by state.
          </Bullet>

          <Bullet color={C.teal}>
            <strong style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.04em', color: C.dark }}>The Gazette</strong>
            {' '}— the latest in literary travel news, delivered fresh.
          </Bullet>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, marginBottom: 10 }}>
            <button
              onClick={dismiss}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 8,
                background: C.orange, color: C.white, border: 'none',
                fontFamily: 'Bungee, sans-serif', fontSize: 12,
                letterSpacing: '0.06em', cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(255,78,0,0.35)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              EXPLORE THE MAP
            </button>
            <button
              onClick={handleSignIn}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 8,
                background: 'transparent', color: C.navy,
                border: `2px solid ${C.navy}`,
                fontFamily: 'Bungee, sans-serif', fontSize: 12,
                letterSpacing: '0.06em', cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.navy; e.currentTarget.style.color = C.white; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.navy; }}
            >
              SIGN IN
            </button>
          </div>

          {/* Footer note */}
          <p style={{
            fontFamily: 'Special Elite, serif', fontSize: 11,
            color: C.muted, textAlign: 'center',
            margin: '4px 0 16px', lineHeight: 1.5,
          }}>
            Sign in to use the Library and all of the app&rsquo;s features.
          </p>
        </div>
      </div>
    </div>
  );
}
