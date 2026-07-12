import { useState, useCallback } from 'react';

// ── Library palette (matches Library.jsx) ─────────────────────────────────────
const L = {
  bg:       '#FFF8E7',
  turquoise:'#38C5C5',
  coral:    '#FF6B7A',
  peach:    '#FFB8A3',
  gold:     '#F5A623',
  dark:     '#2D2D2D',
  mid:      '#555555',
  muted:    '#999999',
  white:    '#FFFFFF',
  card:     '#FAFAFA',
};

const CAT_SRC = `${import.meta.env.BASE_URL}images/library-cat.png`;
const onCoverError = (e) => { e.target.onerror = null; e.target.src = CAT_SRC; };

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconDice() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="4" />
      <circle cx="8"  cy="8"  r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8"  r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8"  cy="16" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2"  x2="8"  y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function IconScissors() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6"  cy="6"  r="3" />
      <circle cx="6"  cy="18" r="3" />
      <line x1="20" y1="4"  x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12"  y1="8.12"  x2="12" y2="12" />
    </svg>
  );
}

function IconMood() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9"  y1="9"  x2="9.01"  y2="9" />
      <line x1="15" y1="9"  x2="15.01" y2="9" />
    </svg>
  );
}

// ── Method row ────────────────────────────────────────────────────────────────
function MethodRow({ accent, label, sub, onClick, disabled, badge }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', background: 'none', border: 'none',
        cursor: disabled ? 'default' : 'pointer', padding: 0, textAlign: 'left',
        opacity: disabled ? 0.42 : 1,
        transform: hov ? 'translateX(3px)' : 'none',
        transition: 'transform 0.18s ease, opacity 0.15s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 18px',
        borderRadius: 12,
        border: `1.5px solid ${hov ? accent : `${accent}44`}`,
        background: hov ? `${accent}0d` : L.white,
        boxShadow: hov ? `0 4px 14px ${accent}22` : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'border-color 0.18s, background 0.18s, box-shadow 0.18s',
        position: 'relative',
      }}>
        {/* Accent stripe */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: '12px 0 0 12px', background: accent }} />

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 14, color: disabled ? L.muted : L.dark, letterSpacing: '0.04em' }}>
            {label}
          </p>
          <p style={{ margin: '3px 0 0', fontFamily: 'Special Elite, serif', fontSize: 12, color: disabled ? L.muted : L.mid, lineHeight: 1.4 }}>
            {sub}
          </p>
        </div>

        {/* Badge / arrow */}
        {badge && (
          <span style={{
            flexShrink: 0, fontFamily: 'Bungee, sans-serif', fontSize: 9,
            background: `${accent}22`, color: accent,
            border: `1px solid ${accent}55`,
            borderRadius: 20, padding: '3px 9px', letterSpacing: '0.08em',
          }}>
            {badge}
          </span>
        )}
        {!disabled && (
          <span style={{ color: accent, fontSize: 18, flexShrink: 0, opacity: hov ? 1 : 0.5, transition: 'opacity 0.15s' }}>
            →
          </span>
        )}
        {disabled && (
          <span style={{
            flexShrink: 0, fontFamily: 'Bungee, sans-serif', fontSize: 9,
            background: 'rgba(153,153,153,0.12)', color: L.muted,
            border: '1px solid rgba(153,153,153,0.25)',
            borderRadius: 20, padding: '3px 9px', letterSpacing: '0.08em',
          }}>
            COMING SOON
          </span>
        )}
      </div>
    </button>
  );
}

