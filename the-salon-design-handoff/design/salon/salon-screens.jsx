// Literary Roads — The Salon · screens (2026 redesign).
// Entry (the invitation), Review (atomic ratings + magazine review cards +
// accordion + fixed composer), Empty (salon cat). Responsive: single column on
// a phone, magazine multi-column on a wide screen. All data is sample data.

const { useState: useS } = React;

const EDITORIAL =
  'Barbara Kingsolver set out to write a David Copperfield for Appalachia — and ' +
  'came back with a furious, funny, wide-open American novel. For two months, ' +
  'the whole room reads it together. When the doors close, your reviews become the verdict.';

const AGG = { value: 4.3, count: 47, threshold: 20 };

// Optional, admin-controlled. Pass `null` to hide it entirely.
const PULL_QUOTE = {
  text: 'The landscape is the protagonist, and Kingsolver knows it.',
  by: 'Literary Roadster',
};

// Five featured reviews — rotating coral / magenta / rust.
const FEATURED = [
  { color: 'coral',   user: 'Foglight',       date: 'May 18', rating: 5,
    line: 'The landscape is the protagonist, and Kingsolver knows it.',
    body: 'Every holler and hospital and gas-station parking lot is rendered with so much care that the place becomes a character — one that loves Demon and fails him in the same breath.' },
  { color: 'magenta', user: 'Marbled Hawk',   date: 'May 19', rating: 5,
    line: 'I had to set it down after chapter thirty, just to breathe.',
    body: 'I have not been gutted by a book like this in years. I texted my sister at midnight. I am still thinking about Angus.' },
  { color: 'rust',    user: 'Two-Lane Reader', date: 'May 21', rating: 4,
    line: 'Nobody writes a kid like this — funny, furious, fully alive.',
    body: 'The voice carries the whole thing. Demon is wry and wounded and you would follow him anywhere, even when you can see the cliff coming.' },
  { color: 'coral',   user: 'Cedar & Ash',    date: 'May 24', rating: 5,
    line: 'A book that earns every single one of its six hundred pages.',
    body: '' },
  { color: 'magenta', user: 'Night Ferry',    date: 'May 27', rating: 4,
    line: 'Devastating and tender in the very same sentence, again and again.',
    body: 'The restraint in the prose is the miracle. She refuses to make any of it triumphant, and that is exactly why it lands.' },
];

// Remaining reviews — collapsed in the accordion.
const REST = [
  { user: 'Switchback', date: 'May 20', rating: 5,
    line: 'Took me three tries to start, then I could not put it down.',
    body: 'The first fifty pages are a wall. Climb it. What is on the other side is worth every minute.' },
  { user: 'Paper Lantern', date: 'May 22', rating: 3,
    line: 'Beautiful, but it goes cold for me in the middle stretch.',
    body: 'The craft never wavers, but somewhere around the football arc I drifted. Came back for the ending, which is extraordinary.' },
  { user: 'Quiet Engine', date: 'May 25', rating: 5,
    line: 'The chapters on getting clean are unbearable in the best way.',
    body: '' },
  { user: 'Roadside Diner', date: 'May 28', rating: 4,
    line: 'Wanted more of Angus. A small, ungrateful complaint.',
    body: 'She is the best secondary character I have read all year and I would have happily taken another hundred pages of her.' },
  { user: 'Marble Hall', date: 'May 30', rating: 5,
    line: 'Read it slowly. It is a book that deserves to be read slowly.',
    body: '' },
];

const CARD_BG = { coral: '#f66483', magenta: '#c877bf', rust: '#a6480a' };

// ══════════════════════════════════════════════════════════════════════════════
// PERSISTENT HEADER (review + empty)
// ══════════════════════════════════════════════════════════════════════════════
function SalonMastheadBar({ status = 'reading', onBack, wide }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(15,55,59,0.93)',
      backdropFilter: 'blur(12px)', borderBottom: `1px solid ${S.line}`,
      padding: wide ? '14px 32px' : '11px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      {onBack && <span onClick={onBack} style={{ color: S.coral, fontFamily: S.fonts.display,
        fontSize: 26, lineHeight: 1, cursor: 'pointer', marginTop: -3 }}>‹</span>}
      <BookCover w={30} h={45} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: S.fonts.sans, fontSize: 9.5, letterSpacing: '0.3em',
          color: S.coral, textTransform: 'uppercase', fontWeight: 600 }}>The Salon</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, whiteSpace: 'nowrap',
          overflow: 'hidden' }}>
          <span style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 15, color: S.cream,
            textTransform: 'uppercase', letterSpacing: '-0.01em', overflow: 'hidden',
            textOverflow: 'ellipsis' }}>{BOOK.title}</span>
          {wide && <span style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 13,
            color: S.turq }}>{BOOK.author}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {wide && <span style={{ fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.22em',
          color: S.creamDim, textTransform: 'uppercase' }}>{BOOK.dates}</span>}
        <StatusDot state={status} label />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1 · ENTRY — the invitation
