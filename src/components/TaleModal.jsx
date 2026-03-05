import { useState, useEffect, useRef } from 'react';
import { subscribeToStory, addSentence, MAX_SENTENCES, MAX_CHARS } from '../utils/hitchhikerStories';

export default function TaleModal({ locationId, locationName, user, onShowLogin, onClose }) {
  const [story, setStory] = useState(undefined);
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeToStory(locationId, setStory);
    return unsub;
  }, [locationId]);

  const handleSubmit = async () => {
    if (!user) { onShowLogin?.(); return; }
    const text = inputText.trim();
    if (!text || text.length > MAX_CHARS) return;
    setSubmitting(true);
    setError('');
    try {
      await addSentence(locationId, locationName, text, user);
      setInputText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    } catch (err) {
      setError(err.message || `Failed to save. (${err.code})`);
    } finally {
      setSubmitting(false);
    }
  };

  const title = story?.title || `The Tale of ${locationName}`;
  const sentences = story?.sentences || [];
  const count = story?.sentenceCount || 0;
  const isFull = count >= MAX_SENTENCES;

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
            {title}
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
        ) : sentences.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-4xl mb-4">📖</p>
            <p className="text-chrome-silver font-special-elite text-sm">The tale hasn't begun yet...</p>
            <p className="text-chrome-silver/40 font-special-elite text-xs mt-1">Write the first sentence below.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {sentences.map((s, i) => (
              <div key={i} className="border-l-2 border-starlight-turquoise/30 pl-4">
                <p className="text-paper-white font-special-elite text-sm leading-relaxed">{s.text}</p>
                <p className="text-chrome-silver/35 font-special-elite mt-1.5" style={{ fontSize: '10px' }}>
                  — {s.userName} · {new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* ── Add sentence ── */}
      <div
        className="flex-shrink-0 border-t-2 border-white/10 px-4 py-4 max-w-2xl mx-auto w-full"
        style={{ background: '#12132a' }}
      >
        {isFull ? (
          <p className="text-chrome-silver/50 font-special-elite text-xs text-center py-2">
            This tale has reached its full length (100 sentences). What a journey!
          </p>
        ) : !user ? (
          <button
            onClick={onShowLogin}
            className="w-full border border-dashed border-starlight-turquoise/50 text-chrome-silver/70 font-special-elite py-3 rounded-lg hover:border-starlight-turquoise hover:text-starlight-turquoise transition-all text-xs"
          >
            Sign in to add to the story
          </button>
        ) : (
          <div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              placeholder="Continue the tale..."
              rows={2}
              className="w-full bg-black/40 border-2 border-starlight-turquoise/60 text-paper-white font-special-elite px-3 py-2 rounded-lg focus:outline-none focus:border-starlight-turquoise resize-none text-sm mb-2"
            />
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
                disabled={submitting || !inputText.trim()}
                className="flex-shrink-0 bg-atomic-orange text-midnight-navy font-bungee px-6 py-1.5 rounded-lg hover:bg-starlight-turquoise disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ fontSize: '11px' }}
              >
                {submitting ? 'SAVING...' : 'SUBMIT'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
