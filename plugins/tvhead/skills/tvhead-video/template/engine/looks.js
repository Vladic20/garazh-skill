// ─── looks: a character designer made of interchangeable parts ─────────────────────
// A character = head + body + optional hat / glasses / neck / back / hair / chest icon / held item, all in the doodle style.
// Story level: "characters": { "boss": { "head": "tv", "body": "suit", "hat": "tophat", "neck": "tie", … } } and scenes
// reference them by cast id (or "as"). Everything is drawn in the character's local space (feet at 0,0; head centre at HEAD_Y).
// Episodes can add parts: window.HEADS / BODIES / HATS / GLASSES / NECKS / BACKS / HELD are plain registries.
const ST2 = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const partFill = (c, def) => c.accentParts ? ACCENT : (def ?? WHITE);

// screen box face helper for heads whose face is drawn like the TV screen (eyes at ±17, mouth around y 15)
const faceIn = (c, t, phase, look, sx = 1, sy = 1, dy = 0) => `<g transform="translate(0 ${dy}) scale(${sx} ${sy})">${faceSvg(c.face, t, phase, look, c.talking)}</g>`;

// ─── heads: (c, t, phase, look, wig) → { svg, top, eyeY, w } (top = y of the head's top edge, relative to the head centre) ──
window.HEADS = Object.assign(window.HEADS || {}, {
  tv: (c, t, phase, look, wig) => ({ svg: tvHeadSvg(c.face, t, c.seed, phase, look, c.talking, wig).replace(c.hat ? /<path transform="rotate[^>]*>\s*<path transform="rotate[^>]*>/ : /$^/, ''), top: -55, eyeY: -7, w: 62 }),
  crt: (c, t, phase, look, wig) => {   // old box TV with knobs on the side
    const base = HEADS.tv(c, t, phase, look, wig);
    return { ...base, svg: base.svg + `<circle cx="52" cy="-26" r="5" fill="${WHITE}" ${ST2(2.5)}/><circle cx="52" cy="-8" r="5" fill="${WHITE}" ${ST2(2.5)}/><path d="M46 14 h12 M46 22 h12 M46 30 h12" ${ST2(2)}/>`.replace(/^/, '') };
  },
  monitor: (c, t, phase, look) => ({ top: -50, eyeY: -6, w: 82, svg: `<rect x="-82" y="-50" width="164" height="96" rx="8" fill="${BEZEL}" ${ST2(5)}/>
      <rect x="-72" y="-41" width="144" height="76" rx="4" fill="${c.face === 'static' ? staticFill(c.seed, t) : c.face === 'off' ? '#2a2a2a' : SCREEN}" ${ST2(3.5)}/>
      ${c.face === 'static' || c.face === 'off' ? '' : faceIn(c, t, phase, look, 1.15, 1, -2)}<path d="M-14 46 L-10 58 H10 L14 46" fill="${BEZEL}" ${ST2(3.5)}/>` }),
  phone: (c, t, phase, look) => ({ top: -70, eyeY: -12, w: 44, svg: `<rect x="-44" y="-70" width="88" height="140" rx="16" fill="${INK}"/>
      <rect x="-36" y="-56" width="72" height="112" rx="6" fill="${c.face === 'static' ? staticFill(c.seed, t) : SCREEN}"/><rect x="-10" y="-64" width="20" height="4" rx="2" fill="${BEZEL}"/>
      ${c.face === 'static' ? '' : faceIn(c, t, phase, look, .82, .9, -6)}` }),
  mask: (c, t, phase, look) => ({ top: -50, eyeY: 0, w: 38, svg: maskHeadSvg(c.face, t, phase, look, c.talking) }),
  round: (c, t, phase, look) => ({ top: -48, eyeY: -6, w: 46, svg: `<circle r="48" fill="${c.skin || WHITE}" ${ST2(4.5)}/>${faceIn(c, t, phase, look, .9, .9, 0)}` }),
  cat: (c, t, phase, look) => ({ top: -48, eyeY: -4, w: 46, svg: `<path d="M-40 -24 L-34 -66 L-10 -44 M40 -24 L34 -66 L10 -44" fill="${c.skin || WHITE}" ${ST2(4.5)}/>
      <circle r="48" fill="${c.skin || WHITE}" ${ST2(4.5)}/><path d="M-12 -40 L-34 -62 L-36 -30 Z M12 -40 L34 -62 L36 -30 Z" fill="${c.skin || WHITE}" stroke="none"/>
      ${faceIn(c, t, phase, look, .9, .9, 2)}<path d="M-46 10 h-22 M-46 18 h-20 M46 10 h22 M46 18 h20" ${ST2(2)}/>` }),
  bulb: (c, t, phase, look) => ({ top: -62, eyeY: -14, w: 44, svg: `${c.glow !== false ? '<circle cy="-14" r="92" fill="url(#glow)"/>' : ''}
      <path d="M-26 40 C-26 22 -48 10 -48 -14 A48 48 0 0 1 48 -14 C48 10 26 22 26 40 Z" fill="${WHITE}" ${ST2(4.5)}/><path d="M-24 46 h48 M-20 56 h40" ${ST2(4)}/>
      ${faceIn(c, t, phase, look, .82, .82, -12)}` }),
  cloud: (c, t, phase, look) => ({ top: -52, eyeY: -4, w: 64, svg: `<path d="M-52 34 C-80 34 -80 -4 -54 -6 C-56 -42 -14 -54 0 -30 C14 -58 64 -46 56 -8 C84 -8 84 34 56 34 Z" fill="${WHITE}" ${ST2(4.5)}/>${faceIn(c, t, phase, look, .9, .9, 4)}` }),
  box: (c, t, phase, look) => ({ top: -52, eyeY: -2, w: 56, svg: `<path d="M-56 -46 L-74 -64 M56 -46 L74 -64" ${ST2(4)}/><rect x="-56" y="-46" width="112" height="96" fill="#d9c9a3" ${ST2(4.5)}/>
      <path d="M-20 -46 v18 h40 v-18" fill="none" ${ST2(2.5)}/>${faceIn(c, t, phase, look, 1, 1, 6)}` }),
  robot: (c, t, phase, look) => ({ top: -54, eyeY: -10, w: 56, svg: `<path d="M0 -54 v-20" ${ST2(4)}/><circle cy="-80" r="7" fill="${ACCENT}" ${ST2(3)}/>
      <rect x="-56" y="-50" width="112" height="98" rx="12" fill="#b9bfc3" ${ST2(5)}/><circle cx="-46" cy="-40" r="3" fill="${INK}"/><circle cx="46" cy="-40" r="3" fill="${INK}"/><circle cx="-46" cy="38" r="3" fill="${INK}"/><circle cx="46" cy="38" r="3" fill="${INK}"/>
      <rect x="-36" y="-28" width="28" height="20" rx="4" fill="${SCREEN}" ${ST2(3)}/><rect x="8" y="-28" width="28" height="20" rx="4" fill="${SCREEN}" ${ST2(3)}/>
      <circle cx="-22" cy="-18" r="4" fill="${INK}"/><circle cx="22" cy="-18" r="4" fill="${INK}"/><path d="M-24 18 h48 M-24 18 v10 h48 v-10 M-12 18 v10 M0 18 v10 M12 18 v10" fill="none" ${ST2(3)}/>` }),
});

