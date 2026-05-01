// PosterIllustrations.jsx — CSS/SVG illustrations for each curated route type.
// Each illustration is self-contained with only CSS shapes and inline SVG.
// To add a new type: create a component and add a case to the switch.

const BASE = { width: '100%', height: '100%', position: 'relative', overflow: 'hidden' };

// ── Route 66 ──────────────────────────────────────────────────────────────────
function Route66Illustration() {
  return (
    <div style={{ ...BASE, background: '#0d1a2a' }}>
      {/* Stars */}
      {[[8,12],[15,8],[22,18],[30,6],[38,14],[45,9],[52,20],[60,7],[68,15],[75,5],[82,11],[90,18],[95,8],[5,25],[25,30],[50,3],[70,22]].map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 2, height: 2, borderRadius: '50%', background: '#fff', opacity: 0.6 }} />
      ))}
      {/* Orange horizon glow */}
      <div style={{ position: 'absolute', bottom: '30%', left: 0, right: 0, height: 40, background: 'radial-gradient(ellipse at 50% 100%, rgba(255,78,0,0.35) 0%, transparent 70%)' }} />
      {/* Mountains back */}
      <svg style={{ position: 'absolute', bottom: '28%', left: 0, width: '100%', height: '40%' }} viewBox="0 0 200 80" preserveAspectRatio="none">
        <polygon points="0,80 0,60 20,30 40,55 60,20 80,50 100,15 120,45 140,25 160,50 180,35 200,55 200,80" fill="#0a1505" />
      </svg>
      {/* Mountains front */}
      <svg style={{ position: 'absolute', bottom: '26%', left: 0, width: '100%', height: '35%' }} viewBox="0 0 200 70" preserveAspectRatio="none">
        <polygon points="0,70 0,50 15,25 35,48 55,18 75,42 95,28 115,46 135,22 155,44 175,30 200,48 200,70" fill="#060e03" />
      </svg>
      {/* Desert floor */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: '#2a1f0a' }} />
      {/* Road — CSS triangle trick for vanishing perspective */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '32%' }} viewBox="0 0 200 60" preserveAspectRatio="none">
        <polygon points="85,0 115,0 200,60 0,60" fill="#1a1510" />
        {/* Dashed center lines */}
        <line x1="100" y1="2" x2="95" y2="12" stroke="#ffe0a0" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
        <line x1="95" y1="18" x2="85" y2="35" stroke="#ffe0a0" strokeWidth="2" strokeDasharray="5 4" opacity="0.5" />
        <line x1="83" y1="43" x2="75" y2="60" stroke="#ffe0a0" strokeWidth="2.5" strokeDasharray="6 5" opacity="0.4" />
      </svg>
      {/* Left neon sign pole — orange */}
      <div style={{ position: 'absolute', bottom: '28%', left: '18%', width: 3, height: '22%', background: '#555' }}>
        <div style={{ position: 'absolute', top: 0, left: -8, width: 20, height: 7, background: '#FF4E00', borderRadius: 2, boxShadow: '0 0 8px rgba(255,78,0,0.7)' }} />
      </div>
      {/* Right neon sign pole — turquoise */}
      <div style={{ position: 'absolute', bottom: '28%', right: '18%', width: 3, height: '18%', background: '#555' }}>
        <div style={{ position: 'absolute', top: 0, left: -8, width: 20, height: 7, background: '#40E0D0', borderRadius: 2, boxShadow: '0 0 8px rgba(64,224,208,0.7)' }} />
      </div>
    </div>
  );
}

