import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../config/firebase';

const SYNC_PRODUCT_ID = '427886181';

const getProduct          = httpsCallable(functions, 'getProduct');
const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');

export default function Store({ onBack }) {
  const [storeEnabled, setStoreEnabled] = useState(null); // null = loading
  const [product,      setProduct]      = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity,     setQuantity]     = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [checkingOut,  setCheckingOut]  = useState(false);
  const [error,        setError]        = useState(null);

  // Check success/canceled params from Stripe redirect
  const params   = new URLSearchParams(window.location.search);
  const success  = params.get('success');
  const canceled = params.get('canceled');

  // Read storeEnabled flag from Firestore config/store
  useEffect(() => {
    getDoc(doc(db, 'config', 'store'))
      .then(snap => setStoreEnabled(snap.exists() ? snap.data().enabled === true : false))
      .catch(() => setStoreEnabled(false));
  }, []);

  // Fetch product from Printful via Cloud Function
  useEffect(() => {
    if (!storeEnabled) return;
    setLoading(true);
    getProduct({ syncProductId: SYNC_PRODUCT_ID })
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
      const origin     = window.location.origin;
      const base       = `${origin}/literary-roads/store`;
      const res        = await createCheckoutSession({
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

  // ── Still checking the flag ──────────────────────────────────────────────────
  if (storeEnabled === null) {
    return (
      <div style={styles.page}>
        <p style={styles.dimText}>Loading...</p>
      </div>
    );
  }

  // ── Store not yet enabled ────────────────────────────────────────────────────
  if (!storeEnabled) {
    return (
      <div style={styles.page}>
        <button onClick={onBack} style={styles.backBtn}>← Back</button>
        <div style={styles.centered}>
          <h1 style={styles.heading}>THE LITERARY ROADS SHOP</h1>
          <p style={styles.comingSoon}>Coming Soon</p>
          <p style={styles.dimText}>Check back soon for Literary Roads gear.</p>
        </div>
      </div>
    );
  }

  // ── Post-checkout feedback ───────────────────────────────────────────────────
  if (success) {
    return (
      <div style={styles.page}>
        <button onClick={onBack} style={styles.backBtn}>← Back</button>
        <div style={styles.centered}>
          <h1 style={styles.heading}>ORDER CONFIRMED</h1>
          <p style={{ ...styles.dimText, marginTop: 12 }}>
            Thanks for your order! You'll receive a confirmation email shortly.
          </p>
          <button onClick={() => window.history.replaceState({}, '', window.location.pathname)} style={styles.primaryBtn}>
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  if (canceled) {
    return (
      <div style={styles.page}>
        <button onClick={onBack} style={styles.backBtn}>← Back</button>
        <div style={styles.centered}>
          <h1 style={styles.heading}>ORDER CANCELED</h1>
          <p style={{ ...styles.dimText, marginTop: 12 }}>No worries — your order was not placed.</p>
          <button onClick={() => window.history.replaceState({}, '', window.location.pathname)} style={styles.primaryBtn}>
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  // ── Main store ───────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <button onClick={onBack} style={styles.backBtn}>← Back</button>

      <h1 style={{ ...styles.heading, marginBottom: 32 }}>THE LITERARY ROADS SHOP</h1>

      {loading && <p style={styles.dimText}>Loading product...</p>}
      {error   && <p style={styles.errorText}>{error}</p>}

      {product && !loading && (
        <div style={styles.card}>
          {/* Product image */}
          {product.thumbnail && (
            <img
              src={product.thumbnail}
              alt={product.name}
              style={styles.productImage}
            />
          )}

          {/* Product name */}
          <h2 style={styles.productName}>{product.name}</h2>

          {/* Variant selector */}
          {product.variants?.length > 1 && (
            <div style={styles.field}>
              <label style={styles.label}>Style</label>
              <select
                value={selectedVariant?.id ?? ''}
                onChange={e => setSelectedVariant(product.variants.find(v => String(v.id) === e.target.value))}
                style={styles.select}
              >
                {product.variants.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Price */}
          {selectedVariant && (
            <p style={styles.price}>
              ${parseFloat(selectedVariant.price).toFixed(2)} {selectedVariant.currency}
            </p>
          )}

          {/* Quantity */}
          <div style={styles.field}>
            <label style={styles.label}>Quantity</label>
            <div style={styles.qtyRow}>
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={styles.qtyBtn}>−</button>
              <span style={styles.qtyValue}>{quantity}</span>
              <button onClick={() => setQuantity(q => Math.min(10, q + 1))} style={styles.qtyBtn}>+</button>
            </div>
          </div>

          {/* Checkout */}
          <button
            onClick={handleCheckout}
            disabled={checkingOut || !selectedVariant}
            style={{ ...styles.primaryBtn, marginTop: 24, width: '100%', opacity: checkingOut ? 0.6 : 1 }}
          >
            {checkingOut ? 'REDIRECTING...' : 'BUY NOW'}
          </button>

          {error && <p style={styles.errorText}>{error}</p>}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#1A1B2E',
    color: '#F5F5DC',
    padding: '24px 16px',
    fontFamily: 'Special Elite, serif',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: '#40E0D0',
    fontFamily: 'Special Elite, serif',
    fontSize: 14,
    cursor: 'pointer',
    padding: '4px 0',
    marginBottom: 24,
    display: 'block',
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    textAlign: 'center',
  },
  heading: {
    fontFamily: 'Bungee, sans-serif',
    fontSize: 22,
    color: '#40E0D0',
    letterSpacing: '0.06em',
    margin: 0,
    textAlign: 'center',
  },
  comingSoon: {
    fontFamily: 'Bungee, sans-serif',
    fontSize: 36,
    color: '#FF4E00',
    margin: '16px 0 8px',
    letterSpacing: '0.04em',
  },
  dimText: {
    color: 'rgba(245,245,220,0.55)',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF4E00',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  card: {
    maxWidth: 400,
    margin: '0 auto',
  },
  productImage: {
    width: '100%',
    maxWidth: 320,
    display: 'block',
    margin: '0 auto 20px',
    borderRadius: 8,
  },
  productName: {
    fontFamily: 'Bungee, sans-serif',
    fontSize: 18,
    color: '#F5F5DC',
    letterSpacing: '0.04em',
    margin: '0 0 16px',
    textAlign: 'center',
  },
  price: {
    fontFamily: 'Bungee, sans-serif',
    fontSize: 24,
    color: '#FF4E00',
    margin: '8px 0 16px',
    textAlign: 'center',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: 'rgba(245,245,220,0.55)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  select: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(64,224,208,0.4)',
    color: '#F5F5DC',
    fontFamily: 'Special Elite, serif',
    fontSize: 14,
    padding: '8px 10px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  qtyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    background: 'rgba(64,224,208,0.1)',
    border: '1px solid rgba(64,224,208,0.4)',
    color: '#40E0D0',
    fontSize: 20,
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Bungee, sans-serif',
  },
  qtyValue: {
    fontSize: 18,
    color: '#F5F5DC',
    fontFamily: 'Bungee, sans-serif',
    minWidth: 24,
    textAlign: 'center',
  },
  primaryBtn: {
    background: '#FF4E00',
    color: '#1A1B2E',
    border: 'none',
    fontFamily: 'Bungee, sans-serif',
    fontSize: 14,
    letterSpacing: '0.06em',
    padding: '14px 24px',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'block',
  },
};