// ─── hair for round/cat heads ─────────────────────────────────────────────────
const HAIR = {
  short: `<path d="M-46 -12 C-50 -50 -20 -60 0 -56 C26 -60 52 -44 46 -12 C40 -30 20 -38 0 -36 C-20 -38 -40 -30 -46 -12Z" fill="${'INKF'}"/>`,
  long: `<path d="M-48 40 C-60 -10 -48 -58 0 -56 C48 -58 60 -10 48 40 L40 40 C44 0 34 -30 0 -34 C-34 -30 -44 0 -40 40 Z" fill="INKF"/>`,
  bun: `<circle cy="-58" r="16" fill="INKF"/><path d="M-46 -12 C-50 -50 -20 -58 0 -54 C24 -58 50 -44 46 -12 C30 -34 -30 -34 -46 -12Z" fill="INKF"/>`,
  spiky: `<path d="M-44 -18 L-48 -46 L-30 -38 L-28 -64 L-10 -46 L0 -70 L12 -46 L30 -62 L30 -38 L48 -44 L44 -18 C20 -36 -20 -36 -44 -18Z" fill="INKF"/>`,
  curly: `${[-36, -18, 0, 18, 36].map((x, i) => `<circle cx="${x}" cy="${-44 + Math.abs(x) * .3 - (i % 2) * 6}" r="16" fill="INKF"/>`).join('')}`,
};

