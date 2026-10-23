// "Claude Duet builds the studio" — 130 s. One timeline for picture and sound: world layout, five clay agents, the blocks
// they carry, the camera shots, sound cues. Everything is built once from data; scene.js only evaluates it at t.
import { Agent, Block, grid, clamp, lerp, smooth, smoother, v3lerp } from '../../lib/choreo.js';

export const FPS = 60, DUR = 130;
export const G = grid(120);                                             // beat 0.5 s, bar 2 s, b(k) = 0.12 + 0.5k
const b = G.b;
export const SEC = { intro: 0, parallel: b(32), conflict: b(92), assembly: b(152), finale: b(212), end: DUR };   // 16.12 · 46.12 · 76.12 · 106.12
export const T = {
  cut: b(32), tug: b(94.5), tear: b(100), yield: b(102.5), rejoin: b(104), snap: b(128), relink: b(132),
  slide: b(152), checks: b(164), play: b(192), collapse: b(212), sit: b(223), squeeze: b(228), title: 118, fadeOut: 129.2,
};

// ─── world ───────────────────────────────────────────────────────────────────────────────────────────
export const ZONES = {
  repo:  { at: [-15, 0, -2], to: [-5.6, 0, 0.6], color: '#5fb7a8', label: 'REPO' },
  skill: { at: [-5, 0, -5.5], to: [-2.1, 0, -2.2], color: '#9b8fd6', label: 'SKILL' },
  ui:    { at: [5, 0, -5.5], to: [2.3, 0, -2.2], color: '#e8c547', label: 'STUDIO' },
  three: { at: [15, 0, -2], to: [6.2, 0, 0.6], color: '#6fa5e0', label: '3D' },
};
export const PLAT = { w: 6, h: 0.3, d: 4.4 };
export const zoneShow = key => key === 'repo' ? -1 : T.cut + 0.08 * ['skill', 'ui', 'three'].indexOf(key);
export function zoneOrigin(key, t) {
  const z = ZONES[key], s = smoother((t - T.slide) / 7.5);
  return v3lerp(z.at, z.to, s);
}
const add = (a, o) => [a[0] + o[0], a[1] + o[1], a[2] + o[2]];

// slots (local to the zone origin): where each block ends up, and where the agent stands to put it there
const SL = {
  repo: [[-1.8, 0.42, -0.8], [0, 0.42, -0.8], [1.8, 0.42, -0.8], [-1.8, 0.42, 0.8], [0, 0.42, 0.8], [1.8, 0.42, 0.8]],
  skill: [3.85, 3.25, 2.65, 2.05, 1.45, 0.85].map(y => [0, y, -1.02]),
  ui: [[-0.75, 2.62, -1.02], [0, 1.0, -1.02], [1.78, 3.15, -1.02], [1.78, 2.42, -1.02], [1.78, 1.69, -1.02], [-1.55, 3.86, -1.02]],
  three: [[0, 0.48, 0.2], [0, 1.2, 0.2], [-0.26, 1.34, 0.8], [0.26, 1.34, 0.8], [0, 0.3, -1.5], [2.05, 0.3, -0.7]],
};
export const slotWorld = (key, i) => t => add(zoneOrigin(key, t), SL[key][i]);
const standAt = (key, i, t) => { const o = zoneOrigin(key, t), s = SL[key][i]; return [o[0] + (key === 'skill' || key === 'ui' ? s[0] * 0.6 : s[0]), 0, o[2] + 2.95]; };
const PILE = { repo: [-19.6, -1.6], skill: [-10.4, -4.4], ui: [10.4, -4.4], three: [19.6, -1.6] };   // beside the platforms, off the camera line
const pileAt = (key, n) => { const [x, z] = PILE[key]; return [x + (n % 2) * 1.0 - 0.5, 0.35, z + Math.floor(n / 2) * 1.25]; };

