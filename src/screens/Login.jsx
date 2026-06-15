import { useState, useEffect } from 'react';
import {
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

// ── Design tokens ─────────────────────────────────────────────────────────────
const NEON_CYAN  = '#4DE3DA';
const NEON_PINK  = '#F03A8E';
const INK        = '#0A0E1F';
const INK_2      = '#070A18';
const PAPER      = '#F5EBD6';
const LEATHER_1  = '#6E3D24';
const LEATHER_2  = '#4A2614';
const LEATHER_HI = '#9C5A38';
const GOLD       = '#E8C76B';

const FIREBASE_ERRORS = {
  'auth/user-not-found':          "We don't recognize that email. Check for typos, or create an account.",
  'auth/wrong-password':          "That password doesn't match. Try again or reset it below.",
  'auth/invalid-credential':      "That email or password doesn't match our records.",
  'auth/email-already-in-use':    "An account with this email already exists. Sign in instead?",
  'auth/weak-password':           "Password should be at least 8 characters.",
  'auth/too-many-requests':       "Too many attempts. Please wait a few minutes and try again.",
  'auth/invalid-email':           "That doesn't look like a valid email address.",
  'auth/popup-closed-by-user':    'Sign-in popup was closed.',
  'auth/cancelled-popup-request': '',
};

const CSS = `
  .lr-field-input {
    width: 100%; box-sizing: border-box;
    padding: 10px 12px;
    border: 0; background: transparent;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 15px; color: ${INK}; outline: none;
  }
  .lr-field-input::placeholder { color: #b8a070; opacity: 0.6; }
  @media (max-width: 767px) { .lr-field-input { font-size: 16px !important; } }
  .lr-form-scroll::-webkit-scrollbar { width: 4px; }
  .lr-form-scroll::-webkit-scrollbar-track { background: transparent; }
  .lr-form-scroll::-webkit-scrollbar-thumb { background: #c8b58a; border-radius: 2px; }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function getStrength(pw) {
  if (!pw) return null;
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { label: 'Weak',   color: '#cc2a2a', pct: 33 };
  if (s <= 3) return { label: 'Medium', color: '#c17a00', pct: 66 };
  return             { label: 'Strong', color: '#2a7a2a', pct: 100 };
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function EyeIcon({ shown }) {
  return shown ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

// ── Form micro-components ─────────────────────────────────────────────────────
function StrengthBar({ password }) {
  const str = getStrength(password);
  if (!str || !password) return null;
  const missing = [];
  if (password.length < 8)      missing.push('8+ characters');
  if (!/[A-Z]/.test(password))  missing.push('uppercase letter');
  if (!/[0-9]/.test(password))  missing.push('a number');
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 3, background: '#ddd0b0', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: str.pct + '%', height: '100%', background: str.color,
            borderRadius: 2, transition: 'all 0.3s' }} />
        </div>
        <span style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 10,
          letterSpacing: '0.1em', color: str.color, minWidth: 40 }}>{str.label}</span>
      </div>
      {missing.length > 0 && (
        <p style={{ margin: '3px 0 0', fontFamily: 'Georgia, serif', fontSize: 10,
          color: '#7a5a2a', fontStyle: 'italic', lineHeight: 1.3 }}>
          Needs: {missing.join(' · ')}
        </p>
      )}
    </div>
  );
}

function MatchIndicator({ password, confirm }) {
  if (!confirm) return null;
  const ok = password === confirm;
  return (
    <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, fontStyle: 'italic',
      color: ok ? '#2a7a2a' : '#cc2a2a', display: 'flex', alignItems: 'center', gap: 4 }}>
      {ok ? '✓ Passwords match' : '✗ Passwords do not match'}
    </span>
  );
}

function CapsWarning({ on }) {
  if (!on) return null;
  return (
    <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, fontStyle: 'italic',
      color: '#c17a00', display: 'flex', alignItems: 'center', gap: 4 }}>
      ⇪ Caps Lock is on
    </span>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, autoFocus,
                 rightElement, fieldError, hint, onBlur, onKeyDown }) {
  const [focus, setFocus] = useState(false);
  const hasErr = !!fieldError;
  return (
    <div>
      <div style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 11,
        letterSpacing: '0.2em', color: '#5a4220', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        position: 'relative',
        background: 'rgba(255,250,230,0.6)',
        border: `1px solid ${hasErr ? '#cc2a2a' : focus ? NEON_PINK : '#b8a070'}`,
        borderRadius: 6,
        boxShadow: focus
          ? `0 0 0 2px ${hasErr ? '#cc2a2a33' : NEON_PINK + '33'}, inset 0 1px 0 rgba(255,255,255,0.6)`
          : 'inset 0 1px 0 rgba(255,255,255,0.6)',
        transition: 'all 0.15s',
      }}>
        <input className="lr-field-input" type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoFocus={autoFocus}
          onFocus={() => setFocus(true)}
          onBlur={e => { setFocus(false); onBlur?.(e); }}
          onKeyDown={onKeyDown}
          style={rightElement ? { paddingRight: 38 } : undefined}
        />
        {rightElement && (
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
            {rightElement}
          </div>
        )}
      </div>
      {fieldError && (
        <p style={{ margin: '4px 0 0', fontFamily: 'Georgia, serif', fontSize: 11,
          color: '#cc2a2a', lineHeight: 1.4 }}>{fieldError}</p>
      )}
      {hint && <div style={{ marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function EyeBtn({ shown, onToggle }) {
  return (
    <button type="button" onClick={onToggle} style={{
      background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer',
      display: 'flex', alignItems: 'center', color: '#7a5a2a', opacity: 0.7,
    }}>
      <EyeIcon shown={shown} />
    </button>
  );
}

function GoogleButton({ onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '9px 10px', border: '1px solid #b8a070', borderRadius: 999,
      background: 'rgba(255,250,230,0.7)', color: INK,
      fontFamily: '"IM Fell English SC", serif',
      fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
    }}>
      <svg width="14" height="14" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6c1.9-5.6 7.2-9.7 13.6-9.7z"/>
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 2.9-2.2 5.4-4.7 7l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.4z"/>
        <path fill="#FBBC05" d="M10.4 28.8c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.8-6C.9 16.8 0 20.3 0 24s.9 7.2 2.6 10.4l7.8-5.6z"/>
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-4.1-13.6-9.7l-7.8 6C6.5 42.6 14.6 48 24 48z"/>
      </svg>
      Google
    </button>
  );
}

function MemberBadge() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px',
      border: `1px solid ${INK}`, borderRadius: 4, background: INK, color: PAPER,
      fontFamily: '"IM Fell English SC", serif',
      fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
      boxShadow: `0 0 0 2px ${PAPER}, 0 0 0 3px ${INK}`,
    }}>
      <svg width="10" height="10" viewBox="-50 -50 100 100">
        <polygon points="0,-44 6,-6 44,0 6,6 0,44 -6,6 -44,0 -6,-6" fill={NEON_CYAN} />
      </svg>
      Starlight Circle Member
      <svg width="10" height="10" viewBox="-50 -50 100 100">
        <polygon points="0,-44 6,-6 44,0 6,6 0,44 -6,6 -44,0 -6,-6" fill={NEON_PINK} />
      </svg>
    </div>
  );
}

// ── Environment ───────────────────────────────────────────────────────────────
function StarrySky({ density = 70, seed = 3 }) {
  const rng = (n) => { const x = Math.sin(n * 9301 + seed * 49297) * 233280; return x - Math.floor(x); };
  const stars = Array.from({ length: density }, (_, i) => ({
    x: rng(i + 1) * 100, y: rng(i + 100) * 100,
    s: 0.5 + rng(i + 200) * 1.8, o: 0.35 + rng(i + 300) * 0.6, tw: 2 + rng(i + 400) * 4,
  }));
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
    }}>
      <defs>
        <radialGradient id="lr-skyGrad" cx="50%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#1a1f44" />
          <stop offset="55%" stopColor="#0c1030" />
          <stop offset="100%" stopColor="#05071a" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#lr-skyGrad)" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s * 0.15} fill="#fff" opacity={s.o}>
          <animate attributeName="opacity" values={`${s.o};${s.o * 0.3};${s.o}`} dur={`${s.tw}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {[[18, 22, NEON_CYAN], [82, 14, NEON_PINK], [12, 78, NEON_PINK], [88, 72, NEON_CYAN]].map(([x, y, c], i) => (
        <g key={'g' + i}>
          <circle cx={x} cy={y} r="0.4" fill={c} opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.3;0.9" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={x} cy={y} r="1.2" fill={c} opacity="0.18" />
        </g>
      ))}
    </svg>
  );
}