// ══════════════════════════════════════════════════════════════════════════════
function SalonEntry({ onEnter }) {
  const [ref, w] = useWidth();
  const wide = w >= 820;
  const titleSize = wide ? 60 : Math.max(34, Math.min(w * 0.135, 56));

  const hero = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <LevitatingBook w={wide ? 178 : 148} frameColor={S.coral} />
      <img src={SALON_CAT} alt="" style={{ width: wide ? 150 : 122, height: wide ? 150 : 122,
        objectFit: 'contain', marginTop: 4, filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.45))' }} />
    </div>
  );
  const note = (
    <>
      <p style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 16.5,
        lineHeight: 1.55, color: S.cream, margin: wide ? '28px 0 0' : '24px 0 0', maxWidth: 420,
        textWrap: 'pretty' }}>{EDITORIAL}</p>
      <div style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.16em',
        color: S.turq, textTransform: 'uppercase', marginTop: 20, fontWeight: 600 }}>
        231 Literary Roadsters reading</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24,
        width: '100%', maxWidth: 330, alignItems: wide ? 'flex-start' : 'stretch' }}>
        <SalonButton variant="primary" full onClick={onEnter}>Are you in?  →</SalonButton>
        <SalonButton variant="ghost" full>Maybe later</SalonButton>
      </div>
    </>
  );

  return (
    <SalonScreen>
      <div ref={ref} style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {wide ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center',
            justifyContent: 'center', gap: 56, maxWidth: 1080, margin: '0 auto',
            padding: '48px 56px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Masthead big align="left" titleSize={titleSize} />
              {note}
            </div>
            {hero}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', maxWidth: 460, margin: '0 auto', padding: '36px 24px 30px',
            width: '100%', boxSizing: 'border-box', textAlign: 'center' }}>
            <Masthead big align="center" titleSize={titleSize} />
            <div style={{ margin: '22px 0 0' }}>{hero}</div>
            {note}
          </div>
        )}
      </div>
    </SalonScreen>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AGGREGATE RATING + PULL QUOTE
// ══════════════════════════════════════════════════════════════════════════════
function AggregateRating({ wide }) {
  if (AGG.count < AGG.threshold) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      flexWrap: 'wrap' }}>
      <AtomRating value={AGG.value} size={wide ? 26 : 22} gap={5} />
      <span style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: wide ? 30 : 26,
        color: S.cream }}>{AGG.value.toFixed(1)}</span>
      <span style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.16em',
        color: S.creamDim, textTransform: 'uppercase' }}>Based on {AGG.count} reviews</span>
    </div>
  );
}

function PullQuote({ quote, wide }) {
  if (!quote) return null;
  return (
    <figure style={{ margin: wide ? '40px auto' : '32px auto', maxWidth: 760, textAlign: 'center' }}>
      <div style={{ height: 1, background: S.coral, opacity: 0.6 }} />
      <blockquote style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontWeight: 500,
        fontSize: wide ? 30 : 23, lineHeight: 1.32, color: S.coral, margin: 0,
        padding: wide ? '28px 24px' : '22px 12px', border: 0 }}>
        “{quote.text}”
      </blockquote>
      <figcaption style={{ fontFamily: S.fonts.sans, fontSize: 10.5, letterSpacing: '0.22em',
        color: S.creamDim, textTransform: 'uppercase', marginBottom: wide ? 28 : 22 }}>
        — {quote.by}</figcaption>
      <div style={{ height: 1, background: S.coral, opacity: 0.6 }} />
    </figure>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURED REVIEW CARD — solid rotating color, cream text, magazine headline
