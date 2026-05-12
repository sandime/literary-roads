// PosterIllustrations.jsx — Vintage WPA-style travel poster illustrations.
// All SVG + CSS, no images. API: PosterIllustration({ type, style })

const BASE = { width: '100%', height: '100%', position: 'relative', overflow: 'hidden' };

function GhostTownPoster() {
  return (
    <div style={{ ...BASE, background: 'linear-gradient(180deg, #2a1818 0%, #1a0e0a 60%, #0d0806 100%)' }}>
      <div style={{ position: 'absolute', top: '14%', left: '50%', transform: 'translateX(-50%)',
        width: '36%', aspectRatio: '1', borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 40%, #f4a25e 0%, #d44a1a 55%, #8b1a05 100%)',
        boxShadow: '0 0 40px rgba(220,80,30,0.35)',
      }} />
      {[[10,8],[20,16],[80,10],[88,18],[15,28],[85,30]].map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`,
          width: 2, height: 2, borderRadius: '50%', background: '#f4d4a0', opacity: 0.7 }} />
      ))}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '55%' }}
        viewBox="0 0 200 110" preserveAspectRatio="none">
        <path d="M0,110 L0,80 L40,80 L40,55 L75,55 L75,75 L130,75 L130,45 L165,45 L165,75 L200,75 L200,110 Z"
          fill="#0d0805" />
        <rect x="88" y="28" width="24" height="50" fill="#1a1108" />
        <rect x="92" y="32" width="16" height="16" fill="#0d0805" />
        <line x1="100" y1="36" x2="100" y2="44" stroke="#d44a1a" strokeWidth="1" />
        <line x1="100" y1="40" x2="106" y2="40" stroke="#d44a1a" strokeWidth="1" />
        <polygon points="84,28 116,28 100,18" fill="#1a1108" />
      </svg>
      <div style={{ position: 'absolute', bottom: '8%', left: '12%',
        width: 14, height: 14, borderRadius: '50%',
        border: '1.5px solid rgba(180,120,60,0.4)',
      }} />
    </div>
  );
}

function LighthousePoster() {
  return (
    <div style={{ ...BASE, background: 'linear-gradient(180deg, #1a2530 0%, #0d1820 50%, #050d14 100%)' }}>
      {[[12,10],[28,6],[55,12],[70,7],[88,14]].map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`,
          width: 1.5, height: 1.5, borderRadius: '50%', background: '#f4e4b0', opacity: 0.7 }} />
      ))}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '70%' }}
        viewBox="0 0 200 140" preserveAspectRatio="none">
        <path d="M70,40 L0,0 L0,80 Z" fill="#f4a623" opacity="0.08" />
        <path d="M70,40 L200,10 L200,70 Z" fill="#f4a623" opacity="0.06" />
      </svg>
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '52%' }}
        viewBox="0 0 200 100" preserveAspectRatio="none">
        <path d="M0,100 L0,55 Q40,40 80,45 Q120,50 200,30 L200,100 Z" fill="#0a1218" />
      </svg>
      <svg style={{ position: 'absolute', bottom: '6%', left: 0, width: '100%', height: '20%' }}
        viewBox="0 0 200 30" preserveAspectRatio="none">
        {[8, 16, 24].map((y, i) => (
          <path key={i} d={`M0,${y} Q25,${y-2} 50,${y} T100,${y} T150,${y} T200,${y}`}
            stroke="#40c0c0" strokeWidth="0.6" fill="none" opacity={0.4 - i * 0.1} />
        ))}
      </svg>
      <div style={{ position: 'absolute', bottom: '34%', left: '50%', transform: 'translateX(-50%)',
        width: '11%', aspectRatio: '0.32',
      }}>
        <div style={{ position: 'absolute', top: 0, left: '-20%', right: '-20%',
          height: '14%', background: '#f4a623', borderRadius: '40% 40% 8% 8%',
          boxShadow: '0 0 16px rgba(244,166,35,0.7)',
        }} />
        <div style={{ position: 'absolute', top: '14%', bottom: 0, left: 0, right: 0,
          background: 'repeating-linear-gradient(180deg, #f0e0c8 0 25%, #cc3a2a 25% 50%)',
          border: '1px solid #2a1810',
        }} />
        <div style={{ position: 'absolute', bottom: '-8%', left: '-30%', right: '-30%', height: '14%',
          background: '#2a1810', borderRadius: '4px 4px 0 0',
        }} />
      </div>
    </div>
  );
}

