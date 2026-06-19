// Literary Roads — engraved state icons · WEST region
// AK · AZ · CA · CO · HI · ID · MT · NM · NV · OR · UT · WA · WY
// (CA, NM, etc. live here; FL/NY/TX in other regional files.)
//
// All icons: 0–100 viewBox; ink at color={STAMP_INK}; placed in y≈24–92.
// Adds to a shared window.STATE_ICONS map so the stamp template can look up
// any state by code regardless of which file defined it.


// CALIFORNIA — California poppy.
function IconCA({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      <path d="M 50 42 Q 36 24, 28 36 Q 26 46, 40 46 Q 48 44, 50 42 Z"/>
      <path d="M 50 42 Q 64 24, 72 36 Q 74 46, 60 46 Q 52 44, 50 42 Z"/>
      <path d="M 50 42 Q 28 42, 26 58 Q 30 68, 44 62 Q 50 54, 50 42 Z"/>
      <path d="M 50 42 Q 72 42, 74 58 Q 70 68, 56 62 Q 50 54, 50 42 Z"/>
      <line x1="34" y1="32" x2="36" y2="36" strokeWidth="0.5"/>
      <line x1="38" y1="34" x2="40" y2="38" strokeWidth="0.5"/>
      <line x1="42" y1="36" x2="44" y2="40" strokeWidth="0.5"/>
      <line x1="58" y1="34" x2="60" y2="38" strokeWidth="0.5"/>
      <line x1="62" y1="32" x2="64" y2="36" strokeWidth="0.5"/>
      <line x1="56" y1="36" x2="58" y2="40" strokeWidth="0.5"/>
      <line x1="32" y1="50" x2="34" y2="54" strokeWidth="0.5"/>
      <line x1="36" y1="52" x2="38" y2="56" strokeWidth="0.5"/>
      <line x1="40" y1="54" x2="42" y2="58" strokeWidth="0.5"/>
      <line x1="60" y1="52" x2="62" y2="56" strokeWidth="0.5"/>
      <line x1="64" y1="50" x2="66" y2="54" strokeWidth="0.5"/>
      <line x1="58" y1="54" x2="60" y2="58" strokeWidth="0.5"/>
      <circle cx="50" cy="44" r="2.4" fill={color} stroke="none"/>
      <line x1="50" y1="42" x2="48" y2="37"/>
      <line x1="50" y1="42" x2="52" y2="37"/>
      <line x1="50" y1="42" x2="50" y2="36"/>
      <line x1="50" y1="42" x2="46" y2="39"/>
      <line x1="50" y1="42" x2="54" y2="39"/>
      <path d="M 50 62 Q 48 70, 52 78 Q 50 86, 50 92"/>
      <path d="M 50 72 Q 42 72, 32 74"/>
      <line x1="46" y1="71.5" x2="44" y2="68" strokeWidth="0.7"/>
      <line x1="42" y1="72" x2="40" y2="68.5" strokeWidth="0.7"/>
      <line x1="38" y1="72.5" x2="36" y2="69" strokeWidth="0.7"/>
      <line x1="34" y1="73.2" x2="32" y2="70" strokeWidth="0.7"/>
      <line x1="42" y1="72" x2="42" y2="75.5" strokeWidth="0.7"/>
      <line x1="38" y1="72.5" x2="38" y2="76" strokeWidth="0.7"/>
      <line x1="34" y1="73.2" x2="34" y2="76.5" strokeWidth="0.7"/>
      <path d="M 51 82 Q 60 84, 68 84"/>
      <line x1="55" y1="82.5" x2="57" y2="79" strokeWidth="0.7"/>
      <line x1="59" y1="83" x2="61" y2="79.5" strokeWidth="0.7"/>
      <line x1="63" y1="83.5" x2="65" y2="80" strokeWidth="0.7"/>
      <line x1="55" y1="82.5" x2="55" y2="86" strokeWidth="0.7"/>
      <line x1="59" y1="83" x2="59" y2="86.5" strokeWidth="0.7"/>
      <line x1="63" y1="83.5" x2="63" y2="87" strokeWidth="0.7"/>
    </g>
  );
}

