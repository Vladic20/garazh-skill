// ─── cartoon style + warm sets + live screens ─────────────────────────────────────────────────────
// "look": "cartoon" (story.json) switches the doodle look to a warm flat-colour cartoon (after the garazh cartoon reel):
// thick brown outlines around every figure, tube arms with skin-tone hands, coloured clothes, blush on screen faces,
// floating dust instead of pencil confetti, no line boil, warm film overlay and karaoke captions.
// The sets (garage, desk, blackout) and props (badge, screen) below work in both styles.
// Every colour-figure look (cartoon and the looks in engine/styles.js) shares these overrides; TOON_LOOKS tunes them per look:
// thick = stroke multiplier, outline = silhouette outline radius (0 = none), blush, dust = colour of floating motes (null = none),
// type* = how kinetic type is drawn (font stack, fill, weight, size factor, outline colour).
const TOON_LOOKS = {
  cartoon: { thick: 1.4, outline: 2.6, blush: true, dust: '#ffe3a6', typeFont: 'Pangolin, Hand', typeFill: '#fbf3e1', typeScale: .92 },
  noir:    { thick: 1.15, outline: 1.8, blush: false, dust: '#ffc2e4', typeFont: 'Inter, Rubik, sans-serif', typeWeight: 800, typeFill: '#ffffff', typeScale: .8, skin: '#f4f1ea' },
  dota:    { thick: 1.3, outline: 2.2, blush: false, dust: '#ffb347', typeFont: "Cinzel, 'Cormorant SC', serif", typeWeight: 700, typeFill: '#f3dfae', typeScale: .8 },
  blocks:  { thick: 1.1, outline: 2, blush: false, dust: null, typeFont: "'Russo One', Rubik, sans-serif", typeFill: '#ffffff', typeScale: .8 },
  pixel:   { thick: 1.6, outline: 3, blush: false, dust: null, typeFont: "'Press Start 2P', monospace", typeFill: '#ffffff', typeScale: .48 },
  comic:   { thick: 1.8, outline: 3.2, blush: false, dust: null, typeFont: "Bangers, 'Russo One', sans-serif", typeFill: '#ffe94a', typeScale: .95 },
  stick:   { thick: 1, outline: 0, blush: false, dust: null, typeFont: 'Inter, Rubik, sans-serif', typeWeight: 800, typeFill: 'ink', typeStroke: 'none', typeScale: .8 },
  beanie:  { thick: 1, outline: 0, blush: false, dust: null, typeFont: 'Inter, Rubik, sans-serif', typeWeight: 800, typeFill: 'ink', typeStroke: 'none', typeScale: .8 },
  prehistoric: { thick: 1.3, outline: 2.2, blush: false, dust: '#ffd08a', typeFont: 'Pangolin, Hand', typeFill: '#f6efe0', typeScale: .92 },
  cozy:    { thick: 1.1, outline: 0, blush: true, dust: null, typeFont: 'Rubik, sans-serif', typeWeight: 800, typeFill: '#ffffff', typeScale: .8 },
  history: { thick: 1.2, outline: 0, blush: false, dust: null, typeFont: "Cinzel, 'Cormorant SC', serif", typeWeight: 700, typeFill: '#fbf3e1', typeScale: .8 },
  underground: { thick: 1.15, outline: 1.8, blush: false, dust: null, typeFont: 'Rubik, sans-serif', typeWeight: 900, typeFill: '#ffffff', typeScale: .8, skin: '#f1c7a0' },
  desk3d:  { thick: 1.1, outline: 0, blush: false, dust: null, typeFont: 'Inter, Rubik, sans-serif', typeWeight: 800, typeFill: '#ffffff', typeScale: .78 },
};
const LOOK = (typeof TL === 'object' && TL.look) || 'doodle';
const TOONC = TOON_LOOKS[LOOK] || null;
const CARTOON = !!TOONC;
let TOON_ON = CARTOON;              // switched off while a doodle is drawn inside a screen (SCREENS.video)
const SKIN = '#f1c08a';
const TOON_BODY = ['#5c8a4a', '#3f6d9e', '#c0503a', '#d9a441', '#7a5ea8', '#2f7f7a'];
const UI_FONT = `Rubik, 'Segoe UI', Arial, sans-serif`, MONO = `'JetBrains Mono', Consolas, monospace`, BADGE_FONT = `Pangolin, Hand, sans-serif`;
const THICK = TOONC ? TOONC.thick : 1.4;   // stroke multiplier for figures and doodle props
const toonBody = c => TOON_BODY[hashStr(c.id || c.seed || 'x') % TOON_BODY.length];
const thicken = s => s.replace(/stroke-width="([\d.]+)"/g, (m, w) => `stroke-width="${f2(w * THICK)}"`);
const uiW = (s, fs) => approxW(s, fs) * 1.1;   // Rubik/Segoe run ~10% wider than the hand font approxW was tuned for
function wrapText(s, fs, maxW, wf = uiW) {
  const lines = [[]]; let w = 0; const sp = wf(' ', fs);
  for (const wd of String(s).split(/\s+/).filter(Boolean)) {
    const ww = wf(wd, fs);
    if (w && w + sp + ww > maxW) { lines.push([]); w = 0; }
    lines[lines.length - 1].push(wd); w += (w ? sp : 0) + ww;
  }
  return lines.map(l => l.join(' '));
}
// timed step of a prop list (chat / steps / lines): absolute t resolved by lib/story.mjs from on|at|delay, else spaced from t0
const stepT = (p, m, i) => m.t ?? ((p.t0 || 0) + (m.delay ?? i * 1.4));

// ─── static defs: outline filter + light gradients (installed with the page statics) ─────────
const _installStatic = installStatic;
installStatic = function () {
  _installStatic();
  const host = document.createElement('div');
  host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs>
    <filter id="toon" x="-12%" y="-12%" width="124%" height="124%">
      <feComponentTransfer in="SourceAlpha" result="a"><feFuncA type="discrete" tableValues="0 0 0 0 0 0 0 0 1 1"/></feComponentTransfer>
      <feMorphology in="a" operator="dilate" radius="${TOONC ? TOONC.outline || .01 : 2.6}" result="d"/>
      <feFlood flood-color="${INK}"/><feComposite in2="d" operator="in" result="o"/>
      <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="soft6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
    <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffe6a8" stop-opacity=".62"/><stop offset=".45" stop-color="#ffcf7a" stop-opacity=".18"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
    <radialGradient id="poolGrad"><stop offset="0" stop-color="#ffdc9a" stop-opacity=".55"/><stop offset=".7" stop-color="#ffdc9a" stop-opacity=".12"/><stop offset="1" stop-color="#ffdc9a" stop-opacity="0"/></radialGradient>
    <radialGradient id="screenGlow"><stop offset="0" stop-color="#d8e8ff" stop-opacity=".45"/><stop offset="1" stop-color="#d8e8ff" stop-opacity="0"/></radialGradient>
    <linearGradient id="coneGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7b0" stop-opacity=".34"/><stop offset="1" stop-color="#ffe7b0" stop-opacity="0"/></linearGradient>
    <linearGradient id="wallShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
    <linearGradient id="glare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs></svg>`;
  document.getElementById('defs').appendChild(host.firstChild);
};

