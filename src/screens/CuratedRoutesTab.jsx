// CuratedRoutesTab — admin panel tab for building Literary Roads curated tours.
// Handles all route types: Ghost Town, UFO, National Park, Lighthouse,
// Coffee Shop Crawl, Bookstore Crawl, Literary Landmarks, Author Country.
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ROUTE_TYPE_CONFIG, ROUTE_TYPE_OPTIONS,
  searchStopsCollection, addManualStop,
  fetchAllCuratedRoutes, saveCuratedRoute, deleteCuratedRoute,
} from '../utils/curatedRoutes';

// ── Palette (matches AdminPanel) ──────────────────────────────────────────────
const C = {
  bg:      '#0D0E1A',
  surface: '#1A1B2E',
  border:  'rgba(64,224,208,0.2)',
  teal:    '#40E0D0',
  orange:  '#FF4E00',
  white:   '#F5F5DC',
  silver:  '#C0C0C0',
  muted:   'rgba(192,192,192,0.45)',
  purple:  '#B044FB',
};

const inputStyle = {
  width: '100%', background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 6, padding: '8px 10px', color: C.white,
  fontFamily: 'Special Elite, serif', fontSize: 13, boxSizing: 'border-box',
};
const labelStyle = {
  display: 'block', fontFamily: 'Bungee, sans-serif', fontSize: 9,
  color: C.teal, letterSpacing: '0.07em', marginBottom: 5,
};
const sectionHead = {
  fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.orange,
  letterSpacing: '0.06em', margin: '0 0 14px',
};

const US_STATES = [
  'Multi-state',
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
  'District of Columbia',
];

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'Year-round'];

const BLANK_READING_LIST = [
  { title: '', author: '', description: '' },
  { title: '', author: '', description: '' },
  { title: '', author: '', description: '' },
];

// Migrate old { before, with, after } object shape to flat array
function normalizeReadingList(rl) {
  if (Array.isArray(rl)) return rl;
  if (rl && typeof rl === 'object') {
    return [
      rl.before || { title: '', author: '', description: '' },
      rl.with   || { title: '', author: '', description: '' },
      rl.after  || { title: '', author: '', description: '' },
    ];
  }
  return BLANK_READING_LIST.map(b => ({ ...b }));
}

const BLANK_FORM = {
  routeType: '', name: '', state: '', region: '', description: '',
  duration: '', bestSeason: [], active: false,
  stops: [],
  readingList: BLANK_READING_LIST.map(b => ({ ...b })),
  inspiration: '',
  // type-specific
  difficulty: '', nearestServices: '', overnightSuggestions: '',
  roadConditions: '', paranormalNotes: '',
  entranceFee: '', reservationRequired: false, accessibilityNotes: '',
  coastalRegion: '', toursAvailable: false, bestViewingSeason: '',
  citiesCovered: '', walkingOrDriving: 'driving', estimatedTime: '',
  featuredAuthor: '', literaryPeriod: '', companionGazette: '',
};

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button type="button" onClick={() => onChange(!value)}
        style={{ width: 40, height: 22, borderRadius: 11, background: value ? C.teal : 'rgba(192,192,192,0.18)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 3, left: value ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </button>
      <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: value ? C.teal : C.muted, letterSpacing: '0.05em' }}>
        {label || (value ? 'YES' : 'NO')}
      </span>
    </div>
  );
}

// ── Reading list row ──────────────────────────────────────────────────────────
function ReadingListRow({ index, value, onChange }) {
  const upd = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted, letterSpacing: '0.07em', marginBottom: 10 }}>BOOK {index + 1}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
        <div>
          <label style={labelStyle}>TITLE</label>
          <input style={inputStyle} value={value.title} onChange={e => upd('title', e.target.value)} placeholder="Book title" />
        </div>
        <div>
          <label style={labelStyle}>AUTHOR</label>
          <input style={inputStyle} value={value.author} onChange={e => upd('author', e.target.value)} placeholder="Author name" />
        </div>
      </div>
      <div>
        <label style={labelStyle}>ONE-LINE DESCRIPTION</label>
        <input style={inputStyle} value={value.description} onChange={e => upd('description', e.target.value)} placeholder="Why this book for this route?" />
      </div>
    </div>
  );
}