// ALASKA — salmon mid-leap over water + small mountain.
function IconAK({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* distant mountain */}
      <path d="M 12 72 L 26 48 L 36 60 L 46 50 L 56 64 L 70 46 L 88 72"/>
      <line x1="20" y1="58" x2="24" y2="54" strokeWidth="0.5"/>
      <line x1="60" y1="56" x2="66" y2="52" strokeWidth="0.5"/>
      {/* salmon body */}
      <path d="M 22 52 Q 36 36, 60 42 Q 72 46, 76 56 Q 70 62, 54 64 Q 36 68, 22 58 Q 18 56, 22 52 Z"/>
      {/* tail fins */}
      <path d="M 76 56 L 86 48 L 82 56 L 86 64 Z"/>
      {/* dorsal fin */}
      <path d="M 50 40 L 54 32 L 58 40"/>
      {/* anal fin */}
      <path d="M 52 64 L 54 70 L 58 64"/>
      {/* eye + gill */}
      <circle cx="30" cy="52" r="1.2" fill={color}/>
      <path d="M 36 46 Q 38 52, 36 60"/>
      {/* scale hatching */}
      <line x1="42" y1="48" x2="46" y2="46" strokeWidth="0.5"/>
      <line x1="48" y1="50" x2="52" y2="48" strokeWidth="0.5"/>
      <line x1="54" y1="52" x2="58" y2="50" strokeWidth="0.5"/>
      <line x1="60" y1="54" x2="64" y2="52" strokeWidth="0.5"/>
      <line x1="42" y1="56" x2="46" y2="58" strokeWidth="0.5"/>
      <line x1="48" y1="58" x2="52" y2="60" strokeWidth="0.5"/>
      <line x1="54" y1="60" x2="58" y2="62" strokeWidth="0.5"/>
      {/* water */}
      <path d="M 10 78 Q 22 74, 34 78 T 58 78 T 82 78 T 92 78" strokeWidth="0.8"/>
      <path d="M 10 84 Q 22 80, 34 84 T 58 84 T 82 84 T 92 84" strokeWidth="0.7"/>
    </g>
  );
}

// ARIZONA — saguaro cactus + desert sun.
function IconAZ({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      {/* sun */}
      <circle cx="78" cy="30" r="7"/>
      <line x1="78" y1="18" x2="78" y2="20"/>
      <line x1="78" y1="40" x2="78" y2="42"/>
      <line x1="66" y1="30" x2="68" y2="30"/>
      <line x1="88" y1="30" x2="90" y2="30"/>
      <line x1="70" y1="22" x2="72" y2="24"/>
      <line x1="84" y1="38" x2="86" y2="40"/>
      <line x1="70" y1="38" x2="72" y2="36"/>
      <line x1="84" y1="22" x2="86" y2="20"/>
      {/* saguaro main trunk */}
      <path d="M 42 86 L 42 50 Q 42 42, 50 42 Q 58 42, 58 50 L 58 86 Z"/>
      {/* left arm */}
      <path d="M 42 60 Q 32 60, 32 52 L 32 44 Q 32 40, 36 40 L 36 50"/>
      {/* right arm */}
      <path d="M 58 56 Q 70 56, 70 48 L 70 38 Q 70 34, 66 34 L 66 46"/>
      {/* trunk ribs (vertical lines for engraving texture) */}
      <line x1="46" y1="46" x2="46" y2="84" strokeWidth="0.5"/>
      <line x1="50" y1="44" x2="50" y2="84" strokeWidth="0.5"/>
      <line x1="54" y1="46" x2="54" y2="84" strokeWidth="0.5"/>
      {/* spines */}
      <line x1="42" y1="58" x2="40" y2="58" strokeWidth="0.5"/>
      <line x1="42" y1="68" x2="40" y2="68" strokeWidth="0.5"/>
      <line x1="42" y1="78" x2="40" y2="78" strokeWidth="0.5"/>
      <line x1="58" y1="62" x2="60" y2="62" strokeWidth="0.5"/>
      <line x1="58" y1="72" x2="60" y2="72" strokeWidth="0.5"/>
      <line x1="58" y1="82" x2="60" y2="82" strokeWidth="0.5"/>
      {/* small flower on top */}
      <circle cx="50" cy="40" r="1.2" fill={color} stroke="none"/>
      {/* ground line */}
      <line x1="14" y1="88" x2="86" y2="88" strokeWidth="0.8"/>
      <line x1="20" y1="91" x2="26" y2="91" strokeWidth="0.5"/>
      <line x1="34" y1="91" x2="42" y2="91" strokeWidth="0.5"/>
      <line x1="68" y1="91" x2="78" y2="91" strokeWidth="0.5"/>
    </g>
  );
}

