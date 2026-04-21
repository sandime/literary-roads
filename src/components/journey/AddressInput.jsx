import { useState, useEffect, useRef } from 'react';
import { autocompleteAddress } from '../../utils/mapboxGeocoding';

// Address autocomplete input with embedded GPS and clear buttons.
// Props:
//   value, onChange(string), onSelect(suggestion), placeholder
//   confirmed — turns border turquoise + shows "✓ Location confirmed"
//   gpsLoading, onGPS, onClear
const AddressInput = ({ value, onChange, onSelect, placeholder, confirmed, gpsLoading, onGPS, onClear }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop]       = useState(false);
  const containerRef = useRef(null);
  const debounceRef  = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!value || value.length < 2) { setSuggestions([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await autocompleteAddress(value, ['US', 'PR']);
      const list = res || [];
      setSuggestions(list);
      setShowDrop(list.length > 0);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    const close = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setShowDrop(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const borderColor = confirmed ? 'rgba(64,224,208,0.9)' : 'rgba(64,224,208,0.4)';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDrop(true)}
          placeholder={placeholder}
          className="font-special-elite text-paper-white"
          style={{
            width: '100%', background: 'rgba(0,0,0,0.5)',
            border: `2px solid ${borderColor}`,
            borderRadius: 10, padding: '12px 80px 12px 14px',
            fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
          }}
          autoComplete="off"
        />
        <div style={{ position: 'absolute', right: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
          {value && (
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onClear(); }}
              style={{ width: 30, height: 30, borderRadius: 6, background: 'none', border: 'none',
                       cursor: 'pointer', color: 'rgba(192,192,192,0.5)', fontSize: 18, lineHeight: 1,
                       display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Clear"
            >
              ×
            </button>
          )}
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); if (!gpsLoading) onGPS(); }}
            disabled={gpsLoading}
            style={{ width: 36, height: 36, borderRadius: 8,
                     background: confirmed ? 'rgba(64,224,208,0.15)' : 'rgba(64,224,208,0.08)',
                     border: `1px solid ${confirmed ? 'rgba(64,224,208,0.5)' : 'rgba(64,224,208,0.2)'}`,
                     cursor: gpsLoading ? 'default' : 'pointer',
                     display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Use my location"
          >
            {gpsLoading ? (
              <span style={{ display: 'inline-block', width: 14, height: 14,
                             border: '2px solid rgba(64,224,208,0.3)', borderTopColor: '#40E0D0',
                             borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={confirmed ? '#40E0D0' : 'rgba(64,224,208,0.7)'} strokeWidth={2.5}>
                <path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      {confirmed && (
        <p className="font-special-elite" style={{ fontSize: 11, color: 'rgba(64,224,208,0.6)', marginTop: 4, paddingLeft: 2 }}>
          ✓ Location confirmed
        </p>
      )}
      {showDrop && suggestions.length > 0 && (
        <ul style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, maxHeight: 220, overflowY: 'auto' }}
          className="bg-midnight-navy border-2 border-starlight-turquoise rounded-lg shadow-2xl"
        >
          {suggestions.map((s, i) => (
            <li key={i}
              onPointerDown={() => { onSelect(s); setShowDrop(false); }}
              className="px-3 py-2.5 cursor-pointer hover:bg-starlight-turquoise/10 text-paper-white font-special-elite text-sm border-b border-starlight-turquoise/10 last:border-0"
            >
              {s.label || s.display || s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressInput;
