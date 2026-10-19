// Sound: narration stem + procedural bed (projector hiss, mood drone, paper flips on cuts) + optional music, ducked under the voice.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

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
export function bedStem({ duration, mood = 'dark', cuts = [], music = null, root }, out) {
  const d = duration.toFixed(3), inputs = [], parts = [];
  // projector hiss
  inputs.push('-f', 'lavfi', '-t', d, '-i', `anoisesrc=r=${SR}:color=pink:amplitude=0.5:seed=7`);
  parts.push(`[0:a]highpass=f=300,lowpass=f=5200,volume=0.012,pan=stereo|c0=c0|c1=c0[hiss]`);
  let tags = ['[hiss]'];
  const M = MOODS[mood];
  if (M) {
    const expr = M.f.map((f, i) => `${(1 / M.f.length).toFixed(3)}*sin(2*PI*${f}*t+${i})*(1+${M.trem}*sin(2*PI*${(0.07 + i * 0.03).toFixed(2)}*t))`).join('+');
    inputs.push('-f', 'lavfi', '-t', d, '-i', `aevalsrc='${expr}':s=${SR}`);
    parts.push(`[1:a]lowpass=f=${M.lp},volume=${(0.06 * M.vol).toFixed(4)},afade=t=in:d=2.5,afade=t=out:st=${Math.max(0, duration - 2.5).toFixed(2)}:d=2.5,pan=stereo|c0=c0|c1=c0[drone]`);
    tags.push('[drone]');
  }
  // paper flip on every cut: short band-passed noise burst
  if (cuts.length) {
    const n = inputs.filter(x => x === '-i').length;
    inputs.push('-f', 'lavfi', '-t', '0.22', '-i', `anoisesrc=r=${SR}:color=white:amplitude=0.6:seed=3`);
    const fl = `[${n}:a]bandpass=f=2400:w=1800,afade=t=in:d=0.015,afade=t=out:st=0.03:d=0.18,volume=0.16,pan=stereo|c0=c0|c1=c0,asplit=${cuts.length}${cuts.map((_, i) => `[f${i}]`).join('')}`;
    parts.push(fl, ...cuts.map((c, i) => `[f${i}]adelay=${Math.round(c * 1000)}:all=1[fd${i}]`));
    tags.push(...cuts.map((_, i) => `[fd${i}]`));
  }
  if (music) {
    const mp = path.isAbsolute(music) ? music : path.join(root, music);
    if (!existsSync(mp)) throw new Error(`music file not found: ${mp}`);
    const n = inputs.filter(x => x === '-i').length;
    inputs.push('-stream_loop', '-1', '-i', mp);
    parts.push(`[${n}:a]aresample=${SR},atrim=0:${d},volume=0.35,afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, duration - 3).toFixed(2)}:d=3[mus]`);
    tags.push('[mus]');
  }
  parts.push(`${tags.join('')}amix=inputs=${tags.length}:normalize=0:dropout_transition=0,apad=whole_dur=${d},atrim=0:${d}[out]`);
  ff([...inputs, '-filter_complex', parts.join(';'), '-map', '[out]', '-ar', SR, '-ac', 2, '-c:a', 'pcm_s16le', out], 'bed');
}

// final: bed ducked by the voice (sidechain), + voice, limiter → AAC muxed with the video
export function muxFinal({ video, voiceWav, bedWav, out, hasVoice }) {
  const fc = hasVoice
    ? `[2:a]asplit=2[vk][vm];[1:a][vk]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[bd];[bd][vm]amix=inputs=2:normalize=0,alimiter=limit=0.89:level=disabled[a]`
    : `[1:a]alimiter=limit=0.89:level=disabled[a]`;
  ff(['-i', video, '-i', bedWav, ...(hasVoice ? ['-i', voiceWav] : []), '-filter_complex', fc, '-map', '0:v:0', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], 'mux');
}
