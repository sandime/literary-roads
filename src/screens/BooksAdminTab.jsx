// Admin tab for the shared books collection.
// Separate from AdminUpload (which is for physical places with lat/lng).
// Accepts JSON upload, CSV upload, and manual entry.
// JSON format expected: array of { title, authors, description, coverUrl, categories, settings? }
// CSV columns: title, authors (semicolon-separated), description, coverUrl, categories, googleBooksId

import { useState, useRef } from 'react';
import {
  collection, doc, setDoc, getDoc, serverTimestamp, getDocs, deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const C = {
  bg:     '#1A1B2E',
  card:   '#252640',
  teal:   '#38C5C5',
  orange: '#FF4E00',
  muted:  '#888',
  text:   '#EEF0FF',
  gold:   '#C9A84C',
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#1a1b2e', border: '1px solid rgba(56,197,197,0.3)',
  borderRadius: 8, color: C.text, padding: '9px 12px',
  fontFamily: 'Special Elite, serif', fontSize: 13, outline: 'none',
};

const labelStyle = {
  fontFamily: 'Bungee, sans-serif', fontSize: 10,
  color: C.teal, letterSpacing: '0.1em', display: 'block', marginBottom: 5,
};

// Build Firestore doc from a raw book object
function buildBookDoc(raw) {
  const title  = (raw.title  || '').trim();
  if (!title) return null;

  const authors = Array.isArray(raw.authors)
    ? raw.authors
    : typeof raw.authors === 'string'
      ? raw.authors.split(';').map(a => a.trim()).filter(Boolean)
      : [];

  const settings = Array.isArray(raw.settings) ? raw.settings : [];
  const stateIndex   = [...new Set(
    settings.filter(s => s.type === 'state' && (s.confidence === 'high' || s.confidence === 'medium'))
             .map(s => s.place.toLowerCase())
  )];
  const settingTypes = [...new Set(
    settings.filter(s => s.confidence === 'high' || s.confidence === 'medium')
             .map(s => s.type)
  )];

  return {
    title,
    authors,
    description:      (raw.description   || '').trim(),
    coverUrl:         (raw.coverUrl      || raw.cover_url || '').toString().trim(),
    pageCount:        raw.pageCount ? Number(raw.pageCount) : null,
    categories:       Array.isArray(raw.categories) ? raw.categories
                        : typeof raw.categories === 'string'
                          ? raw.categories.split(';').map(s => s.trim()).filter(Boolean)
                          : [],
    settings,
    stateIndex,
    settingTypes,
    moods:            [],
    featured:         raw.featured || false,
    enrichmentVersion: settings.length > 0 ? 1 : 0,
    lastEnrichedAt:   settings.length > 0 ? new Date().toISOString() : null,
  };
}

// Parse CSV into array of raw book objects
function parseBookCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const splitRow = (line) => {
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };
  const headers = splitRow(lines[0]).map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const vals = splitRow(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').replace(/^"|"$/g, '').trim(); });
    return row;
  }).filter(r => r.title);
}