// ─── blocks ──────────────────────────────────────────────────────────────────────────────────────────
// kind: tile (flat file card), chip (bar on the skill page), panel (screen piece), button, part (mascot / set pieces)
const DEF = {
  repo: [['README.md', 'tile'], ['story.json', 'tile'], ['make.mjs', 'tile'], ['engine/', 'tile', { oversize: 1.9 }], ['lib/', 'tile'], ['app/', 'tile']],
  skill: [['SKILL.md', 'chip'], ['## workflow', 'chip'], ['bootstrap.sh', 'chip'], ['--stills auto', 'chip'], ['voice · music', 'chip'], ['deliver.mp4', 'chip']],
  ui: [['preview', 'panel'], ['timeline', 'bar'], ['▶', 'button'], ['♪', 'button'], ['●', 'button'], ['config.json', 'chipS']],
  three: [['legs', 'part'], ['body', 'part'], ['eyeL', 'part'], ['eyeR', 'part'], ['backdrop', 'part', { oversize: 1.55 }], ['lamp', 'part']],
};
export const BLOCKS = [];
for (const [zone, list] of Object.entries(DEF)) list.forEach(([label, kind, extra], i) => BLOCKS.push(new Block(`${zone}:${i}`, { zone, slot: i, label, kind, seed: BLOCKS.length, ...(extra || {}) })));
export const blk = (zone, i) => BLOCKS.find(x => x.zone === zone && x.slot === i);
// opening cloud of loose pieces in front of the empty scaffold
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const LOW = { 'repo:0': [-2.6, 0.55, 4.6], 'repo:1': [2.2, 0.55, 5.0], 'repo:2': [-0.9, 0.55, 3.0] };   // the three the lone agent reaches first
BLOCKS.forEach((k, i) => { const a = i * 2.39996, r = 3.2 + 4.6 * Math.sqrt((i + 1) / BLOCKS.length);
  k.cloud = LOW[k.id] || [Math.cos(a) * r * 1.5, 2.7 + rnd() * 2.0, 1.2 + Math.sin(a) * r * 0.45]; k.at(0, 'float', { pos: k.cloud }); });

// ─── agents ──────────────────────────────────────────────────────────────────────────────────────────
export const AG = {
  coord: new Agent('coord', { pos: [0.4, 0, 6.6], scale: 1.35, face: Math.PI, color: '#e5744f', head: 1.45 }),
  repo:  new Agent('repo',  { pos: [-15, 26, 1], scale: 1, color: '#5fb7a8', head: 1.45 }),
  skill: new Agent('skill', { pos: [-5, 26, -2], scale: 1, color: '#9b8fd6', head: 1.45 }),
  ui:    new Agent('ui',    { pos: [5, 26, -2], scale: 1, color: '#e8c547', head: 1.45 }),
  three: new Agent('three', { pos: [15, 26, 1], scale: 1, color: '#6fa5e0', head: 1.45 }),
};
const C = AG.coord;
export const EVENTS = [];                                               // for sound and sparkles: { t, kind, pos, ... }
const ev = (t, kind, o = {}) => EVENTS.push({ t, kind, ...o });

function grab(agent, block, t) { block.at(t, 'held', { by: agent.id }); ev(t, 'grab', { by: agent.id }); }
function place(agent, block, t, dur = 0.32) { block.at(t, 'place', { slot: slotWorld(block.zone, block.slot), dur }); agent.lean(t - 0.05, 0.4, 0.45); ev(t + dur, 'insert', { zone: block.zone, kind: block.kind }); }
function toss(from, to, block, t0, t1, h = 3) { block.at(t0, 'fly', { t1, to: tt => { const p = to.headAt(tt); return [p[0], p[1] + 0.05, p[2]]; }, h }); block.at(t1, 'held', { by: to.id }); from.lean(t0 - 0.12, 0.45, 0.35); to.look(t0 - 0.4, from.posAt(t0)); to.squeeze(t1, 0.22); ev(t0, 'toss'); ev(t1, 'catch', { by: to.id }); }