// ── Ask the Librarian panel (inline) ─────────────────────────────────────────
function AskLibrarian({ readNext, onClose }) {
  const eligible = (readNext || []).filter(b => b.title);
  const [shownIds, setShownIds] = useState([]);
  const [current, setCurrent]   = useState(() => {
    if (!eligible.length) return null;
    return eligible[Math.floor(Math.random() * eligible.length)];
  });

  const handleTryAgain = useCallback(() => {
    if (!eligible.length) return;
    const nextShown = current ? [...shownIds, current.id] : shownIds;
    const pool = eligible.filter(b => !nextShown.includes(b.id));
    if (pool.length === 0) {
      // Exhausted — reset and pick randomly
      setShownIds([]);
      setCurrent(eligible[Math.floor(Math.random() * eligible.length)]);
    } else {
      setShownIds(nextShown);
      setCurrent(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, [eligible, shownIds, current]);

  return (
    <div style={{
      marginTop: 12, borderRadius: 14, overflow: 'hidden',
      border: `1.5px solid ${L.turquoise}55`,
      background: `${L.turquoise}08`,
      animation: 'lib-fade-in 0.2s ease',
    }}>
      <style>{`@keyframes lib-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${L.turquoise}22` }}>
        <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.turquoise, letterSpacing: '0.08em' }}>
          ASK THE LIBRARIAN
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: L.muted, fontSize: 18, lineHeight: 1, padding: '0 4px' }}>
          ×
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {!eligible.length ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: L.muted, marginBottom: 8 }}>YOUR READ NEXT IS EMPTY</p>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: L.muted, fontStyle: 'italic', lineHeight: 1.6 }}>
              Add books to Read Next from the map, Author Room, or Highway Snacks — then come back for a pick.
            </p>
          </div>
        ) : !current ? (
          <p style={{ fontFamily: 'Special Elite, serif', color: L.muted }}>No books available.</p>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
              {/* Cover */}
              <div style={{
                width: 64, height: 90, flexShrink: 0, borderRadius: 6,
                overflow: 'hidden', boxShadow: '2px 3px 10px rgba(0,0,0,0.14)',
                background: '#eee',
              }}>
                <img
                  src={current.coverUrl || current.coverURL || CAT_SRC}
                  alt={current.title}
                  onError={onCoverError}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: L.dark, margin: '0 0 4px', lineHeight: 1.3 }}>
                  {current.title}
                </p>
                <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: L.mid, margin: '0 0 8px' }}>
                  {current.author}
                </p>
                {current.whoWhatWhere && (
                  <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, fontStyle: 'italic', margin: 0 }}>
                    {current.whoWhatWhere}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleTryAgain}
                disabled={eligible.length <= 1}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, cursor: eligible.length <= 1 ? 'default' : 'pointer',
                  background: 'transparent', border: `1.5px solid ${L.turquoise}`,
                  fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.turquoise,
                  letterSpacing: '0.06em', opacity: eligible.length <= 1 ? 0.4 : 1, transition: 'opacity 0.15s',
                }}
              >
                ↺ TRY AGAIN
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                  background: L.turquoise, border: 'none',
                  fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.white,
                  letterSpacing: '0.06em',
                }}
              >
                GOT IT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main room ─────────────────────────────────────────────────────────────────
export default function LibrariansDesk({ readNext, onNavigate, onBack }) {
  const [showAsk, setShowAsk] = useState(false);

  const readNextCount = (readNext || []).filter(b => b.title).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: L.bg, overflowY: 'auto', fontFamily: 'Special Elite, serif' }}>

      {/* Header band */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: L.bg, borderBottom: `2px solid ${L.turquoise}`,
        padding: '12px 16px', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 600, margin: '0 auto' }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark,
              letterSpacing: '0.06em', padding: '4px 8px', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = L.turquoise}
            onMouseLeave={e => e.currentTarget.style.color = L.dark}
          >
            BACK
          </button>
          <div>
            <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.muted, letterSpacing: '0.14em', textAlign: 'center' }}>
              THE LIBRARY · A DOORWAY
            </p>
            <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 16, color: L.dark, fontWeight: 700, textAlign: 'center' }}>
              The Librarian's Desk
            </h1>
          </div>
          <div style={{ width: 56 }} />
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 80px' }}>

        {/* Intro */}
        <p style={{
          fontFamily: 'Special Elite, serif', fontSize: 14, color: L.mid,
          fontStyle: 'italic', lineHeight: 1.7, marginBottom: 24, textAlign: 'center',
        }}>
          Need help finding your next read?
        </p>

        {/* Method rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* 1 — Ask the Librarian */}
          <div>
            <MethodRow
              accent={L.turquoise}
              label="Ask the Librarian"
              sub="Ask the librarian to pick something from your Read Next list"
              badge={readNextCount > 0 ? `${readNextCount} books` : null}
              onClick={() => setShowAsk(v => !v)}
            />
            {showAsk && (
              <AskLibrarian readNext={readNext} onClose={() => setShowAsk(false)} />
            )}
          </div>

          {/* 2 — By Setting */}
          <MethodRow
            accent={L.coral}
            label="By Setting"
            sub="Find books set in a specific state or world"
            onClick={() => onNavigate('settingsMap')}
          />

          {/* 3 — By Length */}
          <MethodRow
            accent="#7B6EC4"
            label="By Length"
            sub="Find something quick, or settle in for a while"
            onClick={() => onNavigate('byLength')}
          />

          {/* 4 — Thin the Stack */}
          <MethodRow
            accent={L.gold}
            label="Thin the Stack"
            sub="Trim the books you've been ignoring on Read Next"
            badge={readNextCount > 4 ? `${readNextCount} queued` : null}
            onClick={() => onNavigate('thinStack')}
          />

          {/* 5 — By Mood (placeholder) */}
          <MethodRow
            accent={L.peach}
            label="By Mood"
            sub="Match a book to how you're feeling right now"
            disabled
          />
        </div>

        {/* Footer accent */}
        <div style={{ marginTop: 36, textAlign: 'center' }}>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, fontStyle: 'italic' }}>
            Every great road trip starts with the right book.
          </p>
        </div>
      </div>
    </div>
  );
}
