import { useState, useEffect } from 'react';
import { subscribeToRating, castVote } from '../utils/locationRatings';

export default function PitStopRating({ locationId, user, onShowLogin, onStarburstChange }) {
  const [rating, setRating] = useState(undefined); // undefined = loading
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = subscribeToRating(locationId, (data) => {
      setRating(data);
      onStarburstChange?.(locationId, data?.hasStarburst === true);
    });
    return unsub;
  }, [locationId]);

  const hasVoted = !!(user && rating?.voters?.includes(user.uid));
  const yesCount = rating?.yesVotes || 0;

  const handleVote = async () => {
    if (!user) { onShowLogin?.(); return; }
    setSubmitting(true);
    setError('');
    try {
      await castVote(locationId, user.uid);
    } catch (err) {
      if (err.message !== 'Already voted') {
        setError('Could not save your vote. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Loading — show nothing to avoid layout shift
  if (rating === undefined) return null;

  return (
    <div
      className="mb-4 pb-4 border-b border-white/10"
    >
      {hasVoted ? (
        /* ── Already voted — compact confirmation ── */
        <div className="flex items-center justify-between">
          <span className="text-starlight-turquoise font-special-elite text-xs">
            You recommended this!
          </span>
          {yesCount > 0 && (
            <span className="text-chrome-silver/50 font-special-elite text-xs">
              {yesCount} traveler{yesCount !== 1 ? 's' : ''} recommend this
            </span>
          )}
        </div>
      ) : (
        /* ── Voting UI ── */
        <div>
          <p className="text-chrome-silver font-special-elite text-xs mb-2">
            Would you recommend this pit stop?
            {yesCount > 0 && (
              <span className="text-chrome-silver/40 ml-2">
                {yesCount} traveler{yesCount !== 1 ? 's' : ''} recommend this
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={handleVote}
                disabled={submitting}
                className="border-2 border-starlight-turquoise/60 text-starlight-turquoise font-bungee px-3 py-1 rounded-lg hover:bg-starlight-turquoise hover:text-midnight-navy disabled:opacity-40 transition-all"
                style={{ fontSize: '11px' }}
              >
                RECOMMEND
              </button>
            ) : (
              <button
                onClick={onShowLogin}
                className="text-chrome-silver/50 font-special-elite text-xs hover:text-starlight-turquoise transition-colors underline"
              >
                Sign in to recommend this stop
              </button>
            )}
          </div>
          {error && (
            <p className="text-atomic-orange font-special-elite text-xs mt-1">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