function NeonHorizon({ color = NEON_CYAN, y = 82, opacity = 0.7 }) {
  const id = `lr-hg-${color.replace('#', '')}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity,
    }}>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="0.5" stopColor={color} stopOpacity="1" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke={color} strokeOpacity="0.18" strokeWidth="0.08">
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={50} y1={y} x2={i * 10} y2={100} />
        ))}
      </g>
      <g stroke={color} strokeOpacity="0.12" strokeWidth="0.08">
        {[2, 4, 7, 11, 16, 22].map((d, i) => (
          <line key={i} x1={0} y1={y + d} x2={100} y2={y + d} />
        ))}
      </g>
      <line x1="0" y1={y} x2="100" y2={y} stroke={`url(#${id})`} strokeWidth="0.5" />
    </svg>
  );
}

function CompassStar({ size = 48, color = NEON_PINK }) {
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{
      filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 14px ${color}80)`, flexShrink: 0,
    }}>
      <polygon points="0,-44 6,-6 44,0 6,6 0,44 -6,6 -44,0 -6,-6" fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points="0,-44 6,-6 44,0 6,6 0,44 -6,6 -44,0 -6,-6" fill={color} fillOpacity="0.15" />
      <g stroke={color} strokeWidth="0.8" strokeOpacity="0.7">
        <line x1="-30" y1="-30" x2="30" y2="30" />
        <line x1="30" y1="-30" x2="-30" y2="30" />
      </g>
      <circle r="3" fill={color} />
    </svg>
  );
}

function StitchSeam({ length = 360 }) {
  const dashes = Array.from({ length: Math.floor(length / 10) }, (_, i) => i);
  return (
    <div style={{
      position: 'absolute', top: 14, bottom: 14, width: 1,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center',
    }}>
      {dashes.map(i => (
        <span key={i} style={{ width: 1, height: 6, background: GOLD, opacity: 0.55, boxShadow: `0 0 2px ${GOLD}` }} />
      ))}
    </div>
  );
}

// ── Journal card ──────────────────────────────────────────────────────────────
function JournalCard({ width, height, children }) {
  return (
    <div style={{
      position: 'relative', width, height, borderRadius: 18, flexShrink: 0,
      filter: `drop-shadow(0 0 24px ${NEON_CYAN}55) drop-shadow(0 0 60px ${NEON_PINK}30)`,
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 18,
        background: `
          radial-gradient(ellipse 120% 80% at 30% 20%, ${LEATHER_HI}99 0%, transparent 55%),
          radial-gradient(ellipse 100% 100% at 70% 90%, ${LEATHER_2} 0%, transparent 60%),
          linear-gradient(160deg, ${LEATHER_1} 0%, ${LEATHER_2} 100%)
        `,
        boxShadow: `inset 0 1px 0 ${LEATHER_HI}aa, inset 0 -2px 8px ${LEATHER_2}`,
        overflow: 'hidden',
      }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18, mixBlendMode: 'overlay' }}>
          <filter id="lr-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#lr-grain)" />
        </svg>
        <div style={{
          position: 'absolute', inset: 14, borderRadius: 12,
          border: `1px solid ${LEATHER_HI}66`,
          boxShadow: `inset 0 0 0 1px ${LEATHER_2}, inset 0 2px 6px rgba(0,0,0,0.35)`,
        }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 22, width: 1 }}>
          <StitchSeam length={height - 28} />
        </div>
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 22, width: 1 }}>
          <StitchSeam length={height - 28} />
        </div>
        {[{ top: 10, left: 10 }, { top: 10, right: 10 }, { bottom: 10, left: 10 }, { bottom: 10, right: 10 }].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', ...pos, width: 14, height: 14, borderRadius: 3,
            background: `linear-gradient(135deg, ${GOLD} 0%, #8a6a2d 100%)`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
          }} />
        ))}
      </div>
      <div style={{
        position: 'absolute', top: 28, bottom: 28, left: 38, right: 38,
        borderRadius: 6,
        background: `radial-gradient(ellipse 120% 80% at 50% 0%, ${PAPER} 0%, ${PAPER} 60%, #E2D2A8 100%)`,
        boxShadow: `inset 0 0 0 1px #c8b58a, inset 0 0 24px rgba(120,80,30,0.18), 0 6px 16px rgba(0,0,0,0.45)`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.22, pointerEvents: 'none' }}>
          <filter id="lr-paperNoise">
            <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" />
            <feColorMatrix values="0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 0.15  0 0 0 0.35 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#lr-paperNoise)" />
        </svg>
        <svg style={{ position: 'absolute', top: -24, right: -10, width: 90, height: 90, opacity: 0.12 }} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="38" fill="#7a4a1a" />
          <circle cx="50" cy="50" r="36" fill="#a06028" />
        </svg>
        {children}
      </div>
    </div>
  );
}

