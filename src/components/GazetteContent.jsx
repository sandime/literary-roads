// src/components/GazetteContent.jsx
// Shared newsletter content renderer used by NewsletterPreview and GazetteIssue.
// Accepts a `data` prop shaped like:
//   { issue, festivals, indiePicks, debutAuthors, bookTokPicks, tripReports, nyt }
// where `issue` = { volume, issue, publishDate, pullQuote }

const C = {
  bg:     '#0D0E1A',
  panel:  '#1A1B2E',
  border: 'rgba(64,224,208,0.18)',
  teal:   '#40E0D0',
  orange: '#FF4E00',
  coral:  '#FF6B7A',
  cream:  '#F5F5DC',
  silver: '#C0C0C0',
  muted:  'rgba(192,192,192,0.45)',
  purple: '#9B59B6',
};

// ── Shared formatters ──────────────────────────────────────────────────────────
export const formatFestivalDate = (startDate, endDate) => {
  if (!startDate) return '';
  const start = new Date(startDate + 'T00:00:00');
  const end = endDate && endDate !== startDate ? new Date(endDate + 'T00:00:00') : null;
  const fmt = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  if (!end || end <= start) return fmt(start);
  const days = Math.round((end - start) / 864e5) + 1;
  const dayLabel = `${days} day${days !== 1 ? 's' : ''}`;
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const month = start.toLocaleDateString('en-US', { month: 'long' });
    return `${month} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()} · ${dayLabel}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    const s = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const e = end.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return `${s} - ${e}, ${start.getFullYear()} · ${dayLabel}`;
  }
  return `${fmt(start)} - ${fmt(end)} · ${dayLabel}`;
};

export const formatIssueDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatIssueLine = (issue) => {
  if (!issue?.volume && !issue?.issue) return '';
  const parts = [];
  if (issue.volume) parts.push(`Vol. ${issue.volume}`);
  if (issue.issue)  parts.push(`Issue ${issue.issue}`);
  if (issue.publishDate) parts.push(`Week of ${formatIssueDate(issue.publishDate)}`);
  return parts.join(' · ');
};

// ── Card primitives ────────────────────────────────────────────────────────────
function Section({ title, icon, color, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${color}50` }}>
        <span style={{ fontSize: 14, color }}>{icon}</span>
        <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color, margin: 0, letterSpacing: '0.04em' }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}
function Card({ children }) {
  return <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' }}>{children}</div>;
}
function CardTitle({ children }) {
  return <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.cream, marginBottom: 3, letterSpacing: '0.03em' }}>{children}</div>;
}
function CardSub({ children }) {
  return <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginBottom: 5 }}>{children}</div>;
}
function CardBody({ children }) {
  return <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: 'rgba(245,245,220,0.85)', lineHeight: 1.65, margin: '5px 0' }}>{children}</p>;
}
function CardLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.teal, textDecoration: 'none', letterSpacing: '0.05em' }}>
      {children}
    </a>
  );
}

