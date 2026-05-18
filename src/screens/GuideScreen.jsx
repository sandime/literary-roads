// src/screens/GuideScreen.jsx
// Full reading view for a Literary Roads Bookstore Guide
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { fetchGuide, fetchGuideStores } from '../utils/bookstoreGuides';

// Search bookstores by name, then narrow by city client-side (avoids a composite index).
// Returns the matched Firestore doc (with id) if found, or null.
async function resolveStore(store) {
  const snap = await getDocs(
    query(collection(db, 'bookstores'), where('name', '==', store.name), limit(20))
  );
  if (!snap.empty) {
    const candidates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Prefer the one whose city matches; fall back to the first result
    const match = candidates.find(b => b.city === store.city) ?? candidates[0];
    if (match.lat != null && match.lng != null) return match;
  }
  return null;
}

export default function GuideScreen() {
  const { guideId } = useParams();
  const navigate    = useNavigate();
  const [guide, setGuide]         = useState(null);
  const [stores, setStores]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [finding, setFinding]     = useState(null);   // storeId currently searching
  const [notFound, setNotFound]   = useState(null);   // storeId that returned no location

  // Override global overflow:hidden so this page can scroll
  useEffect(() => {
    const root = document.getElementById('root');
    document.body.style.overflow = 'auto';
    if (root) { root.style.overflow = 'auto'; root.style.height = 'auto'; }
    return () => {
      document.body.style.overflow = '';
      if (root) { root.style.overflow = ''; root.style.height = ''; }
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [g, s] = await Promise.all([fetchGuide(guideId), fetchGuideStores(guideId)]);
        setGuide(g);
        setStores(s);
      } catch (err) {
        console.error('[GuideScreen]', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [guideId]);

  const handleFindOnMap = async (store) => {
    setFinding(store.id);
    setNotFound(null);
    try {
      const base = import.meta.env.BASE_URL || '/';
      const matched = await resolveStore(store);
      if (matched) {
        // Open map and load the actual bookstore shelf
        window.open(`${window.location.origin}${base}#/?bookstoreId=${matched.id}`, '_blank');
      } else if (store.lat != null && store.lng != null) {
        // Not in the database but we have coordinates — fly there and drop a named pin
        const params = new URLSearchParams({ center: `${store.lat},${store.lng}`, pinType: 'bookstore' });
        if (store.name)    params.set('pinName', store.name);
        if (store.city)    params.set('pinCity', store.city);
        if (store.state)   params.set('pinState', store.state);
        if (store.website) params.set('pinWebsite', store.website);
        window.open(`${window.location.origin}${base}#/?${params}`, '_blank');
      } else {
        setNotFound(store.id);
        setTimeout(() => setNotFound(null), 3000);
      }
    } catch (err) {
      console.error('[GuideScreen] findOnMap', err);
    } finally {
      setFinding(null);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/resources');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1A1B2E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Special Elite, serif', color: 'rgba(245,245,220,0.45)', fontSize: 14 }}>Loading guide...</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div style={{ minHeight: '100vh', background: '#1A1B2E', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ fontFamily: 'Special Elite, serif', color: 'rgba(245,245,220,0.45)', fontSize: 14 }}>Guide not found.</p>
        <button onClick={handleBack}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 16px', borderRadius: 6, border: '1px solid #40E0D0', background: 'transparent', color: '#40E0D0', cursor: 'pointer', letterSpacing: '0.05em' }}>
          BACK
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1A1B2E', color: '#F5F5DC', fontFamily: 'Special Elite, serif' }}>

      {/* ── Header ── */}
      <div style={{ background: '#0D0E1A', borderBottom: '1px solid rgba(64,224,208,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={handleBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.08em', padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(64,224,208,0.3)', background: 'transparent', color: '#40E0D0', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          BACK
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: '#40E0D0', letterSpacing: '0.09em', textShadow: '0 0 14px rgba(64,224,208,0.45)' }}>
            LITERARY ROADS GUIDE
          </span>
        </div>
        <div style={{ width: 80, flexShrink: 0 }} />
      </div>

      {/* ── Hero image ── */}
      {guide.coverImageUrl && (
        <div style={{ width: '100%', maxHeight: 300, overflow: 'hidden' }}>
          <img src={guide.coverImageUrl} alt={guide.title}
            style={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: `${guide.coverImageUrl ? '28px' : '40px'} 20px 72px` }}>

        {/* Title block */}
        <div style={{ marginBottom: 32 }}>
          {guide.state && (
            <div style={{ display: 'inline-block', fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.1em', color: '#FF4E00', border: '1px solid rgba(255,78,0,0.4)', borderRadius: 4, padding: '3px 8px', marginBottom: 12 }}>
              {guide.state.toUpperCase()}
            </div>
          )}
          <h1 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(22px, 4.5vw, 34px)', color: '#F5F5DC', margin: '0 0 10px', lineHeight: 1.15, letterSpacing: '0.01em' }}>
            {guide.title}
          </h1>
          {guide.subtitle && (
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 16, color: 'rgba(245,245,220,0.6)', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
              {guide.subtitle}
            </p>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(to right, rgba(64,224,208,0.35), transparent)', marginBottom: 36 }} />

        {/* Stops */}
        <div>
          <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: '#40E0D0', letterSpacing: '0.09em', marginBottom: 22 }}>
            {stores.length} STOP{stores.length !== 1 ? 'S' : ''} ON THIS GUIDE
          </h2>

          {stores.length === 0 ? (
            <p style={{ fontFamily: 'Special Elite, serif', color: 'rgba(192,192,192,0.45)', fontSize: 13, textAlign: 'center', padding: '36px 0', fontStyle: 'italic' }}>
              Stops coming soon.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {stores.map((store, idx) => (
                <div key={store.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(64,224,208,0.12)', borderRadius: 12, overflow: 'hidden' }}>
                  {store.photoUrl && (
                    <img src={store.photoUrl} alt={store.name} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                  )}
                  <div style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#0D0E1A', border: '1px solid rgba(64,224,208,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 3 }}>
                        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: '#40E0D0' }}>{idx + 1}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 16, color: '#F5F5DC', margin: '0 0 5px', lineHeight: 1.2 }}>
                          {store.name}
                        </h3>
                        <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: 'rgba(192,192,192,0.55)', lineHeight: 1.6 }}>
                          {[store.city, store.state].filter(Boolean).join(', ')}
                          {store.address && <span style={{ display: 'block' }}>{store.address}</span>}
                          {store.phone   && <span style={{ display: 'block' }}>{store.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {store.description && (
                      <p style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: 'rgba(245,245,220,0.72)', lineHeight: 1.7, margin: '12px 0 14px' }}>
                        {store.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {store.website && (
                        <a href={store.website} target="_blank" rel="noopener noreferrer"
                          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em', color: '#40E0D0', textDecoration: 'none', border: '1px solid rgba(64,224,208,0.35)', borderRadius: 5, padding: '6px 14px', display: 'inline-block' }}>
                          WEBSITE
                        </a>
                      )}

                      <button
                        onClick={() => handleFindOnMap(store)}
                        disabled={finding === store.id}
                        style={{
                          fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em',
                          color: notFound === store.id ? '#FF4E00' : '#FF4E00',
                          background: 'transparent',
                          border: `1px solid ${notFound === store.id ? 'rgba(255,78,0,0.6)' : 'rgba(255,78,0,0.35)'}`,
                          borderRadius: 5, padding: '6px 14px',
                          cursor: finding === store.id ? 'wait' : 'pointer',
                          opacity: finding === store.id ? 0.6 : 1,
                        }}
                      >
                        {finding === store.id
                          ? 'SEARCHING...'
                          : notFound === store.id
                            ? 'NOT IN DATABASE'
                            : 'FIND ON MAP'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 56, textAlign: 'center' }}>
          <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(64,224,208,0.2), transparent)', marginBottom: 24 }} />
          <a href="#/" style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.1em', color: '#40E0D0', textDecoration: 'none', opacity: 0.6 }}>
            LITERARY ROADS
          </a>
        </div>
      </div>
    </div>
  );
}
