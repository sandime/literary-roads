// Literary Roads — engraved state icons · CENTRAL region
// AR · IA · IL · IN · KS · KY · MI · MN · MO · ND · NE · OH · OK · SD · TX · WI


// ARKANSAS — faceted diamond gem (Crater of Diamonds State Park).
function IconAR({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" transform="translate(0,10)">
      {/* outer diamond shape */}
      <path d="M 28 46 L 50 28 L 72 46 L 50 86 Z" fill={color} fillOpacity="0.08"/>
      <path d="M 28 46 L 50 28 L 72 46 L 50 86 Z"/>
      {/* table (top facet) */}
      <line x1="28" y1="46" x2="72" y2="46"/>
      {/* crown facets */}
      <line x1="34" y1="46" x2="40" y2="34"/>
      <line x1="42" y1="46" x2="46" y2="32"/>
      <line x1="50" y1="46" x2="50" y2="28"/>
      <line x1="58" y1="46" x2="54" y2="32"/>
      <line x1="66" y1="46" x2="60" y2="34"/>
      {/* pavilion facets — meet at culet (point) */}
      <line x1="28" y1="46" x2="50" y2="86"/>
      <line x1="40" y1="46" x2="50" y2="86"/>
      <line x1="50" y1="46" x2="50" y2="86"/>
      <line x1="60" y1="46" x2="50" y2="86"/>
      <line x1="72" y1="46" x2="50" y2="86"/>
      <line x1="34" y1="46" x2="46" y2="76" strokeWidth="0.5"/>
      <line x1="66" y1="46" x2="54" y2="76" strokeWidth="0.5"/>
      {/* sparkle marks */}
      <g fill={color}>
        <path d="M 36 38 L 36.6 39.4 L 38 40 L 36.6 40.6 L 36 42 L 35.4 40.6 L 34 40 L 35.4 39.4 Z"/>
        <path d="M 64 56 L 64.6 57.4 L 66 58 L 64.6 58.6 L 64 60 L 63.4 58.6 L 62 58 L 63.4 57.4 Z"/>
      </g>
    </g>
  );
}

// IOWA — corn stalk, compressed to fit y=36–90 cleanly.
function IconIA({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* stalk */}
      <path d="M 50 90 L 50 44"/>
      {/* tassel at top */}
      <line x1="50" y1="44" x2="46" y2="38"/>
      <line x1="50" y1="44" x2="50" y2="36"/>
      <line x1="50" y1="44" x2="54" y2="38"/>
      <line x1="50" y1="44" x2="56" y2="40"/>
      <line x1="50" y1="44" x2="44" y2="40"/>
      {/* ear LEFT */}
      <ellipse cx="38" cy="64" rx="6" ry="12" transform="rotate(-12 38 64)"/>
      {[54, 58, 62, 66, 70].map(y => (
        <line key={'l' + y} x1="34" y1={y} x2="42" y2={y - 1} strokeWidth="0.6"/>
      ))}
      {/* husk leaf left */}
      <path d="M 38 52 Q 32 50, 28 48"/>
      {/* ear RIGHT */}
      <ellipse cx="62" cy="60" rx="6" ry="12" transform="rotate(12 62 60)"/>
      {[50, 54, 58, 62, 66].map(y => (
        <line key={'r' + y} x1="58" y1={y} x2="66" y2={y - 1} strokeWidth="0.6"/>
      ))}
      {/* husk leaf right */}
      <path d="M 62 48 Q 68 46, 72 44"/>
      {/* big leaves coming off stalk */}
      <path d="M 50 76 Q 32 78, 16 86"/>
      <path d="M 50 78 Q 32 84, 18 90" strokeWidth="0.7"/>
      <path d="M 50 70 Q 68 70, 82 76"/>
      <path d="M 50 72 Q 68 76, 84 78" strokeWidth="0.7"/>
    </g>
  );
}