// ── Ghost Town ────────────────────────────────────────────────────────────────
function GhostTownIllustration() {
  return (
    <div style={{ ...BASE, background: '#1a1a1a' }}>
      {/* Moon */}
      <div style={{ position: 'absolute', top: '8%', right: '12%', width: 28, height: 28, borderRadius: '50%', background: 'rgba(240,240,220,0.15)', border: '1px solid rgba(240,240,220,0.2)' }} />
      {/* Stars */}
      {[[10,10],[20,6],[35,15],[55,8],[65,12],[78,6],[88,14]].map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 1.5, height: 1.5, borderRadius: '50%', background: '#fff', opacity: 0.5 }} />
      ))}
      {/* Mountain silhouettes */}
      <svg style={{ position: 'absolute', bottom: '30%', left: 0, width: '100%', height: '45%' }} viewBox="0 0 200 90" preserveAspectRatio="none">
        <polygon points="0,90 0,65 25,30 50,60 75,20 100,55 130,25 160,58 185,35 200,50 200,90" fill="#111" />
      </svg>
      {/* Ground */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '32%', background: '#141414' }} />
      {/* Water tower */}
      <div style={{ position: 'absolute', bottom: '30%', left: '20%', width: 12, height: 30 }}>
        <div style={{ position: 'absolute', bottom: 0, left: 3, width: 6, height: 22, background: '#0d0d0d', borderLeft: '1px solid #222', borderRight: '1px solid #222' }} />
        <div style={{ position: 'absolute', bottom: 18, left: 0, width: 12, height: 10, background: '#111', borderRadius: '2px 2px 0 0', border: '1px solid #1e1e1e' }} />
      </div>
      {/* False-front building */}
      <div style={{ position: 'absolute', bottom: '30%', left: '35%', width: 35, height: 40 }}>
        <div style={{ width: '100%', height: '85%', background: '#0e0e0e', border: '1px solid #1a1a1a' }}>
          <div style={{ position: 'absolute', top: 4, left: 4, width: 8, height: 8, background: 'rgba(200,180,100,0.05)', border: '1px solid #1e1e1e' }} />
          <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, background: 'rgba(200,180,100,0.05)', border: '1px solid #1e1e1e' }} />
        </div>
        {/* Flat top parapet */}
        <div style={{ width: '110%', marginLeft: '-5%', height: '18%', background: '#0a0a0a', border: '1px solid #1a1a1a' }} />
      </div>
      {/* Ghost */}
      <div style={{ position: 'absolute', bottom: '60%', left: '48%', animation: 'lr-float 3s ease-in-out infinite' }}>
        <svg width="20" height="26" viewBox="0 0 20 26">
          <ellipse cx="10" cy="8" rx="8" ry="8" fill="rgba(240,240,240,0.7)" />
          <rect x="2" y="8" width="16" height="12" fill="rgba(240,240,240,0.7)" />
          <path d="M2 20 Q5 24 8 20 Q10 24 12 20 Q15 24 18 20 L18 22 Q15 26 12 22 Q10 26 8 22 Q5 26 2 22 Z" fill="rgba(240,240,240,0.7)" />
          <circle cx="7" cy="9" r="2" fill="rgba(0,0,0,0.6)" />
          <circle cx="13" cy="9" r="2" fill="rgba(0,0,0,0.6)" />
        </svg>
      </div>
    </div>
  );
}

// ── Lighthouse ────────────────────────────────────────────────────────────────
function LighthouseIllustration() {
  return (
    <div style={{ ...BASE, background: '#0a1520' }}>
      {/* Stars */}
      {[[5,8],[15,5],[28,12],[40,4],[55,9],[68,5],[80,13],[92,7]].map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 1.5, height: 1.5, borderRadius: '50%', background: '#fff', opacity: 0.5 }} />
      ))}
      {/* Ocean */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: '#071020' }} />
      {/* Cliff */}
      <svg style={{ position: 'absolute', bottom: '28%', left: 0, width: '55%', height: '30%' }} viewBox="0 0 110 60" preserveAspectRatio="none">
        <polygon points="0,60 0,20 40,10 80,25 110,15 110,60" fill="#1a1e25" />
      </svg>
      {/* Lighthouse tower */}
      <div style={{ position: 'absolute', bottom: '52%', left: '28%', width: 16, height: 50 }}>
        {/* Stripes */}
        {[0,1,2,3].map(i => (
          <div key={i} style={{ position: 'absolute', top: `${i * 25}%`, left: 0, right: 0, height: '12%', background: i % 2 === 0 ? '#e8e0d0' : '#cc3333' }} />
        ))}
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #e8e0d0 0%, #c8c0b0 100%)', border: '1px solid #999' }} />
        {/* Lantern room */}
        <div style={{ position: 'absolute', top: -14, left: -5, width: 26, height: 14, background: '#F5A623', borderRadius: '3px 3px 0 0', boxShadow: '0 0 12px rgba(245,166,35,0.6)' }} />
        {/* Beam lines */}
        <svg style={{ position: 'absolute', top: -14, left: -70, width: 200, height: 60, pointerEvents: 'none' }} viewBox="0 0 200 60">
          <line x1="83" y1="7" x2="0" y2="0" stroke="#F5A623" strokeWidth="1" opacity="0.15" />
          <line x1="83" y1="7" x2="0" y2="20" stroke="#F5A623" strokeWidth="1.5" opacity="0.2" />
          <line x1="83" y1="7" x2="0" y2="40" stroke="#F5A623" strokeWidth="1" opacity="0.12" />
          <line x1="83" y1="7" x2="200" y2="10" stroke="#F5A623" strokeWidth="1" opacity="0.1" />
        </svg>
      </div>
    </div>
  );
}

