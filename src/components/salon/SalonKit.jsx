// Design tokens + shared primitives for The Salon.
import { useRef, useState, useLayoutEffect } from 'react';

export const S = {
  teal:       '#15484C',
  teal2:      '#0F373B',
  teal3:      '#1B585C',
  coral:      '#f66483',
  magenta:    '#c877bf',
  rust:       '#a6480a',
  turq:       '#30b8b2',
  cream:      '#FFF8E7',
  atomOut:    '#3C8C8C',
  creamDim:   'rgba(255,248,231,0.66)',
  creamFaint: 'rgba(255,248,231,0.42)',
  line:       'rgba(255,248,231,0.16)',
  lineTurq:   'rgba(48,184,178,0.28)',
  coralGlow:  'rgba(246,100,131,0.45)',
  fonts: {
    display: '"Fraunces", Georgia, serif',
    serif:   '"Fraunces", Georgia, serif',
    sans:    '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  },
};

export const SALON_ANIMATIONS_CSS = `
@keyframes salonFloat {
  0%, 100% { transform: rotate(3.5deg) translateY(0px); }
  50%       { transform: rotate(3.5deg) translateY(-5px); }
}
@keyframes salonShadow {
  0%, 100% { transform: scaleX(1);    opacity: 0.4; }
  50%       { transform: scaleX(0.8); opacity: 0.25; }
}
@keyframes salonGlow {
  0%, 100% { transform: scale(1);     opacity: 1; }
  50%       { transform: scale(1.05); opacity: 0.8; }
}
@media (prefers-reduced-motion: reduce) {
  [style*="salonFloat"], [style*="salonShadow"], [style*="salonGlow"] {
    animation: none !important;
  }
}
`;

export function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(390);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(ref.current);
    setW(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Rings({ size, stroke, nucleus }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
      <g transform="translate(12 12)" fill="none" stroke={stroke} strokeWidth="1.6">
        <ellipse rx="10" ry="3.9" />
        <ellipse rx="10" ry="3.9" transform="rotate(60)" />
        <ellipse rx="10" ry="3.9" transform="rotate(120)" />
      </g>
      <circle cx="12" cy="12" r="2.4" fill={nucleus} />
    </svg>
  );
}

export function Atom({ size = 18, fill = 1, fillColor = S.rust, emptyColor = S.atomOut, style }) {
  const clip = Math.max(0, Math.min(1, fill));
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-block',
      flexShrink: 0, ...style }}>
      <Rings size={size} stroke={emptyColor} nucleus={emptyColor} />
      {clip > 0 && (
        <span style={{ position: 'absolute', inset: 0, width: `${clip * 100}%`,
          overflow: 'hidden', display: 'block' }}>
          <Rings size={size} stroke={fillColor} nucleus={fillColor} />
        </span>
      )}
    </span>
  );
}

export function AtomRating({ value = 0, size = 18, gap = 4, onRate, hover, onHover,
  fillColor = S.rust, emptyColor = S.atomOut }) {
  const active = hover != null ? hover : value;
  return (
    <span style={{ display: 'inline-flex', gap, alignItems: 'center' }}
      onMouseLeave={() => onHover && onHover(null)}>
      {[0, 1, 2, 3, 4].map(i => {
        const fill = Math.max(0, Math.min(1, active - i));
        const interactive = !!onRate;
        return (
          <span key={i}
            onClick={interactive ? () => onRate(i + 1) : undefined}
            onMouseEnter={interactive ? () => onHover && onHover(i + 1) : undefined}
            style={{ cursor: interactive ? 'pointer' : 'default', lineHeight: 0,
              padding: interactive ? 4 : 0, margin: interactive ? -4 : 0 }}>
            <Atom size={size} fill={interactive ? (active >= i + 1 ? 1 : 0) : fill}
              fillColor={fillColor} emptyColor={emptyColor} />
          </span>
        );
      })}
    </span>
  );
}

function Sparkle({ size = 22, color = S.coral }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true"
      style={{ display: 'block' }}>
      <path d="M50 2 C53 38 62 47 98 50 C62 53 53 62 50 98 C47 62 38 53 2 50 C38 47 47 38 50 2 Z"
        fill={color} />
    </svg>
  );
}