function UfoPoster() {
  return (
    <div style={{ ...BASE, background: 'linear-gradient(180deg, #1a0a30 0%, #0d0820 50%, #050410 100%)' }}>
      {[[8,8],[18,4],[28,12],[42,6],[55,14],[68,4],[80,10],[92,16]].map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`,
          width: 1.5, height: 1.5, borderRadius: '50%', background: '#c8b0ff', opacity: 0.6 }} />
      ))}
      <div style={{ position: 'absolute', top: '8%', right: '10%',
        width: '22%', aspectRatio: '1', borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #d8b8ff 0%, #9b59b6 60%, #5a2a7a 100%)',
        boxShadow: '0 0 20px rgba(155,89,182,0.4)',
      }} />
      <div style={{ position: 'absolute', top: '32%', left: '50%', transform: 'translateX(-50%)' }}>
        <svg width="120" height="48" viewBox="0 0 120 48">
          <ellipse cx="60" cy="24" rx="55" ry="6" fill="#3a3050" />
          <ellipse cx="60" cy="22" rx="45" ry="10" fill="#5a4a78" />
          <ellipse cx="60" cy="14" rx="20" ry="12" fill="rgba(216,184,255,0.5)" stroke="#9b59b6" strokeWidth="1" />
          {[20, 35, 50, 65, 80, 95].map((x, i) => (
            <circle key={i} cx={x} cy="28" r="2" fill="#f4a623" opacity="0.9" />
          ))}
        </svg>
      </div>
      <svg style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translateX(-50%)',
        width: '35%', height: '45%' }}
        viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="40,0 60,0 100,100 0,100" fill="rgba(155,89,182,0.18)" />
        <polygon points="45,0 55,0 80,100 20,100" fill="rgba(216,184,255,0.12)" />
      </svg>
      <svg style={{ position: 'absolute', bottom: '8%', left: 0, width: '100%', height: '32%' }}
        viewBox="0 0 200 60" preserveAspectRatio="none">
        <path d="M30,60 L30,30 M30,38 L20,28 M30,42 L42,32" stroke="#0a0510" strokeWidth="2.5" fill="none" />
        <path d="M170,60 L170,25 M170,32 L158,22 M170,36 L182,26 M170,28 L172,20" stroke="#0a0510" strokeWidth="2.5" fill="none" />
      </svg>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '8%', background: '#0a0510' }} />
    </div>
  );
}

function NationalParkPoster() {
  return (
    <div style={{ ...BASE, background: 'linear-gradient(180deg, #f4c878 0%, #e89a4a 35%, #b8682c 65%, #5a3018 100%)' }}>
      <div style={{ position: 'absolute', top: '14%', right: '20%',
        width: '20%', aspectRatio: '1', borderRadius: '50%',
        background: '#fff0c8', opacity: 0.85,
        boxShadow: '0 0 30px rgba(255,240,200,0.5)',
      }} />
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '70%' }}
        viewBox="0 0 200 120" preserveAspectRatio="none">
        <polygon points="0,120 0,70 30,40 60,65 100,30 140,55 180,40 200,55 200,120" fill="#8a4a28" opacity="0.7" />
        <polygon points="0,120 0,80 25,55 55,75 90,45 125,70 160,55 200,75 200,120" fill="#5a3018" />
        <polygon points="100,30 92,50 108,50" fill="#fff0c8" opacity="0.9" />
        <polygon points="60,65 54,78 66,78" fill="#fff0c8" opacity="0.7" />
        <polygon points="0,120 0,95 20,75 40,90 65,72 95,95 130,80 165,95 200,82 200,120" fill="#1a0c08" />
        {[10, 25, 40, 55, 70, 90, 110, 130, 150, 170, 190].map((x, i) => (
          <polygon key={i} points={`${x},105 ${x-2.5},94 ${x+2.5},94`} fill="#0a0604" />
        ))}
      </svg>
    </div>
  );
}

function CoffeeShopPoster() {
  return (
    <div style={{ ...BASE, background: 'linear-gradient(180deg, #1a0e08 0%, #2a1810 50%, #1a0c06 100%)' }}>
      <div style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
        width: '70%', height: '50%',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(255,180,80,0.4) 0%, transparent 70%)',
      }} />
      <div style={{ position: 'absolute', top: '10%', left: '12%', right: '12%', bottom: '15%',
        background: '#3a2010', border: '2px solid #1a0c06', borderRadius: 4,
      }}>
        <div style={{ position: 'absolute', top: -14, left: 0, right: 0, height: 24,
          background: '#cc3a2a', textAlign: 'center', lineHeight: '24px',
          fontFamily: 'Bungee, sans-serif', fontSize: 9, color: '#f4e4b0',
          letterSpacing: '0.15em',
          border: '1px solid #1a0c06', borderRadius: '2px 2px 0 0',
        }}>CAFÉ</div>
        <div style={{ position: 'absolute', top: 24, left: 14, right: 14, bottom: 28,
          background: 'linear-gradient(180deg, rgba(255,200,120,0.55) 0%, rgba(220,140,60,0.45) 100%)',
          border: '2px solid #1a0c06',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="40%" height="50%" viewBox="0 0 60 50">
            <path d="M10,20 L10,40 Q10,46 16,46 L40,46 Q46,46 46,40 L46,20 Z" fill="#1a0c06" />
            <path d="M46,24 Q56,24 56,32 Q56,40 46,40" stroke="#1a0c06" strokeWidth="2" fill="none" />
            <path d="M22,18 Q24,12 22,6 M28,16 Q30,10 28,4 M34,18 Q36,12 34,6" stroke="rgba(244,228,176,0.6)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: '40%', right: '40%', height: 28,
          background: '#1a0c06', borderRadius: '2px 2px 0 0',
        }} />
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '15%', background: '#0a0604' }} />
    </div>
  );
}

function BookstorePoster() {
  const spines = [
    { c: '#8b1a05', h: 88, t: 'POE' },
    { c: '#0d4a1a', h: 76, t: 'WHARTON' },
    { c: '#1a2a5a', h: 92, t: 'BALDWIN' },
    { c: '#5a1a4a', h: 70, t: 'DIDION' },
    { c: '#b8682c', h: 86, t: 'MORRISON' },
    { c: '#0d3a4a', h: 78, t: 'CARVER' },
    { c: '#5a3018', h: 90, t: 'LEE' },
    { c: '#2a4a1a', h: 72, t: "O'CONNOR" },
  ];
  return (
    <div style={{ ...BASE, background: 'linear-gradient(180deg, #f0e4c8 0%, #d8c8a0 100%)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '20%',
        background: 'linear-gradient(180deg, #f4a623 0%, transparent 100%)', opacity: 0.4 }} />
      <div style={{ position: 'absolute', bottom: '12%', left: '6%', right: '6%', height: '64%',
        background: '#3a1808', border: '2px solid #1a0c04', borderRadius: 2,
        display: 'flex', alignItems: 'flex-end', padding: '0 4px',
      }}>
        {spines.map((s, i) => (
          <div key={i} style={{
            flex: 1, height: `${s.h}%`, background: s.c,
            margin: '0 1.5px',
            borderTop: '1.5px solid rgba(0,0,0,0.4)',
            borderLeft: '1px solid rgba(0,0,0,0.25)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          }}>
            <span style={{
              fontFamily: 'Bungee, sans-serif', fontSize: 7, color: '#f4e4b0',
              letterSpacing: '0.1em', opacity: 0.8, padding: '8px 0',
            }}>{s.t}</span>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12%',
        background: 'repeating-linear-gradient(90deg, #6a3818 0 8px, #5a2810 8px 16px)',
      }} />
    </div>
  );
}

function LiteraryLandmarksPoster() {
  return (
    <div style={{ ...BASE, background: 'linear-gradient(180deg, #1a1410 0%, #0d0a06 100%)' }}>
      <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)',
        width: '70%', height: '60%',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(244,166,35,0.5) 0%, transparent 60%)',
      }} />
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 1, height: '14%', background: '#3a2810' }} />
      <div style={{ position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)',
        width: '20%', aspectRatio: '2',
        background: '#1a0c06', borderRadius: '0 0 50% 50% / 0 0 100% 100%',
        border: '1.5px solid #5a3818',
      }} />
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '14%', aspectRatio: '1', borderRadius: '50%',
        background: 'radial-gradient(circle, #f4d878 0%, #cc8a2a 100%)',
        boxShadow: '0 0 25px rgba(244,166,35,0.6)',
      }} />
      <svg style={{ position: 'absolute', bottom: '20%', left: '15%', width: '70%', height: '40%' }}
        viewBox="0 0 100 60" preserveAspectRatio="xMidYMax meet">
        <rect x="10" y="25" width="80" height="28" rx="2" fill="#cc3a2a" stroke="#5a1808" strokeWidth="1" />
        <rect x="14" y="29" width="72" height="3" fill="#5a1808" />
        <rect x="20" y="14" width="60" height="10" rx="5" fill="#3a1808" stroke="#1a0c04" strokeWidth="1" />
        <rect x="36" y="2" width="28" height="18" fill="#f4e4b0" stroke="#5a3818" strokeWidth="0.5" />
        <line x1="40" y1="8" x2="58" y2="8" stroke="#3a2810" strokeWidth="0.4" />
        <line x1="40" y1="11" x2="60" y2="11" stroke="#3a2810" strokeWidth="0.4" />
        <line x1="40" y1="14" x2="55" y2="14" stroke="#3a2810" strokeWidth="0.4" />
        {[0,1,2].map(row => [...Array(10)].map((_, c) => (
          <circle key={`${row}-${c}`} cx={18 + c * 7.2} cy={36 + row * 5} r="1.6" fill="#1a0c04" />
        )))}
        <rect x="28" y="50" width="44" height="3" rx="1" fill="#1a0c04" />
      </svg>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%',
        background: 'linear-gradient(180deg, #5a3818 0%, #2a1808 100%)' }} />
    </div>
  );
}

function AuthorCountryPoster() {
  return (
    <div style={{ ...BASE, background: 'linear-gradient(180deg, #f4a878 0%, #d8784a 35%, #8a3a1a 70%, #2a1008 100%)' }}>
      <div style={{ position: 'absolute', top: '24%', left: '50%', transform: 'translateX(-50%)',
        width: '24%', aspectRatio: '1', borderRadius: '50%',
        background: 'radial-gradient(circle, #fff0c8 0%, #f4c878 100%)',
        boxShadow: '0 0 20px rgba(255,240,200,0.4)',
      }} />
      <svg style={{ position: 'absolute', top: '14%', left: '12%', width: '30%', height: '8%' }}
        viewBox="0 0 80 20">
        <path d="M5,10 Q8,6 11,10 Q14,6 17,10" stroke="#1a0c04" strokeWidth="1.2" fill="none" />
        <path d="M30,14 Q33,10 36,14 Q39,10 42,14" stroke="#1a0c04" strokeWidth="1" fill="none" />
        <path d="M55,8 Q58,4 61,8 Q64,4 67,8" stroke="#1a0c04" strokeWidth="1" fill="none" />
      </svg>
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '55%' }}
        viewBox="0 0 200 90" preserveAspectRatio="none">
        <path d="M0,90 L0,55 Q40,35 80,45 Q120,55 160,40 Q180,35 200,45 L200,90 Z" fill="#5a2810" />
        <path d="M0,90 L0,70 Q35,55 70,62 Q105,68 140,58 Q170,52 200,62 L200,90 Z" fill="#2a1008" />
      </svg>
      <div style={{ position: 'absolute', bottom: '32%', right: '20%', width: '14%', aspectRatio: '0.4' }}>
        <div style={{ position: 'absolute', bottom: 0, left: '40%', width: '20%', height: '50%',
          background: '#0a0402' }} />
        <div style={{ position: 'absolute', top: 0, left: '15%', width: '70%', height: '60%',
          borderRadius: '50%', background: '#1a0804' }} />
        <div style={{ position: 'absolute', top: '20%', left: 0, width: '50%', height: '50%',
          borderRadius: '50%', background: '#1a0804' }} />
        <div style={{ position: 'absolute', top: '15%', right: 0, width: '55%', height: '55%',
          borderRadius: '50%', background: '#1a0804' }} />
      </div>
    </div>
  );
}

function Route66Poster() {
  return (
    <div style={{ ...BASE, background: 'linear-gradient(180deg, #1a2a4a 0%, #cc3a2a 45%, #f4a623 75%, #5a2010 100%)' }}>
      {[[10,8],[25,4],[40,10],[60,6],[78,12],[92,8]].map(([x, y], i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`,
          width: 1.5, height: 1.5, borderRadius: '50%', background: '#fff', opacity: 0.7 }} />
      ))}
      <svg style={{ position: 'absolute', top: '40%', left: 0, width: '100%', height: '20%' }}
        viewBox="0 0 200 40" preserveAspectRatio="none">
        <polygon points="0,40 0,20 30,8 60,22 90,5 120,18 150,10 180,22 200,12 200,40" fill="#3a1408" opacity="0.85" />
      </svg>
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '45%' }}
        viewBox="0 0 200 90" preserveAspectRatio="none">
        <polygon points="0,90 200,90 115,0 85,0" fill="#1a0c04" />
        <line x1="100" y1="20" x2="100" y2="35" stroke="#f4d878" strokeWidth="1.5" />
        <line x1="100" y1="45" x2="100" y2="62" stroke="#f4d878" strokeWidth="2" />
        <line x1="100" y1="72" x2="100" y2="90" stroke="#f4d878" strokeWidth="2.5" />
      </svg>
      <div style={{ position: 'absolute', top: '36%', left: '50%', transform: 'translateX(-50%)',
        width: '38%', aspectRatio: '0.85',
        background: '#f4e4b0',
        clipPath: 'polygon(50% 0%, 100% 22%, 100% 70%, 50% 100%, 0% 70%, 0% 22%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: '#1a0c04', letterSpacing: '0.1em', marginTop: 8 }}>ROUTE</div>
        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 36, color: '#1a0c04', lineHeight: 0.9 }}>66</div>
      </div>
    </div>
  );
}

