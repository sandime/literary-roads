import { useState, useEffect, useRef, forwardRef } from 'react';
import {
  subscribeToStory, addSentence, editSentence,
  MAX_SENTENCES, MAX_CHARS, MAX_TITLE_CHARS,
} from '../utils/hitchhikerStories';

// ── Typewriter hook ───────────────────────────────────────────────────────────
function useTypewriter(text, speed = 28, active = false) {
  const [displayed, setDisplayed] = useState(active ? '' : (text || ''));
  useEffect(() => {
    if (!active) { setDisplayed(text || ''); return; }
    let i = 0;
    setDisplayed('');
    const timer = setInterval(() => {
      i++;
      setDisplayed((text || '').slice(0, i));
      if (i >= (text || '').length) clearInterval(timer);
    }, 1000 / speed);
    return () => clearInterval(timer);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  return displayed;
}

// ── Paper noise texture overlay ───────────────────────────────────────────────
function NoiseOverlay() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, borderRadius: 2, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
}

// ── Paper container ───────────────────────────────────────────────────────────
const Paper = forwardRef(function Paper({ children, onScroll, style = {} }, ref) {
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      style={{
        background: '#FFF8E7',
        borderRadius: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2), inset 0 0 60px rgba(0,0,0,0.03)',
        margin: '0 16px',
        padding: '24px 20px',
        minHeight: 220,
        maxHeight: 'calc(52vh - 60px)',
        overflowY: 'auto',
        position: 'relative',
        ...style,
      }}
    >
      <NoiseOverlay />
      {children}
    </div>
  );
});

// ── Animated title (typewriter effect on paper) ───────────────────────────────
function TypewriterTitle({ text }) {
  const displayed = useTypewriter(text, 22, true);
  return (
    <>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(26,27,46,0.15)', margin: '0 0 12px' }} />
      <h3 style={{
        fontFamily: "'Special Elite', cursive",
        fontSize: 18, color: '#FF4E00', textAlign: 'center',
        lineHeight: 1.4, margin: '0 0 12px', paddingBottom: 12,
        borderBottom: '1px solid rgba(26,27,46,0.15)',
        minHeight: 26,
      }}>
        {displayed}
      </h3>
    </>
  );
}

// ── Single contribution row ───────────────────────────────────────────────────
function ContributionRow({ sentence, isOwn, isNew, isFull, onEdit }) {
  const displayed = useTypewriter(sentence.text, 28, isNew);

  return (
    <div>
      <p style={{
        fontFamily: "'Courier Prime', monospace",
        fontSize: 14, color: '#2a2a2a', lineHeight: 1.8,
        margin: '0 0 4px', wordBreak: 'break-word',
      }}>
        {displayed}
        {sentence.editedAt && (
          <span style={{ fontSize: 9, color: 'rgba(26,27,46,0.28)', marginLeft: 4 }}>(edited)</span>
        )}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: "'Courier Prime', monospace",
          fontSize: 10, color: 'rgba(26,27,46,0.38)',
          fontStyle: 'italic',
        }}>
          — {sentence.userName}
        </span>
        {isOwn && !isFull && (
          <button
            onClick={onEdit}
            title="Edit your contribution"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '1px 4px', lineHeight: 1, borderRadius: 2,
              color: 'rgba(26,27,46,0.35)', fontSize: 11,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#FF4E00'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(26,27,46,0.35)'}
          >✎</button>
        )}
      </div>
    </div>
  );
}

