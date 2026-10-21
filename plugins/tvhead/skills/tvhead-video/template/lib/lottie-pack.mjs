// Starter pack of Lottie animations (the JSON format After Effects exports through Bodymovin / LottieFiles), written
// in code so their licence is ours (MIT, like the rest of the studio). `node lib/lottie-pack.mjs` writes lottie/*.json.
// Use them in a story as { "type": "lottie", "src": "pack:check" }; your own AE exports go in the episode folder.
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const S = v => ({ a: 0, k: v });                                    // static property
const ease = { i: { x: [.2], y: [1] }, o: { x: [.6], y: [0] } };
const back = { i: { x: [.3], y: [1.5] }, o: { x: [.5], y: [0] } };   // overshoot
const A = (keys, e = ease) => ({ a: 1, k: keys.map(([t, s], n) => (n < keys.length - 1 ? { t, s: [].concat(s), ...e } : { t, s: [].concat(s) })) });
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).concat(1);
const tr = (o = {}) => ({ ty: 'tr', p: o.p || S([0, 0]), a: S([0, 0]), s: o.s || S([100, 100]), r: o.r || S(0), o: o.o || S(100), sk: S(0), sa: S(0) });
const gr = (items, t) => ({ ty: 'gr', it: [...items, tr(t)] });
const el = (size, p = [0, 0]) => ({ ty: 'el', p: S(p), s: typeof size === 'object' && size.a !== undefined ? size : S([size, size]) });
const rc = (w, h, r = 0, p = [0, 0]) => ({ ty: 'rc', p: S(p), s: S([w, h]), r: S(r) });
const sh = (v, c = false, ii, oo) => ({ ty: 'sh', ks: S({ v, i: ii || v.map(() => [0, 0]), o: oo || v.map(() => [0, 0]), c }) });
const st = (col, w, o = S(100)) => ({ ty: 'st', c: S(hex(col)), o, w: typeof w === 'number' ? S(w) : w, lc: 2, lj: 2 });
const fl = (col, o = S(100)) => ({ ty: 'fl', c: S(hex(col)), o, r: 1 });
const tm = (s, e, o = S(0)) => ({ ty: 'tm', s, e, o, m: 1 });
const rp = (n, rot) => ({ ty: 'rp', c: S(n), o: S(0), m: 1, tr: { ty: 'tr', p: S([0, 0]), a: S([0, 0]), s: S([100, 100]), r: S(rot), so: S(100), eo: S(100) } });
const layer = (nm, shapes, ks = {}, ip = 0, op = 999) => ({ ddd: 0, ind: 0, ty: 4, nm, sr: 1, ao: 0, ip, op, st: 0, bm: 0, shapes,
  ks: { o: ks.o || S(100), r: ks.r || S(0), p: ks.p || S([256, 256, 0]), a: S([0, 0, 0]), s: ks.s || S([100, 100, 100]) } });
const anim = (nm, op, layers, w = 512, h = 512) => ({ v: '5.7.4', fr: 30, ip: 0, op, w, h, nm, ddd: 0, assets: [], layers: layers.map((l, i) => ({ ...l, ind: i + 1, op: Math.min(l.op, op) })) });