// ── intro: one agent, slow and sequential ────────────────────────────────────────────────────────────
C.sit(0, 2.7).blink(1.4, 4.1, 9.0, 13.2);
const near = (p, dz = 0.9) => [p[0], 0, p[2] + dz];
{
  const pick = (k, tw0, tw1, tg, tl0, tl1, slotIdx) => {
    const bl = blk('repo', k);
    C.walk(tw0, tw1, near(bl.cloud), 1.6);
    C.hop(tg - 0.35, tg, near(bl.cloud), 0.6, { keepFace: true }); grab(C, bl, tg);
    C.walk(tl0, tl1, standAt('repo', slotIdx, tl1), 1.6);
    if (tl1 < T.cut) place(C, bl, tl1 + 0.25, 0.45);
  };
  pick(0, 3.0, 4.4, 4.9, 5.3, 7.4, 0);
  pick(1, 8.1, 9.6, 10.1, 10.5, 12.6, 1);
  C.walk(13.3, 14.6, near(blk('repo', 2).cloud), 1.6); C.hop(14.75, 15.1, near(blk('repo', 2).cloud), 0.6, { keepFace: true }); grab(C, blk('repo', 2), 15.1);
  C.walk(15.3, T.cut - 0.25, [-6, 0, 3.2], 1.6);
  C.look(2.2, [-12, 1, 0]).look(3.0, blk('repo', 0).cloud);
}
// ── the cut: a stomp, the pieces sort themselves into four piles, four agents drop in ───────────────────
C.hop(T.cut - 0.2, b(33), [-5.4, 0, 3.4], 1.8, { flip: true });
ev(b(33), 'stomp', { pos: [-5.4, 0, 3.4] });
const piles = { repo: 0, skill: 0, ui: 0, three: 0 };
BLOCKS.forEach((k, i) => {
  if (k.zone === 'repo' && k.slot < 3) return;                           // two placed, one in the coordinator's hands
  const special = k.zone === 'ui' && k.slot === 5;                       // config.json → the shared pile in the middle
  k.pile = special ? [0, 0.35, 3.0] : pileAt(k.zone, piles[k.zone]++);
  k.at(b(33) + 0.02 * i, 'fly', { t1: b(33) + 0.6 + 0.02 * i, to: k.pile, h: 2.2 + (i % 4) * 0.4 });
  k.at(b(33) + 0.6 + 0.02 * i, 'float', { pos: k.pile });
});
const drop = { repo: [b(33), standAt('repo', 2, b(33))], skill: [b(33.5), standAt('skill', 0, b(33))], ui: [b(34), standAt('ui', 0, b(33))], three: [b(34.5), standAt('three', 0, b(33))] };
for (const [k, [tl, p]] of Object.entries(drop)) { AG[k].hop(tl - 0.6, tl, p, 0, { keepFace: true }); AG[k].look(tl - 0.6, [p[0], 0, p[2] + 5]); ev(tl, 'drop', { by: k, pos: p }); }
toss(C, AG.repo, blk('repo', 2), b(33) + 0.15, b(34.5), 3.5);
place(AG.repo, blk('repo', 2), b(35.5));

// ── parallel: each worker runs its zone, cycles land on beats ───────────────────────────────────────────
function cycle(agent, block, k) {                                      // 6 beats: to the pile, grab, to the slot, insert, a look
  const zone = block.zone;
  agent.hop(b(k), b(k + 1), near(block.pile, 0.85), 1.0); grab(agent, block, b(k + 1.25));
  agent.hop(b(k + 2), b(k + 3), standAt(zone, block.slot, b(k + 3)), 1.3); place(agent, block, b(k + 3.25));
  agent.look(b(k + 4), slotWorld(zone, block.slot)(b(k + 4)));
  return k + 6;
}
let kr = 37, ks = 36, ku = 37.5, kt = 38;
kr = cycle(AG.repo, blk('repo', 4), kr);                                  // lib/
// repo → skill: the SKILL.md source file is thrown across
{ const bl = blk('skill', 0); AG.repo.hop(b(kr), b(kr + 1), near(bl.pile, 0.85), 1.0); grab(AG.repo, bl, b(kr + 1.25)); AG.repo.hop(b(kr + 2), b(kr + 3), [ZONES.repo.at[0] + 3.4, 0, 2.4], 1.1);
  AG.skill.hop(b(kr + 2.5), b(kr + 3.5), [ZONES.skill.at[0] - 1.6, 0, -1.4 + 3.6], 0.9); toss(AG.repo, AG.skill, bl, b(kr + 4), b(kr + 5.5), 3.2);
  AG.skill.hop(b(kr + 6), b(kr + 7), standAt('skill', 0, b(kr + 7)), 1.0); place(AG.skill, bl, b(kr + 7.25), 0.5); kr += 7; }
