// Trading Post — shared UI primitives
// Paper-mode surface: warm cream, ink-dark outlines, vintage accents.

export const TP = {
  paper:       '#F5EBD6',
  paper2:      '#EADFC4',
  paper3:      '#FFF8E6',
  paperEdge:   '#D9CBA8',
  ink:         '#1B1F2A',
  ink2:        '#2A2F3D',
  inkSoft:     '#45495A',
  inkMute:     '#6F7388',
  line2:       '#C7BB9E',
  wood1:       '#C57A4C',
  wood2:       '#A85B2E',
  wood3:       '#7E4424',
  wood4:       '#4A2410',
  twine:       '#8a6a3a',
  mustard:     '#F2C744',
  mustardDeep: '#C99820',
  teal:        '#34B7AE',
  plum:        '#8E5A86',
  terracotta:  '#B96A3E',
  signGreen:   '#2F5A3E',
  signGreenDk: '#1F3F2A',
  postRed:     '#B5483A',
};

export function PaperTexture({ opacity = 0.06 }) {
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', opacity,
      backgroundImage: [
        'radial-gradient(circle at 12% 18%, #6b4a20 0.6px, transparent 1.2px)',
        'radial-gradient(circle at 78% 42%, #6b4a20 0.5px, transparent 1.2px)',
        'radial-gradient(circle at 36% 78%, #6b4a20 0.5px, transparent 1.2px)',
        'radial-gradient(circle at 88% 88%, #6b4a20 0.4px, transparent 1.2px)',
      ].join(', '),
      backgroundSize: '120px 140px, 90px 110px, 160px 130px, 70px 90px',
      mixBlendMode: 'multiply',
    }} />
  );
}

