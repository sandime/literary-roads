const STYLES = `
  .t { stroke: #00F0FF; fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 0 5px #00F0FF); }
  .o { stroke: #FF5E00; fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 0 5px #FF5E00); }
  .p { stroke: #FF2A9D; fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 0 5px #FF2A9D); }
  .c { stroke: #FFFDE7; fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 0 5px #FFFDE7); }
  .ft { fill: #00F0FF; stroke: none; filter: drop-shadow(0 0 5px #00F0FF); }
  .fo { fill: #FF5E00; stroke: none; filter: drop-shadow(0 0 5px #FF5E00); }
  .fp { fill: #FF2A9D; stroke: none; filter: drop-shadow(0 0 5px #FF2A9D); }
  .fc { fill: #FFFDE7; stroke: none; filter: drop-shadow(0 0 5px #FFFDE7); }
  .bg { stroke: #FF2A9D; fill: none; stroke-width: 2; stroke-dasharray: 4 6; opacity: 0.6; }
`;

export const BookIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Sweeping pages */}
    <path className="p" d="M 15 35 Q 40 20 64 45 L 64 110 Q 40 80 15 100 Z" />
    <path className="p" d="M 113 35 Q 88 20 64 45 L 64 110 Q 88 80 113 100 Z" />
    {/* Page accents */}
    <path className="t" d="M 25 50 Q 45 40 55 60" />
    <path className="t" d="M 103 50 Q 83 40 73 60" />
    {/* Atomic burst rising */}
    <line className="o" x1="64" y1="40" x2="64" y2="10" />
    <circle className="fo" cx="64" cy="10" r="4" />
    <line className="c" x1="64" y1="40" x2="40" y2="20" />
    <circle className="fc" cx="40" cy="20" r="3" />
    <line className="c" x1="64" y1="40" x2="88" y2="20" />
    <circle className="fc" cx="88" cy="20" r="3" />
  </svg>
);

export const ClosedBookIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Atomic star background */}
    <path className="bg" d="M 64 10 L 68 25 L 83 29 L 68 33 L 64 48 L 60 33 L 45 29 L 60 25 Z" />
    {/* Rhombus Cover */}
    <polygon className="t" points="35,95 95,110 115,40 55,25" />
    {/* Pages */}
    <polygon className="c" points="35,95 25,105 85,120 95,110" />
    <line className="c" x1="95" y1="110" x2="115" y2="40" />
    <line className="c" x1="85" y1="120" x2="105" y2="50" />
    {/* Spine Accent */}
    <line className="o" x1="25" y1="105" x2="45" y2="35" />
    {/* Cover Diamond */}
    <polygon className="p" points="75,55 85,65 75,75 65,65" />
  </svg>
);

export const PinIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Satellite orbit backdrop */}
    <ellipse className="bg" cx="64" cy="90" rx="45" ry="12" transform="rotate(-15 64 90)" />
    {/* Tilted teardrop pin */}
    <path className="o" d="M 64 115 L 35 55 A 32 32 0 1 1 93 55 Z" />
    {/* Inner star */}
    <path className="t" d="M 64 30 L 68 45 L 83 49 L 68 53 L 64 68 L 60 53 L 45 49 L 60 45 Z" />
    {/* Target dot */}
    <circle className="fc" cx="64" cy="115" r="5" />
  </svg>
);

export const CameraIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Tilted trapezoid body */}
    <polygon className="o" points="20,60 100,45 110,95 15,110" />
    {/* Lens */}
    <circle className="t" cx="60" cy="75" r="22" />
    {/* Inner offset lens */}
    <circle className="p" cx="65" cy="80" r="8" />
    <circle className="fc" cx="65" cy="80" r="2" />
    {/* Viewfinder / flash mount block */}
    <path className="c" d="M 25 60 L 35 35 L 75 25 L 85 48" />
    {/* Classic atomic flash burst */}
    <path className="bg" d="M 95 15 L 100 28 L 113 33 L 100 38 L 95 51 L 90 38 L 77 33 L 90 28 Z" />
    {/* Flash bulb center */}
    <circle className="ft" cx="95" cy="33" r="4" />
  </svg>
);

export const CarIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Sweeping Body */}
    <path className="t" d="M 10 80 L 10 65 C 25 60, 45 50, 70 50 L 95 35 L 105 35 L 115 65 L 120 80 Z" />
    {/* Iconic Tailfin */}
    <path className="p" d="M 10 65 L 5 40 L 30 58 Z" />
    {/* Retro Windows */}
    <path className="c" d="M 70 50 L 90 35 L 100 35 L 105 50 Z" />
    {/* Wheels */}
    <circle className="o" cx="30" cy="80" r="12" />
    <circle className="fo" cx="30" cy="80" r="4" />
    <circle className="o" cx="90" cy="80" r="12" />
    <circle className="fo" cx="90" cy="80" r="4" />
    {/* Chassis lines */}
    <line className="t" x1="10" y1="80" x2="18" y2="80" />
    <line className="t" x1="42" y1="80" x2="78" y2="80" />
    <line className="t" x1="102" y1="80" x2="120" y2="80" />
  </svg>
);

