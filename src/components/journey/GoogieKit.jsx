// Googie/space-age shape primitives for the Journeys planner redesigns.
// Mid-century space-age vocabulary: boomerangs, atomic orbits, marquee strips,
// tent awnings, bistro-bulb strings, and the Sundial time picker.

export function GoogieStarburst({ size = 40, color = '#40E0D0', points = 12, inner = 0.42, glow = false, style }) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 48 : 48 * inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100"
      style={{ filter: glow ? `drop-shadow(0 0 6px ${color})` : 'none', flexShrink: 0, ...style }}>
      <polygon points={pts.join(' ')} fill={color}/>
    </svg>
  );
}

export function Boomerang({ size = 60, color = '#FF4E00', rotate = 0, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100"
      style={{ transform: `rotate(${rotate}deg)`, flexShrink: 0, ...style }}>
      <path d="M 12 78 Q 8 18, 80 18 Q 88 22, 84 30 Q 50 28, 42 50 Q 30 70, 22 82 Q 16 84, 12 78 Z"
        fill={color}/>
    </svg>
  );
}

export function AtomicOrbit({ size = 64, color = '#40E0D0', glow = true, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100"
      style={{ filter: glow ? `drop-shadow(0 0 5px ${color}aa)` : 'none', flexShrink: 0, ...style }}>
      {[0, 60, 120].map(rot => (
        <ellipse key={rot} cx="50" cy="50" rx="44" ry="16" fill="none"
          stroke={color} strokeWidth="2" transform={`rotate(${rot} 50 50)`} opacity="0.85"/>
      ))}
      <circle cx="50" cy="50" r="7" fill={color}/>
      <circle cx="94" cy="50" r="3.5" fill={color}/>
      <circle cx="28" cy="12" r="3.5" fill={color}/>
      <circle cx="28" cy="88" r="3.5" fill={color}/>
    </svg>
  );
}

export function BistroLights({ count = 9, color = '#FFB347', sag = 14 }) {
  const W = 390;
  const pts = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return [t * W, Math.sin(t * Math.PI) * sag + 4];
  });
  const d = `M 0 4 ` + pts.map(([x, y]) => `Q ${x} ${y + 4}, ${x} ${y}`).join(' ');
  return (
    <svg width="100%" height={sag + 22} viewBox={`0 0 ${W} ${sag + 22}`} preserveAspectRatio="none"
      style={{ display: 'block' }}>
      <path d={d} fill="none" stroke="#7E89A8" strokeWidth="1"/>
      {pts.map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y + 6} stroke="#7E89A8" strokeWidth="1"/>
          <circle cx={x} cy={y + 9} r="3.2"
            fill={i % 2 === 0 ? color : '#FFF8E7'}
            style={{ filter: `drop-shadow(0 0 4px ${i % 2 === 0 ? color : '#FFF8E7'})` }}/>
        </g>
      ))}
    </svg>
  );
}

export function TentAwning({ colorA = '#B044FB', colorB = '#FFF8E7', scallops = 9 }) {
  const W = 390, height = 46, sw = W / scallops;
  const patId = `awnStripe${colorA.replace('#', '')}`;
  let path = `M 0 0 L ${W} 0 L ${W} ${height - 14} `;
  for (let i = scallops - 1; i >= 0; i--) {
    const x0 = i * sw, xm = x0 + sw / 2;
    path += `Q ${x0 + sw} ${height - 14}, ${xm} ${height} Q ${x0} ${height - 14}, ${x0} ${height - 14} `;
  }
  path += 'Z';
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none"
      style={{ display: 'block' }}>
      <defs>
        <pattern id={patId} width={sw} height={height} patternUnits="userSpaceOnUse">
          <rect width={sw / 2} height={height} fill={colorA}/>
          <rect x={sw / 2} width={sw / 2} height={height} fill={colorB}/>
        </pattern>
      </defs>
      <path d={path} fill={`url(#${patId})`}/>
      <rect width={W} height="4" fill="#12131F" opacity="0.5"/>
    </svg>
  );
}

