import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import iconsEast from './postcard-icons/state-icons-east.jsx';
import iconsCentral from './postcard-icons/state-icons-central.jsx';
import iconsWest from './postcard-icons/state-icons-west.jsx';

// ── Merged STATE_ICONS map ──────────────────────────────────────────────────────
const STATE_ICONS = { ...iconsEast, ...iconsCentral, ...iconsWest };

// ── BP palette (exact hex from HTML source) ─────────────────────────────────────
const BP = {
  navy:      '#10162B',
  navyDeep:  '#0A0F20',
  navyLift:  '#1A2342',
  panelLine: '#2A335A',
  ink:       '#1B1F2A',
  cream:     '#F5EBD6',
  creamHi:   '#FFF8E6',
  toast:     '#EADFC4',
  cyan:      '#39E0D6',
  pink:      '#F23D8E',
  orange:    '#F5812A',
  mustard:   '#F4C740',
  teal:      '#34B7AE',
  terra:     '#B96A3E',
  plum:      '#8E5A86',
  paperDot:  '#C7BB9E',
  sub:       '#6F7388',
};

// ── Icon pipeline ───────────────────────────────────────────────────────────────
// ICON_TPL: code → SVG string with __INK__ and #F5EBD6 sentinels
const ICON_TPL = {};

function getIconTpl(code) {
  if (ICON_TPL[code]) return ICON_TPL[code];
  const Icon = STATE_ICONS[code] || STATE_ICONS['FL'];
  if (!Icon) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>';
  const inner = renderToStaticMarkup(<Icon color="__INK__" />);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${inner}</svg>`;
  ICON_TPL[code] = svg;
  return svg;
}

function loadIcon(svg) {
  return new Promise(res => {
    const i = new Image();
    i.onload = () => res(i);
    i.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  });
}

const _icache = {};
async function getIcon(code, color, paper) {
  const k = code + '|' + color + '|' + paper;
  if (_icache[k]) return _icache[k];
  const tpl = getIconTpl(code);
  const svg = tpl
    .split('__INK__').join(color)
    .split('#F5EBD6').join(paper || '#F5EBD6')
    .split('#f5ebd6').join(paper || '#F5EBD6');
  const img = await loadIcon(svg);
  _icache[k] = img;
  return img;
}

// ── Primitives ──────────────────────────────────────────────────────────────────
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function spaced(ctx, t, x, y, sp) {
  const o = ctx.letterSpacing;
  try { ctx.letterSpacing = sp + 'px'; } catch (e) {}
  ctx.fillText(t, x, y);
  try { ctx.letterSpacing = o; } catch (e) {}
}

function spacedR(ctx, t, x, y, sp) {
  const o = ctx.letterSpacing;
  try { ctx.letterSpacing = sp + 'px'; } catch (e) {}
  ctx.fillText(t, x, y);
  try { ctx.letterSpacing = o; } catch (e) {}
}

function fitFont(ctx, t, maxW, size, weight, fam) {
  let s = size;
  while (s > 6) {
    ctx.font = `${weight} ${s}px ${fam}`;
    if (ctx.measureText(t).width <= maxW) break;
    s -= 1;
  }
  return s;
}

function wrap(ctx, t, maxW) {
  const w = t.split(' '), L = [];
  let c = '';
  for (const word of w) {
    const tr = c ? c + ' ' + word : word;
    if (ctx.measureText(tr).width > maxW && c) { L.push(c); c = word; }
    else c = tr;
  }
  if (c) L.push(c);
  return L;
}

function fitWrap(ctx, t, maxW, size, maxLines, fam) {
  let s = size, lines;
  for (;;) {
    ctx.font = `700 ${s}px ${fam}`;
    lines = wrap(ctx, t, maxW);
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
    if ((widest <= maxW && lines.length <= maxLines) || s <= 13) { break; }
    s -= 1.5;
  }
  return { size: s, lines };
}

function sunburst(ctx, cx, cy, r, rays, color, inner) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const len = (i % 2 ? r * 0.62 : r);
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -3.2);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, inner, 0, 7);
  ctx.fill();
  ctx.restore();
}

function diamond(ctx, cx, cy, s, fill, shadow) {
  ctx.save();
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - s + 2); ctx.lineTo(cx + s + 2, cy + 2);
    ctx.lineTo(cx + 2, cy + s + 2); ctx.lineTo(cx - s + 2, cy + 2);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function star4(ctx, cx, cy, r, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const ox = Math.cos(a), oy = Math.sin(a);
    ctx.lineTo(cx + ox * r, cy + oy * r);
    const a2 = a + Math.PI / 4;
    ctx.lineTo(cx + Math.cos(a2) * r * 0.34, cy + Math.sin(a2) * r * 0.34);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function neonText(ctx, t, x, y, size, fill, stroke) {
  ctx.save();
  ctx.font = `700 ${size}px "Space Grotesk"`;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = stroke; ctx.shadowBlur = size * 0.32;
  ctx.fillStyle = fill; ctx.fillText(t, x, y);
  ctx.shadowBlur = size * 0.16; ctx.fillText(t, x, y);
  ctx.lineWidth = Math.max(2, size * 0.022);
  ctx.strokeStyle = stroke; ctx.strokeText(t, x, y);
  ctx.restore();
}

function blockText(ctx, t, x, y, size, fill, shadow) {
  ctx.save();
  ctx.font = `700 ${size}px "Space Grotesk"`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = shadow; ctx.fillText(t, x + size * 0.045, y + size * 0.045);
  ctx.fillStyle = fill; ctx.fillText(t, x, y);
  ctx.restore();
}

function roundel(ctx, cx, cy, r, o) {
  ctx.save();
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 18; }
  ctx.fillStyle = o.disc;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = o.ring; ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.92, 0, 7); ctx.stroke();
  ctx.lineWidth = r * 0.022;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, 7); ctx.stroke();

  const arc = (txt, radius, start, dir) => {
    ctx.save();
    ctx.fillStyle = o.mono;
    ctx.font = `700 ${r * 0.13}px "Space Grotesk"`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    const step = (r * 0.13 * 1.7) / radius;
    let a = start;
    for (const ch of txt) {
      ctx.save();
      ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      ctx.rotate(a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2));
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      a += step * dir;
    }
    ctx.restore();
  };

  arc('LITERARY ROADS', r * 0.82, -Math.PI * 0.78, 1);
  arc('ROADWORTHY POST', r * 0.82, Math.PI * 0.78, -1);

  ctx.fillStyle = o.mono; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${r * 0.5}px Fraunces`;
  ctx.fillText('LR', cx, cy + r * 0.02);
  star4(ctx, cx, cy - r * 0.34, r * 0.1, o.star);
  ctx.restore();
}

