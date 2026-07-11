import { useState, useMemo } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';

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
};

const CAT_SRC = `${import.meta.env.BASE_URL}images/library-cat.png`;
const onCoverError = (e) => { e.target.onerror = null; e.target.src = CAT_SRC; };

const FRACTIONS = [
  { label: '¼', value: 0.25 },
  { label: '½', value: 0.5  },
  { label: '¾', value: 0.75 },
  { label: 'ALL', value: 1  },
];

// Turn a Firestore timestamp or ISO string into a JS Date
function toDate(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (typeof ts === 'string') return new Date(ts);
  return null;
}

function ageLabel(ts) {
  const d = toDate(ts);
  if (!d) return 'unknown date';
  const months = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1)  return 'added recently';
  if (months === 1) return 'added 1 month ago';
  return `added ${months} months ago`;
}

function viewedLabel(ts) {
  const d = toDate(ts);
  if (!d) return 'never opened';
  const months = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1)  return 'opened recently';
  if (months === 1) return 'last opened 1 month ago';
  return `last opened ${months} months ago`;
}

// Sort: null/undefined lastViewedAt first (most neglected), then oldest lastViewedAt,
// then oldest addedAt (date field)
function neglectScore(book) {
  const viewed   = toDate(book.lastViewedAt);
  const added    = toDate(book.date || book.addedAt);
  const viewedMs = viewed ? viewed.getTime() : 0;     // 0 = never viewed → sorts first
  const addedMs  = added  ? added.getTime()  : Infinity;
  return { viewedMs, addedMs, neverViewed: !viewed };
}

function sortByNeglect(books) {
  return [...books].sort((a, b) => {
    const sa = neglectScore(a);
    const sb = neglectScore(b);
    if (sa.neverViewed !== sb.neverViewed) return sa.neverViewed ? -1 : 1;
    if (sa.viewedMs !== sb.viewedMs) return sa.viewedMs - sb.viewedMs;
    return sa.addedMs - sb.addedMs;
  });
}

// ── Amount selector ───────────────────────────────────────────────────────────
function AmountSelector({ total, fraction, onFraction, customN, onCustomN }) {
  const [showCustom, setShowCustom] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.gold, letterSpacing: '0.1em', marginBottom: 10 }}>
        HOW MANY TO REMOVE?
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FRACTIONS.map(f => {
          const n = Math.max(1, Math.round(total * f.value));
          const active = !showCustom && fraction === f.value;
          return (
            <button key={f.label}
              onClick={() => { setShowCustom(false); onFraction(f.value); }}
              style={{
                padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                fontFamily: 'Bungee, sans-serif', fontSize: 12, letterSpacing: '0.05em',
                background: active ? L.gold : 'transparent',
                color: active ? L.white : L.gold,
                border: `1.5px solid ${L.gold}`,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {f.label} <span style={{ fontSize: 9, opacity: 0.75 }}>({n})</span>
            </button>
          );
        })}
        <button
          onClick={() => { setShowCustom(v => !v); }}
          style={{
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Bungee, sans-serif', fontSize: 12, letterSpacing: '0.05em',
            background: showCustom ? L.gold : 'transparent',
            color: showCustom ? L.white : L.gold,
            border: `1.5px solid ${L.gold}`,
          }}
        >
          #
        </button>
      </div>
      {showCustom && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="number" min={1} max={total}
            value={customN}
            onChange={e => onCustomN(Math.min(total, Math.max(1, parseInt(e.target.value, 10) || 1)))}
            style={{
              width: 80, padding: '8px 10px', borderRadius: 8,
              border: `1.5px solid ${L.gold}`, fontFamily: 'Bungee, sans-serif',
              fontSize: 14, color: L.dark, background: L.white, outline: 'none',
            }}
          />
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: L.mid }}>books</span>
        </div>
      )}
    </div>
  );
}