// ─── bodies: (c) → { svg, legs: 'lines' | 'trousers' | 'skirt', bottom } ────────────
const { top: BT, bottom: BB, topW: BTW, botW: BBW } = BODY;
function chestIcon(c, y = -185) {
  const b = c.button;
  if (b === false || b === 'none') return '';
  const icon = !b || b === 'power' ? `<path d="M-4.6 ${y - 5.5} A7 7 0 1 0 4.6 ${y - 5.5}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M0 ${y - 9} v7" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
    : b === 'heart' ? `<path transform="translate(0 ${y}) scale(.7)" d="M0 9 C-14 -1 -9 -13 0 -6 C9 -13 14 -1 0 9Z" fill="${ACCENT === INK ? INK : ACCENT}"/>`
    : b === 'star' ? `<path transform="translate(0 ${y}) scale(.55)" d="M0 -16 L4.7 -5 L16 -5 L7 2 L10 14 L0 7 L-10 14 L-7 2 L-16 -5 L-4.7 -5Z" fill="${INK}"/>`
    : `<text y="${y + 7}" text-anchor="middle" font-family="${FONT}" font-size="20" fill="${INK}">${esc(b === 'dollar' ? '$' : String(b).slice(0, 2))}</text>`;
  return `<circle cx="0" cy="${y}" r="13" fill="${WHITE}" stroke="${INK}" stroke-width="2"/>${icon}`;
}
window.BODIES = Object.assign(window.BODIES || {}, {
  dress: c => ({ legs: 'lines', svg: bodySvg({ ...c, button: false, robe: false, kind: 'tv' }) + chestIcon(c) }),
  robe: c => ({ legs: 'lines', svg: bodySvg({ ...c, robe: true }) }),
  suit: c => { const col = c.color || INK;
    return { legs: 'trousers', svg: `<path d="M${-BTW - 2} ${BT + 4} Q${-BTW - 2} ${BT} ${-BTW + 4} ${BT} L${BTW - 4} ${BT} Q${BTW + 2} ${BT} ${BTW + 2} ${BT + 4} L${BTW + 8} -112 L${-BTW - 8} -112 Z" fill="${col}" ${ST2(3)}/>
      <path d="M-14 ${BT} L0 -200 L14 ${BT} Z" fill="${WHITE}" ${ST2(2.5)}/><path d="M-14 ${BT} L-4 -196 M14 ${BT} L4 -196" ${ST2(2)}/><circle cy="-160" r="3" fill="${WHITE}"/><circle cy="-138" r="3" fill="${WHITE}"/>` }; },
  hoodie: c => { const col = c.color || INK;
    return { legs: 'lines', svg: `<path d="M-30 ${BT - 6} Q0 ${BT + 22} 30 ${BT - 6}" fill="none" ${ST2(5)}/><path d="M${-BTW - 6} ${BT + 8} Q${-BTW - 6} ${BT} ${-BTW + 4} ${BT} L${BTW - 4} ${BT} Q${BTW + 6} ${BT} ${BTW + 6} ${BT + 8} L${BTW + 10} -108 Q${BTW + 10} -100 ${BTW + 2} -100 L${-BTW - 2} -100 Q${-BTW - 10} -100 ${-BTW - 10} -108 Z" fill="${col}" ${ST2(3)}/>
      <path d="M-22 -148 h44 l-6 22 h-32 Z" fill="none" stroke="${col === INK ? '#555' : INK}" stroke-width="2.5"/><path d="M-8 ${BT + 6} v26 M8 ${BT + 6} v26" stroke="${col === INK ? '#777' : INK}" stroke-width="2"/>` }; },
  coat: c => { const col = c.color || INK;
    return { legs: 'lines', svg: `<path d="M${-BTW - 2} ${BT + 4} Q${-BTW - 2} ${BT} ${-BTW + 4} ${BT} L${BTW - 4} ${BT} Q${BTW + 2} ${BT} ${BTW + 2} ${BT + 4} L${BBW + 10} -58 L${-BBW - 10} -58 Z" fill="${col}" ${ST2(3)}/>
      <path d="M0 ${BT + 10} V-60" stroke="${col === INK ? '#666' : INK}" stroke-width="2.5"/>${[-200, -170, -140].map(y => `<circle cx="7" cy="${y}" r="3" fill="${col === INK ? '#888' : INK}"/>`).join('')}
      <path d="M-14 ${BT} L-24 -206 M14 ${BT} L24 -206" stroke="${col === INK ? '#666' : INK}" stroke-width="2.5"/>` }; },
  labcoat: c => BODIES.coat({ ...c, color: c.color || WHITE }),
  shirt: c => { const col = c.color || WHITE;
    return { legs: 'trousers', svg: `<path d="M${-BTW} ${BT} L${-BTW - 18} ${BT + 30} L${-BTW - 6} ${BT + 40} L${-BTW + 2} ${BT + 28} L${-BTW + 2} -120 L${BTW - 2} -120 L${BTW - 2} ${BT + 28} L${BTW + 6} ${BT + 40} L${BTW + 18} ${BT + 30} L${BTW} ${BT} Q0 ${BT + 14} ${-BTW} ${BT} Z" fill="${col}" ${ST2(3)}/>` + chestIcon(c, -175) }; },
  apron: c => ({ legs: 'lines', svg: bodySvg({ ...c, button: false, kind: 'tv' }) + `<path d="M-22 -222 h44 v118 h-44 Z" fill="${WHITE}" ${ST2(2.5)}/><path d="M-22 -222 L-30 -246 M22 -222 L30 -246" ${ST2(2)}/><rect x="-12" y="-170" width="24" height="16" fill="none" ${ST2(2)}/>` }),
  stick: c => ({ legs: 'lines', svg: `<path d="M0 ${BT} V-100" ${ST2(5)}/><path d="M-31 -238 H31" ${ST2(4.5)}/><path d="M-16 -100 H16" ${ST2(4.5)}/>` }),
});

// ─── hats (drawn at the head top, centre x 0) ─────────────────────────────────
window.HATS = Object.assign(window.HATS || {}, {
  beanie: (c, top, w) => `<path d="M${-w - 4} ${top + 16} C${-w} ${top - 34} ${w} ${top - 34} ${w + 4} ${top + 16} Z" fill="${partFill(c, INK)}" ${ST2(3.5)}/><rect x="${-w - 8}" y="${top + 8}" width="${2 * w + 16}" height="16" rx="6" fill="${WHITE}" ${ST2(3.5)}/><circle cy="${top - 26}" r="9" fill="${WHITE}" ${ST2(3)}/>`,
  cap: (c, top, w) => `<path d="M${-w} ${top + 12} C${-w} ${top - 28} ${w} ${top - 28} ${w} ${top + 12} Z" fill="${partFill(c, INK)}" ${ST2(3.5)}/><path d="M${w - 6} ${top + 8} L${w + 44} ${top + 14} L${w + 40} ${top + 22} L${w - 6} ${top + 18} Z" fill="${partFill(c, INK)}" ${ST2(3.5)}/>`,
  tophat: (c, top, w) => `<rect x="${-w * .62}" y="${top - 70}" width="${w * 1.24}" height="76" fill="${partFill(c, INK)}" ${ST2(3.5)}/><rect x="${-w * .62}" y="${top - 18}" width="${w * 1.24}" height="12" fill="${ACCENT === INK ? WHITE : ACCENT}"/><path d="M${-w - 14} ${top + 6} H${w + 14}" ${ST2(7)}/>`,
  crown: (c, top, w) => `<path d="M${-w * .7} ${top + 4} L${-w * .8} ${top - 40} L${-w * .35} ${top - 14} L0 ${top - 50} L${w * .35} ${top - 14} L${w * .8} ${top - 40} L${w * .7} ${top + 4} Z" fill="${c.accentParts || ACCENT !== INK ? ACCENT : WHITE}" ${ST2(3.5)}/>`,
  hardhat: (c, top, w) => `<path d="M${-w + 4} ${top + 8} C${-w + 4} ${top - 40} ${w - 4} ${top - 40} ${w - 4} ${top + 8} Z" fill="${ACCENT === INK ? '#f2c94c' : ACCENT}" ${ST2(3.5)}/><path d="M${-w - 14} ${top + 10} H${w + 14}" ${ST2(7)}/><path d="M0 ${top - 30} V${top + 6}" ${ST2(3)}/>`,
  party: (c, top, w) => `<path d="M${-w * .5} ${top + 6} L${w * .1} ${top - 74} L${w * .5} ${top + 6} Z" fill="${WHITE}" ${ST2(3.5)}/><path d="M${-w * .3} ${top - 18} L${w * .3} ${top - 30} M${-w * .1} ${top - 46} L${w * .25} ${top - 56}" ${ST2(3)}/><circle cx="${w * .1}" cy="${top - 78}" r="8" fill="${ACCENT}" ${ST2(3)}/>`,
  chef: (c, top, w) => `<path d="M${-w * .7} ${top + 8} V${top - 20} C${-w * 1.1} ${top - 30} ${-w * .9} ${top - 74} ${-w * .3} ${top - 58} C${-w * .1} ${top - 88} ${w * .4} ${top - 86} ${w * .4} ${top - 60} C${w * 1.1} ${top - 70} ${w * 1.05} ${top - 22} ${w * .7} ${top - 20} V${top + 8} Z" fill="${WHITE}" ${ST2(3.5)}/>`,
  grad: (c, top, w) => `<path d="M${-w - 20} ${top - 18} L0 ${top - 38} L${w + 20} ${top - 18} L0 ${top + 2} Z" fill="${INK}" ${ST2(3)}/><path d="M${-w * .6} ${top - 8} V${top + 8} H${w * .6} V${top - 8}" fill="${INK}" ${ST2(3)}/><path d="M${w + 10} ${top - 20} v30" ${ST2(2.5)}/><circle cx="${w + 10}" cy="${top + 12}" r="5" fill="${ACCENT}"/>`,
  cowboy: (c, top, w) => `<path d="M${-w - 34} ${top + 4} Q0 ${top + 26} ${w + 34} ${top + 4}" fill="none" ${ST2(6)}/><path d="M${-w * .7} ${top + 8} C${-w * .8} ${top - 46} ${-w * .2} ${top - 34} 0 ${top - 40} C${w * .2} ${top - 34} ${w * .8} ${top - 46} ${w * .7} ${top + 8} Z" fill="${partFill(c, '#8a6a43')}" ${ST2(3.5)}/>`,
  headphones: (c, top, w, eyeY) => `<path d="M${-w - 6} ${eyeY + 6} C${-w - 6} ${top - 40} ${w + 6} ${top - 40} ${w + 6} ${eyeY + 6}" fill="none" ${ST2(7)}/><rect x="${-w - 16}" y="${eyeY - 14}" width="20" height="38" rx="8" fill="${ACCENT}" ${ST2(3.5)}/><rect x="${w - 4}" y="${eyeY - 14}" width="20" height="38" rx="8" fill="${ACCENT}" ${ST2(3.5)}/>`,
  halo: (c, top) => `<ellipse cy="${top - 26}" rx="34" ry="9" fill="none" stroke="${ACCENT === INK ? '#e0b43c' : ACCENT}" stroke-width="5"/>`,
  bow: (c, top, w) => `<path d="M${w * .2} ${top + 2} L${w * .2 - 26} ${top - 18} L${w * .2 - 26} ${top + 22} Z M${w * .2} ${top + 2} L${w * .2 + 26} ${top - 18} L${w * .2 + 26} ${top + 22} Z" fill="${ACCENT}" ${ST2(3)}/><circle cx="${w * .2}" cy="${top + 2}" r="6" fill="${ACCENT}" ${ST2(3)}/>`,
  wizard: (c, top, w) => `<path d="M${-w - 20} ${top + 8} H${w + 20} M${-w * .7} ${top + 6} L${w * .3} ${top - 96} L${w * .7} ${top + 6} Z" fill="${partFill(c, '#3b3f6e')}" ${ST2(3.5)}/><path transform="translate(${w * .05} ${top - 34}) scale(.5)" d="M0 -16 L4.7 -5 L16 -5 L7 2 L10 14 L0 7 L-10 14 L-7 2 L-16 -5 L-4.7 -5Z" fill="${WHITE}"/>`,
  hood: (c, top, w) => `<path d="M${-w - 10} ${top + 70} C${-w - 18} ${top - 20} ${w + 18} ${top - 20} ${w + 10} ${top + 70}" fill="none" stroke="${c.color || INK}" stroke-width="14" stroke-linecap="round"/>`,
});

// ─── glasses (at eye height) ──────────────────────────────────────────────────
window.GLASSES = Object.assign(window.GLASSES || {}, {
  round: y => `<circle cx="-17" cy="${y}" r="12" fill="none" ${ST2(3)}/><circle cx="17" cy="${y}" r="12" fill="none" ${ST2(3)}/><path d="M-5 ${y} h10" ${ST2(3)}/>`,
  square: y => `<rect x="-31" y="${y - 10}" width="26" height="20" rx="3" fill="none" ${ST2(3)}/><rect x="5" y="${y - 10}" width="26" height="20" rx="3" fill="none" ${ST2(3)}/><path d="M-5 ${y} h10" ${ST2(3)}/>`,
  sun: y => `<path d="M-33 ${y - 9} H-3 Q-3 ${y + 12} -18 ${y + 12} Q-33 ${y + 12} -33 ${y - 9} Z M3 ${y - 9} H33 Q33 ${y + 12} 18 ${y + 12} Q3 ${y + 12} 3 ${y - 9} Z" fill="${INK}"/><path d="M-3 ${y - 6} h6" ${ST2(3)}/>`,
  monocle: y => `<circle cx="17" cy="${y}" r="13" fill="none" ${ST2(3)}/><path d="M28 ${y + 8} q8 20 -2 40" fill="none" ${ST2(1.5)}/>`,
  vr: y => `<rect x="-40" y="${y - 16}" width="80" height="30" rx="10" fill="${INK}"/><path d="M-40 ${y} h-10 M40 ${y} h10" ${ST2(4)}/><rect x="-30" y="${y - 8}" width="60" height="6" rx="3" fill="${ACCENT === INK ? '#666' : ACCENT}"/>`,
});

// ─── neck pieces (at the body top) and things on the back ─────────────────────
window.NECKS = Object.assign(window.NECKS || {}, {
  tie: c => `<path d="M-5 ${BT + 2} L5 ${BT + 2} L8 ${BT + 52} L0 ${BT + 64} L-8 ${BT + 52} Z" fill="${ACCENT === INK ? '#9a2f2f' : ACCENT}" ${ST2(2.5)}/>`,
  bowtie: c => `<path d="M0 ${BT + 6} L-16 ${BT - 4} L-16 ${BT + 16} Z M0 ${BT + 6} L16 ${BT - 4} L16 ${BT + 16} Z" fill="${ACCENT === INK ? '#9a2f2f' : ACCENT}" ${ST2(2.5)}/>`,
  scarf: c => `<path d="M-34 ${BT + 2} Q0 ${BT + 18} 34 ${BT + 2} L34 ${BT + 16} Q0 ${BT + 32} -34 ${BT + 16} Z" fill="${ACCENT === INK ? WHITE : ACCENT}" ${ST2(3)}/><path d="M18 ${BT + 20} l10 46 l-14 2 l-6 -44" fill="${ACCENT === INK ? WHITE : ACCENT}" ${ST2(3)}/>`,
  medal: c => `<path d="M-14 ${BT} L0 ${BT + 40} L14 ${BT}" fill="none" ${ST2(3)}/><circle cy="${BT + 50}" r="11" fill="${ACCENT === INK ? '#e0b43c' : ACCENT}" ${ST2(3)}/>`,
  badge: c => `<rect x="12" y="${BT + 30}" width="22" height="28" rx="3" fill="${WHITE}" ${ST2(2.5)}/><path d="M16 ${BT + 40} h14 M16 ${BT + 47} h10" ${ST2(1.5)}/>`,
});
window.BACKS = Object.assign(window.BACKS || {}, {
  backpack: c => `<rect x="-44" y="-238" width="88" height="110" rx="18" fill="${ACCENT === INK ? '#6a6f73' : ACCENT}" ${ST2(3.5)}/>`,
  cape: c => `<path d="M-30 -246 L-74 -60 Q0 -40 74 -60 L30 -246 Z" fill="${ACCENT === INK ? '#7a2525' : ACCENT}" ${ST2(3.5)}/>`,
  wings: c => `<path d="M-20 -220 C-80 -280 -150 -230 -120 -170 C-100 -190 -70 -170 -20 -180 Z M20 -220 C80 -280 150 -230 120 -170 C100 -190 70 -170 20 -180 Z" fill="${WHITE}" ${ST2(3.5)}/>`,
  jetpack: c => `<rect x="-46" y="-240" width="30" height="80" rx="10" fill="#b9bfc3" ${ST2(3.5)}/><rect x="16" y="-240" width="30" height="80" rx="10" fill="#b9bfc3" ${ST2(3.5)}/>`,
});

// extra held items (extends propInHand in character.js)
window.HELD = Object.assign(window.HELD || {}, {
  briefcase: ([x, y]) => `<g transform="translate(${f2(x)} ${f2(y + 6)})"><rect x="-26" y="0" width="52" height="38" rx="5" fill="${partFill({}, '#6b4a2b')}" ${ST2(3.5)}/><path d="M-10 0 v-8 h20 v8" fill="none" ${ST2(3)}/></g>`,
  umbrella: ([x, y]) => `<g transform="translate(${f2(x)} ${f2(y)})"><path d="M0 0 V-120" ${ST2(3)}/><path d="M-70 -110 Q0 -190 70 -110 Q52 -124 35 -110 Q18 -124 0 -110 Q-18 -124 -35 -110 Q-52 -124 -70 -110Z" fill="${ACCENT === INK ? WHITE : ACCENT}" ${ST2(3.5)}/><path d="M0 0 q0 12 -10 10" fill="none" ${ST2(3)}/></g>`,
  book: ([x, y]) => `<g transform="translate(${f2(x - 4)} ${f2(y - 20)}) rotate(-10)"><rect x="-22" y="-28" width="44" height="56" rx="3" fill="${ACCENT === INK ? WHITE : ACCENT}" ${ST2(3.5)}/><path d="M-12 -14 h24 M-12 -4 h18" ${ST2(2)}/></g>`,
  key: ([x, y]) => `<g transform="translate(${f2(x)} ${f2(y - 18)}) rotate(-30)"><circle r="12" fill="none" ${ST2(4)}/><path d="M12 0 H48 M38 0 v10 M46 0 v8" fill="none" ${ST2(4)}/></g>`,
  star: ([x, y]) => `<path transform="translate(${f2(x)} ${f2(y - 26)}) scale(1.6)" d="M0 -16 L4.7 -5 L16 -5 L7 2 L10 14 L0 7 L-10 14 L-7 2 L-16 -5 L-4.7 -5Z" fill="${ACCENT === INK ? WHITE : ACCENT}" ${ST2(2)}/>`,
  magnifier: ([x, y]) => `<g transform="translate(${f2(x)} ${f2(y)}) rotate(-35)"><path d="M0 0 V-34" ${ST2(6)}/><circle cy="-58" r="24" fill="${WHITE}" fill-opacity=".6" ${ST2(4.5)}/></g>`,
  trophy: ([x, y]) => `<g transform="translate(${f2(x)} ${f2(y - 30)})"><path d="M-20 -26 h40 v14 a20 20 0 0 1 -40 0 Z" fill="${ACCENT === INK ? '#e0b43c' : ACCENT}" ${ST2(3.5)}/><path d="M0 8 V20 M-14 24 h28" ${ST2(4)}/></g>`,
  pencil: ([x, y]) => `<g transform="translate(${f2(x)} ${f2(y - 10)}) rotate(-60)"><rect x="-6" y="-60" width="12" height="60" fill="#f2c94c" ${ST2(3)}/><path d="M-6 0 L0 14 L6 0" fill="${WHITE}" ${ST2(3)}/></g>`,
  money: ([x, y]) => `<g transform="translate(${f2(x)} ${f2(y - 14)}) rotate(-12)"><rect x="-30" y="-16" width="60" height="32" rx="3" fill="#cfe3c4" ${ST2(3)}/><text y="8" text-anchor="middle" font-family="${FONT}" font-size="22" fill="${INK}">$</text></g>`,
  flag: ([x, y], txt) => `<g transform="translate(${f2(x)} ${f2(y)})"><path d="M0 0 V-130" ${ST2(4)}/><path d="M0 -130 h${Math.max(60, String(txt).length * 14 + 20)} l-12 22 l12 22 H0 Z" fill="${ACCENT === INK ? WHITE : ACCENT}" ${ST2(3.5)}/><text x="10" y="-101" font-family="${FONT}" font-size="22" fill="${INK}">${esc(txt)}</text></g>`,
});

// ─── assembly helpers used by characterSvg ────────────────────────────────────
function headOf(c, t, phase, look, wig) {
  const name = c.head || (c.kind === 'mask' ? 'mask' : 'tv');
  const H = (window.HEADS[name] || window.HEADS.tv)(c, t, phase, look, wig);
  let extra = '';
  if (c.hair && HAIR[c.hair]) extra += HAIR[c.hair].replace(/'?INKF'?/g, c.hairColor || INK);
  if (c.glasses && window.GLASSES[c.glasses]) extra += window.GLASSES[c.glasses](H.eyeY);
  if (c.hat && window.HATS[c.hat]) extra += window.HATS[c.hat](c, H.top, H.w, H.eyeY);
  return H.svg + extra;
}
function bodyOf(c) {
  const name = c.body || (c.kind === 'mask' || c.robe ? 'robe' : 'dress');
  const B = (window.BODIES[name] || window.BODIES.dress)(c);
  const back = c.back && window.BACKS[c.back] ? window.BACKS[c.back](c) : '';
  const neck = c.neck && window.NECKS[c.neck] ? window.NECKS[c.neck](c) : '';
  return { back, svg: B.svg + neck, legs: B.legs };
}
function trousersSvg(t, anim, phase, c) {   // thick legs for suits / shirts
  const col = c.legColor || (c.body === 'suit' ? c.color || INK : '#4a5a74');
  let fl = [[-16, 0], [16, 0]];
  if (anim === 'walk' || anim === 'run') { const sp = anim === 'run' ? 14 : 7, a = anim === 'run' ? 26 : 16, s = Math.sin(t * sp + phase * 6); fl = [[-14 + s * a, 0], [14 - s * a, 0]]; }
  return [0, 1].map(i => { const sx = i ? 1 : -1, [fx, fy] = fl[i];
    return `<path d="M${sx * 16} -112 L${f2(fx)} ${f2(fy - 4)}" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M${sx * 16} -112 L${f2(fx)} ${f2(fy - 4)}" stroke="${col}" stroke-width="9" stroke-linecap="round"/>
      <path d="M${f2(fx - (i ? 2 : 14))} ${f2(fy)} h16" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`; }).join('');
}