// COLORADO — Rocky Mountains, snow-capped peaks.
function IconCO({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* sun behind peaks */}
      <circle cx="50" cy="44" r="6"/>
      <line x1="50" y1="34" x2="50" y2="36"/>
      <line x1="40" y1="44" x2="42" y2="44"/>
      <line x1="58" y1="44" x2="60" y2="44"/>
      {/* back peaks */}
      <path d="M 10 80 L 24 52 L 32 64 L 40 50 L 50 64 L 60 50 L 68 64 L 76 52 L 90 80"/>
      {/* snow lines on peaks */}
      <path d="M 18 64 L 24 52 L 30 60"/>
      <path d="M 42 56 L 50 64 L 58 56"/>
      <path d="M 70 60 L 76 52 L 84 64"/>
      <line x1="22" y1="60" x2="20" y2="64" strokeWidth="0.5"/>
      <line x1="48" y1="60" x2="46" y2="64" strokeWidth="0.5"/>
      <line x1="74" y1="60" x2="72" y2="64" strokeWidth="0.5"/>
      {/* front mountain range */}
      <path d="M 6 88 L 18 72 L 28 80 L 40 70 L 50 80 L 60 72 L 72 80 L 82 70 L 94 88"/>
      {/* hatch shading on front range */}
      <line x1="20" y1="80" x2="22" y2="84" strokeWidth="0.5"/>
      <line x1="42" y1="78" x2="44" y2="82" strokeWidth="0.5"/>
      <line x1="62" y1="78" x2="64" y2="82" strokeWidth="0.5"/>
      <line x1="76" y1="80" x2="78" y2="84" strokeWidth="0.5"/>
    </g>
  );
}

// HAWAII — hibiscus flower.
function IconHI({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" transform="translate(0,9)">
      {/* 5 petals around center (50, 52) */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const cx = 50 + 14 * Math.cos(a);
        const cy = 52 + 14 * Math.sin(a);
        return (
          <ellipse key={i} cx={cx} cy={cy} rx="14" ry="9"
            transform={`rotate(${(a * 180 / Math.PI) + 90} ${cx} ${cy})`}/>
        );
      })}
      {/* hatch on each petal */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const cx = 50 + 18 * Math.cos(a);
        const cy = 52 + 18 * Math.sin(a);
        const dx = 2 * Math.cos(a + Math.PI / 2);
        const dy = 2 * Math.sin(a + Math.PI / 2);
        return (
          <g key={i}>
            <line x1={cx - dx} y1={cy - dy} x2={cx + dx} y2={cy + dy} strokeWidth="0.5"/>
          </g>
        );
      })}
      {/* center disc */}
      <circle cx="50" cy="52" r="5" fill={color} stroke="none"/>
      {/* long pistil extending out */}
      <line x1="50" y1="52" x2="68" y2="36"/>
      {/* pistil tips (stamens) */}
      <circle cx="68" cy="36" r="1.4" fill={color} stroke="none"/>
      <circle cx="64" cy="38" r="0.9" fill={color} stroke="none"/>
      <circle cx="66" cy="42" r="0.9" fill={color} stroke="none"/>
      {/* leaf at bottom */}
      <path d="M 50 66 Q 36 76, 30 86 Q 44 80, 50 70 Z"/>
      <line x1="34" y1="80" x2="44" y2="74" strokeWidth="0.5"/>
    </g>
  );
}