export const SearchIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Mid-century Starburst background */}
    <path className="bg" d="M 50 20 L 55 40 L 75 45 L 55 50 L 50 70 L 45 50 L 25 45 L 45 40 Z" />
    {/* Tilted Handle */}
    <polygon className="p" points="75,75 105,105 115,95 85,65" />
    {/* Accent line cutting through handle */}
    <line className="o" x1="85" y1="85" x2="105" y2="105" />
    {/* Offset lens rings */}
    <circle className="t" cx="50" cy="50" r="30" />
    {/* Glint */}
    <path className="c" d="M 30 35 Q 40 25 55 30" />
    <circle className="fc" cx="50" cy="50" r="3" />
  </svg>
);

export const ProfileIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Offset dashed halo */}
    <ellipse className="bg" cx="64" cy="45" rx="35" ry="35" />
    {/* Sharp trapezoid body */}
    <polygon className="t" points="25,115 45,65 83,65 103,115" />
    {/* Tilted oval head */}
    <ellipse className="c" cx="64" cy="40" rx="20" ry="25" transform="rotate(15 64 40)" />
    {/* Pink boomerang collar */}
    <path className="p" d="M 25 115 L 64 80 L 103 115" />
    {/* Orbiting atom dot */}
    <circle className="fo" cx="95" cy="20" r="5" />
  </svg>
);

export const BackArrowIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Background starburst accent */}
    <path className="bg" d="M 85 30 L 90 50 L 110 55 L 90 60 L 85 80 L 80 60 L 60 55 L 80 50 Z" />
    {/* Atomic orbit loop for the tail */}
    <path className="p" d="M 80 64 C 135 5, 135 123, 80 64" />
    {/* Arrow shaft */}
    <line className="t" x1="20" y1="64" x2="80" y2="64" />
    {/* Sharp Googie arrowhead */}
    <path className="o" d="M 45 34 L 15 64 L 45 94" />
    {/* Floating dot */}
    <circle className="fc" cx="85" cy="64" r="4" />
  </svg>
);

export const CloseIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Kidney bean background */}
    <path className="bg" d="M 20 64 C 20 20, 108 20, 108 64 C 108 108, 64 108, 20 64 Z" />
    {/* Sweeping boomerangs */}
    <path className="p" d="M 25 25 Q 64 55 103 103" />
    <path className="o" d="M 103 25 Q 64 55 25 103" />
    {/* Center atom */}
    <circle className="ft" cx="64" cy="64" r="5" />
  </svg>
);

export const CancelIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    <path className="bg" d="M 20 64 C 20 20, 108 20, 108 64 C 108 108, 64 108, 20 64 Z" />
    <path className="p" d="M 25 25 Q 64 55 103 103" />
    <path className="o" d="M 103 25 Q 64 55 25 103" />
    <circle className="ft" cx="64" cy="64" r="5" />
  </svg>
);

export const TrophyIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Atomic ring */}
    <ellipse className="p" cx="64" cy="45" rx="55" ry="15" transform="rotate(25 64 45)" />
    {/* Base */}
    <path className="t" d="M 44 110 L 84 110 L 74 90 L 54 90 Z" />
    {/* Cup */}
    <path className="t" d="M 54 90 L 64 65 L 74 90 Z" />
    <path className="o" d="M 24 25 L 104 25 L 84 65 L 44 65 Z" />
    {/* Accent star */}
    <circle className="fc" cx="64" cy="45" r="4" />
  </svg>
);

export const CheckmarkIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Boomerang check */}
    <path className="t" d="M 20 70 L 50 100 L 115 25" />
    <path className="c" d="M 30 70 L 50 90 L 105 25" strokeDasharray="5 15" />
    {/* Speedlines */}
    <line className="p" x1="15" y1="85" x2="35" y2="105" />
    <line className="p" x1="55" y1="115" x2="125" y2="35" />
  </svg>
);

export const AddIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Dashed orbit */}
    <ellipse className="c" cx="64" cy="64" rx="38" ry="38" strokeDasharray="6 12" />
    {/* Atomic cross */}
    <line className="o" x1="64" y1="16" x2="64" y2="112" />
    <line className="o" x1="16" y1="64" x2="112" y2="64" />
    {/* Satellite balls */}
    <circle className="ft" cx="64" cy="16" r="6" />
    <circle className="ft" cx="64" cy="112" r="6" />
    <circle className="fp" cx="16" cy="64" r="6" />
    <circle className="fp" cx="112" cy="64" r="6" />
    {/* Center highlight */}
    <circle className="fc" cx="64" cy="64" r="4" />
  </svg>
);

