// The Trading Post — product detail page (a bookmark)
// Big luggage tag hung from twine, mileage marker price, materials, qty stepper, "Add to satchel"

function ColorChip({ color, label, on }) {
  return (
    <button style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 8px 5px 5px',
      background: TP.paper3,
      border: `1.5px solid ${TP.ink}`,
      boxShadow: on ? `2px 2px 0 ${TP.ink}` : 'none',
      transform: on ? 'translate(-1px,-1px)' : 'none',
      cursor: 'pointer',
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: 11, color: TP.ink, letterSpacing: '0.02em',
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        background: color, border: `1.5px solid ${TP.ink}`,
      }} />
      {label}
    </button>
  );
}

function QtyStepper({ qty = 1 }) {
  const btn = {
    width: 32, height: 32, background: TP.paper3,
    border: `1.5px solid ${TP.ink}`,
    fontFamily: '"DM Serif Display", serif', fontSize: 18,
    color: TP.ink, cursor: 'pointer', lineHeight: 1,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', boxShadow: `2px 2px 0 ${TP.ink}` }}>
      <button style={btn}>−</button>
      <div style={{
        minWidth: 44, padding: '0 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: TP.paper3,
        borderTop: `1.5px solid ${TP.ink}`, borderBottom: `1.5px solid ${TP.ink}`,
        fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: TP.ink,
      }}>{qty.toString().padStart(2,'0')}</div>
      <button style={btn}>+</button>
    </div>
  );
}

