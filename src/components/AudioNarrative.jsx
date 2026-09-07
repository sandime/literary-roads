// src/components/AudioNarrative.jsx
// Plays an ElevenLabs MP3 for landmarks when one exists at
// /sounds/narrations/{location.id}.mp3, falling back to the
// browser's built-in speech synthesis for locations without a file.
import { useState, useEffect, useRef } from 'react';

const buildNarrative = (loc) => {
  if (typeof loc === 'string') return loc;
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
  const audioRef = useRef(null);

  const mp3Url = location?.id ? `/sounds/narrations/${location.id}.mp3` : null;

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      window.speechSynthesis?.cancel();
      setPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.id ?? text]);

  const playTTS = () => {
    const narrative = text ?? buildNarrative(location ?? {});
    if (!narrative.trim()) return;
    const utterance = new SpeechSynthesisUtterance(narrative);
    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English') || v.name.includes('Karen')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
      if (preferred) utterance.voice = preferred;
      utterance.rate  = 0.9;
      utterance.pitch = 1;
      utterance.onend   = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(utterance);
      setPlaying(true);
    };
    if (window.speechSynthesis.getVoices().length) {
      setVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        setVoiceAndSpeak();
      };
    }
  };

  const handlePlay = () => {
    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }

    if (mp3Url) {
      const audio = new Audio(mp3Url);
      audioRef.current = audio;

      audio.addEventListener('canplay', () => setPlaying(true), { once: true });
      audio.addEventListener('ended', () => { audioRef.current = null; setPlaying(false); }, { once: true });

      let errorHandled = false;
      const onError = () => {
        if (errorHandled) return;
        errorHandled = true;
        audioRef.current = null;
        if (supported) playTTS();
      };
      audio.addEventListener('error', onError, { once: true });
      audio.play().catch(onError);
    } else if (supported) {
      playTTS();
    }
  };

  if (!mp3Url && !supported) return null;

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
