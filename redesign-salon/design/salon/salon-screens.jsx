// Literary Roads — The Salon · screens.
// Entry (enrolled + not), conversation w/ threading + composer, reply sheet,
// empty state, profile cards (3 states), Gazette announcement card.
// All sample data; book cover wired via BookCover placeholder.

const { useState: useS } = React;

const BOOK = { title: 'Demon Copperhead', author: 'Barbara Kingsolver',
  dates: 'March 1 – April 30, 2026', tone: '#3B5A47' };

// ── Header bar used across interior screens ───────────────────────────────
function SalonHeader({ state = 'active', countdown, onBack }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(31,19,24,0.96)',
      backdropFilter: 'blur(10px)', borderBottom: `1px solid ${S.goldSoft}`,
      padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
      <span style={{ color: S.gold, fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>‹</span>
      <BookCover w={30} h={45} tone={BOOK.tone}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SalonMark size={12}/>
        <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 12,
          color: S.paper2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis' }}>{BOOK.title}</div>
      </div>
      {countdown && <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: S.fonts.display, fontSize: 15, color: S.gold }}>{countdown}</div>
        <div style={{ fontFamily: S.fonts.type, fontSize: 8.5, color: S.muted2,
          letterSpacing: '0.08em' }}>DAYS LEFT</div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · ENTRY — not enrolled
// ═══════════════════════════════════════════════════════════════════════════
function SalonEntryJoin() {
  return (
    <SalonScreen>
      <div style={{ padding: '20px 22px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* masthead */}
        <div style={{ fontFamily: S.fonts.display, fontSize: 26, letterSpacing: '0.08em',
          color: S.gold, textTransform: 'uppercase', textShadow: `0 0 16px ${S.gold}55` }}>The Salon</div>
        <div style={{ fontFamily: S.fonts.type, fontSize: 11, color: S.muted, letterSpacing: '0.14em',
          marginTop: 4, textTransform: 'uppercase' }}>A bimonthly reading room</div>

        {/* cat */}
        <img src={SALON_CAT} alt="The Salon" style={{ width: 230, height: 230, objectFit: 'contain',
          margin: '6px 0 2px', filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.5))' }}/>

        <GoldRule label="Now Reading" style={{ width: '100%', margin: '4px 0 20px' }}/>

        {/* the book */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', width: '100%' }}>
          <BookCover w={84} h={126} tone={BOOK.tone}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: S.fonts.serif, fontWeight: 700, fontSize: 21, lineHeight: 1.15,
              color: S.cream }}>{BOOK.title}</div>
            <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 14, color: S.paper2,
              marginTop: 4 }}>{BOOK.author}</div>
            <div style={{ fontFamily: S.fonts.type, fontSize: 11, color: S.gold, marginTop: 10,
              letterSpacing: '0.04em' }}>{BOOK.dates}</div>
            <div style={{ fontFamily: S.fonts.type, fontSize: 11, color: S.muted, marginTop: 3 }}>
              Next book announced May 1</div>
          </div>
        </div>

        {/* invitation */}
        <div style={{ fontFamily: S.fonts.serif, fontSize: 15, fontStyle: 'italic', color: S.paper2,
          textAlign: 'center', margin: '26px 0 6px', lineHeight: 1.5, maxWidth: 280 }}>
          Two months, one book, and a room full of readers taking it slow together.
        </div>
        <div style={{ fontFamily: S.fonts.type, fontSize: 12, color: S.gold, marginBottom: 18 }}>
          231 Literary Roadsters are in.
        </div>

        <SalonButton variant="primary" full style={{ marginBottom: 10 }}>YES, I'M IN  →</SalonButton>
        <SalonButton variant="ghost" full>Maybe later</SalonButton>
      </div>
    </SalonScreen>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1b · ENTRY — enrolled (welcome back)
// ═══════════════════════════════════════════════════════════════════════════
function SalonEntryEnrolled() {
  return (
    <SalonScreen>
      <SalonHeader countdown={27}/>
      <div style={{ padding: '22px 20px 36px' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <SalonMark size={14} dotState="active" style={{ justifyContent: 'center' }}/>
          <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 16, color: S.paper2,
            marginTop: 10 }}>Welcome back to the room.</div>
        </div>

        {/* progress band */}
        <SalonCard gold style={{ padding: 16, marginBottom: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <BookCover w={68} h={102} tone={BOOK.tone}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: S.fonts.serif, fontWeight: 700, fontSize: 17, color: S.cream }}>{BOOK.title}</div>
            <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 12.5, color: S.paper2, marginTop: 3 }}>{BOOK.author}</div>
            {/* gold progress */}
            <div style={{ marginTop: 12, height: 5, borderRadius: 3, background: S.wine2, overflow: 'hidden' }}>
              <div style={{ width: '55%', height: '100%', background: S.gold, boxShadow: `0 0 8px ${S.gold}` }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6,
              fontFamily: S.fonts.type, fontSize: 10, color: S.muted }}>
              <span>Day 33 of 60</span><span style={{ color: S.gold }}>27 days remaining</span>
            </div>
          </div>
        </SalonCard>

        <GoldRule label="Latest in the room" style={{ margin: '0 0 14px' }}/>

        {/* peek at recent activity */}
        {[['Marbled Hawk', '“I had to set it down after chapter 30. Just to breathe.”', '12 replies'],
          ['Two-Lane Reader', '“The voice. Nobody writes a kid like this.”', '8 replies']].map(([u, q, r]) => (
          <div key={u} style={{ display: 'flex', gap: 11, padding: '11px 2px', borderBottom: `1px solid ${S.line}` }}>
            <Avatar name={u} size={30}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: S.fonts.display, fontSize: 11, color: S.gold }}>{u}</div>
              <div style={{ fontFamily: S.fonts.serif, fontSize: 13, color: S.paper2, marginTop: 3,
                lineHeight: 1.4 }}>{q}</div>
              <div style={{ fontFamily: S.fonts.type, fontSize: 10, color: S.muted2, marginTop: 4 }}>{r}</div>
            </div>
          </div>
        ))}

        <SalonButton variant="primary" full style={{ marginTop: 20 }}>GO TO THE SALON  →</SalonButton>
      </div>
    </SalonScreen>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · CONVERSATION — cards + threading + composer
