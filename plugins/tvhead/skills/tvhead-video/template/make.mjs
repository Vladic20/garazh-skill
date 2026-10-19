#!/usr/bin/env node
// One command: story.json → narrated, rendered, mixed mp4 — one file per language.
//   node make.mjs <ep>                     every language of the story, 1920×1080 (or 1080×1920 for "format": "9:16") → out/<ep>.<lang>.mp4 (+ .srt)
//   node make.mjs <ep> --lang ru           only Russian (en | ru | all)
//   node make.mjs <ep> --preview           fast 1280×720 (720×1280) draft → out/<ep>.<lang>_preview.mp4
//   node make.mjs <ep> --format 9:16       render a 16:9 story vertically (or back) → out/<ep>.<lang>_9x16.mp4, build/<lang>_9x16/
//   node make.mjs <ep> --stills auto       one PNG per scene + contact sheet → episodes/<ep>/build/<lang>/sheet.png (no video)
//   node make.mjs <ep> --stills 1.5,7,12   PNGs at those seconds
//   --offline        never call the TTS API (cached lines play, new lines get estimated timing and no audio)
//   --jobs N         parallel Chrome workers (default: cpu-2, max 6)
//   --json           machine-readable progress lines (@@{...}) for the app
// Keys are read from .env next to this file: OPENROUTER_API_KEY (recommended) or FISH_AUDIO_API_KEY.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';
import path from 'node:path';
import './lib/net.mjs';
import { buildTimeline, toSrt, localize, storyLanguages, resolveFormat, LANGS } from './lib/story.mjs';
import { buildVoice, defaultVoice, defaultModel, provider } from './lib/voice.mjs';
import { voiceStem, bedStem, muxFinal } from './lib/audio.mjs';
import { renderStills, renderVideo } from './lib/frames.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const emit = o => { if (JSON_OUT) console.log('@@' + JSON.stringify(o)); };
const fail = m => { emit({ stage: 'error', message: m }); console.error(`\n✗ ${m}`); process.exit(1); };
const VALUED = ['--stills', '--jobs', '--out', '--lang', '--format'];
const opt = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const flag = n => argv.includes(n);

// .env loader (no dependency, no --env-file needed); real environment wins
const envFile = path.join(root, '.env');
if (existsSync(envFile)) for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (!m || process.env[m[1]]) continue;
  process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}

const ep = argv.find((a, i) => !a.startsWith('--') && !VALUED.includes(argv[i - 1]));
if (!ep || flag('--help')) { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 13).join('\n').replace(/^\/\/ ?/gm, '')); process.exit(ep ? 0 : 1); }
if (!/^[\w-]+$/.test(ep)) fail(`episode name: latin letters, digits, - and _ only (got "${ep}")`);
const epDir = path.join(root, 'episodes', ep), storyFile = path.join(epDir, 'story.json');
if (!existsSync(storyFile)) fail(`no ${path.relative(root, storyFile)} — write the story first (see episodes/demo/story.json)`);
for (const tool of ['ffmpeg', 'ffprobe']) if (spawnSync(tool, ['-version']).error) fail(`${tool} not found in PATH`);

let storyRaw;
try { storyRaw = JSON.parse(readFileSync(storyFile, 'utf8')); } catch (e) { fail(`story.json is not valid JSON: ${e.message}`); }
const all = storyLanguages(storyRaw), want = opt('--lang', 'all');
const langs = want === 'all' ? all : want.split(',').filter(l => LANGS.includes(l));
if (!langs.length) fail(`--lang: one of ${LANGS.join(', ')} or all (story has: ${all.join(', ')})`);
let FMT, NATIVE;
try { NATIVE = resolveFormat(storyRaw.format); FMT = opt('--format') ? resolveFormat(opt('--format')) : NATIVE; } catch (e) { fail(e.message); }
const FSUF = FMT.id === NATIVE.id ? '' : '_' + FMT.id.replace(':', 'x');   // --format override → separate build dir and file names
const PREVIEW = flag('--preview'), STILLS = opt('--stills', null), OFFLINE = flag('--offline') || (!!STILLS && !provider());
const JOBS = +opt('--jobs', Math.max(1, Math.min(6, cpus().length - 2)));
const T0 = Date.now(), el = () => `${((Date.now() - T0) / 1000).toFixed(1)}s`;
const assetBase = path.relative(path.join(root, 'engine'), epDir).split(path.sep).join('/') + '/';
const results = [];

