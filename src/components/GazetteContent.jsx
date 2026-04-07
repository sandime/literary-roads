// src/components/GazetteContent.jsx
// Shared newsletter content renderer — single-column layout.
// Used by: NewsletterPreview, GazetteIssue (archived), GazetteNewspaper (light theme).
import { createContext, useContext } from 'react';

const DARK = {
  bg:      '#0D0E1A',
  panel:   '#1A1B2E',
  border:  'rgba(64,224,208,0.18)',
  teal:    '#40E0D0',
  tealDk:  '#2d6d74',
  orange:  '#FF4E00',
  coral:   '#FF6B7A',
  cream:   '#F5F5DC',
  body:    'rgba(245,245,220,0.85)',
  silver:  '#C0C0C0',
  muted:   'rgba(192,192,192,0.45)',
  purple:  '#9B59B6',
  gold:    '#FFD700',
  isLight: false,
};

const LIGHT = {
  bg:      '#ede7dc',
  bgDark:  '#1c2b2d',  // ink — for contrasting dark cards
  panel:   '#ffffff',
  border:  'rgba(28,43,45,0.12)',
  teal:    '#4a9fa5',
  tealDk:  '#2d6d74',
  orange:  '#e67e22',
  coral:   '#e8956b',
  cream:   '#1c2b2d',  // ink (text)
  body:    'rgba(28,43,45,0.75)',
  silver:  '#3a4f52',
  muted:   'rgba(28,43,45,0.5)',
  purple:  '#7d3c98',
  gold:    '#f39c12',
  pink:    '#f9c5d5',
  isLight: true,
};

const ColorsCtx = createContext(DARK);

// ── Rank badge colors (NYT style) ─────────────────────────────────────────────
const RANK_COLORS_LIGHT = ['#e8956b', '#4a9fa5', '#f39c12', '#3a4f52', '#3a4f52'];
const RANK_COLORS_DARK  = ['#FF6B7A', '#40E0D0', '#FFD700', 'rgba(192,192,192,0.45)', 'rgba(192,192,192,0.45)'];

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

// ── Chip / pill ────────────────────────────────────────────────────────────────
function Chip({ children, bg, color = '#fff', style = {} }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: 'Bungee, sans-serif',
      fontSize: 9,
      letterSpacing: '0.1em',
      padding: '3px 10px',
      borderRadius: 12,
      background: bg,
      color,
      ...style,
    }}>{children}</span>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ id, title, icon, color, children, subtitle, wrapStyle = {} }) {
  const C = useContext(ColorsCtx);
  const titleSize = C.isLight ? 20 : 14;
  return (
    <div id={id} style={{ marginBottom: 40, scrollMarginTop: 90, ...wrapStyle }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: subtitle ? 4 : 16,
        paddingBottom: subtitle ? 0 : 12,
        borderBottom: subtitle ? 'none' : `2px solid ${color}`,
      }}>
        <span style={{ fontSize: 16, color }}>{icon}</span>
        <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: titleSize, color, margin: 0, letterSpacing: '0.04em' }}>{title}</h2>
      </div>
      {subtitle && (
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted, margin: '0 0 16px', paddingBottom: 12, borderBottom: `2px solid ${color}`, fontStyle: 'italic' }}>
          {subtitle}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  );
}

// ── Generic card (light = white + border, dark = panel) ───────────────────────
function Card({ children, style = {} }) {
  const C = useContext(ColorsCtx);
  return (
    <div style={{
      background: C.panel,
      border: `1.5px solid ${C.border}`,
      borderRadius: C.isLight ? 6 : 8,
      padding: '16px 18px',
      transition: C.isLight ? 'box-shadow 0.2s' : undefined,
      ...style,
    }}>{children}</div>
  );
}