// ── Book row in the checklist ─────────────────────────────────────────────────
function BookRow({ book, checked, onToggle }) {
  const score = neglectScore(book);
  const reason = score.neverViewed
    ? `${ageLabel(book.date || book.addedAt)} · never opened`
    : `${ageLabel(book.date || book.addedAt)} · ${viewedLabel(book.lastViewedAt)}`;

  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      padding: '12px 14px',
      borderRadius: 10,
      border: `1.5px solid ${checked ? `${L.gold}66` : 'rgba(0,0,0,0.07)'}`,
      background: checked ? `${L.gold}08` : L.white,
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      {/* Checkbox */}
      <div style={{
        width: 20, height: 20, flexShrink: 0, borderRadius: 5,
        border: `2px solid ${checked ? L.gold : L.muted}`,
        background: checked ? L.gold : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s, border-color 0.12s',
      }}>
        {checked && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4L4 7.5L10 1" stroke={L.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={onToggle} style={{ display: 'none' }} />

      {/* Cover */}
      <div style={{
        width: 40, height: 56, flexShrink: 0, borderRadius: 4,
        overflow: 'hidden', background: '#eee',
        boxShadow: '1px 1px 4px rgba(0,0,0,0.1)',
      }}>
        <img
          src={book.coverUrl || book.coverURL || CAT_SRC}
          alt={book.title}
          onError={onCoverError}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700,
          color: L.dark, lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {book.title}
        </p>
        {book.author && (
          <p style={{ margin: '2px 0 0', fontFamily: 'Special Elite, serif', fontSize: 11, color: L.mid }}>
            {book.author}
          </p>
        )}
        <p style={{ margin: '4px 0 0', fontFamily: 'Special Elite, serif', fontSize: 10, color: L.muted, fontStyle: 'italic' }}>
          {reason}
        </p>
      </div>
    </label>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ThinTheStack({ readNext, onBack }) {
  const { user } = useAuth();
  const [fraction, setFraction] = useState(0.25);
  const [customN, setCustomN]   = useState(1);
  const [useCustom, setUseCustom] = useState(false);
  const [checked, setChecked]   = useState(null); // null = not yet computed
  const [phase, setPhase]       = useState('select'); // 'select' | 'review' | 'done'
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState('');

  const eligible = useMemo(() => {
    return sortByNeglect((readNext || []).filter(b => b.title));
  }, [readNext]);

  const targetN = useCustom
    ? Math.min(eligible.length, Math.max(1, customN))
    : Math.min(eligible.length, Math.max(1, Math.round(eligible.length * fraction)));

  const candidates = useMemo(() => eligible.slice(0, targetN), [eligible, targetN]);

  const handleProceed = () => {
    const initial = new Set(candidates.map(b => b.id));
    setChecked(initial);
    setPhase('review');
  };

  const toggleItem = (id) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!user || !checked?.size) return;
    setDeleting(true);
    setError('');
    try {
      await Promise.all(
        [...checked].map(id =>
          deleteDoc(doc(db, 'users', user.uid, 'libraryReadNext', id))
        )
      );
      setPhase('done');
    } catch (err) {
      console.error('[ThinTheStack] delete error:', err);
      setError('Something went wrong. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  const checkedCount = checked?.size ?? 0;

  // ── No books ────────────────────────────────────────────────────────────────
  if (!eligible.length) {
    return (
      <Shell onBack={onBack}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: L.muted, marginBottom: 10 }}>NOTHING TO TRIM</p>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: L.muted, fontStyle: 'italic', lineHeight: 1.6 }}>
            Your Read Next list has fewer than 5 books. Add more before thinning.
          </p>
        </div>
      </Shell>
    );
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <Shell onBack={onBack}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✂</div>
          <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: L.gold, marginBottom: 8 }}>STACK THINNED</p>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 14, color: L.mid, lineHeight: 1.6, fontStyle: 'italic' }}>
            {checkedCount} book{checkedCount !== 1 ? 's' : ''} removed from Read Next. You can always re-add them later.
          </p>
          <button onClick={onBack}
            style={{
              marginTop: 20, padding: '12px 24px', borderRadius: 10, cursor: 'pointer',
              background: L.gold, border: 'none',
              fontFamily: 'Bungee, sans-serif', fontSize: 12, color: L.white, letterSpacing: '0.06em',
            }}
          >
            BACK TO THE DESK
          </button>
        </div>
      </Shell>
    );
  }

  // ── Review checklist ────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <Shell onBack={() => setPhase('select')}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.gold, letterSpacing: '0.1em', marginBottom: 4 }}>
            REVIEW YOUR CUTS
          </p>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: L.muted }}>
            These are your most neglected picks. Uncheck any you want to keep.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {candidates.map(book => (
            <BookRow
              key={book.id}
              book={book}
              checked={checked?.has(book.id) ?? true}
              onToggle={() => toggleItem(book.id)}
            />
          ))}
        </div>

        {error && (
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: L.coral, marginBottom: 10 }}>{error}</p>
        )}

        <button
          onClick={handleConfirm}
          disabled={deleting || checkedCount === 0}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 10, cursor: deleting || checkedCount === 0 ? 'default' : 'pointer',
            background: checkedCount === 0 ? L.muted : L.gold,
            border: 'none',
            fontFamily: 'Bungee, sans-serif', fontSize: 13, color: L.white, letterSpacing: '0.06em',
            opacity: deleting || checkedCount === 0 ? 0.5 : 1, transition: 'opacity 0.15s',
          }}
        >
          {deleting ? 'REMOVING…' : `REMOVE ${checkedCount} BOOK${checkedCount !== 1 ? 'S' : ''}`}
        </button>
      </Shell>
    );
  }

  // ── Select amount ────────────────────────────────────────────────────────────
  return (
    <Shell onBack={onBack}>
      <AmountSelector
        total={eligible.length}
        fraction={fraction}
        onFraction={(f) => { setFraction(f); setUseCustom(false); }}
        customN={customN}
        onCustomN={(n) => { setCustomN(n); setUseCustom(true); }}
      />

      {/* Preview of what will be selected */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: L.muted, letterSpacing: '0.08em', marginBottom: 10 }}>
          WILL SELECT (most neglected first)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {candidates.slice(0, 5).map(book => {
            const score = neglectScore(book);
            return (
              <div key={book.id} style={{
                display: 'flex', gap: 10, alignItems: 'center',
                padding: '8px 10px', borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.07)', background: L.white,
              }}>
                <div style={{ width: 28, height: 38, flexShrink: 0, borderRadius: 3, overflow: 'hidden', background: '#eee' }}>
                  <img src={book.coverUrl || book.coverURL || CAT_SRC} alt={book.title} onError={onCoverError}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 11, fontWeight: 700, color: L.dark,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {book.title}
                  </p>
                  <p style={{ margin: 0, fontFamily: 'Special Elite, serif', fontSize: 9, color: L.muted, fontStyle: 'italic' }}>
                    {score.neverViewed ? `${ageLabel(book.date || book.addedAt)} · never opened` : viewedLabel(book.lastViewedAt)}
                  </p>
                </div>
              </div>
            );
          })}
          {candidates.length > 5 && (
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: L.muted, fontStyle: 'italic', textAlign: 'center', margin: '4px 0 0' }}>
              + {candidates.length - 5} more
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleProceed}
        disabled={targetN === 0}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 10, cursor: 'pointer',
          background: L.gold, border: 'none',
          fontFamily: 'Bungee, sans-serif', fontSize: 13, color: L.white, letterSpacing: '0.06em',
          opacity: targetN === 0 ? 0.4 : 1,
        }}
      >
        REVIEW {targetN} BOOK{targetN !== 1 ? 'S' : ''}
      </button>
    </Shell>
  );
}

// ── Shared shell ──────────────────────────────────────────────────────────────
function Shell({ onBack, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: L.bg, overflowY: 'auto', fontFamily: 'Special Elite, serif' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: L.bg, borderBottom: `2px solid ${L.gold}`,
        padding: '12px 16px', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 600, margin: '0 auto' }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Bungee, sans-serif', fontSize: 11, color: L.dark,
              letterSpacing: '0.06em', padding: '4px 8px', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = L.gold}
            onMouseLeave={e => e.currentTarget.style.color = L.dark}
          >
            BACK
          </button>
          <div>
            <p style={{ margin: 0, fontFamily: 'Bungee, sans-serif', fontSize: 9, color: L.muted, letterSpacing: '0.14em', textAlign: 'center' }}>
              THE LIBRARIAN'S DESK
            </p>
            <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 16, color: L.dark, fontWeight: 700, textAlign: 'center' }}>
              Thin the Stack
            </h1>
          </div>
          <div style={{ width: 56 }} />
        </div>
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 80px' }}>
        {children}
      </div>
    </div>
  );
}