export function Squiggle({ width = 60, color = TP.wood3, style }) {
  return (
    <svg width={width} height={10} viewBox="0 0 60 10" style={style} aria-hidden>
      <path d="M2 5 Q 8 1, 14 5 T 26 5 T 38 5 T 50 5 T 58 5"
        fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export function StarOrn({ size = 10, color = TP.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden>
      <path d="M5 0 L5.6 4.4 L10 5 L5.6 5.6 L5 10 L4.4 5.6 L0 5 L4.4 4.4 Z" fill={color} />
    </svg>
  );
}

export function WoodenSign({ children, sub, width = '100%', rope = false, tilt = 0 }) {
  return (
    <div style={{ position: 'relative', width, transform: `rotate(${tilt}deg)`, paddingTop: rope ? 22 : 0 }}>
      {rope && (
        <svg viewBox="0 0 200 22" preserveAspectRatio="none" style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', width: '80%', height: 22,
        }} aria-hidden>
          <path d="M0 2 Q 100 28, 200 2" fill="none" stroke={TP.twine} strokeWidth="2" strokeDasharray="3 2" />
        </svg>
      )}
      <div style={{
        position: 'relative',
        background: [
          'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(74,36,16,0.55) 96%)',
          'repeating-linear-gradient(90deg, rgba(74,36,16,0.0) 0, rgba(74,36,16,0.0) 14px, rgba(74,36,16,0.18) 14px, rgba(74,36,16,0.18) 15px, rgba(74,36,16,0.0) 15px, rgba(74,36,16,0.0) 28px, rgba(74,36,16,0.10) 28px, rgba(74,36,16,0.10) 29px)',
          'linear-gradient(180deg, #B16A38 0%, #9C5226 50%, #7E4424 100%)',
        ].join(', '),
        borderRadius: 4,
        padding: '14px 22px 16px',
        boxShadow: [
          'inset 0 0 0 1.5px rgba(74,36,16,0.85)',
          'inset 0 2px 0 rgba(255,220,180,0.15)',
          'inset 0 -3px 0 rgba(74,36,16,0.5)',
          '0 2px 0 rgba(27,31,42,0.18)',
          '0 6px 14px rgba(27,31,42,0.22)',
        ].join(', '),
        clipPath: 'polygon(2% 0, 98% 4%, 100% 30%, 99% 70%, 100% 96%, 98% 100%, 2% 100%, 0 96%, 1% 70%, 0 30%, 2% 4%)',
      }}>
        <span style={{ position:'absolute', top: 6, left: 10, width: 6, height: 6, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #b9a890, #3a2218 70%)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.4)' }} />
        <span style={{ position:'absolute', top: 6, right: 10, width: 6, height: 6, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #b9a890, #3a2218 70%)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.4)' }} />
        <div style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 26, lineHeight: 0.95, color: '#2a1408',
          letterSpacing: '0.02em',
          textShadow: ['0 1px 0 rgba(255,220,180,0.35)', '0 -1px 0 rgba(40,15,5,0.65)', '0 0 5px rgba(40,15,5,0.45)'].join(', '),
          textAlign: 'center', fontStyle: 'italic',
        }}>{children}</div>
        {sub && (
          <div style={{
            fontFamily: '"IM Fell English SC", serif',
            fontSize: 10, color: '#3a1d0c', letterSpacing: '0.18em',
            textAlign: 'center', marginTop: 4, opacity: 0.85,
          }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

export function MileageMarker({ price, scale = 1, tilt = 0, label = 'TAKE IT HOME' }) {
  const w = 70 * scale, h = 70 * scale;
  return (
    <div style={{ width: w, height: h, transform: `rotate(${tilt}deg)`, position: 'relative', flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: TP.signGreen,
        border: `3px solid ${TP.paper3}`,
        borderRadius: 4,
        boxShadow: [`0 0 0 2px ${TP.signGreenDk}`, '2px 3px 0 rgba(27,31,42,0.4)'].join(', '),
        padding: '4px 6px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 8 * scale, color: TP.paper3, letterSpacing: '0.18em', fontWeight: 600 }}>EXIT</div>
        <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 26 * scale, color: TP.paper3, lineHeight: 0.95, letterSpacing: '-0.02em', marginTop: 1 }}>{price}</div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 7 * scale, color: TP.paper3, letterSpacing: '0.14em', opacity: 0.85, marginTop: 1 }}>{label}</div>
      </div>
    </div>
  );
}

export function DiamondMarker({ text, scale = 1, tilt = 0 }) {
  const s = 64 * scale;
  return (
    <div style={{
      width: s, height: s, transform: `rotate(${45 + tilt}deg)`,
      background: TP.mustard, border: `3px solid ${TP.ink}`,
      boxShadow: '2px 3px 0 rgba(27,31,42,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        transform: 'rotate(-45deg)',
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 10 * scale, color: TP.ink, fontWeight: 700,
        letterSpacing: '0.06em', textAlign: 'center', lineHeight: 1.05,
      }}>{text}</div>
    </div>
  );
}

export function Stamp({ children, tilt = -6, color = TP.mustard, ink = TP.ink }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 8px',
      background: color,
      border: `1.5px solid ${ink}`,
      transform: `rotate(${tilt}deg)`,
      fontFamily: '"IM Fell English SC", serif',
      fontSize: 9, letterSpacing: '0.16em', color: ink,
      boxShadow: `2px 2px 0 ${ink}`,
    }}>{children}</div>
  );
}

function BookmarkPreview({ accent }) {
  return (
    <div style={{
      width: 26, height: '78%', background: accent,
      border: `1.2px solid ${TP.ink}`, borderRadius: '2px 2px 0 0',
      position: 'relative', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 4px',
    }}>
      <span style={{ width: 14, height: 14, background: TP.mustard,
        clipPath: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 100%,50% 75%,21% 100%,32% 57%,2% 35%,39% 35%)',
        border: `1px solid ${TP.ink}` }} />
      <span style={{ width: 12, height: 1.5, background: TP.paper3, opacity: 0.6 }} />
      <span style={{ width: 12, height: 1.5, background: TP.paper3, opacity: 0.6 }} />
      <span style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 6, color: TP.paper3,
        letterSpacing: '0.1em', writingMode: 'vertical-rl', transform:'rotate(180deg)' }}>LITERARY ROADS</span>
      <span style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
        width: 4, height: 12, background: TP.mustard, borderLeft: `1px solid ${TP.ink}`, borderRight: `1px solid ${TP.ink}` }} />
    </div>
  );
}

