// One timeline for picture and sound: layout, mascot moves, camera keys, sound cues. Pure data + math (browser and node).
export const DUR = 60, FPS = 30;
export const BPM = 84, BEAT = 60 / BPM, BEAT0 = 0.12;           // lib/music.mjs grid: beats at 0.12 + k·BEAT
export const beatAt = k => BEAT0 + k * BEAT;

// ─── editor layout (UI canvas px, 2048 × 1280; 1 px = 0.1 world units) ──────────────────────────────
export const UI = {
  w: 2048, h: 1280, S: 0.1,
  comp: { x: 420, y: 112, w: 1060, h: 596 },                     // the viewer inside the composition panel
  compCenter: [950, 410],
  trackX: 430, trackEnd: 2000, pxPerSec: (2000 - 430) / 60,
  rows: {
    titles: { y: 818, h: 44, c: 840 },
    scenes: { y: 870, h: 120, c: 930 },
    voice:  { y: 998, h: 52, c: 1024 },
    music:  { y: 1058, h: 52, c: 1084 },
  },
};
export const TILE_Y = 0.8, MARK = 1.2;                                      // track bar height (world)
export const BLOCK_H = 3.4;                                       // scene block height
export const CARD = { w: 160, h: 90, t: 0.25 };
export const cardSlot = i => [514 + 172 * i, 420];                // storyboard row inside the composition
export const blockSlot = i => [557 + 228 * i, 930];               // V1 "Scenes" track
export const BLOCK_SCALE = 214 / 160;
export const STAGES = ['HOOK', 'MYTH', 'SECRET', 'TRUTH', 'PROOF', 'QUESTION'];
export const TOPIC = 'How prediction markets work';
export const cardIn = i => 18.9 + 0.2 * i;                        // fly into the composition (lands +0.55)
export const cardFlip = i => 23.4 + 0.45 * i;                     // sketch → live scene (0.6 s)
export const cardMove = i => 28.3 + 0.75 * i;                     // fly to its block (0.45 s), block grows +0.35…0.6
export const markerU = j => 1650 - 110 * j;                       // beat markers on the music track
export const TYPE_AT = 14.5, TYPE_CPS = 13.5;                     // topic typing
export const MONTAGE = { start: 43.2, cuts: [43.25, 43.8, 44.35, 44.9, 45.45, 46.0, 46.6, 47.2, 47.7], tallFrom: 45.95 };

// ─── mascot ──────────────────────────────────────────────────────────────────────────────────────────
// surfaces: slab/footer 0, track bars TILE_Y, block top BLOCK_H + card
const onBlock = i => [...blockSlot(i), BLOCK_H + CARD.t];
export const START = { pos: [950, 440, 0], scale: 0.5 };
export const MOVES = [
  { type: 'hop', t0: 4.0, t1: 5.15, to: [600, 930, TILE_Y], h: 26, scaleTo: 1, flip: true },
  { type: 'run', t0: 8.0, t1: 12.2, to: [1340, 930, TILE_Y], hz: 4.6 },
  { type: 'hop', t0: 13.4, t1: 13.95, to: [1290, 728, 0], h: 10 },
  { type: 'hop', t0: 18.15, t1: 18.8, to: [1385, 655, 0], h: 12 },
  { type: 'hop', t0: cardMove(0) - 0.15, t1: cardMove(0) + 0.65, to: onBlock(0), h: 16 },
  ...[1, 2, 3, 4, 5].map(i => ({ type: 'hop', t0: cardMove(i) + 0.15, t1: cardMove(i) + 0.65, to: onBlock(i), h: 6 })),
  { type: 'hop', t0: 38.0, t1: beatAt(54), to: [markerU(0), UI.rows.music.c, TILE_Y + MARK], h: 9 },
  ...[55, 56, 57, 58, 59, 60].map((k, j) => ({ type: 'hop', t0: beatAt(k - 1) + 0.08, t1: beatAt(k), to: [markerU(j + 1), UI.rows.music.c, TILE_Y + MARK], h: 4.5, beat: k })),
  { type: 'hop', t0: 43.3, t1: 43.9, to: [1180, 728, 0], h: 10 },
  { type: 'hop', t0: 48.0, t1: 48.85, to: [1241, 972, BLOCK_H + CARD.t], h: 20, flip: true },
  { type: 'hop', t0: 53.1, t1: 54.0, to: [1440, 690, 0], h: 26 },
  { type: 'hop', t0: 58.2, t1: 58.62, to: [1440, 690, 0], h: 3.5 },
];
// facing (rotation about Y; 0 = towards the camera / timeline, π/2 = along the tracks), eased over `d`
export const FACE = [
  [0, 0.25], [1.6, -0.7], [2.4, 0.6], [3.1, 0], [3.65, -0.62], [5.4, -0.25], [6.7, Math.PI / 2],
  [12.25, Math.PI], [13.35, 3.38], [14.0, 3.57], [18.1, 2.70], [18.85, 4.25],
  [28.0, 5.06], [29.1, 7.85], [33.0, 10.43], [37.9, 12.03], [38.75, 10.99],
  [43.15, 8.95], [43.95, 9.42], [47.9, 6.53], [48.95, 6.28], [52.95, 8.81], [54.15, 6.28],
];
export const BLINKS = [1.15, 1.4, 3.0, 6.0, 9.6, 12.6, 16.9, 21.0, 24.6, 26.2, 30.0, 35.0, 37.2, 44.4, 44.68, 46.6, 46.88, 49.6, 51.8, 55.4, 57.6, 59.15];
export const ASLEEP_UNTIL = 0.85;
export const NODS = [[16.8, 1], [25.8, 1], [26.35, .7], [44.95, .8], [47.15, .8], [50.0, .6]];
export const POKE = 14.3;
export const WAVE = [49.3, 50.4];
export const SWAY = [33.3, 38.0];
export const SITS = [{ t0: 49.0, t1: 52.9, mode: 'edge' }, { t0: 54.2, t1: 58.05, mode: 'floor' }, { t0: 58.8, t1: 61, mode: 'floor' }];