// ── UFO & Paranormal ──────────────────────────────────────────────────────────
function UfoIllustration() {
  return (
    <div style={{ ...BASE, background: '#080810' }}>
      {/* Desert horizon */}
      <div style={{ position: 'absolute', bottom: '20%', left: 0, right: 0, height: 1, background: 'rgba(100,80,60,0.3)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%', background: '#0e0c08' }} />
      {/* Stars */}
      {[[5,6],[12,12],[22,4],[33,10],[44,7],[58,13],[70,5],[82,9],[92,14],[18,20],[50,18],[75,22]].map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 1.5, height: 1.5, borderRadius: '50%', background: '#b0a0ff', opacity: 0.45 }} />
      ))}
      {/* UFO light source */}
      <div style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)', width: 24, height: 10, background: 'rgba(180,160,255,0.9)', borderRadius: '50%', boxShadow: '0 0 20px 8px rgba(155,89,182,0.4)' }} />
      {/* Beam */}
      <svg style={{ position: 'absolute', top: '22%', left: '30%', width: '40%', height: '55%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="35,0 65,0 100,100 0,100" fill="rgba(155,89,182,0.08)" />
      </svg>
      {/* Human silhouette */}
      <div style={{ position: 'absolute', bottom: '20%', left: '50%', transform: 'translateX(-50%)' }}>
        <svg width="12" height="22" viewBox="0 0 12 22">
          <circle cx="6" cy="3" r="3" fill="#0e0c08" />
          <line x1="6" y1="6" x2="6" y2="16" stroke="#0e0c08" strokeWidth="2" />
          <line x1="6" y1="9" x2="2" y2="14" stroke="#0e0c08" strokeWidth="1.5" />
          <line x1="6" y1="9" x2="10" y2="14" stroke="#0e0c08" strokeWidth="1.5" />
          <line x1="6" y1="16" x2="3" y2="22" stroke="#0e0c08" strokeWidth="1.5" />
          <line x1="6" y1="16" x2="9" y2="22" stroke="#0e0c08" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

// ── Author Country ─────────────────────────────────────────────────────────────
function AuthorCountryIllustration() {
  return (
    <div style={{ ...BASE, background: '#120e06' }}>
      {/* Warm horizon */}
      <div style={{ position: 'absolute', bottom: '35%', left: 0, right: 0, height: 30, background: 'radial-gradient(ellipse at 50% 100%, rgba(200,130,40,0.4) 0%, transparent 70%)' }} />
      {/* Rolling hills — back */}
      <svg style={{ position: 'absolute', bottom: '30%', left: 0, width: '100%', height: '45%' }} viewBox="0 0 200 80" preserveAspectRatio="none">
        <path d="M0,80 Q30,40 60,55 Q90,35 120,50 Q150,30 180,48 Q190,42 200,45 L200,80 Z" fill="#0d1608" />
      </svg>
      {/* Hills — mid */}
      <svg style={{ position: 'absolute', bottom: '20%', left: 0, width: '100%', height: '40%' }} viewBox="0 0 200 80" preserveAspectRatio="none">
        <path d="M0,80 Q25,55 55,62 Q85,45 115,58 Q145,42 175,56 Q185,50 200,52 L200,80 Z" fill="#111d09" />
      </svg>
      {/* Ground */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', background: '#141a08' }} />
      {/* Single tree */}
      <div style={{ position: 'absolute', bottom: '20%', right: '25%' }}>
        <div style={{ width: 3, height: 30, background: '#0a0f05', margin: '0 auto' }} />
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0d1a05', marginTop: -18, marginLeft: -8 }} />
      </div>
      {/* Figure with book */}
      <div style={{ position: 'absolute', bottom: '20%', left: '35%' }}>
        <svg width="14" height="20" viewBox="0 0 14 20">
          <circle cx="7" cy="3" r="2.5" fill="#1a1208" />
          <line x1="7" y1="5.5" x2="7" y2="13" stroke="#1a1208" strokeWidth="2" />
          <line x1="4" y1="8" x2="11" y2="8" stroke="#1a1208" strokeWidth="1.5" />
          <line x1="7" y1="13" x2="4" y2="20" stroke="#1a1208" strokeWidth="1.5" />
          <line x1="7" y1="13" x2="10" y2="20" stroke="#1a1208" strokeWidth="1.5" />
          {/* Book shape */}
          <rect x="9" y="6" width="5" height="4" fill="#1a1208" rx="0.5" />
        </svg>
      </div>
    </div>
  );
}

// ── Literary Landmarks ─────────────────────────────────────────────────────────
function LiteraryLandmarksIllustration() {
  return (
    <div style={{ ...BASE, background: '#0e0c10' }}>
      {/* Sky gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #0a0810 0%, #18121e 60%, #1e1428 100%)' }} />
      {/* Road leading in */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '30%' }} viewBox="0 0 200 60" preserveAspectRatio="none">
        <polygon points="80,0 120,0 200,60 0,60" fill="#161016" />
      </svg>
      {/* City skyline */}
      <svg style={{ position: 'absolute', bottom: '22%', left: 0, width: '100%', height: '55%' }} viewBox="0 0 200 100" preserveAspectRatio="none">
        {/* Buildings */}
        <rect x="5" y="60" width="18" height="40" fill="#0d0a12" />
        <rect x="25" y="45" width="14" height="55" fill="#110d16" />
        <rect x="41" y="55" width="20" height="45" fill="#0e0b13" />
        <rect x="63" y="30" width="18" height="70" fill="#130f18" /> {/* Tall landmark */}
        <rect x="83" y="50" width="12" height="50" fill="#0d0a12" />
        <rect x="97" y="42" width="16" height="58" fill="#110d16" />
        <rect x="115" y="58" width="22" height="42" fill="#0e0b13" />
        <rect x="139" y="48" width="15" height="52" fill="#130f18" />
        <rect x="156" y="55" width="20" height="45" fill="#0d0a12" />
        <rect x="178" y="45" width="22" height="55" fill="#110d16" />
        {/* Window glows */}
        {[[30,50],[32,58],[68,38],[68,48],[68,58],[100,48],[100,56],[142,54],[160,60]].map(([x,y],i) => (
          <rect key={i} x={x} y={y} width="3" height="4" fill="rgba(245,166,35,0.25)" />
        ))}
      </svg>
    </div>
  );
}

// ── Coffee Shop Crawl ──────────────────────────────────────────────────────────
function CoffeeShopIllustration() {
  return (
    <div style={{ ...BASE, background: '#120c08' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #0e0a06 0%, #1a1008 100%)' }} />
      {/* Street */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '18%', background: '#100d0a' }} />
      {/* Storefronts */}
      <svg style={{ position: 'absolute', bottom: '16%', left: 0, width: '100%', height: '60%' }} viewBox="0 0 200 100" preserveAspectRatio="none">
        {/* Building 1 */}
        <rect x="5" y="20" width="50" height="80" fill="#1a1208" />
        <rect x="8" y="55" width="44" height="3" fill="#2a1e10" /> {/* awning */}
        {/* Window warm glow */}
        <rect x="12" y="60" width="18" height="22" fill="rgba(200,130,50,0.3)" />
        <rect x="34" y="60" width="14" height="22" fill="rgba(200,130,50,0.25)" />
        {/* Door */}
        <rect x="22" y="75" width="10" height="25" fill="#0e0a06" />
        {/* Building 2 */}
        <rect x="57" y="30" width="40" height="70" fill="#150f08" />
        <rect x="60" y="62" width="34" height="3" fill="#251a0e" />
        <rect x="62" y="67" width="30" height="20" fill="rgba(200,130,50,0.35)" />
        {/* Steam curl suggestion */}
        <path d="M 38 55 Q 40 50 38 45 Q 36 40 38 35" stroke="rgba(200,180,160,0.3)" strokeWidth="1.5" fill="none" />
        <path d="M 44 54 Q 46 49 44 43 Q 42 38 44 33" stroke="rgba(200,180,160,0.25)" strokeWidth="1.5" fill="none" />
        {/* Building 3 */}
        <rect x="100" y="25" width="45" height="75" fill="#1a1208" />
        <rect x="103" y="58" width="39" height="3" fill="#2a1e10" />
        <rect x="105" y="63" width="16" height="20" fill="rgba(200,130,50,0.3)" />
        <rect x="124" y="63" width="16" height="20" fill="rgba(200,130,50,0.28)" />
        {/* Building 4 */}
        <rect x="148" y="35" width="50" height="65" fill="#150f08" />
        <rect x="151" y="65" width="44" height="3" fill="#251a0e" />
        <rect x="153" y="70" width="38" height="18" fill="rgba(200,130,50,0.32)" />
      </svg>
    </div>
  );
}

// ── Googie ────────────────────────────────────────────────────────────────────
function GoogieIllustration() {
  return (
    <div style={{ ...BASE, background: '#0d0c14' }}>
      {/* Boomerang shape */}
      <svg style={{ position: 'absolute', top: '10%', left: '-5%', width: '70%', height: '50%', opacity: 0.12 }} viewBox="0 0 140 100">
        <path d="M0,80 Q40,-20 140,10 Q100,30 60,90 Z" fill="#FF4E00" />
      </svg>
      {/* Atomic starburst */}
      <svg style={{ position: 'absolute', top: '5%', right: '8%', width: 40, height: 40 }} viewBox="0 0 40 40">
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => (
          <line key={i} x1="20" y1="20"
            x2={20 + Math.cos(deg * Math.PI / 180) * 18}
            y2={20 + Math.sin(deg * Math.PI / 180) * 18}
            stroke="#40E0D0" strokeWidth="1" opacity="0.6"
          />
        ))}
        <circle cx="20" cy="20" r="4" fill="#40E0D0" opacity="0.8" />
      </svg>
      {/* Ground */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%', background: '#0a0910' }} />
      {/* Swooping roofline silhouette */}
      <svg style={{ position: 'absolute', bottom: '18%', left: '5%', width: '70%', height: '45%' }} viewBox="0 0 140 80" preserveAspectRatio="none">
        <path d="M0,80 L0,50 Q30,20 70,35 Q100,45 140,15 L140,80 Z" fill="#13111c" />
        {/* Canopy sweep */}
        <path d="M0,50 Q30,20 70,35 Q100,45 140,15" stroke="#1e1a2a" strokeWidth="2" fill="none" />
      </svg>
      {/* Neon sign pole */}
      <div style={{ position: 'absolute', bottom: '18%', right: '22%', width: 3, height: '25%', background: '#1a1820' }}>
        <div style={{ position: 'absolute', top: 0, left: -16, width: 36, height: 8, background: '#FF4E00', borderRadius: 2, boxShadow: '0 0 10px rgba(255,78,0,0.6)' }} />
      </div>
    </div>
  );
}

// ── Default ───────────────────────────────────────────────────────────────────
function DefaultIllustration() {
  return (
    <div style={{ ...BASE, background: '#0d0e1a' }}>
      {/* Stars */}
      {[[15,15],[30,8],[50,12],[70,7],[85,16],[20,25],[60,20]].map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 2, height: 2, borderRadius: '50%', background: '#fff', opacity: 0.5 }} />
      ))}
      {/* Horizon */}
      <div style={{ position: 'absolute', top: '55%', left: 0, right: 0, height: 1, background: 'rgba(64,224,208,0.2)' }} />
      {/* Road */}
      <div style={{ position: 'absolute', bottom: 0, left: '40%', right: '40%', top: '55%', background: '#1a1b2e' }} />
    </div>
  );
}

