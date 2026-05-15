// The Trading Post — main shop screen.
// Hero with store cat, three horizontal "display case" shelves:
//   bookmarks (luggage tags) · journals (postcards) · stickers (postcards/circles)

const { useState, useRef, useEffect } = React;

function HeroShelf() {
  return (
    <div style={{
      position: 'relative', margin: '6px 14px 14px',
      background: TP.paper3,
      border: `1.5px solid ${TP.ink}`,
      borderRadius: 4,
      boxShadow: `3px 3px 0 ${TP.ink}`,
      overflow: 'hidden',
    }}>
      {/* OPEN sign — hung in the top-right corner of the hero */}
      <div style={{
        position: 'absolute', top: 22, right: 12, zIndex: 5,
        transform: 'rotate(-4deg)',
      }}>
        <svg viewBox="0 0 60 10" width={60} height={10} style={{
          position: 'absolute', top: -7, left: 0, right: 0, margin: '0 auto',
        }} aria-hidden>
          <path d="M4 8 Q 30 -6, 56 8" fill="none" stroke={TP.twine}
            strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
        <div style={{
          background: TP.signGreen,
          padding: '3px 10px',
          border: `1.5px solid ${TP.paper3}`,
          boxShadow: `0 0 0 1.5px ${TP.ink}, 2px 2px 0 rgba(27,31,42,0.3)`,
        }}>
          <span style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: 13, color: TP.paper3, letterSpacing: '0.1em',
          }}>OPEN</span>
        </div>
      </div>
      <PaperTexture opacity={0.08} />

      {/* roof: little canvas awning of stripes */}
      <div style={{
        height: 14,
        background: `repeating-linear-gradient(90deg, ${TP.postRed} 0, ${TP.postRed} 16px, ${TP.paper3} 16px, ${TP.paper3} 32px)`,
        borderBottom: `1.5px solid ${TP.ink}`,
        boxShadow: `inset 0 -2px 0 rgba(0,0,0,0.15)`,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '8px 12px 4px', gap: 4, minHeight: 200 }}>
        {/* left: copy column */}
        <div style={{ flex: 1, position: 'relative', zIndex: 2, paddingBottom: 6 }}>
          <div style={{
            fontFamily: '"IM Fell English SC", serif',
            fontSize: 10, color: TP.inkSoft, letterSpacing: '0.2em',
          }}>PROPRIETOR · MR. OLLIE</div>
          <h1 style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: 32, lineHeight: 0.92, margin: '4px 0 6px',
            color: TP.ink, letterSpacing: '-0.01em', fontStyle: 'italic',
          }}>The<br/>Trading<br/>Post</h1>
          <p style={{
            fontFamily: '"Fraunces", serif',
            fontSize: 11, lineHeight: 1.45, color: TP.inkSoft,
            margin: 0, fontStyle: 'italic', maxWidth: 130,
          }}>Bookmarks, journals &amp; stickers for the long road.</p>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Stamp tilt={-4}>OPEN DAILY</Stamp>
            <Stamp tilt={3} color={TP.teal}>FREE SHIPPING · $35+</Stamp>
          </div>
        </div>

        {/* right: store cat */}
        <div style={{
          width: 158, height: 188, position: 'relative', flexShrink: 0,
          marginRight: -8,
        }}>
          <img src="assets/cat-store.png" alt="Mister Ollie in his Trading Post chair"
            style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom right' }} />
          {/* hand-drawn squiggle accent */}
          <div style={{ position: 'absolute', top: 18, left: -10 }}>
            <Squiggle width={36} color={TP.wood3} />
          </div>
          <div style={{ position: 'absolute', top: 32, left: -4 }}>
            <Squiggle width={20} color={TP.wood3} />
          </div>
        </div>
      </div>

      {/* floor plank */}
      <div style={{
        height: 10,
        background: `linear-gradient(180deg, ${TP.wood2}, ${TP.wood3})`,
        borderTop: `1.5px solid ${TP.ink}`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(90deg, transparent 0, transparent 40px, rgba(0,0,0,0.3) 40px, rgba(0,0,0,0.3) 41px)',
        }} />
      </div>
    </div>
  );
}