function RoadTripPoster() {
  return (
    <div style={{ ...BASE, background: 'linear-gradient(180deg, #f4a878 0%, #f4c878 30%, #40c0c0 65%, #1a4a5a 100%)' }}>
      <div style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
        width: '34%', aspectRatio: '1', borderRadius: '50%',
        background: 'radial-gradient(circle, #fff0c8 0%, #f4c878 80%)',
      }} />
      <div style={{ position: 'absolute', top: '36%', left: 0, right: 0, height: 2,
        background: '#f4a878', opacity: 0.6 }} />
      <svg style={{ position: 'absolute', bottom: '20%', left: 0, width: '100%', height: '35%' }}
        viewBox="0 0 200 70" preserveAspectRatio="none">
        <path d="M0,70 L0,30 Q40,15 80,25 Q120,35 160,15 Q180,8 200,18 L200,70 Z" fill="#5a3018" />
      </svg>
      <div style={{ position: 'absolute', bottom: '8%', left: 0, right: 0, height: '14%',
        background: '#1a4a5a' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12%',
        background: '#1a0c04' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2,
          background: 'repeating-linear-gradient(90deg, #f4d878 0 18px, transparent 18px 36px)' }} />
      </div>
      <svg style={{ position: 'absolute', bottom: '8%', left: '15%', width: '50%', height: '12%' }}
        viewBox="0 0 100 24" preserveAspectRatio="xMidYMax meet">
        <path d="M5,18 Q8,10 18,10 L40,10 L48,4 L70,4 L75,10 L90,10 Q95,10 95,18 L95,20 L5,20 Z" fill="#0a0402" />
        <circle cx="22" cy="20" r="4" fill="#0a0402" stroke="#3a2810" strokeWidth="1" />
        <circle cx="78" cy="20" r="4" fill="#0a0402" stroke="#3a2810" strokeWidth="1" />
      </svg>
    </div>
  );
}