// ── Inline link style for error messages ──────────────────────────────────────
const errLinkStyle = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  color: '#cc2a2a', fontFamily: 'Georgia, serif', fontSize: 'inherit',
  textDecoration: 'underline', textUnderlineOffset: 2,
};

// ── Main Login component ───────────────────────────────────────────────────────
export default function Login({ onLoginSuccess, onBack, onContinueAsGuest, onShowPrivacy, onShowEthics }) {
  const { signInWithGoogle, signInWithEmail, registerWithEmail } = useAuth();

  const [mode,          setMode]          = useState('login');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [confirmPw,     setConfirmPw]     = useState('');
  const [displayName,   setDisplayName]   = useState('');
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [remember,      setRemember]      = useState(true);

  // Forgot password
  const [resetEmail,    setResetEmail]    = useState('');
  const [resetStatus,   setResetStatus]   = useState('idle');
  const [resetError,    setResetError]    = useState('');
  const [resetCooldown, setResetCooldown] = useState(0);

  // Enhanced UX state
  const [emailError,    setEmailError]    = useState('');
  const [emailExists,   setEmailExists]   = useState(false);
  const [showPw,        setShowPw]        = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [capsLock,      setCapsLock]      = useState(false);
  const [emailConflict, setEmailConflict] = useState(false);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const t = setTimeout(() => setResetCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resetCooldown]);

  const isReg = mode === 'register';

  const switchMode = (m) => {
    setMode(m); setError(''); setEmailError('');
    setEmailExists(false); setEmailConflict(false);
    setShowPw(false); setShowConfirmPw(false);
    setResetError(''); setResetStatus('idle');
  };

  const handleCapsKey = (e) => setCapsLock(e.getModifierState('CapsLock'));

  const handleEmailBlur = async () => {
    if (!isReg || !email) { setEmailError(''); return; }
    if (!isValidEmail(email)) {
      setEmailError("That doesn't look like a valid email address.");
      return;
    }
    setEmailError('');
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      setEmailExists(methods.length > 0);
    } catch {}
  };

  const handleErr = (err) => {
    if (err.code === 'auth/email-already-in-use') { setEmailConflict(true); return; }
    setEmailConflict(false);
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
    e.preventDefault();
    setError(''); setEmailConflict(false);
    if (isReg && password !== confirmPw) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      if (!isReg) {
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
        await signInWithEmail(email, password);
      } else {
        await setPersistence(auth, browserLocalPersistence);
        await registerWithEmail(email, password, displayName);
      }
      onLoginSuccess();
    } catch (e) { handleErr(e); }
    finally { setLoading(false); }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault(); setResetError(''); setResetStatus('idle');
    if (!isValidEmail(resetEmail)) {
      setResetError("That doesn't look like a valid email address.");
      return;
    }
    setLoading(true);
    try { await sendPasswordResetEmail(auth, resetEmail); } catch {}
    finally { setLoading(false); }
    setResetStatus('sent');
    setResetCooldown(60);
  };

  const isMobile    = typeof window !== 'undefined' && window.innerWidth <= 600;
  const cardW       = isMobile ? 310 : 420;
  const cardH       = isMobile ? (isReg ? 710 : 590) : (isReg ? 820 : 720);
  const padX        = isMobile ? 18 : 32;
  const titleFs     = isMobile ? 22 : 28;
  const compassSize = isMobile ? 48 : 64;
  const density     = isMobile ? 70 : 160;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: INK_2, overflow: 'hidden' }}>
      <style>{CSS}</style>
      <StarrySky density={density} seed={3} />
      <NeonHorizon color={NEON_CYAN} y={isMobile ? 84 : 82} opacity={0.7} />

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
      }}>
        <defs>
          <radialGradient id="lr-halo" cx="50%" cy="48%" r="38%">
            <stop offset="0" stopColor={NEON_CYAN} stopOpacity="0" />
            <stop offset="0.45" stopColor={NEON_CYAN} stopOpacity="0.14" />
            <stop offset="0.5" stopColor={NEON_CYAN} stopOpacity="0.42" />
            <stop offset="0.55" stopColor={NEON_CYAN} stopOpacity="0.14" />
            <stop offset="1" stopColor={NEON_CYAN} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="50" rx="36" ry="44" fill="url(#lr-halo)" />
      </svg>

      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', zIndex: 5 }}>
        <div style={{
          minHeight: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '20px 16px',
        }}>
          <div style={{ marginBottom: isMobile ? 10 : 14 }}>
            <CompassStar size={compassSize} color={NEON_PINK} />
          </div>

          <JournalCard width={cardW} height={cardH}>
            <div style={{
              display: 'flex', flexDirection: 'column',
              padding: `24px ${padX}px 18px`,
              height: '100%', boxSizing: 'border-box',
              position: 'relative', zIndex: 2, overflow: 'hidden',
            }}>
              {/* Title */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <h1 style={{
                  fontFamily: '"DM Serif Display", "Fraunces", Georgia, serif',
                  fontSize: titleFs, fontWeight: 400,
                  lineHeight: 1.05, margin: 0, color: INK, letterSpacing: '-0.01em',
                }}>The Traveler's Log</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 6 }}>
                  <span style={{ flex: 1, height: 1, background: '#c8b58a' }} />
                  <span style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 9, letterSpacing: '0.18em', color: '#7a5a2a' }}>
                    KEEPER OF MILES &amp; STORIES
                  </span>
                  <span style={{ flex: 1, height: 1, background: '#c8b58a' }} />
                </div>
              </div>

              {/* Tab toggle */}
              {mode !== 'forgot' && (
                <div style={{
                  marginTop: 16, flexShrink: 0,
                  display: 'flex', background: '#E2D2A8',
                  border: '1px solid #c8b58a', borderRadius: 999, padding: 3,
                }}>
                  {['login', 'register'].map(m => {
                    const active = mode === m;
                    return (
                      <button key={m} onClick={() => switchMode(m)} style={{
                        flex: 1, padding: '7px 0', border: 0, cursor: 'pointer', borderRadius: 999,
                        background: active ? INK : 'transparent',
                        color: active ? PAPER : '#5a4220',
                        fontFamily: '"IM Fell English SC", serif',
                        fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                        boxShadow: active ? `inset 0 0 0 1px ${GOLD}` : 'none',
                        transition: 'all 0.2s',
                      }}>{m === 'login' ? 'Log In' : 'Register'}</button>
                    );
                  })}
                </div>
              )}

              {/* ── Forgot password view ── */}
              {mode === 'forgot' ? (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  <div style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 18, color: INK, textAlign: 'center', marginBottom: 4 }}>
                    Reset Your Route
                  </div>

                  {resetStatus === 'sent' ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>✉</div>
                      <p style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 16, color: INK, margin: '0 0 8px' }}>
                        Check your inbox.
                      </p>
                      <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#5a4220', lineHeight: 1.65, margin: 0 }}>
                        If that address is registered with Literary Roads, a reset link is on its way.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Field
                        label="Email" type="email"
                        value={resetEmail} onChange={setResetEmail}
                        placeholder="traveler@theroad.co"
                        autoFocus
                      />
                      {resetError && (
                        <p style={{ margin: 0, color: '#cc2a2a', fontFamily: 'Georgia, serif', fontSize: 12, textAlign: 'center' }}>
                          {resetError}
                        </p>
                      )}
                      <button type="submit" disabled={loading || resetCooldown > 0} style={{
                        marginTop: 4, padding: '12px 18px',
                        border: `1.5px solid ${INK}`, borderRadius: 999,
                        background: (loading || resetCooldown > 0) ? '#c8b58a' : INK,
                        color: (loading || resetCooldown > 0) ? '#5a4220' : PAPER,
                        fontFamily: '"IM Fell English SC", serif',
                        fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase',
                        cursor: (loading || resetCooldown > 0) ? 'not-allowed' : 'pointer',
                        boxShadow: `0 0 0 2px ${PAPER}, 0 0 0 3.5px ${INK}`,
                      }}>
                        {loading ? 'Sending…' : resetCooldown > 0 ? `Resend in ${resetCooldown}s` : 'Send Reset Link →'}
                      </button>
                    </form>
                  )}

                  <button onClick={() => switchMode('login')} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: '"IM Fell English SC", serif', fontSize: 11,
                    letterSpacing: '0.18em', color: '#7a5a2a',
                    textDecoration: 'underline', textDecorationColor: '#a8895a',
                    textUnderlineOffset: 3, padding: '4px 0',
                  }}>← Back to Log In</button>
                </div>

              ) : (
              /* ── Login / Register form ── */
              <form onSubmit={handleSubmit} className="lr-form-scroll" style={{
                marginTop: 14, display: 'flex', flexDirection: 'column',
                gap: isReg ? 8 : 10, flex: 1, overflowY: 'auto', paddingRight: 2,
              }}>
                {isReg && (
                  <Field
                    label="Display Name (optional)" type="text"
                    value={displayName} onChange={setDisplayName}
                    placeholder="Literary Traveler"
                  />
                )}

                {/* Email field */}
                <Field
                  label="Email" type="email" value={email}
                  onChange={v => {
                    setEmail(v);
                    setEmailExists(false);
                    setEmailConflict(false);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="traveler@theroad.co"
                  fieldError={emailError}
                  onBlur={handleEmailBlur}
                  hint={emailExists ? (
                    <p style={{ margin: '3px 0 0', fontFamily: 'Georgia, serif', fontSize: 11, color: '#cc2a2a', lineHeight: 1.4 }}>
                      An account with this email already exists.{' '}
                      <button type="button" onClick={() => switchMode('login')} style={errLinkStyle}>
                        Sign in instead →
                      </button>
                    </p>
                  ) : null}
                />

                {/* Password field */}
                <div>
                  <Field
                    label="Password"
                    type={showPw ? 'text' : 'password'}
                    value={password} onChange={setPassword}
                    placeholder={isReg ? 'Choose a passphrase' : 'Your secret route'}
                    onKeyDown={handleCapsKey}
                    rightElement={<EyeBtn shown={showPw} onToggle={() => setShowPw(s => !s)} />}
                    hint={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {isReg && <StrengthBar password={password} />}
                        <CapsWarning on={capsLock} />
                      </div>
                    }
                  />
                  {!isReg && (
                    <div style={{ textAlign: 'right', marginTop: 5 }}>
                      <button type="button"
                        onClick={() => { setResetEmail(email); switchMode('forgot'); }}
                        style={{
                          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                          fontFamily: '"IM Fell English SC", serif', fontSize: 11,
                          letterSpacing: '0.18em', color: '#7a5a2a',
                          textDecoration: 'underline', textDecorationColor: '#a8895a',
                          textUnderlineOffset: 3,
                        }}>Forgot my password?</button>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                {isReg && (
                  <Field
                    label="Confirm Password"
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPw} onChange={setConfirmPw}
                    placeholder="Confirm passphrase"
                    onKeyDown={handleCapsKey}
                    rightElement={<EyeBtn shown={showConfirmPw} onToggle={() => setShowConfirmPw(s => !s)} />}
                    hint={<MatchIndicator password={password} confirm={confirmPw} />}
                  />
                )}

                {/* Remember me (login only) */}
                {!isReg && (
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    fontFamily: '"IM Fell English SC", serif', fontSize: 10,
                    letterSpacing: '0.16em', color: '#5a4220',
                  }}>
                    <span style={{
                      width: 16, height: 16, border: `1.5px solid ${INK}`, borderRadius: 3,
                      background: remember ? INK : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s', flexShrink: 0,
                    }}>
                      {remember && <span style={{ color: GOLD, fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </span>
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                    REMEMBER ME ON THIS ROAD
                  </label>
                )}

                {/* Privacy note (register only) */}
                {isReg && (
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 10, fontStyle: 'italic', color: '#5a4220', lineHeight: 1.4 }}>
                    By registering you agree to our{' '}
                    <button type="button" onClick={onShowPrivacy} style={{ background: 'none', border: 'none', padding: 0, color: '#7a5a2a', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}>Privacy Policy</button>
                    {' '}and{' '}
                    <button type="button" onClick={onShowEthics} style={{ background: 'none', border: 'none', padding: 0, color: '#7a5a2a', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}>Code of Ethics</button>.
                  </div>
                )}

                {/* Errors */}
                {emailConflict && (
                  <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 12, color: '#cc2a2a', textAlign: 'center' }}>
                    An account with this email already exists.{' '}
                    <button type="button" onClick={() => switchMode('login')} style={errLinkStyle}>
                      Sign in instead →
                    </button>
                  </p>
                )}
                {error && !emailConflict && (
                  <p style={{ margin: 0, color: '#cc2a2a', fontFamily: 'Georgia, serif', fontSize: 12, textAlign: 'center' }}>
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading} style={{
                  marginTop: 2, position: 'relative',
                  padding: '11px 18px', border: `1.5px solid ${INK}`, borderRadius: 999,
                  background: loading ? '#c8b58a' : INK,
                  color: loading ? '#5a4220' : PAPER,
                  fontFamily: '"IM Fell English SC", serif',
                  fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: `0 0 0 2px ${PAPER}, 0 0 0 3.5px ${INK}, 0 0 14px ${NEON_CYAN}55`,
                  flexShrink: 0,
                }}>
                  {loading ? 'One moment…' : isReg ? 'Begin the Log →' : 'Log In →'}
                </button>

                {/* OR divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, flexShrink: 0 }}>
                  <span style={{ flex: 1, height: 1, background: '#c8b58a' }} />
                  <span style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 10, letterSpacing: '0.22em', color: '#7a5a2a' }}>OR</span>
                  <span style={{ flex: 1, height: 1, background: '#c8b58a' }} />
                </div>

                <GoogleButton onClick={handleGoogle} disabled={loading} />

                <button type="button" onClick={onContinueAsGuest} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: '"IM Fell English SC", serif', fontSize: 10,
                  letterSpacing: '0.22em', color: '#5a4220', textTransform: 'uppercase',
                  textDecoration: 'underline', textDecorationColor: '#a8895a',
                  textUnderlineOffset: 4, padding: '2px 0', flexShrink: 0,
                }}>Continue as Guest →</button>

                {!isReg && (
                  <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                    <MemberBadge />
                  </div>
                )}
              </form>
              )}
            </div>
          </JournalCard>

          <button onClick={onBack} style={{
            marginTop: 18, background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: '"IM Fell English SC", serif', fontSize: 11,
            letterSpacing: '0.18em', color: `${NEON_CYAN}80`,
            textTransform: 'uppercase', textDecoration: 'underline',
            textDecorationColor: `${NEON_CYAN}40`, textUnderlineOffset: 4,
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = NEON_CYAN}
            onMouseLeave={e => e.currentTarget.style.color = `${NEON_CYAN}80`}
          >← Back</button>
        </div>
      </div>
    </div>
  );
}