// ─── --cast: model sheet of the story's characters + one frame per environment (for the app's "Cast & world" panel) ──
if (flag('--cast')) {
  const lang = langs[0], story = localize(storyRaw, lang), chars = Object.entries(story.characters || {}).filter(([id]) => id !== '*');
  const sets = [...new Map([story.set, ...story.scenes.map(s => s.set)].filter(Boolean).map(s => typeof s === 'string' ? { type: s } : s).map(s => [JSON.stringify(s), s])).values()];
  const per = FMT.w > FMT.h ? 4 : 2, scenes = [], meta = [];
  for (let i = 0; i < Math.max(chars.length, 0); i += per) {
    const group = chars.slice(i, i + per), sp = 1040 / per;
    scenes.push({ dur: 2, transition: 'cut', theme: story.theme, cam: 'still', particles: .5,
      cast: group.map(([id, c], k) => ({ id, as: id, x: 640 + (k - (group.length - 1) / 2) * sp, face: c.face || 'happy', pose: c.pose || 'idle', enter: 'none', scale: per === 4 ? .85 : 1 })),
      props: group.map(([id, c], k) => ({ type: 'text', text: c.name || id, x: 640 + (k - (group.length - 1) / 2) * sp, y: 120, size: 40, enter: 'none' })) });
    group.forEach(([id, c]) => meta.push({ kind: 'character', id, name: c.name || id, desc: c.desc || '', scene: scenes.length - 1 }));
  }
  for (const s of sets) { scenes.push({ dur: 2, transition: 'cut', cam: 'still', set: s, particles: .5 }); meta.push({ kind: 'set', id: s.type, name: s.type, desc: Object.entries(s).filter(([k]) => k !== 'type').map(([k, v]) => `${k}: ${v}`).join(', '), scene: scenes.length - 1 }); }
  if (!scenes.length) fail('--cast: the story has no "characters" and no "set" to show');
  const TL = buildTimeline({ ...story, scenes, characters: story.characters, outro: 0 }, scenes.map(() => null), { lang, assetBase, format: FMT.id });
  const buildDir = path.join(epDir, 'build', 'cast' + FSUF); rmSync(buildDir, { recursive: true, force: true }); mkdirSync(buildDir, { recursive: true });
  writeFileSync(path.join(buildDir, 'timeline.js'), `window.TL = ${JSON.stringify(TL)};\n`);
  const tlRel = path.relative(path.join(root, 'engine'), path.join(buildDir, 'timeline.js')).split(path.sep).join('/');
  try {
    const times = TL.scenes.map(s => +(s.from + 1.2).toFixed(2));
    const files = await renderStills({ root, tlRel, times, outDir: path.join(buildDir, 'stills'), dsf: 1, world: TL.world });
    const cols = Math.min(FMT.w > FMT.h ? 3 : 4, files.length), rows = Math.ceil(files.length / cols);
    spawnSync('ffmpeg', ['-y', '-v', 'error', '-framerate', '1', '-i', path.join(buildDir, 'stills', 's_%03d.png'), '-vf', `scale=${FMT.w > FMT.h ? 480 : 270}:-1,tile=${cols}x${rows}:padding=6:color=0x222222`, '-frames:v', '1', path.join(buildDir, 'sheet.png')]);
    const rel = f => path.relative(root, f).split(path.sep).join('/');
    writeFileSync(path.join(buildDir, 'cast.json'), JSON.stringify({ sheet: rel(path.join(buildDir, 'sheet.png')), frames: files.map(rel), items: meta }, null, 2));
    console.log(`✓ cast sheet → ${rel(path.join(buildDir, 'sheet.png'))} (${chars.length} characters, ${sets.length} sets)`);
    emit({ stage: 'cast', sheet: rel(path.join(buildDir, 'sheet.png')), items: meta, frames: files.map(rel) });
  } catch (e) { fail(e.message); }
  process.exit(0);
}

