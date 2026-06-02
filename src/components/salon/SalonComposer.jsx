// Sticky bottom composer for the main conversation.
import { useState, useRef, useEffect } from 'react';
import { postCard } from '../../utils/salon';

const S = {
  wine3:    '#33222A',
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

function Avatar({ name = '?', size = 32 }) {
  const initial = String(name).trim()[0]?.toUpperCase() ?? '?';
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: '50%',
      background: S.wine3, border: `1.5px solid #C9A84C`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: S.serif, fontSize: size * 0.42, color: '#C9A84C',
    }}>
      {initial}
    </div>
  );
}

export default function SalonComposer({ salonId, user }) {
  const [text, setText]     = useState('');
  const [posting, setPosting] = useState(false);
  const textareaRef           = useRef(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, [text]);

  const canPost = text.trim().length > 0 && !posting;

  const handlePost = async () => {
    if (!canPost || !user) return;
    setPosting(true);
    try {
      await postCard(salonId, {
        userId:   user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Reader',
        text:     text.trim(),
        spoiler:  false,
      });
      setText('');
    } catch (err) {
      console.error('[SalonComposer] post failed', err);
    } finally {
      setPosting(false);
    }
  };

  const remaining = MAX - text.length;
  const warnChar  = remaining < 60;

  return (
    <div style={{
      position: 'sticky', bottom: 0,
      background: 'rgba(31,19,24,0.97)',
      backdropFilter: 'blur(10px)',
      borderTop: `1px solid ${S.goldSoft}`,
      padding: '10px 12px 14px',
    }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
        <Avatar name={user?.displayName || user?.email || '?'} size={32}/>
        <div style={{
          flex: 1, background: S.wine3, border: `1px solid ${S.line}`,
          borderRadius: 12, padding: '8px 12px',
        }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX))}
            placeholder="Add to the conversation…"
            rows={1}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: S.cream, fontFamily: S.serif, fontSize: 13.5,
              resize: 'none', lineHeight: 1.4, display: 'block',
            }}
          />
          {text.length > MAX - 120 && (
            <div style={{ fontFamily: S.type, fontSize: 11, marginTop: 4,
              color: warnChar ? S.orange : S.muted2, textAlign: 'right' }}>
              {remaining} remaining
            </div>
          )}
        </div>
        <button onClick={handlePost} disabled={!canPost}
          style={{
            fontFamily: S.display, fontSize: 11, letterSpacing: '0.04em',
            borderRadius: 10, minHeight: 40, padding: '0 14px',
            background: canPost ? S.orange : 'rgba(255,78,0,0.3)',
            color: '#fff', border: 'none',
            cursor: canPost ? 'pointer' : 'default',
            boxShadow: canPost ? `0 0 16px rgba(255,78,0,0.4)` : 'none',
            transition: 'all .18s ease', flexShrink: 0,
          }}>
          POST
        </button>
      </div>
    </div>
  );
}
