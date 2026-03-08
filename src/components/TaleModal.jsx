import { useState, useEffect, useRef } from 'react';
import { subscribeToStory, addSentence, editSentence, MAX_SENTENCES, MAX_CHARS, MAX_TITLE_CHARS } from '../utils/hitchhikerStories';

const relativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5)   return `${w}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export default function TaleModal({ locationId, locationName, user, onShowLogin, onClose }) {
  const [story, setStory] = useState(undefined);
  const [titleInput, setTitleInput] = useState('');
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeToStory(locationId, setStory);
    return unsub;
  }, [locationId]);

  // Submit handler — handles both "create new story" and "append sentence"
  const handleSubmit = async () => {
    if (!user) { onShowLogin?.(); return; }
    const text = inputText.trim();
    if (!text || text.length > MAX_CHARS) return;
    // When creating: require a title
    if (!story && !titleInput.trim()) {
      setError('Please enter a title for the story.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await addSentence(locationId, locationName, text, user, titleInput.trim() || undefined);
      setInputText('');
      setTitleInput('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    } catch (err) {
      setError(err.message || `Failed to save. (${err.code})`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = async (index) => {
    const text = editText.trim();
    if (!text || text.length > MAX_CHARS) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      await editSentence(locationId, index, text, user.uid);
      setEditingIndex(null);
    } catch (err) {
      setEditError(err.message || 'Could not save edit.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const displayTitle = story?.title || `The Tale of ${locationName}`;
  const sentences = story?.sentences || [];
  const count = story?.sentenceCount || 0;
  const isFull = count >= MAX_SENTENCES;
  const isNewStory = story === null;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 1003, background: '#0f1024' }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b-4 border-atomic-orange"
        style={{ background: '#12132a' }}
      >
        <button
          onClick={onClose}
          className="text-starlight-turquoise hover:text-atomic-orange transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <h2
            className="font-bungee text-starlight-turquoise text-base md:text-lg leading-tight truncate"
            style={{ textShadow: '0 0 10px rgba(64,224,208,0.7)' }}
          >
            {displayTitle}
          </h2>
          {story && (
            <p className="text-chrome-silver/50 font-special-elite" style={{ fontSize: '10px' }}>
              {count} sentence{count !== 1 ? 's' : ''} · collaborative story
            </p>
          )}
        </div>

        {/* Neon accent bar */}
        <div
          className="flex-shrink-0 w-2 h-8 rounded-sm"
          style={{ background: 'linear-gradient(180deg, #FF4E00, #40E0D0)', boxShadow: '0 0 8px rgba(64,224,208,0.5)' }}
        />
      </div>

      {/* ── Rainbow rule ── */}
      <div className="h-1 flex-shrink-0 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-60" />

      {/* ── Story body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full">
        {story === undefined ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-atomic-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {sentences.map((s, i) => {
              const isOwn = user?.uid === s.userId;
              const isEditing = editingIndex === i;
              return (
                <div key={i} className="border-l-2 border-starlight-turquoise/30 pl-4">
                  {isEditing ? (
                    /* ── Inline edit ── */
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value.slice(0, MAX_CHARS))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(i); } }}
                        rows={3}
                        autoFocus
                        className="w-full bg-black/40 border-2 border-starlight-turquoise/60 text-paper-white font-special-elite px-3 py-2 rounded-lg focus:outline-none focus:border-starlight-turquoise resize-none text-sm"
                      />
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`font-special-elite text-xs ${editText.length >= MAX_CHARS ? 'text-atomic-orange' : 'text-chrome-silver/40'}`}>
                          {editText.length}/{MAX_CHARS}
                        </span>
                        {editError && <p className="text-atomic-orange font-special-elite text-xs flex-1 truncate">{editError}</p>}
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="font-bungee text-chrome-silver/60 hover:text-paper-white transition-colors ml-auto"
                          style={{ fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
                        >CANCEL</button>
                        <button
                          onClick={() => handleEditSave(i)}
                          disabled={editSubmitting || !editText.trim()}
                          className="font-bungee bg-starlight-turquoise text-midnight-navy px-4 py-1 rounded-lg hover:bg-atomic-orange disabled:opacity-40 transition-all"
                          style={{ fontSize: '10px', cursor: editSubmitting ? 'default' : 'pointer' }}
                        >{editSubmitting ? 'SAVING...' : 'SAVE'}</button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display: sentence left / meta right ── */
                    <div className="flex items-start gap-3">
                      {/* Story text */}
                      <p className="flex-1 text-paper-white font-special-elite text-sm leading-relaxed">
                        {s.text}
                        {s.editedAt && (
                          <span className="text-chrome-silver/30 font-special-elite ml-1" style={{ fontSize: '9px' }}>(edited)</span>
                        )}
                      </p>
                      {/* Meta: author + date + edit button */}
                      <div className="flex-shrink-0 text-right" style={{ minWidth: '80px' }}>
                        <p className="text-starlight-turquoise/70 font-special-elite leading-tight" style={{ fontSize: '10px' }}>
                          @{s.userName}
                        </p>
                        <p className="text-chrome-silver/30 font-special-elite leading-tight mt-0.5" style={{ fontSize: '9px' }}>
                          {relativeTime(s.timestamp)}
                        </p>
                        {isOwn && !isFull && (
                          <button
                            onClick={() => { setEditingIndex(i); setEditText(s.text); setEditError(''); }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              display: 'block', marginLeft: 'auto', marginTop: '4px',
                              padding: '6px', borderRadius: '6px',
                              color: '#FF4FD8',
                              filter: 'drop-shadow(0 0 5px rgba(255,79,216,0.8))',
                              fontSize: '15px',
                              transition: 'filter 0.15s, transform 0.15s',
                            }}
                            title="Edit your sentence"
                            onMouseEnter={e => { e.currentTarget.style.filter = 'drop-shadow(0 0 9px rgba(255,79,216,1))'; e.currentTarget.style.transform = 'scale(1.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.filter = 'drop-shadow(0 0 5px rgba(255,79,216,0.8))'; e.currentTarget.style.transform = 'scale(1)'; }}
                          >✏️</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* ── Input area ── */}
      <div
        className="flex-shrink-0 border-t-2 border-white/10 px-4 py-4 max-w-2xl mx-auto w-full"
        style={{ background: '#12132a' }}
      >
        {story === undefined ? null : isFull ? (
          <p className="text-chrome-silver/50 font-special-elite text-xs text-center py-2">
            This tale has reached its full length (100 sentences). What a journey!
          </p>
        ) : !user ? (
          <button
            onClick={onShowLogin}
            className="w-full border border-dashed border-starlight-turquoise/50 text-chrome-silver/70 font-special-elite py-3 rounded-lg hover:border-starlight-turquoise hover:text-starlight-turquoise transition-all text-xs"
          >
            Sign in to {isNewStory ? 'start the tale' : 'add to the story'}
          </button>
        ) : (
          <div className="space-y-2">
            {/* Title field — only shown when creating a new story */}
            {isNewStory && (
              <div>
                <label className="block text-chrome-silver/60 font-special-elite mb-1" style={{ fontSize: '10px' }}>
                  STORY TITLE
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value.slice(0, MAX_TITLE_CHARS))}
                    placeholder={`e.g. "Midnight at the Bookshop"`}
                    className="w-full bg-black/40 border-2 border-atomic-orange/60 text-paper-white font-special-elite px-3 py-2 rounded-lg focus:outline-none focus:border-atomic-orange text-sm pr-12"
                  />
                  <span
                    className={`absolute right-3 top-1/2 -translate-y-1/2 font-special-elite text-xs ${titleInput.length >= MAX_TITLE_CHARS ? 'text-atomic-orange' : 'text-chrome-silver/30'}`}
                  >
                    {titleInput.length}/{MAX_TITLE_CHARS}
                  </span>
                </div>
              </div>
            )}

            {/* Sentence field */}
            <div>
              {isNewStory && (
                <label className="block text-chrome-silver/60 font-special-elite mb-1" style={{ fontSize: '10px' }}>
                  FIRST SENTENCE
                </label>
              )}
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                }}
                placeholder={isNewStory ? 'Begin the tale...' : 'Continue the tale...'}
                rows={2}
                className="w-full bg-black/40 border-2 border-starlight-turquoise/60 text-paper-white font-special-elite px-3 py-2 rounded-lg focus:outline-none focus:border-starlight-turquoise resize-none text-sm"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <span
                className={`font-special-elite text-xs flex-shrink-0 ${inputText.length >= MAX_CHARS ? 'text-atomic-orange' : 'text-chrome-silver/40'}`}
              >
                {inputText.length}/{MAX_CHARS}
              </span>
              {error && (
                <p className="text-atomic-orange font-special-elite text-xs flex-1 truncate">{error}</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting || !inputText.trim() || (isNewStory && !titleInput.trim())}
                className="flex-shrink-0 bg-atomic-orange text-midnight-navy font-bungee px-6 py-1.5 rounded-lg hover:bg-starlight-turquoise disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ fontSize: '11px' }}
              >
                {submitting ? 'SAVING...' : isNewStory ? 'START THE TALE' : 'SUBMIT'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
