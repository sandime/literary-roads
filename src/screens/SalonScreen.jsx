import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToActiveSalon, subscribeToEnrollment, enrollInSalon,
  subscribeToReviews, postReview, updateReview, subscribeToPastSalons,
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
function EntryScreen({ book, period, user, enrolled, onEnter, onPastReads }) {
  const navigate = useNavigate();
  const [ref, w] = useWidth();
  const [enrolling, setEnrolling] = useState(false);
  const wide = w >= 820;
  const titleSize = wide ? 60 : Math.max(34, Math.min(w * 0.135, 56));
  const memberCount = period?.participantCount || period?.memberCount || 0;
  const editorial = period?.editorialNote || '';
  const reviewText = period?.reviewText || '';
  const reviewLink = period?.reviewLink || '';

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

  const bookW = wide ? 178 : Math.round(Math.min(w * 0.27, 112));
  const catW  = wide ? 150 : 90;

  // Wide: book above cat (stacked). Narrow: side by side to halve the vertical height.
  const hero = wide ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <LevitatingBook w={bookW} frameColor={S.coral}
        src={book?.src} title={book?.title} author={book?.author} />
      <img src={SALON_CAT} alt=""
        style={{ width: catW, height: catW, objectFit: 'contain', marginTop: 4,
          filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.45))' }} />
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end',
      justifyContent: 'center', gap: 12, flexShrink: 0 }}>
      <LevitatingBook w={bookW} frameColor={S.coral}
        src={book?.src} title={book?.title} author={book?.author} />
      <img src={SALON_CAT} alt=""
        style={{ width: catW, height: catW, objectFit: 'contain', marginBottom: 8,
          filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))' }} />
    </div>
  );

  const note = (
    <>
      {editorial ? (
        <p style={{ fontFamily: S.fonts.display, fontStyle: 'italic',
          fontSize: wide ? 16.5 : 15, lineHeight: 1.5, color: S.cream,
          margin: wide ? '28px 0 0' : '16px 0 0', maxWidth: 420 }}>
          {editorial}
        </p>
      ) : null}
      {reviewText ? (
        <p style={{ fontFamily: S.fonts.display, fontSize: wide ? 15 : 14,
          lineHeight: 1.65, color: S.creamDim,
          margin: wide ? '18px 0 0' : '14px 0 0', maxWidth: 420 }}>
          {reviewText}
        </p>
      ) : null}
      {reviewLink ? (
        <a href={reviewLink} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', fontFamily: S.fonts.sans, fontSize: 11,
            letterSpacing: '0.16em', color: S.turq, textTransform: 'uppercase',
            textDecoration: 'none', borderBottom: `1px solid ${S.turq}`,
            marginTop: wide ? 14 : 10 }}>
          Read the review ›
        </a>
      ) : null}
      {memberCount > 0 && (
        <div style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.16em',
          color: S.turq, textTransform: 'uppercase', marginTop: wide ? 20 : 14, fontWeight: 600 }}>
          {memberCount.toLocaleString()} Literary Roadsters reading
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: wide ? 24 : 16,
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
        {onPastReads && (
          <button onClick={onPastReads} style={{
            marginTop: 6, background: 'none', border: 0, cursor: 'pointer', padding: '4px 0',
            fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.18em',
            color: S.creamDim, textTransform: 'uppercase',
            alignSelf: wide ? 'flex-start' : 'center',
          }}>
            Past Reads ›
          </button>
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
        <div style={{ display: 'flex', flexDirection: 'row',
          alignItems: 'flex-start', justifyContent: 'center', gap: 56,
          maxWidth: 1080, margin: '0 auto',
          padding: '40px 56px 64px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Masthead big align="left" titleSize={titleSize} book={book} />
            {note}
          </div>
          {hero}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-start',
          maxWidth: 460, margin: '0 auto',
          padding: '10px 24px 48px', width: '100%', boxSizing: 'border-box',
          textAlign: 'center' }}>
          <Masthead big align="center" titleSize={titleSize} book={book} />
          <div style={{ margin: '14px 0 0' }}>{hero}</div>
          {note}
        </div>
      )}
    </div>
  );
}

