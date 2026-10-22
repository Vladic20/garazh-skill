// Look at a finished (or reference) video the way an editor does.
//   node tools/sheet.mjs film.mp4                     → film.sheet.jpg, one frame every 0.5 s (--every s, --cols n)
//   node tools/sheet.mjs film.mp4 --at 7.5 --window 0.3 → film.at7.5.jpg, every frame around a seam
//   node tools/sheet.mjs film.mp4 --scenes [--threshold 0.3] → prints cut candidates (fast camera moves also trigger:
//                                                       confirm each with --at)
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const a = process.argv.slice(2), file = a.find(x => !x.startsWith('--') && !/^-?\d/.test(x));
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? +a[i + 1] : d; };
if (!file) { console.error('usage: node tools/sheet.mjs <video> [--every 0.5 --cols 8] | [--at t --window 0.3] | [--scenes --threshold 0.3]'); process.exit(2); }
const ff = args => { const r = spawnSync('ffmpeg', ['-hide_banner', '-y', '-v', 'info', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status) { console.error(r.stderr.slice(-800)); process.exit(1); } return r.stderr; };
const base = file.replace(/\.[^.]+$/, '');
if (a.includes('--scenes')) {
  const th = opt('threshold', 0.3);
  const log = ff(['-i', file, '-vf', `select='gt(scene,${th})',showinfo`, '-f', 'null', '-']);
  const ts = [...log.matchAll(/pts_time:([\d.]+)/g)].map(m => +m[1]);
  console.log(ts.length ? `cut candidates (scene > ${th}):\n` + ts.map(t => `  ${t.toFixed(3)} s`).join('\n') : 'no cut candidates — maybe one continuous camera move');
} else if (a.includes('--at')) {
  const at = opt('at', 0), w = opt('window', 0.3), cols = opt('cols', 6);
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const [nn, dd] = r.stdout.trim().split('/').map(Number), fps = nn / (dd || 1), count = Math.max(2, Math.round(2 * w * fps));
  const out = `${base}.at${at}.jpg`;
  ff(['-ss', String(Math.max(0, at - w)), '-t', String(count / fps), '-i', file, '-frames:v', '1', '-vf', `scale=480:-2,drawbox=x=0:y=0:w=iw:h=4:color=red@0.8:t=fill:enable='eq(n\\,${Math.round(w * fps)})',tile=${cols}x${Math.ceil(count / cols)}`, '-fps_mode', 'vfr', out]);
  console.log(`${count} frames around ${at} s (±${w}) → ${out}  (red bar = the frame at ${at} s)`);
} else {
  const every = opt('every', 0.5), cols = opt('cols', 8);
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const n = Math.ceil(+r.stdout / every), out = `${base}.sheet.jpg`;
  ff(['-i', file, '-vf', `fps=1/${every},scale=320:-2,tile=${cols}x${Math.ceil(n / cols)}`, '-frames:v', '1', '-fps_mode', 'vfr', out]);
  console.log(`${n} frames, one every ${every} s → ${out}`);
}
