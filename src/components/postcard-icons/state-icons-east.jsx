// Literary Roads — engraved state icons · EAST region
// AL · CT · DC · DE · FL · GA · LA · MA · MD · ME · MS · NC · NH · NJ · NY · PA · PR · RI · SC · TN · VA · VT · WV


// ALABAMA — yellowhammer (northern flicker) on a branch.
function IconAL({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      <path d="M 12 78 L 88 78"/>
      <line x1="30" y1="78" x2="28" y2="74" strokeWidth="0.8"/>
      <line x1="62" y1="78" x2="64" y2="74" strokeWidth="0.8"/>
      {/* body */}
      <path d="M 30 54 Q 38 44, 56 46 Q 70 50, 70 64 Q 64 72, 50 72 Q 32 72, 28 62 Q 26 56, 30 54 Z" fill={color} fillOpacity="0.1"/>
      <path d="M 30 54 Q 38 44, 56 46 Q 70 50, 70 64 Q 64 72, 50 72 Q 32 72, 28 62 Q 26 56, 30 54 Z"/>
      {/* head */}
      <circle cx="64" cy="42" r="7"/>
      {/* beak */}
      <path d="M 70 42 L 80 42 L 70 46 Z" fill={color}/>
      {/* eye */}
      <circle cx="66" cy="40" r="0.9" fill={color}/>
      {/* red patch on nape */}
      <path d="M 60 38 Q 60 34, 64 34 Q 62 38, 60 38 Z" fill={color}/>
      {/* breast hatch (yellowhammer spots) */}
      <circle cx="38" cy="58" r="0.6" fill={color}/>
      <circle cx="44" cy="62" r="0.6" fill={color}/>
      <circle cx="50" cy="58" r="0.6" fill={color}/>
      <circle cx="56" cy="62" r="0.6" fill={color}/>
      <circle cx="42" cy="66" r="0.6" fill={color}/>
      <circle cx="48" cy="68" r="0.6" fill={color}/>
      {/* tail */}
      <path d="M 28 60 L 14 56 L 18 60 L 14 66 L 28 66 Z" fill={color}/>
      {/* legs */}
      <line x1="46" y1="72" x2="46" y2="78" strokeWidth="1.4"/>
      <line x1="54" y1="72" x2="54" y2="78" strokeWidth="1.4"/>
      {/* wing notch */}
      <path d="M 42 56 Q 52 54, 60 60 Q 56 64, 48 64 Q 42 60, 42 56 Z"/>
    </g>
  );
}

// CONNECTICUT — sailboat (Long Island Sound).
function IconCT({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* sun */}
      <circle cx="80" cy="32" r="4"/>
      <line x1="80" y1="26" x2="80" y2="28"/>
      <line x1="74" y1="32" x2="76" y2="32"/>
      <line x1="84" y1="32" x2="86" y2="32"/>
      {/* main mast */}
      <line x1="46" y1="70" x2="46" y2="22" strokeWidth="1.5"/>
      {/* main sail — triangle */}
      <path d="M 46 24 L 70 64 L 46 64 Z" fill={color} fillOpacity="0.15"/>
      <path d="M 46 24 L 70 64 L 46 64 Z"/>
      {/* sail hatch */}
      <line x1="50" y1="34" x2="54" y2="64" strokeWidth="0.5"/>
      <line x1="55" y1="44" x2="60" y2="64" strokeWidth="0.5"/>
      <line x1="60" y1="54" x2="66" y2="64" strokeWidth="0.5"/>
      {/* jib (foresail) */}
      <path d="M 46 28 L 26 64 L 44 64 Z" fill={color} fillOpacity="0.08"/>
      <path d="M 46 28 L 26 64 L 44 64 Z"/>
      {/* boom */}
      <line x1="26" y1="64" x2="72" y2="64" strokeWidth="1.5"/>
      {/* hull */}
      <path d="M 22 66 L 76 66 Q 74 76, 58 78 L 38 78 Q 24 76, 22 66 Z" fill={color}/>
      {/* water */}
      <path d="M 6 84 Q 18 80, 30 84 T 54 84 T 78 84 T 94 84" strokeWidth="0.7"/>
      <path d="M 6 90 Q 18 86, 30 90 T 54 90 T 78 90 T 94 90" strokeWidth="0.6"/>
    </g>
  );
}

// WASHINGTON DC — Capitol Dome, repositioned and resized to fit y=38–92.
function IconDC({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* base */}
      <rect x="20" y="80" width="60" height="8" fill={color} fillOpacity="0.1"/>
      <rect x="20" y="80" width="60" height="8"/>
      {/* columns */}
      {[26, 34, 42, 50, 58, 66, 74].map(x => (
        <line key={x} x1={x} y1="80" x2={x} y2="70" strokeWidth="0.8"/>
      ))}
      {/* entablature */}
      <line x1="22" y1="70" x2="78" y2="70" strokeWidth="1.5"/>
      <line x1="22" y1="68" x2="78" y2="68" strokeWidth="0.6"/>
      {/* drum */}
      <rect x="34" y="58" width="32" height="10"/>
      {/* small windows */}
      {[38, 44, 50, 56, 62].map(x => (
        <rect key={x} x={x} y="60" width="2" height="3" fill={color}/>
      ))}
      {/* dome */}
      <path d="M 32 58 Q 50 42, 68 58 Z" fill={color} fillOpacity="0.1"/>
      <path d="M 32 58 Q 50 42, 68 58"/>
      {/* dome ribs */}
      <line x1="36" y1="52" x2="40" y2="58" strokeWidth="0.5"/>
      <line x1="44" y1="46" x2="44" y2="58" strokeWidth="0.5"/>
      <line x1="50" y1="44" x2="50" y2="58" strokeWidth="0.5"/>
      <line x1="56" y1="46" x2="56" y2="58" strokeWidth="0.5"/>
      <line x1="64" y1="52" x2="60" y2="58" strokeWidth="0.5"/>
      {/* small lantern */}
      <rect x="46" y="40" width="8" height="4"/>
      <circle cx="50" cy="38" r="1" fill={color}/>
      {/* steps */}
      <line x1="14" y1="90" x2="86" y2="90" strokeWidth="0.7"/>
      <line x1="18" y1="92" x2="82" y2="92" strokeWidth="0.6"/>
    </g>
  );
}

// DELAWARE — peach blossom (state flower).
function IconDE({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" transform="translate(0,9)">
      {/* 5 petals around center (50, 48), r=12 */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const cx = 50 + 12 * Math.cos(a);
        const cy = 48 + 12 * Math.sin(a);
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx="10" ry="7"
              transform={`rotate(${(a * 180 / Math.PI) + 90} ${cx} ${cy})`}/>
            <line x1={50 + 5 * Math.cos(a)} y1={48 + 5 * Math.sin(a)}
              x2={50 + 18 * Math.cos(a)} y2={48 + 18 * Math.sin(a)}
              strokeWidth="0.5"/>
          </g>
        );
      })}
      {/* center stamens */}
      <circle cx="50" cy="48" r="3" fill={color}/>
      <line x1="50" y1="48" x2="46" y2="42" strokeWidth="0.6"/>
      <line x1="50" y1="48" x2="50" y2="40" strokeWidth="0.6"/>
      <line x1="50" y1="48" x2="54" y2="42" strokeWidth="0.6"/>
      <line x1="50" y1="48" x2="44" y2="46" strokeWidth="0.6"/>
      <line x1="50" y1="48" x2="56" y2="46" strokeWidth="0.6"/>
      <circle cx="46" cy="42" r="0.8" fill={color}/>
      <circle cx="50" cy="40" r="0.8" fill={color}/>
      <circle cx="54" cy="42" r="0.8" fill={color}/>
      <circle cx="44" cy="46" r="0.8" fill={color}/>
      <circle cx="56" cy="46" r="0.8" fill={color}/>
      {/* branch + leaf */}
      <path d="M 50 60 Q 56 76, 70 86"/>
      <path d="M 60 74 Q 70 70, 76 74 Q 70 78, 60 76 Z"/>
      <line x1="62" y1="74" x2="74" y2="74" strokeWidth="0.5"/>
    </g>
  );
}