function GoogieIllustration() {
  return (
    <div style={{ ...BASE, background: '#0d0c14' }}>
      <svg style={{ position: 'absolute', top: '10%', left: '-5%', width: '70%', height: '50%', opacity: 0.12 }} viewBox="0 0 140 100">
        <path d="M0,80 Q40,-20 140,10 Q100,30 60,90 Z" fill="#FF4E00" />
      </svg>
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
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%', background: '#0a0910' }} />
      <svg style={{ position: 'absolute', bottom: '18%', left: '5%', width: '70%', height: '45%' }} viewBox="0 0 140 80" preserveAspectRatio="none">
        <path d="M0,80 L0,50 Q30,20 70,35 Q100,45 140,15 L140,80 Z" fill="#13111c" />
      </svg>
      <div style={{ position: 'absolute', bottom: '18%', right: '22%', width: 3, height: '25%', background: '#1a1820' }}>
        <div style={{ position: 'absolute', top: 0, left: -16, width: 36, height: 8, background: '#FF4E00', borderRadius: 2, boxShadow: '0 0 10px rgba(255,78,0,0.6)' }} />
      </div>
    </div>
  );
}

function DefaultPoster() {
  return (
    <div style={{ ...BASE, background: 'linear-gradient(180deg, #1a2030 0%, #0d1018 100%)' }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(64,224,208,0.15) 0%, transparent 70%)' }} />
    </div>
  );
}

export default function PosterIllustration({ type, style = {} }) {
  let Component;
  switch (type) {
    case 'route66':           Component = Route66Poster;             break;
    case 'roadTrip':          Component = RoadTripPoster;            break;
    case 'ghostTown':         Component = GhostTownPoster;           break;
    case 'lighthouse':        Component = LighthousePoster;          break;
    case 'ufo':               Component = UfoPoster;                 break;
    case 'authorCountry':     Component = AuthorCountryPoster;       break;
    case 'literaryLandmark':  Component = LiteraryLandmarksPoster;   break;
    case 'coffeeShop':        Component = CoffeeShopPoster;          break;
    case 'googie':            Component = GoogieIllustration;        break;
    case 'nationalPark':      Component = NationalParkPoster;        break;
    case 'bookstore':         Component = BookstorePoster;           break;
    default:                  Component = DefaultPoster;
  }
  return (
    <div style={{ width: '100%', height: '100%', ...style }}>
      <Component />
    </div>
  );
}
