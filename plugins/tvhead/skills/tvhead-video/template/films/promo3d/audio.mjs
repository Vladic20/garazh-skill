// Sound for the 3D promo, on the picture's timeline: synthesized SFX at timeline.js cues, generated lo-fi (lib/music.mjs)
// with an arranged level curve and ducking under the narration, the narration itself. Writes env.json (voice loudness
// for the scene's waveform bars), out/promo3d.wav and, with a picture, out/promo3d.mp4.
//   node audio.mjs [--video out/promo3d.video.mp4]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMusic } from '../../lib/music.mjs';
import { DUR, FPS, cues, beatAt } from './timeline.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SR = 48000, N = Math.round(DUR * SR);
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
mkdirSync(path.join(here, 'out'), { recursive: true });

function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const r = rng(99);
const L = new Float32Array(N), R = new Float32Array(N);
// one-pole filters
const lp = (fc) => { const a = Math.exp(-2 * Math.PI * fc / SR); let y = 0; return x => (y = (1 - a) * x + a * y); };
const hp = (fc) => { const f = lp(fc); return x => x - f(x); };
// a band-pass whose centre can move per sample (state-variable filter)
function svf() { let lo = 0, band = 0; return (x, fc, q = 0.7) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); const hi = x - lo - q * band; band += f * hi; lo += f * band; return band; }; }
function put(t, gain, pan, gen, len) {                     // gen(i, tt) → sample; pan −1…1
  const i0 = Math.round(t * SR), n = Math.round(len * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) { const k = i0 + i; if (k < 0 || k >= N) continue; const v = gen(i, i / SR); L[k] += v * gl; R[k] += v * gr; }
}
const env = (tt, a, d) => tt < a ? tt / a : Math.exp(-(tt - a) / d);
function sweep(f0, f1, dur) { let ph = 0; return tt => { const f = f0 * Math.pow(f1 / f0, Math.min(1, tt / dur)); ph += 2 * Math.PI * f / SR; return Math.sin(ph); }; }

