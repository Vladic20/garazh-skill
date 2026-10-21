// ─── stickman looks (after kaomei/stickman-video-director, MIT): classic stick figures in five styles ─────────────
// "kind": "stick" = a classic stick figure: round head, single-line (or slim white) torso, line limbs; it uses the same
// poses and faces as the TV heads. Per look it defaults to:
//   stick       Style 1  Classic Minimalist: hollow head, simple line expressions, pure white (theme "stick-light") or black ("stick-dark") canvas, ≤ 3 accent colours on props
//   beanie      Style 2  "Zeke": red beanie (no pom-pom) + yellow tee; 2A set "studio" (white studio, grid floor, cyan glass UI) or 2B cinematic sets (dusk, summit, lamproom)
//   prehistoric Style 3  white filled heads with expressive faces, animal-hide costumes, rough boiling outlines, ochre paper; sets cave, camp, plains
//   cozy        Style 4  white head + slim white torso, dark limbs, full-colour 2D places that change every segment: platform, terrace, office2 (+ dusk, lamproom)
//   history     Style 5  white heads, black oval eyes, thick outlines, cel-shaded era costumes; era sets edo, egypt, rome
// Character options (any look): head ("hollow" | "filled"), face ("none" | "lines" | "ovals"), torso ("line" | "slim"), body (tee, hide, kimono, legionary,
// shendyt, toga, robe), hat (beanie, topknot, nemes, romanhelm, hair, bun, band, cap), color, shorts, line, hold.
const STICK_DEF = {
  stick:       { head: 'hollow', face: 'lines', torso: 'line', lw: 6 },
  beanie:      { head: 'filled', face: 'lines', torso: 'line', lw: 6, body: 'tee', hat: 'beanie' },
  prehistoric: { head: 'filled', face: 'ovals', torso: 'line', lw: 6.5, body: 'hide' },
  cozy:        { head: 'filled', face: 'ovals', torso: 'slim', lw: 5.5, hands: true },
  history:     { head: 'filled', face: 'ovals', torso: 'line', lw: 6.5, cel: true },
};
const STICKY = { neck: -286, head: -330, r: 40, sh: -262, hip: -150 };

function stickFace(mode, face, t, phase, talking, L) {
  if (mode === 'none') return '';
  const y = STICKY.head, blink = ((t + phase * 6.3) % (3.7 + phase)) < .12;
  const F = face || 'happy';
  if (mode === 'lines') {   // Style 1: occasional simple line expressions
    const eyes = blink || F === 'tired' ? `<path d="M-15 ${y - 4} h8 M7 ${y - 4} h8" stroke="${L}" stroke-width="3" stroke-linecap="round"/>`
      : `<circle cx="-11" cy="${y - 5}" r="3" fill="${L}"/><circle cx="11" cy="${y - 5}" r="3" fill="${L}"/>`;
    const m = talking ? `<ellipse cx="0" cy="${y + 13}" rx="5" ry="${f2(1.5 + Math.abs(Math.sin(t * 17)) * 4)}" fill="none" stroke="${L}" stroke-width="2.6"/>`
      : F === 'shock' || F === 'awe' ? `<circle cx="0" cy="${y + 13}" r="5" fill="none" stroke="${L}" stroke-width="2.6"/>`
      : F === 'sad' || F === 'worried' || F === 'cry' ? `<path d="M-9 ${y + 17} q9 -8 18 0" fill="none" stroke="${L}" stroke-width="2.6" stroke-linecap="round"/>`
      : F === 'neutral' || F === 'blank' ? `<path d="M-7 ${y + 13} h14" stroke="${L}" stroke-width="2.6" stroke-linecap="round"/>`
      : `<path d="M-10 ${y + 9} q10 9 20 0" fill="none" stroke="${L}" stroke-width="2.6" stroke-linecap="round"/>`;
    return eyes + m;
  }
  // ovals: solid black oval eyes, brows, mouth (Styles 3–5)
  const ey = y - 6, big = F === 'shock' || F === 'awe' ? 1.25 : 1;
  const eyes = blink || F === 'tired' ? `<path d="M-17 ${ey} q5 3 10 0 M7 ${ey} q5 3 10 0" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/>`
    : `<ellipse cx="-12" cy="${ey}" rx="${f2(4.6 * big)}" ry="${f2(7 * big)}" fill="#111"/><ellipse cx="12" cy="${ey}" rx="${f2(4.6 * big)}" ry="${f2(7 * big)}" fill="#111"/>`;
  const brows = F === 'angry' ? `<path d="M-20 ${ey - 13} l12 5 M20 ${ey - 13} l-12 5" stroke="#111" stroke-width="3" stroke-linecap="round"/>`
    : F === 'sad' || F === 'worried' ? `<path d="M-19 ${ey - 9} l11 -4 M19 ${ey - 9} l-11 -4" stroke="#111" stroke-width="2.6" stroke-linecap="round"/>`
    : F === 'shock' || F === 'awe' ? `<path d="M-19 ${ey - 16} q7 -5 13 0 M6 ${ey - 16} q7 -5 13 0" fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round"/>` : '';
  const my = y + 15, m = talking ? `<ellipse cx="0" cy="${my}" rx="6" ry="${f2(2 + Math.abs(Math.sin(t * 17)) * 5)}" fill="#3a1a14"/>`
    : F === 'shock' || F === 'awe' ? `<ellipse cx="0" cy="${my}" rx="5.5" ry="7" fill="#3a1a14"/>`
    : F === 'sad' || F === 'worried' || F === 'cry' ? `<path d="M-9 ${my + 4} q9 -8 18 0" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/>`
    : F === 'joy' ? `<path d="M-12 ${my - 3} q12 14 24 0 Z" fill="#3a1a14"/>` : F === 'smug' ? `<path d="M-8 ${my} q10 5 17 -4" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/>`
    : F === 'angry' ? `<path d="M-8 ${my + 2} h16" stroke="#111" stroke-width="3" stroke-linecap="round"/>` : `<path d="M-9 ${my - 2} q9 8 18 0" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/>`;
  return eyes + brows + m;
}

