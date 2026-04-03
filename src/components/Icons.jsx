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

export const PlayIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Googie play triangle — bold fill with neon glow */}
    <polygon className="fo" points="28,16 28,112 108,64" />
    {/* Accent spine line */}
    <line className="t" x1="22" y1="14" x2="22" y2="114" />
    {/* Atomic dot at tip */}
    <circle className="ft" cx="108" cy="64" r="6" />
    {/* Speed lines */}
    <line className="p" x1="28" y1="40" x2="70" y2="64" />
    <line className="p" x1="28" y1="88" x2="70" y2="64" />
  </svg>
);

export const LibrariesIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Peaked roof — Googie angle */}
    <path className="p" d="M 12 52 L 64 16 L 116 52" />
    {/* Building facade */}
    <polygon className="t" points="20,52 108,52 108,112 20,112" />
    {/* Columns */}
    <line className="p" x1="38" y1="52" x2="38" y2="112" />
    <line className="p" x1="64" y1="52" x2="64" y2="112" />
    <line className="p" x1="90" y1="52" x2="90" y2="112" />
    {/* Base steps */}
    <line className="c" x1="14" y1="112" x2="114" y2="112" />
    <line className="c" x1="8" y1="120" x2="120" y2="120" />
    {/* Open book emblem on facade */}
    <path className="o" d="M 44 80 Q 64 70 84 80" />
    <path className="o" d="M 44 88 Q 64 78 84 88" />
    {/* Atomic spark at peak */}
    <circle className="fc" cx="64" cy="16" r="5" />
  </svg>
);

export const FestivalTentIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* World's Fair Pavilion style swooping roof */}
    <path className="t" d="M 10 90 Q 64 30 118 90 Q 64 50 10 90 Z" />
    <path className="p" d="M 10 90 Q 64 20 118 90" />
    {/* Asymmetrical supporting pillars */}
    <line className="c" x1="25" y1="80" x2="20" y2="115" />
    <line className="c" x1="64" y1="45" x2="64" y2="120" />
    <line className="c" x1="103" y1="80" x2="108" y2="115" />
    {/* Atomic star topper */}
    <path className="o" d="M 64 5 L 68 15 L 78 19 L 68 23 L 64 33 L 60 23 L 50 19 L 60 15 Z" />
    {/* Floating dot */}
    <circle className="fc" cx="95" cy="45" r="4" />
  </svg>
);

export const SignOutIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Offset door frame (trapezoid) */}
    <polygon className="t" points="25,25 65,15 65,110 25,120" />
    <polygon className="bg" points="15,35 55,25 55,100 15,110" />
    {/* Swooping exit arrow */}
    <path className="p" d="M 45 64 Q 90 90 110 40" />
    <polygon className="fp" points="112,38 100,45 115,55" />
    {/* Retro doorknob */}
    <circle className="o" cx="55" cy="64" r="5" />
    <circle className="fc" cx="105" cy="75" r="3" />
  </svg>
);

export const DayTripsIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Offset sunburst */}
    <circle className="fo" cx="95" cy="35" r="18" />
    <path className="o" d="M 95 5 L 95 12 M 125 35 L 118 35 M 95 65 L 95 58 M 65 35 L 72 35" strokeDasharray="2 4" />
    {/* Winding retro road */}
    <path className="t" d="M 10 115 Q 50 80 95 50" />
    <path className="c" d="M 30 115 Q 60 90 95 60" strokeDasharray="5 10" />
    {/* Googie signpost */}
    <line className="p" x1="25" y1="55" x2="25" y2="95" />
    <polygon className="p" points="10,40 40,30 45,50 15,60" />
    <circle className="fc" cx="30" cy="45" r="2" />
  </svg>
);