// ILLINOIS — cardinal perched on branch.
function IconIL({ color = '#1B1F2A' }) {
  return (
    <g fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" transform="translate(0,10)">
      {/* branch */}
      <path d="M 14 76 L 86 78" fill="none" stroke={color} strokeWidth="1.3"/>
      <line x1="34" y1="76" x2="32" y2="72" stroke={color} strokeWidth="1" fill="none"/>
      <line x1="68" y1="78" x2="70" y2="74" stroke={color} strokeWidth="1" fill="none"/>
      {/* body */}
      <path d="M 36 60 Q 46 46, 62 48 Q 74 54, 70 68 Q 60 74, 46 72 Q 32 70, 36 60 Z"/>
      {/* head */}
      <circle cx="64" cy="42" r="8"/>
      {/* crest */}
      <path d="M 60 36 L 62 28 L 64 36 Z"/>
      <path d="M 64 34 L 66 26 L 68 32 Z"/>
      {/* beak */}
      <path d="M 70 44 L 78 44 L 70 46 Z" fill={color}/>
      {/* face mask */}
      <path d="M 60 44 Q 64 46, 68 44 Q 64 48, 60 46 Z" fill="#F5EBD6" stroke="none"/>
      {/* eye */}
      <circle cx="66" cy="40" r="0.8" fill="#F5EBD6"/>
      {/* wing */}
      <path d="M 46 58 Q 56 56, 64 62 Q 58 66, 50 66 Q 44 62, 46 58 Z" fill="#F5EBD6" stroke={color} strokeWidth="0.7"/>
      {/* tail */}
      <path d="M 32 64 L 18 60 L 22 64 L 18 70 L 32 70 Z"/>
      {/* legs */}
      <line x1="50" y1="72" x2="50" y2="78" strokeWidth="1.3" fill="none"/>
      <line x1="58" y1="72" x2="58" y2="78" strokeWidth="1.3" fill="none"/>
      {/* body hatch (fine) */}
      <line x1="44" y1="60" x2="46" y2="64" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="52" y1="64" x2="54" y2="68" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="60" y1="64" x2="62" y2="68" stroke="#F5EBD6" strokeWidth="0.6"/>
    </g>
  );
}

// INDIANA — auto-racing checkered flag (Indy 500).
function IconIN({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" transform="translate(0,12)">
      {/* flag pole */}
      <line x1="20" y1="88" x2="20" y2="30" strokeWidth="2"/>
      <circle cx="20" cy="28" r="1.5" fill={color}/>
      {/* flag — wavy rectangle with checkerboard */}
      {/* flag outline */}
      <path d="M 20 32
               Q 36 28, 50 32
               Q 64 36, 78 32
               L 78 64
               Q 64 68, 50 64
               Q 36 60, 20 64 Z" fill="none"/>
      {/* checker squares (6 wide × 3 tall) */}
      {Array.from({ length: 18 }).map((_, k) => {
        const col = k % 6, row = Math.floor(k / 6);
        if ((col + row) % 2 !== 0) return null;
        // skew rows along wave
        const x = 20 + col * 10;
        const yBase = 32 + row * 10;
        const wave = (col / 5) * 4 - 2;
        return (
          <rect key={k}
            x={x} y={yBase + wave * (row === 1 ? 0.5 : 1)}
            width="10" height="10.5" fill={color} stroke="none"/>
        );
      })}
      {/* re-overlay flag outline on top */}
      <path d="M 20 32
               Q 36 28, 50 32
               Q 64 36, 78 32
               L 78 64
               Q 64 68, 50 64
               Q 36 60, 20 64 Z" stroke={color} strokeWidth="1.4"/>
      {/* racing stripes at bottom (ground motion) */}
      <line x1="14" y1="80" x2="32" y2="80" strokeWidth="0.7"/>
      <line x1="40" y1="80" x2="60" y2="80" strokeWidth="0.7"/>
      <line x1="68" y1="80" x2="86" y2="80" strokeWidth="0.7"/>
      <line x1="14" y1="84" x2="86" y2="84" strokeWidth="0.5"/>
    </g>
  );
}

