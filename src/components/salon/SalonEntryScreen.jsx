// Entry screens: join invitation and enrolled welcome-back.
import { useState } from 'react';
import { enrollInSalon, formatSalonDates, computeEnrollment } from '../../utils/salon';

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

function BookCover({ src, title, author, w = 60, h = 90 }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{
      width: w, height: h, flexShrink: 0, position: 'relative',
      borderRadius: 3, overflow: 'hidden',
      boxShadow: '0 4px 14px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.4)',
    }}>
      {src && !failed ? (
        <img src={src} alt={title}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
      ) : (
        <div style={{ width: '100%', height: '100%',
          background: 'linear-gradient(150deg, #3B5A47, #20120f)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: w * 0.12, boxSizing: 'border-box' }}>
          <div style={{ width: '40%', height: 2, background: S.gold, opacity: 0.8 }}/>
          <div>
            <div style={{ fontFamily: S.serif, fontWeight: 700, color: S.cream,
              fontSize: Math.max(7, w * 0.13), lineHeight: 1.12 }}>{title}</div>
            <div style={{ fontFamily: S.serif, fontStyle: 'italic', color: S.paper2,
              fontSize: Math.max(6, w * 0.10), marginTop: 3, opacity: 0.85 }}>{author}</div>
          </div>
          <div style={{ width: '40%', height: 2, background: S.gold, opacity: 0.8, alignSelf: 'flex-end' }}/>
        </div>
      )}
      {/* spine sheen */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '14%', height: '100%',
        background: 'linear-gradient(90deg, rgba(0,0,0,0.4), rgba(0,0,0,0))', pointerEvents: 'none' }}/>
    </div>
  );
}

function GoldRule({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
      <div style={{ flex: 1, height: 1, background: S.goldSoft }}/>
      {label && <>
        <span style={{ fontFamily: S.type, fontSize: 10, letterSpacing: '0.18em',
          color: S.gold, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: S.goldSoft }}/>
      </>}
    </div>
  );
}