// FLORIDA — palm tree with an umbrella canopy: lots of fronds, each arcing
// down like the ribs of a parasol. Sun in upper-right.
function IconFL({ color = '#1B1F2A' }) {
  // shared frond pen — heavy mid-rib + leaflet barbs along both sides
  const Frond = ({ d, leaflets = 8, side = 1 }) => (
    <g>
      <path d={d} stroke={color} strokeWidth="1.4" fill="none"
        strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  );
  // hand-tuned umbrella canopy — crown at (50, 44), fronds arc DOWN like ribs
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* small sun upper-right */}
      <circle cx="80" cy="34" r="3.2"/>
      <line x1="80" y1="28" x2="80" y2="29.5"/>
      <line x1="80" y1="38.5" x2="80" y2="40"/>
      <line x1="74" y1="34" x2="75.5" y2="34"/>
      <line x1="84.5" y1="34" x2="86" y2="34"/>
      <line x1="76" y1="30" x2="77" y2="31"/>
      <line x1="76" y1="38" x2="77" y2="37"/>
      <line x1="84" y1="30" x2="83" y2="31"/>
      <line x1="84" y1="38" x2="83" y2="37"/>

      {/* palm trunk — centered, slightly tapering and curving */}
      <path d="M 48 92 C 46 78, 47 64, 49 50" strokeWidth="1.4"/>
      <path d="M 52 92 C 54 78, 53 64, 51 50" strokeWidth="1.4"/>
      {/* trunk ring scars */}
      <path d="M 46.5 88 Q 50 86.5, 53.5 88" strokeWidth="0.7"/>
      <path d="M 46.5 80 Q 50 78.5, 53.5 80" strokeWidth="0.7"/>
      <path d="M 46.5 72 Q 50 70.5, 53.5 72" strokeWidth="0.7"/>
      <path d="M 46.5 64 Q 50 62.5, 53.5 64" strokeWidth="0.7"/>
      <path d="M 46.5 56 Q 50 54.5, 53.5 56" strokeWidth="0.7"/>

      {/* crown / coconut bunch */}
      <circle cx="50" cy="46" r="2.2" fill={color}/>
      <circle cx="47" cy="48" r="1.6" fill={color}/>
      <circle cx="53" cy="48" r="1.6" fill={color}/>

      {/* umbrella fronds — 9 ribs, each starts at crown (50,44) and arcs
          outward then DOWN like a parasol. Order back-to-front so tips
          overlap nicely. */}
      {/* far-left frond — sweeps to lower left */}
      <path d="M 50 44 Q 30 38, 14 52 Q 22 50, 30 48 Q 38 46, 50 44"
        fill={color} fillOpacity="0.12"/>
      <path d="M 50 44 Q 30 38, 14 52" strokeWidth="1.4"/>
      {[[44, 42], [38, 41], [32, 43], [26, 46], [20, 49]].map(([x, y], i) => (
        <line key={'lf-' + i} x1={x} y1={y} x2={x - 2} y2={y + 4} strokeWidth="0.7"/>
      ))}

      {/* mid-left lower frond — bigger droop */}
      <path d="M 50 44 Q 28 50, 18 64 Q 28 58, 38 52 Q 46 49, 50 44"
        fill={color} fillOpacity="0.12"/>
      <path d="M 50 44 Q 28 50, 18 64" strokeWidth="1.4"/>
      {[[44, 47], [38, 50], [32, 54], [26, 58], [22, 62]].map(([x, y], i) => (
        <line key={'ml-' + i} x1={x} y1={y} x2={x - 3} y2={y + 4} strokeWidth="0.7"/>
      ))}

      {/* left-up frond — short, going up-left then curving */}
      <path d="M 50 44 Q 34 32, 22 36 Q 32 36, 40 40 Q 46 42, 50 44"
        fill={color} fillOpacity="0.12"/>
      <path d="M 50 44 Q 34 32, 22 36" strokeWidth="1.4"/>
      {[[44, 38], [38, 36], [32, 34.5], [26, 35]].map(([x, y], i) => (
        <line key={'lu-' + i} x1={x} y1={y} x2={x - 2} y2={y - 3} strokeWidth="0.7"/>
      ))}

      {/* center-top frond — spike up */}
      <path d="M 50 44 Q 49 32, 46 22 Q 52 30, 53 38 Q 52 42, 50 44"
        fill={color} fillOpacity="0.12"/>
      <path d="M 50 44 Q 49 32, 46 22" strokeWidth="1.4"/>
      {[[49, 38], [48, 32], [47, 26]].map(([x, y], i) => (
        <line key={'cu-' + i} x1={x} y1={y} x2={x - 2} y2={y - 1} strokeWidth="0.7"/>
      ))}

      {/* right-up frond */}
      <path d="M 50 44 Q 66 32, 78 38 Q 68 36, 60 40 Q 54 42, 50 44"
        fill={color} fillOpacity="0.12"/>
      <path d="M 50 44 Q 66 32, 78 38" strokeWidth="1.4"/>
      {[[56, 38], [62, 35.5], [68, 34.5], [74, 36]].map(([x, y], i) => (
        <line key={'ru-' + i} x1={x} y1={y} x2={x + 2} y2={y - 3} strokeWidth="0.7"/>
      ))}

      {/* mid-right lower frond */}
      <path d="M 50 44 Q 72 50, 82 64 Q 72 58, 62 52 Q 54 49, 50 44"
        fill={color} fillOpacity="0.12"/>
      <path d="M 50 44 Q 72 50, 82 64" strokeWidth="1.4"/>
      {[[56, 47], [62, 50], [68, 54], [74, 58], [78, 62]].map(([x, y], i) => (
        <line key={'mr-' + i} x1={x} y1={y} x2={x + 3} y2={y + 4} strokeWidth="0.7"/>
      ))}

      {/* far-right frond */}
      <path d="M 50 44 Q 70 38, 86 52 Q 78 50, 70 48 Q 62 46, 50 44"
        fill={color} fillOpacity="0.12"/>
      <path d="M 50 44 Q 70 38, 86 52" strokeWidth="1.4"/>
      {[[56, 42], [62, 41], [68, 43], [74, 46], [80, 49]].map(([x, y], i) => (
        <line key={'rf-' + i} x1={x} y1={y} x2={x + 2} y2={y + 4} strokeWidth="0.7"/>
      ))}

      {/* short front-left + front-right droopers for fullness */}
      <path d="M 50 44 Q 40 50, 32 58" strokeWidth="1"/>
      <path d="M 50 44 Q 60 50, 68 58" strokeWidth="1"/>

      {/* ground line + small wave */}
      <line x1="14" y1="90" x2="86" y2="90" strokeWidth="0.7"/>
      <path d="M 10 94 Q 22 91, 34 94 T 58 94 T 82 94 T 94 94" strokeWidth="0.6"/>
    </g>
  );
}

