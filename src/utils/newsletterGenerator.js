// src/utils/newsletterGenerator.js
// Generates email-friendly HTML for the Gazette newsletter (Substack-compatible).
// Single-column, inline CSS only, Literary Roads palette.

const P = {
  bg:     '#0D0E1A',
  panel:  '#1A1B2E',
  teal:   '#40E0D0',
  orange: '#FF4E00',
  coral:  '#FF6B7A',
  cream:  '#F5F5DC',
  muted:  '#8A8A9A',
  purple: '#9B59B6',
  gold:   '#FFD700',
  border: 'rgba(64,224,208,0.2)',
};

const fmt = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const issueLine = (issue) => {
  if (!issue) return '';
  const parts = [];
  if (issue.volume) parts.push(`Vol. ${issue.volume}`);
  if (issue.issue)  parts.push(`Issue ${issue.issue}`);
  if (issue.publishDate) parts.push(`Week of ${fmt(issue.publishDate)}`);
  return parts.join(' · ');
};

const sectionHeader = (title, icon, color) => `
  <tr><td style="padding:28px 0 10px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="border-bottom:1px solid ${color}40;padding-bottom:8px;">
        <span style="font-family:'Bungee',sans-serif;font-size:16px;color:${color};letter-spacing:0.04em;">${icon} ${esc(title)}</span>
      </td>
    </tr></table>
  </td></tr>`;

const cardWrap = (inner) => `
  <tr><td style="padding:6px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${P.panel};border:1px solid rgba(64,224,208,0.18);border-radius:8px;">
      <tr><td style="padding:14px 16px;">${inner}</td></tr>
    </table>
  </td></tr>`;

const cardTitle = (t) => `<div style="font-family:'Bungee',sans-serif;font-size:13px;color:${P.cream};margin-bottom:3px;letter-spacing:0.03em;">${esc(t)}</div>`;
const cardSub   = (t) => `<div style="font-family:'Special Elite',serif;font-size:11px;color:${P.muted};margin-bottom:5px;">${esc(t)}</div>`;
const cardBody  = (t) => `<p style="font-family:'Special Elite',serif;font-size:13px;color:rgba(245,245,220,0.85);line-height:1.65;margin:5px 0;">${esc(t)}</p>`;
const cardLink  = (href, label) => `<a href="${esc(href)}" style="font-family:'Bungee',sans-serif;font-size:10px;color:${P.teal};text-decoration:none;letter-spacing:0.05em;">${esc(label)}</a>`;
const heroImg   = (src, alt) => src ? `<img src="${esc(src)}" alt="${esc(alt||'')}" width="100%" style="border-radius:6px;margin-bottom:10px;max-height:220px;object-fit:cover;display:block;">` : '';

const formatFestDate = (s, e) => {
  if (!s) return '';
  const start = new Date(s + 'T00:00:00');
  const end = e && e !== s ? new Date(e + 'T00:00:00') : null;
  const f = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  if (!end || end <= start) return f(start);
  const days = Math.round((end - start) / 864e5) + 1;
  const label = `${days} day${days !== 1 ? 's' : ''}`;
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear())
    return `${start.toLocaleDateString('en-US',{month:'long'})} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()} · ${label}`;
  if (start.getFullYear() === end.getFullYear()) {
    const ss = start.toLocaleDateString('en-US',{month:'long',day:'numeric'});
    const ee = end.toLocaleDateString('en-US',{month:'long',day:'numeric'});
    return `${ss} - ${ee}, ${start.getFullYear()} · ${label}`;
  }
  return `${f(start)} - ${f(end)} · ${label}`;
};