function Avatar({ name = '?', size = 30 }) {
  const initial = String(name).trim()[0]?.toUpperCase() ?? '?';
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%',
      background: S.wine3, border: `1.5px solid ${S.muted2}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: S.serif, fontSize: size * 0.42, color: S.muted }}>
      {initial}
    </div>
  );
}

// ── Not-enrolled entry ────────────────────────────────────────────────────────
export function SalonEntryJoin({ period, user, onEnroll, onEnter, salonCatUrl }) {
  const [enrolling, setEnrolling] = useState(false);
  const dates = formatSalonDates(period);

  const handleEnroll = async () => {
    if (!user || enrolling) return;
    setEnrolling(true);
    try {
      await enrollInSalon(period.id, user.uid);
      onEnroll();
    } catch (err) {
      console.error('[SalonEntry] enroll failed', err);
      setEnrolling(false);
    }
  };

  const nextAnnounceDate = period.nextBookAnnounceDate
    ? (() => {
        const d = period.nextBookAnnounceDate?.toDate?.() ?? new Date(period.nextBookAnnounceDate);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      })()
    : null;

  return (
    <div style={{ padding: '20px 22px 40px', display: 'flex', flexDirection: 'column',
      alignItems: 'center' }}>
      {/* Masthead */}
      <div style={{ fontFamily: S.display, fontSize: 26, letterSpacing: '0.08em',
        color: S.gold, textTransform: 'uppercase',
        textShadow: `0 0 16px rgba(201,168,76,0.33)` }}>
        The Salon
      </div>
      <div style={{ fontFamily: S.type, fontSize: 11, color: S.muted, letterSpacing: '0.14em',
        marginTop: 4, textTransform: 'uppercase' }}>
        A bimonthly reading room
      </div>

      {/* Cat */}
      <img src={salonCatUrl} alt="The Salon"
        style={{ width: 230, height: 230, objectFit: 'contain',
          margin: '6px 0 2px', filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.5))' }}/>

      <GoldRule label="Now Reading"/>
      <div style={{ height: 20 }}/>

      {/* Book row */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', width: '100%' }}>
        <BookCover src={period.coverURL} title={period.bookTitle} author={period.bookAuthor}
          w={84} h={126}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: S.serif, fontWeight: 700, fontSize: 21, lineHeight: 1.15,
            color: S.cream }}>{period.bookTitle}</div>
          <div style={{ fontFamily: S.serif, fontStyle: 'italic', fontSize: 14,
            color: S.paper2, marginTop: 4 }}>{period.bookAuthor}</div>
          {dates && (
            <div style={{ fontFamily: S.type, fontSize: 11, color: S.gold,
              marginTop: 10, letterSpacing: '0.04em' }}>{dates}</div>
          )}
          {nextAnnounceDate && (
            <div style={{ fontFamily: S.type, fontSize: 11, color: S.muted, marginTop: 3 }}>
              Next book announced {nextAnnounceDate}
            </div>
          )}
        </div>
      </div>

      {/* Invitation */}
      <div style={{ fontFamily: S.serif, fontSize: 15, fontStyle: 'italic', color: S.paper2,
        textAlign: 'center', margin: '26px 0 6px', lineHeight: 1.5, maxWidth: 280 }}>
        Two months, one book, and a room full of readers taking it slow together.
      </div>
      <div style={{ fontFamily: S.type, fontSize: 12, color: S.gold, marginBottom: 18 }}>
        {period.memberCount ?? 0} Literary Roadsters are in.
      </div>

      {user ? (
        <>
          <button onClick={handleEnroll} disabled={enrolling}
            style={{ width: '100%', fontFamily: S.display, fontSize: 12.5,
              letterSpacing: '0.04em', borderRadius: 10, minHeight: 46,
              background: S.orange, color: '#fff', border: 'none',
              cursor: enrolling ? 'default' : 'pointer', marginBottom: 10,
              boxShadow: `0 0 20px rgba(255,78,0,0.4)`, opacity: enrolling ? 0.7 : 1 }}>
            {enrolling ? 'JOINING…' : 'YES, I\'M IN  →'}
          </button>
          <button onClick={() => onEnter()}
            style={{ width: '100%', fontFamily: S.display, fontSize: 12.5,
              letterSpacing: '0.04em', borderRadius: 10, minHeight: 46,
              background: 'transparent', color: S.muted, border: 'none', cursor: 'pointer' }}>
            Maybe later
          </button>
        </>
      ) : (
        <div style={{ fontFamily: S.type, fontSize: 12, color: S.muted, textAlign: 'center' }}>
          Sign in to join the conversation.
        </div>
      )}
    </div>
  );
}

// ── Enrolled welcome-back ─────────────────────────────────────────────────────
export function SalonEntryEnrolled({ period, recentCards, onEnter }) {
  const { dayOf, totalDays, daysRemaining } = computeEnrollment(period);
  const pct = totalDays > 0 ? Math.min(100, Math.round((dayOf / totalDays) * 100)) : 0;

  return (
    <div style={{ padding: '22px 20px 36px' }}>
      {/* Centered wordmark + welcome */}
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontFamily: S.display, fontSize: 14, letterSpacing: '0.10em',
          color: S.gold, textTransform: 'uppercase', display: 'inline-flex',
          alignItems: 'center', gap: 7 }}>
          The Salon
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: S.gold,
            boxShadow: `0 0 6px ${S.gold}` }}/>
        </div>
        <div style={{ fontFamily: S.serif, fontStyle: 'italic', fontSize: 16,
          color: S.paper2, marginTop: 10 }}>
          Welcome back to the room.
        </div>
      </div>

      {/* Progress card */}
      <div style={{ background: S.wine, border: `1px solid ${S.goldSoft}`,
        borderRadius: 14, padding: 16, marginBottom: 18, display: 'flex',
        gap: 16, alignItems: 'center' }}>
        <div style={{ width: 68, height: 102, flexShrink: 0, position: 'relative',
          borderRadius: 3, overflow: 'hidden',
          boxShadow: '0 4px 14px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.4)' }}>
          {period.coverURL ? (
            <img src={period.coverURL} alt={period.bookTitle}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
          ) : (
            <div style={{ width: '100%', height: '100%',
              background: 'linear-gradient(150deg, #3B5A47, #20120f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 8, boxSizing: 'border-box' }}>
              <div style={{ fontFamily: S.serif, fontWeight: 700, color: S.cream,
                fontSize: 9, lineHeight: 1.2, textAlign: 'center' }}>
                {period.bookTitle}
              </div>
            </div>
          )}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '14%', height: '100%',
            background: 'linear-gradient(90deg,rgba(0,0,0,0.4),rgba(0,0,0,0))', pointerEvents: 'none' }}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: S.serif, fontWeight: 700, fontSize: 17,
            color: S.cream }}>{period.bookTitle}</div>
          <div style={{ fontFamily: S.serif, fontStyle: 'italic', fontSize: 12.5,
            color: S.paper2, marginTop: 3 }}>{period.bookAuthor}</div>
          {/* Progress bar */}
          <div style={{ marginTop: 12, height: 5, borderRadius: 3,
            background: S.wine2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: S.gold,
              boxShadow: `0 0 8px ${S.gold}`,
              transition: 'width 0.6s ease-out' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6,
            fontFamily: S.type, fontSize: 10, color: S.muted }}>
            <span>Day {dayOf} of {totalDays}</span>
            <span style={{ color: S.gold }}>{daysRemaining} days remaining</span>
          </div>
        </div>
      </div>

      {/* Latest in the room */}
      {recentCards?.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 14px' }}>
            <div style={{ flex: 1, height: 1, background: S.goldSoft }}/>
            <span style={{ fontFamily: S.type, fontSize: 10, letterSpacing: '0.18em',
              color: S.gold, textTransform: 'uppercase' }}>Latest in the room</span>
            <div style={{ flex: 1, height: 1, background: S.goldSoft }}/>
          </div>
          {recentCards.slice(0, 2).map((c, i) => (
            <div key={c.id ?? i} style={{ display: 'flex', gap: 11, padding: '11px 2px',
              borderBottom: `1px solid rgba(201,168,76,0.16)` }}>
              <Avatar name={c.userName} size={30}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: S.display, fontSize: 11, color: S.gold,
                  letterSpacing: '0.04em' }}>{c.userName}</div>
                <div style={{ fontFamily: S.serif, fontSize: 13, color: S.paper2,
                  marginTop: 3, lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  "{c.text}"
                </div>
                <div style={{ fontFamily: S.type, fontSize: 10, color: S.muted2, marginTop: 4 }}>
                  {c.replyCount ?? 0} {c.replyCount === 1 ? 'reply' : 'replies'}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      <button onClick={onEnter}
        style={{ width: '100%', fontFamily: S.display, fontSize: 12.5, letterSpacing: '0.04em',
          borderRadius: 10, minHeight: 46, marginTop: 20,
          background: S.orange, color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: `0 0 20px rgba(255,78,0,0.4)` }}>
        GO TO THE SALON  →
      </button>
    </div>
  );
}
