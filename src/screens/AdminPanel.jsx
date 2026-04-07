// src/screens/AdminPanel.jsx
// Newsletter admin panel — Issue metadata + Festivals, Indie Picks, Debut Authors, BookTok, Trip Reports
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchAll, createItem, updateItem, deleteItem, ADMIN_UID,
  fetchCurrentIssue, saveCurrentIssue, publishIssue,
  fetchFeatured, fetchArchivedIssues, fetchAllFeaturedSections,
} from '../utils/newsletterAdmin';
import { formatIssueDate } from '../components/GazetteContent';
import { generateNewsletterHTML } from '../utils/newsletterGenerator';

// ── Date formatting ────────────────────────────────────────────────────────────
// Returns "April 18, 2026" for single-day, "April 18-24, 2026 · 7 days" for multi-day.
const formatFestivalDate = (startDate, endDate) => {
  if (!startDate) return '';
  // Append T00:00:00 to avoid UTC-midnight timezone shifts
  const start = new Date(startDate + 'T00:00:00');
  const end = endDate && endDate !== startDate ? new Date(endDate + 'T00:00:00') : null;

  const fmt  = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (!end || end <= start) return fmt(start);

  const days = Math.round((end - start) / 864e5) + 1;
  const dayLabel = `${days} day${days !== 1 ? 's' : ''}`;

  // Same month + year → "April 18-24, 2026 · 7 days"
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const month = start.toLocaleDateString('en-US', { month: 'long' });
    return `${month} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()} · ${dayLabel}`;
  }
  // Different months, same year → "April 30 - May 3, 2026 · 4 days"
  if (start.getFullYear() === end.getFullYear()) {
    const s = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const e = end.toLocaleDateString('en-US',   { month: 'long', day: 'numeric' });
    return `${s} - ${e}, ${start.getFullYear()} · ${dayLabel}`;
  }
  // Different years
  return `${fmt(start)} - ${fmt(end)} · ${dayLabel}`;
};

