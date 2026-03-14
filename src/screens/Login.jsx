import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const FIREBASE_ERRORS = {
  'auth/user-not-found':          'No account found with that email.',
  'auth/wrong-password':          'Incorrect password.',
  'auth/invalid-credential':      'Invalid email or password.',
  'auth/email-already-in-use':    'An account with this email already exists.',
  'auth/weak-password':           'Password must be at least 6 characters.',
  'auth/invalid-email':           'Please enter a valid email address.',
  'auth/popup-closed-by-user':    'Sign-in popup was closed.',
  'auth/cancelled-popup-request': '',
};

const CSS = `
  @keyframes lr-card-hum {
    0%,100% { box-shadow: 0 0 0 1px #40E0D0, 0 0 18px rgba(64,224,208,0.45), 0 0 45px rgba(64,224,208,0.15), 0 8px 32px rgba(0,0,0,0.6); }
    50%      { box-shadow: 0 0 0 1px #40E0D0, 0 0 28px rgba(64,224,208,0.65), 0 0 70px rgba(64,224,208,0.25), 0 8px 32px rgba(0,0,0,0.6); }
  }
  @keyframes lr-title-glow {
    0%,100% { text-shadow: 0 0 8px #40E0D0, 0 0 20px rgba(64,224,208,0.7), 0 0 45px rgba(64,224,208,0.3); }
    50%      { text-shadow: 0 0 4px #40E0D0, 0 0 12px rgba(64,224,208,0.4), 0 0 25px rgba(64,224,208,0.15); }
  }
  @keyframes lr-btn-glow {
    0%,100% { box-shadow: 0 0 10px #FF4E00, 0 0 22px rgba(255,78,0,0.6), 0 0 45px rgba(255,78,0,0.25); }
    50%      { box-shadow: 0 0 16px #FF4E00, 0 0 34px rgba(255,78,0,0.8), 0 0 68px rgba(255,78,0,0.35); }
  }

  .lr-card      { animation: lr-card-hum 3.5s ease-in-out infinite; }
  .lr-title     { animation: lr-title-glow 3s ease-in-out infinite; }
  .lr-submit    { animation: lr-btn-glow 2s ease-in-out infinite; }

  .lr-input {
    width: 100%; box-sizing: border-box;
    background: rgba(255,245,200,0.06);
    border: 1px solid rgba(150,110,55,0.5);
    border-radius: 5px;
    color: #F0D9A8;
    padding: 10px 14px;
    font-family: 'Special Elite', serif;
    font-size: 14px;
    outline: none;
    transition: border-color .2s, box-shadow .2s, background .2s;
  }
  .lr-input:focus {
    border-color: #40E0D0;
    background: rgba(255,245,200,0.1);
    box-shadow: 0 0 0 2px rgba(64,224,208,0.15), 0 0 12px rgba(64,224,208,0.3);
  }
  .lr-input::placeholder { color: rgba(190,145,70,0.32); }

  .lr-label {
    display: block;
    font-family: 'Bungee', sans-serif;
    font-size: 9px;
    letter-spacing: 0.18em;
    color: rgba(210,170,90,0.8);
    margin-bottom: 5px;
  }

  .lr-mode-btn {
    flex: 1; padding: 8px 6px;
    font-family: 'Bungee', sans-serif;
    font-size: 11px; letter-spacing: 0.1em;
    border: none; cursor: pointer;
    transition: background .2s, color .2s;
  }

  .lr-google-btn {
    display: flex; align-items: center; justify-content: center; gap: 9px;
    width: 100%;
    background: #F5F5DC; color: #1A1B2E;
    border: none; border-radius: 6px;
    padding: 11px 14px; cursor: pointer;
    font-family: 'Special Elite', serif; font-size: 14px;
    transition: background .2s, box-shadow .2s;
  }
  .lr-google-btn:hover:not(:disabled) {
    background: #fff;
    box-shadow: 0 0 16px rgba(245,245,220,0.4);
  }
  .lr-google-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .lr-divider {
    display: flex; align-items: center; gap: 10px;
    color: rgba(200,155,70,0.35);
    font-family: 'Bungee', sans-serif;
    font-size: 9px; letter-spacing: 0.12em;
  }
  .lr-divider::before, .lr-divider::after {
    content: '';
    flex: 1;
    border-top: 1px solid rgba(200,155,70,0.2);
  }

  /* Mobile — prevent iOS zoom on input focus */
  @media (max-width: 767px) {
    .lr-input { font-size: 16px !important; }
  }
`;