export function MarqueeStrip({ children, accent = '#B044FB', bulbs = 12, height = 34 }) {
  return (
    <div style={{ position: 'relative', height, background: '#12131F',
      borderTop: `2px solid ${accent}`, borderBottom: `2px solid ${accent}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `inset 0 0 16px ${accent}33` }}>
      {Array.from({ length: bulbs }).map((_, i) => (
        <span key={'t' + i} style={{ position: 'absolute', top: 3,
          left: `${(i + 0.5) * (100 / bulbs)}%`,
          width: 3, height: 3, borderRadius: '50%',
          background: i % 2 ? '#FFB347' : '#FFF8E7',
          boxShadow: `0 0 4px ${i % 2 ? '#FFB347' : '#FFF8E7'}` }}/>
      ))}
      {Array.from({ length: bulbs }).map((_, i) => (
        <span key={'b' + i} style={{ position: 'absolute', bottom: 3,
          left: `${(i + 0.5) * (100 / bulbs)}%`,
          width: 3, height: 3, borderRadius: '50%',
          background: i % 2 ? '#FFF8E7' : '#FFB347',
          boxShadow: `0 0 4px ${i % 2 ? '#FFF8E7' : '#FFB347'}` }}/>
      ))}
      <div style={{ position: 'relative', zIndex: 1,
        fontFamily: '"Bungee", system-ui, sans-serif',
        fontSize: 13, letterSpacing: '0.12em', color: '#FFF8E7',
        textShadow: `0 0 8px ${accent}` }}>{children}</div>
    </div>
  );
}

export function PylonSign({ label, accent = '#FF4E00', sub, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, ...style }}>
      <div style={{ width: 5, background: 'linear-gradient(#C0C0C0, #7E89A8)',
        boxShadow: `0 0 6px ${accent}55`, flexShrink: 0, borderRadius: 2 }}/>
      <div style={{
        position: 'relative', flex: 1, background: '#12131F',
        border: `2px solid ${accent}`,
        clipPath: 'polygon(0 0, 100% 6%, 100% 100%, 0 94%)',
        padding: '10px 16px 10px 14px',
        boxShadow: `0 0 14px ${accent}33, inset 0 0 18px ${accent}11`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GoogieStarburst size={16} color={accent} points={8} inner={0.4} glow/>
          <span style={{ fontFamily: '"Bungee", system-ui, sans-serif', fontSize: 15,
            color: '#FFF8E7', letterSpacing: '0.04em',
            textShadow: `0 0 8px ${accent}88` }}>{label}</span>
        </div>
        {sub && <div style={{ fontFamily: '"Special Elite", Georgia, serif', fontSize: 10,
          color: '#C0C0C0', marginTop: 3, letterSpacing: '0.08em' }}>{sub}</div>}
      </div>
    </div>
  );
}

export function NeonField({ icon, label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: '"Bungee", system-ui, sans-serif', fontSize: 10,
        letterSpacing: '0.16em', color: '#C0C0C0',
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}{label}
      </div>
      {children}
    </div>
  );
}

function SunburstRaysInline({ cx, cy }) {
  return (
    <g>
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (Math.PI / 24) * i + Math.PI;
        return <line key={i} x1={cx} y1={cy}
          x2={cx + 150 * Math.cos(a)} y2={cy + 150 * Math.sin(a)}
          stroke="#F5A623" strokeWidth="1"/>;
      })}
    </g>
  );
}

export function SundialPicker({ value, options, onChange, accent = '#FF4E00' }) {
  const W = 320, cx = 160, cy = 158, R = 120;
  const n = options.length;
  const seg = 180 / n;
  const idx = Math.max(0, options.findIndex(o => o.key === value));
  const polar = (ang, r) => [cx + r * Math.cos(ang * Math.PI / 180), cy - r * Math.sin(ang * Math.PI / 180)];
  const arc = (a1, a2, r) => {
    const [x1, y1] = polar(a1, r), [x2, y2] = polar(a2, r);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const midAng = i => 180 - seg * (i + 0.5);
  const needleAng = midAng(idx);
  const [nx, ny] = polar(needleAng, R - 16);
  const sel = options[idx];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="100%" viewBox={`0 0 ${W} 196`} style={{ maxWidth: 340 }}>
        <g opacity="0.18"><SunburstRaysInline cx={cx} cy={cy}/></g>
        <path d={arc(180, 0, R)} fill="none" stroke="#7E89A8" strokeWidth="2" opacity="0.5"/>
        {options.map((o, i) => {
          const a1 = 180 - seg * i, a2 = 180 - seg * (i + 1);
          const on = i === idx;
          return (
            <path key={o.key} d={arc(a1 - 1.5, a2 + 1.5, R)} fill="none"
              stroke={on ? accent : '#40E0D0'} strokeWidth={on ? 9 : 4}
              strokeLinecap="round" opacity={on ? 1 : 0.4}
              style={{ filter: on ? `drop-shadow(0 0 8px ${accent})` : 'none', cursor: 'pointer' }}
              onClick={() => onChange(o.key)}/>
          );
        })}
        {Array.from({ length: n + 1 }).map((_, i) => {
          const [tx1, ty1] = polar(180 - seg * i, R + 4);
          const [tx2, ty2] = polar(180 - seg * i, R + 12);
          return <line key={i} x1={tx1} y1={ty1} x2={tx2} y2={ty2}
            stroke="#C0C0C0" strokeWidth="1.5" opacity="0.6"/>;
        })}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={accent} strokeWidth="3.5" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${accent})`, transition: 'all .35s cubic-bezier(.34,1.4,.5,1)' }}/>
        <circle cx={cx} cy={cy} r="13" fill="#12131F" stroke={accent} strokeWidth="2"/>
        <circle cx={cx} cy={cy} r="6" fill={accent}
          style={{ filter: `drop-shadow(0 0 6px ${accent})` }}/>
        {options.map((o, i) => {
          const [lx, ly] = polar(midAng(i), R + 30);
          const on = i === idx;
          return (
            <text key={o.key} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              onClick={() => onChange(o.key)}
              style={{ cursor: 'pointer', fontFamily: '"Bungee", system-ui, sans-serif',
                fontSize: 10, letterSpacing: '0.04em',
                fill: on ? accent : '#C0C0C0',
                filter: on ? `drop-shadow(0 0 4px ${accent})` : 'none' }}>
              {o.label.toUpperCase()}
            </text>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', marginTop: 2 }}>
        <div style={{ fontFamily: '"Bungee", system-ui, sans-serif', fontSize: 20, color: '#FFF8E7' }}>
          {sel.label}
        </div>
        <div style={{ fontFamily: '"Special Elite", Georgia, serif', fontSize: 11,
          color: '#C0C0C0', marginTop: 2 }}>
          {sel.sub} · {sel.detail}
        </div>
      </div>
    </div>
  );
}

export function SunArc() {
  const W = 358, H = 96, cx = W / 2;
  const sunT = 0.5;
  const arcY = t => H - 18 - Math.sin(t * Math.PI) * 60;
  const arcX = t => 18 + t * (W - 36);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <path d={`M 18 ${H - 18} Q ${cx} ${H - 18 - 120}, ${W - 18} ${H - 18}`}
        fill="none" stroke="#F5A623" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.6"/>
      <g style={{ filter: 'drop-shadow(0 0 8px #FF4E00)' }}>
        <circle cx={arcX(sunT)} cy={arcY(sunT)} r="11" fill="#FF4E00"/>
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (Math.PI * 2 / 12) * i;
          return <line key={i}
            x1={arcX(sunT) + 13 * Math.cos(a)} y1={arcY(sunT) + 13 * Math.sin(a)}
            x2={arcX(sunT) + 18 * Math.cos(a)} y2={arcY(sunT) + 18 * Math.sin(a)}
            stroke="#FF4E00" strokeWidth="1.4"/>;
        })}
      </g>
      <circle cx="18" cy={H - 18} r="5" fill="#40E0D0"/>
      <circle cx={W - 18} cy={H - 18} r="5" fill="#40E0D0"/>
      <text x="18" y={H - 4} textAnchor="middle"
        style={{ fontFamily: '"Bungee", system-ui, sans-serif', fontSize: 7, fill: '#40E0D0' }}>
        DEPART
      </text>
      <text x={W - 18} y={H - 4} textAnchor="middle"
        style={{ fontFamily: '"Bungee", system-ui, sans-serif', fontSize: 7, fill: '#40E0D0' }}>
        HOME
      </text>
    </svg>
  );
}
