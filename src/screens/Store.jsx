import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../config/firebase';

const SYNC_PRODUCT_ID = '427886181';
const BASE_URL        = import.meta.env.BASE_URL || '/';

const getProductFn          = httpsCallable(functions, 'getProduct');
const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');

const C = {
  bg:      '#2C1A0E',
  orange:  '#FF4E00',
  teal:    '#40E0D0',
  cream:   '#FFF8E7',
  muted:   'rgba(255,248,231,0.45)',
  dimmed:  'rgba(255,248,231,0.22)',
  cardBg:  'rgba(255,255,255,0.05)',
  border:  'rgba(255,248,231,0.12)',
};

// ── Highway sign components ───────────────────────────────────────────────────

function Nail({ top, left, right, bottom }) {
  const pos = { position: 'absolute', width: 7, height: 7, borderRadius: '50%',
    background: '#8B7355', border: '1px solid #5A4A35', zIndex: 2 };
  return <div style={{ ...pos, top, left, right, bottom }} />;
}

function InterstateSign({ number, rotation = 0 }) {
  return (
    <div style={{ position: 'relative', transform: `rotate(${rotation}deg)`, display: 'inline-block' }}>
      <Nail top={2} left={6} /> <Nail top={2} right={6} />
      <Nail bottom={2} left={6} /> <Nail bottom={2} right={6} />
      <svg width={58} height={66} viewBox="0 0 58 66">
        {/* Shield outline */}
        <path d="M4,14 Q29,1 54,14 L54,52 Q29,65 4,52 Z" fill="#1A5C2A" stroke="white" strokeWidth="2.5"/>
        <path d="M8,16 Q29,5 50,16 L50,50 Q29,61 8,50 Z" fill="none" stroke="white" strokeWidth="1" opacity="0.4"/>
        <text x="29" y="26" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial, sans-serif" letterSpacing="0.5">INTERSTATE</text>
        <text x="29" y="50" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="Arial, sans-serif">{number}</text>
      </svg>
    </div>
  );
}

function NPSign({ line1, line2, rotation = 0, width = 96 }) {
  return (
    <div style={{ position: 'relative', transform: `rotate(${rotation}deg)`, display: 'inline-block' }}>
      <Nail top={3} left={5} /> <Nail top={3} right={5} />
      <Nail bottom={3} left={5} /> <Nail bottom={3} right={5} />
      <svg width={width} height={44} viewBox={`0 0 ${width} 44`}>
        <rect x="1" y="1" width={width-2} height="42" rx="3" fill="#4A3218" stroke="#C8A456" strokeWidth="2"/>
        <rect x="5" y="5" width={width-10} height="34" rx="1.5" fill="none" stroke="#C8A456" strokeWidth="1"/>
        <text x={width/2} y="21" textAnchor="middle" fill="#C8A456" fontSize="8" fontFamily="Arial, sans-serif" fontWeight="bold">{line1}</text>
        <text x={width/2} y="33" textAnchor="middle" fill="#C8A456" fontSize="7" fontFamily="Arial, sans-serif">{line2}</text>
      </svg>
    </div>
  );
}

function ServiceSign({ line1, line2, rotation = 0 }) {
  return (
    <div style={{ position: 'relative', transform: `rotate(${rotation}deg)`, display: 'inline-block' }}>
      <Nail top={3} left={5} /> <Nail top={3} right={5} />
      <Nail bottom={3} left={5} /> <Nail bottom={3} right={5} />
      <svg width={80} height={44} viewBox="0 0 80 44">
        <rect x="1" y="1" width="78" height="42" rx="4" fill="#1B4A7A" stroke="white" strokeWidth="2"/>
        <text x="40" y="20" textAnchor="middle" fill="white" fontSize="9" fontFamily="Arial, sans-serif" fontWeight="bold">{line1}</text>
        <text x="40" y="33" textAnchor="middle" fill="white" fontSize="8" fontFamily="Arial, sans-serif">{line2}</text>
      </svg>
    </div>
  );
}

