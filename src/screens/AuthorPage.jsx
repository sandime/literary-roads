import { useState, useEffect, useCallback } from 'react';
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

// ── Cover load helpers (Open Library 1×1 GIF guard) ──────────────────────────
const FALLBACK_COVER = 'https://covers.openlibrary.org/b/id/0-M.jpg';
const onCoverLoad  = e => { if (e.target.naturalWidth <= 1) e.target.src = FALLBACK_COVER; };
const onCoverError = e => { e.target.onerror = null; e.target.src = FALLBACK_COVER; };

// ── AuthorPage ────────────────────────────────────────────────────────────────
export default function AuthorPage() {
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const { user }          = useAuth();
  const stateName         = searchParams.get('state') || '';
  const author            = AUTHOR_TIDBITS[stateName] || null;
  console.log('[AuthorPage] raw state param:', JSON.stringify(searchParams.get('state')));
  console.log('[AuthorPage] full URL:', window.location.href);
  console.log('[AuthorPage] author lookup result:', author ? author.name : 'NOT FOUND');
  const discoveredAuthors = useDiscoveredAuthors(user?.uid);

  const [works,      setWorks]      = useState([]);
  const [landmarks,  setLandmarks]  = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [readNextAdded, setReadNextAdded] = useState(new Set());

  // Check if already saved
  useEffect(() => {
    if (discoveredAuthors.some(a => a.state === stateName)) setSaved(true);
  }, [discoveredAuthors, stateName]);

  // Fetch notable works from Open Library
  useEffect(() => {
    if (!author) return;
    fetch(`https://openlibrary.org/search.json?author=${encodeURIComponent(author.name)}&limit=8&fields=title,cover_i,key,first_publish_year,author_name`)
      .then(r => r.json())
      .then(data => {
        const results = (data.docs || [])
          .filter(b => b.cover_i)
          .slice(0, 6)
          .map(b => ({
            key:       b.key,
            title:     b.title,
            year:      b.first_publish_year,
            coverUrl:  `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`,
          }));
        setWorks(results);
      })
      .catch(() => {});
  }, [author]);

  // Fetch nearby literary landmarks
  useEffect(() => {
    if (!stateName || !STATE_CENTERS[stateName]) return;
    const [sLat, sLng] = STATE_CENTERS[stateName];
    getDocs(collection(db, 'literary_landmarks'))
      .then(snap => {
        const nearby = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(l => typeof l.lat === 'number' && typeof l.lng === 'number')
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
        expandedNarrative: author.tidbit,
        wikipediaUrl:      author.url,
      });
      setSaved(true);
    } catch (e) {
      console.error('[AuthorPage] save error', e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddReadNext = async (work) => {
    if (!user || !work) return;
    const bookId = work.key?.replace(/\//g, '_') || work.title.replace(/\s/g, '_');
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'libraryReadNext', bookId),
        {
          title:          work.title,
          author:         author.name,
          coverUrl:       work.coverUrl,
          recommendedBy:  `Author Page: ${author.name}`,
          placeName:      `${author.name}'s ${stateName}`,
          state:          stateName,
          date:           serverTimestamp(),
          whoWhatWhere:   [work.title, author.name, stateName].join(' · '),
        },
        { merge: true }
      );
      setReadNextAdded(prev => new Set([...prev, bookId]));
    } catch (e) {
      console.error('[AuthorPage] readNext error', e);
    }
  };

  const openMap = () => {
    const base = window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    window.location.href = base;
  };

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

      {/* ── Nav bar ─────────────────────────────────────────────────────────── */}
      <nav style={styles.nav}>
        <button onClick={() => window.close()} style={styles.navBack}>
          ← Back
        </button>
        <span style={styles.navTitle}>Literary Roads / Library</span>
        <button
          onClick={handleSaveAuthor}
          disabled={saved || saving || !user}
          style={{
            ...styles.navSaveBtn,
            opacity:    saved || !user ? 0.55 : 1,
            cursor:     saved || !user ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save author'}
        </button>
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
          <p style={styles.narrative}>{author.tidbit}</p>
          <p style={styles.wikiLink}>
            <a href={author.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
              Read full biography on Wikipedia
            </a>
          </p>
        </section>

        {/* Notable Works */}
        {works.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionHeading}>Notable Works</h2>
            <div style={styles.worksGrid}>
              {works.map(work => {
                const bookId = work.key?.replace(/\//g, '_') || work.title.replace(/\s/g, '_');
                const added  = readNextAdded.has(bookId);
                return (
                  <div key={work.key || work.title} style={styles.workCard}>
                    <div style={styles.coverWrap}>
                      <img
                        src={work.coverUrl}
                        alt={work.title}
                        style={styles.cover}
                        onLoad={onCoverLoad}
                        onError={onCoverError}
                      />
                    </div>
                    <p style={styles.workTitle}>{work.title}</p>
                    {work.year && <p style={styles.workYear}>{work.year}</p>}
                    {user && (
                      <button
                        onClick={() => handleAddReadNext(work)}
                        disabled={added}
                        style={{ ...styles.readNextBtn, opacity: added ? 0.55 : 1, cursor: added ? 'default' : 'pointer' }}
                      >
                        {added ? 'Added' : '+ Read next'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Literary Roads Landmarks Nearby */}
        {landmarks.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionHeading}>Literary Roads Landmarks Nearby</h2>
            <div style={styles.landmarksList}>
              {landmarks.map(l => (
                <button
                  key={l.id}
                  style={styles.landmarkCard}
                  onClick={openMap}
                  title="Open on the map"
                >
                  <p style={styles.landmarkName}>{l.name || l.title}</p>
                  {l.city && <p style={styles.landmarkCity}>{l.city}{l.state ? `, ${l.state}` : ''}</p>}
                  {l.description && (
                    <p style={styles.landmarkDesc}>
                      {l.description.length > 120 ? l.description.slice(0, 120) + '…' : l.description}
                    </p>
                  )}
                  <span style={styles.landmarkCta}>Open on map →</span>
                </button>
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
                  href={`?state=${encodeURIComponent(a.state)}`}
                  style={{
                    ...styles.pill,
                    background: a.state === stateName ? C.coral : 'rgba(44,24,16,0.06)',
                    color:      a.state === stateName ? '#fff' : C.darkBrown,
                    borderColor: a.state === stateName ? C.coral : C.divider,
                  }}
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
  navSaveBtn: {
    fontFamily:    'Bungee, sans-serif',
    fontSize:      10,
    letterSpacing: '0.06em',
    color:         C.coral,
    background:    'transparent',
    border:        `1px solid ${C.coral}`,
    borderRadius:  6,
    padding:       '6px 12px',
    cursor:        'pointer',
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
