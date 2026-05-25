// src/screens/GuidesAdminTab.jsx
// Admin tab for managing Literary Roads Bookstore Guides
import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, limit, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import {
  fetchGuides, createGuide, updateGuide, deleteGuide,
  fetchGuideStores, addGuideStore, updateGuideStore, deleteGuideStore,
} from '../utils/bookstoreGuides';

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

const inputStyle = {
  width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
  padding: '8px 10px', color: C.white, fontFamily: 'Special Elite, serif', fontSize: 13,
  boxSizing: 'border-box',
};
const labelStyle = {
  display: 'block', fontFamily: 'Bungee, sans-serif', fontSize: 8,
  color: C.teal, letterSpacing: '0.07em', marginBottom: 4,
};

// ── Guide Form Modal ──────────────────────────────────────────────────────────
function GuideModal({ guide, onSave, onClose, saving }) {
  const isEdit = !!guide?.id;
  const [form, setForm] = useState({
    title:         guide?.title         || '',
    subtitle:      guide?.subtitle      || '',
    state:         guide?.state         || '',
    coverImageUrl: guide?.coverImageUrl || '',
    published:     guide?.published     ?? false,
    comingSoon:    guide?.comingSoon     ?? false,
  });
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !guide?.id) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `guideCovers/${guide.id}/cover.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm(f => ({ ...f, coverImageUrl: url }));
      await updateGuide(guide.id, { coverImageUrl: url });
    } catch (err) {
      console.error('[guide cover upload]', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, border: `1.5px solid ${C.teal}`, borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 0 40px rgba(64,224,208,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.teal, margin: 0, letterSpacing: '0.06em' }}>
            {isEdit ? 'EDIT GUIDE' : 'NEW GUIDE'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.silver, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {[
          { key: 'title',    label: 'Guide Title', required: true,  placeholder: 'Portland Bookstore Guide' },
          { key: 'subtitle', label: 'Subtitle',                     placeholder: '21 stops across the city' },
          { key: 'state',    label: 'State',                        placeholder: 'Oregon' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{f.label}{f.required && <span style={{ color: C.orange }}> *</span>}</label>
            <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder} style={inputStyle} />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>COVER IMAGE URL</label>
          <input value={form.coverImageUrl} onChange={e => setForm(p => ({ ...p, coverImageUrl: e.target.value }))}
            placeholder="https://..." style={inputStyle} />
        </div>

        {/* File upload — only available after the guide exists (needs an ID for the storage path) */}
        {isEdit && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>OR UPLOAD COVER IMAGE</label>
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading}
              style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.silver, width: '100%', cursor: 'pointer' }} />
            {uploading && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginTop: 4 }}>Uploading...</div>}
          </div>
        )}

        {form.coverImageUrl && (
          <div style={{ marginBottom: 16 }}>
            <img src={form.coverImageUrl} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.border}` }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 24, marginBottom: 22 }}>
          {[
            { key: 'published',  label: 'PUBLISHED' },
            { key: 'comingSoon', label: 'COMING SOON' },
          ].map(t => (
            <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'Bungee, sans-serif', fontSize: 10, color: form[t.key] ? C.teal : C.muted, letterSpacing: '0.06em' }}>
              <input type="checkbox" checked={form[t.key]} onChange={e => setForm(p => ({ ...p, [t.key]: e.target.checked }))}
                style={{ accentColor: C.teal, width: 14, height: 14 }} />
              {t.label}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer', letterSpacing: '0.04em' }}>
            CANCEL
          </button>
          <button onClick={() => onSave(form)} disabled={!form.title.trim() || saving || uploading}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 18px', borderRadius: 6, border: 'none', letterSpacing: '0.05em', cursor: form.title.trim() && !saving ? 'pointer' : 'not-allowed', background: form.title.trim() && !saving ? C.teal : 'rgba(64,224,208,0.25)', color: C.bg }}>
            {saving ? 'SAVING...' : 'SAVE GUIDE'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Store Form Modal ──────────────────────────────────────────────────────────
function StoreModal({ store, onSave, onClose, saving }) {
  const isEdit = !!store?.id;
  const [form, setForm] = useState({
    name:        store?.name        || '',
    city:        store?.city        || '',
    state:       store?.state       || '',
    address:     store?.address     || '',
    phone:       store?.phone       || '',
    website:     store?.website     || '',
    description: store?.description || '',
    photoUrl:    store?.photoUrl    || '',
    lat:         store?.lat != null  ? String(store.lat) : '',
    lng:         store?.lng != null  ? String(store.lng) : '',
  });

  const canSave = form.name.trim() && form.city.trim();

  const latNum = parseFloat(form.lat);
  const lngNum = parseFloat(form.lng);
  const coordsValid = !isNaN(latNum) && !isNaN(lngNum);

  const openOnMap = () => {
    if (!coordsValid) return;
    const base = import.meta.env.BASE_URL || '/';
    window.open(`${window.location.origin}${base}#/?center=${latNum},${lngNum}`, '_blank');
  };

  const handleSave = () => {
    onSave({ ...form, lat: coordsValid ? latNum : null, lng: coordsValid ? lngNum : null });
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, border: `1.5px solid ${C.teal}`, borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 0 40px rgba(64,224,208,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.teal, margin: 0, letterSpacing: '0.06em' }}>
            {isEdit ? 'EDIT STORE' : 'ADD STORE'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.silver, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {[
          { key: 'name',     label: 'Store Name', required: true  },
          { key: 'city',     label: 'City',       required: true  },
          { key: 'state',    label: 'State'                       },
          { key: 'address',  label: 'Address',    placeholder: '123 Main St' },
          { key: 'phone',    label: 'Phone',      placeholder: '(555) 123-4567' },
          { key: 'website',  label: 'Website',    placeholder: 'https://...' },
          { key: 'photoUrl', label: 'Photo URL',  placeholder: 'https://...' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{f.label}{f.required && <span style={{ color: C.orange }}> *</span>}</label>
            <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder || ''} style={inputStyle} />
          </div>
        ))}

        {/* Description — 800 chars */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>DESCRIPTION</label>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={4} maxLength={800}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
          <div style={{ textAlign: 'right', fontSize: 9, color: C.muted, marginTop: 2 }}>{form.description.length}/800</div>
        </div>

        {/* Coordinates + map preview button */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>COORDINATES</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={form.lat}
              onChange={e => setForm(p => ({ ...p, lat: e.target.value }))}
              placeholder="Latitude  e.g. 37.5485"
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              value={form.lng}
              onChange={e => setForm(p => ({ ...p, lng: e.target.value }))}
              placeholder="Longitude  e.g. -122.0597"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={openOnMap}
              disabled={!coordsValid}
              title="Open on Literary Roads map"
              style={{
                fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '9px 11px', borderRadius: 6, flexShrink: 0,
                border: `1px solid ${coordsValid ? C.teal : C.border}`,
                background: 'transparent',
                color: coordsValid ? C.teal : C.muted,
                letterSpacing: '0.05em',
                cursor: coordsValid ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              MAP
            </button>
          </div>
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted, marginTop: 5 }}>
            Enter coordinates, then click MAP to verify the pin on Literary Roads (opens new tab).
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer', letterSpacing: '0.04em' }}>
            CANCEL
          </button>
          <button onClick={handleSave} disabled={!canSave || saving}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 18px', borderRadius: 6, border: 'none', letterSpacing: '0.05em', cursor: canSave && !saving ? 'pointer' : 'not-allowed', background: canSave && !saving ? C.teal : 'rgba(64,224,208,0.25)', color: C.bg }}>
            {saving ? 'SAVING...' : isEdit ? 'SAVE CHANGES' : 'ADD STORE'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GuidesAdminTab({ showToast }) {
  const [view, setView]                 = useState('list'); // 'list' | 'stores'
  const [guides, setGuides]             = useState([]);
  const [stores, setStores]             = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [storeLoading, setStoreLoading] = useState(false);
  const [guideModal, setGuideModal]     = useState(null); // null | 'create' | guide
  const [storeModal, setStoreModal]     = useState(null); // null | 'create' | store
  const [guideSaving, setGuideSaving]   = useState(false);
  const [storeSaving, setStoreSaving]   = useState(false);
  const [addingToDb, setAddingToDb]     = useState(new Set()); // store IDs currently being added
  const [inDb, setInDb]                 = useState(new Set()); // store IDs confirmed in bookstores collection

  const loadGuides = useCallback(async () => {
    setLoading(true);
    try { setGuides(await fetchGuides()); }
    catch { showToast('Failed to load guides', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  const loadStores = useCallback(async (guideId) => {
    setStoreLoading(true);
    try { setStores(await fetchGuideStores(guideId)); }
    catch { showToast('Failed to load stores', 'error'); }
    finally { setStoreLoading(false); }
  }, [showToast]);

  useEffect(() => { loadGuides(); }, [loadGuides]);

  const openStores = (guide) => {
    setSelectedGuide(guide);
    setView('stores');
    loadStores(guide.id);
  };

  const backToList = () => {
    setView('list');
    setSelectedGuide(null);
    setStores([]);
  };

  const handleSaveGuide = async (form) => {
    setGuideSaving(true);
    try {
      if (guideModal?.id) {
        await updateGuide(guideModal.id, form);
        showToast('Guide updated');
      } else {
        await createGuide(form);
        showToast('Guide created');
      }
      setGuideModal(null);
      loadGuides();
    } catch { showToast('Save failed', 'error'); }
    finally { setGuideSaving(false); }
  };

  const handleDeleteGuide = async (guide) => {
    const storeCount = guide.storeCount ?? 0;
    const warning = storeCount > 0
      ? `This guide has ${storeCount} stop${storeCount !== 1 ? 's' : ''}.\n\nType the guide title to confirm deletion:`
      : `Type the guide title to confirm deletion:`;
    const input = window.prompt(`Delete "${guide.title}"? This cannot be undone.\n\n${warning}`);
    if (input === null) return; // cancelled
    if (input.trim().toLowerCase() !== guide.title.trim().toLowerCase()) {
      showToast('Title did not match — guide not deleted', 'error');
      return;
    }
    try {
      await deleteGuide(guide.id);
      showToast('Guide deleted');
      loadGuides();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleTogglePublished = async (guide) => {
    try {
      await updateGuide(guide.id, { published: !guide.published });
      loadGuides();
    } catch { showToast('Update failed', 'error'); }
  };

  const handleSaveStore = async (form) => {
    setStoreSaving(true);
    try {
      if (storeModal?.id) {
        await updateGuideStore(selectedGuide.id, storeModal.id, form);
        showToast('Store updated');
      } else {
        await addGuideStore(selectedGuide.id, form, stores.length);
        showToast('Store added');
      }
      setStoreModal(null);
      loadStores(selectedGuide.id);
      // refresh guide list so storeCount badge updates
      loadGuides();
    } catch { showToast('Save failed', 'error'); }
    finally { setStoreSaving(false); }
  };

  const handleAddToMapDb = async (store) => {
    if (addingToDb.has(store.id)) return;
    setAddingToDb(prev => new Set(prev).add(store.id));
    try {
      // 1. Exact name + city check
      const exactSnap = await getDocs(
        query(collection(db, 'bookstores'), where('name', '==', store.name), limit(20))
      );
      if (exactSnap.docs.some(d => d.data().city === store.city)) {
        showToast(`${store.name} is already in the map database`);
        setInDb(prev => new Set(prev).add(store.id));
        return;
      }

      // 2. Coordinate proximity check (~200m) — catches name-mismatched duplicates
      // (e.g. "WILD RUMPUS" vs "Wild Rumpus Books")
      let nearbyNote = '';
      if (store.lat != null && store.lng != null) {
        const DELTA = 0.002;
        const nearbySnap = await getDocs(
          query(collection(db, 'bookstores'),
            where('lat', '>=', store.lat - DELTA),
            where('lat', '<=', store.lat + DELTA),
            limit(20))
        );
        const nearby = nearbySnap.docs
          .map(d => d.data())
          .filter(b => b.lng != null && Math.abs(b.lng - store.lng) < DELTA);
        if (nearby.length > 0) {
          nearbyNote = `\n\nFound at the same location: "${nearby.map(b => b.name).join('", "')}"\nThis may already be in the database.`;
        }
      }

      // 3. Always confirm before writing
      if (!window.confirm(`Add "${store.name}" (${store.city}) to the map database?${nearbyNote}`)) return;

      await addDoc(collection(db, 'bookstores'), {
        name:           store.name,
        city:           store.city    || '',
        state:          store.state   || '',
        address:        store.address || '',
        phone:          store.phone   || '',
        website:        store.website || '',
        lat:            store.lat  ?? null,
        lng:            store.lng  ?? null,
        addedFromGuide: true,
        createdAt:      serverTimestamp(),
      });
      showToast(`${store.name} added to map database`);
      setInDb(prev => new Set(prev).add(store.id));
    } catch {
      showToast('Failed to add to map database', 'error');
    } finally {
      setAddingToDb(prev => { const s = new Set(prev); s.delete(store.id); return s; });
    }
  };

  const handleDeleteStore = async (store) => {
    if (!window.confirm(`Remove "${store.name}"?`)) return;
    try {
      await deleteGuideStore(selectedGuide.id, store.id, stores.length - 1);
      showToast('Store removed');
      loadStores(selectedGuide.id);
      loadGuides();
    } catch { showToast('Delete failed', 'error'); }
  };

  // ── Guide List ──────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted }}>
            {guides.length} guide{guides.length !== 1 ? 's' : ''} · {guides.filter(g => g.published).length} published
          </span>
          <button onClick={() => setGuideModal('create')}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em', padding: '8px 18px', borderRadius: 8, background: C.teal, color: C.bg, border: 'none', cursor: 'pointer' }}>
            + NEW GUIDE
          </button>
        </div>

        {loading ? (
          <p style={{ fontFamily: 'Special Elite, serif', color: C.muted, fontSize: 13, textAlign: 'center', padding: '48px 0' }}>Loading...</p>
        ) : guides.length === 0 ? (
          <p style={{ fontFamily: 'Special Elite, serif', color: C.muted, fontSize: 13, textAlign: 'center', padding: '48px 0' }}>
            No guides yet. Create your first Literary Roads bookstore guide.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {guides.map(guide => (
              <div key={guide.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Cover thumbnail */}
                {guide.coverImageUrl ? (
                  <img src={guide.coverImageUrl} alt="" style={{ width: 38, height: 52, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: `1px solid ${C.border}` }} />
                ) : (
                  <div style={{ width: 38, height: 52, borderRadius: 4, flexShrink: 0, background: C.bg, border: `1px dashed ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 7, color: C.muted, textAlign: 'center', lineHeight: 1.2 }}>NO<br />IMG</span>
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {guide.title}
                  </div>
                  <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {[guide.state, guide.storeCount != null ? `${guide.storeCount} stops` : null].filter(Boolean).join(' · ')}
                  </div>
                </div>

                {/* Status badges */}
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {guide.published && (
                    <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 7, padding: '2px 6px', borderRadius: 3, background: 'rgba(64,224,208,0.1)', color: C.teal, border: `1px solid rgba(64,224,208,0.3)`, letterSpacing: '0.07em' }}>LIVE</span>
                  )}
                  {guide.comingSoon && !guide.published && (
                    <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 7, padding: '2px 6px', borderRadius: 3, background: 'rgba(255,78,0,0.1)', color: C.orange, border: `1px solid rgba(255,78,0,0.3)`, letterSpacing: '0.07em' }}>SOON</span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => handleTogglePublished(guide)}
                    style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 9px', borderRadius: 6, border: `1px solid ${guide.published ? 'rgba(255,78,0,0.4)' : C.teal}`, background: 'transparent', color: guide.published ? C.orange : C.teal, cursor: 'pointer', letterSpacing: '0.04em' }}>
                    {guide.published ? 'UNPUBLISH' : 'PUBLISH'}
                  </button>
                  <button onClick={() => setGuideModal(guide)}
                    style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 9px', borderRadius: 6, border: `1px solid ${C.teal}`, background: 'transparent', color: C.teal, cursor: 'pointer', letterSpacing: '0.04em' }}>
                    EDIT
                  </button>
                  <button onClick={() => openStores(guide)}
                    style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 9px', borderRadius: 6, border: `1px solid rgba(192,192,192,0.3)`, background: 'transparent', color: C.silver, cursor: 'pointer', letterSpacing: '0.04em' }}>
                    STOPS
                  </button>
                  <button onClick={() => handleDeleteGuide(guide)}
                    style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 9px', borderRadius: 6, border: `1px solid rgba(255,78,0,0.4)`, background: 'transparent', color: C.orange, cursor: 'pointer', letterSpacing: '0.04em' }}>
                    DEL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {guideModal && (
          <GuideModal
            guide={guideModal === 'create' ? null : guideModal}
            onSave={handleSaveGuide}
            onClose={() => setGuideModal(null)}
            saving={guideSaving}
          />
        )}
      </div>
    );
  }

  // ── Store List ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={backToList}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer', letterSpacing: '0.04em', flexShrink: 0 }}>
          ← GUIDES
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 14, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedGuide?.title}
          </div>
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted }}>
            {[selectedGuide?.state, `${stores.length} stop${stores.length !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button onClick={() => setStoreModal('create')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em', padding: '8px 16px', borderRadius: 8, background: C.teal, color: C.bg, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
          + ADD STOP
        </button>
      </div>

      {storeLoading ? (
        <p style={{ fontFamily: 'Special Elite, serif', color: C.muted, fontSize: 13, textAlign: 'center', padding: '48px 0' }}>Loading...</p>
      ) : stores.length === 0 ? (
        <p style={{ fontFamily: 'Special Elite, serif', color: C.muted, fontSize: 13, textAlign: 'center', padding: '48px 0' }}>
          No stops yet. Add the first bookstore to this guide.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stores.map((store, idx) => (
            <div key={store.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.bg, border: `1px solid rgba(64,224,208,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal }}>{idx + 1}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 12, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {store.name}
                </div>
                <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted }}>
                  {[store.city, store.state].filter(Boolean).join(', ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setStoreModal(store)}
                  style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.teal}`, background: 'transparent', color: C.teal, cursor: 'pointer', letterSpacing: '0.04em' }}>
                  EDIT
                </button>
                <button
                  onClick={() => handleAddToMapDb(store)}
                  disabled={addingToDb.has(store.id) || inDb.has(store.id) || store.lat == null || store.lng == null}
                  title={store.lat == null ? 'Add coordinates first' : inDb.has(store.id) ? 'Already in map database' : 'Add to map database'}
                  style={{
                    fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 6,
                    border: `1px solid ${inDb.has(store.id) ? 'rgba(64,224,208,0.2)' : 'rgba(255,78,0,0.5)'}`,
                    background: 'transparent',
                    color: inDb.has(store.id) ? C.muted : (store.lat == null ? C.muted : C.orange),
                    cursor: (addingToDb.has(store.id) || inDb.has(store.id) || store.lat == null) ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.04em',
                    opacity: (store.lat == null || inDb.has(store.id)) ? 0.5 : 1,
                  }}>
                  {addingToDb.has(store.id) ? 'ADDING...' : inDb.has(store.id) ? 'IN DB' : 'ADD TO MAP'}
                </button>
                <button onClick={() => handleDeleteStore(store)}
                  style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 6, border: `1px solid rgba(255,78,0,0.4)`, background: 'transparent', color: C.orange, cursor: 'pointer', letterSpacing: '0.04em' }}>
                  DEL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {storeModal && (
        <StoreModal
          store={storeModal === 'create' ? null : storeModal}
          onSave={handleSaveStore}
          onClose={() => setStoreModal(null)}
          saving={storeSaving}
        />
      )}
    </div>
  );
}