// ── Section definitions ────────────────────────────────────────────────────────
// NOTE: `key` = Firestore collection name. Renamed sections keep their original
// collection names so existing data is preserved.
const SECTIONS = [
  // ── 1. FESTIVAL TRIPS (was: Festivals) ──────────────────────────────────────
  {
    key: 'festivals',
    label: 'Festival Trips',
    defaultFeatured: true,
    featuredFixed: true,
    displayField: 'name',
    subField: 'location',
    getExtraDisplay: item => formatFestivalDate(item.date, item.endDate),
    fields: [
      { key: 'name',      label: 'Festival Name', type: 'text', required: true },
      { key: 'date',      label: 'Start Date',    type: 'date', required: true },
      { key: 'endDate',   label: 'End Date',      type: 'date', required: false, note: 'Optional — leave blank for single-day events' },
      { key: 'location',  label: 'City, State',   type: 'text', required: true, placeholder: 'Nashville, TN' },
      { key: 'context',   label: 'Description',   type: 'textarea', required: true, maxLength: 400, rows: 4 },
      { key: 'link',      label: 'Website URL',   type: 'url',  required: true },
      { key: 'imageUrl',  label: 'Image URL',     type: 'url',  required: false },
    ],
  },

  // ── 2. HAND-SELECTED (was: Indie Picks) ─────────────────────────────────────
  {
    key: 'indiePicks',
    label: 'Hand-Selected',
    subtitle: 'Bookstore staff picks from indie shops across America',
    defaultFeatured: false,
    displayField: 'bookstoreName',
    subField: 'city',
    fields: [
      { key: 'bookstoreName', label: 'Store Name',         type: 'text', required: true },
      { key: 'city',          label: 'City, State',        type: 'text', required: true, placeholder: 'Portland, ME' },
      { key: 'ownerName',     label: 'Owner / Staff Name', type: 'text', required: false },
      { key: 'description',   label: 'Store Description',  type: 'textarea', required: false, maxLength: 300, rows: 3 },
      { key: 'imageUrl',      label: 'Store Image URL',    type: 'url',  required: false },
      { key: 'appLink',       label: 'App Link',           type: 'url',  required: false, note: 'Auto-populated from database if available' },
      {
        key: 'bookPicks', label: 'Book Picks', type: 'repeater', maxItems: 5,
        subFields: [
          { key: 'title',    label: 'Title',           type: 'text',     required: true },
          { key: 'author',   label: 'Author',          type: 'text',     required: true },
          { key: 'coverUrl', label: 'Cover Image URL', type: 'url',      required: false },
          { key: 'blurb',    label: 'Staff Blurb',     type: 'textarea', required: false, maxLength: 200, rows: 3 },
        ],
      },
    ],
  },

  // ── 3. DISPATCHES (was: Trip Reports) ───────────────────────────────────────
  {
    key: 'tripReports',
    label: 'Dispatches',
    defaultFeatured: false,
    displayField: 'title',
    subField: 'location',
    fields: [
      { key: 'title',        label: 'Dispatch Title',     type: 'text',     required: true, placeholder: "Following Flannery O'Connor Across Georgia" },
      { key: 'startCity',    label: 'Start City',         type: 'text',     required: false },
      { key: 'endCity',      label: 'End City',           type: 'text',     required: false },
      { key: 'location',     label: 'States Covered',     type: 'text',     required: false, placeholder: 'Tennessee, Georgia, South Carolina' },
      { key: 'narrative',    label: 'Description',        type: 'textarea', required: true, maxLength: 800, rows: 6 },
      { key: 'landmarks',    label: 'Featured Landmarks', type: 'text',     required: false, placeholder: 'Comma-separated landmark names' },
      { key: 'heroImageUrl', label: 'Hero Image URL',     type: 'url',      required: false },
      { key: 'appRouteLink', label: 'App Route Link',     type: 'url',      required: false },
    ],
  },

  // ── 4. READERS' CHOICE (was: BookTok) ───────────────────────────────────────
  {
    key: 'bookTokPicks',
    label: "Readers' Choice",
    defaultFeatured: false,
    displayField: 'bookTitle',
    subField: 'author',
    fields: [
      { key: 'bookTitle',  label: 'Book Title',        type: 'text',     required: true },
      { key: 'author',     label: 'Author',            type: 'text',     required: true },
      { key: 'coverUrl',   label: 'Cover Image URL',   type: 'url',      required: false },
      { key: 'whyBuzzing', label: "Why It's Buzzing",  type: 'textarea', required: true, maxLength: 300, rows: 4 },
      { key: 'buzzSource', label: 'Source of Buzz',    type: 'select',   required: false, options: ['BookTok', 'Instagram', 'Reddit', 'Word of mouth', 'Other'] },
      { key: 'link',       label: 'Link',              type: 'url',      required: false },
    ],
  },

  // ── 5. LITERARY LANDMARK (new) ───────────────────────────────────────────────
  {
    key: 'literaryLandmarks',
    label: 'Literary Landmark',
    defaultFeatured: false,
    displayField: 'name',
    subField: 'location',
    fields: [
      { key: 'name',               label: 'Landmark Name',           type: 'text',     required: true },
      { key: 'location',           label: 'City, State',             type: 'text',     required: true },
      { key: 'literaryConnection', label: 'Literary Connection',     type: 'text',     required: true, placeholder: 'Who/what is this place connected to?' },
      { key: 'history',            label: 'History',                 type: 'textarea', required: true, maxLength: 800, rows: 6 },
      { key: 'howToVisit',         label: 'How to Visit',            type: 'textarea', required: false, maxLength: 300, rows: 3, placeholder: 'Hours, admission, tips...' },
      { key: 'readBeforeYouGo',    label: 'What to Read Before You Go', type: 'text', required: false, placeholder: 'Book Title by Author' },
      { key: 'heroImageUrl',       label: 'Hero Image URL',          type: 'url',      required: false },
      { key: 'appLink',            label: 'App Link',                type: 'url',      required: false, note: 'Auto-populated from database if available' },
      { key: 'externalLink',       label: 'Wikipedia or External Link', type: 'url',  required: false },
    ],
  },

  // ── 6. THE READING ROOM (new) ────────────────────────────────────────────────
  {
    key: 'readingRoom',
    label: 'The Reading Room',
    defaultFeatured: false,
    displayField: 'communityNote',
    subField: null,
    fields: [
      {
        key: 'featuredBooks', label: 'Featured Books', type: 'repeater', maxItems: 3,
        subFields: [
          { key: 'title',       label: 'Title',        type: 'text',     required: true },
          { key: 'author',      label: 'Author',       type: 'text',     required: true },
          { key: 'coverUrl',    label: 'Cover URL',    type: 'url',      required: false },
          { key: 'whyFeatured', label: 'Why Featured', type: 'textarea', required: false, maxLength: 200, rows: 3 },
        ],
      },
      { key: 'communityNote',     label: 'Community Note',           type: 'textarea', required: false, maxLength: 300, rows: 4, placeholder: "Editorial comment on what readers are into..." },
      { key: 'postcardImageUrl',  label: 'Featured Postcard Image URL', type: 'url',  required: false },
      { key: 'postcardCaption',   label: 'Postcard Caption',         type: 'text',     required: false },
      { key: 'postcardLocation',  label: 'Postcard Location',        type: 'text',     required: false },
    ],
  },

  // ── 7. HEADLIGHTS (new) — each item = one headline ──────────────────────────
  {
    key: 'headlights',
    label: 'Headlights',
    defaultFeatured: false,
    displayField: 'headline',
    subField: 'type',
    fields: [
      { key: 'headline', label: 'Headline',  type: 'text',     required: true, placeholder: 'Short, punchy headline' },
      { key: 'body',     label: 'Body',      type: 'textarea', required: true, maxLength: 300, rows: 3, placeholder: '2-3 sentences max' },
      { key: 'type',     label: 'Type',      type: 'select',   required: true, options: ['New Shop', 'Anniversary', 'Find', 'Event', 'Other'] },
      { key: 'link',     label: 'Link',      type: 'url',      required: false },
      { key: 'imageUrl', label: 'Image URL', type: 'url',      required: false },
    ],
  },

  // ── 8. ON THE ROAD (new) — each item = one author event ─────────────────────
  {
    key: 'onTheRoad',
    label: 'On the Road',
    defaultFeatured: false,
    displayField: 'authorName',
    subField: 'bookTitle',
    fields: [
      { key: 'authorName', label: 'Author Name',         type: 'text',     required: true },
      { key: 'bookTitle',  label: 'Book Title',          type: 'text',     required: true },
      { key: 'coverUrl',   label: 'Book Cover URL',      type: 'url',      required: false },
      { key: 'venueName',  label: 'Venue Name',          type: 'text',     required: true },
      { key: 'location',   label: 'City, State',         type: 'text',     required: true },
      { key: 'dateTime',   label: 'Date and Time',       type: 'text',     required: true, placeholder: 'April 18, 2026 · 7:00 PM' },
      { key: 'rsvpLink',   label: 'Ticket / RSVP Link',  type: 'url',      required: false },
      { key: 'notes',      label: 'Notes',               type: 'text',     required: false, placeholder: 'Signing, reading, conversation...' },
    ],
  },

  // ── 9. THE WAYSTATION (new) ──────────────────────────────────────────────────
  {
    key: 'waystation',
    label: 'The Waystation',
    defaultFeatured: false,
    displayField: 'name',
    subField: 'location',
    fields: [
      { key: 'name',            label: 'Place Name',                 type: 'text',     required: true },
      { key: 'placeType',       label: 'Type',                       type: 'select',   required: true, options: ['Coffee Shop', 'Bookstore', 'Both'] },
      { key: 'location',        label: 'City, State',                type: 'text',     required: true },
      { key: 'whyWorthy',       label: 'Why Literary-Traveler Worthy', type: 'textarea', required: true, maxLength: 400, rows: 4 },
      { key: 'bookToReadThere', label: 'A Book to Read There',       type: 'text',     required: false, placeholder: 'Title by Author' },
      { key: 'hours',           label: 'Hours',                      type: 'text',     required: false },
      { key: 'address',         label: 'Address',                    type: 'text',     required: false },
      { key: 'website',         label: 'Website',                    type: 'url',      required: false },
      { key: 'heroImageUrl',    label: 'Hero Image URL',             type: 'url',      required: false },
      { key: 'appLink',         label: 'App Link',                   type: 'url',      required: false, note: 'Auto-populated from database if available' },
      { key: 'travelersOffer',  label: 'Literary Travelers Offer',   type: 'text',     required: false, placeholder: '10% off with Literary Roads app (optional)' },
    ],
  },

  // ── 10. BOOKSTORE OWNER Q&A (new) ───────────────────────────────────────────
  {
    key: 'bookstoreQA',
    label: 'Bookstore Q&A',
    defaultFeatured: false,
    displayField: 'storeName',
    subField: 'location',
    fields: [
      { key: 'storeName',     label: 'Store Name',                    type: 'text', required: true },
      { key: 'location',      label: 'City, State',                   type: 'text', required: true },
      { key: 'ownerName',     label: 'Owner / Manager Name & Title',  type: 'text', required: true },
      { key: 'storeImageUrl', label: 'Store Image URL',               type: 'url',  required: false },
      { key: 'ownerPhotoUrl', label: 'Owner Photo URL',               type: 'url',  required: false, note: 'Optional' },
      { key: 'q1',  label: 'Q1: How do we encourage more people to read?',                              type: 'textarea', required: false, maxLength: 400, rows: 3 },
      { key: 'q2',  label: 'Q2: What\'s the last book you loved?',                                      type: 'textarea', required: false, maxLength: 400, rows: 3 },
      { key: 'q3',  label: 'Q3: Do you have a favorite coffee shop?',                                   type: 'textarea', required: false, maxLength: 400, rows: 3 },
      { key: 'q4',  label: 'Q4: What surprised you this week?',                                         type: 'textarea', required: false, maxLength: 400, rows: 3 },
      { key: 'q5',  label: 'Q5: Is there life on other planets?',                                       type: 'textarea', required: false, maxLength: 400, rows: 3 },
      { key: 'q6',  label: 'Q6: If you could read a book anywhere in the world, where would that be?',  type: 'textarea', required: false, maxLength: 400, rows: 3 },
      { key: 'q7',  label: 'Q7: Winter, spring, summer or fall?',                                       type: 'textarea', required: false, maxLength: 400, rows: 3 },
      { key: 'q8',  label: 'Q8: What is your favorite invention?',                                      type: 'textarea', required: false, maxLength: 400, rows: 3 },
      { key: 'q9',  label: 'Q9: When was your last road trip and where did you go?',                    type: 'textarea', required: false, maxLength: 400, rows: 3 },
      { key: 'q10', label: 'Q10: How do you like your coffee (or tea)?',                                type: 'textarea', required: false, maxLength: 400, rows: 3 },
      { key: 'q11', label: 'Q11: What\'s one book every Literary Roads traveler should read?',          type: 'textarea', required: false, maxLength: 400, rows: 3 },
    ],
  },

  // ── 11. THE LONG ROAD (new) ──────────────────────────────────────────────────
  {
    key: 'theLongRoad',
    label: 'The Long Road',
    defaultFeatured: false,
    displayField: 'authorName',
    subField: 'bookTitle',
    fields: [
      { key: 'youtubeId',      label: 'YouTube Video ID',   type: 'text',     required: true, placeholder: 'e.g. dQw4w9WgXcQ (just the ID)' },
      { key: 'authorName',     label: 'Author Name',        type: 'text',     required: true },
      { key: 'bookTitle',      label: 'Book Title',         type: 'text',     required: true },
      { key: 'interviewTitle', label: 'Interview Title',    type: 'text',     required: true, placeholder: 'On writing place, memory and the American road' },
      { key: 'description',    label: 'Description',        type: 'textarea', required: false, maxLength: 300, rows: 3 },
      { key: 'authorPhotoUrl', label: 'Author Photo URL',   type: 'url',      required: false, note: 'Optional' },
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

// ── Repeater Field ────────────────────────────────────────────────────────────
function RepeaterField({ field, value, onChange }) {
  const items = value || [];
  const addItem = () => {
    if (items.length >= (field.maxItems || 10)) return;
    const blank = {};
    field.subFields.forEach(sf => { blank[sf.key] = ''; });
    onChange([...items, blank]);
  };
  const removeItem = i => onChange(items.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal, letterSpacing: '0.06em' }}>
              {field.label.toUpperCase()} {i + 1}
            </span>
            <button onClick={() => removeItem(i)}
              style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
          </div>
          {field.subFields.map(sf => (
            <div key={sf.key} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontFamily: 'Bungee, sans-serif', fontSize: 8, color: C.teal, letterSpacing: '0.06em', marginBottom: 4 }}>
                {sf.label}{sf.required && <span style={{ color: C.orange }}> *</span>}
              </label>
              {sf.type === 'textarea' ? (
                <>
                  <textarea
                    value={item[sf.key] || ''}
                    onChange={e => updateItem(i, sf.key, e.target.value)}
                    rows={sf.rows || 2}
                    maxLength={sf.maxLength}
                    style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: '6px 8px', color: C.white, fontFamily: 'Special Elite, serif', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                  />
                  {sf.maxLength && (
                    <div style={{ textAlign: 'right', fontSize: 9, color: C.muted, marginTop: 1 }}>
                      {(item[sf.key] || '').length}/{sf.maxLength}
                    </div>
                  )}
                </>
              ) : (
                <input
                  type={sf.type || 'text'}
                  value={item[sf.key] || ''}
                  onChange={e => updateItem(i, sf.key, e.target.value)}
                  style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: '6px 8px', color: C.white, fontFamily: 'Special Elite, serif', fontSize: 12, boxSizing: 'border-box' }}
                />
              )}
            </div>
          ))}
        </div>
      ))}
      {items.length < (field.maxItems || 10) && (
        <button type="button" onClick={addItem}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '6px 14px', borderRadius: 6, border: `1px dashed ${C.teal}`, background: 'transparent', color: C.teal, cursor: 'pointer', letterSpacing: '0.05em', width: '100%' }}>
          + ADD {field.label.toUpperCase()} ({items.length}/{field.maxItems || 10})
        </button>
      )}
    </div>
  );
}