// ── Stop item (draggable) ─────────────────────────────────────────────────────
function StopItem({ stop, index, total, onRemove, onNoteChange, onMoveUp, onMoveDown,
                    dragHandlers }) {
  return (
    <div
      draggable
      onDragStart={() => dragHandlers.onDragStart(index)}
      onDragOver={e => dragHandlers.onDragOver(e, index)}
      onDragEnd={dragHandlers.onDragEnd}
      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 8, cursor: 'grab' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* drag handle */}
        <span style={{ color: C.muted, fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 2, cursor: 'grab' }}>⠿</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal, letterSpacing: '0.05em', marginRight: 6 }}>
                STOP {index + 1}
              </span>
              <span style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.white }}>{stop.name}</span>
              {(stop.city || stop.state) && (
                <span style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginLeft: 6 }}>
                  {[stop.city, stop.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={() => onMoveUp(index)} disabled={index === 0}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, color: index === 0 ? C.muted : C.teal, cursor: index === 0 ? 'default' : 'pointer', padding: '2px 7px', fontSize: 11 }}>↑</button>
              <button onClick={() => onMoveDown(index)} disabled={index === total - 1}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, color: index === total - 1 ? C.muted : C.teal, cursor: index === total - 1 ? 'default' : 'pointer', padding: '2px 7px', fontSize: 11 }}>↓</button>
              <button onClick={() => onRemove(index)}
                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
          </div>
          <input
            style={{ ...inputStyle, fontSize: 11 }}
            value={stop._note || ''}
            onChange={e => onNoteChange(index, e.target.value)}
            placeholder="Optional note for this stop…"
          />
        </div>
      </div>
    </div>
  );
}