const SFX = {
  pop(t, g, c) { const p = c.pitch || 1, s = sweep(900 * p, 260 * p, 0.07), n = hp(2000); put(t, g * 0.5, 0, (i, tt) => s(tt) * env(tt, 0.002, 0.06) + n(r() - 0.5) * 0.4 * env(tt, 0.001, 0.006), 0.35); },
  squash(t, g, c) {                                         // clay landing: low thump + wet splat + tiny pop
    const p = c.pitch || 1, s = sweep(170 * p, 62 * p, 0.12), f = lp(900), f2 = svf(), pp = sweep(520 * p, 240 * p, 0.05);
    put(t, g * 0.75, (r() - 0.5) * 0.3, (i, tt) => s(tt) * env(tt, 0.003, 0.11) * 0.9 + f(r() - 0.5) * 1.6 * env(tt, 0.004, 0.05) + f2(r() - 0.5, 1400 - 900 * Math.min(1, tt / 0.08), 0.4) * 0.5 * env(tt, 0.002, 0.04) + pp(tt) * 0.25 * env(tt, 0.002, 0.04), 0.6);
  },
  hopUp(t, g) { const s = sweep(280, 760, 0.09); put(t - 0.02, g * 0.22, 0, (i, tt) => s(tt) * env(tt, 0.01, 0.06), 0.25); },
  step(t, g) { const f = svf(), s = sweep(240, 150, 0.03); put(t, g * 0.35, (r() - 0.5) * 0.4, (i, tt) => f(r() - 0.5, 1300, 0.5) * env(tt, 0.001, 0.018) * 1.4 + s(tt) * env(tt, 0.002, 0.025) * 0.6, 0.12); },
  whoosh(t, g, c) {
    const d = c.dur || 0.5, f = svf(), lo = c.low ? 120 : 300, hi = c.low ? 900 : 2600;
    put(t - d * 0.35, g * 0.55, 0, (i, tt) => { const x = tt / d, e = Math.sin(Math.PI * Math.min(1, x)) ** 2; return f(r() - 0.5, lo + (hi - lo) * Math.sin(Math.PI * Math.min(1, x)), 0.5) * e * 2.2; }, d);
  },
  shimmer(t, g) { const parts = [1180, 1770, 2360, 2950, 3540].map(f => ({ f: f * (1 + (r() - 0.5) * 0.01), ph: r() * 6 }));
    put(t, g * 0.18, 0, (i, tt) => parts.reduce((a, p, k) => a + Math.sin(2 * Math.PI * p.f * tt + p.ph) * Math.exp(-tt / (0.5 + k * 0.12)), 0) * Math.min(1, tt / 0.01), 1.6); },
  uiclick(t, g, c) { const p = c.pitch || 1, n = hp(3000); put(t, g * 0.35, 0.1, (i, tt) => Math.sin(2 * Math.PI * 2400 * p * tt) * env(tt, 0.0005, 0.008) + n(r() - 0.5) * env(tt, 0.0003, 0.003), 0.05); },
  tick(t, g) { const n = hp(2500); put(t, g * 0.32, (r() - 0.5) * 0.5, (i, tt) => n(r() - 0.5) * 1.3 * env(tt, 0.0004, 0.005) + Math.sin(2 * Math.PI * (1700 + r() * 300) * tt) * 0.3 * env(tt, 0.001, 0.01), 0.04); },
  digital(t, g) { [880, 1320, 1760].forEach((f, k) => put(t + k * 0.055, g * 0.16, -0.2 + k * 0.2, (i, tt) => Math.sin(2 * Math.PI * f * tt + Math.sin(2 * Math.PI * f * 2 * tt) * 0.6) * env(tt, 0.002, 0.06), 0.25)); },
  tap(t, g) { const f = svf(); put(t, g * 0.4, (r() - 0.5) * 0.4, (i, tt) => f(r() - 0.5, 1800, 0.6) * env(tt, 0.001, 0.03) * 1.6, 0.1); },
  rise(t, g, c) { const d = c.dur || 1, f = svf(), s = sweep(220, 880, d); put(t, g * 0.3, 0, (i, tt) => { const x = Math.min(1, tt / d), e = x * x * (1 - Math.max(0, (tt - d) / 0.15)); return (f(r() - 0.5, 400 + 3000 * x, 0.6) * 1.2 + s(tt) * 0.25) * Math.max(0, e); }, d + 0.15); },
  morph(t, g) { const f = svf(); let ph = 0; put(t, g * 0.35, 0, (i, tt) => { const x = tt / 0.55; const fr = 500 + 420 * Math.sin(Math.PI * x); ph += 2 * Math.PI * fr / SR; return (Math.sin(ph) * 0.35 * (1 + 0.4 * Math.sin(2 * Math.PI * 18 * tt)) + f(r() - 0.5, 700 + 1800 * x, 0.5)) * Math.sin(Math.PI * Math.min(1, x)) ** 2; }, 0.55); },
  thud(t, g) { const s = sweep(120, 52, 0.18), f = lp(600); put(t, g * 0.7, (r() - 0.5) * 0.3, (i, tt) => s(tt) * env(tt, 0.003, 0.16) + f(r() - 0.5) * env(tt, 0.002, 0.04) * 1.2, 0.5); },
  settle(t, g) { const s = sweep(200, 110, 0.15), f = svf(); put(t, g * 0.6, 0, (i, tt) => s(tt) * env(tt, 0.004, 0.16) + f(r() - 0.5, 900, 0.5) * env(tt, 0.003, 0.08) * 0.5, 0.6); },
  impact(t, g) { const s = sweep(70, 38, 0.5), f = lp(400); put(t, g * 0.8, 0, (i, tt) => s(tt) * env(tt, 0.005, 0.7) + f(r() - 0.5) * env(tt, 0.002, 0.12) * 1.5, 2.2); SFX.shimmer(t + 0.02, g * 0.8); },
  final(t, g) { SFX.impact(t, g * 0.9); const bells = [523.25, 659.25, 783.99, 1046.5]; bells.forEach((f, k) => put(t + k * 0.02, g * 0.1, -0.3 + k * 0.2, (i, tt) => (Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(2 * Math.PI * f * 2.76 * tt) * Math.exp(-tt / 0.3)) * env(tt, 0.004, 1.4), 2.8)); },
};
for (const c of cues()) { const f = SFX[c.type]; if (!f) throw new Error('no sfx ' + c.type); f(c.t, c.gain, c); }
// small room on the SFX bus
function room(x, mix = 0.16) {
  const out = new Float32Array(x.length), taps = [[0.029, 0.5], [0.037, 0.42], [0.044, 0.36], [0.053, 0.3]].map(([d, g]) => [Math.round(d * SR), g]);
  const buf = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) { let w = 0; for (const [d, g] of taps) if (i >= d) w += buf[i - d] * g; buf[i] = x[i] + w * 0.55; out[i] = x[i] + buf[i] * mix * 0.4; }
  return out;
}
const sfxL = room(L), sfxR = room(R);

