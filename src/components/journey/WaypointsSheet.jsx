import { useRef } from 'react';
import { CATEGORY_GROUPS, ALL_CATEGORIES } from './constants';

// Bottom-sheet for selecting which stop categories to include.
// Props:
//   open, onClose
//   categories (Set), setCategories
//   title — header label, defaults to "WAYPOINTS"
//   cuisineFilter, setCuisineFilter — optional; enables restaurant cuisine search
//   dietaryFilters (Set), setDietaryFilters — optional; enables dietary checkboxes
const WaypointsSheet = ({
  open, onClose,
  categories, setCategories,
  title = 'WAYPOINTS',
  cuisineFilter, setCuisineFilter,
  dietaryFilters, setDietaryFilters,
}) => {
  const sheetRef   = useRef(null);
  const dragStartY = useRef(null);
  const dragDelta  = useRef(0);

  const hasRestaurantFilters = cuisineFilter !== undefined && !!setCuisineFilter
    && dietaryFilters !== undefined && !!setDietaryFilters;

  const onTouchStart = (e) => { dragStartY.current = e.touches[0].clientY; dragDelta.current = 0; };
  const onTouchMove  = (e) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    dragDelta.current = dy;
    if (dy > 0 && sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd = () => {
    if (dragDelta.current > 80) onClose();
    else if (sheetRef.current) sheetRef.current.style.transform = '';
    dragStartY.current = null;
    dragDelta.current  = 0;
  };

  const toggleCat  = (key) => setCategories(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleDiet = hasRestaurantFilters
    ? (key) => setDietaryFilters(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })
    : null;

  if (!open) return null;

  const selectedCount = categories.size;
  const stickyBg = { position: 'sticky', zIndex: 10, background: '#1A1B2E' };

  return (
    <>
      <style>{`
        @keyframes lr-sheet-in { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes lr-modal-in { from { opacity:0; transform:scale(0.95) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .journey-waypoints-sheet { animation: lr-sheet-in 0.28s cubic-bezier(0.32,0.72,0,1); }
        @media (min-width: 768px) { .journey-waypoints-sheet { animation: lr-modal-in 0.2s ease; } }
      `}</style>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.65)',
                 display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}
        onClick={onClose}
      >
        <div
          ref={sheetRef}
          className="journey-waypoints-sheet"
          style={{
            width: '100%', maxWidth: 480, maxHeight: '80vh',
            overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
            background: '#1A1B2E', borderRadius: '24px 24px 0 0', transition: 'transform 0.18s ease',
          }}
          onClick={e => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Sticky header */}
          <div style={{ ...stickyBg, top: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(192,192,192,0.3)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 20px 12px', borderBottom: '1px solid rgba(64,224,208,0.2)' }}>
              <div>
                <h3 className="text-starlight-turquoise font-bungee"
                  style={{ fontSize: 16, textShadow: '0 0 6px rgba(64,224,208,0.6)', margin: 0 }}>
                  {title}
                </h3>
                <p className="font-special-elite" style={{ fontSize: 11, color: 'rgba(192,192,192,0.5)', margin: 0 }}>
                  {selectedCount} of {ALL_CATEGORIES.size} selected
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setCategories(new Set(ALL_CATEGORIES))}
                  className="font-special-elite" style={{ fontSize: 12, color: 'rgba(64,224,208,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  All
                </button>
                <span style={{ color: 'rgba(192,192,192,0.2)', fontSize: 12 }}>·</span>
                <button onClick={() => setCategories(new Set())}
                  className="font-special-elite" style={{ fontSize: 12, color: 'rgba(192,192,192,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  None
                </button>
                <button onClick={onClose}
                  style={{ marginLeft: 4, width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(192,192,192,0.2)',
                           background: 'none', cursor: 'pointer', color: 'rgba(192,192,192,0.5)', fontSize: 14,
                           display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {CATEGORY_GROUPS.map(group => {
              const groupChecked = group.items.filter(i => categories.has(i.key)).length;
              return (
                <div key={group.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <group.Icon size={18} />
                    <span className="font-bungee text-atomic-orange" style={{ fontSize: 11, letterSpacing: '0.1em' }}>{group.label}</span>
                    <span className="font-special-elite" style={{ fontSize: 11, color: 'rgba(192,192,192,0.3)', marginLeft: 2 }}>{groupChecked}/{group.items.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.items.map(({ key, Icon: ItemIcon, label }) => {
                      const checked      = categories.has(key);
                      const isRestaurant = key === 'restaurant';
                      return (
                        <div key={key}>
                          <button
                            type="button"
                            onClick={() => toggleCat(key)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                              padding: '12px 16px', borderRadius: 12,
                              border: `1px solid ${checked ? 'rgba(64,224,208,0.5)' : 'rgba(192,192,192,0.12)'}`,
                              background: checked ? 'rgba(64,224,208,0.08)' : 'transparent',
                              cursor: 'pointer', textAlign: 'left', minHeight: 52,
                            }}
                          >
                            <div style={{ width: 20, height: 20, borderRadius: 4,
                                          border: `2px solid ${checked ? '#40E0D0' : 'rgba(192,192,192,0.4)'}`,
                                          background: checked ? '#40E0D0' : 'transparent', flexShrink: 0,
                                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {checked && <span style={{ color: '#1A1B2E', fontSize: 10, fontWeight: 900 }}>✓</span>}
                            </div>
                            <ItemIcon size={18} />
                            <span className="font-special-elite" style={{ fontSize: 14, flex: 1, color: checked ? '#F5F5DC' : 'rgba(192,192,192,0.5)' }}>
                              {label}
                            </span>
                          </button>

                          {/* Restaurant sub-filters — only rendered when parent passes cuisine/dietary props */}
                          {isRestaurant && checked && hasRestaurantFilters && (
                            <div style={{ marginTop: 6, marginLeft: 16, paddingLeft: 16,
                                          borderLeft: '2px solid rgba(64,224,208,0.3)', paddingBottom: 4 }}>
                              <div style={{ position: 'relative', marginTop: 8 }}>
                                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                                               fontSize: 12, color: 'rgba(192,192,192,0.5)', pointerEvents: 'none' }}>🔍</span>
                                <input
                                  type="text"
                                  value={cuisineFilter}
                                  onChange={e => setCuisineFilter(e.target.value)}
                                  placeholder="Filter by cuisine (optional)"
                                  className="font-special-elite"
                                  style={{ width: '100%', background: 'rgba(26,27,46,0.7)', border: '1px solid rgba(192,192,192,0.2)',
                                           borderRadius: 8, paddingLeft: 32, paddingRight: cuisineFilter ? 28 : 10,
                                           paddingTop: 8, paddingBottom: 8, color: '#F5F5DC', fontSize: 12,
                                           outline: 'none', boxSizing: 'border-box' }}
                                />
                                {cuisineFilter && (
                                  <button onClick={() => setCuisineFilter('')}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                             background: 'none', border: 'none', color: 'rgba(192,192,192,0.5)',
                                             cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 10 }}>
                                {[
                                  { key: 'vegan', label: 'Vegan' }, { key: 'vegetarian', label: 'Vegetarian' },
                                  { key: 'gluten_free', label: 'Gluten-free' }, { key: 'halal', label: 'Halal' },
                                  { key: 'kosher', label: 'Kosher' },
                                ].map(({ key: dk, label: dl }) => {
                                  const dChecked = dietaryFilters.has(dk);
                                  return (
                                    <button key={dk} type="button" onClick={() => toggleDiet(dk)}
                                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                                               border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                                      <div style={{ width: 16, height: 16, borderRadius: 3,
                                                    border: `2px solid ${dChecked ? '#FF4E00' : 'rgba(192,192,192,0.4)'}`,
                                                    background: dChecked ? '#FF4E00' : 'transparent', flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {dChecked && <span style={{ color: '#1A1B2E', fontSize: 8, fontWeight: 900 }}>✓</span>}
                                      </div>
                                      <span className="font-special-elite" style={{ fontSize: 12, color: 'rgba(192,192,192,0.8)' }}>{dl}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div style={{ height: 8 }} />
          </div>

          {/* Sticky footer */}
          <div style={{ ...stickyBg, bottom: 0,
                        padding: '12px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
                        borderTop: '1px solid rgba(64,224,208,0.2)' }}>
            <button
              onClick={onClose}
              className="font-bungee"
              style={{ width: '100%', background: '#FF4E00', color: '#1A1B2E', border: 'none',
                       borderRadius: 12, minHeight: 56, fontSize: 15, cursor: 'pointer',
                       boxShadow: '0 0 16px rgba(255,78,0,0.35)', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#40E0D0'}
              onMouseLeave={e => e.currentTarget.style.background = '#FF4E00'}
            >
              DONE — {selectedCount} SELECTED
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default WaypointsSheet;