function book3D(ctx, x, y, w, h, d) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 40;
  ctx.shadowOffsetX = -14; ctx.shadowOffsetY = 24;
  ctx.fillStyle = '#101626'; rr(ctx, x, y, w, h, 4); ctx.fill();
  ctx.restore();
  // page block (right)
  ctx.save();
  ctx.fillStyle = '#E7DCC0'; ctx.fillRect(x + w - 2, y + 6, 12, h - 12);
  ctx.strokeStyle = '#C7B998'; ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + w + 1 + i * 1.8, y + 8);
    ctx.lineTo(x + w + 1 + i * 1.8, y + h - 8);
    ctx.stroke();
  }
  ctx.restore();
  // front face gradient
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#2A3358'); g.addColorStop(0.55, '#1C2647'); g.addColorStop(1, '#121A34');
  ctx.fillStyle = g; rr(ctx, x, y, w, h, 4); ctx.fill();
  // spine highlight (left)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 6, y + 6, 10, h - 12);
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x, y, 6, h);
  // inner keyline
  ctx.strokeStyle = BP.cyan; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5;
  rr(ctx, x + 16, y + 18, w - 32, h - 36, 2); ctx.stroke(); ctx.globalAlpha = 1;
  // title type
  ctx.fillStyle = BP.cream; ctx.textAlign = 'center';
  ctx.font = '600 13px "Space Grotesk"'; ctx.fillText('NOW READING', x + w / 2, y + 50);
  ctx.fillStyle = BP.cyan; ctx.beginPath(); ctx.arc(x + w / 2, y + 64, 2.5, 0, 7); ctx.fill();
  const maxTW = w - 58;
  const fw = fitWrap(ctx, d.title, maxTW, 30, 4, 'Fraunces');
  ctx.font = `700 ${fw.size}px Fraunces`; ctx.fillStyle = BP.creamHi;
  const lh = fw.size * 1.06;
  let ty = y + h / 2 - ((fw.lines.length - 1) * lh / 2) + fw.size * 0.34;
  for (const ln of fw.lines) { ctx.fillText(ln, x + w / 2, ty); ty += lh; }
  ctx.fillStyle = BP.toast; ctx.font = 'italic 17px Fraunces';
  ctx.fillText('by ' + d.author, x + w / 2, y + h - 46);
  ctx.textAlign = 'left';
}

