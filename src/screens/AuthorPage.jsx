import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { AUTHOR_TIDBITS, STATE_CENTERS } from '../data/authorTidbits';
import { addDiscoveredAuthor, useDiscoveredAuthors } from '../utils/discoveredAuthors';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  cream:    '#FFF8E7',
  coral:    '#FF6B7A',
  gold:     '#F5A623',
  darkBrown:'#2C1810',
  midBrown: '#6B4226',
  mutedBrown:'#9B7B6B',
  divider:  'rgba(44,24,16,0.12)',
  cardBg:   '#FFFDF5',
  turquoise:'#40E0D0',
  orange:   '#FF4E00',
};

// ── Haversine distance (miles) ────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Module-level cover cache (survives remounts within session) ───────────────
const coversCache = {};

// ── SkeletonCard ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ flexShrink: 0, width: 90, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ width: 90, height: 130, borderRadius: 3, background: 'rgba(44,24,16,0.1)', animation: 'lr-pulse 1.4s ease-in-out infinite' }}/>
      <div style={{ height: 9, borderRadius: 2, background: 'rgba(44,24,16,0.07)', animation: 'lr-pulse 1.4s ease-in-out 0.15s infinite' }}/>
      <div style={{ height: 9, width: '70%', borderRadius: 2, background: 'rgba(44,24,16,0.07)', animation: 'lr-pulse 1.4s ease-in-out 0.3s infinite' }}/>
      <div style={{ height: 44 }}/>
    </div>
  );
}

