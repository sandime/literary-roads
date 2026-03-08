import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const PRINCIPLES = [
  {
    title: 'Be Kind.',
    body: "Whether you're recommending a book, adding to a Hitchhiker's Tale, or honking at a fellow traveler, remember there's a real person on the other side.",
  },
  {
    title: 'Be Thoughtful.',
    body: 'Every sentence you add to a tale becomes part of someone else\'s journey. Contribute with care—write stories that inspire, suggest books that moved you.',
  },
  {
    title: 'Be Honest.',
    body: "Recommend books you've actually read and loved. Share real experiences at the places you visit. Our community thrives on trust.",
  },
  {
    title: 'Be Respectful.',
    body: 'This is a shared space for readers of all backgrounds, tastes, and perspectives. Harassment, hate speech, and inappropriate content have no place here.',
  },
];

export default function EthicsModal({ user, onAccepted }) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAccept = async () => {
    if (!checked || !user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        acceptedEthics: true,
        acceptedEthicsAt: serverTimestamp(),
      }, { merge: true });
      onAccepted();
    } catch (err) {
      console.error('[EthicsModal] accept:', err);
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000,
      background: 'rgba(5,6,15,0.97)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: '560px',
        background: '#0D0E1A',
        border: '2px solid #40E0D0',
        borderRadius: '20px 20px 0 0',
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 60px rgba(64,224,208,0.2), 0 -8px 40px rgba(0,0,0,0.8)',
      }}>
        {/* Drag handle */}
        <div style={{ flexShrink: 0, padding: '14px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '4px', background: 'rgba(64,224,208,0.3)', borderRadius: '2px' }} />
        </div>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '16px 24px 12px', borderBottom: '1px solid rgba(64,224,208,0.15)' }}>
          <p className="font-bungee text-center" style={{ fontSize: '11px', color: 'rgba(192,192,192,0.4)', letterSpacing: '0.12em', marginBottom: '6px' }}>
            WELCOME TO
          </p>
          <h2 className="font-bungee text-center" style={{ color: '#40E0D0', fontSize: '20px', textShadow: '0 0 16px rgba(64,224,208,0.7)', lineHeight: 1.2 }}>
            THE LITERARY ROADS
          </h2>
          <p className="font-special-elite text-center" style={{ color: 'rgba(192,192,192,0.55)', fontSize: '12px', marginTop: '6px' }}>
            Before you hit the road, please read our community guidelines.
          </p>
        </div>

        {/* Neon accent */}
        <div style={{ height: '2px', flexShrink: 0, background: 'linear-gradient(to right, #FF4E00, #40E0D0, #FF4E00)', opacity: 0.6 }} />

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <p className="font-special-elite" style={{ color: 'rgba(245,245,220,0.75)', fontSize: '13px', lineHeight: 1.7, marginBottom: '20px', fontStyle: 'italic' }}>
            The Literary Roads is a community of readers, travelers, and storytellers sharing the open road.
            We believe in the power of books to connect us, and we're committed to creating a space where
            everyone feels welcome.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {PRINCIPLES.map((p, i) => (
              <div key={i} style={{
                padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(64,224,208,0.12)',
              }}>
                <p className="font-bungee" style={{ color: '#FF4E00', fontSize: '11px', marginBottom: '5px', letterSpacing: '0.04em' }}>
                  {p.title}
                </p>
                <p className="font-special-elite" style={{ color: 'rgba(245,245,220,0.75)', fontSize: '12px', lineHeight: 1.6 }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>

          <p className="font-special-elite" style={{ color: 'rgba(192,192,192,0.5)', fontSize: '11px', marginTop: '18px', fontStyle: 'italic', textAlign: 'center' }}>
            If you see something that violates these values, use the Road Ranger report button.
            We're all stewards of this community.
          </p>
        </div>

        {/* Footer — checkbox + button */}
        <div style={{
          flexShrink: 0, padding: '16px 24px 28px',
          borderTop: '1px solid rgba(64,224,208,0.15)',
          background: 'rgba(13,14,26,0.95)',
        }}>
          {/* Checkbox */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginBottom: '16px' }}>
            <div
              onClick={() => setChecked(v => !v)}
              style={{
                flexShrink: 0, width: '22px', height: '22px', borderRadius: '5px', marginTop: '1px',
                border: `2px solid ${checked ? '#40E0D0' : 'rgba(64,224,208,0.35)'}`,
                background: checked ? 'rgba(64,224,208,0.15)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', cursor: 'pointer',
                boxShadow: checked ? '0 0 8px rgba(64,224,208,0.4)' : 'none',
              }}
            >
              {checked && (
                <svg width="13" height="13" fill="none" stroke="#40E0D0" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <p className="font-special-elite" style={{ color: 'rgba(245,245,220,0.8)', fontSize: '13px', lineHeight: 1.5 }}>
              I agree to these community guidelines and will treat fellow travelers with kindness, honesty, and respect.
            </p>
          </label>

          {/* Continue button */}
          <button
            onClick={handleAccept}
            disabled={!checked || saving}
            className="font-bungee w-full py-3 rounded-xl transition-all"
            style={{
              background: checked ? 'linear-gradient(135deg, #FF4E00, #FF6B2B)' : 'rgba(255,78,0,0.15)',
              color: checked ? '#1A1B2E' : 'rgba(255,78,0,0.35)',
              border: 'none', cursor: checked ? 'pointer' : 'not-allowed',
              fontSize: '14px', letterSpacing: '0.08em',
              boxShadow: checked ? '0 0 20px rgba(255,78,0,0.45)' : 'none',
              transition: 'all 0.25s',
            }}
          >
            {saving ? 'SAVING...' : 'HIT THE ROAD →'}
          </button>
        </div>
      </div>
    </div>
  );
}
