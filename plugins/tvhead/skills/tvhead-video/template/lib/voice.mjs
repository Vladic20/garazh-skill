// Narration: Fish Audio TTS through OpenRouter (or directly at fish.audio), cached per line, with word timings.
//   OPENROUTER_API_KEY  → POST https://openrouter.ai/api/v1/audio/speech  { model: fish-audio/drama-3, voice: <fish model id> }
//                          word timings: POST /audio/transcriptions (fish-audio/transcribe-1, verbose_json + word timestamps)
//   FISH_AUDIO_API_KEY  → POST https://api.fish.audio/v1/tts { reference_id: <voice id> } (no transcription → estimated timings)
//   no key              → estimated durations, silent narration (stills and previews still work)
// Cache: episodes/<ep>/voice/<sha1(model|voice|text)>.mp3 + .json  — editing one line regenerates only that line.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { spokenWords, normWord, syllables, estimateClip } from './story.mjs';

export const DEFAULT_VOICE = 'bf322df2096a46f18c579d0baa36f41d';   // "Adrian" — deep, slow, measured storyteller (fish.audio/m/<id>)
export const DEFAULT_MODEL = 'fish-audio/drama-3';
const STT_MODELS = ['fish-audio/transcribe-1', 'openai/whisper-1'];
const META_V = 2;
const r3 = x => Math.round(x * 1000) / 1000;

export function provider() {
  const forced = process.env.VOICE_PROVIDER;
  if (forced) return forced;
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.FISH_AUDIO_API_KEY) return 'fish';
  return null;
}

async function withRetry(label, fn) {
  let last;
  for (let a = 0; a < 4; a++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (!/HTTP (408|409|425|429|5\d\d)|fetch failed|timeout|ECONNRESET/i.test(e.message)) throw e;
      const wait = 1500 * 2 ** a; console.warn(`voice: ${label}: ${e.message.slice(0, 120)} — retry in ${wait / 1000}s`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw last;
}

async function tts(text, voice, model) {
  const p = provider();
  if (p === 'fish') {
    const res = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST', signal: AbortSignal.timeout(180000),
      headers: { Authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}`, 'Content-Type': 'application/json', model: model.replace(/^fish-audio\//, '').replace(/:free$/, '') },
      body: JSON.stringify({ text, reference_id: voice, format: 'mp3', normalize: true }),
    });
    if (!res.ok) throw new Error(`fish tts HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST', signal: AbortSignal.timeout(180000),
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'tvhead-video' },
    body: JSON.stringify({ model, input: text, voice, response_format: 'mp3' }),
  });
  if (!res.ok) throw new Error(`openrouter tts HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function transcribe(mp3) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  const data = readFileSync(mp3).toString('base64');
  for (const model of STT_MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
        method: 'POST', signal: AbortSignal.timeout(90000),
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input_audio: { data, format: 'mp3' }, language: 'en', response_format: 'verbose_json', timestamp_granularities: ['word'] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const j = await res.json();
      const words = (j.words || []).map(w => [String(w.word).trim(), +w.start, +w.end]).filter(w => w[0] && Number.isFinite(w[1]));
      if (words.length) return { model, text: j.text, words };
      if (j.segments?.length) return { model, text: j.text, segments: j.segments.map(s => [s.text, +s.start, +s.end]) };
      throw new Error('no word timestamps in response');
    } catch (e) { console.warn(`voice: transcription with ${model} failed (${e.message.slice(0, 140)})`); }
  }
  return null;
}

function ff(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr.slice(-800)}`);
  return r.stderr;
}
// duration + speech windows (non-silence ≥ 80 ms above −38 dB)
function analyse(file) {
  const dur = +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout;
  if (!(dur > 0)) throw new Error(`ffprobe: no duration for ${file}`);
  const log = ff(['-i', file, '-af', 'silencedetect=n=-38dB:d=0.08', '-f', 'null', '-']);
  const sil = []; let open = null;
  for (const m of log.matchAll(/silence_(start|end): (-?[\d.]+)/g)) { if (m[1] === 'start') open = +m[2]; else if (open != null) { sil.push([Math.max(0, open), +m[2]]); open = null; } }
  if (open != null) sil.push([open, dur]);
  const speech = []; let cur = 0;
  for (const [a, b] of sil) { if (a - cur > .03) speech.push([cur, a]); cur = b; }
  if (dur - cur > .03) speech.push([cur, dur]);
  if (!speech.length) speech.push([0, dur]);
  return { fileDur: r3(dur), speech: speech.map(([a, b]) => [r3(a), r3(b)]) };
}

