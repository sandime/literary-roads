// Bottom sheet for composing a reply to a specific card.
import { useState, useEffect, useRef } from 'react';
import { postReply } from '../../utils/salon';

const S = {
  wine:     '#2A1A1F',
  wine3:    '#33222A',
  gold:     '#C9A84C',
  goldSoft: 'rgba(201,168,76,0.30)',
  line:     'rgba(201,168,76,0.16)',
  orange:   '#FF4E00',
  cream:    '#FFF8E7',
  muted:    '#A2908C',
  muted2:   '#7C6A68',
  display:  '"Bungee", system-ui, sans-serif',
  type:     '"Special Elite", Georgia, serif',
  serif:    'Georgia, "Times New Roman", serif',
};

const MAX = 600;

export default function SalonReplySheet({ salonId, card, user, onClose }) {
  const [text, setText]       = useState('');
  const [posting, setPosting] = useState(false);
  const textareaRef           = useRef(null);

  useEffect(() => {
    // Autofocus on open
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, []);

  const canPost   = text.trim().length > 0 && !posting;
  const remaining = MAX - text.length;
  const warnChar  = remaining < 60;

  const handlePost = async () => {
    if (!canPost || !user) return;
    setPosting(true);
    try {
      await postReply(salonId, card.id, {
        userId:   user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Reader',
        text:     text.trim(),
      });
      onClose();
    } catch (err) {
      console.error('[SalonReplySheet] post failed', err);
      setPosting(false);
    }
  };

  const excerpt = card.text?.length > 90
    ? card.text.slice(0, 90) + '…'
    : card.text;

  return (
    <>
      {/* Scrim */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15,8,11,0.55)',
      }}/>

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 101,
        background: S.wine, borderTop: `2px solid ${S.gold}`,
        borderRadius: '20px 20px 0 0', padding: '8px 18px 20px',
        boxShadow: '0 -16px 40px rgba(0,0,0,0.5)',
        animation: 'salon-sheet-up 0.22s ease-out',
      }}>
        {/* Grab handle */}
        <div style={{ width: 40, height: 4, borderRadius: 3, background: S.muted2,
          margin: '0 auto 16px' }}/>

        {/* "Replying to" */}
        <div style={{ fontFamily: S.type, fontSize: 11, color: S.muted,
          letterSpacing: '0.04em', marginBottom: 4 }}>
          Replying to{' '}
          <span style={{ color: S.gold }}>{card.userName}</span>
        </div>
        <div style={{ height: 1, background: S.goldSoft, marginBottom: 12 }}/>

        {/* Quoted excerpt */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 3, background: S.goldSoft, borderRadius: 2, flexShrink: 0 }}/>
          <div style={{ fontFamily: S.serif, fontStyle: 'italic', fontSize: 13,
            color: S.muted, lineHeight: 1.45 }}>
            "{excerpt}"
          </div>
        </div>

        {/* Reply field */}
        <div style={{ background: S.wine3, border: `1px solid ${S.line}`,
          borderRadius: 12, padding: '12px 14px', minHeight: 92 }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX))}
            placeholder="Your reply…"
            rows={3}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: S.cream, fontFamily: S.serif, fontSize: 14,
              resize: 'none', lineHeight: 1.5, display: 'block',
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginTop: 14 }}>
          <span style={{ fontFamily: S.type, fontSize: 11,
            color: warnChar ? S.orange : S.muted2 }}>
            {remaining} remaining
          </span>
          <button onClick={handlePost} disabled={!canPost}
            style={{
              fontFamily: S.display, fontSize: 12.5, letterSpacing: '0.04em',
              borderRadius: 10, minHeight: 46, padding: '0 18px',
              background: canPost ? S.orange : 'rgba(255,78,0,0.3)',
              color: '#fff', border: 'none',
              cursor: canPost ? 'pointer' : 'default',
              boxShadow: canPost ? `0 0 20px rgba(255,78,0,0.45)` : 'none',
              transition: 'all .18s ease',
            }}>
            {posting ? 'POSTING…' : 'POST REPLY  →'}
          </button>
        </div>
      </div>
    </>
  );
}
