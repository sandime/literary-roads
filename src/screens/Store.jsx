import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  TP, PaperTexture, Squiggle, StarOrn,
  WoodenSign, MileageMarker, Stamp,
  LuggageTag, Postcard,
  SatchelButton, AddToSatchelChip, ShopHeader,
  ReceiptLine, FieldRow,
} from '../components/store/StoreComponents';

// ── Stripe Payment Link ───────────────────────────────────────────────────────
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_cNifZg5Rl0qD0nc7Oj5os00';

// ── Product catalogue (placeholder SKUs — swap with Printful data at launch) ──
const BOOKMARKS = [
  { id: 'bm-ollie',  title: 'Mister Ollie',    sub: 'leather · braided tassel', price: 9,  accent: TP.terracotta, tilt: -1.5 },
  { id: 'bm-star',   title: 'The Star Cat',     sub: 'card stock · mustard',     price: 6,  accent: TP.mustardDeep, tilt: 1.2 },
  { id: 'bm-neon',   title: 'Neon Roadcat',     sub: 'foil · indigo',            price: 12, accent: '#3B4E9E',      tilt: -0.6 },
  { id: 'bm-open',   title: 'Open Book',        sub: 'card stock · plum',        price: 6,  accent: TP.plum,        tilt: 1.8 },
];
const JOURNALS = [
  { id: 'jr-mile',   title: 'The Mile Marker Journal', kind: 'journal', price: 28, accent: TP.signGreen,  stamp: 'A1' },
  { id: 'jr-field',  title: 'Bookworm Field Notes',    kind: 'journal', price: 18, accent: TP.terracotta, stamp: 'B2' },
  { id: 'jr-author', title: 'Author Country Logbook',  kind: 'journal', price: 24, accent: TP.plum,       stamp: 'C3' },
];
const STICKERS = [
  { id: 'st-star',   title: 'Star Cat Decal Pack',    kind: 'sticker', price: 4,  accent: TP.mustardDeep, stamp: '1¢' },
  { id: 'st-crest',  title: 'Literary Roads Crest',   kind: 'sticker', price: 8,  accent: TP.teal,        stamp: '2¢' },
  { id: 'st-road',   title: 'Open Road · Open Book',  kind: 'sticker', price: 4,  accent: TP.postRed,     stamp: '3¢' },
  { id: 'st-pogo',   title: 'Pogo-stick Postmark',    kind: 'sticker', price: 3,  accent: TP.plum,        stamp: '4¢' },
];
const ALL_PRODUCTS = [...BOOKMARKS, ...JOURNALS, ...STICKERS];

const BASE = import.meta.env.BASE_URL;
const CAT_SRC = `${BASE}images/cat-store.png`;