// IDAHO — single peak + pines + sun.
function IconID({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="74" cy="34" r="5"/>
      <line x1="74" y1="26" x2="74" y2="28"/>
      <line x1="66" y1="34" x2="68" y2="34"/>
      <line x1="80" y1="34" x2="82" y2="34"/>
      <line x1="69" y1="29" x2="70" y2="30"/>
      {/* back mountain */}
      <path d="M 14 78 L 32 48 L 50 78 Z" fill={color} fillOpacity="0.15"/>
      <path d="M 14 78 L 32 48 L 50 78"/>
      {/* snow line */}
      <path d="M 26 58 L 32 48 L 38 60"/>
      {/* mid mountain */}
      <path d="M 40 78 L 56 56 L 72 78"/>
      <path d="M 50 64 L 56 56 L 62 64"/>
      {/* foreground pines (left) */}
      <path d="M 18 84 L 22 70 L 26 84 Z" fill={color}/>
      <line x1="22" y1="70" x2="22" y2="86" strokeWidth="0.5"/>
      <path d="M 26 86 L 30 72 L 34 86 Z" fill={color}/>
      {/* pines right */}
      <path d="M 76 86 L 80 70 L 84 86 Z" fill={color}/>
      <path d="M 68 86 L 72 74 L 76 86 Z" fill={color}/>
      <line x1="80" y1="70" x2="80" y2="88" strokeWidth="0.5"/>
      {/* ground */}
      <line x1="10" y1="90" x2="90" y2="90" strokeWidth="0.7"/>
    </g>
  );
}

// MONTANA — bison silhouette.
function IconMT({ color = '#1B1F2A' }) {
  return (
    <g fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
      {/* bison body — chunky silhouette */}
      <path d="M 18 64
               Q 18 56, 26 54
               L 32 48
               Q 36 42, 42 44
               L 46 46
               L 48 44
               Q 52 42, 54 46
               L 56 50
               Q 64 52, 70 54
               L 78 56
               Q 84 60, 82 66
               L 80 70
               Q 76 70, 74 68
               L 72 72
               L 68 74
               L 32 74
               L 28 70
               L 24 72
               L 20 70 Z"/>
      {/* horn */}
      <path d="M 28 50 Q 26 46, 30 44 Q 32 48, 30 50 Z" fill="#F5EBD6" stroke={color} strokeWidth="0.8"/>
      {/* eye */}
      <circle cx="30" cy="52" r="0.8" fill="#F5EBD6"/>
      {/* legs */}
      <rect x="32" y="74" width="3" height="10"/>
      <rect x="42" y="74" width="3" height="10"/>
      <rect x="58" y="74" width="3" height="10"/>
      <rect x="68" y="74" width="3" height="10"/>
      {/* tail */}
      <line x1="82" y1="64" x2="86" y2="68" strokeWidth="1.5"/>
      <circle cx="86" cy="68" r="1.4"/>
      {/* fur hatching on hump */}
      <line x1="32" y1="50" x2="34" y2="46" stroke="#F5EBD6" strokeWidth="0.7"/>
      <line x1="38" y1="50" x2="40" y2="46" stroke="#F5EBD6" strokeWidth="0.7"/>
      <line x1="44" y1="50" x2="46" y2="46" stroke="#F5EBD6" strokeWidth="0.7"/>
      <line x1="50" y1="52" x2="52" y2="48" stroke="#F5EBD6" strokeWidth="0.7"/>
      {/* ground line */}
      <line x1="14" y1="86" x2="86" y2="86" strokeWidth="0.8" fill="none"/>
    </g>
  );
}

