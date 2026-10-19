// ─── characters ────────────────────────────────────────────────────────────────
// Local coords: origin = between the feet on the ground, up = −y. Unscaled height ≈ 395 px (antenna tip at −395).
// kind 'tv'   — TV head with antennas, black dress with a power button (reference frame 1)
// kind 'mask' — white oval mask face, ragged robe (reference frame 2)
const BODY = { top: -248, bottom: -100, topW: 33, botW: 52 };
const HEAD_Y = -303, SHOULDER = [31, -238];

// arm poses: [elbow, hand] relative to the shoulder, x positive = OUTWARD from the body (mirrored for the left arm)
const ARM = {
  down:   [[14, 48], [20, 96]],
  idle:   [[22, 46], [34, 90]],
  raise:  [[40, 26], [48, -34]],          // hand up beside the head ("hi", "me!")
  wave:   [[40, 26], [48, -34]],          // raise + oscillating hand
  up:     [[10, -50], [6, -104]],         // straight up, holding something overhead
  point:  [[46, -4], [94, -14]],
  hip:    [[34, 30], [6, 54]],
  head:   [[52, -16], [22, -72]],         // hand on the side of the head (despair)
  shrug:  [[30, 34], [64, 8]],
  chest:  [[20, 46], [-12, 34]],          // hand in front of the chest (holding a phone, hugging)
  phone:  [[24, 46], [-18, 22]],          // phone held in front of the chest, head bowed over it
  chin:   [[24, 42], [-14, -24]],         // thinking
  cross:  [[20, 42], [-38, 38]],
  reach:  [[34, -38], [62, -88]],
  cheer:  [[30, -40], [52, -86]],
  limp:   [[8, 50], [10, 100]],
};
// full-body poses: which arm pose on each side + head tilt (deg) + body drop (px)
const POSE = {
  idle:   { L: 'idle', R: 'idle' },
  wave:   { L: 'wave', R: 'idle', anim: 'wave' },
  raise:  { L: 'raise', R: 'idle' },
  point:  { L: 'idle', R: 'point' },
  up:     { L: 'up', R: 'up' },
  head:   { L: 'head', R: 'head', tilt: -4 },
  facepalm: { L: 'idle', R: 'head', tilt: 8 },
  shrug:  { L: 'shrug', R: 'shrug', tilt: 6 },
  hip:    { L: 'hip', R: 'hip' },
  phone:  { L: 'chest', R: 'phone', tilt: 6, look: 'down' },
  hold:   { L: 'chest', R: 'chest', tilt: 4, look: 'down' },
  think:  { L: 'cross', R: 'chin', tilt: -6 },
  cross:  { L: 'cross', R: 'cross' },
  reach:  { L: 'idle', R: 'reach', tilt: -8 },
  cheer:  { L: 'cheer', R: 'cheer', anim: 'bounce' },
  slump:  { L: 'limp', R: 'limp', tilt: 16, drop: 10, look: 'down' },
  walk:   { L: 'down', R: 'down', anim: 'walk' },
  run:    { L: 'idle', R: 'idle', anim: 'run' },
  sit:    { L: 'chest', R: 'chest', anim: 'sit', drop: 0 },
};

function armPts(name, side, t, anim, coil) {
  const a = ARM[name] || ARM.idle, sx = side === 'L' ? -1 : 1;
  let [e, h] = a;
  if (anim === 'wave' && name === 'wave') h = [h[0] + Math.sin(t * 9) * 9, h[1] + Math.cos(t * 9) * 3];
  if (anim === "walk" || anim === "run") {   // arms swing opposite to the legs
    const sw = Math.sin(t * (anim === "run" ? 14 : 7) + (side === "L" ? 0 : Math.PI)) * (anim === "run" ? 22 : 14);
    return [[SHOULDER[0] * sx, SHOULDER[1]], [(SHOULDER[0] + e[0]) * sx + sw * .5, SHOULDER[1] + e[1]], [(SHOULDER[0] + h[0]) * sx + sw, SHOULDER[1] + h[1] - Math.abs(sw) * .2]];
  }
  return [[SHOULDER[0] * sx, SHOULDER[1]], [(SHOULDER[0] + e[0]) * sx, SHOULDER[1] + e[1]], [(SHOULDER[0] + h[0]) * sx, SHOULDER[1] + h[1]]];
}
const mixPts = (a, b, k) => a.map((p, i) => [lerp(p[0], b[i][0], k), lerp(p[1], b[i][1], k)]);