// ── National Park ──────────────────────────────────────────────────────────────
function NationalParkIllustration() {
  return (
    <div style={{ ...BASE, background: '#0a1005' }}>
      {/* Sky */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #060c03 0%, #0e1a08 50%, #1a2a0e 100%)' }} />
      {/* Stars */}
      {[[8,5],[18,10],[30,4],[45,8],[60,5],[72,11],[85,6],[92,15]].map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 1.5, height: 1.5, borderRadius: '50%', background: '#fff', opacity: 0.4 }} />
      ))}
      {/* Mountain peaks */}
      <svg style={{ position: 'absolute', bottom: '25%', left: 0, width: '100%', height: '55%' }} viewBox="0 0 200 100" preserveAspectRatio="none">
        <polygon points="0,100 0,70 30,20 60,65 90,10 120,55 150,25 180,60 200,40 200,100" fill="#0a1505" />
        {/* Snow caps */}
        <polygon points="30,20 22,38 38,38" fill="rgba(240,240,240,0.15)" />
        <polygon points="90,10 82,28 98,28" fill="rgba(240,240,240,0.12)" />
        <polygon points="150,25 143,40 157,40" fill="rgba(240,240,240,0.1)" />
      </svg>
      {/* Tree line */}
      <svg style={{ position: 'absolute', bottom: '20%', left: 0, width: '100%', height: '20%' }} viewBox="0 0 200 40" preserveAspectRatio="none">
        {[5,12,18,25,32,40,48,55,62,70,78,85,92,100,108,115,122,130,138,145,152,160,168,175,182,190].map((x, i) => (
          <polygon key={i} points={`${x},40 ${x-4},20 ${x+4},20`} fill="#0d1a08" />
        ))}
      </svg>
      {/* Ground */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', background: '#111d08' }} />
    </div>
  );
}