function flatBook(ctx, x, y, w, h, d) {
  ctx.save();
  // hard shadow
  ctx.fillStyle = BP.ink; rr(ctx, x + 8, y + 8, w, h, 3); ctx.fill();
  // panel
  ctx.fillStyle = BP.plum; rr(ctx, x, y, w, h, 3); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = BP.ink; rr(ctx, x, y, w, h, 3); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = BP.mustard; ctx.font = '700 14px "Space Grotesk"';
  const ol = ctx.letterSpacing;
  try { ctx.letterSpacing = '3px'; } catch (e) {}
  ctx.fillText('NOW READING', x + w / 2, y + 54);
  try { ctx.letterSpacing = ol; } catch (e) {}
  // decorative rule
  ctx.strokeStyle = BP.creamHi; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + w / 2 - 34, y + 72); ctx.lineTo(x + w / 2 + 34, y + 72); ctx.stroke();
  diamond(ctx, x + w / 2, y + 72, 5, BP.mustard, null);
  const fw = fitWrap(ctx, d.title, w - 52, 40, 4, 'Fraunces');
  ctx.font = `700 ${fw.size}px Fraunces`; ctx.fillStyle = BP.creamHi;
  const lh = fw.size * 1.05;
  let ty = y + h / 2 - ((fw.lines.length - 1) * lh / 2) + 6;
  for (const ln of fw.lines) { ctx.fillText(ln, x + w / 2, ty); ty += lh; }
  ctx.strokeStyle = BP.creamHi; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + w / 2 - 46, y + h - 70); ctx.lineTo(x + w / 2 + 46, y + h - 70); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = BP.creamHi; ctx.font = 'italic 19px Fraunces';
  ctx.fillText('by ' + d.author, x + w / 2, y + h - 44);
  ctx.textAlign = 'left'; ctx.restore();
}

function pill(ctx, x, y, label, mode, color) {
  ctx.save();
  ctx.font = '700 19px "Space Grotesk"';
  const ol = ctx.letterSpacing;
  try { ctx.letterSpacing = '1.5px'; } catch (e) {}
  const w = ctx.measureText(label).width + (ol !== undefined ? 34 : 34), h = 42;
  if (mode === 'neon') {
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    rr(ctx, x, y, w + 18, h, 21); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 26, y + h / 2 + 1);
  } else {
    ctx.fillStyle = BP.ink; rr(ctx, x + 4, y + 4, w + 18, h, 21); ctx.fill();
    ctx.fillStyle = color; rr(ctx, x, y, w + 18, h, 21); ctx.fill();
    ctx.fillStyle = (color === BP.pink ? BP.creamHi : BP.ink);
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 26, y + h / 2 + 1);
  }
  try { ctx.letterSpacing = ol; } catch (e) {}
  ctx.restore();
  return w + 18;
}

function pillRow(ctx, x, y, vibes, mode) {
  const cols = [BP.cyan, BP.pink, BP.orange];
  const colsB = [BP.mustard, BP.teal, BP.pink];
  let cx = x;
  vibes.slice(0, 3).forEach((v, i) => {
    const w = pill(ctx, cx, y, v, mode, (mode === 'neon' ? cols : colsB)[i % 3]);
    cx += w + 14;
  });
}

// ── Stamp ────────────────────────────────────────────────────────────────────────
const STAMP_THEME = {
  neon: {
    paper: '#0A0F20', frame: BP.cyan, line: BP.cyan, icon: BP.cyan,
    text: BP.cream, sub: BP.cyan, denomBg: BP.pink, denomInk: '#10162B', glow: BP.cyan,
  },
  block: {
    paper: BP.mustard, frame: BP.ink, line: BP.ink, icon: BP.ink,
    text: BP.ink, sub: BP.ink, denomBg: BP.pink, denomInk: BP.creamHi, glow: null,
  },
};

