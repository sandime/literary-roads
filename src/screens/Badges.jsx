import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUserBadges, computeBadgeProgress } from '../utils/badgeChecker';
import { subscribeToTravelStats } from '../utils/travelStats';
import { BADGE_COUNT } from '../utils/badgeDefinitions';

// ── Badge detail modal ───────────────────────────────────────────────────────
function BadgeDetailModal({ badge, onClose }) {
  if (!badge) return null;
  return (
    <div className="fixed inset-0 z-[3000] bg-black/75 flex items-center justify-center px-4"
      onClick={onClose}>
      <div className="relative w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#0D0E1A', border: `2px solid ${badge.color}` }}
        onClick={e => e.stopPropagation()}>
        <div style={{ height: '3px', background: `linear-gradient(90deg, transparent, ${badge.color}, transparent)` }} />
        <div className="px-6 py-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{
              background: `radial-gradient(circle, ${badge.color}22, ${badge.color}08)`,
              border: `2px solid ${badge.earned ? badge.color : 'rgba(192,192,192,0.2)'}`,
              fontSize: '2.5rem',
              filter: badge.earned ? 'none' : 'grayscale(1) brightness(0.4)',
            }}>
            {badge.icon}
          </div>
          <h2 className="font-bungee text-lg mb-1"
            style={{ color: badge.earned ? badge.color : 'rgba(192,192,192,0.4)', letterSpacing: '0.04em' }}>
            {badge.name}
          </h2>
          <p className="font-special-elite text-sm mb-4"
            style={{ color: 'rgba(245,245,220,0.75)', lineHeight: 1.6 }}>
            {badge.description}
          </p>
          {badge.earned ? (
            <div className="mb-5 text-center">
              <p className="font-bungee text-[10px] tracking-widest"
                style={{ color: badge.color, textShadow: `0 0 8px ${badge.color}` }}>
                EARNED
              </p>
              {badge.serialNumber && (
                <p className="font-special-elite text-xs mt-1"
                  style={{ color: 'rgba(245,245,220,0.6)' }}>
                  Charter Member #{badge.serialNumber}
                </p>
              )}
            </div>
          ) : badge.custom ? (
            <p className="font-special-elite text-xs mb-5 text-center"
              style={{ color: 'rgba(192,192,192,0.45)', lineHeight: 1.5 }}>
              {badge.id === 'founders-circle'
                ? 'Reserved for the first 100 members'
                : 'Special badge — check back soon'}
            </p>
          ) : (
            <div className="w-full mb-5">
              <div className="flex justify-between font-special-elite text-xs mb-1.5"
                style={{ color: 'rgba(192,192,192,0.5)' }}>
                <span>PROGRESS</span>
                <span>{badge.current} / {badge.required}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${badge.pct}%`,
                    background: `linear-gradient(90deg, ${badge.color}80, ${badge.color})`,
                  }} />
              </div>
            </div>
          )}
          <button onClick={onClose}
            className="font-bungee text-xs py-2 px-6 rounded-lg border transition-all"
            style={{ border: `1px solid ${badge.color}50`, color: badge.color }}
            onMouseEnter={e => { e.currentTarget.style.background = badge.color + '18'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            CLOSE
          </button>
        </div>
        <div style={{ height: '3px', background: `linear-gradient(90deg, transparent, ${badge.color}, transparent)` }} />
      </div>
    </div>
  );
}

// ── Badge tile ───────────────────────────────────────────────────────────────
function BadgeTile({ badge, onClick }) {
  return (
    <button
      onClick={() => onClick(badge)}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all group"
      style={{
        background: badge.earned ? `${badge.color}10` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${badge.earned ? badge.color + '50' : 'rgba(255,255,255,0.07)'}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = badge.earned ? badge.color + '90' : 'rgba(255,255,255,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = badge.earned ? badge.color + '50' : 'rgba(255,255,255,0.07)'; }}
    >
      <span style={{
        fontSize: '2rem',
        filter: badge.earned ? 'none' : 'grayscale(1) brightness(0.3)',
        transition: 'filter 0.2s',
        textShadow: badge.earned ? `0 0 12px ${badge.color}` : 'none',
      }}>
        {badge.icon}
      </span>
      <span className="font-bungee text-[9px] text-center leading-tight"
        style={{
          color: badge.earned ? badge.color : 'rgba(192,192,192,0.3)',
          letterSpacing: '0.03em',
        }}>
        {badge.name}
      </span>
      {!badge.earned && badge.pct > 0 && (
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full"
            style={{ width: `${badge.pct}%`, background: badge.color + '80' }} />
        </div>
      )}
      {!badge.earned && badge.pct === 0 && (
        <span style={{ fontSize: '0.7rem', color: 'rgba(192,192,192,0.2)' }}>🔒</span>
      )}
    </button>
  );
}

// ── Main Badges screen ───────────────────────────────────────────────────────
export default function Badges({ onBack }) {
  const { user } = useAuth();
  const [earnedBadgeData, setEarnedBadgeData] = useState([]);
  const [travelStats, setTravelStats]         = useState(null);
  const [selectedBadge, setSelectedBadge]     = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsubBadges = subscribeToUserBadges(user.uid, setEarnedBadgeData);
    const unsubStats  = subscribeToTravelStats(user.uid, setTravelStats);
    return () => { unsubBadges(); unsubStats(); };
  }, [user]);

  const earnedIds = new Set(earnedBadgeData.map(b => b.badgeId));
  const allProgress = computeBadgeProgress(travelStats);

  const earned     = allProgress.filter(b => earnedIds.has(b.id));
  const inProgress = allProgress.filter(b => !earnedIds.has(b.id) && b.pct > 0)
    .sort((a, b) => b.pct - a.pct);
  const locked     = allProgress.filter(b => !earnedIds.has(b.id) && b.pct === 0);

  // Enrich badge with earned status (+ serialNumber for founders-circle) for the tile
  const enrich = (b) => {
    const base = { ...b, earned: earnedIds.has(b.id) };
    if (b.id === 'founders-circle') {
      const data = earnedBadgeData.find(d => d.badgeId === 'founders-circle');
      return { ...base, serialNumber: data?.serialNumber };
    }
    return base;
  };

  return (
    <div className="min-h-screen bg-midnight-navy text-paper-white overflow-y-auto">
      <style>{`
        @keyframes lr-badge-header-glow {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-midnight-navy/95 border-b-2 border-starlight-turquoise px-4 py-3 flex items-center gap-3">
        <button onClick={onBack}
          className="text-chrome-silver hover:text-atomic-orange transition-colors p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-bungee text-base tracking-wider"
            style={{ color: '#40E0D0', textShadow: '0 0 10px rgba(64,224,208,0.7)' }}>
            BADGES
          </h1>
          <p className="font-special-elite text-xs" style={{ color: 'rgba(192,192,192,0.5)' }}>
            {earned.length} of {BADGE_COUNT} earned
          </p>
        </div>
        {/* Overall progress pill */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ width: '80px', background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.round((earned.length / BADGE_COUNT) * 100)}%`,
                background: 'linear-gradient(90deg, #FF4E00, #40E0D0)',
              }} />
          </div>
          <span className="font-bungee text-[9px]" style={{ color: 'rgba(192,192,192,0.4)' }}>
            {Math.round((earned.length / BADGE_COUNT) * 100)}% complete
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

        {/* Guest prompt */}
        {!user && (
          <div className="rounded-xl p-6 text-center" style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}>
            <p className="font-bungee text-sm mb-2" style={{ color: '#40E0D0' }}>SIGN IN TO EARN BADGES</p>
            <p className="font-special-elite text-sm" style={{ color: 'rgba(192,192,192,0.6)' }}>
              Create a free account to track your literary journey.
            </p>
          </div>
        )}

        {/* ── EARNED ── */}
        {earned.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-bungee text-sm tracking-wider"
                style={{ color: '#40E0D0', textShadow: '0 0 8px rgba(64,224,208,0.5)' }}>
                EARNED
              </h2>
              <span className="font-bungee text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: '#40E0D020', border: '1px solid #40E0D040', color: '#40E0D0' }}>
                {earned.length} of {BADGE_COUNT}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {earned.map(b => (
                <BadgeTile key={b.id} badge={enrich(b)} onClick={setSelectedBadge} />
              ))}
            </div>
          </section>
        )}

        {/* ── IN PROGRESS ── */}
        {inProgress.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-bungee text-sm tracking-wider"
                style={{ color: '#FF4E00', textShadow: '0 0 8px rgba(255,78,0,0.5)' }}>
                IN PROGRESS
              </h2>
              <span className="font-bungee text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: '#FF4E0020', border: '1px solid #FF4E0040', color: '#FF4E00' }}>
                {inProgress.length}
              </span>
            </div>
            <div className="space-y-3">
              {inProgress.map(badge => (
                <button key={badge.id} onClick={() => setSelectedBadge(enrich(badge))}
                  className="w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all"
                  style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = badge.color + '50'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2B45'; }}>
                  <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{badge.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className="font-bungee text-xs truncate"
                        style={{ color: badge.color, letterSpacing: '0.04em' }}>
                        {badge.name}
                      </span>
                      <span className="font-special-elite text-[10px] shrink-0"
                        style={{ color: 'rgba(192,192,192,0.5)' }}>
                        {badge.current}/{badge.required}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${badge.pct}%`, background: `linear-gradient(90deg, ${badge.color}80, ${badge.color})` }} />
                    </div>
                    <p className="font-special-elite text-[10px] mt-1"
                      style={{ color: 'rgba(192,192,192,0.45)' }}>
                      Just {badge.required - badge.current} more to go!
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── LOCKED ── */}
        {locked.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-bungee text-sm tracking-wider"
                style={{ color: 'rgba(192,192,192,0.35)', letterSpacing: '0.08em' }}>
                LOCKED
              </h2>
              <span className="font-bungee text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(192,192,192,0.3)' }}>
                {locked.length}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {locked.map(b => (
                <BadgeTile key={b.id} badge={enrich(b)} onClick={setSelectedBadge} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {user && earned.length === 0 && inProgress.length === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🗺️</p>
            <p className="font-bungee text-sm mb-2" style={{ color: '#40E0D0' }}>HIT THE ROAD!</p>
            <p className="font-special-elite text-sm" style={{ color: 'rgba(192,192,192,0.6)', lineHeight: 1.6 }}>
              Park at a bookstore or cafe to start earning badges.
            </p>
          </div>
        )}

        <div className="h-8" />
      </div>

      {/* Badge detail modal */}
      {selectedBadge && (
        <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </div>
  );
}