// KANSAS — sunflower, centered + sized to fit y=37–90.
function IconKS({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
      {/* center disc */}
      <circle cx="50" cy="60" r="8" fill={color}/>
      {/* seed pattern dots */}
      <circle cx="48" cy="58" r="0.7" fill="#F5EBD6"/>
      <circle cx="52" cy="58" r="0.7" fill="#F5EBD6"/>
      <circle cx="46" cy="62" r="0.7" fill="#F5EBD6"/>
      <circle cx="50" cy="64" r="0.7" fill="#F5EBD6"/>
      <circle cx="54" cy="60" r="0.7" fill="#F5EBD6"/>
      {/* petals — 16 around at smaller radius */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (Math.PI * 2 / 16) * i - Math.PI / 2;
        const cx = 50 + 14 * Math.cos(a);
        const cy = 60 + 14 * Math.sin(a);
        return (
          <ellipse key={i} cx={cx} cy={cy} rx="5" ry="2.5"
            transform={`rotate(${(a * 180 / Math.PI)} ${cx} ${cy})`}/>
        );
      })}
      {/* stem */}
      <path d="M 50 68 L 50 90" strokeWidth="1.5"/>
      {/* leaves */}
      <path d="M 50 78 Q 42 76, 36 80 Q 44 84, 50 80 Z"/>
      <path d="M 50 84 Q 58 82, 64 86 Q 56 90, 50 86 Z"/>
      <path d="M 50 79 Q 42 80, 38 81" strokeWidth="0.5"/>
      <path d="M 50 85 Q 58 86, 62 87" strokeWidth="0.5"/>
    </g>
  );
}

// KENTUCKY — horseshoe (centered), classic open-top U with nail holes.
function IconKY({ color = '#1B1F2A' }) {
  // outer + inner edges of the horseshoe — centered at (50, 60)
  const OUTER = "M 22 36 Q 22 84, 50 84 Q 78 84, 78 36 L 70 36 Q 70 76, 50 76 Q 30 76, 30 36 Z";
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* horseshoe body, filled */}
      <path d={OUTER} fill={color}/>
      {/* highlight rim, hairline */}
      <path d="M 24 36 Q 24 82, 50 82 Q 76 82, 76 36" fill="none" stroke="#F5EBD6" strokeWidth="0.5"/>
      <path d="M 32 36 Q 32 74, 50 74 Q 68 74, 68 36" fill="none" stroke="#F5EBD6" strokeWidth="0.4"/>
      {/* heel caulks (the small tabs at the open ends) */}
      <rect x="20" y="34" width="12" height="4" fill={color}/>
      <rect x="68" y="34" width="12" height="4" fill={color}/>
      {/* 8 nail holes around the curve */}
      {[
        [26, 46], [26, 58], [28, 70],
        [50, 80],
        [72, 70], [74, 58], [74, 46],
        [50, 40],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.4" fill="#F5EBD6" stroke={color} strokeWidth="0.5"/>
      ))}
      {/* shading hatch on the inside of the band */}
      <line x1="33" y1="50" x2="35" y2="54" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="33" y1="60" x2="35" y2="64" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="65" y1="50" x2="67" y2="54" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="65" y1="60" x2="67" y2="64" stroke="#F5EBD6" strokeWidth="0.5"/>
      {/* tiny clover / bluegrass beneath, low-contrast */}
      <line x1="14" y1="92" x2="86" y2="92" stroke={color} strokeWidth="0.6"/>
      <path d="M 22 92 Q 24 88, 26 92" stroke={color} strokeWidth="0.7" fill="none"/>
      <path d="M 74 92 Q 76 88, 78 92" stroke={color} strokeWidth="0.7" fill="none"/>
    </g>
  );
}

// MICHIGAN — Great Lakes lighthouse, repositioned to fit y=38–92.
function IconMI({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* tapered tower */}
      <path d="M 42 44 L 42 76 L 58 76 L 58 44 Z" fill={color} fillOpacity="0.08"/>
      <path d="M 42 44 L 42 76 L 58 76 L 58 44"/>
      {/* stripe bands */}
      <rect x="42" y="50" width="16" height="6" fill={color}/>
      <rect x="42" y="62" width="16" height="6" fill={color}/>
      {/* base */}
      <path d="M 36 76 L 64 76 L 62 82 L 38 82 Z" fill={color}/>
      {/* lantern room */}
      <rect x="44" y="38" width="12" height="6"/>
      <path d="M 44 38 Q 50 34, 56 38"/>
      {/* roof spike */}
      <line x1="50" y1="34" x2="50" y2="30"/>
      <circle cx="50" cy="29" r="1" fill={color}/>
      {/* light beams */}
      <line x1="44" y1="40" x2="32" y2="38" strokeWidth="0.6"/>
      <line x1="44" y1="42" x2="30" y2="44" strokeWidth="0.6"/>
      <line x1="56" y1="40" x2="68" y2="38" strokeWidth="0.6"/>
      <line x1="56" y1="42" x2="70" y2="44" strokeWidth="0.6"/>
      {/* water */}
      <path d="M 6 86 Q 18 84, 30 86 T 54 86 T 78 86 T 94 86" strokeWidth="0.7"/>
      <path d="M 6 92 Q 18 90, 30 92 T 54 92 T 78 92 T 94 92" strokeWidth="0.6"/>
    </g>
  );
}

