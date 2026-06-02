// ════════════════════════════════════════════════════════════════════════
// LITERARY ROADS — ROAD SHOT FRAMES
// Nine neon-tube "googie" SVG overlay frames for the map check-in feature.
// Each frame is an SVG that sits ON TOP of the user's photo — transparent center.
// Props (every frame): { locationName, appTag, style }
//   • appTag       → the brand line inside the sign (e.g. "Literary Roads")
//   • locationName → the place being checked into
// ════════════════════════════════════════════════════════════════════════

const PAL = {
  teal:    '#3FE0D0',
  orange:  '#FF6A1A',
  purple:  '#B044FB',
  magenta: '#FF3DAE',
  pink:    '#FF7BD0',
  lime:    '#A8E72E',
  white:   '#FFFFFF',
};

// ── Per-frame <defs>: glow filters + sign gradients ──────────────────────
// `p` is a unique prefix so multiple frames can coexist without id collisions.
function NeonDefs({ p }) {
  return (
    <defs>
      {Object.entries(PAL).map(([k, c]) => (
        <filter key={k} id={`${p}-${k}`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="5"  floodColor={c} floodOpacity="0.95"/>
          <feDropShadow dx="0" dy="0" stdDeviation="13" floodColor={c} floodOpacity="0.55"/>
        </filter>
      ))}
      <linearGradient id={`${p}-grad-magenta`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#C01A78"/><stop offset="1" stopColor="#7A1660"/>
      </linearGradient>
      <linearGradient id={`${p}-grad-purple`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7E2BC4"/><stop offset="1" stopColor="#4A1A6E"/>
      </linearGradient>
      <linearGradient id={`${p}-grad-orange`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#C24A12"/><stop offset="1" stopColor="#7A2E0E"/>
      </linearGradient>
    </defs>
  );
}

// ── A neon glass tube along a path ───────────────────────────────────────
function Neon({ d, c = 'teal', p, w = 13, hi = true, cap = 'round' }) {
  return (
    <g filter={`url(#${p}-${c})`}>
      <path d={d} fill="none" stroke={PAL[c]} strokeWidth={w} strokeLinecap={cap} strokeLinejoin="round"/>
      {hi && <path d={d} fill="none" stroke="#fff" strokeWidth={Math.max(1.6, w * 0.2)}
        strokeLinecap={cap} strokeLinejoin="round" opacity="0.5"/>}
    </g>
  );
}

// ── Atomic motifs ────────────────────────────────────────────────────────
function Sputnik({ x, y, r = 46, c = 'purple', p, spokes = 8 }) {
  const col = PAL[c];
  return (
    <g filter={`url(#${p}-${c})`} transform={`translate(${x} ${y})`}>
      {Array.from({ length: spokes }).map((_, i) => {
        const a = (2 * Math.PI * i) / spokes;
        const x2 = Math.cos(a) * r, y2 = Math.sin(a) * r;
        return (
          <g key={i}>
            <line x1={Math.cos(a) * r * 0.32} y1={Math.sin(a) * r * 0.32} x2={x2} y2={y2}
              stroke={col} strokeWidth={4.5} strokeLinecap="round"/>
            <circle cx={x2} cy={y2} r={5} fill={col}/>
          </g>
        );
      })}
      <circle r={r * 0.22} fill={col}/>
      <circle r={r * 0.22} fill="#fff" opacity="0.4"/>
    </g>
  );
}

function RSStarburst({ x, y, r = 60, c = 'orange', p, points = 8, inner = 0.4 }) {
  const col = PAL[c], pts = [];
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`);
  }
  return (
    <g filter={`url(#${p}-${c})`} transform={`translate(${x} ${y})`}>
      <polygon points={pts.join(' ')} fill={col} opacity="0.16"/>
      <polygon points={pts.join(' ')} fill="none" stroke={col} strokeWidth={5.5} strokeLinejoin="round"/>
    </g>
  );
}

function Sparkle({ x, y, r = 16, c = 'lime', p }) {
  const col = PAL[c];
  const d = `M 0 ${-r} Q ${r * 0.18} ${-r * 0.18} ${r} 0 Q ${r * 0.18} ${r * 0.18} 0 ${r} Q ${-r * 0.18} ${r * 0.18} ${-r} 0 Q ${-r * 0.18} ${-r * 0.18} 0 ${-r} Z`;
  return (
    <g filter={`url(#${p}-${c})`} transform={`translate(${x} ${y})`}>
      <path d={d} fill={col}/>
    </g>
  );
}

// ── Geometry helpers ─────────────────────────────────────────────────────
function box(W, H, m, r) {
  return `M ${m + r} ${m} L ${W - m - r} ${m} Q ${W - m} ${m} ${W - m} ${m + r} `
       + `L ${W - m} ${H - m - r} Q ${W - m} ${H - m} ${W - m - r} ${H - m} `
       + `L ${m + r} ${H - m} Q ${m} ${H - m} ${m} ${H - m - r} `
       + `L ${m} ${m + r} Q ${m} ${m} ${m + r} ${m} Z`;
}
function corner(cn, W, H, m, len, r) {
  switch (cn) {
    case 'tl': return `M ${m} ${m + len} L ${m} ${m + r} Q ${m} ${m} ${m + r} ${m} L ${m + len} ${m}`;
    case 'tr': return `M ${W - m - len} ${m} L ${W - m - r} ${m} Q ${W - m} ${m} ${W - m} ${m + r} L ${W - m} ${m + len}`;
    case 'bl': return `M ${m} ${H - m - len} L ${m} ${H - m - r} Q ${m} ${H - m} ${m + r} ${H - m} L ${m + len} ${H - m}`;
    case 'br': return `M ${W - m - len} ${H - m} L ${W - m - r} ${H - m} Q ${W - m} ${H - m} ${W - m} ${H - m - r} L ${W - m} ${H - m - len}`;
    default: return '';
  }
}

// ── The "Checking In:" sign ──────────────────────────────────────────────
const SIGN_SHAPES = {
  pick:    'M18 84 Q22 28 122 20 Q252 12 296 72 Q314 104 250 150 Q150 174 70 158 Q4 142 18 84 Z',
  pill:    'M44 16 L286 8 Q300 8 300 38 L300 122 Q300 152 278 152 L20 160 Q4 160 4 132 L4 48 Q4 24 44 16 Z',
  pennant: 'M10 16 L300 30 L260 86 L300 150 L10 156 Q2 156 2 146 L2 26 Q2 16 10 16 Z',
  badge:   'M150 6 Q302 10 296 86 Q302 166 150 166 Q-2 166 6 86 Q-2 10 150 6 Z',
};

function CheckingInSign({ x, y, scale = 1, rot = 0, shape = 'pick',
  fill = 'magenta', edge = 'magenta', accentA = 'lime', accentB = 'teal',
  p, appTag = 'Literary Roads', locationName }) {
  const gradId = `${p}-grad-${fill === 'orange' ? 'orange' : fill === 'purple' ? 'purple' : 'magenta'}`;
  const d = SIGN_SHAPES[shape];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${rot}) translate(-150 -86)`}>
      {shape === 'badge' && <RSStarburst x={150} y={86} r={132} c={edge} p={p} points={16} inner={0.78}/>}
      <path d={d} fill={`url(#${gradId})`} opacity="0.94"/>
      <g filter={`url(#${p}-${edge})`}>
        <path d={d} fill="none" stroke={PAL[edge]} strokeWidth={6} strokeLinejoin="round"/>
        <path d={d} fill="none" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" opacity="0.5"/>
      </g>
      <Sparkle x={64} y={56} r={15} c={accentA} p={p}/>
      <Sparkle x={150} y={150} r={12} c={accentB} p={p}/>
      <text x="150" y="62" textAnchor="middle"
        fontFamily="'Special Elite', Georgia, serif" fontSize="26" fill={PAL.pink}
        filter={`url(#${p}-pink)`} letterSpacing="1">Checking In:</text>
      <text x="150" y="108" textAnchor="middle"
        fontFamily="'Bungee', system-ui, sans-serif" fontSize="30" fill="#fff"
        filter={`url(#${p}-pink)`} letterSpacing="0.5">{appTag}</text>
      {locationName && (
        <text x="150" y="140" textAnchor="middle"
          fontFamily="'Special Elite', Georgia, serif" fontSize="17" fill={PAL.teal}
          filter={`url(#${p}-teal)`} letterSpacing="0.5">{locationName}</text>
      )}
    </g>
  );
}

// ── Root SVG wrapper for an overlay frame ────────────────────────────────
function Overlay({ vb, p, children, style }) {
  return (
    <svg viewBox={vb} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', inset: 0, ...style }}>
      <NeonDefs p={p}/>
      {children}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SQUARE · 1080 × 1080
// ════════════════════════════════════════════════════════════════════════

export function SquareFrame1({ locationName = "Malaprop's Bookstore", appTag = 'Literary Roads', style }) {
  const p = 'rs-sq1', W = 1080, H = 1080;
  return (
    <Overlay vb="0 0 1080 1080" p={p} style={style}>
      <Neon p={p} c="teal"   d={corner('tl', W, H, 70, 360, 78)} w={15}/>
      <Neon p={p} c="orange" d={corner('tl', W, H, 95, 300, 60)} w={9}/>
      <Neon p={p} c="teal"   d={corner('br', W, H, 70, 300, 78)} w={15}/>
      <Sputnik x={120} y={120} r={66} c="purple" p={p}/>
      <RSStarburst x={1000} y={150} r={70} c="orange" p={p}/>
      <Sparkle x={150} y={420} r={20} c="lime" p={p}/>
      <Sparkle x={930} y={930} r={18} c="magenta" p={p}/>
      <CheckingInSign p={p} x={720} y={905} scale={1.18} rot={-3} shape="pick"
        fill="magenta" edge="magenta" accentA="lime" accentB="teal"
        appTag={appTag} locationName={locationName}/>
    </Overlay>
  );
}

export function SquareFrame2({ locationName = 'Thomas Wolfe Memorial', appTag = 'Literary Roads', style }) {
  const p = 'rs-sq2', W = 1080, H = 1080;
  return (
    <Overlay vb="0 0 1080 1080" p={p} style={style}>
      <Neon p={p} c="teal"   d={box(W, H, 64, 70)} w={15}/>
      <Neon p={p} c="orange" d={box(W, H, 92, 50)} w={8} hi={false}/>
      <Sputnik x={108} y={108} r={52} c="purple" p={p}/>
      <Sputnik x={972} y={972} r={52} c="lime" p={p}/>
      <RSStarburst x={975} y={120} r={56} c="magenta" p={p}/>
      <RSStarburst x={110} y={965} r={48} c="teal" p={p}/>
      <CheckingInSign p={p} x={360} y={210} scale={1.12} rot={-2} shape="pill"
        fill="purple" edge="purple" accentA="lime" accentB="orange"
        appTag={appTag} locationName={locationName}/>
    </Overlay>
  );
}

export function SquareFrame3({ locationName = 'Battery Park Book Exchange', appTag = 'Literary Roads', style }) {
  const p = 'rs-sq3', W = 1080, H = 1080;
  return (
    <Overlay vb="0 0 1080 1080" p={p} style={style}>
      <RSStarburst x={140} y={150} r={104} c="orange" p={p} points={12} inner={0.42}/>
      <Sputnik x={965} y={140} r={58} c="teal" p={p}/>
      <Neon p={p} c="lime" d={`M 70 280 L 70 ${H - 320}`} w={10}/>
      <Neon p={p} c="lime" d={`M ${W - 70} 280 L ${W - 70} ${H - 320}`} w={10}/>
      <Sparkle x={70} y={250} r={18} c="magenta" p={p}/>
      <Sparkle x={W - 70} y={250} r={18} c="magenta" p={p}/>
      <CheckingInSign p={p} x={540} y={905} scale={1.2} rot={0} shape="badge"
        fill="magenta" edge="magenta" accentA="lime" accentB="teal"
        appTag={appTag} locationName={locationName}/>
    </Overlay>
  );
}

// ════════════════════════════════════════════════════════════════════════
// LANDSCAPE · 1920 × 1080
// ════════════════════════════════════════════════════════════════════════

export function LandscapeFrame1({ locationName = "Malaprop's Bookstore", appTag = 'Literary Roads', style }) {
  const p = 'rs-ls1', W = 1920, H = 1080;
  return (
    <Overlay vb="0 0 1920 1080" p={p} style={style}>
      <Neon p={p} c="teal"   d={box(W, H, 66, 80)} w={15}/>
      <Neon p={p} c="orange" d={`M 360 96 L ${W - 360} 96`} w={9} hi={false}/>
      <Neon p={p} c="purple" d={`M 380 118 L ${W - 380} 118`} w={9} hi={false}/>
      <Sputnik x={150} y={150} r={70} c="teal" p={p}/>
      <Sputnik x={960} y={110} r={48} c="purple" p={p}/>
      <RSStarburst x={1770} y={150} r={84} c="orange" p={p}/>
      <Sparkle x={150} y={540} r={22} c="lime" p={p}/>
      <Sparkle x={W - 150} y={540} r={22} c="magenta" p={p}/>
      <Sparkle x={560} y={985} r={18} c="lime" p={p}/>
      <CheckingInSign p={p} x={1430} y={895} scale={1.5} rot={-4} shape="pick"
        fill="magenta" edge="magenta" accentA="teal" accentB="lime"
        appTag={appTag} locationName={locationName}/>
    </Overlay>
  );
}

export function LandscapeFrame2({ locationName = 'Thomas Wolfe Memorial', appTag = 'Literary Roads', style }) {
  const p = 'rs-ls2', W = 1920, H = 1080;
  return (
    <Overlay vb="0 0 1920 1080" p={p} style={style}>
      <Neon p={p} c="orange" d={corner('tl', W, H, 70, 480, 80)} w={15}/>
      <Neon p={p} c="teal"   d={corner('tl', W, H, 98, 400, 60)} w={9}/>
      <Neon p={p} c="orange" d={corner('br', W, H, 70, 480, 80)} w={15}/>
      <Neon p={p} c="teal"   d={corner('br', W, H, 98, 400, 60)} w={9}/>
      <Sputnik x={140} y={140} r={60} c="purple" p={p}/>
      <RSStarburst x={W - 150} y={H - 150} r={66} c="lime" p={p}/>
      <Sparkle x={150} y={560} r={20} c="magenta" p={p}/>
      <CheckingInSign p={p} x={1480} y={210} scale={1.42} rot={2} shape="pennant"
        fill="orange" edge="orange" accentA="teal" accentB="magenta"
        appTag={appTag} locationName={locationName}/>
    </Overlay>
  );
}

export function LandscapeFrame3({ locationName = 'Battery Park Book Exchange', appTag = 'Literary Roads', style }) {
  const p = 'rs-ls3', W = 1920, H = 1080;
  return (
    <Overlay vb="0 0 1920 1080" p={p} style={style}>
      <RSStarburst x={150} y={150} r={96} c="purple" p={p} points={12} inner={0.42}/>
      <RSStarburst x={W - 150} y={H - 150} r={96} c="teal" p={p} points={12} inner={0.42}/>
      <Neon p={p} c="orange" d={`M 120 ${H - 70} L ${W - 120} ${H - 70}`} w={10}/>
      <Neon p={p} c="magenta" d={`M 120 70 L ${W - 460} 70`} w={10}/>
      <Sputnik x={W - 150} y={150} r={48} c="lime" p={p}/>
      <Sparkle x={150} y={H - 150} r={20} c="magenta" p={p}/>
      <CheckingInSign p={p} x={470} y={870} scale={1.46} rot={-2} shape="pill"
        fill="purple" edge="purple" accentA="lime" accentB="teal"
        appTag={appTag} locationName={locationName}/>
    </Overlay>
  );
}

// ════════════════════════════════════════════════════════════════════════
// VERTICAL · 1080 × 1920
// ════════════════════════════════════════════════════════════════════════

export function VerticalFrame1({ locationName = "Malaprop's Bookstore", appTag = 'Literary Roads', style }) {
  const p = 'rs-v1', W = 1080, H = 1920;
  return (
    <Overlay vb="0 0 1080 1920" p={p} style={style}>
      <Neon p={p} c="teal"   d={box(W, H, 64, 72)} w={14}/>
      <Neon p={p} c="purple" d={box(W, H, 90, 52)} w={7} hi={false}/>
      <Sputnik x={150} y={170} r={66} c="orange" p={p}/>
      <RSStarburst x={930} y={170} r={64} c="magenta" p={p}/>
      <Sparkle x={150} y={1620} r={22} c="lime" p={p}/>
      <Sparkle x={930} y={1620} r={22} c="lime" p={p}/>
      <CheckingInSign p={p} x={540} y={1640} scale={1.42} rot={-2} shape="pick"
        fill="magenta" edge="magenta" accentA="lime" accentB="teal"
        appTag={appTag} locationName={locationName}/>
    </Overlay>
  );
}

export function VerticalFrame2({ locationName = 'Thomas Wolfe Memorial', appTag = 'Literary Roads', style }) {
  const p = 'rs-v2', W = 1080, H = 1920;
  return (
    <Overlay vb="0 0 1080 1920" p={p} style={style}>
      <Neon p={p} c="lime"   d={`M 80 220 L 80 ${H - 220}`} w={14}/>
      <Neon p={p} c="teal"   d={`M 112 260 L 112 ${H - 420}`} w={8} hi={false}/>
      <Neon p={p} c="lime"   d={`M ${W - 80} 220 L ${W - 80} ${H - 220}`} w={14}/>
      <Neon p={p} c="teal"   d={`M ${W - 112} 260 L ${W - 112} ${H - 420}`} w={8} hi={false}/>
      <Sputnik x={80} y={180} r={56} c="purple" p={p}/>
      <Sputnik x={W - 80} y={180} r={56} c="orange" p={p}/>
      <Sparkle x={80} y={H - 180} r={20} c="magenta" p={p}/>
      <Sparkle x={W - 80} y={H - 180} r={20} c="magenta" p={p}/>
      <CheckingInSign p={p} x={540} y={1650} scale={1.5} rot={0} shape="badge"
        fill="magenta" edge="lime" accentA="teal" accentB="orange"
        appTag={appTag} locationName={locationName}/>
    </Overlay>
  );
}

export function VerticalFrame3({ locationName = 'Battery Park Book Exchange', appTag = 'Literary Roads', style }) {
  const p = 'rs-v3', W = 1080, H = 1920;
  return (
    <Overlay vb="0 0 1080 1920" p={p} style={style}>
      <Neon p={p} c="orange" d={corner('tl', W, H, 70, 300, 76)} w={14}/>
      <Neon p={p} c="orange" d={corner('tr', W, H, 70, 300, 76)} w={14}/>
      <RSStarburst x={540} y={150} r={86} c="purple" p={p}/>
      <Sputnik x={170} y={420} r={50} c="teal" p={p}/>
      <Sputnik x={910} y={420} r={50} c="lime" p={p}/>
      <Neon p={p} c="teal" d={`M 140 ${H - 80} L ${W - 140} ${H - 80}`} w={11}/>
      <Sparkle x={540} y={H - 130} r={22} c="magenta" p={p}/>
      <CheckingInSign p={p} x={540} y={620} scale={1.5} rot={-2} shape="pennant"
        fill="orange" edge="orange" accentA="teal" accentB="lime"
        appTag={appTag} locationName={locationName}/>
    </Overlay>
  );
}