// ─── cartoon overrides of the doodle drawing functions ─────────────────────────────────────
let CURC = {};
const _characterSvg = characterSvg, _armSvg = armSvg, _legsSvg = legsSvg, _faceSvg = faceSvg, _itemSvg = itemSvg;
characterSvg = function (c, t) {
  if (!TOON_ON) return _characterSvg(c, t);
  const save = BEZEL;
  CURC = { ...c, color: c.color || toonBody(c), skin: c.skin || TOONC.skin };
  if (c.bezel) BEZEL = c.bezel;
  try { return thicken(_characterSvg(CURC, t)); } finally { BEZEL = save; }
};
armSvg = function (pts, coil) {
  if (!TOON_ON) return _armSvg(pts, coil);
  const [s, e, h] = pts;
  const d = coil ? `M${f2(s[0])} ${f2(s[1])} ${zigzag(s, e, 9, 4.5)} ${zigzag(e, h, 9, 4.5)}` : `M${f2(s[0])} ${f2(s[1])} L${f2(e[0])} ${f2(e[1])} L${f2(h[0])} ${f2(h[1])}`;
  const sleeve = CURC.sleeve || CURC.color || INK;
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${sleeve}" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${f2(h[0])}" cy="${f2(h[1])}" r="7.5" fill="${CURC.skin || SKIN}" stroke="${INK}" stroke-width="3"/>`;
};
legsSvg = function (t, anim, phase) {
  if (!TOON_ON) return _legsSvg(t, anim, phase);
  const lc = CURC.legs || '#3d3c48';
  const tube = d => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${lc}" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const shoe = (x, y, sx) => `<ellipse cx="${f2(x + sx * 7)}" cy="${f2(y - 4)}" rx="13" ry="7.5" fill="${INK}"/>`;
  if (anim === 'sit') return tube('M-16 -100 L-44 -62 L-40 0') + tube('M16 -100 L44 -62 L40 0') + shoe(-40, 0, -1) + shoe(40, 0, 1);
  let fl = [[-16, 0], [16, 0]];
  if (anim === 'walk' || anim === 'run') {
    const sp = anim === 'run' ? 14 : 7, a = anim === 'run' ? 26 : 16, s = Math.sin(t * sp + phase * 6);
    fl = [[-14 + s * a, -Math.max(0, -Math.cos(t * sp + phase * 6)) * 10], [14 - s * a, -Math.max(0, Math.cos(t * sp + phase * 6)) * 10]];
  }
  return [0, 1].map(i => { const [fx, fy] = fl[i], lx = i ? 16 : -16; return tube(`M${lx} -100 L${f2(fx)} ${f2(fy - 4)}`) + shoe(fx, fy, i ? 1 : -1); }).join('');
};
faceSvg = function (face, t, phase, look, talking) {
  const f = _faceSvg(face, t, phase, look, talking);
  if (!TOON_ON || !f || face === 'off' || !TOONC.blush) return f;
  return f + `<ellipse cx="-30" cy="9" rx="7" ry="4" fill="#ef8a6b" opacity=".55"/><ellipse cx="30" cy="9" rx="7" ry="4" fill="#ef8a6b" opacity=".55"/>`;
};
// thick outline around every figure and doodle prop (not around type, charts, screens or badges)
const NO_TOON = new Set(['notes', 'words', 'text', 'counter', 'bars', 'pie', 'progress', 'timeline', 'checklist', 'grid', 'photo', 'badge', 'screen', 'arrow', 'scribble', 'spotlight', 'feed', 'crowd']);
// kinetic type in cartoon: rounded Pangolin, cream fill with a thick brown outline (reads on dark walls)
const TYPE_PROPS = new Set(['words', 'text', 'counter']);
let toonType = s => s.replace(/<text([^>]*?)font-family="Hand"([^>]*?)font-size="([\d.]+)"([^>]*?)fill="([^"]+)"/g, (m, a, b, fs, d, fill) =>
  `<text${a}font-family="${TOONC.typeFont}" font-weight="${TOONC.typeWeight || 400}"${b}font-size="${f2(fs * TOONC.typeScale)}"${d}fill="${fill === INK && TOONC.typeFill !== 'ink' ? TOONC.typeFill : fill}" stroke="${TOONC.typeStroke === 'none' ? 'none' : TOONC.typeStroke || INK}" stroke-width="${TOONC.typeStroke === 'none' ? 0 : f2(fs / 7)}" stroke-linejoin="round" paint-order="stroke"`);
itemSvg = function (it, t) {
  let s = _itemSvg(it, t);
  if (TOON_ON && s && TYPE_PROPS.has(it.type)) s = toonType(s);
  if (!TOON_ON || !s || (it.el !== 'char' && NO_TOON.has(it.type))) return s;
  if (!TOONC.outline) return it.el === 'char' ? s : thicken(s);
  const body = it.el === 'char' ? s : thicken(s);
  return body.replace(/^<g transform="([^"]*)" opacity="([^"]*)">/, '<g transform="$1" opacity="$2"><g filter="url(#toon)">') + '</g>';
};

if (CARTOON) {
  boilFilter = () => 'none';
  // warm dust drifting through the light instead of pencil confetti
  particles = function (t, density = 1) {
    if (!(density > 0) || !TOONC.dust) return '';
    return PARTICLES.slice(0, Math.round(clamp(density, 0, 2) * 26)).map(p => {
      const x = ((p.x + p.vx * .4 * t + Math.sin(t * .35 + p.ph) * 22) % (W + 200) + W + 200) % (W + 200) - 100;
      const y = ((p.y + p.vy * .35 * t + Math.cos(t * .3 + p.ph) * 14) % (H + 120) + H + 120) % (H + 120) - 60;
      const op = .16 + .26 * (.5 + .5 * Math.sin(t * .9 + p.ph * 3));
      return `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(1.2 + p.s * 1.7)}" fill="${TOONC.dust}" opacity="${f2(op)}"/>`;
    }).join('');
  };
  groundSvg = () => `<rect x="-300" y="${GROUND}" width="${W + 600}" height="${H - GROUND + 400}" fill="${THEME.paperDark}"/><path d="M-300 ${GROUND} H${W + 300}" stroke="${INK}" stroke-width="6"/>`;
  filmDamage = function (t) {
    const r = rng(Math.round(t * 30) * 7919 + 13); let s = '';
    for (let k = 0; k < 3; k++) if (r() < .35) s += `<circle cx="${f2(r() * W)}" cy="${f2(r() * H)}" r="${f2(.7 + r() * 1.4)}" fill="${r() < .5 ? '#1a0f08' : '#fff3d8'}" opacity=".35"/>`;
    return s;
  };
  // karaoke captions: words appear as they are spoken, the current one in yellow, the plate pops in per phrase
  captionHtml = function (t) {
    if (!TL.captions) return '';
    const ph = (TL.subs || []).find(p => t >= p.from && t < p.to);
    if (!ph) return '';
    const vis = ph.words.filter(([, wt]) => t >= wt - .03);
    if (!vis.length) return '';
    const pop = easeOutBack(prog(t, vis[0][1] - .03, vis[0][1] + .12));
    return `<div class="cap" style="transform:translateX(-50%) scale(${(.82 + .18 * pop).toFixed(3)})">${vis.map(([w], i) => `<span class="${i === vis.length - 1 ? 'hl' : ''}">${esc(w)}</span>`).join(' ')}</div>`;
  };
}