// MINNESOTA — loon floating on a lake.
function IconMN({ color = '#1B1F2A' }) {
  return (
    <g fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
      {/* distant pine */}
      <g fill={color}>
        <path d="M 14 56 L 18 44 L 22 56 Z"/>
        <path d="M 12 64 L 18 52 L 24 64 Z"/>
        <rect x="17" y="64" width="2" height="3"/>
      </g>
      <g fill={color}>
        <path d="M 80 56 L 84 44 L 88 56 Z"/>
        <path d="M 78 64 L 84 52 L 90 64 Z"/>
        <rect x="83" y="64" width="2" height="3"/>
      </g>
      {/* loon body */}
      <path d="M 30 62 Q 36 54, 50 54 Q 66 54, 72 62 Q 68 70, 50 70 Q 32 70, 30 62 Z"/>
      {/* head & neck */}
      <path d="M 66 54 Q 68 46, 72 42 Q 76 40, 78 44 Q 76 48, 72 52 Z"/>
      {/* beak */}
      <path d="M 78 44 L 86 42 L 78 46 Z"/>
      {/* eye */}
      <circle cx="74" cy="46" r="0.9" fill="#F03A8E"/>
      <circle cx="74" cy="46" r="0.4" fill={color}/>
      {/* white stripe collar */}
      <path d="M 64 56 Q 66 60, 64 64" stroke="#F5EBD6" strokeWidth="2" fill="none"/>
      {/* checkered back pattern */}
      <line x1="40" y1="58" x2="42" y2="62" stroke="#F5EBD6" strokeWidth="0.7"/>
      <line x1="46" y1="58" x2="48" y2="62" stroke="#F5EBD6" strokeWidth="0.7"/>
      <line x1="52" y1="58" x2="54" y2="62" stroke="#F5EBD6" strokeWidth="0.7"/>
      <line x1="58" y1="58" x2="60" y2="62" stroke="#F5EBD6" strokeWidth="0.7"/>
      <line x1="42" y1="64" x2="44" y2="68" stroke="#F5EBD6" strokeWidth="0.7"/>
      <line x1="48" y1="64" x2="50" y2="68" stroke="#F5EBD6" strokeWidth="0.7"/>
      <line x1="54" y1="64" x2="56" y2="68" stroke="#F5EBD6" strokeWidth="0.7"/>
      {/* water — reflection lines */}
      <path d="M 10 76 Q 22 74, 34 76 T 58 76 T 82 76 T 92 76" strokeWidth="0.8" fill="none"/>
      <path d="M 10 82 Q 22 80, 34 82 T 58 82 T 82 82 T 92 82" strokeWidth="0.7" fill="none"/>
      <path d="M 10 88 Q 22 86, 34 88 T 58 88 T 82 88 T 92 88" strokeWidth="0.6" fill="none"/>
    </g>
  );
}