// ── Bookstore Crawl ────────────────────────────────────────────────────────────
function BookstoreIllustration() {
  return (
    <div style={{ ...BASE, background: '#0e0a08' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #0a0806 0%, #160e0a 100%)' }} />
      {/* Street */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '16%', background: '#0c0a08' }} />
      {/* Bookshop facades */}
      <svg style={{ position: 'absolute', bottom: '14%', left: 0, width: '100%', height: '65%' }} viewBox="0 0 200 110" preserveAspectRatio="none">
        {/* Shop 1 — charming bookshop */}
        <rect x="5" y="15" width="55" height="95" fill="#160c0a" />
        <rect x="8" y="50" width="49" height="4" fill="#22100c" /> {/* awning */}
        <rect x="15" y="55" width="20" height="28" fill="rgba(180,100,50,0.25)" />
        <rect x="38" y="55" width="12" height="28" fill="rgba(180,100,50,0.2)" />
        {/* Book spines in window */}
        {['#8B0000','#1a4a1a','#4a1a4a','#4a3a00','#1a1a4a'].map((c, i) => (
          <rect key={i} x={16 + i * 4} y={57} width={3} height={20} fill={c} opacity={0.6} />
        ))}
        <rect x="22" y="83" width="14" height="27" fill="#0e0806" /> {/* Door */}
        {/* Sign */}
        <rect x="14" y="20" width="36" height="10" fill="#22100c" />
        {/* Shop 2 */}
        <rect x="63" y="25" width="45" height="85" fill="#1a0e0a" />
        <rect x="66" y="57" width="39" height="4" fill="#241410" />
        <rect x="68" y="62" width="35" height="25" fill="rgba(180,100,50,0.28)" />
        {['#880000','#2a5a2a','#5a2a5a'].map((c, i) => (
          <rect key={i} x={70 + i * 5} y={64} width={4} height={18} fill={c} opacity={0.55} />
        ))}
        <rect x="76" y="87" width="10" height="23" fill="#0e0806" />
        {/* Shop 3 */}
        <rect x="111" y="18" width="50" height="92" fill="#160c0a" />
        <rect x="114" y="52" width="44" height="4" fill="#22100c" />
        <rect x="116" y="57" width="20" height="26" fill="rgba(180,100,50,0.3)" />
        <rect x="139" y="57" width="14" height="26" fill="rgba(180,100,50,0.22)" />
        {['#880000','#1a4a1a','#4a1a4a','#4a3a00'].map((c, i) => (
          <rect key={i} x={117 + i * 4} y={59} width={3} height={18} fill={c} opacity={0.6} />
        ))}
        <rect x="124" y="83" width="12" height="27" fill="#0e0806" />
        {/* Shop 4 */}
        <rect x="164" y="28" width="36" height="82" fill="#1a0e0a" />
        <rect x="167" y="60" width="30" height="3" fill="#241410" />
        <rect x="168" y="64" width="28" height="22" fill="rgba(180,100,50,0.25)" />
        <rect x="174" y="86" width="10" height="24" fill="#0e0806" />
      </svg>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PosterIllustration({ type, style = {} }) {
  let Component;
  switch (type) {
    case 'route66':           Component = Route66Illustration;          break;
    case 'ghostTown':         Component = GhostTownIllustration;        break;
    case 'lighthouse':        Component = LighthouseIllustration;       break;
    case 'ufo':               Component = UfoIllustration;              break;
    case 'authorCountry':     Component = AuthorCountryIllustration;    break;
    case 'literaryLandmark':  Component = LiteraryLandmarksIllustration; break;
    case 'coffeeShop':        Component = CoffeeShopIllustration;       break;
    case 'googie':            Component = GoogieIllustration;           break;
    case 'nationalPark':      Component = NationalParkIllustration;     break;
    case 'bookstore':         Component = BookstoreIllustration;        break;
    default:                  Component = DefaultIllustration;
  }
  return (
    <div style={{ width: '100%', height: '100%', ...style }}>
      <Component />
    </div>
  );
}