export function generateSubstackText(data) {
  const {
    issue, festivalTrips, handSelected, dispatches, readersChoice,
    literaryLandmarks, readingRoom, headlights, onTheRoad,
    waystation, bookstoreQA, theLongRoad, nyt,
  } = data || {};

  const festivals = festivalTrips || data?.festivals || [];
  const indie     = handSelected  || data?.indiePicks || [];
  const trips     = dispatches    || data?.tripReports || [];
  const readers   = readersChoice || data?.bookTokPicks || [];

  const siteUrl = 'https://theliteraryroads.com';
  const slug = issue ? `vol-${issue.volume}-issue-${issue.issue}` : '';
  const issueUrl = slug ? `${siteUrl}/newspaper/${slug}` : siteUrl;
  const line = issueLine(issue);

  const sep = '\n\n---\n\n';
  const sectionHead = (title) => `${title.toUpperCase()}\n${'─'.repeat(title.length)}`;
  const txt = s => String(s || '').trim();

  let out = '';

  // Header
  out += 'THE LITERARY ROADS GAZETTE\n';
  if (line) out += `${line}\n`;
  out += 'Books for the road. Roads for the books.\n';

  if (issue?.pullQuote) {
    out += sep;
    out += `"${txt(issue.pullQuote)}"`;
  }

  // Festival Trips
  if (festivals.length > 0) {
    out += sep;
    out += sectionHead('Festival Trips') + '\n\n';
    festivals.slice(0, 3).forEach((item, i) => {
      if (i > 0) out += '\n\n';
      out += txt(item.name);
      const sub = [item.location, formatFestDate(item.date, item.endDate)].filter(Boolean).join(' · ');
      if (sub) out += `\n${sub}`;
      if (item.context) out += `\n${txt(item.context).slice(0, 300)}`;
      if (item.link) out += `\n${item.link}`;
    });
  }

  // Hand-Selected
  if (indie.length > 0) {
    out += sep;
    out += sectionHead('Hand-Selected') + '\n';
    out += 'Bookstore staff picks from indie shops across America\n\n';
    indie.slice(0, 3).forEach((item, i) => {
      if (i > 0) out += '\n\n';
      out += txt(item.bookstoreName);
      const sub = [item.city, item.ownerName].filter(Boolean).join(' · ');
      if (sub) out += `\n${sub}`;
      if (item.description || item.recommendation) out += `\n${txt(item.description || item.recommendation).slice(0, 200)}`;
      const picks = (item.bookPicks || []).slice(0, 3);
      if (picks.length > 0) {
        out += '\nPicks:';
        picks.forEach(b => {
          out += `\n  • ${txt(b.title)} by ${txt(b.author)}`;
          if (b.blurb) out += ` — ${txt(b.blurb)}`;
        });
      }
      if (item.appLink) out += `\n${item.appLink}`;
    });
  }

  // Dispatches
  if (trips.length > 0) {
    out += sep;
    out += sectionHead('Dispatches') + '\n\n';
    trips.slice(0, 2).forEach((item, i) => {
      if (i > 0) out += '\n\n';
      out += txt(item.title);
      const route = [item.startCity, item.endCity].filter(Boolean).join(' → ');
      const sub = [route, item.location].filter(Boolean).join(' · ');
      if (sub) out += `\n${sub}`;
      const body = item.narrative || item.description;
      if (body) out += `\n${txt(body).slice(0, 300)}`;
      if (item.appRouteLink) out += `\n${item.appRouteLink}`;
    });
  }

  // Literary Landmark
  if (literaryLandmarks?.length > 0) {
    out += sep;
    out += sectionHead('Literary Landmark') + '\n\n';
    literaryLandmarks.slice(0, 1).forEach(item => {
      out += txt(item.name);
      const sub = [item.location, item.literaryConnection].filter(Boolean).join(' · ');
      if (sub) out += `\n${sub}`;
      if (item.history) out += `\n${txt(item.history).slice(0, 300)}`;
      if (item.readBeforeYouGo) out += `\nRead before you go: ${txt(item.readBeforeYouGo)}`;
      if (item.appLink) out += `\n${item.appLink}`;
      if (item.externalLink) out += `\n${item.externalLink}`;
    });
  }

  // Readers' Choice
  if (readers.length > 0) {
    out += sep;
    out += sectionHead("Readers' Choice") + '\n\n';
    readers.slice(0, 3).forEach((item, i) => {
      if (i > 0) out += '\n\n';
      out += txt(item.bookTitle);
      const sub = [item.author, item.buzzSource].filter(Boolean).join(' · ');
      if (sub) out += `\n${sub}`;
      const body = item.whyBuzzing || item.commentary;
      if (body) out += `\n${txt(body).slice(0, 200)}`;
      if (item.link) out += `\n${item.link}`;
    });
  }

  // On the Road
  if (onTheRoad?.length > 0) {
    out += sep;
    out += sectionHead('On the Road') + '\n';
    out += 'Author events & readings\n\n';
    onTheRoad.slice(0, 4).forEach((item, i) => {
      if (i > 0) out += '\n';
      out += `• ${txt(item.authorName)} — ${txt(item.bookTitle)}`;
      if (item.dateTime) out += `\n  ${txt(item.dateTime)}`;
      if (item.venueName) out += `\n  ${txt(item.venueName)}${item.location ? `, ${txt(item.location)}` : ''}`;
      if (item.rsvpLink) out += `\n  ${item.rsvpLink}`;
    });
  }

  // The Waystation
  if (waystation?.length > 0) {
    out += sep;
    out += sectionHead('The Waystation') + '\n\n';
    waystation.slice(0, 1).forEach(item => {
      out += txt(item.name);
      const sub = [item.location, item.placeType, item.hours].filter(Boolean).join(' · ');
      if (sub) out += `\n${sub}`;
      if (item.whyWorthy) out += `\n${txt(item.whyWorthy).slice(0, 250)}`;
      if (item.bookToReadThere) out += `\nRead here: ${txt(item.bookToReadThere)}`;
      if (item.travelersOffer) out += `\nLiterary Travelers offer: ${txt(item.travelersOffer)}`;
      if (item.website) out += `\n${item.website}`;
    });
  }

  // Headlights
  if (headlights?.length > 0) {
    out += sep;
    out += sectionHead('Headlights') + '\n\n';
    headlights.slice(0, 6).forEach((item, i) => {
      if (i > 0) out += '\n\n';
      if (item.type) out += `[${txt(item.type).toUpperCase()}] `;
      out += txt(item.headline);
      if (item.body) out += `\n${txt(item.body)}`;
      if (item.link) out += `\n${item.link}`;
    });
  }

  // Bookstore Q&A
  if (bookstoreQA?.length > 0) {
    out += sep;
    out += sectionHead('Bookstore Q&A') + '\n\n';
    bookstoreQA.slice(0, 1).forEach(item => {
      out += txt(item.bookstoreName);
      if (item.city) out += `\n${txt(item.city)}`;
      if (item.question && item.answer) {
        out += `\nQ: ${txt(item.question)}`;
        out += `\nA: ${txt(item.answer).slice(0, 300)}`;
      }
      if (item.website) out += `\n${item.website}`;
    });
  }

  // The Reading Room
  if (readingRoom?.length > 0) {
    out += sep;
    out += sectionHead('The Reading Room') + '\n\n';
    readingRoom.slice(0, 1).forEach(item => {
      const books = (item.featuredBooks || []);
      books.forEach(b => {
        out += `• ${txt(b.title)} by ${txt(b.author)}`;
        if (b.whyFeatured) out += `\n  ${txt(b.whyFeatured)}`;
        out += '\n';
      });
      if (item.communityNote) out += `\n${txt(item.communityNote)}`;
    });
  }

  // The Long Road
  if (theLongRoad?.length > 0) {
    out += sep;
    out += sectionHead('The Long Road') + '\n\n';
    theLongRoad.slice(0, 1).forEach(item => {
      out += txt(item.interviewTitle);
      const sub = [item.authorName, item.bookTitle].filter(Boolean).join(' · ');
      if (sub) out += `\n${sub}`;
      if (item.description) out += `\n${txt(item.description)}`;
      if (item.youtubeId) out += `\nhttps://www.youtube.com/watch?v=${item.youtubeId}`;
    });
  }

  // NYT Bestsellers
  if (nyt?.fiction?.length > 0) {
    out += sep;
    out += sectionHead('NYT Bestsellers — Fiction') + '\n\n';
    nyt.fiction.slice(0, 10).forEach(b => {
      out += `${b.rank}. ${txt(b.title)} — ${txt(b.author)}`;
      if (b.weeks_on_list > 1) out += ` (${b.weeks_on_list} weeks)`;
      out += '\n';
    });
  }

  if (nyt?.nonfiction?.length > 0) {
    out += sep;
    out += sectionHead('NYT Bestsellers — Nonfiction') + '\n\n';
    nyt.nonfiction.slice(0, 10).forEach(b => {
      out += `${b.rank}. ${txt(b.title)} — ${txt(b.author)}`;
      if (b.weeks_on_list > 1) out += ` (${b.weeks_on_list} weeks)`;
      out += '\n';
    });
  }

  // Footer
  out += sep;
  out += `Read the full issue online: ${issueUrl}\n`;
  out += `Explore the map: ${siteUrl}\n`;
  out += `\nThe Literary Roads Gazette — Books for the road. Roads for the books.`;

  return out;
}