// spread script words over the speech windows by syllables (fallback when no transcription)
function spreadWords(words, speech) {
  const runs = speech.map(([a, b]) => [a, b - a]), total = runs.reduce((s, r) => s + r[1], 0);
  const syl = words.map(syllables), st = syl.reduce((a, b) => a + b, 0);
  const at = s => { for (const [a, len] of runs) { if (s <= len + 1e-9) return a + s; s -= len; } return speech[speech.length - 1][1]; };
  let acc = 0; return words.map((w, i) => { const t = at(total * acc / st); acc += syl[i]; return [w, r3(t)]; });
}
// align script words to transcribed words (LCS on normalised words); unmatched words interpolate between matched neighbours
function alignWords(words, stt, speech) {
  const base = spreadWords(words, speech);
  if (!stt?.words?.length) return base;
  const A = words.map(normWord), B = stt.words.map(w => normWord(w[0])), n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] && A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const t = new Array(n).fill(null); let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] && A[i] === B[j]) { t[i] = stt.words[j][1]; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  if (t.filter(x => x != null).length < Math.max(1, n * .4)) return base;   // transcription too different — trust silence analysis
  for (let k = 0; k < n; k++) if (t[k] == null) {
    let a = k - 1; while (a >= 0 && t[a] == null) a--;
    let b = k + 1; while (b < n && t[b] == null) b++;
    const ta = a >= 0 ? t[a] : speech[0][0], tb = b < n ? t[b] : speech[speech.length - 1][1];
    t[k] = ta + (tb - ta) * (k - a) / (b - a);
  }
  for (let k = 1; k < n; k++) if (t[k] < t[k - 1]) t[k] = t[k - 1];
  return words.map((w, k) => [w, r3(t[k])]);
}

// lines: [{ text }] (text may contain [direction] tags). Returns clips aligned with lines.
export async function buildVoice({ lines, voice = DEFAULT_VOICE, model = DEFAULT_MODEL, cacheDir, offline = false, jobs = 4 }) {
  mkdirSync(cacheDir, { recursive: true });
  const prov = offline ? null : provider();
  const clips = new Array(lines.length);
  let generated = 0, estimated = 0, k = 0;
  async function one(i) {
    const text = lines[i].text;
    if (!text || !spokenWords(text).length) { clips[i] = null; return; }
    const id = createHash('sha1').update(`${model}\n${voice}\n${text}`).digest('hex').slice(0, 14);
    const mp3 = path.join(cacheDir, `${id}.mp3`), json = path.join(cacheDir, `${id}.json`);
    if (!existsSync(mp3)) {
      if (!prov) { clips[i] = { ...estimateClip(text), silent: true }; estimated++; return; }
      const buf = await withRetry(`line ${i + 1}`, () => tts(text, voice, model));
      if (buf.length < 800) throw new Error(`line ${i + 1}: TTS answer too short (${buf.length} bytes)`);
      writeFileSync(mp3 + '.part', buf); renameSync(mp3 + '.part', mp3);
      generated++; console.log(`voice: line ${i + 1}/${lines.length} ✓ ${(buf.length / 1024).toFixed(0)} KB`);
    }
    let meta = existsSync(json) ? JSON.parse(readFileSync(json, 'utf8')) : null;
    if (!meta || meta.v !== META_V || (meta.stt == null && !meta.sttTried && process.env.OPENROUTER_API_KEY && !offline)) {
      const a = analyse(mp3);
      const stt = offline ? null : await transcribe(mp3);
      meta = { v: META_V, text, voice, model, ...a, stt, sttTried: !offline && !!process.env.OPENROUTER_API_KEY };
      writeFileSync(json, JSON.stringify(meta, null, 1));
    }
    const lead = meta.speech[0][0], end = meta.speech[meta.speech.length - 1][1];
    const rel = meta.speech.map(([a, b]) => [r3(a - lead), r3(b - lead)]);
    const words = alignWords(spokenWords(text), meta.stt, meta.speech).map(([w, t]) => [w, r3(Math.max(0, t - lead))]);
    clips[i] = { file: mp3, dur: r3(end - lead), lead: r3(lead), fileDur: meta.fileDur, speech: rel, words, aligned: !!meta.stt?.words };
  }
  await Promise.all(Array.from({ length: Math.min(jobs, lines.length) }, async () => { while (k < lines.length) await one(k++); }));
  if (estimated) console.warn(`voice: ${estimated} line(s) WITHOUT audio — ${offline ? 'offline mode' : 'no API key'}; timings are estimated. Put OPENROUTER_API_KEY into .env to voice them.`);
  return { clips, generated, estimated, provider: prov };
}