// ── Divider between contributions ─────────────────────────────────────────────
const Divider = () => (
  <div style={{ textAlign: 'center', color: 'rgba(26,27,46,0.28)', fontSize: 12, margin: '12px 0', userSelect: 'none' }}>✦</div>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function HitchhikerTale({ locationId, locationName, user, onShowLogin }) {
  const [story, setStory]               = useState(undefined);
  const [inputText, setInputText]       = useState('');
  const [titleInput, setTitleInput]     = useState('');
  const [titleStep, setTitleStep]       = useState(1); // 1=enter title, 2=first sentence
  const [typedTitle, setTypedTitle]     = useState(''); // committed title for typewriter
  const [newIdx, setNewIdx]             = useState(null); // index of just-submitted sentence
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText]         = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError]       = useState('');
  const [scrollTop, setScrollTop]       = useState(0);
  const paperRef = useRef(null);

  useEffect(() => subscribeToStory(locationId, setStory), [locationId]);

  useEffect(() => {
    setInputText(''); setTitleInput(''); setTitleStep(1); setTypedTitle('');
    setNewIdx(null); setEditingIndex(null); setError('');
  }, [locationId]);

  const scrollToTop = () => paperRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const handleSubmit = async () => {
    if (!user) { onShowLogin?.(); return; }
    const text = inputText.trim();
    if (!text || text.length > MAX_CHARS) return;
    setSubmitting(true); setError('');
    try {
      const idxBefore = story?.sentences?.length ?? 0;
      await addSentence(locationId, locationName, text, user, typedTitle || titleInput.trim() || undefined);
      setNewIdx(idxBefore);
      setInputText(''); setTitleInput(''); setTypedTitle(''); setTitleStep(1);
      setTimeout(() => {
        if (paperRef.current) paperRef.current.scrollTo({ top: paperRef.current.scrollHeight, behavior: 'smooth' });
      }, 200);
      setTimeout(() => setNewIdx(null), text.length * (1000 / 28) + 1000);
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = async (index) => {
    const text = editText.trim();
    if (!text || text.length > MAX_CHARS) return;
    setEditSubmitting(true); setEditError('');
    try {
      await editSentence(locationId, index, text, user.uid);
      setEditingIndex(null);
    } catch (err) {
      setEditError(err.message || 'Could not save edit.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Shared composer ─────────────────────────────────────────────────────────
  const renderComposer = (creating) => {
    const isFull = (story?.sentenceCount ?? 0) >= MAX_SENTENCES;
    const remaining = MAX_CHARS - inputText.length;

    if (isFull) return (
      <div style={{ padding: '12px 16px' }}>
        <p style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12, color: 'rgba(245,245,220,0.38)', textAlign: 'center', fontStyle: 'italic', margin: 0 }}>
          This tale has reached its full length. What a journey!
        </p>
      </div>
    );

    if (!user) return (
      <div style={{ padding: '12px 16px' }}>
        <button
          onClick={onShowLogin}
          style={{ width: '100%', fontFamily: "'Courier Prime', monospace", fontSize: 12, color: 'rgba(245,245,220,0.45)', background: 'rgba(255,248,231,0.04)', border: '1px dashed rgba(255,248,231,0.18)', borderRadius: 2, padding: '12px', cursor: 'pointer', letterSpacing: '0.02em' }}
        >Sign in to {creating ? 'start the tale' : 'add to the story'} →</button>
      </div>
    );

    return (
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,248,231,0.08)' }}>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder={creating ? 'Begin the tale...' : 'Continue the tale...'}
          rows={3}
          style={{
            width: '100%', fontFamily: "'Courier Prime', monospace", fontSize: 14,
            color: '#FFF8E7', background: 'rgba(255,248,231,0.06)',
            border: '1px solid rgba(255,248,231,0.15)', borderRadius: 2,
            padding: '10px 12px', resize: 'none', boxSizing: 'border-box', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 12 }}>
          <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 11, color: remaining < 20 ? '#FF4E00' : 'rgba(245,245,220,0.32)', flexShrink: 0 }}>
            {remaining} characters remaining
          </span>
          {error && <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 10, color: '#DC2626', flex: 1, textAlign: 'center' }}>{error}</span>}
          <button
            onClick={handleSubmit}
            disabled={submitting || !inputText.trim()}
            style={{
              fontFamily: "'Courier Prime', monospace", fontSize: 12,
              background: '#FF4E00', color: '#1A1B2E',
              border: 'none', borderRadius: 2, padding: '8px 14px',
              cursor: (submitting || !inputText.trim()) ? 'default' : 'pointer',
              letterSpacing: '1px', opacity: (submitting || !inputText.trim()) ? 0.5 : 1,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >{submitting ? 'saving...' : creating ? 'Start the tale →' : 'Add to the tale →'}</button>
        </div>
      </div>
    );
  };

  // ── Inline edit form (on the paper) ─────────────────────────────────────────
  const renderEditForm = (index) => (
    <div>
      <textarea
        value={editText}
        onChange={e => setEditText(e.target.value.slice(0, MAX_CHARS))}
        rows={3}
        autoFocus
        style={{
          width: '100%', fontFamily: "'Courier Prime', monospace", fontSize: 13,
          color: '#2a2a2a', background: 'rgba(26,27,46,0.07)',
          border: '1px solid rgba(26,27,46,0.22)', borderRadius: 2,
          padding: '8px 10px', resize: 'none', boxSizing: 'border-box', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
        {editError && <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 10, color: '#DC2626', flex: 1 }}>{editError}</span>}
        <button onClick={() => setEditingIndex(null)} style={{ fontFamily: "'Courier Prime', monospace", fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(26,27,46,0.4)' }}>cancel</button>
        <button
          onClick={() => handleEditSave(index)}
          disabled={editSubmitting || !editText.trim()}
          style={{ fontFamily: "'Courier Prime', monospace", fontSize: 10, background: '#FF4E00', color: '#FFF8E7', border: 'none', borderRadius: 2, padding: '4px 10px', cursor: 'pointer', opacity: editSubmitting ? 0.6 : 1 }}
        >{editSubmitting ? 'saving...' : 'save'}</button>
      </div>
    </div>
  );

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (story === undefined) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
        <div style={{ width: 20, height: 20, border: '2px solid #FF4E00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const isNewStory = story === null;
  const sentences  = story?.sentences || [];
  const count      = story?.sentenceCount || 0;
  const isFull     = count >= MAX_SENTENCES;

  // ── No story — step 1: title entry ─────────────────────────────────────────
  if (isNewStory && user && titleStep === 1) {
    return (
      <div>
        <Paper ref={paperRef}>
          <div style={{ textAlign: 'center', padding: '20px 0 12px' }}>
            <p style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12, color: 'rgba(26,27,46,0.38)', marginBottom: 16, letterSpacing: '0.04em' }}>
              Give this tale a title:
            </p>
            <input
              type="text"
              value={titleInput}
              onChange={e => setTitleInput(e.target.value.slice(0, MAX_TITLE_CHARS))}
              placeholder="The Night the Shelves Whispered..."
              autoFocus
              style={{
                fontFamily: "'Courier Prime', monospace", fontSize: 14,
                color: '#2a2a2a', background: 'transparent',
                border: 'none', borderBottom: '1px solid rgba(26,27,46,0.22)',
                textAlign: 'center', width: '90%', padding: '4px 0', outline: 'none',
              }}
            />
          </div>
        </Paper>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: '14px 16px 0' }}>
          <button
            onClick={() => setTitleStep(2)}
            style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,245,220,0.38)' }}
          >Skip</button>
          <button
            onClick={() => { setTypedTitle(titleInput.trim()); setTitleStep(2); }}
            style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12, background: '#FF4E00', color: '#1A1B2E', border: 'none', borderRadius: 2, padding: '7px 18px', cursor: 'pointer', letterSpacing: '0.04em' }}
          >Next →</button>
        </div>
      </div>
    );
  }

  // ── No story — step 2 (or not logged in) ────────────────────────────────────
  if (isNewStory) {
    return (
      <div>
        <Paper ref={paperRef}>
          {typedTitle
            ? <TypewriterTitle text={typedTitle} />
            : (
              <div style={{ textAlign: 'center', padding: '36px 0 20px' }}>
                <p style={{ fontFamily: "'Courier Prime', monospace", fontSize: 13, color: 'rgba(26,27,46,0.38)', fontStyle: 'italic', lineHeight: 1.9, margin: 0 }}>
                  No tale has been started here.<br />Be the first to write one.
                </p>
              </div>
            )
          }
        </Paper>
        {renderComposer(true)}
      </div>
    );
  }

  // ── Existing story ──────────────────────────────────────────────────────────
  return (
    <div>
      <Paper ref={paperRef} onScroll={e => setScrollTop(e.target.scrollTop)}>

        {scrollTop > 100 && (
          <button
            onClick={scrollToTop}
            style={{ position: 'absolute', top: 10, right: 14, fontFamily: "'Courier Prime', monospace", fontSize: 16, color: 'rgba(26,27,46,0.26)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1, zIndex: 5 }}
            title="Back to top"
          >↑</button>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid rgba(26,27,46,0.15)', margin: '0 0 12px' }} />
        <h3 style={{
          fontFamily: "'Special Elite', cursive",
          fontSize: 18, color: '#FF4E00', textAlign: 'center',
          lineHeight: 1.4, margin: '0 0 12px', paddingBottom: 12,
          borderBottom: '1px solid rgba(26,27,46,0.15)',
        }}>
          {story.title}
        </h3>

        {sentences.map((s, i) => (
          <div key={`${i}-${s.timestamp}`}>
            {i > 0 && <Divider />}
            {editingIndex === i
              ? renderEditForm(i)
              : (
                <ContributionRow
                  sentence={s}
                  isOwn={user?.uid === s.userId}
                  isNew={newIdx === i}
                  isFull={isFull}
                  onEdit={() => { setEditingIndex(i); setEditText(s.text); setEditError(''); }}
                />
              )
            }
          </div>
        ))}

        <div style={{ height: 8 }} />
      </Paper>

      {renderComposer(false)}
    </div>
  );
}