function TradingPostProduct() {
  return (
    <div style={{
      width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden',
      background: TP.paper, position: 'relative',
    }}>
      <PaperTexture opacity={0.05} />

      <ShopHeader sub="✦ BOOKMARKS · NO. 003 ✦" />

      {/* HERO: hanging luggage tag */}
      <section style={{
        position: 'relative', margin: '0 14px',
        background: TP.paper3,
        border: `1.5px solid ${TP.ink}`,
        boxShadow: `3px 3px 0 ${TP.ink}`,
        padding: '38px 14px 18px',
        overflow: 'hidden',
      }}>
        {/* nail at top */}
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          width: 10, height: 10, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #b9a890, #3a2218 70%)',
          border: `1.5px solid ${TP.ink}`,
          boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
          zIndex: 5,
        }} />
        {/* twine from nail */}
        <svg viewBox="0 0 200 50" style={{
          position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
          width: 200, height: 50, zIndex: 1,
        }} aria-hidden>
          <path d="M100 0 Q 70 25, 60 50 M100 0 Q 130 25, 140 50"
            fill="none" stroke={TP.twine} strokeWidth="1.5" strokeDasharray="3 2"
            strokeLinecap="round" />
        </svg>

        {/* big luggage tag */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginTop: 30 }}>
          <BigLuggageTag />
        </div>

        {/* "in stock" stamp */}
        <div style={{ position: 'absolute', top: 18, right: 16, zIndex: 6 }}>
          <Stamp tilt={8} color={TP.signGreen}>
            <span style={{ color: TP.paper3 }}>✦ IN STOCK</span>
          </Stamp>
        </div>
      </section>

      {/* TITLE + DESCRIPTION */}
      <section style={{ padding: '20px 16px 0' }}>
        <div style={{
          fontFamily: '"IM Fell English SC", serif',
          fontSize: 10, letterSpacing: '0.22em', color: TP.inkSoft,
        }}>SERIES NO. 003 · BOOKMARKS</div>
        <h1 style={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: 30, lineHeight: 1, margin: '4px 0 6px',
          color: TP.ink, letterSpacing: '-0.01em', fontStyle: 'italic',
        }}>The Neon Roadcat</h1>
        <p style={{
          fontFamily: '"Fraunces", serif',
          fontSize: 14, lineHeight: 1.55, color: TP.inkSoft,
          margin: '4px 0 0', textWrap: 'pretty',
        }}>
          A foil-stamped bookmark of the app icon's silhouette — cyan glow on indigo card stock, with a real cotton tassel.
          Slips into a paperback like it was born there.
        </p>

        {/* mileage marker pricing row */}
        <div style={{
          marginTop: 14,
          padding: '10px 12px',
          background: TP.paper3,
          border: `1.5px solid ${TP.ink}`,
          boxShadow: `2px 2px 0 ${TP.ink}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <MileageMarker price="$12" scale={1.0} label="ONE BOOKMARK" tilt={-3} />
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10, color: TP.inkMute, letterSpacing: '0.08em',
            }}>$12.00 USD · qty 1</div>
            <div style={{
              fontFamily: '"Fraunces", serif', fontStyle: 'italic',
              fontSize: 12, color: TP.inkSoft, marginTop: 2,
            }}>Pack of three → <span style={{ color: TP.ink, fontWeight: 600 }}>$30</span></div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 9, color: TP.inkMute, letterSpacing: '0.06em', marginTop: 4,
            }}>ships in 3–5 business days · printful</div>
          </div>
        </div>

        {/* PAPER STOCK / COLORS */}
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontFamily: '"IM Fell English SC", serif',
            fontSize: 10, letterSpacing: '0.18em', color: TP.inkSoft, marginBottom: 6,
          }}>CARD STOCK</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ColorChip color="#1B1F2A" label="Indigo (foil)" on />
            <ColorChip color={TP.terracotta || '#B96A3E'} label="Terracotta" />
            <ColorChip color={TP.signGreen} label="Forest" />
            <ColorChip color={TP.paper2} label="Natural" />
          </div>
        </div>

        {/* QTY + ADD */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <QtyStepper qty={1} />
          <button style={{
            flex: 1, height: 44,
            background: TP.ink, color: TP.paper3,
            border: `1.5px solid ${TP.ink}`,
            boxShadow: `3px 3px 0 ${TP.ink}`,
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
            fontSize: 14, letterSpacing: '0.04em', cursor: 'pointer',
          }}>Add to satchel — $12</button>
        </div>

        {/* TICKER / details rows */}
        <div style={{
          marginTop: 18, padding: '10px 12px',
          border: `1px dashed ${TP.ink}`,
        }}>
          {[
            ['MADE', 'Risograph + foil stamp · Kansas City'],
            ['SIZE', '2 × 6 in · 14pt natural card'],
            ['TASSEL', '100% cotton · mustard'],
            ['PAYS', 'Stripe (Apple Pay, Link, card)'],
            ['SHIPS', 'USPS first-class · worldwide'],
          ].map(([k,v], i) => (
            <div key={k} style={{
              display: 'flex', gap: 12, padding: '5px 0',
              borderTop: i ? `1px dotted ${TP.line2 || '#C7BB9E'}` : 'none',
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
            }}>
              <div style={{ width: 56, color: TP.inkMute, letterSpacing: '0.08em' }}>{k}</div>
              <div style={{ color: TP.ink, flex: 1 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* "PAIRS WELL WITH" — small horizontal row */}
        <div style={{ marginTop: 22 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 8 }}>
            <StarOrn size={10} color={TP.ink} />
            <span style={{
              fontFamily: '"IM Fell English SC", serif',
              fontSize: 11, letterSpacing: '0.2em', color: TP.ink,
            }}>PAIRS WELL WITH</span>
            <div style={{ flex: 1, height: 1, background: TP.line2 || '#C7BB9E' }} />
          </div>
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 0 12px',
            scrollbarWidth: 'none',
          }}>
            {[
              { t: 'Mile Marker Journal',  k: 'journal',  p: 28, c: TP.signGreen, stamp: 'A1' },
              { t: 'Star-Cat Decal Pack',  k: 'sticker',  p: 4,  c: TP.mustardDeep, stamp: '1¢' },
            ].map((j, i) => (
              <div key={i} style={{ flexShrink: 0 }}>
                <Postcard title={j.t} kind={j.k} price={`$${j.p}`} accent={j.c} stamp={j.stamp}
                  stampColor={i%2 ? TP.signGreen : TP.postRed} scale={0.85} tilt={i%2 ? 1.2 : -1.2} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ height: 30 }} />
    </div>
  );
}

// Large luggage tag, hand-built for the detail page (more detailed than the index card).
function BigLuggageTag() {
  const w = 220, h = 310;
  return (
    <div style={{ width: w, height: h, position: 'relative', transform: 'rotate(-2deg)' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: '#1B254A', // indigo card stock
        border: `2px solid ${TP.ink}`,
        boxShadow: `4px 4px 0 ${TP.ink}, 0 14px 28px rgba(27,31,42,0.25)`,
        clipPath: 'polygon(0 12%, 50% 0, 100% 12%, 100% 100%, 0 100%)',
        padding: '46px 14px 18px',
        color: TP.paper3,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* dashed inner border, like real luggage tag */}
        <div style={{
          position: 'absolute', top: 36, left: 8, right: 8, bottom: 8,
          border: `1px dashed rgba(245,235,214,0.5)`,
          pointerEvents: 'none',
        }} />

        {/* foil bookmark mock */}
        <div style={{
          alignSelf: 'center', width: 60, height: 150,
          background: 'linear-gradient(180deg, #4DE3DA 0%, #2BB6AD 100%)',
          border: `1.5px solid #0a1a36`,
          borderRadius: '3px 3px 0 0',
          marginTop: 4,
          position: 'relative',
          boxShadow: 'inset 0 0 18px rgba(77,227,218,0.6), 0 0 14px rgba(77,227,218,0.35)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '14px 0',
          gap: 8,
        }}>
          {/* pink star */}
          <span style={{
            width: 28, height: 28, background: '#F03A8E',
            clipPath: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 100%,50% 75%,21% 100%,32% 57%,2% 35%,39% 35%)',
            filter: 'drop-shadow(0 0 6px rgba(240,58,142,0.7))',
            border: '1.5px solid #1B1F2A',
          }} />
          {/* orange book */}
          <span style={{
            width: 36, height: 22, border: '1.5px solid #F58128', borderRadius: '2px',
            position: 'relative', boxShadow: '0 0 6px rgba(245,129,40,0.6) inset, 0 0 8px rgba(245,129,40,0.4)',
          }}>
            <span style={{ position: 'absolute', top: 9, left: 18, bottom: 4, width: 0,
              borderLeft: '1.5px solid #F58128' }} />
          </span>
          {/* nameplate */}
          <span style={{
            fontFamily: '"IM Fell English SC", serif', fontSize: 8,
            color: TP.paper3, letterSpacing: '0.14em', writingMode: 'vertical-rl',
            transform: 'rotate(180deg)', marginTop: 6,
          }}>LITERARY ROADS</span>
          {/* tassel */}
          <span style={{
            position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)',
            width: 10, height: 18,
            background: `repeating-linear-gradient(180deg, ${TP.mustard} 0 2px, ${TP.mustardDeep} 2px 3px)`,
            borderLeft: `1px solid ${TP.ink}`, borderRight: `1px solid ${TP.ink}`,
          }} />
        </div>

        {/* footer label */}
        <div style={{ marginTop: 'auto', paddingTop: 18 }}>
          <div style={{
            fontFamily: '"IM Fell English SC", serif',
            fontSize: 9, letterSpacing: '0.16em', color: 'rgba(245,235,214,0.7)',
          }}>FROM&nbsp;·&nbsp;TRADING POST</div>
          <div style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: 16, lineHeight: 1, color: TP.paper3, marginTop: 2,
            fontStyle: 'italic',
          }}>The Neon Roadcat</div>
        </div>
      </div>

      {/* brass grommet */}
      <div style={{
        position: 'absolute', top: 10, left: w / 2 - 12, width: 24, height: 24,
        borderRadius: '50%', zIndex: 4,
        background: 'radial-gradient(circle at 35% 35%, #f5e0a8, #b6892f 60%, #6f4a14 100%)',
        boxShadow: 'inset 0 -2px 2px rgba(0,0,0,0.4), 0 2px 0 rgba(0,0,0,0.3)',
        border: `2px solid ${TP.ink}`,
      }}>
        <div style={{
          position: 'absolute', inset: 6, borderRadius: '50%', background: TP.paper3,
          border: `1.5px solid ${TP.ink}`,
        }} />
      </div>
    </div>
  );
}

window.TradingPostProduct = TradingPostProduct;