// playhead (seconds on the ruler)
export const PLAYHEAD = [[0, 0.8], [4.0, 0.8], [5.15, 6.4], [8.0, 6.4], [12.2, 34.6], [13.4, 34.6], [28.2, 34.6], [28.9, 4.8],
  [32.7, 48.4], [33.4, 1.0], [43.0, 22.0], [48.0, 59.2], [60, 59.2]];

// ─── camera ──────────────────────────────────────────────────────────────────────────────────────────
// target u, v, height; distance; azimuth (rad, 0 = front); elevation (deg); fov; track (follow the cube 0…1); focus (0 cube … 1 comp centre); aperture
export const CAM = [
  { t: 0,    u: 950,  v: 440, h: 2, d: 190, az: -0.30, el: 26, fov: 28, tr: 0,   f: 0,   ap: 1.0 },
  { t: 3.6,  u: 950,  v: 440, h: 3, d: 72,  az: -0.12, el: 15, fov: 28, tr: 0.6, f: 0,   ap: 1.0 },
  { t: 4.6,  u: 760,  v: 700, h: 4, d: 92,  az: 0.15,  el: 18, fov: 30, tr: 0.7, f: 0,   ap: 1.1 },
  { t: 6.0,  u: 610,  v: 930, h: 3, d: 64,  az: 0.55,  el: 12, fov: 30, tr: 0.9, f: 0,   ap: 1.2 },
  { t: 8.0,  u: 640,  v: 930, h: 3, d: 66,  az: 0.85,  el: 10, fov: 30, tr: 1,   f: 0,   ap: 1.2 },
  { t: 12.0, u: 1300, v: 930, h: 3, d: 70,  az: 0.95,  el: 11, fov: 30, tr: 1,   f: 0,   ap: 1.2 },
  { t: 13.2, u: 1150, v: 760, h: 4, d: 92,  az: 0.10,  el: 20, fov: 30, tr: 0.3, f: 0,   ap: 1.0 },
  { t: 14.2, u: 990,  v: 660, h: 2, d: 104, az: -0.16, el: 50, fov: 30, tr: 0,   f: 0.5, ap: 0.8 },
  { t: 17.6, u: 990,  v: 650, h: 2, d: 96,  az: -0.08, el: 52, fov: 30, tr: 0,   f: 0.55, ap: 0.8 },
  { t: 19.2, u: 1000, v: 470, h: 1, d: 125, az: 0.14,  el: 32, fov: 30, tr: 0,   f: 1,   ap: 0.8 },
  { t: 22.6, u: 1030, v: 470, h: 1, d: 118, az: 0.10,  el: 32, fov: 30, tr: 0,   f: 1,   ap: 0.8 },
  { t: 27.6, u: 1020, v: 460, h: 1, d: 100, az: -0.10, el: 28, fov: 30, tr: 0,   f: 1,   ap: 0.8 },
  { t: 28.8, u: 650,  v: 880, h: 3, d: 92,  az: 0.55,  el: 18, fov: 30, tr: 0.7, f: 0,   ap: 1.1 },
  { t: 32.6, u: 1680, v: 930, h: 4, d: 84,  az: 0.80,  el: 16, fov: 30, tr: 1,   f: 0,   ap: 1.1 },
  { t: 34.0, u: 1100, v: 520, h: 4, d: 128, az: -0.30, el: 22, fov: 30, tr: 0,   f: 1,   ap: 0.9 },
  { t: 37.6, u: 1050, v: 500, h: 4, d: 118, az: -0.38, el: 22, fov: 30, tr: 0,   f: 1,   ap: 0.9 },
  { t: 38.8, u: 1600, v: 1080, h: 2, d: 78, az: 0.45,  el: 14, fov: 30, tr: 0.8, f: 0,   ap: 1.1 },
  { t: 42.8, u: 1050, v: 1090, h: 2, d: 76, az: 0.38,  el: 14, fov: 30, tr: 1,   f: 0,   ap: 1.1 },
  { t: 44.0, u: 950,  v: 430, h: 0, d: 100, az: 0.02,  el: 40, fov: 30, tr: 0,   f: 1,   ap: 0.6 },
  { t: 47.6, u: 950,  v: 420, h: 0, d: 90,  az: -0.02, el: 40, fov: 30, tr: 0,   f: 1,   ap: 0.6 },
  { t: 48.9, u: 1060, v: 600, h: 6, d: 142, az: 0.20,  el: 27, fov: 30, tr: 0,   f: 0,   ap: 1.0 },
  { t: 50.1, u: 1050, v: 590, h: 6, d: 138, az: 0.18,  el: 27, fov: 30, tr: 0,   f: 1,   ap: 1.0 },
  { t: 52.6, u: 1040, v: 580, h: 6, d: 132, az: 0.16,  el: 28, fov: 30, tr: 0,   f: 1,   ap: 1.0 },
  { t: 53.4, u: 1150, v: 700, h: 3, d: 130, az: 0.18,  el: 24, fov: 30, tr: 0.3, f: 0.4, ap: 0.9 },
  { t: 55.5, u: 960,  v: 470, h: 0, d: 150, az: 0.08,  el: 34, fov: 30, tr: 0,   f: 1,   ap: 0.7 },
  { t: 60,   u: 960,  v: 470, h: 0, d: 165, az: 0.03,  el: 35, fov: 30, tr: 0,   f: 1,   ap: 0.7 },
];

