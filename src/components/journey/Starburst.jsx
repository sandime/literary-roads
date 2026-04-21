const Starburst = ({ color = '#FF4E00', size = 20, style: sty = {} }) => {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI) / 8;
    const r = i % 2 === 0 ? size / 2 : size / 4.5;
    return `${size / 2 + r * Math.cos(angle)},${size / 2 + r * Math.sin(angle)}`;
  }).join(' ');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'inline-block', flexShrink: 0, ...sty }}>
      <polygon points={pts} fill={color} opacity="0.9" />
    </svg>
  );
};

export default Starburst;
