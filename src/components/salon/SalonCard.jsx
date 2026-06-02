// Individual discussion card — header, body, reply toggle, inline thread.
import { useState, useEffect } from 'react';
import { subscribeToCardReplies } from '../../utils/salon';

const S = {
  wine:     '#2A1A1F',
  wine2:    '#1F1318',
  wine3:    '#33222A',
  gold:     '#C9A84C',
  goldSoft: 'rgba(201,168,76,0.30)',
  line:     'rgba(201,168,76,0.16)',
  orange:   '#FF4E00',
  cream:    '#FFF8E7',
  paper2:   '#E5D9C2',
  muted:    '#A2908C',
  muted2:   '#7C6A68',
  display:  '"Bungee", system-ui, sans-serif',
  type:     '"Special Elite", Georgia, serif',
  serif:    'Georgia, "Times New Roman", serif',
};

function Avatar({ name = '?', size = 32, gold }) {
  const initial = String(name).trim()[0]?.toUpperCase() ?? '?';
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: '50%',
      background: S.wine3, border: `1.5px solid ${gold ? S.gold : S.muted2}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: S.serif, fontSize: size * 0.42, color: gold ? S.gold : S.muted,
    }}>
      {initial}
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : new Date(ts).getTime();
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SalonCard({ card, salonId, onReply, periodOpen }) {
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies]   = useState(null);

  useEffect(() => {
    if (!expanded || !salonId || !card.id) return;
    return subscribeToCardReplies(salonId, card.id, setReplies);
  }, [expanded, salonId, card.id]);

  const isHost    = card.isHostVoice;
  const count     = card.replyCount ?? 0;
  const replyWord = count === 1 ? 'reply' : 'replies';

  return (
    <div style={{
      background: S.wine,
      border: `1px solid ${isHost ? S.goldSoft : S.line}`,
      borderRadius: 14, padding: 14, marginBottom: 12,
      animation: 'salon-fade-in 0.25s ease-out',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <Avatar name={card.userName} size={34} gold={isHost}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: S.display, fontSize: 12, color: isHost ? S.gold : S.paper2,
            letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis' }}>
            {card.userName}
          </div>
          <div style={{ fontFamily: S.type, fontSize: 10, color: S.muted2 }}>
            {timeAgo(card.createdAt)}
          </div>
        </div>
        {card.spoiler && (
          <span style={{ fontFamily: S.type, fontSize: 9, color: S.orange, letterSpacing: '0.06em',
            border: `1px solid ${S.orange}`, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
            SPOILERS
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ fontFamily: S.serif, fontSize: 14.5, lineHeight: 1.5, color: S.cream }}>
        {card.text}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
        <button onClick={() => setExpanded(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: S.type, fontSize: 11, color: S.gold }}>
          {count} {replyWord}
        </button>
        {periodOpen && (
          <button onClick={() => onReply(card)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: S.type, fontSize: 11, color: S.muted }}>
            Reply
          </button>
        )}
      </div>

      {/* Threaded replies */}
      {expanded && (
        <div style={{ marginTop: 12, paddingLeft: 14, borderLeft: `1px solid ${S.goldSoft}`,
          display: 'flex', flexDirection: 'column', gap: 12 }}>
          {replies === null ? (
            <div style={{ fontFamily: S.type, fontSize: 11, color: S.muted2 }}>Loading…</div>
          ) : replies.length === 0 ? (
            <div style={{ fontFamily: S.type, fontSize: 11, color: S.muted2 }}>No replies yet.</div>
          ) : replies.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 9 }}>
              <Avatar name={r.userName} size={26}/>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: S.display, fontSize: 10.5, color: S.paper2,
                    letterSpacing: '0.04em' }}>
                    {r.userName}
                  </span>
                  <span style={{ fontFamily: S.type, fontSize: 9, color: S.muted2 }}>
                    {timeAgo(r.createdAt)}
                  </span>
                </div>
                <div style={{ fontFamily: S.serif, fontSize: 13, color: S.paper2,
                  marginTop: 3, lineHeight: 1.45 }}>
                  {r.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
