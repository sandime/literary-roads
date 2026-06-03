// Literary Roads — Book Swap Meet shared kit (sunny daytime fair).
// Kraft paper + cream, blue sky, green grass, warm wood tables under striped
// awnings, swaying pennants, twinkling string lights, hand-painted wood signage
// with atomic accents.
import { useState } from 'react';

// ── Design tokens ─────────────────────────────────────────────────────────────
export const SW = {
  sky: '#9AD2EC', skyHi: '#C4E8F6', skyLo: '#7FC0E4',
  grass: '#86A95B', grassDk: '#6E9047',
  kraft: '#E4D2A8', kraft2: '#D8C193', cream: '#FFF8E7', paper2: '#F3E7C8',
  wood: '#C8954E', woodDk: '#9A6B38', woodHi: '#E0B574', woodGrain: 'rgba(80,48,20,0.14)',
  ink: '#3A2A1E', ink2: '#5E4632', muted: '#8a745c',
  orange: '#FF4E00', sage: '#5BA85E', sageGlow: '#7bc67e',
  teal: '#1FA8A0', red: '#E0533B', mustard: '#F2B53A', plum: '#9E5BA8',
  line: 'rgba(58,42,30,0.16)',
  fonts: {
    display: '"Bungee", system-ui, sans-serif',
    type:    '"Special Elite", Georgia, serif',
    serif:   'Georgia, "Times New Roman", serif',
  },
};

// ── Inject keyframes once at module load ──────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('sw-anim')) {
  const s = document.createElement('style');
  s.id = 'sw-anim';
  s.textContent = `
    @keyframes sw-sway    { 0%,100%{transform:rotate(-0.6deg)} 50%{transform:rotate(0.6deg)} }
    @keyframes sw-flag    { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
    @keyframes sw-twinkle { 0%,100%{opacity:1;filter:brightness(1.2)} 50%{opacity:0.55;filter:brightness(0.8)} }
    @keyframes sw-pulse   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    @media (prefers-reduced-motion: reduce) {
      .sw-no-anim * { animation: none !important; }
    }
  `;
  document.head.appendChild(s);
}

const noAnim = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const anim = (s) => noAnim ? 'none' : s;

// ── Scene background: sky → grass gradient + soft sun ────────────────────────
export function FairScene({ children, style }) {
  return (
    <div style={{
      width: '100%', height: '100%', overflowY: 'auto', position: 'relative',
      background: `linear-gradient(180deg, ${SW.skyHi} 0%, ${SW.sky} 30%, ${SW.skyLo} 52%, ${SW.grass} 52%, ${SW.grassDk} 100%)`,
      fontFamily: SW.fonts.serif, color: SW.ink, ...style,
    }}>
      <div style={{ position: 'absolute', top: 26, right: 30, width: 56, height: 56,
        borderRadius: '50%', background: 'radial-gradient(circle, #FFF1B8, #FFD86B)',
        boxShadow: '0 0 40px rgba(255,216,107,0.6)', pointerEvents: 'none' }}/>
      {children}
    </div>
  );
}

// ── Striped scalloped awning ──────────────────────────────────────────────────
export function Awning({ width = 390, height = 54, a = SW.red, b = SW.cream, scallops = 9, sway = false }) {
  const sw = width / scallops;
  let d = `M 0 0 L ${width} 0 L ${width} ${height - 16} `;
  for (let i = scallops - 1; i >= 0; i--) {
    const x0 = i * sw, xm = x0 + sw / 2;
    d += `Q ${x0 + sw} ${height - 16}, ${xm} ${height} Q ${x0} ${height - 16}, ${x0} ${height - 16} `;
  }
  d += 'Z';
  const patId = `awn-${a.replace('#', '')}-${b.replace('#', '')}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
      style={{ display: 'block', transformOrigin: 'top center', animation: anim(sway ? 'sw-sway 5s ease-in-out infinite' : 'none') }}>
      <defs>
        <pattern id={patId} width={sw * 2} height={height} patternUnits="userSpaceOnUse">
          <rect width={sw} height={height} fill={a}/>
          <rect x={sw} width={sw} height={height} fill={b}/>
        </pattern>
      </defs>
      <rect width={width} height={height - 8} fill={SW.woodDk}/>
      <path d={d} fill={`url(#${patId})`}/>
      <rect width={width} height="5" fill="rgba(0,0,0,0.18)"/>
    </svg>
  );
}

// ── Triangle pennant bunting ──────────────────────────────────────────────────
export function Pennants({ count = 11, width = 390, sag = 16, colors }) {
  const cols = colors || [SW.red, SW.mustard, SW.teal, SW.sage, SW.plum, SW.orange];
  const pts = Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count, x = t * width, y = Math.sin(t * Math.PI) * sag + 6;
    return [x, y];
  });
  const rope = `M ${pts.map(p => p.join(' ')).join(' L ')}`;
  return (
    <svg width="100%" height={sag + 46} viewBox={`0 0 ${width} ${sag + 46}`} preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}>
      <path d={rope} fill="none" stroke={SW.ink2} strokeWidth="1.5"/>
      {pts.slice(0, -1).map(([x, y], i) => {
        const [x2, y2] = pts[i + 1];
        const mx = (x + x2) / 2, my = (y + y2) / 2;
        return (
          <g key={i} style={{ transformOrigin: `${mx}px ${my}px`,
            animation: anim(`sw-flag 4s ease-in-out ${i * 0.18}s infinite`) }}>
            <path d={`M ${x} ${y} L ${x2} ${y2} L ${mx} ${my + 26} Z`}
              fill={cols[i % cols.length]} stroke="rgba(0,0,0,0.12)" strokeWidth="0.5"/>
          </g>
        );
      })}
    </svg>
  );
}

