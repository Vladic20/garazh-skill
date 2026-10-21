// ─── styles: shared pieces for the extra looks (desk3d, noir, dota, blocks, pixel, comic) ─────────────────
// Each look lives in engine/styles/<look>.js (overlays, captions, sets, camera); this file holds what any look may use:
// two new character kinds ("cube" mascot, "blocky" brick figure), fantasy parts, infographic / game-HUD props and
// extra live screens (tweet, timeline, daw, prompt). Everything is a pure function of t.
const isLook = name => LOOK === name;
function addCss(css) { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }
function addLayer(id, beforeId, css = '') {
  const d = document.createElement('div'); d.id = id; d.style.cssText = `position:absolute;inset:0;pointer-events:none;${css}`;
  const st = document.getElementById('stage'); st.insertBefore(d, beforeId ? document.getElementById(beforeId) : null); return d;
}
function mixHex(a, b, k) {   // blend two #rrggbb colours (k = 0 → a, 1 → b)
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
const lighten = (c, k) => mixHex(c, '#ffffff', k), darken = (c, k) => mixHex(c, '#000000', k);
const pnum = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ─── character kinds: cube mascot, blocky figure ─────────────────────────────────────────────
// "kind": "cube"   — a little clay box with eyes and stubby legs (hops, squashes); "hat": "candle" adds a flickering candle.
// "kind": "blocky" — a brick-built figure: square head with a face, torso, swinging block arms and legs
//                    (colours: skin = head + arms, color = torso, legs).
function cubeSvg(c, t) {
  const phase = (c.seed % 997) / 997, col = c.color && c.color !== INK ? c.color : '#e07b54', P = c.pose || 'idle';
  const jump = P === 'cheer' || P === 'up' || P === 'raise', walk = P === 'walk' || P === 'run';
  let hop = 0, sq = 1;
  if (jump) { const k = (t * 1.6 + phase) % 1; hop = -Math.sin(k * Math.PI) * 46; sq = k < .08 || k > .92 ? .86 : 1.04; }
  else if (walk) { const k = (t * (P === 'run' ? 4 : 2.6) + phase) % 1; hop = -Math.sin(k * Math.PI) * 16; sq = k < .1 ? .92 : 1; }
  else sq = 1 + Math.sin(t * 2.4 + phase * 6) * .025;
  if (P === 'slump') sq = .82;
  const tilt = P === 'point' ? -9 : P === 'think' ? 7 : P === 'shrug' ? Math.sin(t * 3) * 6 : 0;
  const w = 120, h = 100, dx = 20, dy = -16, top = -h - 24;
  const blink = ((t + phase * 5) % 3.6) < .12, look = Math.sin(t * .7 + phase * 4) * 4;
  const legs = [-38, 26].map((x, i) => { const k = walk ? Math.sin(t * 14 + i * Math.PI) * 4 : 0;
    return `<rect x="${x + dx * .6}" y="${-30 + k * .4}" width="18" height="26" rx="6" fill="${darken(col, .35)}"/><rect x="${x}" y="${-26 - k}" width="20" height="26" rx="7" fill="${darken(col, .18)}" stroke="${darken(col, .5)}" stroke-width="1.5"/>`; }).join('');
  const face = c.face || 'happy';
  const eyeH = face === 'tired' || face === 'smug' ? 6 : face === 'shock' || face === 'awe' ? 20 : 16;
  const eyes = blink ? `<path d="M${-28 + look} ${top + 42} h12 M${12 + look} ${top + 42} h12" stroke="#1d1410" stroke-width="4" stroke-linecap="round"/>`
    : [-22, 18].map(x => `<rect x="${x - 5 + look}" y="${top + 42 - eyeH / 2}" width="11" height="${eyeH}" rx="5" fill="#1d1410"/><circle cx="${x - 1 + look}" cy="${top + 40 - eyeH / 4}" r="2.2" fill="#fff"/>`).join('');
  const mouth = c.talking ? `<ellipse cx="${-2 + look}" cy="${top + 66}" rx="6" ry="${f2(2 + Math.abs(Math.sin(t * 17)) * 5)}" fill="#3a1a10"/>`
    : face === 'shock' || face === 'awe' ? `<ellipse cx="${-2 + look}" cy="${top + 66}" rx="5" ry="6" fill="#3a1a10"/>`
    : face === 'sad' || face === 'worried' ? `<path d="M${-10 + look} ${top + 70} q8 -6 16 0" fill="none" stroke="#3a1a10" stroke-width="3" stroke-linecap="round"/>`
    : `<path d="M${-9 + look} ${top + 64} q7 6 14 0" fill="none" stroke="#3a1a10" stroke-width="3" stroke-linecap="round"/>`;
  const candle = c.hat === 'candle' ? (() => { const fl = 1 + Math.sin(t * 23) * .08 + Math.sin(t * 37) * .05, sw = Math.sin(t * 9) * 2;
    return `<circle cx="${dx * .5}" cy="${top + dy - 56}" r="46" fill="url(#candleGlow)"/><rect x="${dx * .5 - 5}" y="${top + dy - 34}" width="10" height="30" rx="3" fill="#f6e7c0" stroke="#c9a46a" stroke-width="1.5"/>
      <path transform="translate(${dx * .5 + sw * .3} ${top + dy - 36}) scale(${f2(fl)} ${f2(fl * 1.1)})" d="M0 0 C-9 -8 -6 -20 0 -30 C6 -20 9 -8 0 0 Z" fill="#ffd34d"/><path transform="translate(${dx * .5} ${top + dy - 37}) scale(${f2(fl)})" d="M0 0 C-4 -5 -3 -12 0 -17 C3 -12 4 -5 0 0 Z" fill="#fff6d0"/>`; })() : '';
  const body = `<ellipse cx="${dx * .4}" cy="2" rx="${w * .62}" ry="12" fill="#000" opacity=".28"/>${legs}
    <g transform="translate(0 ${f2(hop)}) rotate(${f2(tilt)} 0 -60) scale(1 ${f2(sq)})" style="transform-origin:0 0">
      <path d="M${-w / 2} ${top} l${dx} ${dy} h${w} l${-dx} ${-dy} Z" fill="${lighten(col, .22)}"/>
      <path d="M${w / 2} ${top} l${dx} ${dy} v${h} l${-dx} ${-dy} Z" fill="${darken(col, .22)}"/>
      <rect x="${-w / 2}" y="${top}" width="${w}" height="${h}" rx="10" fill="url(#cubeFace)" style="fill:${col}"/>
      <rect x="${-w / 2}" y="${top}" width="${w}" height="${h}" rx="10" fill="url(#cubeShade)"/>
      ${eyes}${mouth}${candle}</g>`;
  return `<g transform="translate(${f2(c.x)} ${f2(c.y)}) scale(${f2((c.flip ? -1 : 1) * c.scale * 1.3)} ${f2(c.scale * 1.3)})">${body}</g>`;
}

function blockySvg(c, t) {
  const phase = (c.seed % 997) / 997, P = c.pose || 'idle';
  const skin = c.skin || '#f5cd30', torso = c.color && c.color !== INK ? c.color : '#0d69ac', legsC = c.legs || '#a4bd47';
  const walk = P === 'walk' || P === 'run', sw = walk ? Math.sin(t * (P === 'run' ? 12 : 7) + phase * 6) * (P === 'run' ? 42 : 28) : 0;
  const arm = { idle: [6, -6], wave: [6, -160 + Math.sin(t * 9) * 14], raise: [6, -150], point: [6, -90], up: [-170, 170], cheer: [-158 + Math.sin(t * 8) * 8, 158 - Math.sin(t * 8) * 8],
    hold: [-55, 55], phone: [6, -70], think: [10, -125], shrug: [-40, 40], cross: [-60, 60], head: [-150, 150], facepalm: [6, -150], slump: [3, -3], hip: [30, -30] }[P] || [6, -6];
  const aL = walk ? sw : arm[0], aR = walk ? -sw : arm[1];
  const bob = walk ? -Math.abs(Math.sin(t * 7 + phase * 6)) * 6 : Math.sin(t * 2 + phase * 6) * 1.5;
  const cheerHop = P === 'cheer' ? -Math.abs(Math.sin(t * 6)) * 22 : 0;
  const box = (x, y, w, h, col, rx = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${col}" stroke="${darken(col, .55)}" stroke-width="3"/>
    <rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="7" rx="3" fill="#fff" opacity=".28"/><rect x="${x + w - 11}" y="${y + 8}" width="8" height="${h - 12}" rx="3" fill="#000" opacity=".14"/>`;
  const limb = (px, py, ang, w, h, col) => `<g transform="rotate(${f2(ang)} ${px} ${py})">${box(px - w / 2, py - 6, w, h, col)}</g>`;
  const legs = limb(-24, -116, walk ? -sw * .8 : 0, 46, 118, legsC) + limb(24, -116, walk ? sw * .8 : 0, 46, 118, legsC);
  const face = c.face || 'happy', blink = ((t + phase * 7) % 3.8) < .12;
  const ey = -292, eyes = blink || face === 'tired' ? `<path d="M-22 ${ey} h12 M10 ${ey} h12" stroke="#111" stroke-width="5" stroke-linecap="round"/>`
    : face === 'shock' || face === 'awe' ? `<ellipse cx="-16" cy="${ey}" rx="7" ry="10" fill="#111"/><ellipse cx="16" cy="${ey}" rx="7" ry="10" fill="#111"/>`
    : `<ellipse cx="-16" cy="${ey}" rx="5.5" ry="8" fill="#111"/><ellipse cx="16" cy="${ey}" rx="5.5" ry="8" fill="#111"/>`;
  const brows = face === 'angry' ? `<path d="M-26 -306 l16 6 M26 -306 l-16 6" stroke="#111" stroke-width="5" stroke-linecap="round"/>` : '';
  const mouth = c.talking ? `<ellipse cx="0" cy="-266" rx="9" ry="${f2(3 + Math.abs(Math.sin(t * 16)) * 6)}" fill="#111"/>`
    : face === 'shock' || face === 'awe' ? `<ellipse cx="0" cy="-264" rx="8" ry="9" fill="#111"/>`
    : face === 'sad' || face === 'cry' || face === 'worried' ? `<path d="M-14 -258 q14 -12 28 0" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/>`
    : face === 'joy' ? `<path d="M-20 -274 q20 22 40 0 Z" fill="#111"/>` : face === 'smug' ? `<path d="M-14 -270 q16 8 26 -6" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/>`
    : `<path d="M-18 -274 q18 16 36 0" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/>`;
  const hat = c.hat === 'cap' ? box(-48, -352, 96, 24, c.hatColor || '#c0392b', 6) + `<rect x="30" y="-334" width="40" height="10" rx="4" fill="${darken(c.hatColor || '#c0392b', .15)}" stroke="#222" stroke-width="2"/>`
    : c.hat === 'crown' ? `<path d="M-38 -340 L-44 -372 L-20 -352 L0 -380 L20 -352 L44 -372 L38 -340 Z" fill="#f5c542" stroke="#8a6a12" stroke-width="3"/>`
    : c.hat === 'headphones' ? `<path d="M-50 -290 C-50 -360 50 -360 50 -290" fill="none" stroke="#222" stroke-width="9"/><rect x="-60" y="-306" width="18" height="34" rx="5" fill="#e74c3c" stroke="#222" stroke-width="3"/><rect x="42" y="-306" width="18" height="34" rx="5" fill="#e74c3c" stroke="#222" stroke-width="3"/>` : '';
  const held = c.hold && window.HELD && HELD[c.hold.split(':')[0]] ? HELD[c.hold.split(':')[0]]([60, -130], c.hold.split(':').slice(1).join(':'), c) : '';
  const fig = `<ellipse cx="0" cy="4" rx="70" ry="12" fill="#000" opacity=".22"/>${legs}
    <g transform="translate(0 ${f2(bob)})">${limb(-62, -232, aL, 40, 114, skin)}${box(-50, -240, 100, 124, torso, 6)}
      <rect x="-50" y="-150" width="100" height="10" fill="${darken(torso, .25)}" opacity=".5"/>
      <g transform="rotate(${f2(Math.sin(t * 1.4 + phase * 5) * 3)} 0 -240)">${box(-44, -330, 88, 84, skin, 18)}${eyes}${brows}${mouth}${hat}</g>
      ${limb(62, -232, aR, 40, 114, skin)}${held}</g>`;
  return `<g transform="translate(${f2(c.x)} ${f2(c.y + cheerHop)}) scale(${f2((c.flip ? -1 : 1) * c.scale)} ${f2(c.scale)})">${fig}</g>`;
}
const _characterSvgS = characterSvg;
characterSvg = function (c, t) {
  if (c.kind === 'cube') return cubeSvg(c, t);
  if (c.kind === 'blocky') return blockySvg(c, t);
  return _characterSvgS(c, t);
};

// ─── fantasy parts (dota look, usable anywhere) ─────────────────────────────────────────────
Object.assign(window.HATS, {
  helm: (c, top, w) => `<path d="M${-w - 6} ${top + 34} V${top - 6} C${-w - 6} ${top - 52} ${w + 6} ${top - 52} ${w + 6} ${top - 6} V${top + 34}" fill="${c.hatColor || '#8d949c'}" ${ST2(4)}/>
    <path d="M0 ${top - 40} C-6 ${top - 80} 26 ${top - 96} 40 ${top - 78} C20 ${top - 76} 10 ${top - 60} 6 ${top - 40} Z" fill="${c.crest || '#b8322a'}" ${ST2(3)}/><path d="M${-w - 6} ${top + 4} H${w + 6}" stroke="#c8a24a" stroke-width="7"/>`,
  horns: (c, top, w) => `<path d="M${-w + 6} ${top + 6} C${-w - 40} ${top - 6} ${-w - 34} ${top - 60} ${-w - 10} ${top - 74} C${-w - 14} ${top - 44} ${-w + 6} ${top - 24} ${-w + 22} ${top - 12} Z M${w - 6} ${top + 6} C${w + 40} ${top - 6} ${w + 34} ${top - 60} ${w + 10} ${top - 74} C${w + 14} ${top - 44} ${w - 6} ${top - 24} ${w - 22} ${top - 12} Z" fill="#e8dcc0" ${ST2(3.5)}/>`,
  hood2: (c, top, w) => `<path d="M${-w - 14} ${top + 90} C${-w - 26} ${top - 10} ${-w} ${top - 56} 0 ${top - 62} C${w} ${top - 56} ${w + 26} ${top - 10} ${w + 14} ${top + 90} L${w - 6} ${top + 70} C${w} ${top + 10} ${-w} ${top + 10} ${-w + 6} ${top + 70} Z" fill="${c.hatColor || '#3b2a52'}" ${ST2(3.5)}/>`,
});
Object.assign(window.BODIES, {
  armor: c => { const col = c.color || '#6d7680';
    return { legs: 'trousers', svg: `<path d="M${-BTW - 8} ${BT + 10} Q${-BTW - 8} ${BT} ${-BTW + 4} ${BT - 4} L${BTW - 4} ${BT - 4} Q${BTW + 8} ${BT} ${BTW + 8} ${BT + 10} L${BTW + 6} -110 L${-BTW - 6} -110 Z" fill="${col}" ${ST2(3.5)}/>
      <path d="M${-BTW - 8} ${BT + 10} q-16 4 -18 26 q14 4 26 -6 Z M${BTW + 8} ${BT + 10} q16 4 18 26 q-14 4 -26 -6 Z" fill="${lighten(col, .2)}" ${ST2(3)}/>
      <path d="M0 ${BT + 6} V-118 M-26 -160 H26" stroke="#c8a24a" stroke-width="5"/><circle cy="-190" r="10" fill="#c8a24a" ${ST2(2.5)}/><path d="M${-BTW - 6} -124 H${BTW + 6}" stroke="#5a3a1c" stroke-width="12"/>` }; },
});
Object.assign(window.HELD, {
  sword: ([x, y]) => `<g transform="translate(${f2(x)} ${f2(y)}) rotate(-28)"><path d="M-5 -14 L0 -150 L5 -14 Z" fill="#dfe6ec" ${ST2(3)}/><path d="M0 -140 V-20" stroke="#fff" stroke-width="1.5" opacity=".7"/><path d="M-22 -12 H22" ${ST2(8)}/><path d="M-22 -12 H22" stroke="#c8a24a" stroke-width="4"/><path d="M0 -10 V14" ${ST2(7)}/><circle cy="18" r="6" fill="#c8a24a" ${ST2(2.5)}/></g>`,
  staff: ([x, y], col, c) => `<g transform="translate(${f2(x)} ${f2(y)}) rotate(-8)"><path d="M0 60 V-150" stroke="#5a3a1c" stroke-width="9" stroke-linecap="round"/><path d="M0 60 V-150" ${ST2(2)} opacity=".4"/>
    <circle cy="-168" r="34" fill="url(#orbGlow)"/><circle cy="-168" r="15" fill="${col || '#62e0ff'}" ${ST2(3)}/><circle cx="-5" cy="-173" r="4" fill="#fff" opacity=".8"/></g>`,
  shield: ([x, y]) => `<g transform="translate(${f2(x - 10)} ${f2(y - 10)})"><path d="M-30 -40 H30 V0 C30 30 0 44 0 44 C0 44 -30 30 -30 0 Z" fill="#7a2a22" ${ST2(4)}/><path d="M-30 -40 H30 V0 C30 30 0 44 0 44 C0 44 -30 30 -30 0 Z" fill="none" stroke="#c8a24a" stroke-width="4" transform="scale(.8)"/></g>`,
});

// extra defs for the new kinds and props
const _installStaticS = installStatic;
installStatic = function () {
  _installStaticS();
  const host = document.createElement('div');
  host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs>
    <linearGradient id="cubeShade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
    <radialGradient id="candleGlow"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".7"/><stop offset="1" stop-color="#ffb84a" stop-opacity="0"/></radialGradient>
    <radialGradient id="orbGlow"><stop offset="0" stop-color="#9ff0ff" stop-opacity=".8"/><stop offset="1" stop-color="#3ab6ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="emberGlow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient>
    <radialGradient id="radGlow"><stop offset="0" stop-color="#b6ff7a" stop-opacity=".75"/><stop offset="1" stop-color="#3fbf3a" stop-opacity="0"/></radialGradient>
    <radialGradient id="direGlow"><stop offset="0" stop-color="#ff8a6a" stop-opacity=".75"/><stop offset="1" stop-color="#c2281a" stop-opacity="0"/></radialGradient>
    <radialGradient id="neonGlow"><stop offset="0" stop-color="#ff5fb8" stop-opacity=".75"/><stop offset="1" stop-color="#ff2d95" stop-opacity="0"/></radialGradient>
    <radialGradient id="warmGlow"><stop offset="0" stop-color="#ffd890" stop-opacity=".7"/><stop offset="1" stop-color="#ffb050" stop-opacity="0"/></radialGradient>
    <filter id="paint" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="11"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .18"/></feComponentTransfer></filter>
    <filter id="glow4" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <pattern id="studs" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="11" fill="#fff" opacity=".18"/><circle cx="20" cy="22" r="11" fill="#000" opacity=".12"/><circle cx="20" cy="20" r="9" fill="#fff" opacity=".08"/></pattern>
  </defs></svg>`;
  document.getElementById('defs').appendChild(host.firstChild);
};

// ─── props: infographic + game HUD pieces (styled from the theme; any look) ─────────────────────
Object.assign(PROPS, {
  // eyebrow + headline + sub on a card (noir explainer). { eyebrow, title, sub, accent: ["word"], size (64), tone: "dark"|"light" (text colour) }
  headline(p, t, lt) {
    const fs = p.size || 64, light = p.tone === 'light', col = light ? '#fff' : (THEME.ink || INK), mut = light ? '#bdb6ad' : '#8b8378';
    const acc = new Set((p.accent || []).map(w => String(w).toLowerCase()));
    const lines = wrapText(p.title || '', fs, p.maxWidth || W - 120, (s, f) => approxW(s, f) * 1.12);
    const k = e => easeOut(prog(lt, e, e + .45));
    let s = p.eyebrow ? `<text y="${-lines.length * fs * .55 - 46}" text-anchor="middle" font-family="${MONO}" font-weight="700" font-size="17" letter-spacing="4" fill="${p.eyebrowColor || mut}" opacity="${f2(k(0))}">${esc(String(p.eyebrow).toUpperCase())}</text>` : '';
    lines.forEach((ln, i) => {
      const y = (i - (lines.length - 1) / 2) * fs * 1.05 + fs * .35, kk = k(.08 + i * .1);
      const spans = ln.split(' ').map(w => `<tspan fill="${acc.has(w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')) ? ACCENT : col}">${esc(w)}</tspan>`).join(' ');
      s += `<text y="${f2(y + 24 * (1 - kk))}" text-anchor="middle" font-family="Inter, Rubik, sans-serif" font-weight="800" font-size="${fs}" letter-spacing="-1" opacity="${f2(kk)}">${spans}</text>`;
    });
    if (p.sub) s += `<text y="${f2(lines.length * fs * .55 + 40)}" text-anchor="middle" font-family="Inter, Rubik, sans-serif" font-weight="800" font-size="${f2(fs * .42)}" fill="${col}" opacity="${f2(k(.35))}">${esc(p.sub)}</text>`;
    return s;
  },
  // row of HUD chips with labels and counting values. { items: [{ label, from, to, suffix, prefix, accent }], dur (1.2) }
  hud(p, t, lt) {
    const items = p.items || [], cw = p.cellW || 150, gap = 8, tot = items.length * cw + (items.length - 1) * gap;
    return items.map((it, i) => { const x = -tot / 2 + i * (cw + gap), k = easeOut(clamp(lt / (p.dur || 1.2))), v = lerp(it.from ?? it.to ?? 0, it.to ?? 0, k);
      const txt = typeof it.to === 'number' ? `${it.prefix || ''}${pnum(Math.round(v))}${it.suffix || ''}` : String(it.value ?? '');
      return `<rect x="${x}" y="-30" width="${cw}" height="60" rx="8" fill="#141414" opacity=".82"/><text x="${x + 12}" y="-10" font-family="${MONO}" font-weight="700" font-size="11" letter-spacing="2" fill="#9a948c">${esc(String(it.label || '').toUpperCase())}</text>
        <text x="${x + 12}" y="20" font-family="Inter, Rubik, sans-serif" font-weight="800" font-size="22" fill="${it.accent ? ACCENT : '#fff'}">${esc(txt)}</text>`; }).join('');
  },
  // grid of banknotes popping in. { rows (8), cols (10), bill [w,h], step (s per row) }
  billgrid(p, t, lt) {
    const rows = p.rows || 8, cols = p.cols || 10, [bw, bh] = p.bill || [44, 20], g = 6, tw = cols * (bw + g), th = rows * (bh + g); let s = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const k = easeOutBack(prog(lt, (r * cols + c) * (p.step || .012), (r * cols + c) * (p.step || .012) + .25)); if (k <= 0) continue;
      const x = -tw / 2 + c * (bw + g) + bw / 2, y = -th / 2 + r * (bh + g) + bh / 2;
      s += `<g transform="translate(${x} ${y}) scale(${f2(k)})"><rect x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="2" fill="#8fbf78" stroke="#2f4a25" stroke-width="2"/><circle r="${bh * .3}" fill="none" stroke="#2f4a25" stroke-width="1.6"/></g>`; }
    return s;
  },
  // pink label with a small line under it. { text, sub }
  stamp(p, t, lt) {
    const txt = String(p.text || ''), fs = p.size || 26, w = approxW(txt, fs) * 1.2 + 30, sw = p.sub ? String(p.sub).length * 7.4 + 24 : 0, ww = Math.max(w, sw), k = easeOutBack(clamp(lt / .3));
    return `<g transform="scale(${f2(k)}) rotate(${p.tilt ?? -3})"><rect x="${-ww / 2}" y="${-fs - 8}" width="${ww}" height="${fs + 14 + (p.sub ? 22 : 0)}" rx="4" fill="${p.color || ACCENT}"/>
      <text y="-4" text-anchor="middle" font-family="Inter, Rubik, sans-serif" font-weight="800" font-size="${fs}" fill="#fff">${esc(txt)}</text>
      ${p.sub ? `<text y="18" text-anchor="middle" font-family="${MONO}" font-weight="700" font-size="11" letter-spacing="2" fill="#fff" opacity=".85">${esc(String(p.sub).toUpperCase())}</text>` : ''}</g>`;
  },
  // ring drawn around a point (attention marker). { r (60), color }
  marker(p, t, lt) {
    const r = p.r || 60, k = easeInOut(clamp(lt / .5)), L = 2 * Math.PI * r;
    return `<circle r="${r}" fill="none" stroke="${p.color || ACCENT}" stroke-width="6" stroke-dasharray="${f2(L)}" stroke-dashoffset="${f2(L * (1 - k))}" transform="rotate(-90)" stroke-linecap="round"/>`;
  },
  // comic starburst with a word. { text ("POW!"), color, fill, r (130), spikes (14) }
  pow(p, t, lt) {
    const r = p.r || 130, n = p.spikes || 14, k = easeOutBack(clamp(lt / .25)), wob = 1 + Math.sin(lt * 18) * .02; let d = '';
    for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, rr = i % 2 ? r * .62 : r * (1 + ((i * 37) % 7) / 28); d += `${i ? 'L' : 'M'}${f2(Math.cos(a) * rr * 1.25)} ${f2(Math.sin(a) * rr)} `; }
    const txt = String(p.text || 'POW!'), fs = Math.min(r * .75, (r * 2.2) / Math.max(1, txt.length * .62));
    return `<g transform="scale(${f2(k * wob)}) rotate(${p.tilt ?? -8})"><path d="${d}Z" fill="${p.fill || '#ffe94a'}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
      <path d="${d}Z" fill="none" stroke="${p.color || '#e8202a'}" stroke-width="3" transform="scale(.82)"/>
      <text y="${f2(fs * .34)}" text-anchor="middle" font-family="Bangers, 'Russo One', sans-serif" font-size="${f2(fs)}" fill="${p.color || '#e8202a'}" stroke="${INK}" stroke-width="5" paint-order="stroke" letter-spacing="2">${esc(txt)}</text></g>`;
  },
  // radial speed lines around the origin (action beat). { r0 (220), r1 (900), n (48), color }
  speedlines(p, t, lt) {
    const n = p.n || 48, r0 = p.r0 || 220, r1 = p.r1 || 900, rr = rng(Math.floor(lt * 12) + 3); let s = '';
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rr() * .05, a0 = r0 + rr() * 60, w = 3 + rr() * 9;
      s += `<path d="M${f2(Math.cos(a) * a0)} ${f2(Math.sin(a) * a0)} L${f2(Math.cos(a + w / r1) * r1)} ${f2(Math.sin(a + w / r1) * r1)} L${f2(Math.cos(a - w / r1) * r1)} ${f2(Math.sin(a - w / r1) * r1)} Z" fill="${p.color || INK}" opacity=".85"/>`; }
    return s;
  },
  // game leaderboard panel. { title, rows: [[name, value]], hi (index), w (240) }
  leaderboard(p, t, lt) {
    const rows = p.rows || [], w = p.w || 240, rh = 30;
    return `<rect x="${-w / 2}" y="-24" width="${w}" height="${30 + rows.length * rh + 10}" rx="10" fill="#1b1b1b" opacity=".72"/>
      <text x="${-w / 2 + 14}" y="0" font-family="'Russo One', Rubik, sans-serif" font-size="15" fill="#fff" opacity=".85">${esc(p.title || 'Players')}</text><text x="${w / 2 - 14}" y="0" text-anchor="end" font-family="'Russo One', Rubik, sans-serif" font-size="15" fill="#fff" opacity=".85">${esc(p.col || 'Points')}</text>
      ${rows.map(([n, v], i) => { const k = easeOut(prog(lt, .2 + i * .12, .5 + i * .12)), y = 14 + i * rh;
        return `<g opacity="${f2(k)}">${i === p.hi ? `<rect x="${-w / 2 + 6}" y="${y}" width="${w - 12}" height="${rh - 4}" rx="6" fill="#00a2ff" opacity=".45"/>` : ''}
          <text x="${-w / 2 + 14}" y="${y + 19}" font-family="'Russo One', Rubik, sans-serif" font-size="15" fill="#fff">${esc(n)}</text><text x="${w / 2 - 14}" y="${y + 19}" text-anchor="end" font-family="'Russo One', Rubik, sans-serif" font-size="15" fill="#fff">${esc(typeof v === 'number' ? pnum(Math.round(lerp(0, v, k))) : v)}</text></g>`; }).join('')}`;
  },
  // in-game chat box, lines appear one by one. { lines: [[name, text, colour?]], step (0.9), w (360) }
  chatbox(p, t, lt) {
    const lines = p.lines || [], w = p.w || 360, shown = lines.filter((_, i) => lt >= i * (p.step || .9));
    return `<rect x="0" y="0" width="${w}" height="${18 + 26 * Math.max(3, lines.length)}" rx="8" fill="#1b1b1b" opacity=".55"/>` + shown.map(([n, tx, col], i) =>
      `<text x="12" y="${26 + i * 26}" font-family="'Russo One', Rubik, sans-serif" font-size="15"><tspan fill="${col || '#ffd34d'}">[${esc(n)}]:</tspan><tspan fill="#fff"> ${esc(tx)}</tspan></text>`).join('');
  },
  // spinning coin with "+N" floating up. { text ("+1"), color }
  pickup(p, t, lt) {
    const sq = Math.abs(Math.cos(lt * 5)), up = clamp(lt / 1.2), txt = String(p.text || '+1');
    return `<ellipse cy="${f2(-up * 10)}" rx="${f2(30 * Math.max(.15, sq))}" ry="30" fill="#f5c542" stroke="#8a6a12" stroke-width="5"/><ellipse cy="${f2(-up * 10)}" rx="${f2(16 * Math.max(.15, sq))}" ry="16" fill="none" stroke="#fff3b0" stroke-width="3"/>
      <text y="${f2(-50 - up * 60)}" text-anchor="middle" font-family="'Russo One', Rubik, sans-serif" font-size="38" fill="${p.color || '#7CFC00'}" stroke="#111" stroke-width="6" paint-order="stroke" opacity="${f2(1 - prog(lt, 1.2, 1.8))}">${esc(txt)}</text>`;
  },
  // bottom hotbar with item slots. { slots: ["⚔", "🍕"…] or labels, active (index) }
  hotbar(p) {
    const n = (p.slots || [1, 2, 3, 4, 5]).length, s = 64, g = 8, tw = n * s + (n - 1) * g;
    return (p.slots || [1, 2, 3, 4, 5]).map((it, i) => { const x = -tw / 2 + i * (s + g);
      return `<rect x="${x}" y="${-s / 2}" width="${s}" height="${s}" rx="8" fill="#1b1b1b" opacity=".6" stroke="${i === p.active ? '#fff' : 'none'}" stroke-width="3"/><text x="${x + 6}" y="${-s / 2 + 16}" font-family="'Russo One', Rubik" font-size="12" fill="#fff" opacity=".8">${i + 1}</text>
        <text x="${x + s / 2}" y="${10}" text-anchor="middle" font-family="'Russo One', Rubik" font-size="22" fill="#fff">${esc(it)}</text>`; }).join('');
  },
  // MOBA unit frame: health + mana bars that animate. { hp: [from, to] 0..1, mp: [from, to], level, name, team: "radiant"|"dire", w (220) }
  unitbar(p, t, lt) {
    const w = p.w || 220, k = easeInOut(clamp(lt / (p.dur || 1))), hp = lerp(...(p.hp || [1, 1]), k), mp = lerp(...(p.mp || [1, 1]), k), team = p.team === 'dire' ? '#c23c2a' : '#56b33a';
    return `${p.name ? `<text y="-26" text-anchor="middle" font-family="Cinzel, 'Cormorant SC', serif" font-weight="700" font-size="17" fill="#f3dfae" stroke="#000" stroke-width="4" paint-order="stroke">${esc(p.name)}</text>` : ''}
      <rect x="${-w / 2 - 3}" y="-17" width="${w + 6}" height="30" rx="3" fill="#0b0c0e" stroke="#6b5a3a" stroke-width="2"/>
      <rect x="${-w / 2}" y="-14" width="${f2(w * hp)}" height="15" fill="${team}"/><path d="M${-w / 2} -14 h${f2(w * hp)}" stroke="#fff" stroke-width="2" opacity=".35"/>
      ${Array.from({ length: 9 }, (_, i) => `<path d="M${-w / 2 + (i + 1) * w / 10} -14 v15" stroke="#000" stroke-width="1.5" opacity=".5"/>`).join('')}
      <rect x="${-w / 2}" y="3" width="${f2(w * mp)}" height="7" fill="#3d7fe0"/>
      ${p.level ? `<circle cx="${-w / 2 - 20}" cy="-2" r="16" fill="#1c1a16" stroke="#c8a24a" stroke-width="3"/><text x="${-w / 2 - 20}" y="5" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="16" fill="#f3dfae">${esc(p.level)}</text>` : ''}`;
  },
  // MOBA ability bar: 4 icons with hotkeys, cooldown sweeps; the "cast" one flashes. { keys ("QWER"), icons: ["⚡","❄","🔥","☄"], cast (index), castAt (s) }
  abilities(p, t, lt) {
    const keys = (p.keys || 'QWER').split(''), icons = p.icons || ['⚡', '❄', '🔥', '☄'], s = 78, g = 10, tw = keys.length * s + (keys.length - 1) * g, castAt = p.castAt ?? .8;
    const hues = p.colors || ['#3d7fe0', '#62d0ff', '#e0582a', '#9b4de0'];
    return `<rect x="${-tw / 2 - 16}" y="${-s / 2 - 16}" width="${tw + 32}" height="${s + 32}" rx="10" fill="#14161a" stroke="#6b5a3a" stroke-width="3"/>` + keys.map((kk, i) => {
      const x = -tw / 2 + i * (s + g), cast = i === p.cast && lt >= castAt, cd = cast ? 1 - clamp((lt - castAt) / (p.cooldown || 3)) : 0, fl = cast ? Math.max(0, 1 - (lt - castAt) / .35) : 0;
      const ang = cd * Math.PI * 2, cx = x + s / 2, cy = 0, R = s;
      const sweep = cd > 0 ? `<path d="M${cx} ${cy} L${cx} ${cy - R} A${R} ${R} 0 ${ang > Math.PI ? 1 : 0} 1 ${f2(cx + Math.sin(ang) * R)} ${f2(cy - Math.cos(ang) * R)} Z" fill="#000" opacity=".6" clip-path="url(#ab${i}${p.seed})"/>` : '';
      return `<clipPath id="ab${i}${p.seed}"><rect x="${x}" y="${-s / 2}" width="${s}" height="${s}" rx="6"/></clipPath>
        <rect x="${x}" y="${-s / 2}" width="${s}" height="${s}" rx="6" fill="${darken(hues[i % hues.length], .45)}" stroke="#c8a24a" stroke-width="3"/>
        <circle cx="${cx}" cy="0" r="${s * .36}" fill="${hues[i % hues.length]}" opacity=".55"/><text x="${cx}" y="12" text-anchor="middle" font-size="34" fill="#fff">${esc(icons[i] || '')}</text>
        ${sweep}${cd > 0 ? `<text x="${cx}" y="10" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="26" fill="#fff">${Math.ceil(cd * (p.cooldown || 3))}</text>` : ''}
        ${fl > 0 ? `<rect x="${x - 6}" y="${-s / 2 - 6}" width="${s + 12}" height="${s + 12}" rx="8" fill="none" stroke="#fff3c0" stroke-width="${f2(4 + 8 * fl)}" opacity="${f2(fl)}"/>` : ''}
        <rect x="${x + 2}" y="${s / 2 - 22}" width="20" height="20" rx="3" fill="#0b0c0e"/><text x="${x + 12}" y="${s / 2 - 7}" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="13" fill="#f3dfae">${kk}</text>`; }).join('');
  },
  // gold coin + "+150" floating up. { amount (150) }
  gold(p, t, lt) {
    const up = easeOut(clamp(lt / 1.4)), op = 1 - prog(lt, 1.3, 1.9);
    return `<g opacity="${f2(op)}" transform="translate(0 ${f2(-up * 70)})"><circle r="16" fill="#f5c542" stroke="#7a5a12" stroke-width="3"/><text x="0" y="6" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="16" fill="#7a5a12">G</text>
      <text x="24" y="10" font-family="Cinzel, 'Cormorant SC', serif" font-weight="700" font-size="32" fill="#f5c542" stroke="#000" stroke-width="5" paint-order="stroke">+${esc(p.amount ?? 150)}</text></g>`;
  },
  // ornate announcement banner ("FIRST BLOOD"). { text, sub, color }
  banner(p, t, lt) {
    const txt = String(p.text || ''), fs = p.size || 54, w = Math.max(360, approxW(txt, fs) * 1.35 + 120), k = easeOutBack(clamp(lt / .35)), col = p.color || '#c23c2a';
    return `<g transform="scale(${f2(k)} ${f2(.6 + .4 * k)})"><path d="M${-w / 2} -46 H${w / 2} L${w / 2 + 40} 0 L${w / 2} 46 H${-w / 2} L${-w / 2 - 40} 0 Z" fill="#14100c" stroke="#c8a24a" stroke-width="4"/>
      <path d="M${-w / 2 + 14} -34 H${w / 2 - 14} M${-w / 2 + 14} 34 H${w / 2 - 14}" stroke="${col}" stroke-width="3" opacity=".8"/>
      <text y="${fs * .34}" text-anchor="middle" font-family="Cinzel, 'Cormorant SC', serif" font-weight="700" font-size="${fs}" fill="${col}" stroke="#000" stroke-width="3" paint-order="stroke" letter-spacing="3">${esc(txt)}</text>
      ${p.sub ? `<text y="78" text-anchor="middle" font-family="Cinzel, 'Cormorant SC', serif" font-weight="700" font-size="22" fill="#f3dfae" stroke="#000" stroke-width="4" paint-order="stroke">${esc(p.sub)}</text>` : ''}</g>`;
  },
  // MOBA minimap with lanes and moving unit dots. { size (220) }
  minimap(p, t, lt) {
    const S = p.size || 220, h = S / 2, dot = (k, lane, col) => { const q = (k % 1); let x, y;
      if (lane === 0) { x = -h + 22; y = h - 22 - q * (S - 44); if (q > .5) { x = -h + 22 + (q - .5) * 2 * (S - 44); y = -h + 22; } }
      else if (lane === 1) { x = -h + 22 + q * (S - 44); y = h - 22 - q * (S - 44); }
      else { x = -h + 22 + Math.min(q * 2, 1) * (S - 44); y = h - 22; if (q > .5) { x = h - 22; y = h - 22 - (q - .5) * 2 * (S - 44); } }
      return `<circle cx="${f2(x)}" cy="${f2(y)}" r="5" fill="${col}" stroke="#000" stroke-width="1.5"/>`; };
    return `<rect x="${-h - 6}" y="${-h - 6}" width="${S + 12}" height="${S + 12}" rx="4" fill="#14100c" stroke="#c8a24a" stroke-width="3"/><rect x="${-h}" y="${-h}" width="${S}" height="${S}" fill="#24361f"/>
      <path d="M${-h} ${h} L${h} ${-h}" stroke="#2f5a8a" stroke-width="12" opacity=".7"/><path d="M${-h + 22} ${h - 22} V${-h + 22} H${h - 22} M${-h + 22} ${h - 22} L${h - 22} ${-h + 22} M${-h + 22} ${h - 22} H${h - 22} V${-h + 22}" fill="none" stroke="#8a7a52" stroke-width="5" opacity=".8"/>
      <circle cx="${-h + 20}" cy="${h - 20}" r="12" fill="#56b33a"/><circle cx="${h - 20}" cy="${-h + 20}" r="12" fill="#c23c2a"/>
      ${[0, 1, 2].map(l => dot(lt * .08 + l * .3, l, '#7cf04a') + dot(1 - (lt * .08 + l * .2) % 1, l, '#ff5a3a')).join('')}`;
  },
});

