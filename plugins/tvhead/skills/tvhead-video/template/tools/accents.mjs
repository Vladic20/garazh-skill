// Accent map of a real audio track: where the hits actually are (not where the BPM grid says), and the nearest frames.
//   node tools/accents.mjs out/mix.wav [--fps 60] [--top 24] [--lowpass 180]
// Onset strength = rise of log energy in short windows, peaks above a local adaptive threshold, ≥ 120 ms apart.
// The list is candidates: confirm the perceived peak by ear before cutting on it.
import { spawnSync } from 'node:child_process';

const a = process.argv.slice(2), file = a.find(x => !x.startsWith('--') && !/^\d/.test(x));
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? +a[i + 1] : d; };
if (!file) { console.error('usage: node tools/accents.mjs <audio|video> [--fps 60] [--top 24] [--lowpass 180]'); process.exit(2); }
const fps = opt('fps', 60), top = opt('top', 24), lowpass = opt('lowpass', 0), SR = 22050;
const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, ...(lowpass ? ['-af', `lowpass=f=${lowpass}`] : []), '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 29 });
if (r.status) { console.error(String(r.stderr)); process.exit(2); }
const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
const hop = 128, win = 512, n = Math.floor((x.length - win) / hop);
const e = new Float32Array(n);
for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < win; k++) { const v = x[i * hop + k]; s += v * v; } e[i] = Math.log10(1e-9 + s / win); }
const flux = new Float32Array(n); for (let i = 1; i < n; i++) flux[i] = Math.max(0, e[i] - e[i - 1]) + Math.max(0, e[i] - (e[i - 3] ?? e[i]));
const half = Math.round(0.4 * SR / hop), gap = Math.round(0.12 * SR / hop), peaks = [];
const sorted = [...flux].sort((p, q) => p - q), ref = sorted[Math.floor(sorted.length * 0.97)] || 1;
for (let i = 2; i < n - 2; i++) {
  if (flux[i] < flux[i - 1] || flux[i] < flux[i + 1] || flux[i] < 0.18 * ref) continue;
  let m = 0; for (let k = Math.max(0, i - half); k < Math.min(n, i + half); k++) m += flux[k]; m /= Math.min(n, i + half) - Math.max(0, i - half);
  if (flux[i] < m * 1.8) continue;
  const t = (i * hop + win / 2) / SR;
  if (peaks.length && i - peaks[peaks.length - 1].i < gap) { if (flux[i] > peaks[peaks.length - 1].s) peaks[peaks.length - 1] = { i, t, s: flux[i] }; continue; }
  peaks.push({ i, t, s: flux[i] });
}
const best = [...peaks].sort((p, q) => q.s - p.s).slice(0, top).sort((p, q) => p.t - q.t), max = best.reduce((m, p) => Math.max(m, p.s), 0);
console.log(`accents in ${file}  (${peaks.length} candidates, strongest ${best.length}; frame = round(t·${fps}))`);
for (const p of best) console.log(`${p.t.toFixed(3).padStart(8)} s   frame ${String(Math.round(p.t * fps)).padStart(5)}   ${'█'.repeat(Math.max(1, Math.round(20 * p.s / max)))}`);
const gaps = best.slice(1).map((p, i) => p.t - best[i].t).filter(g => g > 0.15);
if (gaps.length > 3) { const med = gaps.sort((p, q) => p - q)[Math.floor(gaps.length / 2)]; console.log(`median gap ${med.toFixed(3)} s ≈ ${(60 / med).toFixed(1)} BPM (or a multiple)`); }
console.log('Candidates only: the first ~50 ms of the track is blind; confirm perceived peaks by ear.');
