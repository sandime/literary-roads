// src/components/AudioNarrative.jsx
// Web Speech API play button for landmark/journal narration.
// No API key needed — uses browser's built-in speech synthesis.
import { useState, useEffect } from 'react';

const buildNarrative = (loc) => {
  if (typeof loc === 'string') return loc; // pre-built text passed directly
  const parts = [
    loc.name ? `${loc.name}.` : '',
    loc.city && loc.state ? `Located in ${loc.city}, ${loc.state}.` : (loc.city || loc.state || ''),
    loc.description || loc.reflection || '',
  ].filter(Boolean);
  return parts.join(' ');
};

export default function AudioNarrative({ location, text }) {
  const [playing, setPlaying] = useState(false);
  const [supported] = useState('speechSynthesis' in window);

  // Stop when component unmounts or location changes
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  useEffect(() => {
    if (playing) {
      window.speechSynthesis?.cancel();
      setPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.id ?? text]);

  if (!supported) return null;

  const handlePlay = () => {
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }

    const narrative = text ?? buildNarrative(location ?? {});
    if (!narrative.trim()) return;

    const utterance = new SpeechSynthesisUtterance(narrative);

    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes('Samantha') ||       // iOS
        v.name.includes('Google US English') || // Chrome
        v.name.includes('Karen')               // Mac
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (preferred) utterance.voice = preferred;
      utterance.rate  = 0.9;
      utterance.pitch = 1;
      utterance.onend   = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(utterance);
      setPlaying(true);
    };

    // Voices may not be loaded yet on first call
    if (window.speechSynthesis.getVoices().length) {
      setVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        setVoiceAndSpeak();
      };
    }
  };

  const label = location?.name ?? 'this entry';

  return (
    <button
      onClick={handlePlay}
      aria-label={playing ? `Stop narration of ${label}` : `Listen to narration of ${label}`}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-bungee text-xs"
      style={{
        background: playing ? 'rgba(64,224,208,0.15)' : 'transparent',
        border: '1.5px solid #40E0D0',
        color: '#40E0D0',
        cursor: 'pointer',
        letterSpacing: '0.05em',
        flexShrink: 0,
      }}
    >
      {playing ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z"/>
        </svg>
      )}
      {playing ? 'STOP' : 'LISTEN'}
    </button>
  );
}