// GEORGIA — peach with leaf (state fruit).
function IconGA({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" transform="translate(0,14)">
      {/* peach body */}
      <path d="M 30 56 Q 30 36, 50 36 Q 70 36, 70 56 Q 72 76, 50 78 Q 28 76, 30 56 Z" fill={color} fillOpacity="0.1"/>
      <path d="M 30 56 Q 30 36, 50 36 Q 70 36, 70 56 Q 72 76, 50 78 Q 28 76, 30 56 Z"/>
      {/* center cleft groove */}
      <path d="M 50 36 Q 46 50, 50 78"/>
      {/* hatch shading on side */}
      <line x1="36" y1="46" x2="40" y2="48" strokeWidth="0.5"/>
      <line x1="34" y1="54" x2="38" y2="56" strokeWidth="0.5"/>
      <line x1="34" y1="62" x2="38" y2="64" strokeWidth="0.5"/>
      <line x1="36" y1="70" x2="40" y2="72" strokeWidth="0.5"/>
      <line x1="60" y1="44" x2="62" y2="42" strokeWidth="0.5"/>
      <line x1="64" y1="50" x2="66" y2="48" strokeWidth="0.5"/>
      <line x1="66" y1="58" x2="68" y2="56" strokeWidth="0.5"/>
      {/* highlight */}
      <ellipse cx="44" cy="44" rx="3" ry="4" stroke={color} strokeWidth="0.5"/>
      {/* stem */}
      <path d="M 50 36 Q 50 30, 56 26" strokeWidth="1.6"/>
      {/* leaf */}
      <path d="M 56 26 Q 70 20, 78 26 Q 70 34, 58 30 Z" fill={color} fillOpacity="0.2"/>
      <path d="M 56 26 Q 70 20, 78 26 Q 70 34, 58 30 Z"/>
      <line x1="58" y1="27" x2="76" y2="27" strokeWidth="0.5"/>
      <line x1="62" y1="24" x2="62" y2="32" strokeWidth="0.4"/>
      <line x1="68" y1="22" x2="68" y2="32" strokeWidth="0.4"/>
      <line x1="74" y1="24" x2="74" y2="30" strokeWidth="0.4"/>
    </g>
  );
}

// LOUISIANA — brown pelican (state bird).
function IconLA({ color = '#1B1F2A' }) {
  return (
    <g fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
      {/* body */}
      <path d="M 22 60
               Q 28 48, 44 46
               Q 60 44, 70 52
               Q 80 58, 78 70
               Q 74 78, 60 78
               L 40 78
               Q 24 76, 22 60 Z"/>
      {/* head */}
      <circle cx="74" cy="44" r="6"/>
      {/* eye */}
      <circle cx="76" cy="42" r="0.7" fill="#F5EBD6"/>
      {/* long beak with pouch */}
      <path d="M 80 44 L 92 56 L 86 58 L 76 50 Z"/>
      {/* pouch curve */}
      <path d="M 76 50 Q 82 60, 84 58" fill="none" stroke={color} strokeWidth="0.8"/>
      {/* neck curve */}
      <path d="M 68 50 Q 64 60, 60 64" fill="none" stroke="#F5EBD6" strokeWidth="0.7"/>
      {/* wing */}
      <path d="M 34 56 Q 50 50, 60 56 Q 56 64, 44 64 Q 32 62, 34 56 Z" fill="#F5EBD6" stroke={color} strokeWidth="0.7"/>
      {/* feather lines */}
      <line x1="36" y1="62" x2="38" y2="58" stroke={color} strokeWidth="0.5"/>
      <line x1="44" y1="64" x2="46" y2="60" stroke={color} strokeWidth="0.5"/>
      <line x1="52" y1="62" x2="54" y2="58" stroke={color} strokeWidth="0.5"/>
      {/* legs */}
      <line x1="46" y1="78" x2="42" y2="86" stroke={color} strokeWidth="1.4" fill="none"/>
      <line x1="56" y1="78" x2="56" y2="86" stroke={color} strokeWidth="1.4" fill="none"/>
      <line x1="42" y1="86" x2="38" y2="86" stroke={color} strokeWidth="1.4" fill="none"/>
      <line x1="42" y1="86" x2="46" y2="86" stroke={color} strokeWidth="1.4" fill="none"/>
      <line x1="56" y1="86" x2="52" y2="86" stroke={color} strokeWidth="1.4" fill="none"/>
      <line x1="56" y1="86" x2="60" y2="86" stroke={color} strokeWidth="1.4" fill="none"/>
      {/* water */}
      <path d="M 8 90 Q 22 88, 36 90 T 64 90 T 92 90" stroke={color} strokeWidth="0.7" fill="none"/>
    </g>
  );
}

// MASSACHUSETTS — Mayflower-style sailing ship, sized to fit y=38–92.
function IconMA({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* 3 masts */}
      <line x1="30" y1="42" x2="30" y2="74" strokeWidth="1.4"/>
      <line x1="50" y1="38" x2="50" y2="74" strokeWidth="1.4"/>
      <line x1="70" y1="42" x2="70" y2="74" strokeWidth="1.4"/>
      {/* flag at top of main mast */}
      <path d="M 50 38 L 60 40 L 50 42 Z" fill={color}/>
      {/* main mast sails */}
      <path d="M 42 44 L 58 44 L 58 54 L 42 54 Z" fill={color} fillOpacity="0.1"/>
      <path d="M 42 44 L 58 44 L 58 54 L 42 54 Z"/>
      <path d="M 38 56 L 62 56 L 62 66 L 38 66 Z" fill={color} fillOpacity="0.1"/>
      <path d="M 38 56 L 62 56 L 62 66 L 38 66 Z"/>
      {/* foremast sails */}
      <path d="M 22 46 L 38 46 L 38 56 L 22 56 Z" fill={color} fillOpacity="0.1"/>
      <path d="M 22 46 L 38 46 L 38 56 L 22 56 Z"/>
      {/* mizzen */}
      <path d="M 62 46 L 78 46 L 78 56 L 62 56 Z" fill={color} fillOpacity="0.1"/>
      <path d="M 62 46 L 78 46 L 78 56 L 62 56 Z"/>
      {/* wind lines */}
      <line x1="46" y1="48" x2="50" y2="50" strokeWidth="0.5"/>
      <line x1="46" y1="60" x2="50" y2="62" strokeWidth="0.5"/>
      {/* hull */}
      <path d="M 14 66 L 86 66 Q 80 82, 62 84 L 38 84 Q 20 82, 14 66 Z" fill={color}/>
      {/* portholes */}
      <circle cx="32" cy="74" r="1.3" fill="#F5EBD6"/>
      <circle cx="42" cy="74" r="1.3" fill="#F5EBD6"/>
      <circle cx="52" cy="74" r="1.3" fill="#F5EBD6"/>
      <circle cx="62" cy="74" r="1.3" fill="#F5EBD6"/>
      <circle cx="72" cy="74" r="1.3" fill="#F5EBD6"/>
      {/* water */}
      <path d="M 6 90 Q 22 88, 38 90 T 70 90 T 94 90" strokeWidth="0.7"/>
    </g>
  );
}