// ── Aggregate rating (hidden until ≥ 20 reviews) ──────────────────────────────
function AggregateRating({ reviews, wide, minCount = 20 }) {
  const rated = reviews.filter(r => r.rating > 0);
  if (rated.length < minCount) return null;
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
  const [editing, setEditing] = useState(false);

  const isClosed = period?.status === 'closed' || period?.status === 'review';
  const myReview = user ? reviews.find(r => r.userId === user.uid) : null;
  const hasReviewed = !!myReview;
  const ready = rating > 0 && line.trim().length > 0 && !posting;

  const wrapStyle = {
    position: 'sticky', bottom: 0, zIndex: 40,
    background: 'rgba(13,48,52,0.97)', backdropFilter: 'blur(14px)',
  };

  const startEditing = () => {
    setRating(myReview.rating || 0);
    setLine(myReview.oneSentence || '');
    setFull(myReview.fullResponse || '');
    if (myReview.fullResponse) setExpanded(true);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setRating(0); setLine(''); setFull(''); setExpanded(false);
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

  if (hasReviewed && !editing) {
    return (
      <div style={{ ...wrapStyle, borderTop: `1px solid ${S.line}`,
        padding: wide ? '14px 32px' : '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ fontFamily: S.fonts.display, fontStyle: 'italic',
          fontSize: 15, color: S.creamDim }}>
          You&rsquo;ve given your verdict.
        </span>
        {!isClosed && (
          <button onClick={startEditing} style={{ background: 'none', border: 0,
            cursor: 'pointer', padding: '4px 0', flexShrink: 0,
            fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.14em',
            color: S.turq, textTransform: 'uppercase' }}>
            Edit &#8250;
          </button>
        )}
      </div>
    );
  }

  if (isClosed && !hasReviewed) {
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
      if (editing && myReview) {
        await updateReview(period.id, myReview.id, {
          rating, oneSentence: line.trim(), fullResponse: full.trim(),
        });
        setEditing(false);
      } else {
        await postReview(period.id, {
          userId: user.uid,
          userName: user.displayName || 'Literary Roadster',
          rating, oneSentence: line.trim(), fullResponse: full.trim(),
        });
      }
      setRating(0); setLine(''); setFull(''); setExpanded(false);
    } catch (err) {
      console.error('[Salon] post/update review failed', err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div style={{ ...wrapStyle, borderTop: `1px solid ${S.coral}` }}>
      <div style={{ maxWidth: 880, margin: '0 auto',
        padding: wide ? '16px 32px 18px' : '12px 16px 14px', boxSizing: 'border-box' }}>

        {editing && (
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.2em',
              color: S.coral, textTransform: 'uppercase' }}>Editing your verdict</span>
            <button onClick={cancelEditing} style={{ background: 'none', border: 0,
              cursor: 'pointer', fontFamily: S.fonts.sans, fontSize: 10,
              letterSpacing: '0.1em', color: S.creamFaint, textTransform: 'uppercase' }}>
              Cancel
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12,
          flexWrap: 'wrap', marginBottom: 11 }}>
          {!editing && (
            <span style={{ fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.2em',
              color: S.creamDim, textTransform: 'uppercase' }}>Your rating</span>
          )}
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
                background: 'none', border: `1px solid ${S.lineTurq}`, cursor: 'pointer',
                padding: '6px 12px', borderRadius: 999,
                fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.08em', color: S.turq }}>
                + Add a full response
              </button>
            )}
          </div>
          <SalonButton variant="primary" disabled={!ready} onClick={handlePost}
            style={{ minHeight: 48, padding: '0 22px' }}>
            {posting ? '…' : editing ? 'Update  →' : 'Post  →'}
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

