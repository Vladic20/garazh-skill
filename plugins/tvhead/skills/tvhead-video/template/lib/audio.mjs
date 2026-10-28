// Sound: narration stem + procedural bed (projector hiss, mood drone, paper flips on cuts) + music (generated preset or a file), ducked under the voice.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { renderMusic, MUSIC_PRESETS } from './music.mjs';

const SR = 48000;
function ff(args, label) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', '-v', 'error', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ffmpeg (${label}) failed:\n${r.stderr.slice(-1500)}`);
}

// narration: every clip at its start time, loudness-normalised to −16 LUFS, padded to the film length
export function voiceStem(voice, duration, out) {
  const real = voice.filter(v => v.file && existsSync(v.file));
  const total = Math.round(duration * SR);
  if (!real.length) { ff(['-f', 'lavfi', '-i', `anullsrc=r=${SR}:cl=stereo`, '-t', String(duration), '-c:a', 'pcm_s16le', out], 'silent voice'); return false; }
  const chains = real.map((v, i) => `[${i}:a]aresample=${SR},pan=stereo|c0=c0|c1=c0,adelay=${Math.max(0, Math.round(v.start * 1000))}:all=1[v${i}]`);
  const mix = `${real.map((_, i) => `[v${i}]`).join('')}amix=inputs=${real.length}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=${SR},apad=whole_len=${total},atrim=end_sample=${total}[out]`;
  ff([...real.flatMap(v => ['-i', v.file]), '-filter_complex', [...chains, mix].join(';'), '-map', '[out]', '-ar', SR, '-ac', 2, '-c:a', 'pcm_s16le', out], 'voice stem');
  return true;
}

// mood → drone chord (Hz) and colour
const MOODS = {
  dark:  { f: [55, 82.4, 110.3, 164.6], lp: 520, vol: .9, trem: .08 },
  calm:  { f: [130.8, 196, 261.6, 329.6], lp: 1400, vol: .55, trem: .12 },
  tense: { f: [58.3, 61.7, 116.5, 174.6], lp: 700, vol: .8, trem: .35 },
  hope:  { f: [146.8, 220, 293.7, 370], lp: 1800, vol: .5, trem: .1 },
};