// MARYLAND — blue crab.
function IconMD({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* shell */}
      <path d="M 22 52 Q 50 38, 78 52 Q 76 64, 50 66 Q 24 64, 22 52 Z" fill={color}/>
      {/* shell spikes (lateral) */}
      <path d="M 20 52 L 16 50 L 20 54" fill={color}/>
      <path d="M 80 52 L 84 50 L 80 54" fill={color}/>
      {/* shell texture */}
      <line x1="32" y1="52" x2="34" y2="48" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="40" y1="50" x2="42" y2="46" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="50" y1="48" x2="50" y2="44" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="58" y1="50" x2="58" y2="46" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="68" y1="52" x2="66" y2="48" stroke="#F5EBD6" strokeWidth="0.6"/>
      {/* eyes */}
      <line x1="42" y1="44" x2="40" y2="38" strokeWidth="1.2" stroke={color}/>
      <line x1="58" y1="44" x2="60" y2="38" strokeWidth="1.2" stroke={color}/>
      <circle cx="40" cy="36" r="1.6" fill={color}/>
      <circle cx="60" cy="36" r="1.6" fill={color}/>
      {/* claws (chela) — left */}
      <path d="M 22 56 L 8 52 L 6 56 L 12 60 L 16 58 L 22 60 Z" fill={color}/>
      <path d="M 6 56 L 4 58" stroke={color} strokeWidth="0.7"/>
      {/* claws — right */}
      <path d="M 78 56 L 92 52 L 94 56 L 88 60 L 84 58 L 78 60 Z" fill={color}/>
      <path d="M 94 56 L 96 58" stroke={color} strokeWidth="0.7"/>
      {/* legs — left side, 4 pairs going down-out */}
      <path d="M 28 64 L 18 70 L 14 74" stroke={color} strokeWidth="1.4" fill="none"/>
      <path d="M 32 66 L 24 74 L 22 80" stroke={color} strokeWidth="1.4" fill="none"/>
      <path d="M 36 66 L 32 76 L 30 84" stroke={color} strokeWidth="1.4" fill="none"/>
      <path d="M 42 66 L 42 76 L 40 84" stroke={color} strokeWidth="1.4" fill="none"/>
      {/* legs — right side */}
      <path d="M 72 64 L 82 70 L 86 74" stroke={color} strokeWidth="1.4" fill="none"/>
      <path d="M 68 66 L 76 74 L 78 80" stroke={color} strokeWidth="1.4" fill="none"/>
      <path d="M 64 66 L 68 76 L 70 84" stroke={color} strokeWidth="1.4" fill="none"/>
      <path d="M 58 66 L 58 76 L 60 84" stroke={color} strokeWidth="1.4" fill="none"/>
    </g>
  );
}

// MAINE — lobster.
function IconME({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* head (right side) */}
      <path d="M 56 50 Q 70 46, 80 50 Q 84 56, 78 60 Q 68 64, 56 60 Z" fill={color}/>
      {/* eyes/antennae */}
      <line x1="80" y1="48" x2="86" y2="38" strokeWidth="1.1"/>
      <line x1="78" y1="50" x2="88" y2="46" strokeWidth="1.1"/>
      <circle cx="86" cy="37" r="0.9" fill={color}/>
      <circle cx="89" cy="46" r="0.9" fill={color}/>
      {/* body segments */}
      <path d="M 56 50 Q 56 56, 50 56 Q 50 50, 56 50 Z" fill={color}/>
      <path d="M 50 50 Q 50 56, 44 56 Q 44 50, 50 50 Z" fill={color}/>
      <path d="M 44 50 Q 44 56, 38 56 Q 38 50, 44 50 Z" fill={color}/>
      <path d="M 38 50 Q 38 56, 32 56 Q 32 50, 38 50 Z" fill={color}/>
      <path d="M 32 50 Q 32 56, 26 56 Q 26 50, 32 50 Z" fill={color}/>
      <line x1="56" y1="51" x2="56" y2="55" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="50" y1="51" x2="50" y2="55" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="44" y1="51" x2="44" y2="55" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="38" y1="51" x2="38" y2="55" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="32" y1="51" x2="32" y2="55" stroke="#F5EBD6" strokeWidth="0.5"/>
      {/* tail fan */}
      <path d="M 26 50 L 12 42 L 14 48 L 8 50 L 14 54 L 12 60 L 26 58 Z" fill={color}/>
      <line x1="14" y1="46" x2="22" y2="50" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="12" y1="50" x2="22" y2="54" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="14" y1="56" x2="22" y2="56" stroke="#F5EBD6" strokeWidth="0.5"/>
      {/* large pincers (front, in front of head) */}
      <path d="M 70 56 Q 80 70, 76 78 Q 70 80, 68 76 Q 70 70, 64 60 Z" fill={color}/>
      <path d="M 76 70 L 84 74 L 78 76 L 72 80 Z" fill={color}/>
      <path d="M 58 56 Q 66 70, 60 78 Q 54 80, 52 76 Q 54 70, 50 60 Z" fill={color}/>
      <path d="M 60 70 L 50 74 L 56 76 L 60 80 Z" fill={color}/>
      {/* small legs */}
      <line x1="34" y1="56" x2="34" y2="64" strokeWidth="1" stroke={color}/>
      <line x1="40" y1="56" x2="40" y2="64" strokeWidth="1" stroke={color}/>
      <line x1="46" y1="56" x2="46" y2="64" strokeWidth="1" stroke={color}/>
      <line x1="52" y1="56" x2="52" y2="64" strokeWidth="1" stroke={color}/>
    </g>
  );
}

// MISSISSIPPI — magnolia flower.
function IconMS({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" transform="translate(0,9)">
      {/* 6 large petals around center (50, 50) */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
        const cx = 50 + 14 * Math.cos(a);
        const cy = 50 + 14 * Math.sin(a);
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx="11" ry="6"
              transform={`rotate(${(a * 180 / Math.PI) + 90} ${cx} ${cy})`}/>
            <line x1={50 + 4 * Math.cos(a)} y1={50 + 4 * Math.sin(a)}
              x2={50 + 22 * Math.cos(a)} y2={50 + 22 * Math.sin(a)}
              strokeWidth="0.5"/>
          </g>
        );
      })}
      {/* center cone of stamens */}
      <ellipse cx="50" cy="50" rx="5" ry="6" fill={color}/>
      <line x1="50" y1="44" x2="50" y2="56" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="46" y1="48" x2="54" y2="52" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="46" y1="52" x2="54" y2="48" stroke="#F5EBD6" strokeWidth="0.6"/>
      {/* leaves on stem below */}
      <path d="M 50 70 Q 36 74, 30 86"/>
      <path d="M 32 78 Q 22 80, 18 86 Q 28 86, 36 80 Z"/>
      <path d="M 50 72 Q 62 76, 70 84"/>
      <path d="M 64 78 Q 76 80, 80 86 Q 70 86, 60 82 Z"/>
    </g>
  );
}