ks = Math.max(ks, kr + 1.5) - 7;                                         // skill worker busy with its first chips before the catch
ks = cycle(AG.skill, blk('skill', 1), 36);
kr = cycle(AG.repo, blk('repo', 5), kr + 0.5);                            // app/
kr = cycle(AG.repo, blk('repo', 3), kr);                                  // engine/ (oversize — squeezed later)
ks = cycle(AG.skill, blk('skill', 2), Math.max(ks, 51));
ks = cycle(AG.skill, blk('skill', 3), ks);
ks = cycle(AG.skill, blk('skill', 4), ks);
ks = cycle(AG.skill, blk('skill', 5), ks);
ku = cycle(AG.ui, blk('ui', 1), ku);                                      // timeline
ku = cycle(AG.ui, blk('ui', 2), ku);                                      // ▶
ku = cycle(AG.ui, blk('ui', 3), ku);                                      // ♪
kt = cycle(AG.three, blk('three', 0), kt);                                // legs
kt = cycle(AG.three, blk('three', 1), kt);                                // body
kt = cycle(AG.three, blk('three', 2), kt);                                // eyes
kt = cycle(AG.three, blk('three', 3), kt);
// 3D → studio: the preview panel (a render of the mascot) is thrown to the UI worker
{ const bl = blk('ui', 0); const k0 = Math.max(kt, ku); AG.three.hop(b(k0), b(k0 + 1), near(bl.pile, 0.85), 1.0); grab(AG.three, bl, b(k0 + 1.25));
  AG.three.hop(b(k0 + 2), b(k0 + 3), [ZONES.three.at[0] - 3.6, 0, 1.8], 1.1); AG.ui.hop(b(k0 + 2.5), b(k0 + 3.5), [ZONES.ui.at[0] + 2.6, 0, -1.6 + 3.8], 1.0);
  toss(AG.three, AG.ui, bl, b(k0 + 4), b(k0 + 5.5), 3.4); AG.ui.hop(b(k0 + 6), b(k0 + 7), standAt('ui', 0, b(k0 + 7)), 1.0); place(AG.ui, bl, b(k0 + 7.25), 0.5); ku = k0 + 8; kt = k0 + 5; }
ku = cycle(AG.ui, blk('ui', 4), ku);                                      // ●
kt = cycle(AG.three, blk('three', 4), kt);                                // backdrop (oversize)
kt = cycle(AG.three, blk('three', 5), kt);                                // lamp
export const KPAR = { kr, ks, ku, kt };
// the coordinator patrols between zones on two-beat hops while everyone works
{ const route = [[-9.5, 0, 3.2], [0, 0, 2.2], [9.5, 0, 3.2], [0, 0, 4.2], [-11, 0, 2.6], [0, 0, 2.4], [11, 0, 2.8], [0, 0, 4.6]];
  for (let k = 40, i = 0; k < 90; k += 4, i++) { const p = route[i % route.length]; C.hop(b(k), b(k + 1), p, 1.4); if (i % 2) C.look(b(k + 1.5), [p[0] < 0 ? -15 : 15, 1, -3]); } }

