// BadgeUnlockModal — shown when user earns one or more badges
// Props:
//   badges  : badge definition object[]  (from badgeDefinitions.js)
//   onClose : () => void

const BadgeUnlockModal = ({ badges, onClose, onViewAll }) => {
  if (!badges || badges.length === 0) return null;

  // Show the first badge; if multiple were earned show them one at a time via index
  const [idx, setIdx] = [0, () => {}]; // static for now — show first badge
  const badge = badges[0];

  const handleShare = () => {
    const text = badge.shareText || `I just earned the ${badge.name} badge on The Literary Roads!`;
    if (navigator.share) {
      navigator.share({ text, url: 'https://literaryroads.com' }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        alert('Copied to clipboard!');
      }).catch(() => {});
    }
  };

  return (
    <>
      <style>{`
        @keyframes lr-badge-pop {
          0%   { transform: scale(0.4) rotate(-15deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(4deg);  opacity: 1; }
          100% { transform: scale(1) rotate(0deg);     opacity: 1; }
        }
        @keyframes lr-badge-glow-pulse {
          0%, 100% { box-shadow: 0 0 20px 4px var(--badge-glow), 0 0 40px 8px var(--badge-glow); }
          50%       { box-shadow: 0 0 30px 8px var(--badge-glow), 0 0 60px 16px var(--badge-glow); }
        }
        @keyframes lr-sparkle {
          0%   { opacity: 0; transform: scale(0) rotate(0deg); }
          50%  { opacity: 1; transform: scale(1) rotate(180deg); }
          100% { opacity: 0; transform: scale(0) rotate(360deg); }
        }
        .lr-badge-icon-wrap {
          animation: lr-badge-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     lr-badge-glow-pulse 2s ease-in-out 0.55s infinite;
        }
        .lr-sparkle { animation: lr-sparkle 1.2s ease-in-out infinite; }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[3000] bg-black/75 flex items-center justify-center px-4"
        onClick={onClose}
      >
        {/* Card */}
        <div
          className="relative w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: '#0D0E1A', border: `2px solid ${badge.color}` }}
          onClick={e => e.stopPropagation()}
        >
          {/* Gradient header strip */}
          <div style={{
            height: '4px',
            background: `linear-gradient(90deg, transparent, ${badge.color}, transparent)`,
          }} />

          {/* Sparkle decorations */}
          {[
            { top: '12%', left: '8%',  delay: '0s',    size: '18px' },
            { top: '8%',  left: '75%', delay: '0.4s',  size: '14px' },
            { top: '18%', left: '88%', delay: '0.8s',  size: '10px' },
            { top: '22%', left: '3%',  delay: '1.0s',  size: '12px' },
          ].map((sp, i) => (
            <div key={i} className="lr-sparkle absolute pointer-events-none" style={{
              top: sp.top, left: sp.left,
              width: sp.size, height: sp.size,
              animationDelay: sp.delay,
              color: badge.color,
              fontSize: sp.size,
            }}>✦</div>
          ))}

          <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
            {/* ACHIEVEMENT UNLOCKED header */}
            <p className="font-bungee text-[10px] tracking-[0.18em] mb-5"
              style={{ color: badge.color, textShadow: `0 0 10px ${badge.color}` }}>
              ACHIEVEMENT UNLOCKED
            </p>

            {/* Badge icon */}
            <div
              className="lr-badge-icon-wrap w-24 h-24 rounded-full flex items-center justify-center mb-5"
              style={{
                '--badge-glow': badge.color + '60',
                background: `radial-gradient(circle, ${badge.color}22, ${badge.color}08)`,
                border: `3px solid ${badge.color}`,
                fontSize: '3rem',
              }}
            >
              {badge.icon}
            </div>

            {/* Badge name */}
            <h2 className="font-bungee text-xl mb-2" style={{
              color: badge.color,
              textShadow: `0 0 12px ${badge.color}`,
              letterSpacing: '0.04em',
            }}>
              {badge.name}
            </h2>

            {/* Description */}
            <p className="font-special-elite text-sm mb-6"
              style={{ color: 'rgba(245,245,220,0.8)', lineHeight: 1.6 }}>
              {badge.description}
            </p>

            {/* Multiple badges notice */}
            {badges.length > 1 && (
              <p className="font-special-elite text-xs mb-4"
                style={{ color: 'rgba(192,192,192,0.6)' }}>
                +{badges.length - 1} more badge{badges.length > 2 ? 's' : ''} earned!
              </p>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleShare}
                className="w-full font-bungee text-xs py-2.5 rounded-lg transition-all"
                style={{
                  background: badge.color,
                  color: '#0D0E1A',
                  letterSpacing: '0.06em',
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
              >
                SHARE
              </button>
              {onViewAll && (
                <button
                  onClick={() => { onClose(); onViewAll(); }}
                  className="w-full font-bungee text-xs py-2.5 rounded-lg border transition-all"
                  style={{
                    border: `1px solid ${badge.color}60`,
                    color: badge.color,
                    background: 'transparent',
                    letterSpacing: '0.06em',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = badge.color + '18'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  VIEW ALL BADGES
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full font-bungee text-xs py-2 transition-all"
                style={{ color: 'rgba(192,192,192,0.5)', letterSpacing: '0.06em' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(192,192,192,0.9)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(192,192,192,0.5)'; }}
              >
                OK
              </button>
            </div>
          </div>

          {/* Bottom gradient strip */}
          <div style={{
            height: '4px',
            background: `linear-gradient(90deg, transparent, ${badge.color}, transparent)`,
          }} />
        </div>
      </div>
    </>
  );
};

export default BadgeUnlockModal;