// ─── sets ─────────────────────────────────────────────────────────────────────────────────
const BRICKS = {};
function brickWall(x0, y0, x1, y1, cols, seed = 77) {
  const key = [x0, y0, x1, y1, cols, seed].join();
  if (BRICKS[key]) return BRICKS[key];
  const r = rng(seed); let s = '';
  for (let row = 0, y = y0; y < y1; row++, y += 64)
    for (let x = x0 - (row % 2 ? 61 : 0); x < x1; x += 122) {
      const v = Math.floor(r() * cols.length);
      s += `<rect x="${f2(x + 4 + r() * 2)}" y="${f2(y + 4 + r() * 2)}" width="${f2(114 + (r() - .5) * 6)}" height="${f2(56 + (r() - .5) * 4)}" rx="5" fill="${cols[v]}"/>`;
    }
  return (BRICKS[key] = s);
}
function nightWindow(x, y, w, h, t) {
  const r = rng(91); let stars = '', city = '', lights = '';
  for (let i = 0; i < 14; i++) { const sx = x + r() * w, sy = y + r() * h * .55, ph = r() * 6; stars += `<circle cx="${f2(sx)}" cy="${f2(sy)}" r="${f2(1.2 + r() * 1.6)}" fill="#f6efd2" opacity="${f2(.45 + .55 * (.5 + .5 * Math.sin(t * 2.2 + ph)))}"/>`; }
  let bx = x - 10;
  while (bx < x + w) { const bw = 26 + r() * 40, bh = h * (.18 + r() * .3); city += `<rect x="${f2(bx)}" y="${f2(y + h - bh)}" width="${f2(bw)}" height="${f2(bh + 4)}" fill="#162447"/>`;
    for (let wy = y + h - bh + 8; wy < y + h - 8; wy += 14) for (let wx = bx + 5; wx < bx + bw - 8; wx += 11) if (r() < .32) lights += `<rect x="${f2(wx)}" y="${f2(wy)}" width="5" height="6" fill="#f6c94c" opacity="${f2(.7 + .3 * r())}"/>`;
    bx += bw + 3; }
  const mx = x + w * .76, my = y + h * .27, mr = Math.min(w, h) * .085;
  return `<rect x="${x - 16}" y="${y - 16}" width="${w + 32}" height="${h + 32}" rx="7" fill="#5a4630" stroke="${INK}" stroke-width="6"/>
    <clipPath id="nw${x | 0}${y | 0}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
    <g clip-path="url(#nw${x | 0}${y | 0})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#22396b"/>${stars}
      <circle cx="${f2(mx)}" cy="${f2(my)}" r="${f2(mr * 3)}" fill="#f3efd0" opacity=".08"/><circle cx="${f2(mx)}" cy="${f2(my)}" r="${f2(mr)}" fill="#f3efd0"/>${city}${lights}</g>
    <path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h * .52} H${x + w}" stroke="#5a4630" stroke-width="9"/>
    <rect x="${x - 26}" y="${y + h + 14}" width="${w + 52}" height="16" rx="4" fill="#7a5a3a" stroke="${INK}" stroke-width="5"/>`;
}
function pegboard(x, y, w, h) {
  let holes = '';
  for (let yy = y + 18; yy < y + h - 10; yy += 22) for (let xx = x + 16; xx < x + w - 10; xx += 22) holes += `<circle cx="${xx}" cy="${yy}" r="2.6" fill="#8a6338"/>`;
  const tx = x + w * .2, ty = y + 26;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#c79a5e" stroke="${INK}" stroke-width="6"/>${holes}
    <path d="M${tx} ${ty} V${ty + 100}" stroke="${INK}" stroke-width="6"/><rect x="${tx - 18}" y="${ty - 10}" width="36" height="20" rx="3" fill="#7d8389" stroke="${INK}" stroke-width="4"/>
    <rect x="${x + w * .48 - 6}" y="${ty}" width="13" height="74" rx="4" fill="#d8453b" stroke="${INK}" stroke-width="4"/><path d="M${x + w * .48} ${ty + 74} V${ty + 136}" stroke="#aeb4b8" stroke-width="5"/>
    <path d="M${x + w * .76} ${ty} l0 112 m-13 -112 a15 15 0 1 0 26 0" stroke="${INK}" stroke-width="5" fill="none"/>`;
}
function shelf(x, y, w) {
  return `<path d="M${x + 16} ${y} v26 M${x + w - 16} ${y} v26" stroke="${INK}" stroke-width="5"/>
    <rect x="${x}" y="${y - 12}" width="${w}" height="14" rx="3" fill="#a46c3b" stroke="${INK}" stroke-width="5"/>
    <rect x="${x + 12}" y="${y - 58}" width="30" height="46" rx="5" fill="#9cc6c2" stroke="${INK}" stroke-width="4"/><rect x="${x + 10}" y="${y - 66}" width="34" height="10" rx="3" fill="#d8453b" stroke="${INK}" stroke-width="4"/>
    <rect x="${x + 52}" y="${y - 46}" width="26" height="34" rx="4" fill="#e9d38a" stroke="${INK}" stroke-width="4"/>
    <g transform="translate(${x + w - 70} ${y - 12})"><path d="M-12 -62 l-12 -18 M12 -62 l12 -18" stroke="${INK}" stroke-width="4"/><rect x="-36" y="-64" width="72" height="64" rx="8" fill="#b06a3c" stroke="${INK}" stroke-width="5"/>
      <rect x="-27" y="-55" width="44" height="46" rx="6" fill="#2b2f33" stroke="${INK}" stroke-width="3"/><circle cx="26" cy="-46" r="3.5" fill="#f1e3c0"/><circle cx="26" cy="-34" r="3.5" fill="#f1e3c0"/></g>`;
}
function hangingLamp(x, y, t, o = {}) {
  const sw = Math.sin(t * .9) * (o.swing ?? 1.2), on = o.on !== false;
  return `<g transform="rotate(${f2(sw)} ${x} -400)">
    <path d="M${x} -400 V${y - 24}" stroke="${INK}" stroke-width="5"/>
    ${on ? `<circle cx="${x}" cy="${y + 16}" r="${PORTRAIT ? 300 : 280}" fill="url(#lampGlow)"/>` : ''}
    <path d="M${x - 16} ${y - 26} h32 l30 40 h-92 Z" fill="#3d5a3a" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="${x}" cy="${y + 18}" rx="15" ry="11" fill="${on ? '#fff4c8' : '#8d8a7c'}" stroke="${INK}" stroke-width="4"/></g>`;
}
function lampCone(x, y, t, o = {}) {
  const sw = Math.sin(t * .9) * (o.swing ?? 1.2), spread = PORTRAIT ? 250 : 300;
  return `<g transform="rotate(${f2(sw)} ${x} -400)" style="mix-blend-mode:screen"><path d="M${x - 38} ${y + 14} L${x + 38} ${y + 14} L${x + spread} ${GROUND + 30} L${x - spread} ${GROUND + 30} Z" fill="url(#coneGrad)" opacity="${f2(o.cone ?? .85)}"/></g>`;
}
const tires = (x, n = 3) => Array.from({ length: n }, (_, i) => `<ellipse cx="${x}" cy="${GROUND + 6 - i * 58}" rx="108" ry="34" fill="#2c2d30" stroke="${INK}" stroke-width="6"/><ellipse cx="${x}" cy="${GROUND - 2 - i * 58}" rx="52" ry="13" fill="#1a1b1d"/>`).join('');

Object.assign(window.SETS_LIB = window.SETS_LIB || {}, {
  // night garage: brick wall, window with the city at night, pegboard, shelf with an old TV, hanging lamp, tires.
  // { dim: 0..1 (lights going down), lamp: false (lamp off), cone: 0..1, window: false, tires: false }
  garage: (o, t) => {
    const G = GROUND, port = PORTRAIT;
    const ww = port ? 300 : 250, wh = port ? 210 : 180, wx = port ? W * .5 - ww / 2 + 60 : W * .62, wy = port ? G - 720 : G - 480;
    const lx = port ? W * .3 : W * .38, ly = port ? G - 800 : G - 520;
    const back = `<rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="#565040"/>
      ${brickWall(-300, -400, W + 300, G, ['#77715f', '#6f6a59', '#7c7563'])}
      <rect x="-300" y="-400" width="${W + 600}" height="${G + 400}" fill="url(#wallShade)"/>
      ${o.window === false ? '' : nightWindow(wx, wy, ww, wh, t)}
      ${pegboard(port ? 34 : W * .06, port ? G - 470 : G - 400, port ? 210 : 230, port ? 230 : 240)}
      ${shelf(port ? W - 250 : W * .8, port ? G - 300 : G - 330, port ? 220 : 210)}
      <rect x="${port ? W - 46 : W * .955}" y="-400" width="34" height="${G + 400}" fill="#4a4d50" stroke="${INK}" stroke-width="6"/>
      <rect x="-300" y="${G}" width="${W + 600}" height="${H - G + 400}" fill="#3f352b"/><rect x="-300" y="${G}" width="${W + 600}" height="12" fill="#2b231b"/>
      <path d="M-300 ${G} H${W + 300}" stroke="${INK}" stroke-width="6"/>
      ${o.lamp === false ? '' : `<ellipse cx="${lx}" cy="${G + 34}" rx="${port ? 250 : 300}" ry="44" fill="url(#poolGrad)"/>`}
      ${o.tires === false || port ? '' : tires(W * .9)}
      ${hangingLamp(lx, ly, t, { on: o.lamp !== false, swing: o.swing })}
      ${o.dim ? `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="#0b0604" opacity="${f2(clamp(o.dim) * .8)}"/>` : ''}`;
    const front = o.lamp === false || o.cone === 0 ? '' : lampCone(lx, ly, t, { swing: o.swing, cone: o.cone });
    return { back, front, noGround: true };
  },
  // close-up on a desk (put a "screen" prop on it): dim brick wall with a warm lamp glow, wooden table top across the bottom.
  // { top: y of the table edge, mug: false, plant: false }
  desk: (o, t) => {
    const top = o.top ?? (PORTRAIT ? GROUND + 40 : GROUND - 20);
    const back = `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="#4a4436"/>
      ${brickWall(-300, -400, W + 300, top, ['#6a6555', '#635e4f', '#6e6858'], 33)}
      <rect x="-300" y="-400" width="${W + 600}" height="${top + 400}" fill="#000" opacity=".28"/>
      <circle cx="${W * .18}" cy="${top - (PORTRAIT ? 760 : 470)}" r="${PORTRAIT ? 420 : 380}" fill="url(#lampGlow)"/>
      <rect x="-300" y="${top - 24}" width="${W + 600}" height="34" rx="4" fill="#a46c3b" stroke="${INK}" stroke-width="6"/>
      <rect x="-300" y="${top + 10}" width="${W + 600}" height="${H - top + 400}" fill="#85532b" stroke="${INK}" stroke-width="6"/>
      <path d="M-300 ${top + 46} H${W + 300} M-300 ${top + 96} H${W + 300}" stroke="#74461f" stroke-width="5" opacity=".7"/>
      ${o.mug === false ? '' : `<g transform="translate(${PORTRAIT ? W - 92 : W * .86} ${top - 22})"><path d="M-26 0 L-30 -62 H30 L26 0 Z" fill="#d8453b" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M30 -50 q24 2 20 22 q-3 14 -22 10" fill="none" stroke="${INK}" stroke-width="5"/>
        ${[0, 1].map(i => `<path d="M${-10 + i * 16} -72 q-8 -14 2 -26 q8 -10 0 -22" fill="none" stroke="#f3e6c8" stroke-width="3.5" stroke-linecap="round" opacity="${f2(.35 + .25 * Math.sin(t * 2 + i))}"/>`).join('')}</g>`}
      ${o.plant === false ? '' : `<g transform="translate(${PORTRAIT ? 70 : W * .1} ${top - 22})"><path d="M-30 0 L-36 -56 H36 L30 0 Z" fill="#c9773f" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
        ${[[-26, -96, -30], [24, -104, 28], [0, -122, 0], [-40, -70, -60], [40, -74, 60]].map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="34" transform="rotate(${a} ${x} ${y})" fill="#5c8a4a" stroke="${INK}" stroke-width="4"/>`).join('')}</g>`}`;
    return { back, noGround: true };
  },
  // darkness with one warm spotlight from above. { x: centre of the pool, light: false (just black) }
  blackout: (o, t) => {
    const x = o.x ?? CX, r = PORTRAIT ? 210 : 240;
    const back = `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="#0b0705"/>
      ${o.light === false ? '' : `<ellipse cx="${x}" cy="${GROUND + 10}" rx="${r}" ry="${r * .2}" fill="url(#poolGrad)"/>`}`;
    let dust = '';
    if (o.light !== false) { const rr = rng(57); for (let i = 0; i < 18; i++) { const k = rr(), y = ((rr() * GROUND + t * (8 + rr() * 10)) % GROUND), ww = 24 + (r - 24) * y / GROUND;
      dust += `<circle cx="${f2(x + (k - .5) * 2 * ww)}" cy="${f2(y)}" r="${f2(1 + rr() * 1.6)}" fill="#ffe7b0" opacity="${f2(.25 + .3 * rr())}"/>`; } }
    const front = o.light === false ? '' : `<path d="M${x - 26} -40 L${x + 26} -40 L${x + r} ${GROUND + 10} L${x - r} ${GROUND + 10} Z" fill="url(#coneGrad)" opacity=".9" style="mix-blend-mode:screen"/>${dust}`;
    return { back, front, noGround: true };
  },
});

