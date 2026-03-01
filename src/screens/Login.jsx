import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Deterministic star positions via LCG (stable across renders)
function makeStars(count, seed) {
  let s = seed >>> 0;
  const next = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s; };
  return Array.from({ length: count }, () =>
    `${next() % 1900}px ${next() % 1020}px rgba(255,255,255,${(next() % 60 + 28) / 100})`
  ).join(',');
}
const STARS_SM = makeStars(180, 42);
const STARS_MD = makeStars(80, 137);
const STARS_LG = makeStars(28, 251);

const FIREBASE_ERRORS = {
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed.',
  'auth/cancelled-popup-request': '',
};

const CSS = `
  @keyframes lr-twinkle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.08; }
  }
  @keyframes lr-twinkle2 {
    0%, 35%, 100% { opacity: 0.85; }
    18% { opacity: 0.04; }
    55% { opacity: 1; }
  }
  @keyframes lr-twinkle3 {
    0%, 70%, 100% { opacity: 0.9; }
    40% { opacity: 0.1; }
  }
  @keyframes lr-neon {
    0%, 100% {
      text-shadow:
        0 0 6px #40E0D0,
        0 0 14px #40E0D0,
        0 0 28px #40E0D0,
        0 0 55px rgba(64,224,208,0.8),
        0 0 100px rgba(64,224,208,0.4),
        0 0 160px rgba(64,224,208,0.2);
    }
    50% {
      text-shadow:
        0 0 3px #40E0D0,
        0 0 8px #40E0D0,
        0 0 16px #40E0D0,
        0 0 30px rgba(64,224,208,0.5),
        0 0 60px rgba(64,224,208,0.25),
        0 0 90px rgba(64,224,208,0.1);
    }
  }
  @keyframes lr-frame-hum {
    0%, 100% {
      box-shadow:
        0 0 8px #40E0D0,
        0 0 18px rgba(64,224,208,0.6),
        0 0 38px rgba(64,224,208,0.35),
        0 0 70px rgba(64,224,208,0.15),
        inset 0 0 12px rgba(64,224,208,0.08);
    }
    50% {
      box-shadow:
        0 0 4px #40E0D0,
        0 0 10px rgba(64,224,208,0.4),
        0 0 22px rgba(64,224,208,0.2),
        0 0 40px rgba(64,224,208,0.08),
        inset 0 0 6px rgba(64,224,208,0.04);
    }
  }
  @keyframes lr-btn-glow {
    0%, 100% {
      box-shadow: 0 0 8px #FF4E00, 0 0 18px #FF4E00, 0 0 36px rgba(255,78,0,0.7), 0 0 60px rgba(255,78,0,0.3);
    }
    50% {
      box-shadow: 0 0 12px #FF4E00, 0 0 26px #FF4E00, 0 0 52px rgba(255,78,0,0.9), 0 0 90px rgba(255,78,0,0.4);
    }
  }

  .lr-sm {
    position: absolute; top: 0; left: 0;
    width: 1px; height: 1px;
    background: transparent; border-radius: 50%;
    box-shadow: ${STARS_SM};
    animation: lr-twinkle 4.2s ease-in-out infinite;
  }
  .lr-md {
    position: absolute; top: 0; left: 0;
    width: 2px; height: 2px;
    background: transparent; border-radius: 50%;
    box-shadow: ${STARS_MD};
    animation: lr-twinkle2 6.5s ease-in-out infinite;
  }
  .lr-lg {
    position: absolute; top: 0; left: 0;
    width: 3px; height: 3px;
    background: transparent; border-radius: 50%;
    box-shadow: ${STARS_LG};
    animation: lr-twinkle3 3.8s ease-in-out infinite;
  }

  .lr-neon-title { animation: lr-neon 3s ease-in-out infinite; }
  .lr-frame      { animation: lr-frame-hum 3.5s ease-in-out infinite; }
  .lr-log-btn    { animation: lr-btn-glow 2s ease-in-out infinite; }

  /* Leather pages */
  .lr-page-l, .lr-page-r {
    position: relative;
  }
  .lr-page-l {
    background: linear-gradient(158deg,
      #7E4B22 0%, #5E3419 20%, #6A3C1C 40%,
      #7A4620 60%, #8D5626 80%, #6E3D1C 100%);
  }
  .lr-page-r {
    background: linear-gradient(202deg,
      #6E3D1C 0%, #8D5626 20%, #7A4620 40%,
      #6A3C1C 60%, #5E3419 80%, #7E4B22 100%);
  }
  /* Cross-hatch grain overlay */
  .lr-page-l::before, .lr-page-r::before {
    content: '';
    position: absolute; inset: 0;
    background:
      repeating-linear-gradient(
        90deg,
        transparent 0px, transparent 22px,
        rgba(0,0,0,0.035) 22px, rgba(0,0,0,0.035) 23px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0px, transparent 22px,
        rgba(255,210,140,0.04) 22px, rgba(255,210,140,0.04) 23px
      ),
      repeating-linear-gradient(
        45deg,
        transparent 0px, transparent 4px,
        rgba(0,0,0,0.018) 4px, rgba(0,0,0,0.018) 5px
      ),
      repeating-linear-gradient(
        -45deg,
        transparent 0px, transparent 4px,
        rgba(0,0,0,0.018) 4px, rgba(0,0,0,0.018) 5px
      );
    pointer-events: none; z-index: 0;
  }
  /* Aged edge shadows */
  .lr-page-l::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.08) 100%),
                linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 8%, transparent 92%, rgba(0,0,0,0.12) 100%);
    pointer-events: none; z-index: 0;
  }
  .lr-page-r::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(to right, rgba(0,0,0,0.08) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.15) 100%),
                linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 8%, transparent 92%, rgba(0,0,0,0.12) 100%);
    pointer-events: none; z-index: 0;
  }
  .lr-inner { position: relative; z-index: 1; height: 100%; }

  .lr-input {
    width: 100%; box-sizing: border-box;
    background: rgba(255,235,190,0.07);
    border: 1px solid rgba(150,110,55,0.55);
    color: #F0D9A8;
    padding: 8px 12px;
    border-radius: 3px;
    outline: none;
    font-size: 13px;
    font-family: 'Special Elite', serif;
    transition: border-color 0.25s, box-shadow 0.25s;
  }
  .lr-input:focus {
    border-color: #40E0D0;
    box-shadow: 0 0 0 2px rgba(64,224,208,0.15), 0 0 10px rgba(64,224,208,0.35);
  }
  .lr-input::placeholder { color: rgba(190,145,70,0.38); }

  .lr-label {
    display: block;
    font-family: 'Bungee', sans-serif;
    font-size: 9px;
    letter-spacing: 0.16em;
    color: rgba(210,170,90,0.85);
    margin-bottom: 4px;
  }
  .lr-hr {
    border: none;
    border-top: 1px solid rgba(200,155,70,0.2);
    margin: 12px 0;
  }
  .lr-mode-btn {
    flex: 1; padding: 6px 4px;
    font-family: 'Bungee', sans-serif;
    font-size: 10px; letter-spacing: 0.1em;
    border: none; cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .lr-google-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; box-sizing: border-box;
    background: #F5F5DC; color: #1A1B2E;
    border: none; border-radius: 5px;
    padding: 10px 14px; cursor: pointer;
    font-size: 13px; font-family: 'Special Elite', serif;
    transition: background 0.2s, box-shadow 0.2s;
  }
  .lr-google-btn:hover:not(:disabled) {
    background: #fff;
    box-shadow: 0 0 14px rgba(245,245,220,0.45);
  }
  .lr-google-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .lr-stat-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 7px 0;
    border-bottom: 1px solid rgba(200,155,70,0.15);
  }
  .lr-stamp-ring {
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    text-align: center; font-family: 'Bungee', sans-serif;
    letter-spacing: 0.04em; line-height: 1.35;
  }

  /* ── MOBILE ── */
  @media (max-width: 767px) {
    .lr-wrap {
      justify-content: flex-start !important;
      padding: 16px 10px 24px !important;
    }
    .lr-frame {
      padding: 6px !important;
      border-radius: 14px !important;
      border-width: 2px !important;
    }
    .lr-page-l { padding: 1rem !important; }
    .lr-page-r {
      /* horizontal page separator on mobile */
      border-top: 3px solid rgba(18,8,0,0.95) !important;
      box-shadow: inset 0 5px 14px rgba(0,0,0,0.55) !important;
      padding: 1rem !important;
    }
    /* Prevent iOS Safari from zooming on input focus */
    .lr-input {
      font-size: 16px !important;
      padding: 10px 12px !important;
    }
    .lr-mode-btn  { padding: 9px 4px !important; font-size: 11px !important; }
    .lr-google-btn { padding: 12px 14px !important; font-size: 15px !important; }
    .lr-log-btn   { padding: 13px !important; font-size: 15px !important; }
    .lr-hr        { margin: 8px 0 !important; }
    .lr-stat-row  { padding: 5px 0 !important; }
    .lr-stamp-hide { display: none !important; }
    .lr-car       { display: none !important; }
  }
`;