// ── Manual stop form ──────────────────────────────────────────────────────────
function ManualStopForm({ onAdd, onCancel, saving }) {
  const [f, setF] = useState({ name: '', lat: '', lng: '', city: '', state: '', description: '' });
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const canAdd = f.name.trim() && f.lat && f.lng;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.orange}`, borderRadius: 10, padding: 16, marginTop: 10 }}>
      <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.orange, letterSpacing: '0.05em', marginBottom: 12 }}>ADD NEW LOCATION MANUALLY</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>NAME <span style={{ color: C.orange }}>*</span></label>
          <input style={inputStyle} value={f.name} onChange={e => upd('name', e.target.value)} placeholder="Location name" />
        </div>
        <div>
          <label style={labelStyle}>LATITUDE <span style={{ color: C.orange }}>*</span></label>
          <input style={inputStyle} type="number" step="any" value={f.lat} onChange={e => upd('lat', e.target.value)} placeholder="e.g. 38.9072" />
        </div>
        <div>
          <label style={labelStyle}>LONGITUDE <span style={{ color: C.orange }}>*</span></label>
          <input style={inputStyle} type="number" step="any" value={f.lng} onChange={e => upd('lng', e.target.value)} placeholder="e.g. -77.0369" />
        </div>
        <div>
          <label style={labelStyle}>CITY</label>
          <input style={inputStyle} value={f.city} onChange={e => upd('city', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>STATE</label>
          <input style={inputStyle} value={f.state} onChange={e => upd('state', e.target.value)} placeholder="e.g. NV" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>DESCRIPTION</label>
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={f.description} onChange={e => upd('description', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '7px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
          CANCEL
        </button>
        <button disabled={!canAdd || saving} onClick={() => canAdd && !saving && onAdd({ ...f, lat: parseFloat(f.lat), lng: parseFloat(f.lng) })}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, padding: '7px 14px', borderRadius: 6, border: 'none', background: canAdd && !saving ? C.orange : 'rgba(255,78,0,0.3)', color: '#fff', cursor: canAdd && !saving ? 'pointer' : 'not-allowed' }}>
          {saving ? 'ADDING...' : 'ADD STOP'}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CuratedRoutesTab({ showToast }) {
  const [form, setForm]           = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [routes, setRoutes]       = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [saving, setSaving]       = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Stop search
  const [stopQuery, setStopQuery]     = useState('');
  const [stopResults, setStopResults] = useState([]);
  const [searchingStops, setSearchingStops] = useState(false);
  const stopDebounceRef = useRef(null);
  const [showManualStop, setShowManualStop] = useState(false);
  const [addingManual, setAddingManual]     = useState(false);

  // Drag state
  const dragIdxRef = useRef(null);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Load routes ─────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    setLoadingRoutes(true);
    try { setRoutes(await fetchAllCuratedRoutes()); }
    catch { showToast('Failed to load routes', 'error'); }
    finally { setLoadingRoutes(false); }
  }, [showToast]);

  useEffect(() => { reload(); }, [reload]);

  // ── Stop search ─────────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(stopDebounceRef.current);
    if (!stopQuery.trim() || stopQuery.trim().length < 2 || !form.routeType) {
      setStopResults([]); return;
    }
    stopDebounceRef.current = setTimeout(async () => {
      setSearchingStops(true);
      try {
        const res = await searchStopsCollection(form.routeType, stopQuery.trim());
        setStopResults(res);
      } catch { setStopResults([]); }
      finally { setSearchingStops(false); }
    }, 300);
  }, [stopQuery, form.routeType]);

  // ── Add stop from search ─────────────────────────────────────────────────────
  const handleAddStop = (loc) => {
    const already = form.stops.some(s => s.id === loc.id && s._fromCollection === loc._fromCollection);
    if (already) return;
    const stop = {
      id:               loc.id,
      name:             loc.name || '',
      city:             loc.city || '',
      state:            loc.state || '',
      lat:              loc.lat  ?? null,
      lng:              loc.lng  ?? null,
      _fromCollection:  loc._fromCollection || '',
      _note:            '',
    };
    upd('stops', [...form.stops, stop]);
    setStopQuery('');
    setStopResults([]);
  };

  // ── Manual stop add ──────────────────────────────────────────────────────────
  const handleManualStop = async (stopData) => {
    setAddingManual(true);
    try {
      const newStop = await addManualStop(form.routeType, stopData);
      upd('stops', [...form.stops, { ...newStop, _note: '' }]);
      setShowManualStop(false);
      showToast('Stop added to database and route');
    } catch {
      showToast('Failed to add stop', 'error');
    } finally { setAddingManual(false); }
  };

  // ── Stop reordering ──────────────────────────────────────────────────────────
  const moveStop = (i, dir) => {
    const stops = [...form.stops];
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    [stops[i], stops[j]] = [stops[j], stops[i]];
    upd('stops', stops);
  };

  const dragHandlers = {
    onDragStart: (i) => { dragIdxRef.current = i; },
    onDragOver:  (e, i) => {
      e.preventDefault();
      const from = dragIdxRef.current;
      if (from === null || from === i) return;
      const stops = [...form.stops];
      const [moved] = stops.splice(from, 1);
      stops.splice(i, 0, moved);
      dragIdxRef.current = i;
      upd('stops', stops);
    },
    onDragEnd: () => { dragIdxRef.current = null; },
  };

  // ── Season multi-select ──────────────────────────────────────────────────────
  const toggleSeason = (s) => {
    const cur = form.bestSeason || [];
    upd('bestSeason', cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
  };

  // ── Edit existing route ──────────────────────────────────────────────────────
  const handleEdit = (route) => {
    const { id, createdAt, updatedAt, ...rest } = route;
    setForm({
      ...BLANK_FORM, ...rest,
      stops:       rest.stops || [],
      readingList: normalizeReadingList(rest.readingList),
    });
    setEditingId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Reset form ───────────────────────────────────────────────────────────────
  const handleReset = () => { setForm(BLANK_FORM); setEditingId(null); setStopQuery(''); setStopResults([]); setShowManualStop(false); };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.routeType || !form.name.trim()) {
      showToast('Route Type and Name are required', 'error'); return;
    }
    setSaving(true);
    try {
      // Strip internal props before saving
      const cleanStops = form.stops.map(({ _fromCollection, ...s }) => s);
      await saveCuratedRoute({ ...form, stops: cleanStops }, editingId);
      showToast(editingId ? 'Route updated' : 'Route saved');
      handleReset();
      await reload();
    } catch {
      showToast('Save failed', 'error');
    } finally { setSaving(false); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await deleteCuratedRoute(id);
      showToast('Route deleted');
      setDeleteConfirm(null);
      await reload();
    } catch { showToast('Delete failed', 'error'); }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const cfg          = ROUTE_TYPE_CONFIG[form.routeType] || null;
  const isUnavailable = cfg && !cfg.available;
  const isGhostOrUFO = ['ghostTown','ufo'].includes(form.routeType);
  const isNationalPark = form.routeType === 'nationalPark';
  const isLighthouse = form.routeType === 'lighthouse';
  const isCrawl = ['coffeeShop','bookstore'].includes(form.routeType);
  const isLiterary = ['literaryLandmark','authorCountry'].includes(form.routeType);

  const filteredRoutes = typeFilter
    ? routes.filter(r => r.routeType === typeFilter)
    : routes;

  return (
    <div>
      {/* ── Form ── */}
      <div style={{ background: C.surface, border: `1.5px solid rgba(64,224,208,0.3)`, borderRadius: 10, padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ ...sectionHead, margin: 0 }}>
            {editingId ? 'EDIT CURATED ROUTE' : 'NEW CURATED ROUTE'}
          </h3>
          {editingId && (
            <button onClick={handleReset}
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', letterSpacing: '0.05em' }}>
              CANCEL EDIT
            </button>
          )}
        </div>

        {/* ── Core fields ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>ROUTE TYPE <span style={{ color: C.orange }}>*</span></label>
            <select value={form.routeType} onChange={e => upd('routeType', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select route type…</option>
              {ROUTE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>ROUTE NAME <span style={{ color: C.orange }}>*</span></label>
            <input style={inputStyle} value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Nevada Ghost Town Loop" />
          </div>
          <div>
            <label style={labelStyle}>STATE</label>
            <select value={form.state} onChange={e => upd('state', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select state…</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>REGION</label>
            <input style={inputStyle} value={form.region} onChange={e => upd('region', e.target.value)} placeholder="e.g. Northern Nevada, New England Coast" />
          </div>
          <div>
            <label style={labelStyle}>DURATION</label>
            <select value={form.duration} onChange={e => upd('duration', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select…</option>
              {['Half day','Full day','2 days','3 days','4+ days'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>ACTIVE</label>
            <div style={{ paddingTop: 8 }}>
              <Toggle value={form.active} onChange={v => upd('active', v)} label={form.active ? 'ACTIVE' : 'INACTIVE'} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>DESCRIPTION <span style={{ color: C.muted }}>(your editorial voice)</span></label>
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} value={form.description} onChange={e => upd('description', e.target.value)} placeholder="Write the route description in your editorial voice…" />
        </div>

        {/* Best season */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>BEST SEASON</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SEASONS.map(s => {
              const on = (form.bestSeason || []).includes(s);
              return (
                <button key={s} type="button" onClick={() => toggleSeason(s)}
                  style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '6px 12px', borderRadius: 20, border: `1px solid ${on ? C.teal : C.border}`, background: on ? 'rgba(64,224,208,0.12)' : 'transparent', color: on ? C.teal : C.muted, cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.15s' }}>
                  {s.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Stops Builder ── */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginBottom: 20 }}>
          <h4 style={sectionHead}>STOPS</h4>

          {!form.routeType ? (
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted }}>Select a route type above to search for stops.</p>
          ) : isUnavailable ? (
            <div style={{ background: 'rgba(255,78,0,0.07)', border: `1px solid rgba(255,78,0,0.25)`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.orange, margin: 0 }}>
                This location database is coming soon — use manual entry to add stops for now.
              </p>
            </div>
          ) : (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                style={inputStyle}
                value={stopQuery}
                onChange={e => setStopQuery(e.target.value)}
                placeholder={`Search ${cfg?.label || ''} locations…`}
              />
              {searchingStops && (
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted }}>searching…</span>
              )}
              {stopResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: C.surface, border: `1px solid ${C.teal}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginTop: 2, maxHeight: 260, overflowY: 'auto' }}>
                  {stopResults.map((loc, i) => (
                    <div key={`${loc.id}_${i}`}
                      onMouseDown={() => handleAddStop(loc)}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < stopResults.length - 1 ? `1px solid ${C.border}` : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(64,224,208,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.white }}>{loc.name}</div>
                      {(loc.city || loc.state) && (
                        <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted }}>{[loc.city, loc.state].filter(Boolean).join(', ')}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stops list */}
          {form.stops.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {form.stops.map((stop, i) => (
                <StopItem
                  key={`${stop.id}_${i}`}
                  stop={stop}
                  index={i}
                  total={form.stops.length}
                  onRemove={i => upd('stops', form.stops.filter((_, idx) => idx !== i))}
                  onNoteChange={(i, note) => {
                    const stops = [...form.stops];
                    stops[i] = { ...stops[i], _note: note };
                    upd('stops', stops);
                  }}
                  onMoveUp={i => moveStop(i, -1)}
                  onMoveDown={i => moveStop(i, 1)}
                  dragHandlers={dragHandlers}
                />
              ))}
            </div>
          )}

          {/* Add new location button */}
          {form.routeType && !showManualStop && (
            <button type="button" onClick={() => setShowManualStop(true)}
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '8px 16px', borderRadius: 6, border: `1px dashed ${C.orange}`, background: 'transparent', color: C.orange, cursor: 'pointer', letterSpacing: '0.05em', width: '100%', marginTop: 4 }}>
              + ADD NEW LOCATION (not in database)
            </button>
          )}
          {showManualStop && (
            <ManualStopForm onAdd={handleManualStop} onCancel={() => setShowManualStop(false)} saving={addingManual} />
          )}
        </div>

        {/* ── Reading List ── */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginBottom: 20 }}>
          <h4 style={sectionHead}>READ BEFORE YOU GO</h4>
          {(form.readingList || BLANK_READING_LIST).map((book, i) => (
            <ReadingListRow
              key={i}
              index={i}
              value={book}
              onChange={v => {
                const updated = [...form.readingList];
                updated[i] = v;
                upd('readingList', updated);
              }}
            />
          ))}
        </div>

        {/* ── Type-specific fields ── */}
        {isGhostOrUFO && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginBottom: 20 }}>
            <h4 style={sectionHead}>{form.routeType === 'ghostTown' ? 'GHOST TOWN DETAILS' : 'UFO & PARANORMAL DETAILS'}</h4>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>DIFFICULTY</label>
              <select value={form.difficulty} onChange={e => upd('difficulty', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select…</option>
                {['Easy','Moderate','Remote'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>NEAREST SERVICES</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.nearestServices} onChange={e => upd('nearestServices', e.target.value)} placeholder="Nearest gas, food, water…" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>OVERNIGHT SUGGESTIONS</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.overnightSuggestions} onChange={e => upd('overnightSuggestions', e.target.value)} />
            </div>
            {form.routeType === 'ghostTown' && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>ROAD CONDITIONS NOTE</label>
                <input style={inputStyle} value={form.roadConditions} onChange={e => upd('roadConditions', e.target.value)} placeholder="e.g. 4WD recommended for last 5 miles" />
              </div>
            )}
            {form.routeType === 'ufo' && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>PARANORMAL NOTES</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={form.paranormalNotes} onChange={e => upd('paranormalNotes', e.target.value)} placeholder="What phenomena have been reported?" />
              </div>
            )}
          </div>
        )}

        {isNationalPark && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginBottom: 20 }}>
            <h4 style={sectionHead}>NATIONAL PARK DETAILS</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>ENTRANCE FEE</label>
                <input style={inputStyle} value={form.entranceFee} onChange={e => upd('entranceFee', e.target.value)} placeholder="e.g. $35 per vehicle" />
              </div>
              <div>
                <label style={labelStyle}>DIFFICULTY</label>
                <select value={form.difficulty} onChange={e => upd('difficulty', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  {['Easy','Moderate','Strenuous'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>RESERVATION REQUIRED</label>
              <div style={{ paddingTop: 6 }}><Toggle value={form.reservationRequired} onChange={v => upd('reservationRequired', v)} /></div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>OVERNIGHT SUGGESTIONS</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.overnightSuggestions} onChange={e => upd('overnightSuggestions', e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>ACCESSIBILITY NOTES</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.accessibilityNotes} onChange={e => upd('accessibilityNotes', e.target.value)} />
            </div>
          </div>
        )}

        {isLighthouse && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginBottom: 20 }}>
            <h4 style={sectionHead}>LIGHTHOUSE DETAILS</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>COASTAL REGION</label>
                <select value={form.coastalRegion} onChange={e => upd('coastalRegion', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  {['New England','Mid-Atlantic','Great Lakes','Gulf Coast','Pacific Northwest','California','Hawaii','Alaska'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>TOURS AVAILABLE</label>
                <div style={{ paddingTop: 8 }}><Toggle value={form.toursAvailable} onChange={v => upd('toursAvailable', v)} /></div>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>OVERNIGHT SUGGESTIONS</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.overnightSuggestions} onChange={e => upd('overnightSuggestions', e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>BEST VIEWING SEASON</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.bestViewingSeason} onChange={e => upd('bestViewingSeason', e.target.value)} />
            </div>
          </div>
        )}

        {isCrawl && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginBottom: 20 }}>
            <h4 style={sectionHead}>{form.routeType === 'coffeeShop' ? 'COFFEE SHOP CRAWL DETAILS' : 'BOOKSTORE CRAWL DETAILS'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>CITY OR CITIES COVERED</label>
                <input style={inputStyle} value={form.citiesCovered} onChange={e => upd('citiesCovered', e.target.value)} placeholder="e.g. Portland, OR" />
              </div>
              <div>
                <label style={labelStyle}>WALKING OR DRIVING</label>
                <select value={form.walkingOrDriving} onChange={e => upd('walkingOrDriving', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="walking">Walking</option>
                  <option value="driving">Driving</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>ESTIMATED TIME</label>
                <input style={inputStyle} value={form.estimatedTime} onChange={e => upd('estimatedTime', e.target.value)} placeholder="e.g. 3–4 hours" />
              </div>
            </div>
          </div>
        )}

        {isLiterary && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginBottom: 20 }}>
            <h4 style={sectionHead}>{form.routeType === 'literaryLandmark' ? 'LITERARY LANDMARK DETAILS' : 'AUTHOR COUNTRY DETAILS'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>FEATURED AUTHOR</label>
                <input style={inputStyle} value={form.featuredAuthor} onChange={e => upd('featuredAuthor', e.target.value)} placeholder="e.g. Flannery O'Connor" />
              </div>
              <div>
                <label style={labelStyle}>LITERARY PERIOD</label>
                <input style={inputStyle} value={form.literaryPeriod} onChange={e => upd('literaryPeriod', e.target.value)} placeholder="e.g. Southern Gothic, Beat Generation" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>COMPANION GAZETTE FEATURE</label>
                <input style={inputStyle} value={form.companionGazette} onChange={e => upd('companionGazette', e.target.value)} placeholder="Link to related Dispatches entry" />
              </div>
            </div>
          </div>
        )}

        {/* ── Inspiration ── */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginBottom: 24 }}>
          <label style={labelStyle}>INSPIRED BY <span style={{ color: C.muted }}>(optional attribution)</span></label>
          <input style={inputStyle} value={form.inspiration} onChange={e => upd('inspiration', e.target.value)} placeholder="e.g. Inspired by Sunset Magazine's 2024 Ghost Town guide" />
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted, marginTop: 4 }}>
            Displayed discreetly at the bottom of the user-facing route detail.
          </div>
        </div>

        {/* ── Save button ── */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {editingId && (
            <button onClick={handleReset}
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '10px 18px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
              CANCEL
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !form.routeType || !form.name.trim()}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em', padding: '10px 24px', borderRadius: 6, border: 'none', cursor: saving || !form.routeType || !form.name.trim() ? 'not-allowed' : 'pointer', background: saving || !form.routeType || !form.name.trim() ? 'rgba(64,224,208,0.25)' : C.teal, color: '#fff', transition: 'all 0.15s' }}>
            {saving ? 'SAVING...' : editingId ? 'SAVE CHANGES' : 'SAVE ROUTE'}
          </button>
        </div>
      </div>

      {/* ── Routes list ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ ...sectionHead, margin: 0 }}>ALL CURATED ROUTES ({routes.length})</h3>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', fontSize: 11, padding: '6px 10px' }}>
            <option value="">All types</option>
            {ROUTE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {loadingRoutes ? (
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted }}>Loading…</p>
        ) : filteredRoutes.length === 0 ? (
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted }}>No routes yet. Build one above.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['NAME','TYPE','STATE','STOPS','DURATION','ACTIVE','',''].map(h => (
                    <th key={h} style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal, letterSpacing: '0.06em', padding: '8px 10px', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map(route => (
                  <tr key={route.id} style={{ borderBottom: `1px solid rgba(64,224,208,0.08)` }}>
                    <td style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.white, padding: '10px 10px' }}>{route.name}</td>
                    <td style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.silver, padding: '10px 10px', whiteSpace: 'nowrap' }}>
                      {ROUTE_TYPE_CONFIG[route.routeType]?.label || route.routeType}
                    </td>
                    <td style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.silver, padding: '10px 10px' }}>{route.state || '—'}</td>
                    <td style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.silver, padding: '10px 10px', textAlign: 'center' }}>
                      {(route.stops || []).length}
                    </td>
                    <td style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.silver, padding: '10px 10px', whiteSpace: 'nowrap' }}>{route.duration || '—'}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, padding: '3px 8px', borderRadius: 10, background: route.active ? 'rgba(64,224,208,0.15)' : 'rgba(192,192,192,0.1)', color: route.active ? C.teal : C.muted, letterSpacing: '0.05em' }}>
                        {route.active ? 'ACTIVE' : 'OFF'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <button onClick={() => handleEdit(route)}
                        style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 5, border: `1px solid ${C.teal}`, background: 'transparent', color: C.teal, cursor: 'pointer', letterSpacing: '0.04em' }}>
                        EDIT
                      </button>
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <button onClick={() => setDeleteConfirm(route)}
                        style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 5, border: `1px solid rgba(255,78,0,0.4)`, background: 'transparent', color: C.orange, cursor: 'pointer', letterSpacing: '0.04em' }}>
                        DEL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2001, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.surface, border: `1.5px solid ${C.orange}`, borderRadius: 12, padding: 24, maxWidth: 360, width: '100%' }}>
            <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.orange, margin: '0 0 10px', letterSpacing: '0.05em' }}>DELETE ROUTE?</h3>
            <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.white, margin: '0 0 20px', lineHeight: 1.5 }}>
              Delete <strong>"{deleteConfirm.name}"</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>
                CANCEL
              </button>
              <button onClick={() => handleDelete(deleteConfirm.id)}
                style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 18px', borderRadius: 6, border: 'none', background: C.orange, color: '#fff', cursor: 'pointer' }}>
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
