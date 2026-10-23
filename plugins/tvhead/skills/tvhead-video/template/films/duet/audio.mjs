// Sound for "Claude Duet": a calm ambient bed for the lone start and the finale, a 120 BPM synthwave drive for the parallel
// work, the conflict and the assembly (drums enter on the stomp; one bar and a half of silence on the tear), and every
// hop, grab, toss, insert, tear, check and squeeze from timeline.js cues → out/duet.wav and, with the picture, out/duet.mp4.
import path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderMusic } from '../../lib/music.mjs';
import { createMix, decode } from '../../lib/sfx.mjs';
import { DUR, T, SEC, cues } from './timeline.js';

const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, 'out');
mkdirSync(out, { recursive: true });
const amb = path.join(out, 'music_ambient.wav'), drive = path.join(out, 'music_drive.wav'), bed = path.join(out, 'music.wav');
renderMusic({ preset: 'ambient', bpm: 120, duration: DUR, seed: 11 }, amb);
renderMusic({ preset: 'synthwave', bpm: 120, duration: DUR, seed: 12, quiet: [[0, T.cut - 0.05], [T.tear, T.tear + 1.5], [SEC.finale + 2, DUR]], hits: [T.cut, SEC.assembly] }, drive);
// arrange the two stems into one bed with level curves
const A = decode(amb, 2), D = decode(drive, 2), N = Math.min(A.length, D.length) / 2, SR = 48000;
const curve = keys => t => { for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const [a, x] = keys[i - 1], [b, y] = keys[i]; const s = (t - a) / (b - a); return x + (y - x) * s * s * (3 - 2 * s); } return keys[keys.length - 1][1]; };
const la = curve([[0, 0], [1.5, 0.9], [T.cut - 0.3, 0.9], [T.cut, 0.18], [SEC.conflict, 0.2], [T.tear - 0.2, 0.35], [T.tear + 1.6, 0.25], [SEC.assembly, 0.3], [SEC.finale - 1, 0.35], [SEC.finale + 2, 1], [DUR - 2.5, 1], [DUR, 0]]);
const ld = curve([[0, 0], [T.cut - 0.05, 0], [T.cut, 1], [SEC.conflict, 1], [T.tug, 0.8], [T.tear - 0.02, 0.9], [T.tear, 0], [T.tear + 1.5, 0], [T.tear + 1.55, 0.85], [SEC.assembly, 0.9], [SEC.finale - 0.5, 1], [SEC.finale + 2.5, 0], [DUR, 0]]);
{ const { writeFileSync } = await import('node:fs'); const data = Buffer.alloc(N * 8);
  for (let i = 0; i < N; i++) { const t = i / SR, a = la(t) * 0.9, d = ld(t); data.writeFloatLE(A[2 * i] * a + D[2 * i] * d, i * 8); data.writeFloatLE(A[2 * i + 1] * a + D[2 * i + 1] * d, i * 8 + 4); }
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40); writeFileSync(bed, Buffer.concat([h, data])); }
const mix = createMix(DUR);
mix.cues(cues());
mix.music(bed, [[0, 1], [DUR, 1]], 0);
const video = path.join(out, 'duet.video.mp4');
const r = mix.write(path.join(out, 'duet.wav'), { ...(existsSync(video) ? { video, mp4: path.join(out, 'duet.mp4') } : {}), musicGain: 0.8, sfxGain: 0.75 });
console.log(`audio → ${r.wav}${r.mp4 ? `\nfilm → ${r.mp4}` : ''}`);
