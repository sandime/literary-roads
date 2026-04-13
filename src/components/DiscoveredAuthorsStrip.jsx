import { useState, useEffect } from 'react';
import { subscribeToDiscoveredAuthors } from '../utils/discoveredAuthors';

// Horizontal scrollable strip of author pills — shown in state-selection mode.
// Reads live from users/{uid}/discoveredAuthors.
export default function DiscoveredAuthorsStrip({ user, onAuthorClick }) {
  const [authors, setAuthors] = useState([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDiscoveredAuthors(user.uid, setAuthors);
    return unsub;
  }, [user]);

  if (!user || authors.length === 0) return null;

  return (
    <div style={styles.wrapper}>
      <p style={styles.label}>YOUR AUTHORS</p>
      <div style={styles.strip}>
        {authors.map(a => (
          <button
            key={a.id}
            style={styles.pill}
            onClick={() => onAuthorClick?.(a)}
          >
            <span style={styles.pillName}>{a.name}</span>
            <span style={styles.pillState}>{a.state}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position:   'absolute',
    bottom:     '16px',
    left:       '16px',
    right:      '16px',
    zIndex:     1000,
    pointerEvents: 'none',
  },
  label: {
    fontFamily:    'Bungee, sans-serif',
    fontSize:      '9px',
    color:         'rgba(245,245,220,0.35)',
    letterSpacing: '0.12em',
    margin:        '0 0 6px 2px',
  },
  strip: {
    display:         'flex',
    gap:             '8px',
    overflowX:       'auto',
    scrollbarWidth:  'none',
    pointerEvents:   'auto',
    paddingBottom:   '2px',
  },
  pill: {
    display:       'flex',
    alignItems:    'center',
    gap:           '6px',
    background:    'rgba(26,27,46,0.88)',
    border:        '1px solid rgba(64,224,208,0.35)',
    borderRadius:  '20px',
    padding:       '5px 12px 5px 10px',
    cursor:        'pointer',
    whiteSpace:    'nowrap',
    flexShrink:    0,
    backdropFilter: 'blur(8px)',
  },
  pillName: {
    fontFamily:    'Bungee, sans-serif',
    fontSize:      '10px',
    color:         '#40E0D0',
    letterSpacing: '0.04em',
  },
  pillState: {
    fontFamily:  'Special Elite, serif',
    fontSize:    '9px',
    color:       'rgba(245,245,220,0.45)',
    letterSpacing: '0.06em',
  },
};