// ═══════════════════════════════════════════════════════════════════════════
const THREAD = [
  { user: 'Literary Roadster', gold: true, time: '2h', spoiler: false,
    body: 'The ending broke something in me. I finished at 1am and just sat with the lights off for a while. Has anyone else needed a minute?',
    replies: [
      { user: 'Marbled Hawk', time: '1h', body: 'Yes. I closed it and immediately texted my sister to call our mother.' },
      { user: 'Foglight', time: '44m', body: 'The last image stays with you. I keep thinking about the beach.' },
    ], count: 14 },
  { user: 'Two-Lane Reader', gold: false, time: '5h', spoiler: true,
    body: 'Can we talk about the chapter where Demon finally gets clean? The restraint in that prose — Kingsolver refuses to make it triumphant.',
    replies: [], count: 6 },
];

function ReplyComposerInline() {
  const [v, setV] = useS('');
  return (
    <div style={{ position: 'sticky', bottom: 0, background: 'rgba(31,19,24,0.97)',
      backdropFilter: 'blur(10px)', borderTop: `1px solid ${S.goldSoft}`, padding: '10px 12px 14px' }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
        <Avatar name="You" size={32} gold/>
        <div style={{ flex: 1, background: S.wine3, border: `1px solid ${S.line}`, borderRadius: 12,
          padding: '8px 12px' }}>
          <textarea value={v} onChange={e => setV(e.target.value.slice(0, 600))} rows={1}
            placeholder="Add to the conversation…"
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: S.cream, fontFamily: S.fonts.serif, fontSize: 13.5, resize: 'none', lineHeight: 1.4 }}/>
        </div>
        <SalonButton variant="primary" style={{ minHeight: 40, padding: '0 14px', fontSize: 11 }}>POST</SalonButton>
      </div>
    </div>
  );
}

function DiscussionCard({ c }) {
  const [open, setOpen] = useS(false);
  return (
    <SalonCard gold={c.gold} style={{ padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <Avatar name={c.user} size={34} gold={c.gold}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: S.fonts.display, fontSize: 12, color: c.gold ? S.gold : S.paper2 }}>{c.user}</div>
          <div style={{ fontFamily: S.fonts.type, fontSize: 10, color: S.muted2 }}>{c.time} ago</div>
        </div>
        {c.spoiler && <span style={{ fontFamily: S.fonts.type, fontSize: 9, color: S.orange,
          border: `1px solid ${S.orange}`, borderRadius: 4, padding: '2px 6px', letterSpacing: '0.06em' }}>SPOILERS</span>}
      </div>
      <div style={{ fontFamily: S.fonts.serif, fontSize: 14.5, lineHeight: 1.5, color: S.cream }}>{c.body}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
        <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: S.fonts.type, fontSize: 11, color: S.gold, padding: 0 }}>
          {c.count} {c.count === 1 ? 'reply' : 'replies'}
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: S.fonts.type, fontSize: 11, color: S.muted, padding: 0 }}>Reply</button>
      </div>

      {/* threaded replies */}
      {open && c.replies.length > 0 && (
        <div style={{ marginTop: 12, paddingLeft: 14, borderLeft: `1px solid ${S.goldSoft}`,
          display: 'flex', flexDirection: 'column', gap: 12 }}>
          {c.replies.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 9 }}>
              <Avatar name={r.user} size={26}/>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: S.fonts.display, fontSize: 10.5, color: S.paper2 }}>{r.user}</span>
                  <span style={{ fontFamily: S.fonts.type, fontSize: 9, color: S.muted2 }}>{r.time}</span>
                </div>
                <div style={{ fontFamily: S.fonts.serif, fontSize: 13, color: S.paper2, marginTop: 3,
                  lineHeight: 1.45 }}>{r.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SalonCard>
  );
}