export const RefreshIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Orbit arrows */}
    <path className="t" d="M 24 64 A 40 25 0 1 1 104 64" />
    <polygon className="ft" points="92,54 106,64 116,50" />
    <path className="p" d="M 104 64 A 40 25 0 0 1 24 64" />
    <polygon className="fp" points="12,74 22,64 36,78" />
    {/* Nucleus */}
    <circle className="fo" cx="64" cy="64" r="6" />
    <circle className="fc" cx="64" cy="64" r="2" />
  </svg>
);

export const CoffeeCupIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Boomerang Saucer */}
    <path className="t" d="M 10 95 Q 64 125 118 95 Q 64 105 10 95 Z" />
    {/* Tulip Cup */}
    <path className="p" d="M 30 45 L 40 85 C 40 98, 88 98, 88 85 L 98 45 Z" />
    {/* Angular Handle */}
    <path className="p" d="M 95 52 L 115 52 L 105 75 L 90 75" />
    {/* Stylized Steam */}
    <path className="o" d="M 50 30 L 60 15 L 70 30" />
    <path className="c" d="M 64 20 L 74 5 L 84 20" />
  </svg>
);

export const StarburstIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Core 8-point Googie star */}
    <path className="c" d="M 64 8 L 72 48 L 112 56 L 72 64 L 64 104 L 56 64 L 16 56 L 56 48 Z" />
    {/* Accent diagonal rays */}
    <line className="o" x1="40" y1="32" x2="48" y2="40" />
    <line className="o" x1="88" y1="32" x2="80" y2="40" />
    <line className="o" x1="40" y1="80" x2="48" y2="72" />
    <line className="o" x1="88" y1="80" x2="80" y2="72" />
    {/* Center dot */}
    <circle className="ft" cx="64" cy="56" r="4" />
  </svg>
);

export const SparkleIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Big Pink Star */}
    <path className="p" d="M 45 15 L 52 45 L 82 52 L 52 59 L 45 89 L 38 59 L 8 52 L 38 45 Z" />
    {/* Medium Turquoise Star */}
    <path className="t" d="M 90 65 L 94 82 L 111 86 L 94 90 L 90 107 L 86 90 L 69 86 L 86 82 Z" />
    {/* Small Cream Star */}
    <path className="c" d="M 25 85 L 28 95 L 38 98 L 28 101 L 25 111 L 22 101 L 12 98 L 22 95 Z" />
    {/* Float dot */}
    <circle className="fo" cx="80" cy="25" r="3" />
  </svg>
);

export const TargetIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Kidney shape backdrop */}
    <path className="p" d="M 25 45 C 25 10, 85 10, 105 45 C 125 80, 85 115, 55 115 C 15 115, 25 80, 25 45 Z" strokeDasharray="5 10" />
    {/* Offset radar ellipses */}
    <ellipse className="t" cx="64" cy="64" rx="28" ry="40" transform="rotate(35 64 64)" />
    <ellipse className="o" cx="64" cy="64" rx="12" ry="20" transform="rotate(35 64 64)" />
    {/* Crosshair */}
    <line className="c" x1="14" y1="64" x2="114" y2="64" />
    <line className="c" x1="64" y1="14" x2="64" y2="114" />
  </svg>
);

export const FireIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Background aura */}
    <path className="bg" d="M 64 120 C 30 120, 20 80, 40 50 C 60 20, 80 50, 90 70 C 100 90, 80 120, 64 120 Z" />
    {/* Sharp jagged flames */}
    <path className="o" d="M 64 110 L 24 60 L 44 50 L 34 20 L 64 40 L 74 10 L 94 45 L 84 55 L 104 70 Z" />
    {/* Inner bright flame */}
    <path className="c" d="M 64 90 L 44 65 L 54 55 L 64 70 L 74 45 L 84 65 Z" />
  </svg>
);

export const HeartIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Asymmetric tilted heart */}
    <path className="p" d="M 64 45 C 64 20, 25 20, 25 55 C 25 90, 64 115, 64 115 C 64 115, 103 90, 103 55 C 103 20, 64 20, 64 45 Z" transform="rotate(-15 64 64)" />
    {/* Piercing Vector Line */}
    <line className="t" x1="15" y1="95" x2="110" y2="25" />
    <polygon className="ft" points="112,23 98,28 106,38" />
    <circle className="fo" cx="15" cy="95" r="4" />
  </svg>
);
