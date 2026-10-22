// Film renderer shared by films/*: a page that exposes window.__ready (promise) and window.renderAt(t, samples) is driven
// frame by frame in headless Chrome on the GPU (WebGL2). Every frame is a pure function of time, so any range renders alone.
//   node render.mjs stills 0.5,4.6 [--samples 8]     → review/s_<t>.png
//   node render.mjs sheet [--samples 6]               → review/sheet.jpg (one still per beat: the film's SHEET times)
//   node render.mjs probe 7.5:9.0 [--samples 12]      → review/probe.mp4 (the riskiest interval, same path as the final)
//   node render.mjs check [--frames 5]                → re-renders frames after a cold reload and in reverse; reports drift
//   node render.mjs video [--samples 16] [--from a --to b] [--out f] → out/<name>.video.mp4 (no audio)
import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

function serve(dir, root) {
  const three = [path.join(root, 'node_modules', 'three'), path.join(dir, 'node_modules', 'three')].find(existsSync);
  if (!three) throw new Error('three.js missing: run npm install in the studio folder');
  const map = [['/three/', three], ['/fonts/', path.join(root, 'fonts')], ['/lib/', path.join(root, 'lib')], ['/', dir]].map(([p, d]) => [p, path.resolve(d) + path.sep]);
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const [pre, base] = map.find(([p]) => url.startsWith(p));
    const f = path.join(base, url.slice(pre.length) || 'index.html');
    if (!f.startsWith(base) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function open(port, { w, h, samples }) {
  const browser = await puppeteer.launch({ channel: 'chrome', headless: true, protocolTimeout: 600000,
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--force-color-profile=srgb', '--hide-scrollbars'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });   // 404s are reported with their URL below
  page.on('response', r => { if (r.status() >= 400 && !/favicon|env\.json/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/index.html?samples=${samples}&w=${w}&h=${h}`);
  try { await page.waitForFunction('window.__ready', { timeout: 30000 }); await page.evaluate(() => window.__ready); }
  catch (e) { throw new Error(`page not ready: ${e.message}\n  ${errors.join('\n  ')}`); }
  const cdp = await page.createCDPSession();
  const shot = (fmt = 'jpeg') => cdp.send('Page.captureScreenshot', { format: fmt, ...(fmt === 'jpeg' ? { quality: 94 } : {}), optimizeForSpeed: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } }).then(r => Buffer.from(r.data, 'base64'));
  return { browser, page, shot, errors };
}
const close = async b => { const p = b.process(); await Promise.race([b.close().catch(() => {}), new Promise(r => setTimeout(r, 2000))]); if (p && p.exitCode == null) spawn(process.platform === 'win32' ? 'taskkill' : 'kill', process.platform === 'win32' ? ['/pid', String(p.pid), '/T', '/F'] : ['-9', String(p.pid)], { stdio: 'ignore' }); };

function encoder(out, fps) {
  return spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=in_range=full:out_range=limited,format=yuv420p', '-color_range', 'tv', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-r', String(fps), '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] });
}

// film = { dir, root, name, fps, duration, w, h, sheet: [t…], samples: { draft, final } }
export async function renderFilm(film, argv = process.argv.slice(2)) {
  const mode = argv[0] || 'sheet', opt = (k, d) => { const i = argv.indexOf('--' + k); return i > 0 ? argv[i + 1] : d; };
  const { dir, root, fps, duration, w = 1920, h = 1080, name = path.basename(dir) } = film;
  const samples = +opt('samples', mode === 'video' ? film.samples?.final ?? 16 : film.samples?.draft ?? 6);
  const srv = await serve(dir, root), port = srv.address().port, view = { w, h, samples };
  const review = path.join(dir, 'review'); mkdirSync(review, { recursive: true });
  let p = await open(port, view);
  const frame = async (t, fmt = 'jpeg') => {                    // a lost WebGL context or a hung page must not kill a long render
    for (let a = 0; ; a++) {
      try {
        await Promise.race([p.page.evaluate((t, s) => window.renderAt(t, s), t, samples), new Promise((_, rej) => setTimeout(() => rej(new Error('frame timeout')), 60000))]);
        if (p.errors.length) throw new Error(p.errors.splice(0).join('; '));
        return await p.shot(fmt);
      } catch (e) {
        if (a >= 2 || !/timeout|Target closed|context|Protocol error/i.test(e.message)) throw new Error(`t=${t.toFixed(3)}: ${e.message}`);
        console.warn(`t=${t.toFixed(3)}: ${e.message.split('\n')[0]} — restarting the browser`);
        await close(p.browser).catch(() => {}); p = await open(port, view);
      }
    }
  };
  const stack = (files, cols, out) => {
    const W = 480, H = Math.round(480 * h / w);
    const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...files.flatMap(f => ['-i', f]), '-filter_complex',
      files.map((_, i) => `[${i}:v]scale=${W}:${H}[v${i}]`).join(';') + ';' + files.map((_, i) => `[v${i}]`).join('') +
      `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * W}_${Math.floor(i / cols) * H}`).join('|')}:fill=black`, out], { encoding: 'utf8' });
    if (r.status) throw new Error(r.stderr.slice(-500));
  };
  try {
    if (mode === 'stills' || mode === 'sheet') {
      const times = mode === 'sheet' ? film.sheet : String(argv[1]).split(',').map(Number);
      const files = [];
      for (const t of times) { const f = path.join(review, `s_${t.toFixed(2).padStart(5, '0')}.png`); writeFileSync(f, await frame(t, 'png')); files.push(f); }
      if (mode === 'sheet') { stack(files, 4, path.join(review, 'sheet.jpg')); console.log(`sheet → ${path.join(review, 'sheet.jpg')}  (${times.map(t => t.toFixed(1)).join(' ')})`); }
      else console.log(files.join('\n'));
    } else if (mode === 'check') {
      // determinism: the same t must give the same picture after a cold reload and when visited in reverse order
      const n = +opt('frames', 5), ts = Array.from({ length: n }, (_, i) => +((i + 0.5) * duration / n).toFixed(3));
      const hash = b => createHash('sha1').update(b).digest('hex').slice(0, 12);
      const a = []; for (const t of ts) a.push(await frame(t, 'png'));
      await close(p.browser); p = await open(port, view);
      const b = []; for (const t of [...ts].reverse()) b.unshift(await frame(t, 'png'));
      let bad = 0;
      ts.forEach((t, i) => { const same = hash(a[i]) === hash(b[i]); if (!same) { bad++; writeFileSync(path.join(review, `check_${t}_a.png`), a[i]); writeFileSync(path.join(review, `check_${t}_b.png`), b[i]); }
        console.log(`t=${t}  ${same ? 'identical' : 'DIFFERENT (review/check_*.png — compare: tools/sheet.mjs or by eye)'}`); });
      console.log(bad ? `seek check: ${bad}/${n} frames differ — find state that depends on the previous frame (accumulators, Math.random, Date.now)` : `seek check: PASS (${n} frames, cold reload + reverse order)`);
      if (bad) process.exitCode = 1;
    } else if (mode === 'probe' || mode === 'video') {
      const [from, to] = mode === 'probe' ? String(argv[1]).split(':').map(Number) : [+opt('from', 0), +opt('to', duration)];
      const out = opt('out', mode === 'probe' ? path.join(review, 'probe.mp4') : path.join(dir, 'out', `${name}.video.mp4`));
      mkdirSync(path.dirname(out), { recursive: true });
      const n0 = Math.round(from * fps), n1 = Math.round(to * fps), ff = encoder(out, fps), t0 = Date.now();
      try {
        for (let n = n0; n < n1; n++) {
          const buf = await frame(n / fps);
          if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
          if ((n - n0) % fps === 0) { const el = (Date.now() - t0) / 1000, k = (n - n0 + 1) / (n1 - n0); console.log(`frame ${n}/${n1}  ${(el / (n - n0 + 1) * 1000).toFixed(0)} ms/f  eta ${((el / k - el) / 60).toFixed(1)} min`); }
        }
      } finally { ff.stdin.end(); await new Promise(r => ff.on('exit', r)); }
      console.log(`${mode} → ${out}  (${n1 - n0} frames @ ${fps} fps)`);
    } else throw new Error(`unknown mode "${mode}" (stills | sheet | probe | check | video)`);
  } finally { await close(p.browser); srv.close(); }
}