// ══════════════════════════════════════════════════════════════════════════════
function FeaturedCard({ r }) {
  const onRust = r.color === 'rust';
  const meta = onRust ? 'rgba(255,248,231,0.7)' : 'rgba(21,72,76,0.62)';
  const ink = onRust ? S.cream : '#15484C';
  return (
    <article style={{ breakInside: 'avoid', WebkitColumnBreakInside: 'avoid', marginBottom: 18,
      display: 'block', width: '100%', background: CARD_BG[r.color], borderRadius: 14,
      padding: '20px 22px 22px', boxSizing: 'border-box', color: ink,
      boxShadow: '0 10px 30px rgba(0,0,0,0.22)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <AtomRating value={r.rating} size={17} gap={3}
          fillColor={onRust ? S.cream : S.rust}
          emptyColor={onRust ? 'rgba(255,248,231,0.32)' : 'rgba(21,72,76,0.4)'} />
        <div style={{ textAlign: 'right', lineHeight: 1.3, flexShrink: 0 }}>
          <div style={{ fontFamily: S.fonts.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
            color: ink, whiteSpace: 'nowrap' }}>{r.user}</div>
          <div style={{ fontFamily: S.fonts.sans, fontSize: 9.5, letterSpacing: '0.14em',
            color: meta, textTransform: 'uppercase', marginTop: 3, whiteSpace: 'nowrap' }}>{r.date}</div>
        </div>
      </div>
      <p style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 22, lineHeight: 1.2,
        letterSpacing: '-0.01em', margin: '16px 0 0', color: ink, textWrap: 'pretty' }}>
        “{r.line}”</p>
      {r.body && <p style={{ fontFamily: S.fonts.display, fontWeight: 400, fontSize: 14.5,
        lineHeight: 1.55, margin: '12px 0 0', color: onRust ? S.creamDim : 'rgba(21,72,76,0.82)',
        textWrap: 'pretty' }}>{r.body}</p>}
    </article>
  );
}