// ── Main export ───────────────────────────────────────────────────────────────
export default function Store({ onBack }) {
  const [storeEnabled, setStoreEnabled] = useState(null);
  const [view, setView]         = useState('shop');      // 'shop' | 'product' | 'checkout'
  const [selectedId, setSelected] = useState(null);
  const [cart, setCart]         = useState({});
  const [pulse, setPulse]       = useState(false);
  const pulseRef = useRef(null);

  const params   = new URLSearchParams(window.location.search);
  const success  = params.get('success');
  const canceled = params.get('canceled');

  useEffect(() => {
    getDoc(doc(db, 'config', 'store'))
      .then(snap => setStoreEnabled(snap.exists() ? snap.data().enabled === true : false))
      .catch(() => setStoreEnabled(false));
  }, []);

  // Cart helpers
  const addItem = (id) => {
    setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
    setPulse(true);
    clearTimeout(pulseRef.current);
    pulseRef.current = setTimeout(() => setPulse(false), 260);
  };
  const decItem = (id) => setCart(c => {
    const next = { ...c, [id]: Math.max(0, (c[id] || 0) - 1) };
    if (next[id] === 0) delete next[id];
    return next;
  });
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = ALL_PRODUCTS.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0);

  const goBack = () => {
    if (view === 'product') { setView('shop'); return; }
    if (view === 'checkout') { setView('shop'); return; }
    onBack?.();
  };
  const goCheckout = () => setView('checkout');
  const goProduct  = (id) => { setSelected(id); setView('product'); };

  const handlePay = () => { window.location.href = STRIPE_PAYMENT_LINK; };

  const headerProps = {
    onBack: goBack,
    cartCount,
    cartPulse: pulse,
    onCart: goCheckout,
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (storeEnabled === null) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: '"Fraunces", serif', fontSize: 14, color: TP.inkMute }}>Loading…</p>
      </div>
    );
  }

  // ── Store disabled ────────────────────────────────────────────────────────────
  if (!storeEnabled) {
    return (
      <div style={S.page}>
        <ShopHeader {...headerProps} onBack={onBack} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', fontSize: 32, color: TP.ink, marginBottom: 8 }}>The Trading Post</div>
          <div style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 11, letterSpacing: '0.18em', color: TP.inkSoft, marginBottom: 16 }}>COMING SOON</div>
          <p style={{ fontFamily: '"Fraunces", serif', fontSize: 14, color: TP.inkMute, maxWidth: 280 }}>Check back soon for Literary Roads goods.</p>
        </div>
      </div>
    );
  }

  // ── Post-checkout: success ────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={S.page}>
        <ShopHeader {...headerProps} sub="✦ ORDER CONFIRMED ✦" onBack={onBack} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', fontSize: 28, color: TP.ink, marginBottom: 8 }}>Order Confirmed</div>
          <p style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: 14, color: TP.inkMute, maxWidth: 300, marginBottom: 28 }}>
            Your goods are wrapped in brown paper, tied with twine, and headed your way from Kansas City.
          </p>
          <button onClick={() => window.history.replaceState({}, '', window.location.pathname)} style={S.inkBtn}>
            Back to the Shop
          </button>
        </div>
      </div>
    );
  }

  // ── Post-checkout: canceled ───────────────────────────────────────────────────
  if (canceled) {
    return (
      <div style={S.page}>
        <ShopHeader {...headerProps} sub="✦ NO WORRIES ✦" onBack={onBack} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', fontSize: 28, color: TP.ink, marginBottom: 8 }}>No worries.</div>
          <p style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: 14, color: TP.inkMute, maxWidth: 300, marginBottom: 28 }}>
            The shelves will be here whenever you're ready.
          </p>
          <button onClick={() => window.history.replaceState({}, '', window.location.pathname)} style={S.inkBtn}>
            Back to the Shop
          </button>
        </div>
      </div>
    );
  }

  // ── Views ─────────────────────────────────────────────────────────────────────
  if (view === 'product') {
    return <ProductView id={selectedId} headerProps={headerProps} cart={cart} addItem={addItem} decItem={decItem} />;
  }
  if (view === 'checkout') {
    return <CheckoutView headerProps={headerProps} cart={cart} cartTotal={cartTotal} onPay={handlePay} />;
  }
  return <ShopView headerProps={headerProps} cart={cart} addItem={addItem} decItem={decItem} cartCount={cartCount} cartTotal={cartTotal} onCheckout={goCheckout} onProduct={goProduct} />;
}

