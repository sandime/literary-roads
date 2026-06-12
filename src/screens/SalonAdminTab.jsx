// src/screens/SalonAdminTab.jsx
import { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const C = {
  bg:      '#0D0E1A',
  surface: '#1A1B2E',
  border:  'rgba(201,168,76,0.2)',
  gold:    '#C9A84C',
  orange:  '#FF4E00',
  pink:    '#f66483',
  teal:    '#30b8b2',
  white:   '#F5F5DC',
  silver:  '#C0C0C0',
  muted:   'rgba(192,192,192,0.45)',
};

const inp = {
  width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
  padding: '8px 10px', color: C.white, fontFamily: 'Special Elite, serif', fontSize: 13,
  boxSizing: 'border-box',
};
const lbl = {
  display: 'block', fontFamily: 'Bungee, sans-serif', fontSize: 8,
  color: C.gold, letterSpacing: '0.07em', marginBottom: 4,
};

const EMPTY_FORM = {
  bookTitle: '', bookAuthor: '',
  coverImage: '', openLibraryCoverId: '',
  editorialNote: '',
  startDate: '', endDate: '', nextBookDate: '',
  status: 'upcoming',
  gazetteIssueId: '',
  pullQuote: '', pullQuoteVisible: false,
};

function SalonForm({ period, onSave, onClose, saving }) {
  const isEdit = !!period?.id;

  const toInputDate = (ts) => {
    if (!ts) return '';
    const d = ts?.toDate?.() ?? new Date(ts);
    return d.toISOString().slice(0, 10);
  };

  const [form, setForm] = useState(() => isEdit ? {
    bookTitle:          period.bookTitle              || '',
    bookAuthor:         period.bookAuthor             || '',
    coverImage:         period.coverImage             || period.coverURL || '',
    openLibraryCoverId: period.openLibraryCoverId     || '',
    editorialNote:      period.editorialNote          || '',
    startDate:          toInputDate(period.startDate),
    endDate:            toInputDate(period.endDate),
    nextBookDate:       toInputDate(period.nextBookDate || period.nextBookAnnounceDate),
    status:             period.status                 || 'upcoming',
    gazetteIssueId:     period.gazetteIssueId         || '',
    pullQuote:          period.pullQuote              || '',
    pullQuoteVisible:   period.pullQuoteVisible       ?? false,
  } : { ...EMPTY_FORM });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toTimestamp = s => s ? Timestamp.fromDate(new Date(s)) : null;

  const handleSave = () => {
    onSave({
      bookTitle:          form.bookTitle.trim(),
      bookAuthor:         form.bookAuthor.trim(),
      coverImage:         form.coverImage.trim(),
      openLibraryCoverId: form.openLibraryCoverId.trim(),
      editorialNote:      form.editorialNote.trim(),
      startDate:          toTimestamp(form.startDate),
      endDate:            toTimestamp(form.endDate),
      nextBookDate:       toTimestamp(form.nextBookDate),
      status:             form.status,
      gazetteIssueId:     form.gazetteIssueId.trim(),
      pullQuote:          form.pullQuote.trim(),
      pullQuoteVisible:   form.pullQuoteVisible,
    });
  };

  const previewSrc = form.coverImage ||
    (form.openLibraryCoverId
      ? `https://covers.openlibrary.org/b/id/${form.openLibraryCoverId}-M.jpg`
      : null);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.surface, borderRadius: 12, padding: 24, width: '100%',
        maxWidth: 560, border: `1px solid ${C.border}`, maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.gold,
          letterSpacing: '0.06em', marginBottom: 20 }}>
          {isEdit ? 'EDIT SALON PERIOD' : 'NEW SALON PERIOD'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>BOOK TITLE</label>
              <input style={inp} value={form.bookTitle}
                onChange={e => set('bookTitle', e.target.value)} placeholder="e.g. Demon Copperhead"/>
            </div>
            <div>
              <label style={lbl}>AUTHOR</label>
              <input style={inp} value={form.bookAuthor}
                onChange={e => set('bookAuthor', e.target.value)} placeholder="e.g. Barbara Kingsolver"/>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>COVER IMAGE URL</label>
              <input style={inp} value={form.coverImage}
                onChange={e => set('coverImage', e.target.value)} placeholder="https://…"/>
            </div>
            <div>
              <label style={lbl}>OPEN LIBRARY COVER ID (fallback)</label>
              <input style={inp} value={form.openLibraryCoverId}
                onChange={e => set('openLibraryCoverId', e.target.value)} placeholder="e.g. 12345678"/>
            </div>
          </div>

          {previewSrc && (
            <img src={previewSrc} alt="" onError={e => { e.target.style.display = 'none'; }}
              style={{ height: 90, borderRadius: 3, objectFit: 'cover', marginTop: -6 }}/>
          )}

          <div>
            <label style={lbl}>EDITORIAL NOTE (300 chars)</label>
            <textarea style={{ ...inp, resize: 'vertical' }} rows={3}
              value={form.editorialNote} maxLength={300}
              onChange={e => set('editorialNote', e.target.value)}
              placeholder="2–3 sentences introducing the selection…"/>
            <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted,
              marginTop: 3, textAlign: 'right' }}>
              {form.editorialNote.length}/300
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>START DATE</label>
              <input type="date" style={inp} value={form.startDate}
                onChange={e => set('startDate', e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>END DATE</label>
              <input type="date" style={inp} value={form.endDate}
                onChange={e => set('endDate', e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>NEXT BOOK ANNOUNCE DATE</label>
              <input type="date" style={inp} value={form.nextBookDate}
                onChange={e => set('nextBookDate', e.target.value)}/>
            </div>
          </div>

          <div>
            <label style={lbl}>STATUS</label>
            <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="upcoming">Upcoming — announced, not yet started</option>
              <option value="active">Active — reading period open</option>
              <option value="closed">Closed — reading period ended</option>
            </select>
          </div>

          <div>
            <label style={lbl}>GAZETTE ISSUE ID (when closed)</label>
            <input style={inp} value={form.gazetteIssueId}
              onChange={e => set('gazetteIssueId', e.target.value)}
              placeholder="e.g. spring-2026 — the slug used in /newspaper/:slug"/>
          </div>

          <div>
            <label style={lbl}>PULL QUOTE (200 chars, optional)</label>
            <textarea style={{ ...inp, resize: 'vertical' }} rows={2}
              value={form.pullQuote} maxLength={200}
              onChange={e => set('pullQuote', e.target.value)}
              placeholder="A standout reader quote to feature…"/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <input type="checkbox" id="pqvis" checked={form.pullQuoteVisible}
                onChange={e => set('pullQuoteVisible', e.target.checked)}
                style={{ accentColor: C.gold, width: 14, height: 14 }}/>
              <label htmlFor="pqvis" style={{ fontFamily: 'Special Elite, serif', fontSize: 12,
                color: C.white, cursor: 'pointer' }}>
                Show pull quote on card
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={handleSave} disabled={saving || !form.bookTitle}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em',
              padding: '10px 18px', borderRadius: 8, background: C.gold, color: '#1A0F0A',
              border: 'none', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'SAVING…' : isEdit ? 'SAVE CHANGES' : 'CREATE PERIOD'}
          </button>
          <button onClick={onClose}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em',
              padding: '10px 18px', borderRadius: 8, background: 'transparent',
              color: C.silver, border: `1px solid rgba(192,192,192,0.3)`, cursor: 'pointer' }}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reviews panel for a single salon period ────────────────────────────────────
function ReviewsPanel({ salonId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'salon', salonId, 'reviews'),
      orderBy('submittedAt', 'desc'),
    );
    return onSnapshot(q, snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }, [salonId]);

  const toggleFeatured = async (reviewId, current) => {
    await updateDoc(doc(db, 'salon', salonId, 'reviews', reviewId), { isFeatured: !current });
  };

  const setPullQuote = async (review) => {
    await updateDoc(doc(db, 'salon', salonId), {
      pullQuote: review.oneSentence,
      pullQuoteVisible: true,
    });
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    await deleteDoc(doc(db, 'salon', salonId, 'reviews', reviewId));
  };

  const fmtDate = ts => {
    if (!ts) return '';
    const d = ts?.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);

  if (loading) return (
    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted, padding: '12px 0' }}>
      Loading reviews…
    </div>
  );

  if (reviews.length === 0) return (
    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted,
      padding: '12px 0', fontStyle: 'italic' }}>
      No reviews yet.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10 }}>
      {reviews.map(r => (
        <div key={r.id} style={{ background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10,
                  color: C.white, letterSpacing: '0.04em' }}>{r.username}</span>
                <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11,
                  color: C.gold }}>{stars(r.rating || 0)}</span>
                <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10,
                  color: C.muted, marginLeft: 'auto' }}>{fmtDate(r.submittedAt)}</span>
              </div>
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: '#E5D9C2',
                fontStyle: 'italic', lineHeight: 1.4, marginBottom: 4 }}>
                "{r.oneSentence}"
              </div>
              {r.fullResponse && (
                <div style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.silver,
                  lineHeight: 1.4 }}>
                  {r.fullResponse}
                </div>
              )}
            </div>
            {r.isFeatured && (
              <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8,
                color: C.gold, border: `1px solid rgba(201,168,76,0.4)`,
                borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                FEATURED
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => toggleFeatured(r.id, r.isFeatured)}
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, letterSpacing: '0.05em',
                padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                background: r.isFeatured ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: C.gold, border: `1px solid rgba(201,168,76,0.35)` }}>
              {r.isFeatured ? 'UNFEATURE' : 'FEATURE'}
            </button>
            <button onClick={() => setPullQuote(r)}
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, letterSpacing: '0.05em',
                padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                background: 'transparent', color: C.silver,
                border: '1px solid rgba(192,192,192,0.25)' }}>
              SET AS PULL QUOTE
            </button>
            <button onClick={() => handleDelete(r.id)}
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, letterSpacing: '0.05em',
                padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                background: 'transparent', color: 'rgba(220,38,38,0.7)',
                border: '1px solid rgba(220,38,38,0.3)', marginLeft: 'auto' }}>
              DELETE
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main admin tab ─────────────────────────────────────────────────────────────
export default function SalonAdminTab({ showToast }) {
  const [periods, setPeriods]       = useState([]);
  const [editing, setEditing]       = useState(null);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(null);
  const [expandedReviews, setExpandedReviews] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'salon'), orderBy('startDate', 'desc'));
    return onSnapshot(q, snap => {
      setPeriods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
  }, []);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editing?.id) {
        await updateDoc(doc(db, 'salon', editing.id), { ...data, updatedAt: serverTimestamp() });
        showToast('Salon period updated.');
      } else {
        await addDoc(collection(db, 'salon'), {
          ...data,
          participantCount: 0, reviewCount: 0,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        showToast('Salon period created.');
      }
      setEditing(null);
    } catch (err) {
      showToast('Error saving: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this salon period?')) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, 'salon', id));
      showToast('Period deleted.');
      if (expandedReviews === id) setExpandedReviews(null);
    } catch (err) {
      showToast('Error deleting: ' + err.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  const fmtDate = ts => {
    if (!ts) return '—';
    const d = ts?.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusColor = s => s === 'active' || s === 'open' ? '#7bc67e'
    : s === 'upcoming' ? C.teal : C.muted;

  const statusLabel = s => s === 'active' || s === 'open' ? 'ACTIVE'
    : s === 'upcoming' ? 'UPCOMING' : s === 'closed' || s === 'review' ? 'CLOSED' : s.toUpperCase();

  return (
    <div style={{ padding: '24px 20px', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: C.gold,
            letterSpacing: '0.06em', margin: 0 }}>THE SALON</h2>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted,
            margin: '4px 0 0' }}>Bimonthly reading selections</p>
        </div>
        <button onClick={() => setEditing({})}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em',
            padding: '8px 14px', borderRadius: 8, background: C.gold, color: '#1A0F0A',
            border: 'none', cursor: 'pointer' }}>
          + NEW PERIOD
        </button>
      </div>

      {periods.length === 0 && (
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted }}>
          No salon periods yet. Create the first one.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {periods.map(p => (
          <div key={p.id}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>

              {/* Cover */}
              {(p.coverImage || p.coverURL) && (
                <img src={p.coverImage || p.coverURL} alt={p.bookTitle}
                  onError={e => { e.target.style.display = 'none'; }}
                  style={{ width: 44, height: 66, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}/>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: C.white,
                  letterSpacing: '0.04em' }}>{p.bookTitle || '(untitled)'}</div>
                <div style={{ fontFamily: 'Special Elite, serif', fontStyle: 'italic', fontSize: 12,
                  color: C.silver, marginTop: 2 }}>{p.bookAuthor}</div>
                <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.gold,
                  marginTop: 4 }}>{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
                    padding: '2px 8px', borderRadius: 4, background: 'rgba(192,192,192,0.08)',
                    color: statusColor(p.status), border: `1px solid ${statusColor(p.status)}40` }}>
                    {statusLabel(p.status)}
                  </span>
                  <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted }}>
                    {p.participantCount ?? p.memberCount ?? 0} readers
                  </span>
                  {p.reviewCount > 0 && (
                    <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted }}>
                      · {p.reviewCount} reviews
                    </span>
                  )}
                  {p.gazetteIssueId && (
                    <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.teal }}>
                      gazette: {p.gazetteIssueId}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setEditing(p)}
                  style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
                    padding: '6px 12px', borderRadius: 6, background: 'transparent',
                    color: C.gold, border: `1px solid rgba(201,168,76,0.4)`, cursor: 'pointer' }}>
                  EDIT
                </button>
                <button
                  onClick={() => setExpandedReviews(expandedReviews === p.id ? null : p.id)}
                  style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
                    padding: '6px 12px', borderRadius: 6, background: 'transparent',
                    color: expandedReviews === p.id ? C.teal : C.silver,
                    border: `1px solid ${expandedReviews === p.id ? C.teal : 'rgba(192,192,192,0.25)'}`,
                    cursor: 'pointer' }}>
                  REVIEWS
                </button>
                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                  style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
                    padding: '6px 12px', borderRadius: 6, background: 'transparent',
                    color: C.muted, border: '1px solid rgba(192,192,192,0.2)', cursor: 'pointer' }}>
                  {deleting === p.id ? '…' : 'DELETE'}
                </button>
              </div>
            </div>

            {/* Reviews panel — expands below the period card */}
            {expandedReviews === p.id && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`,
                borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '0 16px 16px' }}>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.teal,
                  letterSpacing: '0.06em', padding: '12px 0 0' }}>
                  READER REVIEWS
                </div>
                <ReviewsPanel salonId={p.id}/>
              </div>
            )}
          </div>
        ))}
      </div>

      {editing !== null && (
        <SalonForm
          period={editing?.id ? editing : null}
          onSave={handleSave}
          onClose={() => setEditing(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