// MISSOURI — Gateway Arch + river.
function IconMO({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* outer parabolic arch */}
      <path d="M 16 80 Q 50 18, 84 80" strokeWidth="3"/>
      {/* inner parabolic arch (lighter) */}
      <path d="M 22 80 Q 50 28, 78 80" strokeWidth="0.6"/>
      {/* shading hatch on the inside */}
      <line x1="28" y1="40" x2="32" y2="42" strokeWidth="0.5"/>
      <line x1="36" y1="32" x2="40" y2="34" strokeWidth="0.5"/>
      <line x1="46" y1="28" x2="50" y2="30" strokeWidth="0.5"/>
      <line x1="56" y1="30" x2="60" y2="32" strokeWidth="0.5"/>
      <line x1="64" y1="36" x2="68" y2="38" strokeWidth="0.5"/>
      {/* riverside ground */}
      <line x1="6" y1="80" x2="94" y2="80" strokeWidth="0.8"/>
      {/* small skyline silhouette under arch */}
      <path d="M 32 80 L 32 74 L 38 74 L 38 76 L 42 76 L 42 72 L 46 72 L 46 76 L 52 76 L 52 70 L 56 70 L 56 76 L 64 76 L 64 74 L 68 74 L 68 80 Z" fill={color}/>
      {/* river waves */}
      <path d="M 6 84 Q 22 82, 38 84 T 70 84 T 94 84" strokeWidth="0.7"/>
      <path d="M 6 90 Q 22 88, 38 90 T 70 90 T 94 90" strokeWidth="0.6"/>
    </g>
  );
}

// NORTH DAKOTA — wheat sheaf, shortened so it fits y=40–90.
function IconND({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {[-1, 0, 1].map((offset, i) => {
        const baseX = 50 + offset * 12;
        const tipX = 50 + offset * 16;
        return (
          <g key={i}>
            {/* stem */}
            <path d={`M ${baseX} 80 Q ${baseX + offset} 64, ${tipX} 44`}/>
            {/* grain head — alternating leaflets */}
            {[44, 48, 52, 56, 60].map((y, j) => {
              const dx = (j % 2 === 0 ? -3 : 3);
              return (
                <ellipse key={j}
                  cx={tipX + dx} cy={y + j * 0.4} rx="2" ry="3"
                  transform={`rotate(${dx > 0 ? 30 : -30} ${tipX + dx} ${y + j * 0.4})`}/>
              );
            })}
            {/* awns from grain head */}
            <line x1={tipX - 2} y1="42" x2={tipX - 5} y2="38" strokeWidth="0.6"/>
            <line x1={tipX} y1="42" x2={tipX} y2="36" strokeWidth="0.6"/>
            <line x1={tipX + 2} y1="42" x2={tipX + 5} y2="38" strokeWidth="0.6"/>
          </g>
        );
      })}
      {/* twine wrap */}
      <path d="M 32 76 Q 50 80, 68 76 Q 50 78, 32 76" fill={color}/>
      <line x1="34" y1="76" x2="66" y2="76"/>
      <line x1="46" y1="74" x2="54" y2="74" strokeWidth="0.6"/>
      <line x1="46" y1="78" x2="54" y2="78" strokeWidth="0.6"/>
      {/* ground */}
      <line x1="14" y1="90" x2="86" y2="90" strokeWidth="0.7"/>
    </g>
  );
}

// NEBRASKA — covered wagon on the prairie.
function IconNE({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* wagon canopy */}
      <path d="M 24 64 Q 50 30, 76 64"/>
      <line x1="24" y1="64" x2="76" y2="64"/>
      {/* canopy ribs */}
      <line x1="34" y1="48" x2="34" y2="64" strokeWidth="0.5"/>
      <line x1="42" y1="40" x2="42" y2="64" strokeWidth="0.5"/>
      <line x1="50" y1="36" x2="50" y2="64" strokeWidth="0.5"/>
      <line x1="58" y1="40" x2="58" y2="64" strokeWidth="0.5"/>
      <line x1="66" y1="48" x2="66" y2="64" strokeWidth="0.5"/>
      {/* wagon body */}
      <rect x="22" y="64" width="56" height="14" fill={color} fillOpacity="0.1"/>
      <rect x="22" y="64" width="56" height="14"/>
      {/* wagon body planks */}
      <line x1="30" y1="64" x2="30" y2="78" strokeWidth="0.5"/>
      <line x1="42" y1="64" x2="42" y2="78" strokeWidth="0.5"/>
      <line x1="58" y1="64" x2="58" y2="78" strokeWidth="0.5"/>
      <line x1="70" y1="64" x2="70" y2="78" strokeWidth="0.5"/>
      {/* wagon wheels */}
      <circle cx="32" cy="80" r="8"/>
      <circle cx="32" cy="80" r="2.5" fill={color}/>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (Math.PI / 4) * i;
        return (
          <line key={i}
            x1={32 + 2.5 * Math.cos(a)} y1={80 + 2.5 * Math.sin(a)}
            x2={32 + 7.5 * Math.cos(a)} y2={80 + 7.5 * Math.sin(a)}
            strokeWidth="0.7"/>
        );
      })}
      <circle cx="68" cy="80" r="8"/>
      <circle cx="68" cy="80" r="2.5" fill={color}/>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (Math.PI / 4) * i;
        return (
          <line key={i}
            x1={68 + 2.5 * Math.cos(a)} y1={80 + 2.5 * Math.sin(a)}
            x2={68 + 7.5 * Math.cos(a)} y2={80 + 7.5 * Math.sin(a)}
            strokeWidth="0.7"/>
        );
      })}
      {/* prairie grass dashes */}
      <line x1="10" y1="90" x2="14" y2="90" strokeWidth="0.6"/>
      <line x1="86" y1="90" x2="90" y2="90" strokeWidth="0.6"/>
    </g>
  );
}

