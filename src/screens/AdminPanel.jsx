// src/screens/AdminPanel.jsx
// Newsletter admin panel — Festivals, Indie Picks, Debut Authors, BookTok, Trip Reports
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchAll, createItem, updateItem, deleteItem, ADMIN_UID } from '../utils/newsletterAdmin';

// ── Section definitions ────────────────────────────────────────────────────────
const SECTIONS = [
  {
    key: 'festivals',
    label: 'Festivals',
    defaultFeatured: true,
    featuredFixed: true,
    displayField: 'name',
    subField: 'location',
    extraField: 'date',
    fields: [
      { key: 'name',     label: 'Festival Name', type: 'text',     required: true },
      { key: 'date',     label: 'Date',           type: 'date',     required: true },
      { key: 'location', label: 'Location',       type: 'text',     required: true, placeholder: 'Nashville, TN' },
      { key: 'link',     label: 'Website URL',    type: 'url',      required: true },
      { key: 'context',  label: 'Description',    type: 'textarea', required: true, maxLength: 400, rows: 4 },
    ],
  },
  {
    key: 'indiePicks',
    label: 'Indie Picks',
    defaultFeatured: false,
    displayField: 'bookstoreName',
    subField: 'city',
    fields: [
      { key: 'bookstoreName',  label: 'Bookstore Name',  type: 'text',     required: true },
      { key: 'city',           label: 'City',            type: 'text',     required: true, placeholder: 'Portland, ME' },
      { key: 'recommendation', label: 'Recommendation',  type: 'textarea', required: true, maxLength: 300, rows: 4 },
    ],
  },
  {
    key: 'debutAuthors',
    label: 'Debut Authors',
    defaultFeatured: false,
    displayField: 'authorName',
    subField: 'bookTitle',
    fields: [
      { key: 'authorName', label: 'Author Name',  type: 'text',     required: true },
      { key: 'bookTitle',  label: 'Book Title',   type: 'text',     required: true },
      { key: 'excerpt',    label: 'Excerpt / Bio',type: 'textarea', required: true, maxLength: 300, rows: 4 },
      { key: 'link',       label: 'Book Link',    type: 'url',      required: true, placeholder: 'https://goodreads.com/...' },
    ],
  },
  {
    key: 'bookTokPicks',
    label: 'BookTok',
    defaultFeatured: false,
    displayField: 'bookTitle',
    subField: null,
    fields: [
      { key: 'bookTitle',  label: 'Book Title',  type: 'text',     required: true },
      { key: 'tiktokLink', label: 'TikTok Link', type: 'url',      required: true },
      { key: 'commentary', label: 'Commentary',  type: 'textarea', required: true, maxLength: 300, rows: 4 },
    ],
  },
  {
    key: 'tripReports',
    label: 'Trip Reports',
    defaultFeatured: false,
    displayField: 'title',
    subField: 'location',
    fields: [
      { key: 'title',     label: 'Title',     type: 'text',     required: true, placeholder: "Following Flannery O'Connor Across Georgia" },
      { key: 'location',  label: 'Location',  type: 'text',     required: true },
      { key: 'narrative', label: 'Narrative', type: 'textarea', required: true, maxLength: 800, rows: 6 },
    ],
  },
];

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0D0E1A',
  surface: '#1A1B2E',
  border:  'rgba(64,224,208,0.2)',
  teal:    '#40E0D0',
  orange:  '#FF4E00',
  white:   '#F5F5DC',
  silver:  '#C0C0C0',
  muted:   'rgba(192,192,192,0.45)',
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'error' ? C.orange : C.teal,
      color: C.bg, fontFamily: 'Bungee, sans-serif',
      fontSize: 12, letterSpacing: '0.06em',
      padding: '10px 20px', borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      animation: 'gaz-fade-in 0.2s ease',
    }}>
      {message}
    </div>
  );
}

