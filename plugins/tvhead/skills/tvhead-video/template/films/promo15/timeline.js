// promo15 — one timeline for picture and sound (pure data + math, browser and node). Grid: lib/music.mjs `hype`, 150 BPM.
export const FPS = 60, DUR = 15;
export const BPM = 150, BEAT = 60 / BPM, BEAT0 = 0.12;
export const b = k => +(BEAT0 + k * BEAT).toFixed(4);           // beat k → seconds

export const SHOTS = [
  { id: 'terminal', t0: 0,     t1: b(4) },
  { id: 'prompt',   t0: b(4),  t1: b(8) },
  { id: 'looks',    t0: b(8),  t1: b(16) },
  { id: 'voice',    t0: b(16), t1: b(20) },
  { id: 'music',    t0: b(20), t1: b(24) },
  { id: 'pipeline', t0: b(24), t1: b(28) },
  { id: 'build',    t0: b(28), t1: b(32) },
  { id: 'end',      t0: b(32), t1: DUR },
];
export const shotAt = t => SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
export const SHEET = [0.6, 1.25, 1.6, 1.85, 2.3, 2.7, 3.1, 3.7, 4.5, 5.3, 6.3, 7.0, 7.6, 8.5, 9.1, 9.5, 10.3, 11.0, 11.6, 12.4, 13.4, 14.6];

export const PROMPT = '> make a video about black holes';
export const TYPE0 = 0.14, CPS = 32;                            // typing starts, characters per second
export const ENTER = b(3);                                      // ⏎
export const LOOKS = [
  ['doodle', 'DOODLE'], ['cartoon', 'CARTOON'], ['desk3d', '3D DESK'], ['noir', 'NOIR'], ['dota', 'DARK FANTASY'], ['blocks', 'BLOCKS'],
  ['pixel', 'PIXEL'], ['comic', 'COMIC'], ['stick', 'STICKMAN'], ['beanie', 'ZEKE'], ['prehistoric', 'CAVEMEN'], ['cozy', 'COZY'], ['history', 'HISTORY'],
];
export const LOOK_STEP = BEAT / 2;                              // a look passes every eighth
export const LOOKS_FLY = b(8) + 0.12;                           // first frame passes the camera
export const LOOKS_WALL = b(15);                                // the 13-tile wall lands
export const NODES = ['TOPIC', 'STORY', 'VOICE', 'FRAMES', 'MP4'];
export const BUILD = [[b(28), 'TYPE A TOPIC.', 0], [b(29), 'GET A VIDEO.', 1], [b(30), 'TYPE A TOPIC.', 0], [b(30) + BEAT / 2, 'GET A VIDEO.', 1],
  [b(31), 'TOPIC.', 0], [b(31) + BEAT / 4, 'VIDEO.', 1], [b(31) + BEAT / 2, 'TOPIC.', 0], [b(31) + 3 * BEAT / 4, 'VIDEO.', 1]];
export const URL = 'github.com/Vladic20/tvhead-studio';
export const URL0 = b(33) + 0.1, URL_CPS = 48;

// hard cuts: motion-blur samples never cross these (a cut is clean; blur belongs to motion inside a shot)
export const CUTS = [...new Set([...SHOTS.map(s => s.t0).slice(1), b(6), b(22), b(32) - 0.07, ...BUILD.map(e => e[0])])].sort((p, q) => p - q);
export function clampToShot(t, ts) { for (const c of CUTS) { if (t < c && ts >= c) return c - 1e-4; if (t >= c && ts < c) return c; } return ts; }

// slams: words that hit (camera shake + sound)
export const SLAMS = [b(4), b(5), b(7), b(7) + 0.12, b(16), b(20), b(32)];

// ─── math ────────────────────────────────────────────────────────────────────────────────────────────
export const clamp = (x, a = 0, c = 1) => Math.min(c, Math.max(a, x));
export const lerp = (a, c, s) => a + (c - a) * s;
export const smooth = s => (s = clamp(s), s * s * (3 - 2 * s));
export const expo = s => (s = clamp(s), s === 1 ? 1 : 1 - Math.pow(2, -10 * s));
export const back = (s, k = 1.8) => (s = clamp(s), 1 + (k + 1) * Math.pow(s - 1, 3) + k * Math.pow(s - 1, 2));
export const inCubic = s => (s = clamp(s), s * s * s);

// sound cues on the same times
export function cues() {
  const c = [], add = (t, type, gain = 1, x = {}) => c.push({ t, type, gain, ...x });
  for (let i = 0; i < PROMPT.length; i++) if (PROMPT[i] !== ' ') add(TYPE0 + i / CPS, 'tick', 0.5);
  add(ENTER, 'uiclick', 1, { pitch: 0.8 }); add(ENTER + 0.05, 'whoosh', 0.9, { dur: 0.45 });
  for (const t of SLAMS) add(t, 'slam', 1);
  add(b(6), 'whoosh', 0.6, { dur: 0.25 });                        // the arrow
  for (let i = 0; i < LOOKS.length; i++) add(LOOKS_FLY + i * LOOK_STEP, 'pass', 0.55, { pitch: 1 + i * 0.04 });
  add(LOOKS_WALL - 0.5, 'rise', 0.6, { dur: 0.5 }); add(LOOKS_WALL, 'slam', 0.9);
  for (const k of [17, 18, 19]) add(b(k), 'glitch', 0.6);
  add(b(23), 'whoosh', 0.7, { dur: 0.3 }); add(b(23) + 0.02, 'snap', 0.8);
  for (let i = 1; i < NODES.length; i++) { add(b(24 + i) - 0.32, 'hopUp', 0.5); add(b(24 + i) - 0.02, 'pop', 0.8, { pitch: 1 + i * 0.12 }); }
  add(b(28) - 0.02, 'whoosh', 0.5, { dur: 0.3 });
  for (const [t] of BUILD) add(t, 'stab', 0.55);
  add(b(29), 'rise', 0.8, { dur: b(32) - b(29) });
  add(b(32), 'impact', 1);
  for (let i = 0; i < URL.length; i++) add(URL0 + i / URL_CPS, 'tick', 0.32);
  add(b(35), 'pop', 0.7, { pitch: 1.3 });
  return c.sort((p, q) => p.t - q.t);
}