// ── conflict: two workers grab config.json, it tears; one yields, the other rebuilds; the coordinator squeezes ──────
export const CONFIG = blk('ui', 5);
AG.skill.hop(b(92.5), b(93.5), [-0.95, 0, 3.9], 1.1); AG.ui.hop(b(93), b(94), [0.95, 0, 3.9], 1.1);
AG.skill.look(b(94), [0, 1, 3.9]); AG.ui.look(b(94.2), [0, 1, 3.9]);
AG.skill.pull(T.tug, T.tear, -0.38); AG.ui.pull(T.tug + 0.12, T.tear, -0.38);
AG.skill.walk(b(97), T.tear - 0.1, [-1.35, 0, 3.9], 1.4); AG.ui.walk(b(97), T.tear - 0.1, [1.35, 0, 3.9], 1.4);
AG.skill.blink(T.tear + 0.5); AG.ui.blink(T.tear + 0.62);
AG.skill.lean(T.yield, -0.32, 0.8);                                       // a small bow: it yields
AG.skill.hop(b(104.5), b(105.5), standAt('skill', 2, b(105.5)), 1.2);
ev(T.tug, 'tug'); ev(T.tear, 'tear', { pos: [0, 2.3, 3.9] }); ev(T.rejoin + 0.5, 'rejoin', { pos: [1.35, 1.7, 3.9] });
CONFIG.at(T.tug - 0.01, 'tug', { a: 'skill', b: 'ui' }); CONFIG.at(T.tear, 'torn', { a: 'skill', b: 'ui' }); CONFIG.at(T.rejoin, 'rejoin', { by: 'ui' });
CONFIG.at(T.rejoin + 0.55, 'held', { by: 'ui' });
AG.ui.hop(b(105), b(106), standAt('ui', 5, b(106)), 1.2); place(AG.ui, CONFIG, b(106.25), 0.45);
// coordinator: squeeze the oversize pieces
export const SQUEEZE = { repo: b(110), three: b(117) };
C.hop(b(107), b(108), standAt('repo', 3, b(108)), 1.5);
C.hop(b(108.5), SQUEEZE.repo, add(slotWorld('repo', 3)(SQUEEZE.repo), [0, 0.12 * 1.9 * 2, 0]), 2.4, { keepFace: true }); C.squeeze(SQUEEZE.repo, 0.45);
C.hop(b(111), b(112), standAt('repo', 3, b(112)), 1.4);
C.hop(b(113), b(115), standAt('three', 4, b(115)), 2.2);
C.hop(b(115.5), SQUEEZE.three, add(slotWorld('three', 4)(SQUEEZE.three), [0, 2.4 * 1.55, 0]), 2.6, { keepFace: true }); C.squeeze(SQUEEZE.three, 0.45);
C.hop(b(118), b(119.5), standAt('three', 4, b(119.5)), 1.8);
ev(SQUEEZE.repo, 'squeeze', { pos: slotWorld('repo', 3)(SQUEEZE.repo) }); ev(SQUEEZE.three, 'squeeze', { pos: slotWorld('three', 4)(SQUEEZE.three) });
// links between zones: appear as zones fill, one snaps and the coordinator re-links it
export const LINKS = [
  { a: 'repo', b: 'skill', on: b(58) }, { a: 'skill', b: 'ui', on: b(70), snap: T.snap, relink: T.relink }, { a: 'ui', b: 'three', on: b(75) },
];
C.hop(b(124), b(125), [-0.6, 0, -0.4], 1.8); C.hop(b(126), b(127), [1.2, 0, -1.2], 1.3);
C.hop(b(128.3), b(129), [0.8, 0, -3.2], 0.9); C.hop(b(130.5), T.relink, [ZONES.ui.at[0] - 3.4, 0, ZONES.ui.at[2] + 0.4], 1.5);
export const CABLE_GRAB = b(129);
LINKS.forEach(l => { ev(l.on, 'link', l); if (l.snap) { ev(l.snap, 'snap'); ev(l.relink, 'relink'); } });
// last fixes: everyone re-presses one piece while the camera pulls back
[['repo', 1, 135], ['skill', 2, 137], ['ui', 1, 139], ['three', 1, 141]].forEach(([z, i, k]) => { AG[z].lean(b(k), 0.4, 0.4); ev(b(k) + 0.15, 'insert', { zone: z, kind: 'fix' }); });

// ── assembly: zones slide together, the agents check every part, the preview comes alive ────────────────────────
const front = { coord: [0, 0, 6.8], repo: [-5.5, 0, 5.0], skill: [-2, 0, 5.6], ui: [2, 0, 5.6], three: [5.5, 0, 5.0] };
['coord', 'repo', 'skill', 'ui', 'three'].forEach((k, i) => AG[k].hop(b(150 + i * 0.5), b(151.5 + i * 0.5), front[k], 1.8));
export const CHECKS = [];
const checkSpots = { repo: [['repo', 0], ['repo', 4], ['repo', 2]], skill: [['skill', 1], ['skill', 4], ['ui', 1]], ui: [['ui', 3], ['ui', 4], ['three', 5]], three: [['three', 1], ['three', 4], ['repo', 5]] };
Object.entries(checkSpots).forEach(([k, spots], w) => spots.forEach(([z, i], j) => {
  const k0 = 164 + j * 6 + w * 1.5, t1 = b(k0 + 1);
  AG[k].hop(b(k0), t1, standAt(z, i, t1), 1.5); AG[k].look(t1 + 0.1, slotWorld(z, i)(t1));
  CHECKS.push({ t: t1 + 0.2, zone: z, slot: i, n: CHECKS.length }); ev(t1 + 0.2, 'check', { n: CHECKS.length });
}));
// the UI worker head-bumps the play button; the playhead runs and the preview plays real frames
AG.ui.hop(b(188), b(189.5), standAt('ui', 2, b(189.5)), 1.4);
AG.ui.hop(b(190.5), T.play, add(standAt('ui', 2, T.play), [0, 0, -0.6]), 2.4, { keepFace: true }); ev(T.play, 'play');
AG.ui.hop(T.play + 0.1, b(193.5), standAt('ui', 2, b(193.5)), 0.8, { keepFace: true });
['coord', 'repo', 'skill', 'three'].forEach((k, i) => { AG[k].hop(b(192 + i), b(193 + i), [-3.2 + i * 2.1, 0, 3.6 + (i % 2) * 0.8], 1.1); AG[k].look(b(193.5 + i), slotWorld('ui', 0)(b(196))); });
export const PLAY = { t0: T.play + 0.1, t1: b(210) };

