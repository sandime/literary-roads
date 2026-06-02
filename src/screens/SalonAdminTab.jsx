// src/screens/SalonAdminTab.jsx
// Admin tab for managing The Salon bimonthly reading periods.
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
  bookTitle: '', bookAuthor: '', coverURL: '',
  startDate: '', endDate: '', nextBookAnnounceDate: '',
  status: 'open', gazetteReviewURL: '', published: false,
};

function SalonForm({ period, onSave, onClose, saving }) {
  const isEdit = !!period?.id;
  const toInputDate = (ts) => {
    if (!ts) return '';
    const d = ts?.toDate?.() ?? new Date(ts);
    return d.toISOString().slice(0, 10);
  };
  const [form, setForm] = useState(() => isEdit ? {
    bookTitle:             period.bookTitle             || '',
    bookAuthor:            period.bookAuthor            || '',
    coverURL:              period.coverURL              || '',
    startDate:             toInputDate(period.startDate),
    endDate:               toInputDate(period.endDate),
    nextBookAnnounceDate:  toInputDate(period.nextBookAnnounceDate),
    status:                period.status               || 'open',
    gazetteReviewURL:      period.gazetteReviewURL      || '',
    published:             period.published             ?? false,
  } : { ...EMPTY_FORM });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toTimestamp = (s) => s ? Timestamp.fromDate(new Date(s)) : null;

  const handleSave = () => {
    onSave({
      bookTitle:            form.bookTitle.trim(),
      bookAuthor:           form.bookAuthor.trim(),
      coverURL:             form.coverURL.trim(),
      startDate:            toTimestamp(form.startDate),
      endDate:              toTimestamp(form.endDate),
      nextBookAnnounceDate: toTimestamp(form.nextBookAnnounceDate),
      status:               form.status,
      gazetteReviewURL:     form.gazetteReviewURL.trim(),
      published:            form.published,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.surface, borderRadius: 12, padding: 24, width: '100%',
        maxWidth: 520, border: `1px solid ${C.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.gold,
          letterSpacing: '0.06em', marginBottom: 20 }}>
          {isEdit ? 'EDIT SALON PERIOD' : 'NEW SALON PERIOD'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>BOOK TITLE</label>
            <input style={inp} value={form.bookTitle} onChange={e => set('bookTitle', e.target.value)} placeholder="e.g. Demon Copperhead"/>
          </div>
          <div>
            <label style={lbl}>AUTHOR</label>
            <input style={inp} value={form.bookAuthor} onChange={e => set('bookAuthor', e.target.value)} placeholder="e.g. Barbara Kingsolver"/>
          </div>
          <div>
            <label style={lbl}>COVER IMAGE URL</label>
            <input style={inp} value={form.coverURL} onChange={e => set('coverURL', e.target.value)} placeholder="https://…"/>
            {form.coverURL && (
              <img src={form.coverURL} alt="" style={{ marginTop: 6, height: 80, borderRadius: 3, objectFit: 'cover' }}/>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>START DATE</label>
              <input type="date" style={inp} value={form.startDate} onChange={e => set('startDate', e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>END DATE</label>
              <input type="date" style={inp} value={form.endDate} onChange={e => set('endDate', e.target.value)}/>
            </div>
          </div>
          <div>
            <label style={lbl}>NEXT BOOK ANNOUNCE DATE</label>
            <input type="date" style={inp} value={form.nextBookAnnounceDate} onChange={e => set('nextBookAnnounceDate', e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>STATUS</label>
            <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="open">Open — accepting cards</option>
              <option value="review">Community Review — closed, gazette published</option>
            </select>
          </div>
          <div>
            <label style={lbl}>GAZETTE REVIEW URL (when status=review)</label>
            <input style={inp} value={form.gazetteReviewURL} onChange={e => set('gazetteReviewURL', e.target.value)} placeholder="https://…"/>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            fontFamily: 'Special Elite, serif', fontSize: 13, color: C.white }}>
            <input type="checkbox" checked={form.published} onChange={e => set('published', e.target.checked)}
              style={{ accentColor: C.gold, width: 16, height: 16 }}/>
            Published (visible to users)
          </label>
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

export default function SalonAdminTab({ showToast }) {
  const [periods, setPeriods] = useState([]);
  const [editing, setEditing]   = useState(null);  // null = closed, {} = new, {id,…} = edit
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);

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
          memberCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
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
    if (!window.confirm('Delete this salon period? Cards and replies will remain.')) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, 'salon', id));
      showToast('Period deleted.');
    } catch (err) {
      showToast('Error deleting: ' + err.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  const fmtDate = (ts) => {
    if (!ts) return '—';
    const d = ts?.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: C.gold,
            letterSpacing: '0.06em', margin: 0 }}>THE SALON</h2>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted,
            margin: '4px 0 0' }}>Bimonthly reading periods</p>
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
          <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {p.coverURL && (
              <img src={p.coverURL} alt={p.bookTitle}
                style={{ width: 44, height: 66, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}/>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: C.white,
                letterSpacing: '0.04em' }}>{p.bookTitle || '(untitled)'}</div>
              <div style={{ fontFamily: 'Special Elite, serif', fontStyle: 'italic', fontSize: 12,
                color: C.silver, marginTop: 2 }}>{p.bookAuthor}</div>
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.gold,
                marginTop: 4 }}>{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
                  padding: '2px 8px', borderRadius: 4,
                  background: p.published ? 'rgba(201,168,76,0.15)' : 'rgba(192,192,192,0.1)',
                  color: p.published ? C.gold : C.muted,
                  border: `1px solid ${p.published ? 'rgba(201,168,76,0.4)' : 'rgba(192,192,192,0.2)'}` }}>
                  {p.published ? 'PUBLISHED' : 'DRAFT'}
                </span>
                <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
                  padding: '2px 8px', borderRadius: 4, background: 'rgba(192,192,192,0.08)',
                  color: p.status === 'open' ? '#7bc67e' : C.muted,
                  border: `1px solid ${p.status === 'open' ? 'rgba(123,198,126,0.3)' : 'rgba(192,192,192,0.2)'}` }}>
                  {p.status === 'open' ? 'OPEN' : 'REVIEW'}
                </span>
                <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted }}>
                  {p.memberCount ?? 0} members
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setEditing(p)}
                style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
                  padding: '6px 12px', borderRadius: 6, background: 'transparent',
                  color: C.gold, border: `1px solid rgba(201,168,76,0.4)`, cursor: 'pointer' }}>
                EDIT
              </button>
              <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.06em',
                  padding: '6px 12px', borderRadius: 6, background: 'transparent',
                  color: C.muted, border: '1px solid rgba(192,192,192,0.2)', cursor: 'pointer' }}>
                {deleting === p.id ? '…' : 'DELETE'}
              </button>
            </div>
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