// NEW MEXICO — Zia sun symbol (sacred sun, 4×4 rays).
function IconNM({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" transform="translate(0,10)">
      {/* center circle */}
      <circle cx="50" cy="56" r="9" strokeWidth="2.2"/>
      {/* 4 rays groups — N, S, E, W (each = 4 lines of varying lengths) */}
      {/* North */}
      <line x1="50" y1="44" x2="50" y2="28"/>
      <line x1="46" y1="44" x2="42" y2="32"/>
      <line x1="54" y1="44" x2="58" y2="32"/>
      <line x1="50" y1="40" x2="50" y2="38"/>
      {/* South */}
      <line x1="50" y1="68" x2="50" y2="84"/>
      <line x1="46" y1="68" x2="42" y2="80"/>
      <line x1="54" y1="68" x2="58" y2="80"/>
      <line x1="50" y1="72" x2="50" y2="74"/>
      {/* East */}
      <line x1="62" y1="56" x2="78" y2="56"/>
      <line x1="62" y1="52" x2="74" y2="46"/>
      <line x1="62" y1="60" x2="74" y2="66"/>
      <line x1="66" y1="56" x2="68" y2="56"/>
      {/* West */}
      <line x1="38" y1="56" x2="22" y2="56"/>
      <line x1="38" y1="52" x2="26" y2="46"/>
      <line x1="38" y1="60" x2="26" y2="66"/>
      <line x1="34" y1="56" x2="32" y2="56"/>
    </g>
  );
}

// NEVADA — atomic burst + dice. Repositioned to fit y=42–90.
function IconNV({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* atomic burst, smaller orbits */}
      <circle cx="50" cy="54" r="3.5" fill={color}/>
      <ellipse cx="50" cy="54" rx="16" ry="5" stroke={color} strokeWidth="1"/>
      <ellipse cx="50" cy="54" rx="16" ry="5" stroke={color} strokeWidth="1" transform="rotate(60 50 54)"/>
      <ellipse cx="50" cy="54" rx="16" ry="5" stroke={color} strokeWidth="1" transform="rotate(120 50 54)"/>
      {/* electrons */}
      <circle cx="66" cy="54" r="1.4" fill={color}/>
      <circle cx="42" cy="46" r="1.4" fill={color}/>
      <circle cx="42" cy="62" r="1.4" fill={color}/>
      {/* two dice */}
      <g transform="translate(30,74)">
        <rect x="0" y="0" width="13" height="13" fill="none" stroke={color} strokeWidth="1.3"/>
        <line x1="0" y1="0" x2="-3" y2="3" strokeWidth="0.8"/>
        <line x1="13" y1="0" x2="10" y2="3" strokeWidth="0.8"/>
        <line x1="-3" y1="3" x2="10" y2="3" strokeWidth="0.8"/>
        <line x1="-3" y1="3" x2="-3" y2="13" strokeWidth="0.8"/>
        <line x1="-3" y1="13" x2="0" y2="13" strokeWidth="0.8"/>
        <circle cx="3.5" cy="3.5" r="0.9" fill={color}/>
        <circle cx="9.5" cy="3.5" r="0.9" fill={color}/>
        <circle cx="3.5" cy="9.5" r="0.9" fill={color}/>
        <circle cx="9.5" cy="9.5" r="0.9" fill={color}/>
      </g>
      <g transform="translate(56,76)">
        <rect x="0" y="0" width="13" height="13" fill="none" stroke={color} strokeWidth="1.3"/>
        <line x1="0" y1="0" x2="-3" y2="3" strokeWidth="0.8"/>
        <line x1="13" y1="0" x2="10" y2="3" strokeWidth="0.8"/>
        <line x1="-3" y1="3" x2="10" y2="3" strokeWidth="0.8"/>
        <line x1="-3" y1="3" x2="-3" y2="13" strokeWidth="0.8"/>
        <line x1="-3" y1="13" x2="0" y2="13" strokeWidth="0.8"/>
        <circle cx="3.5" cy="3.5" r="0.9" fill={color}/>
        <circle cx="6.5" cy="6.5" r="0.9" fill={color}/>
        <circle cx="9.5" cy="9.5" r="0.9" fill={color}/>
      </g>
    </g>
  );
}