// ─── math ────────────────────────────────────────────────────────────────────────────────────────────
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, s) => a + (b - a) * s;
export const smooth = s => (s = clamp(s), s * s * (3 - 2 * s));
export const smoother = s => (s = clamp(s), s * s * s * (s * (s * 6 - 15) + 10));
export const ramp = (t, a, b) => smooth((t - a) / (b - a));
export const easeOutBack = (s, k = 1.7) => (s = clamp(s), 1 + (k + 1) * Math.pow(s - 1, 3) + k * Math.pow(s - 1, 2));
export const spring = (dt, f = 18, z = 9) => dt < 0 ? 0 : 1 - Math.exp(-z * dt) * Math.cos(f * dt);
export function keyed(keys, t, d = 0.3) {                       // [[t, v], …] held values, eased over d
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [k, x] = keys[i]; if (t < k) break; v = lerp(v, x, smooth((t - k) / d)); }
  return v;
}
export function track(keys, t) {                                // [[t, v], …] piecewise smooth interpolation
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const [a, x] = keys[i - 1], [b, y] = keys[i]; return lerp(x, y, smooth((t - a) / (b - a))); }
  return keys[keys.length - 1][1];
}

// mascot position / squash / flags at time t (pure)
export function mascot(t) {
  let pos = START.pos.slice(), scale = START.scale, air = 0, pitch = 0, lean = 0, run = null, moving = null;
  for (const m of MOVES) {
    if (t >= m.t1) { pos = m.to.slice(); if (m.scaleTo) scale = m.scaleTo; continue; }
    if (t < m.t0) break;
    const s = (t - m.t0) / (m.t1 - m.t0), from = pos;
    if (m.type === 'hop') {
      const e = lerp(s, smooth(s), 0.35);
      pos = [lerp(from[0], m.to[0], e), lerp(from[1], m.to[1], e), lerp(from[2], m.to[2], s) + m.h * 4 * s * (1 - s)];
      if (m.scaleTo) scale = lerp(scale, m.scaleTo, smooth(s * 1.4));
      air = Math.sin(Math.PI * s); lean = 0.22 * Math.sin(Math.PI * s);
      if (m.flip) pitch = 2 * Math.PI * smoother((s - 0.12) / 0.7);
      moving = m;
    } else {
      const dur = m.t1 - m.t0, acc = 0.35, D = dur - acc, x = t - m.t0;   // ramp up, cruise, ramp down
      const p = x < acc ? x * x / (2 * acc) : x > dur - acc ? D - (dur - x) * (dur - x) / (2 * acc) : x - acc / 2;
      const e = clamp(p / D);
      pos = [lerp(from[0], m.to[0], e), lerp(from[1], m.to[1], e), lerp(from[2], m.to[2], e)];
      const ph = x * m.hz; run = { ph, amp: clamp(x / acc) * clamp((dur - x) / acc) };
      pos[2] += 1.1 * Math.abs(Math.sin(Math.PI * ph)) * run.amp; lean = 0.16 * run.amp;
      moving = m;
    }
    break;
  }
  // squash & stretch around every hop
  let sq = 1;
  for (const m of MOVES) {
    if (m.type !== 'hop') continue;
    const big = clamp(m.h / 14, 0.45, 1);
    if (t > m.t0 - 0.16 && t < m.t0) sq *= 1 - 0.24 * big * Math.sin(Math.PI * (t - (m.t0 - 0.16)) / 0.16 * 0.5);
    else if (t >= m.t0 && t < m.t1) { const s = (t - m.t0) / (m.t1 - m.t0); sq *= 1 + 0.16 * big * Math.sin(Math.PI * clamp(s / 0.45)) * (s < 0.45 ? 1 : 0) + 0.06 * big * (s > 0.75 ? Math.sin(Math.PI * (s - 0.75) / 0.25) : 0); }
    else if (t >= m.t1 && t < m.t1 + 0.6) { const dt = t - m.t1; sq *= 1 - 0.3 * big * Math.exp(-9 * dt) * Math.cos(20 * dt); }
  }
  // wake-up stretch
  if (t > 0.85 && t < 1.6) sq *= 1 + 0.12 * Math.sin(Math.PI * (t - 0.85) / 0.75);
  // facing
  let face = keyed(FACE, t, 0.32);
  // nods, poke, sway
  let tilt = lean;
  for (const [n, a] of NODS) if (t > n && t < n + 0.7) tilt += 0.2 * a * Math.sin(Math.PI * 2 * (t - n) / 0.35) * (1 - (t - n) / 0.7);
  const poke = t > POKE - 0.15 && t < POKE + 0.45 ? Math.sin(Math.PI * clamp((t - (POKE - 0.15)) / 0.6)) : 0;
  tilt += 0.32 * poke;
  let roll = 0;
  if (t > SWAY[0] && t < SWAY[1]) roll = 0.09 * Math.sin(2 * Math.PI * 0.75 * (t - SWAY[0])) * ramp(t, SWAY[0], SWAY[0] + 0.6) * (1 - ramp(t, SWAY[1] - 0.5, SWAY[1]));
  // blink (0 open … 1 closed)
  let blink = t < ASLEEP_UNTIL ? 1 : t < ASLEEP_UNTIL + 0.12 ? 1 - (t - ASLEEP_UNTIL) / 0.12 : 0;
  for (const b of BLINKS) if (t > b && t < b + 0.16) blink = Math.max(blink, Math.sin(Math.PI * (t - b) / 0.16));
  if (t < 0.85 && t > 0.6) blink = 1 - 0.15 * Math.sin(Math.PI * (t - 0.6) / 0.25);
  // sitting
  let sit = 0, sitMode = 'floor';
  for (const s of SITS) { const k = ramp(t, s.t0, s.t0 + 0.3) * (1 - ramp(t, s.t1 - 0.25, s.t1)); if (k > sit) { sit = k; sitMode = s.mode; } }
  const wave = t > WAVE[0] && t < WAVE[1] ? Math.sin(Math.PI * (t - WAVE[0]) / (WAVE[1] - WAVE[0])) : 0;
  const wakeShake = t > 0.85 && t < 1.15 ? 0.05 * Math.sin((t - 0.85) * 70) * (1 - (t - 0.85) / 0.3) : 0;
  return { pos, scale, sq, face, tilt, roll: roll + wakeShake, pitch, blink, sit, sitMode, run, air, poke, wave, moving };
}