for (const lang of (STILLS ? langs.slice(0, 1) : langs)) {
  const story = localize(storyRaw, lang);
  const buildDir = path.join(epDir, 'build', lang + FSUF); mkdirSync(buildDir, { recursive: true });

  // 1) narration
  const voice = (typeof storyRaw.voice === 'object' ? storyRaw.voice?.[lang] : (lang === 'en' || all.length === 1 ? storyRaw.voice : null)) || defaultVoice(lang);
  const model = story.model || defaultModel();
  const style = story.style ? `[${String(story.style).replace(/^\[|\]$/g, '')}] ` : '';
  const lines = story.scenes.map(s => ({ text: s.say ? (s.say.trim().startsWith('[') || !style ? s.say.trim() : style + s.say.trim()) : '' }));
  console.log(`▸ ${ep} [${lang}] ${FMT.id}: ${story.scenes.length} scenes · voice ${voice} · ${model} · ${OFFLINE ? 'offline' : provider() || 'no TTS key'}`);
  emit({ stage: 'voice', lang });
  let V;
  try { V = await buildVoice({ lines, voice, model, cacheDir: path.join(epDir, 'voice'), offline: OFFLINE, lang }); }
  catch (e) { fail(`voice: ${e.message}`); }

  // 2) timeline
  const TL = buildTimeline(story, V.clips, { lang, assetBase, format: FMT.id });
  writeFileSync(path.join(buildDir, 'timeline.js'), `// generated by make.mjs from story.json — do not edit\nwindow.TL = ${JSON.stringify(TL)};\n`);
  const tlRel = path.relative(path.join(root, 'engine'), path.join(buildDir, 'timeline.js')).split(path.sep).join('/');
  console.log(`▸ timeline [${lang}]: ${TL.duration.toFixed(1)}s, ${TL.scenes.length} scenes (${el()})`);
  emit({ stage: 'timeline', lang, format: TL.format, duration: TL.duration, scenes: TL.scenes.map(s => [s.from, s.to]) });

  // 3a) stills + contact sheet
  if (STILLS) {
    const times = STILLS === 'auto' ? TL.scenes.map(s => +(s.from + Math.min(s.to - s.from - .05, Math.max(1.1, (s.to - s.from) * .72))).toFixed(2)) : STILLS.split(',').map(Number);
    if (times.some(t => !Number.isFinite(t) || t < 0)) fail(`--stills: seconds separated by commas, or "auto"`);
    const dir = path.join(buildDir, 'stills'); rmSync(dir, { recursive: true, force: true });
    try {
      const files = await renderStills({ root, tlRel, times, outDir: dir, dsf: 1, world: TL.world });
      const port = TL.world.h > TL.world.w, cols = Math.min(port ? 6 : 4, files.length), rows = Math.ceil(files.length / cols);
      spawnSync('ffmpeg', ['-y', '-v', 'error', '-framerate', '1', '-i', path.join(dir, 's_%03d.png'), '-vf', `scale=${port ? 240 : 480}:-1,tile=${cols}x${rows}:padding=6:color=0x222222`, '-frames:v', '1', path.join(buildDir, 'sheet.png')]);
      files.forEach((f, i) => console.log(`  still ${times[i].toFixed(2)}s → ${path.relative(root, f)}`));
      console.log(`✓ contact sheet → ${path.relative(root, path.join(buildDir, 'sheet.png'))} (${el()})`);
      emit({ stage: 'stills', lang, sheet: path.relative(root, path.join(buildDir, 'sheet.png')), stills: files.map(f => path.relative(root, f)), times });
    } catch (e) { fail(e.message); }
    continue;
  }

  // 3b) video
  const outDir = path.join(root, 'out'); mkdirSync(outDir, { recursive: true });
  const out = path.resolve(langs.length === 1 && opt('--out') ? opt('--out') : path.join(outDir, `${ep}.${lang}${FSUF}${PREVIEW ? '_preview' : ''}.mp4`));
  const silent = path.join(buildDir, 'video.mp4');
  try {
    const r = await renderVideo({ root, tlRel, duration: TL.duration, out: silent, world: TL.world, dsf: PREVIEW ? 1 : 1.5, jobs: JOBS, preset: PREVIEW ? 'veryfast' : 'medium', crf: PREVIEW ? 28 : 26,
      onProgress: (d, n, s) => { if (JSON_OUT) emit({ stage: 'frames', lang, done: d, total: n }); else process.stdout.write(`\r▸ frames ${d}/${n}  ${(d / s).toFixed(1)} fps  `); } });
    console.log(`\r▸ frames [${lang}] ${r.frames}/${r.frames} → ${r.size.join('×')} in ${r.seconds.toFixed(1)}s            `);
  } catch (e) { fail(`render: ${e.message}`); }

  // 4) sound
  emit({ stage: 'audio', lang });
  const voiceWav = path.join(buildDir, 'voice.wav'), bedWav = path.join(buildDir, 'bed.wav');
  try {
    const hasVoice = voiceStem(TL.voice, TL.duration, voiceWav);
    const cuts = story.flips === false ? [] : TL.scenes.slice(1).filter(s => s.transition.type !== 'none').map(s => ({ t: Math.max(0, s.from - (s.transition.dOut || 0) * .6), type: s.transition.type }));
    bedStem({ duration: TL.duration, mood: story.mood ?? 'dark', cuts, music: story.music, root: epDir }, bedWav);
    muxFinal({ video: silent, voiceWav, bedWav, out, hasVoice });
  } catch (e) { fail(`audio: ${e.message}`); }
  writeFileSync(out.replace(/\.mp4$/, '.srt'), toSrt(TL.subs));

  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', out], { encoding: 'utf8' });
  const info = JSON.parse(probe.stdout || '{}'), vs = (info.streams || []).find(s => s.codec_type === 'video');
  const res = { lang, format: TL.format, file: path.relative(root, out).split(path.sep).join('/'), width: vs?.width, height: vs?.height, duration: +(+info.format?.duration || 0).toFixed(2),
    mb: +(statSync(out).size / 1048576).toFixed(1), silentLines: V.estimated, newLines: V.generated, voice };
  results.push(res);
  console.log(`✓ ${out}\n  ${res.width}×${res.height} · ${res.duration}s · ${res.mb} MB · ` +
    `${V.estimated ? `⚠ ${V.estimated} line(s) silent (no TTS key)` : `voice: ${V.generated} new line(s), rest from cache`} · ${el()}`);
  emit({ stage: 'done', lang, ...res });
}
if (!STILLS) emit({ stage: 'finished', results });