export function BookCover({ w = 60, h = 90, src, title = '', author = '', style }) {
  return (
    <div style={{ width: w, height: h, flexShrink: 0, position: 'relative', borderRadius: 2,
      overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.4)', ...style }}>
      {src ? (
        <img src={src} alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%',
          background: 'linear-gradient(160deg, #E0A21C 0%, #C07A0C 46%, #934E05 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: w * 0.13, boxSizing: 'border-box' }}>
          <div style={{ fontFamily: S.fonts.sans, fontSize: Math.max(6, w * 0.07),
            letterSpacing: '0.2em', color: 'rgba(40,20,4,0.7)', textTransform: 'uppercase' }}>
            A Novel
          </div>
          <div>
            <div style={{ fontFamily: S.fonts.display, fontWeight: 600, color: '#2A1404',
              fontSize: Math.max(9, w * 0.17), lineHeight: 1.0, textTransform: 'uppercase',
              letterSpacing: '-0.01em' }}>{title}</div>
            <div style={{ fontFamily: S.fonts.display, fontStyle: 'italic', color: 'rgba(40,20,4,0.8)',
              fontSize: Math.max(7, w * 0.1), marginTop: w * 0.06 }}>{author}</div>
          </div>
        </div>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '12%', height: '100%',
        background: 'linear-gradient(90deg, rgba(0,0,0,0.34), rgba(0,0,0,0))',
        pointerEvents: 'none' }} />
    </div>
  );
}

export function LevitatingBook({ w = 150, frameColor = S.coral, src, title, author, motion = true }) {
  const h = w * 1.5;
  const fw = w * 1.42, fh = h * 0.94;
  const spA = Math.round(w * 0.17), spB = Math.round(w * 0.125);
  return (
    <div style={{ position: 'relative', width: fw + 30, height: h + 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: w * 1.1, height: h * 0.92, borderRadius: '50%',
        background: `radial-gradient(ellipse at center, ${S.coralGlow}, transparent 68%)`,
        filter: 'blur(20px)',
        animation: motion ? 'salonGlow 3s ease-in-out infinite' : 'none' }} />
      <div style={{ position: 'absolute', width: fw, height: fh,
        border: `5px solid ${frameColor}`, borderRadius: 2 }}>
        <div style={{ position: 'absolute', top: '21%', left: 0,
          transform: 'translate(-50%,-50%)', lineHeight: 0 }}>
          <Sparkle size={spA} color={frameColor} />
        </div>
        <div style={{ position: 'absolute', bottom: '20%', right: 0,
          transform: 'translate(50%,50%)', lineHeight: 0 }}>
          <Sparkle size={spB} color={frameColor} />
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: (h - fh) / 2 + 10, width: w * 0.66, height: 13,
        borderRadius: '50%', background: 'rgba(0,0,0,0.4)', filter: 'blur(7px)',
        animation: motion ? 'salonShadow 3s ease-in-out infinite' : 'none' }} />
      <div style={{ position: 'relative', width: w, height: h, transform: 'rotate(3.5deg)',
        animation: motion ? 'salonFloat 3s ease-in-out infinite' : 'none',
        filter: 'drop-shadow(0 16px 24px rgba(0,0,0,0.45))' }}>
        <BookCover w={w} h={h} src={src} title={title} author={author} />
      </div>
    </div>
  );
}

export function SalonButton({ children, variant = 'primary', onClick, full, disabled, style }) {
  const base = {
    appearance: 'none', cursor: disabled ? 'default' : 'pointer', border: 'none',
    fontFamily: S.fonts.sans, fontSize: 12.5, fontWeight: 600, letterSpacing: '0.14em',
    textTransform: 'uppercase', borderRadius: 999, minHeight: 48, padding: '0 24px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: full ? '100%' : 'auto',
    transition: 'transform .15s ease, opacity .15s ease, background .15s ease',
    opacity: disabled ? 0.4 : 1,
  };
  const variants = {
    primary: { background: S.coral,       color: S.teal, boxShadow: `0 6px 22px ${S.coralGlow}` },
    outline: { background: 'transparent', color: S.coral, border: `1.5px solid ${S.coral}` },
    turq:    { background: 'transparent', color: S.turq,  border: `1.5px solid ${S.turq}` },
    ghost:   { background: 'transparent', color: S.creamDim, border: 'none',
               letterSpacing: '0.04em', textTransform: 'none', fontSize: 13 },
  };
  return (
    <button onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export function StatusDot({ state = 'reading', label }) {
  const map = {
    reading: { c: S.turq,       t: 'Reading' },
    closed:  { c: S.creamFaint, t: 'Closed'  },
  };
  const m = map[state] || map.reading;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.c,
        boxShadow: state === 'reading' ? `0 0 7px ${m.c}` : 'none' }} />
      {label && (
        <span style={{ fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.18em',
          color: m.c, textTransform: 'uppercase', fontWeight: 600 }}>{m.t}</span>
      )}
    </span>
  );
}

export function Rule({ label, color = S.line, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...style }}>
      <div style={{ flex: 1, height: 1, background: color }} />
      {label && (
        <>
          <span style={{ fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.24em',
            color: S.creamDim, textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
          <div style={{ flex: 1, height: 1, background: color }} />
        </>
      )}
    </div>
  );
}

export function SalonScreenShell({ children, style }) {
  return (
    <div style={{ width: '100%', minHeight: '100vh', overflowY: 'auto', background: S.teal,
      backgroundImage: [
        'radial-gradient(ellipse 70% 40% at 50% -5%, rgba(246,100,131,0.10), transparent 60%)',
        'radial-gradient(ellipse 60% 50% at 95% 105%, rgba(48,184,178,0.08), transparent 55%)',
      ].join(', '),
      fontFamily: S.fonts.serif, color: S.cream, ...style }}>
      {children}
    </div>
  );
}

export function Masthead({ big, align = 'center', titleSize, book, style }) {
  const center = align === 'center';
  const tSize = big ? (titleSize || 60) : 19;
  return (
    <div style={{ textAlign: align, display: 'flex', flexDirection: 'column',
      alignItems: center ? 'center' : 'flex-start', ...style }}>
      <div style={{ fontFamily: S.fonts.sans, fontSize: big ? 13 : 11, letterSpacing: '0.34em',
        color: S.coral, textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>
        The Salon
      </div>
      {big && (
        <div style={{ width: 60, height: 2, background: S.coral, margin: '14px 0 16px', borderRadius: 2 }} />
      )}
      <div style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: tSize,
        lineHeight: 0.98, color: S.cream, letterSpacing: '-0.015em', textTransform: 'uppercase' }}>
        {book?.title}
      </div>
      <div style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontWeight: 400,
        fontSize: big ? 22 : 13, color: S.turq, marginTop: big ? 12 : 4, whiteSpace: 'nowrap' }}>
        {book?.author}
      </div>
      <div style={{ fontFamily: S.fonts.sans, fontSize: big ? 12 : 10, letterSpacing: '0.28em',
        color: S.creamDim, textTransform: 'uppercase', marginTop: big ? 14 : 6 }}>
        {book?.dates}
      </div>
    </div>
  );
}