function StickerPreview({ accent }) {
  return (
    <div style={{
      width: 60, height: 60, borderRadius: '50%', background: accent,
      border: `1.8px dashed ${TP.paper3}`, boxShadow: `0 0 0 1.5px ${TP.ink}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 9, color: TP.paper3, letterSpacing: '0.12em', textAlign: 'center', lineHeight: 1 }}>L·R</span>
    </div>
  );
}

function JournalPreview({ accent }) {
  return (
    <div style={{
      width: 50, height: 70, background: accent,
      border: `1.5px solid ${TP.ink}`, borderRadius: '2px 4px 4px 2px',
      position: 'relative', boxShadow: 'inset 4px 0 0 rgba(0,0,0,0.18)',
    }}>
      <div style={{ position: 'absolute', top: 12, left: 14, right: 6, height: 1.5, background: TP.paper3, opacity: 0.7 }} />
      <div style={{ position: 'absolute', top: 18, left: 14, right: 6, height: 1.5, background: TP.paper3, opacity: 0.7 }} />
      <div style={{ position: 'absolute', top: 36, left: 14, right: 12, bottom: 12,
        border: `1px solid ${TP.paper3}`, opacity: 0.8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 6, color: TP.paper3, letterSpacing: '0.08em', opacity: 0.9 }}>L·R</span>
      </div>
    </div>
  );
}

export function LuggageTag({ title, subtitle, price, swatch, tilt = -1, accent = TP.terracotta, scale = 1, kind = 'bookmark' }) {
  const w = 160 * scale, h = 220 * scale;
  return (
    <div style={{ width: w, height: h, position: 'relative', transform: `rotate(${tilt}deg)` }}>
      <svg viewBox="0 0 160 30" style={{ position: 'absolute', top: -12, left: w/2 - 50, width: 100, height: 28, zIndex: 2 }} aria-hidden>
        <path d="M10 22 Q 50 -4, 90 22" fill="none" stroke={TP.twine} strokeWidth="1.8" strokeDasharray="3 2" strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        background: swatch || TP.paper3,
        border: `1.5px solid ${TP.ink}`,
        boxShadow: `3px 3px 0 ${TP.ink}, 0 8px 18px rgba(27,31,42,0.18)`,
        clipPath: 'polygon(0 14%, 50% 0, 100% 14%, 100% 100%, 0 100%)',
        padding: '32px 14px 14px',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ position: 'absolute', top: 26, left: 12, right: 12, height: 1, borderTop: `1px dashed ${TP.inkMute}`, opacity: 0.45 }} />
        <div style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          background: `repeating-linear-gradient(135deg, ${TP.paper2} 0, ${TP.paper2} 6px, ${TP.paper} 6px, ${TP.paper} 12px)`,
          border: `1px solid ${TP.ink}`, borderRadius: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {kind === 'bookmark' && <BookmarkPreview accent={accent} />}
          {kind === 'sticker'  && <StickerPreview  accent={accent} />}
          {kind === 'journal'  && <JournalPreview  accent={accent} />}
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 9, color: TP.inkSoft, letterSpacing: '0.14em' }}>FROM · THE TRADING POST</div>
          <div style={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: 15, lineHeight: 1.1, color: TP.ink, marginTop: 2 }}>{title}</div>
          {subtitle && <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: TP.inkMute, marginTop: 2, letterSpacing: '0.04em' }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 6, left: w/2 - 8, width: 16, height: 16, zIndex: 3,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #f5e0a8, #b6892f 60%, #6f4a14 100%)',
        boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.4), 0 1px 0 rgba(0,0,0,0.3)',
        border: `1.5px solid ${TP.ink}`,
      }}>
        <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: TP.paper3, border: `1px solid ${TP.ink}` }} />
      </div>
      <div style={{ position: 'absolute', bottom: -10, right: -8, zIndex: 4 }}>
        <MileageMarker price={price} scale={0.6} tilt={-4} label="MI · $" />
      </div>
    </div>
  );
}

export function Postcard({ title, kind = 'sticker', price, accent = TP.teal, stamp = '4¢', stampColor = TP.postRed, tilt = 0, scale = 1 }) {
  const w = 200 * scale, h = 140 * scale;
  return (
    <div style={{ width: w, height: h, position: 'relative', transform: `rotate(${tilt}deg)` }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: TP.paper3,
        border: `1.5px solid ${TP.ink}`,
        boxShadow: `3px 3px 0 ${TP.ink}, 0 8px 18px rgba(27,31,42,0.18)`,
        display: 'flex',
      }}>
        <div style={{
          width: '46%', position: 'relative', background: accent,
          borderRight: `1.5px dashed ${TP.ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {kind === 'sticker'  && <StickerPreview  accent={accent} />}
          {kind === 'journal'  && <JournalPreview  accent={accent} />}
          {kind === 'bookmark' && <BookmarkPreview accent={accent} />}
          <svg viewBox="0 0 60 24" style={{ position: 'absolute', top: 6, left: 6, width: 60, height: 24, opacity: 0.55 }} aria-hidden>
            <path d="M2 12 Q 8 4, 14 12 T 26 12 T 38 12 T 50 12 T 58 12" fill="none" stroke={TP.ink} strokeWidth="0.8" />
            <path d="M2 16 Q 8 8, 14 16 T 26 16 T 38 16 T 50 16 T 58 16" fill="none" stroke={TP.ink} strokeWidth="0.8" />
          </svg>
        </div>
        <div style={{ flex: 1, position: 'relative', padding: '8px 10px' }}>
          <div style={{
            position: 'absolute', top: 6, right: 6, width: 30, height: 36,
            background: stampColor, border: `1.5px solid ${TP.paper3}`,
            boxShadow: `0 0 0 1.5px ${TP.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: 'rotate(4deg)',
          }}>
            <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 13, color: TP.paper3, lineHeight: 1 }}>{stamp}</span>
          </div>
          <div style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 8, color: TP.inkMute, letterSpacing: '0.16em' }}>POST · CARD</div>
          <div style={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: 14, lineHeight: 1.1, marginTop: 4, color: TP.ink, maxWidth: '80%' }}>{title}</div>
          <div style={{ position: 'absolute', left: 10, right: 10, bottom: 36, display:'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ height: 1, background: TP.inkMute, opacity: 0.35 }} />
            <div style={{ height: 1, background: TP.inkMute, opacity: 0.35 }} />
            <div style={{ height: 1, background: TP.inkMute, opacity: 0.35, width: '70%' }} />
          </div>
          <div style={{ position: 'absolute', right: -10, bottom: -10 }}>
            <MileageMarker price={price} scale={0.52} tilt={-5} label="MI · $" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SatchelButton({ count = 0, onTap, pulse = false }) {
  return (
    <button onClick={onTap} aria-label={`Satchel — ${count} item${count !== 1 ? 's' : ''}`} style={{
      position: 'relative', background: 'transparent', border: 'none',
      cursor: 'pointer', padding: 0, width: 56, height: 44,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    }}>
      <svg viewBox="0 0 56 44" width={56} height={44} aria-hidden
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
        <path d="M10 30 Q 10 6, 28 6 Q 46 6, 46 30" fill="none" stroke={TP.wood3} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M10 30 Q 10 6, 28 6 Q 46 6, 46 30" fill="none" stroke={TP.ink} strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
      </svg>
      <div style={{
        position: 'absolute', bottom: 0, left: 6, width: 44, height: 30,
        background: `linear-gradient(180deg, ${TP.wood1} 0%, ${TP.wood2} 60%, ${TP.wood3} 100%)`,
        border: `1.5px solid ${TP.ink}`, borderRadius: '4px 4px 6px 6px',
        boxShadow: `inset 0 -2px 0 rgba(74,36,16,0.5), 2px 2px 0 rgba(27,31,42,0.25)`,
      }}>
        <div style={{
          position: 'absolute', top: -2, left: -1, right: -1, height: 14,
          background: `linear-gradient(180deg, ${TP.wood2}, ${TP.wood3})`,
          border: `1.5px solid ${TP.ink}`, borderRadius: '4px 4px 8px 8px',
        }}>
          <span style={{
            position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
            width: 8, height: 6, borderRadius: 1.5,
            background: 'linear-gradient(180deg, #f5e0a8, #b6892f)', border: `1px solid ${TP.ink}`,
          }} />
        </div>
        <div style={{ position: 'absolute', left: 4, right: 4, bottom: 6, height: 1, borderTop: `1px dashed rgba(74,36,16,0.55)` }} />
      </div>
      {count > 0 && (
        <div style={{
          position: 'absolute', top: -2, right: -4, zIndex: 3,
          background: TP.mustard, border: `1.5px solid ${TP.ink}`,
          boxShadow: `1.5px 1.5px 0 ${TP.ink}`,
          padding: '1px 6px', minWidth: 18,
          transform: `rotate(${pulse ? -10 : -6}deg)`,
          fontFamily: '"DM Serif Display", serif',
          fontSize: 13, color: TP.ink, lineHeight: 1,
          transition: 'transform 240ms cubic-bezier(.34,1.56,.64,1)',
        }}>{count}</div>
      )}
    </button>
  );
}

export function AddToSatchelChip({ qty = 0, onAdd, onInc, onDec }) {
  if (qty === 0) {
    return (
      <button onClick={onAdd} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px 5px 18px',
        background: TP.paper3, border: `1.5px solid ${TP.ink}`,
        boxShadow: `2px 2px 0 ${TP.ink}`,
        clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 8px 100%, 0 50%)',
        cursor: 'pointer',
        fontFamily: '"IM Fell English SC", serif',
        fontSize: 11, letterSpacing: '0.18em', color: TP.ink,
        position: 'relative',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
      }}
        onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = 'none'; }}
        onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `2px 2px 0 ${TP.ink}`; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `2px 2px 0 ${TP.ink}`; }}>
        <span aria-hidden style={{
          position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
          width: 4, height: 4, borderRadius: '50%', background: TP.paper, border: `1px solid ${TP.ink}`,
        }} />
        <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 14, lineHeight: 1 }}>+</span>
        ADD
      </button>
    );
  }
  const btn = { width: 26, height: 26, background: TP.paper3, border: 'none', fontFamily: '"DM Serif Display", serif', fontSize: 16, color: TP.ink, cursor: 'pointer', lineHeight: 1, padding: 0 };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'stretch',
      background: TP.paper3, border: `1.5px solid ${TP.ink}`,
      boxShadow: `2px 2px 0 ${TP.ink}`, height: 26,
      position: 'relative', paddingLeft: 10,
      clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 8px 100%, 0 50%)',
    }}>
      <span aria-hidden style={{
        position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
        width: 4, height: 4, borderRadius: '50%', background: TP.paper, border: `1px solid ${TP.ink}`,
      }} />
      <button onClick={onDec} aria-label="Decrease quantity" style={btn}>−</button>
      <div role="status" aria-live="polite" style={{
        minWidth: 26, padding: '0 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: TP.ink, fontWeight: 600,
        borderLeft: `1px dotted ${TP.ink}`, borderRight: `1px dotted ${TP.ink}`,
      }}>{qty}</div>
      <button onClick={onInc} aria-label="Increase quantity" style={btn}>+</button>
    </div>
  );
}

export function ShopHeader({ sub, onBack, cartCount = 0, cartPulse = false, onCart }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 14px 10px', position: 'relative',
      background: TP.paper3, borderBottom: `1px solid ${TP.line2}`,
    }}>
      <button onClick={onBack} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 0, display: 'flex', alignItems: 'center', gap: 4,
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 12, color: TP.ink, letterSpacing: '0.04em',
      }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>←</span> Back
      </button>
      <div style={{ textAlign: 'center', flex: 1 }}>
        <div style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 9, letterSpacing: '0.22em', color: TP.inkSoft }}>
          {sub || '✦ EST. 2026 ✦'}
        </div>
      </div>
      <SatchelButton count={cartCount} pulse={cartPulse} onTap={onCart} />
    </div>
  );
}

export function ReceiptLine({ qty, name, sub, price }) {
  return (
    <div style={{ padding: '10px 0', borderTop: `1px dotted ${TP.ink}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 28, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: TP.inkSoft }}>
          {String(qty).padStart(2,'0')}×
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: 14, color: TP.ink, lineHeight: 1.2 }}>{name}</div>
          {sub && <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: TP.inkMute, marginTop: 2, letterSpacing: '0.04em' }}>{sub}</div>}
        </div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: TP.ink, minWidth: 50, textAlign: 'right', fontWeight: 500 }}>
          ${price.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

export function FieldRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 10, letterSpacing: '0.16em', color: TP.inkSoft }}>{label}</span>
      <span style={{ fontFamily: mono ? '"JetBrains Mono", monospace' : '"Fraunces", serif', fontSize: mono ? 11 : 13, color: TP.ink }}>{value}</span>
    </div>
  );
}