// ── Past Reads ────────────────────────────────────────────────────────────────
function PastReadCard({ salon, onClick }) {
  const book = buildBook(salon);
  const memberCount = salon.participantCount || 0;
  const d = salon.startDate?.toDate ? salon.startDate.toDate()
    : salon.startDate ? new Date(salon.startDate) : null;
  const dateLabel = d ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <button onClick={onClick} style={{
      display: 'flex', gap: 16, alignItems: 'flex-start', width: '100%',
      background: 'none', border: `1px solid ${S.line}`, borderRadius: 12,
      padding: '16px 18px', cursor: 'pointer', textAlign: 'left', color: S.cream,
    }}>
      <BookCover w={54} h={80} src={book?.src} title={book?.title} author={book?.author} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {dateLabel && (
          <div style={{ fontFamily: S.fonts.sans, fontSize: 9, letterSpacing: '0.22em',
            color: S.coral, textTransform: 'uppercase', marginBottom: 4 }}>
            {dateLabel}
          </div>
        )}
        <div style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 17,
          color: S.cream, lineHeight: 1.15, marginBottom: 3 }}>
          {salon.bookTitle}
        </div>
        <div style={{ fontFamily: S.fonts.display, fontStyle: 'italic',
          fontSize: 13.5, color: S.turq, marginBottom: 8 }}>
          {salon.bookAuthor}
        </div>
        {memberCount > 0 && (
          <div style={{ fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.14em',
            color: S.creamDim, textTransform: 'uppercase' }}>
            {memberCount.toLocaleString()} readers joined
          </div>
        )}
      </div>
      <span style={{ color: S.coral, fontSize: 22, alignSelf: 'center', lineHeight: 1 }}>›</span>
    </button>
  );
}