// OHIO — buckeye nut + leaf.
function IconOH({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* buckeye nut */}
      <circle cx="40" cy="58" r="14" fill={color}/>
      {/* light "buck eye" patch */}
      <ellipse cx="35" cy="55" rx="6" ry="4" fill="#F5EBD6"/>
      <ellipse cx="35" cy="55" rx="3" ry="2" fill={color}/>
      {/* stem nub */}
      <line x1="40" y1="44" x2="40" y2="40" strokeWidth="1.6"/>
      <circle cx="40" cy="38" r="1.5" fill={color}/>
      {/* compound leaf — 5 leaflets from a stem */}
      {/* stem out to upper right */}
      <line x1="50" y1="50" x2="78" y2="34"/>
      {/* leaflet 1 (top) */}
      <ellipse cx="76" cy="26" rx="3.5" ry="8" transform="rotate(20 76 26)"/>
      <line x1="76" y1="20" x2="76" y2="32" strokeWidth="0.5" transform="rotate(20 76 26)"/>
      {/* leaflet 2 */}
      <ellipse cx="82" cy="34" rx="3.5" ry="8" transform="rotate(70 82 34)"/>
      <line x1="82" y1="28" x2="82" y2="40" strokeWidth="0.5" transform="rotate(70 82 34)"/>
      {/* leaflet 3 (right) */}
      <ellipse cx="88" cy="42" rx="3.5" ry="8" transform="rotate(110 88 42)"/>
      <line x1="88" y1="36" x2="88" y2="48" strokeWidth="0.5" transform="rotate(110 88 42)"/>
      {/* leaflet 4 (left) */}
      <ellipse cx="66" cy="30" rx="3.5" ry="8" transform="rotate(-20 66 30)"/>
      <line x1="66" y1="24" x2="66" y2="36" strokeWidth="0.5" transform="rotate(-20 66 30)"/>
      {/* leaflet 5 (lower) */}
      <ellipse cx="78" cy="44" rx="3.5" ry="8" transform="rotate(60 78 44)"/>
      <line x1="78" y1="38" x2="78" y2="50" strokeWidth="0.5" transform="rotate(60 78 44)"/>
      {/* ground */}
      <line x1="14" y1="84" x2="86" y2="84" strokeWidth="0.7"/>
    </g>
  );
}