export function generateNewsletterHTML(data) {
  const {
    issue, festivalTrips, handSelected, dispatches, readersChoice,
    literaryLandmarks, readingRoom, headlights, onTheRoad,
    waystation, bookstoreQA, theLongRoad, nyt,
  } = data || {};

  const festivals = festivalTrips || data?.festivals || [];
  const indie     = handSelected  || data?.indiePicks || [];
  const trips     = dispatches    || data?.tripReports || [];
  const readers   = readersChoice || data?.bookTokPicks || [];

  const siteUrl = 'https://theliteraryroads.com';
  const slug = issue ? `vol-${issue.volume}-issue-${issue.issue}` : '';
  const issueUrl = slug ? `${siteUrl}/newspaper/${slug}` : siteUrl;

  const pullQuoteFirstSentence = issue?.pullQuote
    ? issue.pullQuote.split(/[.!?]/)[0].trim()
    : 'The Literary Roads Gazette';

  let body = '';

  // ── Festival Trips ──
  if (festivals.length > 0) {
    body += sectionHeader('Festival Trips', '★', P.teal);
    festivals.slice(0, 3).forEach(item => {
      const sub = [item.location, formatFestDate(item.date, item.endDate)].filter(Boolean).join(' · ');
      body += cardWrap(`
        ${heroImg(item.imageUrl, item.name)}
        ${cardTitle(item.name)}
        ${cardSub(sub)}
        ${item.context ? cardBody(item.context.slice(0, 200) + (item.context.length > 200 ? '...' : '')) : ''}
        ${item.link ? cardLink(item.link, 'Event details →') : ''}
      `);
    });
  }

  // ── Hand-Selected ──
  if (indie.length > 0) {
    body += sectionHeader('Hand-Selected', '◆', P.orange);
    body += `<tr><td style="padding:0 0 6px;font-family:'Special Elite',serif;font-size:11px;color:${P.muted};">Bookstore staff picks from indie shops across America</td></tr>`;
    indie.slice(0, 3).forEach(item => {
      const picks = (item.bookPicks || []).slice(0, 3).map(b =>
        `<div style="margin-bottom:8px;padding:8px;background:${P.bg};border-radius:5px;">
          <span style="font-family:'Bungee',sans-serif;font-size:10px;color:${P.cream};">${esc(b.title)}</span>
          <span style="font-family:'Special Elite',serif;font-size:10px;color:${P.muted};"> by ${esc(b.author)}</span>
          ${b.blurb ? `<br><span style="font-family:'Special Elite',serif;font-size:11px;color:rgba(245,245,220,0.8);">${esc(b.blurb)}</span>` : ''}
        </div>`
      ).join('');
      body += cardWrap(`
        ${cardTitle(item.bookstoreName)}
        ${cardSub([item.city, item.ownerName].filter(Boolean).join(' · '))}
        ${(item.description || item.recommendation) ? cardBody((item.description || item.recommendation).slice(0,150) + '...') : ''}
        ${picks}
        ${item.appLink ? cardLink(item.appLink, 'View on Literary Roads →') : ''}
      `);
    });
  }

  // ── Dispatches ──
  if (trips.length > 0) {
    body += sectionHeader('Dispatches', '⛽', P.teal);
    trips.slice(0, 2).forEach(item => {
      const route = [item.startCity, item.endCity].filter(Boolean).join(' → ');
      body += cardWrap(`
        ${heroImg(item.heroImageUrl, item.title)}
        ${cardTitle(item.title)}
        ${route ? cardSub(route + (item.location ? ` · ${item.location}` : '')) : (item.location ? cardSub(item.location) : '')}
        ${(item.narrative||item.description) ? cardBody((item.narrative||item.description).slice(0,200)+'...') : ''}
        ${item.appRouteLink ? cardLink(item.appRouteLink,'Follow this route →') : ''}
      `);
    });
  }

  // ── Literary Landmark ──
  if (literaryLandmarks?.length > 0) {
    body += sectionHeader('Literary Landmark', '◉', P.gold);
    literaryLandmarks.slice(0, 1).forEach(item => {
      body += cardWrap(`
        ${heroImg(item.heroImageUrl, item.name)}
        ${cardTitle(item.name)}
        ${cardSub([item.location, item.literaryConnection].filter(Boolean).join(' · '))}
        ${item.history ? cardBody(item.history.slice(0,250)+'...') : ''}
        ${item.readBeforeYouGo ? `<div style="font-family:'Special Elite',serif;font-size:12px;color:${P.muted};font-style:italic;margin-top:6px;">Read before you go: ${esc(item.readBeforeYouGo)}</div>` : ''}
        ${item.appLink ? cardLink(item.appLink,'View on Literary Roads →') : ''}
        ${item.externalLink ? ' &nbsp; ' + cardLink(item.externalLink,'Learn more →') : ''}
      `);
    });
  }

  // ── Readers' Choice ──
  if (readers.length > 0) {
    body += sectionHeader("Readers' Choice", '▶', P.purple);
    readers.slice(0, 3).forEach(item => {
      body += cardWrap(`
        ${cardTitle(item.bookTitle)}
        ${cardSub([item.author, item.buzzSource].filter(Boolean).join(' · '))}
        ${(item.whyBuzzing||item.commentary) ? cardBody((item.whyBuzzing||item.commentary).slice(0,180)+'...') : ''}
        ${item.link ? cardLink(item.link,'Read more →') : ''}
      `);
    });
  }

  // ── On the Road ──
  if (onTheRoad?.length > 0) {
    body += sectionHeader('On the Road', '◈', P.orange);
    onTheRoad.slice(0, 4).forEach(item => {
      body += cardWrap(`
        ${cardTitle(item.authorName)}
        ${cardSub(item.bookTitle)}
        <div style="font-family:'Bungee',sans-serif;font-size:10px;color:${P.orange};margin-bottom:4px;">${esc(item.dateTime)}</div>
        <div style="font-family:'Special Elite',serif;font-size:12px;color:${P.cream};">${esc(item.venueName)} · ${esc(item.location||'')}</div>
        ${item.rsvpLink ? `<br>${cardLink(item.rsvpLink,'Tickets / RSVP →')}` : ''}
      `);
    });
  }

  // ── The Waystation ──
  if (waystation?.length > 0) {
    body += sectionHeader('The Waystation', '☕', P.teal);
    waystation.slice(0, 1).forEach(item => {
      body += cardWrap(`
        ${heroImg(item.heroImageUrl, item.name)}
        ${cardTitle(item.name)}
        ${cardSub([item.location, item.placeType, item.hours].filter(Boolean).join(' · '))}
        ${item.whyWorthy ? cardBody(item.whyWorthy.slice(0,200)+'...') : ''}
        ${item.bookToReadThere ? `<div style="font-family:'Special Elite',serif;font-size:12px;color:${P.muted};font-style:italic;">Read here: ${esc(item.bookToReadThere)}</div>` : ''}
        ${item.travelersOffer ? `<div style="margin-top:8px;padding:6px 10px;background:rgba(255,215,0,0.08);border-radius:5px;font-family:'Special Elite',serif;font-size:11px;color:${P.gold};">Literary Travelers: ${esc(item.travelersOffer)}</div>` : ''}
        ${item.website ? cardLink(item.website,'Visit website →') : ''}
      `);
    });
  }

  // ── Headlights ──
  if (headlights?.length > 0) {
    body += sectionHeader('Headlights', '◆', P.coral);
    headlights.slice(0, 6).forEach(item => {
      body += cardWrap(`
        ${item.type ? `<div style="font-family:'Bungee',sans-serif;font-size:8px;color:${P.coral};letter-spacing:0.08em;margin-bottom:4px;">${esc(item.type.toUpperCase())}</div>` : ''}
        <div style="font-family:'Bungee',sans-serif;font-size:12px;color:${P.cream};margin-bottom:4px;">${esc(item.headline)}</div>
        ${item.body ? `<p style="font-family:'Special Elite',serif;font-size:12px;color:rgba(245,245,220,0.8);margin:0 0 6px;line-height:1.5;">${esc(item.body)}</p>` : ''}
        ${item.link ? cardLink(item.link,'Read →') : ''}
      `);
    });
  }

  // ── NYT What's Trending ──
  if (nyt?.fiction?.length > 0) {
    body += sectionHeader("What's Trending This Week", '◉', P.coral);
    nyt.fiction.slice(0, 5).forEach(b => {
      body += cardWrap(`
        <span style="font-family:'Bungee',sans-serif;font-size:9px;color:${P.muted};">#${b.rank} </span>
        <span style="font-family:'Special Elite',serif;font-size:14px;color:${P.cream};">${esc(b.title)}</span>
        <div style="font-family:'Special Elite',serif;font-size:11px;color:${P.muted};">${esc(b.author)}</div>
      `);
    });
  }

  // ── NYT Non-Fiction ──
  if (nyt?.nonfiction?.length > 0) {
    body += sectionHeader('NYT Bestsellers — Non-Fiction', '◎', P.coral);
    nyt.nonfiction.slice(0, 5).forEach(b => {
      body += cardWrap(`
        <span style="font-family:'Bungee',sans-serif;font-size:9px;color:${P.muted};">#${b.rank} </span>
        <span style="font-family:'Special Elite',serif;font-size:14px;color:${P.cream};">${esc(b.title)}</span>
        <div style="font-family:'Special Elite',serif;font-size:11px;color:${P.muted};">${esc(b.author)}</div>
      `);
    });
  }

  // ── The Reading Room ──
  if (readingRoom?.length > 0) {
    body += sectionHeader('The Reading Room', '✦', P.teal);
    readingRoom.slice(0, 1).forEach(item => {
      const books = (item.featuredBooks || []).map(b =>
        `<div style="margin-bottom:10px;">
          <span style="font-family:'Bungee',sans-serif;font-size:11px;color:${P.cream};">${esc(b.title)}</span>
          <span style="font-family:'Special Elite',serif;font-size:11px;color:${P.muted};"> by ${esc(b.author)}</span>
          ${b.whyFeatured ? `<br><span style="font-family:'Special Elite',serif;font-size:11px;color:rgba(245,245,220,0.8);">${esc(b.whyFeatured)}</span>` : ''}
        </div>`
      ).join('');
      body += cardWrap(`
        ${books}
        ${item.communityNote ? cardBody(item.communityNote) : ''}
      `);
    });
  }

  // ── The Long Road ──
  if (theLongRoad?.length > 0) {
    body += sectionHeader('The Long Road', '▷', P.coral);
    theLongRoad.slice(0, 1).forEach(item => {
      body += cardWrap(`
        ${cardTitle(item.interviewTitle)}
        ${cardSub([item.authorName, item.bookTitle].filter(Boolean).join(' · '))}
        ${item.description ? cardBody(item.description) : ''}
        ${item.youtubeId ? cardLink(`https://www.youtube.com/watch?v=${esc(item.youtubeId)}`, 'Watch the interview →') : ''}
      `);
    });
  }

  // ── CTA ──
  body += `
    <tr><td style="padding:32px 0 0;text-align:center;">
      <a href="${esc(issueUrl)}" style="display:inline-block;font-family:'Bungee',sans-serif;font-size:13px;letter-spacing:0.06em;color:${P.bg};background:${P.teal};padding:14px 28px;border-radius:8px;text-decoration:none;">
        READ THE FULL ISSUE →
      </a>
      <p style="font-family:'Special Elite',serif;font-size:11px;color:${P.muted};margin-top:10px;">
        <a href="${siteUrl}" style="color:${P.muted};text-decoration:none;">theliteraryroads.com</a>
      </p>
    </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(pullQuoteFirstSentence)} | Literary Roads Gazette ${issueLine(issue)}</title>
<meta name="description" content="${esc(issue?.pullQuote || 'The Literary Roads Gazette')}">
<meta property="og:title" content="Literary Roads Gazette — ${esc(issueLine(issue))}">
<meta property="og:description" content="${esc(issue?.pullQuote || '')}">
<meta property="og:url" content="${esc(issueUrl)}">
<link rel="canonical" href="${esc(issueUrl)}">
</head>
<body style="margin:0;padding:0;background:${P.bg};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${P.bg};">
  <tr><td align="center" style="padding:20px 10px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

      <!-- Masthead -->
      <tr><td style="text-align:center;padding:32px 0 24px;border-bottom:2px solid ${P.teal};">
        <div style="font-family:'Bungee',sans-serif;font-size:26px;color:${P.teal};letter-spacing:0.04em;margin-bottom:6px;">THE LITERARY ROADS GAZETTE</div>
        <div style="font-family:'Special Elite',serif;font-size:12px;color:${P.muted};">${esc(issueLine(issue))}</div>
      </td></tr>

      ${issue?.pullQuote ? `<!-- Pull quote -->
      <tr><td style="padding:20px 0;">
        <div style="padding:18px 22px;background:rgba(64,224,208,0.08);border-left:3px solid ${P.teal};border-radius:8px;">
          <p style="font-family:'Special Elite',serif;font-size:15px;color:${P.cream};line-height:1.7;margin:0;font-style:italic;">"${esc(issue.pullQuote)}"</p>
        </div>
      </td></tr>` : ''}

      ${body}

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