export default function Login({ onLoginSuccess, onBack, onContinueAsGuest, onShowPrivacy, onShowEthics }) {
  const { signInWithGoogle, signInWithEmail, registerWithEmail } = useAuth();
  const [mode,        setMode]        = useState('login');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  const isReg = mode === 'register';

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
    if (isReg && password !== confirmPw) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      if (!isReg) await signInWithEmail(email, password);
      else        await registerWithEmail(email, password, displayName);
      onLoginSuccess();
    } catch (e) { handleErr(e); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(/images/traveler-log-mockup.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
    }}>
      <style>{CSS}</style>

      {/* ── Dark overlay ── */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.42)',
        backdropFilter: 'brightness(0.85)',
      }} />

      {/* ── Neon title ── */}
      <h1
        className="lr-title font-bungee"
        style={{
          position: 'relative', zIndex: 1,
          color: '#40E0D0',
          fontSize: 'clamp(1.5rem, 5vw, 3rem)',
          letterSpacing: '0.07em',
          textAlign: 'center',
          marginBottom: '20px',
          lineHeight: 1.1,
        }}
      >
        THE TRAVELER'S LOG
      </h1>

      {/* ── Card ── */}
      <div
        className="lr-card"
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: '400px',
          background: 'rgba(8, 9, 24, 0.78)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1.5px solid #40E0D0',
          borderRadius: '16px',
          padding: '28px 28px 24px',
        }}
      >
        {/* Corner bolts */}
        {[{ top: 7, left: 7 }, { top: 7, right: 7 }, { bottom: 7, left: 7 }, { bottom: 7, right: 7 }].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: pos.top, left: pos.left, bottom: pos.bottom, right: pos.right,
            width: 9, height: 9, borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #E0E0E0 0%, #888 60%, #555 100%)',
            boxShadow: '0 0 4px rgba(192,192,192,0.5)',
          }} />
        ))}

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          border: '1px solid rgba(140,105,50,0.45)',
          borderRadius: '6px', overflow: 'hidden',
          marginBottom: '22px',
        }}>
          {[['login', 'LOG IN'], ['register', 'REGISTER']].map(([m, lbl], i) => (
            <button key={m} className="lr-mode-btn"
              onClick={() => { setMode(m); setError(''); }}
              style={{
                background: mode === m ? '#FF4E00' : 'transparent',
                color: mode === m ? '#1A1B2E' : 'rgba(200,155,70,0.6)',
                borderLeft: i > 0 ? '1px solid rgba(140,105,50,0.45)' : 'none',
              }}
            >{lbl}</button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {isReg && (
              <div>
                <label className="lr-label">
                  DISPLAY NAME{' '}
                  <span style={{ color: 'rgba(200,155,70,0.4)', fontFamily: 'Special Elite, serif', letterSpacing: '0.04em', fontSize: '9px' }}>
                    (optional)
                  </span>
                </label>
                <input className="lr-input" type="text"
                  value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Literary Traveler" maxLength={40} />
              </div>
            )}

            <div>
              <label className="lr-label">EMAIL</label>
              <input className="lr-input" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="traveler@roads.com" />
            </div>

            <div>
              <label className="lr-label">PASSWORD</label>
              <input className="lr-input" type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" />
            </div>

            {isReg && (
              <div>
                <label className="lr-label">CONFIRM PASSWORD</label>
                <input className="lr-input" type="password" required
                  value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="••••••••" />
              </div>
            )}

          </div>

          {error && (
            <p style={{
              marginTop: '12px', marginBottom: 0,
              color: '#FF4E00', textAlign: 'center',
              fontFamily: 'Special Elite, serif', fontSize: '12px',
            }}>{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="lr-submit font-bungee"
            style={{
              width: '100%', marginTop: '18px',
              padding: '12px',
              background: loading ? 'rgba(80,80,80,0.6)' : '#FF4E00',
              color: '#1A1B2E',
              border: 'none', borderRadius: '7px',
              fontSize: '14px', letterSpacing: '0.12em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {loading ? 'LOADING…' : isReg ? 'CREATE ACCOUNT' : 'LOG IN'}
          </button>

          {/* Terms notice — only shown on register */}
          {isReg && (
            <p style={{
              fontFamily: 'Special Elite, serif',
              fontSize: '11px',
              color: 'rgba(192,192,192,0.45)',
              textAlign: 'center',
              lineHeight: 1.6,
              marginTop: '12px',
            }}>
              By signing up, you agree to our{' '}
              <button onClick={onShowPrivacy} style={{ background: 'none', border: 'none', padding: 0, color: '#40E0D0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}>
                Privacy Policy
              </button>
              {' '}and{' '}
              <button onClick={onShowEthics} style={{ background: 'none', border: 'none', padding: 0, color: '#40E0D0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}>
                Code of Ethics
              </button>.
            </p>
          )}
        </form>

        {/* Divider */}
        <div className="lr-divider" style={{ margin: '18px 0' }}>OR</div>

        {/* Google */}
        <button className="lr-google-btn" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>

        {/* Guest */}
        <button
          onClick={onContinueAsGuest}
          style={{
            display: 'block', width: '100%', marginTop: '12px',
            background: 'transparent', border: 'none',
            color: 'rgba(64,224,208,0.6)',
            fontFamily: 'Bungee, sans-serif', fontSize: '10px',
            letterSpacing: '0.1em', cursor: 'pointer',
            transition: 'color .2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#40E0D0'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(64,224,208,0.6)'}
        >
          CONTINUE AS GUEST →
        </button>

      </div>{/* end card */}

      {/* Back */}
      <button
        onClick={onBack}
        style={{
          position: 'relative', zIndex: 1, marginTop: '16px',
          background: 'transparent', border: 'none',
          color: 'rgba(192,192,192,0.45)',
          fontFamily: 'Special Elite, serif', fontSize: '13px',
          cursor: 'pointer', transition: 'color .2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#40E0D0'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(192,192,192,0.45)'}
      >
        ← Back
      </button>

    </div>
  );
}
