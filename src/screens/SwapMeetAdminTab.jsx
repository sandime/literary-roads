// SwapMeetAdminTab.jsx — Admin panel tab for managing Book Swap Meet events
import { useState, useEffect } from 'react';
import {
  subscribeToAllSwapMeets, createSwapMeet, updateSwapMeet, deleteSwapMeet,
  subscribeToPublicTablesCount, subscribeToRecentTownSquare, deleteTownSquareMessage,
} from '../utils/swapMeet';

const C = {
  bg:      '#0F1117',
  surface: '#1A1B2E',
  teal:    '#40E0D0',
  orange:  '#FF4E00',
  silver:  '#C0C0C0',
  muted:   'rgba(192,192,192,0.5)',
  border:  'rgba(255,255,255,0.07)',
  green:   '#7bc67e',
  white:   '#FFF8E7',
};

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
];

const inputStyle = {
  width: '100%', background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 6, padding: '8px 10px', color: C.white,
  fontFamily: 'Special Elite, serif', fontSize: 13, boxSizing: 'border-box',
};

function nextSundayNoon() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilSunday);
  next.setHours(12, 0, 0, 0);
  return next.toISOString().slice(0, 16);
}

function statusChip(status) {
  const colors = {
    upcoming: { bg: 'rgba(64,224,208,0.15)', text: C.teal },
    active:   { bg: 'rgba(123,198,126,0.2)', text: C.green },
    closed:   { bg: 'rgba(255,255,255,0.06)', text: C.muted },
  };
  const c = colors[status] || colors.closed;
  return (
    <span style={{
      display: 'inline-block', borderRadius: 10, padding: '2px 10px',
      background: c.bg, color: c.text,
      fontFamily: 'Bungee, sans-serif', fontSize: 9, letterSpacing: '0.08em',
    }}>
      {status.toUpperCase()}
    </span>
  );
}

function MeetForm({ initial, onSave, onCancel }) {
  const blank = {
    hostCity: '', hostState: 'Tennessee', lat: '', lng: '',
    theme: '', openAt: nextSundayNoon(),
  };
  const [form, setForm] = useState(initial || blank);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.hostCity || !form.lat || !form.lng || !form.openAt) return;
    setSaving(true);
    try {
      const openAt  = new Date(form.openAt);
      const closeAt = new Date(openAt.getTime() + 24 * 60 * 60 * 1000);
      await onSave({
        hostCity:  form.hostCity.trim(),
        hostState: form.hostState,
        lat:       parseFloat(form.lat),
        lng:       parseFloat(form.lng),
        theme:     form.theme.trim() || null,
        openAt,
        closeAt,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted, letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>HOST CITY *</label>
          <input style={inputStyle} value={form.hostCity} onChange={e => set('hostCity', e.target.value)} placeholder="Asheville" />
        </div>
        <div>
          <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted, letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>HOST STATE *</label>
          <select style={inputStyle} value={form.hostState} onChange={e => set('hostState', e.target.value)}>
            {US_STATES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted, letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>LATITUDE *</label>
          <input style={inputStyle} type="text" inputMode="decimal" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="35.5951" />
        </div>
        <div>
          <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted, letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>LONGITUDE *</label>
          <input style={inputStyle} type="text" inputMode="decimal" value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="-82.5515" />
        </div>
      </div>
      <div>
        <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted, letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>OPEN AT (SUNDAY NOON ET) *</label>
        <input style={inputStyle} type="datetime-local" value={form.openAt} onChange={e => set('openAt', e.target.value)} />
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted, marginTop: 3 }}>Meet closes automatically 24 hours after open.</p>
      </div>
      <div>
        <label style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted, letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>THEME (OPTIONAL)</label>
        <input style={inputStyle} value={form.theme} onChange={e => set('theme', e.target.value)} placeholder="Road trip reads, summer fiction…" />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>CANCEL</button>
        <button onClick={handleSave} disabled={saving} style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 18px', borderRadius: 6, border: 'none', background: C.teal, color: '#1A1B2E', cursor: 'pointer' }}>
          {saving ? 'SAVING…' : 'SAVE MEET'}
        </button>
      </div>
    </div>
  );
}

