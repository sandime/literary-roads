import { useState, useEffect } from 'react';
import { addDiscoveredAuthor, isAuthorDiscovered } from '../utils/discoveredAuthors';

// Full-screen author card modal — opened when user clicks a tidbit trapezoid.
// Shows name, hook line, expanded narrative, Wikipedia link, and "Add to my authors" button.
export default function AuthorCardModal({ author, stateName, user, onClose }) {
  const [saved,   setSaved]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [checked, setChecked] = useState(false);

  // Check if this author is already in the user's collection
  useEffect(() => {
    if (!user) { setChecked(true); return; }
    isAuthorDiscovered(user.uid, stateName)
      .then(found => { setSaved(found); setChecked(true); })
      .catch(() => setChecked(true));
  }, [user, stateName]);

  const handleAdd = async () => {
    if (!user || saved || saving) return;
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
    } catch (err) {
      console.error('[AuthorCard] save error', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={styles.backdrop}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <p style={styles.stateLabel}>{stateName}</p>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Author name */}
        <h2 style={styles.name}>{author.name}</h2>

        {/* Hook line */}
        <p style={styles.hookLine}>{author.tidbit}</p>

        {/* Actions */}
        <div style={styles.actions}>
          <a
            href={author.url}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.wikiLink}
          >
            Read on Wikipedia
          </a>

          {checked && (
            user ? (
              <button
                onClick={handleAdd}
                disabled={saved || saving}
                style={{
                  ...styles.addBtn,
                  opacity:         saved || saving ? 0.6 : 1,
                  cursor:          saved || saving ? 'default' : 'pointer',
                  background:      saved ? 'rgba(64,224,208,0.15)' : '#FF4E00',
                  color:           saved ? '#40E0D0' : '#1A1B2E',
                  border:          saved ? '1px solid #40E0D0' : 'none',
                }}
              >
                {saving ? 'Saving...' : saved ? 'In your collection' : 'Add to my authors'}
              </button>
            ) : (
              <p style={styles.signInNote}>Sign in to save authors to your collection.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position:       'fixed',
    inset:          0,
    zIndex:         2000,
    background:     'rgba(0,0,0,0.72)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '16px',
  },
  card: {
    background:   '#1A1B2E',
    border:       '1px solid rgba(64,224,208,0.35)',
    borderRadius: '12px',
    padding:      '28px 24px 24px',
    maxWidth:     '420px',
    width:        '100%',
    boxShadow:    '0 0 32px rgba(64,224,208,0.15)',
  },
  header: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   '12px',
  },
  stateLabel: {
    fontFamily:    'Special Elite, serif',
    fontSize:      '11px',
    color:         'rgba(245,245,220,0.45)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    margin:        0,
  },
  closeBtn: {
    background:  'transparent',
    border:      'none',
    color:       'rgba(245,245,220,0.4)',
    fontSize:    '16px',
    cursor:      'pointer',
    padding:     '0 0 0 12px',
    lineHeight:  1,
  },
  name: {
    fontFamily:    'Bungee, sans-serif',
    fontSize:      '22px',
    color:         '#40E0D0',
    letterSpacing: '0.04em',
    margin:        '0 0 16px',
  },
  hookLine: {
    fontFamily:  'Special Elite, serif',
    fontSize:    '15px',
    color:       'rgba(245,245,220,0.85)',
    lineHeight:  1.65,
    margin:      '0 0 28px',
  },
  actions: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '12px',
  },
  wikiLink: {
    fontFamily:    'Special Elite, serif',
    fontSize:      '13px',
    color:         '#40E0D0',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
  },
  addBtn: {
    fontFamily:    'Bungee, sans-serif',
    fontSize:      '13px',
    letterSpacing: '0.06em',
    padding:       '12px 20px',
    borderRadius:  '8px',
    textAlign:     'center',
    transition:    'opacity 0.2s',
  },
  signInNote: {
    fontFamily: 'Special Elite, serif',
    fontSize:   '13px',
    color:      'rgba(245,245,220,0.45)',
    margin:     0,
  },
};