// ── Festival card (white, 4px top border) ─────────────────────────────────────
function FestivalCard({ item }) {
  const C = useContext(ColorsCtx);
  if (!C.isLight) return (
    <Card>
      <CardTitle>{item.name}</CardTitle>
      <CardSub>{[item.location, formatFestivalDate(item.date, item.endDate)].filter(Boolean).join(' · ')}</CardSub>
      {item.context && <CardBody>{item.context}</CardBody>}
      {item.link && <CardLink href={item.link}>Event details →</CardLink>}
    </Card>
  );
  return (
    <div style={{ background: '#fff', border: '1.5px solid #ede7dc', borderRadius: 6, padding: 16, borderTop: `4px solid ${C.coral}` }}>
      {formatFestivalDate(item.date, item.endDate) && (
        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.coral, letterSpacing: '0.06em', marginBottom: 4 }}>
          {formatFestivalDate(item.date, item.endDate)}
        </div>
      )}
      <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 15, color: C.cream, lineHeight: 1.3, marginBottom: 4 }}>{item.name}</div>
      {item.location && <div style={{ fontSize: 11, color: C.silver, fontStyle: 'italic', marginBottom: 8 }}>{item.location}</div>}
      {item.context && <p style={{ fontSize: 12, color: C.cream, lineHeight: 1.65, margin: '0 0 10px' }}>{item.context}</p>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.08em', color: C.tealDk, textDecoration: 'none', borderBottom: `1.5px solid ${C.teal}`, paddingBottom: 1 }}>
            Event details →
          </a>
        )}
      </div>
    </div>
  );
}

// ── Readers' Choice card (dark ink / tiktok-card style in light) ──────────────
function ReadersChoiceCard({ item }) {
  const C = useContext(ColorsCtx);
  const BADGE_COLORS = [C.teal, C.coral, C.gold, C.isLight ? C.pink : '#FF69B4'];
  if (!C.isLight) return (
    <Card>
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
  );
  const badgeColor = BADGE_COLORS[0];
  return (
    <div style={{ background: C.bgDark, color: '#F5F5DC', borderRadius: 8, padding: 16, borderTop: `4px solid ${badgeColor}` }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {item.coverUrl && <img src={item.coverUrl} alt={item.bookTitle} style={{ width: 48, height: 68, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
        <div style={{ flex: 1 }}>
          {item.buzzSource && (
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: badgeColor, letterSpacing: '0.06em', marginBottom: 5 }}>
              {item.buzzSource}
            </div>
          )}
          <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: '#fff', lineHeight: 1.3, marginBottom: 3 }}>{item.bookTitle}</div>
          <div style={{ fontSize: 10, color: 'rgba(245,241,235,0.6)', fontStyle: 'italic', marginBottom: 8 }}>{item.author}</div>
          {(item.whyBuzzing || item.commentary) && (
            <p style={{ fontSize: 11, color: 'rgba(245,241,235,0.8)', lineHeight: 1.6, margin: '0 0 8px' }}>{item.whyBuzzing || item.commentary}</p>
          )}
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: badgeColor, textDecoration: 'none', letterSpacing: '0.06em' }}>
              Read more →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dispatch / trip card ───────────────────────────────────────────────────────