// costumes drawn over the torso (arms go on top). (c, L, lw) → svg
window.STICK_BODIES = Object.assign(window.STICK_BODIES || {}, {
  tee: (c, L, lw) => { const col = c.color && c.color !== INK ? c.color : '#f5c518', sh = c.shorts || '#1f2230';
    return `<path d="M-30 -266 Q0 -276 30 -266 L46 -232 L32 -224 L26 -238 L24 -170 L-24 -170 L-26 -238 L-32 -224 L-46 -232 Z" fill="${col}" stroke="${L}" stroke-width="${lw * .7}" stroke-linejoin="round"/>
      <path d="M-24 -172 L24 -172 L30 -122 L4 -122 L0 -140 L-4 -122 L-30 -122 Z" fill="${sh}" stroke="${L}" stroke-width="${lw * .7}" stroke-linejoin="round"/>`; },
  hide: (c, L, lw) => { const col = c.color && c.color !== INK ? c.color : '#a87a4a';
    return `<path d="M-26 -262 L22 -270 L30 -230 L28 -150 L36 -128 L22 -136 L14 -120 L4 -134 L-8 -118 L-16 -134 L-28 -122 L-24 -150 Z" fill="${col}" stroke="${L}" stroke-width="${lw * .75}" stroke-linejoin="round"/>
      <ellipse cx="-6" cy="-212" rx="6" ry="4" fill="${darken(col, .35)}"/><ellipse cx="12" cy="-178" rx="5" ry="3.5" fill="${darken(col, .35)}"/><ellipse cx="-12" cy="-160" rx="4" ry="3" fill="${darken(col, .35)}"/>
      <path d="M-24 -262 L26 -150" stroke="${darken(col, .4)}" stroke-width="4"/>`; },
  kimono: (c, L, lw) => { const col = c.color && c.color !== INK ? c.color : '#2f4f7a', obi = c.obi || '#c9a24a';
    return `<path d="M-30 -268 L30 -268 L40 -30 L-40 -30 Z" fill="${col}" stroke="${L}" stroke-width="${lw * .75}" stroke-linejoin="round"/>
      <path d="M-30 -268 L-46 -218 L-32 -210 M30 -268 L46 -218 L32 -210" fill="${col}" stroke="${L}" stroke-width="${lw * .75}"/>
      <path d="M-14 -268 L6 -200 M14 -268 L-6 -200" stroke="#f3ead6" stroke-width="5"/><rect x="-34" y="-196" width="68" height="20" fill="${obi}" stroke="${L}" stroke-width="${lw * .6}"/>
      <path d="M0 -176 V-30" stroke="${darken(col, .3)}" stroke-width="3"/><path d="M-40 -60 L40 -60" stroke="${lighten(col, .15)}" stroke-width="3" opacity=".6"/>`; },
  legionary: (c, L, lw) => `<path d="M-28 -268 L28 -268 L32 -186 L-32 -186 Z" fill="#9aa3ab" stroke="${L}" stroke-width="${lw * .75}"/>
    ${Array.from({ length: 5 }, (_, i) => `<path d="M-26 ${-256 + i * 14} H26" stroke="#6f777e" stroke-width="2.4" stroke-dasharray="3 3"/>`).join('')}
    <path d="M-32 -188 L32 -188 L36 -124 L-36 -124 Z" fill="#b8322a" stroke="${L}" stroke-width="${lw * .75}"/>
    ${[-24, -10, 4, 18].map(x => `<rect x="${x}" y="-170" width="11" height="44" rx="2" fill="#7a4a24" stroke="${L}" stroke-width="2"/>`).join('')}`,
  shendyt: (c, L, lw) => `<path d="M-26 -276 Q0 -250 26 -276 L30 -264 Q0 -232 -30 -264 Z" fill="#2f7fa8" stroke="${L}" stroke-width="${lw * .6}"/>
    <path d="M-22 -268 Q0 -246 22 -268" fill="none" stroke="#d4a33a" stroke-width="4"/>
    <path d="M-26 -168 L26 -168 L34 -112 L-34 -112 Z" fill="#f3ead6" stroke="${L}" stroke-width="${lw * .7}"/><path d="M-4 -168 L-12 -112 M6 -168 L14 -112" stroke="#c9b48a" stroke-width="2.4"/>
    <rect x="-27" y="-174" width="54" height="9" fill="#d4a33a" stroke="${L}" stroke-width="2"/>`,
  toga: (c, L, lw) => { const col = c.color && c.color !== INK ? c.color : '#efe3c8';
    return `<path d="M-28 -270 L28 -270 L34 -100 L-34 -100 Z" fill="${col}" stroke="${L}" stroke-width="${lw * .7}"/><path d="M-26 -268 L30 -150 L34 -100" fill="none" stroke="${darken(col, .2)}" stroke-width="10" opacity=".7"/>
      <path d="M-28 -266 L32 -140" stroke="${c.trim || '#7a2a5a'}" stroke-width="5"/>`; },
  robe: (c, L, lw) => { const col = c.color && c.color !== INK ? c.color : '#6a4a8a'; return `<path d="M-28 -270 L28 -270 L42 -20 L-42 -20 Z" fill="${col}" stroke="${L}" stroke-width="${lw * .75}" stroke-linejoin="round"/>`; },
});
// hats around the head (centre 0,head; radius r). (c, L, lw) → svg
window.STICK_HATS = Object.assign(window.STICK_HATS || {}, {
  beanie: (c, L, lw) => { const y = STICKY.head, r = STICKY.r, col = c.hatColor || '#e0322b';
    return `<path d="M${-r - 4} ${y - 2} C${-r - 4} ${y - r * 1.55} ${r + 4} ${y - r * 1.55} ${r + 4} ${y - 2} Z" fill="${col}" stroke="${L}" stroke-width="${lw * .75}"/>
      <rect x="${-r - 6}" y="${y - 12}" width="${2 * r + 12}" height="15" rx="6" fill="${darken(col, .12)}" stroke="${L}" stroke-width="${lw * .7}"/>
      ${[-24, -12, 0, 12, 24].map(x => `<path d="M${x} ${y - 10} v11" stroke="${darken(col, .3)}" stroke-width="2"/>`).join('')}`; },
  topknot: (c, L, lw) => { const y = STICKY.head, r = STICKY.r;
    return `<path d="M${-r} ${y + 4} C${-r - 2} ${y - r * .9} ${-r * .3} ${y - r} 0 ${y - r * .98} C${r * .3} ${y - r} ${r + 2} ${y - r * .9} ${r} ${y + 4} L${r - 8} ${y - 10} C${r * .3} ${y - r * .55} ${-r * .3} ${y - r * .55} ${-r + 8} ${y - 10} Z" fill="#141414"/>
      <rect x="-7" y="${y - r - 22}" width="14" height="26" rx="5" fill="#141414" transform="rotate(-12 0 ${y - r})"/><path d="M-8 ${y - r - 2} h16" stroke="#e8e0cc" stroke-width="3"/>`; },
  nemes: (c, L, lw) => { const y = STICKY.head, r = STICKY.r;
    let st = ''; for (let i = 0; i < 6; i++) st += `<path d="M${-r - 6} ${y - r * .6 + i * 10} Q0 ${y - r * .9 + i * 10} ${r + 6} ${y - r * .6 + i * 10}" stroke="#2f5fa8" stroke-width="4" fill="none"/>`;
    return `<path d="M${-r - 8} ${y + 50} L${-r - 8} ${y - r * .5} C${-r} ${y - r * 1.3} ${r} ${y - r * 1.3} ${r + 8} ${y - r * .5} L${r + 8} ${y + 50} L${r - 6} ${y + 50} L${r - 4} ${y - 2} L${-r + 4} ${y - 2} L${-r + 6} ${y + 50} Z" fill="#e2b33a" stroke="${L}" stroke-width="${lw * .7}"/>${st}
      <circle cx="0" cy="${y - r - 2}" r="6" fill="#2f5fa8" stroke="${L}" stroke-width="2"/>`; },
  romanhelm: (c, L, lw) => { const y = STICKY.head, r = STICKY.r;
    return `<path d="M${-r - 4} ${y + 6} C${-r - 4} ${y - r * 1.35} ${r + 4} ${y - r * 1.35} ${r + 4} ${y + 6} L${r - 4} ${y + 22} L${r - 10} ${y - 2} L${-r + 10} ${y - 2} L${-r + 4} ${y + 22} Z" fill="#c9962e" stroke="${L}" stroke-width="${lw * .75}"/>
      <path d="M${-r * .9} ${y - r * .95} C${-r * .4} ${y - r * 1.9} ${r * .4} ${y - r * 1.9} ${r * .9} ${y - r * .95} L${r * .7} ${y - r * .8} C${r * .3} ${y - r * 1.5} ${-r * .3} ${y - r * 1.5} ${-r * .7} ${y - r * .8} Z" fill="#1d1a18" stroke="${L}" stroke-width="2"/>
      <path d="M${-r - 4} ${y - 4} H${r + 4}" stroke="#8a6520" stroke-width="4"/>`; },
  hair: (c, L, lw) => { const y = STICKY.head, r = STICKY.r, col = c.hairColor || '#2b1a0e';
    return `<path d="M${-r - 2} ${y - 4} L${-r + 2} ${y - r * .9} L${-r * .5} ${y - r * 1.25} L${-r * .2} ${y - r * .95} L${r * .1} ${y - r * 1.35} L${r * .4} ${y - r * .95} L${r * .75} ${y - r * 1.2} L${r + 2} ${y - r * .55} L${r + 4} ${y - 2} C${r * .4} ${y - r * .7} ${-r * .4} ${y - r * .7} ${-r - 2} ${y - 4} Z" fill="${col}"/>`; },
  bun: (c, L, lw) => { const y = STICKY.head, r = STICKY.r, col = c.hairColor || '#2b1a0e';
    return `<circle cx="0" cy="${y - r - 10}" r="14" fill="${col}"/><path d="M${-r} ${y - 2} C${-r} ${y - r * 1.15} ${r} ${y - r * 1.15} ${r} ${y - 2} C${r * .4} ${y - r * .6} ${-r * .4} ${y - r * .6} ${-r} ${y - 2} Z" fill="${col}"/>`; },
  band: (c, L, lw) => { const y = STICKY.head, r = STICKY.r;
    return `<path d="M${-r} ${y - 14} Q0 ${y - 22} ${r} ${y - 14}" stroke="${c.hatColor || '#b8322a'}" stroke-width="8" fill="none"/><path d="M${r - 6} ${y - 18} q18 -30 8 -56 q-14 20 -8 56" fill="#e8d6a8" stroke="${L}" stroke-width="2"/>`; },
  cap: (c, L, lw) => { const y = STICKY.head, r = STICKY.r, col = c.hatColor || '#2a2a2e';
    return `<path d="M${-r - 2} ${y - 6} C${-r - 2} ${y - r * 1.3} ${r + 2} ${y - r * 1.3} ${r + 2} ${y - 6} Z" fill="${col}" stroke="${L}" stroke-width="${lw * .7}"/><path d="M${r - 4} ${y - 10} L${r + 34} ${y - 4} L${r + 30} ${y + 3} L${r - 4} ${y - 1} Z" fill="${col}" stroke="${L}" stroke-width="${lw * .7}"/>`; },
});
Object.assign(window.HELD, {
  spear: ([x, y]) => `<g transform="translate(${f2(x)} ${f2(y)}) rotate(-12)"><path d="M0 70 V-150" stroke="#7a4a24" stroke-width="7" stroke-linecap="round"/><path d="M-9 -146 L0 -186 L9 -146 Z" fill="#9aa0a6" stroke="#2b1a0e" stroke-width="3"/></g>`,
  club: ([x, y]) => `<g transform="translate(${f2(x)} ${f2(y)}) rotate(-28)"><path d="M-5 20 L-9 -90 Q0 -118 9 -90 L5 20 Z" fill="#8a5a2e" stroke="#2b1a0e" stroke-width="3"/><circle cx="-4" cy="-80" r="3" fill="#5a3a1c"/></g>`,
  katana: ([x, y]) => `<g transform="translate(${f2(x)} ${f2(y)}) rotate(-35)"><path d="M-3 -10 Q4 -90 2 -170 L6 -170 Q10 -90 3 -10 Z" fill="#dfe6ec" stroke="#141414" stroke-width="2"/><rect x="-10" y="-14" width="22" height="7" rx="2" fill="#c9a24a" stroke="#141414" stroke-width="2"/><rect x="-3" y="-8" width="7" height="34" rx="2" fill="#2a1a12"/></g>`,
  torch: ([x, y], a, c) => { const t = c && c.t0 !== undefined ? 0 : 0; return `<g transform="translate(${f2(x)} ${f2(y)}) rotate(-10)"><path d="M0 30 V-70" stroke="#6a3e1c" stroke-width="8" stroke-linecap="round"/><circle cy="-92" r="40" fill="url(#emberGlow)"/><path d="M0 -70 C-16 -84 -10 -108 0 -124 C10 -108 16 -84 0 -70 Z" fill="#ffb347"/></g>`; },
});