// NORTH CAROLINA — Wright Brothers biplane.
function IconNC({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* sun */}
      <circle cx="76" cy="28" r="4"/>
      <line x1="76" y1="22" x2="76" y2="24"/>
      <line x1="70" y1="28" x2="72" y2="28"/>
      {/* top wing */}
      <path d="M 18 44 L 82 44 L 82 48 L 18 48 Z" fill={color} fillOpacity="0.15"/>
      <path d="M 18 44 L 82 44 L 82 48 L 18 48 Z"/>
      {/* bottom wing */}
      <path d="M 18 64 L 82 64 L 82 68 L 18 68 Z" fill={color} fillOpacity="0.15"/>
      <path d="M 18 64 L 82 64 L 82 68 L 18 68 Z"/>
      {/* wing struts (verticals between wings) */}
      <line x1="28" y1="48" x2="28" y2="64"/>
      <line x1="40" y1="48" x2="40" y2="64"/>
      <line x1="60" y1="48" x2="60" y2="64"/>
      <line x1="72" y1="48" x2="72" y2="64"/>
      {/* fuselage skid */}
      <path d="M 36 68 L 64 68 L 60 74 L 40 74 Z" fill={color}/>
      {/* pilot/operator */}
      <rect x="44" y="58" width="12" height="8" fill={color}/>
      <circle cx="50" cy="56" r="2" fill={color}/>
      {/* tail boom (extending back) */}
      <line x1="40" y1="71" x2="14" y2="76"/>
      <line x1="40" y1="73" x2="14" y2="76"/>
      {/* tail rudder/elevator */}
      <path d="M 8 70 L 14 76 L 8 82 Z" fill={color}/>
      {/* propeller (rotated lines suggesting spin) */}
      <line x1="84" y1="60" x2="92" y2="52" strokeWidth="0.6"/>
      <line x1="84" y1="62" x2="92" y2="62" strokeWidth="0.6"/>
      <line x1="84" y1="64" x2="92" y2="72" strokeWidth="0.6"/>
      {/* horizon line */}
      <line x1="14" y1="88" x2="86" y2="88" strokeWidth="0.7"/>
      {/* small dune */}
      <path d="M 30 88 Q 38 84, 46 88" strokeWidth="0.7"/>
      <path d="M 56 88 Q 64 82, 72 88" strokeWidth="0.7"/>
    </g>
  );
}

// NEW HAMPSHIRE — pine tree against the White Mountains.
function IconNH({ color = '#1B1F2A' }) {
  return (
    <g fill={color} stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
      {/* mountains */}
      <path d="M 8 80 L 24 50 L 32 60 L 42 44 L 54 60 L 64 50 L 78 64 L 92 80 Z" fill="none" stroke={color} strokeWidth="1.3"/>
      <path d="M 18 64 L 24 50 L 30 60" stroke={color} strokeWidth="1" fill="none"/>
      <path d="M 38 52 L 42 44 L 48 56" stroke={color} strokeWidth="1" fill="none"/>
      {/* big pine in front */}
      <path d="M 50 30 L 42 42 L 46 42 L 38 52 L 44 52 L 34 64 L 42 64 L 32 74 L 50 74 L 68 74 L 58 64 L 66 64 L 56 52 L 62 52 L 54 42 L 58 42 Z"/>
      {/* trunk */}
      <rect x="48" y="74" width="4" height="6"/>
      {/* ground */}
      <line x1="14" y1="84" x2="86" y2="84" stroke={color} strokeWidth="0.7" fill="none"/>
    </g>
  );
}

// NEW JERSEY — slice of pizza + seashell (Jersey Shore + Jersey pie).
function IconNJ({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* ── PIZZA SLICE, upper-left ─────────────────── */}
      <g transform="translate(-2,0)">
        {/* crust edge (back of slice) — curved */}
        <path d="M 14 30 Q 34 22, 54 30" strokeWidth="1.4"/>
        {/* slice walls down to tip */}
        <path d="M 14 30 L 34 64" strokeWidth="1.4"/>
        <path d="M 54 30 L 34 64" strokeWidth="1.4"/>
        {/* cheese fill */}
        <path d="M 14 30 Q 34 22, 54 30 L 34 64 Z" fill={color} fillOpacity="0.12"/>
        {/* dripping cheese along the bottom edges */}
        <path d="M 18 38 Q 19 42, 17 44" strokeWidth="0.7"/>
        <path d="M 48 36 Q 50 41, 48 44" strokeWidth="0.7"/>
        {/* crust shading hatch */}
        <path d="M 16 28 Q 34 21, 52 28" strokeWidth="0.5"/>
        <line x1="20" y1="27" x2="21" y2="29" strokeWidth="0.5"/>
        <line x1="28" y1="25.5" x2="29" y2="27.5" strokeWidth="0.5"/>
        <line x1="36" y1="24.7" x2="37" y2="26.7" strokeWidth="0.5"/>
        <line x1="44" y1="25.5" x2="45" y2="27.5" strokeWidth="0.5"/>
        {/* pepperoni rounds */}
        <circle cx="24" cy="38" r="3" fill={color}/>
        <circle cx="40" cy="36" r="3.2" fill={color}/>
        <circle cx="32" cy="48" r="2.8" fill={color}/>
        <circle cx="44" cy="50" r="2.4" fill={color}/>
        {/* pepperoni highlights so they don't look like solid black dots */}
        <circle cx="23" cy="37" r="0.7" fill="#F5EBD6"/>
        <circle cx="39" cy="35" r="0.8" fill="#F5EBD6"/>
        <circle cx="31" cy="47" r="0.6" fill="#F5EBD6"/>
        <circle cx="43" cy="49" r="0.5" fill="#F5EBD6"/>
        {/* a few basil flecks */}
        <path d="M 28 32 Q 30 30, 31 32" strokeWidth="0.6"/>
        <path d="M 46 40 Q 48 38, 49 40" strokeWidth="0.6"/>
        {/* steam wisps */}
        <path d="M 30 18 Q 32 16, 30 14" strokeWidth="0.6"/>
        <path d="M 38 18 Q 40 16, 38 14" strokeWidth="0.6"/>
      </g>

      {/* ── SEASHELL (scallop), lower-right ─────────────────── */}
      <g transform="translate(2,2)">
        {/* shell body — half-circle with scalloped lower rim */}
        <path d="M 56 56
                 Q 56 88, 90 88
                 L 90 56
                 Q 90 50, 73 50
                 Q 56 50, 56 56 Z"
          fill={color} fillOpacity="0.1"/>
        {/* main outline */}
        <path d="M 56 56 Q 56 50, 73 50 Q 90 50, 90 56"/>
        {/* radiating ribs from hinge (73, 50) down to lower edge */}
        {[
          [58, 86], [62, 88], [67, 89], [73, 90],
          [79, 89], [84, 88], [88, 86],
        ].map(([x, y], i) => (
          <line key={i} x1="73" y1="50" x2={x} y2={y} strokeWidth="0.8"/>
        ))}
        {/* scalloped bottom edge between ribs */}
        <path d="M 56 56
                 Q 58 80, 58 86
                 Q 60 84, 62 88
                 Q 64 84, 67 89
                 Q 70 84, 73 90
                 Q 76 84, 79 89
                 Q 82 84, 84 88
                 Q 86 84, 88 86
                 Q 90 80, 90 56"
          strokeWidth="1.3"/>
        {/* hinge / ears at top */}
        <path d="M 68 49 L 64 46 L 70 48 Z" fill={color}/>
        <path d="M 78 49 L 82 46 L 76 48 Z" fill={color}/>
        {/* shading hatch */}
        <path d="M 60 60 Q 60 72, 63 80" strokeWidth="0.5"/>
        <path d="M 86 60 Q 86 72, 83 80" strokeWidth="0.5"/>
      </g>

      {/* tiny sand line + wave so the pair sits on something */}
      <line x1="14" y1="92" x2="86" y2="92" strokeWidth="0.6" opacity="0.6"/>
      <path d="M 14 88 Q 26 86, 38 88" strokeWidth="0.5" opacity="0.7"/>
    </g>
  );
}