// ─── live screens: what a "screen" prop shows. (p, t, w, h) → svg in screen space (0,0 = top-left), design width 560 ──
function claudeMark(x, y, r, col = '#d97757') {
  return `<g transform="translate(${f2(x)} ${f2(y)})" stroke="${col}" stroke-width="${f2(r * .34)}" stroke-linecap="round">${[0, 45, 90, 135].map(a => `<path d="M0 ${-r} V${r}" transform="rotate(${a})"/>`).join('')}</g>`;
}
function cursorArrow(x, y, s = 1) {
  return `<path transform="translate(${f2(x)} ${f2(y)}) scale(${s})" d="M0 0 L0 26 L7 19 L12 30 L17 28 L12 17 L21 17 Z" fill="#fff" stroke="#1d1916" stroke-width="2.2" stroke-linejoin="round"/>`;
}
// moving cursor that ends on (x, y) at time `at` (clicks there); hidden after at + .8
function cursorTo(x, y, t, at, from = [x + 160, y + 120]) {
  if (at == null || t < at - 1 || t > at + .8) return '';
  const k = easeInOut(prog(t, at - 1, at - .12)), cx = lerp(from[0], x, k), cy = lerp(from[1], y, k);
  const click = t >= at && t < at + .25 ? `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(8 + 26 * prog(t, at, at + .25))}" fill="none" stroke="#d97757" stroke-width="3" opacity="${f2(1 - prog(t, at, at + .25))}"/>` : '';
  return click + cursorArrow(cx, cy, 1.1);
}
function button(x, y, w, h, label, t, press, o = {}) {
  const down = press != null && t >= press && t < press + .18, done = press != null && t >= press + .18;
  const fill = o.fill || '#d97757', fs = o.fs || 17;
  return `<g transform="translate(${f2(x + w / 2)} ${f2(y + h / 2)}) scale(${down ? .95 : 1})"><rect x="${-w / 2}" y="${-h / 2 + 3}" width="${w}" height="${h}" rx="${h / 2.6}" fill="#000" opacity=".18"/>
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2.6}" fill="${done && o.doneFill ? o.doneFill : fill}"/>
    <text y="${fs * .36}" text-anchor="middle" font-family="${UI_FONT}" font-weight="700" font-size="${fs}" fill="#fff">${esc(done && o.doneLabel ? o.doneLabel : label)}</text></g>`;
}
function miniScene(x, y, w, h, kind, t, seed = 1) {   // thumbnail of a little frame (storyboard cells, previews)
  const r = rng(seed), bob = Math.sin(t * 5 + seed) * 2, fx = x + w * (.35 + r() * .3), gy = y + h * .8;
  const bg = ['#c6ccd0', '#5d5444', '#22396b', '#d8c9a8', '#2f3b36', '#cfe3d8'][kind % 6], ink = kind % 6 === 1 || kind % 6 === 2 || kind % 6 === 4 ? '#f3ead6' : '#1d1916';
  const extra = kind % 6 === 1 ? `<circle cx="${x + w * .75}" cy="${y + h * .22}" r="${h * .3}" fill="#ffcf7a" opacity=".35"/>` : kind % 6 === 2 ? `<circle cx="${x + w * .78}" cy="${y + h * .25}" r="${h * .08}" fill="#f3efd0"/>` : `<path d="M${x + w * .1} ${y + h * .3} h${w * .3}" stroke="${ink}" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${bg}"/>${extra}<path d="M${x} ${gy} H${x + w}" stroke="${ink}" stroke-width="1.6" opacity=".7"/>
    <g transform="translate(${f2(fx)} ${f2(gy + bob)})"><rect x="-9" y="-36" width="18" height="15" rx="3" fill="${kind % 6 === 1 ? '#c8693a' : '#585858'}" stroke="${ink}" stroke-width="1.6"/><rect x="-6" y="-33" width="12" height="9" rx="2" fill="#eee9dc"/>
      <path d="M-5 -21 h10 l3 13 h-16 Z" fill="${ink}"/><path d="M-3 -8 v8 M3 -8 v8" stroke="${ink}" stroke-width="1.6"/></g>`;
}
function withPalette(th, fn) {   // draw something in another palette with the cartoon overrides off (doodle inside a screen)
  const save = { INK, BEZEL, SCREEN, PAPER, WHITE, ACCENT, THEME, TOON_ON };
  INK = th.ink; BEZEL = th.bezel; SCREEN = th.screen; PAPER = th.paper; WHITE = th.fill; ACCENT = th.accent; THEME = { ...THEME, ...th }; TOON_ON = false;
  try { return fn(); } finally { ({ INK, BEZEL, SCREEN, PAPER, WHITE, ACCENT, THEME, TOON_ON } = save); }
}
const DOODLE_PAL = { ink: '#141414', bezel: '#585858', screen: '#e9ebeb', paper: '#c6ccd0', fill: '#f1f2f1', accent: '#141414', halo: '#aab0b4' };