function stickSvg(c, t) {
  const D = STICK_DEF[LOOK] || { head: 'filled', face: 'ovals', torso: 'line', lw: 6 };
  const o = { ...D, ...c, head: c.headStyle || (c.head === 'hollow' || c.head === 'filled' ? c.head : D.head), face: c.face, faceMode: c.faceMode || D.face, torso: c.torso || D.torso, body: c.body || D.body, hat: c.hat === undefined ? D.hat : c.hat };
  const L = c.line || INK, lw = c.lw || D.lw, phase = (c.seed % 997) / 997;
  const P = POSE[c.pose] || POSE.idle, Pp = POSE[c.prevPose] || P, k = easeInOut(c.poseK ?? 1), anim = P.anim;
  const breathe = Math.sin(t * 2.2 + phase * 6.28) * 1.4;
  const bounce = anim === 'bounce' ? -Math.abs(Math.sin(t * 7)) * 14 : anim === 'run' ? -Math.abs(Math.sin(t * 14)) * 6 : 0;
  const tilt = lerp(Pp.tilt || 0, P.tilt || 0, k) + (c.tilt || 0), drop = lerp(Pp.drop || 0, P.drop || 0, k);
  const arm = (side, pose, an) => { const a = ARM[pose] || ARM.idle, sx = side === 'L' ? -1 : 1; let [e, h] = a;
    if (an === 'wave' && pose === 'wave') h = [h[0] + Math.sin(t * 9) * 9, h[1] + Math.cos(t * 9) * 3];
    if (an === 'walk' || an === 'run') { const sw = Math.sin(t * (an === 'run' ? 14 : 7) + (side === 'L' ? 0 : Math.PI)) * (an === 'run' ? 24 : 15);
      return [[sx * 4, STICKY.sh], [sx * (6 + e[0] * .6) + sw * .5, STICKY.sh + e[1] * 1.1], [sx * (6 + h[0] * .6) + sw, STICKY.sh + h[1] * 1.1]]; }
    return [[sx * 4, STICKY.sh], [sx * (6 + e[0] * 1.05), STICKY.sh + e[1] * 1.08], [sx * (6 + h[0] * 1.05), STICKY.sh + h[1] * 1.08]]; };
  const Lp = mixPts(arm('L', Pp.L, Pp.anim), arm('L', P.L, anim), k), Rp = mixPts(arm('R', Pp.R, Pp.anim), arm('R', P.R, anim), k);
  const limb = p => `<path d="M${f2(p[0][0])} ${f2(p[0][1])} L${f2(p[1][0])} ${f2(p[1][1])} L${f2(p[2][0])} ${f2(p[2][1])}" fill="none" stroke="${L}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"/>` +
    (o.hands ? `<circle cx="${f2(p[2][0])}" cy="${f2(p[2][1])}" r="${f2(lw * .95)}" fill="${L}"/>` : '');
  // legs
  let fl = [[-18, 0], [18, 0]];
  if (anim === 'walk' || anim === 'run') { const sp = anim === 'run' ? 14 : 7, a = anim === 'run' ? 28 : 18, s = Math.sin(t * sp + phase * 6);
    fl = [[-12 + s * a, -Math.max(0, -Math.cos(t * sp + phase * 6)) * 12], [12 - s * a, -Math.max(0, Math.cos(t * sp + phase * 6)) * 12]]; }
  const sit = anim === 'sit';
  const legs = sit ? `<path d="M-6 ${STICKY.hip} L-40 -110 L-38 0 M6 ${STICKY.hip} L40 -110 L38 0" fill="none" stroke="${L}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"/>`
    : fl.map(([fx, fy], i) => { const hx = i ? 6 : -6, kx = (hx + fx) / 2 + (i ? 5 : -5), ky = (STICKY.hip + fy) / 2;
      return `<path d="M${hx} ${STICKY.hip} L${f2(kx)} ${f2(ky)} L${f2(fx)} ${f2(fy)} l${i ? 11 : -11} 0" fill="none" stroke="${L}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"/>`; }).join('');
  const headFill = o.head === 'hollow' ? 'none' : (c.skin || '#ffffff');
  const torso = o.torso === 'slim' ? `<path d="M-15 ${STICKY.neck + 8} Q0 ${STICKY.neck + 2} 15 ${STICKY.neck + 8} L11 ${STICKY.hip + 6} Q0 ${STICKY.hip + 12} -11 ${STICKY.hip + 6} Z" fill="#ffffff" stroke="${L}" stroke-width="${lw * .8}" stroke-linejoin="round"/>`
    : `<path d="M0 ${STICKY.neck} V${STICKY.hip}" stroke="${L}" stroke-width="${lw}" stroke-linecap="round"/>`;
  const body = o.body && STICK_BODIES[o.body] ? STICK_BODIES[o.body](o, L, lw) : '';
  const cel = D.cel ? `<path d="M${STICKY.r * .25} ${STICKY.head - STICKY.r * .85} A${STICKY.r} ${STICKY.r} 0 0 1 ${STICKY.r * .95} ${STICKY.head + STICKY.r * .2} A${STICKY.r * 1.2} ${STICKY.r * 1.2} 0 0 0 ${STICKY.r * .25} ${STICKY.head - STICKY.r * .85} Z" fill="#000" opacity=".1"/>` : '';
  const head = `<g transform="rotate(${f2(tilt)} 0 ${STICKY.neck})"><circle cx="0" cy="${STICKY.head}" r="${STICKY.r}" fill="${headFill}" stroke="${L}" stroke-width="${lw}"/>${cel}
    ${stickFace(o.faceMode, o.face, t, phase, c.talking, L)}${o.hat && STICK_HATS[o.hat] ? STICK_HATS[o.hat](o, L, lw) : ''}</g>`;
  const held = c.hold ? propInHand(c.hold, Rp[2], t, c) : '';   // phone, coffee, sign:…, heart and every HELD item
  const upper = `<g transform="translate(0 ${f2(drop + breathe * .4 + (c.antic || 0) * 6)})">${torso}${body}${head}${limb(Lp)}${limb(Rp)}${held}</g>`;
  return `<g transform="translate(${f2(c.x)} ${f2(c.y + bounce)}) scale(${f2((c.flip ? -1 : 1) * c.scale)} ${f2(c.scale)})">${legs}${upper}</g>`;
}
{ const _cs = characterSvg; characterSvg = function (c, t) { return c.kind === 'stick' ? stickSvg(c, t) : _cs(c, t); }; }