export const BadgesIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Atomic background burst */}
    <path className="bg" d="M 64 10 L 72 30 L 92 38 L 72 46 L 64 66 L 56 46 L 36 38 L 56 30 Z" />
    {/* Mid-century shield base */}
    <path className="t" d="M 64 15 L 105 35 L 95 85 L 64 115 L 33 85 L 23 35 Z" />
    {/* Inner orbiting atom */}
    <ellipse className="p" cx="64" cy="60" rx="20" ry="8" transform="rotate(30 64 60)" />
    <ellipse className="c" cx="64" cy="60" rx="20" ry="8" transform="rotate(-30 64 60)" />
    {/* Core dot */}
    <circle className="fo" cx="64" cy="60" r="5" />
  </svg>
);

export const AboutIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Kidney bean backdrop */}
    <path className="bg" d="M 25 35 C 25 -10, 105 -10, 105 50 C 105 110, 25 130, 25 80 Z" />
    {/* Satellite rings */}
    <ellipse className="p" cx="64" cy="64" rx="45" ry="25" transform="rotate(-20 64 64)" strokeDasharray="8 8" />
    <ellipse className="o" cx="64" cy="64" rx="35" ry="15" transform="rotate(-20 64 64)" />
    {/* Abstract 'i' symbol */}
    <circle className="ft" cx="64" cy="35" r="7" />
    <path className="t" d="M 58 55 L 70 50 L 64 95 L 52 100 Z" />
    {/* Glint */}
    <circle className="fc" cx="90" cy="80" r="4" />
  </svg>
);

export const CodeOfEthicsIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Slanted geometric rulebook */}
    <polygon className="t" points="30,30 90,15 105,95 45,110" />
    <polygon className="p" points="20,40 30,30 45,110 35,120" />
    {/* Atomic orbit crossing the book */}
    <ellipse className="c" cx="64" cy="64" rx="55" ry="15" transform="rotate(25 64 64)" />
    {/* Big glowing check/star */}
    <path className="o" d="M 45 65 L 60 85 L 95 35" />
    <circle className="fo" cx="95" cy="35" r="4" />
  </svg>
);

export const PrivacyPolicyIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Retro space-age lock body */}
    <path className="t" d="M 35 60 L 93 50 L 85 110 L 27 120 Z" />
    <path className="p" d="M 27 68 L 35 60 L 85 110 L 77 118 Z" />
    {/* Sweeping asymmetrical shackle */}
    <path className="o" d="M 45 58 Q 50 10 85 20 Q 100 25 88 51" />
    {/* Keyhole (Atomic core style) */}
    <circle className="fc" cx="60" cy="80" r="6" />
    <polygon className="fc" points="56,80 64,80 68,95 52,95" />
    {/* Orbit spark */}
    <circle className="ft" cx="95" cy="15" r="3" />
  </svg>
);

export const CreditsIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Retro Marquee Sign / Film Strip */}
    <polygon className="t" points="15,35 115,15 110,95 10,115" />
    {/* Zigzag marquee inner border */}
    <path className="c" d="M 22 40 L 30 35 L 40 40 L 50 35 L 60 40 L 70 35 L 80 40 L 90 35 L 100 40 L 105 45" />
    {/* Rolling credits abstract blocks */}
    <line className="p" x1="30" y1="65" x2="80" y2="55" />
    <line className="p" x1="28" y1="85" x2="60" y2="78" />
    {/* Marquee bulbs */}
    <circle className="fo" cx="15" cy="35" r="4" />
    <circle className="fo" cx="115" cy="15" r="4" />
    <circle className="fo" cx="110" cy="95" r="4" />
    <circle className="fo" cx="10" cy="115" r="4" />
  </svg>
);

export const LiteraryLandmarkIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Slanted open book base */}
    <path className="t" d="M 20 100 L 64 115 L 108 100 L 64 85 Z" />
    <path className="c" d="M 64 115 L 64 85" />
    {/* Sweeping obelisk/monument */}
    <polygon className="p" points="64,15 74,88 54,88" />
    {/* Orbiting landmark rings */}
    <ellipse className="o" cx="64" cy="55" rx="35" ry="10" transform="rotate(-15 64 55)" />
    {/* Atomic spark at the peak */}
    <circle className="fc" cx="64" cy="15" r="5" />
    <circle className="fo" cx="95" cy="35" r="3" />
  </svg>
);

