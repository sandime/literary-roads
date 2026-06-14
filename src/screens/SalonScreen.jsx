import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToActiveSalon, subscribeToEnrollment, enrollInSalon,
  subscribeToReviews, postReview,
} from '../utils/salon';
import {
  S, SALON_ANIMATIONS_CSS, useWidth,
  AtomRating, BookCover, LevitatingBook,
  SalonButton, StatusDot, Rule, SalonScreenShell, Masthead,
} from '../components/salon/SalonKit';

const SALON_CAT = '/literary-roads/images/salon-cat.png';
const CARD_COLORS = ['coral', 'magenta', 'rust'];
const CARD_BG = { coral: '#f66483', magenta: '#c877bf', rust: '#a6480a' };
const RATING_LABELS = ['', 'Rough going', 'Mixed', 'Solid', 'Excellent', 'A masterpiece'];

function buildBook(period) {
  if (!period) return null;
  const src = period.coverImage
    || (period.openLibraryCoverId
      ? `https://covers.openlibrary.org/b/id/${period.openLibraryCoverId}-M.jpg`
      : null)
    || period.coverURL
    || null;
  let dates = period.dates || '';
  if (!dates && period.startDate && period.endDate) {
    const fmt = ts => {
      const d = ts?.toDate?.() ?? new Date(ts);
      return d.toLocaleDateString('en-US', { month: 'long' });
    };
    const e = period.endDate?.toDate?.() ?? new Date(period.endDate);
    dates = `${fmt(period.startDate)} — ${fmt(period.endDate)} ${e.getFullYear()}`;
  }
  return { title: period.bookTitle || '', author: period.bookAuthor || '', dates, src };
}

function AnimStyles() {
  return <style>{SALON_ANIMATIONS_CSS}</style>;
}