// ── Item Modal ────────────────────────────────────────────────────────────────
function ItemModal({ section, item, onSave, onClose, saving }) {
  const isEdit = !!item?.id;
  const [form, setForm] = useState(() => {
    const d = {};
    section.fields.forEach(f => {
      // Repeater fields initialize as arrays; everything else as strings
      d[f.key] = f.type === 'repeater'
        ? (item?.[f.key] ?? [])
        : (item?.[f.key] ?? '');
    });
    d.featured = item?.featured ?? section.defaultFeatured;
    return d;
  });

  // Only check non-repeater required fields for save eligibility
  const canSave = section.fields
    .filter(f => f.required && f.type !== 'repeater')
    .every(f => String(form[f.key] ?? '').trim());

  const inputStyle = { width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.white, fontFamily: 'Special Elite, serif', fontSize: 13, boxSizing: 'border-box' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, border: `1.5px solid ${C.teal}`, borderRadius: 12, padding: 24, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 0 40px rgba(64,224,208,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 13, color: C.teal, margin: 0, letterSpacing: '0.06em' }}>
              {isEdit ? `EDIT ${section.label.toUpperCase()}` : `ADD ${section.label.toUpperCase()}`}
            </h2>
            {section.subtitle && (
              <p style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, margin: '3px 0 0' }}>{section.subtitle}</p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.silver, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* Fields */}
        {section.fields.map(field => (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontFamily: 'Bungee, sans-serif', fontSize: 9, color: C.teal, letterSpacing: '0.07em', marginBottom: 5 }}>
              {field.label}{field.required && <span style={{ color: C.orange }}> *</span>}
            </label>

            {field.type === 'repeater' ? (
              <RepeaterField
                field={field}
                value={form[field.key]}
                onChange={arr => setForm(f => ({ ...f, [field.key]: arr }))}
              />
            ) : field.type === 'select' ? (
              <select
                value={form[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select...</option>
                {(field.options || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <>
                <textarea
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  rows={field.rows || 3}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder || ''}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
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
                style={inputStyle}
              />
            )}

            {field.note && (
              <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted, marginTop: 3 }}>
                {field.note}
              </div>
            )}
          </div>
        ))}

        {/* Festival date range preview (key stays 'festivals') */}
        {section.key === 'festivals' && form.date && (
          <div style={{ margin: '-4px 0 18px', padding: '8px 12px', background: 'rgba(64,224,208,0.06)', border: `1px solid rgba(64,224,208,0.18)`, borderRadius: 6 }}>
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.teal }}>
              {formatFestivalDate(form.date, form.endDate)}
            </span>
          </div>
        )}

        {/* Featured toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, marginTop: 8 }}>
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

// ── Issue Tab ─────────────────────────────────────────────────────────────────
function IssueTab({ showToast }) {
  const navigate = useNavigate();
  const [form, setForm]         = useState({ volume: '', issue: '', publishDate: '', pullQuote: '' });
  const [pastIssues, setPastIssues] = useState([]);
  const [saving, setSaving]         = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copyingHTML, setCopyingHTML] = useState(false);
  const [loadingArchive, setLoadingArchive] = useState(true);

  useEffect(() => {
    fetchCurrentIssue().then(data => {
      setForm({
        volume:      data.volume      ?? '',
        issue:       data.issue       ?? '',
        publishDate: data.publishDate ?? '',
        pullQuote:   data.pullQuote   ?? '',
      });
    }).catch(() => {});

    fetchArchivedIssues()
      .then(setPastIssues)
      .catch(() => {})
      .finally(() => setLoadingArchive(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCurrentIssue({
        volume:      Number(form.volume) || 1,
        issue:       Number(form.issue)  || 1,
        publishDate: form.publishDate,
        pullQuote:   form.pullQuote,
      });
      showToast('Issue settings saved');
    } catch {
      showToast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!form.volume || !form.issue || !form.publishDate) {
      showToast('Fill in volume, issue, and date first', 'error');
      return;
    }
    setPublishing(true);
    try {
      // Snapshot all currently featured content
      const BASE = import.meta.env.BASE_URL;
      const [festivals, indiePicks, debutAuthors, bookTokPicks, tripReports, nytRaw] =
        await Promise.all([
          fetchFeatured('festivals'),
          fetchFeatured('indiePicks'),
          fetchFeatured('debutAuthors'),
          fetchFeatured('bookTokPicks'),
          fetchFeatured('tripReports'),
          fetch(`${BASE}gazette-data.json`).then(r => r.json()).catch(() => null),
        ]);

      const meta = {
        volume:      Number(form.volume),
        issue:       Number(form.issue),
        publishDate: form.publishDate,
        pullQuote:   form.pullQuote,
      };
      const strip = arr => arr.map(({ id, createdAt, updatedAt, ...rest }) => rest);
      await publishIssue(meta, {
        festivals:    strip(festivals),
        indiePicks:   strip(indiePicks),
        debutAuthors: strip(debutAuthors),
        bookTokPicks: strip(bookTokPicks),
        tripReports:  strip(tripReports),
        nyt:          nytRaw || null,
      });

      // Auto-increment issue number for next issue
      const nextIssue = Number(form.issue) + 1;
      const nextForm = { ...form, issue: String(nextIssue) };
      setForm(nextForm);
      await saveCurrentIssue({ ...meta, issue: nextIssue });

      // Reload archive list
      const updated = await fetchArchivedIssues();
      setPastIssues(updated);
      showToast(`Vol. ${meta.volume} Issue ${meta.issue} published!`);
    } catch (err) {
      console.error('[publish]', err);
      showToast('Publish failed', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const inputStyle = {
    width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
    padding: '8px 10px', color: C.white, fontFamily: 'Special Elite, serif',
    fontSize: 13, boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', fontFamily: 'Bungee, sans-serif', fontSize: 9,
    color: C.teal, letterSpacing: '0.07em', marginBottom: 5,
  };

  return (
    <div>
      {/* Issue metadata form */}
      <div style={{ background: C.surface, border: `1.5px solid rgba(64,224,208,0.3)`, borderRadius: 10, padding: 20, marginBottom: 28 }}>
        <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.teal, margin: '0 0 18px', letterSpacing: '0.06em' }}>
          CURRENT ISSUE SETTINGS
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>VOLUME <span style={{ color: C.orange }}>*</span></label>
            <input type="number" min="1" value={form.volume}
              onChange={e => setForm(f => ({ ...f, volume: e.target.value }))}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>ISSUE # <span style={{ color: C.orange }}>*</span></label>
            <input type="number" min="1" value={form.issue}
              onChange={e => setForm(f => ({ ...f, issue: e.target.value }))}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>PUBLISH DATE <span style={{ color: C.orange }}>*</span></label>
            <input type="date" value={form.publishDate}
              onChange={e => setForm(f => ({ ...f, publishDate: e.target.value }))}
              style={inputStyle} />
          </div>
        </div>

        {/* Preview line */}
        {form.volume && form.issue && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: 'rgba(64,224,208,0.06)', border: `1px solid rgba(64,224,208,0.18)`, borderRadius: 6 }}>
            <span style={{ fontFamily: 'Special Elite, serif', fontSize: 12, color: C.teal }}>
              Vol. {form.volume} · Issue {form.issue}{form.publishDate ? ` · Week of ${formatIssueDate(form.publishDate)}` : ''}
            </span>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>THIS WEEK'S PULL QUOTE</label>
          <div style={{ fontFamily: 'Special Elite, serif', fontSize: 10, color: C.muted, marginBottom: 6 }}>
            The opening summary that appears at the top of the newspaper — write it like a teaser that makes readers want to keep reading
          </div>
          <textarea
            value={form.pullQuote}
            onChange={e => setForm(f => ({ ...f, pullQuote: e.target.value }))}
            rows={4}
            maxLength={280}
            placeholder="e.g. Spring festivals are blooming across the country, debut authors are making waves, and there's a road trip calling your name..."
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
          <div style={{ textAlign: 'right', fontSize: 10, color: C.muted, marginTop: 2 }}>
            {(form.pullQuote || '').length}/280
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={async () => {
              setCopyingHTML(true);
              try {
                const BASE = import.meta.env.BASE_URL;
                const nytRaw = await fetch(`${BASE}gazette-data.json`).then(r => r.json()).catch(() => null);
                const sections = await fetchAllFeaturedSections(nytRaw);
                const html = generateNewsletterHTML({
                  ...sections,
                  issue: { volume: Number(form.volume), issue: Number(form.issue), publishDate: form.publishDate, pullQuote: form.pullQuote },
                });
                await navigator.clipboard.writeText(html);
                showToast('Newsletter HTML copied!');
              } catch {
                showToast('Copy failed', 'error');
              } finally {
                setTimeout(() => setCopyingHTML(false), 2000);
              }
            }}
            disabled={copyingHTML}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 14px', borderRadius: 6, border: `1px solid rgba(64,224,208,0.4)`, background: 'transparent', color: C.teal, cursor: 'pointer', letterSpacing: '0.04em' }}>
            {copyingHTML ? '✓ COPIED!' : '✉ COPY NEWSLETTER HTML'}
          </button>
          <button onClick={() => navigate('/newspaper/current')}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 14px', borderRadius: 6, border: `1px solid rgba(64,224,208,0.4)`, background: 'transparent', color: C.teal, cursor: 'pointer', letterSpacing: '0.04em' }}>
            ◰ NEWSPAPER VIEW
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 18px', borderRadius: 6, border: `1px solid ${C.teal}`, background: 'transparent', color: C.teal, cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}>
            {saving ? 'SAVING...' : 'SAVE SETTINGS'}
          </button>
          <button onClick={handlePublish} disabled={publishing || !form.volume || !form.issue || !form.publishDate}
            style={{
              fontFamily: 'Bungee, sans-serif', fontSize: 11, padding: '8px 20px', borderRadius: 6,
              border: 'none', letterSpacing: '0.05em', cursor: publishing ? 'not-allowed' : 'pointer',
              background: (!form.volume || !form.issue || !form.publishDate) ? 'rgba(255,78,0,0.25)' : C.orange,
              color: '#fff',
            }}>
            {publishing ? 'PUBLISHING...' : '★ PUBLISH ISSUE'}
          </button>
        </div>
      </div>

      {/* Past issues list */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.teal, margin: 0, letterSpacing: '0.06em' }}>
          PUBLISHED ISSUES ({pastIssues.length})
        </h3>
        <button onClick={() => navigate('/newspaper/archive')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.silver, cursor: 'pointer', letterSpacing: '0.04em' }}>
          PUBLIC ARCHIVE →
        </button>
      </div>

      {loadingArchive ? (
        <p style={{ fontFamily: 'Special Elite, serif', color: C.muted, fontSize: 12, textAlign: 'center', padding: '24px 0' }}>Loading...</p>
      ) : pastIssues.length === 0 ? (
        <p style={{ fontFamily: 'Special Elite, serif', color: C.muted, fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
          No published issues yet. Fill in the settings above and click PUBLISH ISSUE.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pastIssues.map(iss => (
            <div key={iss.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 54 }}>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: C.teal }}>VOL. {iss.volume}</div>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 16, color: C.white }}>#{iss.issue}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, color: C.white }}>
                  Vol. {iss.volume} · Issue {iss.issue}
                </div>
                {iss.publishDate && (
                  <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted }}>
                    {formatIssueDate(iss.publishDate)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                <span style={{ fontFamily: 'Bungee, sans-serif', fontSize: 8, color: C.teal, letterSpacing: '0.06em', padding: '2px 6px', border: `1px solid rgba(64,224,208,0.3)`, borderRadius: 4 }}>
                  PUBLISHED
                </span>
                <button onClick={() => navigate(`/newspaper/${iss.slug}`)}
                  style={{ fontFamily: 'Bungee, sans-serif', fontSize: 9, padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.teal}`, background: 'transparent', color: C.teal, cursor: 'pointer', letterSpacing: '0.04em' }}>
                  VIEW
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
                {(section.subField || section.getExtraDisplay || section.extraField) && (
                  <div style={{ fontFamily: 'Special Elite, serif', fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {(() => {
                      const sub   = section.subField ? item[section.subField] : null;
                      const extra = section.getExtraDisplay
                        ? section.getExtraDisplay(item)
                        : section.extraField ? item[section.extraField] : null;
                      return [sub, extra].filter(Boolean).join(' · ');
                    })()}
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
  const [activeTab, setActiveTab] = useState('issue');
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
          <button
            onClick={() => navigate('/newsletter')}
            style={{ fontFamily: 'Bungee, sans-serif', fontSize: 10, letterSpacing: '0.06em', padding: '7px 13px', borderRadius: 6, border: `1px solid ${C.teal}`, background: 'transparent', color: C.teal, cursor: 'pointer' }}
          >
            PREVIEW
          </button>
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
        {/* Issue tab — always first */}
        <button
          onClick={() => setActiveTab('issue')}
          style={{ fontFamily: 'Bungee, sans-serif', fontSize: 11, letterSpacing: '0.06em', padding: '13px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'issue' ? `2px solid ${C.orange}` : '2px solid transparent', color: activeTab === 'issue' ? C.orange : C.muted, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s' }}
        >
          ★ ISSUE
        </button>
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
        {activeTab === 'issue' && (
          <IssueTab showToast={showToast} />
        )}
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
