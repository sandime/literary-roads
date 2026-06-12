import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollInSalon, computeEnrollment } from '../../utils/salon';

const PINK    = '#f66483';
const TEAL    = '#30b8b2';
const DISMISS_KEY = 'lr_salon_card_dismissed';
const DISMISS_MS  = 48 * 60 * 60 * 1000;

const getDismissed = () => {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    return ts ? Date.now() - parseInt(ts, 10) < DISMISS_MS : false;
  } catch { return false; }
};

const olCoverUrl = id => id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null;

function BookThumb({ period }) {
  const [failed, setFailed] = useState(false);
  const src = !failed
    ? (period.coverImage || olCoverUrl(period.openLibraryCoverId) || period.coverURL || null)
    : null;
  return (
    <div style={{ width: 60, height: 90, flexShrink: 0, borderRadius: 3, overflow: 'hidden',
      boxShadow: '0 4px 14px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.35)' }}>
      {src ? (
        <img src={src} alt={period.bookTitle} onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
      ) : (
        <div style={{ width: '100%', height: '100%',
          background: 'linear-gradient(150deg,#3B5A47,#20120f)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: 7, boxSizing: 'border-box' }}>
          <div style={{ width: '40%', height: 2, background: 'rgba(201,168,76,0.7)' }}/>
          <div>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, color: '#FFF8E7',
              fontSize: 7.5, lineHeight: 1.2 }}>{period.bookTitle}</div>
            <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', color: '#E5D9C2',
              fontSize: 6.5, marginTop: 2, opacity: 0.85 }}>{period.bookAuthor}</div>
          </div>
          <div style={{ width: '40%', height: 2, background: 'rgba(201,168,76,0.7)', alignSelf: 'flex-end' }}/>
        </div>
      )}
    </div>
  );
}

function formatRange(start, end) {
  if (!start || !end) return '';
  const s = start?.toDate?.() ?? new Date(start);
  const e = end?.toDate?.()   ?? new Date(end);
  const sm = s.toLocaleDateString('en-US', { month: 'long' });
  const em = e.toLocaleDateString('en-US', { month: 'long' });
  return sm === em ? `${sm} ${e.getFullYear()}` : `${sm} — ${em} ${e.getFullYear()}`;
}