// bed: hiss + drone + paper flips at cut times; music (optional) looped under everything
// music: "lofi" | "ambient" | "upbeat" | { preset, bpm, volume } → generated (lib/music.mjs); any other string = audio file in the episode folder.
// quiet: [[a, b]] windows where the drums drop out; hits: times of big transitions (swell + kick)
export function bedStem({ duration, mood = 'dark', cuts = [], music = null, root, quiet = [], hits = [], seed = 7, sfx = 'paper', events = [] }, out) {
  const d = duration.toFixed(3), inputs = [], parts = [];
  const spec = typeof music === 'string' && MUSIC_PRESETS[music] ? { preset: music } : music && typeof music === 'object' ? music : null;
  let musicFile = spec ? null : music, musicVol = .35;
  if (spec) {
    const r = renderMusic({ ...spec, duration, quiet, hits, seed }, path.join(path.dirname(out), 'music.wav'));
    musicFile = r.file; musicVol = spec.volume ?? r.volume;
    mood = null;   // the drone would clash with the chords
  }
  // projector hiss
  inputs.push('-f', 'lavfi', '-t', d, '-i', `anoisesrc=r=${SR}:color=pink:amplitude=0.5:seed=7`);
  parts.push(`[0:a]highpass=f=300,lowpass=f=5200,volume=0.012,pan=stereo|c0=c0|c1=c0[hiss]`);
  let tags = ['[hiss]'];
  const M = mood && MOODS[mood];
  if (M) {
    const expr = M.f.map((f, i) => `${(1 / M.f.length).toFixed(3)}*sin(2*PI*${f}*t+${i})*(1+${M.trem}*sin(2*PI*${(0.07 + i * 0.03).toFixed(2)}*t))`).join('+');
    inputs.push('-f', 'lavfi', '-t', d, '-i', `aevalsrc='${expr}':s=${SR}`);
    parts.push(`[1:a]lowpass=f=${M.lp},volume=${(0.06 * M.vol).toFixed(4)},afade=t=in:d=2.5,afade=t=out:st=${Math.max(0, duration - 2.5).toFixed(2)}:d=2.5,pan=stereo|c0=c0|c1=c0[drone]`);
    tags.push('[drone]');
  }
  // transition sounds: paper flip (cut/page/wipe), soft whoosh (curve/zoom/pull/whip), low thump (iris). cuts = [{ t, type }] or [seconds]
  const SFX = {
    flip:  { src: 'white', dur: .22, chain: 'bandpass=f=2400:t=h:w=1800,afade=t=in:d=0.015,afade=t=out:st=0.03:d=0.18,volume=0.16' },
    whoosh:{ src: 'pink', dur: .42, chain: 'bandpass=f=900:t=h:w=1400,afade=t=in:d=0.25:curve=exp,afade=t=out:st=0.25:d=0.17,volume=0.13' },
    thump: { src: 'brown', dur: .3, chain: 'lowpass=f=180,afade=t=in:d=0.01,afade=t=out:st=0.02:d=0.26,volume=0.5' },
  };
  // sfx 'soft' (cartoon style): no paper flips, every seam is a soft whoosh
  const kindOf = type => type === 'iris' ? 'thump' : type === 'fade' ? null : sfx === 'soft' || ['curve', 'zoom', 'pull', 'whip'].includes(type) ? 'whoosh' : 'flip';
  const groups = {};
  for (const c of cuts) { const o = typeof c === 'number' ? { t: c, type: 'cut' } : c, k = kindOf(o.type); if (k) (groups[k] ||= []).push(o.t); }
  for (const [k, ts] of Object.entries(groups)) {
    const n = inputs.filter(x => x === '-i').length, S = SFX[k];
    inputs.push('-f', 'lavfi', '-t', String(S.dur), '-i', `anoisesrc=r=${SR}:color=${S.src}:amplitude=0.6:seed=3`);
    parts.push(`[${n}:a]${S.chain},pan=stereo|c0=c0|c1=c0,asplit=${ts.length}${ts.map((_, i) => `[${k}${i}]`).join('')}`, ...ts.map((t, i) => `[${k}${i}]adelay=${Math.round(t * 1000)}:all=1[${k}d${i}]`));
    tags.push(...ts.map((_, i) => `[${k}d${i}]`));
  }
  // page sound events (window.sfxEvents): [{ t, dur, kind, gain }]. kinds: marker (felt-tip squeak for dur), stamp (thud + slap),
  // pop (short pitched blip), tick (dry click). One source per kind, split and trimmed per event.
  const EV = {
    marker: { src: `anoisesrc=r=${SR}:color=white:amplitude=0.7:seed=11`, chain: d => `bandpass=f=3400:t=h:w=3800,tremolo=f=11:d=0.75,highpass=f=900,afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, d - .06).toFixed(3)}:d=0.06`, vol: .11 },
    stamp:  { src: `anoisesrc=r=${SR}:color=brown:amplitude=0.9:seed=5`, chain: () => 'lowpass=f=260,afade=t=in:d=0.004,afade=t=out:st=0.01:d=0.22', vol: .9, len: .26 },
    pop:    { src: `aevalsrc='sin(2*PI*(520+1400*exp(-40*t))*t)*exp(-26*t)':s=${SR}`, chain: () => 'afade=t=out:st=0.08:d=0.06', vol: .22, len: .15 },
    tick:   { src: `anoisesrc=r=${SR}:color=white:amplitude=0.8:seed=9`, chain: () => 'highpass=f=2500,afade=t=in:d=0.001,afade=t=out:st=0.004:d=0.03', vol: .18, len: .04 },
  };
  const evGroups = {};
  for (const e of events || []) if (EV[e.kind] && e.t >= 0 && e.t < duration) (evGroups[e.kind] ||= []).push(e);
  for (const [k, list] of Object.entries(evGroups)) {
    const E = EV[k], maxD = Math.max(...list.map(e => E.len ?? Math.max(.05, e.dur || .3))) + .05, n = inputs.filter(x => x === '-i').length;
    inputs.push('-f', 'lavfi', '-t', maxD.toFixed(3), '-i', E.src);
    parts.push(`[${n}:a]aresample=${SR},asplit=${list.length}${list.map((_, i) => `[e${k}${i}]`).join('')}`);
    list.forEach((e, i) => { const dd = E.len ?? Math.max(.05, e.dur || .3);
      parts.push(`[e${k}${i}]atrim=0:${dd.toFixed(3)},${E.chain(dd)},volume=${(E.vol * (e.gain ?? 1)).toFixed(3)},pan=stereo|c0=c0|c1=c0,adelay=${Math.round(e.t * 1000)}:all=1[e${k}d${i}]`); });
    tags.push(...list.map((_, i) => `[e${k}d${i}]`));
  }
  if (musicFile) {
    const mp = path.isAbsolute(musicFile) ? musicFile : path.join(root, musicFile);
    if (!existsSync(mp)) throw new Error(`music file not found: ${mp} (or use a preset: ${Object.keys(MUSIC_PRESETS).join(', ')})`);
    const n = inputs.filter(x => x === '-i').length;
    inputs.push(...(spec ? [] : ['-stream_loop', '-1']), '-i', mp);
    parts.push(`[${n}:a]aresample=${SR},atrim=0:${d},volume=${musicVol},afade=t=in:d=${spec ? .05 : 1.5},afade=t=out:st=${Math.max(0, duration - 3).toFixed(2)}:d=3[mus]`);
    tags.push('[mus]');
  }
  parts.push(`${tags.join('')}amix=inputs=${tags.length}:normalize=0:dropout_transition=0,apad=whole_dur=${d},atrim=0:${d}[out]`);
  ff([...inputs, '-filter_complex', parts.join(';'), '-map', '[out]', '-ar', SR, '-ac', 2, '-c:a', 'pcm_s16le', out], 'bed');
}

// final: bed ducked by the voice (sidechain), + voice, limiter → AAC muxed with the video
export function muxFinal({ video, voiceWav, bedWav, out, hasVoice }) {
  const fc = hasVoice
    ? `[2:a]asplit=2[vk][vm];[1:a][vk]sidechaincompress=threshold=0.03:ratio=5:attack=30:release=650[bd];[bd][vm]amix=inputs=2:normalize=0,alimiter=limit=0.89:level=disabled[a]`
    : `[1:a]alimiter=limit=0.89:level=disabled[a]`;
  ff(['-i', video, '-i', bedWav, ...(hasVoice ? ['-i', voiceWav] : []), '-filter_complex', fc, '-map', '0:v:0', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], 'mux');
}
