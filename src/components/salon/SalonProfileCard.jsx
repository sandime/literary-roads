import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollInSalon, computeEnrollment } from '../../utils/salon';
import {
  S, AtomRating, BookCover, SalonButton, StatusDot,
} from './SalonKit';

const DISMISS_MS = 48 * 60 * 60 * 1000;
const dismissKey = uid => `lr_salon_card_dismissed_${uid || 'guest'}`;

const getDismissed = uid => {
  try {
    const ts = localStorage.getItem(dismissKey(uid));
    return ts ? Date.now() - parseInt(ts, 10) < DISMISS_MS : false;
  } catch { return false; }
};

const olCoverUrl = id => id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null;

function CoverThumb({ period }) {
  const [failed, setFailed] = useState(false);
  const src = !failed
    ? (period.coverImage || olCoverUrl(period.openLibraryCoverId) || period.coverURL || null)
    : null;
  return <BookCover w={62} h={93} src={src} title={period.bookTitle} author={period.bookAuthor}
    onError={() => setFailed(true)} />;
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
  const [dismissed,     setDismissed]     = useState(() => getDismissed(user?.uid));

  if (!period || dismissed) return null;

  const isEnrolled = localEnrolled || enrolled;
  const isActive   = period.status === 'active' || period.status === 'open';
  const isClosed   = period.status === 'closed' || period.status === 'review';
  const hasGazette = !!(period.gazetteIssueId || period.gazetteReviewURL);

  const cardState =
    isEnrolled && isActive ? 'enrolled' :
    isClosed && hasGazette ? 'review'   : 'join';

  const dotState = cardState === 'enrolled' ? 'reading' : 'closed';

  const { daysRemaining, dayOf, totalDays } = computeEnrollment(period);
  const pct = totalDays > 0 ? Math.min(100, Math.round((dayOf / totalDays) * 100)) : 0;

  const dateRange = formatRange(period.startDate, period.endDate);
  const nextDate  = fmtDate(period.nextBookDate || period.nextBookAnnounceDate);

  const handleEnroll = async () => {
    if (!user) { navigate('/login'); return; }
    if (enrolling) return;
    setEnrolling(true);
    try {
      await enrollInSalon(period.id, user.uid, period);
      navigate('/salon');
    } catch (err) {
      console.error('[SalonProfileCard] enroll failed', err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(dismissKey(user?.uid), String(Date.now())); } catch {}
    setDismissed(true);
  };

  const handleGazette = () => {
    if (period.gazetteIssueId) navigate(`/newspaper/${period.gazetteIssueId}`);
    else if (period.gazetteReviewURL) window.open(period.gazetteReviewURL, '_blank', 'noopener');
  };

  return (
    <div style={{ width: '100%', background: S.teal, border: `1px solid ${S.lineTurq}`,
      borderRadius: 16, padding: 18, marginBottom: 20, boxSizing: 'border-box',
      fontFamily: S.fonts.serif, color: S.cream,
      boxShadow: '0 14px 40px rgba(0,0,0,0.3)' }}>

      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16 }}>
        <span style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.3em',
          color: S.coral, textTransform: 'uppercase', fontWeight: 600 }}>The Salon</span>
        {cardState !== 'join' && <StatusDot state={dotState} label />}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: 16 }}>
        <CoverThumb period={period} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 17,
            color: S.cream, lineHeight: 1.1, textTransform: 'uppercase',
            letterSpacing: '-0.01em' }}>
            {period.bookTitle}
          </div>
          <div style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 13,
            color: S.turq, marginTop: 3 }}>
            {period.bookAuthor}
          </div>

          {cardState === 'join' && (
            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              {dateRange && (
                <div style={{ fontFamily: S.fonts.sans, fontSize: 10.5, letterSpacing: '0.16em',
                  color: S.creamDim, textTransform: 'uppercase' }}>{dateRange}</div>
              )}
              {nextDate && (
                <div style={{ fontFamily: S.fonts.sans, fontSize: 10.5, letterSpacing: '0.04em',
                  color: S.creamFaint, marginTop: 4 }}>Next book: {nextDate}</div>
              )}
            </div>
          )}

          {cardState === 'enrolled' && (
            <div style={{ marginTop: 'auto', paddingTop: 12 }}>
              <div style={{ height: 4, borderRadius: 3, background: S.teal2, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: S.turq,
                  boxShadow: `0 0 7px ${S.turq}`, transition: 'width 0.6s ease-out' }} />
              </div>
              <div style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.04em',
                color: S.turq, marginTop: 7, fontWeight: 600 }}>
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
              </div>
            </div>
          )}

          {cardState === 'review' && (
            <div style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 14,
              color: S.creamDim, marginTop: 'auto', paddingTop: 12 }}>
              See what readers said.
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div style={{ marginTop: 18 }}>
        {cardState === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 16,
              color: S.cream }}>Are you in?</div>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <SalonButton variant="primary" full onClick={handleEnroll} disabled={enrolling}>
                {enrolling ? '…' : 'Yes  →'}
              </SalonButton>
              <SalonButton variant="ghost" full onClick={handleDismiss}>
                Maybe later
              </SalonButton>
            </div>
          </div>
        )}
        {cardState === 'enrolled' && (
          <SalonButton variant="turq" full onClick={() => navigate('/salon')}>
            Go to the Salon  →
          </SalonButton>
        )}
        {cardState === 'review' && (
          <SalonButton variant="outline" full onClick={handleGazette}>
            Read the Gazette  →
          </SalonButton>
        )}
      </div>
    </div>
  );
}