// NEW YORK — skyline (kept from original).
function IconNY({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="miter" strokeLinecap="square">
      <path d="M 6 78
               L 6 56 L 12 56 L 12 50 L 16 50 L 16 56
               L 20 56 L 20 40 L 24 40 L 24 34 L 28 34 L 28 22 L 30 22 L 30 14 L 32 14 L 32 22 L 34 22 L 34 34 L 38 34 L 38 46
               L 42 46 L 42 50 L 46 50 L 46 38 L 50 38 L 50 30
               L 54 24 L 56 24 L 56 30 L 58 30 L 58 38 L 62 38 L 62 50
               L 66 50 L 66 44 L 72 44 L 72 50 L 76 50 L 76 56
               L 82 56 L 82 60 L 88 60 L 88 64 L 94 64 L 94 78 Z"
               fill={color} fillOpacity="0.92"/>
      {[
        [8,60],[10,64],[8,68],[10,72],
        [22,46],[22,50],[22,54],[22,58],[22,62],[22,66],[22,70],
        [30,28],[30,32],[30,36],[30,40],[30,44],[30,48],[30,52],[30,56],[30,60],[30,64],[30,68],[30,72],
        [44,52],[44,56],[44,60],[44,64],[44,68],[44,72],
        [55,32],[55,36],[55,40],[55,44],[55,48],[55,52],[55,56],[55,60],[55,64],[55,68],[55,72],
        [68,52],[68,56],[68,60],[68,64],[68,68],[68,72],
        [78,62],[78,66],[78,70],
        [90,68],[90,72],
      ].map(([x, y], i) => <rect key={i} x={x} y={y} width="1.4" height="1.4" fill="#FFF8E6" stroke="none"/>)}
      <g transform="translate(72,18)">
        <polygon points="0,-6 1.4,-1.8 6,-1.8 2.3,1 3.7,5.6 0,2.8 -3.7,5.6 -2.3,1 -6,-1.8 -1.4,-1.8" fill={color}/>
      </g>
      <line x1="6" y1="78" x2="94" y2="78"/>
      <path d="M 8 84 Q 18 80, 28 84 T 48 84 T 68 84 T 88 84" strokeWidth="0.7" fill="none"/>
    </g>
  );
}

// PENNSYLVANIA — Liberty Bell, shortened to fit y=38–92.
function IconPA({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* yoke */}
      <rect x="40" y="38" width="20" height="3" fill={color}/>
      {/* bell crown */}
      <rect x="42" y="41" width="16" height="5" fill={color}/>
      <path d="M 48 41 Q 50 38, 52 41"/>
      {/* bell body */}
      <path d="M 36 46 Q 30 50, 30 72 L 70 72 Q 70 50, 64 46 Z" fill={color} fillOpacity="0.1"/>
      <path d="M 36 46 Q 30 50, 30 72 L 70 72 Q 70 50, 64 46 Z"/>
      {/* lip */}
      <rect x="28" y="72" width="44" height="5" fill={color}/>
      {/* the famous crack */}
      <path d="M 54 46 Q 56 54, 52 62 Q 56 68, 50 76" strokeWidth="1.5"/>
      {/* inscription bands */}
      <line x1="34" y1="52" x2="66" y2="52" strokeWidth="0.5"/>
      <line x1="32" y1="60" x2="68" y2="60" strokeWidth="0.5"/>
      {/* clapper */}
      <line x1="50" y1="72" x2="50" y2="82" strokeWidth="1.5"/>
      <circle cx="50" cy="84" r="2.5" fill={color}/>
      {/* shading hatch */}
      <line x1="34" y1="56" x2="36" y2="60" strokeWidth="0.5"/>
      <line x1="33" y1="64" x2="35" y2="68" strokeWidth="0.5"/>
      {/* ground */}
      <line x1="14" y1="90" x2="86" y2="90" strokeWidth="0.7"/>
    </g>
  );
}

// PUERTO RICO — coquí tree frog on a leaf (no floating text — it overlapped the banner).
function IconPR({ color = '#1B1F2A' }) {
  return (
    <g fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
      {/* leaf below */}
      <path d="M 14 84 Q 50 68, 86 84 Q 50 94, 14 84 Z" fill="none" stroke={color} strokeWidth="1.3"/>
      <line x1="14" y1="84" x2="86" y2="84" strokeWidth="0.6" fill="none" stroke={color}/>
      <line x1="30" y1="78" x2="30" y2="88" strokeWidth="0.5" fill="none" stroke={color}/>
      <line x1="42" y1="76" x2="42" y2="90" strokeWidth="0.5" fill="none" stroke={color}/>
      <line x1="56" y1="76" x2="56" y2="90" strokeWidth="0.5" fill="none" stroke={color}/>
      <line x1="70" y1="78" x2="70" y2="88" strokeWidth="0.5" fill="none" stroke={color}/>
      {/* frog body */}
      <path d="M 30 68
               Q 30 54, 50 50
               Q 70 54, 70 68
               Q 64 76, 50 76
               Q 36 76, 30 68 Z"/>
      {/* tucked legs */}
      <path d="M 30 70 Q 22 72, 18 80 Q 26 80, 32 74 Z"/>
      <path d="M 70 70 Q 78 72, 82 80 Q 74 80, 68 74 Z"/>
      {/* big bulging eyes */}
      <circle cx="40" cy="50" r="6" fill="#F5EBD6" stroke={color} strokeWidth="1"/>
      <circle cx="60" cy="50" r="6" fill="#F5EBD6" stroke={color} strokeWidth="1"/>
      <circle cx="40" cy="50" r="3" fill={color}/>
      <circle cx="60" cy="50" r="3" fill={color}/>
      <circle cx="39" cy="49" r="0.8" fill="#F5EBD6"/>
      <circle cx="59" cy="49" r="0.8" fill="#F5EBD6"/>
      {/* smiling mouth */}
      <path d="M 44 64 Q 50 68, 56 64" stroke="#F5EBD6" strokeWidth="0.8" fill="none"/>
      {/* body hatch */}
      <line x1="38" y1="62" x2="40" y2="66" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="46" y1="64" x2="48" y2="68" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="54" y1="64" x2="56" y2="68" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="62" y1="62" x2="64" y2="66" stroke="#F5EBD6" strokeWidth="0.5"/>
    </g>
  );
}

// RHODE ISLAND — anchor with rope.
function IconRI({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" transform="translate(0,14)">
      {/* top ring */}
      <circle cx="50" cy="26" r="5"/>
      <circle cx="50" cy="26" r="2" fill={color}/>
      {/* shank (vertical bar) */}
      <line x1="50" y1="31" x2="50" y2="74"/>
      {/* stock (horizontal crossbar) */}
      <line x1="38" y1="38" x2="62" y2="38" strokeWidth="2"/>
      <circle cx="38" cy="38" r="1.5" fill={color}/>
      <circle cx="62" cy="38" r="1.5" fill={color}/>
      {/* arms curving out at bottom */}
      <path d="M 50 74 Q 50 80, 38 76 L 30 70 L 34 76 Q 40 84, 50 80"/>
      <path d="M 50 74 Q 50 80, 62 76 L 70 70 L 66 76 Q 60 84, 50 80"/>
      {/* flukes (triangular ends) */}
      <path d="M 30 70 L 28 64 L 34 70 Z" fill={color}/>
      <path d="M 70 70 L 72 64 L 66 70 Z" fill={color}/>
      {/* rope wrap around ring + curving down */}
      <path d="M 56 22 Q 70 14, 80 22 Q 82 32, 76 38" strokeWidth="1" stroke={color} fill="none"/>
      <path d="M 76 38 Q 82 50, 76 60 Q 70 70, 76 80" strokeWidth="1" stroke={color} fill="none"/>
      {/* rope twist marks */}
      <line x1="60" y1="20" x2="62" y2="18" strokeWidth="0.7"/>
      <line x1="66" y1="18" x2="68" y2="16" strokeWidth="0.7"/>
      <line x1="74" y1="18" x2="76" y2="16" strokeWidth="0.7"/>
      <line x1="80" y1="28" x2="82" y2="26" strokeWidth="0.7"/>
      <line x1="78" y1="48" x2="80" y2="46" strokeWidth="0.7"/>
      <line x1="76" y1="70" x2="78" y2="68" strokeWidth="0.7"/>
    </g>
  );
}