function SalonConversation() {
  return (
    <SalonScreen>
      <SalonHeader countdown={27}/>
      <div style={{ padding: '14px 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontFamily: S.fonts.type, fontSize: 11, color: S.muted, letterSpacing: '0.06em' }}>
            231 in the room · 48 speaking</span>
          <span style={{ fontFamily: S.fonts.type, fontSize: 11, color: S.gold }}>Newest ▾</span>
        </div>
        {THREAD.map((c, i) => <DiscussionCard key={i} c={c}/>)}
      </div>
      <ReplyComposerInline/>
    </SalonScreen>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · REPLY BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════════════════
function SalonReplySheet() {
  const [v, setV] = useS('');
  return (
    <SalonScreen style={{ position: 'relative' }}>
      {/* dimmed conversation behind */}
      <div style={{ filter: 'brightness(0.4)', pointerEvents: 'none' }}>
        <SalonHeader countdown={27}/>
        <div style={{ padding: 14 }}>
          {THREAD.slice(0, 1).map((c, i) => <DiscussionCard key={i} c={c}/>)}
        </div>
      </div>
      {/* scrim */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,8,11,0.55)' }}/>

      {/* sheet */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0,
        background: S.wine, borderTop: `2px solid ${S.gold}`,
        borderRadius: '20px 20px 0 0', padding: '8px 18px 20px',
        boxShadow: '0 -16px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 3, background: S.muted2,
          margin: '0 auto 16px' }}/>

        <div style={{ fontFamily: S.fonts.type, fontSize: 11, color: S.muted, letterSpacing: '0.04em' }}>
          Replying to <span style={{ color: S.gold }}>Literary Roadster</span></div>
        <div style={{ height: 1, background: S.goldSoft, margin: '10px 0' }}/>

        {/* quoted excerpt */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 3, background: S.goldSoft, borderRadius: 2 }}/>
          <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 13, color: S.muted,
            lineHeight: 1.45 }}>“The ending broke something in me. I finished at 1am and just sat with the lights off…”</div>
        </div>

        {/* reply field */}
        <div style={{ background: S.wine3, border: `1px solid ${S.line}`, borderRadius: 12,
          padding: '12px 14px', minHeight: 92 }}>
          <textarea value={v} onChange={e => setV(e.target.value.slice(0, 600))} rows={3}
            placeholder="Your reply…" autoFocus
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: S.cream, fontFamily: S.fonts.serif, fontSize: 14, resize: 'none', lineHeight: 1.5 }}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <CharCount used={v.length} max={600}/>
          <SalonButton variant="primary">POST REPLY  →</SalonButton>
        </div>
      </div>
    </SalonScreen>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════
function SalonEmpty() {
  const [v, setV] = useS('');
  return (
    <SalonScreen>
      <SalonHeader countdown={30}/>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '40px 28px', minHeight: 560, textAlign: 'center' }}>
        <img src={SALON_CAT} alt="The Salon" style={{ width: 220, height: 220, objectFit: 'contain',
          filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.5))' }}/>
        <div style={{ fontFamily: S.fonts.serif, fontWeight: 700, fontSize: 22, color: S.cream, marginTop: 14 }}>
          Be the first to speak.</div>
        <div style={{ fontFamily: S.fonts.serif, fontStyle: 'italic', fontSize: 15, color: S.muted,
          marginTop: 8 }}>The Salon is open.</div>
      </div>
      <ReplyComposerInline/>
    </SalonScreen>
  );
}

Object.assign(window, {
  BOOK, SalonHeader, SalonEntryJoin, SalonEntryEnrolled,
  SalonConversation, SalonReplySheet, SalonEmpty, DiscussionCard,
});
