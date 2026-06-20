import { useNavigate } from 'react-router-dom';

const BASE = import.meta.env.BASE_URL;

const C = {
  navy:     '#10162B',
  navy2:    '#0A0F20',
  navy3:    '#1A2342',
  navyLine: '#2A335A',
  cream:    '#FBF3DF',
  cream2:   '#E7D9B6',
  muted:    '#8C93B5',
  cyan:     '#39E0D6',
  pink:     '#F23D8E',
  orange:   '#F5812A',
  mustard:  '#F4C740',
  ink:      '#11141F',
};

const CHECKLIST_URL = `${BASE}checklist-print.html`;

const PRINTABLES = [
  {
    id: 'road-trip-checklist',
    kicker: 'Checklist',
    title: 'Road Trip Checklist',
    description: 'Pack the car, pack the books. A fold-and-go, one-page checklist for the literary road trip — gas and gear, your current read, and the stops worth making.',
    thumb: `${BASE}images/thumb-checklist.png`,
    format: { label: 'PDF', pages: 1, aspect: '8.5 × 11' },
    flags: ['new', 'print-friendly b&w'],
    accent: C.orange,
    pdfUrl: CHECKLIST_URL + '?print=1',
    previewUrl: CHECKLIST_URL,
  },
];

function Diamond({ color = C.pink, size = 8 }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size * 1.75,
      background: color,
      clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
      boxShadow: `0 0 8px ${color}99`,
      flexShrink: 0,
    }} />
  );
}

function PrintableCard({ item }) {
  return (
    <article style={{
      display: 'flex', gap: 18, alignItems: 'stretch',
      background: `linear-gradient(180deg, ${C.navy3} 0%, #141C36 100%)`,
      border: `1px solid ${C.navyLine}`,
      borderRadius: 16, padding: 16,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* accent spine */}
      <span style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: item.accent,
        boxShadow: `0 0 12px ${item.accent}80`,
      }} />

      {/* thumbnail */}
      <div style={{
        flexShrink: 0, width: 96,
        borderRadius: 7, overflow: 'hidden',
        border: `2px solid ${C.ink}`,
        boxShadow: `3px 3px 0 rgba(0,0,0,.5)`,
        background: '#FBF3DF',
        position: 'relative',
        alignSelf: 'stretch',
      }}>
        <img src={item.thumb} alt={item.title + ' preview'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
        <span style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: C.navy, color: C.cream,
          fontFamily: 'var(--hs-mono)', fontSize: 8, letterSpacing: '0.14em',
          textTransform: 'uppercase', textAlign: 'center', padding: '3px 0',
        }}>{item.format.aspect}</span>
      </div>

      {/* body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--hs-mono)', fontSize: 9.5, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: item.accent, marginBottom: 6,
        }}>{item.kicker}</div>
        <h3 style={{
          fontFamily: 'var(--hs-display)', fontWeight: 400,
          fontSize: 24, lineHeight: 1, margin: '0 0 7px', color: C.cream,
        }}>{item.title}</h3>
        <p style={{
          fontFamily: 'var(--hs-serif)', fontSize: 13.5, lineHeight: 1.42,
          color: C.cream2, margin: '0 0 11px', maxWidth: '42ch',
        }}>{item.description}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 'auto' }}>
          {item.flags.map(f => (
            <span key={f} style={f === 'new' ? {
              fontFamily: 'var(--hs-mono)', fontSize: 9.5, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: C.navy, background: C.cyan,
              borderColor: C.cyan, border: `1px solid ${C.cyan}`,
              borderRadius: 999, padding: '4px 10px',
              boxShadow: `0 0 10px ${C.cyan}66`, fontWeight: 700,
            } : {
              fontFamily: 'var(--hs-mono)', fontSize: 9.5, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: C.muted,
              border: `1px solid ${C.navyLine}`, borderRadius: 999, padding: '4px 10px',
            }}>{f}</span>
          ))}
        </div>
      </div>

      {/* actions */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
        <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" style={{
          fontFamily: 'var(--hs-sans)', fontWeight: 700, fontSize: 12.5,
          letterSpacing: '0.04em', textDecoration: 'none', whiteSpace: 'nowrap',
          padding: '11px 16px', borderRadius: 999, textAlign: 'center',
          border: `2px solid ${C.ink}`, cursor: 'pointer',
          background: C.mustard, color: C.navy,
          boxShadow: `3px 3px 0 ${C.ink}`,
        }}>Download PDF</a>
        <a href={item.previewUrl} target="_blank" rel="noopener noreferrer" style={{
          fontFamily: 'var(--hs-sans)', fontWeight: 700, fontSize: 12.5,
          letterSpacing: '0.04em', textDecoration: 'none', whiteSpace: 'nowrap',
          padding: '11px 16px', borderRadius: 999, textAlign: 'center',
          border: `2px solid ${C.navyLine}`, cursor: 'pointer',
          background: 'transparent', color: C.cream,
        }}>Preview</a>
      </div>
    </article>
  );
}

