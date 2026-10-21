// Narration for the 3D promo: one cached Fish clip per line (free model), timings written to voice.json
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVoice } from '../../lib/voice.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const envFile = path.join(root, '.env');
if (existsSync(envFile)) for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (!m || process.env[m[1]]) continue;
  process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}
const shots = JSON.parse(readFileSync(path.join(here, 'shotlist.json'), 'utf8'));
const lines = shots.voice.map(v => ({ text: v.text }));
const r = await buildVoice({ lines, voice: shots.voiceId, cacheDir: path.join(here, 'voice'), lang: 'en' });
const out = shots.voice.map((v, i) => ({ ...v, file: r.clips[i]?.file, dur: r.clips[i]?.dur, lead: r.clips[i]?.lead, words: r.clips[i]?.words, silent: !!r.clips[i]?.silent }));
writeFileSync(path.join(here, 'voice.json'), JSON.stringify(out, null, 1));
for (const v of out) console.log(`${v.at.toFixed(2)}s  ${String(v.dur).padEnd(6)} window ${(v.until - v.at).toFixed(1)}s  ${v.text}`);
