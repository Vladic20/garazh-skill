// Machine acceptance of a finished video: what can be measured is measured, the rest is listed as unverified.
//   node tools/verify.mjs out/film.mp4 [--w 1920 --h 1080 --fps 60 --duration 15] [--silent]
// Checks: H.264 + yuv420p, size, constant fps, frame count = duration·fps, monotonic evenly spaced timestamps,
// AAC audio present and as long as the picture, integrated loudness, true peak, share of silence.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const a = process.argv.slice(2), file = a.find(x => !x.startsWith('--') && !/^\d/.test(x));
const opt = k => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : undefined; };
if (!file || !existsSync(file)) { console.error('usage: node tools/verify.mjs <video.mp4> [--w 1920 --h 1080 --fps 60 --duration 15] [--silent]'); process.exit(2); }
const silent = a.includes('--silent');
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.error) { console.error(`${cmd} not found — install ffmpeg`); process.exit(2); } return r; };
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]).stdout);
const v = probe.streams.find(s => s.codec_type === 'video'), au = probe.streams.find(s => s.codec_type === 'audio');
const rows = [];
const check = (name, ok, got, want = '') => rows.push({ name, ok, got: String(got), want: String(want) });
const frac = s => { const [n, d] = String(s || '0/1').split('/').map(Number); return d ? n / d : 0; };

check('container', /mp4/.test(probe.format.format_name), probe.format.format_name, 'mp4');
check('video codec', v?.codec_name === 'h264', v?.codec_name, 'h264');
check('pixel format', v?.pix_fmt === 'yuv420p', v?.pix_fmt, 'yuv420p');
if (opt('w')) check('size', v?.width === +opt('w') && v?.height === +opt('h'), `${v?.width}×${v?.height}`, `${opt('w')}×${opt('h')}`);
const fps = frac(v?.r_frame_rate), avg = frac(v?.avg_frame_rate);
check('fps constant', Math.abs(fps - avg) < 0.01, `r=${fps.toFixed(3)} avg=${avg.toFixed(3)}`, 'equal');
if (opt('fps')) check('fps', Math.abs(fps - +opt('fps')) < 0.01, fps.toFixed(3), opt('fps'));
const vdur = +v?.duration || +probe.format.duration, frames = +v?.nb_read_frames || +v?.nb_frames;
if (opt('duration')) {
  const want = Math.round(+opt('duration') * (+opt('fps') || fps));
  check('frame count', Math.abs(frames - want) <= 1, frames, want);
  check('duration', Math.abs(vdur - +opt('duration')) <= 1.5 / (fps || 30), vdur.toFixed(3) + ' s', opt('duration') + ' s');
}
// timestamps: monotonic and evenly spaced
const pts = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file]).stdout.split(/\s+/).filter(Boolean).map(Number).sort((x, y) => x - y);
const steps = pts.slice(1).map((t, i) => t - pts[i]), step = 1 / (fps || 30);
const uneven = steps.filter(d => Math.abs(d - step) > step * 0.5).length;
check('timestamps', uneven === 0 && steps.every(d => d > 0), uneven ? `${uneven} uneven steps` : `${steps.length} even steps`, `step ${step.toFixed(4)} s`);
if (silent) check('audio', !au, au ? `${au.codec_name} present` : 'none', 'none (silent brief)');
else {
  check('audio codec', au?.codec_name === 'aac', au?.codec_name || 'none', 'aac');
  if (au) {
    const adur = +au.duration || vdur;
    check('audio length', Math.abs(adur - vdur) < 0.1, `${adur.toFixed(3)} s`, `${vdur.toFixed(3)} s ± 0.1`);
    const eb = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr;
    const I = +(eb.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)[0], TP = +(eb.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop()?.match(/-?[\d.]+/)[0];
    check('loudness', I > -20 && I < -9, `${I} LUFS`, '−20…−9 (social: ≈ −14)');
    check('true peak', TP <= -0.5, `${TP} dBTP`, '≤ −0.5');
    const sd = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-af', 'silencedetect=n=-50dB:d=0.4', '-f', 'null', '-']).stderr;
    const quiet = [...sd.matchAll(/silence_duration: ([\d.]+)/g)].reduce((s, m) => s + +m[1], 0);
    check('silence share', quiet / vdur < 0.35, `${(100 * quiet / vdur).toFixed(0)} %`, '< 35 %');
  }
}
const w = Math.max(...rows.map(r => r.name.length));
for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(w)}  ${r.got}${r.want ? `   (want ${r.want})` : ''}`);
console.log('\nNot verified by this tool — watch and listen: motion and pacing, readability of every word, seams, blur/DOF where intended,');
console.log('music and SFX taste, balance, sync of accents by ear, flash safety.');
process.exitCode = rows.some(r => !r.ok) ? 1 : 0;