// ── String lights ─────────────────────────────────────────────────────────────
export function StringLights({ count = 13, width = 390, sag = 14, warm = true }) {
  const pts = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1), x = t * width, y = Math.sin(t * Math.PI) * sag + 6;
    return [x, y];
  });
  const cols = warm ? ['#FFE6A0', '#FFCF6B', '#FFF3CE'] : [SW.teal, SW.mustard, SW.red];
  const rope = `M ${pts.map(p => p.join(' ')).join(' L ')}`;
  return (
    <svg width="100%" height={sag + 26} viewBox={`0 0 ${width} ${sag + 26}`} preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}>
      <path d={rope} fill="none" stroke={SW.ink2} strokeWidth="1.2" opacity="0.7"/>
      {pts.map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y + 7} stroke={SW.ink2} strokeWidth="1" opacity="0.6"/>
          <circle cx={x} cy={y + 11} r="4.2" fill={cols[i % cols.length]}
            style={{ animation: anim(`sw-twinkle 2.6s ease-in-out ${i * 0.22}s infinite`) }}/>
          <circle cx={x - 1} cy={y + 9.5} r="1.2" fill="#fff" opacity="0.85"/>
        </g>
      ))}
    </svg>
  );
}

// ── Starburst accent ──────────────────────────────────────────────────────────
export function Burst({ x = 0, y = 0, r = 12, c = SW.orange, points = 8, abs }) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * 0.42 : r;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`);
  }
  return (
    <svg width={r * 2} height={r * 2} viewBox={`${-r} ${-r} ${r * 2} ${r * 2}`}
      style={abs ? { position: 'absolute', left: x - r, top: y - r } : {}}>
      <polygon points={pts.join(' ')} fill={c} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8"/>
      <circle r={r * 0.18} fill="#fff" opacity="0.6"/>
    </svg>
  );
}

// ── Hand-painted wood sign ────────────────────────────────────────────────────
export function WoodSign({ children, sub, width = 300, accent = SW.orange, tilt = 0, style }) {
  return (
    <div style={{ position: 'relative', width, transform: `rotate(${tilt}deg)`, ...style }}>
      <div style={{ position: 'absolute', left: -8, top: '38%', width: 16, height: 16,
        borderRadius: '50%', background: SW.woodDk, border: `2px solid ${SW.ink}` }}/>
      <div style={{ position: 'absolute', right: -8, top: '38%', width: 16, height: 16,
        borderRadius: '50%', background: SW.woodDk, border: `2px solid ${SW.ink}` }}/>
      <div style={{
        background: `linear-gradient(180deg, ${SW.woodHi}, ${SW.wood})`,
        border: `3px solid ${SW.ink}`, borderRadius: 8, padding: '12px 18px',
        boxShadow: '0 6px 14px rgba(0,0,0,0.35)', position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0 22px, ${SW.woodGrain} 22px 23px)`,
          pointerEvents: 'none' }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: SW.fonts.display, fontSize: 17, color: SW.cream,
            letterSpacing: '0.04em', textShadow: '0 2px 0 rgba(0,0,0,0.35)', lineHeight: 1.15 }}>{children}</div>
          {sub && <div style={{ fontFamily: SW.fonts.type, fontSize: 11, color: SW.paper2,
            marginTop: 4, letterSpacing: '0.06em' }}>{sub}</div>}
        </div>
        <Burst x={12} y={12} r={8} c={accent} abs/>
        <Burst x={width - 12} y={12} r={8} c={SW.teal} abs/>
      </div>
    </div>
  );
}

