// Compact profile card — three states: join / enrolled / review.
// Placed in Zone 2 of Profile.jsx (after badges, before reading quest).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollInSalon, formatSalonDates, computeEnrollment } from '../../utils/salon';

const S = {
  wine:     '#2A1A1F',
  wine2:    '#1F1318',
  wine3:    '#33222A',
  gold:     '#C9A84C',
  goldSoft: 'rgba(201,168,76,0.30)',
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
    <div style={{ width: w, height: h, flexShrink: 0, position: 'relative',
      borderRadius: 3, overflow: 'hidden',
      boxShadow: '0 4px 14px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.4)' }}>
      {src && !failed ? (
        <img src={src} alt={title} onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
      ) : (
        <div style={{ width: '100%', height: '100%',
          background: 'linear-gradient(150deg,#3B5A47,#20120f)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: w * 0.12, boxSizing: 'border-box' }}>
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
      <div style={{ position: 'absolute', top: 0, left: 0, width: '14%', height: '100%',
        background: 'linear-gradient(90deg,rgba(0,0,0,0.4),rgba(0,0,0,0))', pointerEvents: 'none' }}/>
    </div>
  );
}

function StatusDot({ state }) {
  const label = state === 'review' ? 'Community Review' : 'Reading';
  const color = S.gold;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color,
        boxShadow: `0 0 6px ${color}` }}/>
      <span style={{ fontFamily: S.type, fontSize: 10, letterSpacing: '0.06em',
        color: S.gold }}>{label}</span>
    </span>
  );
}

export default function SalonProfileCard({ period, user, enrolled }) {
  const navigate = useNavigate();
  const [enrolling, setEnrolling] = useState(false);
  const [localEnrolled, setLocalEnrolled] = useState(enrolled);

  if (!period) return null;

  const isEnrolled = localEnrolled || enrolled;
  const isReview   = period.status === 'review';

  // state driver: open + not joined → join; open + joined → enrolled; review → review
  const cardState = isReview ? 'review' : isEnrolled ? 'enrolled' : 'join';

  const { daysRemaining, dayOf, totalDays } = computeEnrollment(period);
  const pct = totalDays > 0 ? Math.min(100, Math.round((dayOf / totalDays) * 100)) : 0;
  const dates = formatSalonDates(period);
  const nextAnnounce = period.nextBookAnnounceDate
    ? (() => {
        const d = period.nextBookAnnounceDate?.toDate?.() ?? new Date(period.nextBookAnnounceDate);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      })()
    : null;

  const handleEnroll = async () => {
    if (!user || enrolling) return;
    setEnrolling(true);
    try {
      await enrollInSalon(period.id, user.uid);
      setLocalEnrolled(true);
    } catch (err) {
      console.error('[SalonProfileCard] enroll failed', err);
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 480, background: S.wine,
      border: `1px solid ${S.goldSoft}`, borderRadius: 14, padding: 16,
      fontFamily: S.serif, marginBottom: 20 }}>

      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: S.display, fontSize: 12, letterSpacing: '0.10em',
          color: S.gold, textTransform: 'uppercase' }}>The Salon</span>
        {cardState !== 'join' && <StatusDot state={cardState}/>}
      </div>

      {/* Body row */}
      <div style={{ display: 'flex', gap: 14 }}>
        <BookCover src={period.coverURL} title={period.bookTitle}
          author={period.bookAuthor} w={60} h={90}/>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: S.serif, fontWeight: 700, fontSize: 15,
            color: S.cream, lineHeight: 1.2 }}>{period.bookTitle}</div>
          <div style={{ fontFamily: S.serif, fontStyle: 'italic', fontSize: 12,
            color: S.paper2, marginTop: 3 }}>{period.bookAuthor}</div>

          {cardState === 'join' && (
            <>
              {dates && (
                <div style={{ fontFamily: S.type, fontSize: 10.5, color: S.gold, marginTop: 8 }}>
                  {dates}
                </div>
              )}
              {nextAnnounce && (
                <div style={{ fontFamily: S.type, fontSize: 10.5, color: S.muted, marginTop: 2 }}>
                  Next book: {nextAnnounce}
                </div>
              )}
            </>
          )}

          {cardState === 'enrolled' && (
            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <div style={{ height: 4, borderRadius: 3, background: S.wine2, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: S.gold,
                  boxShadow: `0 0 6px ${S.gold}`, transition: 'width 0.6s ease-out' }}/>
              </div>
              <div style={{ fontFamily: S.type, fontSize: 11, color: S.gold, marginTop: 6 }}>
                {daysRemaining} days remaining
              </div>
            </div>
          )}

          {cardState === 'review' && (
            <div style={{ fontFamily: S.serif, fontStyle: 'italic', fontSize: 12.5,
              color: S.muted, marginTop: 'auto', paddingTop: 10 }}>
              See what readers said.
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div style={{ marginTop: 16 }}>
        {cardState === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: S.serif, fontStyle: 'italic', fontSize: 14,
              color: S.paper2 }}>Are you in?</div>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button onClick={handleEnroll} disabled={enrolling || !user}
                style={{ flex: 1, fontFamily: S.display, fontSize: 12.5,
                  letterSpacing: '0.04em', borderRadius: 10, minHeight: 46,
                  background: S.orange, color: '#fff', border: 'none',
                  cursor: enrolling || !user ? 'default' : 'pointer',
                  boxShadow: `0 0 20px rgba(255,78,0,0.4)`,
                  opacity: enrolling ? 0.7 : 1 }}>
                {enrolling ? '…' : 'YES  →'}
              </button>
              <button onClick={() => navigate('/salon')}
                style={{ flex: 1, fontFamily: S.display, fontSize: 12.5,
                  letterSpacing: '0.04em', borderRadius: 10, minHeight: 46,
                  background: 'transparent', color: S.muted, border: 'none', cursor: 'pointer' }}>
                Maybe later
              </button>
            </div>
          </div>
        )}
        {cardState === 'enrolled' && (
          <button onClick={() => navigate('/salon')} style={{ width: '100%',
            fontFamily: S.display, fontSize: 12.5, letterSpacing: '0.04em',
            borderRadius: 10, minHeight: 46,
            background: 'transparent', color: S.gold,
            border: `1.5px solid ${S.gold}`, cursor: 'pointer' }}>
            GO TO THE SALON  →
          </button>
        )}
        {cardState === 'review' && period.gazetteReviewURL && (
          <a href={period.gazetteReviewURL} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', width: '100%', textDecoration: 'none',
              boxSizing: 'border-box', fontFamily: S.display, fontSize: 12.5,
              letterSpacing: '0.04em', borderRadius: 10, minHeight: 46,
              textAlign: 'center', lineHeight: '46px',
              background: 'transparent', color: S.muted,
              border: `1.5px solid ${S.muted2}` }}>
            READ THE GAZETTE  →
          </a>
        )}
        {cardState === 'review' && !period.gazetteReviewURL && (
          <button onClick={() => navigate('/salon')} style={{ width: '100%',
            fontFamily: S.display, fontSize: 12.5, letterSpacing: '0.04em',
            borderRadius: 10, minHeight: 46,
            background: 'transparent', color: S.muted,
            border: `1.5px solid ${S.muted2}`, cursor: 'pointer' }}>
            VIEW THE SALON  →
          </button>
        )}
      </div>
    </div>
  );
}