const PACK = {
  // green circle pops, white tick draws, little rays fly out
  check: anim('check', 45, [
    layer('tick', [gr([sh([[-62, 4], [-18, 46], [66, -40]]), tm(S(0), A([[10, 0], [26, 100]])), st('#ffffff', 26)])]),
    layer('disc', [gr([el(260), fl('#2ecc71')])], { s: A([[0, [0, 0, 100]], [12, [112, 112, 100]], [20, [100, 100, 100]]], back) }),
    layer('rays', [gr([sh([[0, -170], [0, -210]]), tm(A([[14, 0], [30, 100]]), A([[12, 0], [24, 100]])), st('#2ecc71', 14), rp(8, 45)])]),
  ]),
  // radial lines shoot out + an expanding ring (loops)
  burst: anim('burst', 30, [
    layer('lines', [gr([sh([[0, -60], [0, -230]]), tm(A([[6, 0], [26, 100]]), A([[0, 0], [18, 100]])), st('#ffd34d', 16), rp(12, 30)])]),
    layer('ring', [gr([el(A([[0, [40, 40]], [26, [440, 440]]])), st('#ff8a3a', A([[0, 26], [26, 2]]), A([[0, 100], [26, 0]]))])]),
  ]),
  // spinner arc (loops)
  loader: anim('loader', 40, [
    layer('arc', [gr([el(260), tm(A([[0, 0], [20, 0], [40, 100]]), A([[0, 0], [20, 75], [40, 100]])), st('#4aa8ff', 30)])], { r: A([[0, 0], [40, 360]], { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } }) }),
    layer('track', [gr([el(260), st('#ffffff', 30, S(18))])]),
  ]),
  // heart that beats (loops)
  heart: anim('heart', 30, [
    layer('heart', [gr([sh([[0, 90], [-110, -10], [0, -60], [110, -10]], true,
      [[40, 40], [0, 60], [-50, -50], [0, -60]], [[-40, -40], [-20, -70], [50, -50], [20, 70]]), fl('#ff3d6a')])],
      { s: A([[0, [100, 100, 100]], [6, [122, 122, 100]], [12, [96, 96, 100]], [18, [112, 112, 100]], [30, [100, 100, 100]]]) }),
  ]),
  // curved arrow draws itself, head pops at the end
  arrow: anim('arrow', 36, [
    layer('head', [gr([sh([[150, -10], [190, 50], [120, 60]], true), fl('#ffd34d')])], { s: A([[18, [0, 0, 100]], [26, [115, 115, 100]], [30, [100, 100, 100]]], back), p: S([256, 256, 0]) }),
    layer('shaft', [gr([sh([[-180, 60], [0, -110], [170, 40]], false, [[0, 0], [-110, 0], [0, 0]], [[0, 0], [110, 0], [0, 0]]), tm(S(0), A([[0, 0], [22, 100]])), st('#ffd34d', 22)])]),
  ]),
  // four-point stars twinkling (loops)
  sparkle: anim('sparkle', 40, [[-110, -80, 0, '#fff3b0'], [100, -120, 12, '#ffffff'], [60, 110, 24, '#ffd34d'], [-90, 120, 6, '#ffffff']].map(([x, y, d, c], i) =>
    layer('star' + i, [gr([sh([[0, -60], [14, -14], [60, 0], [14, 14], [0, 60], [-14, 14], [-60, 0], [-14, -14]], true), fl(c)])],
      { p: S([256 + x, 256 + y, 0]), s: A([[d, [0, 0, 100]], [d + 8, [100, 100, 100]], [d + 16, [0, 0, 100]]].map(([t, s]) => [t % 40, s]).sort((a, b) => a[0] - b[0])), r: A([[0, 0], [40, 90]]) }))),
  // map pin drops and bounces, shadow squashes
  pin: anim('pin', 36, [
    layer('pin', [gr([el(48, [0, -150]), fl('#ffffff')]), gr([sh([[0, 0], [-80, -130], [0, -230], [80, -130]], true, [[0, 0], [-10, 60], [-60, 0], [0, -60]], [[0, 0], [0, -60], [60, 0], [10, 60]]), fl('#e74c3c')])],
      { p: A([[0, [256, -60, 0]], [14, [256, 380, 0]], [20, [256, 340, 0]], [26, [256, 380, 0]]]) }),
    layer('shadow', [gr([el(A([[0, [20, 8]], [14, [150, 34]], [20, [110, 26]], [26, [150, 34]]])), fl('#000000', S(30))])], { p: S([256, 390, 0]) }),
  ]),
  // confetti pieces falling and spinning (loops)
  confetti: anim('confetti', 90, Array.from({ length: 14 }, (_, i) => {
    const x = 40 + (i * 37) % 440, d = (i * 13) % 60, c = ['#ff3d6a', '#ffd34d', '#4aa8ff', '#2ecc71', '#b06cff'][i % 5];
    return layer('c' + i, [gr([i % 3 ? rc(26, 14, 3) : el(16), fl(c)])], { p: A([[0, [x, -30 - d * 4, 0]], [90, [x + ((i % 2) ? 60 : -60), 560 - d * 4, 0]]], { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } }), r: A([[0, 0], [90, (i % 2 ? 1 : -1) * 540]], { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } }) });
  })),
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lottie'); mkdirSync(out, { recursive: true });
  for (const [name, data] of Object.entries(PACK)) writeFileSync(path.join(out, `${name}.json`), JSON.stringify(data));
  console.log(`wrote ${Object.keys(PACK).length} animations → ${out}`);
}
export { PACK };