// ─── look overlays and captions ──────────────────────────────────────────────────────────────
if (['stick', 'beanie', 'prehistoric', 'cozy', 'history'].includes(LOOK)) {
  const flat = LOOK === 'stick' || LOOK === 'beanie';
  addCss(`
    .look-${LOOK} .grain { ${flat || LOOK === 'history' ? 'display:none !important;' : LOOK === 'prehistoric' ? 'opacity:.12;' : 'opacity:.06;'} }
    .look-${LOOK} #flicker { ${flat ? 'display:none;' : ''} }
    .look-${LOOK} #vignette { ${flat ? 'display:none;' : LOOK === 'prehistoric' ? 'background: radial-gradient(ellipse 80% 72% at 50% 48%, transparent 52%, rgba(60,30,10,.35) 100%);' : 'background: radial-gradient(ellipse 82% 76% at 50% 48%, transparent 60%, rgba(20,14,10,.28) 100%);'} }
    .look-${LOOK} #fade { background: ${LOOK === 'stick' ? 'var(--paper)' : '#000'}; }
  `);
  const CAP = {
    stick: `background:none; padding:0; color:var(--ink); font:800 40px/1.12 Inter, Rubik, sans-serif; letter-spacing:-.3px; text-shadow:none;`,
    beanie: `background:rgba(255,255,255,.92); color:#16181d; font:800 36px/1.15 Inter, Rubik, sans-serif; border-radius:14px; padding:8px 18px 10px; box-shadow:0 6px 24px rgba(20,60,90,.18); text-shadow:none;`,
    prehistoric: `background:rgba(43,26,14,.86); color:#f6efe0; font:400 38px/1.12 Pangolin, Hand, sans-serif; border-radius:12px; padding:8px 18px 10px; text-shadow:none; border:3px solid #2b1a0e;`,
    cozy: `background:rgba(31,26,23,.72); color:#fff; font:800 36px/1.15 Rubik, sans-serif; border-radius:16px; padding:8px 18px 10px; text-shadow:none;`,
    history: `background:rgba(20,16,12,.8); color:#fbf3e1; font:700 34px/1.15 Cinzel, 'Cormorant SC', serif; border-radius:6px; padding:8px 20px 10px; text-shadow:none; border:2px solid #c9a24a;`,
  }[LOOK];
  addCss(`.look-${LOOK} .cap { bottom: 50px; ${CAP} }
    .look-${LOOK} .cap .hl { color: ${LOOK === 'stick' ? 'var(--ink)' : LOOK === 'beanie' ? '#0aa1d6' : '#ffc93a'}; }
    .look-${LOOK} .cap span { opacity: ${LOOK === 'stick' ? '.3' : '1'}; } .look-${LOOK} .cap span.on, .look-${LOOK} .cap span.hl { opacity: 1; }
    .look-${LOOK}.portrait .cap { bottom: 240px; max-width: 620px; white-space: normal; text-align: center; ${LOOK === 'stick' ? 'background:none;padding:0;' : ''} }`);
  if (flat) {
    filmDamage = () => ''; particles = () => ''; boilFilter = () => 'none';
    groundSvg = () => LOOK === 'stick' ? `<path d="M-300 ${GROUND} H${W + 300}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` : '';
    const _inst = installStatic;
    installStatic = function () { _inst(); document.getElementById('paper').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/></svg>`; };
  }
  if (LOOK === 'prehistoric') { boilFilter = t => `url(#boil${boilSeed(t)})`; groundSvg = () => `<path d="M-300 ${GROUND} H${W + 300}" stroke="${INK}" stroke-width="5"/>`; }
  if (LOOK === 'cozy' || LOOK === 'history') { filmDamage = () => ''; groundSvg = () => ''; }
}

// ─── sets ────────────────────────────────────────────────────────────────────────────────────
(function () {
  const tex = (op = .5) => `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" filter="url(#paint)" opacity="${op}"/>`;
  const sky = id => `<rect x="-300" y="-400" width="${W + 600}" height="${GROUND + 400}" fill="url(#${id})"/>`;
  const ground = (col, y = GROUND) => `<rect x="-300" y="${y}" width="${W + 600}" height="${H - y + 400}" fill="${col}"/>`;
  const sun = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r * 2.4}" fill="${col}" opacity=".18"/><circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`;
  const cypress = (x, y, s = 1) => `<path d="M${x} ${y} C${x - 18 * s} ${y - 60 * s} ${x - 14 * s} ${y - 150 * s} ${x} ${y - 200 * s} C${x + 14 * s} ${y - 150 * s} ${x + 18 * s} ${y - 60 * s} ${x} ${y} Z" fill="#2f5a2a"/><path d="M${x} ${y} V${y + 10}" stroke="#4a2e1a" stroke-width="5"/>`;
  const palm = (x, y, s = 1) => `<path d="M${x} ${y} Q${x + 8 * s} ${y - 90 * s} ${x - 4 * s} ${y - 170 * s}" stroke="#7a5a32" stroke-width="${10 * s}" fill="none"/>${[-60, -25, 15, 50, 85].map(a => `<path d="M${x - 4 * s} ${y - 170 * s} q${Math.cos(a * Math.PI / 180) * 60 * s} ${-20 * s} ${Math.cos(a * Math.PI / 180) * 90 * s} ${Math.sin(a * Math.PI / 180) * 50 * s + 30 * s}" stroke="#3f7a2e" stroke-width="${12 * s}" fill="none" stroke-linecap="round"/>`).join('')}`;
  const cloud = (x, y, s, col = '#fff') => `<g transform="translate(${f2(x)} ${y}) scale(${s})" opacity=".92"><ellipse cx="0" cy="0" rx="80" ry="26" fill="${col}"/><ellipse cx="-30" cy="-14" rx="40" ry="28" fill="${col}"/><ellipse cx="28" cy="-18" rx="46" ry="32" fill="${col}"/></g>`;
  Object.assign(window.SETS_LIB, {
    // Style 2A: high-key white studio, perspective grid floor, soft cyan glow (put glasspanel props in it)
    studio: (o, t) => { const hz = GROUND - (PORTRAIT ? 260 : 170), vx = CX; let grid = '';
      for (let i = -14; i <= 14; i++) grid += `<path d="M${vx + i * 30} ${hz} L${vx + i * 260} ${H + 300}" stroke="#cfd8e0" stroke-width="2"/>`;
      for (let j = 1; j < 14; j++) { const y = hz + Math.pow(j / 13, 1.8) * (H + 300 - hz); grid += `<path d="M-300 ${f2(y)} H${W + 300}" stroke="#cfd8e0" stroke-width="2"/>`; }
      return { back: `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="url(#studioG)"/><rect x="-300" y="${hz}" width="${W + 600}" height="${H}" fill="#f2f5f8"/>${grid}
        <ellipse cx="${CX}" cy="${GROUND + 10}" rx="${PORTRAIT ? 260 : 420}" ry="40" fill="#0aa1d6" opacity=".07"/><circle cx="${W * .8}" cy="${hz - 120}" r="260" fill="#19b8e6" opacity=".06"/>`, noGround: true }; },
    // Style 2B / 4: desert highway under a glowing dusk sky
    dusk: (o, t) => ({ back: `${sky('duskG')}${sun(W * .7, GROUND - (PORTRAIT ? 520 : 260), 46, '#ffd58a')}
      <path d="M-300 ${GROUND - 60} L${W * .15} ${GROUND - 150} L${W * .3} ${GROUND - 90} L${W * .55} ${GROUND - 170} L${W * .8} ${GROUND - 80} L${W + 300} ${GROUND - 120} V${GROUND} H-300 Z" fill="#6a3a5a" opacity=".85"/>
      ${ground('#c27a4a')}<path d="M${CX - 30} ${GROUND} L${CX - 260} ${H + 300} L${CX + 260} ${H + 300} L${CX + 30} ${GROUND} Z" fill="#3a2a30"/>
      ${[0, 1, 2, 3].map(i => `<path d="M${CX} ${GROUND + 20 + i * 60 + (t * 40) % 60} v24" stroke="#f3d68a" stroke-width="${6 + i * 3}"/>`).join('')}${tex(.4)}`, noGround: true }),
    // Style 2B: mountain ridge above golden clouds at sunrise
    summit: (o, t) => ({ back: `${sky('summitG')}${sun(W * .75, GROUND - (PORTRAIT ? 560 : 300), 52, '#fff1c2')}
      ${[0, 1, 2, 3].map(i => cloud(((W * (.1 + i * .27) + t * (6 + i * 2)) % (W + 300)) - 150, GROUND - 40 - i % 2 * 50, 1.6, '#ffd9a0')).join('')}
      <path d="M-300 ${H + 300} L${W * .25} ${GROUND - 40} L${W * .4} ${GROUND + 10} L${W * .55} ${GROUND - 70} L${W + 300} ${H + 300} Z" fill="#5a4a6a"/><path d="M${W * .25} ${GROUND - 40} L${W * .3} ${GROUND - 12} L${W * .2} ${GROUND - 10} Z" fill="#fff" opacity=".7"/>${tex(.4)}`, noGround: true }),
    // Style 2B / 4: dim bedroom with warm lamplight and a night window
    lamproom: (o, t) => ({ back: `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="#2a3352"/>${ground('#3a2e3e', GROUND - 20)}
      <rect x="${W * .6}" y="${GROUND - (PORTRAIT ? 640 : 420)}" width="${PORTRAIT ? 220 : 240}" height="${PORTRAIT ? 260 : 200}" fill="#1a2240" stroke="#141826" stroke-width="10"/><circle cx="${W * .6 + 170}" cy="${GROUND - (PORTRAIT ? 580 : 370)}" r="18" fill="#f6efd2"/>
      <circle cx="${W * .22}" cy="${GROUND - 200}" r="${PORTRAIT ? 300 : 340}" fill="url(#warmGlow)"/><rect x="${W * .1}" y="${GROUND - 120}" width="${PORTRAIT ? 220 : 280}" height="100" fill="#6a4a3a"/>
      <path d="M${W * .2} ${GROUND - 220} h70 l18 60 h-106 Z" fill="#f2d79a"/><path d="M${W * .2 + 35} ${GROUND - 160} v40" stroke="#2a1a12" stroke-width="5"/>
      <rect x="${PORTRAIT ? W * .45 : W * .5}" y="${GROUND - 110}" width="${PORTRAIT ? 300 : 420}" height="90" rx="12" fill="#c9d2e8"/><rect x="${PORTRAIT ? W * .45 : W * .5}" y="${GROUND - 140}" width="80" height="40" rx="14" fill="#eef1f8"/>${tex(.35)}`, noGround: true }),
    // Style 3: cave interior lit by a fire, wall paintings, rock arch
    cave: (o, t) => { const fl = .85 + .15 * Math.sin(t * 11) * Math.sin(t * 7);
      return { back: `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="#4a3220"/><circle cx="${CX}" cy="${GROUND - 100}" r="${PORTRAIT ? 420 : 520}" fill="url(#emberGlow)" opacity="${f2(.55 * fl)}"/>
        <g opacity=".75" stroke="#8a2a1a" stroke-width="6" fill="none" stroke-linecap="round"><path d="M${W * .18} ${GROUND - 300} q30 -30 70 0 q-10 30 -40 26 z M${W * .18 + 10} ${GROUND - 278} l-8 30 M${W * .18 + 50} ${GROUND - 278} l8 30"/><path d="M${W * .72} ${GROUND - 340} l20 -30 l20 30 M${W * .72 + 20} ${GROUND - 370} v60"/></g>
        ${[[W * .3, GROUND - 380], [W * .36, GROUND - 360]].map(([x, y]) => `<path d="M${x} ${y} l0 -26 m-10 6 l10 -6 l10 6" stroke="#c94a2a" stroke-width="6" fill="none" opacity=".7"/>`).join('')}
        ${ground('#6a4a2e', GROUND - 10)}<path d="M-300 -400 H${W + 300} V${GROUND - 30} C${W * .9} ${GROUND - 420} ${W * .75} ${-60} ${CX} ${-40} C${W * .25} ${-60} ${W * .1} ${GROUND - 420} -300 ${GROUND - 30} Z" fill="#2b1a0e" opacity=".9"/>${tex(.8)}`, noGround: true }; },
    // Style 3: dusk camp with hide tents and a campfire
    camp: (o, t) => ({ back: `${sky('campG')}<path d="M-300 ${GROUND - 120} Q${W * .3} ${GROUND - 220} ${W * .6} ${GROUND - 140} T${W + 300} ${GROUND - 160} V${GROUND} H-300 Z" fill="#5a4a3a"/>
      ${ground('#9a7444')}${(PORTRAIT ? [W * .2] : [W * .15, W * .82]).map(x => `<path d="M${x - 110} ${GROUND + 6} L${x} ${GROUND - 170} L${x + 110} ${GROUND + 6} Z" fill="#b8905a" stroke="#2b1a0e" stroke-width="5"/><path d="M${x - 16} ${GROUND - 194} L${x + 16} ${GROUND - 150} M${x + 16} ${GROUND - 194} L${x - 16} ${GROUND - 150}" stroke="#2b1a0e" stroke-width="5"/><path d="M${x} ${GROUND - 60} L${x - 30} ${GROUND + 6} H${x + 30} Z" fill="#2b1a0e"/>`).join('')}
      ${PROPS.campfire({ seed: 3 }, t, t).replace(/^/, `<g transform="translate(${PORTRAIT ? W * .7 : CX + 40} ${GROUND + 8})">`)}</g>${tex(.8)}`, noGround: true }),
    // Style 3: bright rocky plain, a river, a distant smoking volcano
    plains: (o, t) => ({ back: `${sky('plainG')}${sun(W * .82, GROUND - (PORTRAIT ? 600 : 330), 40, '#fff3c2')}
      <path d="M${W * .1} ${GROUND - 40} L${W * .3} ${GROUND - 280} L${W * .38} ${GROUND - 270} L${W * .55} ${GROUND - 40} Z" fill="#7a5a4a"/>${[0, 1, 2].map(i => `<circle cx="${W * .34 + Math.sin(t + i) * 10}" cy="${GROUND - 300 - i * 40 - (t * 12) % 40}" r="${22 + i * 8}" fill="#bfb2a2" opacity="${.5 - i * .12}"/>`).join('')}
      ${ground('#c99a5a')}<path d="M-300 ${GROUND + 80} Q${W * .4} ${GROUND + 40} ${W + 300} ${GROUND + 110} L${W + 300} ${GROUND + 150} Q${W * .4} ${GROUND + 80} -300 ${GROUND + 120} Z" fill="#5a9ac8"/>
      ${[[W * .15, 30], [W * .7, 46], [W * .88, 24]].map(([x, r]) => `<ellipse cx="${x}" cy="${GROUND + 4}" rx="${r * 1.4}" ry="${r}" fill="#8a7a6a" stroke="#2b1a0e" stroke-width="4"/>`).join('')}${tex(.8)}`, noGround: true }),
    // Style 4: metro platform, a train passing behind
    platform: (o, t) => { const tx = ((t * 320) % (W * 3)) - W * 1.5;
      return { back: `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="#d9e2ea"/><rect x="-300" y="-400" width="${W + 600}" height="120" fill="#b8c4cf"/>
        ${Array.from({ length: 6 }, (_, i) => `<rect x="${-100 + i * (W + 200) / 5}" y="-300" width="28" height="${GROUND + 300}" fill="#9aa8b4"/>`).join('')}
        ${[0, 1, 2, 3].map(i => `<rect x="${W * (.1 + i * .27)}" y="${-20}" width="140" height="12" rx="6" fill="#fff" opacity=".9"/>`).join('')}
        <g transform="translate(${f2(tx)} 0)"><rect x="0" y="${GROUND - 330}" width="${W * 1.4}" height="250" rx="30" fill="#3f7fbf"/><rect x="0" y="${GROUND - 290}" width="${W * 1.4}" height="70" fill="#cfe6f8"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${40 + i * 180}" y="${GROUND - 285}" width="130" height="60" rx="8" fill="#9cc6e8"/>`).join('')}<rect x="0" y="${GROUND - 140}" width="${W * 1.4}" height="14" fill="#f2c94c"/></g>
        <rect x="-300" y="${GROUND - 70}" width="${W + 600}" height="70" fill="#7a8692"/>${ground('#b4bec8')}<rect x="-300" y="${GROUND + 10}" width="${W + 600}" height="12" fill="#f2c94c"/>${tex(.25)}`, noGround: true }; },
    // Style 4: sunny street-side café terrace
    terrace: (o, t) => ({ back: `${sky('plainG')}<rect x="-300" y="${GROUND - (PORTRAIT ? 700 : 430)}" width="${W + 600}" height="${PORTRAIT ? 700 : 430}" fill="#e8c89a"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${-80 + i * 190}" y="${GROUND - (PORTRAIT ? 620 : 380)}" width="110" height="150" rx="6" fill="#5a7a9a" stroke="#6a4a2e" stroke-width="6"/>`).join('')}
      <rect x="-300" y="${GROUND - (PORTRAIT ? 440 : 210)}" width="${W + 600}" height="34" fill="#c0503a"/>${Array.from({ length: 14 }, (_, i) => `<rect x="${-300 + i * 120}" y="${GROUND - (PORTRAIT ? 440 : 210)}" width="60" height="34" fill="#f3ead6"/>`).join('')}
      ${ground('#d8c4a4')}${(PORTRAIT ? [W * .75] : [W * .78, W * .12]).map(x => `<path d="M${x} ${GROUND - 220} L${x - 120} ${GROUND - 170} L${x + 120} ${GROUND - 170} Z" fill="#2f8f8a"/><path d="M${x} ${GROUND - 170} V${GROUND}" stroke="#5a4a3a" stroke-width="6"/><ellipse cx="${x}" cy="${GROUND - 70}" rx="70" ry="12" fill="#fff" stroke="#5a4a3a" stroke-width="4"/><path d="M${x} ${GROUND - 70} V${GROUND}" stroke="#5a4a3a" stroke-width="5"/>`).join('')}
      ${(PORTRAIT ? [60] : [W * .45]).map(x => `<rect x="${x - 26}" y="${GROUND - 60}" width="52" height="60" fill="#c9773f"/><circle cx="${x}" cy="${GROUND - 90}" r="40" fill="#5c8a4a"/>`).join('')}${tex(.3)}`, noGround: true }),
    // Style 4: colourful office with a city window
    office2: (o, t) => ({ back: `<rect x="-300" y="-400" width="${W + 600}" height="${H + 800}" fill="#f3e9d7"/><rect x="${W * .55}" y="${GROUND - (PORTRAIT ? 680 : 440)}" width="${PORTRAIT ? 300 : 420}" height="${PORTRAIT ? 300 : 250}" fill="#a8d0ec" stroke="#6a5a4a" stroke-width="10"/>
      ${Array.from({ length: 6 }, (_, i) => `<rect x="${W * .55 + 20 + i * (PORTRAIT ? 46 : 66)}" y="${GROUND - (PORTRAIT ? 520 : 300) - (i % 3) * 30}" width="${PORTRAIT ? 34 : 50}" height="${120 + (i % 3) * 30}" fill="#7a9ab8"/>`).join('')}
      ${ground('#c9b08a', GROUND - 10)}<rect x="${W * .08}" y="${GROUND - (PORTRAIT ? 560 : 360)}" width="${PORTRAIT ? 200 : 260}" height="22" fill="#a46c3b"/>${[0, 1, 2, 3].map(i => `<rect x="${W * .08 + 20 + i * 50}" y="${GROUND - (PORTRAIT ? 610 : 410)}" width="34" height="50" fill="${['#e07b54', '#3f6d9e', '#f2c94c', '#5c8a4a'][i]}"/>`).join('')}
      <rect x="${W * .2}" y="${GROUND - 110}" width="${PORTRAIT ? 300 : 380}" height="20" fill="#a46c3b"/><rect x="${W * .2 + 40}" y="${GROUND - 200}" width="120" height="86" rx="8" fill="#2a2d33"/><rect x="${W * .2 + 48}" y="${GROUND - 192}" width="104" height="66" rx="4" fill="#cfe3ff"/>${tex(.25)}`, noGround: true }),
    // Style 5: Edo street — wooden houses, red lanterns, Mt Fuji, cherry tree
    edo: (o, t) => ({ back: `${sky('edoG')}<path d="M${W * .45} ${GROUND - 200} L${W * .62} ${GROUND - (PORTRAIT ? 560 : 400)} L${W * .79} ${GROUND - 200} Z" fill="#6a7aa8"/><path d="M${W * .58} ${GROUND - (PORTRAIT ? 500 : 350)} L${W * .62} ${GROUND - (PORTRAIT ? 560 : 400)} L${W * .66} ${GROUND - (PORTRAIT ? 500 : 350)} L${W * .64} ${GROUND - (PORTRAIT ? 480 : 335)} L${W * .6} ${GROUND - (PORTRAIT ? 485 : 338)} Z" fill="#fff"/>
      ${(PORTRAIT ? [[-40, 360], [W - 300, 380]] : [[-60, 380], [W * .55, 420], [W * .88, 360]]).map(([x, w]) => `<rect x="${x}" y="${GROUND - 300}" width="${w}" height="300" fill="#8a5a36" stroke="#2a1a12" stroke-width="6"/><path d="M${x - 30} ${GROUND - 290} L${x + w / 2} ${GROUND - 380} L${x + w + 30} ${GROUND - 290} Z" fill="#3a3a44" stroke="#1a1a1e" stroke-width="6"/>
        ${Array.from({ length: Math.floor(w / 70) }, (_, i) => `<rect x="${x + 20 + i * 70}" y="${GROUND - 240}" width="48" height="90" fill="#f3ead6" stroke="#2a1a12" stroke-width="4"/><path d="M${x + 44 + i * 70} ${GROUND - 240} v90 M${x + 20 + i * 70} ${GROUND - 195} h48" stroke="#2a1a12" stroke-width="2"/>`).join('')}`).join('')}
      ${(PORTRAIT ? [W * .3, W * .7] : [W * .2, W * .48, W * .8]).map((x, i) => `<path d="M${x} ${GROUND - 300} v18" stroke="#2a1a12" stroke-width="3"/><circle cx="${x}" cy="${GROUND - 262}" r="40" fill="#ff8a5a" opacity="${f2(.18 + .08 * Math.sin(t * 3 + i))}"/><rect x="${x - 16}" y="${GROUND - 282}" width="32" height="42" rx="12" fill="#d8402a" stroke="#2a1a12" stroke-width="3"/>`).join('')}
      ${ground('#c9a26a')}<g transform="translate(${PORTRAIT ? 70 : W * .07} ${GROUND})"><path d="M0 0 Q-6 -120 20 -200" stroke="#4a2e1a" stroke-width="16" fill="none"/>${[[-30, -230], [30, -250], [70, -210], [0, -280], [-60, -190]].map(([a, b]) => `<circle cx="${a + 20}" cy="${b}" r="46" fill="#f4b8c8"/>`).join('')}</g>${tex(.45)}`, noGround: true }),
    // Style 5: Egyptian temple — sandstone columns, pyramids, palms
    egypt: (o, t) => ({ back: `${sky('egyptG')}${sun(W * .82, GROUND - (PORTRAIT ? 620 : 360), 40, '#fff1b8')}
      <path d="M${W * .05} ${GROUND - 40} L${W * .2} ${GROUND - 260} L${W * .35} ${GROUND - 40} Z" fill="#d9a85a"/><path d="M${W * .2} ${GROUND - 260} L${W * .35} ${GROUND - 40} L${W * .26} ${GROUND - 40} Z" fill="#b8864a"/><path d="M${W * .3} ${GROUND - 40} L${W * .4} ${GROUND - 180} L${W * .5} ${GROUND - 40} Z" fill="#d9a85a"/>
      ${ground('#e2c088')}${(PORTRAIT ? [W * .62, W * .9] : [W * .56, W * .7, W * .84, W * .98]).map(x => `<rect x="${x - 38}" y="${GROUND - 420}" width="76" height="420" fill="#e8c890" stroke="#6a4a2a" stroke-width="5"/>${[0, 1, 2].map(i => `<rect x="${x - 38}" y="${GROUND - 380 + i * 110}" width="76" height="16" fill="${['#2f7fa8', '#b8322a', '#d4a33a'][i]}"/>`).join('')}<path d="M${x - 50} ${GROUND - 420} h100 l-10 -30 h-80 Z" fill="#d4a86a" stroke="#6a4a2a" stroke-width="5"/><path d="M${x - 12} ${GROUND - 330} l12 -18 l12 18 M${x} ${GROUND - 300} v-30" stroke="#6a4a2a" stroke-width="4" fill="none" opacity=".6"/>`).join('')}
      <rect x="${W * .52}" y="${GROUND - 470}" width="${W * .5}" height="30" fill="#d4a86a" stroke="#6a4a2a" stroke-width="5"/>${palm(PORTRAIT ? 60 : W * .44, GROUND, .9)}${tex(.45)}`, noGround: true }),
    // Style 5: Roman camp — palisade, tents, hills, cypress, road
    rome: (o, t) => ({ back: `${sky('romeG')}<path d="M-300 ${GROUND - 130} Q${W * .25} ${GROUND - 250} ${W * .5} ${GROUND - 150} T${W + 300} ${GROUND - 170} V${GROUND} H-300 Z" fill="#7aa85a"/>${cypress(W * .12, GROUND - 120, .9)}${cypress(W * .9, GROUND - 140, 1.1)}
      ${Array.from({ length: Math.ceil((W + 200) / 34) }, (_, i) => `<path d="M${-100 + i * 34} ${GROUND - 60} L${-100 + i * 34 + 14} ${GROUND - 160} L${-100 + i * 34 + 28} ${GROUND - 60} Z" fill="#9a6a3a" stroke="#4a2e1a" stroke-width="3"/>`).join('')}
      ${(PORTRAIT ? [W * .3] : [W * .25, W * .72]).map(x => `<path d="M${x - 90} ${GROUND + 4} L${x} ${GROUND - 120} L${x + 90} ${GROUND + 4} Z" fill="#efe6d2" stroke="#4a2e1a" stroke-width="5"/><path d="M${x - 60} ${GROUND - 40} L${x + 60} ${GROUND - 40}" stroke="#b8322a" stroke-width="10"/><path d="M${x} ${GROUND - 120} L${x - 24} ${GROUND + 4}" stroke="#4a2e1a" stroke-width="4"/>`).join('')}
      ${ground('#b89a6a')}<path d="M${CX - 50} ${GROUND} L${CX - 220} ${H + 300} H${CX + 220} L${CX + 50} ${GROUND} Z" fill="#a8885a"/>${tex(.45)}`, noGround: true }),
  });
  const _inst = installStatic;
  installStatic = function () {
    _inst();
    const g = (id, a, b, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/>${c ? `<stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>` : `<stop offset="1" stop-color="${b}"/>`}</linearGradient>`;
    const host = document.createElement('div');
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs>
      ${g('studioG', '#ffffff', '#eef3f7')}${g('duskG', '#2a2450', '#c0587a', '#ffb070')}${g('summitG', '#5a8ad0', '#f2b88a', '#ffe0b0')}${g('campG', '#3a3a6a', '#c07a5a', '#e8a86a')}
      ${g('plainG', '#7ec0ea', '#cfe8f4')}${g('edoG', '#8ab8e0', '#f2d8c0')}${g('egyptG', '#5aa8e0', '#f2dca8')}${g('romeG', '#6ab0e8', '#dcecf4')}</defs></svg>`;
    document.getElementById('defs').appendChild(host.firstChild);
  };
})();

// ─── props ───────────────────────────────────────────────────────────────────────────────────
Object.assign(PROPS, {
  // crackling campfire with embers. anchor = bottom centre
  campfire(p, t) { const fl = i => 1 + Math.sin(t * 13 + i) * .1 + Math.sin(t * 21 + i * 2) * .06;
    return `<circle cx="0" cy="-50" r="${f2(130 * fl(0))}" fill="url(#emberGlow)" opacity=".6"/>${[-30, 30].map(x => `<rect x="${x - 40}" y="-14" width="80" height="16" rx="7" fill="#6a3e1c" stroke="#2b1a0e" stroke-width="3" transform="rotate(${x / 2} ${x} -6)"/>`).join('')}
      <path transform="scale(${f2(fl(1))})" d="M0 -6 C-36 -30 -20 -76 0 -110 C20 -76 36 -30 0 -6 Z" fill="#f28a2a"/><path transform="scale(${f2(fl(2) * .62)})" d="M0 -6 C-36 -30 -20 -76 0 -110 C20 -76 36 -30 0 -6 Z" fill="#ffd34d"/>
      ${[0, 1, 2, 3].map(i => `<circle cx="${f2(Math.sin(t * 2 + i * 2) * 20)}" cy="${f2(-90 - ((t * 60 + i * 30) % 120))}" r="3" fill="#ffd27a" opacity="${f2(1 - ((t * 60 + i * 30) % 120) / 120)}"/>`).join('')}`; },
  // black cat sitting, tail swishing, yellow eyes. anchor = bottom centre
  cat(p, t) { const sw = Math.sin(t * 2.4) * 18, bl = ((t + 1.2) % 3.6) < .12;
    return `<path d="M30 -8 Q${70 + sw} -30 ${50 + sw} -90" stroke="#141414" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M-36 0 C-40 -70 40 -70 36 0 Z" fill="#141414"/>
      <circle cx="0" cy="-86" r="30" fill="#141414"/><path d="M-26 -104 L-24 -136 L-6 -112 Z M26 -104 L24 -136 L6 -112 Z" fill="#141414"/>
      ${bl ? `<path d="M-14 -90 h10 M4 -90 h10" stroke="#f2c94c" stroke-width="3"/>` : `<ellipse cx="-10" cy="-90" rx="6" ry="7" fill="#f2c94c"/><ellipse cx="10" cy="-90" rx="6" ry="7" fill="#f2c94c"/><path d="M-10 -96 v12 M10 -96 v12" stroke="#141414" stroke-width="2.4"/>`}`; },
  // paper lantern with a warm glow. anchor = top (hanging point)
  lantern(p, t) { const g = .6 + .25 * Math.sin(t * 3 + (p.seed || 0));
    return `<path d="M0 0 v20" stroke="#2a1a12" stroke-width="3"/><circle cx="0" cy="56" r="60" fill="#ff8a5a" opacity="${f2(g * .35)}"/><rect x="-24" y="20" width="48" height="66" rx="18" fill="${p.color || '#d8402a'}" stroke="#2a1a12" stroke-width="3"/>
      <path d="M-24 40 h48 M-24 66 h48" stroke="#2a1a12" stroke-width="2" opacity=".6"/><rect x="-14" y="16" width="28" height="7" fill="#2a1a12"/><rect x="-14" y="84" width="28" height="7" fill="#2a1a12"/>`; },
  // floating cyan glass UI panel with an icon (Style 2A). { icon: lock|check|play|chart|bulb|star, w, h }
  glasspanel(p, t, lt) { const w = p.w || 220, h = p.h || 150, bob = Math.sin(t * 1.6 + (p.seed || 0)) * 6;
    const ic = { lock: `<rect x="-22" y="-6" width="44" height="34" rx="6" fill="none" stroke="#fff" stroke-width="5"/><path d="M-12 -6 v-12 a12 12 0 0 1 24 0 v12" fill="none" stroke="#fff" stroke-width="5"/>`,
      check: `<path d="M-24 0 l16 16 l32 -34" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`, play: `<path d="M-14 -22 L22 0 L-14 22 Z" fill="#fff"/>`,
      chart: `<path d="M-30 24 V0 M-10 24 V-12 M10 24 V-4 M30 24 V-26" stroke="#fff" stroke-width="9" stroke-linecap="round"/>`, bulb: `<circle cx="0" cy="-6" r="18" fill="none" stroke="#fff" stroke-width="5"/><path d="M-8 16 h16 M-6 24 h12" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,
      star: `<path d="M0 -26 L7 -8 L26 -8 L11 4 L17 24 L0 12 L-17 24 L-11 4 L-26 -8 L-7 -8 Z" fill="#fff"/>` }[p.icon || 'check'] || '';
    return `<g transform="translate(0 ${f2(bob)}) skewY(-4)"><rect x="${-w / 2 - 14}" y="${-h / 2 - 14}" width="${w + 28}" height="${h + 28}" rx="30" fill="#19b8e6" opacity=".12"/>
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="22" fill="#19b8e6" opacity=".38" stroke="#7fe0ff" stroke-width="3"/><path d="M${-w / 2 + 16} ${-h / 2 + 10} H${w / 2 - 40}" stroke="#fff" stroke-width="4" opacity=".6" stroke-linecap="round"/>
      <g transform="scale(${f2(Math.min(w, h) / 110)})">${ic}</g></g>`; },
  // expanding cyan ripple rings on the floor. anchor = centre
  ripple(p, t, lt) { return [0, 1, 2].map(i => { const k = ((lt * .8 + i / 3) % 1); return `<ellipse rx="${f2(30 + k * 260)}" ry="${f2(8 + k * 60)}" fill="none" stroke="#19b8e6" stroke-width="${f2(5 * (1 - k))}" opacity="${f2(1 - k)}"/>`; }).join(''); },
  // luminous line drawn from `from` to `to` (world coords) with a glow
  lightbridge(p, t, lt) { const [x1, y1] = p.from || [0, 0], [x2, y2] = p.to || [300, 0], k = easeInOut(clamp(lt / (p.dur || 1.2)));
    const x = lerp(x1, x2, k), y = lerp(y1, y2, k);
    return `<g transform="translate(${f2(-p.x)} ${f2(-p.y)})"><path d="M${x1} ${y1} L${f2(x)} ${f2(y)}" stroke="#19b8e6" stroke-width="18" opacity=".25" stroke-linecap="round"/><path d="M${x1} ${y1} L${f2(x)} ${f2(y)}" stroke="#bff4ff" stroke-width="6" stroke-linecap="round"/><circle cx="${f2(x)}" cy="${f2(y)}" r="10" fill="#fff"/></g>`; },
});
if (typeof NO_TOON !== 'undefined') ['glasspanel', 'ripple', 'lightbridge', 'lantern'].forEach(n => NO_TOON.add(n));