// landings and steps that hit the tracks (ripples) and the sound cues
export function events() {
  const ev = [];
  let pos = START.pos;
  for (const m of MOVES) {
    if (m.type === 'hop') { ev.push({ t: m.t0, kind: 'takeoff', pos, h: m.h }); ev.push({ t: m.t1, kind: 'land', pos: m.to, h: m.h, beat: m.beat }); }
    else { const n = Math.floor((m.t1 - m.t0) * m.hz); for (let k = 1; k <= n; k++) { const t = m.t0 + k / m.hz, s = clamp((t - m.t0) / (m.t1 - m.t0)); ev.push({ t, kind: 'step', pos: [lerp(pos[0], m.to[0], s), lerp(pos[1], m.to[1], s), m.to[2]] }); } }
    pos = m.to;
  }
  return ev;
}

export function cues() {
  const c = [];
  const add = (t, type, gain = 1, extra = {}) => c.push({ t, type, gain, ...extra });
  add(0.4, 'whoosh', 0.5, { dur: 2.2, low: true }); add(0.95, 'pop', 0.55, { pitch: 1.5 });
  for (const e of events()) {
    if (e.kind === 'takeoff') add(e.t, 'hopUp', clamp(e.h / 20, 0.35, 1));
    if (e.kind === 'land') add(e.t, 'squash', clamp(e.h / 18, 0.45, 1.1), { pitch: e.beat ? 1.15 : 1 });
    if (e.kind === 'step') add(e.t, 'step', 0.55);
  }
  add(4.05, 'whoosh', 0.7, { dur: 0.9 }); add(5.2, 'shimmer', 0.6);
  for (let k = 0; k < 6; k++) add(8.3 + k * 0.62, 'uiclick', 0.25, { pitch: 0.8 + 0.05 * k });
  add(13.0, 'digital', 0.55); add(POKE + 0.05, 'uiclick', 0.9, { pitch: 1.2 });
  for (let i = 0; i < TOPIC.length; i++) add(TYPE_AT + i / TYPE_CPS, 'tick', 0.35 + 0.15 * ((i * 7) % 3) / 2);
  add(18.4, 'whoosh', 0.5, { dur: 0.5 });
  for (let i = 0; i < 6; i++) { add(cardIn(i), 'whoosh', 0.42, { dur: 0.45 }); add(cardIn(i) + 0.55, 'tap', 0.5); }
  add(18.9, 'rise', 0.5, { dur: 2.2 });
  for (let i = 0; i < 6; i++) add(cardFlip(i), 'morph', 0.45);
  for (let i = 0; i < 6; i++) { add(cardMove(i), 'whoosh', 0.4, { dur: 0.4 }); add(cardMove(i) + 0.42, 'thud', 0.6); add(cardMove(i) + 0.45, 'uiclick', 0.3, { pitch: 0.7 }); }
  add(28.2, 'rise', 0.25, { dur: 0.5 });
  add(33.15, 'digital', 0.45); add(33.4, 'whoosh', 0.35, { dur: 0.6, low: true });
  add(38.2, 'rise', 0.5, { dur: 0.7 });
  for (let j = 0; j < 8; j++) add(38.55 + j * 0.06, 'tick', 0.25);
  for (const t of MONTAGE.cuts) add(t, 'whoosh', 0.42, { dur: 0.3 });
  add(MONTAGE.tallFrom, 'morph', 0.5);
  add(48.25, 'whoosh', 0.45, { dur: 0.6 }); add(48.9, 'settle', 0.8);
  add(53.1, 'whoosh', 0.55, { dur: 1.2, low: true }); add(54.4, 'impact', 0.8);
  add(57.3, 'final', 0.95);
  return c.sort((a, b) => a.t - b.t);
}
