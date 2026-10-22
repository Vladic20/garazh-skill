// Sound for promo15: `hype` music (150 BPM, drums enter on the drop at beat 4, drop out for the end card) + SFX on the
// timeline cues → out/promo15.wav and, with the picture, out/promo15.mp4. No narration: X autoplays muted, the type carries it.
import path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderMusic } from '../../lib/music.mjs';
import { createMix } from '../../lib/sfx.mjs';
import { DUR, b, cues } from './timeline.js';

const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, 'out');
mkdirSync(out, { recursive: true });
const musicFile = path.join(out, 'music.wav');
renderMusic({ preset: 'hype', duration: DUR, seed: 15, hits: [b(4), b(15), b(32)] }, musicFile);
const mix = createMix(DUR);
mix.cues(cues());
mix.music(musicFile, [[0, 0.55], [b(4) - 0.05, 0.6], [b(4), 1], [b(28), 0.9], [b(32) - 0.05, 1.05], [DUR - 0.6, 0.9], [DUR, 0]]);
const video = path.join(out, 'promo15.video.mp4');
const r = mix.write(path.join(out, 'promo15.wav'), existsSync(video) ? { video, mp4: path.join(out, 'promo15.mp4') } : {});
console.log(`audio → ${r.wav}${r.mp4 ? `\nfilm → ${r.mp4}` : ''}`);
