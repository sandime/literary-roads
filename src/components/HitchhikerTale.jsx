import { useState, useEffect } from 'react';
import { subscribeToStory } from '../utils/hitchhikerStories';

export default function HitchhikerTale({ locationId, locationName, onOpenModal }) {
  const [story, setStory] = useState(undefined); // undefined = loading, null = no story yet

  useEffect(() => {
    const unsub = subscribeToStory(locationId, setStory);
    return unsub;
  }, [locationId]);

  if (story === undefined) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-atomic-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="text-center py-6">
        <p className="text-4xl mb-3">✍️</p>
        <p className="text-paper-white font-bungee text-sm mb-1">No tale yet.</p>
        <p className="text-chrome-silver/60 font-special-elite text-xs mb-5">
          Be the first to start the story for {locationName}!
        </p>
        <button
          onClick={onOpenModal}
          className="border-2 border-atomic-orange text-atomic-orange font-bungee px-6 py-2 rounded-lg hover:bg-atomic-orange hover:text-midnight-navy transition-all"
          style={{ fontSize: '11px' }}
        >
          START THE TALE
        </button>
      </div>
    );
  }

  const preview = (story.sentences || []).slice(0, 3);
  const remaining = (story.sentenceCount || 0) - preview.length;

  return (
    <div>
      <h3
        className="font-bungee text-sm text-starlight-turquoise mb-3"
        style={{ textShadow: '0 0 8px rgba(64,224,208,0.5)' }}
      >
        {story.title}
      </h3>

      <div className="space-y-2 mb-4">
        {preview.map((s, i) => (
          <p key={i} className="text-paper-white font-special-elite text-sm leading-relaxed">
            {s.text}
          </p>
        ))}
        {remaining > 0 && (
          <p className="text-chrome-silver/40 font-special-elite text-xs italic">
            ...and {remaining} more sentence{remaining !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <button
        onClick={onOpenModal}
        className="w-full border-2 border-starlight-turquoise text-starlight-turquoise font-bungee py-2 rounded-lg hover:bg-starlight-turquoise hover:text-midnight-navy transition-all"
        style={{ fontSize: '11px' }}
      >
        READ FULL STORY
      </button>
    </div>
  );
}