// OKLAHOMA — oil pump-jack on the plains.
function IconOK({ color = '#1B1F2A' }) {
  return (
    <g fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* sun on horizon */}
      <circle cx="78" cy="38" r="5"/>
      <line x1="68" y1="38" x2="70" y2="38"/>
      <line x1="78" y1="28" x2="78" y2="30"/>
      <line x1="86" y1="38" x2="88" y2="38"/>
      {/* derrick A-frame base */}
      <line x1="20" y1="86" x2="32" y2="56"/>
      <line x1="44" y1="86" x2="32" y2="56"/>
      {/* horizontal cross bars on derrick */}
      <line x1="22" y1="80" x2="42" y2="80" strokeWidth="0.6"/>
      <line x1="25" y1="72" x2="39" y2="72" strokeWidth="0.6"/>
      <line x1="28" y1="64" x2="36" y2="64" strokeWidth="0.6"/>
      <line x1="22" y1="80" x2="42" y2="72" strokeWidth="0.5"/>
      <line x1="42" y1="80" x2="22" y2="72" strokeWidth="0.5"/>
      {/* walking beam (top horizontal bar) */}
      <rect x="30" y="52" width="32" height="6" fill={color}/>
      {/* horse head — pumping down at right */}
      <path d="M 60 50 L 70 50 L 72 56 L 70 60 L 60 60 Z" fill={color}/>
      {/* pivot */}
      <circle cx="32" cy="55" r="2" fill={color}/>
      <circle cx="44" cy="55" r="2" fill={color}/>
      {/* polished rod going to the well */}
      <line x1="66" y1="60" x2="66" y2="80" strokeWidth="2"/>
      {/* well housing */}
      <rect x="60" y="80" width="14" height="6" fill={color}/>
      {/* ground */}
      <line x1="14" y1="86" x2="86" y2="86" strokeWidth="0.7"/>
      <line x1="18" y1="90" x2="24" y2="90" strokeWidth="0.5"/>
      <line x1="30" y1="90" x2="36" y2="90" strokeWidth="0.5"/>
      <line x1="46" y1="90" x2="54" y2="90" strokeWidth="0.5"/>
    </g>
  );
}

// SOUTH DAKOTA — Mt. Rushmore (4 abstract face silhouettes).
function IconSD({ color = '#1B1F2A' }) {
  return (
    <g fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" transform="translate(0,8)">
      {/* mountain base */}
      <path d="M 6 86 L 14 78 L 22 70 L 28 66 L 36 60 L 50 56 L 64 60 L 72 66 L 80 72 L 88 80 L 94 86 Z"/>
      {/* 4 face heads (simplified profiles) */}
      {/* Washington */}
      <g transform="translate(20,38)">
        <circle cx="0" cy="0" r="5" fill="#F5EBD6" stroke={color} strokeWidth="0.7"/>
        <path d="M -4 1 L -6 4 L -3 3 L -2 6 L 2 6 L 3 3 L 6 4 L 4 1" fill="#F5EBD6" stroke={color} strokeWidth="0.7"/>
        <circle cx="-1.5" cy="-1" r="0.6" fill={color}/>
      </g>
      {/* Jefferson */}
      <g transform="translate(36,32)">
        <circle cx="0" cy="0" r="5" fill="#F5EBD6" stroke={color} strokeWidth="0.7"/>
        <path d="M -4 1 L -6 4 L -3 3 L -2 6 L 2 6 L 3 3 L 6 4 L 4 1" fill="#F5EBD6" stroke={color} strokeWidth="0.7"/>
        <circle cx="-1.5" cy="-1" r="0.6" fill={color}/>
      </g>
      {/* Roosevelt */}
      <g transform="translate(56,32)">
        <circle cx="0" cy="0" r="5" fill="#F5EBD6" stroke={color} strokeWidth="0.7"/>
        <path d="M -4 1 L -6 4 L -3 3 L -2 6 L 2 6 L 3 3 L 6 4 L 4 1" fill="#F5EBD6" stroke={color} strokeWidth="0.7"/>
        {/* roosevelt's specs */}
        <circle cx="-1.8" cy="-1" r="1.2" fill="none" stroke={color} strokeWidth="0.5"/>
        <circle cx="1.4" cy="-1" r="1.2" fill="none" stroke={color} strokeWidth="0.5"/>
        {/* mustache */}
        <path d="M -2 1.5 Q 0 2.5, 2 1.5" stroke={color} strokeWidth="0.6" fill="none"/>
      </g>
      {/* Lincoln */}
      <g transform="translate(76,38)">
        <circle cx="0" cy="0" r="5" fill="#F5EBD6" stroke={color} strokeWidth="0.7"/>
        <path d="M -4 1 L -6 4 L -3 3 L -2 6 L 2 6 L 3 3 L 6 4 L 4 1" fill="#F5EBD6" stroke={color} strokeWidth="0.7"/>
        <circle cx="-1.5" cy="-1" r="0.6" fill={color}/>
        {/* beard */}
        <path d="M -3 3 L -4 7 L -1 6 L 0 8 L 1 6 L 4 7 L 3 3" fill={color} stroke="none"/>
      </g>
      {/* rock crack lines */}
      <line x1="14" y1="60" x2="20" y2="76" stroke="#F5EBD6" strokeWidth="0.6"/>
      <line x1="50" y1="50" x2="44" y2="68" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="76" y1="56" x2="84" y2="74" stroke="#F5EBD6" strokeWidth="0.6"/>
    </g>
  );
}