export const DriveInTheaterIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Sloping giant screen */}
    <path className="t" d="M 15 85 Q 64 95 113 85 L 100 25 Q 64 35 28 25 Z" />
    <line className="p" x1="25" y1="88" x2="20" y2="115" />
    <line className="p" x1="103" y1="88" x2="108" y2="115" />
    {/* Retro speaker pole */}
    <line className="c" x1="64" y1="92" x2="64" y2="120" />
    <circle className="fc" cx="58" cy="100" r="4" />
    <circle className="fc" cx="70" cy="100" r="4" />
    {/* Screen projection starburst */}
    <path className="o" d="M 64 40 L 68 50 L 78 52 L 68 54 L 64 64 L 60 54 L 50 52 L 60 50 Z" />
  </svg>
);

export const RestaurantsIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Googie diner sign arrow */}
    <polygon className="p" points="20,20 80,10 75,50 110,60 60,110 50,70 15,60" />
    {/* Offset background boomerang */}
    <path className="bg" d="M 40 40 Q 90 40 100 90 Q 70 70 40 40 Z" />
    {/* Fork & Knife minimalist shapes */}
    <path className="t" d="M 40 30 L 40 50 M 45 30 L 45 50 M 50 30 L 50 50 M 40 50 C 40 60, 50 60, 50 50 L 45 60 L 45 90" />
    <path className="c" d="M 75 35 C 80 45, 80 60, 75 65 L 75 95" />
    {/* Neon dots */}
    <circle className="fo" cx="100" cy="20" r="3" />
    <circle className="fo" cx="25" cy="90" r="3" />
  </svg>
);

export const MuseumsIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Iconic butterfly roof */}
    <path className="t" d="M 10 40 L 64 65 L 118 40 L 110 30 L 64 50 L 18 30 Z" />
    {/* Floating roof effect (split columns) */}
    <line className="p" x1="30" y1="70" x2="30" y2="110" />
    <line className="p" x1="64" y1="80" x2="64" y2="110" />
    <line className="p" x1="98" y1="70" x2="98" y2="110" />
    {/* Base foundation */}
    <line className="c" x1="15" y1="110" x2="113" y2="110" />
    {/* Atomic art sculpture inside */}
    <circle className="fo" cx="64" cy="65" r="5" />
    <ellipse className="o" cx="64" cy="65" rx="15" ry="5" transform="rotate(45 64 65)" />
  </svg>
);

export const ParksIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Offset Googie Sun */}
    <circle className="o" cx="85" cy="40" r="15" />
    <circle className="fo" cx="85" cy="40" r="5" />
    {/* Mid-century geometric trees */}
    <polygon className="t" points="40,30 70,100 10,100" />
    <polygon className="p" points="75,50 105,100 45,100" />
    {/* Tree overlap accent */}
    <line className="c" x1="40" y1="30" x2="40" y2="100" />
    <line className="c" x1="75" y1="50" x2="75" y2="100" />
    {/* Floating leaf spark */}
    <circle className="fc" cx="20" cy="50" r="3" />
  </svg>
);

export const HistoricSitesIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Stylized ancient column base and top */}
    <path className="t" d="M 35 25 L 93 25 M 30 35 L 98 35 M 35 105 L 93 105 M 25 115 L 103 115" />
    {/* Fluted column body */}
    <line className="p" x1="45" y1="35" x2="45" y2="105" />
    <line className="p" x1="64" y1="35" x2="64" y2="105" />
    <line className="p" x1="83" y1="35" x2="83" y2="105" />
    {/* Orbiting history ring */}
    <ellipse className="o" cx="64" cy="70" rx="45" ry="15" transform="rotate(-20 64 70)" />
    <circle className="fc" cx="25" cy="55" r="4" />
  </svg>
);