// ── GazetteContent ─────────────────────────────────────────────────────────────
// Renders everything below the masthead toolbar.
export default function GazetteContent({ data }) {
  const { issue, festivals, indiePicks, debutAuthors, bookTokPicks, tripReports, nyt } = data || {};

  const hasContent = [festivals, indiePicks, debutAuthors, bookTokPicks, tripReports]
    .some(arr => arr?.length > 0);

  return (
    <>
      {/* Pull quote */}
      {issue?.pullQuote && (
        <div style={{
          marginBottom: 36,
          padding: '18px 22px',
          background: `linear-gradient(135deg, rgba(64,224,208,0.08), rgba(255,78,0,0.05))`,
          border: `1px solid rgba(64,224,208,0.22)`,
          borderLeft: `3px solid ${C.teal}`,
          borderRadius: 8,
        }}>
          <p style={{
            fontFamily: 'Special Elite, serif',
            fontSize: 15,
            color: C.cream,
            lineHeight: 1.7,
            margin: 0,
            fontStyle: 'italic',
          }}>
            "{issue.pullQuote}"
          </p>
        </div>
      )}

      {/* Empty state */}
      {!hasContent && !nyt && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: C.muted, letterSpacing: '0.08em' }}>
            NO FEATURED CONTENT YET
          </p>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
            Go to the admin panel and mark items as featured to see them here.
          </p>
        </div>
      )}

      {/* 1. Festivals */}
      {festivals?.length > 0 && (
        <Section title="Literary Festivals & Events" icon="★" color={C.teal}>
          {festivals.map((item, i) => (
            <Card key={item.id || i}>
              <CardTitle>{item.name}</CardTitle>
              <CardSub>{[item.location, formatFestivalDate(item.date, item.endDate)].filter(Boolean).join(' · ')}</CardSub>
              {item.context && <CardBody>{item.context}</CardBody>}
              {item.link && <CardLink href={item.link}>Event details →</CardLink>}
            </Card>
          ))}
        </Section>
      )}

      {/* 2. Indie Picks */}
      {indiePicks?.length > 0 && (
        <Section title="Indie Bookseller Picks" icon="◆" color={C.orange}>
          {indiePicks.map((item, i) => (
            <Card key={item.id || i}>
              <CardTitle>{item.bookstoreName}</CardTitle>
              <CardSub>{item.city}</CardSub>
              {item.recommendation && <CardBody>{item.recommendation}</CardBody>}
            </Card>
          ))}
        </Section>
      )}

      {/* 3. What's Trending This Week — top 5 NYT fiction */}
      {nyt?.fiction?.length > 0 && (
        <Section title="What's Trending This Week" icon="◉" color={C.coral}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nyt.fiction.slice(0, 5).map(b => (
              <Card key={b.rank}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {b.coverUrl && (
                    <img src={b.coverUrl} alt={b.title} style={{ width: 44, height: 64, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                  )}
                  <div>
                    <div>
                      <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted }}>#{b.rank} </span>
                      <span style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: C.cream }}>{b.title}</span>
                    </div>
                    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginBottom: 4 }}>{b.author}</div>
                    {b.description && <CardBody>{b.description}</CardBody>}
                    {b.weeksOnList > 1 && (
                      <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.orange, marginTop: 4 }}>
                        {b.weeksOnList} WEEKS ON LIST
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* 4. NYT Bestsellers — Non-Fiction only */}
      {nyt?.nonfiction?.length > 0 && (
        <Section title="NYT Bestsellers — Non-Fiction" icon="◎" color={C.coral}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nyt.nonfiction.slice(0, 5).map(b => (
              <Card key={b.rank}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {b.coverUrl && (
                    <img src={b.coverUrl} alt={b.title} style={{ width: 44, height: 64, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                  )}
                  <div>
                    <div>
                      <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted }}>#{b.rank} </span>
                      <span style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: C.cream }}>{b.title}</span>
                    </div>
                    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginBottom: 4 }}>{b.author}</div>
                    {b.description && <CardBody>{b.description}</CardBody>}
                    {b.weeksOnList > 1 && (
                      <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.orange, marginTop: 4 }}>
                        {b.weeksOnList} WEEKS ON LIST
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* 5. BookTok */}
      {bookTokPicks?.length > 0 && (
        <Section title="BookTok This Week" icon="▶" color={C.purple}>
          {bookTokPicks.map((item, i) => (
            <Card key={item.id || i}>
              <CardTitle>{item.bookTitle}</CardTitle>
              {item.commentary && <CardBody>{item.commentary}</CardBody>}
              {item.tiktokLink && <CardLink href={item.tiktokLink}>Watch on TikTok →</CardLink>}
            </Card>
          ))}
        </Section>
      )}

      {/* 6. Debut Authors */}
      {debutAuthors?.length > 0 && (
        <Section title="Debut Author Spotlight" icon="✦" color={C.orange}>
          {debutAuthors.map((item, i) => (
            <Card key={item.id || i}>
              <CardTitle>{item.authorName}</CardTitle>
              <CardSub>{item.bookTitle}</CardSub>
              {item.excerpt && <CardBody>{item.excerpt}</CardBody>}
              {item.link && <CardLink href={item.link}>Read more →</CardLink>}
            </Card>
          ))}
        </Section>
      )}

      {/* 7. Trip Reports */}
      {tripReports?.length > 0 && (
        <Section title="Trip Reports" icon="⛽" color={C.teal}>
          {tripReports.map((item, i) => (
            <Card key={item.id || i}>
              <CardTitle>{item.title}</CardTitle>
              <CardSub>{item.location}</CardSub>
              {item.narrative && <CardBody>{item.narrative}</CardBody>}
            </Card>
          ))}
        </Section>
      )}
    </>
  );
}
