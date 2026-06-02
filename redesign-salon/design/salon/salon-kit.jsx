// Literary Roads — The Salon · shared kit.
// The Salon is the app's most considered, social space: a warm wine-dark
// reading room, gold used sparingly, no emoji ever, the book cover always
// present. Distinct from the night-navy Journeys palette.

const S = {
  wine:   '#2A1A1F',   // primary surface
  wine2:  '#1F1318',   // deeper recess / sheet shadow
  wine3:  '#33222A',   // elevated card
  gold:   '#C9A84C',   // the only accent that "means" something
  goldSoft: 'rgba(201,168,76,0.30)',
  goldDim:  'rgba(201,168,76,0.16)',
  orange: '#FF4E00',   // atomic orange — the single call-to-action color
  cream:  '#FFF8E7',
  paper2: '#E5D9C2',
  muted:  '#A2908C',   // warm muted text
  muted2: '#7C6A68',
  line:   'rgba(201,168,76,0.16)',
  fonts: {
    display: '"Bungee", system-ui, sans-serif',
    type:    '"Special Elite", Georgia, serif',
    serif:   'Georgia, "Times New Roman", serif',
  },
};

const SALON_CAT = 'assets/salon-cat.png';

// ── THE SALON wordmark ────────────────────────────────────────────────────
function SalonMark({ size = 13, color = S.gold, dotState, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, ...style }}>
      <span style={{ fontFamily: S.fonts.display, fontSize: size, letterSpacing: '0.10em',
        color, textTransform: 'uppercase' }}>The Salon</span>
      {dotState && <StatusDot state={dotState} label/>}
    </span>
  );
}

// ── Status dot — gold when active, muted when closed ──────────────────────
function StatusDot({ state = 'active', label }) {
  const map = {
    active:  { c: S.gold,   t: 'Reading' },
    review:  { c: S.gold,   t: 'Community Review' },
    closed:  { c: S.muted2, t: 'Closed' },
  };
  const m = map[state] || map.active;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.c,
        boxShadow: state !== 'closed' ? `0 0 6px ${m.c}` : 'none' }}/>
      {label && <span style={{ fontFamily: S.fonts.type, fontSize: 10, letterSpacing: '0.06em',
        color: state === 'closed' ? S.muted2 : S.gold }}>{m.t}</span>}
    </span>
  );
}

// ── Book cover — always present; styled placeholder until real art wired ──
// Pass `src` (Google Books cover URL) to use a real image; otherwise renders
// a tasteful literary placeholder built from title/author.
function BookCover({ title = 'Demon Copperhead', author = 'Barbara Kingsolver',
  w = 60, h = 90, src, tone = '#3B5A47', style }) {
  const titleSize = Math.max(7, w * 0.13);
  return (
    <div style={{ width: w, height: h, flexShrink: 0, position: 'relative',
      borderRadius: 3, overflow: 'hidden',
      boxShadow: `0 4px 14px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.4)`,
      ...style }}>
      {src ? (
        <img src={src} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
      ) : (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(150deg, ${tone}, #20120f)`,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: w * 0.12, boxSizing: 'border-box' }}>
          <div style={{ width: '40%', height: 2, background: S.gold, opacity: 0.8 }}/>
          <div>
            <div style={{ fontFamily: S.fonts.serif, fontWeight: 700, color: S.cream,
              fontSize: titleSize, lineHeight: 1.12, letterSpacing: '0.01em' }}>{title}</div>
            <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', color: S.paper2,
              fontSize: titleSize * 0.78, marginTop: 3, opacity: 0.85 }}>{author}</div>
          </div>
          <div style={{ width: '40%', height: 2, background: S.gold, opacity: 0.8, alignSelf: 'flex-end' }}/>
        </div>
      )}
      {/* spine sheen */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '14%', height: '100%',
        background: 'linear-gradient(90deg, rgba(0,0,0,0.4), rgba(0,0,0,0))', pointerEvents: 'none' }}/>
    </div>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────
function SalonButton({ children, variant = 'primary', onClick, full, style }) {
  const base = {
    appearance: 'none', cursor: 'pointer', border: 'none',
    fontFamily: S.fonts.display, fontSize: 12.5, letterSpacing: '0.04em',
    borderRadius: 10, minHeight: 46, padding: '0 18px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: full ? '100%' : 'auto', transition: 'all .18s ease',
  };
  const variants = {
    primary:  { background: S.orange, color: '#fff', boxShadow: `0 0 20px ${S.orange}55` },     // the single CTA color
    gold:     { background: 'transparent', color: S.gold, border: `1.5px solid ${S.gold}` },     // gold outline
    muted:    { background: 'transparent', color: S.muted, border: `1.5px solid ${S.muted2}` },  // muted outline
    ghost:    { background: 'transparent', color: S.muted, border: 'none' },
  };
  return <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

// ── Salon card shell — wine bg, very subtle gold hairline ─────────────────
function SalonCard({ children, gold, elevated, style }) {
  return (
    <div style={{
      background: elevated ? S.wine3 : S.wine,
      border: `1px solid ${gold ? S.goldSoft : S.line}`,
      borderRadius: 14, ...style,
    }}>{children}</div>
  );
}

// ── Section rule — a thin gold hairline with optional centered label ──────
function GoldRule({ label, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      <div style={{ flex: 1, height: 1, background: S.goldSoft }}/>
      {label && <span style={{ fontFamily: S.fonts.type, fontSize: 10, letterSpacing: '0.18em',
        color: S.gold, textTransform: 'uppercase' }}>{label}</span>}
      {label && <div style={{ flex: 1, height: 1, background: S.goldSoft }}/>}
    </div>
  );
}

// ── Char counter ──────────────────────────────────────────────────────────
function CharCount({ used, max = 600 }) {
  const left = max - used;
  const warn = left < 60;
  return <span style={{ fontFamily: S.fonts.type, fontSize: 11,
    color: warn ? S.orange : S.muted2 }}>{left} remaining</span>;
}

// ── Avatar — gold-ringed monogram (no photos; quiet + consistent) ─────────
function Avatar({ name = 'L', size = 32, gold }) {
  const initial = (name || '?').trim()[0].toUpperCase();
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%',
      background: S.wine3, border: `1.5px solid ${gold ? S.gold : S.muted2}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: S.fonts.serif, fontSize: size * 0.42, color: gold ? S.gold : S.muted }}>
      {initial}
    </div>
  );
}

// ── Phone screen shell ─────────────────────────────────────────────────────
function SalonScreen({ children, style }) {
  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: S.wine,
      backgroundImage: 'radial-gradient(ellipse at 50% -8%, rgba(201,168,76,0.07) 0%, transparent 45%), radial-gradient(ellipse at 90% 100%, rgba(255,78,0,0.04) 0%, transparent 42%)',
      fontFamily: S.fonts.serif, color: S.cream, ...style }}>{children}</div>
  );
}

Object.assign(window, {
  S, SALON_CAT, SalonMark, StatusDot, BookCover, SalonButton,
  SalonCard, GoldRule, CharCount, Avatar, SalonScreen,
});