// ─── extra live screens for the "screen" prop ───────────────────────────────────────────────
Object.assign(window.SCREENS, {
  // social post (dark). { name, handle, text, highlight: ["phrase"…] marked in yellow one after another, stats: [replies, reposts, likes, views], time }
  tweet: (p, t, w, h) => {
    const k = w / 560, DH = h / k, lt = t - (p.t0 || 0), fs = p.fs || 21, lh = fs * 1.38;
    const text = String(p.text || ""), lines = wrapText(text, fs, 500, (s, f) => approxW(s, f) * 1.04);
    const hl = (p.highlight || []).map(s => String(s).toLowerCase());
    let y = 112, body = '';
    lines.forEach(ln => {
      let x = 30, out = '';
      for (const wd of ln.split(' ')) { const ww = approxW(wd + " ", fs) * 1.04, idx = hl.findIndex(ph => ph.split(' ').includes(wd.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '')));
        if (idx >= 0) { const kk = easeInOut(prog(lt, (p.hlAt ?? 1.2) + idx * .8, (p.hlAt ?? 1.2) + idx * .8 + .5)); if (kk > 0) out += `<rect x="${f2(x - 3)}" y="${f2(y - fs * .9)}" width="${f2(ww * kk)}" height="${f2(fs * 1.2)}" rx="3" fill="#ffd400"/>`; }
        out += `<text x="${f2(x)}" y="${f2(y)}" font-family="Inter, Rubik, sans-serif" font-weight="${idx >= 0 ? 800 : 500}" font-size="${fs}" fill="${idx >= 0 && lt > (p.hlAt ?? 1.2) + idx * .8 + .3 ? '#111' : '#e7e9ea'}">${esc(wd)}</text>`; x += ww; }
      body += out; y += lh;
    });
    const st = p.stats || [48, 212, '1.9K', '86.4K'];
    return `<g transform="scale(${f2(k)})"><rect width="560" height="${f2(DH)}" fill="#000"/>
      <circle cx="54" cy="56" r="24" fill="#d97757"/><text x="90" y="52" font-family="Inter, Rubik" font-weight="800" font-size="19" fill="#e7e9ea">${esc(p.name || 'Fable')}</text>
      <circle cx="${98 + approxW(p.name || 'Fable', 19) * 1.15}" cy="46" r="8" fill="#1d9bf0"/><text x="90" y="76" font-family="Inter, Rubik" font-weight="500" font-size="16" fill="#71767b">${esc(p.handle || '@fable')}</text>
      ${body}<text x="30" y="${f2(y + 20)}" font-family="Inter, Rubik" font-weight="500" font-size="16" fill="#71767b">${esc(p.time || '9:41 AM · Oct 20, 2026')} · <tspan fill="#e7e9ea" font-weight="800">${esc(st[3])}</tspan> Views</text>
      <path d="M30 ${f2(y + 40)} H530" stroke="#2f3336" stroke-width="1.5"/>
      ${['💬', '🔁', '♡', '↗'].map((ic, i) => `<text x="${40 + i * 130}" y="${f2(y + 76)}" font-size="20" fill="#71767b">${ic} <tspan font-family="Inter" font-weight="500" font-size="16">${esc(st[i] ?? '')}</tspan></text>`).join('')}</g>`;
  },
  // motion-editor timeline: preview with a glowing title, layer bars, moving playhead, keyframes. { title ("MADE WITH CLAUDE"), sub, layers: ["Title", …] }
  timeline: (p, t, w, h) => {
    const k = w / 560, DH = h / k, lt = t - (p.t0 || 0), ph = (lt * .12) % 1, pv = DH * .5;
    const layers = p.layers || ['Title', 'Glow', 'Starburst', 'Camera'], cols = ['#c04a4a', '#d9b43a', '#5fb0a0', '#8a7ad0'];
    const ry = pv + 46, rowH = Math.min(26, (DH - ry - 10) / layers.length);
    const reveal = easeOut(clamp(lt / 1.4)), glow = .6 + .4 * Math.sin(lt * 3);
    return `<g transform="scale(${f2(k)})"><rect width="560" height="${f2(DH)}" fill="#1b1c20"/><rect width="560" height="24" fill="#26272c"/>
      ${['File', 'Edit', 'Composition', 'Layer', 'Effect', 'Animation', 'View'].map((m, i) => `<text x="${12 + i * 70}" y="16" font-family="Inter" font-weight="500" font-size="11" fill="#9a9ca3">${m}</text>`).join('')}
      <rect x="70" y="34" width="420" height="${f2(pv - 44)}" fill="#050505" stroke="#2d6bd6" stroke-width="2"/>
      <g transform="translate(280 ${f2(34 + (pv - 44) / 2)})">${Array.from({ length: 12 }, (_, i) => `<path d="M0 0 L${f2(Math.cos(i / 12 * 6.283 + lt * .5) * 60 * reveal)} ${f2(Math.sin(i / 12 * 6.283 + lt * .5) * 60 * reveal - 30)}" stroke="#ff8a3a" stroke-width="3" opacity="${f2(.5 * reveal)}" transform="translate(0 -36)"/>`).join('')}
        <text y="6" text-anchor="middle" font-family="Inter, Rubik" font-weight="800" font-style="italic" font-size="34" fill="#fff4e0" opacity="${f2(reveal)}" filter="url(#glow4)" letter-spacing="1">${esc(p.title || 'MADE WITH CLAUDE')}</text>
        <path d="M-120 18 H120" stroke="#ff8a3a" stroke-width="2" opacity="${f2(glow * reveal)}"/><text y="40" text-anchor="middle" font-family="Inter" font-weight="800" font-size="13" letter-spacing="4" fill="#ffb070" opacity="${f2(reveal)}">${esc(p.sub || 'OPUS 5.5')}</text></g>
      <rect y="${f2(pv)}" width="560" height="${f2(DH - pv)}" fill="#202126"/><rect y="${f2(pv)}" width="560" height="30" fill="#26272c"/>
      <text x="12" y="${f2(pv + 20)}" font-family="Inter" font-weight="800" font-size="12" fill="#2d8cf0">0:00:0${Math.floor(ph * 10)}:${String(Math.floor((ph * 300) % 30)).padStart(2, '0')}</text>
      ${layers.map((L, i) => { const y = ry + i * rowH, x0 = 170 + i * 18, x1 = 540 - i * 10;
        return `<text x="14" y="${f2(y + rowH * .66)}" font-family="Inter" font-weight="500" font-size="12" fill="#c9cbd1">${i + 1}  ${esc(L)}</text><rect x="${x0}" y="${f2(y + 3)}" width="${x1 - x0}" height="${f2(rowH - 6)}" rx="3" fill="${cols[i % 4]}" opacity=".85"/>
          ${[0.15, .45, .8].map(q => `<rect x="${f2(x0 + (x1 - x0) * q - 5)}" y="${f2(y + rowH / 2 - 5)}" width="10" height="10" fill="#fff" transform="rotate(45 ${f2(x0 + (x1 - x0) * q)} ${f2(y + rowH / 2)})" opacity=".9"/>`).join('')}`; }).join('')}
      <path d="M${f2(160 + ph * 380)} ${f2(pv + 4)} V${f2(DH)}" stroke="#2d8cf0" stroke-width="2.5"/><rect x="${f2(154 + ph * 380)}" y="${f2(pv + 4)}" width="12" height="14" rx="2" fill="#2d8cf0"/></g>`;
  },
  // beat maker: step sequencer lighting on the beat, piano-roll notes, mixer meters, playlist clips. { bpm (128), tracks: ["Kick", …] }
  daw: (p, t, w, h) => {
    const k = w / 560, DH = h / k, lt = t - (p.t0 || 0), bpm = p.bpm || 128, step = Math.floor(lt * bpm / 60 * 4) % 16;
    const tracks = p.tracks || ['Kick', 'Clap', 'Hat', '808', 'Lead'], pat = ['1000100010001000', '0000100000001000', '1010101010101011', '1000001000100000', '0010010000100100'];
    const top = 30, cell = 17, sx = 92;
    let seq = '';
    tracks.forEach((tr, r) => { const y = top + 10 + r * 24;
      seq += `<rect x="8" y="${y}" width="78" height="19" rx="4" fill="#3a3d44"/><text x="16" y="${y + 14}" font-family="Inter" font-weight="800" font-size="11" fill="#d6d8de">${esc(tr)}</text>`;
      for (let c = 0; c < 16; c++) { const on = pat[r % pat.length][c] === '1', cur = c === step;
        seq += `<rect x="${sx + c * (cell + 2)}" y="${y}" width="${cell}" height="19" rx="3" fill="${on ? (cur ? '#ffffff' : (Math.floor(c / 4) % 2 ? '#e8ecef' : '#c9ced4')) : (Math.floor(c / 4) % 2 ? '#5a3a44' : '#4a3038')}" opacity="${on || cur ? 1 : .8}"/>`; } });
    const pr = top + 10 + tracks.length * 24 + 12, prH = Math.max(60, DH * .3);
    let roll = `<rect x="8" y="${pr}" width="544" height="${f2(prH)}" rx="4" fill="#2a2c31"/>`;
    for (let i = 0; i < 7; i++) roll += `<rect x="8" y="${f2(pr + i * prH / 7)}" width="26" height="${f2(prH / 7 - 1)}" fill="${i % 3 === 1 ? '#111' : '#eee'}"/>`;
    [[0, 3, 4], [4, 1, 3], [8, 4, 4], [12, 2, 2], [14, 5, 2]].forEach(([s, n, l], i) => roll += `<rect x="${f2(40 + s * 31)}" y="${f2(pr + n * prH / 7 + 2)}" width="${f2(l * 31 - 4)}" height="${f2(prH / 7 - 4)}" rx="3" fill="${['#9fe870', '#b8a2ff', '#9fe870', '#ffcf6a', '#b8a2ff'][i]}"/>`);
    roll += `<path d="M${f2(40 + step * 31 + (lt * bpm / 60 * 4 % 1) * 31)} ${pr} v${f2(prH)}" stroke="#ffd34d" stroke-width="2"/>`;
    const my = pr + prH + 12, mh = DH - my - 10;
    let mix = '';
    if (mh > 40) for (let i = 0; i < 10; i++) { const lv = .35 + .55 * Math.abs(Math.sin(lt * (5 + i * .7) + i)) * (pat[i % 5][step] === '1' ? 1 : .6);
      mix += `<rect x="${12 + i * 54}" y="${f2(my)}" width="14" height="${f2(mh)}" rx="3" fill="#15161a"/><rect x="${12 + i * 54}" y="${f2(my + mh * (1 - lv))}" width="14" height="${f2(mh * lv)}" rx="3" fill="url(#meterG)"/>
        <rect x="${32 + i * 54}" y="${f2(my + mh * (.35 + .1 * Math.sin(i)))}" width="18" height="8" rx="2" fill="#c9ced4"/>`; }
    return `<g transform="scale(${f2(k)})"><defs><linearGradient id="meterG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5ad65a"/><stop offset=".75" stop-color="#e3e35a"/><stop offset="1" stop-color="#ff7a3a"/></linearGradient></defs>
      <rect width="560" height="${f2(DH)}" fill="#24262b"/><rect width="560" height="24" fill="#2f3237"/>
      <text x="12" y="16" font-family="Inter" font-weight="800" font-size="11" fill="#c9cbd1">PATTERNS  VIEW  OPTIONS  TOOLS</text>
      <rect x="300" y="4" width="90" height="16" rx="3" fill="#151619"/><text x="345" y="16" text-anchor="middle" font-family="${MONO}" font-weight="700" font-size="12" fill="#ff8a3a">${String(Math.floor(lt / 60) + 1)}:${String(Math.floor(lt) % 60).padStart(2, '0')}:${String(step).padStart(2, '0')}</text>
      <text x="410" y="16" font-family="${MONO}" font-weight="700" font-size="12" fill="#9fe870">${bpm}.000</text>${seq}${roll}${mix}</g>`;
  },
  // chat-style prompt box being typed. { text, hint ("↵ Enter to send") }
  prompt: (p, t, w, h) => {
    const k = w / 560, DH = h / k, lt = t - (p.t0 || 0), txt = String(p.text || ''), typed = txt.slice(0, Math.floor(clamp((lt - .3) * (p.speed || 18) / Math.max(1, txt.length)) * txt.length));
    return `<g transform="scale(${f2(k)})"><rect width="560" height="${f2(DH)}" fill="#141518"/>
      <rect x="20" y="${f2(DH / 2 - 44)}" width="520" height="88" rx="14" fill="#1c1d21" stroke="#d97757" stroke-width="2"/>
      <text x="40" y="${f2(DH / 2 - 6)}" font-family="Inter, Rubik" font-weight="500" font-size="20" fill="#ececec">${esc(typed)}<tspan fill="#ececec" opacity="${Math.floor(t * 2.4) % 2}">▍</tspan></text>
      <text x="40" y="${f2(DH / 2 + 30)}" font-family="Inter" font-weight="500" font-size="12" fill="#6b6e75">+ Attach      ${esc(p.hint || '⌘ Enter to send')}</text></g>`;
  },
});