function fmtDate(ts) {
  if (!ts) return null;
  const d = ts?.toDate?.() ?? new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export default function SalonProfileCard({ period, user, enrolled }) {
  const navigate = useNavigate();
  const [enrolling,     setEnrolling]     = useState(false);
  const [localEnrolled, setLocalEnrolled] = useState(false);
  const [dismissed,     setDismissed]     = useState(getDismissed);

  if (!period || dismissed) return null;

  const isEnrolled   = localEnrolled || enrolled;
  const isActive     = period.status === 'active'   || period.status === 'open';
  const isUpcoming   = period.status === 'upcoming';
  const isClosed     = period.status === 'closed'   || period.status === 'review';
  const hasGazette   = !!(period.gazetteIssueId || period.gazetteReviewURL);

  // State B: enrolled AND active
  // State C: closed AND gazette available
  // State A: everything else (upcoming, active+not enrolled, closed without gazette)
  const cardState =
    isEnrolled && isActive ? 'enrolled' :
    isClosed && hasGazette ? 'review'   : 'join';

  const borderColor =
    cardState === 'enrolled' ? `rgba(48,184,178,0.30)` :
    cardState === 'review'   ? 'rgba(192,192,192,0.20)' :
    `rgba(246,100,131,0.30)`;

  const labelColor =
    cardState === 'enrolled' ? TEAL   :
    cardState === 'review'   ? '#A2908C' : PINK;

  const dotColor =
    cardState === 'enrolled' ? TEAL   : '#A2908C';

  const dotLabel =
    cardState === 'enrolled' ? 'Reading' : 'Closed';

  const { daysRemaining, dayOf, totalDays } = computeEnrollment(period);
  const pct = totalDays > 0 ? Math.min(100, Math.round((dayOf / totalDays) * 100)) : 0;

  const dateRange  = formatRange(period.startDate, period.endDate);
  const nextDate   = fmtDate(period.nextBookDate || period.nextBookAnnounceDate);

  const handleEnroll = async () => {
    if (!user || enrolling) return;
    setEnrolling(true);
    try {
      await enrollInSalon(period.id, user.uid, period);
      setLocalEnrolled(true);
    } catch (err) {
      console.error('[SalonProfileCard] enroll failed', err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setDismissed(true);
  };

  const handleGazette = () => {
    if (period.gazetteIssueId) {
      navigate(`/newspaper/${period.gazetteIssueId}`);
    } else if (period.gazetteReviewURL) {
      window.open(period.gazetteReviewURL, '_blank', 'noopener');
    }
  };

  return (
    <div style={{
      width: '100%', background: '#1E1F33',
      border: `1px solid ${borderColor}`, borderRadius: 14,
      padding: 16, marginBottom: 20, boxSizing: 'border-box',
    }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: '"Bungee",system-ui,sans-serif', fontSize: 11,
          letterSpacing: '0.10em', color: labelColor, textTransform: 'uppercase' }}>
          The Salon
        </span>
        {cardState !== 'join' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor,
              boxShadow: `0 0 5px ${dotColor}` }}/>
            <span style={{ fontFamily: '"Special Elite",Georgia,serif', fontSize: 10,
              letterSpacing: '0.06em', color: dotColor }}>{dotLabel}</span>
          </span>
        )}
      </div>

      {/* Body row */}
      <div style={{ display: 'flex', gap: 14 }}>
        <BookThumb period={period}/>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: '"Special Elite",Georgia,serif', fontWeight: 700,
            fontSize: 15, color: '#FFF8E7', lineHeight: 1.2 }}>
            {period.bookTitle}
          </div>
          <div style={{ fontFamily: '"Special Elite",Georgia,serif', fontStyle: 'italic',
            fontSize: 12, color: '#E5D9C2', marginTop: 3 }}>
            {period.bookAuthor}
          </div>

          {cardState === 'join' && (
            <div style={{ marginTop: 8 }}>
              {dateRange && (
                <div style={{ fontFamily: '"Special Elite",Georgia,serif', fontSize: 11,
                  color: 'rgba(192,192,192,0.55)' }}>
                  {dateRange}
                </div>
              )}
              {isUpcoming && nextDate && (
                <div style={{ fontFamily: '"Special Elite",Georgia,serif', fontSize: 11,
                  color: PINK, marginTop: 2 }}>
                  Next book: {nextDate}
                </div>
              )}
            </div>
          )}

          {cardState === 'enrolled' && (
            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <div style={{ height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.07)',
                overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: TEAL,
                  boxShadow: `0 0 6px ${TEAL}`, transition: 'width 0.6s ease-out' }}/>
              </div>
              <div style={{ fontFamily: '"Special Elite",Georgia,serif', fontSize: 11,
                color: TEAL, marginTop: 5 }}>
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
              </div>
            </div>
          )}

          {cardState === 'review' && (
            <div style={{ fontFamily: '"Special Elite",Georgia,serif', fontStyle: 'italic',
              fontSize: 13, color: '#A2908C', marginTop: 'auto', paddingTop: 8 }}>
              See what readers said.
            </div>
          )}
        </div>
      </div>

      {/* Action area */}
      <div style={{ marginTop: 16 }}>
        {cardState === 'join' && (
          <>
            <div style={{ fontFamily: '"Special Elite",Georgia,serif', fontStyle: 'italic',
              fontSize: 14, color: '#E5D9C2', textAlign: 'center', marginBottom: 10 }}>
              Are you in?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {user ? (
                <button onClick={handleEnroll} disabled={enrolling}
                  style={{ flex: 1, fontFamily: '"Bungee",system-ui,sans-serif', fontSize: 12,
                    letterSpacing: '0.04em', borderRadius: 10, minHeight: 44,
                    background: PINK, color: '#fff', border: 'none',
                    cursor: enrolling ? 'default' : 'pointer',
                    boxShadow: `0 0 18px rgba(246,100,131,0.4)`,
                    opacity: enrolling ? 0.7 : 1, transition: 'opacity .15s' }}>
                  {enrolling ? '…' : 'YES, I\'M IN  →'}
                </button>
              ) : (
                <button onClick={() => navigate('/login')}
                  style={{ flex: 1, fontFamily: '"Bungee",system-ui,sans-serif', fontSize: 12,
                    letterSpacing: '0.04em', borderRadius: 10, minHeight: 44,
                    background: PINK, color: '#fff', border: 'none', cursor: 'pointer',
                    boxShadow: `0 0 18px rgba(246,100,131,0.4)` }}>
                  SIGN IN TO JOIN  →
                </button>
              )}
              <button onClick={handleDismiss}
                style={{ flex: 1, fontFamily: '"Special Elite",Georgia,serif', fontSize: 13,
                  borderRadius: 10, minHeight: 44,
                  background: 'transparent', color: 'rgba(192,192,192,0.5)',
                  border: 'none', cursor: 'pointer' }}>
                Maybe later
              </button>
            </div>
          </>
        )}

        {cardState === 'enrolled' && (
          <button onClick={() => navigate('/salon')}
            style={{ width: '100%', fontFamily: '"Bungee",system-ui,sans-serif',
              fontSize: 12, letterSpacing: '0.04em', borderRadius: 10, minHeight: 44,
              background: 'transparent', color: TEAL,
              border: `1.5px solid ${TEAL}`, cursor: 'pointer',
              boxShadow: `0 0 14px rgba(48,184,178,0.18)`,
              transition: 'box-shadow .15s' }}>
            GO TO THE SALON  →
          </button>
        )}

        {cardState === 'review' && (
          <button onClick={handleGazette}
            style={{ width: '100%', fontFamily: '"Bungee",system-ui,sans-serif',
              fontSize: 12, letterSpacing: '0.04em', borderRadius: 10, minHeight: 44,
              background: 'transparent', color: '#A2908C',
              border: '1.5px solid rgba(162,144,140,0.5)', cursor: 'pointer' }}>
            READ THE GAZETTE  →
          </button>
        )}
      </div>
    </div>
  );
}