// ─── narration ───────────────────────────────────────────────────────────────────────────────────────
function decode(file) {
  const p = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
  if (p.status) throw new Error('decode ' + file);
  return new Float32Array(p.stdout.buffer, p.stdout.byteOffset, p.stdout.length / 4);
}
const voice = new Float32Array(N);
const vj = path.join(here, 'voice.json');
const lines = existsSync(vj) ? JSON.parse(readFileSync(vj, 'utf8')) : [];
let voiced = 0;
for (const ln of lines) {
  if (!ln.file || ln.silent || !existsSync(ln.file)) continue;
  const x = decode(ln.file), i0 = Math.round((ln.at - (ln.lead || 0)) * SR);
  for (let i = 0; i < x.length; i++) { const k = i0 + i; if (k >= 0 && k < N) voice[k] += x[i]; }
  voiced++;
}
// normalise the narration to a steady speech level (RMS of voiced parts)
{ let s = 0, n = 0; for (let i = 0; i < N; i++) if (Math.abs(voice[i]) > 0.01) { s += voice[i] ** 2; n++; }
  const rms = n ? Math.sqrt(s / n) : 0, g = rms ? 0.12 / rms : 0; for (let i = 0; i < N; i++) voice[i] = Math.tanh(voice[i] * g * 1.2) / 1.2; }
// loudness envelope (30 fps) → env.json for the waveform bars; and a smooth envelope for ducking
const frames = Math.ceil(DUR * FPS), venv = new Array(frames).fill(0);
for (let f = 0; f < frames; f++) { let s = 0; const a = Math.round(f / FPS * SR), b = Math.min(N, a + Math.round(SR / FPS)); for (let i = a; i < b; i++) s += voice[i] ** 2; venv[f] = Math.sqrt(s / Math.max(1, b - a)); }
const vmax = Math.max(1e-6, ...venv);
if (voiced) writeFileSync(path.join(here, 'env.json'), JSON.stringify({ fps: FPS, v: venv.map(v => +(Math.min(1, v / vmax * 1.15)).toFixed(3)) }));

// ─── music: arranged level, ducked under the voice ───────────────────────────────────────────────────
const mfile = path.join(here, 'out', 'music.wav');
renderMusic({ preset: 'lofi', bpm: 84, duration: DUR, quiet: [[0, 34.35]], hits: [43.0, 53.1], seed: 21 }, mfile);
const music = (() => { const p = spawnSync('ffmpeg', ['-v', 'error', '-i', mfile, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 }); return new Float32Array(p.stdout.buffer, p.stdout.byteOffset, p.stdout.length / 4); })();
const lv = [[0, 0], [1.0, 0.12], [7, 0.42], [13, 0.5], [34.3, 0.62], [38.3, 0.85], [43.0, 1.0], [48.0, 0.95], [53.2, 0.9], [57.6, 0.75], [60, 0]];
const level = t => { for (let i = 1; i < lv.length; i++) if (t < lv[i][0]) { const [a, x] = lv[i - 1], [b, y] = lv[i]; const s = (t - a) / (b - a); return x + (y - x) * s * s * (3 - 2 * s); } return 0; };
let duck = 0; const att = Math.exp(-1 / (0.03 * SR)), rel = Math.exp(-1 / (0.35 * SR));
const outL = new Float32Array(N), outR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const a = Math.abs(voice[i]); duck = a > duck ? att * duck + (1 - att) * a : rel * duck + (1 - rel) * a;
  const d = 1 - 0.55 * Math.min(1, duck * 9), t = i / SR, m = level(t) * d * 0.55;
  outL[i] = (music[2 * i] || 0) * m + sfxL[i] * 0.9 + voice[i];
  outR[i] = (music[2 * i + 1] || 0) * m + sfxR[i] * 0.9 + voice[i];
}
// write 32-bit float WAV, then loudness-normalise with ffmpeg
const raw = path.join(here, 'out', 'mix_raw.wav');
{ const data = Buffer.alloc(N * 8); for (let i = 0; i < N; i++) { data.writeFloatLE(outL[i], i * 8); data.writeFloatLE(outR[i], i * 8 + 4); }
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40); writeFileSync(raw, Buffer.concat([h, data])); }
const wav = path.join(here, 'out', 'promo3d.wav');
const ff = (a, label) => { const p = spawnSync('ffmpeg', ['-y', '-v', 'error', ...a], { encoding: 'utf8' }); if (p.status) throw new Error(label + ': ' + p.stderr.slice(-600)); };
ff(['-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', String(SR), '-c:a', 'pcm_s16le', wav], 'loudnorm');
console.log(`audio → out/promo3d.wav  (${voiced}/${lines.length} narration lines, ${cues().length} sfx cues)`);
const video = opt('video', path.join(here, 'out', 'promo3d.video.mp4'));
if (existsSync(video)) {
  const out = path.join(here, 'out', 'promo3d.mp4');
  ff(['-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], 'mux');
  console.log('film →', out);
}