// ── finale: everything collapses into one object — the repo on the left, the working studio on the right ───────
export function finalPos(block) {
  if (block.zone === 'repo' || block.zone === 'skill') { const n = (block.zone === 'repo' ? 0 : 6) + block.slot; return [-3.4, 0.16 + n * 0.3, 1.6]; }
  if (block.zone === 'ui') { const p = SL.ui[block.slot]; return [1.9 + p[0] * 0.92, 0.45 + p[1] * 0.92, 0.9]; }
  const p = SL.three[block.slot]; return [5.4 + p[0] * 0.72, p[1] * 0.72, 1.9 + p[2] * 0.72];
}
export const collapseAt = block => T.collapse + 0.05 * (block.zone === 'repo' || block.zone === 'skill' ? (block.zone === 'repo' ? 0 : 6) + block.slot : 12 + ['ui', 'three'].indexOf(block.zone) * 6 + block.slot);
const ring = [[-4.6, 0, 5.4], [-1.6, 0, 6.2], [1.6, 0, 6.2], [4.6, 0, 5.4], [0, 0, 5.0]];
['repo', 'skill', 'ui', 'three', 'coord'].forEach((k, i) => { AG[k].hop(b(214 + i), b(215.5 + i), ring[i], 1.6); AG[k].look(b(216 + i), [0, 1, 1.4]); AG[k].sit(T.sit + i * 0.3, DUR + 1); });
C.squeeze(T.squeeze, 0.5); ev(T.squeeze, 'done');
for (const a of Object.values(AG)) { a.blink(...Array.from({ length: 26 }, (_, i) => 3 + i * 4.9 + (a.id.length % 3) * 0.7)); a.finish(); }