// SOUTH CAROLINA — palmetto tree shaped like a water fountain: bushy fan of
// palmetto leaves arcing up and out from a central crown, with the crescent
// moon tucked to the upper-left.
function IconSC({ color = '#1B1F2A' }) {
  // Build a palmetto frond — a curved center vein with leaflet strokes
  // along both sides. Anchored at (x0,y0); tip at (x1,y1); curvature cx/cy.
  const Frond = ({ x0 = 50, y0 = 50, x1, y1, cx, cy, n = 7, side = 1, key }) => {
    const lines = [];
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      // quadratic bezier point
      const mt = 1 - t;
      const px = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
      const py = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      // tangent direction
      const dx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
      const dy = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
      // normal (perpendicular), scaled
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len, ny = dx / len;
      // leaflet length tapers toward tip
      const L = 4.5 * (1 - t * 0.55);
      // outward leaflet
      lines.push(
        <line key={'o-' + i} x1={px} y1={py}
          x2={px + nx * L * side} y2={py + ny * L * side}
          strokeWidth="0.8"/>
      );
      // inner small leaflet
      lines.push(
        <line key={'in-' + i} x1={px} y1={py}
          x2={px - nx * L * side * 0.35} y2={py - ny * L * side * 0.35}
          strokeWidth="0.6"/>
      );
    }
    return (
      <g>
        <path d={`M ${x0} ${y0} Q ${cx} ${cy}, ${x1} ${y1}`}
          stroke={color} strokeWidth="1.3" fill="none"
          strokeLinecap="round" strokeLinejoin="round"/>
        {lines}
        {/* leaflet tip flick */}
        <line x1={x1} y1={y1} x2={x1 + side * 2} y2={y1 - 1} strokeWidth="0.8"/>
      </g>
    );
  };

  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* crescent moon, upper-left */}
      <path d="M 20 28 Q 14 36, 20 44 Q 26 36, 20 28 Z" fill={color}/>

      {/* trunk — slim curve, centered */}
      <path d="M 47 92 Q 49 76, 50 56" strokeWidth="1.4"/>
      <path d="M 53 92 Q 51 76, 50 56" strokeWidth="1.4"/>
      {/* trunk segmentation */}
      {[86, 80, 74, 68, 62].map((y, i) => (
        <path key={i} d={`M 47 ${y} Q 50 ${y - 1.5}, 53 ${y}`} strokeWidth="0.7"/>
      ))}

      {/* crown knot (where all the leaves spring) */}
      <circle cx="50" cy="54" r="2.2" fill={color}/>

      {/* the bushy fountain of palmetto fronds — arranged like a fan */}
      {/* top spike */}
      <Frond x0={50} y0={54} x1={50} y1={20} cx={50} cy={36} n={7} side={1}/>
      {/* upper-left fronds */}
      <Frond x0={50} y0={54} x1={26} y1={22} cx={36} cy={32} n={7} side={1}/>
      <Frond x0={50} y0={54} x1={14} y1={32} cx={28} cy={36} n={7} side={1}/>
      <Frond x0={50} y0={54} x1={12} y1={48} cx={26} cy={46} n={7} side={1}/>
      {/* lower-left frond, arcing back down like fountain water */}
      <Frond x0={50} y0={54} x1={18} y1={66} cx={30} cy={56} n={6} side={1}/>
      {/* upper-right fronds */}
      <Frond x0={50} y0={54} x1={74} y1={22} cx={64} cy={32} n={7} side={-1}/>
      <Frond x0={50} y0={54} x1={86} y1={32} cx={72} cy={36} n={7} side={-1}/>
      <Frond x0={50} y0={54} x1={88} y1={48} cx={74} cy={46} n={7} side={-1}/>
      {/* lower-right frond */}
      <Frond x0={50} y0={54} x1={82} y1={66} cx={70} cy={56} n={6} side={-1}/>
      {/* a couple short inner fronds for fullness, no leaflet barbs */}
      <path d="M 50 54 Q 44 46, 38 42" strokeWidth="1"/>
      <path d="M 50 54 Q 56 46, 62 42" strokeWidth="1"/>
      <path d="M 50 54 Q 50 46, 48 38" strokeWidth="1"/>
      <path d="M 50 54 Q 50 46, 52 38" strokeWidth="1"/>

      {/* ground line + a couple grass tufts */}
      <line x1="14" y1="92" x2="86" y2="92" strokeWidth="0.7"/>
      <path d="M 30 92 Q 32 88, 34 92" strokeWidth="0.7"/>
      <path d="M 66 92 Q 68 88, 70 92" strokeWidth="0.7"/>
    </g>
  );
}

// TENNESSEE — acoustic guitar.
function IconTN({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* headstock */}
      <rect x="24" y="22" width="10" height="14" fill={color}/>
      {/* tuning pegs */}
      <circle cx="22" cy="25" r="1.2" fill={color}/>
      <circle cx="22" cy="29" r="1.2" fill={color}/>
      <circle cx="22" cy="33" r="1.2" fill={color}/>
      <circle cx="36" cy="25" r="1.2" fill={color}/>
      <circle cx="36" cy="29" r="1.2" fill={color}/>
      <circle cx="36" cy="33" r="1.2" fill={color}/>
      {/* nut */}
      <rect x="24" y="36" width="10" height="1.5" fill={color}/>
      {/* neck */}
      <rect x="26" y="38" width="6" height="22" fill={color} fillOpacity="0.18"/>
      <rect x="26" y="38" width="6" height="22"/>
      {/* frets */}
      <line x1="26" y1="42" x2="32" y2="42" strokeWidth="0.6"/>
      <line x1="26" y1="46" x2="32" y2="46" strokeWidth="0.6"/>
      <line x1="26" y1="50" x2="32" y2="50" strokeWidth="0.6"/>
      <line x1="26" y1="54" x2="32" y2="54" strokeWidth="0.6"/>
      <line x1="26" y1="58" x2="32" y2="58" strokeWidth="0.6"/>
      {/* body — figure-8 acoustic shape */}
      <path d="M 29 60
               Q 14 60, 14 72
               Q 14 88, 30 88
               L 44 88
               Q 60 88, 60 76
               Q 58 70, 50 68
               Q 44 66, 44 60
               Q 38 58, 29 60 Z" fill={color} fillOpacity="0.12"/>
      <path d="M 29 60
               Q 14 60, 14 72
               Q 14 88, 30 88
               L 44 88
               Q 60 88, 60 76
               Q 58 70, 50 68
               Q 44 66, 44 60
               Q 38 58, 29 60 Z"/>
      {/* sound hole */}
      <circle cx="32" cy="76" r="6"/>
      <circle cx="32" cy="76" r="4" strokeWidth="0.5"/>
      {/* bridge */}
      <rect x="22" y="84" width="20" height="2" fill={color}/>
      {/* strings — running from head to bridge across sound hole */}
      <line x1="27" y1="38" x2="22" y2="84" strokeWidth="0.5"/>
      <line x1="28" y1="38" x2="26" y2="84" strokeWidth="0.5"/>
      <line x1="29" y1="38" x2="30" y2="84" strokeWidth="0.5"/>
      <line x1="30" y1="38" x2="34" y2="84" strokeWidth="0.5"/>
      <line x1="31" y1="38" x2="38" y2="84" strokeWidth="0.5"/>
      <line x1="32" y1="38" x2="42" y2="84" strokeWidth="0.5"/>
      {/* musical notes flying out */}
      <g transform="translate(70,46)">
        <circle cx="0" cy="0" r="2" fill={color}/>
        <line x1="2" y1="0" x2="2" y2="-10" strokeWidth="1.4"/>
        <line x1="2" y1="-10" x2="6" y2="-12" strokeWidth="1.4"/>
      </g>
      <g transform="translate(76,62)">
        <circle cx="0" cy="0" r="1.6" fill={color}/>
        <line x1="1.6" y1="0" x2="1.6" y2="-8" strokeWidth="1.2"/>
      </g>
    </g>
  );
}

