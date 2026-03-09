import { useState, useRef, useEffect } from 'react';
import { CAR_TYPES, carImgSrc } from '../utils/carCheckIns';

const ITEMS_MOBILE  = 2;
const ITEMS_DESKTOP = 3;

const CarSelector = ({ selectedCar, onSelect }) => {
  const cars      = Object.entries(CAR_TYPES);
  const trackRef  = useRef(null);
  const [page, setPage]   = useState(0);
  const [ipv,  setIpv]    = useState(
    typeof window !== 'undefined' && window.innerWidth < 640 ? ITEMS_MOBILE : ITEMS_DESKTOP,
  );

  // Update items-per-view on resize
  useEffect(() => {
    const fn = () => setIpv(window.innerWidth < 640 ? ITEMS_MOBILE : ITEMS_DESKTOP);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const totalPages = Math.ceil(cars.length / ipv);

  const goTo = (p) => {
    const clamped = Math.max(0, Math.min(p, totalPages - 1));
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
    setPage(clamped);
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div>
      <style>{`.lr-carousel::-webkit-scrollbar { display: none; }`}</style>

      <div style={{ position: 'relative', margin: '0 20px' }}>
        {/* Prev arrow */}
        <button
          onClick={() => goTo(page - 1)}
          aria-label="Previous"
          style={{
            position: 'absolute', left: '-20px', top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, background: '#1A1B2E',
            border: '1px solid rgba(64,224,208,0.3)', borderRadius: '50%',
            width: '26px', height: '26px', color: '#40E0D0',
            cursor: page === 0 ? 'default' : 'pointer',
            opacity: page === 0 ? 0 : 1, transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', lineHeight: 1, padding: 0,
          }}
        >‹</button>

        {/* Scrollable track */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="lr-carousel"
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {cars.map(([type, { label }], i) => {
            const active = selectedCar === type;
            return (
              <button
                key={type}
                onClick={() => onSelect(type)}
                style={{
                  flexShrink: 0,
                  width: `${100 / ipv}%`,
                  boxSizing: 'border-box',
                  padding: '3px',
                  scrollSnapAlign: i % ipv === 0 ? 'start' : 'none',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  background: active ? 'rgba(64,224,208,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${active ? '#40E0D0' : 'rgba(64,224,208,0.15)'}`,
                  borderRadius: '12px',
                  padding: '12px 6px 10px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  boxShadow: active ? '0 0 18px rgba(64,224,208,0.45), inset 0 0 12px rgba(64,224,208,0.06)' : 'none',
                  transition: 'all 0.2s',
                  position: 'relative',
                  height: '100%',
                }}>
                  {active && (
                    <span style={{
                      position: 'absolute', top: '6px', right: '8px',
                      color: '#40E0D0', fontSize: '11px',
                      fontFamily: 'Bungee, sans-serif',
                      textShadow: '0 0 8px rgba(64,224,208,0.8)',
                    }}>✓</span>
                  )}
                  <img
                    src={carImgSrc(type)}
                    alt={label}
                    style={{ width: '72px', height: '46px', objectFit: 'contain' }}
                  />
                  <span className="font-bungee" style={{
                    fontSize: '8px',
                    color: active ? '#40E0D0' : 'rgba(192,192,192,0.55)',
                    letterSpacing: '0.07em',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    textShadow: active ? '0 0 8px rgba(64,224,208,0.6)' : 'none',
                  }}>
                    {label.toUpperCase()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Next arrow */}
        <button
          onClick={() => goTo(page + 1)}
          aria-label="Next"
          style={{
            position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, background: '#1A1B2E',
            border: '1px solid rgba(64,224,208,0.3)', borderRadius: '50%',
            width: '26px', height: '26px', color: '#40E0D0',
            cursor: page >= totalPages - 1 ? 'default' : 'pointer',
            opacity: page >= totalPages - 1 ? 0 : 1, transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', lineHeight: 1, padding: 0,
          }}
        >›</button>
      </div>

      {/* Dot indicators */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === page ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === page ? '#40E0D0' : 'rgba(64,224,208,0.25)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.25s',
                boxShadow: i === page ? '0 0 6px rgba(64,224,208,0.6)' : 'none',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CarSelector;