export default function Login({ onLoginSuccess, onBack, onContinueAsGuest }) {
  const { signInWithGoogle, signInWithEmail, registerWithEmail } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleErr = (err) => {
    const msg = FIREBASE_ERRORS[err.code] || err.message || 'Something went wrong.';
    if (msg) setError(msg);
  };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try { await signInWithGoogle(); onLoginSuccess(); }
    catch (e) { handleErr(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (mode === 'register' && password !== confirmPw) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      if (mode === 'login') await signInWithEmail(email, password);
      else await registerWithEmail(email, password, displayName);
      onLoginSuccess();
    } catch (e) { handleErr(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="lr-wrap" style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 48% 22%, #1C0F55 0%, #10102E 28%, #080918 62%, #030408 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '28px 16px', position: 'relative', overflowY: 'auto',
    }}>
      <style>{CSS}</style>

      {/* Starfield — fixed so it covers full viewport behind scroll */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="lr-sm" />
        <div className="lr-md" style={{ animationDelay: '-2.8s' }} />
        <div className="lr-lg" style={{ animationDelay: '-1.4s' }} />
      </div>

      {/* ── NEON TITLE ── */}
      <h1
        className="lr-neon-title font-bungee"
        style={{
          position: 'relative', zIndex: 1,
          fontSize: 'clamp(1.7rem, 5.5vw, 4rem)',
          letterSpacing: '0.07em',
          color: '#40E0D0',
          textAlign: 'center',
          marginBottom: '22px',
          lineHeight: 1.1,
        }}
      >
        THE TRAVELER'S LOG
      </h1>

      {/* ── BILLBOARD FRAME ── */}
      <div
        className="lr-frame"
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: '820px',
          border: '3px solid #40E0D0',
          borderRadius: '18px',
          padding: '10px',
          background: 'rgba(8,9,24,0.55)',
        }}
      >
        {/* Chrome corner bolts */}
        {[
          { top: '6px', left: '6px' },
          { top: '6px', right: '6px' },
          { bottom: '6px', left: '6px' },
          { bottom: '6px', right: '6px' },
        ].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', ...pos,
            width: '11px', height: '11px', borderRadius: '50%',
            background: 'radial-gradient(circle at 32% 32%, #E8E8E8 0%, #909090 60%, #606060 100%)',
            boxShadow: '0 0 5px rgba(192,192,192,0.55), inset 0 1px 2px rgba(255,255,255,0.6)',
          }} />
        ))}

        {/* ── PASSPORT SPREAD ── */}
        <div className="flex flex-col md:flex-row" style={{ borderRadius: '10px', overflow: 'hidden' }}>

          {/* ═══ LEFT PAGE ═══ */}
          <div className="lr-page-l" style={{ flex: 1, minWidth: 0, padding: '1.4rem 1.5rem' }}>
            <div className="lr-inner">

              {/* Passport doc header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: '8px', letterSpacing: '0.18em', color: 'rgba(215,170,85,0.75)', marginBottom: '2px' }}>
                    LITERARY ROADS — TRAVEL DOCUMENT
                  </div>
                  <div style={{ fontFamily: 'Special Elite, serif', fontSize: '10px', color: 'rgba(200,155,70,0.45)', fontStyle: 'italic' }}>
                    Valid for all literary territories
                  </div>
                </div>
                {/* Red stamp — hidden on mobile to save space */}
                <div className="lr-stamp-ring lr-stamp-hide" style={{
                  width: '50px', height: '50px', flexShrink: 0,
                  border: '2px solid rgba(185,65,10,0.6)',
                  boxShadow: '0 0 0 1px rgba(185,65,10,0.25)',
                  transform: 'rotate(-20deg)',
                  fontSize: '7px', color: 'rgba(185,65,10,0.6)',
                }}>
                  LIT<br/>ROADS<br/>★
                </div>
              </div>

              <hr className="lr-hr" style={{ marginTop: '6px' }} />

              {/* Mode toggle */}
              <div style={{
                display: 'flex', borderRadius: '4px', overflow: 'hidden',
                border: '1px solid rgba(140,105,50,0.45)',
                marginBottom: '14px',
              }}>
                {[['login', 'LOG IN'], ['register', 'REGISTER']].map(([m, label], i) => (
                  <button key={m} className="lr-mode-btn"
                    onClick={() => { setMode(m); setError(''); }}
                    style={{
                      background: mode === m ? '#FF4E00' : 'transparent',
                      color: mode === m ? '#1A1B2E' : 'rgba(200,155,70,0.65)',
                      borderLeft: i > 0 ? '1px solid rgba(140,105,50,0.45)' : 'none',
                    }}
                  >{label}</button>
                ))}
              </div>

              {/* Traveler avatar ring */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <div style={{
                  width: '58px', height: '58px', borderRadius: '50%',
                  background: '#08091A',
                  border: '2.5px solid #40E0D0',
                  boxShadow: '0 0 14px rgba(64,224,208,0.55), inset 0 0 10px rgba(64,224,208,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#40E0D0" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div style={{ marginBottom: '10px' }}>
                    <label className="lr-label">DISPLAY NAME <span style={{ color: 'rgba(200,155,70,0.45)', fontFamily: 'Special Elite, serif', fontSize: '9px', letterSpacing: '0.05em' }}>(optional)</span></label>
                    <input className="lr-input" type="text" value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Literary Traveler" maxLength={40} />
                  </div>
                )}
                <div style={{ marginBottom: '10px' }}>
                  <label className="lr-label">EMAIL</label>
                  <input className="lr-input" type="email" value={email} required
                    onChange={(e) => setEmail(e.target.value)} placeholder="traveler@roads.com" />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label className="lr-label">PASSWORD</label>
                  <input className="lr-input" type="password" value={password} required
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                {mode === 'register' && (
                  <div style={{ marginBottom: '10px' }}>
                    <label className="lr-label">CONFIRM PASSWORD</label>
                    <input className="lr-input" type="password" value={confirmPw} required
                      onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" />
                  </div>
                )}

                {error && (
                  <p style={{ color: '#FF4E00', fontSize: '11px', textAlign: 'center', fontFamily: 'Special Elite, serif', marginBottom: '8px' }}>
                    {error}
                  </p>
                )}

                {/* Neon LOG IN button */}
                <button type="submit" disabled={loading} className="lr-log-btn font-bungee"
                  style={{
                    width: '100%', border: 'none', borderRadius: '6px',
                    padding: '11px', fontSize: '14px', letterSpacing: '0.12em',
                    background: loading ? '#555' : '#FF4E00',
                    color: '#1A1B2E',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: '10px',
                  }}>
                  {loading ? 'LOADING...' : mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
                </button>

                <button type="button" onClick={onContinueAsGuest}
                  className="font-bungee"
                  style={{
                    width: '100%', background: 'transparent',
                    border: '1.5px dashed rgba(64,224,208,0.5)',
                    borderRadius: '5px', padding: '9px 14px',
                    color: 'rgba(64,224,208,0.75)', fontSize: '11px',
                    letterSpacing: '0.1em', cursor: 'pointer',
                    transition: 'border-color 0.2s, color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#40E0D0';
                    e.currentTarget.style.color = '#40E0D0';
                    e.currentTarget.style.background = 'rgba(64,224,208,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(64,224,208,0.5)';
                    e.currentTarget.style.color = 'rgba(64,224,208,0.75)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  CONTINUE AS GUEST →
                </button>
              </form>

              {/* Page number */}
              <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '10px', color: 'rgba(200,155,70,0.28)', fontFamily: 'Special Elite, serif' }}>— 1 —</div>
            </div>
          </div>

          {/* ═══ BINDING ═══ */}
          <div className="hidden md:flex" style={{
            width: '20px', flexShrink: 0, flexDirection: 'column', alignItems: 'center',
            justifyContent: 'space-around', paddingTop: '16px', paddingBottom: '16px',
            background: 'linear-gradient(to right, rgba(8,4,0,0.75) 0%, rgba(28,14,2,0.95) 40%, rgba(18,8,0,1) 50%, rgba(28,14,2,0.95) 60%, rgba(8,4,0,0.75) 100%)',
            boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.7), inset -4px 0 8px rgba(0,0,0,0.7), 0 0 12px rgba(0,0,0,0.5)',
          }}>
            {/* Stitching marks */}
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: 'rgba(140,90,35,0.45)',
                boxShadow: '0 0 2px rgba(140,90,35,0.3)',
              }} />
            ))}
          </div>

          {/* ═══ RIGHT PAGE ═══ */}
          <div className="lr-page-r md:w-64 lg:w-72" style={{ flexShrink: 0, padding: '1.4rem 1.5rem' }}>
            <div className="lr-inner">

              {/* Right page header */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: '8px', letterSpacing: '0.18em', color: 'rgba(215,170,85,0.75)', marginBottom: '2px' }}>
                  ENTRANCE VISA
                </div>
                <div style={{ fontFamily: 'Special Elite, serif', fontSize: '10px', color: 'rgba(200,155,70,0.45)', fontStyle: 'italic' }}>
                  One-click access
                </div>
              </div>

              <hr className="lr-hr" style={{ marginTop: '6px' }} />

              {/* Google Sign-In — prominent */}
              <div style={{ marginBottom: '4px' }}>
                <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(200,155,70,0.6)', marginBottom: '9px', textAlign: 'center' }}>
                  QUICK ACCESS
                </p>
                <button className="lr-google-btn" onClick={handleGoogle} disabled={loading}>
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>

              <hr className="lr-hr" />

              {/* Travel Stats */}
              <div>
                <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: '9px', letterSpacing: '0.14em', marginBottom: '8px', color: '#40E0D0', textShadow: '0 0 8px rgba(64,224,208,0.55)' }}>
                  TRAVEL STATS
                </p>
                {[
                  { icon: '🗺️', label: 'Routes Planned', value: '—' },
                  { icon: '📍', label: 'States Visited', value: '—' },
                  { icon: '📚', label: 'Stops Saved',    value: '—' },
                  { icon: '☕', label: 'Cafes Found',    value: '—' },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="lr-stat-row">
                    <span style={{ fontFamily: 'Special Elite, serif', fontSize: '11px', color: 'rgba(215,170,90,0.8)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>{icon}</span>{label}
                    </span>
                    <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: '12px', color: '#FF4E00', textShadow: '0 0 7px rgba(255,78,0,0.55)' }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Visa seal */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '18px' }}>
                <div className="lr-stamp-ring" style={{
                  width: '66px', height: '66px',
                  border: '2px solid rgba(64,224,208,0.28)',
                  boxShadow: '0 0 0 1px rgba(64,224,208,0.12)',
                  transform: 'rotate(14deg)',
                  fontSize: '7px', color: 'rgba(64,224,208,0.3)',
                }}>
                  LITERARY<br/>ROADS<br/>★ ★ ★
                </div>
              </div>

              {/* Page number */}
              <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '10px', color: 'rgba(200,155,70,0.28)', fontFamily: 'Special Elite, serif' }}>— 2 —</div>
            </div>
          </div>

        </div>{/* end passport spread */}
      </div>{/* end billboard frame */}

      {/* Back button */}
      <button onClick={onBack}
        style={{
          position: 'relative', zIndex: 1, marginTop: '18px',
          background: 'transparent', border: 'none',
          color: 'rgba(192,192,192,0.5)', fontSize: '13px',
          cursor: 'pointer', fontFamily: 'Special Elite, serif',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#40E0D0'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(192,192,192,0.5)'}
      >
        ← Back
      </button>

      {/* Road car silhouette — hidden on mobile */}
      <div className="lr-car" style={{ position: 'relative', zIndex: 1, marginTop: '12px', opacity: 0.32 }}>
        <svg width="210" height="58" viewBox="0 0 210 58" fill="none">
          <path d="M18 40 L28 26 L54 20 L82 18 L114 18 L138 22 L158 29 L168 40 L178 40 L180 44 L8 44 L10 40 Z"
            stroke="#40E0D0" strokeWidth="1.5" fill="none"/>
          <ellipse cx="44" cy="44" rx="10" ry="10" stroke="#40E0D0" strokeWidth="1.5" fill="#08091A"/>
          <ellipse cx="146" cy="44" rx="10" ry="10" stroke="#40E0D0" strokeWidth="1.5" fill="#08091A"/>
          <ellipse cx="44" cy="44" rx="4" ry="4" stroke="#40E0D0" strokeWidth="1" fill="none"/>
          <ellipse cx="146" cy="44" rx="4" ry="4" stroke="#40E0D0" strokeWidth="1" fill="none"/>
          <path d="M60 20 L66 26 L112 26 L118 20" stroke="#40E0D0" strokeWidth="1" fill="none"/>
          <rect x="158" y="32" width="14" height="7" rx="1" stroke="#FF4E00" strokeWidth="1.2" fill="none"/>
          <line x1="10" y1="44" x2="0" y2="44" stroke="#40E0D0" strokeWidth="1.5"/>
          <line x1="180" y1="44" x2="210" y2="44" stroke="#40E0D0" strokeWidth="1.5"/>
        </svg>
      </div>
    </div>
  );
}