// ── Manual entry form ─────────────────────────────────────────────────────────
function ManualEntry({ showToast }) {
  const empty = { title: '', authors: '', description: '', coverUrl: '', categories: '', googleBooksId: '', settingPlace: '', settingType: 'state', settingConfidence: 'high' };
  const [form, setForm]   = useState(empty);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const raw = {
        title:       form.title,
        authors:     form.authors,
        description: form.description,
        coverUrl:    form.coverUrl,
        categories:  form.categories,
        settings:    form.settingPlace ? [{ place: form.settingPlace, type: form.settingType, confidence: form.settingConfidence, source: 'manual' }] : [],
      };
      const bookDoc = buildBookDoc(raw);
      if (!bookDoc) { showToast('Could not build book doc', 'error'); return; }

      const id = form.googleBooksId.trim() ||
        `manual_${form.title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)}_${Date.now()}`;

      await setDoc(doc(db, 'books', id), { ...bookDoc, createdAt: serverTimestamp() }, { merge: true });
      showToast(`Saved: ${form.title}`, 'success');
      setForm(empty);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally { setSaving(false); }
  };

  const field = (label, key, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {type === 'textarea' ? (
        <textarea value={form[key]} onChange={e => set(key, e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} />
      ) : (
        <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
          placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  );

  return (
    <div>
      {field('TITLE *', 'title', 'text', 'Book title')}
      {field('AUTHORS', 'authors', 'text', 'Author names, semicolon-separated')}
      {field('DESCRIPTION', 'description', 'textarea', 'Short description or synopsis')}
      {field('COVER URL', 'coverUrl', 'text', 'https://...')}
      {field('CATEGORIES', 'categories', 'text', 'Fiction; Literary Fiction; etc.')}
      {field('GOOGLE BOOKS ID', 'googleBooksId', 'text', 'Leave blank to auto-generate')}

      <div style={{ borderTop: '1px solid rgba(56,197,197,0.15)', paddingTop: 14, marginBottom: 14 }}>
        <p style={{ ...labelStyle, marginBottom: 10 }}>SETTING (optional — one per manual entry)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ ...labelStyle, fontSize: 9 }}>PLACE</label>
            <input value={form.settingPlace} onChange={e => set('settingPlace', e.target.value)}
              placeholder="e.g. Montana" style={{ ...inputStyle, fontSize: 12 }} />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: 9 }}>TYPE</label>
            <select value={form.settingType} onChange={e => set('settingType', e.target.value)}
              style={{ ...inputStyle, fontSize: 12 }}>
              {['state','city','country','region','house','vessel','planet','fictional_town','fictional_world','journey'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: 9 }}>CONFIDENCE</label>
            <select value={form.settingConfidence} onChange={e => set('settingConfidence', e.target.value)}
              style={{ ...inputStyle, fontSize: 12 }}>
              {['high','medium','low'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10, cursor: 'pointer',
          background: C.teal, border: 'none', fontFamily: 'Bungee, sans-serif',
          fontSize: 12, color: '#fff', letterSpacing: '0.06em',
          opacity: saving ? 0.6 : 1,
        }}>
        {saving ? 'SAVING…' : 'ADD BOOK'}
      </button>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function BooksAdminTab({ showToast }) {
  const [mode, setMode]       = useState('json'); // 'json' | 'csv' | 'manual'
  const [file, setFile]       = useState(null);
  const [parsed, setParsed]   = useState([]);
  const [phase, setPhase]     = useState('idle'); // 'idle' | 'uploading' | 'done'
  const [stats, setStats]     = useState({ total: 0, added: 0, skipped: 0, errors: 0 });
  const [firstError, setFirstError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setParsed([]);
    setPhase('idle');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      try {
        if (mode === 'json') {
          const raw = JSON.parse(text);
          const arr = Array.isArray(raw) ? raw : [raw];
          setParsed(arr.filter(b => b.title));
        } else {
          setParsed(parseBookCSV(text));
        }
      } catch { showToast('Could not parse file', 'error'); }
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!parsed.length) return;
    setPhase('uploading');
    setFirstError('');
    const s = { total: parsed.length, added: 0, skipped: 0, errors: 0 };
    let capturedError = '';

    for (const raw of parsed) {
      const bookDoc = buildBookDoc(raw);
      if (!bookDoc) { s.errors++; continue; }

      const id = (raw.googleBooksId || raw.id || '').trim() ||
        `import_${bookDoc.title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      try {
        const snap = await getDoc(doc(db, 'books', id));
        if (snap.exists()) { s.skipped++; continue; }
        await setDoc(doc(db, 'books', id), { ...bookDoc, createdAt: serverTimestamp() });
        s.added++;
      } catch (err) {
        console.error('[BooksAdmin] upload error:', err);
        if (!capturedError) capturedError = err.message;
        s.errors++;
      }
    }
    setStats(s);
    setFirstError(capturedError);
    setPhase('done');
    showToast(`Done: ${s.added} added, ${s.skipped} skipped, ${s.errors} errors`, s.errors > 0 ? 'error' : 'success');
  };

  const handleDeleteAll = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleteConfirm(false);
    try {
      const snap = await getDocs(collection(db, 'books'));
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      showToast(`Deleted ${snap.size} books`, 'success');
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const tabBtn = (key, label) => (
    <button onClick={() => { setMode(key); setFile(null); setParsed([]); setPhase('idle'); }}
      style={{
        padding: '9px 14px', cursor: 'pointer', background: 'transparent',
        border: 'none', borderBottom: mode === key ? `2px solid ${C.teal}` : '2px solid transparent',
        fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em',
        color: mode === key ? C.teal : C.muted, transition: 'color 0.15s',
      }}>
      {label}
    </button>
  );

  return (
    <div style={{ color: C.text }}>
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid rgba(56,197,197,0.15)' }}>
        {tabBtn('json', 'JSON')}
        {tabBtn('csv', 'CSV')}
        {tabBtn('manual', 'MANUAL')}
      </div>

      {mode === 'manual' ? (
        <ManualEntry showToast={showToast} />
      ) : (
        <>
          {/* Expected fields hint */}
          <div style={{ background: 'rgba(56,197,197,0.06)', border: '1px solid rgba(56,197,197,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ ...labelStyle, marginBottom: 6 }}>EXPECTED FIELDS</p>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.7 }}>
              <span style={{ color: C.text }}>Required:</span> title<br />
              <span style={{ color: C.text }}>Optional:</span> authors (array or semicolons), description, coverUrl, categories, googleBooksId<br />
              <span style={{ color: C.text }}>Settings:</span> settings array — each with place, type, confidence, source
            </p>
          </div>

          <input ref={fileRef} type="file" accept={mode === 'json' ? '.json' : '.csv,.txt'}
            onChange={handleFileChange} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()}
            style={{
              width: '100%', padding: '14px 0',
              border: '2px dashed rgba(56,197,197,0.35)', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted,
              marginBottom: 14,
            }}>
            {file ? file.name : `Click to choose a .${mode} file`}
          </button>

          {parsed.length > 0 && phase !== 'done' && (
            <div style={{ background: 'rgba(56,197,197,0.06)', border: '1px solid rgba(56,197,197,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
              <p style={{ ...labelStyle, marginBottom: 6 }}>{parsed.length} BOOKS PARSED</p>
              {parsed.slice(0, 5).map((b, i) => (
                <p key={i} style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, margin: '2px 0' }}>
                  • {b.title}{b.authors ? ` — ${Array.isArray(b.authors) ? b.authors.join(', ') : b.authors}` : ''}
                </p>
              ))}
              {parsed.length > 5 && (
                <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, fontStyle: 'italic', marginTop: 4 }}>
                  + {parsed.length - 5} more
                </p>
              )}
            </div>
          )}

          {phase === 'done' && (
            <div style={{ background: 'rgba(56,197,197,0.06)', border: '1px solid rgba(56,197,197,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
              <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.teal, letterSpacing: '0.06em', marginBottom: 6 }}>UPLOAD COMPLETE</p>
              <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.7 }}>
                Added: {stats.added} · Skipped (duplicate): {stats.skipped} · Errors: {stats.errors}
              </p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!parsed.length || phase === 'uploading'}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              cursor: parsed.length && phase !== 'uploading' ? 'pointer' : 'default',
              background: C.teal, border: 'none',
              fontFamily: 'Bungee, sans-serif', fontSize: 12, color: '#fff', letterSpacing: '0.06em',
              opacity: parsed.length && phase !== 'uploading' ? 1 : 0.4,
            }}>
            {phase === 'uploading' ? 'UPLOADING…' : `UPLOAD ${parsed.length || ''} BOOKS TO FIRESTORE`}
          </button>
        </>
      )}

      {/* Danger zone */}
      <div style={{ marginTop: 32, borderTop: '1px solid rgba(255,78,0,0.2)', paddingTop: 16 }}>
        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.orange, letterSpacing: '0.1em', marginBottom: 10 }}>DANGER ZONE</p>
        <button onClick={handleDeleteAll}
          style={{
            padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
            background: deleteConfirm ? C.orange : 'transparent',
            border: `1px solid ${C.orange}`, color: deleteConfirm ? '#fff' : C.orange,
            fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em',
            transition: 'background 0.15s, color 0.15s',
          }}>
          {deleteConfirm ? 'CONFIRM — DELETE ALL BOOKS' : 'DELETE ALL BOOKS'}
        </button>
        {deleteConfirm && (
          <button onClick={() => setDeleteConfirm(false)}
            style={{ marginLeft: 8, padding: '9px 14px', borderRadius: 8, cursor: 'pointer', background: 'transparent', border: `1px solid ${C.muted}`, color: C.muted, fontFamily: 'Bungee, sans-serif', fontSize: 11 }}>
            CANCEL
          </button>
        )}
      </div>
    </div>
  );
}
