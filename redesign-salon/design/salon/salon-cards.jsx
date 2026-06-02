// Literary Roads — The Salon · embeddable cards.
// ProfileSalonCard (3 states: join / enrolled / review) and GazetteSalonCard.
// These live OUTSIDE the Salon screens — on the user profile and in the
// Gazette's Headlights feed — so they carry their own compact chrome.

// ── Profile card — compact, 3 states ──────────────────────────────────────
function ProfileSalonCard({ state = 'join' }) {
  // state: 'join' | 'enrolled' | 'review'
  const dot = state === 'review' ? 'review' : state === 'enrolled' ? 'active' : null;
  return (
    <div style={{ width: 320, background: S.wine, border: `1px solid ${S.goldSoft}`,
      borderRadius: 14, padding: 16, fontFamily: S.fonts.serif }}>
      {/* label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: S.fonts.display, fontSize: 12, letterSpacing: '0.10em',
          color: S.gold, textTransform: 'uppercase' }}>The Salon</span>
        {dot && <StatusDot state={dot} label/>}
      </div>

      {/* body */}
      <div style={{ display: 'flex', gap: 14 }}>
        <BookCover w={60} h={90} tone={BOOK.tone}/>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: S.fonts.serif, fontWeight: 700, fontSize: 15, color: S.cream,
            lineHeight: 1.2 }}>{BOOK.title}</div>

          {state === 'join' && (
            <>
              <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 12, color: S.paper2, marginTop: 3 }}>{BOOK.author}</div>
              <div style={{ fontFamily: S.fonts.type, fontSize: 10.5, color: S.gold, marginTop: 8 }}>{BOOK.dates}</div>
              <div style={{ fontFamily: S.fonts.type, fontSize: 10.5, color: S.muted, marginTop: 2 }}>Next book: May 1</div>
            </>
          )}
          {state === 'enrolled' && (
            <>
              <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 12, color: S.paper2, marginTop: 3 }}>{BOOK.author}</div>
              <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                <div style={{ height: 4, borderRadius: 3, background: S.wine2, overflow: 'hidden' }}>
                  <div style={{ width: '55%', height: '100%', background: S.gold, boxShadow: `0 0 6px ${S.gold}` }}/>
                </div>
                <div style={{ fontFamily: S.fonts.type, fontSize: 11, color: S.gold, marginTop: 6 }}>27 days remaining</div>
              </div>
            </>
          )}
          {state === 'review' && (
            <>
              <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 12, color: S.paper2, marginTop: 3 }}>{BOOK.author}</div>
              <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 12.5, color: S.muted,
                marginTop: 'auto', paddingTop: 10 }}>See what readers said.</div>
            </>
          )}
        </div>
      </div>

      {/* action */}
      <div style={{ marginTop: 16 }}>
        {state === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 14, color: S.paper2 }}>Are you in?</div>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <SalonButton variant="primary" full>YES  →</SalonButton>
              <SalonButton variant="ghost" full>Maybe later</SalonButton>
            </div>
          </div>
        )}
        {state === 'enrolled' && <SalonButton variant="gold" full>GO TO THE SALON  →</SalonButton>}
        {state === 'review' && <SalonButton variant="muted" full>READ THE GAZETTE  →</SalonButton>}
      </div>
    </div>
  );
}

// ── Gazette announcement card — the ONLY gold-bordered Gazette card ───────
function GazetteSalonCard() {
  return (
    <div style={{ width: 340, background: S.wine, border: `2px solid ${S.gold}`,
      borderRadius: 14, overflow: 'hidden', fontFamily: S.fonts.serif,
      boxShadow: `0 0 24px ${S.gold}22` }}>
      {/* eyebrow band */}
      <div style={{ padding: '12px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: S.gold, fontSize: 13 }}>✦</span>
          <span style={{ fontFamily: S.fonts.display, fontSize: 12, letterSpacing: '0.10em',
            color: S.gold, textTransform: 'uppercase' }}>The Salon — Now Reading</span>
        </div>
      </div>

      <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <BookCover w={120} h={180} tone={BOOK.tone} style={{ marginBottom: 16 }}/>
        <div style={{ fontFamily: S.fonts.serif, fontWeight: 700, fontSize: 24, color: S.cream, lineHeight: 1.15 }}>{BOOK.title}</div>
        <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 15, color: S.paper2, marginTop: 4 }}>{BOOK.author}</div>

        <div style={{ fontFamily: S.fonts.type, fontSize: 12, color: S.gold, letterSpacing: '0.04em', margin: '14px 0' }}>{BOOK.dates}</div>

        <GoldRule style={{ width: '60%', marginBottom: 14 }}/>

        <div style={{ fontFamily: S.fonts.serif, fontSize: 14.5, color: S.paper2, lineHeight: 1.5, maxWidth: 270 }}>
          Join <span style={{ color: S.gold }}>231 Literary Roadsters</span> reading together this spring.
        </div>

        <SalonButton variant="primary" full style={{ marginTop: 20 }}>ARE YOU IN?  →</SalonButton>
      </div>
    </div>
  );
}

Object.assign(window, { ProfileSalonCard, GazetteSalonCard });