// ── Shop view ─────────────────────────────────────────────────────────────────
function ShopView({ headerProps, cart, addItem, decItem, cartCount, cartTotal, onCheckout }) {
  return (
    <div style={{ ...S.page, paddingBottom: cartCount > 0 ? 76 : 30 }}>
      <PaperTexture opacity={0.05} />
      <ShopHeader {...headerProps} />

      {/* Hero card */}
      <div style={{
        position: 'relative', margin: '6px 14px 14px',
        background: TP.paper3, border: `1.5px solid ${TP.ink}`,
        borderRadius: 4, boxShadow: `3px 3px 0 ${TP.ink}`, overflow: 'hidden',
      }}>
        {/* OPEN sign */}
        <div style={{ position: 'absolute', top: 22, right: 12, zIndex: 5, transform: 'rotate(-4deg)' }}>
          <svg viewBox="0 0 60 10" width={60} height={10} style={{ position: 'absolute', top: -7, left: 0 }} aria-hidden>
            <path d="M4 8 Q 30 -6, 56 8" fill="none" stroke={TP.twine} strokeWidth="1.5" strokeDasharray="2 2" />
          </svg>
          <div style={{ background: TP.signGreen, padding: '3px 10px', border: `1.5px solid ${TP.paper3}`, boxShadow: `0 0 0 1.5px ${TP.ink}, 2px 2px 0 rgba(27,31,42,0.3)` }}>
            <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 13, color: TP.paper3, letterSpacing: '0.1em' }}>OPEN</span>
          </div>
        </div>
        <PaperTexture opacity={0.08} />
        {/* awning */}
        <div style={{ height: 14, background: `repeating-linear-gradient(90deg, ${TP.postRed} 0, ${TP.postRed} 16px, ${TP.paper3} 16px, ${TP.paper3} 32px)`, borderBottom: `1.5px solid ${TP.ink}`, boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.15)' }} />

        <div style={{ display: 'flex', alignItems: 'flex-end', padding: '8px 12px 4px', gap: 4, minHeight: 200 }}>
          {/* copy */}
          <div style={{ flex: 1, position: 'relative', zIndex: 2, paddingBottom: 6 }}>
            <div style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 10, color: TP.inkSoft, letterSpacing: '0.2em' }}>PROPRIETOR · MR. OLLIE</div>
            <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 32, lineHeight: 0.92, margin: '4px 0 6px', color: TP.ink, fontStyle: 'italic' }}>
              The<br/>Trading<br/>Post
            </h1>
            <p style={{ fontFamily: '"Fraunces", serif', fontSize: 11, lineHeight: 1.45, color: TP.inkSoft, margin: 0, fontStyle: 'italic', maxWidth: 130 }}>
              Bookmarks, journals &amp; stickers for the long road.
            </p>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Stamp tilt={-4}>OPEN DAILY</Stamp>
              <Stamp tilt={3} color={TP.teal}>FREE SHIPPING · $35+</Stamp>
            </div>
          </div>
          {/* Mr. Ollie */}
          <div style={{ width: 158, height: 188, position: 'relative', flexShrink: 0, marginRight: -8 }}>
            <img src={CAT_SRC} alt="Mister Ollie in his Trading Post chair"
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom right' }} />
            <div style={{ position: 'absolute', top: 18, left: -10 }}><Squiggle width={36} color={TP.wood3} /></div>
            <div style={{ position: 'absolute', top: 32, left: -4 }}><Squiggle width={20} color={TP.wood3} /></div>
          </div>
        </div>

        {/* floor plank */}
        <div style={{ height: 10, background: `linear-gradient(180deg, ${TP.wood2}, ${TP.wood3})`, borderTop: `1.5px solid ${TP.ink}`, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0, transparent 40px, rgba(0,0,0,0.3) 40px, rgba(0,0,0,0.3) 41px)' }} />
        </div>
      </div>

      {/* Notice strip */}
      <div style={{ margin: '0 14px', padding: '8px 12px', border: `1px dashed ${TP.ink}`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 10, fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: TP.inkSoft, letterSpacing: '0.04em' }}>
        <span style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 10, letterSpacing: '0.2em', color: TP.ink }}>NOTICE ·</span>
        <span>orders ship monday + thursday — printed &amp; mailed from kansas city</span>
      </div>

      {/* Bookmarks shelf */}
      <DisplayCase signLabel="Bookmarks" signSub="✦ HAND-CUT & STRUNG ✦" tilt={-1.5}>
        {BOOKMARKS.map(b => (
          <ShelfItem key={b.id} qty={cart[b.id] || 0} onAdd={() => addItem(b.id)} onInc={() => addItem(b.id)} onDec={() => decItem(b.id)} chipOffset={{ right: -6, bottom: 6 }}>
            <div style={{ paddingTop: 18, paddingBottom: 14 }}>
              <LuggageTag title={b.title} subtitle={b.sub} price={`$${b.price}`} accent={b.accent} tilt={b.tilt} kind="bookmark" />
            </div>
          </ShelfItem>
        ))}
      </DisplayCase>

      {/* Journals shelf */}
      <DisplayCase signLabel="Journals" signSub="✦ FOR LOGGING THE MILES ✦" tilt={1.2}>
        {JOURNALS.map((j, i) => (
          <ShelfItem key={j.id} qty={cart[j.id] || 0} onAdd={() => addItem(j.id)} onInc={() => addItem(j.id)} onDec={() => decItem(j.id)} chipOffset={{ right: -4, bottom: 6 }}>
            <div style={{ paddingTop: 6, paddingBottom: 16 }}>
              <Postcard title={j.title} kind={j.kind} price={`$${j.price}`} accent={j.accent} stamp={j.stamp} stampColor={i % 2 ? TP.signGreen : TP.postRed} tilt={i % 2 ? 1 : -1.2} />
            </div>
          </ShelfItem>
        ))}
      </DisplayCase>

      {/* Stickers shelf */}
      <DisplayCase signLabel="Stickers" signSub="✦ POSTAGE-PAID PACKS ✦" tilt={-1.4}>
        {STICKERS.map((s, i) => (
          <ShelfItem key={s.id} qty={cart[s.id] || 0} onAdd={() => addItem(s.id)} onInc={() => addItem(s.id)} onDec={() => decItem(s.id)} chipOffset={{ right: -4, bottom: 6 }}>
            <div style={{ paddingTop: 6, paddingBottom: 16 }}>
              <Postcard title={s.title} kind={s.kind} price={`$${s.price}`} accent={s.accent} stamp={s.stamp} stampColor={i % 2 ? TP.postRed : TP.signGreen} tilt={i % 2 ? -1.2 : 1.4} />
            </div>
          </ShelfItem>
        ))}
      </DisplayCase>

      {/* Proprietor's note */}
      <section style={{ margin: '18px 14px 12px', padding: 14, background: TP.paper3, border: `1.5px solid ${TP.ink}`, borderRadius: 4, boxShadow: `3px 3px 0 ${TP.ink}`, position: 'relative' }}>
        <div style={{ position: 'absolute', top: -10, left: 12 }}>
          <Stamp tilt={-4} color={TP.terracotta}>
            <span style={{ color: TP.paper3 }}>A NOTE FROM THE SHOP</span>
          </Stamp>
        </div>
        <p style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: 13, lineHeight: 1.5, margin: '8px 0 0', color: TP.ink }}>
          "Everything in the case is drawn by yours truly, then mailed in a real envelope by my one and only employee. Take your time at the shelves."
        </p>
        <p style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 10, letterSpacing: '0.16em', margin: '8px 0 0', color: TP.inkSoft, textAlign: 'right' }}>— MR. OLLIE, PROPRIETOR</p>
      </section>

      {/* Receipt footer */}
      <footer style={{ margin: '6px 14px 24px', padding: '12px 14px 14px', background: TP.paper3, border: `1px solid ${TP.line2}`, position: 'relative' }}>
        <div style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 11, letterSpacing: '0.22em', color: TP.ink, textAlign: 'center' }}>✦ THE TRADING POST ✦</div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: TP.inkMute, textAlign: 'center', marginTop: 4, letterSpacing: '0.04em' }}>
          SECURE CHECKOUT · STRIPE — PRINTED &amp; SHIPPED · PRINTFUL
        </div>
      </footer>

      {/* Sticky till bar */}
      {cartCount > 0 && (
        <div style={{ position: 'sticky', bottom: 10, left: 0, right: 0, margin: '0 14px', zIndex: 50 }}>
          <button onClick={onCheckout} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px 8px 8px',
            background: TP.ink, color: TP.paper3,
            border: `1.5px solid ${TP.ink}`,
            boxShadow: `3px 3px 0 ${TP.wood3}, 0 14px 28px rgba(27,31,42,0.25)`,
            cursor: 'pointer', textAlign: 'left',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 38, height: 38, background: TP.mustard,
              border: `1.5px solid ${TP.paper3}`, boxShadow: `0 0 0 1.5px ${TP.ink}`,
              fontFamily: '"DM Serif Display", serif', fontSize: 18, color: TP.ink, lineHeight: 1,
              transform: 'rotate(-4deg)', padding: '0 8px',
            }}>{cartCount}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontFamily: '"IM Fell English SC", serif', fontSize: 10, letterSpacing: '0.18em', color: 'rgba(245,235,214,0.65)' }}>IN YOUR SATCHEL</span>
              <span style={{ display: 'block', fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: 14, lineHeight: 1.15, marginTop: 1 }}>
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: TP.mustard, marginLeft: 8, letterSpacing: '0.04em' }}>${cartTotal.toFixed(2)}</span>
              </span>
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px',
              background: TP.mustard, border: `1.5px solid ${TP.paper3}`,
              boxShadow: `0 0 0 1.5px ${TP.ink}`,
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
              fontSize: 12, color: TP.ink, letterSpacing: '0.06em', transform: 'rotate(-1deg)',
            }}>To the till <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 16, lineHeight: 1 }}>→</span></span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Display case (one shelf section) ─────────────────────────────────────────