// TEXAS — lone star (filled) with rays + mesas, centered + sized to clear banner.
function IconTX({ color = '#1B1F2A' }) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 16 : 7;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(62 + r * Math.sin(a)).toFixed(2)}`);
  }
  return (
    <g fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <polygon points={pts.join(' ')} fill={color} fillOpacity="1"/>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x1 = 50 + 19 * Math.cos(a);
        const y1 = 62 + 19 * Math.sin(a);
        const x2 = 50 + (i % 2 === 0 ? 24 : 22) * Math.cos(a);
        const y2 = 62 + (i % 2 === 0 ? 24 : 22) * Math.sin(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1"/>;
      })}
      <line x1="6" y1="88" x2="94" y2="88"/>
      <path d="M 14 88 L 14 82 L 24 82 L 24 86 L 38 86 L 38 88"/>
      <path d="M 60 88 L 60 84 L 76 84 L 76 88"/>
      <line x1="16" y1="84" x2="22" y2="84" strokeWidth="0.6"/>
      <line x1="62" y1="86" x2="74" y2="86" strokeWidth="0.6"/>
      <line x1="8" y1="92" x2="20" y2="92" strokeWidth="0.6"/>
      <line x1="28" y1="92" x2="40" y2="92" strokeWidth="0.6"/>
      <line x1="48" y1="92" x2="60" y2="92" strokeWidth="0.6"/>
      <line x1="68" y1="92" x2="84" y2="92" strokeWidth="0.6"/>
    </g>
  );
}

// WISCONSIN — wedge of cheese with holes.
function IconWI({ color = '#1B1F2A' }) {
  return (
    <g fill={color} stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {/* cheese wedge — chunky triangle with thickness */}
      <path d="M 16 78 L 84 60 L 84 76 L 16 84 Z"/>
      <path d="M 16 78 L 84 60 L 70 50 L 16 64 Z" fillOpacity="0.4"/>
      <path d="M 16 64 L 16 78 L 16 84"/>
      {/* outer outline */}
      <path d="M 16 64 L 16 84 L 84 76 L 84 60 L 70 50 L 16 64 Z" fill="none" stroke={color} strokeWidth="1.4"/>
      {/* holes (eyes of cheese) */}
      <ellipse cx="34" cy="74" rx="3" ry="2.2" fill="#F5EBD6"/>
      <ellipse cx="52" cy="70" rx="3.5" ry="2.5" fill="#F5EBD6"/>
      <ellipse cx="70" cy="66" rx="2.6" ry="2" fill="#F5EBD6"/>
      <ellipse cx="44" cy="78" rx="2.2" ry="1.6" fill="#F5EBD6"/>
      <ellipse cx="62" cy="74" rx="2" ry="1.4" fill="#F5EBD6"/>
      {/* hatch on rind */}
      <line x1="20" y1="68" x2="30" y2="66" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="40" y1="64" x2="58" y2="60" stroke="#F5EBD6" strokeWidth="0.5"/>
      <line x1="68" y1="56" x2="78" y2="54" stroke="#F5EBD6" strokeWidth="0.5"/>
      {/* ground line */}
      <line x1="14" y1="88" x2="86" y2="88" strokeWidth="0.7" stroke={color} fill="none"/>
    </g>
  );
}

export default {
  AR: IconAR, IA: IconIA, IL: IconIL, IN: IconIN, KS: IconKS, KY: IconKY,
  MI: IconMI, MN: IconMN, MO: IconMO, ND: IconND, NE: IconNE, OH: IconOH,
  OK: IconOK, SD: IconSD, TX: IconTX, WI: IconWI,
};