function DiamondSign({ line1, line2, rotation = 0 }) {
  return (
    <div style={{ position: 'relative', width: 58, height: 58, transform: `rotate(${rotation}deg)`, display: 'inline-block' }}>
      <Nail top={1} left={'calc(50% - 3.5px)'} />
      <Nail bottom={1} left={'calc(50% - 3.5px)'} />
      <svg width={58} height={58} viewBox="0 0 58 58">
        <rect x="10" y="10" width="38" height="38" rx="3" fill="#E8C430" stroke="#9A8010" strokeWidth="2" transform="rotate(45 29 29)"/>
        <text x="29" y="26" textAnchor="middle" fill="#1A1A00" fontSize="7" fontFamily="Arial, sans-serif" fontWeight="bold">{line1}</text>
        <text x="29" y="36" textAnchor="middle" fill="#1A1A00" fontSize="7" fontFamily="Arial, sans-serif" fontWeight="bold">{line2}</text>
      </svg>
    </div>
  );
}

// ── Coming Soon card ──────────────────────────────────────────────────────────

function ComingSoonCard({ name, icon }) {
  return (
    <div style={{
      background: C.cardBg,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: '28px 20px',
      textAlign: 'center',
      opacity: 0.5,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12, filter: 'grayscale(1)' }}>{icon}</div>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: C.cream, margin: '0 0 8px' }}>{name}</p>
      <span style={{
        display: 'inline-block',
        fontFamily: 'Special Elite, serif',
        fontSize: 11,
        letterSpacing: '0.12em',
        color: C.teal,
        textTransform: 'uppercase',
        border: `1px solid ${C.teal}`,
        borderRadius: 20,
        padding: '3px 10px',
      }}>Coming Soon</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Store({ onBack }) {
  const [storeEnabled,    setStoreEnabled]    = useState(null);
  const [product,         setProduct]         = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity,        setQuantity]        = useState(1);
  const [loading,         setLoading]         = useState(true);
  const [checkingOut,     setCheckingOut]     = useState(false);
  const [error,           setError]           = useState(null);

  const params   = new URLSearchParams(window.location.search);
  const success  = params.get('success');
  const canceled = params.get('canceled');

  useEffect(() => {
    getDoc(doc(db, 'config', 'store'))
      .then(snap => setStoreEnabled(snap.exists() ? snap.data().enabled === true : false))
      .catch(() => setStoreEnabled(false));
  }, []);

  useEffect(() => {
    if (!storeEnabled) return;
    setLoading(true);
    getProductFn({ syncProductId: SYNC_PRODUCT_ID })
      .then(res => {
        setProduct(res.data);
        setSelectedVariant(res.data.variants?.[0] ?? null);
      })
      .catch(err => setError(err.message || 'Failed to load product.'))
      .finally(() => setLoading(false));
  }, [storeEnabled]);

  const handleCheckout = async () => {
    if (!selectedVariant) return;
    setCheckingOut(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const base   = `${origin}/literary-roads/store`;
      const res    = await createCheckoutSession({
        variantId:  String(selectedVariant.id),
        quantity,
        successUrl: `${base}?success=true`,
        cancelUrl:  `${base}?canceled=true`,
      });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.message || 'Checkout failed. Please try again.');
      setCheckingOut(false);
    }
  };

  // ── Loading flag ─────────────────────────────────────────────────────────────
  if (storeEnabled === null) {
    return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted, fontFamily: 'Special Elite, serif' }}>Loading...</p>
    </div>;
  }

  // ── Store disabled ────────────────────────────────────────────────────────────
  if (!storeEnabled) {
    return (
      <div style={S.page}>
        <NavBar onBack={onBack} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', padding: '0 24px' }}>
          <h1 style={S.storeName}><span style={{ color: C.orange }}>Trading</span> Post</h1>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.teal, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '8px 0 24px' }}>Coming Soon</p>
          <p style={{ color: C.muted, fontFamily: 'Special Elite, serif', fontSize: 14 }}>Check back soon for Literary Roads gear.</p>
        </div>
      </div>
    );
  }

  // ── Post-checkout: success ────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={S.page}>
        <NavBar onBack={onBack} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', padding: '0 24px' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>&#10003;</p>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: C.cream, margin: '0 0 12px' }}>Order Confirmed</h2>
          <p style={{ color: C.muted, fontFamily: 'Special Elite, serif', fontSize: 14, maxWidth: 320, margin: '0 0 28px' }}>
            Thanks for your order! A confirmation email is on its way.
          </p>
          <button onClick={() => window.history.replaceState({}, '', window.location.pathname)} style={S.primaryBtn}>
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  // ── Post-checkout: canceled ───────────────────────────────────────────────────
  if (canceled) {
    return (
      <div style={S.page}>
        <NavBar onBack={onBack} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', padding: '0 24px' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: C.cream, margin: '0 0 12px' }}>No worries.</h2>
          <p style={{ color: C.muted, fontFamily: 'Special Elite, serif', fontSize: 14, maxWidth: 320, margin: '0 0 28px' }}>
            Come back anytime — your road trip merch will be here waiting.
          </p>
          <button onClick={() => window.history.replaceState({}, '', window.location.pathname)} style={S.primaryBtn}>
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  // ── Main store ────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <NavBar onBack={onBack} />

      {/* ── Hero wall ── */}
      <div style={S.heroWall}>
        {/* Sign row top */}
        <div style={S.signRow}>
          <InterstateSign number="66" rotation={-4} />
          <NPSign line1="LEWIS & CLARK" line2="NATIONAL TRAIL" rotation={2} width={110} />
          <ServiceSign line1="REST AREA" line2="2 MILES" rotation={-3} />
          <DiamondSign line1="WINDING" line2="ROAD" rotation={5} />
          <InterstateSign number="40" rotation={3} />
          <NPSign line1="APPALACHIAN" line2="SCENIC TRAIL" rotation={-2} width={110} />
        </div>

        {/* Cat + proprietor */}
        <div style={S.catBlock}>
          <img
            src={`${BASE_URL}images/store-cat.png`}
            alt="Store proprietor"
            style={S.catImg}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <p style={S.proprietorLabel}>Proprietor</p>
        </div>

        {/* Sign row bottom */}
        <div style={S.signRow}>
          <DiamondSign line1="BOOK" line2="CROSSING" rotation={-5} />
          <ServiceSign line1="BOOKSTORE" line2="NEXT EXIT" rotation={3} />
          <NPSign line1="BLUE RIDGE" line2="PARKWAY" rotation={-2} width={100} />
          <InterstateSign number="10" rotation={4} />
          <DiamondSign line1="SLOW" line2="READERS" rotation={-3} />
          <ServiceSign line1="COFFEE" line2="AHEAD" rotation={2} />
        </div>
      </div>

      {/* ── Store name & tagline ── */}
      <div style={{ textAlign: 'center', padding: '28px 16px 0' }}>
        <h1 style={S.storeName}>
          The <span style={{ color: C.orange }}>Trading</span> Post
        </h1>
        <p style={S.tagline}>Goods for the literary road tripper</p>
      </div>

      {/* ── Dashed divider ── */}
      <div style={S.divider} />

      {/* ── Product grid ── */}
      <div style={S.grid}>

        {/* Real product */}
        <div style={S.productCard}>
          {loading && <p style={{ color: C.muted, fontFamily: 'Special Elite, serif', textAlign: 'center', padding: 40 }}>Loading...</p>}
          {error   && <p style={{ color: C.orange, fontFamily: 'Special Elite, serif', fontSize: 13, textAlign: 'center', padding: 20 }}>{error}</p>}

          {product && !loading && (
            <>
              {product.thumbnail && (
                <img src={product.thumbnail} alt={product.name} style={S.productImg} />
              )}
              <h2 style={S.productName}>{product.name}</h2>

              {product.variants?.length > 1 && (
                <div style={{ marginBottom: 14 }}>
                  <label style={S.fieldLabel}>Style</label>
                  <select
                    value={selectedVariant?.id ?? ''}
                    onChange={e => setSelectedVariant(product.variants.find(v => String(v.id) === e.target.value))}
                    style={S.select}
                  >
                    {product.variants.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedVariant && (
                <p style={S.price}>${parseFloat(selectedVariant.price).toFixed(2)}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <label style={S.fieldLabel}>Qty</label>
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={S.qtyBtn}>−</button>
                <span style={{ color: C.cream, fontFamily: 'Georgia, serif', fontSize: 16, minWidth: 20, textAlign: 'center' }}>{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(10, q + 1))} style={S.qtyBtn}>+</button>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkingOut || !selectedVariant}
                style={{ ...S.primaryBtn, width: '100%', opacity: checkingOut ? 0.6 : 1 }}
              >
                {checkingOut ? 'Redirecting...' : 'Buy Now'}
              </button>

              {error && <p style={{ color: C.orange, fontSize: 12, marginTop: 10, textAlign: 'center' }}>{error}</p>}
            </>
          )}
        </div>

        {/* Coming soon cards */}
        <ComingSoonCard name="Literary Passport" icon="&#128220;" />
        <ComingSoonCard name="Enamel Pin" icon="&#128204;" />
      </div>

      {/* ── Footer ── */}
      <p style={S.footer}>
        Printed &amp; shipped via Printful &nbsp;&middot;&nbsp; Free shipping over $35
      </p>
    </div>
  );
}

// ── Nav bar ───────────────────────────────────────────────────────────────────

function NavBar({ onBack }) {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 20px',
      borderBottom: '1px solid rgba(255,248,231,0.08)',
    }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'Special Elite, serif', fontSize: 14,
        color: '#40E0D0', padding: 0, letterSpacing: '0.02em',
      }}>
        &#8592; Literary Roads
      </button>
      <span style={{
        fontFamily: 'Special Elite, serif', fontSize: 13,
        color: 'rgba(255,248,231,0.35)', letterSpacing: '0.06em',
      }}>
        Cart (0)
      </span>
    </nav>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    color: C.cream,
    fontFamily: 'Special Elite, serif',
  },
  heroWall: {
    background: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 60px), #3A2010',
    borderBottom: '4px solid #1A0E06',
    padding: '28px 16px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    boxShadow: 'inset 0 -8px 20px rgba(0,0,0,0.4)',
  },
  signRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  catBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '8px 24px',
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    border: '1px solid rgba(255,248,231,0.08)',
    minWidth: 120,
    minHeight: 80,
    justifyContent: 'center',
  },
  catImg: {
    width: 90,
    height: 90,
    objectFit: 'contain',
  },
  proprietorLabel: {
    fontFamily: 'Special Elite, serif',
    fontSize: 11,
    color: 'rgba(255,248,231,0.35)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    margin: 0,
  },
  storeName: {
    fontFamily: 'Georgia, serif',
    fontSize: 'clamp(28px, 6vw, 48px)',
    fontWeight: 'normal',
    color: C.cream,
    margin: '0 0 8px',
    letterSpacing: '0.02em',
  },
  tagline: {
    fontFamily: 'Special Elite, serif',
    fontSize: 12,
    color: C.teal,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    margin: 0,
  },
  divider: {
    margin: '20px auto',
    maxWidth: 640,
    borderTop: `2px dashed ${C.orange}`,
    opacity: 0.6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20,
    maxWidth: 860,
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  productCard: {
    background: C.cardBg,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '24px 20px',
  },
  productImg: {
    width: '100%',
    maxWidth: 220,
    display: 'block',
    margin: '0 auto 16px',
    borderRadius: 6,
  },
  productName: {
    fontFamily: 'Georgia, serif',
    fontSize: 18,
    fontWeight: 'normal',
    color: C.cream,
    margin: '0 0 12px',
    textAlign: 'center',
  },
  price: {
    fontFamily: 'Georgia, serif',
    fontSize: 26,
    color: C.orange,
    margin: '0 0 16px',
    textAlign: 'center',
  },
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    color: C.muted,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  select: {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${C.border}`,
    color: C.cream,
    fontFamily: 'Special Elite, serif',
    fontSize: 14,
    padding: '8px 10px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  qtyBtn: {
    width: 32,
    height: 32,
    background: 'rgba(64,224,208,0.08)',
    border: `1px solid rgba(64,224,208,0.35)`,
    color: C.teal,
    fontSize: 18,
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Georgia, serif',
    lineHeight: 1,
  },
  primaryBtn: {
    background: C.orange,
    color: '#1A0E06',
    border: 'none',
    fontFamily: 'Georgia, serif',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: '0.04em',
    padding: '13px 28px',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'inline-block',
  },
  footer: {
    textAlign: 'center',
    fontFamily: 'Special Elite, serif',
    fontSize: 12,
    color: C.muted,
    letterSpacing: '0.06em',
    padding: '0 16px 32px',
  },
};