// OREGON — three Douglas firs against snowy ground.
function IconOR({ color = '#1B1F2A' }) {
  return (
    <g fill={color} stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
      {/* sky moon */}
      <circle cx="78" cy="30" r="4" fill="none" stroke={color} strokeWidth="1"/>
      {/* tall center fir */}
      <path d="M 50 28
               L 42 42 L 46 42 L 38 52 L 44 52 L 34 64 L 42 64 L 30 76 L 50 76
               L 70 76 L 58 64 L 66 64 L 56 52 L 62 52 L 54 42 L 58 42 Z"/>
      <rect x="48" y="76" width="4" height="6" fill={color}/>
      {/* left smaller fir */}
      <g transform="translate(-26,10)">
        <path d="M 50 28
                 L 44 38 L 48 38 L 40 48 L 46 48 L 36 58 L 44 58 L 34 68 L 50 68
                 L 66 68 L 56 58 L 64 58 L 54 48 L 60 48 L 52 38 L 56 38 Z"/>
        <rect x="48" y="68" width="4" height="6" fill={color}/>
      </g>
      {/* right smaller fir */}
      <g transform="translate(26,12)">
        <path d="M 50 28
                 L 44 38 L 48 38 L 40 48 L 46 48 L 36 58 L 44 58 L 34 68 L 50 68
                 L 66 68 L 56 58 L 64 58 L 54 48 L 60 48 L 52 38 L 56 38 Z"/>
        <rect x="48" y="68" width="4" height="6" fill={color}/>
      </g>
      {/* ground */}
      <line x1="12" y1="88" x2="88" y2="88" strokeWidth="0.8" fill="none"/>
      <line x1="18" y1="92" x2="22" y2="92" strokeWidth="0.5" fill="none"/>
      <line x1="32" y1="92" x2="38" y2="92" strokeWidth="0.5" fill="none"/>
      <line x1="50" y1="92" x2="56" y2="92" strokeWidth="0.5" fill="none"/>
      <line x1="66" y1="92" x2="74" y2="92" strokeWidth="0.5" fill="none"/>
    </g>
  );
}

// UTAH — beehive with two bees flying.
function IconUT({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* hive — stacked domes */}
      <path d="M 30 84 L 30 78 Q 30 74, 36 74 L 64 74 Q 70 74, 70 78 L 70 84 Z" fill={color} fillOpacity="0.18"/>
      <path d="M 34 74 Q 34 68, 40 68 L 60 68 Q 66 68, 66 74"/>
      <path d="M 38 68 Q 38 62, 44 62 L 56 62 Q 62 62, 62 68"/>
      <path d="M 42 62 Q 42 56, 50 56 Q 58 56, 58 62"/>
      <path d="M 46 56 Q 46 50, 50 50 Q 54 50, 54 56"/>
      {/* horizontal grass-bands */}
      <line x1="30" y1="78" x2="70" y2="78" strokeWidth="0.7"/>
      <line x1="34" y1="71" x2="66" y2="71" strokeWidth="0.7"/>
      <line x1="38" y1="65" x2="62" y2="65" strokeWidth="0.7"/>
      <line x1="42" y1="59" x2="58" y2="59" strokeWidth="0.7"/>
      <line x1="46" y1="53" x2="54" y2="53" strokeWidth="0.7"/>
      {/* entrance hole */}
      <ellipse cx="50" cy="80" rx="4" ry="3" fill={color}/>
      {/* bee 1 */}
      <g transform="translate(20,40)">
        <ellipse cx="0" cy="0" rx="4" ry="2.6" fill={color}/>
        <line x1="-3" y1="0" x2="3" y2="0" stroke="#F5EBD6" strokeWidth="0.6"/>
        <line x1="-1" y1="0" x2="-1" y2="-3" strokeWidth="0.6"/>
        <line x1="1" y1="0" x2="1" y2="-3" strokeWidth="0.6"/>
        <ellipse cx="-1" cy="-3" rx="2" ry="1.4" stroke={color} strokeWidth="0.5" fill="none"/>
        <ellipse cx="1" cy="-3" rx="2" ry="1.4" stroke={color} strokeWidth="0.5" fill="none"/>
      </g>
      {/* bee 2 */}
      <g transform="translate(80,46)">
        <ellipse cx="0" cy="0" rx="4" ry="2.6" fill={color}/>
        <line x1="-3" y1="0" x2="3" y2="0" stroke="#F5EBD6" strokeWidth="0.6"/>
        <line x1="-1" y1="0" x2="-1" y2="-3" strokeWidth="0.6"/>
        <line x1="1" y1="0" x2="1" y2="-3" strokeWidth="0.6"/>
        <ellipse cx="-1" cy="-3" rx="2" ry="1.4" stroke={color} strokeWidth="0.5" fill="none"/>
        <ellipse cx="1" cy="-3" rx="2" ry="1.4" stroke={color} strokeWidth="0.5" fill="none"/>
      </g>
      {/* ground */}
      <line x1="14" y1="86" x2="86" y2="86" strokeWidth="0.7"/>
    </g>
  );
}