function DispatchCard({ item }) {
  const C = useContext(ColorsCtx);
  if (!C.isLight) return (
    <Card>
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
  );
  const route = [item.startCity, item.endCity].filter(Boolean).join(' → ');
  return (
    <div style={{ background: '#fff', border: '1.5px solid #ede7dc', borderRadius: 8, overflow: 'hidden' }}>
      {item.heroImageUrl
        ? <img src={item.heroImageUrl} alt={item.title} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
        : route && (
            <div style={{ width: '100%', height: 80, background: `linear-gradient(135deg, ${C.tealDk}, ${C.teal})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.06em' }}>{route}</span>
            </div>
          )
      }
      <div style={{ padding: 16 }}>
        <Chip bg={C.teal} style={{ marginBottom: 8 }}>DISPATCH</Chip>
        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: C.cream, lineHeight: 1.3, marginBottom: 4 }}>{item.title}</div>
        {route && !item.heroImageUrl && <div style={{ fontSize: 11, color: C.silver, marginBottom: 4 }}>{route}</div>}
        {item.location && <div style={{ fontSize: 10, color: C.silver, letterSpacing: '0.04em', marginBottom: 8 }}>{item.location}</div>}
        {(item.narrative || item.description) && (
          <p style={{ fontSize: 12, color: C.cream, lineHeight: 1.65, margin: '0 0 8px' }}>{item.narrative || item.description}</p>
        )}
        {item.landmarks && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Landmarks: {item.landmarks}</div>}
        {item.appRouteLink && (
          <a href={item.appRouteLink} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.tealDk, textDecoration: 'none', borderBottom: `1.5px solid ${C.teal}`, paddingBottom: 1, display: 'inline-block', marginTop: 8 }}>
            Follow this route →
          </a>
        )}
      </div>
    </div>
  );
}

// ── Generic primitives ─────────────────────────────────────────────────────────
function CardTitle({ children }) {
  const C = useContext(ColorsCtx);
  return <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: C.isLight ? 15 : 13, color: C.cream, marginBottom: 3, letterSpacing: '0.03em' }}>{children}</div>;
}
function CardSub({ children }) {
  const C = useContext(ColorsCtx);
  return <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginBottom: 5, fontStyle: 'italic' }}>{children}</div>;
}
function CardBody({ children }) {
  const C = useContext(ColorsCtx);
  return <p style={{ fontFamily: 'Special Elite, serif', fontSize: C.isLight ? 13 : 13, color: C.body, lineHeight: 1.65, margin: '5px 0' }}>{children}</p>;
}
function CardLink({ href, children }) {
  const C = useContext(ColorsCtx);
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

// ── NYT list (nyt-box style) ───────────────────────────────────────────────────
function NytBox({ title, subtitle, books = [] }) {
  const C = useContext(ColorsCtx);
  const RANK_COLORS = C.isLight ? RANK_COLORS_LIGHT : RANK_COLORS_DARK;
  return (
    <div style={{ border: `2px solid ${C.isLight ? C.cream : C.border}`, borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ background: C.isLight ? C.cream : C.panel, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.isLight ? '#f5f1eb' : C.teal, letterSpacing: '0.08em' }}>{title}</span>
        {subtitle && <span style={{ fontSize: 10, color: C.isLight ? 'rgba(245,241,235,0.5)' : C.muted, fontStyle: 'italic' }}>{subtitle}</span>}
      </div>
      {books.slice(0, 5).map((b, i) => (
        <div key={b.rank} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
          borderBottom: i < 4 ? `1px solid ${C.isLight ? '#ede7dc' : C.border}` : 'none',
          background: C.isLight ? (i % 2 === 0 ? '#fff' : 'transparent') : (i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'),
        }}>
          <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 18, color: RANK_COLORS[i], minWidth: 28, lineHeight: 1 }}>{b.rank}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: C.isLight ? C.cream : C.cream }}>{b.title}</div>
            <div style={{ fontSize: 10, color: C.muted, fontStyle: 'italic' }}>{b.author}</div>
          </div>
          {b.weeksOnList > 0 && (
            <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.tealDk, whiteSpace: 'nowrap' }}>
              {b.weeksOnList}wk{b.weeksOnList !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── GazetteContent ─────────────────────────────────────────────────────────────
export default function GazetteContent({ data, theme, hideNyt }) {
  const colors = theme === 'light' ? LIGHT : DARK;
  const C = colors;

  const {
    issue, festivalTrips, handSelected, dispatches, readersChoice,
    literaryLandmarks, readingRoom, headlights, onTheRoad,
    waystation, bookstoreQA, theLongRoad, nyt,
  } = data || {};

  const festivals  = festivalTrips || data?.festivals || [];
  const indie      = handSelected  || data?.indiePicks || [];
  const trips      = dispatches    || data?.tripReports || [];
  const readers    = readersChoice || data?.bookTokPicks || [];

  const hasContent = [festivals, indie, trips, readers, literaryLandmarks, readingRoom, headlights, onTheRoad, waystation, bookstoreQA, theLongRoad]
    .some(arr => arr?.length > 0);

  return (
    <ColorsCtx.Provider value={colors}>
      {/* Pull quote */}
      {issue?.pullQuote && (
        <div style={{ marginBottom: 36, padding: '18px 22px', background: C.isLight ? C.bg : `linear-gradient(135deg, rgba(64,224,208,0.08), rgba(255,78,0,0.05))`, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.teal}`, borderRadius: '0 6px 6px 0' }}>
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
        <Section id="festivals" title="Festival Trips" icon="★" color={C.teal}>
          {festivals.map((item, i) => <FestivalCard key={item.id || i} item={item} />)}
        </Section>
      )}

      {/* 2. Hand-Selected — dark ink strip in light mode */}
      {indie?.length > 0 && (
        <Section id="handselected" title="Hand-Selected" icon="◆" color={C.isLight ? '#f9c5d5' : C.orange}
          subtitle="Bookstore staff picks from indie shops across America"
          wrapStyle={C.isLight ? { background: C.bgDark, borderRadius: 8, padding: '20px 24px' } : {}}>
          {indie.map((item, i) => (
            <div key={item.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < indie.length - 1 ? `1px dashed rgba(245,241,235,0.2)` : 'none' }}>
              {item.bookPicks?.[0]?.coverUrl && (
                <img src={item.bookPicks[0].coverUrl} alt={item.bookPicks[0].title}
                  style={{ width: 44, height: 64, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: C.isLight ? 15 : 13, color: C.isLight ? '#fff' : C.cream, lineHeight: 1.3, marginBottom: 3 }}>
                  {item.bookstoreName}
                </div>
                {item.ownerName && (
                  <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, letterSpacing: '0.1em', color: C.teal, display: 'block', marginBottom: 4 }}>
                    {[item.ownerName, item.city].filter(Boolean).join(' · ')}
                  </span>
                )}
                {(item.description || item.recommendation) && (
                  <p style={{ fontFamily: 'Special Elite, serif', fontSize: C.isLight ? 12 : 11, color: C.isLight ? 'rgba(245,241,235,0.8)' : C.body, lineHeight: 1.6, margin: '0 0 4px' }}>
                    "{item.description || item.recommendation}"
                  </p>
                )}
                {item.bookPicks?.length > 1 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {item.bookPicks.slice(1).map((book, bi) => (
                      <div key={bi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        {book.coverUrl && <img src={book.coverUrl} alt={book.title} style={{ width: 28, height: 40, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
                        <div>
                          <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.isLight ? '#fff' : C.cream }}>{book.title}</div>
                          <div style={{ fontSize: 9, color: C.isLight ? 'rgba(245,241,235,0.6)' : C.muted }}>{book.author}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {item.appLink && (
                  <a href={item.appLink} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal, textDecoration: 'none', letterSpacing: '0.06em', display: 'inline-block', marginTop: 6 }}>
                    View on Literary Roads →
                  </a>
                )}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* 3. Dispatches */}
      {trips?.length > 0 && (
        <Section id="dispatches" title="Dispatches" icon="⛽" color={C.teal}>
          {trips.map((item, i) => <DispatchCard key={item.id || i} item={item} />)}
        </Section>
      )}

      {/* 4. Literary Landmark */}
      {literaryLandmarks?.length > 0 && (
        <Section id="landmark" title="Literary Landmark" icon="◉" color={C.gold}>
          {literaryLandmarks.map((item, i) => (
            <Card key={item.id || i}>
              {item.heroImageUrl && <HeroImg src={item.heroImageUrl} alt={item.name} />}
              {C.isLight && <Chip bg={C.gold} style={{ marginBottom: 8 }}>LANDMARK</Chip>}
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
        <Section id="readerschoice" title="Readers' Choice" icon="▶" color={C.isLight ? C.teal : C.purple}>
          {readers.map((item, i) => <ReadersChoiceCard key={item.id || i} item={item} />)}
        </Section>
      )}

      {/* 6. On the Road */}
      {onTheRoad?.length > 0 && (
        <Section id="ontheroad" title="On the Road" icon="◈" color={C.orange}>
          {onTheRoad.map((item, i) => (
            <Card key={item.id || i}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {item.coverUrl && <img src={item.coverUrl} alt={item.bookTitle} style={{ width: 44, height: 64, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  {C.isLight && <Chip bg={C.orange} style={{ marginBottom: 8 }}>AUTHOR TOUR</Chip>}
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
        <Section id="waystation" title="The Waystation" icon="◎" color={C.teal}>
          {waystation.map((item, i) => (
            <Card key={item.id || i}>
              {item.heroImageUrl && <HeroImg src={item.heroImageUrl} alt={item.name} />}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                <CardTitle>{item.name}</CardTitle>
                {item.placeType && <Chip bg={C.teal} style={{ fontSize: 8 }}>{item.placeType.toUpperCase()}</Chip>}
              </div>
              <CardSub>{item.location}{item.hours ? ` · ${item.hours}` : ''}</CardSub>
              {item.whyWorthy && <CardBody>{item.whyWorthy}</CardBody>}
              {item.bookToReadThere && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 6 }}>Read here: {item.bookToReadThere}</div>}
              {item.address && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginTop: 4 }}>{item.address}</div>}
              {item.travelersOffer && (
                <div style={{ marginTop: 10, padding: '6px 10px', background: `${C.gold}15`, border: `1px solid ${C.gold}40`, borderRadius: 5 }}>
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

      {/* 8. Headlights — compact grid */}
      {headlights?.length > 0 && (
        <Section id="headlights" title="Headlights" icon="◆" color={C.coral}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {headlights.map((item, i) => (
              <div key={item.id || i} style={{ background: C.panel, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '12px 14px', borderTop: C.isLight ? `4px solid ${C.coral}` : undefined }}>
                {item.type && <Chip bg={C.coral} style={{ marginBottom: 6, fontSize: 8 }}>{item.type.toUpperCase()}</Chip>}
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: C.cream, marginBottom: 6, lineHeight: 1.3 }}>{item.headline}</div>
                {item.body && <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.body, margin: '0 0 6px', lineHeight: 1.5 }}>{item.body}</p>}
                {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal, textDecoration: 'none' }}>Read →</a>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 9. The Reading Room */}
      {readingRoom?.length > 0 && (
        <Section id="readingroom" title="The Reading Room" icon="✦" color={C.teal}>
          {readingRoom.map((item, i) => (
            <Card key={item.id || i}>
              {item.featuredBooks?.length > 0 && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                  {item.featuredBooks.map((book, bi) => (
                    <div key={bi} style={{ display: 'flex', gap: 10, flex: '1 1 200px', alignItems: 'flex-start' }}>
                      {book.coverUrl && <img src={book.coverUrl} alt={book.title} style={{ width: 52, height: 76, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: C.cream, marginBottom: 2 }}>{book.title}</div>
                        <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted, marginBottom: 4 }}>{book.author}</div>
                        {book.whyFeatured && <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.body, margin: 0, lineHeight: 1.5 }}>{book.whyFeatured}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {item.communityNote && <CardBody>{item.communityNote}</CardBody>}
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
        <Section id="qa" title="Bookstore Q&A" icon="◎" color={C.orange}>
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
                  <div style={{ flex: 1 }}>
                    {item.storeImageUrl && <img src={item.storeImageUrl} alt={item.storeName} style={{ width: '100%', borderRadius: 6, marginBottom: 8, maxHeight: 140, objectFit: 'cover' }} />}
                    <CardTitle>{item.storeName}</CardTitle>
                    <CardSub>{[item.ownerName, item.location].filter(Boolean).join(' · ')}</CardSub>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {QA_LABELS.map((q, qi) => {
                    const answer = item[`q${qi + 1}`];
                    if (!answer) return null;
                    return (
                      <div key={qi}>
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

      {/* 11. The Long Road — YouTube */}
      {theLongRoad?.length > 0 && (
        <Section id="longroad" title="The Long Road" icon="▷" color={C.coral}>
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

      {/* NYT — shown only when NOT hideNyt (newsletter/archive views) */}
      {!hideNyt && (nyt?.fiction?.length > 0 || nyt?.nonfiction?.length > 0) && (
        <Section id="trending" title="NYT Bestsellers" icon="◉" color={C.coral}
          subtitle={`Fiction & Nonfiction${nyt?.issueDate ? ` · ${nyt.issueDate}` : ''}`}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {nyt?.fiction?.length > 0 && (
              <NytBox title="Fiction" subtitle="Combined Print & E-Book" books={nyt.fiction} />
            )}
            {nyt?.nonfiction?.length > 0 && (
              <NytBox title="Nonfiction" subtitle="Combined Print & E-Book" books={nyt.nonfiction} />
            )}
          </div>
        </Section>
      )}
    </ColorsCtx.Provider>
  );
}