// VIRGINIA — dogwood flower (state flower).
function IconVA({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" transform="translate(0,12)">
      {/* 4 dogwood petals (heart-notched ends) */}
      {[0, 90, 180, 270].map((rot, i) => (
        <g key={i} transform={`rotate(${rot} 50 52)`}>
          <path d="M 50 52
                   Q 36 36, 44 26
                   L 48 30
                   L 50 26
                   L 52 30
                   L 56 26
                   Q 64 36, 50 52 Z" fill={color} fillOpacity="0.1"/>
          <path d="M 50 52
                   Q 36 36, 44 26
                   L 48 30
                   L 50 26
                   L 52 30
                   L 56 26
                   Q 64 36, 50 52 Z"/>
          <line x1="50" y1="52" x2="50" y2="30" strokeWidth="0.5"/>
        </g>
      ))}
      {/* center cluster */}
      <circle cx="50" cy="52" r="4" fill={color}/>
      <circle cx="48" cy="50" r="1" fill="#F5EBD6"/>
      <circle cx="52" cy="50" r="1" fill="#F5EBD6"/>
      <circle cx="48" cy="54" r="1" fill="#F5EBD6"/>
      <circle cx="52" cy="54" r="1" fill="#F5EBD6"/>
      <circle cx="50" cy="56" r="1" fill="#F5EBD6"/>
      <circle cx="50" cy="48" r="1" fill="#F5EBD6"/>
      {/* small leaves below */}
      <path d="M 50 78 Q 38 80, 32 86 Q 42 86, 50 82"/>
      <path d="M 50 78 Q 62 80, 68 86 Q 58 86, 50 82"/>
    </g>
  );
}

// VERMONT — sugar maple leaf, compressed to fit y=38–86.
function IconVT({ color = '#1B1F2A' }) {
  return (
    <g fill={color} stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M 50 38
               L 53 43 L 56 40 L 55 47 L 61 46 L 58 51 L 66 51 L 61 55
               L 69 58 L 61 61 L 65 66 L 58 65 L 60 71 L 55 69 L 56 74 L 53 71
               L 50 76
               L 47 71 L 44 74 L 45 69 L 40 71 L 42 65 L 35 66 L 39 61
               L 31 58 L 39 55 L 34 51 L 42 51 L 39 46 L 45 47 L 44 40 L 47 43 Z"/>
      <line x1="50" y1="46" x2="50" y2="74" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="50" y1="54" x2="40" y2="50" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="50" y1="54" x2="60" y2="50" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="50" y1="62" x2="40" y2="66" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="50" y1="62" x2="60" y2="66" stroke="#F5EBD6" strokeWidth="0.6"/>
      {/* stem */}
      <line x1="50" y1="76" x2="50" y2="86" strokeWidth="2" stroke={color} fill="none"/>
    </g>
  );
}

// WEST VIRGINIA — coal cart on mine tracks against the Appalachians.
function IconWV({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* Appalachian hills behind */}
      <path d="M 6 70 Q 18 56, 30 66 Q 42 56, 54 68 Q 66 56, 78 66 Q 90 60, 94 68 L 94 78 L 6 78 Z" fill={color} fillOpacity="0.12"/>
      <path d="M 6 70 Q 18 56, 30 66 Q 42 56, 54 68 Q 66 56, 78 66 Q 90 60, 94 68"/>
      <line x1="20" y1="66" x2="22" y2="70" strokeWidth="0.5"/>
      <line x1="44" y1="64" x2="46" y2="68" strokeWidth="0.5"/>
      <line x1="70" y1="64" x2="72" y2="68" strokeWidth="0.5"/>
      {/* mine tracks (foreground) */}
      <line x1="14" y1="82" x2="86" y2="82" strokeWidth="1.4"/>
      <line x1="14" y1="86" x2="86" y2="86" strokeWidth="1.4"/>
      {[20, 30, 40, 50, 60, 70, 80].map(x => (
        <line key={x} x1={x} y1="81" x2={x} y2="87" strokeWidth="0.7"/>
      ))}
      {/* coal cart body */}
      <path d="M 28 56 L 70 56 L 74 72 L 24 72 Z" fill={color} fillOpacity="0.1"/>
      <path d="M 28 56 L 70 56 L 74 72 L 24 72 Z"/>
      {/* cart side ribs */}
      <line x1="32" y1="58" x2="33" y2="70" strokeWidth="0.6"/>
      <line x1="38" y1="58" x2="39" y2="70" strokeWidth="0.6"/>
      <line x1="44" y1="58" x2="45" y2="70" strokeWidth="0.6"/>
      <line x1="50" y1="58" x2="51" y2="70" strokeWidth="0.6"/>
      <line x1="56" y1="58" x2="57" y2="70" strokeWidth="0.6"/>
      <line x1="62" y1="58" x2="63" y2="70" strokeWidth="0.6"/>
      <line x1="68" y1="58" x2="69" y2="70" strokeWidth="0.6"/>
      {/* heap of coal piled at top */}
      <path d="M 28 56 Q 36 46, 42 50 Q 50 42, 58 50 Q 64 44, 70 56 Z" fill={color}/>
      {/* coal chunk highlights */}
      <circle cx="36" cy="52" r="1.2" fill="#F5EBD6"/>
      <circle cx="46" cy="48" r="1.4" fill="#F5EBD6"/>
      <circle cx="56" cy="50" r="1.2" fill="#F5EBD6"/>
      <circle cx="62" cy="52" r="1" fill="#F5EBD6"/>
      <circle cx="41" cy="53" r="0.8" fill="#F5EBD6"/>
      <circle cx="51" cy="52" r="0.8" fill="#F5EBD6"/>
      {/* wheels */}
      <circle cx="32" cy="76" r="6" fill={color}/>
      <circle cx="32" cy="76" r="2" fill="#F5EBD6"/>
      <circle cx="66" cy="76" r="6" fill={color}/>
      <circle cx="66" cy="76" r="2" fill="#F5EBD6"/>
      {/* wheel spokes */}
      <line x1="32" y1="72" x2="32" y2="80" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="28" y1="76" x2="36" y2="76" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="66" y1="72" x2="66" y2="80" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="62" y1="76" x2="70" y2="76" stroke="#F5EBD6" strokeWidth="0.6"/>
    </g>
  );
}

export default {
  AL: IconAL, CT: IconCT, DC: IconDC, DE: IconDE, FL: IconFL, GA: IconGA, LA: IconLA,
  MA: IconMA, MD: IconMD, ME: IconME, MS: IconMS, NC: IconNC, NH: IconNH, NJ: IconNJ,
  NY: IconNY, PA: IconPA, PR: IconPR, RI: IconRI, SC: IconSC, TN: IconTN,
  VA: IconVA, VT: IconVT, WV: IconWV,
};