// ── BookCard ──────────────────────────────────────────────────────────────────
function BookCard({ title, coverUrl, added, user, onAddReadNext }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !coverUrl || imgFailed;
  return (
    <div style={{ flexShrink: 0, width: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 90, height: 130, borderRadius: 3, overflow: 'hidden', boxShadow: '0 2px 8px rgba(44,24,16,0.2)', background: '#FFF8E7' }}>
        <img
          src={showPlaceholder ? `${import.meta.env.BASE_URL}images/author-cat.png` : coverUrl}
          alt={title}
          style={{ width: '100%', height: '100%', objectFit: showPlaceholder ? 'contain' : 'cover', display: 'block' }}
          onError={() => setImgFailed(true)}
          onLoad={e => { if (!showPlaceholder && e.currentTarget.naturalWidth <= 1) setImgFailed(true); }}
        />
      </div>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#2C1810', textAlign: 'center', margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%' }}>
        {title}
      </p>
      {user && (
        <button
          onClick={onAddReadNext}
          disabled={added}
          style={{ width: '100%', minHeight: 44, marginTop: 'auto', fontFamily: 'Special Elite, serif', fontSize: 10, color: added ? '#9B7B6B' : '#fff', background: added ? 'transparent' : '#FF4E00', border: added ? '1px solid rgba(155,123,107,0.4)' : 'none', borderRadius: 20, padding: '6px 4px', cursor: added ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {added ? '✓ In List' : '+ Read Next'}
        </button>
      )}
    </div>
  );
}

// ── AuthorPage ────────────────────────────────────────────────────────────────
export default function AuthorPage() {
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const { user }          = useAuth();
  const stateName         = searchParams.get('state') || '';
  const authorName        = searchParams.get('author') || '';
  const authorList        = AUTHOR_TIDBITS[stateName] || [];
  const author            = authorName
    ? (authorList.find(a => a.name === authorName) || authorList[0] || null)
    : (authorList[0] || null);
  const discoveredAuthors = useDiscoveredAuthors(user?.uid);

  const [covers,        setCovers]        = useState({});
  const [coversLoading, setCoversLoading] = useState(true);
  const [landmarks,     setLandmarks]     = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [readNextAdded, setReadNextAdded] = useState(new Set());

  // Check if already saved
  useEffect(() => {
    if (author && discoveredAuthors.some(a => a.state === stateName && a.name === author.name)) setSaved(true);
  }, [discoveredAuthors, stateName, author]);

  // Fetch per-title covers from Open Library in parallel
  useEffect(() => {
    if (!author?.books?.length) { setCoversLoading(false); return; }
    if (coversCache[author.name]) {
      setCovers(coversCache[author.name]);
      setCoversLoading(false);
      return;
    }
    setCoversLoading(true);
    Promise.all(
      author.books.map(title =>
        fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author.name)}&limit=1&fields=cover_i`)
          .then(r => r.json())
          .then(data => {
            const coverId = data.docs?.[0]?.cover_i;
            return [title, coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null];
          })
          .catch(() => [title, null])
      )
    ).then(entries => {
      const map = Object.fromEntries(entries);
      coversCache[author.name] = map;
      setCovers(map);
      setCoversLoading(false);
    });
  }, [author]);

  // Fetch nearby literary landmarks
  useEffect(() => {
    if (!stateName || !STATE_CENTERS[stateName]) return;
    const [sLat, sLng] = STATE_CENTERS[stateName];
    getDocs(collection(db, 'literary_landmarks'))
      .then(snap => {
        const nearby = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(l => !l.deleted && typeof l.lat === 'number' && typeof l.lng === 'number')
          .map(l => ({ ...l, dist: haversine(sLat, sLng, l.lat, l.lng) }))
          .filter(l => l.dist <= 200)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 3);
        setLandmarks(nearby);
      })
      .catch(() => {});
  }, [stateName]);

  const handleSaveAuthor = async () => {
    if (!user || saved || saving || !author) return;
    setSaving(true);
    try {
      await addDiscoveredAuthor(user.uid, {
        name:              author.name,
        state:             stateName,
        hookLine:          author.tidbit,
        expandedNarrative: author.expandedNarrative || author.tidbit,
        wikipediaUrl:      author.url,
      });
      setSaved(true);
    } catch (e) {
      console.error('[AuthorPage] save error', e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddReadNext = async (title, coverUrl) => {
    if (!user || !title) return;
    const bookId = title.replace(/\s+/g, '_');
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'libraryReadNext', bookId),
        {
          title,
          author:         author.name,
          coverUrl:       coverUrl || null,
          recommendedBy:  `Author Page: ${author.name}`,
          placeName:      `${author.name}'s ${stateName}`,
          state:          stateName,
          date:           serverTimestamp(),
          whoWhatWhere:   [title, author.name, stateName].join(' · '),
        },
        { merge: true }
      );
      setReadNextAdded(prev => new Set([...prev, title]));
    } catch (e) {
      console.error('[AuthorPage] readNext error', e);
    }
  };

  const appBase = window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  // Navigate to the map directly — back() is unreliable here because history may contain
  // Library or other intermediate entries depending on how the user arrived.
  const openMap = () => { sessionStorage.setItem('lr_odometer_done', '1'); navigate('/'); };
  const landmarkHref = (id) => `${appBase}/#/?landmark=${encodeURIComponent(id)}`;

  if (!author) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Special Elite, serif', color: C.mutedBrown, fontSize: 16 }}>
          Author not found.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        .lr-book-scroll::-webkit-scrollbar{display:none}
        .lr-book-scroll{scrollbar-width:none}
        @keyframes lr-pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>

      {/* ── Nav bar ─────────────────────────────────────────────────────────── */}
      <nav style={styles.nav}>
        <button onClick={openMap} style={styles.navBack}>
          ← Map
        </button>
        <span style={styles.navTitle}>Literary Roads / Library</span>
        <div style={styles.navLinks}>
          <a href="#/library" style={styles.navLink}>Library</a>
          <a href="#/newspaper/current" style={styles.navLink}>Gazette</a>
        </div>
      </nav>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={styles.body}>

        {/* Trapezoid echo — Atomic Orange state banner */}
        <div style={styles.trapWrap}>
          <div style={styles.trap}>
            <span style={styles.trapText}>{stateName.toUpperCase()}</span>
          </div>
        </div>

        {/* State + context line */}
        <p style={styles.contextLine}>
          {stateName.toUpperCase()} &nbsp;·&nbsp; LITERARY VOICES
        </p>

        {/* Author name */}
        <h1 style={styles.authorName}>{author.name}</h1>

        {/* Hook line */}
        <p style={styles.hookLine}>{author.tidbit}</p>

        <div style={styles.divider} />

        {/* The Story */}
        <section style={styles.section}>
          <h2 style={styles.sectionHeading}>The Story</h2>
          <p style={styles.narrative}>{author.expandedNarrative || author.tidbit}</p>
          <p style={styles.wikiLink}>
            <a href={author.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
              Read full biography on Wikipedia
            </a>
          </p>
        </section>

        {/* Notable Works — horizontal scroll row with Open Library covers */}
        {author.books && author.books.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionHeading}>Notable Works</h2>
            <div
              className="lr-book-scroll"
              style={{
                display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8,
                marginLeft: '-20px', marginRight: '-20px',
                paddingLeft: '20px', paddingRight: '20px',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {coversLoading
                ? author.books.map((_, i) => <SkeletonCard key={i} />)
                : author.books.map((title, i) => (
                    <BookCard
                      key={i}
                      title={title}
                      coverUrl={covers[title] || null}
                      added={readNextAdded.has(title)}
                      user={user}
                      onAddReadNext={() => handleAddReadNext(title, covers[title] || null)}
                    />
                  ))
              }
            </div>
          </section>
        )}

        {/* Literary Roads Landmarks Nearby */}
        {landmarks.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionHeading}>Literary Roads Landmarks Nearby</h2>
            <div style={styles.landmarksList}>
              {landmarks.map(l => (
                <a
                  key={l.id}
                  href={landmarkHref(l.id)}
                  style={{ ...styles.landmarkCard, textDecoration: 'none' }}
                >
                  <p style={styles.landmarkName}>{l.name || l.title}</p>
                  {l.city && <p style={styles.landmarkCity}>{l.city}{l.state ? `, ${l.state}` : ''}</p>}
                  {l.description && (
                    <p style={styles.landmarkDesc}>
                      {l.description.length > 120 ? l.description.slice(0, 120) + '…' : l.description}
                    </p>
                  )}
                  <span style={styles.landmarkCta}>Open on map →</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <div style={styles.divider} />

        {/* Primary CTA */}
        <section style={{ ...styles.section, textAlign: 'center' }}>
          <button
            onClick={handleSaveAuthor}
            disabled={saved || saving || !user}
            style={{
              ...styles.primaryBtn,
              opacity: saved || !user ? 0.55 : 1,
              cursor:  saved || !user ? 'default' : 'pointer',
            }}
          >
            {!user
              ? 'Sign in to save authors'
              : saving
                ? 'Saving...'
                : saved
                  ? `${author.name} is in your collection`
                  : `Add ${author.name} to my authors`}
          </button>

          <button onClick={openMap} style={styles.secondaryBtn}>
            Explore {stateName} on the map
          </button>
        </section>

        {/* Discovered authors strip */}
        {discoveredAuthors.length > 0 && (
          <section style={{ ...styles.section, paddingBottom: 40 }}>
            <h2 style={styles.sectionHeading}>Authors You've Discovered</h2>
            <div style={styles.discoveredStrip}>
              {discoveredAuthors.map(a => (
                <a
                  key={a.id}
                  href={`#/author?state=${encodeURIComponent(a.state)}`}
                  style={{
                    ...styles.pill,
                    background: a.state === stateName ? C.coral : 'rgba(44,24,16,0.06)',
                    color:      a.state === stateName ? '#fff' : C.darkBrown,
                    borderColor: a.state === stateName ? C.coral : C.divider,
                  }}
                  onClick={(e) => { e.preventDefault(); navigate(`/author?state=${encodeURIComponent(a.state)}`); }}
                >
                  <span style={styles.pillName}>{a.name}</span>
                  <span style={styles.pillState}>{a.state}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight:   '100vh',
    height:      'auto',
    overflowY:   'auto',
    background:  C.cream,
    color:       C.darkBrown,
    fontFamily:  'Georgia, serif',
    position:    'fixed',
    inset:       0,
  },

  // Nav
  nav: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '14px 20px',
    background:      '#FFF3D4',
    borderBottom:    `1px solid ${C.divider}`,
    position:        'sticky',
    top:             0,
    zIndex:          100,
  },
  navBack: {
    background:    'transparent',
    border:        'none',
    fontFamily:    'Special Elite, serif',
    fontSize:      14,
    color:         C.coral,
    cursor:        'pointer',
    padding:       0,
  },
  navTitle: {
    fontFamily:    'Bungee, sans-serif',
    fontSize:      11,
    color:         C.mutedBrown,
    letterSpacing: '0.08em',
    textAlign:     'center',
    flex:          1,
    margin:        '0 12px',
  },
  navLinks: {
    display:    'flex',
    gap:        '14px',
    alignItems: 'center',
    flexShrink: 0,
  },
  navLink: {
    fontFamily:    'Special Elite, serif',
    fontSize:      12,
    color:         C.mutedBrown,
    textDecoration: 'none',
    letterSpacing: '0.04em',
    whiteSpace:    'nowrap',
  },

  // Body
  body: {
    maxWidth:  640,
    margin:    '0 auto',
    padding:   '0 20px 40px',
  },

  // Trapezoid
  trapWrap: {
    marginTop: 32,
    marginBottom: 8,
  },
  trap: {
    display:    'inline-block',
    background: C.orange,
    clipPath:   'polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)',
    padding:    '6px 28px 6px 18px',
  },
  trapText: {
    fontFamily:    'Bungee, sans-serif',
    fontSize:      11,
    color:         '#FFF8E7',
    letterSpacing: '0.12em',
  },

  // Header block
  contextLine: {
    fontFamily:    'Special Elite, serif',
    fontSize:      11,
    color:         C.turquoise,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    margin:        '16px 0 8px',
  },
  authorName: {
    fontFamily:    'Georgia, serif',
    fontSize:      'clamp(28px, 6vw, 42px)',
    fontWeight:    700,
    color:         C.darkBrown,
    margin:        '0 0 16px',
    lineHeight:    1.15,
  },
  hookLine: {
    fontFamily:  'Georgia, serif',
    fontSize:    18,
    fontStyle:   'italic',
    color:       C.coral,
    lineHeight:  1.6,
    margin:      '0 0 28px',
  },
  divider: {
    height:      1,
    background:  C.divider,
    margin:      '32px 0',
  },

  // Sections
  section: {
    marginBottom: 36,
  },
  sectionHeading: {
    fontFamily:    'Bungee, sans-serif',
    fontSize:      12,
    color:         C.gold,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    margin:        '0 0 16px',
  },
  narrative: {
    fontFamily:  'Georgia, serif',
    fontSize:    16,
    lineHeight:  1.8,
    color:       C.darkBrown,
    margin:      '0 0 12px',
  },
  wikiLink: {
    margin: '8px 0 0',
  },
  link: {
    fontFamily:          'Special Elite, serif',
    fontSize:            13,
    color:               C.coral,
    textDecoration:      'underline',
    textUnderlineOffset: '3px',
  },

  // Works grid
  worksGrid: {
    display:               'grid',
    gridTemplateColumns:   'repeat(auto-fill, minmax(100px, 1fr))',
    gap:                   16,
  },
  workCard: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    textAlign:     'center',
  },
  coverWrap: {
    width:        90,
    height:       128,
    borderRadius: 4,
    overflow:     'hidden',
    border:       `1px solid ${C.divider}`,
    background:   '#EEE8D5',
    marginBottom: 8,
    flexShrink:   0,
  },
  cover: {
    width:      '100%',
    height:     '100%',
    objectFit:  'cover',
  },
  workTitle: {
    fontFamily: 'Georgia, serif',
    fontSize:   12,
    color:      C.darkBrown,
    lineHeight: 1.4,
    margin:     '0 0 2px',
    fontWeight: 600,
  },
  workYear: {
    fontFamily: 'Special Elite, serif',
    fontSize:   11,
    color:      C.mutedBrown,
    margin:     '0 0 6px',
  },
  readNextBtn: {
    fontFamily:    'Special Elite, serif',
    fontSize:      11,
    color:         C.coral,
    background:    'transparent',
    border:        `1px solid ${C.coral}`,
    borderRadius:  4,
    padding:       '3px 8px',
    cursor:        'pointer',
    marginTop:     'auto',
  },

  // Landmarks
  landmarksList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           12,
  },
  landmarkCard: {
    background:    C.cardBg,
    border:        `1px solid ${C.divider}`,
    borderRadius:  10,
    padding:       '14px 16px',
    textAlign:     'left',
    cursor:        'pointer',
    width:         '100%',
    transition:    'box-shadow 0.15s',
  },
  landmarkName: {
    fontFamily: 'Bungee, sans-serif',
    fontSize:   13,
    color:      C.darkBrown,
    margin:     '0 0 4px',
    letterSpacing: '0.03em',
  },
  landmarkCity: {
    fontFamily:    'Special Elite, serif',
    fontSize:      11,
    color:         C.turquoise,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    margin:        '0 0 6px',
  },
  landmarkDesc: {
    fontFamily: 'Georgia, serif',
    fontSize:   13,
    color:      C.midBrown,
    lineHeight: 1.5,
    margin:     '0 0 8px',
  },
  landmarkCta: {
    fontFamily:    'Special Elite, serif',
    fontSize:      11,
    color:         C.coral,
    letterSpacing: '0.04em',
  },

  // CTAs
  primaryBtn: {
    display:       'block',
    width:         '100%',
    fontFamily:    'Bungee, sans-serif',
    fontSize:      14,
    letterSpacing: '0.06em',
    color:         '#fff',
    background:    C.coral,
    border:        'none',
    borderRadius:  10,
    padding:       '16px 24px',
    cursor:        'pointer',
    marginBottom:  12,
    textAlign:     'center',
  },
  secondaryBtn: {
    display:       'block',
    width:         '100%',
    fontFamily:    'Bungee, sans-serif',
    fontSize:      12,
    letterSpacing: '0.06em',
    color:         C.midBrown,
    background:    'transparent',
    border:        `1px solid ${C.divider}`,
    borderRadius:  10,
    padding:       '14px 24px',
    cursor:        'pointer',
    textAlign:     'center',
  },

  // Discovered strip
  discoveredStrip: {
    display:        'flex',
    gap:            8,
    flexWrap:       'wrap',
  },
  pill: {
    display:        'flex',
    alignItems:     'center',
    gap:            6,
    border:         '1px solid',
    borderRadius:   20,
    padding:        '5px 12px',
    textDecoration: 'none',
    transition:     'opacity 0.15s',
  },
  pillName: {
    fontFamily:    'Bungee, sans-serif',
    fontSize:      10,
    letterSpacing: '0.04em',
  },
  pillState: {
    fontFamily:  'Special Elite, serif',
    fontSize:    9,
    opacity:     0.6,
    letterSpacing: '0.06em',
  },
};