// ─── camera shots ────────────────────────────────────────────────────────────────────────────────────
// each: { t0, t1, cam(t) → { pos, target, fov, focus?, ap } }; a boundary between shots is a hard cut
const V = (x, y, z) => [x, y, z];
const ease = (t, t0, t1) => smoother((t - t0) / (t1 - t0));
const follow = (id, o0, o1, { fov = 36, ap = 0.12, look = [0, 0.9, 0] } = {}) => (t, s) => { const p = AG[id].posAt(t - 0.15), k = ease(t, s.t0, s.t1), o = v3lerp(o0, o1, k); const tg = [p[0] + look[0], Math.max(0.8, p[1] * 0.6 + look[1]), p[2] + look[2]]; return { pos: add(tg, o), target: tg, fov, ap }; };
const move = (p0, p1, g0, g1, { fov = 38, ap = 0.06 } = {}) => (t, s) => { const k = ease(t, s.t0, s.t1); return { pos: v3lerp(p0, p1, k), target: v3lerp(g0, g1, k), fov, ap }; };
const orbit = (c, r, h, a0, a1, { fov = 38, ap = 0.05, h1 = h, r1 = r } = {}) => (t, s) => { const k = ease(t, s.t0, s.t1), a = lerp(a0, a1, k), rr = lerp(r, r1, k); return { pos: [c[0] + Math.sin(a) * rr, lerp(h, h1, k), c[2] + Math.cos(a) * rr], target: c, fov, ap }; };
const zoneCam = (key, o0, o1, opts) => (t, s) => { const z = zoneOrigin(key, t), k = ease(t, s.t0, s.t1); const tg = add(z, [0, 1.5, 0]); return { pos: add(tg, v3lerp(o0, o1, k)), target: tg, fov: 36, ap: 0.08, ...opts }; };
const trackBlock = (bl, pos, { fov = 40 } = {}) => (t) => { const w = bl.where(t, AG); const tg = w ? w.pos : pos; return { pos, target: tg, fov, ap: 0.04 }; };
export const SHOTS = [
  { t0: 0, t1: T.cut, cam: follow('coord', V(6.5, 2.8, 9.5), V(4.2, 2.0, 6.0), { ap: 0.16 }) },
  { t0: T.cut, t1: 19.12, cam: move(V(0, 15, 27), V(0, 10.5, 22), V(0, 1, -1.5), V(0, 1.2, -1.5), { fov: 44 }) },
  { t0: 19.12, t1: 21.12, cam: zoneCam('repo', V(2.6, 1.6, 7.4), V(1.6, 1.2, 6.4)) },
  { t0: 21.12, t1: 23.12, cam: zoneCam('skill', V(-2.6, 1.6, 7.6), V(-1.4, 1.4, 6.6)) },
  { t0: 23.12, t1: 25.12, cam: trackBlock(blk('skill', 0), V(-10, 3.6, 9.5)) },
  { t0: 25.12, t1: 27.12, cam: zoneCam('ui', V(2.2, 1.4, 7.4), V(1.2, 1.2, 6.4)) },
  { t0: 27.12, t1: 29.12, cam: zoneCam('three', V(-2.4, 1.8, 7.0), V(-1.2, 1.4, 6.0)) },
  { t0: 29.12, t1: 32.12, cam: move(V(-8, 17, 16), V(8, 16, 15), V(0, 0, -3), V(0, 0, -3), { fov: 44 }) },
  { t0: 32.12, t1: 34.62, cam: trackBlock(blk('ui', 0), V(10.5, 4.0, 9.5)) },
  { t0: 34.62, t1: 36.62, cam: zoneCam('ui', V(-2.4, 1.8, 7.0), V(-1.4, 1.5, 6.2)) },
  { t0: 36.62, t1: 38.62, cam: zoneCam('three', V(2.6, 1.6, 6.6), V(1.8, 1.4, 5.8)) },
  { t0: 38.62, t1: 40.62, cam: zoneCam('skill', V(2.4, 2.4, 7.2), V(1.4, 2.0, 6.0)) },
  { t0: 40.62, t1: SEC.conflict, cam: orbit(V(0, 0.8, -2), 25, 10, -0.5, 0.35, { fov: 42, h1: 8 }) },
  { t0: SEC.conflict, t1: T.tear, cam: move(V(0.8, 3.4, 15), V(0.2, 2.1, 7.4), V(0, 1.6, 3.9), V(0, 1.9, 3.9), { fov: 34, ap: 0.1 }) },
  { t0: T.tear, t1: 52.9, cam: move(V(-1.1, 2.0, 6.9), V(-1.3, 1.9, 6.6), V(0, 1.9, 3.9), V(0.3, 1.8, 3.9), { fov: 34, ap: 0.12 }) },
  { t0: 52.9, t1: 54.6, cam: follow('ui', V(2.4, 2.0, 6.4), V(1.8, 2.3, 7.2), { ap: 0.1, look: [0, 1.2, -0.8] }) },
  { t0: 54.6, t1: 57.1, cam: follow('coord', V(-4.2, 3.0, 7.0), V(-3.4, 3.6, 6.4), { ap: 0.1 }) },
  { t0: 57.1, t1: 60.1, cam: follow('coord', V(4.4, 3.4, 7.4), V(3.4, 3.8, 6.8), { ap: 0.1 }) },
  { t0: 60.1, t1: T.snap, cam: move(V(0, 5, 14), V(0, 4.6, 12), V(0, 2.2, -4), V(0, 2.2, -4.4), { fov: 38 }) },
  { t0: T.snap, t1: 66.62, cam: follow('coord', V(3.2, 2.6, 6.6), V(-2.6, 3.0, 6.8), { ap: 0.1, look: [0, 1.4, -1.2] }) },
  { t0: 66.62, t1: SEC.assembly, cam: orbit(V(0, 1.2, -2), 13, 5, -0.6, 0.6, { fov: 40, r1: 24, h1: 10 }) },
  { t0: SEC.assembly, t1: 82.12, cam: move(V(0, 13, 26), V(0, 8.5, 19), V(0, 1, -2), V(0, 1.4, -0.5), { fov: 42 }) },
  { t0: 82.12, t1: 89.12, cam: orbit(V(0, 1.2, 0), 15, 5.5, 0.7, -0.2, { fov: 40, r1: 13 }) },
  { t0: 89.12, t1: 94.12, cam: orbit(V(0, 1.2, 0), 12, 4.5, -0.35, 0.5, { fov: 40, h1: 5.5 }) },
  { t0: 94.12, t1: 98.12, cam: move(V(4.2, 2.6, 6.4), V(3.2, 2.4, 5.2), V(2.2, 2.0, -2.2), V(1.7, 2.3, -2.2), { fov: 36, ap: 0.08 }) },
  { t0: 98.12, t1: SEC.finale, cam: move(V(1.5, 3.4, 9.5), V(0.6, 4.4, 13), V(1.4, 2.0, -1.5), V(0.8, 1.8, -0.8), { fov: 40, ap: 0.05 }) },
  { t0: SEC.finale, t1: 113.12, cam: orbit(V(0.8, 1.4, 1.2), 12.5, 4.5, 0.55, 0.15, { fov: 40, ap: 0.06 }) },
  { t0: 113.12, t1: 116.12, cam: follow('coord', V(1.6, 1.4, 3.6), V(1.2, 1.6, 4.2), { ap: 0.12, look: [0, 0.6, 0] }) },
  { t0: 116.12, t1: DUR, cam: move(V(1.2, 3.0, 10.5), V(0.4, 6.5, 22), V(0.8, 1.4, 1.2), V(0.8, 2.6, 0.6), { fov: 40, ap: 0.03 }) },
];
export const CUTS = SHOTS.map(s => s.t0).slice(1);
export function clampToShot(t, ts) { for (const c of CUTS) { if (t < c && ts >= c) return c - 1e-4; if (t >= c && ts < c) return c; } return ts; }
export const shotAt = t => SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
export const SHEET = [1.5, 6, 11, 15.8, 17.5, 20, 22.5, 25, 27, 30, 33.5, 36.5, 42, 45, 48.5, 50.8, 52.5, 55.5, 59, 61.5, 66, 72, 79, 86, 92, 97, 101, 104, 108, 113, 116, 122, 128];