function zigzag(p, q, n, amp) {   // coil arm segment
  let d = `L${f2(p[0])} ${f2(p[1])}`; const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let i = 1; i < n; i++) { const k = i / n, s = (i % 2 ? 1 : -1) * amp; d += ` L${f2(p[0] + dx * k + nx * s)} ${f2(p[1] + dy * k + ny * s)}`; }
  return d + ` L${f2(q[0])} ${f2(q[1])}`;
}
function armSvg(pts, coil) {
  const [s, e, h] = pts;
  const d = coil ? `M${f2(s[0])} ${f2(s[1])} ${zigzag(s, e, 9, 4.5).slice(0)} ${zigzag(e, h, 9, 4.5)}` : `M${f2(s[0])} ${f2(s[1])} L${f2(e[0])} ${f2(e[1])} L${f2(h[0])} ${f2(h[1])}`;
  // tiny three-finger hand
  const ang = Math.atan2(h[1] - e[1], h[0] - e[0]);
  const fingers = [-.7, 0, .7].map(o => `M${f2(h[0])} ${f2(h[1])} l${f2(Math.cos(ang + o) * 7)} ${f2(Math.sin(ang + o) * 7)}`).join(' ');
  return `<path d="${d}" fill="none" stroke="#aab0b4" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
    <path d="${d}" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${fingers}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
}

// ─── faces on the TV screen (screen box ≈ 94×82 centred at 0,0) ───────────────
function eyes(kind, blink, look) {
  const ly = look === 'down' ? 4 : 0;
  if (blink) return `<path d="M-23 ${-6 + ly} h11 M12 ${-6 + ly} h11" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  switch (kind) {
    case 'big': return `<ellipse cx="-17" cy="${-8 + ly}" rx="8" ry="10" fill="${INK}"/><ellipse cx="17" cy="${-8 + ly}" rx="8" ry="10" fill="${INK}"/><circle cx="-14" cy="${-12 + ly}" r="2.4" fill="#fff"/><circle cx="20" cy="${-12 + ly}" r="2.4" fill="#fff"/>`;
    case 'half': return `<path d="M-24 ${-6 + ly} q7 7 14 0 Z M10 ${-6 + ly} q7 7 14 0 Z" fill="${INK}" stroke="${INK}" stroke-width="2"/>`;
    case 'sad': return `<ellipse cx="-17" cy="${-4 + ly}" rx="5" ry="7" fill="${INK}"/><ellipse cx="17" cy="${-4 + ly}" rx="5" ry="7" fill="${INK}"/><path d="M-25 -16 l13 -4 M25 -16 l-13 -4" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    case 'angry': return `<ellipse cx="-17" cy="${-5 + ly}" rx="5" ry="7" fill="${INK}"/><ellipse cx="17" cy="${-5 + ly}" rx="5" ry="7" fill="${INK}"/><path d="M-26 -20 l14 6 M26 -20 l-14 6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    case 'x': return `<path d="M-24 -15 l13 13 M-11 -15 l-13 13 M11 -15 l13 13 M24 -15 l-13 13" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`;
    case 'heart': return [-17, 17].map(x => `<path transform="translate(${x} -8)" d="M0 7 C-11 -1 -7 -10 0 -5 C7 -10 11 -1 0 7Z" fill="${INK}"/>`).join('');
    case 'spiral': return [-17, 17].map(x => `<path transform="translate(${x} -8)" d="M0 0 c2 -1 3 2 0 3 c-4 1 -5 -4 -1 -6 c6 -2 9 4 6 8 c-3 5 -12 4 -13 -3" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`).join('');
    case 'wide': return `<circle cx="-17" cy="${-8 + ly}" r="8" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="17" cy="${-8 + ly}" r="8" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="-17" cy="${-8 + ly}" r="2.6" fill="${INK}"/><circle cx="17" cy="${-8 + ly}" r="2.6" fill="${INK}"/>`;
    default: return `<ellipse cx="-17" cy="${-7 + ly}" rx="5.5" ry="8" fill="${INK}"/><ellipse cx="17" cy="${-7 + ly}" rx="5.5" ry="8" fill="${INK}"/>`;
  }
}
const MOUTH = {
  smile: 'M-13 11 Q0 22 13 11', grin: 'M-15 9 Q0 26 15 9 Z', flat: 'M-10 15 L10 15', frown: 'M-12 19 Q0 9 12 19',
  wobble: 'M-13 15 q3.25 -4 6.5 0 t6.5 0 t6.5 0 t6.5 0', o: null, small: 'M-5 15 L5 15', smirk: 'M-10 15 Q4 19 13 10',
};
// face name → [eyes, mouth]
const FACE = {
  happy: ['dot', 'smile'], neutral: ['dot', 'flat'], blank: ['dot', null], sad: ['sad', 'frown'], shock: ['wide', 'o'],
  tired: ['half', 'flat'], angry: ['angry', 'frown'], cry: ['sad', 'wobble'], love: ['heart', 'smile'], dead: ['x', 'flat'],
  hypno: ['spiral', 'wobble'], joy: ['big', 'grin'], worried: ['sad', 'wobble'], smug: ['half', 'smirk'], awe: ['big', 'o'],
};
function faceSvg(face, t, phase, look, talking) {
  if (face === 'static') return '';
  const [ek, mk] = FACE[face] || FACE.happy;
  const blink = ((t + phase * 7.1) % (3.4 + phase * 1.7)) < .11 && ek !== 'x' && ek !== 'heart' && ek !== 'spiral';
  let mouth = '';
  if (talking) { const o = 3 + Math.abs(Math.sin(t * 17)) * 6; mouth = `<ellipse cx="0" cy="15" rx="7" ry="${f2(o)}" fill="${INK}"/>`; }
  else if (mk === 'o') mouth = `<ellipse cx="0" cy="16" rx="6" ry="8" fill="${INK}"/>`;
  else if (mk === 'grin') mouth = `<path d="${MOUTH.grin}" fill="${INK}"/>`;
  else if (mk) mouth = `<path d="${MOUTH[mk]}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`;
  const tear = face === 'cry' ? `<path d="M19 4 q-4 7 0 9 q4 -2 0 -9Z" fill="${INK}" transform="translate(0 ${f2((t * 14) % 12)})"/>` : '';
  return eyes(ek, blink, look) + mouth + tear;
}