function PastReadsScreen({ pastSalons, user, onSelect, onBack }) {
  const navigate = useNavigate();
  const [ref, w] = useWidth();
  const wide = w >= 720;

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <p style={{ fontFamily: S.fonts.display, fontStyle: 'italic',
          fontSize: 16, color: S.creamDim, textAlign: 'center', margin: 0 }}>
          Sign in to browse past reads.
        </p>
        <SalonButton variant="primary" onClick={() => navigate('/login')}>
          Sign in  →
        </SalonButton>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(15,55,59,0.93)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${S.line}`,
        padding: wide ? '14px 32px' : '11px 16px',
        display: 'flex', alignItems: 'center', gap: 14 }}>
        <span onClick={onBack} style={{ color: S.coral, fontFamily: S.fonts.display,
          fontSize: 26, lineHeight: 1, cursor: 'pointer', marginTop: -3, userSelect: 'none' }}>
          ‹
        </span>
        <div style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 18,
          color: S.cream, letterSpacing: '-0.01em' }}>
          Past Reads
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 680, margin: '0 auto', width: '100%',
        padding: wide ? '32px 32px' : '20px 18px', boxSizing: 'border-box' }}>
        {pastSalons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0',
            fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 16, color: S.creamDim }}>
            No past reads yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pastSalons.map(s => (
              <PastReadCard key={s.id} salon={s} onClick={() => onSelect(s.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PastReadDetailScreen({ salon, reviews, onBack }) {
  const [ref, w] = useWidth();
  const wide = w >= 720;
  const book = buildBook(salon);
  const memberCount = salon.participantCount || 0;
  const featured = reviews.filter(r => r.isFeatured);
  const rest = reviews.filter(r => !r.isFeatured);
  const hasPullQuote = salon?.pullQuoteVisible && salon?.pullQuote;

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(15,55,59,0.93)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${S.line}`,
        padding: wide ? '14px 32px' : '11px 16px',
        display: 'flex', alignItems: 'center', gap: 14 }}>
        <span onClick={onBack} style={{ color: S.coral, fontFamily: S.fonts.display,
          fontSize: 26, lineHeight: 1, cursor: 'pointer', marginTop: -3, userSelect: 'none' }}>
          ‹
        </span>
        <BookCover w={30} h={45} src={book?.src} title={book?.title} author={book?.author} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: S.fonts.sans, fontSize: 9.5, letterSpacing: '0.3em',
            color: S.coral, textTransform: 'uppercase', fontWeight: 600 }}>Past Read</div>
          <div style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 15,
            color: S.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {book?.title}
          </div>
          {wide && (
            <div style={{ fontFamily: S.fonts.display, fontStyle: 'italic',
              fontSize: 13, color: S.turq }}>{book?.author}</div>
          )}
        </div>
        {memberCount > 0 && (
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontFamily: S.fonts.sans, fontSize: 15, fontWeight: 700,
              color: S.turq, letterSpacing: '-0.01em' }}>
              {memberCount.toLocaleString()}
            </div>
            <div style={{ fontFamily: S.fonts.sans, fontSize: 8.5, letterSpacing: '0.16em',
              color: S.creamDim, textTransform: 'uppercase' }}>readers</div>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%',
          padding: wide ? '40px 32px 56px' : '26px 16px 48px', boxSizing: 'border-box' }}>

          <AggregateRating reviews={reviews} wide={wide} minCount={3} />

          {hasPullQuote && <PullQuote period={salon} wide={wide} />}

          <div style={{ margin: reviews.length >= 3 ? '32px 0 18px' : '0 0 18px' }}>
            <Rule label={
              reviews.length === 0 ? 'No reviews'
              : `${reviews.length} reader ${reviews.length === 1 ? 'verdict' : 'verdicts'}`
            } />
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

          {reviews.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0',
              fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 16, color: S.creamDim }}>
              No reviews were left for this book.
            </div>
          )}
        </div>
      </div>
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
  // 'entry' | 'inside' | 'past-list' | 'past-detail'
  const [view, setView] = useState('entry');
  const [pastSalons, setPastSalons] = useState([]);
  const [selectedPastId, setSelectedPastId] = useState(null);
  const [pastReviews, setPastReviews] = useState([]);

  useEffect(() => subscribeToActiveSalon(p => { setPeriod(p); setLoading(false); }), []);
  useEffect(() => subscribeToPastSalons(setPastSalons), []);

  useEffect(() => {
    if (!user || !period?.id) { setEnrolled(false); return; }
    return subscribeToEnrollment(user.uid, period.id, setEnrolled);
  }, [user, period?.id]);

  useEffect(() => {
    if (!period?.id) { setReviews([]); return; }
    return subscribeToReviews(period.id, setReviews);
  }, [period?.id]);

  useEffect(() => {
    if (!selectedPastId) { setPastReviews([]); return; }
    return subscribeToReviews(selectedPastId, setPastReviews);
  }, [selectedPastId]);

  const book = buildBook(period);
  const selectedPastSalon = pastSalons.find(s => s.id === selectedPastId) ?? null;

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
      <SalonScreenShell>
        <AnimStyles />
        {view === 'past-list' ? (
          <PastReadsScreen pastSalons={pastSalons} user={user}
            onSelect={id => { setSelectedPastId(id); setView('past-detail'); }}
            onBack={() => setView('entry')} />
        ) : view === 'past-detail' && selectedPastSalon ? (
          <PastReadDetailScreen salon={selectedPastSalon} reviews={pastReviews}
            onBack={() => { setSelectedPastId(null); setView('past-list'); }} />
        ) : (
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <p style={{ fontFamily: S.fonts.display, fontStyle: 'italic',
              fontSize: 16, color: S.creamDim, margin: 0 }}>
              No salon is currently scheduled.
            </p>
            {pastSalons.length > 0 && (
              <SalonButton variant="ghost" onClick={() => setView('past-list')}>
                Browse Past Reads ›
              </SalonButton>
            )}
          </div>
        )}
      </SalonScreenShell>
    );
  }

  return (
    <SalonScreenShell>
      <AnimStyles />
      {view === 'entry' ? (
        <EntryScreen book={book} period={period} user={user} enrolled={enrolled}
          onEnter={() => setView('inside')}
          onPastReads={pastSalons.length > 0 ? () => setView('past-list') : null} />
      ) : view === 'past-list' ? (
        <PastReadsScreen pastSalons={pastSalons} user={user}
          onSelect={id => { setSelectedPastId(id); setView('past-detail'); }}
          onBack={() => setView('entry')} />
      ) : view === 'past-detail' && selectedPastSalon ? (
        <PastReadDetailScreen salon={selectedPastSalon} reviews={pastReviews}
          onBack={() => { setSelectedPastId(null); setView('past-list'); }} />
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
