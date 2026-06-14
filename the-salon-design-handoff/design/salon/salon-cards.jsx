// Literary Roads — The Salon · embeddable cards (2026 redesign).
// ProfileSalonCard (3 states: join / enrolled / closed) for the profile, and
// GazetteSalonCard for the Gazette's Headlights feed. New midnight-teal palette.

// ── Profile card — compact, 3 states ──────────────────────────────────────────
function ProfileSalonCard({ state = 'join' }) {
  // state: 'join' | 'enrolled' | 'closed'
  const dot = state === 'closed' ? 'closed' : state === 'enrolled' ? 'reading' : null;
  return (
    <div style={{ width: 340, background: S.teal, border: `1px solid ${S.lineTurq}`,
      borderRadius: 16, padding: 18, fontFamily: S.fonts.serif, color: S.cream,
      boxShadow: '0 14px 40px rgba(0,0,0,0.3)' }}>
      {/* label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.3em',
          color: S.coral, textTransform: 'uppercase', fontWeight: 600 }}>The Salon</span>
        {dot && <StatusDot state={dot} label />}
      </div>

      {/* body */}
      <div style={{ display: 'flex', gap: 16 }}>
        <BookCover w={62} h={93} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 17, color: S.cream,
            lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{BOOK.title}</div>
          <div style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 13, color: S.turq,
            marginTop: 3 }}>{BOOK.author}</div>

          {state === 'join' && (
            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <div style={{ fontFamily: S.fonts.sans, fontSize: 10.5, letterSpacing: '0.16em',
                color: S.creamDim, textTransform: 'uppercase' }}>{BOOK.dates}</div>
              <div style={{ fontFamily: S.fonts.sans, fontSize: 10.5, letterSpacing: '0.04em',
                color: S.creamFaint, marginTop: 4 }}>Next book: July 1</div>
            </div>
          )}
          {state === 'enrolled' && (
            <div style={{ marginTop: 'auto', paddingTop: 12 }}>
              <div style={{ height: 4, borderRadius: 3, background: S.teal2, overflow: 'hidden' }}>
                <div style={{ width: '55%', height: '100%', background: S.turq,
                  boxShadow: `0 0 7px ${S.turq}` }} />
              </div>
              <div style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.04em',
                color: S.turq, marginTop: 7, fontWeight: 600 }}>28 days remaining</div>
            </div>
          )}
          {state === 'closed' && (
            <div style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 14,
              color: S.creamDim, marginTop: 'auto', paddingTop: 12 }}>See what readers said.</div>
          )}
        </div>
      </div>

      {/* action */}
      <div style={{ marginTop: 18 }}>
        {state === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 16,
              color: S.cream, whiteSpace: 'nowrap' }}>Are you in?</div>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <SalonButton variant="primary" full>Yes  →</SalonButton>
              <SalonButton variant="ghost" full>Maybe later</SalonButton>
            </div>
          </div>
        )}
        {state === 'enrolled' && <SalonButton variant="turq" full>Go to the Salon  →</SalonButton>}
        {state === 'closed' && <SalonButton variant="outline" full>Read the Gazette  →</SalonButton>}
      </div>
    </div>
  );
}

// ── Gazette announcement card — the bold coral-framed feature card ────────────
function GazetteSalonCard() {
  return (
    <div style={{ width: 350, background: S.teal, border: `2px solid ${S.coral}`,
      borderRadius: 16, overflow: 'hidden', fontFamily: S.fonts.serif, color: S.cream,
      boxShadow: `0 0 30px ${S.coralGlow}` }}>
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Atom size={16} fill={1} />
          <span style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.26em',
            color: S.coral, textTransform: 'uppercase', fontWeight: 600 }}>The Salon — Now Reading</span>
        </div>
      </div>

      <div style={{ padding: '18px 20px 22px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center' }}>
        <LevitatingBook w={120} frameColor={S.magenta} motion={false} />
        <div style={{ fontFamily: S.fonts.display, fontWeight: 600, fontSize: 26, color: S.cream,
          lineHeight: 1.08, textTransform: 'uppercase', letterSpacing: '-0.01em', marginTop: 4 }}>{BOOK.title}</div>
        <div style={{ fontFamily: S.fonts.display, fontStyle: 'italic', fontSize: 15, color: S.turq,
          marginTop: 5 }}>{BOOK.author}</div>
        <div style={{ fontFamily: S.fonts.sans, fontSize: 11, letterSpacing: '0.24em', color: S.creamDim,
          textTransform: 'uppercase', margin: '14px 0' }}>{BOOK.dates}</div>
        <div style={{ height: 1, width: '55%', background: S.line, marginBottom: 16 }} />
        <p style={{ fontFamily: S.fonts.display, fontSize: 15, color: S.cream, lineHeight: 1.5,
          maxWidth: 280, margin: 0 }}>
          Join <span style={{ color: S.coral }}>231 Literary Roadsters</span> reading together this spring.</p>
        <SalonButton variant="primary" full style={{ marginTop: 22 }}>Are you in?  →</SalonButton>
      </div>
    </div>
  );
}

Object.assign(window, { ProfileSalonCard, GazetteSalonCard });