// ─── sound cues ──────────────────────────────────────────────────────────────────────────────────────
export function cues() {
  const c = [], put = (t, type, gain = 1, x = {}) => c.push({ t, type, gain, ...x });
  for (const a of Object.values(AG)) for (const l of a.landings()) { if (l.t > DUR - 0.2) continue; const big = a.id === 'coord'; put(l.t0, 'hopUp', big ? 0.45 : 0.28); put(l.t, 'squash', (big ? 0.85 : 0.5) * clamp(l.h / 1.6, 0.4, 1.1), { pitch: big ? 0.8 : 1 + 0.06 * ['repo', 'skill', 'ui', 'three'].indexOf(a.id) }); }
  for (const a of Object.values(AG)) for (const m of a.moves) if (m.type === 'walk') for (let tt = m.t0 + 0.3; tt < m.t1; tt += 1 / m.hz) put(tt, 'step', 0.35);
  let checks = 0;
  for (const e of EVENTS) {
    if (e.kind === 'grab') put(e.t, 'pop', 0.45, { pitch: 1.1 });
    if (e.kind === 'insert') { put(e.t, 'thud', e.kind === 'fix' ? 0.35 : 0.5); put(e.t + 0.01, 'snap', 0.35); }
    if (e.kind === 'toss') put(e.t, 'whoosh', 0.7, { dur: 1.0 });
    if (e.kind === 'catch') put(e.t, 'pop', 0.7, { pitch: 1.3 });
    if (e.kind === 'stomp') { put(e.t, 'impact', 0.9); put(e.t + 0.05, 'whoosh', 0.6, { dur: 0.7, low: true }); }
    if (e.kind === 'drop') put(e.t, 'slam', 0.5);
    if (e.kind === 'tug') put(e.t, 'rise', 0.5, { dur: T.tear - T.tug });
    if (e.kind === 'tear') put(e.t, 'tear', 1);
    if (e.kind === 'rejoin') { put(e.t - 0.4, 'morph', 0.6); put(e.t, 'shimmer', 0.6); }
    if (e.kind === 'squeeze') put(e.t, 'squash', 0.9, { pitch: 0.6 });
    if (e.kind === 'link') put(e.t, 'digital', 0.5);
    if (e.kind === 'snap') { put(e.t, 'snap', 1); put(e.t + 0.02, 'glitch', 0.7); }
    if (e.kind === 'relink') { put(e.t, 'digital', 0.7); put(e.t, 'shimmer', 0.4); }
    if (e.kind === 'check') put(e.t, 'chime', 0.4, { step: checks++ });
    if (e.kind === 'play') { put(e.t, 'uiclick', 1, { pitch: 0.9 }); put(e.t + 0.05, 'shimmer', 0.7); }
    if (e.kind === 'done') put(e.t, 'final', 0.9);
  }
  put(T.cut - 1.6, 'rise', 0.7, { dur: 1.55 });
  for (const z of ['skill', 'ui', 'three']) put(zoneShow(z), 'thud', 0.6);
  put(T.slide, 'whoosh', 0.6, { dur: 2.5, low: true }); put(T.collapse, 'whoosh', 0.7, { dur: 1.8, low: true });
  put(T.title, 'shimmer', 0.5);
  return c.sort((p, q) => p.t - q.t);
}