// ── Item Modal ────────────────────────────────────────────────────────────────
function ItemModal({ section, item, onSave, onClose, saving }) {
  const isEdit = !!item?.id;
  const [form, setForm] = useState(() => {
    const d = {};
    section.fields.forEach(f => { d[f.key] = item?.[f.key] ?? ''; });
    d.featured = item?.featured ?? section.defaultFeatured;
    return d;
  });

  const canSave = section.fields.filter(f => f.required).every(f => String(form[f.key] ?? '').trim());

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, border: `1.5px solid ${C.teal}`, borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 0 40px rgba(64,224,208,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.teal, margin: 0, letterSpacing: '0.06em' }}>
            {isEdit ? `EDIT ${section.label.toUpperCase()}` : `ADD ${section.label.toUpperCase()}`}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.silver, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* Fields */}
        {section.fields.map(field => (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal, letterSpacing: '0.07em', marginBottom: 5 }}>
              {field.label}{field.required && <span style={{ color: C.orange }}> *</span>}
            </label>
            {field.type === 'textarea' ? (
              <>
                <textarea
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  rows={field.rows || 3}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder || ''}
                  style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.white, fontFamily: 'Special Elite, serif', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
                />
                {field.maxLength && (
                  <div style={{ textAlign: 'right', fontSize: 10, color: C.muted, marginTop: 2 }}>
                    {(form[field.key] || '').length}/{field.maxLength}
                  </div>
                )}
              </>
            ) : (
              <input
                type={field.type}
                value={form[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder || ''}
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.white, fontFamily: 'Special Elite, serif', fontSize: 13, boxSizing: 'border-box' }}
              />
            )}
          </div>
        ))}

        {/* Featured toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <button
            type="button"
            onClick={() => !section.featuredFixed && setForm(f => ({ ...f, featured: !f.featured }))}
            style={{ width: 40, height: 22, borderRadius: 11, background: form.featured ? C.teal : 'rgba(192,192,192,0.18)', border: 'none', cursor: section.featuredFixed ? 'default' : 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
          >
            <span style={{ position: 'absolute', top: 3, left: form.featured ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
          <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: form.featured ? C.teal : C.muted, letterSpacing: '0.05em' }}>
            {form.featured ? 'FEATURED' : 'NOT FEATURED'}
            {section.featuredFixed && ' (always on)'}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => canSave && !saving && onSave(form)}
            disabled={!canSave || saving}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 20px', borderRadius: 6, border: 'none', cursor: canSave && !saving ? 'pointer' : 'not-allowed', background: canSave && !saving ? C.teal : 'rgba(64,224,208,0.25)', color: C.bg, letterSpacing: '0.06em', transition: 'all 0.15s' }}
          >
            {saving ? 'SAVING...' : isEdit ? 'SAVE CHANGES' : 'ADD'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ name, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2001, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.surface, border: `1.5px solid ${C.orange}`, borderRadius: 12, padding: 24, maxWidth: 360, width: '100%', boxShadow: '0 0 30px rgba(255,78,0,0.2)' }}>
        <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.orange, margin: '0 0 10px', letterSpacing: '0.05em' }}>DELETE?</h3>
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.white, margin: '0 0 20px', lineHeight: 1.5 }}>
          Delete <strong>"{name}"</strong>? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
            CANCEL
          </button>
          <button onClick={onConfirm}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 18px', borderRadius: 6, border: 'none', background: C.orange, color: '#fff', cursor: 'pointer' }}>
            DELETE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section Tab ────────────────────────────────────────────────────────────────
function SectionTab({ section, showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);       // null | 'create' | item-object
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchAll(section.key));
    } catch {
      showToast('Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [section.key, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal?.id) {
        await updateItem(section.key, modal.id, form);
        showToast('Updated');
      } else {
        await createItem(section.key, form);
        showToast('Added');
      }
      setModal(null);
      load();
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem(section.key, deleteTarget.id);
      showToast('Deleted');
      setDeleteTarget(null);
      load();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const handleToggleFeatured = async (item) => {
    if (section.featuredFixed) return;
    try {
      await updateItem(section.key, item.id, { featured: !item.featured });
      load();
    } catch {
      showToast('Update failed', 'error');
    }
  };

  const singularLabel = section.label.replace(/s$/i, '');

  return (
    <div>
      {/* Sub-header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted }}>
          {items.length} total · {items.filter(i => i.featured).length} featured
        </span>
        <button
          onClick={() => setModal('create')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em', padding: '8px 18px', borderRadius: 8, background: C.teal, color: C.bg, border: 'none', cursor: 'pointer' }}
        >
          + ADD {singularLabel.toUpperCase()}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p style={{ fontFamily: 'Special Elite, serif', color: C.muted, fontSize: 13, textAlign: 'center', padding: '48px 0' }}>Loading...</p>
      ) : items.length === 0 ? (
        <p style={{ fontFamily: 'Special Elite, serif', color: C.muted, fontSize: 13, textAlign: 'center', padding: '48px 0' }}>
          No {section.label.toLowerCase()} yet. Add the first one!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px 14px' }}>
              {/* Featured dot — click to toggle */}
              <button
                onClick={() => handleToggleFeatured(item)}
                title={section.featuredFixed ? 'Always featured' : item.featured ? 'Click to unfeature' : 'Click to feature'}
                style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: item.featured ? C.teal : 'transparent', border: `1.5px solid ${item.featured ? C.teal : C.muted}`, cursor: section.featuredFixed ? 'default' : 'pointer', padding: 0 }}
              />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item[section.displayField]}
                </div>
                {(section.subField || section.extraField) && (
                  <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {section.subField && item[section.subField]}
                    {section.subField && section.extraField && item[section.extraField] && ' · '}
                    {section.extraField && item[section.extraField]}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setModal(item)}
                  style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.teal}`, background: 'transparent', color: C.teal, cursor: 'pointer', letterSpacing: '0.04em' }}>
                  EDIT
                </button>
                <button onClick={() => setDeleteTarget(item)}
                  style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 6, border: `1px solid rgba(255,78,0,0.4)`, background: 'transparent', color: C.orange, cursor: 'pointer', letterSpacing: '0.04em' }}>
                  DEL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ItemModal
          section={section}
          item={modal === 'create' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget[section.displayField]}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── AdminPanel ─────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('festivals');
  const [toast, setToast] = useState(null);

  // Auth guard — redirect non-admins immediately
  useEffect(() => {
    if (user === undefined) return; // still loading auth
    if (!user || user.uid !== ADMIN_UID) navigate('/');
  }, [user, navigate]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  if (!user || user.uid !== ADMIN_UID) return null;

  const BASE = import.meta.env.BASE_URL;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <style>{`
        @keyframes gaz-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input[type="text"], input[type="url"], input[type="date"], textarea {
          outline-color: #40E0D0;
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: C.surface, borderBottom: `2px solid ${C.teal}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src={`${BASE}images/newspaper-cat.png`} alt="" style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 6 }} />
        <div>
          <h1 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 15, color: C.teal, margin: 0, letterSpacing: '0.06em' }}>GAZETTE ADMIN</h1>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted, margin: 0 }}>Literary Roads Newsletter</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <a
            href={`${BASE.replace(/\/$/, '')}/newsletter`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em', padding: '7px 13px', borderRadius: 6, border: `1px solid ${C.teal}`, color: C.teal, textDecoration: 'none' }}
          >
            PREVIEW
          </a>
          <button
            onClick={() => navigate('/')}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em', padding: '7px 13px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}
          >
            ← MAP
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', overflowX: 'auto', padding: '0 16px' }}>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveTab(s.key)}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em', padding: '13px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === s.key ? `2px solid ${C.teal}` : '2px solid transparent', color: activeTab === s.key ? C.teal : C.muted, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s' }}
          >
            {s.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 20px 80px' }}>
        {SECTIONS.map(s => (
          activeTab === s.key && (
            <SectionTab key={s.key} section={s} showToast={showToast} />
          )
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