function DisplayCase({ children, signLabel, signSub, tilt = -1.2 }) {
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 30px', marginBottom: 8 }}>
        <WoodenSign sub={signSub} tilt={tilt} width="100%" rope>{signLabel}</WoodenSign>
      </div>
      <div style={{ position: 'relative', padding: '14px 0 18px' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: '0 0 14px 0',
          background: `repeating-linear-gradient(180deg, ${TP.paper} 0, ${TP.paper} 22px, ${TP.paper2} 22px, ${TP.paper2} 23px)`,
          borderTop: `1px solid ${TP.line2}`, borderBottom: `1px solid ${TP.line2}`, opacity: 0.7,
        }} />
        <div
          role="list"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'ArrowRight') e.currentTarget.scrollBy({ left: 180, behavior: 'smooth' });
            if (e.key === 'ArrowLeft')  e.currentTarget.scrollBy({ left: -180, behavior: 'smooth' });
          }}
          style={{ position: 'relative', display: 'flex', gap: 18, padding: '0 14px 6px', overflowX: 'auto', overflowY: 'visible', scrollbarWidth: 'none' }}
        >
          {children}
          <div style={{
            flexShrink: 0, width: 110, alignSelf: 'center',
            textAlign: 'center', padding: '14px 8px',
            border: `1.5px dashed ${TP.ink}`, borderRadius: 4,
            background: 'transparent',
            fontFamily: '"IM Fell English SC", serif', fontSize: 10, color: TP.ink, letterSpacing: '0.16em',
          }}>
            <div style={{ marginBottom: 6 }}>✦ ✦ ✦</div>
            More coming →
          </div>
        </div>
        <div style={{ height: 14, background: `linear-gradient(180deg, ${TP.wood1}, ${TP.wood2} 40%, ${TP.wood3})`, borderTop: `1.5px solid ${TP.wood4}`, borderBottom: `2px solid ${TP.wood4}`, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0, transparent 80px, rgba(74,36,16,0.5) 80px, rgba(74,36,16,0.5) 81px)' }} />
        </div>
      </div>
    </section>
  );
}

