// src/components/GazetteContent.jsx
// Shared newsletter content renderer — single-column layout.
// Used by: NewsletterPreview, GazetteIssue (archived).
// Data shape: { issue, festivalTrips, handSelected, dispatches, readersChoice,
//               literaryLandmarks, readingRoom, headlights, onTheRoad,
//               waystation, bookstoreQA, theLongRoad, nyt }

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
  gold:   '#FFD700',
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

// ── Section / Card primitives ──────────────────────────────────────────────────
function Section({ title, icon, color, children, subtitle }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle ? 4 : 14, paddingBottom: subtitle ? 0 : 10, borderBottom: subtitle ? 'none' : `1px solid ${color}50` }}>
        <span style={{ fontSize: 14, color }}>{icon}</span>
        <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color, margin: 0, letterSpacing: '0.04em' }}>{title}</h2>
      </div>
      {subtitle && (
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, margin: '0 0 14px', paddingBottom: 10, borderBottom: `1px solid ${color}50` }}>
          {subtitle}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}
function Card({ children, style = {} }) {
  return <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px', ...style }}>{children}</div>;
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
function HeroImg({ src, alt }) {
  if (!src) return null;
  return <img src={src} alt={alt || ''} style={{ width: '100%', borderRadius: 6, marginBottom: 12, maxHeight: 240, objectFit: 'cover' }} />;
}

// ── GazetteContent ─────────────────────────────────────────────────────────────
export default function GazetteContent({ data }) {
  const {
    issue, festivalTrips, handSelected, dispatches, readersChoice,
    literaryLandmarks, readingRoom, headlights, onTheRoad,
    waystation, bookstoreQA, theLongRoad, nyt,
  } = data || {};

  // Legacy shape support (old archives may use different keys)
  const festivals  = festivalTrips || data?.festivals || [];
  const indie      = handSelected  || data?.indiePicks || [];
  const trips      = dispatches    || data?.tripReports || [];
  const readers    = readersChoice || data?.bookTokPicks || [];

  const hasContent = [festivals, indie, trips, readers, literaryLandmarks, readingRoom, headlights, onTheRoad, waystation, bookstoreQA, theLongRoad]
    .some(arr => arr?.length > 0);

  return (
    <>
      {/* Pull quote */}
      {issue?.pullQuote && (
        <div style={{ marginBottom: 36, padding: '18px 22px', background: `linear-gradient(135deg, rgba(64,224,208,0.08), rgba(255,78,0,0.05))`, border: `1px solid rgba(64,224,208,0.22)`, borderLeft: `3px solid ${C.teal}`, borderRadius: 8 }}>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 15, color: C.cream, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
            "{issue.pullQuote}"
          </p>
        </div>
      )}

      {!hasContent && !nyt && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: C.muted, letterSpacing: '0.08em' }}>NO FEATURED CONTENT YET</p>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
            Go to the admin panel and mark items as featured to see them here.
          </p>
        </div>
      )}

      {/* 1. Festival Trips */}
      {festivals?.length > 0 && (
        <Section title="Festival Trips" icon="★" color={C.teal}>
          {festivals.map((item, i) => (
            <Card key={item.id || i}>
              <HeroImg src={item.imageUrl} alt={item.name} />
              <CardTitle>{item.name}</CardTitle>
              <CardSub>{[item.location, formatFestivalDate(item.date, item.endDate)].filter(Boolean).join(' · ')}</CardSub>
              {item.context && <CardBody>{item.context}</CardBody>}
              {item.link && <CardLink href={item.link}>Event details →</CardLink>}
            </Card>
          ))}
        </Section>
      )}

      {/* 2. Hand-Selected */}
      {indie?.length > 0 && (
        <Section title="Hand-Selected" icon="◆" color={C.orange} subtitle="Bookstore staff picks from indie shops across America">
          {indie.map((item, i) => (
            <Card key={item.id || i}>
              {item.imageUrl && <HeroImg src={item.imageUrl} alt={item.bookstoreName} />}
              <CardTitle>{item.bookstoreName || item.bookstoreName}</CardTitle>
              <CardSub>{[item.city, item.ownerName].filter(Boolean).join(' · ')}</CardSub>
              {(item.description || item.recommendation) && <CardBody>{item.description || item.recommendation}</CardBody>}
              {/* Book picks */}
              {item.bookPicks?.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {item.bookPicks.map((book, bi) => (
                    <div key={bi} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: C.bg, borderRadius: 6, padding: '8px 10px' }}>
                      {book.coverUrl && <img src={book.coverUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.cream }}>{book.title}</div>
                        <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted }}>{book.author}</div>
                        {book.blurb && <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: 'rgba(245,245,220,0.8)', margin: '4px 0 0', lineHeight: 1.5 }}>{book.blurb}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {item.appLink && <div style={{ marginTop: 8 }}><CardLink href={item.appLink}>View on Literary Roads →</CardLink></div>}
            </Card>
          ))}
        </Section>
      )}

      {/* 3. Dispatches */}
      {trips?.length > 0 && (
        <Section title="Dispatches" icon="⛽" color={C.teal}>
          {trips.map((item, i) => (
            <Card key={item.id || i}>
              {item.heroImageUrl && <HeroImg src={item.heroImageUrl} alt={item.title} />}
              <CardTitle>{item.title}</CardTitle>
              {(item.startCity || item.endCity) && (
                <CardSub>{[item.startCity, item.endCity].filter(Boolean).join(' → ')}{item.location ? ` · ${item.location}` : ''}</CardSub>
              )}
              {!item.startCity && item.location && <CardSub>{item.location}</CardSub>}
              {(item.narrative || item.description) && <CardBody>{item.narrative || item.description}</CardBody>}
              {item.landmarks && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginTop: 6 }}>Landmarks: {item.landmarks}</div>}
              {item.appRouteLink && <div style={{ marginTop: 8 }}><CardLink href={item.appRouteLink}>Follow this route →</CardLink></div>}
            </Card>
          ))}
        </Section>
      )}

      {/* 4. Literary Landmark */}
      {literaryLandmarks?.length > 0 && (
        <Section title="Literary Landmark" icon="◉" color={C.gold}>
          {literaryLandmarks.map((item, i) => (
            <Card key={item.id || i}>
              {item.heroImageUrl && <HeroImg src={item.heroImageUrl} alt={item.name} />}
              <CardTitle>{item.name}</CardTitle>
              <CardSub>{[item.location, item.literaryConnection].filter(Boolean).join(' · ')}</CardSub>
              {item.history && <CardBody>{item.history}</CardBody>}
              {item.howToVisit && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: C.bg, borderRadius: 6 }}>
                  <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.gold, letterSpacing: '0.06em', marginBottom: 4 }}>HOW TO VISIT</div>
                  <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.cream, margin: 0, lineHeight: 1.5 }}>{item.howToVisit}</p>
                </div>
              )}
              {item.readBeforeYouGo && (
                <div style={{ marginTop: 8, fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
                  Read before you go: {item.readBeforeYouGo}
                </div>
              )}
              <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                {item.appLink && <CardLink href={item.appLink}>View on Literary Roads →</CardLink>}
                {item.externalLink && <CardLink href={item.externalLink}>Learn more →</CardLink>}
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* 5. Readers' Choice */}
      {readers?.length > 0 && (
        <Section title="Readers' Choice" icon="▶" color={C.purple}>
          {readers.map((item, i) => (
            <Card key={item.id || i}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {item.coverUrl && <img src={item.coverUrl} alt={item.bookTitle} style={{ width: 44, height: 64, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <CardTitle>{item.bookTitle}</CardTitle>
                  <CardSub>{[item.author, item.buzzSource].filter(Boolean).join(' · ')}</CardSub>
                  {(item.whyBuzzing || item.commentary) && <CardBody>{item.whyBuzzing || item.commentary}</CardBody>}
                  {item.link && <CardLink href={item.link}>Read more →</CardLink>}
                </div>
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* 6. On the Road */}
      {onTheRoad?.length > 0 && (
        <Section title="On the Road" icon="◈" color={C.orange}>
          {onTheRoad.map((item, i) => (
            <Card key={item.id || i}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {item.coverUrl && <img src={item.coverUrl} alt={item.bookTitle} style={{ width: 44, height: 64, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <CardTitle>{item.authorName}</CardTitle>
                  <CardSub>{item.bookTitle}</CardSub>
                  <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.orange, marginBottom: 4 }}>{item.dateTime}</div>
                  <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.cream }}>{item.venueName}{item.location ? ` · ${item.location}` : ''}</div>
                  {item.notes && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginTop: 4 }}>{item.notes}</div>}
                  {item.rsvpLink && <div style={{ marginTop: 6 }}><CardLink href={item.rsvpLink}>Tickets / RSVP →</CardLink></div>}
                </div>
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* 7. The Waystation */}
      {waystation?.length > 0 && (
        <Section title="The Waystation" icon="☕" color={C.teal}>
          {waystation.map((item, i) => (
            <Card key={item.id || i}>
              {item.heroImageUrl && <HeroImg src={item.heroImageUrl} alt={item.name} />}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                <CardTitle>{item.name}</CardTitle>
                {item.placeType && <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: C.teal, letterSpacing: '0.08em', padding: '2px 6px', border: `1px solid rgba(64,224,208,0.3)`, borderRadius: 4 }}>{item.placeType.toUpperCase()}</span>}
              </div>
              <CardSub>{item.location}{item.hours ? ` · ${item.hours}` : ''}</CardSub>
              {item.whyWorthy && <CardBody>{item.whyWorthy}</CardBody>}
              {item.bookToReadThere && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 6 }}>Read here: {item.bookToReadThere}</div>}
              {item.address && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginTop: 4 }}>{item.address}</div>}
              {item.travelersOffer && (
                <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 5 }}>
                  <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.gold }}>Literary Travelers: {item.travelersOffer}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                {item.website && <CardLink href={item.website}>Visit website →</CardLink>}
                {item.appLink && <CardLink href={item.appLink}>View on Literary Roads →</CardLink>}
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* 8. Headlights — compact 3-up grid */}
      {headlights?.length > 0 && (
        <Section title="Headlights" icon="◆" color={C.coral}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {headlights.map((item, i) => (
              <div key={item.id || i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
                {item.type && <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: C.coral, letterSpacing: '0.08em', marginBottom: 5 }}>{item.type.toUpperCase()}</div>}
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.cream, marginBottom: 6, lineHeight: 1.3 }}>{item.headline}</div>
                {item.body && <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: 'rgba(245,245,220,0.8)', margin: '0 0 6px', lineHeight: 1.5 }}>{item.body}</p>}
                {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal, textDecoration: 'none' }}>Read →</a>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 9. The Reading Room */}
      {readingRoom?.length > 0 && (
        <Section title="The Reading Room" icon="✦" color={C.teal}>
          {readingRoom.map((item, i) => (
            <Card key={item.id || i}>
              {/* Featured books */}
              {item.featuredBooks?.length > 0 && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                  {item.featuredBooks.map((book, bi) => (
                    <div key={bi} style={{ display: 'flex', gap: 10, flex: '1 1 200px', alignItems: 'flex-start' }}>
                      {book.coverUrl && <img src={book.coverUrl} alt={book.title} style={{ width: 52, height: 76, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.cream, marginBottom: 2 }}>{book.title}</div>
                        <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted, marginBottom: 4 }}>{book.author}</div>
                        {book.whyFeatured && <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: 'rgba(245,245,220,0.8)', margin: 0, lineHeight: 1.5 }}>{book.whyFeatured}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {item.communityNote && <CardBody>{item.communityNote}</CardBody>}
              {/* Featured postcard */}
              {item.postcardImageUrl && (
                <div style={{ marginTop: 14 }}>
                  <img src={item.postcardImageUrl} alt={item.postcardCaption || 'Postcard'} style={{ width: '100%', borderRadius: 6, maxHeight: 200, objectFit: 'cover' }} />
                  {(item.postcardCaption || item.postcardLocation) && (
                    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginTop: 4, fontStyle: 'italic' }}>
                      {[item.postcardCaption, item.postcardLocation].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </Section>
      )}

      {/* 10. Bookstore Q&A */}
      {bookstoreQA?.length > 0 && (
        <Section title="Bookstore Q&A" icon="◎" color={C.orange}>
          {bookstoreQA.map((item, i) => {
            const QA_LABELS = [
              'How do we encourage more people to read?',
              "What's the last book you loved?",
              'Do you have a favorite coffee shop?',
              'What surprised you this week?',
              'Is there life on other planets?',
              'If you could read a book anywhere in the world, where would that be?',
              'Winter, spring, summer or fall?',
              'What is your favorite invention?',
              'When was your last road trip and where did you go?',
              'How do you like your coffee (or tea)?',
              "What's one book every Literary Roads traveler should read?",
            ];
            return (
              <Card key={item.id || i}>
                <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
                  {item.ownerPhotoUrl && <img src={item.ownerPhotoUrl} alt={item.ownerName} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }} />}
                  <div>
                    {item.storeImageUrl && <img src={item.storeImageUrl} alt={item.storeName} style={{ width: '100%', borderRadius: 6, marginBottom: 8, maxHeight: 140, objectFit: 'cover' }} />}
                    <CardTitle>{item.storeName}</CardTitle>
                    <CardSub>{[item.ownerName, item.location].filter(Boolean).join(' · ')}</CardSub>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {QA_LABELS.map((q, qi) => {
                    const key = `q${qi + 1}`;
                    const answer = item[key];
                    if (!answer) return null;
                    return (
                      <div key={key}>
                        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.orange, letterSpacing: '0.06em', marginBottom: 4 }}>Q{qi + 1}: {q}</div>
                        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.cream, margin: 0, lineHeight: 1.6 }}>{answer}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </Section>
      )}

      {/* 11. The Long Road — YouTube interview */}
      {theLongRoad?.length > 0 && (
        <Section title="The Long Road" icon="▷" color={C.coral}>
          {theLongRoad.map((item, i) => (
            <Card key={item.id || i}>
              {item.youtubeId && (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 6, marginBottom: 12 }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}`}
                    title={item.interviewTitle || item.authorName}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {item.authorPhotoUrl && <img src={item.authorPhotoUrl} alt={item.authorName} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }} />}
                <div>
                  <CardTitle>{item.interviewTitle}</CardTitle>
                  <CardSub>{item.authorName}{item.bookTitle ? ` · ${item.bookTitle}` : ''}</CardSub>
                  {item.description && <CardBody>{item.description}</CardBody>}
                </div>
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* NYT What's Trending — Fiction */}
      {nyt?.fiction?.length > 0 && (
        <Section title="What's Trending This Week" icon="◉" color={C.coral}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nyt.fiction.slice(0, 5).map(b => (
              <Card key={b.rank}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {b.coverUrl && <img src={b.coverUrl} alt={b.title} style={{ width: 44, height: 64, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                  <div>
                    <div><span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted }}>#{b.rank} </span><span style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: C.cream }}>{b.title}</span></div>
                    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginBottom: 4 }}>{b.author}</div>
                    {b.description && <CardBody>{b.description}</CardBody>}
                    {b.weeksOnList > 1 && <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.orange, marginTop: 4 }}>{b.weeksOnList} WEEKS ON LIST</div>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* NYT Bestsellers — Non-Fiction only */}
      {nyt?.nonfiction?.length > 0 && (
        <Section title="NYT Bestsellers — Non-Fiction" icon="◎" color={C.coral}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nyt.nonfiction.slice(0, 5).map(b => (
              <Card key={b.rank}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {b.coverUrl && <img src={b.coverUrl} alt={b.title} style={{ width: 44, height: 64, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                  <div>
                    <div><span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted }}>#{b.rank} </span><span style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: C.cream }}>{b.title}</span></div>
                    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginBottom: 4 }}>{b.author}</div>
                    {b.description && <CardBody>{b.description}</CardBody>}
                    {b.weeksOnList > 1 && <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.orange, marginTop: 4 }}>{b.weeksOnList} WEEKS ON LIST</div>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
