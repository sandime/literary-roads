import { CAR_TYPES, carImgSrc } from '../utils/carCheckIns';

const CarSelector = ({ selectedCar, onSelect }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
    {Object.entries(CAR_TYPES).map(([type, { label }]) => {
      const active = selectedCar === type;
      return (
        <button
          key={type}
          onClick={() => onSelect(type)}
          style={{
            background: active ? 'rgba(64,224,208,0.1)' : 'rgba(255,255,255,0.03)',
            border: `2px solid ${active ? '#40E0D0' : 'rgba(64,224,208,0.15)'}`,
            borderRadius: '12px',
            padding: '14px 8px 10px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: active
              ? '0 0 18px rgba(64,224,208,0.45), inset 0 0 12px rgba(64,224,208,0.06)'
              : 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            position: 'relative',
          }}
        >
          {/* Selected checkmark */}
          {active && (
            <span style={{
              position: 'absolute', top: '6px', right: '8px',
              color: '#40E0D0', fontSize: '11px', fontFamily: 'Bungee, sans-serif',
              textShadow: '0 0 8px rgba(64,224,208,0.8)',
            }}>✓</span>
          )}

          <img
            src={carImgSrc(type)}
            alt={label}
            style={{ width: '80px', height: '52px', objectFit: 'contain' }}
          />

          <span className="font-bungee" style={{
            fontSize: '9px',
            color: active ? '#40E0D0' : 'rgba(192,192,192,0.55)',
            letterSpacing: '0.07em',
            textAlign: 'center',
            lineHeight: 1.3,
            textShadow: active ? '0 0 8px rgba(64,224,208,0.6)' : 'none',
          }}>
            {label.toUpperCase()}
          </span>
        </button>
      );
    })}
  </div>
);

export default CarSelector;