function ShelfItem({ qty, onAdd, onInc, onDec, children, chipOffset = { right: -6, bottom: -10 } }) {
  return (
    <div role="listitem" style={{ position: 'relative', flexShrink: 0 }}>
      {children}
      <div style={{ position: 'absolute', right: chipOffset.right, bottom: chipOffset.bottom, zIndex: 6 }}>
        <AddToSatchelChip qty={qty} onAdd={onAdd} onInc={onInc} onDec={onDec} />
      </div>
    </div>
  );
}

// ── Product detail view ───────────────────────────────────────────────────────
function ProductView({ id, headerProps, cart, addItem, decItem }) {
  const product = ALL_PRODUCTS.find(p => p.id === id);
  const [variant, setVariant] = useState('default');
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const VARIANTS = [
    { id: 'default', color: product.accent, label: 'Default' },
    { id: 'natural', color: TP.paper2, label: 'Natural' },
  ];

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) addItem(id);
  };

  return (
    <div style={S.page}>
      <PaperTexture opacity={0.05} />
      <ShopHeader {...headerProps} sub={`✦ ${product.kind === 'journal' ? 'JOURNALS' : product.kind === 'sticker' ? 'STICKERS' : 'BOOKMARKS'} ✦`} />

      {/* Hero */}
      <section style={{
        position: 'relative', margin: '0 14px',
        background: TP.paper3, border: `1.5px solid ${TP.ink}`,
        boxShadow: `3px 3px 0 ${TP.ink}`, padding: '38px 14px 18px', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #b9a890, #3a2218 70%)', border: `1.5px solid ${TP.ink}`, boxShadow: '0 1px 0 rgba(0,0,0,0.4)', zIndex: 5 }} />
        <svg viewBox="0 0 200 50" style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', width: 200, height: 50, zIndex: 1 }} aria-hidden>
          <path d="M100 0 Q 70 25, 60 50 M100 0 Q 130 25, 140 50" fill="none" stroke={TP.twine} strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginTop: 30 }}>
          <div style={{ width: 220, height: 310, position: 'relative', transform: 'rotate(-2deg)' }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: product.accent, border: `2px solid ${TP.ink}`,
              boxShadow: `4px 4px 0 ${TP.ink}, 0 14px 28px rgba(27,31,42,0.25)`,
              clipPath: 'polygon(0 12%, 50% 0, 100% 12%, 100% 100%, 0 100%)',
              padding: '46px 14px 18px', color: TP.paper3,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ position: 'absolute', top: 36, left: 8, right: 8, bottom: 8, border: `1px dashed rgba(245,235,214,0.5)`, pointerEvents: 'none' }} />
              <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <span style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 16, color: TP.paper3, letterSpacing: '0.18em', textAlign: 'center', opacity: 0.85 }}>LITERARY ROADS</span>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 18 }}>
                <div style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 9, letterSpacing: '0.16em', color: 'rgba(245,235,214,0.7)' }}>FROM · TRADING POST</div>
                <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 16, lineHeight: 1, color: TP.paper3, marginTop: 2, fontStyle: 'italic' }}>{product.title}</div>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 10, left: 110 - 12, width: 24, height: 24, borderRadius: '50%', zIndex: 4, background: 'radial-gradient(circle at 35% 35%, #f5e0a8, #b6892f 60%, #6f4a14 100%)', boxShadow: 'inset 0 -2px 2px rgba(0,0,0,0.4), 0 2px 0 rgba(0,0,0,0.3)', border: `2px solid ${TP.ink}` }}>
              <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: TP.paper3, border: `1.5px solid ${TP.ink}` }} />
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', top: 18, right: 16, zIndex: 6 }}>
          <Stamp tilt={8} color={TP.signGreen}><span style={{ color: TP.paper3 }}>✦ IN STOCK</span></Stamp>
        </div>
      </section>

      {/* Details */}
      <section style={{ padding: '20px 16px 0' }}>
        <div style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 10, letterSpacing: '0.22em', color: TP.inkSoft }}>
          {product.kind === 'journal' ? 'JOURNALS' : product.kind === 'sticker' ? 'STICKERS' : 'BOOKMARKS'}
        </div>
        <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 30, lineHeight: 1, margin: '4px 0 6px', color: TP.ink, fontStyle: 'italic' }}>{product.title}</h1>
        {product.sub && (
          <p style={{ fontFamily: '"Fraunces", serif', fontSize: 14, lineHeight: 1.55, color: TP.inkSoft, margin: '4px 0 0' }}>
            {product.sub} · handcrafted, mailed in a real envelope from Kansas City.
          </p>
        )}

        {/* Price row */}
        <div style={{ marginTop: 14, padding: '10px 12px', background: TP.paper3, border: `1.5px solid ${TP.ink}`, boxShadow: `2px 2px 0 ${TP.ink}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <MileageMarker price={`$${product.price}`} scale={1.0} label="TAKE IT HOME" tilt={-3} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: TP.inkMute, letterSpacing: '0.08em' }}>${product.price}.00 USD · qty 1</div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: TP.inkMute, letterSpacing: '0.06em', marginTop: 4 }}>ships 3–5 business days · printful</div>
          </div>
        </div>

        {/* Variant chips */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 10, letterSpacing: '0.18em', color: TP.inkSoft, marginBottom: 6 }}>STYLE</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {VARIANTS.map(v => (
              <button key={v.id} onClick={() => setVariant(v.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px 5px 5px',
                background: TP.paper3, border: `1.5px solid ${TP.ink}`,
                boxShadow: variant === v.id ? `2px 2px 0 ${TP.ink}` : 'none',
                transform: variant === v.id ? 'translate(-1px,-1px)' : 'none',
                cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif', fontSize: 11, color: TP.ink,
              }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: v.color, border: `1.5px solid ${TP.ink}` }} />
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Qty + Add */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'stretch', boxShadow: `2px 2px 0 ${TP.ink}` }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity" style={{ width: 32, height: 32, background: TP.paper3, border: `1.5px solid ${TP.ink}`, fontFamily: '"DM Serif Display", serif', fontSize: 18, color: TP.ink, cursor: 'pointer', lineHeight: 1 }}>−</button>
            <div role="status" aria-live="polite" style={{ minWidth: 44, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: TP.paper3, borderTop: `1.5px solid ${TP.ink}`, borderBottom: `1.5px solid ${TP.ink}`, fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: TP.ink }}>{qty.toString().padStart(2,'0')}</div>
            <button onClick={() => setQty(q => q + 1)} aria-label="Increase quantity" style={{ width: 32, height: 32, background: TP.paper3, border: `1.5px solid ${TP.ink}`, fontFamily: '"DM Serif Display", serif', fontSize: 18, color: TP.ink, cursor: 'pointer', lineHeight: 1 }}>+</button>
          </div>
          <button onClick={handleAdd} style={{
            flex: 1, height: 44,
            background: TP.ink, color: TP.paper3,
            border: `1.5px solid ${TP.ink}`, boxShadow: `3px 3px 0 ${TP.ink}`,
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
            fontSize: 14, letterSpacing: '0.04em', cursor: 'pointer',
            transition: 'transform 120ms ease, box-shadow 120ms ease',
          }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translate(3px,3px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `3px 3px 0 ${TP.ink}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `3px 3px 0 ${TP.ink}`; }}
          >Add to satchel — ${(product.price * qty).toFixed(2)}</button>
        </div>

        {/* Spec ticker */}
        <div style={{ marginTop: 18, padding: '10px 12px', border: `1px dashed ${TP.ink}` }}>
          {[
            ['MADE',  'Risograph + foil stamp · Kansas City'],
            ['PAYS',  'Stripe (Apple Pay, Link, card)'],
            ['SHIPS', 'USPS first-class · worldwide'],
          ].map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', gap: 12, padding: '5px 0', borderTop: i ? `1px dotted ${TP.line2}` : 'none', fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>
              <div style={{ width: 56, color: TP.inkMute, letterSpacing: '0.08em' }}>{k}</div>
              <div style={{ color: TP.ink, flex: 1 }}>{v}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: 30 }} />
    </div>
  );
}