// ── Book cover with kraft placeholder fallback ─────────────────────────────────
export function SwapBook({ title = '', author = '', src, w = 56, h = 84, featured, tilt = 0, style, onClick }) {
  const [ok, setOk] = useState(true);
  return (
    <div onClick={onClick} style={{ width: w, height: h, flexShrink: 0, position: 'relative',
      transform: `rotate(${tilt}deg)`, transformOrigin: 'bottom center',
      cursor: onClick ? 'pointer' : 'default', ...style }}>
      <div style={{ position: 'absolute', bottom: -3, left: '8%', width: '84%', height: 8,
        background: 'rgba(0,0,0,0.28)', filter: 'blur(3px)', borderRadius: '50%' }}/>
      <div style={{ width: '100%', height: '100%', borderRadius: 3, overflow: 'hidden',
        border: featured ? `2px solid ${SW.orange}` : `1.5px solid ${SW.ink}`,
        boxShadow: featured ? `0 6px 14px rgba(0,0,0,.4), 0 0 0 3px ${SW.mustard}66` : '0 4px 10px rgba(0,0,0,.35)',
        background: SW.woodDk, position: 'relative' }}>
        {src && ok ? (
          <img src={src} alt={title} onError={() => setOk(false)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
        ) : (
          <div style={{ width: '100%', height: '100%', padding: w * 0.1,
            background: `linear-gradient(150deg, ${SW.plum}, #2e1f2c)`, display: 'flex',
            flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div style={{ width: '38%', height: 2, background: SW.mustard }}/>
            <div style={{ fontFamily: SW.fonts.serif, fontWeight: 700, color: SW.cream,
              fontSize: Math.max(6, w * 0.12), lineHeight: 1.1 }}>{title}</div>
            <div style={{ fontFamily: SW.fonts.serif, fontStyle: 'italic', color: SW.paper2,
              fontSize: Math.max(5, w * 0.09), opacity: 0.85 }}>{author}</div>
          </div>
        )}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '15%', height: '100%',
          background: 'linear-gradient(90deg, rgba(0,0,0,.32), transparent)' }}/>
      </div>
      {featured && (
        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)' }}>
          <Burst r={11} c={SW.orange} points={10}/>
        </div>
      )}
    </div>
  );
}

// ── Wooden table under a striped awning with books propped on top ─────────────
// books = [{title, author, src}]; featured = books[0] (center, larger)
export function BookTable({ books = [], featured, awningA = SW.red, awningB = SW.cream,
  width = 320, onBook, compact }) {
  const all = [featured, ...books].filter(Boolean).slice(0, 5);
  const bw = compact ? 40 : 54, bh = compact ? 60 : 82;
  return (
    <div style={{ width, position: 'relative', margin: '0 auto' }}>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Awning width={width} height={compact ? 34 : 44} a={awningA} b={awningB}
          scallops={Math.round(width / 36)}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        gap: compact ? 6 : 9, padding: compact ? '10px 8px 6px' : '16px 12px 8px',
        minHeight: bh + 18 }}>
        {all.map((b, i) => (
          <SwapBook key={i} title={b.title} author={b.author} src={b.src}
            w={i === 0 ? bw + (compact ? 8 : 14) : bw}
            h={i === 0 ? bh + (compact ? 12 : 20) : bh}
            featured={i === 0} tilt={i === 0 ? 0 : (i % 2 ? 3 : -3)}
            onClick={onBook ? () => onBook(b, i) : undefined}/>
        ))}
        {all.length === 0 && (
          <div style={{ fontFamily: SW.fonts.type, fontSize: 12, color: SW.muted,
            fontStyle: 'italic', padding: '20px 0' }}>An empty table, waiting for books.</div>
        )}
      </div>
      <div style={{ height: 14, background: `linear-gradient(180deg, ${SW.woodHi}, ${SW.wood})`,
        borderTop: `2px solid ${SW.ink}`, borderRadius: 2, boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        backgroundImage: `repeating-linear-gradient(90deg, transparent 0 26px, ${SW.woodGrain} 26px 27px)` }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
        <div style={{ width: 8, height: compact ? 14 : 20, background: SW.woodDk }}/>
        <div style={{ width: 8, height: compact ? 14 : 20, background: SW.woodDk }}/>
      </div>
    </div>
  );
}

// ── Book note as a hanging price tag ──────────────────────────────────────────
export function PriceTag({ children, color = SW.mustard, style }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center',
      background: color, color: SW.ink, fontFamily: SW.fonts.type, fontSize: 11,
      padding: '4px 10px 4px 16px', borderRadius: '3px 8px 8px 3px',
      border: `1.5px solid ${SW.ink}`, lineHeight: 1.3, ...style }}>
      <span style={{ position: 'absolute', left: 5, width: 6, height: 6, borderRadius: '50%',
        background: SW.cream, border: `1.5px solid ${SW.ink}` }}/>
      {children}
    </span>
  );
}

// ── Buttons: primary (orange), wood, sage (outline), ghost ────────────────────
export function SwapBtn({ children, variant = 'primary', full, onClick, disabled, style }) {
  const base = {
    appearance: 'none', cursor: disabled ? 'default' : 'pointer',
    fontFamily: SW.fonts.display, fontSize: 11, letterSpacing: '0.04em',
    borderRadius: 9, minHeight: 42, padding: '0 16px',
    width: full ? '100%' : 'auto', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', gap: 7, border: 'none', opacity: disabled ? 0.55 : 1,
  };
  const v = {
    primary: { background: SW.orange,  color: '#fff',    boxShadow: '0 3px 0 #B83800' },
    wood:    { background: SW.wood,    color: SW.cream,  border: `2px solid ${SW.ink}`, boxShadow: '0 3px 0 rgba(58,42,30,.4)' },
    sage:    { background: 'transparent', color: SW.sage,  border: `1.5px solid ${SW.sage}` },
    ghost:   { background: 'transparent', color: SW.ink2, border: `1.5px solid ${SW.line}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant], ...style }}>
      {children}
    </button>
  );
}