function DisplayCase({ children, signLabel, signSub, action = 'See all →', tilt = -1.2 }) {
  return (
    <section style={{ marginTop: 18 }}>
      {/* wooden sign header */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 30px', marginBottom: 8 }}>
        <WoodenSign sub={signSub} tilt={tilt} width="100%" rope>{signLabel}</WoodenSign>
      </div>

      {/* horizontal scroll case */}
      <div style={{
        position: 'relative',
        padding: '14px 0 18px',
      }}>
        {/* shelf back: warm cream with subtle wallpaper stripes */}
        <div aria-hidden style={{
          position: 'absolute', inset: '0 0 14px 0',
          background: `repeating-linear-gradient(180deg, ${TP.paper} 0, ${TP.paper} 22px, ${TP.paper2} 22px, ${TP.paper2} 23px)`,
          borderTop: `1px solid ${TP.line2 || '#C7BB9E'}`,
          borderBottom: `1px solid #C7BB9E`,
          opacity: 0.7,
        }} />

        <div style={{
          position: 'relative', display: 'flex', gap: 18, padding: '0 14px 6px',
          overflowX: 'auto', overflowY: 'visible',
          scrollbarWidth: 'none',
        }}>
          {children}
          {/* end card: see all */}
          <div style={{
            flexShrink: 0, width: 110, alignSelf: 'center',
            textAlign: 'center', padding: '14px 8px',
            border: `1.5px dashed ${TP.ink}`, borderRadius: 4,
            background: 'transparent',
            fontFamily: '"IM Fell English SC", serif', fontSize: 10,
            color: TP.ink, letterSpacing: '0.16em',
          }}>
            <div style={{ marginBottom: 6 }}>✦ ✦ ✦</div>
            {action}
          </div>
        </div>

        {/* wooden shelf rail under cards */}
        <div style={{
          height: 14,
          background: `linear-gradient(180deg, ${TP.wood1}, ${TP.wood2} 40%, ${TP.wood3})`,
          borderTop: `1.5px solid ${TP.wood4}`,
          borderBottom: `2px solid ${TP.wood4}`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(90deg, transparent 0, transparent 80px, rgba(74,36,16,0.5) 80px, rgba(74,36,16,0.5) 81px)',
          }} />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// SHELF ITEM — wraps a product card with hover/tap-to-add chip.
// On idle: small "+ ADD" price-tag stub overlaps the bottom-right.
// On add: stub flips into − qty + stepper. Clicking the card itself
// still represents "view product"; the chip is for quick-add.
// ─────────────────────────────────────────────────────────────
function ShelfItem({ qty, onAdd, onInc, onDec, children, chipOffset = { right: -6, bottom: -10 } }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {children}
      <div style={{
        position: 'absolute',
        right: chipOffset.right,
        bottom: chipOffset.bottom,
        zIndex: 6,
      }}>
        <AddToSatchelChip qty={qty} onAdd={onAdd} onInc={onInc} onDec={onDec} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHOP SCREEN
// ─────────────────────────────────────────────────────────────
function TradingPostShop() {
  const bookmarks = [
    { id: 'bm-ollie',   t: 'Mister Ollie',    s: 'leather · braided tassel',  p: 9,  c: TP.terracotta || '#B96A3E', tilt: -1.5 },
    { id: 'bm-star',    t: 'The Star Cat',    s: 'card stock · mustard',       p: 6,  c: TP.mustardDeep,            tilt:  1.2 },
    { id: 'bm-neon',    t: 'Neon Roadcat',    s: 'foil · indigo',              p: 12, c: '#3B4E9E',                 tilt: -0.6 },
    { id: 'bm-open',    t: 'Open Book',       s: 'card stock · plum',          p: 6,  c: TP.plum,                   tilt:  1.8 },
  ];

  const journals = [
    { id: 'jr-mile',    t: 'The Mile Marker Journal',  k: 'journal', p: 28, c: TP.signGreen, stamp: 'A1' },
    { id: 'jr-field',   t: 'Bookworm Field Notes',     k: 'journal', p: 18, c: TP.terracotta || '#B96A3E', stamp: 'B2' },
    { id: 'jr-author',  t: 'Author Country Logbook',   k: 'journal', p: 24, c: TP.plum,      stamp: 'C3' },
  ];

  const stickers = [
    { id: 'st-star',    t: 'Star Cat Decal Pack',      k: 'sticker', p: 4,  c: TP.mustardDeep, stamp: '1¢' },
    { id: 'st-crest',   t: 'Literary Roads Crest',     k: 'sticker', p: 5,  c: TP.teal,        stamp: '2¢' },
    { id: 'st-road',    t: 'Open Road · Open Book',    k: 'sticker', p: 4,  c: TP.postRed,     stamp: '3¢' },
    { id: 'st-pogo',    t: 'Pogo-stick Postmark',      k: 'sticker', p: 3,  c: TP.plum,        stamp: '4¢' },
  ];

  // — Cart state — keyed by product id. Seeded with 1 Neon Roadcat so the
  //   satchel + cart-bar are visible at first paint (the design canvas
  //   wants to show the working state, not the empty state).
  const [cart, setCart] = useState({ 'bm-neon': 1 });
  const [pulse, setPulse] = useState(false);
  const pulseT = useRef(null);
  const add = (id) => {
    setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
    setPulse(true);
    clearTimeout(pulseT.current);
    pulseT.current = setTimeout(() => setPulse(false), 260);
  };
  const dec = (id) => setCart(c => {
    const next = { ...c, [id]: Math.max(0, (c[id] || 0) - 1) };
    if (next[id] === 0) delete next[id];
    return next;
  });
  const cartCount = Object.values(cart).reduce((a,b) => a + b, 0);
  const all = [...bookmarks, ...journals, ...stickers];
  const cartTotal = all.reduce((sum, it) => sum + (cart[it.id] || 0) * it.p, 0);

  return (
    <div style={{
      width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden',
      background: TP.paper,
      position: 'relative',
    }}>
      <PaperTexture opacity={0.05} />

      <ShopHeader cartCount={cartCount} cartPulse={pulse} />

      <HeroShelf />

      {/* CURRENTLY READING / banner row */}
      <div style={{
        margin: '0 14px',
        padding: '8px 12px',
        border: `1px dashed ${TP.ink}`,
        borderRadius: 4,
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10, color: TP.inkSoft, letterSpacing: '0.04em',
      }}>
        <span style={{ fontFamily:'"IM Fell English SC", serif', fontSize: 10, letterSpacing: '0.2em', color: TP.ink }}>NOTICE&nbsp;·</span>
        <span>orders ship monday + thursday — printed &amp; mailed from kansas city</span>
      </div>

      {/* BOOKMARKS — luggage tags */}
      <DisplayCase signLabel="Bookmarks" signSub="✦ HAND-CUT & STRUNG ✦" tilt={-1.5}>
        {bookmarks.map((b) => (
          <ShelfItem key={b.id}
            qty={cart[b.id] || 0}
            onAdd={() => add(b.id)} onInc={() => add(b.id)} onDec={() => dec(b.id)}
            chipOffset={{ right: -6, bottom: 6 }}>
            <div style={{ paddingTop: 18, paddingBottom: 14 }}>
              <LuggageTag title={b.t} subtitle={b.s} price={`$${b.p}`} accent={b.c} tilt={b.tilt} kind="bookmark" />
            </div>
          </ShelfItem>
        ))}
      </DisplayCase>

      {/* JOURNALS — postcards */}
      <DisplayCase signLabel="Journals" signSub="✦ FOR LOGGING THE MILES ✦" tilt={1.2}>
        {journals.map((j, i) => (
          <ShelfItem key={j.id}
            qty={cart[j.id] || 0}
            onAdd={() => add(j.id)} onInc={() => add(j.id)} onDec={() => dec(j.id)}
            chipOffset={{ right: -4, bottom: 6 }}>
            <div style={{ paddingTop: 6, paddingBottom: 16 }}>
              <Postcard title={j.t} kind={j.k} price={`$${j.p}`} accent={j.c} stamp={j.stamp} stampColor={i % 2 ? TP.signGreen : TP.postRed} tilt={i % 2 ? 1 : -1.2} />
            </div>
          </ShelfItem>
        ))}
      </DisplayCase>

      {/* STICKERS — small postcards */}
      <DisplayCase signLabel="Stickers" signSub="✦ POSTAGE-PAID PACKS ✦" tilt={-1.4}>
        {stickers.map((s, i) => (
          <ShelfItem key={s.id}
            qty={cart[s.id] || 0}
            onAdd={() => add(s.id)} onInc={() => add(s.id)} onDec={() => dec(s.id)}
            chipOffset={{ right: -4, bottom: 6 }}>
            <div style={{ paddingTop: 6, paddingBottom: 16 }}>
              <Postcard title={s.t} kind={s.k} price={`$${s.p}`} accent={s.c} stamp={s.stamp} stampColor={i % 2 ? TP.postRed : TP.signGreen} tilt={i % 2 ? -1.2 : 1.4} />
            </div>
          </ShelfItem>
        ))}
      </DisplayCase>

      {/* PROPRIETOR'S NOTE */}
      <section style={{ margin: '18px 14px 12px', padding: 14,
        background: TP.paper3, border: `1.5px solid ${TP.ink}`, borderRadius: 4,
        boxShadow: `3px 3px 0 ${TP.ink}`,
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: -10, left: 12 }}>
          <Stamp tilt={-4} color={TP.terracotta || '#B96A3E'}>
            <span style={{ color: TP.paper3 }}>A NOTE FROM THE SHOP</span>
          </Stamp>
        </div>
        <p style={{
          fontFamily: '"Fraunces", serif', fontStyle: 'italic',
          fontSize: 13, lineHeight: 1.5, margin: '8px 0 0',
          color: TP.ink, textWrap: 'pretty',
        }}>
          “Everything in the case is drawn by yours truly, then mailed in a real envelope by my one and only employee. Take your time at the shelves.”
        </p>
        <p style={{
          fontFamily: '"IM Fell English SC", serif',
          fontSize: 10, letterSpacing: '0.16em',
          margin: '8px 0 0', color: TP.inkSoft, textAlign: 'right',
        }}>— MR. OLLIE, PROPRIETOR</p>
      </section>

      {/* RECEIPT FOOTER */}
      <footer style={{
        margin: '6px 14px 24px',
        padding: '12px 14px 14px',
        background: TP.paper3,
        border: `1px solid ${TP.line2 || '#C7BB9E'}`,
        position: 'relative',
        // tiny ticket perforation
        maskImage: 'radial-gradient(circle at 6px 100%, transparent 4px, black 4.5px), radial-gradient(circle at calc(100% - 6px) 100%, transparent 4px, black 4.5px)',
      }}>
        <div style={{
          fontFamily: '"IM Fell English SC", serif',
          fontSize: 11, letterSpacing: '0.22em', color: TP.ink, textAlign: 'center',
        }}>✦ THE TRADING POST ✦</div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9, color: TP.inkMute, textAlign: 'center', marginTop: 4,
          letterSpacing: '0.04em',
        }}>SECURE CHECKOUT · STRIPE — PRINTED &amp; SHIPPED · PRINTFUL</div>
      </footer>

      {/* breathing room so the sticky till-bar never covers the receipt */}
      <div style={{ height: cartCount > 0 ? 76 : 30 }} />

      {/* STICKY "→ THE TILL" BAR — visible whenever the satchel has items */}
      {cartCount > 0 && (
        <div style={{
          position: 'sticky', bottom: 10, left: 0, right: 0,
          margin: '0 14px', zIndex: 50,
          pointerEvents: 'auto',
        }}>
          <button onClick={() => {}} style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px 8px 8px',
            background: TP.ink, color: TP.paper3,
            border: `1.5px solid ${TP.ink}`,
            boxShadow: `3px 3px 0 ${TP.wood3}, 0 14px 28px rgba(27,31,42,0.25)`,
            cursor: 'pointer',
            textAlign: 'left',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 38, height: 38,
              background: TP.mustard,
              border: `1.5px solid ${TP.paper3}`,
              boxShadow: `0 0 0 1.5px ${TP.ink}`,
              fontFamily: '"DM Serif Display", serif',
              fontSize: 18, color: TP.ink, lineHeight: 1,
              transform: 'rotate(-4deg)',
              padding: '0 8px',
            }}>{cartCount}</span>
            <span style={{ flex: 1 }}>
              <span style={{
                display: 'block',
                fontFamily: '"IM Fell English SC", serif',
                fontSize: 10, letterSpacing: '0.18em',
                color: 'rgba(245,235,214,0.65)',
              }}>IN YOUR SATCHEL</span>
              <span style={{
                display: 'block',
                fontFamily: '"Fraunces", serif', fontWeight: 600,
                fontSize: 14, lineHeight: 1.15, marginTop: 1,
              }}>{cartCount} {cartCount === 1 ? 'item' : 'items'}
                <span style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                  color: TP.mustard, marginLeft: 8, letterSpacing: '0.04em',
                }}>${cartTotal.toFixed(2)}</span>
              </span>
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 12px',
              background: TP.mustard,
              border: `1.5px solid ${TP.paper3}`,
              boxShadow: `0 0 0 1.5px ${TP.ink}`,
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
              fontSize: 12, color: TP.ink, letterSpacing: '0.06em',
              transform: 'rotate(-1deg)',
            }}>To the till
              <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 16, lineHeight: 1 }}>→</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

window.TradingPostShop = TradingPostShop;