function ActiveMeetDetails({ meet, showToast }) {
  const [tableCount, setTableCount] = useState(0);
  const [messages, setMessages]     = useState([]);
  const [deleting, setDeleting]     = useState(null);

  useEffect(() => subscribeToPublicTablesCount(meet.id, setTableCount), [meet.id]);
  useEffect(() => subscribeToRecentTownSquare(meet.id, setMessages), [meet.id]);

  const handleDeleteMsg = async (msgId) => {
    setDeleting(msgId);
    try {
      await deleteTownSquareMessage(meet.id, msgId);
      showToast('Message deleted');
    } catch { showToast('Delete failed', 'error'); }
    finally { setDeleting(null); }
  };

  const fmt = ts => ts?.toDate ? ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'rgba(123,198,126,0.08)', border: `1px solid rgba(123,198,126,0.2)`, borderRadius: 8, padding: '14px 18px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 26, color: C.green }}>{meet.participantCount || 0}</div>
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted }}>Participants</div>
        </div>
        <div style={{ background: 'rgba(64,224,208,0.08)', border: `1px solid rgba(64,224,208,0.2)`, borderRadius: 8, padding: '14px 18px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 26, color: C.teal }}>{tableCount}</div>
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted }}>Public tables</div>
        </div>
      </div>

      {/* Town square moderation */}
      <div>
        <h4 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.muted, letterSpacing: '0.08em', margin: '0 0 10px' }}>RECENT TOWN SQUARE MESSAGES</h4>
        {messages.length === 0
          ? <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No messages yet.</p>
          : messages.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: m.reported ? '#DC2626' : C.teal }}>{m.username}</span>
                {m.reported && <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: '#DC2626', marginLeft: 6 }}>REPORTED</span>}
                <span style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted, marginLeft: 8 }}>{fmt(m.sentAt)}</span>
                <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.white, margin: '4px 0 0' }}>{m.message}</p>
              </div>
              <button
                onClick={() => handleDeleteMsg(m.id)}
                disabled={deleting === m.id}
                style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '4px 10px', borderRadius: 4, border: `1px solid rgba(220,38,38,0.4)`, background: 'transparent', color: '#DC2626', cursor: 'pointer', flexShrink: 0 }}
              >
                {deleting === m.id ? '…' : 'DELETE'}
              </button>
            </div>
          ))
        }
      </div>

      {/* Top books recap */}
      {meet.topBooks?.length > 0 && (
        <div>
          <h4 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, color: C.muted, letterSpacing: '0.08em', margin: '0 0 10px' }}>TOP BOOKS</h4>
          {meet.topBooks.slice(0, 5).map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.orange, width: 18 }}>#{i + 1}</span>
              <div>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.white }}>{b.title}</div>
                <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted }}>{b.author} · {b.count} tables</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SwapMeetAdminTab({ showToast }) {
  const [meets, setMeets]         = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [editMeet, setEditMeet]   = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [expanded, setExpanded]   = useState(null);

  useEffect(() => subscribeToAllSwapMeets(setMeets), []);

  const handleCreate = async (data) => {
    try {
      await createSwapMeet(data);
      showToast('Swap Meet created');
      setShowForm(false);
    } catch { showToast('Create failed', 'error'); }
  };

  const handleUpdate = async (data) => {
    try {
      await updateSwapMeet(editMeet.id, data);
      showToast('Swap Meet updated');
      setEditMeet(null);
    } catch { showToast('Update failed', 'error'); }
  };

  const handleDelete = async (meet) => {
    if (!window.confirm(`Delete the ${meet.hostCity} Swap Meet? This cannot be undone.`)) return;
    setDeleting(meet.id);
    try {
      await deleteSwapMeet(meet.id);
      showToast('Swap Meet deleted');
    } catch { showToast('Delete failed', 'error'); }
    finally { setDeleting(null); }
  };

  const handleManualStatus = async (meet, status) => {
    try {
      await updateSwapMeet(meet.id, { status });
      showToast(`Status set to ${status}`);
    } catch { showToast('Update failed', 'error'); }
  };

  const fmtDate = ts => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 15, color: C.green, margin: '0 0 4px', letterSpacing: '0.05em' }}>BOOK SWAP MEET</h2>
          <p style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.muted, margin: 0 }}>
            Weekly Sunday event — opens automatically at noon ET via Cloud Function.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditMeet(null); }}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em', padding: '9px 16px', borderRadius: 6, border: 'none', background: C.green, color: '#1A1B2E', cursor: 'pointer', flexShrink: 0 }}
        >
          + NEW MEET
        </button>
      </div>

      {/* Create form */}
      {showForm && !editMeet && (
        <div style={{ background: 'rgba(123,198,126,0.06)', border: `1px solid rgba(123,198,126,0.2)`, borderRadius: 10, padding: 20, marginBottom: 22 }}>
          <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.green, margin: '0 0 16px', letterSpacing: '0.06em' }}>NEW SWAP MEET</h3>
          <MeetForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Meet list */}
      {meets.length === 0
        ? <p style={{ fontFamily: 'Special Elite, serif', fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No swap meets created yet.</p>
        : meets.map(meet => (
          <div key={meet.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
            {/* Edit form inline */}
            {editMeet?.id === meet.id ? (
              <div style={{ padding: 18 }}>
                <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.teal, margin: '0 0 16px', letterSpacing: '0.06em' }}>EDIT MEET</h3>
                <MeetForm
                  initial={{
                    hostCity: meet.hostCity, hostState: meet.hostState,
                    lat: meet.lat, lng: meet.lng, theme: meet.theme || '',
                    openAt: meet.openAt?.toDate ? meet.openAt.toDate().toISOString().slice(0, 16) : '',
                  }}
                  onSave={handleUpdate}
                  onCancel={() => setEditMeet(null)}
                />
              </div>
            ) : (
              <>
                {/* Row */}
                <div
                  style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: meet.status === 'active' ? 'pointer' : 'default' }}
                  onClick={() => meet.status === 'active' && setExpanded(expanded === meet.id ? null : meet.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.white }}>{meet.hostCity}, {meet.hostState}</span>
                      {statusChip(meet.status)}
                    </div>
                    {meet.theme && <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.teal, marginBottom: 3 }}>Theme: {meet.theme}</div>}
                    <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted }}>Opens: {fmtDate(meet.openAt)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {meet.status === 'upcoming' && (
                      <button onClick={e => { e.stopPropagation(); handleManualStatus(meet, 'active'); }} style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 4, border: `1px solid rgba(123,198,126,0.5)`, background: 'transparent', color: C.green, cursor: 'pointer' }}>OPEN NOW</button>
                    )}
                    {meet.status === 'active' && (
                      <button onClick={e => { e.stopPropagation(); handleManualStatus(meet, 'closed'); }} style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 4, border: `1px solid rgba(255,78,0,0.5)`, background: 'transparent', color: C.orange, cursor: 'pointer' }}>CLOSE NOW</button>
                    )}
                    <button onClick={e => { e.stopPropagation(); setEditMeet(meet); setExpanded(null); }} style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 4, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer' }}>EDIT</button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(meet); }}
                      disabled={deleting === meet.id}
                      style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 4, border: `1px solid rgba(220,38,38,0.4)`, background: 'transparent', color: '#DC2626', cursor: 'pointer' }}
                    >
                      {deleting === meet.id ? '…' : 'DEL'}
                    </button>
                  </div>
                </div>

                {/* Active meet details */}
                {expanded === meet.id && meet.status === 'active' && (
                  <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${C.border}` }}>
                    <ActiveMeetDetails meet={meet} showToast={showToast} />
                  </div>
                )}
              </>
            )}
          </div>
        ))
      }

      <div style={{ marginTop: 24, padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <p style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.muted, letterSpacing: '0.08em', margin: '0 0 6px' }}>CLOUD FUNCTIONS</p>
        <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: C.white }}>swapMeetOpen</strong> — Sunday noon ET · sets status to active, sends push notifications<br />
          <strong style={{ color: C.white }}>swapMeetClose</strong> — Monday noon ET · tallies top books, cleans up, generates recap<br />
          <strong style={{ color: C.white }}>swapMeetReminder</strong> — Saturday 9am ET · sends in-app banners + email to opted-in users
        </p>
      </div>
    </div>
  );
}