// ── Accordion row for the remaining reviews ────────────────────────────────────
function AccordionRow({ r }) {
  const [open, setOpen] = useS(false);
  return (
    <div style={{ borderBottom: `1px solid ${S.line}` }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', appearance: 'none',
        background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', color: S.cream,
        padding: '15px 4px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <AtomRating value={r.rating} size={15} gap={2.5} />
        <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 10,
          overflow: 'hidden' }}>
          <span style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 15,
            color: S.cream, whiteSpace: open ? 'normal' : 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis' }}>“{r.line}”</span>
        </span>
        <span style={{ fontFamily: S.fonts.sans, fontSize: 9.5, letterSpacing: '0.12em',
          color: S.creamDim, textTransform: 'uppercase', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {r.user} · {r.date}</span>
        <span style={{ color: S.coral, fontSize: 13, flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s ease' }}>▾</span>
      </button>
      <div style={{ maxHeight: open ? 220 : 0, overflow: 'hidden',
        transition: 'max-height .3s ease, opacity .25s ease', opacity: open ? 1 : 0 }}>
        <p style={{ fontFamily: S.fonts.display, fontSize: 14.5, lineHeight: 1.55,
          color: S.creamDim, margin: 0, padding: '0 4px 18px 33px', textWrap: 'pretty' }}>
          {r.body || 'No further notes — just the verdict above.'}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSER — fixed at bottom. Atom selector + one sentence + optional response.
// ══════════════════════════════════════════════════════════════════════════════
function Composer({ wide, onPost }) {
  const [rating, setRating] = useS(0);
  const [hover, setHover] = useS(null);
  const [line, setLine] = useS('');
  const [full, setFull] = useS('');
  const [expanded, setExpanded] = useS(false);
  const ready = rating > 0 && line.trim().length > 0;
  return (
    <div style={{ position: 'sticky', bottom: 0, zIndex: 40, background: 'rgba(13,48,52,0.97)',
      backdropFilter: 'blur(14px)', borderTop: `1px solid ${S.coral}` }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: wide ? '16px 32px 18px' : '12px 16px 14px',
        boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          marginBottom: 11 }}>
          <span style={{ fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.2em',
            color: S.creamDim, textTransform: 'uppercase' }}>Your rating</span>
          <AtomRating value={rating} hover={hover} onHover={setHover} onRate={setRating}
            size={24} gap={5} />
          {rating > 0 && <span style={{ fontFamily: S.fonts.display, fontSize: 15, color: S.turq,
            fontStyle: 'italic' }}>{['', 'Rough going', 'Mixed', 'Solid', 'Excellent', 'A masterpiece'][rating]}</span>}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={line} onChange={e => setLine(e.target.value.slice(0, 140))}
              placeholder="One sentence — your verdict (required)"
              style={{ width: '100%', boxSizing: 'border-box', background: S.teal3,
                border: `1px solid ${S.line}`, borderRadius: 12, padding: '13px 15px', outline: 'none',
                color: S.cream, fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 15.5 }} />
            {(expanded || full) ? (
              <textarea value={full} onChange={e => setFull(e.target.value.slice(0, 600))} rows={wide ? 3 : 2}
                placeholder="Your full response (optional)"
                style={{ width: '100%', boxSizing: 'border-box', background: S.teal3,
                  border: `1px solid ${S.line}`, borderRadius: 12, padding: '12px 15px', outline: 'none',
                  resize: 'none', color: S.cream, fontFamily: S.fonts.display, fontSize: 14.5,
                  lineHeight: 1.5 }} />
            ) : (
              <button onClick={() => setExpanded(true)} style={{ alignSelf: 'flex-start',
                background: 'none', border: 0, cursor: 'pointer', padding: '2px 0',
                fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.08em', color: S.turq }}>
                + Add a full response</button>
            )}
          </div>
          <SalonButton variant="primary" disabled={!ready}
            onClick={() => { if (ready) { onPost && onPost({ rating, line, full }); setRating(0); setLine(''); setFull(''); setExpanded(false); } }}
            style={{ minHeight: 48, padding: '0 22px' }}>Post  →</SalonButton>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          <span style={{ fontFamily: S.fonts.sans, fontSize: 10, letterSpacing: '0.04em',
            color: line.length > 120 ? S.coral : S.creamFaint }}>{140 - line.length} left in your sentence</span>
          {(expanded || full) && <span style={{ fontFamily: S.fonts.sans, fontSize: 10,
            color: full.length > 540 ? S.coral : S.creamFaint }}>{600 - full.length} in your response</span>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2 · REVIEW — the magazine
// ══════════════════════════════════════════════════════════════════════════════
function SalonReview({ onBack, pullQuote = PULL_QUOTE, featured = FEATURED, rest = REST }) {
  const [ref, w] = useWidth();
  const wide = w >= 720;
  const [posted, setPosted] = useS([]);
  return (
    <SalonScreen>
      <div ref={ref} style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SalonMastheadBar status="reading" onBack={onBack} wide={wide} />
        <div style={{ flex: 1 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box',
            padding: wide ? '40px 32px 24px' : '26px 16px 18px' }}>

            <div style={{ textAlign: 'center' }}>
              <AggregateRating wide={wide} />
            </div>
            <PullQuote quote={pullQuote} wide={wide} />

            <div style={{ margin: pullQuote ? '6px 0 18px' : '30px 0 18px' }}>
              <Rule label="What readers said" />
            </div>

            {/* featured — magazine masonry via CSS columns */}
            <div style={{ columnWidth: wide ? 330 : 999, columnGap: 18 }}>
              {posted.map((r, i) => <FeaturedCard key={'p' + i} r={r} />)}
              {featured.map((r, i) => <FeaturedCard key={i} r={r} />)}
            </div>

            {/* accordion — the rest */}
            <div style={{ marginTop: wide ? 20 : 12, maxWidth: 820,
              marginLeft: 'auto', marginRight: 'auto' }}>
              <div style={{ marginBottom: 4 }}><Rule label={`${rest.length} more reviews`} /></div>
              {rest.map((r, i) => <AccordionRow key={i} r={r} />)}
            </div>
          </div>
        </div>
        <Composer wide={wide} onPost={p => setPosted(list => [{
          color: ['coral', 'magenta', 'rust'][(list.length) % 3], user: 'You', date: 'Today',
          rating: p.rating, line: p.line, body: p.full }, ...list])} />
      </div>
    </SalonScreen>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3 · EMPTY — no reviews yet
// ══════════════════════════════════════════════════════════════════════════════
function SalonEmpty({ onBack }) {
  const [ref, w] = useWidth();
  const wide = w >= 720;
  return (
    <SalonScreen>
      <div ref={ref} style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SalonMastheadBar status="reading" onBack={onBack} wide={wide} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center', padding: '48px 28px' }}>
          <img src={SALON_CAT} alt="The Salon" style={{ width: 200, height: 200, objectFit: 'contain',
            filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.45))' }} />
          <h2 style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 28, color: S.cream,
            margin: '18px 0 0', letterSpacing: '-0.01em' }}>No reviews yet.</h2>
          <p style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 16,
            color: S.creamDim, margin: '10px 0 0' }}>The salon is open. Be the first to give your verdict.</p>
        </div>
        <Composer wide={wide} onPost={() => {}} />
      </div>
    </SalonScreen>
  );
}

Object.assign(window, {
  EDITORIAL, AGG, PULL_QUOTE, FEATURED, REST, CARD_BG,
  SalonMastheadBar, SalonEntry, AggregateRating, PullQuote, FeaturedCard,
  AccordionRow, Composer, SalonReview, SalonEmpty,
});