export const ArtGalleriesIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Kidney bean shaped palette */}
    <path className="p" d="M 20 70 C 20 20, 100 10, 110 50 C 120 90, 80 120, 50 110 C 20 100, 20 120, 20 70 Z" />
    {/* Thumb hole */}
    <circle className="bg" cx="90" cy="60" r="10" />
    {/* Atomic paint splatters */}
    <circle className="fc" cx="45" cy="45" r="6" />
    <circle className="fo" cx="70" cy="35" r="5" />
    <circle className="ft" cx="40" cy="80" r="7" />
    {/* Sleek paintbrush */}
    <line className="o" x1="15" y1="110" x2="65" y2="60" />
    <path className="t" d="M 65 60 L 75 50 C 85 40, 80 30, 80 30 L 70 35 Z" />
  </svg>
);

export const ObservatoriesIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Classic dome structure */}
    <path className="t" d="M 20 80 A 44 44 0 0 1 108 80 Z" />
    <line className="p" x1="15" y1="80" x2="113" y2="80" />
    <line className="p" x1="25" y1="80" x2="25" y2="110" />
    <line className="p" x1="103" y1="80" x2="103" y2="110" />
    {/* Slanted dome opening */}
    <path className="bg" d="M 64 36 L 80 40 L 70 80 L 54 80 Z" />
    {/* Giant telescope extending out */}
    <polygon className="o" points="64,75 110,20 120,30 74,80" />
    {/* Target Googie star */}
    <circle className="fc" cx="25" cy="30" r="3" />
    <circle className="fc" cx="40" cy="15" r="2" />
  </svg>
);

export const AquariumsIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Sweeping retro water wave */}
    <path className="t" d="M 10 90 Q 40 60 70 90 T 120 80" />
    <path className="bg" d="M 10 100 Q 40 70 70 100 T 120 90" />
    {/* Geometric abstract fish */}
    <polygon className="p" points="80,50 40,30 50,50 40,70" />
    <polygon className="o" points="40,50 20,40 25,50 20,60" />
    {/* Bubbles */}
    <circle className="fc" cx="95" cy="45" r="4" />
    <circle className="fc" cx="105" cy="30" r="2" />
    <circle className="fc" cx="85" cy="20" r="3" />
  </svg>
);

export const LibraryIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Shelf */}
    <line className="o" x1="8" y1="97" x2="120" y2="97" style={{ strokeWidth: 6 }} />
    {/* Book 1 — tall, teal */}
    <rect className="t" x="18" y="28" width="16" height="69" rx="1" />
    <line className="c" x1="21" y1="42" x2="31" y2="42" />
    {/* Book 2 — short, pink */}
    <rect className="p" x="40" y="52" width="14" height="45" rx="1" />
    {/* Book 3 — tallest, cream */}
    <rect className="c" x="60" y="18" width="18" height="79" rx="1" />
    <line className="t" x1="63" y1="33" x2="75" y2="33" />
    {/* Book 4 — medium, orange */}
    <rect className="o" x="84" y="38" width="14" height="59" rx="1" />
    {/* Atomic starburst above tallest book */}
    <path className="p" d="M 69 10 L 71 4 L 73 10 L 79 12 L 73 14 L 71 20 L 69 14 L 63 12 Z" />
  </svg>
);

export const LivePerformanceIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    {/* Geometric tragedy/comedy masks */}
    {/* Mask 1 (Tilted up) */}
    <polygon className="t" points="20,40 60,20 80,60 40,80" />
    <line className="c" x1="35" y1="40" x2="45" y2="35" />
    <line className="c" x1="55" y1="30" x2="65" y2="25" />
    <path className="c" d="M 50 65 Q 60 55 65 65" />
    {/* Mask 2 (Tilted down, offset) */}
    <polygon className="p" points="50,70 90,50 110,90 70,110" />
    <line className="o" x1="65" y1="70" x2="75" y2="65" />
    <line className="o" x1="85" y1="60" x2="95" y2="55" />
    <path className="o" d="M 80 95 Q 90 85 95 95" />
    {/* Spotlight spark */}
    <circle className="fo" cx="100" cy="20" r="5" />
  </svg>
);

export const EditIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    <path className="bg" d="M 25 95 Q 64 125 105 85" />
    <polygon className="p" points="95,15 113,33 45,100 27,82" />
    <polygon className="t" points="27,82 45,100 15,113" />
    <line className="o" x1="95" y1="15" x2="36" y2="91" />
    <circle className="fc" cx="15" cy="113" r="4" />
  </svg>
);

