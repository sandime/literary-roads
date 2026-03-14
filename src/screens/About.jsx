import { useState } from 'react';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// ── Googie starburst decoration ───────────────────────────────────────────────
function Starburst({ color = '#FF4E00', size = 48, style = {} }) {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI) / 8;
    const r = i % 2 === 0 ? size / 2 : size / 4.5;
    return `${size / 2 + r * Math.cos(angle)},${size / 2 + r * Math.sin(angle)}`;
  }).join(' ');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'inline-block', flexShrink: 0, ...style }}>
      <polygon points={pts} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color}aa)` }} />
    </svg>
  );
}

// ── Neon feature name highlight ───────────────────────────────────────────────
function Highlight({ children, color = '#40E0D0' }) {
  return (
    <span className="font-bungee" style={{
      color,
      textShadow: `0 0 10px ${color}66`,
      fontSize: '0.92em',
      letterSpacing: '0.03em',
    }}>
      {children}
    </span>
  );
}

// ── International Waitlist ────────────────────────────────────────────────────
const COUNTRIES = [
  { code: 'Canada',    flag: '🇨🇦', label: 'Canada' },
  { code: 'UK',        flag: '🇬🇧', label: 'United Kingdom' },
  { code: 'Ireland',   flag: '🇮🇪', label: 'Ireland' },
  { code: 'Australia', flag: '🇦🇺', label: 'Australia' },
  { code: 'Other',     flag: '🌍',  label: 'Other' },
];

function InternationalWaitlist() {
  const [email, setEmail]     = useState('');
  const [country, setCountry] = useState('Canada');
  const [status, setStatus]   = useState('idle'); // idle | submitting | success | error | duplicate
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    try {
      const snap = await getDocs(query(
        collection(db, 'internationalWaitlist'),
        where('email', '==', trimmed),
        where('country', '==', country),
      ));
      if (!snap.empty) { setStatus('duplicate'); return; }
      await addDoc(collection(db, 'internationalWaitlist'), {
        email: trimmed,
        country,
        timestamp: serverTimestamp(),
        notified: false,
      });
      setStatus('success');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const countryLabel = COUNTRIES.find(c => c.code === country)?.label || country;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(64,224,208,0.07) 0%, rgba(176,68,251,0.07) 100%)',
      border: '2px solid rgba(64,224,208,0.3)',
      borderRadius: '16px',
      padding: '28px 24px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
          <Starburst color="#40E0D0" size={24} />
          <h2 className="font-bungee" style={{
            fontSize: '15px', color: '#40E0D0', letterSpacing: '0.1em',
            textShadow: '0 0 16px rgba(64,224,208,0.8)',
          }}>
            EXPANDING INTERNATIONALLY
          </h2>
          <Starburst color="#40E0D0" size={24} />
        </div>
        <p className="font-special-elite" style={{ fontSize: '14px', color: 'rgba(245,245,220,0.85)', lineHeight: 1.7, marginBottom: '14px' }}>
          The Literary Roads is coming to:
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {COUNTRIES.filter(c => c.code !== 'Other').map(c => (
            <span key={c.code} className="font-bungee" style={{
              fontSize: '11px', color: 'rgba(245,245,220,0.8)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(64,224,208,0.2)',
              borderRadius: '20px', padding: '5px 12px',
            }}>
              {c.flag} {c.label}
            </span>
          ))}
        </div>
      </div>

      {status === 'success' ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p className="font-bungee" style={{ fontSize: '13px', color: '#40E0D0', letterSpacing: '0.06em', marginBottom: '8px' }}>
            YOU'RE ON THE LIST!
          </p>
          <p className="font-special-elite" style={{ fontSize: '14px', color: 'rgba(245,245,220,0.75)', lineHeight: 1.7 }}>
            We'll email you when we launch in {countryLabel}!
          </p>
        </div>
      ) : status === 'duplicate' ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p className="font-bungee" style={{ fontSize: '13px', color: '#FFB347', letterSpacing: '0.06em', marginBottom: '8px' }}>
            ALREADY SIGNED UP!
          </p>
          <p className="font-special-elite" style={{ fontSize: '14px', color: 'rgba(245,245,220,0.65)' }}>
            You're already on the {countryLabel} waitlist — we'll be in touch!
          </p>
        </div>
      ) : (
        <>
          <p className="font-bungee" style={{
            fontSize: '11px', color: 'rgba(192,192,192,0.55)', letterSpacing: '0.1em',
            textAlign: 'center', marginBottom: '16px',
          }}>
            WANT EARLY ACCESS? JOIN THE WAITLIST!
          </p>

          <div style={{ marginBottom: '10px' }}>
            <select value={country} onChange={e => setCountry(e.target.value)}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.5)',
                border: '2px solid rgba(64,224,208,0.4)', borderRadius: '10px',
                color: '#F5F5DC', fontFamily: 'Special Elite, serif',
                fontSize: '14px', padding: '11px 14px', outline: 'none', cursor: 'pointer',
              }}
            >
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="your@email.com"
              style={{
                width: '100%', background: 'rgba(0,0,0,0.5)', boxSizing: 'border-box',
                border: `2px solid ${status === 'error' ? '#FF4E00' : 'rgba(64,224,208,0.4)'}`,
                borderRadius: '10px', color: '#F5F5DC',
                fontFamily: 'Special Elite, serif', fontSize: '14px',
                padding: '11px 14px', outline: 'none',
              }}
            />
          </div>

          {status === 'error' && (
            <p style={{ color: '#FF4E00', fontFamily: 'Special Elite, serif', fontSize: '12px', marginBottom: '10px', textAlign: 'center' }}>
              {errorMsg}
            </p>
          )}

          <button onClick={handleSubmit} disabled={status === 'submitting'}
            style={{
              width: '100%', padding: '13px',
              background: status === 'submitting' ? 'rgba(64,224,208,0.25)' : '#40E0D0',
              color: '#1A1B2E', border: 'none', borderRadius: '10px',
              fontFamily: 'Bungee, sans-serif', fontSize: '13px', letterSpacing: '0.08em',
              cursor: status === 'submitting' ? 'default' : 'pointer',
              boxShadow: status !== 'submitting' ? '0 0 18px rgba(64,224,208,0.45)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {status === 'submitting' ? 'SENDING…' : '✉️ JOIN WAITLIST'}
          </button>
        </>
      )}
    </div>
  );
}

// ── About screen ──────────────────────────────────────────────────────────────
export default function About({ onBack }) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 300,
      background: 'radial-gradient(ellipse at 50% 0%, #0a0520 0%, #0D0E1A 55%, #04050F 100%)' }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(4,5,15,0.95)', backdropFilter: 'blur(8px)',
        borderBottom: '2px solid rgba(64,224,208,0.3)',
        padding: '14px 16px 12px',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} className="font-special-elite"
            style={{ color: 'rgba(192,192,192,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
            ← Back
          </button>
          <h1 className="font-bungee" style={{
            color: '#40E0D0', fontSize: '16px', letterSpacing: '0.1em',
            textShadow: '0 0 18px rgba(64,224,208,0.9)',
          }}>
            ABOUT
          </h1>
          <div style={{ width: '48px' }} />
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px 60px' }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', padding: '36px 0 24px', position: 'relative' }}>
          <Starburst color="#FF4E00" size={36} style={{ position: 'absolute', top: 28, left: 0, opacity: 0.7 }} />
          <Starburst color="#40E0D0" size={28} style={{ position: 'absolute', top: 50, left: 30, opacity: 0.5 }} />
          <Starburst color="#FF4E00" size={36} style={{ position: 'absolute', top: 28, right: 0, opacity: 0.7 }} />
          <Starburst color="#40E0D0" size={28} style={{ position: 'absolute', top: 50, right: 30, opacity: 0.5 }} />

          <h2 className="font-bungee" style={{
            fontSize: 'clamp(20px, 5vw, 28px)',
            background: 'linear-gradient(135deg, #40E0D0 0%, #FF69B4 50%, #FF4E00 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.25, marginBottom: '18px', letterSpacing: '0.06em',
          }}>
            ABOUT THE LITERARY ROADS
          </h2>
          <div style={{ width: '80px', height: '3px', margin: '0 auto',
            background: 'linear-gradient(to right, #FF4E00, #40E0D0, #FF4E00)',
            borderRadius: '2px', boxShadow: '0 0 10px rgba(64,224,208,0.5)' }} />
        </div>

        {/* ── Hook ── */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(64,224,208,0.18)',
          borderRadius: '16px', padding: '22px 24px', marginBottom: '16px',
        }}>
          <p className="font-special-elite" style={{
            fontSize: '15px', color: 'rgba(245,245,220,0.92)', lineHeight: 1.85, fontStyle: 'italic',
          }}>
            If you're the type of person who plans road trips around great coffee shops, you'll love The Literary Roads.
          </p>
        </div>

        {/* ── Mission ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,78,0,0.09) 0%, rgba(255,105,180,0.06) 100%)',
          border: '2px solid rgba(255,78,0,0.35)',
          borderRadius: '16px', padding: '22px 24px', marginBottom: '16px', textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
            <Starburst color="#FF4E00" size={20} />
            <h3 className="font-bungee" style={{ fontSize: '11px', color: '#FF4E00', letterSpacing: '0.14em',
              textShadow: '0 0 12px rgba(255,78,0,0.7)' }}>
              OUR MISSION
            </h3>
            <Starburst color="#FF4E00" size={20} />
          </div>
          <p className="font-special-elite" style={{
            fontSize: '14px', color: 'rgba(245,245,220,0.9)', lineHeight: 1.85,
          }}>
            Support independent bookstores, celebrate literary culture, and inspire readers to explore the world one book—and one road trip—at a time.
          </p>
        </div>

        {/* ── Main body ── */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,78,0,0.15)',
          borderRadius: '16px', padding: '22px 24px', marginBottom: '16px',
        }}>
          <p className="font-special-elite" style={{
            fontSize: '14px', color: 'rgba(245,245,220,0.82)', lineHeight: 1.85, marginBottom: '16px',
          }}>
            The Literary Roads celebrates the open road, the love of books, a perfectly brewed cup of coffee (or tea), and the community that connects them all.
          </p>
          <p className="font-special-elite" style={{
            fontSize: '14px', color: 'rgba(245,245,220,0.82)', lineHeight: 1.85, marginBottom: '16px',
          }}>
            Every stop is an opportunity to discover something beautiful: an indie bookstore tucked into a small town, a cozy coffee shop where locals gather, a literary festival bringing readers together, a landmark honoring the writers who shaped our culture, or a drive-in theater. (Yes — there are still many drive-ins across the country!)
          </p>
          <p className="font-special-elite" style={{
            fontSize: '14px', color: 'rgba(245,245,220,0.82)', lineHeight: 1.85, margin: 0,
          }}>
            Whether you're planning a cross-country adventure or a weekend getaway, The Literary Roads helps you map your journey. Explore routes, save favorites, bookmark individual stops, and when you're ready — click navigate and hit the road.
          </p>
        </div>

        {/* ── Features ── */}
        <div style={{
          background: 'rgba(64,224,208,0.03)',
          border: '1px solid rgba(64,224,208,0.18)',
          borderRadius: '16px', padding: '22px 24px', marginBottom: '16px',
        }}>
          <p className="font-special-elite" style={{
            fontSize: '14px', color: 'rgba(245,245,220,0.82)', lineHeight: 1.85, marginBottom: '16px',
          }}>
            <Highlight>CURATED JOURNEYS</Highlight> make planning effortless. Generate a day trip complete with coffee shops, bookstores, restaurants, and local attractions. Planning to attend a literary festival? We'll help you route the journey and discover all the best stops along the way.
          </p>
          <p className="font-special-elite" style={{
            fontSize: '14px', color: 'rgba(245,245,220,0.82)', lineHeight: 1.85, margin: 0,
          }}>
            The app doubles as your <Highlight>BOOK LOG</Highlight>. Track what you've read, rate books with our signature cat ratings, and never forget a favorite. Need inspiration? Click "Surprise Me" in <Highlight>HIGHWAY SNACKS</Highlight> for your next great read, or explore curated literary podcast recommendations like our favorite, <em>What Should I Read Next?</em>
          </p>
        </div>

        {/* ── Playful features ── */}
        <div style={{
          background: 'rgba(255,105,180,0.03)',
          border: '1px solid rgba(255,105,180,0.18)',
          borderRadius: '16px', padding: '22px 24px', marginBottom: '16px',
        }}>
          <p className="font-special-elite" style={{
            fontSize: '14px', color: 'rgba(245,245,220,0.82)', lineHeight: 1.85, margin: 0,
          }}>
            <Highlight color="#FF69B4">MAKE YOUR JOURNEY PLAYFUL.</Highlight> Choose a retro car, truck, or motorcycle, then "park" it on the map when you arrive at coffee shops and bookstores. You might spot other travelers — tap their car to honk and flash your headlights! They'll get a friendly hello. Snap a selfie and frame it with a Literary Roads postcard filter to share on social media. Start a <Highlight color="#FF69B4">HITCHHIKER'S TALE</Highlight> by writing a sentence or two and giving it a title — other travelers can continue the story. Leave book recommendations in location guestbooks for fellow readers to discover.
          </p>
        </div>

        {/* ── Coverage + thanks ── */}
        <div style={{
          textAlign: 'center',
          background: 'rgba(255,210,0,0.04)',
          border: '1px solid rgba(255,210,0,0.15)',
          borderRadius: '16px', padding: '20px 24px', marginBottom: '24px',
        }}>
          <p className="font-special-elite" style={{
            fontSize: '14px', color: 'rgba(245,245,220,0.8)', lineHeight: 1.85, marginBottom: '14px',
          }}>
            We cover all 50 <Highlight color="#FFD700">STATES AND PUERTO RICO</Highlight>, with Canada, the UK, Ireland, and Australia coming soon.
          </p>
          <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,210,0,0.25), transparent)', marginBottom: '14px' }} />
          <p className="font-special-elite" style={{
            fontSize: '14px', color: 'rgba(245,245,220,0.7)', lineHeight: 1.85, fontStyle: 'italic',
          }}>
            Thanks for joining the journey.
          </p>
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '8px', opacity: 0.55 }}>
            <Starburst color="#FF4E00" size={14} />
            <Starburst color="#40E0D0" size={18} />
            <Starburst color="#FF69B4" size={12} />
            <Starburst color="#40E0D0" size={18} />
            <Starburst color="#FF4E00" size={14} />
          </div>
        </div>

        {/* ── International Waitlist ── */}
        <InternationalWaitlist />

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '28px', paddingBottom: '8px' }}>
          <p className="font-bungee" style={{
            fontSize: '11px', color: 'rgba(255,210,0,0.35)', letterSpacing: '0.12em',
          }}>
            HAPPY TRAILS
          </p>
        </div>

      </div>
    </div>
  );
}