function drawStamp(ctx, x, y, w, themeName, iconImg, st, perf) {
  const h = w * 1.25, T = STAMP_THEME[themeName];
  ctx.save(); ctx.translate(x, y);
  // paper
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, w, h);
  // perforations
  ctx.fillStyle = perf;
  const rp = w * 0.026, cols = 11, rows = 14;
  for (let i = 0; i < cols; i++) {
    const px = (i / (cols - 1)) * w;
    ctx.beginPath(); ctx.arc(px, 0, rp, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(px, h, rp, 0, 7); ctx.fill();
  }
  for (let j = 0; j < rows; j++) {
    const py = (j / (rows - 1)) * h;
    ctx.beginPath(); ctx.arc(0, py, rp, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(w, py, rp, 0, 7); ctx.fill();
  }
  // double frame
  const m = w * 0.085;
  ctx.strokeStyle = T.frame;
  if (T.glow) { ctx.shadowColor = T.glow; ctx.shadowBlur = 10; }
  ctx.lineWidth = w * 0.025; ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);
  ctx.shadowBlur = 0;
  ctx.lineWidth = w * 0.008; ctx.strokeRect(m + w * 0.03, m + w * 0.03, w - 2 * m - w * 0.06, h - 2 * m - w * 0.06);
  // top banner
  ctx.fillStyle = T.text; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${w * 0.05}px "Space Grotesk"`;
  const ol = ctx.letterSpacing;
  try { ctx.letterSpacing = '1.5px'; } catch (e) {}
  ctx.fillText('U·S· LITERARY ROADS', w / 2, m + w * 0.105);
  try { ctx.letterSpacing = ol; } catch (e) {}
  ctx.strokeStyle = T.line; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(m + w * 0.06, m + w * 0.135); ctx.lineTo(w - m - w * 0.06, m + w * 0.135); ctx.stroke();
  // state name
  const sName = (st.name || st.state || '').toUpperCase();
  const ns = fitFont(ctx, sName, w - 2 * m - w * 0.1, w * 0.115, '700', '"Space Grotesk"');
  ctx.fillStyle = T.text; ctx.font = `700 ${ns}px "Space Grotesk"`; ctx.fillText(sName, w / 2, m + w * 0.255);
  // engraved icon
  if (T.glow) { ctx.shadowColor = T.glow; ctx.shadowBlur = 8; }
  const isz = w * 0.46; ctx.drawImage(iconImg, w / 2 - isz / 2, m + w * 0.32, isz, isz); ctx.shadowBlur = 0;
  // nickname
  ctx.fillStyle = T.sub; ctx.font = `italic ${w * 0.058}px Fraunces`;
  ctx.fillText(st.nickname, w / 2, h - m - w * 0.2);
  // big code
  ctx.fillStyle = T.text; ctx.font = `700 ${w * 0.16}px Fraunces`;
  const ol2 = ctx.letterSpacing;
  try { ctx.letterSpacing = '3px'; } catch (e) {}
  ctx.fillText(st.code, w / 2, h - m - w * 0.075);
  try { ctx.letterSpacing = ol2; } catch (e) {}
  // denomination shield
  const dx = w - m - w * 0.12, dy = h - m - w * 0.12, ds = w * 0.085;
  ctx.fillStyle = T.denomBg;
  ctx.beginPath();
  ctx.moveTo(dx, dy - ds); ctx.lineTo(dx + ds, dy - ds * 0.3);
  ctx.lineTo(dx + ds * 0.62, dy + ds * 0.85); ctx.lineTo(dx - ds * 0.62, dy + ds * 0.85);
  ctx.lineTo(dx - ds, dy - ds * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = T.denomInk; ctx.font = `700 ${w * 0.07}px Fraunces`;
  ctx.fillText('4¢', dx, dy + ds * 0.45);
  ctx.textAlign = 'left'; ctx.restore();
}

// ── Card A ────────────────────────────────────────────────────────────────────────
function drawCardA(ctx, d, icon) {
  const W = 1080, H = 1350;
  const g = ctx.createRadialGradient(W * 0.3, H * 0.06, 0, W * 0.3, H * 0.06, W * 1.15);
  g.addColorStop(0, BP.navyLift); g.addColorStop(0.52, BP.navy); g.addColorStop(1, BP.navyDeep);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // dot grid
  ctx.fillStyle = 'rgba(42,51,90,0.5)';
  for (let y = 24; y < H; y += 26) for (let x = 24; x < W; x += 26) {
    ctx.beginPath(); ctx.arc(x, y, 1.1, 0, 7); ctx.fill();
  }
  // sparkles
  star4(ctx, 940, 250, 9, BP.cyan); star4(ctx, 150, 640, 7, BP.pink);
  star4(ctx, 1010, 760, 6, BP.mustard); diamond(ctx, 470, 150, 5, BP.orange, null);
  star4(ctx, 560, 1120, 6, BP.cyan);
  // eyebrow
  ctx.save();
  ctx.font = '500 19px "Space Grotesk"'; ctx.fillStyle = BP.cyan;
  ctx.shadowColor = BP.cyan; ctx.shadowBlur = 12; ctx.textBaseline = 'alphabetic';
  spaced(ctx, '✦ NOW READING', 78, 112, 6);
  ctx.restore();
  // hero
  ctx.fillStyle = BP.cream; ctx.font = 'italic 42px Fraunces'; ctx.fillText('Greetings from —', 78, 205);
  const hs = fitFont(ctx, d.state.toUpperCase() + '.', 646, 128, '700', '"Space Grotesk"');
  neonText(ctx, d.state.toUpperCase() + '.', 78, 205 + hs * 0.86, hs, BP.pink, BP.cyan);
  // stamp top-right
  drawStamp(ctx, 748, 66, 272, 'neon', icon, d, BP.navy);
  // book
  book3D(ctx, 92, 470, 300, 452, d);
  // message
  ctx.fillStyle = BP.cream; ctx.font = 'italic 30px Fraunces';
  const ml = wrap(ctx, '"' + d.message + '"', 520);
  let my = 520;
  for (const ln of ml) { ctx.fillText(ln, 470, my); my += 44; }
  // signature
  my += 18;
  ctx.fillStyle = BP.cream; ctx.font = 'italic 27px Fraunces';
  const sigPre = '— Yours, between miles, ';
  ctx.fillText(sigPre, 470, my);
  const sigX = 470 + ctx.measureText(sigPre).width;
  ctx.save();
  ctx.fillStyle = BP.cyan; ctx.shadowColor = BP.cyan; ctx.shadowBlur = 10;
  ctx.font = '700 30px Fraunces'; ctx.fillText(d.sign, sigX, my + 1);
  ctx.restore();
  // title plate
  ctx.fillStyle = BP.creamHi; ctx.font = '700 40px Fraunces';
  const tl = wrap(ctx, d.title, 360); let tty = 1000;
  for (const ln of tl) { ctx.fillText(ln, 92, tty); tty += 46; }
  ctx.fillStyle = BP.toast; ctx.font = 'italic 23px Fraunces';
  ctx.fillText('by ' + d.author, 92, tty + 6);
  // pills
  pillRow(ctx, 470, 978, d.vibes, 'neon');
  // hashtags
  ctx.fillStyle = BP.cyan; ctx.globalAlpha = 0.9;
  ctx.font = '500 19px "Space Grotesk"';
  ctx.fillText(d.tags.join('  '), 470, 1090);
  ctx.globalAlpha = 1;
  // roundel
  roundel(ctx, 150, 1212, 66, { disc: BP.navy, ring: BP.cream, mono: BP.cyan, star: BP.pink, glow: BP.cyan });
  // posted block
  ctx.fillStyle = 'rgba(245,235,214,0.6)'; ctx.textAlign = 'right';
  ctx.font = '500 17px "Space Grotesk"';
  spacedR(ctx, 'POSTED · ' + d.date, 1002, 1252, 3.5);
  spacedR(ctx, 'N° ' + d.no, 1002, 1282, 3.5);
  ctx.textAlign = 'left';
}

// ── Card B ────────────────────────────────────────────────────────────────────────
function drawCardB(ctx, d, icon) {
  const W = 1080, H = 1350;
  ctx.fillStyle = BP.cream; ctx.fillRect(0, 0, W, H);
  // paper dots
  ctx.fillStyle = 'rgba(199,187,158,0.5)';
  for (let y = 20; y < H; y += 24) for (let x = 20; x < W; x += 24) {
    ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 7); ctx.fill();
  }
  // teal panel
  ctx.fillStyle = BP.teal; ctx.fillRect(0, 0, W, 560);
  // sunburst
  ctx.save(); ctx.globalAlpha = 0.9; sunburst(ctx, 980, 40, 520, 24, BP.mustard, 30); ctx.restore();
  // sparks/diamond
  star4(ctx, 120, 470, 10, BP.creamHi); diamond(ctx, 250, 120, 7, BP.pink, null);
  star4(ctx, 640, 90, 7, BP.creamHi);
  // panel border
  ctx.strokeStyle = BP.ink; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 560); ctx.lineTo(W, 560); ctx.stroke();
  // eyebrow
  ctx.fillStyle = BP.ink; ctx.font = '600 19px "Space Grotesk"';
  spaced(ctx, '✦ NOW READING · No ' + d.no, 80, 98, 3);
  // headline
  ctx.fillStyle = BP.ink; ctx.font = 'italic 44px Fraunces';
  ctx.fillText('Greetings from —', 80, 205);
  const hs = fitFont(ctx, d.state.toUpperCase() + '.', 638, 124, '700', '"Space Grotesk"');
  blockText(ctx, d.state.toUpperCase() + '.', 80, 205 + hs * 0.9, hs, BP.creamHi, BP.ink);
  // stamp
  drawStamp(ctx, 742, 70, 270, 'block', icon, d, BP.teal);
  // diamond seam row
  const dcols = [BP.pink, BP.orange, BP.mustard, BP.teal, BP.plum];
  for (let i = 0; i < 5; i++) { diamond(ctx, 96 + i * 54, 560, 15, dcols[i], BP.ink); }
  // flat book (overlaps seam)
  flatBook(ctx, 74, 392, 330, 432, d);
  // message card
  ctx.save();
  ctx.fillStyle = BP.ink; rr(ctx, 506 + 7, 632 + 7, 506, 300, 4); ctx.fill();
  ctx.fillStyle = BP.creamHi; rr(ctx, 506, 632, 506, 300, 4); ctx.fill();
  ctx.strokeStyle = BP.ink; ctx.lineWidth = 3; rr(ctx, 506, 632, 506, 300, 4); ctx.stroke();
  ctx.fillStyle = BP.ink; ctx.font = 'italic 28px Fraunces';
  const ml = wrap(ctx, '"' + d.message + '"', 440);
  let my = 694;
  for (const ln of ml) { ctx.fillText(ln, 540, my); my += 42; }
  my += 10; ctx.font = 'italic 25px Fraunces';
  ctx.fillStyle = BP.ink; ctx.fillText('— Yours,', 540, my);
  ctx.fillStyle = BP.terra; ctx.font = '700 26px Fraunces';
  ctx.fillText(d.sign, 628, my);
  ctx.restore();
  // pills
  pillRow(ctx, 506, 968, d.vibes, 'solid');
  // hashtags
  ctx.fillStyle = BP.sub; ctx.font = '500 19px "Space Grotesk"';
  ctx.fillText(d.tags.join('  '), 506, 1066);
  // roundel
  roundel(ctx, 152, 1218, 64, { disc: BP.ink, ring: BP.ink, mono: BP.creamHi, star: BP.pink, glow: null });
  // posted
  ctx.fillStyle = 'rgba(27,31,42,0.6)'; ctx.textAlign = 'right';
  ctx.font = '500 17px "Space Grotesk"';
  spacedR(ctx, 'POSTED · ' + d.date, 1000, 1258, 3.5);
  spacedR(ctx, 'N° ' + d.no, 1000, 1288, 3.5);
  ctx.textAlign = 'left';
}

// ── React component ───────────────────────────────────────────────────────────────
// data shape: { direction:'A'|'B', state, code, nickname, title, author,
//              message, sign, vibes:[], tags:[], date, no }
const PostcardCanvas = forwardRef(function PostcardCanvas({ data, style = {} }, ref) {
  const canvasRef = useRef(null);

  useImperativeHandle(ref, () => canvasRef.current);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let cancelled = false;
    (async () => {
      await Promise.all([
        document.fonts.load('700 120px "Space Grotesk"'),
        document.fonts.load('500 19px "Space Grotesk"'),
        document.fonts.load('italic 42px Fraunces'),
        document.fonts.load('700 40px Fraunces'),
      ]).catch(() => {});
      await document.fonts.ready;
      if (cancelled) return;

      const cyanIcon = await getIcon(data.code || 'FL', BP.cyan, BP.navyDeep);
      const inkIcon  = await getIcon(data.code || 'FL', BP.ink,  BP.mustard);
      if (cancelled) return;

      ctx.clearRect(0, 0, 1080, 1350);
      if (data.direction === 'B') {
        drawCardB(ctx, data, inkIcon);
      } else {
        drawCardA(ctx, data, cyanIcon);
      }
    })();

    return () => { cancelled = true; };
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={1080}
      height={1350}
      style={{ display: 'block', ...style }}
    />
  );
});

export default PostcardCanvas;