export const ClockIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    <path className="p" d="M 64 15 L 64 25 M 64 103 L 64 113 M 15 64 L 25 64 M 103 64 L 113 64 M 30 30 L 37 37 M 98 98 L 91 91 M 98 30 L 91 37 M 30 98 L 37 91" />
    <circle className="bg" cx="64" cy="64" r="28" />
    <ellipse className="t" cx="60" cy="60" rx="20" ry="25" transform="rotate(15 60 60)" />
    <path className="o" d="M 45 45 L 60 60 L 80 50" />
    <circle className="fc" cx="60" cy="60" r="4" />
  </svg>
);

export const CalendarIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    <polygon className="t" points="25,40 105,25 95,105 15,120" />
    <path className="p" d="M 25 40 Q 55 10 105 25" />
    <path className="c" d="M 35 25 Q 40 15 45 35 M 65 20 Q 70 10 75 30 M 95 15 Q 100 5 105 25" />
    <path className="bg" d="M 23 60 L 102 45 M 20 80 L 100 65 M 50 35 L 40 115 M 75 30 L 65 110" />
    <circle className="fo" cx="60" cy="70" r="5" />
  </svg>
);

export const HomeIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    <polygon className="t" points="64,15 15,105 113,105" />
    <polygon className="p" points="64,35 30,95 98,95" />
    <polygon className="o" points="85,45 95,50 95,85 85,85" />
    <polygon className="bg" points="55,102 73,102 73,75 55,70" />
    <circle className="fc" cx="30" cy="35" r="3" />
    <circle className="fc" cx="68" cy="85" r="2" />
  </svg>
);

export const AntiqueShopIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    <path className="t" d="M 10 100 Q 64 120 118 90 L 110 105 Q 64 130 15 115 Z" />
    <path className="p" d="M 40 100 C 15 80, 25 40, 50 30 C 75 20, 85 60, 75 95 Z" />
    <path className="o" d="M 50 30 Q 35 10 20 15 M 65 30 Q 85 10 105 20 M 55 30 Q 64 10 75 10" />
    <circle className="fc" cx="20" cy="15" r="3" />
    <circle className="fc" cx="105" cy="20" r="3" />
    <circle className="fc" cx="75" cy="10" r="3" />
  </svg>
);

export const StoreIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    <path className="t" d="M 5 50 L 64 30 L 123 45 L 64 50 Z" />
    <line className="p" x1="25" y1="45" x2="35" y2="115" />
    <line className="p" x1="103" y1="40" x2="93" y2="115" />
    <polygon className="bg" points="40,60 88,55 83,105 45,110" />
    <ellipse className="o" cx="64" cy="18" rx="25" ry="10" transform="rotate(-15 64 18)" />
    <circle className="fc" cx="64" cy="18" r="3" />
  </svg>
);

export const MerchIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    <polygon className="p" points="40,25 90,35 110,85 60,115 20,70" />
    <circle className="bg" cx="45" cy="45" r="6" />
    <path className="t" d="M 45 39 Q 40 15 15 20" />
    <ellipse className="o" cx="65" cy="75" rx="18" ry="6" transform="rotate(30 65 75)" />
    <ellipse className="c" cx="65" cy="75" rx="18" ry="6" transform="rotate(-30 65 75)" />
    <circle className="fc" cx="65" cy="75" r="3" />
  </svg>
);

export const StarIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className={className}>
    <style>{STYLES}</style>
    <path className="bg" d="M 74 15 Q 74 60 30 69 Q 74 78 74 123 Q 74 78 118 69 Q 74 60 74 15 Z" />
    <path className="t" d="M 64 10 Q 64 55 20 64 Q 64 73 64 118 Q 64 73 108 64 Q 64 55 64 10 Z" />
    <ellipse className="p" cx="64" cy="64" rx="45" ry="12" transform="rotate(-25 64 64)" />
    <circle className="fo" cx="64" cy="64" r="5" />
    <circle className="fc" cx="85" cy="35" r="2" />
  </svg>
);