window.SCREENS = Object.assign(window.SCREENS || {}, {
  off: (p, t, w, h) => `<rect width="${w}" height="${h}" fill="#141618"/><path d="M${w * .1} ${h * .2} L${w * .3} ${h * .05} M${w * .08} ${h * .38} L${w * .42} ${h * .1}" stroke="#2c3034" stroke-width="10" stroke-linecap="round"/>`,

  // Claude chat. p.chat = [{ from: 'user'|'claude', text, on|at|delay, button?, click? (on|at|delay object or seconds), progress?: { dur, label } }]
  // user: typed into the input box, then jumps up as a bubble; claude: typing dots for 0.9 s, then the text types out.
  chat: (p, t, w, h) => {
    const DW = p.dw || (w < 420 ? 340 : 560), k = w / DW, DH = h / k, fs = p.fs || 19, lh = fs * 1.34, headH = 46, inH = 54, maxB = DW * .76;
    const L = { title: 'Claude', ph: 'Reply…', ...(p.labels || {}) };
    const msgs = (p.chat || []).map((m, i) => ({ ...m, T: stepT(p, m, i), user: m.from === 'user' }));
    const tAbs = v => v == null ? null : typeof v === 'number' ? v : v.t;
    let typingInput = '';
    const blocks = [];
    for (const m of msgs) {
      const text = String(m.text || ''), lines = wrapText(text, fs, maxB - 32);
      if (m.user) {
        const typeDur = Math.min(2.2, text.length / 15);
        if (t >= m.T - typeDur && t < m.T) typingInput = text.slice(0, Math.floor(text.length * prog(t, m.T - typeDur, m.T - .1)));
        if (t < m.T) continue;
        blocks.push({ m, lines, hgt: lines.length * lh + 22, k: easeOutBack(prog(t, m.T, m.T + .3)) });
      } else {
        if (t < m.T - .9) continue;
        if (t < m.T) { blocks.push({ m, typing: true, hgt: 34 }); continue; }
        const sp = m.speed || 48, shown = Math.floor((t - m.T) * sp);
        let left = shown; const vis = [];
        for (const ln of lines) { if (left <= 0) break; vis.push(ln.slice(0, left)); left -= ln.length + 1; }
        const done = m.T + text.length / sp + .15, click = tAbs(m.click);
        const hasBtn = m.button && t >= done, hasProg = m.progress && click != null && t >= click + .2;
        blocks.push({ m, vis, done, click, hasBtn, hasProg, hgt: Math.max(1, vis.length) * lh + 12 + (hasBtn ? 56 : 0) + (hasProg ? 46 : 0) });
      }
    }
    // stack from the bottom up, above the input box
    let y = DH - inH - 14, body = '';
    for (let i = blocks.length - 1; i >= 0 && y > headH - 200; i--) {
      const b = blocks[i]; y -= b.hgt; const by = y; y -= 14;
      if (b.typing) { body += `<g transform="translate(18 ${by + 8})">${claudeMark(10, 10, 8)}${[0, 1, 2].map(j => `<circle cx="${34 + j * 16}" cy="${f2(10 - 5 * Math.max(0, Math.sin(t * 9 - j * .8)))}" r="5" fill="#9a9082"/>`).join('')}</g>`; continue; }
      if (b.m.user) {
        const bw = Math.min(maxB, Math.max(...b.lines.map(l => uiW(l, fs))) + 32), bx = DW - 18 - bw;
        body += `<g transform="translate(${f2(bx + bw)} ${f2(by + b.hgt)}) scale(${f2(b.k)}) translate(${f2(-bw)} ${f2(-b.hgt)})"><rect width="${f2(bw)}" height="${f2(b.hgt)}" rx="16" fill="#ebe3d6"/>
          ${b.lines.map((l, j) => `<text x="16" y="${f2(11 + fs * .95 + j * lh)}" font-family="${UI_FONT}" font-size="${fs}" fill="#2b2623">${esc(l)}</text>`).join('')}</g>`;
      } else {
        body += claudeMark(26, by + fs * .6, 8);
        body += b.vis.map((l, j) => `<text x="46" y="${f2(by + fs * .95 + j * lh)}" font-family="${UI_FONT}" font-size="${fs}" fill="#2b2623">${esc(l)}</text>`).join('');
        let yy = by + Math.max(1, b.vis.length) * lh + 10;
        if (b.hasBtn) { const bw = uiW(b.m.button, 17) + 48, pop = easeOutBack(prog(t, b.done, b.done + .3));
          body += `<g transform="translate(${46 + bw / 2} ${yy + 22}) scale(${f2(pop)}) translate(${-46 - bw / 2} ${-yy - 22})">${button(46, yy, bw, 44, b.m.button, t, b.click, { doneFill: '#5c8a4a', doneLabel: b.m.doneLabel || '✓ ' + b.m.button })}</g>`;
          body += cursorTo(46 + bw * .6, yy + 26, t, b.click); yy += 56; }
        if (b.hasProg) { const P = b.m.progress, kk = clamp(prog(t, b.click + .2, b.click + .2 + (P.dur || 3))), pw = DW - 46 - 40;
          body += `<text x="46" y="${f2(yy + 16)}" font-family="${MONO}" font-weight="700" font-size="14" fill="#6b6257">${esc(kk >= 1 ? (P.doneLabel || '✓ done') : (P.label || 'Working…'))}  ${Math.round(kk * 100)}%</text>
            <rect x="46" y="${f2(yy + 24)}" width="${pw}" height="12" rx="6" fill="#e2d9ca"/><rect x="46" y="${f2(yy + 24)}" width="${f2(pw * kk)}" height="12" rx="6" fill="${kk >= 1 ? '#5c8a4a' : '#d97757'}"/>`; }
      }
    }
    const caret = Math.floor(t * 2.4) % 2 ? `<rect x="${f2(30 + uiW(typingInput, fs))}" y="${DH - inH + 6}" width="2.5" height="${fs + 4}" fill="#2b2623"/>` : '';
    return `<g transform="scale(${f2(k)})"><rect width="${DW}" height="${f2(DH)}" fill="#f8f4ec"/>${body}
      <rect width="${DW}" height="${headH}" fill="#efe8db"/><path d="M0 ${headH} H${DW}" stroke="#d8cfbf" stroke-width="2"/>${claudeMark(26, headH / 2, 9)}
      <text x="46" y="${headH / 2 + 6}" font-family="${UI_FONT}" font-weight="700" font-size="17" fill="#2b2623">${esc(L.title)}</text>
      <rect x="14" y="${f2(DH - inH - 4)}" width="${DW - 28}" height="${inH - 8}" rx="14" fill="#fff" stroke="#d8cfbf" stroke-width="2"/>
      ${typingInput ? `<text x="30" y="${f2(DH - inH + 6 + fs)}" font-family="${UI_FONT}" font-size="${fs}" fill="#2b2623">${esc(typingInput)}</text>${caret}` : `<text x="30" y="${f2(DH - inH + 6 + fs)}" font-family="${UI_FONT}" font-size="${fs}" fill="#a39a8c">${esc(L.ph)}</text>`}
      <circle cx="${DW - 40}" cy="${f2(DH - inH + 23)}" r="14" fill="${typingInput ? '#d97757' : '#e2d9ca'}"/><path d="M${DW - 40} ${f2(DH - inH + 30)} v-13 m-6 6 l6 -6 l6 6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
  },

  // the tvhead studio app itself. p.steps = [{ view: 'brief'|'board'|'render'|'done', on|at|delay }], p.topic, p.langs ['EN','RU'],
  // p.styleName ('Cartoon'), p.labels { title, topic, voice, style, refs, go, board, drawing, render, rendering, done, files }
  app: (p, t, w, h) => {
    const k = w / 560, DH = h / k;
    const L = { title: 'tvhead studio', topic: 'Topic', voice: 'Voice', style: 'Style', refs: 'References', go: 'Storyboard →', board: 'Storyboard',
      drawing: 'Claude is drawing…', drawn: 'scenes ready', render: 'Render ▶', rendering: 'Rendering…', done: 'Ready', files: ['video.en.mp4', 'video.ru.mp4'], ...(p.labels || {}) };
    const steps = (p.steps || [{ view: 'brief' }]).map((s, i) => ({ ...s, T: stepT(p, s, i) }));
    let ci = 0; steps.forEach((s, i) => { if (t >= s.T) ci = i; });
    const cur = steps[ci], next = steps[ci + 1], lt = t - cur.T, end = next ? next.T : cur.T + 6, press = next ? next.T - .35 : null;
    const chip = (x, y, label, on, kk = 1) => { const cw = uiW(label, 15) + 28;
      return { w: cw, svg: `<g transform="translate(${f2(x + cw / 2)} ${y + 15}) scale(${f2(kk)}) translate(${f2(-x - cw / 2)} ${-y - 15})"><rect x="${f2(x)}" y="${y}" width="${f2(cw)}" height="30" rx="15" fill="${on ? '#2a1c14' : '#fff'}" stroke="#2a1c14" stroke-width="2"/>
        <text x="${f2(x + cw / 2)}" y="${y + 20}" text-anchor="middle" font-family="${UI_FONT}" font-weight="700" font-size="15" fill="${on ? '#ffc93a' : '#2a1c14'}">${esc(label)}</text></g>` }; };
    let view = '';
    const M = 24;
    if (cur.view === 'brief') {
      const topic = String(p.topic || 'How the internet works'), typed = topic.slice(0, Math.floor(topic.length * prog(lt, .25, .25 + Math.min(2.2, topic.length / 16))));
      view += `<text x="${M}" y="84" font-family="${UI_FONT}" font-weight="700" font-size="14" fill="#8a7d6a">${esc(L.topic.toUpperCase())}</text>
        <rect x="${M}" y="94" width="${560 - 2 * M}" height="46" rx="10" fill="#fff" stroke="#2a1c14" stroke-width="2.5"/>
        <text x="${M + 14}" y="124" font-family="${UI_FONT}" font-size="19" fill="#2a1c14">${esc(typed)}</text>${typed.length < topic.length || Math.floor(t * 2.4) % 2 ? `<rect x="${f2(M + 16 + uiW(typed, 19))}" y="104" width="2.5" height="24" fill="#2a1c14"/>` : ''}`;
      const rowY = [164, 214, 264];
      [[L.voice, (p.langs || ['EN', 'RU']).map(String), ['EN', 'RU']], [L.style, [p.styleName || 'Cartoon'], ['Doodle', 'Cartoon']]].forEach(([lab, on, all], r) => {
        view += `<text x="${M}" y="${rowY[r] + 20}" font-family="${UI_FONT}" font-weight="700" font-size="14" fill="#8a7d6a">${esc(lab.toUpperCase())}</text>`;
        let x = M + 96; all.forEach((a, j) => { const lit = on.includes(a) && lt > 1.2 + r * .5 + j * .25, c = chip(x, rowY[r], a, lit, lit ? 1 + .12 * Math.sin(Math.PI * clamp((lt - 1.2 - r * .5 - j * .25) / .25)) : 1); view += c.svg; x += c.w + 10; });
      });
      view += `<text x="${M}" y="${rowY[2] + 20}" font-family="${UI_FONT}" font-weight="700" font-size="14" fill="#8a7d6a">${esc(L.refs.toUpperCase())}</text>`;
      [0, 1, 2].forEach(j => { const kk = easeOutBack(prog(lt, 2.2 + j * .18, 2.5 + j * .18)); if (kk > 0) view += `<g transform="translate(${M + 120 + j * 74} ${rowY[2] + 16}) scale(${f2(kk)})"><g transform="translate(-32 -24)">${miniScene(0, 0, 64, 48, j + 1, t, j + 3)}<rect width="64" height="48" rx="5" fill="none" stroke="#2a1c14" stroke-width="2"/></g></g>`; });
      const by = Math.max(rowY[2] + 60, DH - 70);
      view += button(560 - M - 200, by, 200, 46, L.go, t, press) + cursorTo(560 - M - 80, by + 28, t, press);
    } else if (cur.view === 'board') {
      const cols = 3, gap = 12, cw = (560 - 2 * M - gap * (cols - 1)) / cols, ch = cw * .62, rows = Math.max(2, Math.min(3, Math.floor((DH - 150) / (ch + gap))));
      const n = cols * rows, shown = Math.min(n, Math.floor(prog(lt, .3, .3 + n * .3) * n + (lt > .3 ? 1 : 0)));
      view += `<text x="${M}" y="84" font-family="${UI_FONT}" font-weight="800" font-size="20" fill="#2a1c14">${esc(L.board)}</text>
        <text x="${560 - M}" y="84" text-anchor="end" font-family="${UI_FONT}" font-size="15" fill="#8a7d6a">${shown < n ? esc(L.drawing) : `✓ ${n} ${esc(L.drawn)}`}</text>`;
      for (let i = 0; i < shown; i++) { const x = M + (i % cols) * (cw + gap), y = 100 + Math.floor(i / cols) * (ch + gap), kk = easeOutBack(prog(lt, .3 + i * .3, .6 + i * .3));
        view += `<g transform="translate(${f2(x + cw / 2)} ${f2(y + ch / 2)}) scale(${f2(kk)}) translate(${f2(-x - cw / 2)} ${f2(-y - ch / 2)})">${miniScene(x, y, cw, ch, i, t, i + 11)}<rect x="${f2(x)}" y="${f2(y)}" width="${f2(cw)}" height="${f2(ch)}" rx="5" fill="none" stroke="#2a1c14" stroke-width="2"/>
          <circle cx="${f2(x + 14)}" cy="${f2(y + 14)}" r="10" fill="#2a1c14"/><text x="${f2(x + 14)}" y="${f2(y + 19)}" text-anchor="middle" font-family="${UI_FONT}" font-weight="700" font-size="12" fill="#ffc93a">${i + 1}</text></g>`; }
      if (shown >= n) { const by = Math.min(DH - 64, 110 + rows * (ch + gap)); view += button(560 - M - 170, by, 170, 44, L.render, t, press) + cursorTo(560 - M - 70, by + 26, t, press); }
    } else if (cur.view === 'render') {
      const kk = clamp(prog(t, cur.T + .2, end - .3)), pw = 560 - 2 * M, ph = Math.min(DH - 190, pw * .56), px = M, py = 70;
      view += `<g>${miniScene(px, py, pw, ph, 1, t, 5)}</g><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="6" fill="none" stroke="#2a1c14" stroke-width="2.5"/>
        <text x="${M}" y="${f2(py + ph + 36)}" font-family="${UI_FONT}" font-weight="700" font-size="17" fill="#2a1c14">${esc(L.rendering)}</text>
        <text x="${560 - M}" y="${f2(py + ph + 36)}" text-anchor="end" font-family="${MONO}" font-weight="700" font-size="16" fill="#2a1c14">${Math.round(kk * 100)}%</text>
        <rect x="${M}" y="${f2(py + ph + 50)}" width="${pw}" height="16" rx="8" fill="#e2d9ca"/><rect x="${M}" y="${f2(py + ph + 50)}" width="${f2(pw * kk)}" height="16" rx="8" fill="#d97757"/>
        <text x="${M}" y="${f2(py + ph + 90)}" font-family="${MONO}" font-weight="700" font-size="13" fill="#8a7d6a">frames ${Math.round(kk * 2400)}/2400 · voice ✓ · music ✓</text>`;
    } else {
      const pw = 560 - 2 * M, ph = Math.min(DH - 170, pw * .56), px = M, py = 70, pop = easeOutBack(prog(lt, 0, .4));
      view += `<g transform="translate(280 ${f2(py + ph / 2)}) scale(${f2(.9 + .1 * pop)}) translate(-280 ${f2(-py - ph / 2)})">${miniScene(px, py, pw, ph, 0, t, 2)}<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="6" fill="none" stroke="#2a1c14" stroke-width="2.5"/>
          <circle cx="280" cy="${f2(py + ph / 2)}" r="34" fill="#2a1c14" opacity=".85"/><path d="M270 ${f2(py + ph / 2 - 16)} L294 ${f2(py + ph / 2)} L270 ${f2(py + ph / 2 + 16)} Z" fill="#ffc93a"/></g>
        <text x="${M}" y="${f2(py + ph + 38)}" font-family="${UI_FONT}" font-weight="800" font-size="20" fill="#5c8a4a">✓ ${esc(L.done)}</text>`;
      let x = M; [].concat(L.files).forEach((f, j) => { const c = chip(x, py + ph + 54, f, true, easeOutBack(prog(lt, .4 + j * .2, .7 + j * .2))); view += c.svg; x += c.w + 10; });
    }
    const ui = String(p.ui || 'EN');
    return `<g transform="scale(${f2(k)})"><rect width="560" height="${f2(DH)}" fill="#f7f1e3"/>
      <rect width="560" height="50" fill="#2a1c14"/><g transform="translate(${M + 14} 25)"><rect x="-14" y="-12" width="28" height="22" rx="5" fill="#c8693a" stroke="#f7f1e3" stroke-width="2"/><rect x="-8" y="-7" width="16" height="12" rx="2" fill="#f6ecd2"/></g>
      <text x="${M + 38}" y="32" font-family="${UI_FONT}" font-weight="800" font-size="18" fill="#f7f1e3">${esc(L.title)}</text>
      <g transform="translate(${560 - M - 84} 13)"><rect width="84" height="24" rx="12" fill="#3b2b20"/><rect x="${ui === 'RU' ? 42 : 0}" width="42" height="24" rx="12" fill="#ffc93a"/>
        <text x="21" y="17" text-anchor="middle" font-family="${UI_FONT}" font-weight="700" font-size="12" fill="${ui === 'RU' ? '#f7f1e3' : '#2a1c14'}">EN</text><text x="63" y="17" text-anchor="middle" font-family="${UI_FONT}" font-weight="700" font-size="12" fill="${ui === 'RU' ? '#2a1c14' : '#f7f1e3'}">RU</text></g>
      ${view}</g>`;
  },

  // terminal. p.lines = [{ text, kind: 'cmd'|'out'|'ok'|'err', on|at|delay }] — commands type out, output lines appear at once
  code: (p, t, w, h) => {
    const DW = p.dw || 560, k = w / DW, DH = h / k, fs = p.fs || 16, lh = fs * 1.5, top = 40;
    const lines = (p.lines || []).map((l, i) => ({ ...l, T: stepT(p, l, i) })).filter(l => t >= l.T);
    const maxN = Math.floor((DH - top - 16) / lh), vis = lines.slice(-maxN);
    const col = { cmd: '#f0e6d2', out: '#b9ad98', ok: '#9fd47a', err: '#ef6f5e' };
    let body = '', lastX = 20, lastY = top + fs;
    vis.forEach((l, i) => {
      const y = top + fs + i * lh, kind = l.kind || 'out', text = String(l.text || '');
      const shown = kind === 'cmd' ? text.slice(0, Math.floor((t - l.T) * (l.speed || 26))) : text;
      const pre = kind === 'cmd' ? '❯ ' : kind === 'ok' ? '✓ ' : kind === 'err' ? '✗ ' : '  ';
      body += `<text x="20" y="${f2(y)}" font-family="${MONO}" font-weight="700" font-size="${fs}" xml:space="preserve"><tspan fill="${kind === 'cmd' ? '#d97757' : col[kind]}">${pre}</tspan><tspan fill="${col[kind]}">${esc(shown)}</tspan></text>`;
      lastX = 20 + (pre.length + shown.length) * fs * .6; lastY = y;
    });
    const caret = Math.floor(t * 2.2) % 2 ? `<rect x="${f2(lastX + 2)}" y="${f2(lastY - fs * .8)}" width="${f2(fs * .55)}" height="${f2(fs)}" fill="#f0e6d2" opacity=".85"/>` : '';
    return `<g transform="scale(${f2(k)})"><rect width="${DW}" height="${f2(DH)}" fill="#1d1916"/><rect width="${DW}" height="28" fill="#2a2420"/>
      ${['#ef6f5e', '#f2c14e', '#9fd47a'].map((c, i) => `<circle cx="${18 + i * 18}" cy="14" r="5.5" fill="${c}"/>`).join('')}
      <text x="${DW / 2}" y="19" text-anchor="middle" font-family="${MONO}" font-weight="700" font-size="12" fill="#8a7d6a">${esc(p.title || 'claude — tvhead-studio')}</text>${body}${caret}</g>`;
  },

  // a finished doodle video playing: grey paper, a TV-head figure, an optional word. p.word, p.len (seconds of the fake timeline)
  video: (p, t, w, h) => {
    const k = w / 560, DH = h / k, lt = t - (p.t0 || 0), len = p.len || 60;
    const fig = withPalette(DOODLE_PAL, () => characterSvg({ el: 'char', kind: 'tv', id: 'mini', seed: 7, x: 280, y: DH * .86, scale: DH / 560, face: p.face || 'happy', pose: Math.floor(lt / 2.2) % 2 ? 'point' : 'wave', prevPose: 'wave', poseK: 1, poseT: -9, t0: -9 }, t));
    const word = p.word ? `<text x="280" y="${f2(DH * .2)}" text-anchor="middle" font-family="Hand" font-size="${f2(DH * .13)}" fill="#141414">${esc(p.word)}</text>` : '';
    const kk = clamp(lt / len);
    return `<g transform="scale(${f2(k)})"><rect width="560" height="${f2(DH)}" fill="#c6ccd0"/><circle cx="280" cy="${f2(DH * .45)}" r="${f2(DH * .7)}" fill="#d3d8db" opacity=".7"/>
      <path d="M0 ${f2(DH * .86)} H560" stroke="#141414" stroke-width="3"/>${word}${fig}
      <rect y="${f2(DH - 30)}" width="560" height="30" fill="#000" opacity=".45"/><path d="M14 ${f2(DH - 22)} v14 l12 -7 Z" fill="#fff"/>
      <rect x="40" y="${f2(DH - 17)}" width="500" height="5" rx="2.5" fill="#fff" opacity=".35"/><rect x="40" y="${f2(DH - 17)}" width="${f2(500 * kk)}" height="5" rx="2.5" fill="#ffc93a"/></g>`;
  },
});

// ─── props: badge, screen ───────────────────────────────────────────────────────────────
Object.assign(PROPS, {
  // music notes floating up from the origin. { n (5), color, spread (120) }
  notes(p, t, lt) {
    const n = p.n || 5, sp = p.spread || 120, r = rng(p.seed || 3); let s = '';
    for (let i = 0; i < n; i++) {
      const ph = r(), per = 2.4 + r() * 1.2, k = ((lt + ph * per) % per) / per, x = (r() - .5) * sp + Math.sin((lt + ph * 6) * 2.2) * 16, y = -k * 220, op = Math.sin(Math.PI * k);
      const dbl = r() < .4, col = p.color || ACCENT;
      s += `<g transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(Math.sin(lt * 3 + i) * 12)}) scale(${f2(.8 + .4 * r())})" opacity="${f2(op)}">
        <path d="M6 0 V-44 ${dbl ? 'L34 -52 V-8' : 'q14 6 16 22'}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse cx="-2" cy="2" rx="10" ry="7.5" transform="rotate(-20 -2 2)" fill="${col}" stroke="${INK}" stroke-width="4"/>
        ${dbl ? `<ellipse cx="26" cy="-6" rx="10" ry="7.5" transform="rotate(-20 26 -6)" fill="${col}" stroke="${INK}" stroke-width="4"/>` : ''}</g>`;
    }
    return s;
  },
  // name badge: big name + a coloured role chip (lower-third card). { text, role, color, size, tilt }
  badge(p) {
    const name = String(p.text ?? p.name ?? ''), role = String(p.role || ''), fs = p.size || 54;
    const nw = approxW(name, fs) * 1.08 + 8, rw = role ? role.length * 10.6 + 30 : 0, w = Math.max(nw, rw) + 46, h = fs + 34 + (role ? 46 : 0);
    const card = CARTOON ? '#fbf6ea' : WHITE;
    return `<g transform="rotate(${f2(p.tilt ?? -4)})"><rect x="${f2(-w / 2 + 7)}" y="${f2(-h / 2 + 8)}" width="${f2(w)}" height="${f2(h)}" rx="14" fill="#140c06" opacity=".5"/>
      <rect x="${f2(-w / 2)}" y="${f2(-h / 2)}" width="${f2(w)}" height="${f2(h)}" rx="14" fill="${card}" stroke="${INK}" stroke-width="5"/>
      <text x="0" y="${f2(-h / 2 + 16 + fs * .82)}" text-anchor="middle" font-family="${BADGE_FONT}" font-size="${fs}" fill="${INK}" stroke="${INK}" stroke-width="1.6" letter-spacing="2">${esc(name)}</text>
      ${role ? `<rect x="${f2(-rw / 2)}" y="${f2(h / 2 - 50)}" width="${f2(rw)}" height="32" rx="6" fill="${p.color || ACCENT}" stroke="${INK}" stroke-width="3"/>
        <text x="0" y="${f2(h / 2 - 28)}" text-anchor="middle" font-family="${MONO}" font-weight="700" font-size="17" fill="${INK}" letter-spacing="1">${esc(role)}</text>` : ''}</g>`;
  },
  // a device with a live screen. { show: 'chat'|'app'|'code'|'video'|'off', frame: 'laptop'|'window'|'phone'|'none', w, h, title, hands }
  // origin = centre of the display. A laptop's base reaches h/2 + 60 below it (rest it on the "desk" set's table edge).
  screen(p, t, lt) {
    const fr = p.frame || 'laptop', sw = p.w || (fr === 'phone' ? 300 : 560), sh = p.h || (fr === 'phone' ? 600 : 350), id = `scr${p.seed}`;
    const draw = SCREENS[p.show || 'chat'] || SCREENS.off;
    const content = `<g transform="translate(${-sw / 2} ${-sh / 2})"><clipPath id="${id}"><rect width="${sw}" height="${sh}" rx="${fr === 'phone' ? 26 : 6}"/></clipPath><g clip-path="url(#${id})">${draw(p, t, sw, sh)}</g></g>`;
    const glow = p.glow === false ? '' : `<ellipse rx="${f2(sw * .95)}" ry="${f2(sh * .95)}" fill="url(#screenGlow)" opacity="${CARTOON ? .5 : .25}"/>`;
    const glare = `<path d="M${-sw / 2} ${-sh / 2} H${sw * .1} L${-sw * .2} ${sh / 2} H${-sw / 2} Z" fill="url(#glare)"/>`;
    if (fr === 'window') {
      return `${glow}<rect x="${-sw / 2 + 8}" y="${-sh / 2 - 26}" width="${sw}" height="${sh + 34}" rx="14" fill="#140c06" opacity=".45"/>
        <rect x="${-sw / 2 - 4}" y="${-sh / 2 - 36}" width="${sw + 8}" height="${sh + 40}" rx="14" fill="#efe8db" stroke="${INK}" stroke-width="5"/>
        ${['#ef6f5e', '#f2c14e', '#9fd47a'].map((c, i) => `<circle cx="${-sw / 2 + 18 + i * 20}" cy="${-sh / 2 - 17}" r="6" fill="${c}" stroke="${INK}" stroke-width="1.5"/>`).join('')}
        ${p.title ? `<text x="0" y="${-sh / 2 - 11}" text-anchor="middle" font-family="${UI_FONT}" font-weight="700" font-size="15" fill="#6b6257">${esc(p.title)}</text>` : ''}${content}`;
    }
    if (fr === 'phone') {
      return `${glow}<rect x="${-sw / 2 - 16}" y="${-sh / 2 - 22}" width="${sw + 32}" height="${sh + 44}" rx="44" fill="#26282b" stroke="${INK}" stroke-width="6"/>${content}${glare}
        <rect x="-44" y="${-sh / 2 - 12}" width="88" height="20" rx="10" fill="#111"/>`;
    }
    if (fr === 'none') return content;
    const bz = 20, by = sh / 2 + bz;
    const hands = p.hands ? [-1, 1].map(s => { const bob = Math.max(0, Math.sin(t * 13 + (s > 0 ? 1.7 : 0))) * 7, hx = s * sw * .16, hy = by + 30 - bob, ax = s * sw * .3, ay = by + 230;
      const d = `M${f2(ax)} ${f2(ay)} L${f2(hx + s * 14)} ${f2(hy + 22)}`;
      return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="84" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${p.sleeve || '#6b6a3c'}" stroke-width="72" stroke-linecap="round"/>
        <path d="M${f2(ax - 30)} ${f2(ay - 40)} L${f2(hx + s * 14 - 22)} ${f2(hy + 40)}" stroke="#000" stroke-width="10" opacity=".12" stroke-linecap="round"/>
        <g transform="translate(${f2(hx)} ${f2(hy)}) rotate(${s * -14}) scale(1.25)"><path d="M-30 6 Q-32 -16 -12 -20 L14 -22 Q32 -20 32 0 Q32 18 12 20 L-18 20 Q-30 18 -30 6 Z" fill="${p.skin || SKIN}" stroke="${INK}" stroke-width="5"/>
        <path d="M-6 -20 v-8 M6 -21 v-9 M18 -20 v-7" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`; }).join('') : '';
    return `${glow}<rect x="${-sw / 2 - bz}" y="${-sh / 2 - bz}" width="${sw + 2 * bz}" height="${sh + 2 * bz}" rx="20" fill="#34373b" stroke="${INK}" stroke-width="6"/>
      <circle cx="0" cy="${-sh / 2 - bz / 2}" r="3.5" fill="#5a5f64"/>${content}${glare}
      <path d="M${-sw / 2 - bz - 12} ${by} H${sw / 2 + bz + 12} L${sw / 2 + bz + 70} ${by + 42} H${-sw / 2 - bz - 70} Z" fill="#b4b8bb" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M-70 ${by + 42} q0 -12 12 -12 h116 q12 0 12 12" fill="#9ea2a5" stroke="${INK}" stroke-width="4"/>${hands}`;
  },
});