// ── Checkout view ─────────────────────────────────────────────────────────────
function CheckoutView({ headerProps, cart, cartTotal, onPay }) {
  const lineItems = ALL_PRODUCTS.filter(p => cart[p.id] > 0).map(p => ({
    qty: cart[p.id], name: p.title, sub: p.sub || p.kind, price: p.price,
  }));

  if (lineItems.length === 0) {
    return (
      <div style={S.page}>
        <ShopHeader {...headerProps} sub="✦ THE TILL ✦" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', fontSize: 24, color: TP.ink, marginBottom: 8 }}>Your satchel's empty.</div>
          <p style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: 13, color: TP.inkMute, maxWidth: 260 }}>Head back to the shelves to find something for the road.</p>
        </div>
      </div>
    );
  }

  const shipping = cartTotal >= 35 ? 0 : 4.50;
  const tax = +(cartTotal * 0.069).toFixed(2);
  const total = +(cartTotal + shipping + tax).toFixed(2);

  const serration = 'polygon(0 0, 4% 100%, 8% 0, 12% 100%, 16% 0, 20% 100%, 24% 0, 28% 100%, 32% 0, 36% 100%, 40% 0, 44% 100%, 48% 0, 52% 100%, 56% 0, 60% 100%, 64% 0, 68% 100%, 72% 0, 76% 100%, 80% 0, 84% 100%, 88% 0, 92% 100%, 96% 0, 100% 100%)';

  return (
    <div style={S.page}>
      <PaperTexture opacity={0.05} />
      <ShopHeader {...headerProps} sub="✦ THE TILL ✦" />

      <div style={{ margin: '6px 18px 0', position: 'relative' }}>
        {/* till stub */}
        <div style={{ height: 10, background: `linear-gradient(180deg, ${TP.wood2}, ${TP.wood3})`, border: `1.5px solid ${TP.ink}`, borderBottom: 'none', borderTopLeftRadius: 4, borderTopRightRadius: 4, position: 'relative', zIndex: 2 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: -6, height: 6, background: TP.paper3, clipPath: serration }} />
        </div>

        {/* receipt body */}
        <div style={{ background: TP.paper3, padding: '18px 16px 14px', border: `1.5px solid ${TP.ink}`, borderTop: 'none', boxShadow: `3px 3px 0 ${TP.ink}, 0 12px 24px rgba(27,31,42,0.15)`, position: 'relative' }}>
          {/* header */}
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 14, letterSpacing: '0.22em', color: TP.ink }}>THE TRADING POST</div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: TP.inkMute, letterSpacing: '0.08em', marginTop: 2 }}>LITERARY ROADS — {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</div>
            <div style={{ height: 1, background: TP.ink, margin: '8px 0', opacity: 0.85 }} />
            <div style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: 12, color: TP.inkSoft }}>"Items fairly chosen. Thank you kindly."</div>
          </div>

          {/* line items */}
          <div>
            {lineItems.map((it, i) => (
              <ReceiptLine key={i} qty={it.qty} name={it.name} sub={it.sub} price={it.qty * it.price} />
            ))}
          </div>

          {/* totals */}
          <div style={{ marginTop: 8, borderTop: `1px solid ${TP.ink}`, paddingTop: 8 }}>
            <FieldRow label="SUBTOTAL" value={`$${cartTotal.toFixed(2)}`} mono />
            <FieldRow label="SHIPPING" value={shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`} mono />
            <FieldRow label="TAX · MO" value={`$${tax.toFixed(2)}`} mono />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: '10px 0', borderTop: `2px solid ${TP.ink}`, borderBottom: `2px solid ${TP.ink}` }}>
            <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 22, color: TP.ink, fontStyle: 'italic' }}>Total</span>
            <MileageMarker price={`$${Math.floor(total)}`} scale={0.85} tilt={-3} label={`.${(total % 1 * 100).toFixed(0).padStart(2,'0')} USD`} />
          </div>

          {/* Ship to */}
          <div style={{ marginTop: 14, padding: '10px 12px', background: TP.paper, border: `1.5px dashed ${TP.ink}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 11, letterSpacing: '0.2em', color: TP.ink }}>SHIP TO</span>
            </div>
            <div style={{ fontFamily: '"Fraunces", serif', fontSize: 13, lineHeight: 1.4, color: TP.inkSoft, fontStyle: 'italic' }}>
              Address collected at checkout via Stripe
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Stamp tilt={-3} color={TP.teal}><span style={{ color: TP.ink }}>PRINTFUL · KC FULFILLMENT</span></Stamp>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: TP.inkMute, letterSpacing: '0.04em' }}>3–5 bus. days</span>
            </div>
          </div>

          {/* Pay with */}
          <div style={{ marginTop: 10, padding: '10px 12px', background: TP.paper, border: `1.5px dashed ${TP.ink}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: '"IM Fell English SC", serif', fontSize: 11, letterSpacing: '0.2em', color: TP.ink }}>PAY WITH</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: TP.inkMute, letterSpacing: '0.1em' }}>SECURED · STRIPE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 24, borderRadius: 3, background: '#635BFF', border: `1.5px solid ${TP.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 11, color: '#fff' }}>STR</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: TP.inkMute, letterSpacing: '0.04em' }}>Apple Pay · Link · card</div>
              </div>
            </div>
          </div>

          {/* Pay button */}
          <button onClick={onPay} style={{
            marginTop: 14, width: '100%', height: 52,
            background: 'linear-gradient(180deg, #7A6BFF 0%, #635BFF 100%)',
            color: '#fff', border: `1.5px solid ${TP.ink}`, boxShadow: `3px 3px 0 ${TP.ink}`,
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
            fontSize: 15, letterSpacing: '0.04em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'transform 120ms ease, box-shadow 120ms ease',
          }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translate(3px,3px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `3px 3px 0 ${TP.ink}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `3px 3px 0 ${TP.ink}`; }}
          >
            <span>Pay ${total.toFixed(2)}</span>
            <span style={{ opacity: 0.6 }}>·</span>
            <span style={{ opacity: 0.85, fontSize: 11, letterSpacing: '0.12em' }}>STRIPE CHECKOUT →</span>
          </button>

          <p style={{ marginTop: 10, fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: 11, lineHeight: 1.45, color: TP.inkSoft, textAlign: 'center' }}>
            By tapping pay, you trust us to wrap your goods in brown paper, tie them with twine, &amp; mail them honestly.
          </p>

          {/* READY stamp watermark */}
          <div style={{ position: 'absolute', right: -8, bottom: 80, transform: 'rotate(-12deg)', opacity: 0.18, pointerEvents: 'none' }}>
            <div style={{ border: `3px solid ${TP.postRed}`, borderRadius: 4, padding: '4px 12px', fontFamily: '"DM Serif Display", serif', fontSize: 36, color: TP.postRed, letterSpacing: '0.04em' }}>READY</div>
          </div>
        </div>

        {/* tear-off bottom */}
        <div style={{ height: 14, position: 'relative' }}>
          <div style={{ height: 8, background: TP.paper3, clipPath: serration, borderLeft: `1.5px solid ${TP.ink}`, borderRight: `1.5px solid ${TP.ink}` }} />
        </div>
      </div>

      <div style={{ height: 30 }} />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    position: 'fixed', inset: 0,
    overflowY: 'auto', overflowX: 'hidden',
    background: TP.paper,
    color: TP.ink,
  },
  inkBtn: {
    background: TP.ink, color: TP.paper3,
    border: `1.5px solid ${TP.ink}`, boxShadow: `3px 3px 0 ${TP.ink}`,
    fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
    fontSize: 14, letterSpacing: '0.04em',
    padding: '12px 28px', cursor: 'pointer',
  },
};