export default function Goodies({ onBack }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(120% 80% at 50% -10%, #1A2342 0%, #10162B 46%, #0A0F20 100%)`,
      color: C.cream,
      fontFamily: 'var(--hs-sans)',
      WebkitFontSmoothing: 'antialiased',
      position: 'relative',
      overflowY: 'auto',
    }}>
      {/* sunburst watermark */}
      <div aria-hidden="true" style={{
        position: 'fixed', top: '4%', left: '50%', transform: 'translateX(-50%)',
        width: 760, height: 760, opacity: 0.05, pointerEvents: 'none', zIndex: 0,
        background: `repeating-conic-gradient(from 0deg, ${C.cyan} 0deg 1.4deg, transparent 1.4deg 9deg)`,
        borderRadius: '50%',
        WebkitMask: 'radial-gradient(circle, transparent 60px, #000 61px)',
        mask: 'radial-gradient(circle, transparent 60px, #000 61px)',
      }} />

      {/* back nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: `${C.navy}f0`, borderBottom: `1px solid ${C.navyLine}`,
        backdropFilter: 'blur(12px)', padding: '0 16px',
        height: 52, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={handleBack} style={{
          background: 'transparent', border: 'none', color: C.cyan, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          fontFamily: 'var(--hs-mono)', fontSize: 11, letterSpacing: '0.08em',
          padding: '6px 8px', borderRadius: 6,
        }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          BACK
        </button>
      </div>

      {/* main content */}
      <main style={{
        position: 'relative', zIndex: 2,
        maxWidth: 760, margin: '0 auto',
        padding: 'clamp(24px, 4vw, 40px) clamp(14px, 4vw, 24px) 64px',
      }}>

        {/* header */}
        <header style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{
            fontFamily: 'var(--hs-mono)', fontSize: 10.5, letterSpacing: '0.3em',
            textTransform: 'uppercase', color: C.cyan, marginBottom: 16, opacity: 0.9,
          }}>&#10022; Literary Roads Radio · Highway Snacks</div>

          <h1 style={{
            fontFamily: 'var(--hs-display)', fontSize: 'clamp(42px, 8vw, 60px)',
            lineHeight: 0.96, margin: 0, color: C.mustard, letterSpacing: '0.01em',
            textShadow: `0 0 10px rgba(244,199,64,.45), 0 0 26px rgba(244,199,64,.28)`,
          }}>
            DJ Cat<span style={{ color: C.cream, WebkitTextFillColor: C.cream, textShadow: 'none' }}>&rsquo;</span>s Goodies
          </h1>

          <div style={{
            fontFamily: 'var(--hs-serif)', fontStyle: 'italic', fontSize: 18,
            color: C.cream2, marginTop: 14,
          }}>Free printables for the road.</div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            margin: '22px auto 0', maxWidth: 320,
          }}>
            <span style={{ height: 1.5, flex: 1, background: `linear-gradient(90deg, transparent, ${C.navyLine})` }} />
            <Diamond color={C.pink} size={8} />
            <span style={{ height: 1.5, flex: 1, background: `linear-gradient(90deg, ${C.navyLine}, transparent)` }} />
          </div>
        </header>

        {/* list head */}
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          margin: '0 2px 14px',
        }}>
          <span style={{ fontFamily: 'var(--hs-nameplate)', fontSize: 17, letterSpacing: '0.04em', color: C.cream }}>
            The Rack
          </span>
          <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted }}>
            {PRINTABLES.length} printable · more on the way
          </span>
        </div>

        {/* printable cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PRINTABLES.map(item => <PrintableCard key={item.id} item={item} />)}

          {/* future slot */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center',
            border: `2px dashed ${C.navyLine}`, borderRadius: 16,
            padding: 22, color: C.muted,
            background: 'rgba(26,35,66,.25)',
          }}>
            <span style={{
              width: 30, height: 30, borderRadius: '50%', border: `2px solid ${C.navyLine}`,
              display: 'grid', placeItems: 'center', fontSize: 20, lineHeight: 1,
              color: C.muted, fontFamily: 'var(--hs-sans)', flexShrink: 0,
            }}>+</span>
            <span style={{ fontFamily: 'var(--hs-serif)', fontStyle: 'italic', fontSize: 14 }}>
              <strong style={{ fontStyle: 'normal', fontFamily: 'var(--hs-nameplate)', color: C.cream2, fontWeight: 400, letterSpacing: '0.03em' }}>
                More goodies on the way.
              </strong>{' '}
              New printables drop right here.
            </span>
          </div>
        </div>

        {/* footer */}
        <div style={{
          textAlign: 'center', marginTop: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          color: C.muted,
        }}>
          <img src={`${BASE}images/star-cat-mark.png`} alt=""
            style={{ width: 30, height: 30, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.5))' }} />
          <span style={{ fontFamily: 'var(--hs-nameplate)', fontSize: 14, letterSpacing: '0.08em', color: C.cream2 }}>
            Highway Snacks
          </span>
          <span style={{ fontFamily: 'var(--hs-mono)', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            A Literary Roads roadside attraction
          </span>
        </div>
      </main>
    </div>
  );
}