// WASHINGTON — Mt. Rainier + two evergreens.
function IconWA({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* Rainier — wide pyramid w/ snow */}
      <path d="M 8 78 L 30 50 L 38 58 L 46 42 L 54 56 L 62 50 L 92 78 Z" fill={color} fillOpacity="0.06"/>
      <path d="M 8 78 L 30 50 L 38 58 L 46 42 L 54 56 L 62 50 L 92 78"/>
      {/* snow cap detail */}
      <path d="M 36 58 L 46 42 L 52 52"/>
      <line x1="32" y1="60" x2="28" y2="64" strokeWidth="0.5"/>
      <line x1="58" y1="58" x2="64" y2="60" strokeWidth="0.5"/>
      {/* evergreens foreground left */}
      <g transform="translate(0,0)">
        <path d="M 18 84 L 22 72 L 26 84 Z" fill={color}/>
        <path d="M 16 88 L 22 76 L 28 88 Z" fill={color}/>
        <rect x="21" y="88" width="2" height="3" fill={color}/>
      </g>
      {/* foreground right */}
      <g transform="translate(56,4)">
        <path d="M 18 84 L 22 72 L 26 84 Z" fill={color}/>
        <path d="M 16 88 L 22 76 L 28 88 Z" fill={color}/>
        <rect x="21" y="88" width="2" height="3" fill={color}/>
      </g>
      {/* ground */}
      <line x1="6" y1="92" x2="94" y2="92" strokeWidth="0.7"/>
    </g>
  );
}

// WYOMING — bucking bronco, rider repositioned lower so the hat
// doesn't overlap the state-name banner.
function IconWY({ color = '#1B1F2A' }) {
  return (
    <g fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
      {/* horse body, mid-buck */}
      <path d="M 18 72
               Q 22 62, 34 60
               L 42 56
               Q 50 52, 58 54
               L 66 52
               Q 70 50, 76 48
               L 82 50
               Q 84 54, 80 58
               L 74 62
               Q 70 64, 64 64
               L 58 66
               L 56 72
               L 60 80
               L 64 86
               Q 60 88, 54 84
               L 48 76
               L 38 74
               L 32 82
               L 28 86
               Q 22 86, 26 78
               L 28 70 Z"/>
      {/* mane */}
      <path d="M 66 52 L 62 46 L 66 48 L 62 42 L 68 46 Z" fill={color}/>
      {/* tail flowing */}
      <path d="M 22 68 Q 14 72, 12 78 Q 18 74, 24 70 Z" fill={color}/>
      {/* rider, head + hat clear of the state-name banner */}
      <g fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 54 56 Q 56 50, 50 48"/>
        <circle cx="48" cy="44" r="3"/>
        <path d="M 42 42 L 54 42"/>
        <path d="M 44 40 Q 48 36, 52 40"/>
        <path d="M 48 48 Q 42 42, 38 38"/>
      </g>
      <circle cx="76" cy="52" r="0.7" fill="#F5EBD6"/>
      <line x1="14" y1="92" x2="86" y2="92" strokeWidth="0.7" stroke={color} fill="none"/>
    </g>
  );
}

export default {
  CA: IconCA, AK: IconAK, AZ: IconAZ, CO: IconCO, HI: IconHI, ID: IconID,
  MT: IconMT, NM: IconNM, NV: IconNV, OR: IconOR, UT: IconUT, WA: IconWA, WY: IconWY,
};