// ── Sticky masthead bar (review + empty screens) ──────────────────────────────
function MastheadBar({ book, status = 'reading', onBack, wide }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(15,55,59,0.93)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${S.line}`,
      padding: wide ? '14px 32px' : '11px 16px',
      display: 'flex', alignItems: 'center', gap: 14 }}>
      {onBack && (
        <span onClick={onBack} style={{ color: S.coral, fontFamily: S.fonts.display,
          fontSize: 26, lineHeight: 1, cursor: 'pointer', marginTop: -3, userSelect: 'none' }}>
          ‹
        </span>
      )}
      <BookCover w={30} h={45} src={book?.src} title={book?.title} author={book?.author} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: S.fonts.sans, fontSize: 9.5, letterSpacing: '0.3em',
          color: S.coral, textTransform: 'uppercase', fontWeight: 600 }}>The Salon</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9,
          whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <span style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 15,
            color: S.cream, textTransform: 'uppercase', letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis' }}>{book?.title}</span>
          {wide && (
            <span style={{ fontFamily: S.fonts.display, fontStyle: 'italic',
              fontSize: 13, color: S.turq }}>{book?.author}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {wide && (
          <span style={{ fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.22em',
            color: S.creamDim, textTransform: 'uppercase' }}>{book?.dates}</span>
        )}
        <StatusDot state={status} label />
      </div>
    </div>
  );
}

// ── 1. Entry — the invitation ─────────────────────────────────────────────────
function EntryScreen({ book, period, user, enrolled, onEnter }) {
  const navigate = useNavigate();
  const [ref, w] = useWidth();
  const [enrolling, setEnrolling] = useState(false);
  const wide = w >= 820;
  const titleSize = wide ? 60 : Math.max(34, Math.min(w * 0.135, 56));
  const memberCount = period?.participantCount || period?.memberCount || 0;
  const editorial = period?.editorialNote || '';

  const handleJoin = async () => {
    if (!user) { navigate('/login'); return; }
    if (enrolling) return;
    setEnrolling(true);
    try {
      await enrollInSalon(period.id, user.uid, period);
      onEnter();
    } catch {
      setEnrolling(false);
    }
  };

  const hero = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <LevitatingBook w={wide ? 178 : 148} frameColor={S.coral}
        src={book?.src} title={book?.title} author={book?.author} />
      <img src={SALON_CAT} alt=""
        style={{ width: wide ? 150 : 122, height: wide ? 150 : 122,
          objectFit: 'contain', marginTop: 4,
          filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.45))' }} />
    </div>
  );

  const note = (
    <>
      {editorial ? (
        <p style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 16.5,
          lineHeight: 1.55, color: S.cream,
          margin: wide ? '28px 0 0' : '24px 0 0', maxWidth: 420 }}>
          {editorial}
        </p>
      ) : null}
      {memberCount > 0 && (
        <div style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.16em',
          color: S.turq, textTransform: 'uppercase', marginTop: 20, fontWeight: 600 }}>
          {memberCount.toLocaleString()} Literary Roadsters reading
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24,
        width: '100%', maxWidth: 330,
        alignItems: wide ? 'flex-start' : 'stretch' }}>
        {enrolled ? (
          <SalonButton variant="primary" full onClick={onEnter}>
            Go to the Salon  &#8594;
          </SalonButton>
        ) : (
          <>
            <SalonButton variant="primary" full onClick={handleJoin} disabled={enrolling}>
              {enrolling ? 'Joining…' : 'Are you in?  →'}
            </SalonButton>
            <SalonButton variant="ghost" full onClick={onEnter}>
              Just browse
            </SalonButton>
          </>
        )}
      </div>
    </>
  );

  const goHome = () => {
    sessionStorage.setItem('lr_odometer_done', '1');
    navigate('/');
  };

  return (
    <div ref={ref} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: wide ? '14px 32px' : '12px 18px', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 0,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.14em',
          color: S.coral, textTransform: 'uppercase', padding: '6px 0' }}>
          <span style={{ fontSize: 20, lineHeight: 1, marginTop: -2 }}>‹</span> Back
        </button>
        <button onClick={goHome} style={{ background: 'none', border: 0,
          cursor: 'pointer', fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.14em',
          color: S.creamDim, textTransform: 'uppercase', padding: '6px 0' }}>
          Map ›
        </button>
      </div>

      {wide ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row',
          alignItems: 'center', justifyContent: 'center', gap: 56,
          maxWidth: 1080, margin: '0 auto',
          padding: '24px 56px 48px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Masthead big align="left" titleSize={titleSize} book={book} />
            {note}
          </div>
          {hero}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          maxWidth: 460, margin: '0 auto',
          padding: '12px 24px 30px', width: '100%', boxSizing: 'border-box',
          textAlign: 'center' }}>
          <Masthead big align="center" titleSize={titleSize} book={book} />
          <div style={{ margin: '22px 0 0' }}>{hero}</div>
          {note}
        </div>
      )}
    </div>
  );
}

// ── Aggregate rating (hidden until ≥ 20 reviews) ──────────────────────────────
function AggregateRating({ reviews, wide }) {
  const rated = reviews.filter(r => r.rating > 0);
  if (rated.length < 20) return null;
  const avg = rated.reduce((s, r) => s + r.rating, 0) / rated.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 14, flexWrap: 'wrap' }}>
      <AtomRating value={avg} size={wide ? 26 : 22} gap={5} />
      <span style={{ fontFamily: S.fonts.display, fontWeight: 600,
        fontSize: wide ? 30 : 26, color: S.cream }}>{avg.toFixed(1)}</span>
      <span style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.16em',
        color: S.creamDim, textTransform: 'uppercase' }}>
        Based on {rated.length} reviews
      </span>
    </div>
  );
}

// ── Pull quote (admin-controlled, stored on period doc) ───────────────────────
function PullQuote({ period, wide }) {
  if (!period?.pullQuoteVisible || !period?.pullQuote) return null;
  return (
    <figure style={{ margin: wide ? '40px auto' : '32px auto', maxWidth: 760, textAlign: 'center' }}>
      <div style={{ height: 1, background: S.coral, opacity: 0.6 }} />
      <blockquote style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontWeight: 500,
        fontSize: wide ? 30 : 23, lineHeight: 1.32, color: S.coral, margin: 0,
        padding: wide ? '28px 24px' : '22px 12px', border: 0 }}>
        &ldquo;{period.pullQuote}&rdquo;
      </blockquote>
      <figcaption style={{ fontFamily: S.fonts.sans, fontSize: 10.5, letterSpacing: '0.22em',
        color: S.creamDim, textTransform: 'uppercase', marginBottom: wide ? 28 : 22 }}>
        &mdash; {period.pullQuoteBy || 'Literary Roadster'}
      </figcaption>
      <div style={{ height: 1, background: S.coral, opacity: 0.6 }} />
    </figure>
  );
}

// ── Featured review card (solid color, magazine headline) ─────────────────────
function FeaturedCard({ review, colorKey }) {
  const onRust = colorKey === 'rust';
  const meta = onRust ? 'rgba(255,248,231,0.7)' : 'rgba(21,72,76,0.62)';
  const ink = onRust ? S.cream : '#15484C';
  const ts = review.submittedAt?.toDate?.() ?? (review.submittedAt ? new Date(review.submittedAt) : null);
  const dateStr = ts ? ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  return (
    <article style={{ breakInside: 'avoid', WebkitColumnBreakInside: 'avoid', marginBottom: 18,
      display: 'block', width: '100%', background: CARD_BG[colorKey], borderRadius: 14,
      padding: '20px 22px 22px', boxSizing: 'border-box', color: ink,
      boxShadow: '0 10px 30px rgba(0,0,0,0.22)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 12 }}>
        <AtomRating value={review.rating} size={17} gap={3}
          fillColor={onRust ? S.cream : S.rust}
          emptyColor={onRust ? 'rgba(255,248,231,0.32)' : 'rgba(21,72,76,0.4)'} />
        <div style={{ textAlign: 'right', lineHeight: 1.3, flexShrink: 0 }}>
          <div style={{ fontFamily: S.fonts.sans, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.03em', color: ink, whiteSpace: 'nowrap' }}>
            {review.userName}
          </div>
          {dateStr && (
            <div style={{ fontFamily: S.fonts.sans, fontSize: 9.5, letterSpacing: '0.14em',
              color: meta, textTransform: 'uppercase', marginTop: 3, whiteSpace: 'nowrap' }}>
              {dateStr}
            </div>
          )}
        </div>
      </div>
      <p style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 22, lineHeight: 1.2,
        letterSpacing: '-0.01em', margin: '16px 0 0', color: ink }}>
        &ldquo;{review.oneSentence}&rdquo;
      </p>
      {review.fullResponse ? (
        <p style={{ fontFamily: S.fonts.display, fontWeight: 400, fontSize: 14.5,
          lineHeight: 1.55, margin: '12px 0 0',
          color: onRust ? S.creamDim : 'rgba(21,72,76,0.82)' }}>
          {review.fullResponse}
        </p>
      ) : null}
    </article>
  );
}

// ── Accordion row (non-featured reviews) ─────────────────────────────────────
function AccordionRow({ review }) {
  const [open, setOpen] = useState(false);
  const ts = review.submittedAt?.toDate?.() ?? (review.submittedAt ? new Date(review.submittedAt) : null);
  const dateStr = ts ? ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  return (
    <div style={{ borderBottom: `1px solid ${S.line}` }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', appearance: 'none',
        background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', color: S.cream,
        padding: '15px 4px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <AtomRating value={review.rating} size={15} gap={2.5} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 15,
            color: S.cream, display: 'block',
            whiteSpace: open ? 'normal' : 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis' }}>
            &ldquo;{review.oneSentence}&rdquo;
          </span>
        </span>
        <span style={{ fontFamily: S.fonts.sans, fontSize: 9.5, letterSpacing: '0.12em',
          color: S.creamDim, textTransform: 'uppercase', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {review.userName}{dateStr ? ` · ${dateStr}` : ''}
        </span>
        <span style={{ color: S.coral, fontSize: 13, flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s ease' }}>
          &#9662;
        </span>
      </button>
      <div style={{ maxHeight: open ? 220 : 0, overflow: 'hidden',
        transition: 'max-height .3s ease, opacity .25s ease', opacity: open ? 1 : 0 }}>
        <p style={{ fontFamily: S.fonts.display, fontSize: 14.5, lineHeight: 1.55,
          color: S.creamDim, margin: 0, padding: '0 4px 18px 33px' }}>
          {review.fullResponse || 'No further notes — just the verdict above.'}
        </p>
      </div>
    </div>
  );
}

// ── Composer (sticky bottom) ─────────────────────────────────────────────────
function Composer({ wide, period, user, reviews }) {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(null);
  const [line, setLine] = useState('');
  const [full, setFull] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [posting, setPosting] = useState(false);

  const isClosed = period?.status === 'closed' || period?.status === 'review';
  const hasReviewed = user ? reviews.some(r => r.userId === user.uid) : false;
  const ready = rating > 0 && line.trim().length > 0 && !posting;

  const wrapStyle = {
    position: 'sticky', bottom: 0, zIndex: 40,
    background: 'rgba(13,48,52,0.97)', backdropFilter: 'blur(14px)',
  };

  if (!user) {
    return (
      <div style={{ ...wrapStyle, borderTop: `1px solid ${S.coral}`,
        padding: wide ? '16px 32px' : '14px 20px', textAlign: 'center' }}>
        <SalonButton variant="primary" onClick={() => navigate('/login')}>
          Sign in to give your verdict  &#8594;
        </SalonButton>
      </div>
    );
  }

  if (hasReviewed) {
    return (
      <div style={{ ...wrapStyle, borderTop: `1px solid ${S.line}`,
        padding: wide ? '16px 32px' : '14px 20px', textAlign: 'center' }}>
        <span style={{ fontFamily: S.fonts.display, fontStyle: 'italic',
          fontSize: 15, color: S.creamDim }}>
          You&rsquo;ve given your verdict.
        </span>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div style={{ ...wrapStyle, borderTop: `1px solid ${S.line}`,
        padding: wide ? '16px 32px' : '14px 20px', textAlign: 'center' }}>
        <span style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.18em',
          color: S.creamDim, textTransform: 'uppercase' }}>
          The salon is closed.
        </span>
      </div>
    );
  }

  const handlePost = async () => {
    if (!ready) return;
    setPosting(true);
    try {
      await postReview(period.id, {
        userId: user.uid,
        userName: user.displayName || 'Literary Roadster',
        rating,
        oneSentence: line.trim(),
        fullResponse: full.trim(),
      });
      setRating(0); setLine(''); setFull(''); setExpanded(false);
    } catch (err) {
      console.error('[Salon] postReview failed', err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div style={{ ...wrapStyle, borderTop: `1px solid ${S.coral}` }}>
      <div style={{ maxWidth: 880, margin: '0 auto',
        padding: wide ? '16px 32px 18px' : '12px 16px 14px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12,
          flexWrap: 'wrap', marginBottom: 11 }}>
          <span style={{ fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.2em',
            color: S.creamDim, textTransform: 'uppercase' }}>Your rating</span>
          <AtomRating value={rating} hover={hover} onHover={setHover} onRate={setRating}
            size={24} gap={5} />
          {rating > 0 && (
            <span style={{ fontFamily: S.fonts.display, fontSize: 15,
              color: S.turq, fontStyle: 'italic' }}>
              {RATING_LABELS[rating]}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={line} onChange={e => setLine(e.target.value.slice(0, 140))}
              placeholder="One sentence — your verdict (required)"
              style={{ width: '100%', boxSizing: 'border-box', background: S.teal3,
                border: `1px solid ${S.line}`, borderRadius: 12, padding: '13px 15px',
                outline: 'none', color: S.cream, fontFamily: S.fonts.display,
                fontStyle: 'italic', fontSize: 15.5 }} />
            {(expanded || full) ? (
              <textarea value={full} onChange={e => setFull(e.target.value.slice(0, 600))}
                rows={wide ? 3 : 2} placeholder="Your full response (optional)"
                style={{ width: '100%', boxSizing: 'border-box', background: S.teal3,
                  border: `1px solid ${S.line}`, borderRadius: 12, padding: '12px 15px',
                  outline: 'none', resize: 'none', color: S.cream,
                  fontFamily: S.fonts.display, fontSize: 14.5, lineHeight: 1.5 }} />
            ) : (
              <button onClick={() => setExpanded(true)} style={{ alignSelf: 'flex-start',
                background: 'none', border: 0, cursor: 'pointer', padding: '2px 0',
                fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.08em', color: S.turq }}>
                + Add a full response
              </button>
            )}
          </div>
          <SalonButton variant="primary" disabled={!ready} onClick={handlePost}
            style={{ minHeight: 48, padding: '0 22px' }}>
            {posting ? '…' : 'Post  →'}
          </SalonButton>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          <span style={{ fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.04em',
            color: line.length > 120 ? S.coral : S.creamFaint }}>
            {140 - line.length} left in your sentence
          </span>
          {(expanded || full) && (
            <span style={{ fontFamily: S.fonts.sans, fontSize: 10,
              color: full.length > 540 ? S.coral : S.creamFaint }}>
              {600 - full.length} in your response
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 2. Review — the magazine ──────────────────────────────────────────────────
function ReviewScreen({ book, period, user, reviews, onBack }) {
  const [ref, w] = useWidth();
  const wide = w >= 720;
  const isClosed = period?.status === 'closed' || period?.status === 'review';
  const hasPullQuote = period?.pullQuoteVisible && period?.pullQuote;
  const featured = reviews.filter(r => r.isFeatured);
  const rest = reviews.filter(r => !r.isFeatured);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <MastheadBar book={book} status={isClosed ? 'closed' : 'reading'} onBack={onBack} wide={wide} />

      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box',
          padding: wide ? '40px 32px 24px' : '26px 16px 18px' }}>

          {reviews.length >= 20 && (
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <AggregateRating reviews={reviews} wide={wide} />
            </div>
          )}

          {hasPullQuote && <PullQuote period={period} wide={wide} />}

          <div style={{ margin: hasPullQuote ? '6px 0 18px' : '0 0 18px' }}>
            <Rule label="What readers said" />
          </div>

          {featured.length > 0 && (
            <div style={{ columnWidth: wide ? 330 : 9999, columnGap: 18 }}>
              {featured.map((r, i) => (
                <FeaturedCard key={r.id} review={r} colorKey={CARD_COLORS[i % 3]} />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div style={{ marginTop: wide ? 20 : 12, maxWidth: 820,
              marginLeft: 'auto', marginRight: 'auto' }}>
              {featured.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <Rule label={`${rest.length} more ${rest.length === 1 ? 'review' : 'reviews'}`} />
                </div>
              )}
              {rest.map(r => <AccordionRow key={r.id} review={r} />)}
            </div>
          )}
        </div>
      </div>

      <Composer wide={wide} period={period} user={user} reviews={reviews} />
    </div>
  );
}

// ── 3. Empty — no reviews yet ────────────────────────────────────────────────
function EmptyScreen({ book, period, user, reviews, onBack }) {
  const [ref, w] = useWidth();
  const wide = w >= 720;
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <MastheadBar book={book} status="reading" onBack={onBack} wide={wide} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '48px 28px' }}>
        <img src={SALON_CAT} alt="The Salon"
          style={{ width: 200, height: 200, objectFit: 'contain',
            filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.45))' }} />
        <h2 style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 28,
          color: S.cream, margin: '18px 0 0', letterSpacing: '-0.01em' }}>
          No reviews yet.
        </h2>
        <p style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 16,
          color: S.creamDim, margin: '10px 0 0' }}>
          The salon is open. Be the first to give your verdict.
        </p>
      </div>
      <Composer wide={wide} period={period} user={user} reviews={reviews} />
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function SalonScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  // 'entry' always shows first; 'inside' shows review/empty
  const [view, setView] = useState('entry');

  useEffect(() => subscribeToActiveSalon(p => { setPeriod(p); setLoading(false); }), []);

  useEffect(() => {
    if (!user || !period?.id) { setEnrolled(false); return; }
    return subscribeToEnrollment(user.uid, period.id, setEnrolled);
  }, [user, period?.id]);

  useEffect(() => {
    if (!period?.id) { setReviews([]); return; }
    return subscribeToReviews(period.id, setReviews);
  }, [period?.id]);

  const book = buildBook(period);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: S.teal, display: 'flex',
        alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.3em',
          color: S.creamDim, textTransform: 'uppercase' }}>The Salon</span>
      </div>
    );
  }

  if (!period) {
    return (
      <div style={{ minHeight: '100vh', background: S.teal, display: 'flex',
        alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: S.fonts.display, fontStyle: 'italic',
          fontSize: 16, color: S.creamDim }}>
          No salon is currently scheduled.
        </p>
      </div>
    );
  }

  return (
    <SalonScreenShell>
      <AnimStyles />
      {view === 'entry' ? (
        <EntryScreen book={book} period={period} user={user} enrolled={enrolled}
          onEnter={() => setView('inside')} />
      ) : reviews.length > 0 ? (
        <ReviewScreen book={book} period={period} user={user}
          reviews={reviews} onBack={() => setView('entry')} />
      ) : (
        <EmptyScreen book={book} period={period} user={user}
          reviews={reviews} onBack={() => setView('entry')} />
      )}
    </SalonScreenShell>
  );
}