function tvHeadSvg(face, t, seed, phase, look, talking) {
  let screen;
  if (face === 'static') screen = `<rect x="-47" y="-42" width="94" height="82" rx="10" fill="${staticFill(seed, t)}"/>`;
  else if (face === 'off') screen = `<rect x="-47" y="-42" width="94" height="82" rx="10" fill="#2a2a2a"/><path d="M-30 -30 L-10 -36 M-34 -18 L-6 -28" stroke="#777" stroke-width="3" stroke-linecap="round"/>`;
  else screen = `<rect x="-47" y="-42" width="94" height="82" rx="10" fill="${SCREEN}"/>${faceSvg(face, t, phase, look, talking)}`;
  return `<path d="M-14 -55 Q-20 -75 -31 -93 M14 -55 Q20 -75 31 -93" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <rect x="-62" y="-55" width="124" height="110" rx="14" fill="${BEZEL}" stroke="${INK}" stroke-width="5"/>
    ${screen}<rect x="-47" y="-42" width="94" height="82" rx="10" fill="none" stroke="${INK}" stroke-width="3.6"/>`;
}
function maskHeadSvg(face, t, phase, look, talking) {
  const [ek, mk] = FACE[face] || FACE.neutral;
  const blink = ((t + phase * 7.1) % (3.9 + phase)) < .11;
  const ly = look === 'down' ? 5 : 0;
  const e = blink ? `<path d="M-24 ${ly} h14 M10 ${ly} h14" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`
    : ek === 'x' || ek === 'heart' || ek === 'spiral' ? `<g transform="scale(1.2)">${eyes(ek, false, look)}</g>`
    : `<ellipse cx="-16" cy="${ly}" rx="8.5" ry="12" fill="${INK}"/><ellipse cx="16" cy="${ly}" rx="8.5" ry="12" fill="${INK}"/>`;
  const m = talking ? `<ellipse cx="0" cy="25" rx="5" ry="${f2(2 + Math.abs(Math.sin(t * 17)) * 4)}" fill="${INK}"/>`
    : mk === 'smile' || mk === 'grin' ? `<path d="M-8 22 Q0 28 8 22" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
    : mk === 'frown' || mk === 'wobble' ? `<path d="M-8 27 Q0 21 8 27" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
    : mk === 'o' ? `<ellipse cx="0" cy="25" rx="4" ry="5.5" fill="${INK}"/>` : `<path d="M-6 25 h12" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
  return `<path d="M-4 -46 q-6 -12 2 -18 M3 -46 q2 -10 10 -12" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="0" cy="-4" rx="38" ry="44" fill="${WHITE}" stroke="${INK}" stroke-width="4.5"/>${e}${m}`;
}

// body: trapezoid dress (tv) or ragged robe (mask / robe:true)
function bodySvg(c) {
  const { top, bottom, topW, botW } = BODY;
  const fill = c.color || INK;
  if (c.kind === 'mask' || c.robe) {
    let jag = '', r = rng(c.seed + 5), x = botW + 4;
    while (x > -botW - 4) { const nx = Math.max(-botW - 4, x - 7 - r() * 7); jag += ` L${f2((x + nx) / 2)} ${f2(bottom + 8 + r() * 14)} L${f2(nx)} ${f2(bottom - 2 + r() * 6)}`; x = nx; }
    return `<path d="M${-topW + 4} ${top} L${topW - 4} ${top} L${botW + 4} ${bottom}${jag} Z" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  }
  const btn = c.button === false ? '' : `<circle cx="0" cy="-185" r="13" fill="${WHITE}" stroke="${INK}" stroke-width="2"/>
    <path d="M-4.6 -190.5 A7 7 0 1 0 4.6 -190.5" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M0 -194 v7" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
  return `<path d="M${-topW} ${top + 4} Q${-topW} ${top} ${-topW + 5} ${top} L${topW - 5} ${top} Q${topW} ${top} ${topW} ${top + 4} L${botW} ${bottom - 2} Q${botW} ${bottom} ${botW - 4} ${bottom} L${-botW + 4} ${bottom} Q${-botW} ${bottom} ${-botW} ${bottom - 2} Z"
    fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${btn}`;
}
function legsSvg(t, anim, phase) {
  let lx = [-16, 16], fl = [[-16, 0], [16, 0]];
  if (anim === 'walk' || anim === 'run') {
    const sp = anim === 'run' ? 14 : 7, a = anim === 'run' ? 26 : 16;
    const s = Math.sin(t * sp + phase * 6);
    fl = [[-14 + s * a, -Math.max(0, -Math.cos(t * sp + phase * 6)) * 10], [14 - s * a, -Math.max(0, Math.cos(t * sp + phase * 6)) * 10]];
  }
  if (anim === 'sit') return `<path d="M-16 -100 L-44 -62 L-40 0 M16 -100 L44 -62 L40 0" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M-40 0 h-12 M40 0 h12" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>`;
  return [0, 1].map(i => {
    const [fx, fy] = fl[i], sx = i ? 1 : -1;
    return `<path d="M${lx[i]} -100 L${f2(fx)} ${f2(fy)} l${sx * 11} 0" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
}

// c = resolved character state at time t (see scene.js): { x, y, scale, flip, face, pose, prevPose, poseK, kind, seed, ... }
function characterSvg(c, t) {
  const phase = (c.seed % 997) / 997;
  const P = POSE[c.pose] || POSE.idle, Pp = POSE[c.prevPose] || P, k = easeInOut(c.poseK ?? 1);
  const anim = P.anim;
  const breathe = Math.sin(t * 2.2 + phase * 6.28) * 1.6;
  let bounce = anim === 'bounce' ? -Math.abs(Math.sin(t * 7)) * 14 : anim === 'run' ? -Math.abs(Math.sin(t * 14)) * 6 : 0;
  const drop = lerp(Pp.drop || 0, P.drop || 0, k) + (anim === 'sit' ? 58 : 0);
  const tilt = lerp(Pp.tilt || 0, P.tilt || 0, k) + (c.tilt || 0);
  const look = c.look || (k > .5 ? P.look : Pp.look);
  const coil = c.arms === 'coil';
  const L = mixPts(armPts(Pp.L, 'L', t, Pp.anim, coil), armPts(P.L, 'L', t, anim, coil), k);
  const R = mixPts(armPts(Pp.R, 'R', t, Pp.anim, coil), armPts(P.R, 'R', t, anim, coil), k);
  const head = c.kind === 'mask' ? maskHeadSvg(c.face, t, phase, look, c.talking) : tvHeadSvg(c.face, t, c.seed, phase, look, c.talking);
  const heldR = c.hold ? propInHand(c.hold, R[2], t, c) : '';
  const upper = `<g transform="translate(0 ${f2(drop + breathe * .4)})">
      ${bodySvg(c)}
      <g transform="translate(0 ${f2(HEAD_Y + breathe * .6)}) rotate(${f2(tilt)} 0 50)">${head}</g>
      ${armSvg(L, coil)}${armSvg(R, coil)}${heldR}
    </g>`;
  const legs = anim === 'sit' ? `<g transform="translate(0 0)">${legsSvg(t, anim, phase)}</g>` : legsSvg(t, anim, phase);
  return `<g transform="translate(${f2(c.x)} ${f2(c.y + bounce)}) scale(${f2((c.flip ? -1 : 1) * c.scale)} ${f2(c.scale)})">${anim === 'sit' ? `<g transform="translate(0 0)">${legs}</g><g transform="translate(0 0)">${upper}</g>` : legs + upper}</g>`;
}

// small props a character can hold in the right hand (c.hold): phone | heart | balloon | sign:<text> | coffee | flower
function propInHand(kind, h, t, c) {
  const [x, y] = h;
  if (kind === 'phone') return `<g transform="translate(${f2(x - 4)} ${f2(y - 14)}) rotate(-8) scale(1.25)">
      <circle cx="0" cy="0" r="46" fill="url(#glow)" opacity=".7"/>
      <rect x="-14" y="-24" width="28" height="48" rx="5" fill="${INK}"/><rect x="-11" y="-19" width="22" height="36" rx="2" fill="#f4f6f6"/>
      <path d="M-7 -12 h14 M-7 -6 h10 M-7 0 h14 M-7 6 h8" stroke="#9aa" stroke-width="2"/></g>`;
  if (kind === 'heart') return `<path transform="translate(${f2(x)} ${f2(y - 20)}) scale(1.6)" d="M0 9 C-14 -1 -9 -13 0 -6 C9 -13 14 -1 0 9Z" fill="${WHITE}" stroke="${INK}" stroke-width="2.4"/>`;
  if (kind === 'balloon') return `<path d="M${f2(x)} ${f2(y)} q-6 -40 4 -80" fill="none" stroke="${INK}" stroke-width="1.6"/><ellipse cx="${f2(x + 4)}" cy="${f2(y - 108)}" rx="22" ry="28" fill="${WHITE}" stroke="${INK}" stroke-width="3"/>`;
  if (kind === 'coffee') return `<g transform="translate(${f2(x)} ${f2(y - 10)})"><path d="M-10 -14 h20 l-2 24 h-16 Z" fill="${WHITE}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-3 -20 q-3 -6 1 -10 M4 -20 q-3 -6 1 -10" fill="none" stroke="${INK}" stroke-width="1.6" opacity=".7"/></g>`;
  if (kind === 'flower') return `<g transform="translate(${f2(x)} ${f2(y)})"><path d="M0 0 L2 -50" stroke="${INK}" stroke-width="2.4"/>${[0, 72, 144, 216, 288].map(a => `<ellipse cx="2" cy="-62" rx="6" ry="10" transform="rotate(${a} 2 -54)" fill="${WHITE}" stroke="${INK}" stroke-width="2"/>`).join('')}<circle cx="2" cy="-54" r="4" fill="${INK}"/></g>`;
  if (kind.startsWith('sign:')) { const txt = esc(kind.slice(5)); const w = Math.max(70, txt.length * 15 + 24);
    return `<g transform="translate(${f2(x)} ${f2(y)})"><path d="M0 0 L0 -70" stroke="${INK}" stroke-width="4"/><rect x="${-w / 2}" y="-128" width="${w}" height="58" rx="4" fill="${WHITE}" stroke="${INK}" stroke-width="3.4"/>
      <text x="0" y="-90" text-anchor="middle" font-family="Patrick Hand" font-size="30" fill="${INK}" transform="scale(${c.flip ? -1 : 1} 1)">${txt}</text></g>`; }
  return '';
}
